/**
 * Economy constants: conversion, withdraw, treasure box.
 */

/** Coins → Diamonds: 10,000 Coins = 6,000 Diamonds (60%) */
export const COINS_TO_DIAMONDS_RATE = 0.6;
export const COINS_PER_DIAMOND_BATCH = 10_000;
export const DIAMONDS_PER_BATCH = 6_000;

/** Withdraw: 6,000 Diamonds = ₹20 */
export const DIAMONDS_PER_RUPEE = 300;
export const MIN_WITHDRAW_DIAMONDS = 30_000;
export const MIN_WITHDRAW_INR = 100;

/** Treasure box levels (coins gifted) */
export const TREASURE_LEVEL_1 = 12_000;
export const TREASURE_LEVEL_2 = 50_000;
export const TREASURE_LEVEL_3 = 150_000;

/** Agency commission (2% flows upward per recharge) */
export const AGENCY_COMMISSION_RATE = 0.02;
