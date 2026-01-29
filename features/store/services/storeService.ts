/**
 * Store & Inventory service — frames, vehicles, entry cards, rings.
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
  increment,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import type { StoreCategory, FirestoreStoreItem } from '@/types/firestore';

const STORE_COLLECTION = 'store_items';
const USERS_COLLECTION = 'users';

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function storeItemRef(id: string) {
  return doc(getDb(), STORE_COLLECTION, id);
}

function userRef(uid: string) {
  return doc(getDb(), USERS_COLLECTION, uid);
}

/**
 * Get all active store items by category.
 */
export async function getStoreItems(
  category?: StoreCategory
): Promise<FirestoreStoreItem[]> {
  let q;
  if (category) {
    q = query(
      collection(getDb(), STORE_COLLECTION),
      where('category', '==', category),
      where('isActive', '==', true)
    );
  } else {
    q = query(collection(getDb(), STORE_COLLECTION), where('isActive', '==', true));
  }

  const snapshot = await getDocs(q);
  const items: FirestoreStoreItem[] = [];
  snapshot.forEach((docSnap) => {
    items.push(docSnap.data() as FirestoreStoreItem);
  });

  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Purchase store item (frame, vehicle, entry card, ring).
 */
export async function purchaseStoreItem(
  uid: string,
  itemId: string,
  useCoins: boolean = true
): Promise<void> {
  // Get item
  const itemSnap = await getDoc(storeItemRef(itemId));
  if (!itemSnap.exists()) throw new Error('Item not found');
  const item = itemSnap.data() as FirestoreStoreItem;
  if (!item.isActive) throw new Error('Item is not available');

  // Check balance
  const userSnap = await getDoc(userRef(uid));
  if (!userSnap.exists()) throw new Error('User not found');
  const userData = userSnap.data();
  const coins = userData.economy?.coins ?? 0;
  const diamonds = userData.economy?.diamonds ?? 0;

  const price = useCoins ? item.coinPrice : item.diamondPrice;
  const balance = useCoins ? coins : diamonds;

  if (balance < price) {
    throw new Error(`Insufficient ${useCoins ? 'coins' : 'diamonds'}`);
  }

  // Deduct payment
  const updateData: Record<string, unknown> = {
    'profile.updatedAt': serverTimestamp(),
  };
  if (useCoins) {
    updateData['economy.coins'] = increment(-price);
  } else {
    updateData['economy.diamonds'] = increment(-price);
  }

  // Add to inventory - map category to correct field name
  const categoryToField: Record<StoreCategory, keyof typeof userData.inventory> = {
    frames: 'frameIds',
    vehicles: 'vehicleIds',
    entry_cards: 'entryCardIds',
    rings: 'ringIds',
  };
  const inventoryField = categoryToField[item.category];
  const currentIds = (userData.inventory?.[inventoryField] ?? []) as string[];
  if (currentIds.includes(itemId)) {
    throw new Error('Item already owned');
  }

  // Use proper Firestore field path
  updateData[`inventory.${inventoryField}`] = [...currentIds, itemId];

  await updateDoc(userRef(uid), updateData);
}

/**
 * Equip item (frame, vehicle) for use in rooms.
 */
export async function equipItem(
  uid: string,
  category: 'frames' | 'vehicles',
  itemId: string | null
): Promise<void> {
  const userSnap = await getDoc(userRef(uid));
  if (!userSnap.exists()) throw new Error('User not found');

  const inventoryField = category === 'frames' ? 'frameIds' : 'vehicleIds';
  const currentIds = userSnap.data().inventory?.[inventoryField] ?? [];

  if (itemId && !currentIds.includes(itemId)) {
    throw new Error('Item not owned');
  }

  // For now, we just ensure it's in inventory
  // Actual "equipping" happens when taking a seat (voiceRoomService uses first item)
  // You can extend this to store "equippedFrameId" / "equippedVehicleId" in user profile
}
