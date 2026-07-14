import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireAdmin);

// Get aggregated orders for a specific date and slot
router.get('/orders/aggregate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, slot } = req.query;

  if (!date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }

  // 'date' is YYYY-MM-DD. Parsing it directly creates 00:00:00 UTC, which perfectly matches @db.Date in Prisma
  const parsedDate = new Date(date as string);

  try {
    const whereClause: any = {
      date: parsedDate,
      status: { not: 'CANCELLED' }
    };
    if (slot) {
      whereClause.slot = slot;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            phone_number: true
          }
        },
        coffee_type: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Format response
    const detailedOrders = orders.map(o => ({
      id: o.id,
      user_name: o.user.name,
      user_phone: o.user.phone_number,
      coffee_type: o.coffee_type.name,
      slot: o.slot,
      status: o.status,
      created_at: o.createdAt
    }));

    res.json({
      total: detailedOrders.length,
      orders: detailedOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch aggregated orders' });
  }
});

// Get users with pending balances
router.get('/users/balances', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { balance: { gt: 0 } },
      select: {
        id: true,
        name: true,
        phone_number: true,
        balance: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user balances' });
  }
});

// Mark an individual order as completed (delivered)
router.post('/orders/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params.id as string;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'PENDING' && order.status !== 'PREPARED') {
      throw new Error('Order cannot be marked as completed');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC for comparison with @db.Date

    if (order.date > today) {
      throw new Error('Cannot complete an order scheduled for a future date');
    }
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' }
    });
    res.json({ message: 'Order marked as completed.' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to complete order' });
  }
});

// Settle an individual order
router.post('/orders/:id/settle', async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params.id as string;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'COMPLETED') {
        throw new Error('Order must be completed before settling');
      }

      const user = await tx.user.findUnique({ where: { id: order.user_id } });
      if (!user) {
        throw new Error('User not found');
      }

      // Mark order as SETTLED
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'SETTLED' }
      });

      // Deduct order cost from user balance
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: order.price_at_order_time } }
      });

      // Add a settlement transaction specifically for this order
      await tx.transaction.create({
        data: {
          user_id: user.id,
          amount: order.price_at_order_time,
          type: 'OFFLINE_SETTLEMENT'
        }
      });
    });

    res.json({ message: 'Order marked as complete and settled.' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to settle order' });
  }
});

// Settle a user's account
router.post('/users/:id/settle', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params.id as string;
  const { amount } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.balance <= 0) return;

      // Settle provided amount, or full balance if amount is not provided
      const amountToSettle = amount ? parseFloat(amount) : user.balance;

      if (amountToSettle > user.balance || amountToSettle <= 0) {
        throw new Error('Invalid settlement amount');
      }

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount: amountToSettle,
          type: 'OFFLINE_SETTLEMENT'
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amountToSettle } }
      });

      // Find the oldest COMPLETED orders and mark them as SETTLED until amountToSettle is exhausted
      let remainingAmount = amountToSettle;
      const completedOrders = await tx.order.findMany({
        where: { user_id: userId, status: 'COMPLETED' },
        orderBy: { date: 'asc' }
      });

      for (const order of completedOrders) {
        if (remainingAmount >= order.price_at_order_time) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'SETTLED' }
          });
          remainingAmount -= order.price_at_order_time;
        } else {
          break; // Not enough remaining settlement to fully settle the next order
        }
      }
    });

    res.json({ message: 'Account settled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to settle account' });
  }
});

// Update coffee pricing
router.put('/pricing', async (req: AuthRequest, res: Response): Promise<void> => {
  const { coffee_type_id, next_price_inr, effective_date } = req.body;

  if (!coffee_type_id || !next_price_inr || !effective_date) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    await prisma.coffeeType.update({
      where: { id: coffee_type_id },
      data: {
        next_price_inr: parseFloat(next_price_inr),
        next_price_effective_date: new Date(effective_date)
      }
    });

    res.json({ message: 'Pricing updated successfully for the next business day' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});
// Get settlement logs
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', startDate, endDate, userName } = req.query;

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);
  const skip = (pageNumber - 1) * limitNumber;

  const whereClause: any = { type: 'OFFLINE_SETTLEMENT' };

  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) whereClause.created_at.gte = new Date(startDate as string);
    if (endDate) whereClause.created_at.lte = new Date(endDate as string);
  }

  if (userName) {
    whereClause.user = {
      name: {
        contains: userName as string,
        mode: 'insensitive'
      }
    };
  }

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: { user: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNumber
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      user_name: (t as any).user.name,
      amount: t.amount,
      date: t.created_at
    }));

    res.json({ transactions: formattedTransactions, total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});


export default router;
