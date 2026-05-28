"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useQuizStore, QuizSummary } from "@/store/quizStore";
import { 
  Zap, Award, AlertCircle, RefreshCw, BarChart3, 
  CheckCircle2, XCircle, ArrowRight, HelpCircle, Timer
} from "lucide-react";

export default function QuizSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [chapterId, setChapterId] = useState("");
  const [retrying, setRetrying] = useState(false);

  const { startQuiz } = useQuizStore();

  const fetchSummary = async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Fetch completed session stats
      const res = await api.post<QuizSummary>("/quiz/complete", { sessionId });
      setSummary(res.data);
      setChapterId(res.data.chapterId || "");
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSummary();
    }
  }, [sessionId]);

  const handleRetry = async () => {
    if (!chapterId) return;
    setRetrying(true);
    try {
      const newSessionId = await startQuiz(chapterId);
      router.push(`/quiz/${newSessionId}`);
    } catch (e) {
      console.error(e);
      alert("Failed to initialize a new session.");
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <RefreshCw className="mx-auto h-10 w-10 text-green-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Compiling Scorecard...</h2>
        <p className="text-xs text-slate-400 mt-1">Aggregating attempts, calculating response times, updating streaks.</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load Scorecard</h2>
        <p className="text-sm text-slate-400 mb-6">Could not compile results for this session. Please verify connection.</p>
        <button onClick={fetchSummary} className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-bold text-xs">
          Retry
        </button>
      </div>
    );
  }

  // Circular progress SVG values
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (summary.percentage / 100) * circumference;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center relative z-10">
      
      {/* Container glass card */}
      <div className="glass-card p-8 md:p-10 border-[var(--card-border)] bg-[rgba(15,23,42,0.35)] relative overflow-hidden">
        
        {/* Background visual ring */}
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-green-500/5 blur-[50px] pointer-events-none" />

        <div className="text-center max-w-lg mx-auto mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-4 animate-float">
            <Award className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Quiz Completed!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium">
            Excellent work! Review your accuracy scorecard and performance diagnostics below.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-around gap-8 border-b border-[var(--card-border)] pb-8 mb-8">
          {/* Circular Chart */}
          <div className="relative flex items-center justify-center">
            <svg className="h-36 w-36 transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Dynamic accuracy ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-green-500 transition-all duration-1000 ease-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {summary.percentage}%
              </span>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Accuracy
              </span>
            </div>
          </div>

          {/* KPI counts */}
          <div className="grid grid-cols-2 gap-4 flex-1 max-w-md w-full">
            <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-[var(--card-border)]">
              <CheckCircle2 className="h-5 w-5 text-green-500 fill-current" />
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white leading-none">
                  {summary.correctAnswers}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Correct</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-[var(--card-border)]">
              <XCircle className="h-5 w-5 text-red-500 fill-current" />
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white leading-none">
                  {summary.incorrectAnswers}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Incorrect</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-[var(--card-border)]">
              <HelpCircle className="h-5 w-5 text-slate-500 fill-current" />
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white leading-none">
                  {summary.skippedAnswers}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Skipped</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-[var(--card-border)]">
              <Timer className="h-5 w-5 text-blue-500 fill-current" />
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white leading-none">
                  {summary.averageResponseTime}s
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Avg Speed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attempted vs Unattempted Metadata row */}
        <div className="grid grid-cols-3 gap-4 border-b border-[var(--card-border)] pb-6 mb-8 text-center text-xs font-bold text-slate-400">
          <div className="space-y-1">
            <span className="block text-slate-500 uppercase tracking-wider text-[10px]">Total Questions</span>
            <span className="block text-base font-black text-slate-800 dark:text-slate-200">{summary.totalQuestions}</span>
          </div>
          <div className="space-y-1">
            <span className="block text-slate-500 uppercase tracking-wider text-[10px]">Attempted</span>
            <span className="block text-base font-black text-green-500">{summary.attemptedQuestions}</span>
          </div>
          <div className="space-y-1">
            <span className="block text-slate-500 uppercase tracking-wider text-[10px]">Unattempted</span>
            <span className="block text-base font-black text-orange-500">{summary.unattemptedQuestions}</span>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-slate-100 dark:bg-slate-800/30 p-5 rounded-2xl border border-[var(--card-border)] mb-8 text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Performance Diagnostics
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
            {summary.feedback}
          </p>
        </div>

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            disabled={retrying}
            onClick={handleRetry}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center rounded-2xl bg-green-500 py-4 text-xs font-bold text-white shadow-lg shadow-green-500/15 hover:bg-green-600 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {retrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Preparing New Quiz...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Learning Quiz
              </>
            )}
          </button>
          
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
          >
            View SaaS Analytics Dashboard
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
