import { Router } from 'express';
import { createSession, getSession, updateSession } from '../services/arena';
import { generateResponse } from '@veritas/llm-client';
import { MODEL_CATALOG } from '@veritas/shared';
import { logInference } from '../services/logging';
import { checkInputGuardrail, checkOutputGuardrail } from '../guardrails';

const router = Router();

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
    
    // Guardrail Input Check
    const inputCheck = checkInputGuardrail(prompt);

    const modelA = MODEL_CATALOG.find(m => m.id === session.modelIdA)!;
    const modelB = MODEL_CATALOG.find(m => m.id === session.modelIdB)!;

    // Generate for both models
    if (inputCheck.triggered) {
      // Input blocked — build blocked messages and respond immediately
      const msgA = { id: `msg-${Date.now()}-A`, role: 'assistant', content: 'Blocked by input guardrail.', guardrailTriggered: { type: 'input', reason: inputCheck.reason } };
      const msgB = { id: `msg-${Date.now()}-B`, role: 'assistant', content: 'Blocked by input guardrail.', guardrailTriggered: { type: 'input', reason: inputCheck.reason } };

      session.messagesA.push({ id: `usr-${Date.now()}-A`, role: 'user', content: prompt });
      session.messagesB.push({ id: `usr-${Date.now()}-B`, role: 'user', content: prompt });
      session.messagesA.push(msgA as any);
      session.messagesB.push(msgB as any);

      await updateSession(session);
      res.json(session);

      // Fire-and-forget: log blocked inference asynchronously
      Promise.all([
        logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: msgA.content, latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'blocked', guardrailTriggered: true, guardrailReason: inputCheck.reason }),
        logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: msgB.content, latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'blocked', guardrailTriggered: true, guardrailReason: inputCheck.reason })
      ]).catch(err => console.error('Background log failed:', err));
      return;
    }

    // Generate responses for both models in parallel
    const [resA, resB] = await Promise.all([
      generateResponse(modelA, prompt, session.messagesA, {
        customApiKey, customBaseUrl, customModelName,
      }).catch(e => ({
        content: `ERROR: ${e.message}`,
        usage: { promptTokens: 0, completionTokens: 0 },
        latencyMs: 0,
        provider: 'custom' as const
      })),
      generateResponse(modelB, prompt, session.messagesB, {
        customApiKey, customBaseUrl, customModelName,
      }).catch(e => ({
        content: `ERROR: ${e.message}`,
        usage: { promptTokens: 0, completionTokens: 0 },
        latencyMs: 0,
        provider: 'custom' as const
      }))
    ]);

    const outputCheckA = checkOutputGuardrail(resA.content);
    const outputCheckB = checkOutputGuardrail(resB.content);

    const msgA = {
      id: `msg-${Date.now()}-A`, role: 'assistant',
      content: outputCheckA.triggered ? 'Blocked by output guardrail.' : resA.content,
      latencyMs: resA.latencyMs,
      tokensUsed: resA.usage.promptTokens + resA.usage.completionTokens,
      costUsd: 0,
      guardrailTriggered: outputCheckA.triggered ? { type: 'output', reason: outputCheckA.reason } : undefined
    };

    const msgB = {
      id: `msg-${Date.now()}-B`, role: 'assistant',
      content: outputCheckB.triggered ? 'Blocked by output guardrail.' : resB.content,
      latencyMs: resB.latencyMs,
      tokensUsed: resB.usage.promptTokens + resB.usage.completionTokens,
      costUsd: 0,
      guardrailTriggered: outputCheckB.triggered ? { type: 'output', reason: outputCheckB.reason } : undefined
    };

    session.messagesA.push({ id: `usr-${Date.now()}-A`, role: 'user', content: prompt });
    session.messagesB.push({ id: `usr-${Date.now()}-B`, role: 'user', content: prompt });
    session.messagesA.push(msgA as any);
    session.messagesB.push(msgB as any);

    await updateSession(session);

    // Respond to client IMMEDIATELY — don't wait for logging
    res.json(session);

    // Fire-and-forget: log inference asynchronously (saves 50-200ms per request)
    Promise.all([
      logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: resA.content, latencyMs: resA.latencyMs, inputTokens: resA.usage.promptTokens, outputTokens: resA.usage.completionTokens, estimatedCostUsd: 0, status: 'success', guardrailTriggered: outputCheckA.triggered, guardrailReason: outputCheckA.reason }),
      logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: resB.content, latencyMs: resB.latencyMs, inputTokens: resB.usage.promptTokens, outputTokens: resB.usage.completionTokens, estimatedCostUsd: 0, status: 'success', guardrailTriggered: outputCheckB.triggered, guardrailReason: outputCheckB.reason })
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
    
    session.votedFor = req.body.vote;
    session.isRevealed = true;
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
