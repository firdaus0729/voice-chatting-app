import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type Props = {
  level: number;
  compact?: boolean;
};

const VIP_COLORS: string[] = [
  colors.border,
  colors.secondary,
  '#4A90D9',
  colors.primary,
  '#E8B923',
  '#FFD700',
];

export const VIPBadge: React.FC<Props> = ({ level, compact }) => {
  const clamped = Math.min(5, Math.max(0, level));
  const bg = VIP_COLORS[clamped] ?? colors.border;

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: bg }]}>
        <Text style={styles.compactText}>VIP{clamped}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>VIP {clamped}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  compact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  compactText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
    fontSize: 10,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  badgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },
});
