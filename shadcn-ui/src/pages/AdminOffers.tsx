import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tag, 
  Search, 
  MoreHorizontal, 
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import { getTimeAgo } from '@/lib/uiUtils';
import { formatPrice } from '@/utils/formatPrice';
import { toast } from 'sonner';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/imageOptimization';

interface Offer {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCategory: string;
  listingBudget: number;
  productName: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  deliveryType: string;
  shippingDesi: number;
  shippingCost: number;
  etaDays: number;
  status: 'active' | 'inactive' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  buyer: {
    name: string;
    email: string;
    phone: string;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

const offerStatusConfig = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inactive: { label: 'İnaktif', color: 'bg-gray-100 text-gray-600', icon: Clock },
  accepted: { label: 'Kabul Edildi', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800', icon: XCircle },
  withdrawn: { label: 'Geri Çekildi', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  expired: { label: 'Süresi Doldu', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
};

const approvalStatusConfig = {
  pending: { label: '⏳ Onay Bekliyor', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Clock },
  approved: { label: '✅ Onaylandı', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  rejected: { label: '❌ Reddedildi', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle }
};

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');
  
  // Onay/Red dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);

  useEffect(() => {
    loadOffers();
  }, [statusFilter]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      
      const response = await mysqlAPI.getAdminOffers({
        page: 1,
        limit: 100,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      
      console.log('📊 Admin offers response:', response);
      
      if (response.success) {
        setOffers(response.offers || []);
      } else {
        console.error('Failed to load offers:', response);
        setOffers([]);
        toast.error('Teklifler yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading offers:', error);
      setOffers([]);
      toast.error('Teklifler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.listingTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.seller.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = offer.approval_status === 'pending';
    } else if (statusFilter !== 'all') {
      matchesStatus = offer.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = async (offerId: string) => {
    try {
      const response = await mysqlAPI.getAdminOfferDetail(offerId);
      
      if (response.success && response.offer) {
        setSelectedOffer(response.offer);
        setShowDetailDialog(true);
      } else {
        toast.error('Teklif detayları yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading offer details:', error);
      toast.error('Teklif detayları yüklenirken hata oluştu');
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOffer || !newStatus) return;

    try {
      const response = await mysqlAPI.updateOfferStatusAsAdmin(
        selectedOffer.id, 
        newStatus, 
        statusReason || undefined
      );
      
      if (response.success) {
        toast.success('Teklif durumu güncellendi');
        setShowStatusDialog(false);
        setSelectedOffer(null);
        setNewStatus('');
        setStatusReason('');
        loadOffers();
      } else {
        toast.error('Teklif durumu güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
      toast.error('Teklif durumu güncellenirken hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!selectedOffer) return;

    try {
      const response = await mysqlAPI.deleteOfferAsAdmin(selectedOffer.id);
      
      if (response.success) {
        toast.success('Teklif silindi');
        setShowDeleteDialog(false);
        setSelectedOffer(null);
        loadOffers();
      } else {
        toast.error(response.message || 'Teklif silinemedi');
      }
    } catch (error: any) {
      console.error('Error deleting offer:', error);
      toast.error(error.message || 'Teklif silinirken hata oluştu');
    }
  };

  const handleApprove = async () => {
    if (!selectedOffer) return;

    try {
      const response = await mysqlAPI.approveOfferAsAdmin(selectedOffer.id);
      
      if (response.success) {
        toast.success('✅ Teklif onaylandı');
        setShowApproveDialog(false);
        setSelectedOffer(null);
        loadOffers();
      } else {
        toast.error(response.message || 'Teklif onaylanamadı');
      }
    } catch (error: any) {
      console.error('Error approving offer:', error);
      toast.error(error.message || 'Teklif onaylanırken hata oluştu');
    }
  };

  const handleReject = async () => {
    if (!selectedOffer) return;
    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebini girin');
      return;
    }

    try {
      const response = await mysqlAPI.rejectOfferAsAdmin(selectedOffer.id, rejectionReason);
      
      if (response.success) {
        toast.success('❌ Teklif reddedildi');
        setShowRejectDialog(false);
        setSelectedOffer(null);
        setRejectionReason('');
        loadOffers();
      } else {
        toast.error(response.message || 'Teklif reddedilemedi');
      }
    } catch (error: any) {
      console.error('Error rejecting offer:', error);
      toast.error(error.message || 'Teklif reddedilirken hata oluştu');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = offerStatusConfig[status as keyof typeof offerStatusConfig];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getApprovalBadge = (approval_status?: string) => {
    if (!approval_status) return null;
    const config = approvalStatusConfig[approval_status as keyof typeof approvalStatusConfig];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1 border`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const offerStats = {
    total: offers.length,
    pendingApproval: offers.filter(o => o.approval_status === 'pending').length,
    active: offers.filter(o => o.status === 'active').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    rejected: offers.filter(o => o.status === 'rejected').length,
    withdrawn: offers.filter(o => o.status === 'withdrawn').length,
    expired: offers.filter(o => o.status === 'expired').length,
  };

  const totalValue = offers
    .filter(o => o.status === 'active' || o.status === 'accepted')
    .reduce((sum, offer) => sum + (offer.price * offer.quantity), 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Yükleniyor...</div>
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
            <h1 className="text-3xl font-bold">Teklif Yönetimi</h1>
            <p className="text-gray-600">Tüm teklifleri görüntüleyin ve yönetin</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerStats.total}</div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-orange-50 transition-colors"
            onClick={() => setStatusFilter('pending')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onay Bekliyor</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{offerStats.pendingApproval}</div>
              {offerStats.pendingApproval > 0 && (
                <p className="text-xs text-orange-600 mt-1">İşlem gerekli!</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerStats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kabul Edildi</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerStats.accepted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reddedildi</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerStats.rejected}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Süresi Doldu</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerStats.expired}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Değer</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="İlan, ürün, alıcı veya satıcı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Durum filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="pending">⏳ Onay Bekleyenler</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">İnaktif</SelectItem>
                    <SelectItem value="accepted">Kabul Edildi</SelectItem>
                    <SelectItem value="rejected">Reddedildi</SelectItem>
                    <SelectItem value="withdrawn">Geri Çekildi</SelectItem>
                    <SelectItem value="expired">Süresi Doldu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Offers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İlan</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Satıcı</TableHead>
                  <TableHead>Alıcı</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Toplam</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Onay Durumu</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Filtre kriterlerine uygun teklif bulunamadı' 
                        : 'Henüz teklif bulunmuyor'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOffers.map((offer) => (
                    <TableRow 
                      key={offer.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setPreviewOffer(offer);
                        setShowPreviewModal(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{offer.listingTitle}</span>
                          <span className="text-sm text-gray-500">{offer.listingCategory}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={offer.productName}>
                          {offer.productName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{offer.seller.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{offer.buyer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(offer.price)}</TableCell>
                      <TableCell>{offer.quantity}</TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(offer.price * offer.quantity)}
                      </TableCell>
                      <TableCell>{getStatusBadge(offer.status)}</TableCell>
                      <TableCell>{getApprovalBadge(offer.approval_status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {getTimeAgo(offer.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewDetails(offer.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Detayları Görüntüle
                            </DropdownMenuItem>
                            
                            {/* Onay/Red İşlemleri - sadece pending olanlar için */}
                            {offer.approval_status === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setShowApproveDialog(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Onayla
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setRejectionReason('');
                                    setShowRejectDialog(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reddet
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedOffer(offer);
                                setNewStatus(offer.status);
                                setShowStatusDialog(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Durumu Değiştir
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedOffer(offer);
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teklif Detayları</DialogTitle>
          </DialogHeader>
          
          {selectedOffer && (
            <div className="space-y-6">
              {/* İlan Bilgileri */}
              <div>
                <h3 className="font-semibold text-lg mb-3">İlan Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">İlan Başlığı</p>
                    <p className="font-medium">{selectedOffer.listingTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kategori</p>
                    <p className="font-medium">{selectedOffer.listingCategory}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bütçe</p>
                    <p className="font-medium">{formatPrice(selectedOffer.listingBudget)}</p>
                  </div>
                </div>
              </div>

              {/* Teklif Bilgileri */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Teklif Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Ürün Adı</p>
                    <p className="font-medium">{selectedOffer.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Durum</p>
                    <p className="font-medium">{selectedOffer.condition}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fiyat</p>
                    <p className="font-medium text-lg text-blue-600">{formatPrice(selectedOffer.price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Miktar</p>
                    <p className="font-medium">{selectedOffer.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Toplam Tutar</p>
                    <p className="font-medium text-lg text-green-600">
                      {formatPrice(selectedOffer.price * selectedOffer.quantity)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teslimat Süresi</p>
                    <p className="font-medium">{selectedOffer.etaDays} gün</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teklif Durumu</p>
                    <div>{getStatusBadge(selectedOffer.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Onay Durumu</p>
                    <div>{getApprovalBadge(selectedOffer.approval_status)}</div>
                  </div>
                </div>
              </div>

              {/* Onay Bilgileri - varsa göster */}
              {(selectedOffer.approval_status === 'approved' || selectedOffer.approval_status === 'rejected') && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Onay Bilgileri</h3>
                  <div className={`p-4 rounded-lg border-2 ${
                    selectedOffer.approval_status === 'approved' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Onaylayan Admin</p>
                        <p className="font-medium">{selectedOffer.approved_by || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Onay Tarihi</p>
                        <p className="font-medium">
                          {selectedOffer.approved_at ? new Date(selectedOffer.approved_at).toLocaleString('tr-TR') : '-'}
                        </p>
                      </div>
                    </div>
                    {selectedOffer.approval_status === 'rejected' && selectedOffer.rejection_reason && (
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <p className="text-sm text-gray-500 mb-2">Red Sebebi</p>
                        <p className="text-sm text-red-800 bg-white p-3 rounded border border-red-200">
                          {selectedOffer.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Kargo Bilgileri */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Kargo Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Teslimat Türü</p>
                    <p className="font-medium">{selectedOffer.deliveryType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kargo Ücreti</p>
                    <p className="font-medium">{formatPrice(selectedOffer.shippingCost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Desi</p>
                    <p className="font-medium">{selectedOffer.shippingDesi}</p>
                  </div>
                </div>
              </div>

              {/* Satıcı ve Alıcı Bilgileri */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Satıcı Bilgileri</h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Ad Soyad</p>
                      <p className="font-medium">{selectedOffer.seller.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">E-posta</p>
                      <p className="font-medium">{selectedOffer.seller.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium">{selectedOffer.seller.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Alıcı Bilgileri</h3>
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Ad Soyad</p>
                      <p className="font-medium">{selectedOffer.buyer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">E-posta</p>
                      <p className="font-medium">{selectedOffer.buyer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium">{selectedOffer.buyer.phone || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Açıklama */}
              {selectedOffer.description && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Açıklama</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedOffer.description}</p>
                  </div>
                </div>
              )}

              {/* Tarihler */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Tarih Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Oluşturulma</p>
                    <p className="font-medium">
                      {new Date(selectedOffer.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Son Güncelleme</p>
                    <p className="font-medium">
                      {new Date(selectedOffer.updatedAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {selectedOffer.validUntil && (
                    <div>
                      <p className="text-sm text-gray-500">Geçerlilik Süresi</p>
                      <p className="font-medium">
                        {new Date(selectedOffer.validUntil).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklif Durumunu Değiştir</DialogTitle>
            <DialogDescription>
              {selectedOffer?.productName} için teklif durumunu değiştirin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Yeni Durum</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="accepted">Kabul Edildi</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                  <SelectItem value="withdrawn">Geri Çekildi</SelectItem>
                  <SelectItem value="expired">Süresi Doldu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Sebep (Opsiyonel)</label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Durum değişikliği sebebini yazın..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleStatusUpdate} disabled={!newStatus}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklifi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedOffer?.productName}</strong> için yapılan bu teklifi silmek istediğinizden emin misiniz?
              <br /><br />
              Bu işlem geri alınamaz!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>✅ Teklifi Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedOffer?.productName}</strong> için yapılan bu teklifi onaylamak istediğinizden emin misiniz?
              <br /><br />
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  • Teklif aktif hale gelecek ve kullanıcılar tarafından görülebilecek
                  <br />
                  • Satıcı e-posta ile bilgilendirilecek
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove} 
              className="bg-green-600 hover:bg-green-700"
            >
              Onayla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog with Reason */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Teklifi Reddet</DialogTitle>
            <DialogDescription>
              <strong>{selectedOffer?.productName}</strong> için yapılan teklifi reddetmek için lütfen bir sebep belirtin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Red Sebebi *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Örn: Teklif politikalarımıza uymuyor, Ürün açıklaması yetersiz, Fiyat anormal derecede düşük..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Bu sebep satıcıya e-posta ile iletilecektir.
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Dikkat:</strong> Teklif reddedildiğinde:
                <br />
                • Teklif reddedildi olarak işaretlenecek
                <br />
                • Satıcı e-posta ile bilgilendirilecek
                <br />
                • Bu işlem geri alınamaz
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
            >
              İptal
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Teklif Önizleme - {previewOffer?.productName}
            </DialogTitle>
          </DialogHeader>
          
          {previewOffer && (
            <div className="space-y-6">
              {/* Images Grid */}
              {previewOffer.images && previewOffer.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {previewOffer.images.map((image, index) => (
                    <img
                      key={index}
                      src={getOptimizedImageUrl(getImageUrl(image))}
                      srcSet={getResponsiveSrcSet(getImageUrl(image), [320, 640])}
                      sizes="(max-width: 768px) 50vw, 320px"
                      alt={`${previewOffer.productName} ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg border"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {/* Offer Status */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${offerStatusConfig[previewOffer.status].color}`}>
                  {offerStatusConfig[previewOffer.status].icon && 
                    React.createElement(offerStatusConfig[previewOffer.status].icon, { size: 16 })}
                  {offerStatusConfig[previewOffer.status].label}
                </div>

                {/* Approval Status */}
                {previewOffer.approval_status && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${approvalStatusConfig[previewOffer.approval_status].color}`}>
                    {approvalStatusConfig[previewOffer.approval_status].icon && 
                      React.createElement(approvalStatusConfig[previewOffer.approval_status].icon, { size: 16 })}
                    {approvalStatusConfig[previewOffer.approval_status].label}
                  </div>
                )}

                {/* Condition */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border bg-blue-100 text-blue-800 border-blue-300">
                  <Package size={16} />
                  {previewOffer.condition}
                </div>

                {/* Delivery Type */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border bg-purple-100 text-purple-800 border-purple-300">
                  <TrendingUp size={16} />
                  {previewOffer.deliveryType}
                </div>
              </div>

              {/* Pricing & Stats Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Teklif Fiyatı</p>
                    <p className="text-2xl font-bold text-green-700">{formatPrice(previewOffer.price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Miktar</p>
                    <p className="text-2xl font-bold text-gray-800">{previewOffer.quantity} adet</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kargo Ücreti</p>
                    <p className="text-2xl font-bold text-gray-800">{formatPrice(previewOffer.shippingCost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Teslimat</p>
                    <p className="text-2xl font-bold text-gray-800">{previewOffer.etaDays} gün</p>
                  </div>
                </div>
              </div>

              {/* Related Listing Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">İlgili İlan</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Başlık:</span> {previewOffer.listingTitle}</p>
                  <p><span className="font-medium">Kategori:</span> {previewOffer.listingCategory}</p>
                  <p><span className="font-medium">Bütçe:</span> {formatPrice(previewOffer.listingBudget)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Teklif Açıklaması</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border">
                  {previewOffer.description}
                </p>
              </div>

              {/* Seller Info */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User size={18} />
                  Satıcı Bilgileri
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">İsim</p>
                    <p className="font-medium">{previewOffer.seller.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">E-posta</p>
                    <p className="font-medium">{previewOffer.seller.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Telefon</p>
                    <p className="font-medium">{previewOffer.seller.phone || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Oluşturma</p>
                    <p className="font-medium">{new Date(previewOffer.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User size={18} />
                  Alıcı Bilgileri
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">İsim</p>
                    <p className="font-medium">{previewOffer.buyer.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">E-posta</p>
                    <p className="font-medium">{previewOffer.buyer.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Telefon</p>
                    <p className="font-medium">{previewOffer.buyer.phone || 'Belirtilmemiş'}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Details */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Kargo Detayları</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-purple-700">Desi</p>
                    <p className="font-medium">{previewOffer.shippingDesi}</p>
                  </div>
                  <div>
                    <p className="text-purple-700">Kargo Ücreti</p>
                    <p className="font-medium">{formatPrice(previewOffer.shippingCost)}</p>
                  </div>
                  <div>
                    <p className="text-purple-700">Tahmini Teslimat</p>
                    <p className="font-medium">{previewOffer.etaDays} gün</p>
                  </div>
                </div>
              </div>

              {/* Rejection Reason (if rejected) */}
              {previewOffer.approval_status === 'rejected' && previewOffer.rejection_reason && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-2">❌ Red Sebebi</h3>
                  <p className="text-red-800">{previewOffer.rejection_reason}</p>
                  {previewOffer.approved_at && (
                    <p className="text-sm text-red-600 mt-2">
                      Reddedilme: {new Date(previewOffer.approved_at).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons (only for pending offers) */}
              {previewOffer.approval_status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setSelectedOffer(previewOffer);
                      setShowApproveDialog(true);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Teklifi Onayla
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setSelectedOffer(previewOffer);
                      setShowRejectDialog(true);
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle size={18} className="mr-2" />
                    Teklifi Reddet
                  </Button>
                </div>
              )}

              {/* View Listing Button */}
              <Button
                onClick={() => window.open(`/listing/${previewOffer.listingId}`, '_blank')}
                variant="outline"
                className="w-full"
              >
                İlanı Sitede Görüntüle
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
