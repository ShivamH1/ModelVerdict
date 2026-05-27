import { Router } from 'express';
import { startEvaluation, getEvaluationStatus, getEvaluationHistory } from '../services/evaluation';
import { prisma } from '../db';
import { calculateMetrics } from '@veritas/evaluator';
import { MODEL_CATALOG, EvalResult } from '@veritas/shared';

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
  const status = getEvaluationStatus(); 
  res.json(status);
});

router.get('/history', async (req, res) => {
  const history = await getEvaluationHistory();
  res.json(history);
});

router.get('/report/:runId', async (req, res) => {
  try {
    const run = await prisma.evalRun.findUnique({ where: { id: req.params.runId } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    
    const results = await prisma.evalResult.findMany({ where: { runId: run.id } });
    
    if (results.length === 0) {
      if (run.status === 'running') {
        return res.json({ error: 'Evaluation run is still in progress', status: 'running' });
      }
      return res.status(404).json({ error: 'Results not found' });
    }
    
    const modelIdA = results[0].modelIdA;
    const modelIdB = results[0].modelIdB;
    const modelA = MODEL_CATALOG.find(m => m.id === modelIdA);
    const modelB = MODEL_CATALOG.find(m => m.id === modelIdB);
    
    if (!modelA || !modelB) return res.status(500).json({ error: 'Models not found in catalog' });

    const typedResults = results as unknown as EvalResult[];
    
    const metricsA = calculateMetrics(modelIdA, modelA.name, typedResults, true);
    const metricsB = calculateMetrics(modelIdB, modelB.name, typedResults, false);
    
    res.json({
      run,
      metricsA,
      metricsB,
      results: typedResults
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
