import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme';
import { TREASURE_THRESHOLDS } from '../../services/firestoreModels';

type Props = {
  progress: number;
  thresholdIndex: number;
};

export const TreasureProgressBar: React.FC<Props> = ({ progress, thresholdIndex }) => {
  const threshold = TREASURE_THRESHOLDS[Math.min(thresholdIndex, 2)];
  const fillRatio = threshold > 0 ? Math.min(1, progress / threshold) : 0;
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(fillRatio, { damping: 18, stiffness: 120 });
  }, [fillRatio, fillWidth]);

  const fillStyle = useAnimatedStyle(() => {
    'worklet';
    return { width: `${Math.max(0, Math.min(1, fillWidth.value)) * 100}%` };
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.label}>
        Treasure {progress.toLocaleString()} / {threshold.toLocaleString()} coins
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
  bar: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
