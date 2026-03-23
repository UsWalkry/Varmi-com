// Debug authentication status
console.log('=== AUTH DEBUG ===');

// 1. Check current auth state
import { supabase } from './lib/supabase';

async function debugAuth() {
  // Current session
  const session = await supabase.auth.getSession();
  console.log('Current session:', session.data.session);
  
  if (session.data.session) {
    console.log('User ID (auth):', session.data.session.user.id);
    console.log('Email:', session.data.session.user.email);
    
    // Try the RPC
    try {
      const { data, error } = await supabase.rpc('get_or_create_current_user');
      console.log('get_or_create_current_user result:', { data, error });
    } catch (err) {
      console.error('RPC error:', err);
    }
    
    // Check what's in users table
    try {
      const { data: users, error } = await supabase.from('users').select('*');
      console.log('All users in table:', users, error);
    } catch (err) {
      console.error('Users query error:', err);
    }
    
    // Test favorites query
    try {
      const { data: favorites, error } = await supabase.from('favorites').select('*');
      console.log('All favorites:', favorites, error);
    } catch (err) {
      console.error('Favorites query error:', err);
    }
  }
}

// Add to window for console access
window.debugAuth = debugAuth;

console.log('Run window.debugAuth() in console');