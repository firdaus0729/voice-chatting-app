/**
 * Agency & Hierarchy service — roles, agency codes, commission flow.
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
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import { AGENCY_COMMISSION_RATE } from '@/constants/economy';
import type { AgencyRole } from '@/types/user';

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
 * Bind user to agency code and parent.
 */
export async function bindAgencyCode(
  uid: string,
  agencyCode: string,
  parentUid: string | null,
  role: AgencyRole
): Promise<void> {
  const ref = userRef(uid);
  await updateDoc(ref, {
    'agency.agencyCode': agencyCode,
    'agency.parentUid': parentUid,
    'agency.role': role,
    'profile.updatedAt': serverTimestamp(),
  });
}

/**
 * Process commission flow upward (2% per level).
 * Call this when a user recharges.
 */
export async function processCommissionFlow(
  rechargerUid: string,
  rechargeAmount: number
): Promise<void> {
  let currentUid: string | null = rechargerUid;
  let remainingAmount = rechargeAmount;
  const visitedUids = new Set<string>(); // Prevent circular references
  const maxDepth = 10; // Prevent infinite loops
  let depth = 0;

  // Traverse up the hierarchy
  while (currentUid && remainingAmount > 0 && depth < maxDepth) {
    if (visitedUids.has(currentUid)) {
      // Circular reference detected - break to prevent infinite loop
      console.warn(`Circular agency reference detected for user ${currentUid}`);
      break;
    }
    visitedUids.add(currentUid);

    const userSnap = await getDoc(userRef(currentUid));
    if (!userSnap.exists()) break;

    const userData = userSnap.data();
    const parentUid = userData.agency?.parentUid;

    if (!parentUid) break; // Reached top of hierarchy

    // Calculate commission (2% of remaining amount)
    const commission = remainingAmount * AGENCY_COMMISSION_RATE;

    // Only process if commission is meaningful (>= 0.01)
    if (commission < 0.01) break;

    // Add commission to parent
    await updateDoc(userRef(parentUid), {
      'agency.commissionEarned': increment(commission),
      'profile.updatedAt': serverTimestamp(),
    });

    // Move up the hierarchy
    currentUid = parentUid;
    remainingAmount = commission;
    depth += 1;
  }
}

/**
 * Get team earnings (all users under this agency).
 */
export async function getTeamEarnings(agencyCode: string): Promise<{
  totalCommission: number;
  teamSize: number;
}> {
  const q = query(
    collection(getDb(), USERS_COLLECTION),
    where('agency.agencyCode', '==', agencyCode)
  );
  const snapshot = await getDocs(q);

  let totalCommission = 0;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    totalCommission += data.agency?.commissionEarned ?? 0;
  });

  return {
    totalCommission,
    teamSize: snapshot.size,
  };
}

/**
 * Withdraw agency commission.
 */
export async function withdrawAgencyCommission(uid: string): Promise<void> {
  const userSnap = await getDoc(userRef(uid));
  if (!userSnap.exists()) throw new Error('User not found');

  const commissionEarned = userSnap.data().agency?.commissionEarned ?? 0;
  if (commissionEarned <= 0) {
    throw new Error('No commission to withdraw');
  }

  // Convert commission to diamonds (1:1 for simplicity, adjust as needed)
  await updateDoc(userRef(uid), {
    'economy.diamonds': increment(commissionEarned),
    'agency.commissionEarned': 0,
    'profile.updatedAt': serverTimestamp(),
  });
}
