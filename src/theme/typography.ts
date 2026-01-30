import { colors } from './colors';

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
} as const;

export type TypographyVariant = keyof typeof typography;