import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'pg-connection-string';

const connectionString = process.env.DATABASE_URL;
const config = parse(connectionString || '');

const pool = new Pool({
  ...config,
  database: config.database ?? undefined,
  // Performance tuning
  max: 10,                       // Maximum pool size
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
  statement_timeout: 15000,      // Kill queries running longer than 15s
  ssl: {
    rejectUnauthorized: false
  }
} as any);

// Log pool errors instead of crashing
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
