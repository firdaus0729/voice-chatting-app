import type { ApiResult } from './common';

/** Agency hierarchy roles */
export type AgencyRole =
  | 'chief_official'
  | 'country_manager'
  | 'super_admin'
  | 'admin'
  | 'bd'
  | null;

/** Login type - explicitly passed, never auto-detected */
export type LoginType = 'phone' | 'google' | 'email' | 'apple' | 'guest';

/** Legacy auth provider (for backward compatibility) */
export type AuthProvider = 'phone' | 'google';

export interface UserProfile {
  uid: string;
  loginType: LoginType;
  phone?: string | null;
  email?: string | null;
  displayName: string;
  photoURL?: string | null;
  authProvider: AuthProvider; // Legacy field
  /** Firestore profile doc id if different from uid */
  profileId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserEconomy {
  coins: number;
  diamonds: number;
  lifetimeRecharge: number; // for VIP
}

export interface UserVIP {
  level: number; // 1–10
  cumulativeRecharge: number;
}

export interface UserAgency {
  role: AgencyRole;
  agencyCode: string | null;
  parentUid: string | null;
  commissionEarned: number;
}

export interface UserInventory {
  frameIds: string[];
  vehicleIds: string[];
  entryCardIds: string[];
  ringIds: string[];
}

export interface UserCouple {
  partnerUid: string | null;
  bondedAt: Date | null;
}

/** Full app user (profile + economy + VIP + agency + inventory) */
export interface AppUser extends UserProfile, UserEconomy {
  vip: UserVIP;
  agency: UserAgency;
  inventory: UserInventory;
  couple: UserCouple;
}

/** Minimal user for lists / mentions */
export interface UserSummary {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  vipLevel: number;
  frameId?: string | null;
  vehicleId?: string | null;
}

/** Auth service result */
export interface AuthResult {
  user: UserProfile;
  isNewUser: boolean;
}

export type SignInWithPhoneResult = ApiResult<AuthResult>;
export type SignInWithGoogleResult = ApiResult<AuthResult>;
export type CreateProfileResult = ApiResult<UserProfile>;
