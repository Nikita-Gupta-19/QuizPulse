"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useQuizStore } from "@/store/quizStore";
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { 
  Zap, Flame, Bookmark, Clock, BarChart3, RefreshCw, 
  Download, Award, AlertCircle, Heart, User, CheckCircle2,
  TrendingUp, Activity, Compass, Info
} from "lucide-react";

interface KPIStats {
  dau: number;
  wau: number;
  totalServed: number;
  totalAnswered: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  accuracyRate: number;
  completionRate: number;
  avgQuestionsPerSession: number;
  totalSessions: number;
}

interface ActivityData {
  dauTrend: { date: string; dau: number }[];
  peakHours: { hour: string; sessions: number }[];
  questionsDaily: { date: string; served: number; answered: number }[];
}

interface PerformanceData {
  subjectAccuracy: { subject: string; accuracy: number; total: number }[];
  chapterHeatmap: { chapter: string; difficulty: string; accuracy: number }[];
  fastestResponders: { username: string; speed: number; correctAnswers: number }[];
  mostSkippedQuestions: { questionId: string; questionText: string; skipCount: number; totalAttempts: number; skipRatio: number }[];
  miscalibratedQuestions: { questionId: string; questionText: string; difficulty: string; estimatedTime: number; totalAttempts: number; skipCount: number; overtimeCount: number; problematicRatio: number }[];
}

