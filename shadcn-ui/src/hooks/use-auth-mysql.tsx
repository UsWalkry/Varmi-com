// useAuth hook - MySQL Authentication
import React, { useState, useEffect, createContext, useContext } from 'react';
import { mysqlAPI } from '@/lib/mysql-api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city?: string;
  phone?: string;
  gender?: string;
  addressLine1?: string;
  district?: string;
  postalCode?: string;
  role?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Kullanıcı bilgilerini al
  const refreshUser = async () => {
    try {
      // console.log('🔄 Refreshing user data...');
      
      // Token kontrolü - yoksa direkt null set et
      const token = localStorage.getItem('mysql-auth-token');
      // console.log('🔐 Token check:', token ? 'Found' : 'Not found');
      if (!token) {
        // console.log('❌ No mysql auth token found');
        setUser(null);
        return;
      }
      
      // console.log('📤 Making getCurrentUser API call...');
      const result = await mysqlAPI.getCurrentUser();
      // console.log('📊 getCurrentUser result:', result);
      // console.log('📊 Result type:', typeof result);
      // console.log('📊 Result success:', result?.success);
      // console.log('📊 Result user:', result?.user);
      
      if (result && result.success) {
        // console.log('✅ User data loaded:', result.user);
        // console.log('🔍 User role from backend:', result.user?.role);
        setUser(result.user);
      } else {
        // console.log('❌ No user data or failed:', result);
        // Eğer auth hatası varsa token'ı temizle
        if (result && (result.error === 'Access token required' || result.error === 'Invalid token')) {
          // console.log('🔒 Invalid token, clearing auth');
          localStorage.removeItem('mysql-auth-token');
          mysqlAPI.setToken(null);
        }
        setUser(null);
      }
    } catch (error) {
      // console.error('🚨 User fetch error:', error);
      // Network hatası vs. durumunda token'ı silme
      setUser(null);
    }
  };

  // Component mount olduğunda kullanıcıyı kontrol et
  useEffect(() => {
    let isMounted = true; // Component hala mount mu?
    
    const initAuth = async () => {
      setLoading(true);
      
      try {
        await refreshUser();
      } catch (error) {
        // console.error('� Auth init error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();
    
    // Cleanup function - component unmount olduğunda
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await mysqlAPI.login(email, password);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const result = await mysqlAPI.register(email, password, firstName, lastName);
      if (result.success) {
        // Email doğrulanmadan user set etme!
        if (result.emailVerificationRequired) {
          return { 
            success: true, 
            emailVerificationRequired: true,
            message: result.message 
          };
        } else {
          // Eğer email doğrulama gerekliyse user bilgisi gelir
          setUser(result.user);
          return { success: true };
        }
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    mysqlAPI.logout(); // await kaldırdık çünkü artık async değil
    setUser(null);
    // Router ile yönlendirme yapmak için navigate hook'u kullanabilir
    // ya da parent component'ta handle edebiliriz
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Backward compatibility - Supabase benzeri hook
export function useUser() {
  const { user, loading } = useAuth();
  return {
    user,
    loading,
    isLoading: loading
  };
}