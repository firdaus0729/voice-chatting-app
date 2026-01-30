/**
 * App configuration. Replace with your keys for production.
 * For Agora: create a project at console.agora.io and paste the App ID.
 * For Razorpay: use Live Key ID in production (server keeps secret).
 */
export const config = {
  /** Agora RTC App ID. Leave empty to run without voice (UI-only mode). */
  agoraAppId: process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '',
  /** Razorpay Key ID for checkout (public). Secret must be in Cloud Functions only. */
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
} as const;

export const hasAgora = Boolean(config.agoraAppId?.trim());
export const hasRazorpay = Boolean(config.razorpayKeyId?.trim());
