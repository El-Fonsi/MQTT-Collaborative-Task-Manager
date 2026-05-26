import { useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Select, Group, Button, Text } from '@mantine/core';
import { useTaskStore, type Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';

interface TaskModalProps {
  opened: boolean;
  onClose: () => void;
  roomId: string;
  task?: Task | null;
  defaultStatus?: 'todo' | 'in-progress' | 'done';
}

export function TaskModal({ opened, onClose, roomId, task, defaultStatus = 'todo' }: TaskModalProps) {
  const publishCommand = useTaskStore((s) => s.publishCommand);
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState(defaultStatus);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus(defaultStatus);
    }
  }, [task, defaultStatus, opened]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    if (task) {
      publishCommand(roomId, {
        action: 'update',
        taskId: task.id,
        task: {
          title: title.trim(),
          description,
          priority,
          status,
          assigneeId: task.assigneeId || user?.id,
        },
      });
    } else {
      publishCommand(roomId, {
        action: 'create',
        task: {
          title: title.trim(),
          description,
          priority,
          status,
          assigneeId: user?.id,
        },
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    publishCommand(roomId, { action: 'delete', taskId: task.id });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      size="md"
      centered
    >
      <div className="space-y-4">
        <TextInput
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          autoFocus
        />

        <Textarea
          label="Description"
          placeholder="Add details..."
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
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
          />
          <Select
            label="Status"
            data={[
              { value: 'todo', label: 'To Do' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'done', label: 'Done' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as 'todo' | 'in-progress' | 'done')}
          />
        </Group>

        <Group mt="xl">
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
          >
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
          {task && (
            <Button color="red" variant="light" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
        </Group>
      </div>
    </Modal>
  );
}
