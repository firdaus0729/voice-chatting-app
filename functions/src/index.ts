import * as path from 'path';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Load root .env when running locally (emulator). Production uses Firebase config / Cloud env.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

admin.initializeApp();

const db = admin.firestore();

/** 60% of spent coins become receiver diamonds */
const DIAMOND_RATE = 0.6;
/** Max gifts per sender per minute (spam prevention) */
const MAX_GIFTS_PER_MINUTE = 10;

/** Gift catalog (must match client). Server validates giftId and price. */
const GIFT_CATALOG: Record<string, { price: number }> = {
  rose: { price: 10 },
  heart: { price: 50 },
  crown: { price: 100 },
  diamond: { price: 200 },
  rocket: { price: 500 },
};

type SendGiftData = {
  senderId: string;
  receiverId: string;
  giftId: string;
};

const INITIAL_COINS = 1000;

/** Create wallet with initial balance if it doesn't exist. Call after signup. */
export const createWallet = functions.https.onCall(
  async (data: { userId: string }, _context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    const userId = data?.userId;
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'Missing userId' };
    }
    const walletRef = db.collection('wallet').doc(userId);
    try {
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const snap = await tx.get(walletRef);
        if (snap.exists) {
          return;
        }
        const now = Date.now();
        tx.set(walletRef, {
          userId,
          coins: INITIAL_COINS,
          diamonds: 0,
          updatedAt: now,
          lastTransactionId: null,
        });
      });
      return { success: true };
    } catch (e: unknown) {
      functions.logger.warn('createWallet failed', e);
      return { success: false, error: 'Failed to create wallet' };
    }
  }
);

export const sendGift = functions.https.onCall(
  async (data: SendGiftData, _context: functions.https.CallableContext): Promise<{ success: true; transactionId: string } | { success: false; error: string }> => {
    const { senderId, receiverId, giftId } = data ?? {};
    if (!senderId || !receiverId || !giftId || typeof senderId !== 'string' || typeof receiverId !== 'string' || typeof giftId !== 'string') {
      return { success: false, error: 'Missing or invalid senderId, receiverId, or giftId' };
    }

    const gift = GIFT_CATALOG[giftId];
    if (!gift || gift.price <= 0) {
      return { success: false, error: 'Invalid gift' };
    }

    const price = gift.price;
    const diamondCredit = Math.floor(price * DIAMOND_RATE);

    const walletColl = db.collection('wallet');
    const transactionsColl = db.collection('transactions');

    const transactionId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const senderRef = walletColl.doc(senderId);
        const receiverRef = walletColl.doc(receiverId);

        const [senderSnap, receiverSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef)]);

        const senderCoins = (senderSnap.data()?.coins as number) ?? 0;
        const receiverDiamonds = (receiverSnap.data()?.diamonds as number) ?? 0;

        if (senderCoins < price) {
          throw new Error('INSUFFICIENT_COINS');
        }

        const oneMinuteAgo = Date.now() - 60 * 1000;
        const recentGiftsSnap = await tx.get(
          transactionsColl.where('senderId', '==', senderId).where('createdAt', '>=', oneMinuteAgo)
        );
        if (recentGiftsSnap.size >= MAX_GIFTS_PER_MINUTE) {
          throw new Error('RATE_LIMIT');
        }

        const now = Date.now();
        const newSenderCoins = senderCoins - price;
        const newReceiverDiamonds = receiverDiamonds + diamondCredit;

        tx.set(senderRef, {
          userId: senderId,
          coins: newSenderCoins,
          diamonds: senderSnap.data()?.diamonds ?? 0,
          updatedAt: now,
          lastTransactionId: transactionId,
        }, { merge: true });

        tx.set(receiverRef, {
          userId: receiverId,
          coins: receiverSnap.data()?.coins ?? 0,
          diamonds: newReceiverDiamonds,
          updatedAt: now,
          lastTransactionId: transactionId,
        }, { merge: true });

        tx.set(transactionsColl.doc(transactionId), {
          transactionId,
          senderId,
          receiverId,
          giftId,
          coinAmount: price,
          diamondAmount: diamondCredit,
          createdAt: now,
          source: 'gift',
        });
      });

      return { success: true, transactionId };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'UNKNOWN';
      if (message === 'INSUFFICIENT_COINS') {
        return { success: false, error: 'Insufficient coins' };
      }
      if (message === 'RATE_LIMIT') {
        return { success: false, error: 'Too many gifts. Try again in a minute.' };
      }
      functions.logger.warn('sendGift failed', e);
      return { success: false, error: 'Transaction failed' };
    }
  }
);

