/**
 * Agency: roles, binding, commission. All writes via Cloud Functions.
 */

export const AGENCY_ROLES = [
  'BD',
  'Admin',
  'Super Admin',
  'Country Manager',
  'Chief Official',
] as const;

export type AgencyRole = (typeof AGENCY_ROLES)[number];

export type AgencyDoc = {
  userId: string;
  role: AgencyRole;
  /** Unique code others use to bind to this user */
  agencyCode: string;
  /** Inviter (parent); null if not bound */
  parentUserId: string | null;
  boundAt: number | null;
  /** Commission balance (from recharge 2%); withdrawals disabled */
  commissionBalance: number;
  /** Total withdrawn (0 for now) */
  totalWithdrawn: number;
  /** Sum of commission from direct downline recharges (team earnings) */
  teamEarnings: number;
  createdAt: number;
  updatedAt: number;
};

export type CommissionRecordDoc = {
  userId: string;
  /** Who recharged (downline) */
  fromUserId: string;
  amount: number;
  commissionAmount: number;
  source: 'recharge';
  createdAt: number;
};

/** Default role for new agency signups */
export const DEFAULT_AGENCY_ROLE: AgencyRole = 'BD';

/** Commission rate per recharge (2%) */
export const COMMISSION_RATE = 0.02;
