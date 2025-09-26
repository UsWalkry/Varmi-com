import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Dashboard from './pages/Dashboard';
import EditListing from './pages/EditListing';
import NotFound from './pages/NotFound';
import Inbox from './pages/Inbox';
import LocalErrorBoundary from '@/components/ui/LocalErrorBoundary';
import Profile from './pages/Profile';
import CreateProduct from './pages/CreateProduct';
import ProductDetail from './pages/ProductDetail';
import Store from './pages/Store';
import Cart from './pages/Cart';

const queryClient = new QueryClient();

// Codespaces gibi bazı barındırma ortamlarında history fallback sorunlarını önlemek için
// otomatik olarak HashRouter'a geçiş yapalım. İsteğe bağlı olarak VITE_ROUTER_MODE=hash ile zorlanabilir.
const isCodespaces = typeof window !== 'undefined' && window.location.hostname.includes('app.github.dev');
const useHashRouter = isCodespaces || import.meta.env.VITE_ROUTER_MODE === 'hash';
const Router = useHashRouter ? HashRouter : BrowserRouter;

const App = () => (
  <LocalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/create-listing" element={<CreateListing />} />
            <Route path="/create-product" element={<CreateProduct />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/store/:id" element={<Store />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/edit-listing/:id" element={<EditListing />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </LocalErrorBoundary>
);

export default App;