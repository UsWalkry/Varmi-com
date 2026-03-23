// MYSQL CLIENT ADAPTER - Supabase yerine MySQL kullanılıyor
// Bu dosya backward compatibility için sadece dummy işlevler sağlar
import { mysqlAPI } from './mysql-api';

// Dummy Supabase client for compatibility
const isSupabaseConfigured = false;

// Dummy export to prevent import errors
export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null })
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  },
  from: () => ({
    select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
    upsert: () => ({ select: () => Promise.resolve({ data: [], error: null }) })
  }),
  rpc: () => Promise.resolve({ data: null, error: null })
};

// MySQL-based auth helper functions
export async function getCurrentUser() {
  try {
    const user = await mysqlAPI.getCurrentUser();
    return user?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function signOut() {
  try {
    await mysqlAPI.logout();
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error };
  }
}

// Dummy upload helpers (not implemented in MySQL version)
export async function uploadFile(file: File, path: string) {
  console.warn('File upload not implemented in MySQL version');
  return { data: null, error: 'Not implemented' };
}

export async function getPublicUrl(path: string) {
  console.warn('Public URL not implemented in MySQL version');
  return '';
}

// MySQL-based listing helpers
export async function upsertListing(listing: any) {
  try {
    if (listing.id) {
      // Update existing
      const data = await mysqlAPI.updateListing(listing.id, listing);
      return { data, error: null };
    } else {
      // Create new
      const data = await mysqlAPI.createListing(listing);
      return { data, error: null };
    }
  } catch (error) {
    console.error('Error upserting listing:', error);
    return { data: null, error };
  }
}

// MySQL connection test
export async function testSupabaseConnection() {
  try {
    const response = await mysqlAPI.getActiveListings();
    return { connected: true, error: null };
  } catch (error) {
    console.error('MySQL connection test failed:', error);
    return { connected: false, error };
  }
}

// Types for compatibility
export type UUID = string;
export type ListingRow = any;
export type OfferRow = any;

export { isSupabaseConfigured };