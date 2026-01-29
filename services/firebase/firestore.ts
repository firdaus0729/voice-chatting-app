/**
 * Firestore service abstraction — users, profile creation.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';

function tsToDate(t: Timestamp | null | undefined): Date | null {
  if (!t || typeof (t as { toDate?: () => Date }).toDate !== 'function') return null;
  return (t as { toDate: () => Date }).toDate();
}
import { getFirebaseDb } from './index';
import type {
  FirestoreUserDoc,
  FirestoreUserProfile,
  FirestoreUserEconomy,
  FirestoreUserVIP,
  FirestoreUserAgency,
  FirestoreUserInventory,
  FirestoreUserCouple,
} from '@/types/firestore';
import type { AuthProvider, LoginType } from '@/types/user';
import type { AppUser, UserProfile } from '@/types/user';

const USERS_COLLECTION = 'users';

/** Map Firestore user doc to AppUser. */
export function mapUserDocToAppUser(d: FirestoreUserDoc): AppUser {
  const p = d.profile;
  const profile: UserProfile = {
    uid: p.uid,
    loginType: p.loginType,
    phone: p.phone,
    email: p.email,
    displayName: p.displayName,
    photoURL: p.photoURL,
    authProvider: p.authProvider,
    createdAt: tsToDate(p.createdAt) ?? new Date(),
    updatedAt: tsToDate(p.updatedAt) ?? new Date(),
    lastLoginAt: tsToDate(p.lastLoginAt) ?? undefined,
  };
  return {
    ...profile,
    coins: d.economy.coins,
    diamonds: d.economy.diamonds,
    lifetimeRecharge: d.economy.lifetimeRecharge,
    vip: d.vip,
    agency: d.agency,
    inventory: d.inventory,
    couple: {
      partnerUid: d.couple.partnerUid,
      bondedAt: tsToDate(d.couple.bondedAt),
    },
  };
}

function usersRef(uid: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, USERS_COLLECTION, uid);
}

export async function getUserDoc(uid: string): Promise<FirestoreUserDoc | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const snap = await getDoc(usersRef(uid));
  return (snap.exists() ? snap.data() : null) as FirestoreUserDoc | null;
}

export async function createUserProfile(params: {
  uid: string;
  loginType: LoginType;
  phone: string | null;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  authProvider: AuthProvider;
}): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  const now = serverTimestamp() as Timestamp;
  const profile: FirestoreUserProfile = {
    uid: params.uid,
    loginType: params.loginType,
    phone: params.phone ?? null,
    email: params.email ?? null,
    displayName: params.displayName,
    photoURL: params.photoURL ?? null,
    authProvider: params.authProvider,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const economy: FirestoreUserEconomy = {
    coins: 0,
    diamonds: 0,
    lifetimeRecharge: 0,
  };
  const vip: FirestoreUserVIP = {
    level: 0,
    cumulativeRecharge: 0,
  };
  const agency: FirestoreUserAgency = {
    role: null,
    agencyCode: null,
    parentUid: null,
    commissionEarned: 0,
  };
  const inventory: FirestoreUserInventory = {
    frameIds: [],
    vehicleIds: [],
    entryCardIds: [],
    ringIds: [],
  };
  const couple: FirestoreUserCouple = {
    partnerUid: null,
    bondedAt: null,
  };
  const docData: FirestoreUserDoc = {
    profile,
    economy,
    vip,
    agency,
    inventory,
    couple,
  };
  await setDoc(usersRef(params.uid), docData);
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<FirestoreUserProfile, 'displayName' | 'photoURL'>>
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  const ref = usersRef(uid);
  const data: Record<string, unknown> = { 'profile.updatedAt': serverTimestamp() };
  if (updates.displayName !== undefined) data['profile.displayName'] = updates.displayName;
  if (updates.photoURL !== undefined) data['profile.photoURL'] = updates.photoURL;
  await updateDoc(ref, data as { [x: string]: unknown });
}

export async function updateUserLastLogin(uid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  const ref = usersRef(uid);
  await updateDoc(ref, {
    'profile.lastLoginAt': serverTimestamp(),
    'profile.updatedAt': serverTimestamp(),
  });
}
