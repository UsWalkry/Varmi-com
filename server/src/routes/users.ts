import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user profile by ID
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('👤 Getting user profile:', userId);

    // Get user basic information
    const userQuery = `
      SELECT 
        id, 
        firstName, 
        lastName, 
        email, 
        email_verified,
        city,
        created_at
      FROM users 
      WHERE id = ?
    `;
    
    const userResults = await query(userQuery, [userId]);

    if (!userResults || (userResults as any[]).length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Kullanıcı bulunamadı' 
      });
    }

    const user = (userResults as any[])[0];

    // Get user statistics
    const [listingsCount, offersCount, favoritesCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM listings WHERE buyer_id = ?', [userId]),
      query('SELECT COUNT(*) as count FROM offers WHERE seller_id = ?', [userId]),
      query('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId])
    ]);

    let ratingAvg = 0;
    let ratingCount = 0;

    try {
      const ratingColumnExists = await query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'order_sellers'
          AND column_name = 'seller_rating'
        LIMIT 1
      `);

      if (Array.isArray(ratingColumnExists) && ratingColumnExists.length > 0) {
        const ratingResults = await query(`
          SELECT 
            ROUND(AVG(CASE WHEN seller_rating IS NOT NULL AND seller_rating > 0 THEN seller_rating END), 2) AS avg_rating,
            COUNT(CASE WHEN seller_rating IS NOT NULL AND seller_rating > 0 THEN 1 END) AS rating_count
          FROM order_sellers
          WHERE seller_id = ?
        `, [userId]);

        if (Array.isArray(ratingResults) && ratingResults.length > 0) {
          ratingAvg = Number((ratingResults as any[])[0]?.avg_rating) || 0;
          ratingCount = Number((ratingResults as any[])[0]?.rating_count) || 0;
        }
      } else {
        console.warn('⚠️  order_sellers.seller_rating column missing; skipping rating aggregation');
      }
    } catch (ratingError) {
      console.warn('⚠️  Unable to load rating stats for user', userId, ratingError);
    }

    const userProfile = {
      ...user,
      listings_count: (listingsCount as any[])[0]?.count || 0,
      offers_count: (offersCount as any[])[0]?.count || 0,
      favorites_count: (favoritesCount as any[])[0]?.count || 0,
      rating_avg: ratingAvg,
      rating_count: ratingCount,
      email_verified: user.email_verified === 1 || user.email_verified === true
    };

    console.log('👤 User profile:', userProfile);

    res.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı profili alınırken hata oluştu' 
    });
  }
});

// Get user's listings
router.get('/:userId/listings', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📋 Getting user listings:', userId);

    const listingsQuery = `
      SELECT 
        l.*
      FROM listings l
      WHERE l.buyer_id = ?
      ORDER BY l.created_at DESC
    `;
    
    const listingsResults = await query(listingsQuery, [userId]);

    const formattedListings = (listingsResults as any[]).map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      budget_max: parseFloat(listing.budget_max) || 0,
      category: listing.category,
      status: listing.status,
      created_at: listing.created_at,
      images: listing.images ? JSON.parse(listing.images) : []
    }));

    console.log('📋 User listings:', formattedListings.length, 'Sample budget_max:', formattedListings[0]?.budget_max);

    res.json({
      success: true,
      listings: formattedListings
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı ilanları alınırken hata oluştu' 
    });
  }
});

// Get user's offers
router.get('/:userId/offers', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('💰 Getting user offers:', userId);

    const offersQuery = `
      SELECT 
        o.*,
        l.title as listing_title,
        l.id as listing_id
      FROM offers o
      INNER JOIN listings l ON o.listing_id = l.id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
    `;
    
    const offersResults = await query(offersQuery, [userId]);

    const formattedOffers = (offersResults as any[]).map((offer: any) => ({
      id: offer.id,
      listing_id: offer.listing_id,
      listing_title: offer.listing_title,
      price: parseFloat(offer.price) || 0,
      quantity: offer.quantity,
      status: offer.status,
      created_at: offer.created_at
    }));

    console.log('💰 User offers:', formattedOffers.length, 'Sample raw price:', (offersResults as any[])[0]?.price);
    console.log('💰 Sample processed price:', formattedOffers[0]?.price, 'type:', typeof formattedOffers[0]?.price);

    res.json({
      success: true,
      offers: formattedOffers
    });
  } catch (error) {
    console.error('Get user offers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı teklifleri alınırken hata oluştu' 
    });
  }
});

// Get user's favorites
router.get('/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('❤️ Getting user favorites:', userId);

    const favoritesQuery = `
      SELECT 
        f.*,
        l.title as listing_title,
        l.budget_max as listing_budget_max,
        l.images as listing_images
      FROM favorites f
      INNER JOIN listings l ON f.listing_id = l.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `;
    
    const favoritesResults = await query(favoritesQuery, [userId]);

    const formattedFavorites = (favoritesResults as any[]).map((favorite: any) => ({
      id: favorite.id,
      listing_id: favorite.listing_id,
      listing_title: favorite.listing_title,
      listing_budget_max: parseFloat(favorite.listing_budget_max) || 0,
      listing_images: favorite.listing_images ? JSON.parse(favorite.listing_images) : [],
      created_at: favorite.created_at
    }));

    console.log('❤️ User favorites:', formattedFavorites.length, 'Sample budget_max:', formattedFavorites[0]?.listing_budget_max);

    res.json({
      success: true,
      favorites: formattedFavorites
    });
  } catch (error) {
    console.error('Get user favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı favorileri alınırken hata oluştu' 
    });
  }
});

// Get seller's reviews (satıcının aldığı tüm değerlendirmeler)
router.get('/:userId/reviews', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('⭐ Getting seller reviews:', userId);

    const reviewsQuery = `
      SELECT 
        ur.id,
        ur.order_id,
        ur.rating,
        ur.comment,
        ur.created_at,
        ur.reviewer_id,
        reviewer.firstName as reviewer_first_name,
        reviewer.lastName as reviewer_last_name,
        oi.title as product_title,
        oi.price as product_price,
        oi.image as product_image,
        o.total_amount as order_total
      FROM user_reviews ur
      LEFT JOIN users reviewer ON ur.reviewer_id = reviewer.id
      LEFT JOIN orders o ON ur.order_id = o.id
      LEFT JOIN order_items oi ON ur.order_id = oi.order_id
      WHERE ur.reviewee_id = ?
      ORDER BY ur.created_at DESC
    `;
    
    const reviewsResults = await query(reviewsQuery, [userId]);

    const formattedReviews = (reviewsResults as any[]).map((review: any) => ({
      id: review.id,
      orderId: review.order_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      reviewer: {
        id: review.reviewer_id,
        firstName: review.reviewer_first_name,
        lastName: review.reviewer_last_name,
        displayName: `${review.reviewer_first_name} ${review.reviewer_last_name}`.trim()
      },
      product: {
        title: review.product_title,
        price: parseFloat(review.product_price) || 0,
        image: review.product_image
      },
      orderTotal: parseFloat(review.order_total) || 0
    }));

    // Rating istatistikleri
    const totalReviews = formattedReviews.length;
    const averageRating = totalReviews > 0 
      ? (formattedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : 0;

    // Rating dağılımı (5, 4, 3, 2, 1 yıldız)
    const ratingDistribution = {
      5: formattedReviews.filter(r => r.rating === 5).length,
      4: formattedReviews.filter(r => r.rating === 4).length,
      3: formattedReviews.filter(r => r.rating === 3).length,
      2: formattedReviews.filter(r => r.rating === 2).length,
      1: formattedReviews.filter(r => r.rating === 1).length
    };

    console.log('⭐ Seller reviews:', {
      sellerId: userId,
      totalReviews,
      averageRating,
      ratingDistribution
    });

    res.json({
      success: true,
      reviews: formattedReviews,
      stats: {
        totalReviews,
        averageRating: parseFloat(averageRating as string),
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Satıcı değerlendirmeleri alınırken hata oluştu' 
    });
  }
});

export default router;