// --- Treasure box (does not modify sendGift or wallet gift logic) ---
const TREASURE_THRESHOLDS = [12000, 50000, 150000];
const TREASURE_REWARD_DIAMONDS = 500;

type AddTreasureData = { roomId: string; userId: string; transactionId: string };

/** Add gift to room treasure progress. Validates transaction; when threshold reached, picks winner and pays reward. */
export const addTreasureContribution = functions.https.onCall(
  async (data: AddTreasureData, _context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    const { roomId, userId, transactionId } = data ?? {};
    if (!roomId || !userId || !transactionId || typeof roomId !== 'string' || typeof userId !== 'string' || typeof transactionId !== 'string') {
      return { success: false, error: 'Missing roomId, userId, or transactionId' };
    }

    const transactionsColl = db.collection('transactions');
    const txRef = transactionsColl.doc(transactionId);
    const roomRef = db.collection('rooms').doc(roomId);

    try {
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const [txSnap, roomSnap] = await Promise.all([tx.get(txRef), tx.get(roomRef)]);
        const txData = txSnap.data();
        const roomData = roomSnap.data();

        if (!txData || txData.senderId !== userId || txData.source !== 'gift') {
          throw new Error('INVALID_TRANSACTION');
        }
        if ((txData as { treasureRoomId?: string }).treasureRoomId) {
          throw new Error('ALREADY_COUNTED');
        }

        const coinAmount = (txData.coinAmount as number) ?? 0;
        if (coinAmount <= 0) throw new Error('INVALID_AMOUNT');

        const progress = (roomData?.treasureProgress as number) ?? 0;
        const contributions: Record<string, number> = { ...(roomData?.treasureContributions as Record<string, number> || {}) };
        contributions[userId] = (contributions[userId] ?? 0) + coinAmount;
        const newProgress = progress + coinAmount;
        const thresholdIndex = Math.min((roomData?.treasureThresholdIndex as number) ?? 0, 2);
        const threshold = TREASURE_THRESHOLDS[thresholdIndex];

        tx.update(txRef, { treasureRoomId: roomId });
        tx.set(roomRef, {
          treasureProgress: newProgress,
          treasureContributions: contributions,
          treasureThresholdIndex: thresholdIndex,
        }, { merge: true });

        if (newProgress >= threshold) {
          const entries = Object.entries(contributions);
          if (entries.length === 0) return;
          let total = 0;
          for (const [, v] of entries) total += v;
          let r = Math.random() * total;
          let winnerId = entries[0][0];
          for (const [uid, amount] of entries) {
            r -= amount;
            if (r <= 0) {
              winnerId = uid;
              break;
            }
          }
          const winnerWalletRef = db.collection('wallet').doc(winnerId);
          const winnerSnap = await tx.get(winnerWalletRef);
          const winnerDiamonds = (winnerSnap.data()?.diamonds as number) ?? 0;
          const now = Date.now();
          tx.set(winnerWalletRef, {
            userId: winnerId,
            coins: winnerSnap.data()?.coins ?? 0,
            diamonds: winnerDiamonds + TREASURE_REWARD_DIAMONDS,
            updatedAt: now,
            lastTransactionId: `treasure_${roomId}_${now}`,
          }, { merge: true });
          tx.set(roomRef, {
            treasureProgress: 0,
            treasureContributions: {},
            treasureThresholdIndex: (thresholdIndex + 1) % 3,
            lastTreasureWinnerId: winnerId,
            lastTreasureAt: now,
          }, { merge: true });
        }
      });
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'INVALID_TRANSACTION' || msg === 'INVALID_AMOUNT') return { success: false, error: 'Invalid transaction' };
      if (msg === 'ALREADY_COUNTED') return { success: false, error: 'Already counted' };
      functions.logger.warn('addTreasureContribution failed', e);
      return { success: false, error: 'Failed' };
    }
  }
);

