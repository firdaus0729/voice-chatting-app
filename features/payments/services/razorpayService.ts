/**
 * Razorpay payment integration — recharge coins.
 */

import { RAZORPAY_KEY_ID } from '@/config/env';
import { addCoins } from '@/features/economy/services/economyService';
import { checkAndUpgradeVIP } from '@/features/vip/services/vipService';
import { processCommissionFlow } from '@/features/agency/services/agencyService';

// Note: Razorpay React Native SDK integration
// For production, use: @razorpay/react-native or razorpay-checkout
// This is a placeholder structure

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (₹100 = 10000 paise)
  currency: string;
  name: string;
  description: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color: string;
  };
}

export interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Initialize Razorpay payment.
 * Returns order details for checkout.
 */
export async function initiateRazorpayPayment(params: {
  amount: number; // in INR
  userId: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
}): Promise<RazorpayOptions> {
  if (!RAZORPAY_KEY_ID) {
    throw new Error('Razorpay key not configured');
  }
  if (params.amount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  if (params.amount > 100000) {
    throw new Error('Maximum payment amount is ₹100,000');
  }

  // In production, create order on your backend first
  // For now, return options for client-side checkout
  return {
    key: RAZORPAY_KEY_ID,
    amount: params.amount * 100, // Convert to paise
    currency: 'INR',
    name: 'Voice Chat App',
    description: `Recharge ${params.amount} INR`,
    prefill: {
      email: params.userEmail,
      contact: params.userPhone,
      name: params.userName,
    },
    theme: {
      color: '#D4AF37', // Gold
    },
  };
}

/**
 * Verify and process payment success.
 * Call this after Razorpay payment succeeds.
 */
export async function processPaymentSuccess(params: {
  userId: string;
  paymentId: string;
  orderId: string;
  signature: string;
  amount: number; // in INR
}): Promise<{ coinsAdded: number; vipUpgraded: boolean }> {
  // In production, verify signature on backend
  // For now, assume verification passed

  if (params.amount <= 0) {
    throw new Error('Invalid payment amount');
  }

  // Calculate coins (1 INR = 100 coins, adjust as needed)
  const coinsPerRupee = 100;
  const coinsToAdd = params.amount * coinsPerRupee;

  // Add coins and update lifetime recharge
  await addCoins(params.userId, coinsToAdd, params.amount);

  // Process agency commission flow
  await processCommissionFlow(params.userId, params.amount);

  // Check VIP upgrade
  const vipResult = await checkAndUpgradeVIP(params.userId);

  return {
    coinsAdded: coinsToAdd,
    vipUpgraded: vipResult.upgraded,
  };
}
