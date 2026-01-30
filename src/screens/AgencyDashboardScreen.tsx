import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/common/Card';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { AgencyBadge } from '../components/agency/AgencyBadge';
import { OfficialFrame } from '../components/agency/OfficialFrame';
import { colors, radius, spacing, typography } from '../theme';
import { useAppStore } from '../store/appStore';
import { listenToAgency, listenToCommissionHistory } from '../services/agencyFirestore';
import {
  bindAgencyCallable,
  assignRoleCallable,
} from '../services/economy';
import type { AgencyDoc, AgencyRole, CommissionRecordDoc } from '../services/agencyModels';
import { AGENCY_ROLES } from '../services/agencyModels';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Agency'>;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AgencyDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, pushToast } = useAppStore();
  const [agency, setAgency] = useState<AgencyDoc | null>(null);
  const [history, setHistory] = useState<CommissionRecordDoc[]>([]);
  const [bindCode, setBindCode] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState('');
  const [assignRole, setAssignRole] = useState<AgencyRole>('BD');
  const [assignLoading, setAssignLoading] = useState(false);

  const canAssignRole = agency?.role === 'Chief Official';
  const alreadyBound = !!agency?.parentUserId;

  useEffect(() => {
    if (!user) return;
    const unsubAgency = listenToAgency(user.id, setAgency);
    const unsubHistory = listenToCommissionHistory(user.id, setHistory);
    return () => {
      unsubAgency();
      unsubHistory();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      navigation.replace('Auth');
    }
  }, [user, navigation]);

  const handleBind = async () => {
    const code = bindCode.trim().toUpperCase();
    if (!code || !user) return;
    if (alreadyBound) {
      pushToast({ message: 'You are already bound to an agency', type: 'info' });
      return;
    }
    setBindLoading(true);
    try {
      const result = await bindAgencyCallable({ userId: user.id, agencyCode: code });
      if (result.success) {
        pushToast({ message: 'Bound successfully', type: 'success' });
        setBindCode('');
      } else {
        pushToast({ message: result.error ?? 'Bind failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setBindLoading(false);
    }
  };

  const handleAssignRole = async () => {
    const targetId = assignTargetId.trim();
    if (!targetId || !user) return;
    if (!canAssignRole) {
      pushToast({ message: 'You do not have permission to assign roles', type: 'error' });
      return;
    }
    setAssignLoading(true);
    try {
      const result = await assignRoleCallable({
        adminUserId: user.id,
        targetUserId: targetId,
        role: assignRole,
      });
      if (result.success) {
        pushToast({ message: `Role set to ${assignRole}`, type: 'success' });
        setAssignTargetId('');
      } else {
        pushToast({ message: result.error ?? 'Assign failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setAssignLoading(false);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agency</Text>
        <PrimaryButton
          label="Back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile / role card */}
        <Card style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Your profile</Text>
          {agency === null ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : agency ? (
            <OfficialFrame role={agency.role}>
              <View style={styles.profileInner}>
                <AgencyBadge role={agency.role} />
                <View style={styles.statsRow}>
                  <Text style={styles.label}>Agency code</Text>
                  <Text style={styles.code}>{agency.agencyCode}</Text>
                </View>
                {agency.parentUserId ? (
                  <Text style={styles.caption}>Bound to: {agency.parentUserId}</Text>
                ) : (
                  <Text style={styles.caption}>Not bound to an inviter</Text>
                )}
              </View>
            </OfficialFrame>
          ) : (
            <Text style={styles.caption}>No agency profile. It is created on first login.</Text>
          )}
        </Card>

        {/* Team earnings & balance */}
        {agency && (
          <Card style={styles.earningsCard}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <View style={styles.row}>
              <View style={styles.earningsPill}>
                <Text style={styles.earningsLabel}>Commission balance</Text>
                <Text style={styles.earningsValue}>{agency.commissionBalance.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsPill}>
                <Text style={styles.earningsLabel}>Team earnings</Text>
                <Text style={styles.earningsValue}>{agency.teamEarnings.toFixed(2)}</Text>
              </View>
            </View>
            <PrimaryButton
              label="Withdraw diamonds (Wallet)"
              onPress={() => navigation.navigate('Wallet')}
              style={styles.withdrawButton}
            />
          </Card>
        )}

        {/* Bind to agency code */}
        {agency && !alreadyBound && (
          <Card style={styles.bindCard}>
            <Text style={styles.sectionTitle}>Bind to inviter</Text>
            <Text style={styles.helper}>Enter the agency code of your inviter. One-time only.</Text>
            <TextInput
              style={styles.input}
              placeholder="Agency code"
              placeholderTextColor={colors.textSecondary}
              value={bindCode}
              onChangeText={(t) => setBindCode(t.toUpperCase())}
              autoCapitalize="characters"
              editable={!bindLoading}
            />
            <PrimaryButton
              label={bindLoading ? 'Binding…' : 'Bind'}
              onPress={handleBind}
              disabled={!bindCode.trim() || bindLoading}
              loading={bindLoading}
            />
          </Card>
        )}

        {/* Admin: assign role */}
        {agency && canAssignRole && (
          <Card style={styles.assignCard}>
            <Text style={styles.sectionTitle}>Assign role (admin)</Text>
            <Text style={styles.helper}>Target user ID and new role. Only higher roles can assign.</Text>
            <Text style={styles.label}>Target user ID</Text>
            <TextInput
              style={styles.input}
              placeholder="User ID"
              placeholderTextColor={colors.textSecondary}
              value={assignTargetId}
              onChangeText={setAssignTargetId}
              editable={!assignLoading}
            />
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleWrap}>
              {AGENCY_ROLES.map((r) => (
                <Text
                  key={r}
                  style={[styles.roleOption, assignRole === r && styles.roleOptionActive]}
                  onPress={() => setAssignRole(r)}
                >
                  {r}
                </Text>
              ))}
            </View>
            <PrimaryButton
              label={assignLoading ? 'Assigning…' : 'Assign role'}
              onPress={handleAssignRole}
              disabled={!assignTargetId.trim() || assignLoading}
              loading={assignLoading}
            />
          </Card>
        )}

        {/* Historical earnings */}
        {agency && (
          <Card style={styles.historyCard}>
            <Text style={styles.sectionTitle}>Commission history</Text>
            {history.length === 0 ? (
              <Text style={styles.caption}>No commission records yet.</Text>
            ) : (
              history.slice(0, 30).map((rec, i) => (
                <View key={`${rec.fromUserId}-${rec.createdAt}-${i}`} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historySource}>Recharge from {rec.fromUserId}</Text>
                    <Text style={styles.historyDate}>{formatDate(rec.createdAt)}</Text>
                  </View>
                  <Text style={styles.historyAmount}>+{rec.commissionAmount.toFixed(2)}</Text>
                </View>
              ))
            )}
          </Card>
        )}
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
  backButton: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileInner: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  code: {
    ...typography.h2,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsRow: {
    marginTop: spacing.sm,
  },
  earningsCard: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  earningsPill: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  earningsLabel: {
    ...typography.caption,
  },
  earningsValue: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  withdrawButton: {
    opacity: 0.6,
  },
  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bindCard: {
    marginBottom: spacing.lg,
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
  assignCard: {
    marginBottom: spacing.lg,
  },
  roleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleOption: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  roleOptionActive: {
    color: colors.primary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  historyCard: {},
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyLeft: {},
  historySource: {
    ...typography.caption,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  historyAmount: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
});
