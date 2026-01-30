import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme';

const DURATION_MS = 8000;

type Props = {
  displayName: string;
  onFinish: () => void;
};

export const VIPGodModeEntry: React.FC<Props> = ({ displayName, onFinish }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glow = useSharedValue(0.4);
  const float = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 1200 }), withTiming(0.4, { duration: 1200 })),
      -1,
      true
    );
    float.value = withRepeat(
      withSequence(withTiming(8, { duration: 1500 }), withTiming(-8, { duration: 1500 })),
      -1,
      true
    );
    timerRef.current = setTimeout(() => {
      onFinish();
    }, DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onFinish, glow, float]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    shadowOpacity: glow.value,
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(500)}
      style={styles.overlay}
      pointerEvents="none"
    >
      <View style={styles.bg} />
      <Animated.View style={[styles.aura, auraStyle]} />
      <Animated.View style={[styles.avatarWrap, floatStyle]}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{displayName[0]?.toUpperCase() ?? 'V'}</Text>
        </View>
        <Text style={styles.label}>VIP God Mode</Text>
        <Text style={styles.name}>{displayName}</Text>
      </Animated.View>
      {/* Petals: simple dots as lightweight stand-in for petals */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View
          key={i}
          style={[
            styles.petal,
            {
              left: `${15 + (i * 10)}%`,
              top: `${20 + (i % 3) * 25}%`,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  aura: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  avatarWrap: {
    alignItems: 'center',
    zIndex: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    ...typography.h1,
    color: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  petal: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
});
