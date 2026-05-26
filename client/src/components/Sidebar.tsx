import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, TextInput, Text, Modal, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore, type JoinRequest } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { UserAvatar } from './UserAvatar';
import { ThemeToggle } from './ThemeToggle';
import { onMessage, connectMqtt } from '../lib/mqtt';

export function Sidebar() {
  const { rooms, fetchRooms, joinRequests, fetchJoinRequests, createRoom, requestJoin, approveRequest, declineRequest } = useRoomStore();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const [opened, { open, close }] = useDisclosure(false);
  const [joinOpened, { open: openJoin, close: closeJoin }] = useDisclosure(false);
  const navigate = useNavigate();
  const { roomId } = useParams();

  useEffect(() => {
    fetchRooms();
    fetchJoinRequests();
  }, [fetchRooms, fetchJoinRequests]);

  useEffect(() => {
    if (!user?.id) return;
    let unsub: (() => void) | undefined;

    connectMqtt().then((client) => {
      client.subscribe(`users/${user.id}/join-request`, { qos: 1 });
      client.subscribe(`users/${user.id}/join-approval`, { qos: 1 });

      unsub = onMessage((topic, payload) => {
        if (topic === `users/${user.id}/join-request`) {
          fetchJoinRequests();
        }
        if (topic === `users/${user.id}/join-approval`) {
          fetchRooms();
        }
      });
    });

    return () => {
      if (unsub) unsub();
    };
  }, [user?.id, fetchJoinRequests, fetchRooms]);

  const handleCreate = async () => {
    const name = (document.getElementById('room-name') as HTMLInputElement)?.value;
    if (!name) return;
    try {
      const room = await createRoom(name);
      close();
      navigate(`/room/${room.id}`);
      notifications.show({ title: 'Room created', message: `"${room.name}" is ready!`, color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to create room', color: 'red' });
    }
  };

  const handleJoin = async () => {
    const code = (document.getElementById('invite-code') as HTMLInputElement)?.value;
    if (!code) return;
    try {
      await requestJoin(code);
      closeJoin();
      notifications.show({ title: 'Request sent', message: 'The room owner will review your request', color: 'blue' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Invalid invite code';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleApprove = async (req: JoinRequest) => {
    try {
      await approveRequest(req.id);
      notifications.show({ title: 'Approved', message: `${req.user.name} can now join "${req.room.name}"`, color: 'green' });
      fetchRooms();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to approve', color: 'red' });
    }
  };

  const handleDecline = async (req: JoinRequest) => {
    try {
      await declineRequest(req.id);
      notifications.show({ title: 'Declined', message: `Request from ${req.user.name} declined`, color: 'orange' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to decline', color: 'red' });
    }
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-72 z-50 glass border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col"
          >
            <SidebarContent
              user={user}
              rooms={rooms}
              joinRequests={joinRequests}
              roomId={roomId}
              onNavigate={(id) => { setSidebarOpen(false); navigate(`/room/${id}`); }}
              onCreateOpen={open}
              onJoinOpen={openJoin}
              onLogout={handleLogout}
              onProfile={() => { setSidebarOpen(false); navigate('/profile'); }}
              onApprove={handleApprove}
              onDecline={handleDecline}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      <aside className="hidden lg:flex flex-col w-72 h-screen glass border-r border-gray-200/50 dark:border-gray-700/50">
        <SidebarContent
          user={user}
          rooms={rooms}
          joinRequests={joinRequests}
          roomId={roomId}
          onNavigate={(id) => navigate(`/room/${id}`)}
          onCreateOpen={open}
          onJoinOpen={openJoin}
          onLogout={handleLogout}
          onProfile={() => navigate('/profile')}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      </aside>

      <Modal opened={opened} onClose={close} title="Create Room" centered>
        <TextInput id="room-name" label="Room name" placeholder="e.g. Sprint 24" required />
        <Group mt="md">
          <Button onClick={handleCreate} className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">Create</Button>
          <Button variant="subtle" onClick={close}>Cancel</Button>
        </Group>
      </Modal>

      <Modal opened={joinOpened} onClose={closeJoin} title="Join Room" centered>
        <TextInput id="invite-code" label="Invite code" placeholder="e.g. ABC12345" required />
        <Group mt="md">
          <Button onClick={handleJoin} className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">Send Request</Button>
          <Button variant="subtle" onClick={closeJoin}>Cancel</Button>
        </Group>
      </Modal>
    </>
  );
}

function SidebarContent({
  user, rooms, joinRequests, roomId, onNavigate, onCreateOpen, onJoinOpen, onLogout, onProfile, onApprove, onDecline,
}: {
  user: any;
  rooms: any[];
  joinRequests: JoinRequest[];
  roomId?: string;
  onNavigate: (id: string) => void;
  onCreateOpen: () => void;
  onJoinOpen: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onApprove: (req: JoinRequest) => void;
  onDecline: (req: JoinRequest) => void;
}) {
  const myRooms = rooms.filter((r) => r.isOwner);
  const joinedRooms = rooms.filter((r) => !r.isOwner);

  return (
    <>
      <div className="p-5 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <Text fw={700} size="lg">TaskBoard</Text>
          </div>
          <ThemeToggle />
        </div>

        {user && (
          <div className="flex items-center gap-3 mt-2">
            <UserAvatar name={user.name} avatar={user.avatar} size="sm" showDot={false} />
            <div className="flex-1 min-w-0">
              <Text size="sm" fw={500} truncate>{user.name}</Text>
              <Text size="xs" c="dimmed" truncate>{user.email}</Text>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {joinRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" className="tracking-wider">Requests</Text>
              <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>
            </div>
            <div className="space-y-2">
              {joinRequests.map((req) => (
                <div key={req.id} className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <UserAvatar name={req.user.name} avatar={req.user.avatar} size="sm" showDot={false} />
                    <div className="flex-1 min-w-0">
                      <Text size="sm" fw={500} truncate>{req.user.name}</Text>
                      <Text size="xs" c="dimmed" truncate>wants to join "{req.room.name}"</Text>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="xs" color="green" variant="light" fullWidth onClick={() => onApprove(req)}>
                      Approve
                    </Button>
                    <Button size="xs" color="red" variant="light" fullWidth onClick={() => onDecline(req)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {myRooms.length > 0 && (
          <div>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb="sm" className="tracking-wider flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              My Rooms
            </Text>
            <RoomList rooms={myRooms} roomId={roomId} onNavigate={onNavigate} />
          </div>
        )}

        {joinedRooms.length > 0 && (
          <div>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb="sm" className="tracking-wider flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Joined Rooms
            </Text>
            <RoomList rooms={joinedRooms} roomId={roomId} onNavigate={onNavigate} />
          </div>
        )}

        {rooms.length === 0 && (
          <Text size="sm" c="dimmed" className="text-center py-8">
            No rooms yet. Create or join one!
          </Text>
        )}
      </div>

      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2">
        <Button
          fullWidth
          variant="light"
          leftSection={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
          onClick={onCreateOpen}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Create Room
        </Button>
        <Button
          fullWidth
          variant="light"
          leftSection={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
          onClick={onJoinOpen}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Join Room
        </Button>
        <Button
          fullWidth
          variant="subtle"
          leftSection={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          onClick={onProfile}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Profile
        </Button>
        <Button
          fullWidth
          variant="subtle"
          color="red"
          onClick={onLogout}
        >
          Logout
        </Button>
      </div>
    </>
  );
}

function RoomList({ rooms, roomId, onNavigate }: { rooms: any[]; roomId?: string; onNavigate: (id: string) => void }) {
  return (
    <div className="space-y-1">
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => onNavigate(room.id)}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
            roomId === room.id
              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="truncate">{room.name}</span>
            {room._count && (
              <span className="ml-auto text-xs text-gray-400">{room._count.tasks}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
