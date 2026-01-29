/**
 * Toast notification component.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { RoyalColors, Spacing } from '@/constants/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onHide }: ToastProps) {
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Show animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide animation
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const backgroundColor = {
    success: RoyalColors.green,
    error: RoyalColors.error,
    info: RoyalColors.purple,
    warning: RoyalColors.gold,
  }[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor }]}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10000,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    minWidth: 200,
    maxWidth: '90%',
  },
  message: {
    color: RoyalColors.black,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/**
 * Toast manager hook.
 */
export function useToast() {
  const [toast, setToast] = React.useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  return {
    toast,
    showToast,
    hideToast: () => setToast(null),
  };
}
