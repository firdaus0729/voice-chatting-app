import { create } from 'zustand';

type User = {
  id: string;
  phone: string;
  displayName: string;
  vipLevel: number;
} | null;

type Wallet = {
  coins: number;
  diamonds: number;
  vipLevel?: number;
  cumulativeRechargeInr?: number;
};

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type AppState = {
  user: User;
  wallet: Wallet;
  activeRoomId: string | null;
  toasts: Toast[];
  setUser: (user: User) => void;
  setWallet: (wallet: Wallet) => void;
  setActiveRoom: (roomId: string | null) => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  wallet: {
    coins: 1000,
    diamonds: 0,
  },
  activeRoomId: null,
  toasts: [],
  setUser: (user) => set({ user }),
  setWallet: (wallet) => set({ wallet }),
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  pushToast: ({ message, type }) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          message,
          type,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

