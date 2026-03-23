import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { mysqlAPI } from '@/lib/mysql-api';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Store, Loader2, Eye, Mail, Phone, MapPin, Building2, FileText } from 'lucide-react';

interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_description?: string;
  business_type: 'individual' | 'company';
  tax_office?: string;
  tax_number?: string;
  company_name?: string;
  trade_registry_number?: string;
  mersis_number?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_city?: string;
  business_district?: string;
  business_postal_code?: string;
  bank_name?: string;
  iban?: string;
  account_holder_name?: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string;
  suspended_reason?: string;
  created_at: string;
  updated_at: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export default function AdminSellerProfiles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  const [profiles, setProfiles] = useState<SellerProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SellerProfile | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [activeTab]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await mysqlAPI.getAdminSellerProfiles(activeTab);
      
      if (response.success) {
        setProfiles(response.data || []);
      } else {
        toast.error('Satıcı profilleri yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading seller profiles:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (profileId: string) => {
    try {
      const response = await mysqlAPI.getAdminSellerProfile(profileId);
      
      if (response.success && response.data) {
        setSelectedProfile(response.data);
        setDetailDialog(true);
      } else {
        toast.error('Profil detayları yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading profile details:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleApprove = async (profileId: string) => {
    try {
      setProcessing(true);
      const response = await mysqlAPI.approveSellerProfile(profileId);
      
      if (response.success) {
        toast.success('Satıcı profili onaylandı');
        setDetailDialog(false);
        loadProfiles();
      } else {
        toast.error(response.error || 'Onaylama başarısız');
      }
    } catch (error) {
      console.error('Error approving profile:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProfile || !rejectReason.trim()) {
      toast.error('Red nedeni belirtiniz');
      return;
    }

    try {
      setProcessing(true);
      const response = await mysqlAPI.rejectSellerProfile(selectedProfile.id, rejectReason);
      
      if (response.success) {
        toast.success('Satıcı profili reddedildi');
        setRejectDialog(false);
        setDetailDialog(false);
        setRejectReason('');
        loadProfiles();
      } else {
        toast.error(response.error || 'Reddetme başarısız');
      }
    } catch (error) {
      console.error('Error rejecting profile:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Onaylandı
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Bekliyor
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Reddedildi
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Askıya Alındı
          </Badge>
        );
      default:
        return null;
    }
  };

  const ProfileCard = ({ profile }: { profile: SellerProfile }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{profile.store_name}</CardTitle>
              <CardDescription>
                {profile.firstName} {profile.lastName}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge(profile.approval_status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {profile.business_type === 'company' ? 'Şirket' : 'Şahıs Firması'}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            {profile.email}
          </div>
          {profile.business_city && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {profile.business_city}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(profile.id)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Detaylar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Satıcı Profilleri</h1>
            <p className="text-muted-foreground">Satıcı başvurularını inceleyin ve onaylayın</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">
              Bekleyenler
              {!loading && activeTab === 'pending' && profiles.length > 0 && (
                <Badge className="ml-2" variant="secondary">{profiles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Onaylananlar</TabsTrigger>
            <TabsTrigger value="rejected">Reddedilenler</TabsTrigger>
            <TabsTrigger value="suspended">Askıya Alınanlar</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <TabsContent value="pending" className="mt-6">
                {profiles.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      Bekleyen satıcı profili bulunmuyor
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(profile => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                {profiles.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      Onaylanmış satıcı profili bulunmuyor
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(profile => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                {profiles.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      Reddedilmiş satıcı profili bulunmuyor
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(profile => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="suspended" className="mt-6">
                {profiles.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      Askıya alınmış satıcı profili bulunmuyor
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(profile => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedProfile.store_name}</DialogTitle>
                    <DialogDescription>
                      {selectedProfile.firstName} {selectedProfile.lastName}
                    </DialogDescription>
                  </div>
                  {getStatusBadge(selectedProfile.approval_status)}
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Mağaza Bilgileri */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Mağaza Bilgileri</h3>
                  <div className="space-y-2 text-sm">
                    {selectedProfile.store_description && (
                      <div>
                        <span className="font-medium">Açıklama:</span>
                        <p className="text-muted-foreground mt-1">{selectedProfile.store_description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* İşletme Bilgileri */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">İşletme Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">İşletme Tipi:</span>
                      <p className="text-muted-foreground">
                        {selectedProfile.business_type === 'company' ? 'Şirket' : 'Şahıs Firması'}
                      </p>
                    </div>
                    {selectedProfile.company_name && (
                      <div>
                        <span className="font-medium">Şirket Adı:</span>
                        <p className="text-muted-foreground">{selectedProfile.company_name}</p>
                      </div>
                    )}
                    {selectedProfile.tax_office && (
                      <div>
                        <span className="font-medium">Vergi Dairesi:</span>
                        <p className="text-muted-foreground">{selectedProfile.tax_office}</p>
                      </div>
                    )}
                    {selectedProfile.tax_number && (
                      <div>
                        <span className="font-medium">Vergi Numarası:</span>
                        <p className="text-muted-foreground">{selectedProfile.tax_number}</p>
                      </div>
                    )}
                    {selectedProfile.trade_registry_number && (
                      <div>
                        <span className="font-medium">Ticaret Sicil No:</span>
                        <p className="text-muted-foreground">{selectedProfile.trade_registry_number}</p>
                      </div>
                    )}
                    {selectedProfile.mersis_number && (
                      <div>
                        <span className="font-medium">MERSİS No:</span>
                        <p className="text-muted-foreground">{selectedProfile.mersis_number}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* İletişim Bilgileri */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">İletişim Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">E-posta:</span>
                      <p className="text-muted-foreground">{selectedProfile.email}</p>
                    </div>
                    {selectedProfile.business_phone && (
                      <div>
                        <span className="font-medium">İş Telefonu:</span>
                        <p className="text-muted-foreground">{selectedProfile.business_phone}</p>
                      </div>
                    )}
                    {selectedProfile.business_email && (
                      <div>
                        <span className="font-medium">İş E-posta:</span>
                        <p className="text-muted-foreground">{selectedProfile.business_email}</p>
                      </div>
                    )}
                    {selectedProfile.business_address && (
                      <div className="col-span-2">
                        <span className="font-medium">Adres:</span>
                        <p className="text-muted-foreground">{selectedProfile.business_address}</p>
                      </div>
                    )}
                    {selectedProfile.business_city && (
                      <div>
                        <span className="font-medium">İl:</span>
                        <p className="text-muted-foreground">{selectedProfile.business_city}</p>
                      </div>
                    )}
                    {selectedProfile.business_district && (
                      <div>
                        <span className="font-medium">İlçe:</span>
                        <p className="text-muted-foreground">{selectedProfile.business_district}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banka Bilgileri */}
                {(selectedProfile.bank_name || selectedProfile.iban) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Banka Bilgileri</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProfile.bank_name && (
                        <div>
                          <span className="font-medium">Banka:</span>
                          <p className="text-muted-foreground">{selectedProfile.bank_name}</p>
                        </div>
                      )}
                      {selectedProfile.account_holder_name && (
                        <div>
                          <span className="font-medium">Hesap Sahibi:</span>
                          <p className="text-muted-foreground">{selectedProfile.account_holder_name}</p>
                        </div>
                      )}
                      {selectedProfile.iban && (
                        <div className="col-span-2">
                          <span className="font-medium">IBAN:</span>
                          <p className="text-muted-foreground font-mono">{selectedProfile.iban}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Red veya Askıya Alma Nedeni */}
                {selectedProfile.rejection_reason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-destructive">Red Nedeni</h3>
                    <p className="text-sm">{selectedProfile.rejection_reason}</p>
                  </div>
                )}
                {selectedProfile.suspended_reason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-destructive">Askıya Alma Nedeni</h3>
                    <p className="text-sm">{selectedProfile.suspended_reason}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selectedProfile.approval_status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRejectDialog(true)}
                      disabled={processing}
                    >
                      Reddet
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedProfile.id)}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Onayla
                        </>
                      )}
                    </Button>
                  </>
                )}
                {selectedProfile.approval_status !== 'pending' && (
                  <Button variant="outline" onClick={() => setDetailDialog(false)}>
                    Kapat
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satıcı Profilini Reddet</DialogTitle>
            <DialogDescription>
              Lütfen red nedeninizi belirtin. Bu bilgi satıcıya email ile gönderilecektir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Red Nedeni *</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Eksik veya hatalı bilgiler, geçersiz belgeler vb."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(false);
                setRejectReason('');
              }}
              disabled={processing}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                'Reddet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
