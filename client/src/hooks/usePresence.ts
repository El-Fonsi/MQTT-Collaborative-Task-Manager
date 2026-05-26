import { useTaskStore } from '../store/taskStore';

export function usePresence() {
  const onlineUsers = useTaskStore((s) => s.onlineUsers);
  return { onlineUsers };
}
