export type SeatLayout = 10 | 12 | 16 | 20 | 22 | 26;

export interface Seat {
  index: number;
  userId: string | null;
  userName: string | null;
  avatarURL: string | null;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocked: boolean;
  /** VIP level for entry animation */
  vipLevel: number;
  frameId: string | null;
  vehicleId: string | null;
}

export interface VoiceRoom {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  seatLayout: SeatLayout;
  seats: Seat[];
  /** Banned user IDs */
  bannedUserIds: string[];
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}
