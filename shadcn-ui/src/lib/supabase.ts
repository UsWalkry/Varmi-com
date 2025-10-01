import { createClient } from '@supabase/supabase-js';

const SUPABASE_ENABLED = import.meta.env.VITE_SUPABASE_ENABLED === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_ENABLED) {
  console.warn('[supabase] Disabled by VITE_SUPABASE_ENABLED flag (set to true to enable).');
} else if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
} else if (SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
  console.warn('[supabase] Using placeholder credentials. Replace with your actual Supabase project credentials.');
}

// Create client with fallback values if not enabled (prevents errors but won't work)
const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const key = SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Types (lightweight)
export type UUID = string;
export type ListingRow = {
  id: UUID;
  title: string;
  description: string | null;
  images: string[];
  category: string;
  budget_max: number;
  condition: 'new'|'used'|'any';
  city: string;
  delivery_type: 'shipping'|'pickup'|'both';
  buyer_id: UUID;
  offers_public: boolean;
  offers_purchasable: boolean;
  status: 'active'|'closed'|'expired';
  offer_count?: number;
  expires_at?: string | null;
  created_at: string;
};

// Lightweight row type for offers table
export type OfferRow = {
  id: UUID;
  listing_id: UUID;
  seller_id: UUID;
  seller_name: string | null;
  seller_rating: number | null;
  price: number;
  quantity: number | null;
  images: string[] | null;
  condition: 'new'|'used'|null;
  product_name: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  delivery_type: 'shipping'|'pickup'|null;
  shipping_desi: string | null;
  shipping_cost: number | null;
  eta_days: number | null;
  status: 'active'|'accepted'|'rejected'|'withdrawn';
  accepted_at: string | null;
  order_stage: 'received'|'carrierSelected'|'shipped'|'delivered'|'completed'|null;
  tracking_no: string | null;
  order_notes: string | null;
  order_updated_at: string | null;
  shipping_carrier_id: string | null;
  shipping_carrier_name: string | null;
  shipping_extra_fee: number | null;
  completed_at: string | null;
  valid_until: string | null;
  message: string | null;
  sold_to_others: number | null;
  owner_purchased_quantity: number | null;
  created_at: string;
};
