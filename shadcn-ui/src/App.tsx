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
import Checkout from './pages/Checkout';

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/edit-listing/:id" element={<EditListing />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </LocalErrorBoundary>
);

export default App;