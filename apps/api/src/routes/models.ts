import { Router } from 'express';
import { MODEL_CATALOG } from '@veritas/shared';
import { getLeaderboard } from '../services/leaderboard';

const router = Router();

router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err: any) {
    console.error('Failed to get leaderboard:', err);
    res.status(500).json({ error: err.message || 'Failed to get leaderboard' });
  }
});

router.get('/', (req, res) => {
  res.json(MODEL_CATALOG);
});

export default router;
