/**
 * Economy & Wallet service — coins, diamonds, conversion, withdrawals.
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import {
  COINS_TO_DIAMONDS_RATE,
  COINS_PER_DIAMOND_BATCH,
  DIAMONDS_PER_BATCH,
  DIAMONDS_PER_RUPEE,
  MIN_WITHDRAW_DIAMONDS,
  MIN_WITHDRAW_INR,
} from '@/constants/economy';
import type { FirestoreWithdrawal, WithdrawalStatus } from '@/types/firestore';

const USERS_COLLECTION = 'users';
const WITHDRAWALS_COLLECTION = 'withdrawals';

function getDb(): Firestore {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function userRef(uid: string) {
  return doc(getDb(), USERS_COLLECTION, uid);
}

function withdrawalRef(id: string) {
  return doc(getDb(), WITHDRAWALS_COLLECTION, id);
}

/**
 * Convert coins to diamonds (10,000 Coins → 6,000 Diamonds).
 */
export async function convertCoinsToDiamonds(
  uid: string,
  coins: number
): Promise<{ diamonds: number; remainingCoins: number }> {
  if (coins <= 0) {
    throw new Error('Coins amount must be positive');
  }
  if (coins < COINS_PER_DIAMOND_BATCH) {
    throw new Error(`Minimum ${COINS_PER_DIAMOND_BATCH.toLocaleString()} coins required`);
  }

  // Check user balance
  const userSnap = await getDoc(userRef(uid));
  if (!userSnap.exists()) throw new Error('User not found');
  const currentCoins = userSnap.data().economy?.coins ?? 0;
  if (currentCoins < coins) {
    throw new Error('Insufficient coins');
  }

  const batches = Math.floor(coins / COINS_PER_DIAMOND_BATCH);
  const diamondsEarned = batches * DIAMONDS_PER_BATCH;
  const coinsUsed = batches * COINS_PER_DIAMOND_BATCH;
  const remainingCoins = coins - coinsUsed;

  const ref = userRef(uid);
  await updateDoc(ref, {
    'economy.coins': increment(-coinsUsed),
    'economy.diamonds': increment(diamondsEarned),
    'profile.updatedAt': serverTimestamp(),
  });

  return { diamonds: diamondsEarned, remainingCoins };
}

/**
 * Add coins (from Razorpay recharge).
 */
export async function addCoins(uid: string, coins: number, rechargeAmount: number): Promise<void> {
  if (coins <= 0 || rechargeAmount <= 0) {
    throw new Error('Coins and recharge amount must be positive');
  }
  const ref = userRef(uid);
  await updateDoc(ref, {
    'economy.coins': increment(coins),
    'economy.lifetimeRecharge': increment(rechargeAmount),
    'profile.updatedAt': serverTimestamp(),
  });
}

/**
 * Deduct coins (for gifts, store purchases).
 */
export async function deductCoins(uid: string, coins: number): Promise<void> {
  if (coins <= 0) {
    throw new Error('Coins amount must be positive');
  }
  const ref = userRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('User not found');
  const data = snap.data();
  const currentCoins = data.economy?.coins ?? 0;
  if (currentCoins < coins) {
    throw new Error('Insufficient coins');
  }
  await updateDoc(ref, {
    'economy.coins': increment(-coins),
    'profile.updatedAt': serverTimestamp(),
  });
}

/**
 * Add diamonds (from gift conversion).
 */
export async function addDiamonds(uid: string, diamonds: number): Promise<void> {
  if (diamonds <= 0) {
    throw new Error('Diamonds amount must be positive');
  }
  const ref = userRef(uid);
  await updateDoc(ref, {
    'economy.diamonds': increment(diamonds),
    'profile.updatedAt': serverTimestamp(),
  });
}

/**
 * Create withdrawal request.
 */
export async function createWithdrawal(params: {
  uid: string;
  diamonds: number;
}): Promise<string> {
  if (params.diamonds <= 0) {
    throw new Error('Diamonds amount must be positive');
  }
  if (params.diamonds < MIN_WITHDRAW_DIAMONDS) {
    throw new Error(`Minimum ${MIN_WITHDRAW_DIAMONDS.toLocaleString()} diamonds required`);
  }

  // Check balance
  const userSnap = await getDoc(userRef(params.uid));
  if (!userSnap.exists()) throw new Error('User not found');
  const currentDiamonds = userSnap.data().economy?.diamonds ?? 0;
  if (currentDiamonds < params.diamonds) {
    throw new Error('Insufficient diamonds');
  }

  const amountInr = params.diamonds / DIAMONDS_PER_RUPEE;
  if (amountInr < MIN_WITHDRAW_INR) {
    throw new Error(`Minimum withdrawal amount is ₹${MIN_WITHDRAW_INR}`);
  }

  const withdrawalId = `wd_${params.uid}_${Date.now()}`;
  const withdrawal: FirestoreWithdrawal = {
    id: withdrawalId,
    uid: params.uid,
    diamonds: params.diamonds,
    amountInr: amountInr,
    status: 'pending',
    createdAt: serverTimestamp() as any,
    processedAt: null,
    processedBy: null,
  };

  // Deduct diamonds immediately
  await updateDoc(userRef(params.uid), {
    'economy.diamonds': increment(-params.diamonds),
    'profile.updatedAt': serverTimestamp(),
  });

  // Create withdrawal record (use setDoc since it's a new document)
  const { setDoc } = await import('firebase/firestore');
  await setDoc(withdrawalRef(withdrawalId), withdrawal as any);

  return withdrawalId;
}

/**
 * Approve/reject withdrawal (admin only).
 */
export async function processWithdrawal(
  withdrawalId: string,
  status: 'approved' | 'rejected',
  processedBy: string
): Promise<void> {
  const ref = withdrawalRef(withdrawalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Withdrawal not found');
  const withdrawal = snap.data() as FirestoreWithdrawal;

  if (withdrawal.status !== 'pending') {
    throw new Error('Withdrawal already processed');
  }

  if (status === 'rejected') {
    // Refund diamonds
    await updateDoc(userRef(withdrawal.uid), {
      'economy.diamonds': increment(withdrawal.diamonds),
      'profile.updatedAt': serverTimestamp(),
    });
  }

  await updateDoc(ref, {
    status,
    processedAt: serverTimestamp(),
    processedBy,
  } as any);
}
