import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../../theme';

type Props = {
  animationUrl: string;
  onFinish?: () => void;
  durationMs?: number;
};

export const GiftSendAnimation: React.FC<Props> = ({ animationUrl, onFinish, durationMs = 2000 }) => {
  useEffect(() => {
    const t = setTimeout(() => {
      onFinish?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [onFinish, durationMs]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
      pointerEvents="none"
    >
      <View style={styles.center}>
        <LottieView
          source={{ uri: animationUrl }}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
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
    zIndex: 1000,
  },
  center: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 120,
    height: 120,
  },
});
