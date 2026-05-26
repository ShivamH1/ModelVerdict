import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb } from '../db';
import { EvalRun, EvalResult, EvalSuiteReport, MODEL_CATALOG, ALL_PROMPTS } from '@veritas/shared';
import { generateResponse } from '@veritas/llm-client';
import { runJudge, calculateMetrics } from '@veritas/evaluator';

// In-memory state for current runs
const activeRuns = new Map<string, { currentPromptId: string; currentIndex: number; total: number }>();

export async function startEvaluation(modelIdA: string, modelIdB: string, testSize: number): Promise<string> {
  const runId = `run-${uuidv4()}`;
  
  const db = await readDb();
  db.evalRuns.push({
    id: runId,
    status: 'running',
    startedAt: new Date().toISOString()
  });
  await writeDb(db);

  activeRuns.set(runId, { currentPromptId: '', currentIndex: 0, total: testSize });

  // Start background process
  runEvaluation(runId, modelIdA, modelIdB, testSize).catch(console.error);

  return runId;
}

export function getEvaluationStatus(runId?: string) {
  if (runId && activeRuns.has(runId)) {
    const state = activeRuns.get(runId)!;
    return { status: 'running', currentPromptId: state.currentPromptId, currentPromptIndex: state.currentIndex, totalPrompts: state.total };
  }
  // Look up latest in DB if not in memory
  return { status: 'complete' }; // Fallback
}

export async function getEvaluationHistory() {
  const db = await readDb();
  return db.evalRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

// Background worker
async function runEvaluation(runId: string, modelIdA: string, modelIdB: string, testSize: number) {
  const modelA = MODEL_CATALOG.find(m => m.id === modelIdA)!;
  const modelB = MODEL_CATALOG.find(m => m.id === modelIdB)!;
  
  // Select a subset of prompts
  const testPrompts = [...ALL_PROMPTS].sort(() => 0.5 - Math.random()).slice(0, testSize);
  const results: EvalResult[] = [];

  for (let i = 0; i < testPrompts.length; i++) {
    const promptDef = testPrompts[i];
    activeRuns.set(runId, { currentPromptId: promptDef.id, currentIndex: i + 1, total: testSize });

    try {
      // 1. Generate parallel responses
      const [resA, resB] = await Promise.all([
        generateResponse(modelA, promptDef.prompt, []).catch(e => ({ content: `ERROR: ${e.message}`, latencyMs: 0 })),
        generateResponse(modelB, promptDef.prompt, []).catch(e => ({ content: `ERROR: ${e.message}`, latencyMs: 0 }))
      ]);

      // 2. Run LLM-as-a-Judge
      const judgeScores = await runJudge(promptDef.prompt, resA.content, resB.content, promptDef.category as any);

      results.push({
        id: `res-${uuidv4()}`,
        runId,
        promptId: promptDef.id,
        category: promptDef.category as any,
        prompt: promptDef.prompt,
        expectedBehavior: promptDef.expected || promptDef.expected_behavior,
        modelIdA,
        modelIdB,
        responseA: resA.content,
        responseB: resB.content,
        scoresA: judgeScores.scoresA,
        scoresB: judgeScores.scoresB,
        latencyMsA: (resA as any).latencyMs || 0,
        latencyMsB: (resB as any).latencyMs || 0
      });

    } catch (e) {
      console.error(`Error processing prompt ${promptDef.id}:`, e);
    }
  }

  // Finalize run
  activeRuns.delete(runId);
  const db = await readDb();
  
  const runIndex = db.evalRuns.findIndex(r => r.id === runId);
  if (runIndex !== -1) {
    db.evalRuns[runIndex].status = 'complete';
    db.evalRuns[runIndex].completedAt = new Date().toISOString();
    await writeDb(db);
  }

  // Save report data somewhere (for simplicity, we'll keep it in memory or write to a file, 
  // but to adhere to the requested schema, we should save results to DB or a separate file.
  // For the sake of this mock demo, we can just save it to db.json as part of a new collection).
  // I will just add an ad-hoc write for the report JSON.
  const fs = require('fs').promises;
  const path = require('path');
  
  const metricsA = calculateMetrics(modelIdA, modelA.name, results, true);
  const metricsB = calculateMetrics(modelIdB, modelB.name, results, false);
  
  const report: EvalSuiteReport = {
    run: db.evalRuns[runIndex],
    metricsA,
    metricsB,
    results
  };

  const reportPath = path.join(process.cwd(), 'data', `${runId}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
}
