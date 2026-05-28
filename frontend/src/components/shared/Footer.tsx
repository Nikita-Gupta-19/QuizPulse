import React from "react";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--card-border)] bg-[rgba(9,13,22,0.4)] dark:bg-[rgba(9,13,22,0.4)] light:bg-slate-100 py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-green-500 fill-current" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">QuizPulse</span>
            <span>— Internship Recruiter Portfolio Application</span>
          </div>
          <div className="mt-3 md:mt-0 flex space-x-6">
            <span>Next.js 15 App Router</span>
            <span>FastAPI + MongoDB</span>
            <span>TailwindCSS</span>
            <span>Zustand State</span>
          </div>
          <div className="mt-3 md:mt-0">
            <span>&copy; {new Date().getFullYear()} QuizPulse. Built for demonstration excellence.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
