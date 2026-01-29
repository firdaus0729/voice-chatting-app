import { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoyalColors, Spacing } from '@/constants/theme';
import { verifyAdminPassword } from '@/features/admin/services/adminService';

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Enter admin password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = verifyAdminPassword(password.trim());
      if (!isValid) {
        setError('Invalid password');
        return;
      }

      // Navigate to admin dashboard
      router.replace('/(admin)/user-inspector' as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Enter password to access</Text>
        <Input
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          placeholder="Admin password"
          secureTextEntry
          containerStyle={styles.input}
          error={!!error}
        />
        <Button
          title="Access Admin"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleLogin}
          style={styles.button}
        />
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
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
    color: RoyalColors.gold,
    fontSize: 28,
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
