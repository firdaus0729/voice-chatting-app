"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeContestRewards = exports.tickHostMinute = exports.adminListGifts = exports.adminListWithdrawalRequests = exports.adminGetUser = exports.verifyAdminPassword = exports.processWithdrawal = exports.requestWithdrawal = exports.verifyRechargePayment = exports.createRechargeOrder = exports.recordRecharge = exports.assignRole = exports.bindAgency = exports.createAgency = exports.addTreasureContribution = exports.sendGift = exports.createWallet = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
/** 60% of spent coins become receiver diamonds */
const DIAMOND_RATE = 0.6;
/** Max gifts per sender per minute (spam prevention) */
const MAX_GIFTS_PER_MINUTE = 10;
/** Gift catalog (must match client). Server validates giftId and price. */
const GIFT_CATALOG = {
    rose: { price: 10 },
    heart: { price: 50 },
    crown: { price: 100 },
    diamond: { price: 200 },
    rocket: { price: 500 },
};
const INITIAL_COINS = 1000;
/** Create wallet with initial balance if it doesn't exist. Call after signup. */
exports.createWallet = functions.https.onCall(async (data, _context) => {
    const userId = data === null || data === void 0 ? void 0 : data.userId;
    if (!userId || typeof userId !== 'string') {
        return { success: false, error: 'Missing userId' };
    }
    const walletRef = db.collection('wallet').doc(userId);
    try {
        await db.runTransaction(async (tx) => {
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
    }
    catch (e) {
        functions.logger.warn('createWallet failed', e);
        return { success: false, error: 'Failed to create wallet' };
    }
});
exports.sendGift = functions.https.onCall(async (data, _context) => {
    const { senderId, receiverId, giftId } = data !== null && data !== void 0 ? data : {};
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
        await db.runTransaction(async (tx) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const senderRef = walletColl.doc(senderId);
            const receiverRef = walletColl.doc(receiverId);
            const [senderSnap, receiverSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef)]);
            const senderCoins = (_b = (_a = senderSnap.data()) === null || _a === void 0 ? void 0 : _a.coins) !== null && _b !== void 0 ? _b : 0;
            const receiverDiamonds = (_d = (_c = receiverSnap.data()) === null || _c === void 0 ? void 0 : _c.diamonds) !== null && _d !== void 0 ? _d : 0;
            if (senderCoins < price) {
                throw new Error('INSUFFICIENT_COINS');
            }
            const oneMinuteAgo = Date.now() - 60 * 1000;
            const recentGiftsSnap = await tx.get(transactionsColl.where('senderId', '==', senderId).where('createdAt', '>=', oneMinuteAgo));
            if (recentGiftsSnap.size >= MAX_GIFTS_PER_MINUTE) {
                throw new Error('RATE_LIMIT');
            }
            const now = Date.now();
            const newSenderCoins = senderCoins - price;
            const newReceiverDiamonds = receiverDiamonds + diamondCredit;
            tx.set(senderRef, {
                userId: senderId,
                coins: newSenderCoins,
                diamonds: (_f = (_e = senderSnap.data()) === null || _e === void 0 ? void 0 : _e.diamonds) !== null && _f !== void 0 ? _f : 0,
                updatedAt: now,
                lastTransactionId: transactionId,
            }, { merge: true });
            tx.set(receiverRef, {
                userId: receiverId,
                coins: (_h = (_g = receiverSnap.data()) === null || _g === void 0 ? void 0 : _g.coins) !== null && _h !== void 0 ? _h : 0,
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
    }
    catch (e) {
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
});
// --- Treasure box (does not modify sendGift or wallet gift logic) ---
const TREASURE_THRESHOLDS = [12000, 50000, 150000];
const TREASURE_REWARD_DIAMONDS = 500;
/** Add gift to room treasure progress. Validates transaction; when threshold reached, picks winner and pays reward. */
exports.addTreasureContribution = functions.https.onCall(async (data, _context) => {
    const { roomId, userId, transactionId } = data !== null && data !== void 0 ? data : {};
    if (!roomId || !userId || !transactionId || typeof roomId !== 'string' || typeof userId !== 'string' || typeof transactionId !== 'string') {
        return { success: false, error: 'Missing roomId, userId, or transactionId' };
    }
    const transactionsColl = db.collection('transactions');
    const txRef = transactionsColl.doc(transactionId);
    const roomRef = db.collection('rooms').doc(roomId);
    try {
        await db.runTransaction(async (tx) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const [txSnap, roomSnap] = await Promise.all([tx.get(txRef), tx.get(roomRef)]);
            const txData = txSnap.data();
            const roomData = roomSnap.data();
            if (!txData || txData.senderId !== userId || txData.source !== 'gift') {
                throw new Error('INVALID_TRANSACTION');
            }
            if (txData.treasureRoomId) {
                throw new Error('ALREADY_COUNTED');
            }
            const coinAmount = (_a = txData.coinAmount) !== null && _a !== void 0 ? _a : 0;
            if (coinAmount <= 0)
                throw new Error('INVALID_AMOUNT');
            const progress = (_b = roomData === null || roomData === void 0 ? void 0 : roomData.treasureProgress) !== null && _b !== void 0 ? _b : 0;
            const contributions = Object.assign({}, ((roomData === null || roomData === void 0 ? void 0 : roomData.treasureContributions) || {}));
            contributions[userId] = ((_c = contributions[userId]) !== null && _c !== void 0 ? _c : 0) + coinAmount;
            const newProgress = progress + coinAmount;
            const thresholdIndex = Math.min((_d = roomData === null || roomData === void 0 ? void 0 : roomData.treasureThresholdIndex) !== null && _d !== void 0 ? _d : 0, 2);
            const threshold = TREASURE_THRESHOLDS[thresholdIndex];
            tx.update(txRef, { treasureRoomId: roomId });
            tx.set(roomRef, {
                treasureProgress: newProgress,
                treasureContributions: contributions,
                treasureThresholdIndex: thresholdIndex,
            }, { merge: true });
            if (newProgress >= threshold) {
                const entries = Object.entries(contributions);
                if (entries.length === 0)
                    return;
                let total = 0;
                for (const [, v] of entries)
                    total += v;
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
                const winnerDiamonds = (_f = (_e = winnerSnap.data()) === null || _e === void 0 ? void 0 : _e.diamonds) !== null && _f !== void 0 ? _f : 0;
                const now = Date.now();
                tx.set(winnerWalletRef, {
                    userId: winnerId,
                    coins: (_h = (_g = winnerSnap.data()) === null || _g === void 0 ? void 0 : _g.coins) !== null && _h !== void 0 ? _h : 0,
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
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'INVALID_TRANSACTION' || msg === 'INVALID_AMOUNT')
            return { success: false, error: 'Invalid transaction' };
        if (msg === 'ALREADY_COUNTED')
            return { success: false, error: 'Already counted' };
        functions.logger.warn('addTreasureContribution failed', e);
        return { success: false, error: 'Failed' };
    }
});
// --- Agency (hierarchy, binding, commission). Withdrawals disabled. ---
const AGENCY_ROLES = ['BD', 'Admin', 'Super Admin', 'Country Manager', 'Chief Official'];
const DEFAULT_AGENCY_ROLE = 'BD';
const COMMISSION_RATE = 0.02;
/** Only Chief Official can assign roles (admin-only) */
const ADMIN_ROLES = ['Chief Official'];
function generateAgencyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}
/** Create agency profile for user if not exists; assigns unique agency code. */
exports.createAgency = functions.https.onCall(async (data, _context) => {
    const userId = data === null || data === void 0 ? void 0 : data.userId;
    if (!userId || typeof userId !== 'string') {
        return { success: false, error: 'Missing userId' };
    }
    const agencyRef = db.collection('agency').doc(userId);
    const codesColl = db.collection('agencyCodes');
    try {
        let code = null;
        await db.runTransaction(async (tx) => {
            var _a, _b;
            const snap = await tx.get(agencyRef);
            if (snap.exists) {
                code = (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.agencyCode) !== null && _b !== void 0 ? _b : null;
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
            tx.set(codesColl.doc(code), { userId });
        });
        return code ? { success: true, agencyCode: code } : { success: false, error: 'Already exists' };
    }
    catch (e) {
        functions.logger.warn('createAgency failed', e);
        return { success: false, error: 'Failed' };
    }
});
/** One-time bind to inviter by agency code. Prevents re-binding. */
exports.bindAgency = functions.https.onCall(async (data, _context) => {
    const { userId, agencyCode } = data !== null && data !== void 0 ? data : {};
    if (!userId || !agencyCode || typeof userId !== 'string' || typeof agencyCode !== 'string') {
        return { success: false, error: 'Missing userId or agencyCode' };
    }
    const code = String(agencyCode).trim().toUpperCase();
    if (code.length < 4)
        return { success: false, error: 'Invalid code' };
    const agencyRef = db.collection('agency').doc(userId);
    const codeRef = db.collection('agencyCodes').doc(code);
    try {
        await db.runTransaction(async (tx) => {
            const [childSnap, codeSnap] = await Promise.all([tx.get(agencyRef), tx.get(codeRef)]);
            const childData = childSnap.data();
            const codeData = codeSnap.data();
            if (!childData)
                throw new Error('AGENCY_NOT_FOUND');
            if (childData.parentUserId != null)
                throw new Error('ALREADY_BOUND');
            const parentUserId = codeData === null || codeData === void 0 ? void 0 : codeData.userId;
            if (!parentUserId || parentUserId === userId)
                throw new Error('INVALID_CODE');
            const now = Date.now();
            tx.update(agencyRef, {
                parentUserId,
                boundAt: now,
                updatedAt: now,
            });
        });
        return { success: true };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'AGENCY_NOT_FOUND')
            return { success: false, error: 'Create agency first' };
        if (msg === 'ALREADY_BOUND')
            return { success: false, error: 'Already bound to an inviter' };
        if (msg === 'INVALID_CODE')
            return { success: false, error: 'Invalid or your own code' };
        functions.logger.warn('bindAgency failed', e);
        return { success: false, error: 'Failed' };
    }
});
/** Admin-only: assign agency role. Only Chief Official (or configured admins) can call. */
exports.assignRole = functions.https.onCall(async (data, _context) => {
    const { adminUserId, targetUserId, role } = data !== null && data !== void 0 ? data : {};
    if (!adminUserId || !targetUserId || !role || typeof adminUserId !== 'string' || typeof targetUserId !== 'string' || typeof role !== 'string') {
        return { success: false, error: 'Missing adminUserId, targetUserId, or role' };
    }
    if (!AGENCY_ROLES.includes(role)) {
        return { success: false, error: 'Invalid role' };
    }
    const adminRef = db.collection('agency').doc(adminUserId);
    const targetRef = db.collection('agency').doc(targetUserId);
    try {
        const adminSnap = await adminRef.get();
        const adminData = adminSnap.data();
        const adminRole = adminData === null || adminData === void 0 ? void 0 : adminData.role;
        if (!adminRole || !ADMIN_ROLES.includes(adminRole)) {
            return { success: false, error: 'Admin only' };
        }
        const now = Date.now();
        await targetRef.set({
            role,
            updatedAt: now,
        }, { merge: true });
        return { success: true };
    }
    catch (e) {
        functions.logger.warn('assignRole failed', e);
        return { success: false, error: 'Failed' };
    }
});
/** Record a recharge and credit 2% commission to direct parent. Called by backend only (e.g. after payment). */
exports.recordRecharge = functions.https.onCall(async (data, _context) => {
    var _a, _b;
    const { userId, amount } = data !== null && data !== void 0 ? data : {};
    if (!userId || typeof userId !== 'string' || typeof amount !== 'number' || amount <= 0) {
        return { success: false, error: 'Invalid userId or amount' };
    }
    const agencyRef = db.collection('agency').doc(userId);
    try {
        const agencySnap = await agencyRef.get();
        const agencyData = agencySnap.data();
        const parentUserId = agencyData === null || agencyData === void 0 ? void 0 : agencyData.parentUserId;
        if (!parentUserId) {
            return { success: true };
        }
        const commission = Math.floor(amount * COMMISSION_RATE);
        if (commission <= 0)
            return { success: true };
        const parentRef = db.collection('agency').doc(parentUserId);
        const parentSnap = await parentRef.get();
        if (!parentSnap.exists())
            return { success: true };
        const now = Date.now();
        const parentData = parentSnap.data();
        const newBalance = ((_a = parentData.commissionBalance) !== null && _a !== void 0 ? _a : 0) + commission;
        const newTeamEarnings = ((_b = parentData.teamEarnings) !== null && _b !== void 0 ? _b : 0) + commission;
        await parentRef.set({
            commissionBalance: newBalance,
            teamEarnings: newTeamEarnings,
            updatedAt: now,
        }, { merge: true });
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
    }
    catch (e) {
        functions.logger.warn('recordRecharge failed', e);
        return { success: false, error: 'Failed' };
    }
});
// --- Payments (Razorpay), VIP, Withdrawal, Admin, Contest ---
const RAZORPAY_KEY_ID = (_c = (_a = process.env.RAZORPAY_KEY_ID) !== null && _a !== void 0 ? _a : (_b = functions.config().razorpay) === null || _b === void 0 ? void 0 : _b.key_id) !== null && _c !== void 0 ? _c : '';
const RAZORPAY_KEY_SECRET = (_f = (_d = process.env.RAZORPAY_KEY_SECRET) !== null && _d !== void 0 ? _d : (_e = functions.config().razorpay) === null || _e === void 0 ? void 0 : _e.key_secret) !== null && _f !== void 0 ? _f : '';
const ADMIN_PASSWORD = (_j = (_g = process.env.ADMIN_PASSWORD) !== null && _g !== void 0 ? _g : (_h = functions.config().admin) === null || _h === void 0 ? void 0 : _h.password) !== null && _j !== void 0 ? _j : '';
const DIAMOND_TO_INR_RATE = 0.5; // 1 diamond = ₹0.50
const MIN_WITHDRAWAL_INR = 100;
const WITHDRAWAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const COINS_PER_INR = 10; // ₹1 = 10 coins (configurable)
/** VIP tiers by cumulative recharge INR (inclusive). Level 0 = no VIP. */
const VIP_TIERS_INR = [0, 500, 2000, 5000, 10000, 25000];
function getVipLevel(cumulativeRechargeInr) {
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
const COIN_PACKS = [
    { inr: 99, coins: 1000 },
    { inr: 499, coins: 5500 },
    { inr: 999, coins: 12000 },
    { inr: 2499, coins: 32000 },
    { inr: 4999, coins: 70000 },
];
function getCoinsForPack(inr) {
    const pack = COIN_PACKS.find((p) => p.inr === inr);
    return pack ? pack.coins : null;
}
function requireAdmin(context) {
    var _a, _b;
    return ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin) === true;
}
exports.createRechargeOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.uid !== (data === null || data === void 0 ? void 0 : data.userId)) {
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
        const orderId = order.id;
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
    }
    catch (e) {
        functions.logger.warn('createRechargeOrder failed', e);
        return { success: false, error: 'Could not create order' };
    }
});
exports.verifyRechargePayment = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.uid !== (data === null || data === void 0 ? void 0 : data.userId)) {
        return { success: false, error: 'Unauthorized' };
    }
    const { userId, orderId, paymentId, signature } = data !== null && data !== void 0 ? data : {};
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
        const result = await db.runTransaction(async (tx) => {
            var _a, _b, _c, _d;
            const orderSnap = await tx.get(orderRef);
            const orderData = orderSnap.data();
            if (!orderData || orderData.userId !== userId) {
                throw new Error('ORDER_NOT_FOUND');
            }
            if (orderData.status === 'completed') {
                throw new Error('REPLAY');
            }
            const coinsToCredit = orderData.coinsToCredit;
            const amountInr = orderData.amountInr;
            const walletSnap = await tx.get(walletRef);
            const walletData = (_a = walletSnap.data()) !== null && _a !== void 0 ? _a : {};
            const currentCoins = (_b = walletData.coins) !== null && _b !== void 0 ? _b : 0;
            const cumulativeRechargeInr = (_c = walletData.cumulativeRechargeInr) !== null && _c !== void 0 ? _c : 0;
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
                diamonds: (_d = walletData.diamonds) !== null && _d !== void 0 ? _d : 0,
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
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'ORDER_NOT_FOUND')
            return { success: false, error: 'Order not found' };
        if (msg === 'REPLAY')
            return { success: false, error: 'Payment already processed' };
        functions.logger.warn('verifyRechargePayment failed', e);
        return { success: false, error: 'Verification failed' };
    }
});
async function recordRechargeInternal(userId, amountInr) {
    var _a, _b;
    const agencyRef = db.collection('agency').doc(userId);
    const agencySnap = await agencyRef.get();
    const agencyData = agencySnap.data();
    const parentUserId = agencyData === null || agencyData === void 0 ? void 0 : agencyData.parentUserId;
    if (!parentUserId)
        return;
    const commission = Math.floor(amountInr * COMMISSION_RATE);
    if (commission <= 0)
        return;
    const parentRef = db.collection('agency').doc(parentUserId);
    const parentSnap = await parentRef.get();
    if (!parentSnap.exists())
        return;
    const now = Date.now();
    const parentData = parentSnap.data();
    const newBalance = ((_a = parentData.commissionBalance) !== null && _a !== void 0 ? _a : 0) + commission;
    const newTeamEarnings = ((_b = parentData.teamEarnings) !== null && _b !== void 0 ? _b : 0) + commission;
    await parentRef.set({ commissionBalance: newBalance, teamEarnings: newTeamEarnings, updatedAt: now }, { merge: true });
    await parentRef.collection('commissionHistory').doc(`recharge_${now}_${userId}`).set({
        userId: parentUserId,
        fromUserId: userId,
        amount: amountInr,
        commissionAmount: commission,
        source: 'recharge',
        createdAt: now,
    });
}
exports.requestWithdrawal = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.uid !== (data === null || data === void 0 ? void 0 : data.userId)) {
        return { success: false, error: 'Unauthorized' };
    }
    const { userId, diamonds } = data !== null && data !== void 0 ? data : {};
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
        const requestedAt = lastData.requestedAt;
        if (Date.now() - requestedAt < WITHDRAWAL_COOLDOWN_MS) {
            return { success: false, error: 'Please wait 24 hours between withdrawals' };
        }
    }
    try {
        const requestId = `wd_${Date.now()}_${userId}`;
        await db.runTransaction(async (tx) => {
            var _a, _b, _c;
            const walletSnap = await tx.get(walletRef);
            const walletData = walletSnap.data();
            const currentDiamonds = (_a = walletData === null || walletData === void 0 ? void 0 : walletData.diamonds) !== null && _a !== void 0 ? _a : 0;
            if (currentDiamonds < diamonds) {
                throw new Error('INSUFFICIENT_DIAMONDS');
            }
            const now = Date.now();
            tx.set(walletRef, {
                userId,
                diamonds: currentDiamonds - diamonds,
                coins: (_b = walletData === null || walletData === void 0 ? void 0 : walletData.coins) !== null && _b !== void 0 ? _b : 0,
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
                upiId: (_c = data.upiId) !== null && _c !== void 0 ? _c : null,
            });
        });
        return { success: true, requestId };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'INSUFFICIENT_DIAMONDS')
            return { success: false, error: 'Insufficient diamonds' };
        functions.logger.warn('requestWithdrawal failed', e);
        return { success: false, error: 'Request failed' };
    }
});
exports.processWithdrawal = functions.https.onCall(async (data, context) => {
    if (!context.auth || !requireAdmin(context)) {
        return { success: false, error: 'Admin only' };
    }
    const { requestId, action } = data !== null && data !== void 0 ? data : {};
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
});
exports.verifyAdminPassword = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        return { success: false, error: 'Unauthorized' };
    }
    const password = data === null || data === void 0 ? void 0 : data.password;
    if (typeof password !== 'string' || !ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
        return { success: false, error: 'Invalid password' };
    }
    await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
    return { success: true };
});
exports.adminGetUser = functions.https.onCall(async (data, context) => {
    if (!requireAdmin(context))
        return { success: false, error: 'Admin only' };
    const userId = data === null || data === void 0 ? void 0 : data.userId;
    if (!userId || typeof userId !== 'string')
        return { success: false, error: 'Missing userId' };
    const [userSnap, walletSnap, agencySnap] = await Promise.all([
        admin.auth().getUser(userId).catch(() => null),
        db.collection('wallet').doc(userId).get(),
        db.collection('agency').doc(userId).get(),
    ]);
    const userRecord = userSnap ? { uid: userSnap.uid, email: userSnap.email, phoneNumber: userSnap.phoneNumber } : null;
    const wallet = walletSnap.exists ? walletSnap.data() : null;
    const agency = agencySnap.exists ? agencySnap.data() : null;
    return { success: true, user: userRecord, wallet, agency };
});
exports.adminListWithdrawalRequests = functions.https.onCall(async (_data, context) => {
    if (!requireAdmin(context))
        return { success: false, error: 'Admin only' };
    const snap = await db.collection('withdrawalRequests').orderBy('requestedAt', 'desc').limit(100).get();
    const list = snap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
    return { success: true, list };
});
exports.adminListGifts = functions.https.onCall(async (_data, context) => {
    if (!requireAdmin(context))
        return { success: false, error: 'Admin only' };
    return { success: true, catalog: GIFT_CATALOG, packs: COIN_PACKS };
});
// --- Weekly Contest ---
function getWeekKey() {
    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1);
    start.setUTCHours(0, 0, 0, 0);
    const y = start.getUTCFullYear();
    const w = Math.ceil((start.getTime() - new Date(y, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${y}-W${String(w).padStart(2, '0')}`;
}
exports.tickHostMinute = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.uid !== (data === null || data === void 0 ? void 0 : data.userId)) {
        return { success: false, error: 'Unauthorized' };
    }
    const { roomId, userId } = data !== null && data !== void 0 ? data : {};
    if (!roomId || !userId)
        return { success: false, error: 'Missing roomId or userId' };
    const roomSnap = await db.collection('rooms').doc(roomId).get();
    const roomData = roomSnap.data();
    const hostUserId = roomData === null || roomData === void 0 ? void 0 : roomData.hostUserId;
    if (hostUserId !== userId) {
        return { success: false, error: 'Not the host' };
    }
    const weekKey = getWeekKey();
    const docId = `${userId}_${weekKey}`;
    const ref = db.collection('hostActivity').doc(docId);
    await ref.set({
        userId,
        weekKey,
        minutes: admin.firestore.FieldValue.increment(1),
        updatedAt: Date.now(),
    }, { merge: true });
    return { success: true };
});
const CONTEST_TOP_N = 10;
const CONTEST_REWARD_DIAMONDS = [500, 300, 200, 100, 100, 50, 50, 50, 50, 50];
exports.distributeContestRewards = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (!requireAdmin(context)) {
        return { success: false, error: 'Admin only' };
    }
    const weekKey = (data === null || data === void 0 ? void 0 : data.weekKey) || getWeekKey();
    const snap = await db.collection('hostActivity').where('weekKey', '==', weekKey).orderBy('minutes', 'desc').limit(CONTEST_TOP_N).get();
    if (snap.empty) {
        return { success: true, distributed: 0 };
    }
    const winners = snap.docs.map((d) => d.data());
    const walletColl = db.collection('wallet');
    const now = Date.now();
    for (let i = 0; i < winners.length && i < CONTEST_REWARD_DIAMONDS.length; i++) {
        const reward = CONTEST_REWARD_DIAMONDS[i];
        const userId = winners[i].userId;
        const ref = walletColl.doc(userId);
        const walletSnap = await ref.get();
        const current = (_b = (_a = walletSnap.data()) === null || _a === void 0 ? void 0 : _a.diamonds) !== null && _b !== void 0 ? _b : 0;
        await ref.set({ userId, diamonds: current + reward, updatedAt: now, lastTransactionId: `contest_${weekKey}_${i}` }, { merge: true });
    }
    await db.collection('contestRewards').doc(weekKey).set({
        weekKey,
        distributedAt: now,
        adminId: (_c = context.auth) === null || _c === void 0 ? void 0 : _c.uid,
        winnerCount: winners.length,
    }, { merge: true });
    return { success: true, distributed: winners.length };
});
//# sourceMappingURL=index.js.map