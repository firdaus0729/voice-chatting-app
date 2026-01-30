import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/common/Card';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../../App';
import { useAppStore } from '../store/appStore';
import { upsertUser } from '../services/firestoreModels';
import { createWallet } from '../services/economy';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, setWallet, pushToast } = useAppStore();

  const canContinue = phone.trim().length >= 6 && displayName.trim().length >= 2;

  const handleContinue = async () => {
    if (!canContinue || loading) {
      return;
    }
    try {
      setLoading(true);
      // MOCK: here you would call Firebase phone auth.
      // For MVP we generate a fake user and persist to Firestore if configured.
      const trimmedPhone = phone.trim();
      const trimmedName = displayName.trim();
      const fakeUserId = `mock_${trimmedPhone}`;

      const user = {
        id: fakeUserId,
        phone: trimmedPhone,
        displayName: trimmedName,
        vipLevel: 1 as const,
        createdAt: Date.now(),
      };
      setUser(user);
      setWallet({ coins: 1000, diamonds: 0 });

      try {
        await upsertUser(user);
        await createWallet(user.id);
      } catch (err) {
        console.log('Firestore/Cloud Functions unavailable or misconfigured, continuing offline.', err);
      }

      pushToast({ message: 'Welcome to Voice Royale', type: 'success' });
      navigation.replace('VoiceRoom');
    } catch (error) {
      console.error('Mock login error', error);
      pushToast({ message: 'Could not sign in. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Voice Royale</Text>
        <Text style={styles.subtitle}>Professional voice rooms for VIP conversations.</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Sign in with phone</Text>
        <TextInput
          placeholder="+1 555 000 000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />
        <TextInput
          placeholder="Display name"
          placeholderTextColor={colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
        />
        <PrimaryButton
          label="Enter Lounge"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={loading}
          style={styles.cta}
        />
        <Text style={styles.helper}>Phone auth is mocked for this MVP.</Text>
      </Card>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.lg,
  },
  cardTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.md,
  },
  cta: {
    marginTop: spacing.sm,
  },
  helper: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

