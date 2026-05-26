import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseSchema } from './schema';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

const DEFAULT_DB: DatabaseSchema = {
  sessions: [],
  evalRuns: [],
  inferenceLogs: [],
};

// Ensure DB file exists
async function ensureDb() {
  try {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Ensure DB is created on load
ensureDb();

export async function readDb(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return DEFAULT_DB;
  }
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  try {
    // Write to a temporary file first, then rename for atomic updates
    const tempFile = `${DB_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFile, DB_FILE);
  } catch (error) {
    console.error('Failed to write database:', error);
    throw error;
  }
}
