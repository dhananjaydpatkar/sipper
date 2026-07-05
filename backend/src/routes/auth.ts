import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

router.post('/pin-signup', async (req: Request, res: Response): Promise<void> => {
  const { phone_number, name, pin } = req.body;

  if (!phone_number || !name || !pin) {
    res.status(400).json({ error: 'Phone number, name, and PIN are required' });
    return;
  }

  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    res.status(400).json({ error: 'PIN must be exactly 6 digits' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone_number } });
  if (existing) {
    res.status(400).json({ error: 'User already exists. Please log in.' });
    return;
  }

  const hashedPin = await bcrypt.hash(pin, 10);

  const user = await prisma.user.create({
    data: { phone_number, name, pin: hashedPin },
  });

  const token = jwt.sign(
    { id: user.id, phone_number: user.phone_number, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone_number: user.phone_number,
      role: user.role,
      balance: user.balance
    }
  });
});

router.post('/pin-login', async (req: Request, res: Response): Promise<void> => {
  const { phone_number, pin } = req.body;

  if (!phone_number || !pin) {
    res.status(400).json({ error: 'Phone number and PIN are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone_number } });
  if (!user) {
    res.status(401).json({ error: 'Invalid phone number or PIN' });
    return;
  }

  if (!user.pin) {
    res.status(400).json({ error: 'No PIN set for this account. Please contact an admin.' });
    return;
  }

  const isValid = await bcrypt.compare(pin, user.pin);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid phone number or PIN' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, phone_number: user.phone_number, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone_number: user.phone_number,
      role: user.role,
      balance: user.balance
    }
  });
});

router.put('/update-pin', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { old_pin, new_pin } = req.body;

  if (!old_pin || !new_pin) {
    res.status(400).json({ error: 'Old PIN and New PIN are required' });
    return;
  }

  if (new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
    res.status(400).json({ error: 'New PIN must be exactly 6 digits' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.pin) {
    res.status(400).json({ error: 'No PIN set for this account' });
    return;
  }

  const isValid = await bcrypt.compare(old_pin, user.pin);
  if (!isValid) {
    res.status(401).json({ error: 'Incorrect Old PIN' });
    return;
  }

  const hashedNewPin = await bcrypt.hash(new_pin, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { pin: hashedNewPin }
  });

  res.json({ message: 'PIN updated successfully' });
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    phone_number: user.phone_number,
    role: user.role,
    balance: user.balance
  });
});

export default router;
