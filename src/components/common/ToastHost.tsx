import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useAppStore } from '../../store/appStore';
import { colors, radius, spacing, typography } from '../../theme';

export const ToastHost: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        removeToast(toast.id);
      }, 2800),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts, removeToast]);

  if (!toasts.length) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {toasts.map((toast) => {
        const bg =
          toast.type === 'success'
            ? colors.success
            : toast.type === 'error'
            ? colors.error
            : colors.surface;
        return (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.springify().damping(20)}
            exiting={FadeOutUp.springify().damping(20)}
            style={[styles.toast, { backgroundColor: bg }]}
          >
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  toast: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
  },
});

