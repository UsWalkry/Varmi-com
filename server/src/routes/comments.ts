import express from 'express';
import { query } from '../database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import * as emailService from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { redisCache, CacheKeys } from '../utils/redisCache.js';

const router = express.Router();

// Get comments for a listing (Dolap-style visibility) - Guest access allowed
router.get('/listing/:listingId', optionalAuth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = (req as any).userId; // May be undefined if not authenticated
    
    console.log('💬 Getting comments for listing:', listingId, 'user:', userId || 'guest');

    // Check Redis cache (public comments only for guests)
    if (!userId) {
      const cacheKey = `comments:listing:${listingId}:public`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        console.log('✅ Redis cache hit: public comments for listing', listingId);
        return res.json({ success: true, comments: cached });
      }
    }

    // Get listing owner
    const listingResult = await query(
      'SELECT buyer_id FROM listings WHERE id = ?',
      [listingId]
    ) as any[];
    
    const listing = listingResult[0];
    const isOwner = listing && userId && listing.buyer_id === userId;
    
    console.log('💬 User is owner?', isOwner);

    // Visibility rules:
    // 1. PUBLIC comments (visibility_state = PUBLIC) → everyone sees
    // 2. PRIVATE comments (visibility_state = PRIVATE) → only seller + buyer see
    
    let query_sql = `
      SELECT 
        lc.*,
        u.firstName,
        u.lastName,
        CONCAT(u.firstName, ' ', u.lastName) as userName
      FROM listing_comments lc
      JOIN users u ON lc.user_id = u.id
      WHERE lc.listing_id = ? 
    `;
    
    // If user is authenticated, include PRIVATE comments they're involved in
    if (userId) {
      query_sql += `
        AND (
          lc.visibility_state = 'PUBLIC'
          OR (lc.visibility_state = 'PRIVATE' AND (lc.user_id = ? OR ? = ?))
        )
      `;
    } else {
      // Guest users only see PUBLIC comments
      query_sql += ` AND lc.visibility_state = 'PUBLIC' `;
    }
    
    query_sql += ` ORDER BY lc.created_at ASC`;
    
    const params = userId 
      ? [listingId, userId, userId, listing?.buyer_id]
      : [listingId];

    const commentsResult = await query(query_sql, params) as any[];

    const comments = commentsResult;
    console.log('💬 Found comments:', comments?.length || 0, '(PUBLIC + PRIVATE if authorized)');

    // Query result is already an array - use it directly
    const normalizedComments = comments || [];

    // Group comments with their replies
    const commentMap: any = {};
    const rootComments: any[] = [];
    const orphanComments: any[] = [];

    if (normalizedComments.length > 0) {
      normalizedComments.forEach((comment: any) => {
        commentMap[comment.id] = { ...comment, replies: [] };
      });

      normalizedComments.forEach((comment: any) => {
        if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
          // Parent exists in visible comments - attach normally
          commentMap[comment.parent_comment_id].replies.push(commentMap[comment.id]);
        } else if (!comment.parent_comment_id) {
          // Root comment
          rootComments.push(commentMap[comment.id]);
        } else {
          // Orphan: parent is private/invisible - need to find visible ancestor
          orphanComments.push(comment);
        }
      });
      
      // Attach orphans to their nearest visible ancestor
      for (const orphan of orphanComments) {
        let currentParentId = orphan.parent_comment_id;
        let maxDepth = 10;
        let visibleAncestor = null;
        
        // Walk up the tree until we find a visible parent
        while (currentParentId && maxDepth > 0) {
          if (commentMap[currentParentId]) {
            // Found visible parent - attach orphan here
            visibleAncestor = currentParentId;
            console.log('💬 Attaching orphan', orphan.id.substring(0,8), 'to visible parent', visibleAncestor.substring(0,8));
            commentMap[visibleAncestor].replies.push(commentMap[orphan.id]);
            break;
          }
          
          // Parent not visible, query its parent from database
          const parentCheckResult = await query(
            'SELECT parent_comment_id FROM listing_comments WHERE id = ?',
            [currentParentId]
          ) as any[];
          
          const parentRow = parentCheckResult[0];
          currentParentId = parentRow?.parent_comment_id || null;
          maxDepth--;
        }
        
        // If no visible ancestor found, make it a root comment
        if (!visibleAncestor) {
          console.log('💬 No visible ancestor for orphan', orphan.id.substring(0,8), '- making it root');
          rootComments.push(commentMap[orphan.id]);
        }
      }
    }

    // Cache public comments for guests (no private data)
    if (!userId) {
      const cacheKey = `comments:listing:${listingId}:public`;
      await redisCache.set(cacheKey, rootComments, 300); // 5 minutes
      console.log('💾 Redis cache set: public comments for listing', listingId);
    }

    res.json({
      success: true,
      comments: rootComments
    });
  } catch (error) {
    console.error('💬 Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Yorumlar alınırken hata oluştu'
    });
  }
});

