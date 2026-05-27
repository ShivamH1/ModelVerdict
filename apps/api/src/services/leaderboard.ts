import { prisma } from '../db';
import { MODEL_CATALOG } from '@veritas/shared';

export interface LeaderboardEntry {
  modelId: string;
  name: string;
  type: 'FREE' | 'FRONTIER';
  elo: number;
  votesCount: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  matches: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Fetch all sessions that have a vote, sorted by createdAt ASC
  const sessions = await prisma.session.findMany({
    where: {
      votedFor: { not: null },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Initialize Elos and stats
  const statsMap: Record<string, Omit<LeaderboardEntry, 'winRate' | 'matches'>> = {};
  for (const model of MODEL_CATALOG) {
    statsMap[model.id] = {
      modelId: model.id,
      name: model.name,
      type: model.type,
      elo: 1200,
      votesCount: 0,
      wins: 0,
      losses: 0,
      ties: 0,
    };
  }

  const K = 32;

  for (const session of sessions) {
    const idA = session.modelIdA;
    const idB = session.modelIdB;
    const vote = session.votedFor;

    // Skip if models are not in current catalog (defensive)
    if (!statsMap[idA] || !statsMap[idB]) continue;

    const eloA = statsMap[idA].elo;
    const eloB = statsMap[idB].elo;

    // Expected outcomes
    const EA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const EB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

    // Actual outcomes
    let SA = 0.5;
    let SB = 0.5;

    if (vote === 'A') {
      SA = 1;
      SB = 0;
      statsMap[idA].wins += 1;
      statsMap[idB].losses += 1;
    } else if (vote === 'B') {
      SA = 0;
      SB = 1;
      statsMap[idA].losses += 1;
      statsMap[idB].wins += 1;
    } else {
      // tie or both_bad
      statsMap[idA].ties += 1;
      statsMap[idB].ties += 1;
    }

    // Update Elos
    statsMap[idA].elo = Math.round(eloA + K * (SA - EA));
    statsMap[idB].elo = Math.round(eloB + K * (SB - EB));

    // Increment votes/match count
    statsMap[idA].votesCount += 1;
    statsMap[idB].votesCount += 1;
  }

  // Calculate winRate and matches, convert to array and sort
  const entries: LeaderboardEntry[] = Object.values(statsMap).map((item) => {
    const matches = item.wins + item.losses + item.ties;
    const winRate = matches > 0 ? (item.wins + 0.5 * item.ties) / matches : 0;
    return {
      ...item,
      matches,
      winRate: Math.round(winRate * 1000) / 10, // format to e.g. 52.4%
    };
  });

  // Sort by Elo descending, then by win rate descending
  return entries.sort((a, b) => b.elo - a.elo || b.winRate - a.winRate);
}

export async function computeEloDeltaForSession(
  sessionId: string,
  vote: 'A' | 'B' | 'tie' | 'both_bad'
): Promise<{ modelA: number; modelB: number } | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  // Find all voted sessions created before this session
  const priorSessions = await prisma.session.findMany({
    where: {
      votedFor: { not: null },
      createdAt: { lt: session.createdAt },
      id: { not: sessionId }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Run the Elo loop to find the ratings before this session
  const ratings: Record<string, number> = {};
  for (const m of MODEL_CATALOG) {
    ratings[m.id] = 1200;
  }

  const K = 32;
  for (const s of priorSessions) {
    const idA = s.modelIdA;
    const idB = s.modelIdB;
    const v = s.votedFor;

    if (ratings[idA] === undefined || ratings[idB] === undefined) continue;

    const eloA = ratings[idA];
    const eloB = ratings[idB];

    const EA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const EB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

    let SA = 0.5;
    let SB = 0.5;

    if (v === 'A') {
      SA = 1;
      SB = 0;
    } else if (v === 'B') {
      SA = 0;
      SB = 1;
    }

    ratings[idA] = Math.round(eloA + K * (SA - EA));
    ratings[idB] = Math.round(eloB + K * (SB - EB));
  }

  // Now calculate the delta for the current session
  const eloA = ratings[session.modelIdA] !== undefined ? ratings[session.modelIdA] : 1200;
  const eloB = ratings[session.modelIdB] !== undefined ? ratings[session.modelIdB] : 1200;

  const EA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const EB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

  let SA = 0.5;
  let SB = 0.5;

  if (vote === 'A') {
    SA = 1;
    SB = 0;
  } else if (vote === 'B') {
    SA = 0;
    SB = 1;
  }

  const deltaA = Math.round(K * (SA - EA));
  const deltaB = Math.round(K * (SB - EB));

  return { modelA: deltaA, modelB: deltaB };
}
