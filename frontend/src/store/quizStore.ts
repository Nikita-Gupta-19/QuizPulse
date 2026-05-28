import { create } from "zustand";
import { api } from "@/lib/api";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  streakCount: number;
  lastActiveDate: string | null;
  bookmarkedQuestions: string[];
}

export interface ActiveSession {
  sessionId: string;
  chapterId: string;
  chapterName: string;
  totalQuestions: number;
  answeredQuestions: number;
  startedAt: string;
}

export interface QuizAttempt {
  selectedOption: number | null;
  skipped: boolean;
  isCorrect: boolean | null;
  responseTime: number;
}

export interface QuestionData {
  id: string;
  questionText: string;
  options: string[];
  difficulty: string;
  estimatedTime: number;
  tags: string[];
  bookmarked: boolean;
}

export interface QuizSummary {
  sessionId: string;
  chapterId: string;
  score: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedAnswers: number;
  attemptedQuestions: number;
  unattemptedQuestions: number;
  averageResponseTime: number;
  totalQuestions: number;
  feedback: string;
}

interface QuizState {
  users: UserProfile[];
  currentUser: UserProfile | null;
  activeSession: ActiveSession | null;
  currentSessionId: string | null;
  currentQuestionIndex: number;
  sessionStatus: "IDLE" | "LOADING" | "IN_PROGRESS" | "COMPLETED";
  activeQuizSummary: QuizSummary | null;
  bookmarks: string[];
  theme: "light" | "dark";
  
  // Actions
  loadUsers: () => Promise<void>;
  selectUser: (userId: string) => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  checkActiveSession: () => Promise<void>;
  startQuiz: (chapterId: string) => Promise<string>;
  resumeQuiz: (session: ActiveSession) => void;
  completeQuiz: (sessionId: string) => Promise<QuizSummary>;
  setTheme: (theme: "light" | "dark") => void;
  resetQuizState: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  users: [],
  currentUser: null,
  activeSession: null,
  currentSessionId: null,
  currentQuestionIndex: 0,
  sessionStatus: "IDLE",
  activeQuizSummary: null,
  bookmarks: [],
  theme: "dark",

  loadUsers: async () => {
    try {
      const res = await api.get<UserProfile[]>("/users");
      const users = res.data;
      set({ users });
      
      // Default to recruiter demo if found, otherwise first user
      const recruiter = users.find(u => u.email === "recruiter@skillbytes.com") || users[0];
      if (recruiter) {
        set({ 
          currentUser: recruiter, 
          bookmarks: recruiter.bookmarkedQuestions || [] 
        });
        await get().checkActiveSession();
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  },

  selectUser: async (userId: string) => {
    const { users } = get();
    const user = users.find(u => u.id === userId);
    if (user) {
      set({ 
        currentUser: user, 
        bookmarks: user.bookmarkedQuestions || [],
        currentSessionId: null,
        currentQuestionIndex: 0,
        sessionStatus: "IDLE",
        activeQuizSummary: null
      });
      await get().checkActiveSession();
    }
  },

  toggleBookmark: async (questionId: string) => {
    const { currentUser, bookmarks } = get();
    if (!currentUser) return;

    const isBookmarked = bookmarks.includes(questionId);
    const action = isBookmarked ? "remove" : "add";

    // Optimistic UI update
    const updatedBookmarks = isBookmarked 
      ? bookmarks.filter(id => id !== questionId)
      : [...bookmarks, questionId];
    
    set({ bookmarks: updatedBookmarks });

    try {
      await api.post(`/users/${currentUser.id}/bookmark`, {
        questionId,
        action
      });
      
      // Update inside users array
      set(state => ({
        users: state.users.map(u => 
          u.id === state.currentUser?.id 
            ? { ...u, bookmarkedQuestions: updatedBookmarks }
            : u
        ),
        currentUser: state.currentUser 
          ? { ...state.currentUser, bookmarkedQuestions: updatedBookmarks }
          : null
      }));
    } catch (e) {
      // Revert if error
      console.error("Failed to toggle bookmark:", e);
      set({ bookmarks });
    }
  },

  checkActiveSession: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    try {
      const res = await api.get<ActiveSession | null>(`/quiz/active-session/${currentUser.id}`);
      set({ activeSession: res.data });
    } catch (e) {
      console.error("Failed to check active session:", e);
    }
  },

  startQuiz: async (chapterId: string) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error("No active user selected");

    set({ sessionStatus: "LOADING" });
    try {
      const res = await api.post("/quiz/start", {
        userId: currentUser.id,
        chapterId
      });
      
      const { sessionId, currentQuestionIndex } = res.data;
      
      set({
        currentSessionId: sessionId,
        currentQuestionIndex,
        sessionStatus: "IN_PROGRESS",
        activeQuizSummary: null
      });

      await get().checkActiveSession();
      return sessionId;
    } catch (e) {
      set({ sessionStatus: "IDLE" });
      throw e;
    }
  },

  resumeQuiz: (session: ActiveSession) => {
    set({
      currentSessionId: session.sessionId,
      currentQuestionIndex: session.answeredQuestions,
      sessionStatus: "IN_PROGRESS",
      activeQuizSummary: null
    });
  },

  completeQuiz: async (sessionId: string) => {
    set({ sessionStatus: "LOADING" });
    try {
      const res = await api.post<QuizSummary>("/quiz/complete", { sessionId });
      const summary = res.data;
      
      set({
        sessionStatus: "COMPLETED",
        activeQuizSummary: summary,
        activeSession: null
      });

      // Reload user profile in background to update streaks and active stats
      if (get().currentUser) {
        const uRes = await api.get<UserProfile>(`/users/${get().currentUser?.id}`);
        set(state => ({
          currentUser: uRes.data,
          users: state.users.map(u => u.id === uRes.data.id ? uRes.data : u)
        }));
      }

      return summary;
    } catch (e) {
      set({ sessionStatus: "IN_PROGRESS" });
      throw e;
    }
  },

  setTheme: (theme: "light" | "dark") => {
    set({ theme });
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme);
      localStorage.setItem("quizpulse-theme", theme);
    }
  },

  resetQuizState: () => {
    set({
      currentSessionId: null,
      currentQuestionIndex: 0,
      sessionStatus: "IDLE",
      activeQuizSummary: null
    });
  },
}));
