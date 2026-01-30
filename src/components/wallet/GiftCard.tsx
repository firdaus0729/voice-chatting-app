import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import type { GiftItem } from '../../services/economyModels';

type Props = {
  gift: GiftItem;
  disabled?: boolean;
  selected?: boolean;
  onPress?: () => void;
};

export const GiftCard: React.FC<Props> = ({ gift, disabled, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <Text style={styles.icon}>{gift.icon}</Text>
      <Text style={styles.name} numberOfLines={1}>{gift.name}</Text>
      <Text style={styles.price}>{gift.price} coins</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '30%',
    minWidth: 90,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardPressed: {
    opacity: 0.9,
  },
  icon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.caption,
    color: colors.primary,
  },
});
