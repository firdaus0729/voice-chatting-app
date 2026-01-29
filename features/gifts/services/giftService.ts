/**
 * Gift service — send gifts, convert to diamonds, treasure box contributions.
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import { COINS_TO_DIAMONDS_RATE } from '@/constants/economy';
import type { FirestoreGift, FirestoreTreasureBox } from '@/types/firestore';

const GIFTS_COLLECTION = 'gifts';
const TREASURE_BOX_COLLECTION = 'treasure_box';
const USERS_COLLECTION = 'users';

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function giftRef(id: string) {
  return doc(getDb(), GIFTS_COLLECTION, id);
}

function treasureBoxRef() {
  return doc(getDb(), TREASURE_BOX_COLLECTION, 'global');
}

function userRef(uid: string) {
  return doc(getDb(), USERS_COLLECTION, uid);
}

/**
 * Get all active gifts.
 */
export async function getActiveGifts(): Promise<FirestoreGift[]> {
  const q = query(
    collection(getDb(), GIFTS_COLLECTION),
    where('isActive', '==', true),
    orderBy('sortOrder')
  );
  const snapshot = await getDocs(q);
  const gifts: FirestoreGift[] = [];
  snapshot.forEach((docSnap) => {
    gifts.push(docSnap.data() as FirestoreGift);
  });
  return gifts;
}

/**
 * Send gift to a user in a room.
 */
export async function sendGift(params: {
  senderUid: string;
  recipientUid: string;
  giftId: string;
  quantity: number;
  roomId: string;
}): Promise<{ diamondsEarned: number; treasureContribution: number }> {
  if (params.quantity <= 0 || params.quantity > 1000) {
    throw new Error('Quantity must be between 1 and 1000');
  }
  if (params.senderUid === params.recipientUid) {
    throw new Error('Cannot send gift to yourself');
  }

  // Get gift
  const giftSnap = await getDoc(giftRef(params.giftId));
  if (!giftSnap.exists()) throw new Error('Gift not found');
  const gift = giftSnap.data() as FirestoreGift;
  if (!gift.isActive) throw new Error('Gift is not available');

  const totalCost = gift.coinPrice * params.quantity;

  // Check sender balance
  const senderSnap = await getDoc(userRef(params.senderUid));
  if (!senderSnap.exists()) throw new Error('Sender not found');
  const senderCoins = senderSnap.data().economy?.coins ?? 0;
  if (senderCoins < totalCost) {
    throw new Error('Insufficient coins');
  }

  // Deduct coins from sender
  await updateDoc(userRef(params.senderUid), {
    'economy.coins': increment(-totalCost),
    'profile.updatedAt': serverTimestamp(),
  });

  // Calculate diamonds for recipient (60% of coins)
  const diamondsEarned = Math.floor(totalCost * COINS_TO_DIAMONDS_RATE);

  // Add diamonds to recipient
  await updateDoc(userRef(params.recipientUid), {
    'economy.diamonds': increment(diamondsEarned),
    'profile.updatedAt': serverTimestamp(),
  });

  // Update treasure box contribution (with auto-level calculation)
  const { updateTreasureBoxContribution } = await import('./treasureBoxService');
  await updateTreasureBoxContribution(totalCost);

  return {
    diamondsEarned,
    treasureContribution: totalCost,
  };
}

/**
 * Get treasure box state.
 */
export async function getTreasureBox(): Promise<FirestoreTreasureBox | null> {
  const snap = await getDoc(treasureBoxRef());
  if (!snap.exists()) return null;
  return snap.data() as FirestoreTreasureBox;
}

/**
 * Get top 3 contributors for treasure box.
 */
export async function getTopContributors(): Promise<Array<{
  uid: string;
  displayName: string;
  coinsGifted: number;
}>> {
  // This would require a contributions subcollection
  // For now, return empty array - implement based on your tracking needs
  return [];
}
