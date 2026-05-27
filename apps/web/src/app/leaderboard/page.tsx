"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Award, TrendingUp, Users, RotateCw, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  modelId: string;
  name: string;
  type: "FREE" | "FRONTIER";
  elo: number;
  votesCount: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  matches: number;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/models/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "An error occurred while loading the rankings.";
      setError(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchLeaderboard());
  }, []);

  const totalVotes = data.reduce((sum, item) => sum + item.votesCount, 0) / 2; // Each match has 2 model votes
  const topModel = data[0];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-5">
        <div>
          <h1 className="text-3xl md:text-4xl text-neutral-100 font-serif tracking-tight font-medium flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
            Model Leaderboard
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 font-sans mt-1">
            Dynamic Elo ratings and consensus statistics calculated from crowd-sourced side-by-side matches.
          </p>
        </div>

        <button
          onClick={() => fetchLeaderboard(true)}
          disabled={loading || refreshing}
          className="self-start sm:self-auto text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/50 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          <span>{refreshing ? "Refreshing..." : "Sync Ratings"}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-neutral-800" />
            <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 animate-spin" />
          </div>
          <span className="text-xs text-neutral-500 font-mono tracking-widest uppercase">Calculating Standings...</span>
        </div>
      ) : error ? (
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 text-center max-w-lg mx-auto space-y-3">
          <div className="text-rose-500 text-sm font-medium">Failed to compute leaderboard</div>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            onClick={() => fetchLeaderboard()}
            className="text-xs text-neutral-300 hover:text-white px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-all"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* CARD 1: TOP MODEL */}
            <div className="relative overflow-hidden bg-linear-to-br from-amber-500/10 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-amber-500/20 shadow-xl flex flex-col justify-between min-h-35">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Trophy className="w-24 h-24 text-amber-500" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-amber-500 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Top Rated Model
                </span>
                <h3 className="text-lg md:text-xl font-serif text-neutral-100 font-semibold tracking-tight mt-1">
                  {topModel ? topModel.name : "N/A"}
                </h3>
              </div>
              <div className="flex items-baseline gap-2 pt-4 border-t border-neutral-900/60 mt-4">
                <span className="text-2xl font-serif font-black text-amber-500">{topModel ? topModel.elo : 1200}</span>
                <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider font-bold">Elo Rating</span>
              </div>
            </div>

            {/* CARD 2: TOTAL EVALUATIONS */}
            <div className="bg-neutral-900/40 p-5 rounded-2xl border border-neutral-900 shadow-lg flex flex-col justify-between min-h-35">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Consensus Votes
                </span>
                <h3 className="text-2xl md:text-3xl font-serif text-neutral-100 font-semibold mt-2">
                  {Math.round(totalVotes)}
                </h3>
              </div>
              <p className="text-[10px] text-neutral-500 font-sans leading-relaxed border-t border-neutral-900 pt-3">
                Total comparative model matchups graded by active evaluation sessions.
              </p>
            </div>

            {/* CARD 3: SYSTEM INTEGRITY */}
            <div className="bg-neutral-900/40 p-5 rounded-2xl border border-neutral-900 shadow-lg flex flex-col justify-between min-h-35">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  System Calibration
                </span>
                <h3 className="text-2xl md:text-3xl font-serif text-neutral-100 font-semibold mt-2">
                  {data.length}
                </h3>
              </div>
              <p className="text-[10px] text-neutral-500 font-sans leading-relaxed border-t border-neutral-900 pt-3">
                Active models in catalog participating in the dynamic Elo tracking matrix.
              </p>
            </div>

          </div>

          {/* LEADERBOARD TABLE */}
          <div className="bg-neutral-900/25 border border-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/80 bg-neutral-950/40 text-[10px] uppercase font-mono font-bold text-neutral-500 tracking-wider">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-4">Model Config</th>
                    <th className="py-4 px-4 text-center">Tier</th>
                    <th className="py-4 px-4 text-center">Elo Rating</th>
                    <th className="py-4 px-4 text-center">Win Rate</th>
                    <th className="py-4 px-6 text-right">Match Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/50">
                  {data.map((entry, index) => {
                    const isTop = index === 0;
                    const isSecond = index === 1;
                    const isThird = index === 2;
                    
                    return (
                      <tr
                        key={entry.modelId}
                        className="hover:bg-neutral-900/20 transition-colors group"
                      >
                        {/* Rank cell */}
                        <td className="py-4 px-6 text-center">
                          <span className="flex items-center justify-center font-mono font-bold text-xs">
                            {isTop ? (
                              <Trophy className="w-4 h-4 text-amber-500 drop-shadow" />
                            ) : isSecond ? (
                              <Award className="w-4 h-4 text-neutral-300" />
                            ) : isThird ? (
                              <Award className="w-4 h-4 text-amber-700" />
                            ) : (
                              <span className="text-neutral-500">{index + 1}</span>
                            )}
                          </span>
                        </td>

                        {/* Model name cell */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors">
                              {entry.name}
                            </span>
                            <span className="text-[10px] text-neutral-600 font-mono tracking-tight mt-0.5 select-all">
                              {entry.modelId}
                            </span>
                          </div>
                        </td>

                        {/* Tier cell */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider",
                              entry.type === "FRONTIER"
                                ? "bg-purple-950/40 border border-purple-800/40 text-purple-400"
                                : "bg-neutral-900 border border-neutral-800 text-neutral-400"
                            )}
                          >
                            {entry.type}
                          </span>
                        </td>

                        {/* Elo cell */}
                        <td className="py-4 px-4 text-center">
                          <span className={cn(
                            "font-serif font-black text-sm",
                            isTop ? "text-amber-500 text-base" : "text-neutral-300"
                          )}>
                            {entry.elo}
                          </span>
                        </td>

                        {/* Win Rate cell */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                            <span className="font-mono text-xs font-semibold text-neutral-300">
                              {entry.winRate}%
                            </span>
                          </div>
                        </td>

                        {/* Record cell */}
                        <td className="py-4 px-6 text-right font-mono text-2xs text-neutral-500">
                          <span className="text-neutral-400 font-semibold">{entry.wins}</span>W
                          <span className="mx-1">•</span>
                          <span className="text-neutral-400 font-semibold">{entry.losses}</span>L
                          <span className="mx-1">•</span>
                          <span className="text-neutral-400 font-semibold">{entry.ties}</span>T
                          <span className="text-[9px] text-neutral-600 ml-2">({entry.matches} total)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-600 font-mono">
                No active match data registered. Start voting in the Chat Arena to seed rankings!
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
