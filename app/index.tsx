import { RoyalColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/**
 * Auth gate screen — routes users based on authentication state.
 * Authenticated users go to main tabs, unauthenticated go to login.
 */
export default function GateScreen() {
  const { initialized, status } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;
    if (status === 'authenticated') {
      router.replace('/(tabs)' as any);
    } else {
      router.replace('/(auth)/login' as any);
    }
  }, [initialized, status]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={RoyalColors.gold} />
      <Text style={styles.text}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoyalColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  text: {
    color: RoyalColors.textSecondary,
    fontSize: 16,
  },
});
