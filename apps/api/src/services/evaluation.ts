import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { EvalRun, EvalResult, EvalSuiteReport, MODEL_CATALOG, ALL_PROMPTS } from '@veritas/shared';
import { generateResponse } from '@veritas/llm-client';
import { runJudge, calculateMetrics } from '@veritas/evaluator';
import { broadcast } from './websocket';

// In-memory state for current runs
const activeRuns = new Map<string, { currentPromptId: string; currentIndex: number; total: number }>();

export async function startEvaluation(modelIdA: string, modelIdB: string, testSize: number): Promise<string> {
  const runId = `run-${uuidv4()}`;
  
  await prisma.evalRun.create({
    data: {
      id: runId,
      status: 'running',
    }
  });

  activeRuns.set(runId, { currentPromptId: '', currentIndex: 0, total: testSize });

  // Start background process
  runEvaluation(runId, modelIdA, modelIdB, testSize).catch(console.error);

  // Broadcast initial start status
  broadcast('status', {
    runId,
    status: 'running',
    currentPromptId: '',
    currentPromptIndex: 0,
    totalPrompts: testSize
  });

  return runId;
}

export function getEvaluationStatus(runId?: string) {
  if (runId && activeRuns.has(runId)) {
    const state = activeRuns.get(runId)!;
    return { status: 'running', currentPromptId: state.currentPromptId, currentPromptIndex: state.currentIndex, totalPrompts: state.total };
  } else if (!runId && activeRuns.size > 0) {
    const [firstRunId, state] = activeRuns.entries().next().value!;
    return { status: 'running', runId: firstRunId, currentPromptId: state.currentPromptId, currentPromptIndex: state.currentIndex, totalPrompts: state.total };
  }
  return { status: 'complete' };
}

export async function getEvaluationHistory() {
  return await prisma.evalRun.findMany({
    orderBy: { startedAt: 'desc' }
  });
}

// Background worker
async function runEvaluation(runId: string, modelIdA: string, modelIdB: string, testSize: number) {
  try {
    const modelA = MODEL_CATALOG.find(m => m.id === modelIdA)!;
    const modelB = MODEL_CATALOG.find(m => m.id === modelIdB)!;
    
    const testPrompts = [...ALL_PROMPTS].sort(() => 0.5 - Math.random()).slice(0, testSize);
    const results: EvalResult[] = [];

    for (let i = 0; i < testPrompts.length; i++) {
      const promptDef = testPrompts[i];
      activeRuns.set(runId, { currentPromptId: promptDef.id, currentIndex: i + 1, total: testSize });

      // Broadcast progress event
      broadcast('status', {
        runId,
        status: 'running',
        currentPromptId: promptDef.id,
        currentPromptIndex: i + 1,
        totalPrompts: testSize
      });

      try {
        const [resA, resB] = await Promise.all([
          generateResponse(modelA, promptDef.prompt, []).catch(e => ({ content: `ERROR: ${e.message}`, latencyMs: 0 })),
          generateResponse(modelB, promptDef.prompt, []).catch(e => ({ content: `ERROR: ${e.message}`, latencyMs: 0 }))
        ]);

        const judgeScores = await runJudge(promptDef.prompt, resA.content, resB.content, promptDef.category as any);

        const evalResult = await prisma.evalResult.create({
          data: {
            id: `res-${uuidv4()}`,
            runId,
            promptId: promptDef.id,
            category: promptDef.category,
            prompt: promptDef.prompt,
            expectedBehavior: promptDef.expected || promptDef.expected_behavior,
            modelIdA,
            modelIdB,
            responseA: resA.content,
            responseB: resB.content,
            scoresA: judgeScores.scoresA as any,
            scoresB: judgeScores.scoresB as any,
            latencyMsA: (resA as any).latencyMs || 0,
            latencyMsB: (resB as any).latencyMs || 0
          }
        });
        
        results.push(evalResult as unknown as EvalResult);

      } catch (e) {
        console.error(`Error processing prompt ${promptDef.id}:`, e);
      }
    }

    activeRuns.delete(runId);
    
    await prisma.evalRun.update({
      where: { id: runId },
      data: {
        status: 'complete',
        completedAt: new Date()
      }
    });

    // Broadcast final complete status
    broadcast('status', {
      runId,
      status: 'complete',
      currentPromptId: '',
      currentPromptIndex: testSize,
      totalPrompts: testSize
    });
  } catch (error: any) {
    console.error(`Evaluation run ${runId} failed:`, error);
    activeRuns.delete(runId);
    try {
      await prisma.evalRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          completedAt: new Date()
        }
      });
    } catch (dbErr) {
      console.error('Failed to update eval status in database:', dbErr);
    }
    broadcast('status', {
      runId,
      status: 'failed',
      currentPromptId: '',
      currentPromptIndex: 0,
      totalPrompts: testSize,
      error: error.message || 'Unknown error occurred during evaluation'
    });
  }
}
