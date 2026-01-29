import { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoyalColors, Spacing } from '@/constants/theme';
import { updateUserProfile } from '@/services/firebase/firestore';
import { useAuthStore } from '@/store/auth';

export default function ProfileCreateScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser, setProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');

  useEffect(() => {
    if (!user) router.replace('/(auth)/login' as any);
  }, [user]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const name = displayName.trim();
    if (!name) {
      setError('Enter a display name.');
      return;
    }
    if (!user) {
      setError('Not signed in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateUserProfile(user.uid, { displayName: name });
      const updated = { ...user, displayName: name };
      setUser(updated as typeof user);
      setProfile(updated as typeof user);
      router.replace('/(tabs)' as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Choose a display name</Text>
        <Input
          value={displayName}
          onChangeText={(t) => { setDisplayName(t); setError(null); }}
          placeholder="Display name"
          autoCapitalize="words"
          containerStyle={styles.input}
          error={!!error}
        />
        <Button
          title="Continue"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleSubmit}
          style={styles.button}
        />
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoyalColors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  content: {
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    color: RoyalColors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: RoyalColors.textSecondary,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.md,
  },
  button: {
    marginTop: Spacing.sm,
  },
  errorWrap: {
    paddingVertical: Spacing.sm,
  },
  errorText: {
    color: RoyalColors.error,
    fontSize: 14,
  },
});
