import React, { useState, useEffect } from 'react';
import { mysqlAPI } from '@/lib/mysql-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, User, Package, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { maskDisplayName } from '@/lib/utils';

interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
  product: {
    title: string;
    price: number;
    image: string;
  };
  orderTotal: number;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface SellerReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
}

const SellerReviewsModal: React.FC<SellerReviewsModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  sellerName
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sellerId) {
      fetchReviews();
    }
  }, [isOpen, sellerId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await mysqlAPI.getUserReviews(sellerId);
      
      if (response.success) {
        console.log('🔍 Reviews data received:', response);
        setReviews(response.reviews || []);
        setStats(response.stats || null);
      } else {
        throw new Error(response.error || 'Değerlendirmeler alınamadı');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Değerlendirmeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const getRatingPercentage = (rating: number) => {
    if (!stats || stats.totalReviews === 0) return 0;
    return (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {sellerName} - Değerlendirmeler
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* İstatistikler */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.averageRating.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-yellow-500 text-lg">
                      {'⭐'.repeat(Math.round(stats.averageRating))}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {stats.totalReviews} değerlendirme
                  </div>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                      <span className="w-8">{rating} ⭐</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{ width: `${getRatingPercentage(rating)}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-600">
                        {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Değerlendirmeler */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz değerlendirme yapılmamış
                </div>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{maskDisplayName(review.reviewer.displayName)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">
                              {'⭐'.repeat(review.rating)}
                            </span>
                            <span className="text-gray-600 text-sm">
                              ({review.rating}/5)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {formatDate(review.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                        <Package className="h-4 w-4 text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{review.product.title}</div>
                        </div>
                      </div>

                      {review.comment && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-700">{review.comment}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerReviewsModal;