import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  Search, 
  MoreHorizontal, 
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Heart,
  Ban
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import { getTimeAgo } from '@/lib/uiUtils';
import { formatPrice } from '@/utils/formatPrice';
import { toast } from 'sonner';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/imageOptimization';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  budgetMin: number;
  budgetMax: number;
  deliveryType: string;
  city: string;
  status: 'active' | 'inactive' | 'deleted' | 'closed';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  offerCount: number;
  viewCount?: number;
  favoriteCount?: number;
}

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState('all');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchQuery, selectedStatus, selectedApprovalStatus]);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      
      // Real API call
      const response = await mysqlAPI.getAdminListings();
      console.log('📋 Admin listings API response:', response);
      console.log('📊 Response success:', response.success);
      console.log('📊 Listings array:', response.listings);
      console.log('📊 Listings length:', response.listings?.length);
      
      if (response.success && response.listings && Array.isArray(response.listings)) {
        // Transform MySQL data to match our interface
        const transformedListings: Listing[] = response.listings.map((listing: any) => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          category: listing.category,
          condition: listing.listing_condition || 'used',
          budgetMin: listing.budget_max || 0,
          budgetMax: listing.budget_max || 0,
          deliveryType: listing.delivery_type || 'delivery',
          city: listing.city || 'Belirsiz',
          status: listing.status || 'inactive',
          approvalStatus: listing.approval_status,
          rejectionReason: listing.rejection_reason,
          images: listing.images ? (typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images) : [],
          createdAt: listing.created_at,
          updatedAt: listing.updated_at,
          buyerId: listing.buyer_id,
          buyerName: listing.buyer_name || 'Kullanıcı',
          buyerEmail: listing.buyer_email || '',
          offerCount: listing.offer_count || 0,
          viewCount: listing.view_count || 0,
          favoriteCount: listing.favorite_count || 0
        }));
        
        console.log('🔄 Transformed listings:', transformedListings.length, 'items');
        
        setListings(transformedListings);
      } else {
        // Fallback to mock data if API fails
        console.log('Using mock data as fallback');
        const mockListings: Listing[] = [
          {
            id: '1',
            title: 'iPhone 15 Pro Max Aranıyor',
            description: 'Yeni veya az kullanılmış iPhone 15 Pro Max 256GB arıyorum. Temiz ve eksiksiz olması önemli.',
            category: 'Elektronik',
            condition: 'new',
            budgetMin: 45000,
            budgetMax: 55000,
            deliveryType: 'both',
            city: 'İstanbul',
            status: 'active',
            images: ['/placeholder.jpg'],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            buyerId: '1',
            buyerName: 'Ahmet Yılmaz',
            buyerEmail: 'ahmet.yilmaz@email.com',
            offerCount: 8,
            viewCount: 45
          },
          {
            id: '2',
            title: 'Gaming Laptop',
            description: 'Oyun oynayabileceğim güçlü bir laptop arıyorum. RTX 4060 ve üzeri olması tercih.',
            category: 'Bilgisayar',
            condition: 'used',
            budgetMin: 25000,
            budgetMax: 35000,
            deliveryType: 'shipping',
            city: 'Ankara',
            status: 'active',
            images: [],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            buyerId: '2',
            buyerName: 'Fatma Demir',
            buyerEmail: 'fatma.demir@email.com',
            offerCount: 3,
            viewCount: 23
          },
          {
            id: '3',
            title: 'Spor Salonu Üyeliği',
            description: 'İstanbul Avrupa yakasında gym üyeliği devralabilirim.',
            category: 'Spor',
            condition: 'any',
            budgetMin: 500,
            budgetMax: 1500,
            deliveryType: 'pickup',
            city: 'İstanbul',
            status: 'suspended',
            images: [],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
            buyerId: '3',
            buyerName: 'Mehmet Özkan',
            buyerEmail: 'mehmet.ozkan@email.com',
            offerCount: 0,
            viewCount: 5
          }
        ];

        setListings(mockListings);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('İlanlar yüklenirken hata oluştu');
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = listings;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query) ||
        listing.buyerName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(listing => listing.status === selectedStatus);
    }

    // Approval status filter
    if (selectedApprovalStatus !== 'all') {
      filtered = filtered.filter(listing => listing.approvalStatus === selectedApprovalStatus);
    }

    setFilteredListings(filtered);
  };

  const handleStatusChange = async (listing: Listing, status: string) => {
    try {
      const response = await mysqlAPI.updateListingStatus(listing.id, status);
      if (response.success) {
        setListings(prev => prev.map(l => 
          l.id === listing.id ? { ...l, status: status as any } : l
        ));
        toast.success(`İlan durumu '${getStatusText(status)}' olarak güncellendi`);
      } else {
        toast.error('İlan durumu güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('İlan durumu güncellenirken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'closed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'deleted':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Pasif';
      case 'deleted':
        return 'Silinmiş';
      case 'closed':
        return 'Kapalı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'Sıfır';
      case 'used':
        return '2. El';
      case 'any':
        return 'Farketmez';
      default:
        return condition;
    }
  };

  const getDeliveryText = (delivery: string) => {
    switch (delivery) {
      case 'shipping':
        return 'Kargo';
      case 'pickup':
        return 'Elden Teslim';
      case 'both':
        return 'Her İkisi';
      default:
        return delivery;
    }
  };

  const getApprovalStatusText = (status?: string) => {
    if (!status) return '—'; // NULL veya undefined için
    switch (status) {
      case 'pending':
        return 'Onay Bekliyor';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return '—';
    }
  };

  const getApprovalStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-50 text-gray-400 border-gray-200'; // NULL için çok açık gri
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleApproveListing = async () => {
    if (!selectedListing) return;
    
    try {
      console.log('🎯 Approving listing:', selectedListing.id);
      const response = await mysqlAPI.approveListing(selectedListing.id);
      
      if (response.success) {
        toast.success('İlan onaylandı ve yayına alındı');
        await loadListings(); // Reload listings
      } else {
        toast.error(response.message || 'İlan onaylanırken bir hata oluştu');
      }
    } catch (error) {
      console.error('❌ Approve listing error:', error);
      toast.error('İlan onaylanırken bir hata oluştu');
    } finally {
      setShowApproveDialog(false);
      setSelectedListing(null);
    }
  };

  const handleRejectListing = async () => {
    if (!selectedListing || !rejectionReason.trim()) {
      toast.error('Lütfen red nedeni giriniz');
      return;
    }
    
    try {
      console.log('🎯 Rejecting listing:', selectedListing.id, rejectionReason);
      const response = await mysqlAPI.rejectListing(selectedListing.id, rejectionReason);
      
      if (response.success) {
        toast.success('İlan reddedildi');
        await loadListings(); // Reload listings
      } else {
        toast.error(response.message || 'İlan reddedilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('❌ Reject listing error:', error);
      toast.error('İlan reddedilirken bir hata oluştu');
    } finally {
      setShowRejectDialog(false);
      setSelectedListing(null);
      setRejectionReason('');
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;
    
    try {
      console.log('🗑️ Deleting listing:', selectedListing.id);
      const response = await mysqlAPI.deleteListingAsAdmin(selectedListing.id);
      
      if (response.success) {
        toast.success('İlan silindi');
        await loadListings(); // Reload listings
      } else {
        toast.error(response.message || 'İlan silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('❌ Delete listing error:', error);
      toast.error('İlan silinirken bir hata oluştu');
    } finally {
      setShowDeleteDialog(false);
      setSelectedListing(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>İlanlar yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">İlan Yönetimi</h1>
            <p className="text-gray-600 mt-1">Tüm ilanları görüntüle ve yönet</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam İlan</p>
                  <p className="text-2xl font-bold">{listings.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Onay Bekliyor</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {listings.filter(l => l.approvalStatus === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif İlan</p>
                  <p className="text-2xl font-bold text-green-600">
                    {listings.filter(l => l.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Askıda</p>
                  <p className="text-2xl font-bold text-red-600">
                    {listings.filter(l => l.status === 'suspended').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bu Hafta</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {listings.filter(l => new Date(l.createdAt) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)).length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="İlan ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="deleted">Silinmiş</option>
                <option value="closed">Kapalı</option>
              </select>
              <select
                value={selectedApprovalStatus}
                onChange={(e) => setSelectedApprovalStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Onay Durumları</option>
                <option value="pending">Onay Bekliyor</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Listings Table */}
        <Card>
          <CardHeader>
            <CardTitle>İlanlar ({filteredListings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İlan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Bütçe</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Onay Durumu</TableHead>
                  <TableHead>İlan Sahibi</TableHead>
                  <TableHead>İstatistikler</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => (
                  <TableRow 
                    key={listing.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setPreviewListing(listing);
                      setShowPreviewModal(true);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-start space-x-3">
                        {listing.images.length > 0 ? (
                          <img
                            src={getOptimizedImageUrl(getImageUrl(listing.images[0]))}
                            srcSet={getResponsiveSrcSet(getImageUrl(listing.images[0]), [48, 96])}
                            sizes="48px"
                            alt={listing.title}
                            className="w-12 h-12 rounded-lg object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/image-placeholder.png';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{listing.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{listing.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getConditionText(listing.condition)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getDeliveryText(listing.deliveryType)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="secondary">{listing.category}</Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatPrice(listing.budgetMax)}'ye kadar
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(listing.status)}>
                        {getStatusText(listing.status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className={getApprovalStatusColor(listing.approvalStatus)}>
                          {getApprovalStatusText(listing.approvalStatus)}
                        </Badge>
                        {listing.approvalStatus === 'rejected' && listing.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">
                            {listing.rejectionReason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{listing.buyerName}</div>
                        <div className="text-gray-500">{listing.buyerEmail}</div>
                        <div className="text-gray-500">{listing.city}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span className="font-medium text-blue-600">{listing.offerCount}</span> teklif
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Eye className="h-3 w-3 mr-1" />
                          <span className="font-medium text-green-600">{listing.viewCount}</span> görüntüleme
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Heart className="h-3 w-3 mr-1 text-red-500" />
                          <span className="font-medium text-red-600">{listing.favoriteCount || 0}</span> favori
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {getTimeAgo(listing.createdAt)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/listing/${listing.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Görüntüle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Düzenle
                          </DropdownMenuItem>
                          
                          {/* Approval Actions */}
                          {listing.approvalStatus === 'pending' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedListing(listing);
                                  setShowApproveDialog(true);
                                }}
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                İlanı Onayla
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedListing(listing);
                                  setShowRejectDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                İlanı Reddet
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          {listing.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(listing, 'suspended')}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Askıya Al
                            </DropdownMenuItem>
                          ) : listing.status === 'suspended' ? (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(listing, 'active')}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Aktif Yap
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedListing(listing);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredListings.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">İlan bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>İlanı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedListing && (
                  <>
                    <strong>{selectedListing.title}</strong> ilanını silmek istediğinizden emin misiniz?
                    Bu işlem geri alınamaz.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteListing}
                className="bg-red-600 hover:bg-red-700"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Approve Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>İlanı Onayla</AlertDialogTitle>
              <AlertDialogDescription asChild>
                {selectedListing && (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground line-clamp-2 break-all" title={selectedListing.title}>
                      {selectedListing.title.length > 80 
                        ? selectedListing.title.substring(0, 80) + '...' 
                        : selectedListing.title}
                    </p>
                    <p className="text-muted-foreground">
                      ilanını onaylamak istediğinizden emin misiniz? İlan onaylandığında yayına alınacak ve kullanıcılara görünür olacaktır.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowApproveDialog(false);
                setSelectedListing(null);
              }}>
                İptal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveListing}
                className="bg-green-600 hover:bg-green-700"
              >
                Onayla ve Yayınla
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {previewListing && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{previewListing.title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {/* Images */}
                  {previewListing.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {previewListing.images.map((image, index) => (
                        <img
                          key={index}
                          src={getOptimizedImageUrl(getImageUrl(image))}
                          srcSet={getResponsiveSrcSet(getImageUrl(image), [320, 640])}
                          sizes="(max-width: 768px) 50vw, 320px"
                          alt={`${previewListing.title} - ${index + 1}`}
                          className="w-full h-64 object-cover rounded-lg"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/image-placeholder.png';
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={getStatusColor(previewListing.status)}>
                      <span className="mr-1">📊</span>
                      {getStatusText(previewListing.status)}
                    </Badge>
                    <Badge variant="outline" className={getApprovalStatusColor(previewListing.approvalStatus)}>
                      <span className="mr-1">✅</span>
                      {getApprovalStatusText(previewListing.approvalStatus)}
                    </Badge>
                    <Badge variant="outline">
                      <span className="mr-1">📦</span>
                      {getConditionText(previewListing.condition)}
                    </Badge>
                    <Badge variant="outline">
                      <span className="mr-1">🚚</span>
                      {getDeliveryText(previewListing.deliveryType)}
                    </Badge>
                    <Badge variant="outline">
                      <span className="mr-1">📍</span>
                      {previewListing.city}
                    </Badge>
                    <Badge variant="outline">
                      <span className="mr-1">🏷️</span>
                      {previewListing.category}
                    </Badge>
                  </div>
                  
                  {/* Budget */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Bütçe</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(previewListing.budgetMax)}'ye kadar
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1 text-blue-600" />
                            <span className="font-medium text-blue-600">{previewListing.offerCount}</span> teklif
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1 text-green-600" />
                            <span className="font-medium text-green-600">{previewListing.viewCount}</span> görüntüleme
                          </div>
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-1 text-red-600" />
                            <span className="font-medium text-red-600">{previewListing.favoriteCount || 0}</span> favori
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Açıklama</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{previewListing.description}</p>
                  </div>
                  
                  {/* Owner Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">İlan Sahibi Bilgileri</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">İsim</p>
                        <p className="font-medium">{previewListing.buyerName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">E-posta</p>
                        <p className="font-medium">{previewListing.buyerEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Şehir</p>
                        <p className="font-medium">{previewListing.city}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Oluşturulma</p>
                        <p className="font-medium">{getTimeAgo(previewListing.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rejection Reason if rejected */}
                  {previewListing.approvalStatus === 'rejected' && previewListing.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Red Nedeni
                      </h3>
                      <p className="text-red-800">{previewListing.rejectionReason}</p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {previewListing.approvalStatus === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedListing(previewListing);
                          setShowPreviewModal(false);
                          setShowApproveDialog(true);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        İlanı Onayla
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedListing(previewListing);
                          setShowPreviewModal(false);
                          setShowRejectDialog(true);
                        }}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        İlanı Reddet
                      </Button>
                    </div>
                  )}
                  
                  {/* View on Site Button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(`/listing/${previewListing.id}`, '_blank')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Sitede Görüntüle
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>İlanı Reddet</AlertDialogTitle>
              <AlertDialogDescription asChild>
                {selectedListing && (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground line-clamp-2 break-all" title={selectedListing.title}>
                        {selectedListing.title.length > 80 
                          ? selectedListing.title.substring(0, 80) + '...' 
                          : selectedListing.title}
                      </p>
                      <p className="text-muted-foreground mt-1">ilanını reddetmek istediğinizden emin misiniz?</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Red Nedeni <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        placeholder="İlanın neden reddedildiğini açıklayınız (kullanıcıya e-posta ile gönderilecektir)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowRejectDialog(false);
                setSelectedListing(null);
                setRejectionReason('');
              }}>
                İptal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRejectListing}
                className="bg-red-600 hover:bg-red-700"
                disabled={!rejectionReason.trim()}
              >
                Reddet
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}