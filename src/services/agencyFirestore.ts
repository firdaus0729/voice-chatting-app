/**
 * Agency Firestore: read-only client. All writes via Cloud Functions.
 */
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import type { AgencyDoc, CommissionRecordDoc } from './agencyModels';

const AGENCY_COLLECTION = 'agency';
const AGENCY_CODES_COLLECTION = 'agencyCodes';
const COMMISSION_HISTORY_COLLECTION = 'commissionHistory';

export function listenToAgency(
  userId: string,
  onChange: (agency: AgencyDoc | null) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const ref = doc(db, AGENCY_COLLECTION, userId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange({ userId: snap.id, ...snap.data() } as AgencyDoc);
    },
    (error) => {
      console.error('Agency listener error', error);
      onChange(null);
    },
  );
}

export async function getAgency(userId: string): Promise<AgencyDoc | null> {
  const db = getFirestoreDb();
  const ref = doc(db, AGENCY_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { userId: snap.id, ...snap.data() } as AgencyDoc;
}

export async function getCommissionHistory(userId: string, limit: number = 50): Promise<CommissionRecordDoc[]> {
  const db = getFirestoreDb();
  const ref = collection(db, AGENCY_COLLECTION, userId, COMMISSION_HISTORY_COLLECTION);
  const snap = await getDocs(ref);
  const list = snap.docs
    .map((d) => d.data() as CommissionRecordDoc)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return list.slice(0, limit);
}

export function listenToCommissionHistory(
  userId: string,
  onChange: (records: CommissionRecordDoc[]) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const ref = collection(db, AGENCY_COLLECTION, userId, COMMISSION_HISTORY_COLLECTION);
  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as CommissionRecordDoc)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      onChange(list);
    },
    (error) => {
      console.error('Commission history listener error', error);
      onChange([]);
    },
  );
}
