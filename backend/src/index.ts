import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import { PrismaClient } from '@prisma/client';

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const checkAndApplyPricingUpdates = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const coffeeTypesToUpdate = await prisma.coffeeType.findMany({
      where: {
        next_price_effective_date: { lte: today },
        next_price_inr: { not: null }
      }
    });

    for (const ct of coffeeTypesToUpdate) {
      await prisma.coffeeType.update({
        where: { id: ct.id },
        data: {
          current_price_inr: ct.next_price_inr!,
          next_price_inr: null,
          next_price_effective_date: null
        }
      });
      console.log(`Updated price for ${ct.name} to ${ct.next_price_inr}`);
    }
  } catch (error) {
    console.error('Failed to apply pricing updates:', error);
  }
};

checkAndApplyPricingUpdates();

app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/coffee-types', async (req, res) => {
  const types = await prisma.coffeeType.findMany();
  res.json(types);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
