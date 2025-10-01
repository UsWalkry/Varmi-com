import { supabase } from './supabase';
import { supabaseEnabled, ensureCurrentUserId } from './sbApi';
import { DataManager } from './mockData';

export function supabaseAuthAvailable() {
  return supabaseEnabled();
}

function normalizePhone(input?: string) {
  const digits = (input || '').replace(/\D/g, '').replace(/^90/, '').slice(0, 10);
  return digits ? `+90${digits}` : '';
}

function ensureLocalUser(email: string, name?: string, city?: string, phone?: string) {
  const users = DataManager.getUsers();
  const exists = users.find(u => u.email === email);
  if (!exists) {
    // Register locally without blocking; welcome email may be triggered once here
    DataManager.registerUser({ name: name || email.split('@')[0], email, password: '', city: city || '', phone: normalizePhone(phone) });
  } else {
    // Make sure CURRENT_USER is set
    DataManager.loginUser(email, '');
  }
}

export async function signUpWithSupabase(params: { name: string; email: string; password: string; city?: string; phone?: string; }) {
  if (!supabaseAuthAvailable()) throw new Error('supabase-auth-disabled');
  const { name, email, password, city, phone } = params;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, city: city || '', phone: normalizePhone(phone) },
    },
  });
  if (error) throw error;
  // Ensure a row exists in public.users
  try { await ensureCurrentUserId(); } catch { /* ignore */ }
  ensureLocalUser(email, name, city, phone);
  return data;
}

export async function signInWithSupabase(params: { identifier: string; password: string; }) {
  if (!supabaseAuthAvailable()) throw new Error('supabase-auth-disabled');
  const { identifier, password } = params;
  if (!identifier.includes('@')) throw new Error('email-required');
  const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password });
  if (error) {
    // Hatalı şifre/eposta ya da kullanıcı doğrulanmamış olabilir
    throw new Error(error.message || 'Giriş başarısız');
  }
  try { await ensureCurrentUserId(); } catch { /* ignore */ }
  const meta = data.user?.user_metadata as { name?: string; city?: string; phone?: string } | undefined;
  ensureLocalUser(identifier, meta?.name, meta?.city, meta?.phone);
  return data;
}

export async function signOutSupabase() {
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
}
