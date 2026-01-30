import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/common/Card';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { SeatAvatar, SeatState } from '../components/voice/SeatAvatar';
import { TreasureProgressBar } from '../components/room/TreasureProgressBar';
import { TreasureChestAnimation } from '../components/room/TreasureChestAnimation';
import { LiveRankings } from '../components/room/LiveRankings';
import { VIPGodModeEntry } from '../components/room/VIPGodModeEntry';
import { VehicleEntry } from '../components/room/VehicleEntry';
import { colors, spacing, typography } from '../theme';
import { useAppStore } from '../store/appStore';
import {
  DEFAULT_ROOM_ID,
  ensureDefaultRoom,
  ensureSeatsForRoom,
  listenToRoom,
  listenToRoomSeats,
  leaveSeatTransaction,
  takeSeatTransaction,
  SeatDoc,
  updateSeatState,
  RoomDoc,
} from '../services/firestoreModels';
import { listenToAgency } from '../services/agencyFirestore';
import type { AgencyDoc } from '../services/agencyModels';
import { tickHostMinute } from '../services/economy';
import { config, hasAgora } from '../utils/config';
import { useAgoraVoice } from '../hooks/useAgoraVoice';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceRoom'>;

type Seat = {
  id: string;
  index: number;
  userId?: string | null;
  username?: string;
  state: SeatState;
};

function connectionStateLabel(state: string): string {
  switch (state) {
    case 'connecting':
      return 'Connecting…';
    case 'reconnecting':
      return 'Reconnecting…';
    case 'connected':
      return 'Connected';
    case 'disconnected':
    case 'failed':
      return 'Disconnected';
    default:
      return 'Voice';
  }
}

