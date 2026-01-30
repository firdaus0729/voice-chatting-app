export const colors = {
  primary: '#D4AF37', // Gold
  secondary: '#6A0DAD', // Royal Purple
  background: '#0B0B0F', // Deep Black
  surface: '#1A1A24',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  error: '#FF4C4C',
  success: '#2ECC71',
  overlay: 'rgba(0,0,0,0.6)',
  border: '#262636',
  chip: '#222235',
  surfaceMuted: '#15151D',
  surfaceAlt: '#15151F',
  primaryDisabled: '#55524A',
} as const;

export type ColorTokens = keyof typeof colors;