// --- Agency (hierarchy, binding, commission). Withdrawals disabled. ---
const AGENCY_ROLES = ['BD', 'Admin', 'Super Admin', 'Country Manager', 'Chief Official'] as const;
type AgencyRole = (typeof AGENCY_ROLES)[number];
const DEFAULT_AGENCY_ROLE: AgencyRole = 'BD';
const COMMISSION_RATE = 0.02;
/** Only Chief Official can assign roles (admin-only) */
const ADMIN_ROLES: AgencyRole[] = ['Chief Official'];

function generateAgencyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Create agency profile for user if not exists; assigns unique agency code. */
export const createAgency = functions.https.onCall(
  async (data: { userId: string }, _context: functions.https.CallableContext): Promise<{ success: true; agencyCode: string } | { success: false; error: string }> => {
    const userId = data?.userId;
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'Missing userId' };
    }

    const agencyRef = db.collection('agency').doc(userId);
    const codesColl = db.collection('agencyCodes');

    try {
      let code: string | null = null;
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const snap = await tx.get(agencyRef);
        if (snap.exists) {
          code = (snap.data()?.agencyCode as string) ?? null;
          return;
        }
        code = generateAgencyCode();
        const codeRef = codesColl.doc(code);
        const codeSnap = await tx.get(codeRef);
        if (codeSnap.exists()) {
          code = generateAgencyCode();
        }
        const now = Date.now();
        tx.set(agencyRef, {
          userId,
          role: DEFAULT_AGENCY_ROLE,
          agencyCode: code,
          parentUserId: null,
          boundAt: null,
          commissionBalance: 0,
          totalWithdrawn: 0,
          teamEarnings: 0,
          createdAt: now,
          updatedAt: now,
        });
        tx.set(codesColl.doc(code!), { userId });
      });
      return code ? { success: true, agencyCode: code } : { success: false, error: 'Already exists' };
    } catch (e: unknown) {
      functions.logger.warn('createAgency failed', e);
      return { success: false, error: 'Failed' };
    }
  }
);

type BindAgencyData = { userId: string; agencyCode: string };

/** One-time bind to inviter by agency code. Prevents re-binding. */
export const bindAgency = functions.https.onCall(
  async (data: BindAgencyData, _context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    const { userId, agencyCode } = data ?? {};
    if (!userId || !agencyCode || typeof userId !== 'string' || typeof agencyCode !== 'string') {
      return { success: false, error: 'Missing userId or agencyCode' };
    }

    const code = String(agencyCode).trim().toUpperCase();
    if (code.length < 4) return { success: false, error: 'Invalid code' };

    const agencyRef = db.collection('agency').doc(userId);
    const codeRef = db.collection('agencyCodes').doc(code);

    try {
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const [childSnap, codeSnap] = await Promise.all([tx.get(agencyRef), tx.get(codeRef)]);
        const childData = childSnap.data();
        const codeData = codeSnap.data();

        if (!childData) throw new Error('AGENCY_NOT_FOUND');
        if (childData.parentUserId != null) throw new Error('ALREADY_BOUND');
        const parentUserId = codeData?.userId as string | undefined;
        if (!parentUserId || parentUserId === userId) throw new Error('INVALID_CODE');

        const now = Date.now();
        tx.update(agencyRef, {
          parentUserId,
          boundAt: now,
          updatedAt: now,
        });
      });
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'AGENCY_NOT_FOUND') return { success: false, error: 'Create agency first' };
      if (msg === 'ALREADY_BOUND') return { success: false, error: 'Already bound to an inviter' };
      if (msg === 'INVALID_CODE') return { success: false, error: 'Invalid or your own code' };
      functions.logger.warn('bindAgency failed', e);
      return { success: false, error: 'Failed' };
    }
  }
);

