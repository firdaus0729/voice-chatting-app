/**
 * Couple (CP) system — bind two users, show connected avatars.
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';

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
 * Bind two users as a couple.
 */
export async function bindCouple(user1Uid: string, user2Uid: string): Promise<void> {
  if (user1Uid === user2Uid) {
    throw new Error('Cannot bind user to themselves');
  }

  // Check if either user is already bonded
  const user1Snap = await getDoc(userRef(user1Uid));
  const user2Snap = await getDoc(userRef(user2Uid));

  if (!user1Snap.exists() || !user2Snap.exists()) {
    throw new Error('One or both users not found');
  }

  const user1Couple = user1Snap.data().couple?.partnerUid;
  const user2Couple = user2Snap.data().couple?.partnerUid;

  if (user1Couple || user2Couple) {
    throw new Error('One or both users are already bonded');
  }

  const now = serverTimestamp();

  // Bind both users
  await updateDoc(userRef(user1Uid), {
    'couple.partnerUid': user2Uid,
    'couple.bondedAt': now,
    'profile.updatedAt': now,
  });

  await updateDoc(userRef(user2Uid), {
    'couple.partnerUid': user1Uid,
    'couple.bondedAt': now,
    'profile.updatedAt': now,
  });
}

/**
 * Unbind couple.
 */
export async function unbindCouple(user1Uid: string, user2Uid: string): Promise<void> {
  const user1Snap = await getDoc(userRef(user1Uid));
  const user2Snap = await getDoc(userRef(user2Uid));

  if (!user1Snap.exists() || !user2Snap.exists()) {
    throw new Error('One or both users not found');
  }

  const user1Partner = user1Snap.data().couple?.partnerUid;
  const user2Partner = user2Snap.data().couple?.partnerUid;

  if (user1Partner !== user2Uid || user2Partner !== user1Uid) {
    throw new Error('Users are not bonded');
  }

  const now = serverTimestamp();

  await updateDoc(userRef(user1Uid), {
    'couple.partnerUid': null,
    'couple.bondedAt': null,
    'profile.updatedAt': now,
  });

  await updateDoc(userRef(user2Uid), {
    'couple.partnerUid': null,
    'couple.bondedAt': null,
    'profile.updatedAt': now,
  });
}
