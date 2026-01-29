/**
 * Centralized permission constants.
 * Map to Expo / native permissions for microphone, etc.
 */

export const PermissionMessages = {
  microphone: 'Voice rooms need microphone access to speak.',
  notifications: 'Enable notifications for room invites and events.',
} as const;

export type PermissionType = keyof typeof PermissionMessages;
