/**
 * Economy service: call Cloud Functions for wallet operations.
 * All gift sends are server-validated and atomic.
 */
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { getFirebaseFunctions } from './firebase';
import type { SendGiftParams, SendGiftResult } from './economyModels';

export async function createWallet(userId: string): Promise<{ success: true } | { success: false; error: string }> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ userId: string }, { success: true } | { success: false; error: string }>(functions, 'createWallet');
  try {
    const result = await callable({ userId });
    const data = result.data;
    if (data?.success === true) return { success: true };
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function sendGift(params: SendGiftParams): Promise<SendGiftResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<SendGiftParams, SendGiftResult>(functions, 'sendGift');
  try {
    const result: HttpsCallableResult<SendGiftResult> = await callable(params);
    const data = result.data;
    if (data?.success === true) {
      return { success: true, transactionId: data.transactionId };
    }
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { success: false, error: message };
  }
}

export type AddTreasureParams = { roomId: string; userId: string; transactionId: string };
export type AddTreasureResult = { success: true } | { success: false; error: string };

export async function addTreasureContribution(params: AddTreasureParams): Promise<AddTreasureResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<AddTreasureParams, AddTreasureResult>(functions, 'addTreasureContribution');
  try {
    const result = await callable(params);
    const data = result.data;
    if (data?.success === true) return { success: true };
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// --- Agency (create, bind, assignRole). Commission/withdraw in CF only. ---
export type CreateAgencyResult = { success: true; agencyCode: string } | { success: false; error: string };
export type BindAgencyParams = { userId: string; agencyCode: string };
export type BindAgencyResult = { success: true } | { success: false; error: string };
export type AssignRoleParams = { adminUserId: string; targetUserId: string; role: string };
export type AssignRoleResult = { success: true } | { success: false; error: string };

export async function createAgencyCallable(userId: string): Promise<CreateAgencyResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ userId: string }, CreateAgencyResult>(functions, 'createAgency');
  try {
    const result = await callable({ userId });
    const data = result.data;
    if (data?.success === true && data?.agencyCode) return { success: true, agencyCode: data.agencyCode };
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function bindAgencyCallable(params: BindAgencyParams): Promise<BindAgencyResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<BindAgencyParams, BindAgencyResult>(functions, 'bindAgency');
  try {
    const result = await callable(params);
    const data = result.data;
    if (data?.success === true) return { success: true };
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function assignRoleCallable(params: AssignRoleParams): Promise<AssignRoleResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<AssignRoleParams, AssignRoleResult>(functions, 'assignRole');
  try {
    const result = await callable(params);
    const data = result.data;
    if (data?.success === true) return { success: true };
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// --- Payments (Razorpay) ---
export type CreateRechargeOrderResult =
  | { success: true; orderId: string; amountPaise: number; keyId: string }
  | { success: false; error: string };
export async function createRechargeOrder(userId: string, amountInr: number): Promise<CreateRechargeOrderResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ userId: string; amountInr: number }, CreateRechargeOrderResult>(functions, 'createRechargeOrder');
  try {
    const result = await callable({ userId, amountInr });
    const data = result.data;
    if (data?.success === true && data?.orderId) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type VerifyRechargePaymentResult = { success: true; coins: number } | { success: false; error: string };
export async function verifyRechargePayment(params: {
  userId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<VerifyRechargePaymentResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<typeof params, VerifyRechargePaymentResult>(functions, 'verifyRechargePayment');
  try {
    const result = await callable(params);
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// --- Withdrawal ---
export type RequestWithdrawalResult = { success: true; requestId: string } | { success: false; error: string };
export async function requestWithdrawal(params: { userId: string; diamonds: number; upiId?: string }): Promise<RequestWithdrawalResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<typeof params, RequestWithdrawalResult>(functions, 'requestWithdrawal');
  try {
    const result = await callable(params);
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type ProcessWithdrawalResult = { success: true } | { success: false; error: string };
export async function processWithdrawal(params: { requestId: string; action: 'approve' | 'reject' }): Promise<ProcessWithdrawalResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<typeof params, ProcessWithdrawalResult>(functions, 'processWithdrawal');
  try {
    const result = await callable(params);
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// --- Admin ---
export type VerifyAdminPasswordResult = { success: true } | { success: false; error: string };
export async function verifyAdminPassword(password: string): Promise<VerifyAdminPasswordResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ password: string }, VerifyAdminPasswordResult>(functions, 'verifyAdminPassword');
  try {
    const result = await callable({ password });
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function adminGetUser(userId: string): Promise<
  | { success: true; user: unknown; wallet: unknown; agency: unknown }
  | { success: false; error: string }
> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ userId: string }, { success: true; user: unknown; wallet: unknown; agency: unknown } | { success: false; error: string }>(
    functions,
    'adminGetUser'
  );
  try {
    const result = await callable({ userId });
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function adminListWithdrawalRequests(): Promise<
  { success: true; list: unknown[] } | { success: false; error: string }
> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<unknown, { success: true; list: unknown[] } | { success: false; error: string }>(
    functions,
    'adminListWithdrawalRequests'
  );
  try {
    const result = await callable({});
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function adminListGifts(): Promise<
  { success: true; catalog: unknown; packs: unknown } | { success: false; error: string }
> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<unknown, { success: true; catalog: unknown; packs: unknown } | { success: false; error: string }>(
    functions,
    'adminListGifts'
  );
  try {
    const result = await callable({});
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// --- Weekly Contest ---
export type TickHostMinuteResult = { success: true } | { success: false; error: string };
export async function tickHostMinute(roomId: string, userId: string): Promise<TickHostMinuteResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ roomId: string; userId: string }, TickHostMinuteResult>(functions, 'tickHostMinute');
  try {
    const result = await callable({ roomId, userId });
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type DistributeContestRewardsResult = { success: true; distributed: number } | { success: false; error: string };
export async function distributeContestRewards(weekKey?: string): Promise<DistributeContestRewardsResult> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ weekKey?: string }, DistributeContestRewardsResult>(functions, 'distributeContestRewards');
  try {
    const result = await callable({ weekKey });
    const data = result.data;
    if (data?.success === true) return data;
    return { success: false, error: (data as { error?: string })?.error ?? 'Unknown error' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