export default function AnalyticsDashboardPage() {
  const { currentUser } = useQuizStore();
  
  // Dashboard states
  const [kpi, setKpi] = useState<KPIStats | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [dropoff, setDropoff] = useState<{ stage: string; count: number; pct: number }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    setError(false);
    try {
      const [kpiRes, actRes, perfRes, dropRes] = await Promise.all([
        api.get<KPIStats>("/analytics/dashboard"),
        api.get<ActivityData>("/analytics/activity"),
        api.get<PerformanceData>("/analytics/performance"),
        api.get<any[]>("/analytics/dropoff")
      ]);
      
      setKpi(kpiRes.data);
      setActivity(actRes.data);
      setPerformance(perfRes.data);
      setDropoff(dropRes.data);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]); // Reload when currentUser changes to simulate their changes

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get("/analytics/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "quizpulse_recruiter_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Failed to export CSV:", e);
      alert("Error exporting CSV data.");
    } finally {
      setExporting(false);
    }
  };

  const getHeatmapColor = (val: number) => {
    if (val >= 75) return "bg-green-500/20 text-green-500 border-green-500/30";
    if (val >= 50) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    return "bg-red-500/20 text-red-500 border-red-500/30";
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="h-28 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-80 bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !kpi || !activity || !performance) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to compile Analytics</h2>
        <p className="text-sm text-slate-400 mb-6">Could not load MongoDB pipeline aggregates. Please verify seed status.</p>
        <button onClick={fetchDashboardData} className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-bold text-xs">
          Retry Aggregations
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col justify-start relative z-10 space-y-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[var(--card-border)] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-green-500">
            SaaS Diagnostics
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white mt-1">
            Learning Analytics Command
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Real-time calculations processed directly from MongoDB attempts history.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Pipelines
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-green-500/15 hover:bg-green-600 transition-all cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Compiling..." : "Export CSV Report"}
          </button>
        </div>
      </div>

      {/* 4x KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Active Users */}
        <div className="glass-card p-5 border-[var(--card-border)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Daily / Weekly Actives
            </span>
            <Activity className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-baseline mt-4 space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {kpi.dau}
            </span>
            <span className="text-xs font-bold text-slate-400">
              / {kpi.wau} WAU
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 block mt-2">
            Simulated active profile volume
          </span>
        </div>

        {/* KPI 2: Questions Served */}
        <div className="glass-card p-5 border-[var(--card-border)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Questions Served
            </span>
            <Compass className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline mt-4 space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {kpi.totalServed}
            </span>
            <span className="text-xs font-bold text-slate-400">
              items
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 block mt-2">
            Served correctly in chapters
          </span>
        </div>

        {/* KPI 3: Accuracy Rate */}
        <div className="glass-card p-5 border-[var(--card-border)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Avg accuracy Rate
            </span>
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-baseline mt-4 space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {kpi.accuracyRate}%
            </span>
            <span className="text-[10px] font-bold text-orange-500 flex items-center ml-1">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              Slight gain
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 block mt-2">
            Avg accurate responses
          </span>
        </div>

        {/* KPI 4: Response Latency Percentiles */}
        <div className="glass-card p-5 border-[var(--card-border)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Latency (p50 / p95)
            </span>
            <Clock className="h-4 w-4 text-teal-500" />
          </div>
          <div className="flex items-baseline mt-4 space-x-1.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {kpi.p50ResponseTime}s
            </span>
            <span className="text-xs font-bold text-slate-400">
              / {kpi.p95ResponseTime}s p95
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 block mt-2">
            Avg response: {kpi.avgResponseTime}s
          </span>
        </div>

        {/* KPI 5: Completion Rate */}
        <div className="glass-card p-5 border-[var(--card-border)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Quiz Completion
            </span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-baseline mt-4 space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {kpi.completionRate}%
            </span>
            <span className="text-xs font-bold text-slate-400">
              completed
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 block mt-2">
            Started vs finished sessions
          </span>
        </div>
      </div>

      {/* Chart Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: DAU/WAU Trend */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Users Trend (30 Days)</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Chronological line mapping of distinct active accounts.</p>
          </div>
          <div className="h-64 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity.dauTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f8fafc" }}
                  itemStyle={{ color: "#22c55e" }}
                />
                <Line type="monotone" dataKey="dau" name="Daily Actives" stroke="#22c55e" strokeWidth={3} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Peak Activity Hours */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Peak Activity Hours</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Distribution map of started sessions by hour of day.</p>
          </div>
          <div className="h-64 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity.peakHours}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f8fafc" }}
                  itemStyle={{ color: "#22c55e" }}
                />
                <Area type="monotone" dataKey="sessions" name="Attempts Started" stroke="#22c55e" fillOpacity={1} fill="url(#colorSessions)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Drop-off Funnel */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Completion Drop-off Funnel</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Traces student cohort volume surviving consecutive questions.</p>
          </div>
          <div className="h-64 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dropoff} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="stage" type="category" stroke="#64748b" width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f8fafc" }}
                  itemStyle={{ color: "#3b82f6" }}
                />
                <Bar dataKey="pct" name="Survival Coverage (%)" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Subject-wise Accuracy */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject-wise Accuracy Comparison</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Ranks competitive exam subjects based on aggregate correct ratios.</p>
          </div>
          <div className="h-64 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.subjectAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="subject" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f8fafc" }}
                  itemStyle={{ color: "#22c55e" }}
                />
                <Bar dataKey="accuracy" name="Accuracy Rate (%)" fill="#10b981" radius={[8, 8, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid Heatmap Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Heatmap chapter accuracy */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chapter Difficulty Accuracy Heatmap</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Maps average accuracy percentages across diverse chapters and diff levels.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-2">
            {performance.chapterHeatmap.slice(0, 15).map((node, nIdx) => (
              <div 
                key={nIdx} 
                className={`p-4 rounded-xl border flex flex-col justify-between h-28 transition-all ${getHeatmapColor(node.accuracy)}`}
              >
                <div className="space-y-1">
                  <span className="block text-[11px] font-black leading-tight truncate">
                    {node.chapter}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wider font-extrabold opacity-60">
                    {node.difficulty}
                  </span>
                </div>
                <span className="block text-xl font-black mt-2">
                  {node.accuracy}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-500 pt-2">
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded bg-green-500/20 border border-green-500/30" />
              <span>High Command (&gt;=75%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded bg-orange-500/20 border border-orange-500/30" />
              <span>Developing (50% - 74%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded bg-red-500/20 border border-red-500/30" />
              <span>Requires Practice (&lt;50%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extreme Diagnoses Table Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fastest Responders */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div className="flex items-center space-x-2 border-b border-[var(--card-border)] pb-3">
            <Flame className="h-5 w-5 text-orange-500 fill-current" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fastest Accurate Responders</h3>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Users recording minimal durations on correct conceptual submissions.</p>
            </div>
          </div>

          <div className="divide-y divide-[var(--card-border)]">
            {performance.fastestResponders.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="h-5 w-5 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.username}</span>
                </div>
                <div className="flex items-center space-x-4 font-semibold text-slate-500 dark:text-slate-400">
                  <span>{item.correctAnswers} Answers</span>
                  <span className="text-green-500 font-black">{item.speed}s avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Skipped Questions */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div className="flex items-center space-x-2 border-b border-[var(--card-border)] pb-3">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Skipped Questions</h3>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Concepts bypassed by learners due to high perceived difficulty.</p>
            </div>
          </div>

          <div className="divide-y divide-[var(--card-border)]">
            {performance.mostSkippedQuestions.map((item, idx) => (
              <div key={idx} className="py-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                    {item.questionText}
                  </span>
                  <span className="text-blue-500 font-black shrink-0 ml-2">
                    {item.skipRatio}% skipped
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-bold text-slate-500">
                  <span>{item.skipCount} Skips</span>
                  <span>•</span>
                  <span>{item.totalAttempts} Attempts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Calibration Check */}
        <div className="glass-card p-6 border-[var(--card-border)] bg-[rgba(15,23,42,0.25)] space-y-4">
          <div className="flex items-center space-x-2 border-b border-[var(--card-border)] pb-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Flagged Miscalibrated Questions</h3>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Questions with &gt;70% skips or response times exceeding 2x the estimate.</p>
            </div>
          </div>

          <div className="divide-y divide-[var(--card-border)]">
            {performance.miscalibratedQuestions && performance.miscalibratedQuestions.length > 0 ? (
              performance.miscalibratedQuestions.map((item, idx) => (
                <div key={idx} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px] sm:max-w-xs">
                      {item.questionText}
                    </span>
                    <span className="text-red-500 font-black shrink-0 ml-2">
                      {item.problematicRatio}% flag
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] font-bold text-slate-500">
                    <span className="text-red-400/80 uppercase tracking-widest text-[9px]">{item.difficulty}</span>
                    <span>•</span>
                    <span>Est: {item.estimatedTime}s</span>
                    <span>•</span>
                    <span>{item.totalAttempts} Attempts</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs font-semibold text-slate-500">
                🎉 No miscalibrated questions detected! All items are within standard calibration boundaries.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
