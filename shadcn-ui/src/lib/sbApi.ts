import { supabase, type ListingRow, type OfferRow, type UUID } from './supabase';
import { Mailer } from './mail';

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
  buyer_name?: string;
  offers_public?: boolean;
  offers_purchasable?: boolean;
  status?: ListingRow['status'];
  expires_at?: string | null;
  mask_owner_name?: boolean;
  exact_product_only?: boolean;
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
  seller_name?: string;
  seller_rating?: number;
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
  // Proactive check: if an offer already exists for (listing_id, seller_id), decide whether to update or revive
  const existing = await supabase
    .from('offers')
    .select('*')
    .match({ listing_id: payload.listing_id, seller_id: payload.seller_id })
    .maybeSingle();

  if (!existing.error && existing.data) {
    const row = existing.data as OfferRow;
    // If withdrawn, revive with latest payload fields
    if (row.status === 'withdrawn') {
      const revivePatch: Partial<OfferRow> = {
        status: 'active',
        price: payload.price,
        quantity: payload.quantity ?? 1,
        condition: payload.condition ?? row.condition,
        delivery_type: payload.delivery_type ?? row.delivery_type,
        shipping_desi: payload.shipping_desi ?? row.shipping_desi,
        shipping_cost: payload.shipping_cost ?? row.shipping_cost,
        description: payload.description ?? row.description,
        images: (payload.images as any) ?? row.images,
        eta_days: payload.eta_days ?? row.eta_days,
        valid_until: payload.valid_until ?? row.valid_until,
        product_name: payload.product_name ?? row.product_name,
        seller_name: payload.seller_name ?? row.seller_name,
        seller_rating: payload.seller_rating ?? row.seller_rating,
        accepted_at: null,
        order_stage: null,
        tracking_no: null,
        order_notes: null,
        order_updated_at: null,
        shipping_carrier_id: null,
        shipping_carrier_name: null,
        shipping_extra_fee: null,
        completed_at: null,
        created_at: new Date().toISOString() as any,
      } as Partial<OfferRow>;
      const upd = await supabase
        .from('offers')
        .update(revivePatch)
        .eq('id', row.id)
        .select('*')
        .single();
      if (upd.error) throw upd.error;
      const revived = upd.data as OfferRow;
      notifyListingOwnerByEmailSafe(revived).catch(() => {});
      return revived as unknown as Record<string, unknown>;
    }
    // Otherwise, there is an existing non-withdrawn offer. Treat this as an update/edit to avoid duplicate
      const updatePatch: Partial<OfferRow> = {
        // keep status as is if not withdrawn; for 'active' this is a simple edit
        price: payload.price,
        quantity: payload.quantity ?? row.quantity ?? 1,
        condition: payload.condition ?? row.condition,
        delivery_type: payload.delivery_type ?? row.delivery_type,
        shipping_desi: payload.shipping_desi ?? row.shipping_desi,
        shipping_cost: payload.shipping_cost ?? row.shipping_cost,
        description: payload.description ?? row.description,
        images: (payload.images as any) ?? row.images,
        eta_days: payload.eta_days ?? row.eta_days,
        valid_until: payload.valid_until ?? row.valid_until,
        product_name: payload.product_name ?? row.product_name,
        seller_name: payload.seller_name ?? row.seller_name,
        seller_rating: payload.seller_rating ?? row.seller_rating,
        order_updated_at: new Date().toISOString() as any,
      } as Partial<OfferRow>;
      const upd = await supabase
        .from('offers')
        .update(updatePatch)
        .eq('id', row.id)
        .select('*')
        .single();
      if (upd.error) throw upd.error;
      const updated = upd.data as OfferRow;
      // No email on edit to prevent spam
      return updated as unknown as Record<string, unknown>;
  }

  const insertResp = await supabase.from('offers').insert({
    ...payload,
    quantity: payload.quantity ?? 1,
  }).select('*').single();
  if (!insertResp.error) {
    const created = insertResp.data as OfferRow;
    // Fire-and-forget: notify listing owner by email
    notifyListingOwnerByEmailSafe(created).catch(() => {});
    return created as unknown as Record<string, unknown>;
  }
  const error: any = insertResp.error;
  // If unique constraint conflicts, try to revive a withdrawn offer for the same (listing_id, seller_id)
  const status = (insertResp as any)?.status;
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const isDuplicate = error?.code === '23505'
    || status === 409
    || message.includes('duplicate key')
    || message.includes('already exists')
    || details.includes('duplicate')
    || details.includes('already exists');
  if (isDuplicate) {
    const existing = await supabase
      .from('offers')
      .select('*')
      .match({ listing_id: payload.listing_id, seller_id: payload.seller_id })
      .maybeSingle();
    if (existing.error) throw existing.error;
    const row = existing.data as OfferRow | null;
    if (row && row.status === 'withdrawn') {
      const revivePatch: Partial<OfferRow> = {
        status: 'active',
        price: payload.price,
        quantity: payload.quantity ?? 1,
        condition: payload.condition ?? row.condition,
        delivery_type: payload.delivery_type ?? row.delivery_type,
        shipping_desi: payload.shipping_desi ?? row.shipping_desi,
        shipping_cost: payload.shipping_cost ?? row.shipping_cost,
        description: payload.description ?? row.description,
        images: (payload.images as any) ?? row.images,
        eta_days: payload.eta_days ?? row.eta_days,
        valid_until: payload.valid_until ?? row.valid_until,
        product_name: payload.product_name ?? row.product_name,
        seller_name: payload.seller_name ?? row.seller_name,
        seller_rating: payload.seller_rating ?? row.seller_rating,
        accepted_at: null,
        order_stage: null,
        tracking_no: null,
        order_notes: null,
        order_updated_at: null,
        shipping_carrier_id: null,
        shipping_carrier_name: null,
        shipping_extra_fee: null,
        completed_at: null,
        // Optionally refresh created_at to bubble up in lists
        created_at: new Date().toISOString() as any,
      } as Partial<OfferRow>;
      const upd = await supabase
        .from('offers')
        .update(revivePatch)
        .eq('id', row.id)
        .select('*')
        .single();
      if (upd.error) throw upd.error;
      const revived = upd.data as OfferRow;
      notifyListingOwnerByEmailSafe(revived).catch(() => {});
      return revived as unknown as Record<string, unknown>;
    }
  }
  // Otherwise propagate the original error
  throw error;
}

