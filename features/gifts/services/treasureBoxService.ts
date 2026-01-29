/**
 * Treasure Box service — level calculation and updates.
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import {
  TREASURE_LEVEL_1,
  TREASURE_LEVEL_2,
  TREASURE_LEVEL_3,
} from '@/constants/economy';
import type { FirestoreTreasureBox } from '@/types/firestore';

const TREASURE_BOX_COLLECTION = 'treasure_box';

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function treasureBoxRef() {
  return doc(getDb(), TREASURE_BOX_COLLECTION, 'global');
}

/**
 * Calculate current level based on total coins gifted.
 */
function calculateLevel(totalCoins: number): 0 | 1 | 2 | 3 {
  if (totalCoins >= TREASURE_LEVEL_3) return 3;
  if (totalCoins >= TREASURE_LEVEL_2) return 2;
  if (totalCoins >= TREASURE_LEVEL_1) return 1;
  return 0;
}

/**
 * Initialize treasure box if it doesn't exist.
 */
export async function initializeTreasureBox(): Promise<FirestoreTreasureBox> {
  const initialTreasureBox: FirestoreTreasureBox = {
    totalCoinsGifted: 0,
    level1Threshold: TREASURE_LEVEL_1,
    level2Threshold: TREASURE_LEVEL_2,
    level3Threshold: TREASURE_LEVEL_3,
    currentLevel: 0,
    lastResetAt: serverTimestamp() as any,
  };
  await setDoc(treasureBoxRef(), initialTreasureBox as any);
  return initialTreasureBox;
}

/**
 * Update treasure box with new contribution and auto-update level.
 */
export async function updateTreasureBoxContribution(
  coinsGifted: number
): Promise<{ newLevel: number; levelUpgraded: boolean }> {
  const snap = await getDoc(treasureBoxRef());
  let treasureBox: FirestoreTreasureBox;

  if (!snap.exists()) {
    treasureBox = await initializeTreasureBox();
  } else {
    treasureBox = snap.data() as FirestoreTreasureBox;
  }

  const newTotal = (treasureBox.totalCoinsGifted ?? 0) + coinsGifted;
  const oldLevel = treasureBox.currentLevel;
  const newLevel = calculateLevel(newTotal);
  const levelUpgraded = newLevel > oldLevel;

  await updateDoc(treasureBoxRef(), {
    totalCoinsGifted: newTotal,
    currentLevel: newLevel,
    lastResetAt: levelUpgraded ? serverTimestamp() : treasureBox.lastResetAt,
  } as any);

  return { newLevel, levelUpgraded };
}

/**
 * Reset treasure box (admin only).
 */
export async function resetTreasureBox(): Promise<void> {
  await initializeTreasureBox();
}
