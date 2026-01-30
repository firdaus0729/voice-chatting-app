import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import type { AgencyRole } from '../../services/agencyModels';

type Props = {
  role: AgencyRole;
  /** Compact for seats; full for profile */
  compact?: boolean;
};

const ROLE_LABELS: Record<AgencyRole, string> = {
  'Chief Official': 'CO',
  'Country Manager': 'CM',
  'Super Admin': 'SA',
  'Admin': 'AD',
  'BD': 'BD',
};

const ROLE_COLORS: Record<AgencyRole, string> = {
  'Chief Official': colors.primary,
  'Country Manager': colors.secondary,
  'Super Admin': '#4A90D9',
  'Admin': '#50C878',
  'BD': colors.border,
};

export const AgencyBadge: React.FC<Props> = ({ role, compact }) => {
  const label = ROLE_LABELS[role] ?? role;
  const bg = ROLE_COLORS[role] ?? colors.border;

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: bg }]}>
        <Text style={styles.compactText}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{label}</Text>
      <Text style={styles.roleName}>{role}</Text>
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
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },
  roleName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 10,
  },
});
