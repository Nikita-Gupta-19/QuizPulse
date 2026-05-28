"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useQuizStore } from "@/store/quizStore";
import { ChevronRight, AlertCircle, RefreshCw, BookOpen, ArrowLeft } from "lucide-react";

interface Subject {
  id: string;
  examId: string;
  name: string;
  description: string;
  chaptersCount: number;
  progress: number;
}

export default function SubjectSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examName, setExamName] = useState("Selected Exam");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { currentUser } = useQuizStore();

  const fetchSubjects = async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Fetch subjects
      const subRes = await api.get<Subject[]>(`/subjects/${examId}`);
      setSubjects(subRes.data);
      
      // 2. Fetch exam info for title
      const examsRes = await api.get("/exams");
      const currentExam = examsRes.data.find((e: any) => e.id === examId);
      if (currentExam) {
        setExamName(currentExam.name);
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchSubjects();
    }
  }, [examId, currentUser]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-10" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="glass-card p-6 h-56 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-6 w-40 bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-full bg-slate-800 rounded animate-pulse" />
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
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load Subjects</h2>
        <p className="text-sm text-slate-400 mb-6">Could not fetch subjects. Verify the backend connection.</p>
        <button
          onClick={fetchSubjects}
          className="inline-flex items-center justify-center rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-600 cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4 animate-spin-slow" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Back Button */}
      <button
        onClick={() => router.push("/exams")}
        className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Exams
      </button>

      {/* Header */}
      <div className="mb-12">
        <span className="text-xs font-bold uppercase tracking-wider text-green-500">
          {examName}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white mt-1">
          Explore Subjects
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Choose a subject track from this exam to reveal dynamic bite-sized learning chapters.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="glass-card p-12 text-center max-w-md mx-auto">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No subjects found</h3>
          <p className="text-xs text-slate-500 mt-1">This exam does not have any populated subjects yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => (
            <div key={sub.id} className="glass-card p-6 flex flex-col justify-between h-64">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-2">
                    {sub.name}
                  </h2>
                  <span className="shrink-0 px-2.5 py-1 rounded-full bg-green-500/10 text-[10px] font-bold text-green-500 border border-green-500/20">
                    {sub.chaptersCount} Chapters
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-3 leading-relaxed">
                  {sub.description}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {/* Simulated subject progress */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>Active coverage</span>
                    <span className="text-green-500">{sub.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${sub.progress}%` }}
                    />
                  </div>
                </div>

                <Link
                  href={`/chapters/${sub.id}`}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-200 border border-[var(--card-border)] hover:bg-green-500 hover:text-white hover:border-transparent transition-all cursor-pointer"
                >
                  View Chapters
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
