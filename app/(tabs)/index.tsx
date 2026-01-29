import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { RoyalColors, Spacing } from '@/constants/theme';
import { useVoiceRoom } from '@/features/voice-room/hooks/useVoiceRoom';
import { SeatGrid } from '@/features/voice-room/components/SeatGrid';
import { useVoiceRoomStore } from '@/store/voiceRoom';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const activeRoom = useVoiceRoomStore((s) => s.activeRoom);
  const { createRoom, takeSeatAt, leaveCurrentSeat } = useVoiceRoom(
    activeRoom?.room.id ?? null,
    user ?? null
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login' as any);
  };

  const handleCreateRoom = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to create a room.');
      return;
    }
    try {
      const roomId = await createRoom('Royal Voice Party');
      router.push({
        pathname: '/(tabs)',
        params: { roomId },
      } as any);
    } catch (e) {
      Alert.alert(
        'Failed to create room',
        e instanceof Error ? e.message : 'Please try again later.'
      );
    }
  };

  const handleSeatPress = async (seatIndex: number) => {
    if (!activeRoom || !user) return;
    const seat = activeRoom.seats[seatIndex];
    const isMe = seat.uid === user.uid;
    try {
      if (isMe) {
        await leaveCurrentSeat();
      } else {
        await takeSeatAt(seatIndex);
      }
    } catch (e) {
      Alert.alert(
        'Seat action failed',
        e instanceof Error ? e.message : 'Please try again.'
      );
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Voice Party</Text>
          <Text style={styles.subtitle}>Multiplayer royal voice rooms</Text>
        </View>

        {user && (
          <View style={styles.user}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email || 'No email'}</Text>
            <Button
              title="Sign out"
              variant="outline"
              size="md"
              onPress={handleSignOut}
              style={styles.signOut}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Room</Text>
          <Text style={styles.sectionSubtitle}>
            Tap a seat to join the mic. Hosts can lock, mute, or kick seats from the admin tools
            we'll add next.
          </Text>
          <Button
            title={activeRoom ? 'Re-enter Current Room' : 'Start Royal Party'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleCreateRoom}
            style={styles.primaryCta}
          />

          {activeRoom && (
            <View style={styles.roomCard}>
              <Text style={styles.roomTitle}>{activeRoom.room.title}</Text>
              <Text style={styles.roomHost}>
                Host: {activeRoom.room.hostDisplayName}
              </Text>
              <SeatGrid
                seats={activeRoom.seats}
                columns={3}
                isHost={activeRoom.role === 'host'}
                onSeatPress={(seat) => handleSeatPress(seat.index)}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoyalColors.background,
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.md,
  },
  user: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: RoyalColors.blackCard,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  label: {
    color: RoyalColors.textMuted,
    fontSize: 12,
  },
  displayName: {
    color: RoyalColors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    color: RoyalColors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  signOut: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    color: RoyalColors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    color: RoyalColors.textMuted,
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  primaryCta: {
    marginBottom: Spacing.lg,
  },
  roomCard: {
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: 16,
    backgroundColor: RoyalColors.blackCard,
  },
  roomTitle: {
    color: RoyalColors.gold,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  roomHost: {
    color: RoyalColors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.md,
  },
});
