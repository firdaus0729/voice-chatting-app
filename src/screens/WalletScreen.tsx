import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/common/Card';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { GiftCard } from '../components/wallet/GiftCard';
import { GiftSendAnimation } from '../components/wallet/GiftSendAnimation';
import { colors, radius, spacing, typography } from '../theme';
import { useAppStore } from '../store/appStore';
import { listenToUserWallet, listenToWithdrawalRequests } from '../services/firestoreModels';
import type { WithdrawalRequestDoc } from '../services/firestoreModels';
import { sendGift, addTreasureContribution, createRechargeOrder, verifyRechargePayment, requestWithdrawal } from '../services/economy';
import { GIFT_CATALOG } from '../services/economyModels';
import { COIN_PACKS_DISPLAY, MIN_WITHDRAWAL_DIAMONDS, DIAMOND_TO_INR_RATE } from '../services/paymentModels';
import { PremiumLoader } from '../components/common/PremiumLoader';
import { VIPBadge } from '../components/wallet/VIPBadge';
import type { RootStackParamList } from '../../App';
import type { GiftItem } from '../services/economyModels';

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

let RazorpayCheckout: { open: (opts: Record<string, unknown>) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }> } | null = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  // Native module not linked (e.g. Expo Go); payments require dev build
}

export const WalletScreen: React.FC<Props> = ({ navigation }) => {
  const { user, wallet, setWallet, pushToast, activeRoomId } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [receiverId, setReceiverId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationUrl, setAnimationUrl] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [withdrawDiamonds, setWithdrawDiamonds] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestDoc[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubWallet = listenToUserWallet(user.id, (doc) => {
      if (doc) {
        setWallet({
          coins: doc.coins,
          diamonds: doc.diamonds,
          vipLevel: doc.vipLevel ?? 0,
          cumulativeRechargeInr: doc.cumulativeRechargeInr,
        });
      }
      setLoading(false);
    });
    const unsubWd = listenToWithdrawalRequests(user.id, setWithdrawalRequests);
    return () => {
      unsubWallet();
      unsubWd();
    };
  }, [user, setWallet]);

  const effectiveReceiverId = (receiverId?.trim() || user?.id) ?? '';
  const canSend =
    !!user &&
    !!selectedGift &&
    !!effectiveReceiverId &&
    wallet.coins >= selectedGift.price &&
    !processing;

  const handleSendGift = async () => {
    if (!canSend || !user || !selectedGift) return;
    setProcessing(true);
    try {
      const result = await sendGift({
        senderId: user.id,
        receiverId: effectiveReceiverId,
        giftId: selectedGift.id,
      });
      if (result.success) {
        setAnimationUrl(selectedGift.animationUrl);
        setShowAnimation(true);
        pushToast({ message: `Gift sent! +${Math.floor(selectedGift.price * 0.6)} diamonds`, type: 'success' });
        if (activeRoomId && result.transactionId) {
          addTreasureContribution({ roomId: activeRoomId, userId: user.id, transactionId: result.transactionId }).catch(() => {});
        }
      } else {
        pushToast({ message: result.error ?? 'Failed to send gift', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error. Try again.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAnimationFinish = () => {
    setShowAnimation(false);
    setAnimationUrl('');
  };

  const handleBuyCoins = async (pack: typeof COIN_PACKS_DISPLAY[0]) => {
    if (!user || purchaseLoading) return;
    setPurchaseLoading(true);
    try {
      const orderResult = await createRechargeOrder(user.id, pack.inr);
      if (!orderResult.success || !orderResult.orderId) {
        pushToast({ message: orderResult.error ?? 'Could not create order', type: 'error' });
        setPurchaseLoading(false);
        return;
      }
      const { orderId, amountPaise, keyId } = orderResult;
      if (!RazorpayCheckout) {
        pushToast({ message: 'Payments require production app build', type: 'info' });
        setPurchaseLoading(false);
        return;
      }
      const payment = await RazorpayCheckout.open({
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        order_id: orderId,
        name: 'Voice Royale',
        description: `${pack.coins} Coins`,
      });
      const verifyResult = await verifyRechargePayment({
        userId: user.id,
        orderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      });
      if (verifyResult.success) {
        pushToast({ message: `+${verifyResult.coins} coins added`, type: 'success' });
      } else {
        pushToast({ message: verifyResult.error ?? 'Verification failed', type: 'error' });
      }
    } catch (e: unknown) {
      if ((e as { code?: number })?.code === 0) {
        // User cancelled
      } else {
        pushToast({ message: e instanceof Error ? e.message : 'Payment failed', type: 'error' });
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const d = parseInt(withdrawDiamonds, 10);
    if (!user || withdrawLoading || isNaN(d) || d < MIN_WITHDRAWAL_DIAMONDS) return;
    if (d > wallet.diamonds) {
      pushToast({ message: 'Insufficient diamonds', type: 'error' });
      return;
    }
    setWithdrawLoading(true);
    try {
      const result = await requestWithdrawal({ userId: user.id, diamonds: d });
      if (result.success) {
        pushToast({ message: 'Withdrawal requested. Admin will process soon.', type: 'success' });
        setWithdrawDiamonds('');
      } else {
        pushToast({ message: result.error ?? 'Request failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: 'Network error', type: 'error' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const vipLevel = wallet.vipLevel ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <PrimaryButton
          label="Back to Room"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Balance</Text>
        {loading ? (
          <PremiumLoader />
        ) : (
          <View style={styles.row}>
            <View style={styles.balancePill}>
              <Text style={styles.balanceLabel}>Coins</Text>
              <Text style={styles.balanceValue}>{wallet.coins}</Text>
            </View>
            <View style={styles.balancePill}>
              <Text style={styles.balanceLabel}>Diamonds</Text>
              <Text style={styles.balanceValue}>{wallet.diamonds}</Text>
            </View>
          </View>
        )}
        <View style={styles.vipRow}>
          <Text style={styles.caption}>VIP </Text>
          <VIPBadge level={vipLevel} />
        </View>
      </Card>
      <Card style={styles.buyCard}>
        <Text style={styles.sectionTitle}>Buy Coins</Text>
        <Text style={styles.helper}>Server-verified Razorpay. Select a pack.</Text>
        <View style={styles.packRow}>
          {COIN_PACKS_DISPLAY.map((pack) => (
            <PrimaryButton
              key={pack.inr}
              label={pack.label}
              onPress={() => handleBuyCoins(pack)}
              disabled={purchaseLoading}
              style={styles.packBtn}
            />
          ))}
        </View>
      </Card>
      <Card style={styles.withdrawCard}>
        <Text style={styles.sectionTitle}>Withdraw</Text>
        <Text style={styles.helper}>Min ₹100 = {MIN_WITHDRAWAL_DIAMONDS} diamonds. 1 diamond = ₹{DIAMOND_TO_INR_RATE}. 24h cooldown.</Text>
        <TextInput
          style={styles.input}
          placeholder={`Diamonds (min ${MIN_WITHDRAWAL_DIAMONDS})`}
          placeholderTextColor={colors.textSecondary}
          value={withdrawDiamonds}
          onChangeText={setWithdrawDiamonds}
          keyboardType="number-pad"
          editable={!withdrawLoading}
        />
        <PrimaryButton
          label={withdrawLoading ? 'Requesting…' : 'Request Withdrawal'}
          onPress={handleWithdraw}
          disabled={withdrawLoading || !withdrawDiamonds.trim() || parseInt(withdrawDiamonds, 10) < MIN_WITHDRAWAL_DIAMONDS || wallet.diamonds < MIN_WITHDRAWAL_DIAMONDS}
          loading={withdrawLoading}
        />
        {withdrawalRequests.length > 0 && (
          <View style={styles.wdList}>
            <Text style={styles.label}>Your requests</Text>
            {withdrawalRequests.slice(0, 5).map((r) => (
              <Text key={r.requestId} style={styles.wdRow}>
                {r.diamonds} ♦ → ₹{r.inrAmount?.toFixed(0)} — {r.status}
              </Text>
            ))}
          </View>
        )}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Send Gift</Text>
        <Text style={styles.helper}>Select a gift. Receiver gets 60% of coin value as diamonds.</Text>
        <Text style={styles.label}>Receiver (blank = send to self)</Text>
        <TextInput
          style={styles.input}
          placeholder="Receiver user ID"
          placeholderTextColor={colors.textSecondary}
          value={receiverId}
          onChangeText={setReceiverId}
          editable={!processing}
        />
        <Text style={styles.label}>Gift</Text>
        <View style={styles.giftGrid}>
          {GIFT_CATALOG.map((item) => (
            <GiftCard
              key={item.id}
              gift={item}
              disabled={processing || wallet.coins < item.price}
              selected={selectedGift?.id === item.id}
              onPress={() => setSelectedGift(item)}
            />
          ))}
        </View>
        {selectedGift && wallet.coins < selectedGift.price && (
          <Text style={styles.insufficient}>Insufficient coins for this gift</Text>
        )}
        <PrimaryButton
          label={
            processing
              ? 'Sending…'
              : !selectedGift
              ? 'Select a gift'
              : wallet.coins < selectedGift.price
              ? 'Insufficient coins'
              : 'Send Gift'
          }
          onPress={handleSendGift}
          disabled={!canSend}
          loading={processing}
          style={styles.sendButton}
        />
      </Card>
      {showAnimation && animationUrl ? (
        <GiftSendAnimation
          animationUrl={animationUrl}
          onFinish={handleAnimationFinish}
          durationMs={2000}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  backButton: {
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  balancePill: {
    flex: 1,
    marginRight: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  balanceLabel: {
    ...typography.caption,
  },
  balanceValue: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  caption: {
    ...typography.caption,
  },
  vipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  helper: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
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
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  insufficient: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  sendButton: {
    marginTop: spacing.sm,
  },
  buyCard: {
    marginBottom: spacing.lg,
  },
  packRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  packBtn: {
    paddingHorizontal: spacing.sm,
  },
  withdrawCard: {
    marginBottom: spacing.lg,
  },
  wdList: {
    marginTop: spacing.md,
  },
  wdRow: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
