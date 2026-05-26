import { useState, useCallback } from 'react';
import { Button, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore, type Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { GlassCard } from './GlassCard';

const COLUMNS = [
  { id: 'todo' as const, label: 'To Do', color: 'gray' },
  { id: 'in-progress' as const, label: 'In Progress', color: 'amber' },
  { id: 'done' as const, label: 'Done', color: 'green' },
  { id: 'finalized' as const, label: 'Finalized', color: 'purple' },
];

type Status = 'todo' | 'in-progress' | 'done' | 'finalized';

const colorDotMap: Record<string, string> = {
  gray: 'bg-gray-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
};

export function Board({ roomId, isOwner, members }: { roomId: string; isOwner: boolean; members?: { user: { id: string; name: string; avatar: string | null } }[] }) {
  const { tasks, getTasksByStatus, publishCommand } = useTaskStore();
  const user = useAuthStore((s) => s.user);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>('todo');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const canDragTask = (task: Task) => {
    if (task.status === 'finalized') return false;
    if (!task.assigneeId) return true;
    if (isOwner) return true;
    return task.assigneeId === user?.id;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (!task || !canDragTask(task)) return;
    if (task) setActiveTask(task);
  }, [tasks, user?.id, isOwner]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTaskData = tasks.find((t) => t.id === active.id);
    if (!activeTaskData || !canDragTask(activeTaskData)) return;

    const overId = over.id.toString();
    const overTask = tasks.find((t) => t.id === overId);
    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn?.id === 'finalized' && !isOwner) return;

    let newStatus = activeTaskData.status;
    let newOrder = activeTaskData.order;

    if (overColumn) {
      newStatus = overColumn.id;
      const columnTasks = getTasksByStatus(newStatus);
      newOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order + 1 : 0;
    } else if (overTask) {
      if (overTask.status === 'finalized') return;
      newStatus = overTask.status;
      const columnTasks = getTasksByStatus(newStatus);
      const overIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      newOrder = overIndex >= 0
        ? overIndex < columnTasks.length - 1
          ? (columnTasks[overIndex].order + columnTasks[overIndex + 1].order) / 2
          : columnTasks[overIndex].order + 1
        : 0;
    }

    const reorderedTasks = tasks.map((t) => {
      if (t.id === activeTaskData.id) {
        return { ...t, status: newStatus, order: newOrder };
      }
      if (t.status === newStatus && t.id !== activeTaskData.id && t.order >= newOrder) {
        return { ...t, order: t.order + 1 };
      }
      return t;
    });

    publishCommand(roomId, {
      action: 'reorder',
      task: {
        tasks: reorderedTasks.map((t) => ({ id: t.id, order: t.order, status: t.status })),
      },
    }, user?.id);
  }, [tasks, roomId, publishCommand, getTasksByStatus, user?.id, isOwner]);

  const handleCardClick = (task: Task) => {
    setEditingTask(task);
    open();
  };

  const handleAddTask = (status: Status) => {
    setEditingTask(null);
    setDefaultStatus(status);
    open();
  };

  const handleClose = () => {
    setEditingTask(null);
    close();
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 h-full overflow-x-auto pb-4 px-1">
          {COLUMNS.map((col) => {
            const columnTasks = getTasksByStatus(col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[280px] max-w-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${colorDotMap[col.color]}`} />
                    <Text fw={600} size="sm">{col.label}</Text>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  {col.id !== 'finalized' && (
                    <button
                      onClick={() => handleAddTask(col.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="column-bg rounded-xl p-3 flex-1 min-h-[200px]">
                  <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence>
                      {columnTasks.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-12 text-center"
                        >
                          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <Text size="sm" c="dimmed" mb="xs">No tasks yet</Text>
                        </motion.div>
                      ) : (
                        <div className="space-y-2">
                          {columnTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onClick={() => handleCardClick(task)} />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </SortableContext>
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <GlassCard className="!p-4 opacity-90 shadow-2xl rotate-3" hover>
              <Text fw={600} size="sm">{activeTask.title}</Text>
            </GlassCard>
          )}
        </DragOverlay>
      </DndContext>

      <TaskModal
        opened={opened}
        onClose={handleClose}
        roomId={roomId}
        task={editingTask}
        defaultStatus={defaultStatus}
        isOwner={isOwner}
        members={members}
      />
    </>
  );
}
