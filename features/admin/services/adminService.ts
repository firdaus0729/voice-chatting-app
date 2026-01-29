/**
 * Admin panel service — user inspector, gift manager, shop manager, etc.
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import type { AgencyRole, FirestoreGift, FirestoreStoreItem, StoreCategory } from '@/types/firestore';
import { checkAndUpgradeVIP } from '@/features/vip/services/vipService';

const USERS_COLLECTION = 'users';
const GIFTS_COLLECTION = 'gifts';
const STORE_COLLECTION = 'store_items';
const ADMIN_PASSWORD = 'BOSS123';

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function userRef(uid: string) {
  return doc(getDb(), USERS_COLLECTION, uid);
}

function giftRef(id: string) {
  return doc(getDb(), GIFTS_COLLECTION, id);
}

function storeItemRef(id: string) {
  return doc(getDb(), STORE_COLLECTION, id);
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * User Inspector — edit user coins, VIP, roles, items.
 */
export async function updateUserCoins(uid: string, coins: number): Promise<void> {
  await updateDoc(userRef(uid), {
    'economy.coins': coins,
    'profile.updatedAt': serverTimestamp(),
  });
}

export async function updateUserDiamonds(uid: string, diamonds: number): Promise<void> {
  await updateDoc(userRef(uid), {
    'economy.diamonds': diamonds,
    'profile.updatedAt': serverTimestamp(),
  });
}

export async function updateUserVIP(uid: string, level: number): Promise<void> {
  await updateDoc(userRef(uid), {
    'vip.level': level,
    'profile.updatedAt': serverTimestamp(),
  });
}

export async function updateUserRole(uid: string, role: AgencyRole): Promise<void> {
  await updateDoc(userRef(uid), {
    'agency.role': role,
    'profile.updatedAt': serverTimestamp(),
  });
}

export async function updateUserInventory(
  uid: string,
  category: 'frames' | 'vehicles' | 'entry_cards' | 'rings',
  itemIds: string[]
): Promise<void> {
  const fieldMap: Record<string, string> = {
    frames: 'frameIds',
    vehicles: 'vehicleIds',
    entry_cards: 'entryCardIds',
    rings: 'ringIds',
  };
  const field = fieldMap[category];
  await updateDoc(userRef(uid), {
    [`inventory.${field}`]: itemIds,
    'profile.updatedAt': serverTimestamp(),
  });
}

/**
 * Gift Manager — add/edit gifts dynamically.
 */
export async function createGift(gift: Omit<FirestoreGift, 'createdAt' | 'updatedAt'>): Promise<void> {
  await setDoc(giftRef(gift.id), {
    ...gift,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);
}

export async function updateGift(
  giftId: string,
  updates: Partial<Pick<FirestoreGift, 'name' | 'coinPrice' | 'diamondValue' | 'isActive' | 'sortOrder'>>
): Promise<void> {
  await updateDoc(giftRef(giftId), {
    ...updates,
    updatedAt: serverTimestamp(),
  } as any);
}

/**
 * Shop Manager — manage frames, vehicles.
 */
export async function createStoreItem(
  item: Omit<FirestoreStoreItem, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await setDoc(storeItemRef(item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);
}

export async function updateStoreItem(
  itemId: string,
  updates: Partial<
    Pick<
      FirestoreStoreItem,
      'name' | 'coinPrice' | 'diamondPrice' | 'isActive' | 'sortOrder' | 'resourceUrl'
    >
  >
): Promise<void> {
  await updateDoc(storeItemRef(itemId), {
    ...updates,
    updatedAt: serverTimestamp(),
  } as any);
}

/**
 * Search users by UID, email, or display name.
 */
export async function searchUsers(queryText: string): Promise<Array<{
  uid: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  coins: number;
  diamonds: number;
  vipLevel: number;
  role: AgencyRole;
}>> {
  if (!queryText.trim()) {
    return []; // Return empty for empty query
  }

  // Simple search - in production, use Algolia or similar
  // For now, limit to first 100 docs to avoid performance issues
  const q = query(collection(getDb(), USERS_COLLECTION), limit(100));
  const allUsers = await getDocs(q);
  const results: Array<{
    uid: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    coins: number;
    diamonds: number;
    vipLevel: number;
    role: AgencyRole;
  }> = [];

  allUsers.forEach((docSnap) => {
    const data = docSnap.data();
    const profile = data.profile ?? {};
    const economy = data.economy ?? {};
    const vip = data.vip ?? {};
    const agency = data.agency ?? {};

    const searchText = queryText.toLowerCase();
    const matches =
      docSnap.id.toLowerCase().includes(searchText) ||
      profile.displayName?.toLowerCase().includes(searchText) ||
      profile.email?.toLowerCase().includes(searchText) ||
      profile.phone?.toLowerCase().includes(searchText);

    if (matches) {
      results.push({
        uid: docSnap.id,
        displayName: profile.displayName ?? 'Unknown',
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        coins: economy.coins ?? 0,
        diamonds: economy.diamonds ?? 0,
        vipLevel: vip.level ?? 0,
        role: agency.role ?? null,
      });
    }
  });

  return results.slice(0, 50); // Limit results
}
