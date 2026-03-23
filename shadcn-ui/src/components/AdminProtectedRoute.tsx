import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-mysql';
import { toast } from 'sonner';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 AdminProtectedRoute - Effect triggered');
    console.log('🔍 AdminProtectedRoute - Loading:', loading);
    console.log('🔍 AdminProtectedRoute - User:', user);
    console.log('🔍 AdminProtectedRoute - User Role:', user?.role);
    console.log('🔍 AdminProtectedRoute - User Role Type:', typeof user?.role);
    console.log('🔍 AdminProtectedRoute - Role comparison result:', user?.role === 'admin');
    
    // Loading tamamlandığında kontrol yap
    if (!loading) {
      console.log('🔍 AdminProtectedRoute - Loading finished, checking access...');
      
      if (!user) {
        // Kullanıcı giriş yapmamış
        console.log('❌ AdminProtectedRoute - No user, redirecting to home');
        toast.error('Admin paneline erişmek için giriş yapmalısınız');
        navigate('/');
      } else if (user.role !== 'admin') {
        // Kullanıcı admin değil
        console.log('❌ AdminProtectedRoute - User role is not admin');
        console.log('❌ Expected: "admin", Got:', JSON.stringify(user.role));
        console.log('❌ Full user object:', JSON.stringify(user));
        toast.error('Bu sayfaya erişim yetkiniz bulunmuyor');
        navigate('/');
      } else {
        console.log('✅ AdminProtectedRoute - Admin access granted');
        console.log('✅ User is admin, rendering children');
      }
    } else {
      console.log('🔄 AdminProtectedRoute - Still loading...');
    }
  }, [user, loading, navigate]);

  // Loading durumunda spinner göster
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Yetkilendirme kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı yoksa veya admin değilse hiçbir şey render etme
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Admin kullanıcı için children'ı render et
  return <>{children}</>;
}