// Get comment count for a listing (only visible)
router.get('/listing/:listingId/count', async (req, res) => {
  try {
    const { listingId } = req.params;
    console.log('💬 Getting comment count for listing:', listingId);

    const resultData = await query(
      `SELECT COUNT(*) as count
      FROM listing_comments
      WHERE listing_id = ? AND is_visible = TRUE AND parent_comment_id IS NULL`,
      [listingId]
    ) as any[];

    // resultData is array, first element is the row
    const row = resultData[0];
    const count = row?.count || 0;
    console.log('💬 Comment count result:', count);

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('💬 Get comment count error:', error);
    res.status(500).json({
      success: false,
      error: 'Yorum sayısı alınırken hata oluştu'
    });
  }
});

// Add a comment to a listing
router.post('/listing/:listingId', authenticateToken, async (req: any, res) => {
  try {
    const { listingId } = req.params;
    const { comment } = req.body;
    const userId = req.userId;

    console.log('💬 Adding comment:', { listingId, userId, commentLength: comment?.length });

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Yorum boş olamaz'
      });
    }

    // Get listing details
    const listingResult = await query(
      'SELECT id, title, buyer_id FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    const rows = listingResult[0];
    console.log('💬 Listing rows type:', typeof rows, 'isArray:', Array.isArray(rows));
    console.log('💬 Listing result:', rows);

    if (!rows || (Array.isArray(rows) && rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'İlan bulunamadı'
      });
    }

    const listing = Array.isArray(rows) ? rows[0] : rows;
    console.log('💬 Final listing:', listing);

    // Don't allow owner to comment on their own listing
    if (listing.buyer_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Kendi ilanınıza yorum yapamazsınız'
      });
    }

    // Get user info
    const userQueryResult = await query(
      'SELECT id, firstName, lastName, email FROM users WHERE id = ?',
      [userId]
    ) as any[];

    const userRows = userQueryResult[0];
    const user = Array.isArray(userRows) ? userRows[0] : userRows;
    
    console.log('💬 User data:', user);

    if (!user || !user.id) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const commentId = uuidv4();

    console.log('💬 Creating comment with ID:', commentId);

    // Insert comment with visibility state
    // Default: PRIVATE (only buyer and seller can see until owner replies)
    await query(
      `INSERT INTO listing_comments (
        id, listing_id, user_id, comment, 
        is_visible, is_owner_reply, 
        visibility_state, is_first_seller_reply_exists
      ) VALUES (?, ?, ?, ?, FALSE, FALSE, 'PRIVATE', FALSE)`,
      [commentId, listingId, userId, comment.trim()]
    );

    console.log('💬 Comment inserted successfully (PRIVATE until seller replies)');

    // Get owner info
    const ownerQueryResult = await query(
      'SELECT id, firstName, lastName, email FROM users WHERE id = ?',
      [listing.buyer_id]
    ) as any[];

    const ownerRows = ownerQueryResult[0];
    const owner = Array.isArray(ownerRows) ? ownerRows[0] : ownerRows;
    
    console.log('💬 Owner data:', owner);

    if (!owner || !owner.id) {
      console.error('💬 Owner not found for listing:', listing.buyer_id);
      return res.json({
        success: true,
        message: 'Yorumunuz ilan sahibine iletildi',
        commentId
      });
    }

    // Send notification to listing owner
    try {
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, created_at)
        VALUES (?, ?, 'comment', ?, ?, NOW())`,
        [
          uuidv4(),
          owner.id,
          'Yeni Yorum',
          `${user.firstName} ${user.lastName} ilanınıza yorum yaptı: "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"`
        ]
      );
      console.log('💬 Notification sent to owner:', owner.id);
    } catch (notifError) {
      console.error('💬 Notification error:', notifError);
    }

    // Send email to listing owner
    try {
      await emailService.sendEmail({
        to: owner.email,
        subject: `${listing.title} - Yeni Yorum`,
        html: `
          <h2>İlanınıza Yeni Yorum Yapıldı</h2>
          <p>Merhaba ${owner.firstName},</p>
          <p><strong>${user.firstName} ${user.lastName}</strong> "${listing.title}" başlıklı ilanınıza yorum yaptı:</p>
          <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
            ${comment}
          </blockquote>
          <p>Bu yoruma cevap verdiğinizde yorum ilan sayfasında görünür olacaktır.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/listing/${listingId}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Yoruma Cevap Ver</a></p>
          <br>
          <p>Saygılarımızla,<br>Varmi.com Ekibi</p>
        `
      });
      console.log('💬 Email sent to owner:', owner.email);
    } catch (emailError) {
      console.error('💬 Email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Yorumunuz ilan sahibine iletildi',
      commentId
    });
  } catch (error) {
    console.error('💬 Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Yorum eklenirken hata oluştu'
    });
  }
});

// Reply to a comment (only listing owner)
router.post('/reply/:commentId', authenticateToken, async (req: any, res) => {
  try {
    const { commentId } = req.params;
    const { reply } = req.body;
    const userId = req.userId;

    console.log('💬 Replying to comment:', commentId, 'by user:', userId);

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cevap boş olamaz'
      });
    }

    // Get original comment and listing
    const commentQueryResult = await query(
      `SELECT lc.*, l.buyer_id, l.title, u.id as commenter_id, u.firstName as commenter_firstName, u.lastName as commenter_lastName, u.email as commenter_email
      FROM listing_comments lc
      JOIN listings l ON lc.listing_id = l.id
      JOIN users u ON lc.user_id = u.id
      WHERE lc.id = ?`,
      [commentId]
    ) as any[];

    const commentResult = commentQueryResult[0];
    console.log('💬 Comment result:', commentResult);

    if (!commentResult || (Array.isArray(commentResult) && commentResult.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Yorum bulunamadı'
      });
    }

    const originalComment = Array.isArray(commentResult) ? commentResult[0] : commentResult;

    // Authorization logic:
    // 1. Listing owner can reply to any comment
    // 2. Regular user can only reply to comments on their own original comment thread
    const isListingOwner = originalComment.buyer_id === userId;
    const isOriginalCommenter = originalComment.user_id === userId;
    
    console.log('💬 Reply authorization check:', {
      userId,
      commentId,
      isListingOwner,
      isOriginalCommenter,
      originalComment_userId: originalComment.user_id,
      originalComment_parentId: originalComment.parent_comment_id
    });
    
    // If user is neither the listing owner nor replying to their own comment, check parent thread
    if (!isListingOwner && !isOriginalCommenter) {
      // Find the root comment (original comment in the thread)
      // If this comment has a parent, get the parent's user_id
      const rootCommentId = originalComment.parent_comment_id || commentId;
      
      console.log('💬 Checking root comment:', rootCommentId);
      
      // Get the root comment to check if user is the original commenter
      const rootCommentQueryResult = await query(
        `SELECT user_id FROM listing_comments WHERE id = ?`,
        [rootCommentId]
      ) as any[];
      
      // rootCommentQueryResult is already an array from query()
      const rootComment = rootCommentQueryResult[0];
      const rootUserId = rootComment?.user_id;
      
      console.log('💬 Root comment user_id:', rootUserId, 'Current user:', userId);
      
      // Only allow if user is the original commenter in this thread
      if (rootUserId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Bu yoruma cevap veremezsiniz'
        });
      }
    }
    
    console.log('💬 Authorization passed, creating reply...');

    // Get replier info
    const replierQueryResult = await query(
      'SELECT firstName, lastName FROM users WHERE id = ?',
      [userId]
    ) as any[];

    const replierResult = replierQueryResult[0];
    const replier = Array.isArray(replierResult) ? replierResult[0] : replierResult;

    const replyId = uuidv4();

    // Dolap-style visibility logic (CORRECTED):
    // 1. SELLER replies → ALWAYS PUBLIC (seller is the store, everyone should see their responses)
    // 2. USER replies → ALWAYS PRIVATE (conversation between buyer and seller)
    // 3. First seller reply → Make root comment PUBLIC too
    
    // Find the root comment
    let currentCommentId = commentId;
    let rootCommentId = commentId;
    let maxDepth = 10;
    
    while (maxDepth > 0) {
      const parentCheckResult = await query(
        'SELECT parent_comment_id FROM listing_comments WHERE id = ?',
        [currentCommentId]
      ) as any[];
      
      const parentRow = parentCheckResult[0];
      const parentId = parentRow?.parent_comment_id;
      
      if (!parentId) {
        rootCommentId = currentCommentId;
        break;
      }
      
      currentCommentId = parentId;
      maxDepth--;
    }
    
    console.log('💬 Found root comment:', rootCommentId);
    
    // Get root comment details
    const rootCommentResult = await query(
      'SELECT visibility_state, is_first_seller_reply_exists FROM listing_comments WHERE id = ?',
      [rootCommentId]
    ) as any[];
    
    const rootComment = rootCommentResult[0];
    const isFirstSellerReply = isListingOwner && 
                                rootComment.visibility_state === 'PRIVATE_UNTIL_SELLER_REPLY' &&
                                !rootComment.is_first_seller_reply_exists;
    
    console.log('💬 Reply context:', {
      isListingOwner,
      rootVisibilityState: rootComment.visibility_state,
      isFirstSellerReplyExists: rootComment.is_first_seller_reply_exists,
      isFirstSellerReply
    });
    
    // FIXED Dolap rule: 
    // - Seller replies are ALWAYS PUBLIC (seller = store, must be visible to all)
    // - User replies are ALWAYS PRIVATE (conversation stays between buyer and seller)
    const replyVisibility = isListingOwner ? 'PUBLIC' : 'PRIVATE';
    const replyIsVisible = isListingOwner; // Seller replies always visible
    
    // Insert the reply
    await query(
      `INSERT INTO listing_comments (
        id, listing_id, user_id, comment, parent_comment_id, 
        is_owner_reply, is_visible, visibility_state, is_first_seller_reply_exists
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [replyId, originalComment.listing_id, userId, reply.trim(), commentId, isListingOwner, replyIsVisible, replyVisibility]
    );
    
    console.log(`💬 Reply created with visibility: ${replyVisibility}, is_visible: ${replyIsVisible}`);

    // If seller replies to a comment, make that comment public
    if (isListingOwner && originalComment.visibility_state === 'PRIVATE') {
      console.log('🎯 SELLER REPLIED to PRIVATE comment! Making it PUBLIC...');
      
      await query(
        `UPDATE listing_comments 
        SET visibility_state = 'PUBLIC',
            is_visible = TRUE
        WHERE id = ?`,
        [commentId]
      );
      
      console.log('✅ Replied comment is now PUBLIC');
    }

    // If this is seller's first reply, make root comment public
    if (isFirstSellerReply) {
      console.log('🎯 FIRST SELLER REPLY detected! Making root comment PUBLIC...');
      
      await query(
        `UPDATE listing_comments 
        SET visibility_state = 'PUBLIC',
            is_first_seller_reply_exists = TRUE,
            is_visible = TRUE
        WHERE id = ?`,
        [rootCommentId]
      );
      
      console.log('✅ Root comment is now PUBLIC (root + this reply are visible, rest stays PRIVATE)');
      
      // Notify buyer that their comment is now public
      try {
        await query(
          `INSERT INTO notifications (user_id, type, message, created_at)
          VALUES (?, 'comment_public', ?, NOW())`,
          [
            originalComment.commenter_id,
            'İlan sahibi yorumunuza cevap verdi. Yorumunuz artık herkese görünür.'
          ]
        );
      } catch (notifError) {
        console.error('💬 Notification error:', notifError);
      }
    }

    // Send notification to commenter
    try {
      await query(
        `INSERT INTO notifications (user_id, type, message, listing_id, created_at)
        VALUES (?, 'comment_reply', ?, ?, NOW())`,
        [
          originalComment.commenter_id,
          `${replier.firstName} ${replier.lastName} yorumunuza cevap verdi: "${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}"`,
          originalComment.listing_id
        ]
      );
    } catch (notifError) {
      console.error('💬 Notification error:', notifError);
    }

    // Send email to commenter
    try {
      await emailService.sendEmail({
        to: originalComment.commenter_email,
        subject: `${originalComment.title} - Yorumunuza Cevap Verildi`,
        html: `
          <h2>Yorumunuza Cevap Verildi</h2>
          <p>Merhaba ${originalComment.commenter_firstName},</p>
          <p><strong>${replier.firstName} ${replier.lastName}</strong> "${originalComment.title}" başlıklı ilandaki yorumunuza cevap verdi:</p>
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #ccc; margin: 20px 0;">
            <strong>Yorumunuz:</strong><br>
            ${originalComment.comment}
          </div>
          <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <strong>Cevap:</strong><br>
            ${reply}
          </div>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/listing/${originalComment.listing_id}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">İlanı Görüntüle</a></p>
          <br>
          <p>Saygılarımızla,<br>Varmi.com Ekibi</p>
        `
      });
    } catch (emailError) {
      console.error('💬 Email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Cevabınız gönderildi',
      replyId
    });
  } catch (error) {
    console.error('💬 Reply to comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Cevap gönderilirken hata oluştu'
    });
  }
});

