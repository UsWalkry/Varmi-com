import { useState, useEffect } from 'react';
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
  ShoppingCart, 
  Search, 
  MoreHorizontal, 
  Eye,
  Edit,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { mysqlAPI } from '@/lib/mysql-api';
import { getTimeAgo } from '@/lib/uiUtils';
import { formatPrice } from '@/utils/formatPrice';

interface Order {
  id: string;
  orderNumber: string;
  listingTitle: string;
  buyerName: string;
  sellerName: string;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  shippingAddress: string;
  trackingNumber?: string;
}

const orderStatusConfig = {
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  preparing: { label: 'Hazırlanıyor', color: 'bg-orange-100 text-orange-800', icon: Package },
  shipped: { label: 'Kargoda', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const response = await mysqlAPI.getAdminOrders({
        page: 1,
        limit: 50,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      
      if (response.success) {
        setOrders(response.orders || []);
      } else {
        console.error('Failed to load orders:', response);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.listingTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const response = await mysqlAPI.updateOrderStatus(orderId, status);
      
      if (response.success) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: status as any } : order
        ));
        
        setShowStatusDialog(false);
        setSelectedOrder(null);
        setNewStatus('');
      } else {
        console.error('Failed to update order status:', response);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = orderStatusConfig[status as keyof typeof orderStatusConfig];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, order) => sum + order.totalAmount, 0);

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
            <h1 className="text-3xl font-bold">Sipariş Yönetimi</h1>
            <p className="text-gray-600">Tüm siparişleri görüntüleyin ve yönetin</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beklemede</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hazırlanıyor</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{orderStats.preparing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kargoda</CardTitle>
              <Truck className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{orderStats.shipped}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teslim Edildi</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{orderStats.delivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <AlertTriangle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-600">{formatPrice(totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Siparişler ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sipariş no, ürün, alıcı veya satıcı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="preparing">Hazırlanıyor</option>
                <option value="shipped">Kargoda</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            {/* Orders Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Alıcı</TableHead>
                    <TableHead>Satıcı</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Adres</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <ShoppingCart className="h-8 w-8 text-gray-400" />
                          <p className="text-gray-500">Sipariş bulunamadı</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                          {order.trackingNumber && (
                            <div className="text-xs text-gray-500">
                              Takip: {order.trackingNumber}
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium">{order.listingTitle}</div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {order.buyerName}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {order.sellerName}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium">
                            {formatPrice(order.totalAmount)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {order.shippingAddress}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {getTimeAgo(order.createdAt)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right">
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
                                <Link to={`/admin/orders/${order.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Detayları Görüntüle
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowStatusDialog(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Durumu Güncelle
                              </DropdownMenuItem>
                              {order.status === 'shipped' && (
                                <DropdownMenuItem>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Kargo Takibi
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sipariş Durumunu Güncelle</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedOrder?.orderNumber} numaralı siparişin durumunu güncelleyin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Yeni Durum</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Durum seçin</option>
                  <option value="pending">Beklemede</option>
                  <option value="preparing">Hazırlanıyor</option>
                  <option value="shipped">Kargoda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowStatusDialog(false);
                setSelectedOrder(null);
                setNewStatus('');
              }}>
                İptal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedOrder && handleStatusUpdate(selectedOrder.id, newStatus)}
                disabled={!newStatus}
              >
                Güncelle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}