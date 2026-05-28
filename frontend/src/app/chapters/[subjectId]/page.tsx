"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useQuizStore } from "@/store/quizStore";
import { ChevronRight, AlertCircle, RefreshCw, BookOpen, ArrowLeft, Clock, BarChart, CheckCircle2, Award } from "lucide-react";

interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  estimatedTime: number;
  difficulty: string;
  totalQuestions: number;
  completed: boolean;
  bestScore?: number | null;
}

export default function ChapterSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjectName, setSubjectName] = useState("Selected Subject");
  const [examId, setExamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const { startQuiz, currentUser } = useQuizStore();

  const fetchChapters = async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Fetch chapters
      const url = currentUser?.id 
        ? `/chapters/${subjectId}?userId=${currentUser.id}` 
        : `/chapters/${subjectId}`;
      const chapRes = await api.get<Chapter[]>(url);
      setChapters(chapRes.data);
      
      // 2. Fetch subject and exam info for title
      const examsRes = await api.get("/exams");
      let found = false;
      for (const exam of examsRes.data) {
        const subsRes = await api.get(`/subjects/${exam.id}`);
        const currentSub = subsRes.data.find((s: any) => s.id === subjectId);
        if (currentSub) {
          setSubjectName(currentSub.name);
          setExamId(exam.id);
          found = true;
          break;
        }
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subjectId) {
      fetchChapters();
    }
  }, [subjectId, currentUser]);

  const handleStartQuiz = async (chapterId: string) => {
    setLaunchingId(chapterId);
    try {
      const sessionId = await startQuiz(chapterId);
      // Push to the premium quiz workspace!
      router.push(`/quiz/${sessionId}`);
    } catch (e) {
      console.error("Failed to start quiz session:", e);
      alert("Error initializing quiz session. Please make sure the backend is active.");
      setLaunchingId(null);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "Medium":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "Hard":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-10" />
        <div className="space-y-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="glass-card p-6 h-28 flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-96 bg-slate-800 rounded animate-pulse" />
              </div>
              <div className="h-10 w-28 bg-slate-800 rounded-xl animate-pulse" />
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load Chapters</h2>
        <p className="text-sm text-slate-400 mb-6">Could not fetch chapters. Verify the backend connection.</p>
        <button
          onClick={fetchChapters}
          className="inline-flex items-center justify-center rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-600 cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Back Button */}
      <button
        onClick={() => router.push(examId ? `/subjects/${examId}` : "/exams")}
        className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Subjects
      </button>

      {/* Header */}
      <div className="mb-12">
        <span className="text-xs font-bold uppercase tracking-wider text-green-500">
          {subjectName}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white mt-1">
          Select Chapter
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Choose a chapter card to launch your interactive micro-learning quiz workspace.
        </p>
      </div>

      {chapters.length === 0 ? (
        <div className="glass-card p-12 text-center max-w-md mx-auto">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No chapters found</h3>
          <p className="text-xs text-slate-500 mt-1">This subject does not have any populated chapters yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {chapters.map((chap) => {
            const isLaunching = launchingId === chap.id;
            return (
              <div 
                key={chap.id} 
                className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-[var(--card-border)] hover:border-green-500/50"
              >
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {chap.name}
                      {chap.completed && (
                        <CheckCircle2 className="h-4.5 w-4.5 text-green-500 fill-current" />
                      )}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDifficultyColor(chap.difficulty)}`}>
                      {chap.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {chap.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      {chap.estimatedTime} Min
                    </span>
                    <span className="flex items-center">
                      <BarChart className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      {chap.totalQuestions} Questions
                    </span>
                    {chap.bestScore !== undefined && chap.bestScore !== null && (
                      <span className="flex items-center text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md text-[10px]">
                        <Award className="h-3.5 w-3.5 mr-1 text-orange-500 animate-float" />
                        Best Score: {chap.bestScore}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end md:justify-center">
                  <button
                    disabled={isLaunching}
                    onClick={() => handleStartQuiz(chap.id)}
                    className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-xs font-bold shadow-md transition-all cursor-pointer ${
                      isLaunching
                        ? "bg-slate-800 text-slate-500 border border-slate-700"
                        : "bg-green-500 text-white hover:bg-green-600 hover:shadow-green-500/20"
                    }`}
                  >
                    {isLaunching ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        Start Learning Quiz
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
