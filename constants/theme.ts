/**
 * Dark Royal UI Theme — Gold / Black / Purple.
 * Primary palette for production-ready Voice Chat app.
 */

import { Platform } from 'react-native';

export const RoyalColors = {
  // Base
  black: '#0D0D0F',
  blackSoft: '#151518',
  blackCard: '#1A1A1F',
  blackElevated: '#222228',

  // Gold
  gold: '#D4AF37',
  goldLight: '#E8C547',
  goldDark: '#B8962E',
  goldMuted: 'rgba(212, 175, 55, 0.5)',

  // Purple
  purple: '#7C3AED',
  purpleLight: '#8B5CF6',
  purpleDark: '#5B21B6',
  purpleMuted: 'rgba(124, 58, 237, 0.4)',

  // Accents
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Speaking / status
  speaking: '#22C55E',
  speakingGlow: 'rgba(34, 197, 94, 0.5)',
  green: '#22C55E',
  locked: '#EF4444',
  muted: '#6B7280',

  // Text
  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Surfaces
  background: '#0D0D0F',
  surface: '#151518',
  surfaceElevated: '#1A1A1F',
} as const;

export const Colors = {
  light: {
    ...RoyalColors,
    text: '#11181C',
    background: '#F4F4F5',
    tint: RoyalColors.gold,
    icon: '#71717A',
    tabIconDefault: '#71717A',
    tabIconSelected: RoyalColors.gold,
  },
  dark: {
    ...RoyalColors,
    text: RoyalColors.text,
    background: RoyalColors.background,
    tint: RoyalColors.gold,
    icon: RoyalColors.textSecondary,
    tabIconDefault: RoyalColors.textMuted,
    tabIconSelected: RoyalColors.gold,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Spacing scale (pt) */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Border radius */
export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;
