import { useCallback, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import type { FirestoreVoiceRoom } from '@/types/firestore';
import { useVoiceRoomStore, type VoiceRole } from '@/store/voiceRoom';
import type { AppUser } from '@/types/user';
import {
  createVoiceRoom,
  getVoiceRoom,
  leaveSeat,
  takeSeat,
  hostBanUser,
  hostKickFromSeat,
  hostMuteSeat,
  hostUpdateSeatLock,
} from '../services/voiceRoomService';
import { getVoiceSdk } from '@/services/voice/voiceSdk';

const ROOMS_COLLECTION = 'voice_rooms';

function buildActiveRoom(room: FirestoreVoiceRoom, me: AppUser, role: VoiceRole) {
  return {
    room,
    role,
    seats: room.seats.map((s) => ({
      ...s,
      isMe: s.uid === me.uid,
    })),
  };
}

export function useVoiceRoom(roomId: string | null, me: AppUser | null) {
  const store = useVoiceRoomStore();

  useEffect(() => {
    if (!roomId || !me) return;
    const db = getFirebaseDb();
    if (!db) return;
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        store.setActiveRoom(null);
        store.setStatus('idle');
        return;
      }
      const data = snap.data() as FirestoreVoiceRoom;
      const role: VoiceRole =
        data.hostUid === me.uid ? 'host' : 'listener';
      store.setActiveRoom(buildActiveRoom(data, me, role));
      store.setStatus('joined');
    });
    return () => unsub();
  }, [roomId, me, store]);

  const createRoom = useCallback(
    async (title: string) => {
      if (!me) throw new Error('Not signed in');
      const id = `${me.uid}-${Date.now()}`;
      store.setStatus('joining');
      store.setError(null);
      const room = await createVoiceRoom({
        id,
        title,
        host: me,
      });
      store.setActiveRoom(buildActiveRoom(room, me, 'host'));
      store.setStatus('joined');
      return room.id;
    },
    [me, store]
  );

  const joinExistingRoom = useCallback(
    async (id: string) => {
      if (!me) throw new Error('Not signed in');
      store.setStatus('joining');
      store.setError(null);
      const existing = await getVoiceRoom(id);
      if (!existing) {
        store.setStatus('error');
        store.setError('Room not found');
        return;
      }
      const role: VoiceRole =
        existing.hostUid === me.uid ? 'host' : 'listener';
      store.setActiveRoom(buildActiveRoom(existing, me, role));
      store.setStatus('joined');
      const sdk = getVoiceSdk();
      await sdk.initialize();
      await sdk.joinRoom({ roomId: id, role });
    },
    [me, store]
  );

  const leaveCurrentSeat = useCallback(async () => {
    if (!me || !roomId) return;
    await leaveSeat({ roomId, userId: me.uid });
  }, [me, roomId]);

  const takeSeatAt = useCallback(
    async (seatIndex: number) => {
      if (!me || !roomId) throw new Error('Not in room');
      await takeSeat({ roomId, seatIndex, user: me });
    },
    [me, roomId]
  );

  const hostLockSeat = useCallback(
    async (seatIndex: number, locked: boolean) => {
      if (!roomId) return;
      await hostUpdateSeatLock({ roomId, seatIndex, locked });
    },
    [roomId]
  );

  const hostMuteUser = useCallback(
    async (seatIndex: number, muted: boolean) => {
      if (!roomId) return;
      await hostMuteSeat({ roomId, seatIndex, muted });
    },
    [roomId]
  );

  const hostKickUser = useCallback(
    async (seatIndex: number) => {
      if (!roomId) return;
      await hostKickFromSeat({ roomId, seatIndex });
    },
    [roomId]
  );

  const hostBanUserById = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      await hostBanUser({ roomId, userId });
    },
    [roomId]
  );

  return {
    ...store,
    createRoom,
    joinExistingRoom,
    takeSeatAt,
    leaveCurrentSeat,
    hostLockSeat,
    hostMuteUser,
    hostKickUser,
    hostBanUserById,
  };
}

