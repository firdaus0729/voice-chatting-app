import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const DURATION_MS = 5000;
const VEHICLE_LOTTIE = 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json';

type Props = {
  onFinish: () => void;
  animationUrl?: string;
};

export const VehicleEntry: React.FC<Props> = ({ onFinish, animationUrl = VEHICLE_LOTTIE }) => {
  useEffect(() => {
    const t = setTimeout(() => onFinish(), DURATION_MS);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(400)}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 800,
  },
  center: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 140,
    height: 140,
  },
});