// Helper: fetch listing owner name/email and send offer received email
async function notifyListingOwnerByEmailSafe(offer: OfferRow) {
  try {
    // Join listing and owner (users) to fetch email/name
    const { data, error } = await supabase
      .from('listings')
      .select(`id,title,buyer:buyer_id(name,email)`) // FK join
      .eq('id', offer.listing_id)
      .maybeSingle();
    if (error || !data) return;
    const owner = (data as any).buyer as { name?: string; email?: string } | null;
    if (!owner?.email) return;
    await Mailer.sendOfferReceived(
      { name: owner.name || 'Kullanıcı', email: owner.email },
      { id: (data as any).id, title: (data as any).title },
      { sellerName: offer.seller_name || 'Satıcı', price: Number(offer.price), deliveryType: (offer.delivery_type as any) || undefined }
    );
  } catch {
    // ignore mail errors
  }
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
  buyerName: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  offerCount: number;
  maskOwnerName?: boolean;
  exactProductOnly?: boolean;
};

export function mapListingRowToUi(l: ListingRow & { buyer?: { name: string }; mask_owner_name?: boolean; exact_product_only?: boolean; buyer_name?: string }): UiListing {
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
    buyerName: l.buyer?.name || l.buyer_name || 'Kullanıcı',
    status: l.status,
    createdAt: l.created_at,
    offerCount: l.offer_count || 0,
    maskOwnerName: l.mask_owner_name ?? false,
    exactProductOnly: l.exact_product_only ?? false,
  };
}

export async function fetchListingsUi(): Promise<UiListing[]> {
  const list = await fetchListings();
  return list.map(mapListingRowToUi);
}

