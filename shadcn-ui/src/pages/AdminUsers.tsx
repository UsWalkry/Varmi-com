import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Search, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { mysqlAPI } from '@/lib/mysql-api';
import { getTimeAgo } from '@/lib/uiUtils';
import { toast } from 'sonner';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended' | 'pending';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
  lastLoginAt?: string;
  listingCount: number;
  orderCount: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    recipientUser: null as User | null
  });
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'user'
  });
  const [editingUser, setEditingUser] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, selectedStatus]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Real API call
      const response = await mysqlAPI.getAdminUsers();
      console.log('Admin users response:', response);
      
      if (response.success && response.users) {
        // Transform MySQL data to match our interface
        const transformedUsers: User[] = response.users.map((user: any) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          status: user.status || 'active',
          isEmailVerified: user.emailVerified === true || user.emailVerified === 1,
          isPhoneVerified: false, // Varsayılan
          role: user.role || 'user',
          createdAt: user.createdAt,
          lastLoginAt: user.lastActive,
          listingCount: user.listingCount || 0,
          orderCount: user.orderCount || 0
        }));
        
        setUsers(transformedUsers);
      } else {
        // Fallback to mock data if API fails
        console.log('Using mock data as fallback');
        const mockUsers: User[] = [
          {
            id: '1',
            firstName: 'Ahmet',
            lastName: 'Yılmaz',
            email: 'ahmet.yilmaz@email.com',
            phone: '+90 532 123 4567',
            status: 'active',
            isEmailVerified: true,
            isPhoneVerified: true,
            role: 'user',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
            lastLoginAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            listingCount: 5,
            orderCount: 12
          },
          {
            id: '2',
            firstName: 'Fatma',
            lastName: 'Demir',
            email: 'fatma.demir@email.com',
            phone: '+90 533 987 6543',
            status: 'active',
            isEmailVerified: true,
            isPhoneVerified: false,
            role: 'user',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
            lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            listingCount: 3,
            orderCount: 7
          },
          {
            id: '3',
            firstName: 'Mehmet',
            lastName: 'Özkan',
            email: 'mehmet.ozkan@email.com',
            status: 'suspended',
            isEmailVerified: true,
            isPhoneVerified: false,
            role: 'user',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            listingCount: 1,
            orderCount: 0
          },
          {
            id: '4',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@varmii.com',
            status: 'active',
            isEmailVerified: true,
            isPhoneVerified: true,
            role: 'admin',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
            lastLoginAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            listingCount: 0,
            orderCount: 0
          }
        ];

        setUsers(mockUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Kullanıcılar yüklenirken hata oluştu');
      // Mock data as fallback
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(user => user.status === selectedStatus);
    }

    setFilteredUsers(filtered);
  };

  const handleSuspendUser = async (user: User) => {
    try {
      const response = await mysqlAPI.suspendUser(user.id);
      if (response.success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, status: 'suspended' as const } : u
        ));
        toast.success(`${user.firstName} ${user.lastName} askıya alındı`);
      } else {
        toast.error('Kullanıcı askıya alınırken hata oluştu');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Kullanıcı askıya alınırken hata oluştu');
    }
  };

  const handleActivateUser = async (user: User) => {
    try {
      const response = await mysqlAPI.activateUser(user.id);
      if (response.success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, status: 'active' as const } : u
        ));
        toast.success(`${user.firstName} ${user.lastName} aktif hale getirildi`);
      } else {
        toast.error('Kullanıcı aktif hale getirilirken hata oluştu');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Kullanıcı aktif hale getirilirken hata oluştu');
    }
  };

  const handleCreateUser = async () => {
    try {
      // Form validasyonu
      if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
        toast.error('Lütfen tüm gerekli alanları doldurun');
        return;
      }

      if (newUser.password.length < 6) {
        toast.error('Şifre en az 6 karakter olmalıdır');
        return;
      }

      const response = await mysqlAPI.createUser(newUser);
      if (response.success) {
        toast.success('Kullanıcı başarıyla oluşturuldu');
        setShowCreateUserModal(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          role: 'user'
        });
        // Kullanıcı listesini yenile
        loadUsers();
      } else {
        toast.error(response.message || 'Kullanıcı oluşturulurken hata oluştu');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Kullanıcı oluşturulurken hata oluştu');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      password: '', // Şifreyi boş bırak
      role: user.role
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      // Form validasyonu
      if (!editingUser.firstName || !editingUser.lastName || !editingUser.email) {
        toast.error('Ad, soyad ve email gereklidir');
        return;
      }

      // Şifre kontrol et (opsiyonel)
      if (editingUser.password && editingUser.password.length < 6) {
        toast.error('Şifre en az 6 karakter olmalıdır');
        return;
      }

      const updateData = {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        ...(editingUser.password && { password: editingUser.password })
      };

      const response = await mysqlAPI.updateUser(editingUser.id, updateData);
      if (response.success) {
        toast.success('Kullanıcı başarıyla güncellendi');
        setShowEditUserModal(false);
        setEditingUser({
          id: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          role: 'user'
        });
        // Kullanıcı listesini yenile
        loadUsers();
      } else {
        toast.error(response.message || 'Kullanıcı güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Kullanıcı güncellenirken hata oluştu');
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      const response = await mysqlAPI.deleteUser(user.id);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        toast.success(response.message || `${user.firstName} ${user.lastName} silindi`);
      } else {
        toast.error(response.message || 'Kullanıcı silinemedi');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Kullanıcı silinirken hata oluştu');
    } finally {
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  const handleResendVerification = async (user: User) => {
    try {
      const response = await mysqlAPI.adminResendVerification(user.id);
      if (response.success) {
        toast.success(response.message || 'Doğrulama emaili gönderildi');
      } else {
        toast.error(response.message || 'Email gönderilemedi');
      }
    } catch (error) {
      console.error('Error resending verification:', error);
      toast.error('Doğrulama emaili gönderilemedi');
    }
  };

  const handleSendEmail = (user: User) => {
    setEmailData({
      subject: '',
      message: '',
      recipientUser: user
    });
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async () => {
    try {
      if (!emailData.subject || !emailData.message || !emailData.recipientUser) {
        toast.error('Konu ve mesaj alanları gereklidir');
        return;
      }

      const response = await mysqlAPI.sendEmailToUser(emailData.recipientUser.id, {
        subject: emailData.subject,
        message: emailData.message
      });

      if (response.success) {
        toast.success(response.message || 'Email başarıyla gönderildi');
        setShowEmailModal(false);
        setEmailData({
          subject: '',
          message: '',
          recipientUser: null
        });
      } else {
        toast.error(response.message || 'Email gönderilemedi');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Email gönderilirken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'suspended':
        return 'Askıda';
      case 'pending':
        return 'Beklemede';
      default:
        return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'moderator':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderatör';
      default:
        return 'Kullanıcı';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Kullanıcılar yükleniyor...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
            <p className="text-gray-600 mt-1">Tüm kullanıcıları görüntüle ve yönet</p>
          </div>
          <Button onClick={() => setShowCreateUserModal(true)}>
            <Users className="h-4 w-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Kullanıcı</p>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.status === 'active').length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Askıda</p>
                  <p className="text-2xl font-bold text-red-600">
                    {users.filter(u => u.status === 'suspended').length}
                  </p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Yeni (Bu Ay)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
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
                  placeholder="Kullanıcı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="suspended">Askıda</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcılar ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Aktivite</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src="" alt={`${user.firstName} ${user.lastName}`} />
                          <AvatarFallback>
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.listingCount} ilan, {user.orderCount} sipariş</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          {user.email}
                          {user.isEmailVerified && (
                            <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                          )}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {user.phone}
                            {user.isPhoneVerified ? (
                              <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 ml-1 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {getStatusText(user.status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className={getRoleColor(user.role)}>
                        {getRoleText(user.role)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {user.lastLoginAt ? (
                          <span className="text-green-600">
                            {getTimeAgo(user.lastLoginAt)}
                          </span>
                        ) : (
                          <span className="text-gray-500">Hiçbir zaman</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {getTimeAgo(user.createdAt)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={() => console.log('Dropdown clicked for user:', user.email)}
                          >
                            <span className="sr-only">Menüyü aç</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSendEmail(user)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Email Gönder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowSuspendDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Askıya Al
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivateUser(user)}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Aktif Hale Getir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleResendVerification(user)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Doğrulama Maili Gönder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Kullanıcıyı Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Kullanıcı bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete User Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser && (
                  <>
                    <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email}) kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz?{' '}
                    Bu işlem geri alınamaz. Kullanıcının tüm ilanları pasife alınacaktır.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedUser && handleDeleteUser(selectedUser)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suspend Dialog */}
        <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kullanıcıyı Askıya Al</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser && (
                  <>
                    <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> kullanıcısını askıya almak istediğinizden emin misiniz?
                    Bu işlem kullanıcının platformu kullanmasını engelleyecektir.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedUser) {
                    handleSuspendUser(selectedUser);
                  }
                  setShowSuspendDialog(false);
                  setSelectedUser(null);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Askıya Al
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create User Modal */}
        <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
              <DialogDescription>
                Sisteme yeni bir kullanıcı ekleyin. Tüm gerekli bilgileri doldurun.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Ad</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Ad"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Soyad</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Soyad"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon (Opsiyonel)</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="En az 6 karakter"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Kullanıcı</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateUserModal(false)}>
                İptal
              </Button>
              <Button onClick={handleCreateUser}>
                Kullanıcı Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
              <DialogDescription>
                Kullanıcı bilgilerini güncelleyin. Şifre alanını boş bırakırsanız mevcut şifre korunur.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editFirstName">Ad</Label>
                  <Input
                    id="editFirstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Ad"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editLastName">Soyad</Label>
                  <Input
                    id="editLastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Soyad"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editPhone">Telefon (Opsiyonel)</Label>
                <Input
                  id="editPhone"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editPassword">Yeni Şifre (Opsiyonel)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Yeni şifre (boş bırakabilirsiniz)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editRole">Rol</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Kullanıcı</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateUser}>
                Kullanıcıyı Güncelle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Modal */}
        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Email Gönder</DialogTitle>
              <DialogDescription>
                {emailData.recipientUser && `${emailData.recipientUser.firstName} ${emailData.recipientUser.lastName} (${emailData.recipientUser.email}) adresine email gönderin`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="emailSubject">Konu</Label>
                <Input
                  id="emailSubject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email konusu"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emailMessage">Mesaj</Label>
                <textarea
                  id="emailMessage"
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Email mesajı buraya yazın..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                İptal
              </Button>
              <Button onClick={handleEmailSubmit}>
                <Mail className="mr-2 h-4 w-4" />
                Email Gönder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}