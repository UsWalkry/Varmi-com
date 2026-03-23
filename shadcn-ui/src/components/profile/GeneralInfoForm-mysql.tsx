import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/lib/sonner';
import { User } from '@/lib/mockData';
import { mysqlAPI } from '@/lib/mysql-api';
import { useAuth } from '@/hooks/use-auth-mysql';
import StarRatingDisplay from '@/components/star-rating-display';
import SellerReviewsModal from '@/components/SellerReviewsModal';

interface GeneralInfoFormProps {
  user?: User;
}

const genderOptions = [
  { value: 'Kadın', label: '👩 Kadın' },
  { value: 'Erkek', label: '👨 Erkek' }
];

export default function GeneralInfoForm({ user: propUser }: GeneralInfoFormProps) {
  const { user: authUser, refreshUser } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  
  // Backend'den gerçek rating verilerini çek
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authUser?.id) {
        try {
          const response = await mysqlAPI.getUserProfile(authUser.id);
          if (response.success) {
            setUserProfile(response.user);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    fetchUserProfile();
  }, [authUser?.id]);
  
  const displayRating = userProfile?.rating_avg ?? 0;
  const displayReviewCount = userProfile?.rating_count ?? 0;
  
  const [submitting, setSubmitting] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  
  // Form state'ini kullanıcı bilgilerinden oluştur
  const getInitialFormState = () => {
    const existingPhone = authUser?.phone || propUser?.phone || '';
    console.log('Parsing existing phone:', existingPhone);
    
    let formattedPhone = '';
    if (existingPhone) {
      // +90 ile başlıyorsa kaldır
      let phoneOnly = existingPhone.replace(/^\+90\s*/, '').replace(/[^\d]/g, '');
      console.log('Phone only digits:', phoneOnly);
      
      // Format: 555 123 45 67 (9 haneli)
      if (phoneOnly.length === 9 && phoneOnly.startsWith('5')) {
        formattedPhone = phoneOnly.substring(0, 3) + ' ' + phoneOnly.substring(3, 6) + ' ' + phoneOnly.substring(6, 8) + ' ' + phoneOnly.substring(8);
        console.log('Formatted phone:', formattedPhone);
      } else {
        formattedPhone = phoneOnly;
      }
    }
    
    // Parse name parts for fallback
    const fullName = authUser?.firstName || authUser?.lastName
      ? `${authUser?.firstName || ''} ${authUser?.lastName || ''}`.trim()
      : (propUser?.name || '').trim();
    const parts = fullName.split(' ').filter(Boolean);
    const firstName = authUser?.firstName || parts[0] || '';
    const lastName = authUser?.lastName || parts.slice(1).join(' ') || '';

    return {
      firstName,
      lastName,
      email: authUser?.email || propUser?.email || '',
      phone: formattedPhone,
      gender: authUser?.gender || '',
      birthDate: (authUser as any)?.birthDate || (propUser as any)?.birthDate || '',
    };
  };

  const [form, setForm] = useState(getInitialFormState);

  // authUser değiştiğinde form state'ini güncelle
  useEffect(() => {
    console.log('User data changed, updating form state');
    const newFormState = getInitialFormState();
    setForm(newFormState);
    setOriginalEmail(newFormState.email); // Orijinal email'i kaydet
  }, [authUser, propUser]);

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePhone = (phone: string) => {
    // Boş telefon numarası geçerlidir (isteğe bağlı)
    if (!phone || phone.trim() === '') return true;
    
    // Sadece rakamları al
    const phoneOnly = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
    
    // 5 ile başlayan 9 haneli numara olmalı
    // Örnek: "555 123 45 67" -> "555123467" (9 hane)
    const isValidLength = phoneOnly.length === 9;
    const startsWithFive = phoneOnly.startsWith('5');
    
    console.log('Validating phone:', {
      original: phone,
      cleaned: phoneOnly,
      length: phoneOnly.length,
      startsWithFive,
      isValid: isValidLength && startsWithFive
    });
    
    return isValidLength && startsWithFive;
  };

  const formatPhone = (value: string) => {
    // +90 prefix'ini çıkar ve sadece rakamları al
    let phoneOnly = value.replace('+90 ', '').replace(/[^\d]/g, '');
    
    // 0 ile başlıyorsa kaldır
    if (phoneOnly.startsWith('0')) {
      phoneOnly = phoneOnly.substring(1);
    }
    
    // Maksimum 9 hane
    if (phoneOnly.length > 9) {
      phoneOnly = phoneOnly.substring(0, 9);
    }
    
    // Format: +90 5XX XXX XX XX
    if (phoneOnly.length === 0) return '';
    if (phoneOnly.length <= 3) return phoneOnly;
    if (phoneOnly.length <= 6) return phoneOnly.substring(0, 3) + ' ' + phoneOnly.substring(3);
    if (phoneOnly.length <= 8) return phoneOnly.substring(0, 3) + ' ' + phoneOnly.substring(3, 6) + ' ' + phoneOnly.substring(6);
    return phoneOnly.substring(0, 3) + ' ' + phoneOnly.substring(3, 6) + ' ' + phoneOnly.substring(6, 8) + ' ' + phoneOnly.substring(8);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('phone', formatted);
  };

  // Mask phone for display: first 2 digits + ****** + last 2 digits (no spaces)
  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
    if (!digits) return '';
    if (digits.length <= 4) return `${digits[0] || ''}${digits[1] || ''}${'*'.repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
    const first2 = digits.slice(0, 2);
    const last2 = digits.slice(-2);
    return `${first2}${'*'.repeat(Math.max(0, digits.length - 4))}${last2}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('❌ Ad ve Soyad gereklidir');
      return;
    }

    // Telefon boş değilse ve geçerli değilse hata ver
  if (form.phone.trim()) {
      const phoneDigits = form.phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
      if (phoneDigits.length < 9 || !phoneDigits.startsWith('5')) {
        console.log('Phone validation failed:', {
          phone: form.phone,
          digits: phoneDigits,
          length: phoneDigits.length,
          startsWithFive: phoneDigits.startsWith('5')
        });
        toast.error('❌ Geçerli bir telefon numarası girin', {
          description: 'Örnek: 555 123 45 67 (5 ile başlamalı, 9 haneli)'
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Email değişti mi kontrol et
  const emailChanged = form.email.trim() !== originalEmail;
      
  if (emailChanged) {
        console.log('📧 Email changed, sending verification:', {
          oldEmail: originalEmail,
          newEmail: form.email
        });
        
        // Email değişikliği için doğrulama gönder
        const emailChangeResult = await mysqlAPI.changeEmail(form.email.trim());
        
        if (emailChangeResult.success) {
          setEmailChangeRequested(true);
          toast.success('📧 Email doğrulama kodu gönderildi', {
            description: `${form.email} adresine doğrulama kodu gönderildi. Kodu kullanarak email değişikliğinizi tamamlayın.`
          });
          
          // Email haricindeki diğer alanları güncelle
          const response = await mysqlAPI.updateProfile({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone ? `+90${form.phone.replace(/\s+/g, '')}` : undefined,
            gender: form.gender || undefined,
          });
          
          if (response.success) {
            await refreshUser();
            toast.success('✅ Profil güncellendi', {
              description: 'Diğer bilgileriniz kaydedildi. Email değişikliği için doğrulama kodunu kontrol edin.'
            });
          }
        } else {
          toast.error('❌ Email doğrulama hatası', {
            description: emailChangeResult.error || 'Email doğrulama kodu gönderilemedi.'
          });
        }
      } else {
        // Email değişmedi, normal güncelleme
        const response = await mysqlAPI.updateProfile({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone ? `+90${form.phone.replace(/\s+/g, '')}` : undefined,
          gender: form.gender || undefined,
          birthDate: form.birthDate || undefined,
        });

        if (response.success) {
          // Profil başarıyla güncellendiğinde user bilgilerini yenile
          await refreshUser();
          
          toast.success('✅ Profil güncellendi', {
            description: 'Bilgileriniz başarıyla kaydedildi.'
          });
        } else {
          toast.error('❌ Güncelleme başarısız', {
            description: response.message || 'Beklenmeyen bir hata oluştu.'
          });
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('❌ Bağlantı hatası', {
        description: 'Profil güncellenirken bir hata oluştu.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            👤 Genel Bilgiler
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Değerlendirme</span>
            <div 
              onClick={() => setReviewsModalOpen(true)}
              className="flex items-center gap-1 hover:bg-gray-100 p-2 rounded-md transition-colors cursor-pointer border border-transparent hover:border-gray-200"
              title="Değerlendirmeleri görüntüle"
            >
              <div className="flex items-center gap-1">
                {displayReviewCount > 0 ? (
                  <>
                    <span className="text-yellow-500 font-medium">
                      {'⭐'.repeat(Math.round(displayRating))}
                    </span>
                    <span className="text-gray-600">
                      {displayRating.toFixed(1)} ({displayReviewCount})
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">Henüz değerlendirme yok</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ad ve Soyad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Ad *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Adınız"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Soyad *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Soyadınız"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Email adresiniz"
              required
            />
            <p className="text-xs text-muted-foreground">
              💡 Email değiştirmek için profil ayarlarından değiştirebilirsiniz.
            </p>
          </div>

          {/* Cinsiyet */}
          <div className="space-y-3">
            <Label>Cinsiyet</Label>
            <RadioGroup 
              value={form.gender} 
              onValueChange={(value) => handleInputChange('gender', value)}
            >
              <div className="flex flex-wrap gap-4">
                {genderOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Doğum Tarihi */}
          <div className="space-y-2">
            <Label htmlFor="birthDate">Doğum tarihi</Label>
            <Input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
            />
          </div>

          {/* Cep Telefonu (maskeli, sadece görüntüleme) */}
          <div className="space-y-2">
            <Label htmlFor="phone">Cep Telefonu</Label>
            <div className="flex items-center">
              <Select value={'+90'} disabled>
                <SelectTrigger className="w-20 rounded-r-none">
                  <SelectValue placeholder="+90" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'+90'}>+90</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Input
                  id="phone"
                  value={maskPhone(form.phone)}
                  placeholder="555 123 45 67"
                  className="rounded-l-none"
                  readOnly
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Türkiye telefon numaranızı girin (5XX XXX XX XX)</p>
          </div>

          {/* Şehir alanı kaldırıldı */}

          {/* Adres alanları Genel Bilgiler'den kaldırıldı; 'Adres Bilgilerim' sekmesini kullanın */}

          {/* Kaydet */}
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {submitting ? '💾 Kaydediliyor...' : '💾 Profili Güncelle'}
            </Button>
          </div>
        </form>
      </CardContent>
      
      {/* Reviews Modal */}
      <SellerReviewsModal
        isOpen={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        sellerId={authUser?.id || ''}
        sellerName={`${form.firstName || ''} ${form.lastName || ''}`.trim() || authUser?.email?.split('@')[0] || 'Kullanıcı'}
      />
    </Card>
  );
}