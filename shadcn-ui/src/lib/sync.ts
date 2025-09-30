import { DataManager } from './mockData';
import { createListing as sbCreateListing, supabaseEnabled, ensureCurrentUserId } from './sbApi';

const SYNC_KEY = 'syncedListingsMap';

function getMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, string>) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(map));
}

export function getSyncedLocalListingIds(): Set<string> {
  return new Set(Object.keys(getMap()));
}

export async function syncLocalListingsToSupabase(): Promise<number> {
  if (!supabaseEnabled()) return 0;
  const buyerId = await ensureCurrentUserId();
  if (!buyerId) return 0; // oturum yok

  const current = DataManager.getCurrentUser();
  if (!current) return 0;

  const synced = getMap();
  const listings = DataManager.getListings().filter(l => !synced[l.id] && l.buyerId === current.id);
  let ok = 0;
  for (const l of listings) {
    try {
      const inserted = await sbCreateListing({
        buyer_id: buyerId,
        title: l.title,
        description: l.description,
        category: l.category,
        budget_max: l.budgetMax,
        condition: l.condition,
        city: l.city,
        delivery_type: l.deliveryType,
        images: l.images ?? [],
        offers_public: l.offersPublic ?? true,
        offers_purchasable: l.offersPurchasable ?? true,
        status: l.status ?? 'active',
        expires_at: l.expiresAt ?? null,
      });
      synced[l.id] = inserted.id;
      ok++;
    } catch (e) {
      // Dev’de hatayı sessiz geçelim; loglamak isterseniz açın
      // console.debug('sync failed', l.id, e);
    }
  }
  if (ok > 0) saveMap(synced);
  return ok;
}
