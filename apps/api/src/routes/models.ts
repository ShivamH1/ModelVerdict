import { Router } from 'express';
import { MODEL_CATALOG } from '@veritas/shared';

const router = Router();

router.get('/', (req, res) => {
  res.json(MODEL_CATALOG);
});

export default router;
