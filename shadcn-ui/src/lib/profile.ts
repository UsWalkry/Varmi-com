import { supabase } from '@/lib/supabase';

export type ProfileView = {
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  avatar_url?: string;
  // extras from metadata
  birthDate?: string;
  addressLine1?: string;
  district?: string;
  postalCode?: string;
};

export async function loadGeneralInfo(): Promise<ProfileView> {
  const { data: ures, error: uerr } = await supabase.auth.getUser();
  if (uerr || !ures?.user) throw new Error('Oturum yok');

  const authEmail = ures.user.email ?? '';
  const uid = ures.user.id;
  const meta: any = ures.user.user_metadata || {};
  
  console.log('loadGeneralInfo: Auth user metadata:', meta);
  
  const toIso = (v?: string) => {
    const s = (v || '').trim(); if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); if (!m) return '';
    return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  };

  // App profile row - select all profile fields
  const { data: row } = await supabase
    .from('users')
    .select('name, phone, city, avatar_url, birth_date, address_line1, district, postal_code')
    .eq('auth_user_id', uid)
    .maybeSingle();

  console.log('loadGeneralInfo: Users table row:', row);

  const result = {
    email: authEmail,
    name: row?.name ?? (meta.name || ''),
    phone: row?.phone ?? (meta.phone || ''),
    city: row?.city ?? (meta.city || ''),
    avatar_url: row?.avatar_url ?? (meta.avatarUrl || ''),
    birthDate: row?.birth_date ?? (toIso(meta.birthDate) || ''),
    addressLine1: row?.address_line1 ?? (meta.addressLine1 || meta.address?.line1 || ''),
    district: row?.district ?? (meta.district || meta.address?.district || ''),
    postalCode: row?.postal_code ?? (meta.postalCode || meta.address?.postalCode || ''),
  };
  
  console.log('loadGeneralInfo: Final result:', result);
  return result;
}

export async function saveGeneralInfo(input: ProfileView): Promise<{ ok: boolean; emailChanged: boolean; currentEmail?: string; newEmail?: string }>{
  const { data: ures } = await supabase.auth.getUser();
  if (!ures?.user) throw new Error('Oturum yok');

  const uid = ures.user.id;
  const currentEmail = (ures.user.email ?? '').toLowerCase();
  const nextEmail = (input.email ?? '').trim().toLowerCase();
  const emailChanged = nextEmail && nextEmail !== currentEmail;

  console.log('saveGeneralInfo: Email check', {
    currentEmail,
    nextEmail,
    emailChanged
  });

  // 1) ALWAYS save profile data to users table first (independent of email change)
  const payload = {
    auth_user_id: uid,
    email: currentEmail, // ALWAYS keep current email in users table - never change directly
    name: input.name?.trim() || null,
    phone: input.phone?.trim() || null,
    city: input.city?.trim() || null,
    avatar_url: input.avatar_url || null,
    birth_date: input.birthDate || null,
    address_line1: input.addressLine1?.trim() || null,
    district: input.district?.trim() || null,
    postal_code: input.postalCode?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  
  console.log('saveGeneralInfo: Saving profile data to users table:', payload);
  
  const { error: profileError } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'auth_user_id' })
    .select('*')
    .single();
    
  if (profileError) throw new Error(profileError.message || 'Profil kaydedilemedi');

  // 2) Update metadata for consistency
  const metaUpdate: any = {
    name: input.name?.trim() || null,
    phone: input.phone?.trim() || null,
    city: input.city?.trim() || null,
    avatarUrl: input.avatar_url || null,
    birthDate: input.birthDate || null,
    addressLine1: input.addressLine1 || null,
    district: input.district || null,
    postalCode: input.postalCode || null,
  };
  const { error: mErr } = await supabase.auth.updateUser({ data: metaUpdate });
  if (mErr) console.warn('Metadata update failed (non-critical):', mErr);

  // 3) Handle email change separately - don't change here, just return info
  if (emailChanged) {
    console.log('saveGeneralInfo: Email change detected, will need verification');
  }

  return { 
    ok: true, 
    emailChanged: emailChanged, 
    currentEmail: currentEmail,
    newEmail: nextEmail
  };
}
