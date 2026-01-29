/**
 * VIP system — auto-upgrade based on cumulative recharge.
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import { VIP_LEVELS, vipLevelFromRecharge } from '@/constants/vip';

const USERS_COLLECTION = 'users';

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function userRef(uid: string) {
  return doc(getDb(), USERS_COLLECTION, uid);
}

/**
 * Check and auto-upgrade VIP level based on lifetime recharge.
 * Call this after any recharge transaction.
 */
export async function checkAndUpgradeVIP(uid: string): Promise<{
  oldLevel: number;
  newLevel: number;
  upgraded: boolean;
}> {
  const ref = userRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('User not found');

  const data = snap.data();
  const lifetimeRecharge = data.economy?.lifetimeRecharge ?? 0;
  const currentLevel = data.vip?.level ?? 0;

  const newLevel = vipLevelFromRecharge(lifetimeRecharge);
  const upgraded = newLevel > currentLevel;

  if (upgraded) {
    await updateDoc(ref, {
      'vip.level': newLevel,
      'vip.cumulativeRecharge': lifetimeRecharge,
      'profile.updatedAt': serverTimestamp(),
    });
  }

  return {
    oldLevel: currentLevel,
    newLevel,
    upgraded,
  };
}
