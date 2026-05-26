import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getMqttClient } from '../mqtt/broker';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const room = await prisma.room.create({
      data: {
        name,
        ownerId: req.userId!,
        inviteCode: uuidv4().slice(0, 8).toUpperCase(),
        members: { create: { userId: req.userId! } },
      },
      include: { members: true },
    });

    res.status(201).json(room);
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join', async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

    const room = await prisma.room.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const existing = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: req.userId!, roomId: room.id } },
    });
    if (existing) return res.status(409).json({ error: 'Already a member' });

    const pending = await prisma.roomJoinRequest.findUnique({
      where: { userId_roomId: { userId: req.userId!, roomId: room.id } },
    });
    if (pending?.status === 'pending') return res.status(409).json({ error: 'Join request already sent' });

    let request: any;
    if (pending?.status === 'declined') {
      request = await prisma.roomJoinRequest.update({
        where: { id: pending.id },
        data: { status: 'pending' },
        include: { room: { select: { name: true } }, user: { select: { id: true, name: true, avatar: true } } },
      });
    } else {
      request = await prisma.roomJoinRequest.create({
        data: { userId: req.userId!, roomId: room.id },
        include: { room: { select: { name: true } }, user: { select: { id: true, name: true, avatar: true } } },
      });
    }

    try {
      const mqtt = getMqttClient();
      mqtt.publish(`users/${room.ownerId}/join-request`, JSON.stringify({
        id: request.id,
        userId: request.userId,
        roomId: request.roomId,
        status: request.status,
        createdAt: request.createdAt,
        user: request.user,
        room: { id: room.id, name: room.name },
      }), { qos: 1 });
    } catch {}

    res.json({ message: 'Join request sent', request });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/requests/:requestId/approve', async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.roomJoinRequest.findUnique({
      where: { id: req.params.requestId },
      include: { room: true },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.room.ownerId !== req.userId) return res.status(403).json({ error: 'Only the room owner can approve requests' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    await prisma.roomMember.create({
      data: { userId: request.userId, roomId: request.roomId },
    });

    const updated = await prisma.roomJoinRequest.update({
      where: { id: request.id },
      data: { status: 'approved' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });
    await prisma.activityLog.create({
      data: {
        roomId: request.roomId,
        userId: request.userId,
        userName: updated.user.name,
        action: 'member_joined',
        details: JSON.stringify({ approvedBy: me?.name || 'Owner' }),
      },
    });

    const mqtt = getMqttClient();
    mqtt.publish(`users/${request.userId}/join-approval`, JSON.stringify({ roomId: request.roomId, roomName: request.room.name }), { qos: 1 });

    res.json(updated);
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/requests/:requestId/decline', async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.roomJoinRequest.findUnique({
      where: { id: req.params.requestId },
      include: { room: true },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.room.ownerId !== req.userId) return res.status(403).json({ error: 'Only the room owner can decline requests' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    const updated = await prisma.roomJoinRequest.update({
      where: { id: request.id },
      data: { status: 'declined' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error('Decline request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const ownedRoomIds = await prisma.room.findMany({
      where: { ownerId: req.userId! },
      select: { id: true },
    });

    const requests = await prisma.roomJoinRequest.findMany({
      where: {
        roomId: { in: ownedRoomIds.map((r) => r.id) },
        status: 'pending',
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { members: { some: { userId: req.userId! } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        _count: { select: { tasks: true } },
      },
    });

    const enriched = rooms.map((room) => ({
      ...room,
      isOwner: room.ownerId === req.userId,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:roomId/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.userId) return res.status(403).json({ error: 'Only the room owner can remove members' });
    if (req.params.userId === req.userId) return res.status(400).json({ error: 'You cannot remove yourself' });

    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: req.params.userId, roomId: req.params.roomId } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await prisma.roomMember.delete({ where: { id: member.id } });

    await prisma.task.updateMany({
      where: { roomId: req.params.roomId, assigneeId: req.params.userId },
      data: { assigneeId: null },
    });

    const removedUser = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { name: true } });
    const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });
    await prisma.activityLog.create({
      data: {
        roomId: req.params.roomId,
        userId: req.userId!,
        userName: me?.name || 'Owner',
        action: 'member_removed',
        details: JSON.stringify({ removedUser: removedUser?.name || '' }),
      },
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:roomId/activity', async (req: AuthRequest, res: Response) => {
  try {
    const isMember = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: req.userId!, roomId: req.params.roomId } },
    });
    if (!isMember) return res.status(403).json({ error: 'Not a member of this room' });

    const logs = await prisma.activityLog.findMany({
      where: { roomId: req.params.roomId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        tasks: {
          include: { assignee: { select: { id: true, name: true, avatar: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isMember = room.members.some(m => m.userId === req.userId);
    if (!isMember) return res.status(403).json({ error: 'Not a member of this room' });

    res.json({ ...room, isOwner: room.ownerId === req.userId });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
