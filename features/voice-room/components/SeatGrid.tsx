import React from 'react';
import { View, StyleSheet, Pressable, Image, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import type { ActiveSeat } from '@/store/voiceRoom';
import { RoyalColors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface SeatGridProps {
  seats: ActiveSeat[];
  columns: number;
  onSeatPress?: (seat: ActiveSeat) => void;
  isHost: boolean;
}

function SpeakingRing({ active }: { active: boolean }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 450, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 450, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
    }
  }, [active, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!active) return null;
  return <Animated.View style={[styles.speakingRing, style]} />;
}

export function SeatGrid({ seats, columns, onSeatPress, isHost }: SeatGridProps) {
  return (
    <View style={[styles.grid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
      {seats.map((seat) => {
        const locked = seat.isLocked;
        const taken = !!seat.uid;
        return (
          <Pressable
            key={seat.index}
            style={({ pressed }) => [
              styles.seat,
              { opacity: pressed ? 0.85 : 1 },
              locked && styles.seatLocked,
            ]}
            disabled={locked && !isHost}
            onPress={() => onSeatPress?.(seat)}
          >
            <View style={styles.avatarWrap}>
              <SpeakingRing active={seat.isSpeaking} />
              {taken ? (
                <Image
                  source={
                    seat.photoURL
                      ? { uri: seat.photoURL }
                      : require('@/assets/images/icon.png')
                  }
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.emptyAvatar}>
                  <Ionicons
                    name={locked ? 'lock-closed' : 'mic-outline'}
                    size={20}
                    color={locked ? RoyalColors.error : RoyalColors.textMuted}
                  />
                </View>
              )}
            </View>
            <View style={styles.meta}>
              <Text
                numberOfLines={1}
                style={[styles.name, !taken && styles.nameEmpty]}
              >
                {taken ? seat.displayName ?? 'Guest' : locked ? 'Locked' : 'Tap to join'}
              </Text>
              {seat.vipLevel > 0 && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>VIP {seat.vipLevel}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    justifyContent: 'space-between',
  },
  seat: {
    width: '30%',
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  seatLocked: {
    opacity: 0.7,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: RoyalColors.green,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: RoyalColors.gold,
  },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: RoyalColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RoyalColors.blackCard,
  },
  meta: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  name: {
    color: RoyalColors.text,
    fontSize: 12,
    maxWidth: 80,
  },
  nameEmpty: {
    color: RoyalColors.textMuted,
  },
  vipBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: RoyalColors.goldMuted,
  },
  vipText: {
    fontSize: 10,
    color: RoyalColors.black,
    fontWeight: '600',
  },
});

