import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  runTransaction,
  collection,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';

export type UserDoc = {
  id: string;
  phone: string;
  displayName: string;
  vipLevel: number;
  createdAt: number;
};

/** Treasure thresholds (coins) */
export const TREASURE_THRESHOLDS = [12_000, 50_000, 150_000] as const;

export type RoomDoc = {
  id: string;
  hostUserId: string;
  title: string;
  createdAt: number;
  /** Agora uid per userId for volume mapping */
  voiceMembers?: Record<string, number>;
  /** Treasure box: progress this cycle */
  treasureProgress?: number;
  /** Coins contributed per userId this cycle */
  treasureContributions?: Record<string, number>;
  /** Current threshold index 0,1,2 */
  treasureThresholdIndex?: number;
  /** Last winner userId (when box opened) */
  lastTreasureWinnerId?: string | null;
  lastTreasureAt?: number;
};

export type SeatDoc = {
  id: string;
  roomId: string;
  index: number;
  userId?: string | null;
  state: 'empty' | 'occupied' | 'muted' | 'speaking' | 'locked';
};

export type WalletDoc = {
  userId: string;
  coins: number;
  diamonds: number;
  /** Cumulative recharge INR for VIP */
  cumulativeRechargeInr?: number;
  /** VIP level 0–5 from server */
  vipLevel?: number;
  /** Server-set audit */
  updatedAt?: number;
  lastTransactionId?: string;
};

export const DEFAULT_ROOM_ID = 'founder-circle';

export async function upsertUser(user: UserDoc): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, 'users', user.id);
  await setDoc(ref, user, { merge: true });
}

export async function upsertWallet(wallet: WalletDoc): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, 'wallet', wallet.userId);
  await setDoc(ref, wallet, { merge: true });
}

export function listenToUserWallet(
  userId: string,
  onChange: (wallet: WalletDoc | null) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const ref = doc(db, 'wallet', userId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange({ userId, ...snap.data() } as WalletDoc);
    },
    (error) => {
      console.error('Wallet listener error', error);
      onChange(null);
    },
  );
}

export type WithdrawalRequestDoc = {
  requestId: string;
  userId: string;
  diamonds: number;
  inrAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  processedAt?: number;
  adminId?: string;
  upiId?: string | null;
};

export function listenToWithdrawalRequests(
  userId: string,
  onChange: (requests: WithdrawalRequestDoc[]) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const q = query(
    collection(db, 'withdrawalRequests'),
    where('userId', '==', userId),
    orderBy('requestedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ ...d.data(), requestId: d.id } as WithdrawalRequestDoc))
        .sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
      onChange(list);
    },
    (error) => {
      console.error('Withdrawal requests listener error', error);
      onChange([]);
    },
  );
}

export async function getRoom(roomId: string): Promise<RoomDoc | null> {
  const db = getFirestoreDb();
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as RoomDoc;
}

export async function ensureDefaultRoom(hostUserId: string): Promise<RoomDoc> {
  const db = getFirestoreDb();
  const id = DEFAULT_ROOM_ID;
  const room: RoomDoc = {
    id,
    hostUserId,
    title: 'Founder Circle',
    createdAt: Date.now(),
    treasureProgress: 0,
    treasureContributions: {},
    treasureThresholdIndex: 0,
  };
  const ref = doc(db, 'rooms', id);
  await setDoc(ref, room, { merge: true });
  return room;
}

export async function ensureSeatsForRoom(roomId: string): Promise<void> {
  const db = getFirestoreDb();
  const tasks: Promise<void>[] = [];
  for (let index = 0; index < 10; index += 1) {
    const id = `${roomId}_${index + 1}`;
    const seat: SeatDoc = {
      id,
      roomId,
      index,
      userId: null,
      state: 'empty',
    };
    const ref = doc(db, 'seats', id);
    tasks.push(setDoc(ref, seat, { merge: true }));
  }
  await Promise.all(tasks);
}

