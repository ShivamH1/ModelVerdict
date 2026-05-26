import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { Session, MODEL_CATALOG, ModelConfig } from '@veritas/shared';

export function getRandomPair(): [ModelConfig, ModelConfig] {
  const models = [...MODEL_CATALOG].sort(() => Math.random() - 0.5);
  return [models[0], models[1]];
}

export async function createSession(): Promise<Session> {
  const [modelA, modelB] = getRandomPair();
  
  const newSession = await prisma.session.create({
    data: {
      id: `sess-${uuidv4()}`,
      modelIdA: modelA.id,
      modelIdB: modelB.id,
      messagesA: [],
      messagesB: [],
      isRevealed: false
    }
  });

  return {
    ...newSession,
    messagesA: (newSession.messagesA as any) || [],
    messagesB: (newSession.messagesB as any) || []
  } as unknown as Session;
}

export async function getSession(id: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return null;
  
  return {
    ...session,
    messagesA: (session.messagesA as any) || [],
    messagesB: (session.messagesB as any) || []
  } as unknown as Session;
}

export async function updateSession(session: Session): Promise<void> {
  await prisma.session.update({
    where: { id: session.id },
    data: {
      messagesA: session.messagesA as any,
      messagesB: session.messagesB as any,
      isRevealed: session.isRevealed,
      votedFor: session.votedFor,
      eloDelta: session.eloDelta as any
    }
  });
}
