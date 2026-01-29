import { create } from 'zustand';
import type { FirestoreSeat, FirestoreVoiceRoom } from '@/types/firestore';
import type { SeatLayout } from '@/types/voice-room';

export type VoiceRole = 'host' | 'co_host' | 'speaker' | 'listener';

export interface ActiveSeat extends FirestoreSeat {
  /** True if this is the current user. */
  isMe: boolean;
}

export interface ActiveVoiceRoom {
  room: FirestoreVoiceRoom;
  /** Seats enriched with `isMe` and any client-only flags. */
  seats: ActiveSeat[];
  /** Current user role within the room. */
  role: VoiceRole;
}

export type VoiceRoomStatus = 'idle' | 'joining' | 'joined' | 'leaving' | 'error';

interface VoiceRoomState {
  activeRoom: ActiveVoiceRoom | null;
  status: VoiceRoomStatus;
  error: string | null;
  /** Selected layout when creating a room. */
  createLayout: SeatLayout;
}

interface VoiceRoomActions {
  setActiveRoom: (payload: ActiveVoiceRoom | null) => void;
  setStatus: (status: VoiceRoomStatus) => void;
  setError: (error: string | null) => void;
  setCreateLayout: (layout: SeatLayout) => void;

  /** Update a single seat by index. */
  updateSeat: (index: number, update: Partial<ActiveSeat>) => void;
}

const initialState: VoiceRoomState = {
  activeRoom: null,
  status: 'idle',
  error: null,
  createLayout: 12,
};

export const useVoiceRoomStore = create<VoiceRoomState & VoiceRoomActions>((set, get) => ({
  ...initialState,

  setActiveRoom(payload) {
    set({ activeRoom: payload });
  },

  setStatus(status) {
    set({ status });
  },

  setError(error) {
    set({ error });
  },

  setCreateLayout(layout) {
    set({ createLayout: layout });
  },

  updateSeat(index, update) {
    const current = get().activeRoom;
    if (!current) return;
    const seats = current.seats.map((seat) =>
      seat.index === index ? { ...seat, ...update } : seat
    );
    set({
      activeRoom: {
        ...current,
        seats,
        room: {
          ...current.room,
          seats: seats.map(
            ({ isMe, ...rest }) =>
              ({
                ...rest,
              } as FirestoreSeat)
          ),
        },
      },
    });
  },
}));