// Fetch active listings with nested aggregate offers(count) to get accurate counts in one request
export async function fetchActiveListingsUi(): Promise<UiListing[]> {
  // Note: This relies on PostgREST embedded resources. The relation name is the table name `offers`.
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      offers(count)
    `)
    .eq('status', 'active')
    // Count only non-withdrawn offers in the aggregate
    .neq('offers.status', 'withdrawn')
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Map rows to UiListing, preferring the embedded aggregate for count when present
  const rows = (data ?? []) as Array<ListingRow & { offers?: Array<{ count: number }> }>;
  return rows.map((l) => {
    const ui = mapListingRowToUi(l as ListingRow);
    const aggCount = Array.isArray((l as any).offers) ? (l as any).offers?.[0]?.count ?? undefined : undefined;
    return { ...ui, offerCount: aggCount ?? ui.offerCount ?? 0 };
  });
}

// Fetch only current user's listings (requires Supabase session)
export async function fetchMyListingsUi(): Promise<UiListing[]> {
  const userId = await ensureCurrentUserId();
  if (!userId) return [];
  // Prefer view if available; fallback to direct table filter
  let { data, error } = await supabase
    .from('my_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // Likely the view doesn't exist (404). Fallback to direct filter by buyer_id
    if (import.meta.env.DEV) console.debug('[fetchMyListingsUi] view error, falling back:', error);
    const resp = await supabase
      .from('listings')
      .select('*')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });
    if (resp.error) throw resp.error;
    data = resp.data;
  }
  // If still empty, attempt a join on users.auth_user_id to be robust against id mismatches
  if (!data || data.length === 0) {
    try {
      const { data: authRes } = await supabase.auth.getUser();
      const authUserId = authRes?.user?.id;
      if (authUserId) {
        const j = await supabase
          .from('listings')
          .select('*, buyer:users!inner(auth_user_id)')
          .eq('buyer.auth_user_id', authUserId)
          .order('created_at', { ascending: false });
        if (!j.error && Array.isArray(j.data) && j.data.length > 0) {
          data = j.data as any[];
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[fetchMyListingsUi] join fallback failed:', e);
    }
  }
  return (data ?? []).map(mapListingRowToUi);
}

// Single listing fetch
export async function fetchListingById(id: UUID): Promise<ListingRow | null> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  
  // DEBUG: Supabase'den gelen listing verisini logla
  console.log('📦 Supabase fetchListingById:', {
    id: id,
    'data?.buyer_id': data?.buyer_id,
    'data?.title': data?.title,
    rawData: data
  });
  
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
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const looksUrl = !!url && /^https?:\/\//.test(url);
  const looksJwt = !!key && key.split('.').length >= 3 && key.length > 20; // anon key is a JWT
  return looksUrl && looksJwt;
}

// Favorites API
export async function addToFavorites(listingId: UUID): Promise<void> {
  const userId = await ensureCurrentUserId();
  if (!userId) throw new Error('Must be logged in to add favorites');
  
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, listing_id: listingId });
  
  if (error) throw error;
}

export async function removeFromFavorites(listingId: UUID): Promise<void> {
  const userId = await ensureCurrentUserId();
  if (!userId) throw new Error('Must be logged in to remove favorites');
  
  const { error } = await supabase
    .from('favorites')
    .delete()
    .match({ user_id: userId, listing_id: listingId });
  
  if (error) throw error;
}

export async function getUserFavorites(): Promise<UUID[]> {
  const userId = await ensureCurrentUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data.map(f => f.listing_id);
}

export async function isFavorite(listingId: UUID): Promise<boolean> {
  const userId = await ensureCurrentUserId();
  if (!userId) return false;
  
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .match({ user_id: userId, listing_id: listingId })
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

export async function getFavoriteListings(): Promise<UiListing[]> {
  const favoriteIds = await getUserFavorites();
  if (favoriteIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('id', favoriteIds);
  
  if (error) throw error;
  return data.map(mapListingRowToUi);
}

// Helper to ensure current user id exists in public.users (requires being logged in)
export async function ensureCurrentUserId(): Promise<UUID | null> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return null;
  const { data, error } = await supabase.rpc('get_or_create_current_user');
  if (error) throw error;
  return data as UUID;
}