type AssignRoleData = { adminUserId: string; targetUserId: string; role: string };

/** Admin-only: assign agency role. Only Chief Official (or configured admins) can call. */
export const assignRole = functions.https.onCall(
  async (data: AssignRoleData, _context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    const { adminUserId, targetUserId, role } = data ?? {};
    if (!adminUserId || !targetUserId || !role || typeof adminUserId !== 'string' || typeof targetUserId !== 'string' || typeof role !== 'string') {
      return { success: false, error: 'Missing adminUserId, targetUserId, or role' };
    }

    if (!AGENCY_ROLES.includes(role as AgencyRole)) {
      return { success: false, error: 'Invalid role' };
    }

    const adminRef = db.collection('agency').doc(adminUserId);
    const targetRef = db.collection('agency').doc(targetUserId);

    try {
      const adminSnap = await adminRef.get();
      const adminData = adminSnap.data();
      const adminRole = adminData?.role as AgencyRole | undefined;
      if (!adminRole || !ADMIN_ROLES.includes(adminRole)) {
        return { success: false, error: 'Admin only' };
      }

      const now = Date.now();
      await targetRef.set(
        {
          role,
          updatedAt: now,
        },
        { merge: true }
      );
      return { success: true };
    } catch (e: unknown) {
      functions.logger.warn('assignRole failed', e);
      return { success: false, error: 'Failed' };
    }
  }
);

type RecordRechargeData = { userId: string; amount: number };

/** Record a recharge and credit 2% commission to direct parent. Called by backend only (e.g. after payment). */
export const recordRecharge = functions.https.onCall(
  async (data: RecordRechargeData, _context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    const { userId, amount } = data ?? {};
    if (!userId || typeof userId !== 'string' || typeof amount !== 'number' || amount <= 0) {
      return { success: false, error: 'Invalid userId or amount' };
    }

    const agencyRef = db.collection('agency').doc(userId);

    try {
      const agencySnap = await agencyRef.get();
      const agencyData = agencySnap.data();
      const parentUserId = agencyData?.parentUserId as string | null | undefined;
      if (!parentUserId) {
        return { success: true };
      }

      const commission = Math.floor(amount * COMMISSION_RATE);
      if (commission <= 0) return { success: true };

      const parentRef = db.collection('agency').doc(parentUserId);
      const parentSnap = await parentRef.get();
      if (!parentSnap.exists()) return { success: true };

      const now = Date.now();
      const parentData = parentSnap.data()!;
      const newBalance = ((parentData.commissionBalance as number) ?? 0) + commission;
      const newTeamEarnings = ((parentData.teamEarnings as number) ?? 0) + commission;

      await parentRef.set(
        {
          commissionBalance: newBalance,
          teamEarnings: newTeamEarnings,
          updatedAt: now,
        },
        { merge: true }
      );

      const historyRef = parentRef.collection('commissionHistory').doc(`recharge_${now}_${userId}`);
      await historyRef.set({
        userId: parentUserId,
        fromUserId: userId,
        amount,
        commissionAmount: commission,
        source: 'recharge',
        createdAt: now,
      });

      return { success: true };
    } catch (e: unknown) {
      functions.logger.warn('recordRecharge failed', e);
      return { success: false, error: 'Failed' };
    }
  }
);

// --- Payments (Razorpay), VIP, Withdrawal, Admin, Contest ---
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? functions.config().razorpay?.key_id ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? functions.config().razorpay?.key_secret ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? functions.config().admin?.password ?? '';
const DIAMOND_TO_INR_RATE = 0.5; // 1 diamond = ₹0.50
const MIN_WITHDRAWAL_INR = 100;
const WITHDRAWAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const COINS_PER_INR = 10; // ₹1 = 10 coins (configurable)

