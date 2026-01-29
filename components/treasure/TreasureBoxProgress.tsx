/**
 * Treasure Box progress bar and chest animation.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { RoyalColors, Spacing } from '@/constants/theme';
import {
  TREASURE_LEVEL_1,
  TREASURE_LEVEL_2,
  TREASURE_LEVEL_3,
} from '@/constants/economy';
import { getTreasureBox } from '@/features/gifts/services/giftService';
import type { FirestoreTreasureBox } from '@/types/firestore';

interface TreasureBoxProgressProps {
  roomId?: string;
}

export function TreasureBoxProgress({ roomId }: TreasureBoxProgressProps) {
  const [treasureBox, setTreasureBox] = useState<FirestoreTreasureBox | null>(null);
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const chestScaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadTreasureBox = async () => {
      const box = await getTreasureBox();
      setTreasureBox(box);
    };
    loadTreasureBox();
    const interval = setInterval(loadTreasureBox, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!treasureBox) return;

    const current = treasureBox.totalCoinsGifted ?? 0;
    let target = 0;
    let max = TREASURE_LEVEL_1;

    if (treasureBox.currentLevel === 0) {
      target = Math.min(current / TREASURE_LEVEL_1, 1);
      max = TREASURE_LEVEL_1;
    } else if (treasureBox.currentLevel === 1) {
      target = Math.min((current - TREASURE_LEVEL_1) / (TREASURE_LEVEL_2 - TREASURE_LEVEL_1), 1);
      max = TREASURE_LEVEL_2;
    } else if (treasureBox.currentLevel === 2) {
      target = Math.min((current - TREASURE_LEVEL_2) / (TREASURE_LEVEL_3 - TREASURE_LEVEL_2), 1);
      max = TREASURE_LEVEL_3;
    } else {
      target = 1;
    }

    Animated.timing(progressAnim, {
      toValue: target,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Chest animation when level completes
    if (target >= 1 && treasureBox.currentLevel < 3) {
      Animated.sequence([
        Animated.timing(chestScaleAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(chestScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [treasureBox, progressAnim, chestScaleAnim]);

  if (!treasureBox) return null;

  const current = treasureBox.totalCoinsGifted ?? 0;
  const level = treasureBox.currentLevel;
  const levelLabels = ['Level 1', 'Level 2', 'Level 3', 'Complete'];
  const levelThresholds = [TREASURE_LEVEL_1, TREASURE_LEVEL_2, TREASURE_LEVEL_3];

  // Determine current level label and threshold
  const levelLabel = levelLabels[level] ?? 'Complete';
  const currentThreshold = level < levelThresholds.length ? levelThresholds[level] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Treasure Box</Text>
        <Text style={styles.level}>{levelLabel}</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {current.toLocaleString()} / {currentThreshold?.toLocaleString() || '∞'} coins
        </Text>
      </View>
      <Animated.View
        style={[
          styles.chest,
          {
            transform: [{ scale: chestScaleAnim }],
          },
        ]}
      >
        {/* Chest icon placeholder */}
        <View style={styles.chestIcon} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: RoyalColors.blackCard,
    borderRadius: 12,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    color: RoyalColors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  level: {
    color: RoyalColors.textSecondary,
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: RoyalColors.blackElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: RoyalColors.gold,
    borderRadius: 4,
  },
  progressText: {
    color: RoyalColors.textMuted,
    fontSize: 12,
  },
  chest: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  chestIcon: {
    width: 40,
    height: 40,
    backgroundColor: RoyalColors.goldMuted,
    borderRadius: 8,
  },
});
