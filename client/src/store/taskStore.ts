import { create } from 'zustand';
import { getClient } from '../lib/mqtt';

export interface Assignee {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string | null;
  assignee: Assignee | null;
  roomId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

type Status = 'todo' | 'in-progress' | 'done';

interface PresenceUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface TaskState {
  tasks: Task[];
  onlineUsers: PresenceUser[];
  connected: boolean;
  setTasks: (tasks: Task[]) => void;
  setConnected: (v: boolean) => void;
  publishCommand: (roomId: string, msg: { action: string; task?: any; taskId?: string }) => void;
  getTasksByStatus: (status: Status) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  onlineUsers: [],
  connected: false,

  setTasks: (tasks) => set({ tasks }),

  setConnected: (connected) => set({ connected }),

  publishCommand: (roomId, msg: { action: string; task?: any; taskId?: string }) => {
    const client = getClient();
    if (!client?.connected) return;
    client.publish(`rooms/${roomId}/command`, JSON.stringify(msg), { qos: 1 });
  },

  getTasksByStatus: (status) => {
    return get().tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);
  },
}));
