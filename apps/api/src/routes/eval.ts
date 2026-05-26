import { Router } from 'express';
import { startEvaluation, getEvaluationStatus, getEvaluationHistory } from '../services/evaluation';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

router.post('/run', async (req, res) => {
  try {
    const { modelIdA, modelIdB, testSize } = req.body;
    const runId = await startEvaluation(modelIdA, modelIdB, testSize || 10);
    res.json({ runId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start evaluation' });
  }
});

router.get('/status', (req, res) => {
  // Ideally, frontend should pass runId in query, but for simple MVP we fetch any active
  const status = getEvaluationStatus(); // In real app, pass runId
  res.json(status);
});

router.get('/history', async (req, res) => {
  const history = await getEvaluationHistory();
  res.json(history);
});

router.get('/report/:runId', async (req, res) => {
  try {
    const reportPath = path.join(process.cwd(), 'data', `${req.params.runId}.json`);
    const data = await fs.readFile(reportPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Report not found' });
  }
});

export default router;
