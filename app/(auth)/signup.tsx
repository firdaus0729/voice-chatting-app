import { useState, useEffect } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoyalColors, Spacing } from '@/constants/theme';
import { signUpWithEmailPassword } from '@/services/firebase/auth';
import { authService } from '@/features/auth';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)' as any);
  }, [isAuthenticated]);

  const handleSignUp = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user: fbUser } = await signUpWithEmailPassword(
        email.trim(),
        password,
        displayName.trim()
      );
      // Load user into store (this will create Firestore profile if needed)
      await authService.loadUserIntoStore(fbUser);
      // Navigation happens automatically via useEffect when isAuthenticated changes
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      let msg = 'Sign up failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg =
          'Email/Password sign-in is disabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method → Email/Password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address. Please check and try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the royal voice community</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Display Name</Text>
            <Input
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setError(null);
              }}
              placeholder="Your display name"
              autoCapitalize="words"
              containerStyle={styles.inputContainer}
              error={!!error}
            />
            <Text style={styles.label}>Email</Text>
            <Input
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              containerStyle={styles.inputContainer}
              error={!!error}
            />
            <Text style={styles.label}>Password</Text>
            <Input
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              containerStyle={styles.inputContainer}
              error={!!error}
            />
            <Text style={styles.label}>Confirm Password</Text>
            <Input
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setError(null);
              }}
              placeholder="Re-enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              containerStyle={styles.inputContainer}
              error={!!error}
            />
            <Button
              title="Create Account"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleSignUp}
              style={styles.button}
            />
            <Button
              title="Back to Sign In"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => router.back()}
              style={styles.button}
            />
            {error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText} numberOfLines={4}>{error}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoyalColors.background,
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.xl,
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
  form: {
    gap: Spacing.sm,
  },
  label: {
    color: RoyalColors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    marginTop: Spacing.xs,
  },
  inputContainer: {
    marginBottom: 4,
  },
  button: {
    marginTop: Spacing.sm,
  },
  errorWrap: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  errorText: {
    color: RoyalColors.error,
    fontSize: 14,
  },
});
