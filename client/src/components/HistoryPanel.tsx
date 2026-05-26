import { useEffect, useState } from 'react';
import { Modal, Text, Button } from '@mantine/core';
import api from '../lib/api';

interface ActivityEntry {
  id: string;
  userName: string;
  action: string;
  details: string | null;
  createdAt: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  task_created: { label: 'created a task', color: 'text-green-600 dark:text-green-400' },
  task_updated: { label: 'updated a task', color: 'text-blue-600 dark:text-blue-400' },
  task_deleted: { label: 'deleted a task', color: 'text-red-600 dark:text-red-400' },
  task_reordered: { label: 'reordered tasks', color: 'text-indigo-600 dark:text-indigo-400' },
  member_joined: { label: 'joined the room', color: 'text-cyan-600 dark:text-cyan-400' },
  member_removed: { label: 'removed a member', color: 'text-orange-600 dark:text-orange-400' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function HistoryPanel({ roomId, opened, onClose }: { roomId: string; opened: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    api.get(`/rooms/${roomId}/activity`)
      .then(({ data }) => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [roomId, opened]);

  return (
    <Modal opened={opened} onClose={onClose} title="Activity History" size="md" centered>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Text size="sm" c="dimmed" className="text-center py-8">No activity yet</Text>
      ) : (
        <div className="space-y-0 max-h-96 overflow-y-auto">
          {logs.map((entry, i) => {
            const meta = actionLabels[entry.action] || { label: entry.action, color: 'text-gray-600' };
            let detail = '';
            try {
              if (entry.details) {
                const d = JSON.parse(entry.details);
                detail = d.title || d.removedUser || '';
              }
            } catch {}
            return (
              <div key={entry.id} className="flex gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mt-2" />
                  {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Text size="sm">
                    <span className="font-medium">{entry.userName}</span>{' '}
                    <span className={meta.color}>{meta.label}</span>
                    {detail && <span className="text-gray-500"> — "{detail}"</span>}
                  </Text>
                  <Text size="xs" c="dimmed">{formatTime(entry.createdAt)}</Text>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
