import { useState } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoyalColors, Spacing } from '@/constants/theme';
import { requestPhoneOtp, verifyPhoneOtp, getFirebaseAuth } from '@/services';
import { authService } from '@/features/auth';
import { useAuthStore } from '@/store/auth';

type Step = 'phone' | 'otp';

export default function PhoneOtpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string }>();
  const [step, setStep] = useState<Step>(params.phone ? 'otp' : 'phone');
  const [phone, setPhone] = useState(params.phone ?? '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await requestPhoneOtp(`+91${normalized}`);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Enter the OTP you received.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await verifyPhoneOtp(otp.trim());
      if ('error' in result) {
        setError(result.error);
        return;
      }
      useAuthStore.getState().setLoading();
      const auth = getFirebaseAuth();
      const fbUser = auth?.currentUser ?? null;
      if (fbUser) {
        await authService.loadUserIntoStore(fbUser);
        router.replace('/(tabs)' as any);
      } else {
        setError('Signed in but no user. Try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
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
        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Phone number</Text>
              <Input
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(null); }}
                placeholder="+91 9876543210"
                keyboardType="phone-pad"
                maxLength={14}
                containerStyle={styles.inputContainer}
                error={!!error}
              />
              <Button
                title="Send OTP"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleRequestOtp}
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <Input
                value={otp}
                onChangeText={(t) => { setOtp(t); setError(null); }}
                placeholder="6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                containerStyle={styles.inputContainer}
                error={!!error}
              />
              <Button
                title="Verify"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleVerifyOtp}
                style={styles.button}
              />
              <Button
                title="Back"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => { setStep('phone'); setOtp(''); setError(null); }}
                style={styles.button}
              />
            </>
          )}
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.footer}>
          <Text style={styles.hint}>
            On React Native, Firebase Phone Auth needs reCAPTCHA (web) or a backend custom-token
            flow. Use the backend option for production.
          </Text>
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
    paddingBottom: Spacing.xxl,
  },
  form: {
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.sm,
  },
  label: {
    color: RoyalColors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 4,
  },
  button: {
    marginTop: 4,
  },
  errorWrap: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  errorText: {
    color: RoyalColors.error,
    fontSize: 14,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  hint: {
    color: RoyalColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
