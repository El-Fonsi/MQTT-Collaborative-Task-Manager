import mqtt from 'mqtt';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();
let client: mqtt.MqttClient | null = null;

const onlineUsers = new Map<string, Set<string>>();

export function getMqttClient(): mqtt.MqttClient {
  if (!client) throw new Error('MQTT client not connected');
  return client;
}

export function connectBroker() {
  client = mqtt.connect(config.mqtt.url, {
    username: config.mqtt.username || undefined,
    password: config.mqtt.password || undefined,
    clientId: `server_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');

    client!.subscribe('rooms/+/command', { qos: 1 });
    client!.subscribe('rooms/+/presence/+', { qos: 1 });

    console.log('[MQTT] Subscribed to rooms/+/command and rooms/+/presence/+');
  });

  client.on('message', async (topic, payload) => {
    const match = topic.match(/^rooms\/([^/]+)\/(.+)$/);
    if (!match) return;
    const roomId = match[1];
    const subtopic = match[2];

    try {
      if (subtopic === 'command') {
        await handleCommand(roomId, JSON.parse(payload.toString()));
      } else if (subtopic.startsWith('presence/')) {
        const userId = subtopic.split('/')[1];
        const status = payload.toString().trim();
        handlePresence(roomId, userId, status);
      }
    } catch (err) {
      console.error(`[MQTT] Error handling ${topic}:`, err);
    }
  });

  client.on('error', (err) => {
    console.error('[MQTT] Error:', err);
  });

  client.on('close', () => {
    console.log('[MQTT] Disconnected');
  });

  return client;
}

async function handleCommand(roomId: string, msg: { action: string; task?: any; taskId?: string }) {
  const { action, task, taskId } = msg;

  switch (action) {
    case 'create': {
      if (!task?.title) return;
      const created = await prisma.task.create({
        data: {
          title: task.title,
          description: task.description || '',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          assigneeId: task.assigneeId || null,
          roomId,
          order: Date.now(),
        },
        include: { assignee: { select: { id: true, name: true, avatar: true } } },
      });
      await publishFullTaskList(roomId);
      await publishTaskEvent(roomId, created.id, { action: 'create', task: created });
      break;
    }

    case 'update': {
      if (!taskId) return;
      const data: any = {};
      if (task.title !== undefined) data.title = task.title;
      if (task.description !== undefined) data.description = task.description;
      if (task.status !== undefined) data.status = task.status;
      if (task.priority !== undefined) data.priority = task.priority;
      data.assigneeId = task.assigneeId !== undefined ? task.assigneeId : null;
      if (task.order !== undefined) data.order = task.order;

      const updated = await prisma.task.update({
        where: { id: taskId },
        data,
        include: { assignee: { select: { id: true, name: true, avatar: true } } },
      });
      await publishFullTaskList(roomId);
      await publishTaskEvent(roomId, taskId, { action: 'update', task: updated });
      break;
    }

    case 'delete': {
      if (!taskId) return;
      await prisma.task.delete({ where: { id: taskId } });
      await publishFullTaskList(roomId);
      await publishTaskEvent(roomId, taskId, { action: 'delete', task: null });
      break;
    }

    case 'reorder': {
      if (!task?.tasks) return;
      for (const t of task.tasks) {
        await prisma.task.update({
          where: { id: t.id },
          data: { order: t.order, status: t.status },
        });
      }
      await publishFullTaskList(roomId);
      break;
    }
  }
}

function handlePresence(roomId: string, userId: string, status: string) {
  if (!onlineUsers.has(roomId)) {
    onlineUsers.set(roomId, new Set());
  }

  const roomPresence = onlineUsers.get(roomId)!;

  if (status === '1') {
    roomPresence.add(userId);
  } else {
    roomPresence.delete(userId);
  }

  publishOnlineUsers(roomId);
}

async function publishFullTaskList(roomId: string) {
  const tasks = await prisma.task.findMany({
    where: { roomId },
    include: { assignee: { select: { id: true, name: true, avatar: true } } },
    orderBy: { order: 'asc' },
  });

  const c = getMqttClient();
  c.publish(`rooms/${roomId}/tasks`, JSON.stringify(tasks), { qos: 1, retain: true });
}

async function publishTaskEvent(roomId: string, taskId: string, event: any) {
  const c = getMqttClient();
  c.publish(`rooms/${roomId}/task/${taskId}`, JSON.stringify(event), { qos: 1 });
}

async function publishOnlineUsers(roomId: string) {
  try {
    const roomPresence = onlineUsers.get(roomId);
    const onlineIds = roomPresence ? Array.from(roomPresence) : [];

    const members = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    if (!members) return;

    const online = members.members
      .filter((m) => onlineIds.includes(m.userId))
      .map((m) => m.user);

    const c = getMqttClient();
    c.publish(`rooms/${roomId}/users`, JSON.stringify(online), { qos: 1 });
  } catch (err) {
    console.error('[MQTT] Error publishing online users:', err);
  }
}
