import { supabase, type ListingRow, type OfferRow, type UUID } from './supabase';

export async function fetchListings(): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ListingRow[];
}

export type CreateListingInput = {
  title: string;
  description?: string | null;
  images?: string[];
  category: string;
  budget_max: number;
  condition: 'new' | 'used' | 'any';
  city: string;
  delivery_type: 'shipping' | 'pickup' | 'both';
  buyer_id: UUID;
  offers_public?: boolean;
  offers_purchasable?: boolean;
  status?: ListingRow['status'];
  expires_at?: string | null;
};

export async function createListing(payload: CreateListingInput): Promise<ListingRow> {
  const body: CreateListingInput = { ...payload };
  if (!Array.isArray(body.images)) body.images = [];
  // Ensure title suffix like DataManager behavior
  const base = (body.title ?? '').trim();
  const lower = base.toLowerCase();
  const suffix = ' var mıı?';
  if (!lower.endsWith(suffix)) {
    body.title = base.replace(/[\s?]+$/g, '') + ' Var mıı?';
  }
  const { data, error } = await supabase.from('listings').insert(body).select('*').single();
  if (error) throw error;
  return data as ListingRow;
}

export async function fetchOffers(listingId?: UUID) {
  let q = supabase.from('offers').select('*').order('created_at', { ascending: false });
  if (listingId) q = q.eq('listing_id', listingId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function placeOffer(payload: {
  listing_id: UUID;
  seller_id: UUID;
  price: number;
  quantity?: number;
  condition?: 'new' | 'used';
  delivery_type?: 'shipping' | 'pickup';
  shipping_desi?: string;
  shipping_cost?: number;
  // optional richer fields
  description?: string;
  images?: string[];
  eta_days?: number;
  valid_until?: string | null | undefined;
  status?: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  product_name?: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('offers').insert({
    ...payload,
    quantity: payload.quantity ?? 1,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteOffer(offerId: UUID) {
  const { error } = await supabase.from('offers').delete().eq('id', offerId);
  if (error) throw error;
}

export async function fetchOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createOrder(payload: { source_offer_id?: UUID; listing_id?: UUID; seller_id?: UUID; buyer_id?: UUID; price: number; quantity?: number; shipping_cost?: number; delivery_type?: 'shipping' | 'pickup'; shipping_desi?: string; }): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('orders').insert({
    ...payload,
    quantity: payload.quantity ?? 1,
    shipping_cost: payload.shipping_cost ?? 0,
  }).select('*').single();
  if (error) throw error;
  return data;
}

// Offers update helpers (order flow)
export async function updateOffer(offerId: UUID, patch: Partial<{
  status: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  order_stage: 'received' | 'carrierSelected' | 'shipped' | 'delivered' | 'completed';
  tracking_no: string | null;
  shipping_carrier_id: string | null;
  shipping_carrier_name: string | null;
  shipping_extra_fee: number | null;
  owner_purchased_quantity: number | null;
}>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('offers').update(patch).eq('id', offerId).select('*').single();
  if (error) throw error;
  return data;
}

export async function acceptOfferOwner(offerId: UUID, ownerQty: number) {
  return updateOffer(offerId, { status: 'accepted', order_stage: 'received', owner_purchased_quantity: ownerQty });
}

export async function setOfferCarrier(offerId: UUID, carrier: { id: string; name: string; extraFee?: number }, trackingNo?: string | null) {
  return updateOffer(offerId, {
    order_stage: 'carrierSelected',
    shipping_carrier_id: carrier.id,
    shipping_carrier_name: carrier.name,
    shipping_extra_fee: carrier.extraFee ?? null,
    tracking_no: trackingNo ?? null,
  });
}

export async function setOfferShipped(offerId: UUID, trackingNo: string) {
  return updateOffer(offerId, { order_stage: 'shipped', tracking_no: trackingNo });
}

export async function setOfferDelivered(offerId: UUID) {
  return updateOffer(offerId, { order_stage: 'delivered' });
}

export async function setOfferCompleted(offerId: UUID) {
  return updateOffer(offerId, { order_stage: 'completed', status: 'accepted' });
}

export async function sendMessage(payload: { listing_id?: UUID; from_user_id: UUID; to_user_id: UUID; content: string; }): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('messages').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(filters: { listing_id?: UUID; other_user_id?: UUID; self_id: UUID; }) {
  let q = supabase.from('messages').select('*').order('created_at', { ascending: true });
  if (filters.listing_id) q = q.eq('listing_id', filters.listing_id);
  // RLS gereği yalnızca kendini görebileceğin için ekstra filtre şart değil, ama client-side eşleştirmek için kullanışlıdır
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as Array<Record<string, unknown>>;
  if (filters.other_user_id) {
    rows = rows.filter(r => (r.from_user_id === filters.self_id && r.to_user_id === filters.other_user_id) || (r.from_user_id === filters.other_user_id && r.to_user_id === filters.self_id));
  }
  return rows;
}

export async function notifyUser(payload: { user_id: UUID; type: string; payload?: unknown; }) {
  const { data, error } = await supabase.from('notifications').insert({ user_id: payload.user_id, type: payload.type, payload: payload.payload ?? {} }).select('*').single();
  if (error) throw error;
  return data;
}

// UI adapter helpers
export type UiListing = {
  id: string;
  title: string;
  description?: string | null;
  images?: string[];
  category: string;
  budgetMax: number;
  condition: 'new' | 'used' | 'any';
  city: string;
  deliveryType: 'shipping' | 'pickup' | 'both';
  buyerId: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
};

export function mapListingRowToUi(l: ListingRow): UiListing {
  return {
    id: l.id,
    title: l.title,
    description: l.description ?? null,
    images: (l.images as unknown as string[]),
    category: l.category,
    budgetMax: Number(l.budget_max),
    condition: l.condition,
    city: l.city,
    deliveryType: l.delivery_type,
    buyerId: l.buyer_id,
    status: l.status,
    createdAt: l.created_at,
  };
}

export async function fetchListingsUi(): Promise<UiListing[]> {
  const list = await fetchListings();
  return list.map(mapListingRowToUi);
}

// Single listing fetch
export async function fetchListingById(id: UUID): Promise<ListingRow | null> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ListingRow;
}

// UI Offer mapping for existing components compatibility
export type UiOffer = {
  id: string;
  listingId: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  price: number;
  quantity?: number;
  images?: string[];
  condition?: 'new' | 'used';
  productName?: string;
  brand?: string;
  model?: string;
  description?: string;
  deliveryType?: 'shipping' | 'pickup';
  shippingDesi?: string;
  shippingCost?: number;
  etaDays?: number;
  status: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  acceptedAt?: string;
  orderStage?: 'received' | 'carrierSelected' | 'shipped' | 'delivered' | 'completed' | 'accepted';
  trackingNo?: string;
  orderNotes?: string;
  orderUpdatedAt?: string;
  shippingCarrierId?: string;
  shippingCarrierName?: string;
  shippingExtraFee?: number;
  completedAt?: string;
  validUntil?: string;
  message?: string;
  soldToOthers?: number;
  ownerPurchasedQuantity?: number;
  createdAt: string;
};

export function mapOfferRowToUi(o: OfferRow): UiOffer {
  return {
    id: o.id,
    listingId: o.listing_id,
    sellerId: o.seller_id,
    sellerName: o.seller_name ?? 'Satıcı',
    sellerRating: Number(o.seller_rating ?? 0),
    price: Number(o.price),
    quantity: o.quantity ?? 1,
    images: (o.images as unknown as string[]) ?? [],
    condition: o.condition ?? undefined,
    productName: o.product_name ?? undefined,
    brand: o.brand ?? undefined,
    model: o.model ?? undefined,
    description: o.description ?? undefined,
    deliveryType: o.delivery_type ?? undefined,
    shippingDesi: o.shipping_desi ?? undefined,
    shippingCost: o.shipping_cost ?? undefined,
    etaDays: o.eta_days ?? undefined,
    status: o.status,
    acceptedAt: o.accepted_at ?? undefined,
    orderStage: (o.order_stage as UiOffer['orderStage']) ?? undefined,
    trackingNo: o.tracking_no ?? undefined,
    orderNotes: o.order_notes ?? undefined,
    orderUpdatedAt: o.order_updated_at ?? undefined,
    shippingCarrierId: o.shipping_carrier_id ?? undefined,
    shippingCarrierName: o.shipping_carrier_name ?? undefined,
    shippingExtraFee: o.shipping_extra_fee ?? undefined,
    completedAt: o.completed_at ?? undefined,
    validUntil: o.valid_until ?? undefined,
    message: o.message ?? undefined,
    soldToOthers: o.sold_to_others ?? undefined,
    ownerPurchasedQuantity: o.owner_purchased_quantity ?? undefined,
    createdAt: o.created_at,
  };
}

export async function fetchOffersUi(listingId: UUID): Promise<UiOffer[]> {
  const rows = await fetchOffers(listingId) as OfferRow[];
  return rows.map(mapOfferRowToUi);
}

export function supabaseEnabled(): boolean {
  const enabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true';
  if (!enabled) return false;
  
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  
  // Check for placeholder values
  if (url?.includes('your-project-id') || key?.includes('your-anon-key')) {
    return false;
  }
  
  const looksUrl = !!url && /^https?:\/\//.test(url);
  const looksJwt = !!key && key.split('.').length >= 3 && key.length > 20; // anon key is a JWT
  return looksUrl && looksJwt;
}

// Helper to ensure current user id exists in public.users (requires being logged in)
export async function ensureCurrentUserId(): Promise<UUID | null> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return null;
  const { data, error } = await supabase.rpc('get_or_create_current_user');
  if (error) throw error;
  return data as UUID;
}
