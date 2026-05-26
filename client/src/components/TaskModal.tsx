import { useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Select, Group, Button, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useTaskStore, type Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

interface TaskModalProps {
  opened: boolean;
  onClose: () => void;
  roomId: string;
  task?: Task | null;
  defaultStatus?: 'todo' | 'in-progress' | 'done' | 'finalized';
  isOwner?: boolean;
  members?: { user: { id: string; name: string; avatar: string | null } }[];
}

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const ownerStatusOptions = [
  ...statusOptions,
  { value: 'finalized', label: 'Finalized' },
];

export function TaskModal({ opened, onClose, roomId, task, defaultStatus = 'todo', isOwner, members }: TaskModalProps) {
  const publishCommand = useTaskStore((s) => s.publishCommand);
  const user = useAuthStore((s) => s.user);
  const [confirmUpdateOpened, { open: openConfirmUpdate, close: closeConfirmUpdate }] = useDisclosure(false);
  const [confirmDeleteOpened, { open: openConfirmDelete, close: closeConfirmDelete }] = useDisclosure(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done' | 'finalized'>(defaultStatus);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);

  const isFinalized = task?.status === 'finalized';
  const canEdit = !isFinalized && (
    !task?.assigneeId ||
    isOwner ||
    task.assigneeId === user?.id
  );

  const memberOptions = (members || []).map((m) => ({
    value: m.user.id,
    label: m.user.name,
  }));
  const assigneeOptions = [
    { value: '', label: 'Unassigned (anyone can edit)' },
    ...memberOptions,
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeId(task.assigneeId);
      setDeadline(task.deadline ? new Date(task.deadline) : null);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus(defaultStatus);
      setAssigneeId(user?.id || null);
      setDeadline(null);
    }
  }, [task, defaultStatus, opened, user?.id]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    if (task) {
      if (!canEdit) return;
      closeConfirmUpdate();
      publishCommand(roomId, {
        action: 'update',
        taskId: task.id,
        task: {
          title: title.trim(),
          description,
          priority,
          status,
          assigneeId: assigneeId || null,
          deadline: deadline ? deadline.toISOString() : null,
        },
      }, user?.id);
    } else {
      publishCommand(roomId, {
        action: 'create',
        task: {
          title: title.trim(),
          description,
          priority,
          status,
          assigneeId: assigneeId || null,
          deadline: deadline ? deadline.toISOString() : null,
        },
      }, user?.id);
    }

    onClose();
  };

  const handleSaveClick = () => {
    if (!title.trim()) return;
    if (task) {
      openConfirmUpdate();
    } else {
      handleSubmit();
    }
  };

  const handleDelete = () => {
    if (!task || !canEdit) return;
    publishCommand(roomId, { action: 'delete', taskId: task.id }, user?.id);
    closeConfirmDelete();
    onClose();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={isFinalized ? 'Task Details' : task ? 'Edit Task' : 'New Task'}
        size="md"
        centered
      >
        <div className="space-y-4">
          {isFinalized && (
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/20 mb-2">
              <Text size="sm" c="dimmed" className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This task is finalized and cannot be edited.
              </Text>
            </div>
          )}

          {!canEdit && !isFinalized && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 mb-2">
              <Text size="sm" c="dimmed" className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
                </svg>
                This task is assigned to another member. Only the owner and the assigned member can edit it.
              </Text>
            </div>
          )}

          {(task?.startDate || task?.createdAt) && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
              <Text size="xs" c="dimmed" fw={500} className="mb-1">START DATE</Text>
              <Text size="sm">{dayjs(task!.startDate || task!.createdAt).format('MMM D, YYYY h:mm A')}</Text>
            </div>
          )}

          <TextInput
            label="Title"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            autoFocus
            disabled={!canEdit}
          />

          <Textarea
            label="Description"
            placeholder="Add details..."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={3}
            disabled={!canEdit}
          />

          <Group grow>
            <Select
              label="Priority"
              data={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
              value={priority}
              onChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}
              disabled={!canEdit}
            />
            <Select
              label="Status"
              data={isOwner ? ownerStatusOptions : statusOptions}
              value={status}
              onChange={(v) => setStatus(v as any)}
              disabled={!canEdit}
            />
          </Group>

          <Group grow>
            <Select
              label="Assignee"
              placeholder="Select a member"
              data={assigneeOptions}
              value={assigneeId || ''}
              onChange={(v) => setAssigneeId(v || null)}
              disabled={!canEdit || !isOwner}
              clearable
            />
            <DateInput
              label="Deadline"
              placeholder="Set a deadline"
              value={deadline}
              onChange={setDeadline}
              valueFormat="MMM D, YYYY"
              disabled={!canEdit}
              clearable
            />
          </Group>

          <Group mt="xl">
            {!canEdit ? (
              <Button variant="subtle" onClick={onClose}>Close</Button>
            ) : (
              <>
                <Button
                  onClick={handleSaveClick}
                  className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
                >
                  {task ? 'Save Changes' : 'Create Task'}
                </Button>
                {task && (
                  <Button color="red" variant="light" onClick={openConfirmDelete}>
                    Delete
                  </Button>
                )}
                <Button variant="subtle" onClick={onClose}>Cancel</Button>
              </>
            )}
          </Group>
        </div>
      </Modal>

      <Modal opened={confirmUpdateOpened} onClose={closeConfirmUpdate} title="Save Changes" size="sm" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to save changes to <strong>"{task?.title}"</strong>?
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={closeConfirmUpdate}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">Save</Button>
        </Group>
      </Modal>

      <Modal opened={confirmDeleteOpened} onClose={closeConfirmDelete} title="Delete Task" size="sm" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to delete <strong>"{task?.title}"</strong>? This cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={closeConfirmDelete}>Cancel</Button>
          <Button color="red" onClick={handleDelete}>Delete</Button>
        </Group>
      </Modal>
    </>
  );
}
