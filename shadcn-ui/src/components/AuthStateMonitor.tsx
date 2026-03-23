// Auth State Monitor - useAuth değişikliklerini takip eder
import { useAuth } from '@/hooks/use-auth-mysql';
import { useEffect } from 'react';

export default function AuthStateMonitor() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // console.log('🔍 AuthStateMonitor - State changed:');
    // console.log('  🔄 Loading:', loading);
    // console.log('  👤 User:', user);
    // console.log('  🏷️ Role:', user?.role);
    // console.log('  📧 Email:', user?.email);
    // console.log('  🎯 Is Admin?', user?.role === 'admin');
    // console.log('  ⏰ Timestamp:', new Date().toISOString());
  }, [user, loading]);

  // Bu component hiçbir şey render etmez, sadece monitoring yapar
  return null;
}