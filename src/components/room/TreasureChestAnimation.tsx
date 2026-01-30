import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, spacing, typography } from '../../theme';

type Props = {
  winnerDisplayName: string;
  onFinish: () => void;
  durationMs?: number;
};

const CHEST_LOTTIE = 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json';

export const TreasureChestAnimation: React.FC<Props> = ({ winnerDisplayName, onFinish, durationMs = 4000 }) => {
  useEffect(() => {
    const t = setTimeout(() => onFinish(), durationMs);
    return () => clearTimeout(t);
  }, [onFinish, durationMs]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
      pointerEvents="none"
    >
      <View style={styles.center}>
        <LottieView
          source={{ uri: CHEST_LOTTIE }}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
        <Text style={styles.winner}>Lucky winner: {winnerDisplayName}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  center: {
    alignItems: 'center',
  },
  lottie: {
    width: 140,
    height: 140,
  },
  winner: {
    ...typography.h2,
    color: colors.primary,
    marginTop: spacing.md,
  },
});