// Get pending comments for listing owner (not visible yet) - Optional auth for guests
router.get('/listing/:listingId/pending', optionalAuth, async (req: any, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.userId;

    console.log('💬 Getting pending comments for listing:', listingId, 'user:', userId || 'guest');

    // If no user, return empty array (guests don't have pending comments)
    if (!userId) {
      return res.json({
        success: true,
        comments: []
      });
    }

    // Check if user is the listing owner
    const listingQueryResult = await query(
      'SELECT buyer_id FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    const listingResult = listingQueryResult[0];
    console.log('💬 Listing check result:', listingResult);

    if (!listingResult || (Array.isArray(listingResult) && listingResult.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'İlan bulunamadı'
      });
    }

    const listing = Array.isArray(listingResult) ? listingResult[0] : listingResult;

    // If user is the listing owner, show all pending comments
    // If user is not the owner, show only their own pending comments
    let commentsQueryResult;
    
    const isOwner = listing.buyer_id === userId;
    console.log('💬 User is owner?', isOwner, 'buyer_id:', listing.buyer_id, 'userId:', userId);
    
    if (isOwner) {
      // Owner: Show all pending comments (both root and nested replies)
      console.log('💬 Loading all pending comments for owner');
      commentsQueryResult = await query(
        `SELECT 
          lc.*,
          u.firstName,
          u.lastName,
          CONCAT(u.firstName, ' ', u.lastName) as userName
        FROM listing_comments lc
        JOIN users u ON lc.user_id = u.id
        WHERE lc.listing_id = ? AND lc.is_visible = FALSE
        ORDER BY lc.created_at DESC`,
        [listingId]
      ) as any[];
    } else {
      // Regular user: Show only their own pending comments (both root and nested replies)
      console.log('💬 Loading only user pending comments for:', userId);
      commentsQueryResult = await query(
        `SELECT 
          lc.*,
          u.firstName,
          u.lastName,
          CONCAT(u.firstName, ' ', u.lastName) as userName
        FROM listing_comments lc
        JOIN users u ON lc.user_id = u.id
        WHERE lc.listing_id = ? AND lc.user_id = ? AND lc.is_visible = FALSE
        ORDER BY lc.created_at DESC`,
        [listingId, userId]
      ) as any[];
    }

    // commentsQueryResult ZATENarray - [0] almaya gerek yok!
    const comments = commentsQueryResult;
    console.log('💬 Found pending comments:', Array.isArray(comments) ? comments.length : 'not array', comments);

    // MySQL query result is already an array from pool.execute
    // No need for normalization here - just use it directly
    
    console.log('💬 Returning pending comments:', comments.length, 'items');

    res.json({
      success: true,
      comments: comments || []
    });
  } catch (error) {
    console.error('💬 Get pending comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Bekleyen yorumlar alınırken hata oluştu'
    });
  }
});

export default router;
