import { InferenceLog } from '@veritas/shared';
import { readDb, writeDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export async function logInference(logData: Omit<InferenceLog, 'id' | 'timestamp'>) {
  const db = await readDb();
  
  const newLog: InferenceLog = {
    ...logData,
    id: `log-${uuidv4()}`,
    timestamp: new Date().toISOString()
  };

  db.inferenceLogs.push(newLog);
  await writeDb(db);
  
  return newLog;
}
