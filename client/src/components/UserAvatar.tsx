import { Avatar } from '@mantine/core';
import clsx from 'clsx';

interface UserAvatarProps {
  name: string;
  avatar?: string | null;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const sizeMap = { sm: 28, md: 36, lg: 44 };

export function UserAvatar({ name, avatar, online, size = 'md', showDot = true }: UserAvatarProps) {
  const initials = (name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative inline-flex">
      <Avatar
        src={avatar}
        alt={name}
        size={sizeMap[size]}
        color="indigo"
        className="ring-2 ring-white dark:ring-gray-800"
      >
        {initials}
      </Avatar>
      {showDot && online && (
        <span
          className={clsx(
            'presence-dot absolute -bottom-0.5 -right-0.5',
          )}
        />
      )}
    </div>
  );
}
