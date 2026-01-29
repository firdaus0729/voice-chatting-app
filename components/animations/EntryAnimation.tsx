/**
 * Entry animations for voice room seats.
 * - Normal users: fade-in
 * - VIP Level 10: Krishna flute + petals + golden aura
 * - Vehicle entry: GIF animation across screen
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { RoyalColors } from '@/constants/theme';
import { VIP_GOD_MODE_LEVEL } from '@/constants/vip';

const { width, height } = Dimensions.get('window');

interface EntryAnimationProps {
  vipLevel: number;
  vehicleId?: string | null;
  onComplete?: () => void;
}

export function EntryAnimation({ vipLevel, vehicleId, onComplete }: EntryAnimationProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Normal fade-in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, []);

  // VIP Level 10 (God Mode) - Krishna + petals
  if (vipLevel >= VIP_GOD_MODE_LEVEL) {
    return (
      <View style={styles.godModeContainer}>
        {/* Krishna flute background */}
        <View style={styles.krishnaBackground}>
          {/* Placeholder for Krishna Lottie animation */}
          <View style={styles.krishnaPlaceholder} />
        </View>

        {/* Floating avatar with golden aura */}
        <Animated.View
          style={[
            styles.goldenAura,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />

        {/* Flower petals rain (8 seconds) */}
        <View style={styles.petalsContainer}>
          {/* Placeholder for petals Lottie animation */}
          <View style={styles.petalsPlaceholder} />
        </View>
      </View>
    );
  }

  // Vehicle entry animation
  if (vehicleId) {
    return (
      <View style={styles.vehicleContainer}>
        <Animated.View
          style={[
            styles.vehicleAnimation,
            {
              opacity: fadeAnim,
              transform: [
                { translateX: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width, width],
                })},
              ],
            },
          ]}
        >
          {/* Placeholder for vehicle GIF */}
          <View style={styles.vehiclePlaceholder} />
        </Animated.View>
      </View>
    );
  }

  // Normal fade-in
  return (
    <Animated.View
      style={[
        styles.normalEntry,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  normalEntry: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  godModeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  krishnaBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  krishnaPlaceholder: {
    width: width * 0.6,
    height: height * 0.6,
    backgroundColor: RoyalColors.goldMuted,
    alignSelf: 'center',
    marginTop: height * 0.2,
    borderRadius: 20,
  },
  goldenAura: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: RoyalColors.gold,
    alignSelf: 'center',
    top: height * 0.3,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  petalsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  petalsPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  vehicleContainer: {
    position: 'absolute',
    top: height * 0.4,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 999,
  },
  vehicleAnimation: {
    width: 300,
    height: 200,
    alignSelf: 'center',
  },
  vehiclePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: RoyalColors.goldMuted,
    borderRadius: 10,
  },
});
