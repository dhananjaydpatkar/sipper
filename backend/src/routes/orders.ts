import { Router, Response } from 'express';
import { PrismaClient, Slot } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get user orders
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { page = '1', limit = '10', startDate, endDate } = req.query;

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);
  const skip = (pageNumber - 1) * limitNumber;

  const whereClause: any = { user_id: userId };

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate as string);
    if (endDate) whereClause.date.lte = new Date(endDate as string);
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      include: { coffee_type: true },
      orderBy: { date: 'desc' },
      skip,
      take: limitNumber
    }),
    prisma.order.count({ where: whereClause })
  ]);

  res.json({ orders, total, page: pageNumber, limit: limitNumber });
});

// Create daily order
router.post('/daily', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { coffee_type_id, slot, date } = req.body;

  if (!coffee_type_id || !slot || !date) {
    res.status(400).json({ error: 'coffee_type_id, slot, and date are required' });
    return;
  }

  try {
    const coffeeType = await prisma.coffeeType.findUnique({ where: { id: coffee_type_id } });
    if (!coffeeType) {
      res.status(404).json({ error: 'Coffee type not found' });
      return;
    }

    // Ensure date is parsed as YYYY-MM-DD to avoid timezone shifting when saving to @db.Date
    const dateStr = date.includes('T') ? date.split('T')[0] : date;
    const orderDate = new Date(dateStr);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC for comparison with @db.Date

    if (orderDate < today) {
      res.status(400).json({ error: 'Cannot place an order for a past date' });
      return;
    }

    // Check for existing order
    const existingOrder = await prisma.order.findFirst({
      where: {
        user_id: userId,
        date: orderDate,
        slot,
        status: { not: 'CANCELLED' }
      }
    });

    if (existingOrder) {
      res.status(409).json({ error: 'Order is already in place for this slot.' });
      return;
    }

    // Transaction to ensure balance and order creation are atomic
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          user_id: userId,
          coffee_type_id,
          slot,
          date: orderDate,
          price_at_order_time: coffeeType.current_price_inr
        }
      });

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount: coffeeType.current_price_inr,
          type: 'ORDER_DEDUCTION'
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: coffeeType.current_price_inr } }
      });
    });

    res.json({ message: 'Order placed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Create weekly order
router.post('/weekly', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { coffee_type_id, startDate } = req.body;

  if (!coffee_type_id || !startDate) {
    res.status(400).json({ error: 'coffee_type_id and startDate are required' });
    return;
  }

  try {
    const coffeeType = await prisma.coffeeType.findUnique({ where: { id: coffee_type_id } });
    if (!coffeeType) {
      res.status(404).json({ error: 'Coffee type not found' });
      return;
    }

    const startStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
    const start = new Date(startStr);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (start < today) {
      res.status(400).json({ error: 'Cannot place an order for a past week' });
      return;
    }

    // Check if any order already exists for this week
    const end = new Date(start);
    end.setDate(start.getDate() + 4);

    const existingOrders = await prisma.order.findFirst({
      where: {
        user_id: userId,
        date: {
          gte: start,
          lte: end
        },
        status: { not: 'CANCELLED' }
      }
    });

    if (existingOrders) {
      res.status(409).json({ error: 'Order is already in place for this week.' });
      return;
    }
    
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < 5; i++) { // Monday to Friday
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);

        // Order for 10 AM
        await tx.order.create({
          data: {
            user_id: userId,
            coffee_type_id,
            slot: Slot.AM_10,
            date: currentDate,
            price_at_order_time: coffeeType.current_price_inr
          }
        });

        // Order for 3 PM
        await tx.order.create({
          data: {
            user_id: userId,
            coffee_type_id,
            slot: Slot.PM_3,
            date: currentDate,
            price_at_order_time: coffeeType.current_price_inr
          }
        });

        const totalDailyCost = coffeeType.current_price_inr * 2;

        await tx.transaction.create({
          data: {
            user_id: userId,
            amount: totalDailyCost,
            type: 'ORDER_DEDUCTION'
          }
        });

        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: totalDailyCost } }
        });
      }
    });

    res.json({ message: 'Weekly orders placed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place weekly orders' });
  }
});

export default router;
