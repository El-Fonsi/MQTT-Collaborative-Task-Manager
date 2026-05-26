import { Title, Text } from '@mantine/core';
import { useRoomStore } from '../store/roomStore';
import { GlassCard } from '../components/GlassCard';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { rooms } = useRoomStore();
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="mb-8">
        <Title order={2} className="text-gray-900 dark:text-gray-100">Dashboard</Title>
        <Text c="dimmed" size="sm">Select a room to start collaborating</Text>
      </div>

      {rooms.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <Title order={4} className="text-gray-600 dark:text-gray-400 mb-2">No rooms yet</Title>
          <Text size="sm" c="dimmed" mb={6}>
            Create a new room or join one with an invite code from the sidebar.
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <GlassCard
              key={room.id}
              hover
              onClick={() => navigate(`/room/${room.id}`)}
              className="!p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {room.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Text fw={600} size="sm" truncate>{room.name}</Text>
                  {room._count && (
                    <Text size="xs" c="dimmed">{room._count.tasks} tasks</Text>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{room.members?.length || 0} members</span>
                <span className="ml-auto font-mono text-xs">{room.inviteCode}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
