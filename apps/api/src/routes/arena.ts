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
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

router.post('/:id/chat', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { prompt, customApiKey, customBaseUrl, customModelName } = req.body;
  
  // Guardrail Input Check
  const inputCheck = checkInputGuardrail(prompt);

  const modelA = MODEL_CATALOG.find(m => m.id === session.modelIdA)!;
  const modelB = MODEL_CATALOG.find(m => m.id === session.modelIdB)!;

  try {
    // Generate for A
    let msgA;
    if (inputCheck.triggered) {
      msgA = { id: `msg-${Date.now()}-A`, role: 'assistant', content: 'Blocked by input guardrail.', guardrailTriggered: { type: 'input', reason: inputCheck.reason } };
      await logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: msgA.content, latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'blocked', guardrailTriggered: true, guardrailReason: inputCheck.reason });
    } else {
      const resA = await generateResponse(modelA, prompt, session.messagesA, {
        customApiKey, customBaseUrl, customModelName,
        onRetry: (attempt, provider, err) => logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: '', latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'retry', retryAttempt: attempt, retryProvider: provider, retryReason: err.message, guardrailTriggered: false })
      });
      const outputCheckA = checkOutputGuardrail(resA.content);
      msgA = { id: `msg-${Date.now()}-A`, role: 'assistant', content: outputCheckA.triggered ? 'Blocked by output guardrail.' : resA.content, latencyMs: resA.latencyMs, tokensUsed: resA.usage.promptTokens + resA.usage.completionTokens, costUsd: 0, guardrailTriggered: outputCheckA.triggered ? { type: 'output', reason: outputCheckA.reason } : undefined };
      await logInference({ sessionId: session.id, modelId: modelA.id, modelName: modelA.name, prompt, response: resA.content, latencyMs: resA.latencyMs, inputTokens: resA.usage.promptTokens, outputTokens: resA.usage.completionTokens, estimatedCostUsd: 0, status: 'success', guardrailTriggered: outputCheckA.triggered, guardrailReason: outputCheckA.reason });
    }

    // Generate for B
    let msgB;
    if (inputCheck.triggered) {
      msgB = { id: `msg-${Date.now()}-B`, role: 'assistant', content: 'Blocked by input guardrail.', guardrailTriggered: { type: 'input', reason: inputCheck.reason } };
      await logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: msgB.content, latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'blocked', guardrailTriggered: true, guardrailReason: inputCheck.reason });
    } else {
      const resB = await generateResponse(modelB, prompt, session.messagesB, {
        customApiKey, customBaseUrl, customModelName,
        onRetry: (attempt, provider, err) => logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: '', latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, status: 'retry', retryAttempt: attempt, retryProvider: provider, retryReason: err.message, guardrailTriggered: false })
      });
      const outputCheckB = checkOutputGuardrail(resB.content);
      msgB = { id: `msg-${Date.now()}-B`, role: 'assistant', content: outputCheckB.triggered ? 'Blocked by output guardrail.' : resB.content, latencyMs: resB.latencyMs, tokensUsed: resB.usage.promptTokens + resB.usage.completionTokens, costUsd: 0, guardrailTriggered: outputCheckB.triggered ? { type: 'output', reason: outputCheckB.reason } : undefined };
      await logInference({ sessionId: session.id, modelId: modelB.id, modelName: modelB.name, prompt, response: resB.content, latencyMs: resB.latencyMs, inputTokens: resB.usage.promptTokens, outputTokens: resB.usage.completionTokens, estimatedCostUsd: 0, status: 'success', guardrailTriggered: outputCheckB.triggered, guardrailReason: outputCheckB.reason });
    }

    session.messagesA.push({ id: `usr-${Date.now()}-A`, role: 'user', content: prompt });
    session.messagesB.push({ id: `usr-${Date.now()}-B`, role: 'user', content: prompt });
    session.messagesA.push(msgA as any);
    session.messagesB.push(msgB as any);

    await updateSession(session);
    res.json(session);

  } catch (err: any) {
    console.error("Chat generation failed:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/vote', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  
  session.votedFor = req.body.vote;
  session.isRevealed = true;
  await updateSession(session);
  res.json(session);
});

router.post('/:id/reveal', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  
  session.isRevealed = true;
  await updateSession(session);
  res.json(session);
});

export default router;
