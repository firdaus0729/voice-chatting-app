/**
 * Economy models: gift catalog, transaction types.
 * Server validates and applies changes via Cloud Functions.
 */

export type GiftItem = {
  id: string;
  name: string;
  price: number;
  icon: string;
  animationUrl: string;
};

/** Catalog (must match server GIFT_CATALOG keys and prices). */
export const GIFT_CATALOG: GiftItem[] = [
  { id: 'rose', name: 'Rose', price: 10, icon: '🌹', animationUrl: 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json' },
  { id: 'heart', name: 'Heart', price: 50, icon: '❤️', animationUrl: 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json' },
  { id: 'crown', name: 'Crown', price: 100, icon: '👑', animationUrl: 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json' },
  { id: 'diamond', name: 'Diamond', price: 200, icon: '💎', animationUrl: 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json' },
  { id: 'rocket', name: 'Rocket', price: 500, icon: '🚀', animationUrl: 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json' },
];

export type TransactionDoc = {
  transactionId: string;
  senderId: string;
  receiverId: string;
  giftId: string;
  coinAmount: number;
  diamondAmount: number;
  createdAt: number;
  source: 'gift';
};

export type SendGiftParams = {
  senderId: string;
  receiverId: string;
  giftId: string;
};

export type SendGiftResult = { success: true; transactionId: string } | { success: false; error: string };
