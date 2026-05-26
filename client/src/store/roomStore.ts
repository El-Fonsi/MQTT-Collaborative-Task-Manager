import { create } from 'zustand';
import api from '../lib/api';

export interface Room {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  isOwner?: boolean;
  _count?: { tasks: number };
  members?: { user: { id: string; name: string; email: string; avatar: string | null } }[];
}

export interface JoinRequest {
  id: string;
  userId: string;
  roomId: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
  room: { id: string; name: string };
}

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  joinRequests: JoinRequest[];
  loading: boolean;
  fetchRooms: () => Promise<void>;
  fetchJoinRequests: () => Promise<void>;
  setCurrentRoom: (room: Room | null) => void;
  createRoom: (name: string) => Promise<Room>;
  requestJoin: (inviteCode: string) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  joinRequests: [],
  loading: false,

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/rooms');
      set({ rooms: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchJoinRequests: async () => {
    try {
      const { data } = await api.get('/rooms/requests');
      set({ joinRequests: data });
    } catch {}
  },

  setCurrentRoom: (room) => set({ currentRoom: room }),

  createRoom: async (name) => {
    const { data } = await api.post('/rooms', { name });
    const rooms = get().rooms;
    set({ rooms: [...rooms, { ...data, isOwner: true }] });
    return data;
  },

  requestJoin: async (inviteCode) => {
    await api.post('/rooms/join', { inviteCode });
  },

  approveRequest: async (requestId) => {
    await api.post(`/rooms/requests/${requestId}/approve`);
    set((state) => ({
      joinRequests: state.joinRequests.filter((r) => r.id !== requestId),
    }));
  },

  declineRequest: async (requestId) => {
    await api.post(`/rooms/requests/${requestId}/decline`);
    set((state) => ({
      joinRequests: state.joinRequests.filter((r) => r.id !== requestId),
    }));
  },
}));
