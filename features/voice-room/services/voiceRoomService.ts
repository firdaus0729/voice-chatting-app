import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Firestore as IFirestore,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import type {
  FirestoreSeat,
  FirestoreVoiceRoom,
  SeatLayout,
} from '@/types/firestore';
import { SEAT_LAYOUTS, DEFAULT_SEAT_LAYOUT } from '@/constants/seats';
import type { AppUser } from '@/types/user';

const ROOMS_COLLECTION = 'voice_rooms';

function getDb(): IFirestore {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return db;
}

function roomDoc(id: string) {
  return doc(getDb(), ROOMS_COLLECTION, id);
}

function createEmptySeats(layout: SeatLayout): FirestoreSeat[] {
  const count = layout;
  const seats: FirestoreSeat[] = [];
  for (let i = 0; i < count; i += 1) {
    seats.push({
      index: i,
      uid: null,
      displayName: null,
      photoURL: null,
      vipLevel: 0,
      frameId: null,
      vehicleId: null,
      isMuted: false,
      isLocked: false,
      isSpeaking: false,
    });
  }
  return seats;
}

export async function createVoiceRoom(params: {
  id: string;
  title: string;
  host: AppUser;
  seatLayout?: SeatLayout;
}): Promise<FirestoreVoiceRoom> {
  const layout = params.seatLayout ?? DEFAULT_SEAT_LAYOUT;
  if (!SEAT_LAYOUTS.includes(layout)) {
    throw new Error('Invalid seat layout');
  }
  const now = serverTimestamp();

  const room: FirestoreVoiceRoom = {
    id: params.id,
    hostUid: params.host.uid,
    hostDisplayName: params.host.displayName,
    hostPhotoURL: params.host.photoURL ?? null,
    title: params.title,
    seatLayout: layout,
    seats: createEmptySeats(layout),
    bannedUids: [],
    createdAt: now as any,
    updatedAt: now as any,
  };

  await setDoc(roomDoc(params.id), room);
  return room;
}

export async function getVoiceRoom(roomId: string): Promise<FirestoreVoiceRoom | null> {
  const snap = await getDoc(roomDoc(roomId));
  if (!snap.exists()) return null;
  return snap.data() as FirestoreVoiceRoom;
}

export async function takeSeat(params: {
  roomId: string;
  seatIndex: number;
  user: AppUser;
}): Promise<void> {
  const { roomId, seatIndex, user } = params;
  if (seatIndex < 0) {
    throw new Error('Invalid seat index');
  }

  const ref = roomDoc(roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as FirestoreVoiceRoom;

  if (room.bannedUids.includes(user.uid)) {
    throw new Error('You are banned from this room.');
  }

  const seats = [...room.seats];
  const seat = seats[seatIndex];
  if (!seat || seatIndex >= seats.length) {
    throw new Error('Invalid seat index');
  }
  if (seat.isLocked && room.hostUid !== user.uid) {
    throw new Error('Seat is locked');
  }
  if (seat.uid && seat.uid !== user.uid) {
    throw new Error('Seat already taken');
  }

  // Remove user from any other seat.
  for (let i = 0; i < seats.length; i += 1) {
    if (seats[i].uid === user.uid) {
      seats[i] = { ...seats[i], uid: null, displayName: null, photoURL: null };
    }
  }

  seats[seatIndex] = {
    ...seat,
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL ?? null,
    vipLevel: user.vip.level,
    frameId: user.inventory.frameIds[0] ?? null,
    vehicleId: user.inventory.vehicleIds[0] ?? null,
    isMuted: false,
    isSpeaking: false,
  };

  await updateDoc(ref, {
    seats,
    updatedAt: serverTimestamp(),
  });
}

export async function leaveSeat(params: {
  roomId: string;
  userId: string;
}): Promise<void> {
  const ref = roomDoc(params.roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as FirestoreVoiceRoom;
  const seats = room.seats.map((s) =>
    s.uid === params.userId
      ? { ...s, uid: null, displayName: null, photoURL: null, isSpeaking: false }
      : s
  );
  await updateDoc(ref, { seats, updatedAt: serverTimestamp() });
}

export async function hostUpdateSeatLock(params: {
  roomId: string;
  seatIndex: number;
  locked: boolean;
}): Promise<void> {
  const ref = roomDoc(params.roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as FirestoreVoiceRoom;
  const seats = [...room.seats];
  const seat = seats[params.seatIndex];
  if (!seat) throw new Error('Invalid seat');
  seats[params.seatIndex] = { ...seat, isLocked: params.locked };
  await updateDoc(ref, { seats, updatedAt: serverTimestamp() });
}

export async function hostMuteSeat(params: {
  roomId: string;
  seatIndex: number;
  muted: boolean;
}): Promise<void> {
  const ref = roomDoc(params.roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as FirestoreVoiceRoom;
  const seats = [...room.seats];
  const seat = seats[params.seatIndex];
  if (!seat) throw new Error('Invalid seat');
  seats[params.seatIndex] = { ...seat, isMuted: params.muted };
  await updateDoc(ref, { seats, updatedAt: serverTimestamp() });
}

export async function hostKickFromSeat(params: {
  roomId: string;
  seatIndex: number;
}): Promise<void> {
  const ref = roomDoc(params.roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as FirestoreVoiceRoom;
  const seats = [...room.seats];
  const seat = seats[params.seatIndex];
  if (!seat) throw new Error('Invalid seat');
  seats[params.seatIndex] = {
    ...seat,
    uid: null,
    displayName: null,
    photoURL: null,
    isMuted: false,
    isSpeaking: false,
  };
  await updateDoc(ref, { seats, updatedAt: serverTimestamp() });
}

export async function hostBanUser(params: {
  roomId: string;
  userId: string;
}): Promise<void> {
  const ref = roomDoc(params.roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as FirestoreVoiceRoom;
  if (room.bannedUids.includes(params.userId)) return;
  await updateDoc(ref, {
    bannedUids: [...room.bannedUids, params.userId],
    updatedAt: serverTimestamp(),
  });
}

