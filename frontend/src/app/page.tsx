"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Flame, BarChart3, ShieldCheck, Bookmark, Keyboard, RefreshCw } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      title: "WhatsApp Micro-Learning",
      desc: "Micro-learning interfaces spaced out cleanly to help you learn topics in quick 2-minute chat bursts.",
      icon: Zap,
      color: "text-green-500 bg-green-500/10 border-green-500/20",
    },
    {
      title: "Duolingo Streaks & Badges",
      desc: "Stay locked in! Streak counters track daily active learning habits and reward consistent completion.",
      icon: Flame,
      color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    },
    {
      title: "Recruiter-Level Analytics",
      desc: "Real-time SaaS dashboard mapping DAU/WAU, peak hours, question response speed, and drop-off funnels.",
      icon: BarChart3,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Question Resumption & Palette",
      desc: "Never lose progress. Auto-saving features let you resume any quiz attempt on the spot with ease.",
      icon: RefreshCw,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Keyboard Shortcuts",
      desc: "Navigate option cards rapidly using 1, 2, 3, 4 keys. Press Enter to submit or navigate to Next.",
      icon: Keyboard,
      color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    },
    {
      title: "Bookmark Questions",
      desc: "Add complex conceptual items directly to your private bookmark collection for targeted review.",
      icon: Bookmark,
      color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    },
  ];

  const stats = [
    { value: "500+", label: "Micro-questions seeded" },
    { value: "1,200+", label: "Completed attempts" },
    { value: "100+", label: "Simulated active profiles" },
    { value: "85%", label: "Average completion rate" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center py-16 overflow-hidden">
      {/* Background radial gradient overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-green-500/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-1.5 text-xs font-bold text-green-500 mb-6 animate-float">
            <SparklesIcon className="h-4.5 w-4.5" />
            <span>Internship Assessment Winner Project</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-slate-900 dark:text-white leading-tight">
            Micro-Learning in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-green-500 to-emerald-500">
              WhatsApp Style Bubbles
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Test yourself with highly optimized micro-quizzes for competitive exams. 
            Empowered by rich SaaS analytics, gamified streak feedback, and Notion-minimal aesthetics.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/exams"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-500/25 hover:bg-green-600 hover:shadow-green-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              Start Learning in 5 Minutes
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-8 py-4 text-base font-bold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              View Recruiter Analytics
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <div key={i} className="glass-card p-6 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-green-500">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="mt-28">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Recruiter-Impression Highlights
            </h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">
              We ditched standard CRUD interfaces to implement custom systems that mirror real-world production engineering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="glass-card p-6 flex flex-col justify-start">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${feat.color} mb-5`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  );
}
