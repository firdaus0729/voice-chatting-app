import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export type RankEntry = { userId: string; displayName: string; coins: number };

type Props = {
  contributions: Record<string, number>;
  /** Map userId -> displayName (e.g. 'You', 'Guest') */
  displayNames: Record<string, string>;
  currentUserId?: string | null;
};

const MEDALS = ['🥇', '🥈', '🥉'] as const;
const MEDAL_COLORS = [colors.primary, '#C0C0C0', '#CD7F32'] as const;

export const LiveRankings: React.FC<Props> = ({ contributions, displayNames, currentUserId }) => {
  const top3 = useMemo<RankEntry[]>(() => {
    const entries = Object.entries(contributions)
      .map(([userId, coins]) => ({
        userId,
        displayName: displayNames[userId] ?? userId.slice(0, 8),
        coins,
      }))
      .filter((e) => e.coins > 0)
      .sort((a, b) => b.coins - a.coins);
    return entries.slice(0, 3);
  }, [contributions, displayNames]);

  if (top3.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Top contributors</Text>
      {top3.map((entry, i) => (
        <View key={entry.userId} style={[styles.row, { borderLeftColor: MEDAL_COLORS[i] ?? colors.border }]}>
          <Text style={styles.medal}>{MEDALS[i] ?? ''}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {entry.userId === currentUserId ? 'You' : entry.displayName}
          </Text>
          <Text style={styles.coins}>{entry.coins.toLocaleString()} coins</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.caption,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.xs,
  },
  medal: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  name: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
  },
  coins: {
    ...typography.caption,
    color: colors.primary,
  },
});
