import { Router } from 'express';
import { readDb } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = await readDb();
    // Return latest first
    const logs = [...db.inferenceLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
