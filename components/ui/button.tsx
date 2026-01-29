import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
} from 'react-native';
import { RoyalColors, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  textStyle?: TextStyle;
}

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: RoyalColors.gold, text: RoyalColors.black },
  secondary: { bg: RoyalColors.purple, text: RoyalColors.text },
  outline: {
    bg: 'transparent',
    text: RoyalColors.gold,
    border: RoyalColors.gold,
  },
  ghost: { bg: 'transparent', text: RoyalColors.gold },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  textStyle,
  style,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1,
          width: fullWidth ? '100%' : undefined,
          paddingVertical: size === 'sm' ? Spacing.sm : size === 'lg' ? Spacing.lg : Spacing.md,
          paddingHorizontal: size === 'sm' ? Spacing.md : size === 'lg' ? Spacing.xl : Spacing.lg,
        },
        typeof style === 'function' ? (style as (s: { pressed: boolean }) => object)({ pressed }) : style,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      <Text style={[styles.text, { color: v.text }, textStyle]}>
        {loading ? '...' : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
