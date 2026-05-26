import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Text, Title, Button, Tooltip, CopyButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../lib/api';
import { useRoomStore, type Room } from '../store/roomStore';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { useMqtt } from '../hooks/useMqtt';
import { Board } from '../components/Board';
import { PresenceIndicator } from '../components/PresenceIndicator';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { setCurrentRoom } = useRoomStore();
  const connected = useTaskStore((s) => s.connected);
  const user = useAuthStore((s) => s.user);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useMqtt(roomId || null, user?.id);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    api.get(`/rooms/${roomId}`)
      .then(({ data }) => {
        setRoom(data);
        setCurrentRoom(data);
        setLoading(false);
      })
      .catch(() => {
        notifications.show({ title: 'Error', message: 'Failed to load room', color: 'red' });
        navigate('/');
        setLoading(false);
      });
  }, [roomId, setCurrentRoom, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <Text size="sm" c="dimmed">Loading room...</Text>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="flex flex-col h-full">
      <header className="glass border-b border-gray-200/50 dark:border-gray-700/50 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {room.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Title order={4} className="text-gray-900 dark:text-gray-100 truncate">
                {room.name}
              </Title>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CopyButton value={room.inviteCode}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied!' : `Invite code: ${room.inviteCode}`}>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    }
                    onClick={copy}
                    className="hidden sm:flex"
                  >
                    {room.inviteCode}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>

            <PresenceIndicator />

            {!connected && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <Text size="xs" c="amber" fw={500}>Connecting</Text>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-4 lg:p-6">
        <Board roomId={room.id} />
      </main>
    </div>
  );
}
