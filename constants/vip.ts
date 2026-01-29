/**
 * VIP system — cumulative recharge (lifetime) thresholds.
 * Auto-upgrade based on lifetime recharge.
 */

export const VIP_LEVELS: Record<number, number> = {
  1: 4_000,
  2: 10_000,
  3: 25_000,
  4: 50_000,
  5: 100_000,
  6: 250_000,
  7: 500_000,
  8: 750_000,
  9: 1_000_000,
  10: 1_000_000, // L10 "God Mode" — same threshold, special perks
};

export const VIP_GOD_MODE_LEVEL = 10;

export function vipLevelFromRecharge(recharge: number): number {
  let level = 0;
  for (const [l, threshold] of Object.entries(VIP_LEVELS)) {
    const lv = Number(l);
    if (recharge >= threshold) level = lv;
  }
  return level;
}
