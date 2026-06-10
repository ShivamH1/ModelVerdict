import { Router } from 'express';
import { createSession, getSession, updateSession } from '../services/arena';
import { generateResponse } from '@veritas/llm-client';
import { MODEL_CATALOG } from '@veritas/shared';
import { logInference } from '../services/logging';
import { checkInputGuardrail, checkOutputGuardrail } from '../guardrails';
import { computeEloDeltaForSession } from '../services/leaderboard';

const router = Router();

function friendlyError(err: any): string {
  const status = err.status || err.response?.status;
  if (status === 429 || (err.message && err.message.includes('rate limited'))) {
    return 'This model is currently rate-limited. The other model is still available — vote for it or retry.';
  }
  if (status === 503 || status === 502) {
    return 'Model service temporarily unavailable. Please retry in a moment.';
  }
  if (err.message && err.message.includes('All providers exhausted')) {
    return 'All providers are busy right now. Please retry in a moment.';
  }
  return 'Model did not respond. Please retry.';
}

router.post('/init', async (req, res) => {
  try {
    const session = await createSession();
    res.json(session);
  } catch (err) {
    console.error('Failed to initialize session:', err);
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

router.post('/:id/chat', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { prompt, customApiKey, customBaseUrl, customModelName } = req.body;

    const inputCheck = checkInputGuardrail(prompt);

    const modelA = MODEL_CATALOG.find(m => m.id === session.modelIdA)!;
    const modelB = MODEL_CATALOG.find(m => m.id === session.modelIdB)!;

    if (inputCheck.triggered) {
      const msgA = { id: `msg-${Date.now()}-A`, role: 'assistant', content: 'Blocked by input guardrail.', guardrailTriggered: { type: 'input', reason: inputCheck.reason } };
      const msgB = { id: `msg-${Date.now()}-B`, role: 'assistant', content: 'Blocked by input guardrail.', guardrailTriggered: { type: 'input', reason: inputCheck.reason } };

      session.messagesA.push({ id: `usr-${Date.now()}-A`, role: 'user', content: prompt });
      session.messagesB.push({ id: `usr-${Date.now()}-B`, role: 'user', content: prompt });
      session.messagesA.push(msgA as any);
      session.messagesB.push(msgB as any);

      await updateSession(session);
      res.json(session);

      Promise.all([
        logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: msgA.content, latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'blocked', guardrailTriggered: true, guardrailReason: inputCheck.reason }),
        logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: msgB.content, latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'blocked', guardrailTriggered: true, guardrailReason: inputCheck.reason })
      ]).catch(err => console.error('Background log failed:', err));
      return;
    }

    const [settledA, settledB] = await Promise.allSettled([
      generateResponse(modelA, prompt, session.messagesA, { customApiKey, customBaseUrl, customModelName }),
      generateResponse(modelB, prompt, session.messagesB, { customApiKey, customBaseUrl, customModelName }),
    ]);

    const resA = settledA.status === 'fulfilled' ? settledA.value : null;
    const resB = settledB.status === 'fulfilled' ? settledB.value : null;
    const errA = settledA.status === 'rejected' ? settledA.reason : null;
    const errB = settledB.status === 'rejected' ? settledB.reason : null;

    if (!resA && !resB) {
      return res.status(503).json({ error: 'Both models are unavailable right now. Please retry in a moment.' });
    }

    const outputCheckA = resA ? checkOutputGuardrail(resA.content) : null;
    const outputCheckB = resB ? checkOutputGuardrail(resB.content) : null;

    const msgA = resA
      ? {
          id: `msg-${Date.now()}-A`,
          role: 'assistant',
          content: outputCheckA!.triggered ? 'Blocked by output guardrail.' : resA.content,
          latencyMs: resA.latencyMs,
          tokensUsed: resA.usage.promptTokens + resA.usage.completionTokens,
          costUsd: 0,
          guardrailTriggered: outputCheckA!.triggered ? { type: 'output', reason: outputCheckA!.reason } : undefined,
        }
      : {
          id: `msg-${Date.now()}-A`,
          role: 'assistant',
          content: friendlyError(errA),
          isError: true,
          latencyMs: 0,
          tokensUsed: 0,
          costUsd: 0,
        };

    const msgB = resB
      ? {
          id: `msg-${Date.now()}-B`,
          role: 'assistant',
          content: outputCheckB!.triggered ? 'Blocked by output guardrail.' : resB.content,
          latencyMs: resB.latencyMs,
          tokensUsed: resB.usage.promptTokens + resB.usage.completionTokens,
          costUsd: 0,
          guardrailTriggered: outputCheckB!.triggered ? { type: 'output', reason: outputCheckB!.reason } : undefined,
        }
      : {
          id: `msg-${Date.now()}-B`,
          role: 'assistant',
          content: friendlyError(errB),
          isError: true,
          latencyMs: 0,
          tokensUsed: 0,
          costUsd: 0,
        };

    session.messagesA.push({ id: `usr-${Date.now()}-A`, role: 'user', content: prompt });
    session.messagesB.push({ id: `usr-${Date.now()}-B`, role: 'user', content: prompt });
    session.messagesA.push(msgA as any);
    session.messagesB.push(msgB as any);

    await updateSession(session);
    res.json(session);

    Promise.all([
      resA
        ? logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: resA.content, latencyMs: resA.latencyMs, inputTokens: resA.usage.promptTokens, outputTokens: resA.usage.completionTokens, estimatedCostUsd: 0, status: 'success', guardrailTriggered: outputCheckA!.triggered, guardrailReason: outputCheckA!.reason })
        : logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: '', latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'error', guardrailTriggered: false }),
      resB
        ? logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: resB.content, latencyMs: resB.latencyMs, inputTokens: resB.usage.promptTokens, outputTokens: resB.usage.completionTokens, estimatedCostUsd: 0, status: 'success', guardrailTriggered: outputCheckB!.triggered, guardrailReason: outputCheckB!.reason })
        : logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: '', latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'error', guardrailTriggered: false }),
    ]).catch(err => console.error('Background log failed:', err));

  } catch (err: any) {
    console.error("Chat generation failed:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/vote', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });

    const vote = req.body.vote;
    session.votedFor = vote;
    session.isRevealed = true;

    try {
      const delta = await computeEloDeltaForSession(session.id, vote);
      if (delta) session.eloDelta = delta;
    } catch (eloErr) {
      console.error('Failed to compute Elo delta:', eloErr);
    }

    await updateSession(session);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reveal', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });

    session.isRevealed = true;
    await updateSession(session);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
