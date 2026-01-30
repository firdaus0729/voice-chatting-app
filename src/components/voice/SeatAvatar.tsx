import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme';
import { AgencyBadge } from '../agency/AgencyBadge';
import { OfficialFrame } from '../agency/OfficialFrame';
import type { AgencyRole } from '../../services/agencyModels';

export type SeatState = 'empty' | 'occupied' | 'muted' | 'speaking' | 'locked';

type Props = {
  index: number;
  username?: string;
  state: SeatState;
  isHost?: boolean;
  /** Real-time volume 0–1 from RTC. When state is 'speaking', drives green ring. */
  speakingVolume?: number;
  /** Agency role for official frame and badge (chat rooms & profile) */
  agencyRole?: AgencyRole | null;
  /** VIP level 0–5 for badge (e.g. current user from wallet) */
  vipLevel?: number;
  onPress?: () => void;
};

const AVATAR_SIZE = 72;

export const SeatAvatar: React.FC<Props> = ({ index, username, state, isHost, speakingVolume = 0, agencyRole, vipLevel, onPress }) => {
  const isSpeaking = state === 'speaking';
  const volume = useSharedValue(0);

  useEffect(() => {
    volume.value = withSpring(isSpeaking ? Math.min(1, Math.max(0, speakingVolume)) : 0, {
      damping: 15,
      stiffness: 120,
    });
  }, [isSpeaking, speakingVolume, volume]);

  const ringStyle = useAnimatedStyle(() => {
    const v = volume.value;
    return {
      transform: [{ scale: 1 + v * 0.12 }],
      opacity: 0.3 + v * 0.7,
      borderWidth: 2 + v * 2,
      borderColor: colors.success,
    };
  });

  const bgColor =
    state === 'locked'
      ? colors.surfaceMuted
      : state === 'muted'
      ? '#33212c'
      : state === 'speaking'
      ? '#103826'
      : state === 'occupied'
      ? '#26263b'
      : colors.surfaceAlt;

  const borderColor =
    state === 'locked'
      ? colors.error
      : state === 'speaking'
      ? colors.success
      : state === 'muted'
      ? colors.error
      : colors.border;

  const initials = username?.[0]?.toUpperCase() ?? (index + 1).toString();

  const avatarInner = (
    <View style={[styles.avatar, { backgroundColor: bgColor, borderColor }]}>
      <Text style={styles.initials}>{initials}</Text>
      {isHost && <Text style={styles.hostBadge}>HOST</Text>}
      {vipLevel != null && vipLevel >= 1 && <View style={styles.vipBadgeWrap}><VIPBadge level={vipLevel} compact /></View>}
      {agencyRole && <View style={styles.agencyBadgeWrap}><AgencyBadge role={agencyRole} compact /></View>}
      {state === 'muted' && <Text style={styles.muteTag}>MUTED</Text>}
      {state === 'locked' && <Text style={styles.lockTag}>LOCK</Text>}
    </View>
  );

  const content = (
    <>
      {isSpeaking && (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderRadius: AVATAR_SIZE / 2 + 4 }, ringStyle]}
        />
      )}
      {agencyRole ? (
        <OfficialFrame role={agencyRole}>
          {avatarInner}
        </OfficialFrame>
      ) : (
        avatarInner
      )}
      <Text style={styles.caption} numberOfLines={1}>
        {username ?? 'Empty'}
      </Text>
    </>
  );

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.wrapper}>
      {onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    top: -4,
    left: (72 - (AVATAR_SIZE + 8)) / 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  hostBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
    ...typography.caption,
  },
  muteTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    ...typography.caption,
  },
  lockTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    ...typography.caption,
  },
  agencyBadgeWrap: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  vipBadgeWrap: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  pressed: {
    opacity: 0.85,
  },
});
