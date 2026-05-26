import { Tooltip, Group, Text } from '@mantine/core';
import { UserAvatar } from './UserAvatar';
import { useTaskStore } from '../store/taskStore';

export function PresenceIndicator() {
  const onlineUsers = useTaskStore((s) => s.onlineUsers);

  if (onlineUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Text size="xs" c="dimmed" className="hidden sm:inline">
        {onlineUsers.length} online
      </Text>
      <Group gap="xs">
        <Tooltip.Group openDelay={300} closeDelay={100}>
          {onlineUsers.slice(0, 5).map((u) => (
            <Tooltip key={u.id} label={u.name} withArrow>
              <div className="cursor-pointer">
                <UserAvatar name={u.name} avatar={u.avatar} size="sm" online />
              </div>
            </Tooltip>
          ))}
          {onlineUsers.length > 5 && (
            <Text size="xs" c="dimmed" fw={500}>
              +{onlineUsers.length - 5}
            </Text>
          )}
        </Tooltip.Group>
      </Group>
    </div>
  );
}
