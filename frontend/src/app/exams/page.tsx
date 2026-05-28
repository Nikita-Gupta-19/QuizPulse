"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useQuizStore } from "@/store/quizStore";
import { Award, Briefcase, Cpu, Activity, BarChart3, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";

interface Exam {
  id: string;
  name: string;
  code: string;
  icon: string;
  description: string;
  chaptersCount: number;
  questionsCount: number;
  progress: number;
}

export default function ExamSelectionPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { currentUser } = useQuizStore();

  const fetchExams = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<Exam[]>("/exams");
      setExams(res.data);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [currentUser]); // Reload when currentUser switches to show updated states

  // Icon mapping
  const iconMap: Record<string, any> = {
    Briefcase: Briefcase,
    Award: Award,
    Activity: Activity,
    Cpu: Cpu,
    BarChart3: BarChart3
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center md:text-left">
          <div className="h-4 w-36 bg-slate-800 rounded animate-pulse mb-3 mx-auto md:mx-0" />
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mx-auto md:mx-0" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="glass-card p-6 h-60 flex flex-col justify-between border-[var(--card-border)]">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-slate-800 rounded-xl animate-pulse" />
                  <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-full bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load Exams</h2>
        <p className="text-sm text-slate-400 mb-6">Could not fetch competitive exam configurations. Please ensure the backend is running.</p>
        <button
          onClick={fetchExams}
          className="inline-flex items-center justify-center rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-600 cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4 animate-spin-slow" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-12 text-center sm:text-left">
        <span className="text-xs font-bold uppercase tracking-wider text-green-500">
          SELECT EXAM PARADIGM
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white mt-1">
          Pick your targeted Exam
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Choose a competitive exam courseware card below to browse subject tracks dynamically.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => {
          const IconComponent = iconMap[exam.icon] || Award;
          return (
            <div key={exam.id} className="glass-card p-6 flex flex-col justify-between h-72">
              <div className="space-y-4">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 text-green-500">
                    <IconComponent className="h-5.5 w-5.5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{exam.name}</h2>
                </div>
                
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-3 leading-relaxed">
                  {exam.description}
                </p>
              </div>

              {/* Progress and Link */}
              <div className="mt-6 space-y-4">
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>{exam.chaptersCount} Chapters</span>
                  <span>{exam.questionsCount} Questions</span>
                </div>
                
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>Syllabus Covered</span>
                    <span className="text-green-500">{exam.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500" 
                      style={{ width: `${exam.progress}%` }}
                    />
                  </div>
                </div>

                <Link
                  href={`/subjects/${exam.id}`}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-200 border border-[var(--card-border)] hover:bg-green-500 hover:text-white hover:border-transparent transition-all cursor-pointer"
                >
                  Explore Subjects
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
