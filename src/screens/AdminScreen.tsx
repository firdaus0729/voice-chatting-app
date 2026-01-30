import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/common/Card';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { colors, radius, spacing, typography } from '../theme';
import { useAppStore } from '../store/appStore';
import {
  verifyAdminPassword,
  adminGetUser,
  adminListWithdrawalRequests,
  adminListGifts,
  processWithdrawal,
  distributeContestRewards,
} from '../services/economy';
import { getAuth } from '../services/firebase';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

type WithdrawalItem = {
  id: string;
  requestId?: string;
  userId: string;
  diamonds: number;
  inrAmount: number;
  status: string;
  requestedAt: number;
};

export const AdminScreen: React.FC<Props> = ({ navigation }) => {
  const { user, pushToast } = useAppStore();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userIdSearch, setUserIdSearch] = useState('');
  const [userResult, setUserResult] = useState<{ user: unknown; wallet: unknown; agency: unknown } | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [gifts, setGifts] = useState<unknown>(null);
  const [contestLoading, setContestLoading] = useState(false);

  const handleLogin = async () => {
    if (!user || !password.trim()) return;
    setAuthLoading(true);
    try {
      const result = await verifyAdminPassword(password.trim());
      if (result.success) {
        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true);
        }
        setAuthenticated(true);
        setPassword('');
        pushToast({ message: 'Admin access granted', type: 'success' });
      } else {
        pushToast({ message: result.error ?? 'Invalid password', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGetUser = async () => {
    const uid = userIdSearch.trim();
    if (!uid) return;
    setUserLoading(true);
    setUserResult(null);
    try {
      const result = await adminGetUser(uid);
      if (result.success && 'wallet' in result) {
        setUserResult({ user: result.user, wallet: result.wallet, agency: result.agency });
      } else {
        pushToast({ message: (result as { error?: string }).error ?? 'Failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setUserLoading(false);
    }
  };

  const handleListWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const result = await adminListWithdrawalRequests();
      if (result.success && 'list' in result) {
        setWithdrawals((result.list as WithdrawalItem[]) ?? []);
      } else {
        pushToast({ message: (result as { error?: string }).error ?? 'Failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const handleListGifts = async () => {
    try {
      const result = await adminListGifts();
      if (result.success && 'catalog' in result) {
        setGifts({ catalog: result.catalog, packs: result.packs });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    }
  };

  const handleProcessWithdrawal = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const result = await processWithdrawal({ requestId, action });
      if (result.success) {
        pushToast({ message: `Withdrawal ${action}d`, type: 'success' });
        handleListWithdrawals();
      } else {
        pushToast({ message: result.error ?? 'Failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    }
  };

  const handleDistributeContest = async () => {
    setContestLoading(true);
    try {
      const result = await distributeContestRewards();
      if (result.success) {
        pushToast({ message: `Contest rewards distributed: ${result.distributed} winners`, type: 'success' });
      } else {
        pushToast({ message: result.error ?? 'Failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setContestLoading(false);
    }
  };

  if (!user) {
    navigation.replace('Auth');
    return null;
  }

  if (!authenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin</Text>
          <PrimaryButton label="Back" onPress={() => navigation.goBack()} style={styles.backBtn} />
        </View>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Admin password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!authLoading}
          />
          <PrimaryButton
            label={authLoading ? 'Checking…' : 'Unlock'}
            onPress={handleLogin}
            disabled={!password.trim() || authLoading}
            loading={authLoading}
          />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <PrimaryButton label="Back" onPress={() => navigation.goBack()} style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>User Inspector</Text>
          <TextInput
            style={styles.input}
            placeholder="User ID"
            placeholderTextColor={colors.textSecondary}
            value={userIdSearch}
            onChangeText={setUserIdSearch}
          />
          <PrimaryButton label="Fetch" onPress={handleGetUser} disabled={userLoading} loading={userLoading} />
          {userResult && (
            <View style={styles.result}>
              <Text style={styles.pre}>User: {JSON.stringify(userResult.user, null, 2)}</Text>
              <Text style={styles.pre}>Wallet: {JSON.stringify(userResult.wallet, null, 2)}</Text>
              <Text style={styles.pre}>Agency: {JSON.stringify(userResult.agency, null, 2)}</Text>
            </View>
          )}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Withdrawals</Text>
          <PrimaryButton label="Refresh list" onPress={handleListWithdrawals} disabled={withdrawalsLoading} loading={withdrawalsLoading} />
          {withdrawals.length > 0 && (
            <View style={styles.wdList}>
              {withdrawals.map((w) => (
                <View key={w.id} style={styles.wdRow}>
                  <Text style={styles.wdText}>{w.userId} — {w.diamonds} ♦ → ₹{w.inrAmount?.toFixed(0)} — {w.status}</Text>
                  {w.status === 'pending' && (
                    <View style={styles.wdActions}>
                      <PrimaryButton label="Approve" onPress={() => handleProcessWithdrawal(w.id, 'approve')} style={styles.wdBtn} />
                      <PrimaryButton label="Reject" onPress={() => handleProcessWithdrawal(w.id, 'reject')} style={styles.wdBtn} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Gift & Shop</Text>
          <PrimaryButton label="List catalog" onPress={handleListGifts} />
          {gifts && <Text style={styles.pre}>{JSON.stringify(gifts, null, 2)}</Text>}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Weekly Contest</Text>
          <PrimaryButton label="Distribute rewards" onPress={handleDistributeContest} disabled={contestLoading} loading={contestLoading} />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  backBtn: {
    paddingHorizontal: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.md,
  },
  result: {
    marginTop: spacing.md,
  },
  pre: {
    ...typography.caption,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  wdList: {
    marginTop: spacing.md,
  },
  wdRow: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  wdText: {
    ...typography.caption,
  },
  wdActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  wdBtn: {
    paddingHorizontal: spacing.sm,
  },
});