/** VIP tiers by cumulative recharge INR (inclusive). Level 0 = no VIP. */
const VIP_TIERS_INR: number[] = [0, 500, 2000, 5000, 10000, 25000];

function getVipLevel(cumulativeRechargeInr: number): number {
  let level = 0;
  for (let i = VIP_TIERS_INR.length - 1; i >= 0; i--) {
    if (cumulativeRechargeInr >= VIP_TIERS_INR[i]) {
      level = i;
      break;
    }
  }
  return level;
}

/** Coin packs: INR -> coins. Server-only source of truth. */
const COIN_PACKS: { inr: number; coins: number }[] = [
  { inr: 99, coins: 1000 },
  { inr: 499, coins: 5500 },
  { inr: 999, coins: 12000 },
  { inr: 2499, coins: 32000 },
  { inr: 4999, coins: 70000 },
];

function getCoinsForPack(inr: number): number | null {
  const pack = COIN_PACKS.find((p) => p.inr === inr);
  return pack ? pack.coins : null;
}

function requireAdmin(context: functions.https.CallableContext): boolean {
  return (context.auth?.token?.admin as boolean) === true;
}

/** Create Razorpay order for recharge. Returns orderId and amount in paise. */
type CreateRechargeOrderData = { userId: string; amountInr: number };
export const createRechargeOrder = functions.https.onCall(
  async (data: CreateRechargeOrderData, context: functions.https.CallableContext): Promise<{ success: true; orderId: string; amountPaise: number; keyId: string } | { success: false; error: string }> => {
    if (!context.auth || context.auth.uid !== data?.userId) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = data.userId;
    const amountInr = typeof data.amountInr === 'number' ? data.amountInr : 0;
    const coins = getCoinsForPack(amountInr);
    if (coins == null || amountInr < 1) {
      return { success: false, error: 'Invalid pack. Choose a valid amount.' };
    }
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return { success: false, error: 'Payments not configured' };
    }

    const Razorpay = require('razorpay');
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const amountPaise = Math.round(amountInr * 100);
    const receipt = `recharge_${userId}_${Date.now()}`.slice(0, 40);

    try {
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { userId },
      });
      const orderId = order.id as string;

      await db.collection('rechargeOrders').doc(orderId).set({
        orderId,
        userId,
        amountPaise,
        amountInr,
        coinsToCredit: coins,
        status: 'created',
        createdAt: Date.now(),
      });

      return { success: true, orderId, amountPaise, keyId: RAZORPAY_KEY_ID };
    } catch (e: unknown) {
      functions.logger.warn('createRechargeOrder failed', e);
      return { success: false, error: 'Could not create order' };
    }
  }
);