export function listenToRoom(
  roomId: string,
  onChange: (room: RoomDoc | null) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const ref = doc(db, 'rooms', roomId);
  return onSnapshot(
    ref,
    (snap) => {
      onChange(snap.exists() ? (snap.data() as RoomDoc) : null);
    },
    (error) => {
      console.error('Room listener error', error);
      onChange(null);
    },
  );
}

export function listenToRoomSeats(
  roomId: string,
  onChange: (seats: SeatDoc[]) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const q = query(collection(db, 'seats'), where('roomId', '==', roomId));
  return onSnapshot(
    q,
    (snap) => {
      const seats: SeatDoc[] = snap.docs
        .map((d) => d.data() as SeatDoc)
        .sort((a, b) => a.index - b.index);
      onChange(seats);
    },
    (error) => {
      console.error('Seats listener error', error);
      onChange([]);
    },
  );
}

export async function updateSeatState(id: string, update: Partial<SeatDoc>): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, 'seats', id);
  await setDoc(ref, update, { merge: true });
}

export async function updateRoomVoiceMember(roomId: string, userId: string, agoraUid: number): Promise<void> {
  const db = getFirestoreDb();
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  const data = snap.data() as RoomDoc | undefined;
  const voiceMembers = { ...(data?.voiceMembers ?? {}), [userId]: agoraUid };
  await setDoc(roomRef, { voiceMembers }, { merge: true });
}

export async function getSeatByUserId(roomId: string, userId: string): Promise<SeatDoc | null> {
  const db = getFirestoreDb();
  const q = query(collection(db, 'seats'), where('roomId', '==', roomId));
  const snap = await getDocs(q);
  const doc = snap.docs.find((d) => (d.data() as SeatDoc).userId === userId);
  return doc ? (doc.data() as SeatDoc) : null;
}

/** Take seat with transaction: clear any existing seat for userId, then set target seat. Prevents double-seat. */
export async function takeSeatTransaction(
  roomId: string,
  userId: string,
  targetSeatId: string,
  state: SeatDoc['state'] = 'speaking',
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDb();
  const seatIds = Array.from({ length: 10 }, (_, i) => `${roomId}_${i + 1}`);
  try {
    await runTransaction(db, async (tx) => {
      let myCurrentSeatId: string | null = null;
      let targetData: SeatDoc | null = null;
      for (const id of seatIds) {
        const ref = doc(db, 'seats', id);
        const snap = await tx.get(ref);
        const data = snap.data() as SeatDoc | undefined;
        if (!data) continue;
        if (data.userId === userId) myCurrentSeatId = id;
        if (id === targetSeatId) targetData = data;
      }
      if (!targetData) {
        throw new Error('Seat not found');
      }
      if (targetData.state === 'locked') {
        throw new Error('Seat is locked');
      }
      if (targetData.userId && targetData.userId !== userId) {
        throw new Error('Seat is occupied');
      }
      if (myCurrentSeatId && myCurrentSeatId !== targetSeatId) {
        tx.set(doc(db, 'seats', myCurrentSeatId), { userId: null, state: 'empty' }, { merge: true });
      }
      tx.set(doc(db, 'seats', targetSeatId), { userId, state }, { merge: true });
    });
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Transaction failed';
    return { ok: false, error: message };
  }
}

/** Leave seat: clear userId and state for the given seat. */
export async function leaveSeatTransaction(roomId: string, userId: string, seatId: string): Promise<{ ok: boolean }> {
  const db = getFirestoreDb();
  const seatRef = doc(db, 'seats', seatId);
  const snap = await getDoc(seatRef);
  const data = snap.data() as SeatDoc | undefined;
  if (!data || data.userId !== userId) {
    return { ok: true };
  }
  await setDoc(seatRef, { userId: null, state: 'empty' }, { merge: true });
  return { ok: true };
}

