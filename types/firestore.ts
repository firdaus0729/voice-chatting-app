/**
 * Firestore collection & document schemas.
 * Use these types for reads/writes via the Firebase service abstraction.
 */

import type { Timestamp } from 'firebase/firestore';
import type { AgencyRole } from './user';

// -----------------------------------------------------------------------------
// USERS
// -----------------------------------------------------------------------------

export interface FirestoreUserProfile {
  uid: string;
  loginType: 'phone' | 'google' | 'email' | 'apple' | 'guest';
  phone: string | null;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  authProvider: 'phone' | 'google'; // Legacy field
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
}

export interface FirestoreUserEconomy {
  coins: number;
  diamonds: number;
  lifetimeRecharge: number;
}

export interface FirestoreUserVIP {
  level: number;
  cumulativeRecharge: number;
}

export interface FirestoreUserAgency {
  role: AgencyRole;
  agencyCode: string | null;
  parentUid: string | null;
  commissionEarned: number;
}

export interface FirestoreUserInventory {
  frameIds: string[];
  vehicleIds: string[];
  entryCardIds: string[];
  ringIds: string[];
}

export interface FirestoreUserCouple {
  partnerUid: string | null;
  bondedAt: Timestamp | null;
}

/** Single Firestore document: users/{uid} */
export interface FirestoreUserDoc {
  profile: FirestoreUserProfile;
  economy: FirestoreUserEconomy;
  vip: FirestoreUserVIP;
  agency: FirestoreUserAgency;
  inventory: FirestoreUserInventory;
  couple: FirestoreUserCouple;
}

// -----------------------------------------------------------------------------
// VOICE ROOMS
// -----------------------------------------------------------------------------

export type SeatLayout = 10 | 12 | 16 | 20 | 22 | 26;

export interface FirestoreSeat {
  index: number;
  uid: string | null;
  displayName: string | null;
  photoURL: string | null;
  vipLevel: number;
  frameId: string | null;
  vehicleId: string | null;
  isMuted: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
}

export interface FirestoreVoiceRoom {
  id: string;
  hostUid: string;
  hostDisplayName: string;
  hostPhotoURL: string | null;
  title: string;
  seatLayout: SeatLayout;
  seats: FirestoreSeat[];
  bannedUids: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// TREASURE BOX (global event)
// -----------------------------------------------------------------------------

export interface FirestoreTreasureBox {
  totalCoinsGifted: number;
  level1Threshold: number;   // 12_000
  level2Threshold: number;   // 50_000
  level3Threshold: number;   // 150_000
  currentLevel: 0 | 1 | 2 | 3;
  lastResetAt: Timestamp;
}

export interface FirestoreTreasureBoxContribution {
  uid: string;
  displayName: string;
  coinsGifted: number;
}

// -----------------------------------------------------------------------------
// GIFTS
// -----------------------------------------------------------------------------

export interface FirestoreGift {
  id: string;
  name: string;
  coinPrice: number;
  diamondValue: number;
  iconUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// STORE (Frames, Vehicles, Entry Cards, Rings)
// -----------------------------------------------------------------------------

export type StoreCategory = 'frames' | 'vehicles' | 'entry_cards' | 'rings';

export interface FirestoreStoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  coinPrice: number;
  diamondPrice: number;
  iconUrl: string;
  resourceUrl: string; // image, GIF, etc.
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// CONTESTS (Weekly Host Contest)
// -----------------------------------------------------------------------------

export interface FirestoreWeeklyContest {
  id: string;
  weekStart: Timestamp;
  weekEnd: Timestamp;
  hostMinutes: Record<string, number>; // uid -> minutes
  topHostUids: string[];
  rewardsDistributed: boolean;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// WITHDRAWALS
// -----------------------------------------------------------------------------

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface FirestoreWithdrawal {
  id: string;
  uid: string;
  diamonds: number;
  amountInr: number;
  status: WithdrawalStatus;
  createdAt: Timestamp;
  processedAt: Timestamp | null;
  processedBy: string | null;
}
