import { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoyalColors, Spacing } from '@/constants/theme';
import { signInWithEmailPassword } from '@/services/firebase/auth';
import { authService } from '@/features/auth';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)' as any);
  }, [isAuthenticated]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user: fbUser } = await signInWithEmailPassword(email.trim(), password);
      await authService.loadUserIntoStore(fbUser);
      // Navigation happens automatically via useEffect when isAuthenticated changes
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      let msg = 'Login failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please sign up first.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address. Please check and try again.';
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
          <View style={styles.logoSection}>
            <View style={styles.logoPlaceholder}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brand}>
              <View style={styles.titleRow} />
            </View>
          </View>
          <View style={styles.form}>
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
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              containerStyle={styles.inputContainer}
              error={!!error}
            />
            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleEmailLogin}
              style={styles.button}
            />
            <Link href={'/(auth)/signup' as any} asChild>
              <Button
                title="Create Account"
                variant="outline"
                size="lg"
                fullWidth
                style={styles.button}
              />
            </Link>
            {error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
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
    justifyContent: 'center',
  },
  content: {
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoPlaceholder: {
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: width * 0.14,
    backgroundColor: RoyalColors.blackCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RoyalColors.goldMuted,
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  brand: {
    marginTop: Spacing.lg,
  },
  titleRow: {
    width: 160,
    height: 24,
    backgroundColor: RoyalColors.goldMuted,
    borderRadius: 4,
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
    alignItems: 'center',
  },
  errorText: {
    color: RoyalColors.error,
    fontSize: 14,
    textAlign: 'center',
  },
});
