"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useQuizStore, UserProfile } from "@/store/quizStore";
import { Flame, Sparkles, Award, AlertCircle, RefreshCw, Trophy, UserCheck } from "lucide-react";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { currentUser, selectUser } = useQuizStore();

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<UserProfile[]>("/users/leaderboard");
      setLeaderboard(res.data);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUser]); // refresh leaderboard active selected highlights when currentUser changes

  useEffect(() => {
    // Establish real-time WebSocket connection to listen for leaderboard updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host.split(":")[0];
    const wsUrl = `${protocol}//${host}:8000/api/ws/leaderboard`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "LEADERBOARD_REFRESH") {
          console.log("Leaderboard update received via WebSocket, refreshing...");
          fetchLeaderboard();
        }
      } catch (e) {
        console.error("Error parsing websocket message:", e);
      }
    };

    socket.onerror = (err) => {
      console.warn("WebSocket connection error:", err);
    };

    return () => {
      socket.close();
    };
  }, []);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
            <Trophy className="h-4.5 w-4.5 fill-current" />
          </div>
        );
      case 2:
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-300/20 text-slate-300 border border-slate-300/30">
            <Trophy className="h-4.5 w-4.5 fill-current" />
          </div>
        );
      case 3:
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-700/20 text-amber-700 border border-amber-700/30">
            <Trophy className="h-4.5 w-4.5 fill-current" />
          </div>
        );
      default:
        return (
          <span className="text-xs font-bold text-slate-400 pl-2">
            #{rank}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-10" />
        <div className="glass-card p-6 h-96 flex flex-col justify-between">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 bg-slate-800 rounded animate-pulse" />
                <div className="h-8 w-8 bg-slate-800 rounded-full animate-pulse" />
                <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
              </div>
              <div className="h-5 w-20 bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load Leaderboard</h2>
        <p className="text-sm text-slate-400 mb-6">Could not fetch ranking stats. Please check backend connection.</p>
        <button onClick={fetchLeaderboard} className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-bold text-xs">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 flex-1 flex flex-col justify-start relative z-10">
      
      {/* Title */}
      <div className="mb-10 text-center sm:text-left">
        <span className="text-xs font-bold uppercase tracking-wider text-green-500">
          GLOBAL COMPETITIVE TRACKS
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white mt-1">
          Consistent Learners Leaderboard
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Top-tier learning consistency scores based on continuous daily active quiz completion streaks.
        </p>
      </div>

      {/* Leaderboard list container */}
      <div className="glass-card overflow-hidden border-[var(--card-border)] bg-[rgba(15,23,42,0.3)]">
        <div className="px-5 py-4 border-b border-[var(--card-border)] bg-[rgba(15,23,42,0.5)] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Rank & Learner Profile</span>
          <span>Consistency Streak</span>
        </div>

        <div className="divide-y divide-[var(--card-border)]">
          {leaderboard.map((user, index) => {
            const isMe = user.id === currentUser?.id;
            return (
              <div 
                key={user.id} 
                className={`flex items-center justify-between px-5 py-4 transition-all ${
                  isMe
                    ? "bg-green-500/5 border-l-4 border-green-500"
                    : "hover:bg-slate-800/30"
                }`}
              >
                {/* User Info */}
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="shrink-0 w-8 flex items-center justify-center">
                    {getRankBadge(index + 1)}
                  </div>
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-9 w-9 rounded-xl bg-slate-200 shrink-0 border border-slate-700 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="font-bold text-sm truncate text-slate-900 dark:text-white leading-none">
                        {user.username}
                      </p>
                      {isMe && (
                        <span className="shrink-0 px-2 py-0.5 rounded bg-green-500/10 text-[9px] font-bold text-green-500 border border-green-500/25">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Streak Fire badge */}
                <div className="shrink-0 flex items-center space-x-4 ml-4">
                  <div className="flex items-center space-x-1.5 rounded-full bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 px-3 py-1.5 text-xs font-black text-orange-500">
                    <Flame className="h-4 w-4 fill-current animate-bounce" />
                    <span>{user.streakCount} Days</span>
                  </div>

                  {/* Quick Profile Sandbox Toggle */}
                  {!isMe && (
                    <button
                      onClick={() => selectUser(user.id)}
                      className="p-1.5 rounded-xl border border-[var(--card-border)] bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-400 transition-all cursor-pointer hidden sm:block"
                      title="Simulate this user profile"
                    >
                      <UserCheck className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
