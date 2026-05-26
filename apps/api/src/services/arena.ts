import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb } from '../db';
import { Session, MODEL_CATALOG, ModelConfig } from '@veritas/shared';

// Pick 2 random models (weighted heavily toward free, but ensures diversity)
export function getRandomPair(): [ModelConfig, ModelConfig] {
  const models = [...MODEL_CATALOG].sort(() => Math.random() - 0.5);
  return [models[0], models[1]];
}

export async function createSession(): Promise<Session> {
  const [modelA, modelB] = getRandomPair();
  
  const newSession: Session = {
    id: `sess-${uuidv4()}`,
    modelIdA: modelA.id,
    modelIdB: modelB.id,
    messagesA: [],
    messagesB: [],
    isRevealed: false,
    createdAt: new Date().toISOString()
  };

  const db = await readDb();
  db.sessions.push(newSession);
  await writeDb(db);

  return newSession;
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await readDb();
  return db.sessions.find(s => s.id === id);
}

export async function updateSession(session: Session): Promise<void> {
  const db = await readDb();
  const index = db.sessions.findIndex(s => s.id === session.id);
  if (index !== -1) {
    db.sessions[index] = session;
    await writeDb(db);
  }
}
