import { Badge, Text } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { GlassCard } from './GlassCard';
import { UserAvatar } from './UserAvatar';
import type { Task } from '../store/taskStore';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          'task-card',
          isDragging && 'opacity-50 scale-105 shadow-xl z-50',
        )}
      >
        <GlassCard hover onClick={onClick} className="!p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <Text fw={600} size="sm" className="flex-1 leading-snug" lineClamp={2}>
              {task.title}
            </Text>
            <Badge
              color={priorityColors[task.priority]}
              variant="light"
              size="sm"
              className="shrink-0"
            >
              {priorityLabels[task.priority]}
            </Badge>
          </div>

          {task.description && (
            <Text size="xs" c="dimmed" lineClamp={2} mb="sm" className="leading-relaxed">
              {task.description}
            </Text>
          )}

          {task.assignee && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <UserAvatar name={task.assignee.name} avatar={task.assignee.avatar} size="sm" showDot={false} />
              <Text size="xs" c="dimmed">{task.assignee.name}</Text>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
