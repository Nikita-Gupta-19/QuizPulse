"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuizStore, QuestionData } from "@/store/quizStore";
import { api } from "@/lib/api";
import { 
  ArrowLeft, ArrowRight, Zap, Flame, Bookmark, Clock, 
  HelpCircle, CheckCircle2, XCircle, AlertCircle, RefreshCw, ClipboardList
} from "lucide-react";

export default function QuizWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { 
    currentUser, 
    bookmarks, 
    toggleBookmark, 
    completeQuiz,
    checkActiveSession
  } = useQuizStore();

  // Workspace states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Quiz progress states
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [attemptsTrack, setAttemptsTrack] = useState<Record<number, { selectedOption: number | null, isCorrect: boolean | null, skipped: boolean }>>({});
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Chronological timestamps
  const [shownAt, setShownAt] = useState<string>("");

  // Streak notification states
  const [showStreakBanner, setShowStreakBanner] = useState(false);
  const [streakVal, setStreakVal] = useState(0);

  // Submit Modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Question details
  const fetchQuestion = useCallback(async (index: number) => {
    setLoading(true);
    setError(false);
    
    // Clear previous attempt inputs
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setCorrectOption(null);
    setFeedbackMsg("");
    
    try {
      const res = await api.get(`/quiz/question/${sessionId}?questionIndex=${index}`);
      const data = res.data;
      
      setQuestion(data.question);
      setTotalQuestions(data.totalQuestions);
      setCurrentIndex(data.currentQuestionIndex);
      
      // Keep track of shown time for accuracy response recording
      const nowStr = new Date().toISOString();
      setShownAt(nowStr);
      
      // Timer setup
      setTimeLeft(data.question.estimatedTime || 30);
      
      // If already attempted, load the attempt
      if (data.attempt) {
        setSelectedOption(data.attempt.selectedOption);
        setIsAnswered(true);
        setIsCorrect(data.attempt.isCorrect);
        setCorrectOption(null); // correct option not returned unless submitted
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load current question on startup
  useEffect(() => {
    if (sessionId) {
      fetchQuestion(0);
    }
  }, [sessionId, fetchQuestion]);

  // Load session progress once user details are resolved
  useEffect(() => {
    if (sessionId && currentUser?.id) {
      loadSessionProgress();
    }
  }, [sessionId, currentUser?.id]);

  // Load aggregate palette responses
  const loadSessionProgress = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await api.get(`/quiz/active-session/${currentUser.id}`);
      if (res.data && res.data.sessionId === sessionId) {
        // Load answered tracker by iterating questions if needed
        const track: typeof attemptsTrack = {};
        for (let i = 0; i < res.data.totalQuestions; i++) {
          const qRes = await api.get(`/quiz/question/${sessionId}?questionIndex=${i}`);
          if (qRes.data.attempt) {
            track[i] = {
              selectedOption: qRes.data.attempt.selectedOption,
              isCorrect: qRes.data.attempt.isCorrect,
              skipped: qRes.data.attempt.skipped
            };
          }
        }
        setAttemptsTrack(track);
      }
    } catch (e) {
      console.log("Failed to load session progress map:", e);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (loading || isAnswered || error) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSkipQuestion(); // Auto-skip on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isAnswered, error, currentIndex]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || isAnswered || !question) return;
      
      if (e.key === "1") handleOptionSelect(0);
      else if (e.key === "2") handleOptionSelect(1);
      else if (e.key === "3") handleOptionSelect(2);
      else if (e.key === "4") handleOptionSelect(3);
      else if (e.key === "Enter" && selectedOption !== null) {
        handleSubmitAnswer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, isAnswered, question, selectedOption]);

  const handleOptionSelect = (optIdx: number) => {
    if (isAnswered) return;
    setSelectedOption(optIdx);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || isAnswered || !question) return;
    
    setIsAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await api.post("/quiz/answer", {
        sessionId,
        questionId: question.id,
        selectedOption,
        skipped: false,
        shownAt,
        answeredAt: new Date().toISOString()
      });

      const { isCorrect, correctOption, motivationalCopy, streakCount, streakIncremented } = res.data;
      
      setIsCorrect(isCorrect);
      setCorrectOption(correctOption);
      setFeedbackMsg(motivationalCopy);
      
      // Update local attempt trace
      const updatedTrack = {
        ...attemptsTrack,
        [currentIndex]: { selectedOption, isCorrect, skipped: false }
      };
      setAttemptsTrack(updatedTrack);

      if (streakIncremented) {
        setStreakVal(streakCount);
        setShowStreakBanner(true);
        setTimeout(() => setShowStreakBanner(false), 3000);
      }
    } catch (e) {
      console.error(e);
      setIsAnswered(false);
      alert("Failed to record response. Try again.");
    }
  };

  const handleSkipQuestion = async () => {
    if (isAnswered || !question) return;
    
    setIsAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedOption(null);

    try {
      const res = await api.post("/quiz/answer", {
        sessionId,
        questionId: question.id,
        selectedOption: null,
        skipped: true,
        shownAt,
        answeredAt: new Date().toISOString()
      });

      const { motivationalCopy } = res.data;
      setIsCorrect(null);
      setCorrectOption(res.data.correctOption);
      setFeedbackMsg(motivationalCopy);

      const updatedTrack = {
        ...attemptsTrack,
        [currentIndex]: { selectedOption: null, isCorrect: null, skipped: true }
      };
      setAttemptsTrack(updatedTrack);
    } catch (e) {
      console.error(e);
      setIsAnswered(false);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      fetchQuestion(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      fetchQuestion(currentIndex - 1);
    }
  };

  const handleCompleteSession = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmission = async () => {
    setSubmitting(true);
    try {
      await completeQuiz(sessionId);
      await checkActiveSession();
      setShowSubmitModal(false);
      router.push(`/summary/${sessionId}`);
    } catch (e) {
      console.error(e);
      alert("Failed to complete quiz session.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionLetter = (idx: number) => {
    return ["A", "B", "C", "D"][idx];
  };

  const isBookmarked = question ? bookmarks.includes(question.id) : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col justify-start relative z-10">
      
      {/* Streak Fire Banner Popup */}
      {showStreakBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-orange-500 text-white px-6 py-3 shadow-2xl flex items-center space-x-3 border border-orange-400 animate-float">
          <Flame className="h-6 w-6 fill-current animate-bounce text-yellow-300" />
          <div>
            <p className="font-extrabold text-sm">Learning Streak Extended!</p>
            <p className="text-[11px] font-bold text-orange-100">🔥 {streakVal} Days Consistent Learning!</p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--card-border)] pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (confirm("Go back? Your session progress will be auto-saved and can be resumed later.")) {
                router.push("/exams");
              }
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Micro-learning Quiz
            </h1>
            <span className="text-xs text-green-500 font-semibold mt-0.5">
              WhatsApp Mode • Auto-saving active
            </span>
          </div>
        </div>

        {/* Timer Box */}
        {question && (
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border font-bold text-sm transition-all ${
            isAnswered 
              ? "bg-slate-800/50 text-slate-400 border-slate-700" 
              : timeLeft <= 5
              ? "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse"
              : "bg-green-500/10 text-green-500 border-green-500/20"
          }`}>
            <Clock className="h-4 w-4" />
            <span>{isAnswered ? "Completed" : `${timeLeft}s left`}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Side: Question workspace (takes 3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Question {currentIndex + 1} of {totalQuestions}</span>
              <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}% coverage</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {loading ? (
            <div className="glass-card p-8 h-80 flex flex-col justify-between animate-pulse">
              <div className="space-y-4">
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-6 w-full bg-slate-800 rounded" />
                <div className="h-6 w-5/6 bg-slate-800 rounded" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-14 bg-slate-800 rounded-xl" />
                <div className="h-14 bg-slate-800 rounded-xl" />
              </div>
            </div>
          ) : error || !question ? (
            <div className="glass-card p-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4 animate-bounce" />
              <h3 className="text-base font-bold text-slate-200">Failed to render Question</h3>
              <p className="text-xs text-slate-400 mt-1">Please check backend database indices or refresh page.</p>
              <button onClick={() => fetchQuestion(currentIndex)} className="mt-4 px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-xs">
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Question Card (WhatsApp Chat Bubble Vibe) */}
              <div className="glass-card p-6 border-[var(--card-border)] relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex items-center space-x-2 rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold text-green-500 border border-green-500/20 uppercase">
                    <Zap className="h-3 w-3 fill-current mr-0.5" />
                    {question.difficulty}
                  </div>
                  
                  {/* Bookmark Button */}
                  <button
                    onClick={() => toggleBookmark(question.id)}
                    className="p-1.5 rounded-xl border border-[var(--card-border)] bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 text-slate-400 hover:text-yellow-400 transition-all cursor-pointer"
                    title={isBookmarked ? "Remove Bookmark" : "Bookmark Question"}
                  >
                    <Bookmark className={`h-4.5 w-4.5 ${isBookmarked ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  </button>
                </div>

                <div className="mt-4 text-slate-800 dark:text-white text-base sm:text-lg font-bold leading-relaxed">
                  {question.questionText}
                </div>
                
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {question.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Option Choices */}
              <div className="grid grid-cols-1 gap-3.5">
                {question.options.map((opt, oIdx) => {
                  const isSelected = selectedOption === oIdx;
                  
                  // Styling states
                  let cardStyle = "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200";
                  
                  if (isAnswered) {
                    if (isSelected) {
                      cardStyle = isCorrect
                        ? "border-green-500 bg-green-500/10 text-green-500"
                        : "border-red-500 bg-red-500/10 text-red-500";
                    } else if (correctOption === oIdx) {
                      cardStyle = "border-green-500 bg-green-500/10 text-green-500";
                    } else {
                      cardStyle = "border-[var(--card-border)] bg-[var(--card-bg)] opacity-40 text-slate-500";
                    }
                  } else if (isSelected) {
                    cardStyle = "border-green-500 bg-green-500/5 text-green-500 shadow-md ring-1 ring-green-500/20";
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={isAnswered}
                      onClick={() => handleOptionSelect(oIdx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center space-x-4 cursor-pointer ${cardStyle}`}
                    >
                      <span className={`h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? "bg-green-500 text-white border-transparent"
                          : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 border-[var(--card-border)]"
                      }`}>
                        {getOptionLetter(oIdx)}
                      </span>
                      <span className="text-sm font-semibold flex-1 leading-relaxed">
                        {opt}
                      </span>
                      
                      {/* Interactive Correct/Incorrect status icon */}
                      {isAnswered && (
                        <span className="shrink-0">
                          {isSelected && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 fill-current" />}
                          {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500 fill-current" />}
                          {!isSelected && correctOption === oIdx && <CheckCircle2 className="h-5 w-5 text-green-500 fill-current" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Submited Feedback / Motivational microcopy */}
              {isAnswered && feedbackMsg && (
                <div className={`p-4 rounded-2xl border flex items-start space-x-3 text-xs font-semibold leading-relaxed animate-float ${
                  isCorrect === true
                    ? "bg-green-500/10 border-green-500/20 text-green-500"
                    : isCorrect === false
                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}>
                  {isCorrect === true ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ) : isCorrect === false ? (
                    <XCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <HelpCircle className="h-5 w-5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-sm">{isCorrect === true ? "Brilliant!" : isCorrect === false ? "Almost There!" : "Skipped"}</p>
                    <p className="mt-0.5 font-medium text-slate-500 dark:text-slate-400">{feedbackMsg}</p>
                  </div>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <button
                  disabled={currentIndex === 0 || loading}
                  onClick={handlePrevious}
                  className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Previous
                </button>

                {!isAnswered ? (
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={loading}
                      onClick={handleSkipQuestion}
                      className="px-5 py-3 rounded-xl border border-transparent bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Skip Question
                    </button>
                    <button
                      disabled={selectedOption === null || loading}
                      onClick={handleSubmitAnswer}
                      className="px-6 py-3 rounded-xl bg-green-500 text-xs font-bold text-white shadow-md hover:bg-green-600 hover:shadow-green-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      Submit Answer
                    </button>
                  </div>
                ) : (
                  <div>
                    {currentIndex + 1 < totalQuestions ? (
                      <button
                        onClick={handleNext}
                        className="px-6 py-3 rounded-xl bg-green-500 text-xs font-bold text-white shadow-md hover:bg-green-600 hover:shadow-green-500/20 transition-all flex items-center cursor-pointer"
                      >
                        Next Question
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleCompleteSession}
                        className="px-6 py-3 rounded-xl bg-orange-500 text-xs font-bold text-white shadow-md hover:bg-orange-600 hover:shadow-orange-500/25 transition-all flex items-center cursor-pointer"
                      >
                        <ClipboardList className="mr-1.5 h-4 w-4" />
                        Finish & View Score
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Sandbox Keyboard shortcuts tip */}
              <div className="hidden md:flex justify-center items-center text-[10px] font-bold text-slate-500 space-x-4">
                <span>⌨️ Shortcuts: [1, 2, 3, 4] to choose option</span>
                <span>•</span>
                <span>[Enter] to submit/advance</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Question Palette (takes 1 col) */}
        <div className="glass-card p-5 space-y-5 border-[var(--card-border)] bg-[rgba(15,23,42,0.3)]">
          <div className="flex items-center space-x-2 border-b border-[var(--card-border)] pb-3">
            <ClipboardList className="h-4.5 w-4.5 text-green-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Question Palette
            </h3>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Jump to any micro-question instantly. Colors reflect attempted status.
          </p>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: totalQuestions }).map((_, idx) => {
              const attempt = attemptsTrack[idx];
              const isCurrent = idx === currentIndex;
              
              let paletteStyle = "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-500";
              
              if (attempt) {
                if (attempt.skipped) {
                  paletteStyle = "border-slate-600 bg-slate-800 text-slate-300";
                } else {
                  paletteStyle = attempt.isCorrect
                    ? "border-green-500 bg-green-500/20 text-green-500 font-bold"
                    : "border-red-500 bg-red-500/20 text-red-500 font-bold";
                }
              }

              if (isCurrent) {
                paletteStyle += " ring-2 ring-green-500 ring-offset-2 ring-offset-[#090d16]";
              }

              return (
                <button
                  key={idx}
                  onClick={() => fetchQuestion(idx)}
                  className={`h-9 w-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${paletteStyle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="border-t border-[var(--card-border)] pt-4 space-y-2 text-[10px] font-bold text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded bg-green-500/20 border border-green-500 shrink-0" />
              <span>Correct Answer</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded bg-red-500/20 border border-red-500 shrink-0" />
              <span>Incorrect Answer</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded bg-slate-800 border border-slate-600 shrink-0" />
              <span>Skipped</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded bg-slate-950 border border-slate-800 shrink-0" />
              <span>Unattempted</span>
            </div>
          </div>

          {/* Submit Quiz Button */}
          <div className="border-t border-[var(--card-border)] pt-4">
            <button
              onClick={handleCompleteSession}
              className="w-full py-3 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-bold text-orange-500 hover:bg-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" />
              Submit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 border-[var(--card-border)] bg-[#0f172a] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-orange-500/10 blur-[30px] pointer-events-none" />
            
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <span>Submit Quiz Session?</span>
            </h3>
            
            <p className="text-xs text-slate-400 mt-3 font-semibold leading-relaxed">
              You have answered <span className="text-green-500 font-extrabold">{Object.values(attemptsTrack).filter(a => a.selectedOption !== null && !a.skipped).length}</span> out of <span className="text-slate-200 font-extrabold">{totalQuestions}</span> questions.
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
              Once submitted, your scorecard will be compiled and you can view detailed SaaS Analytics.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--card-border)] bg-slate-800/40 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={confirmSubmission}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-500 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
