import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Index from './pages/Index-mysql';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import Dashboard from './pages/Dashboard';
import CreateListing from './pages/CreateListing-mysql';
import EditListing from './pages/EditListing';
import OrderDetail from './pages/OrderDetail';
import NotFound from './pages/NotFound';
import Inbox from './pages/Inbox';
import LocalErrorBoundary from '@/components/ui/LocalErrorBoundary';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import StoreProfile from './pages/StoreProfile';
import Checkout from './pages/Checkout';
import SecuritySettings from './pages/SecuritySettings';
import VerifyEmailChangePage from './pages/VerifyEmailChangePage';
import EmailVerificationPage from './pages/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import Contact from './pages/Contact';
import Help from './pages/Help';
import HowItWorks from './pages/HowItWorks';
import Commission from './pages/Commission';
import Ibans from './pages/Ibans';
// Lazy load admin pages for better performance
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminListings = lazy(() => import('./pages/AdminListings'));
const AdminOffers = lazy(() => import('./pages/AdminOffers'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/AdminOrderDetail'));
const AdminCommission = lazy(() => import('./pages/AdminCommission'));
const AdminSupport = lazy(() => import('./pages/AdminSupport'));
const AdminSellerProfiles = lazy(() => import('./pages/AdminSellerProfiles'));
import Notifications from './pages/Notifications';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AuthStateMonitor from './components/AuthStateMonitor';
import CookieConsent from './components/CookieConsent';
import { SupportChat } from './components/SupportChat';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import * as Sentry from '@sentry/react';
import { useErrorLoggerAuth } from './hooks/use-error-logger-auth';
import { AuthProvider } from './hooks/use-auth-mysql';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useEffect } from 'react';
import Cart from './pages/Cart';

const queryClient = new QueryClient();

// Codespaces gibi bazı barındırma ortamlarında history fallback sorunlarını önlemek için
// otomatik olarak HashRouter'a geçiş yapalım. İsteğe bağlı olarak VITE_ROUTER_MODE=hash ile zorlanabilir.
const isCodespaces = typeof window !== 'undefined' && window.location.hostname.includes('app.github.dev');
const useHashRouter = isCodespaces || import.meta.env.VITE_ROUTER_MODE === 'hash';
const Router = useHashRouter ? HashRouter : BrowserRouter;

const RoutesContent = () => {
  // Initialize error logger auth integration
  useErrorLoggerAuth();

  // MySQL auth system - no email confirmation needed for now
  useEffect(() => {
    // Future: MySQL email verification logic can be added here
  }, []);
  
  return (
    <>
      <AuthStateMonitor />
      <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/listings" element={<Listings />} />
      <Route path="/listing/:id" element={<ListingDetail />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-listing" element={<CreateListing />} />
      <Route path="/order/:orderId" element={<OrderDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:userId" element={<UserProfile />} />
      <Route path="/store/:userId" element={<StoreProfile />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/edit-listing/:id" element={<EditListing />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/verify-email-change" element={<VerifyEmailChangePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/security" element={<SecuritySettings />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/cookie-policy" element={<CookiePolicy />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/help" element={<Help />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/commission" element={<Commission />} />
      <Route path="/profile/ibans" element={<Ibans />} />
      
      {/* Admin Routes with lazy loading */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminDashboard />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminUsers />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/listings" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminListings />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/offers" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminOffers />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminOrders />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/orders/:orderId" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminOrderDetail />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/commission" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminCommission />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/support" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminSupport />
          </Suspense>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/seller-profiles" element={
        <AdminProtectedRoute>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
            <AdminSellerProfiles />
          </Suspense>
        </AdminProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
};

const App = () => (
  <LocalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Sentry.ErrorBoundary fallback={({ error }) => (
                  <div className="p-6 text-center">
                    <h2 className="text-xl font-semibold mb-2">Bir hata oluştu</h2>
                    <p className="text-sm text-muted-foreground mb-4">{String(error)}</p>
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded" onClick={() => window.location.reload()}>
                      Sayfayı Yenile
                    </button>
                  </div>
                )}>
                  <RoutesContent />
                  <CookieConsent />
                  <SupportChat />
                  <PWAInstallPrompt />
                </Sentry.ErrorBoundary>
              </Router>
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </LocalErrorBoundary>
);

export default App;