export const VoiceRoomScreen: React.FC<Props> = ({ navigation }) => {
  const [isHost] = useState(true);
  const [mySeatId, setMySeatId] = useState<string | null>(null);
  const [onlineMode, setOnlineMode] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<Record<string, number>>({});
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [showChest, setShowChest] = useState(false);
  const [chestWinnerName, setChestWinnerName] = useState('');
  const [showVIPEntry, setShowVIPEntry] = useState(false);
  const [showVehicleEntry, setShowVehicleEntry] = useState(false);
  const [agencyByUserId, setAgencyByUserId] = useState<Record<string, AgencyDoc | null>>({});
  const lastTreasureAtRef = useRef<number | null>(null);
  const { user, wallet, activeRoomId, setActiveRoom, pushToast } = useAppStore();

  const [seats, setSeats] = useState<Seat[]>(
    Array.from({ length: 10 }).map((_, index) => ({
      id: `${DEFAULT_ROOM_ID}_${index + 1}`,
      index,
      userId: undefined,
      username: undefined,
      state: 'empty',
    })),
  );

  const agora = useAgoraVoice({
    appId: config.agoraAppId,
    channelId: DEFAULT_ROOM_ID,
    userId: user?.id ?? '',
    leaveOnBackground: true,
  });

  useEffect(() => {
    if (!user) {
      navigation.replace('Auth');
      return;
    }

    let unsubSeats: (() => void) | null = null;
    let unsubRoom: (() => void) | null = null;

    const setup = async () => {
      try {
        await ensureDefaultRoom(user.id);
        await ensureSeatsForRoom(DEFAULT_ROOM_ID);
        setActiveRoom(DEFAULT_ROOM_ID);

        unsubSeats = listenToRoomSeats(DEFAULT_ROOM_ID, (seatDocs: SeatDoc[]) => {
          if (!seatDocs.length) return;
          const mapped: Seat[] = seatDocs.map((s) => ({
            id: s.id,
            index: s.index,
            userId: s.userId ?? undefined,
            state: s.state,
            username: s.userId === user.id ? 'You' : s.userId ? 'Guest' : undefined,
          }));
          setSeats(mapped);
          setOnlineMode(true);

          const mySeat = mapped.find((s) => s.userId === user.id);
          setMySeatId(mySeat?.id ?? null);

          if (hasAgora && mySeat) {
            if (mySeat.state === 'muted') {
              agora.mute(true);
            } else if (mySeat.state === 'speaking') {
              agora.mute(false);
            }
          }
        });

        unsubRoom = listenToRoom(DEFAULT_ROOM_ID, (room: RoomDoc | null) => {
          setVoiceMembers(room?.voiceMembers ?? {});
        });

        if (hasAgora) {
          agora.join(false).then((ok) => {
            if (!ok) pushToast({ message: 'Voice connection unavailable', type: 'info' });
          });
        }
        if (user?.vipLevel >= 1) {
          setShowVIPEntry(true);
        }
      } catch (err) {
        console.warn('Room setup error', err);
        setOnlineMode(false);
        pushToast({ message: 'Realtime sync unavailable', type: 'info' });
      }
    };

    setup();

    return () => {
      unsubSeats?.();
      unsubRoom?.();
      if (hasAgora) {
        agora.leave();
      }
    };
  }, [user?.id]);

  const volumeBySeatId = useMemo(() => {
    const out: Record<string, number> = {};
    for (const seat of seats) {
      if (!seat.userId) continue;
      const uid = voiceMembers[seat.userId];
      if (uid !== undefined && typeof agora.volumeByUid[uid] === 'number') {
        out[seat.id] = agora.volumeByUid[uid];
      }
    }
    return out;
  }, [seats, voiceMembers, agora.volumeByUid]);

  useEffect(() => {
    const userIds = [...new Set(seats.filter((s) => s.userId).map((s) => s.userId!))];
    const unsubs = userIds.map((uid) =>
      listenToAgency(uid, (agency) => {
        setAgencyByUserId((prev) => ({ ...prev, [uid]: agency }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [seats]);

  useEffect(() => {
    if (!user || !room || room.hostUserId !== user.id || !onlineMode) return;
    const interval = setInterval(() => {
      tickHostMinute(DEFAULT_ROOM_ID, user.id).catch(() => {});
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, room?.hostUserId, onlineMode]);

  const handleSeatPress = async (seat: Seat) => {
    if (seat.state === 'locked') {
      pushToast({ message: 'Seat is locked by host', type: 'info' });
      return;
    }

    const offlineUpdate = () => {
      setSeats((current) => {
        const cloned = [...current];
        const idx = cloned.findIndex((s) => s.id === seat.id);
        if (idx === -1) return current;
        const currentSeat = cloned[idx];
        if (mySeatId === seat.id) {
          cloned[idx] = { ...currentSeat, userId: undefined, username: undefined, state: 'empty' };
          setMySeatId(null);
          pushToast({ message: 'You left the seat', type: 'info' });
          if (hasAgora) agora.setPublishMic(false);
        } else if (!mySeatId && currentSeat.state === 'empty') {
          cloned[idx] = {
            ...currentSeat,
            userId: user?.id,
            username: 'You',
            state: 'speaking',
          };
          setMySeatId(seat.id);
          pushToast({ message: 'You took the mic', type: 'success' });
          if (hasAgora) {
            agora.setPublishMic(true);
            agora.mute(false);
          }
        }
        return cloned;
      });
    };

    if (!onlineMode || !user || !activeRoomId) {
      offlineUpdate();
      return;
    }

    const leaving = mySeatId === seat.id;

    if (leaving) {
      const res = await leaveSeatTransaction(DEFAULT_ROOM_ID, user.id, seat.id);
      if (res.ok) {
        setMySeatId(null);
        pushToast({ message: 'You left the seat', type: 'info' });
        if (hasAgora) agora.setPublishMic(false);
      } else {
        offlineUpdate();
      }
      return;
    }

    const res = await takeSeatTransaction(DEFAULT_ROOM_ID, user.id, seat.id, 'speaking');
    if (res.ok) {
      setMySeatId(seat.id);
      pushToast({ message: 'You took the mic', type: 'success' });
      if (hasAgora) {
        agora.setPublishMic(true);
        agora.mute(false);
      }
    } else {
      pushToast({ message: res.error ?? 'Could not take seat', type: 'error' });
    }
  };

  const handleToggleMute = async () => {
    if (!mySeatId) return;
    const currentSeat = seats.find((s) => s.id === mySeatId);
    if (!currentSeat) return;
    const nextState: SeatState = currentSeat.state === 'speaking' ? 'muted' : 'speaking';

    if (!onlineMode || !activeRoomId) {
      setSeats((current) =>
        current.map((s) =>
          s.id !== mySeatId ? s : { ...s, state: nextState },
        ),
      );
      if (hasAgora) agora.mute(nextState === 'muted');
      pushToast({ message: nextState === 'muted' ? 'You are muted' : 'You are speaking', type: 'info' });
      return;
    }

    try {
      await updateSeatState(currentSeat.id, { state: nextState });
      if (hasAgora) agora.mute(nextState === 'muted');
      pushToast({ message: nextState === 'muted' ? 'Mic off' : 'Mic on', type: 'info' });
    } catch (err) {
      pushToast({ message: 'Could not update mute', type: 'error' });
    }
  };

  const handleLockRandomSeat = async () => {
    if (!isHost) return;
    const candidate = seats.find((s) => s.state === 'empty');
    if (!candidate) return;
    if (!onlineMode || !activeRoomId) {
      setSeats((current) =>
        current.map((s) => (s.id === candidate.id ? { ...s, state: 'locked' as SeatState } : s)),
      );
      pushToast({ message: 'Seat locked', type: 'info' });
      return;
    }
    try {
      await updateSeatState(candidate.id, { state: 'locked' });
      pushToast({ message: 'Seat locked', type: 'info' });
    } catch (err) {
      pushToast({ message: 'Could not lock seat', type: 'error' });
    }
  };

  const handleUnlockAll = async () => {
    if (!isHost) return;
    const locked = seats.filter((s) => s.state === 'locked');
    if (!locked.length) return;
    if (!onlineMode || !activeRoomId) {
      setSeats((current) =>
        current.map((s) => (s.state === 'locked' ? { ...s, state: 'empty' as SeatState } : s)),
      );
      pushToast({ message: 'All seats unlocked', type: 'info' });
      return;
    }
    try {
      await Promise.all(locked.map((seat) => updateSeatState(seat.id, { state: 'empty' })));
      pushToast({ message: 'All seats unlocked', type: 'info' });
    } catch (err) {
      pushToast({ message: 'Could not unlock', type: 'error' });
    }
  };

  const [gridTop, gridBottom] = useMemo(() => [seats.slice(0, 5), seats.slice(5)], [seats]);

  const treasureProgress = room?.treasureProgress ?? 0;
  const treasureThresholdIndex = Math.min(room?.treasureThresholdIndex ?? 0, 2);
  const treasureContributions = room?.treasureContributions ?? {};
  const rankingDisplayNames: Record<string, string> = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [uid, _] of Object.entries(treasureContributions)) {
      out[uid] = uid === user?.id ? 'You' : 'Guest';
    }
    return out;
  }, [treasureContributions, user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.roomTitle}>Founder Circle</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.roomSubtitle}>
              {hasAgora ? 'Voice room' : 'Room (add Agora App ID for voice)'}
            </Text>
            {hasAgora && (
              <View style={[styles.badge, styles[`badge_${agora.connectionState}` as keyof typeof styles]]}>
                <Text style={styles.badgeText}>{connectionStateLabel(agora.connectionState)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerButtons}>
          <PrimaryButton
            label="Admin"
            onPress={() => navigation.navigate('Admin')}
            style={styles.headerBtn}
          />
          <PrimaryButton
            label="Agency"
            onPress={() => navigation.navigate('Agency')}
            style={styles.headerBtn}
          />
          <PrimaryButton
            label="Wallet"
            onPress={() => navigation.navigate('Wallet')}
            style={styles.walletButton}
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.treasureCard}>
          <Text style={styles.sectionTitle}>Treasure Box</Text>
          <TreasureProgressBar progress={treasureProgress} thresholdIndex={treasureThresholdIndex} />
          <LiveRankings
            contributions={treasureContributions}
            displayNames={rankingDisplayNames}
            currentUserId={user?.id}
          />
        </Card>
        <Card style={styles.roomCard}>
          <Text style={styles.sectionTitle}>Seats</Text>
          <View style={styles.gridRow}>
            {gridTop.map((seat) => (
              <View key={seat.id} style={styles.seatWrapper}>
                <SeatAvatar
                  index={seat.index}
                  username={seat.username}
                  state={seat.state}
                  isHost={isHost && seat.index === 0}
                  speakingVolume={seat.state === 'speaking' ? (volumeBySeatId[seat.id] ?? 0) : 0}
                  agencyRole={seat.userId ? agencyByUserId[seat.userId]?.role : undefined}
                  vipLevel={seat.userId === user?.id ? (wallet.vipLevel ?? 0) : undefined}
                  onPress={() => handleSeatPress(seat)}
                />
              </View>
            ))}
          </View>
          <View style={styles.gridRow}>
            {gridBottom.map((seat) => (
              <View key={seat.id} style={styles.seatWrapper}>
                <SeatAvatar
                  index={seat.index}
                  username={seat.username}
                  state={seat.state}
                  isHost={isHost && seat.index === 0}
                  speakingVolume={seat.state === 'speaking' ? (volumeBySeatId[seat.id] ?? 0) : 0}
                  agencyRole={seat.userId ? agencyByUserId[seat.userId]?.role : undefined}
                  vipLevel={seat.userId === user?.id ? (wallet.vipLevel ?? 0) : undefined}
                  onPress={() => handleSeatPress(seat)}
                />
              </View>
            ))}
          </View>
        </Card>
        <Card style={styles.controlsCard}>
          <Text style={styles.sectionTitle}>Controls</Text>
          <View style={styles.controlsRow}>
            <PrimaryButton
              label={mySeatId ? 'Leave Seat' : 'Take Seat'}
              onPress={() => {
                if (mySeatId) {
                  const mine = seats.find((s) => s.id === mySeatId);
                  if (mine) handleSeatPress(mine);
                }
              }}
            />
            <PrimaryButton
              label="Toggle Mute"
              onPress={handleToggleMute}
              disabled={!mySeatId}
              style={styles.secondaryAction}
            />
          </View>
          {isHost && (
            <View style={styles.controlsRow}>
              <PrimaryButton
                label="Lock Random Seat"
                onPress={handleLockRandomSeat}
                style={styles.secondaryAction}
              />
              <PrimaryButton label="Unlock All" onPress={handleUnlockAll} />
            </View>
          )}
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
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  roomTitle: {
    ...typography.h1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  roomSubtitle: {
    ...typography.subtitle,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badge_connected: {
    backgroundColor: colors.success,
  },
  badge_connecting: {
    backgroundColor: colors.primary,
  },
  badge_reconnecting: {
    backgroundColor: colors.primary,
  },
  badge_disconnected: {
    backgroundColor: colors.textSecondary,
  },
  badge_failed: {
    backgroundColor: colors.error,
  },
  badge_idle: {
    backgroundColor: colors.border,
  },
  badgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerBtn: {
    paddingHorizontal: spacing.md,
  },
  walletButton: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  treasureCard: {
    marginBottom: spacing.md,
  },
  roomCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  seatWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  controlsCard: {},
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  secondaryAction: {
    marginLeft: spacing.sm,
  },
});