/** Verify Razorpay payment, prevent replay, credit coins, update VIP, record agency commission. */
type VerifyRechargePaymentData = { userId: string; orderId: string; paymentId: string; signature: string };
export const verifyRechargePayment = functions.https.onCall(
  async (data: VerifyRechargePaymentData, context: functions.https.CallableContext): Promise<{ success: true; coins: number } | { success: false; error: string }> => {
    if (!context.auth || context.auth.uid !== data?.userId) {
      return { success: false, error: 'Unauthorized' };
    }
    const { userId, orderId, paymentId, signature } = data ?? {};
    if (!userId || !orderId || !paymentId || !signature || typeof userId !== 'string' || typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
      return { success: false, error: 'Missing payment details' };
    }
    if (!RAZORPAY_KEY_SECRET) {
      return { success: false, error: 'Payments not configured' };
    }

    const expectedSig = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${paymentId}|${orderId}`).digest('hex');
    if (expectedSig !== signature) {
      return { success: false, error: 'Invalid signature' };
    }

    const orderRef = db.collection('rechargeOrders').doc(orderId);
    const walletRef = db.collection('wallet').doc(userId);
    const userRef = db.collection('users').doc(userId);

    try {
      const result = await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const orderSnap = await tx.get(orderRef);
        const orderData = orderSnap.data();
        if (!orderData || orderData.userId !== userId) {
          throw new Error('ORDER_NOT_FOUND');
        }
        if (orderData.status === 'completed') {
          throw new Error('REPLAY');
        }

        const coinsToCredit = orderData.coinsToCredit as number;
        const amountInr = orderData.amountInr as number;

        const walletSnap = await tx.get(walletRef);
        const walletData = walletSnap.data() ?? {};
        const currentCoins = (walletData.coins as number) ?? 0;
        const cumulativeRechargeInr = (walletData.cumulativeRechargeInr as number) ?? 0;
        const newCumulative = cumulativeRechargeInr + amountInr;
        const newVipLevel = getVipLevel(newCumulative);

        tx.update(orderRef, {
          status: 'completed',
          completedAt: Date.now(),
          paymentId,
        });
        tx.set(walletRef, {
          userId,
          coins: currentCoins + coinsToCredit,
          diamonds: walletData.diamonds ?? 0,
          cumulativeRechargeInr: newCumulative,
          vipLevel: newVipLevel,
          updatedAt: Date.now(),
          lastTransactionId: `recharge_${orderId}`,
        }, { merge: true });
        tx.set(userRef, { vipLevel: newVipLevel }, { merge: true });

        return { coins: coinsToCredit };
      });

      await recordRechargeInternal(userId, result.coins / COINS_PER_INR);
      return { success: true, coins: result.coins };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'ORDER_NOT_FOUND') return { success: false, error: 'Order not found' };
      if (msg === 'REPLAY') return { success: false, error: 'Payment already processed' };
      functions.logger.warn('verifyRechargePayment failed', e);
      return { success: false, error: 'Verification failed' };
    }
  }
);

async function recordRechargeInternal(userId: string, amountInr: number): Promise<void> {
  const agencyRef = db.collection('agency').doc(userId);
  const agencySnap = await agencyRef.get();
  const agencyData = agencySnap.data();
  const parentUserId = agencyData?.parentUserId as string | null | undefined;
  if (!parentUserId) return;
  const commission = Math.floor(amountInr * COMMISSION_RATE);
  if (commission <= 0) return;
  const parentRef = db.collection('agency').doc(parentUserId);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists()) return;
  const now = Date.now();
  const parentData = parentSnap.data()!;
  const newBalance = ((parentData.commissionBalance as number) ?? 0) + commission;
  const newTeamEarnings = ((parentData.teamEarnings as number) ?? 0) + commission;
  await parentRef.set(
    { commissionBalance: newBalance, teamEarnings: newTeamEarnings, updatedAt: now },
    { merge: true }
  );
  await parentRef.collection('commissionHistory').doc(`recharge_${now}_${userId}`).set({
    userId: parentUserId,
    fromUserId: userId,
    amount: amountInr,
    commissionAmount: commission,
    source: 'recharge',
    createdAt: now,
  });
}

// --- Withdrawal ---
type RequestWithdrawalData = { userId: string; diamonds: number; upiId?: string };
export const requestWithdrawal = functions.https.onCall(
  async (data: RequestWithdrawalData, context: functions.https.CallableContext): Promise<{ success: true; requestId: string } | { success: false; error: string }> => {
    if (!context.auth || context.auth.uid !== data?.userId) {
      return { success: false, error: 'Unauthorized' };
    }
    const { userId, diamonds } = data ?? {};
    if (!userId || typeof diamonds !== 'number' || diamonds < 0) {
      return { success: false, error: 'Invalid request' };
    }
    const inrAmount = diamonds * DIAMOND_TO_INR_RATE;
    if (inrAmount < MIN_WITHDRAWAL_INR) {
      return { success: false, error: `Minimum withdrawal is ₹${MIN_WITHDRAWAL_INR}` };
    }

    const walletRef = db.collection('wallet').doc(userId);
    const requestsColl = db.collection('withdrawalRequests');

    const lastRequestSnap = await requestsColl.where('userId', '==', userId).orderBy('requestedAt', 'desc').limit(1).get();
    const lastDoc = lastRequestSnap.docs[0];
    if (lastDoc) {
      const lastData = lastDoc.data();
      const requestedAt = lastData.requestedAt as number;
      if (Date.now() - requestedAt < WITHDRAWAL_COOLDOWN_MS) {
        return { success: false, error: 'Please wait 24 hours between withdrawals' };
      }
    }

    try {
      const requestId = `wd_${Date.now()}_${userId}`;
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const walletSnap = await tx.get(walletRef);
        const walletData = walletSnap.data();
        const currentDiamonds = (walletData?.diamonds as number) ?? 0;
        if (currentDiamonds < diamonds) {
          throw new Error('INSUFFICIENT_DIAMONDS');
        }
        const now = Date.now();
        tx.set(walletRef, {
          userId,
          diamonds: currentDiamonds - diamonds,
          coins: walletData?.coins ?? 0,
          updatedAt: now,
          lastTransactionId: requestId,
        }, { merge: true });
        tx.set(requestsColl.doc(requestId), {
          requestId,
          userId,
          diamonds,
          inrAmount,
          status: 'pending',
          requestedAt: now,
          upiId: data.upiId ?? null,
        });
      });
      return { success: true, requestId };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'INSUFFICIENT_DIAMONDS') return { success: false, error: 'Insufficient diamonds' };
      functions.logger.warn('requestWithdrawal failed', e);
      return { success: false, error: 'Request failed' };
    }
  }
);

type ProcessWithdrawalData = { requestId: string; action: 'approve' | 'reject' };
export const processWithdrawal = functions.https.onCall(
  async (data: ProcessWithdrawalData, context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    if (!context.auth || !requireAdmin(context)) {
      return { success: false, error: 'Admin only' };
    }
    const { requestId, action } = data ?? {};
    if (!requestId || !action || (action !== 'approve' && action !== 'reject')) {
      return { success: false, error: 'Invalid request' };
    }

    const ref = db.collection('withdrawalRequests').doc(requestId);
    const snap = await ref.get();
    const req = snap.data();
    if (!req || req.status !== 'pending') {
      return { success: false, error: 'Request not found or already processed' };
    }

    const now = Date.now();
    await ref.update({
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: now,
      adminId: context.auth.uid,
    });
    return { success: true };
  }
);

// --- Admin ---
type VerifyAdminPasswordData = { password: string };
export const verifyAdminPassword = functions.https.onCall(
  async (data: VerifyAdminPasswordData, context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    if (!context.auth) {
      return { success: false, error: 'Unauthorized' };
    }
    const password = data?.password;
    if (typeof password !== 'string' || !ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return { success: false, error: 'Invalid password' };
    }
    await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
    return { success: true };
  }
);

type AdminGetUserData = { userId: string };
export const adminGetUser = functions.https.onCall(
  async (data: AdminGetUserData, context: functions.https.CallableContext) => {
    if (!requireAdmin(context)) return { success: false, error: 'Admin only' };
    const userId = data?.userId;
    if (!userId || typeof userId !== 'string') return { success: false, error: 'Missing userId' };
    const [userSnap, walletSnap, agencySnap] = await Promise.all([
      admin.auth().getUser(userId).catch(() => null),
      db.collection('wallet').doc(userId).get(),
      db.collection('agency').doc(userId).get(),
    ]);
    const userRecord = userSnap ? { uid: userSnap.uid, email: userSnap.email, phoneNumber: userSnap.phoneNumber } : null;
    const wallet = walletSnap.exists ? walletSnap.data() : null;
    const agency = agencySnap.exists ? agencySnap.data() : null;
    return { success: true, user: userRecord, wallet, agency };
  }
);

export const adminListWithdrawalRequests = functions.https.onCall(
  async (_data: unknown, context: functions.https.CallableContext) => {
    if (!requireAdmin(context)) return { success: false, error: 'Admin only' };
    const snap = await db.collection('withdrawalRequests').orderBy('requestedAt', 'desc').limit(100).get();
    const list = snap.docs.map((d: admin.firestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));
    return { success: true, list };
  }
);

export const adminListGifts = functions.https.onCall(
  async (_data: unknown, context: functions.https.CallableContext) => {
    if (!requireAdmin(context)) return { success: false, error: 'Admin only' };
    return { success: true, catalog: GIFT_CATALOG, packs: COIN_PACKS };
  }
);

// --- Weekly Contest ---
function getWeekKey(): string {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1);
  start.setUTCHours(0, 0, 0, 0);
  const y = start.getUTCFullYear();
  const w = Math.ceil((start.getTime() - new Date(y, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${y}-W${String(w).padStart(2, '0')}`;
}

type TickHostMinuteData = { roomId: string; userId: string };
export const tickHostMinute = functions.https.onCall(
  async (data: TickHostMinuteData, context: functions.https.CallableContext): Promise<{ success: true } | { success: false; error: string }> => {
    if (!context.auth || context.auth.uid !== data?.userId) {
      return { success: false, error: 'Unauthorized' };
    }
    const { roomId, userId } = data ?? {};
    if (!roomId || !userId) return { success: false, error: 'Missing roomId or userId' };

    const roomSnap = await db.collection('rooms').doc(roomId).get();
    const roomData = roomSnap.data();
    const hostUserId = roomData?.hostUserId as string | undefined;
    if (hostUserId !== userId) {
      return { success: false, error: 'Not the host' };
    }

    const weekKey = getWeekKey();
    const docId = `${userId}_${weekKey}`;
    const ref = db.collection('hostActivity').doc(docId);
    await ref.set(
      {
        userId,
        weekKey,
        minutes: admin.firestore.FieldValue.increment(1),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return { success: true };
  }
);

const CONTEST_TOP_N = 10;
const CONTEST_REWARD_DIAMONDS = [500, 300, 200, 100, 100, 50, 50, 50, 50, 50];

type DistributeContestRewardsData = { weekKey?: string };
export const distributeContestRewards = functions.https.onCall(
  async (data: DistributeContestRewardsData, context: functions.https.CallableContext): Promise<{ success: true; distributed: number } | { success: false; error: string }> => {
    if (!requireAdmin(context)) {
      return { success: false, error: 'Admin only' };
    }
    const weekKey = (data?.weekKey as string) || getWeekKey();
    const snap = await db.collection('hostActivity').where('weekKey', '==', weekKey).orderBy('minutes', 'desc').limit(CONTEST_TOP_N).get();
    if (snap.empty) {
      return { success: true, distributed: 0 };
    }

    const winners = snap.docs.map((d: admin.firestore.QueryDocumentSnapshot) => d.data() as { userId: string; minutes: number });
    const walletColl = db.collection('wallet');
    const now = Date.now();
    for (let i = 0; i < winners.length && i < CONTEST_REWARD_DIAMONDS.length; i++) {
      const reward = CONTEST_REWARD_DIAMONDS[i];
      const userId = winners[i].userId;
      const ref = walletColl.doc(userId);
      const walletSnap = await ref.get();
      const current = (walletSnap.data()?.diamonds as number) ?? 0;
      await ref.set(
        { userId, diamonds: current + reward, updatedAt: now, lastTransactionId: `contest_${weekKey}_${i}` },
        { merge: true }
      );
    }
    await db.collection('contestRewards').doc(weekKey).set({
      weekKey,
      distributedAt: now,
      adminId: context.auth?.uid,
      winnerCount: winners.length,
    }, { merge: true });
    return { success: true, distributed: winners.length };
  }
);
