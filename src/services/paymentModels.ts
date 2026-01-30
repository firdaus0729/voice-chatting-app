/**
 * Payment models: coin packs for display. Server validates and defines actual packs.
 */

export type CoinPack = {
  inr: number;
  coins: number;
  label: string;
};

/** Display packs (must match server COIN_PACKS inr values). */
export const COIN_PACKS_DISPLAY: CoinPack[] = [
  { inr: 99, coins: 1000, label: '₹99 → 1,000 coins' },
  { inr: 499, coins: 5500, label: '₹499 → 5,500 coins' },
  { inr: 999, coins: 12000, label: '₹999 → 12,000 coins' },
  { inr: 2499, coins: 32000, label: '₹2,499 → 32,000 coins' },
  { inr: 4999, coins: 70000, label: '₹4,999 → 70,000 coins' },
];

export const MIN_WITHDRAWAL_INR = 100;
export const DIAMOND_TO_INR_RATE = 0.5;
export const MIN_WITHDRAWAL_DIAMONDS = Math.ceil(MIN_WITHDRAWAL_INR / DIAMOND_TO_INR_RATE);
