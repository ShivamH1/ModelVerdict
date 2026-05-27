import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.inferenceLog.findMany({
        where: { 
          status: 'success',
          OR: [
            { inputTokens: { gt: 0 } },
            { outputTokens: { gt: 0 } }
          ]
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      prisma.inferenceLog.count({
        where: { 
          status: 'success',
          OR: [
            { inputTokens: { gt: 0 } },
            { outputTokens: { gt: 0 } }
          ]
        }
      })
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
