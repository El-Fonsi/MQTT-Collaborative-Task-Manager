import { useEffect, useRef, useCallback } from 'react';
import { connectMqtt, getClient, disconnectMqtt } from '../lib/mqtt';
import { useTaskStore } from '../store/taskStore';

export function useMqtt(roomId: string | null, userId?: string) {
  const setTasks = useTaskStore((s) => s.setTasks);
  const setConnected = useTaskStore((s) => s.setConnected);
  const mountedRef = useRef(true);
  const setupDone = useRef(false);

  const setup = useCallback(async () => {
    if (!roomId || setupDone.current) return;

    try {
      const client = await connectMqtt();
      if (!mountedRef.current) return;

      setConnected(true);

      client.subscribe(`rooms/${roomId}/tasks`, { qos: 1 });
      client.subscribe(`rooms/${roomId}/task/+`, { qos: 1 });
      client.subscribe(`rooms/${roomId}/users`, { qos: 1 });
      client.subscribe(`rooms/${roomId}/events`, { qos: 1 });

      if (userId) {
        client.publish(`rooms/${roomId}/presence/${userId}`, '1', { qos: 1, retain: true });
      }

      setupDone.current = true;

      client.on('message', (topic, payload) => {
        if (!mountedRef.current) return;

        try {
          const msg = JSON.parse(payload.toString());

          if (topic === `rooms/${roomId}/tasks`) {
            setTasks(Array.isArray(msg) ? msg : []);
          } else if (topic.startsWith(`rooms/${roomId}/task/`)) {
            const { action, task } = msg;
            if (action === 'create' || action === 'update') {
              useTaskStore.setState((state) => {
                const filtered = state.tasks.filter((t) => t.id !== task?.id);
                if (action === 'delete') return { tasks: filtered };
                return { tasks: [...filtered, task].sort((a, b) => a.order - b.order) };
              });
            } else if (action === 'delete') {
              useTaskStore.setState((state) => ({
                tasks: state.tasks.filter((t) => t.id !== msg.taskId),
              }));
            }
          } else if (topic === `rooms/${roomId}/users`) {
            useTaskStore.setState({ onlineUsers: Array.isArray(msg) ? msg : [] });
          }
        } catch {}
      });
    } catch (err) {
      console.error('[useMqtt] Connection failed:', err);
      setConnected(false);
    }
  }, [roomId, userId, setTasks, setConnected]);

  useEffect(() => {
    mountedRef.current = true;
    setupDone.current = false;
    setup();

    return () => {
      mountedRef.current = false;
      setupDone.current = false;
      useTaskStore.setState({ tasks: [], onlineUsers: [] });
      const client = getClient();
      if (client && roomId) {
        if (userId) {
          client.publish(`rooms/${roomId}/presence/${userId}`, '0', { qos: 1, retain: true });
        }
        client.unsubscribe(`rooms/${roomId}/tasks`);
        client.unsubscribe(`rooms/${roomId}/task/+`);
        client.unsubscribe(`rooms/${roomId}/users`);
        client.unsubscribe(`rooms/${roomId}/events`);
      }
    };
  }, [roomId, userId, setup]);

  return { disconnectMqtt };
}
