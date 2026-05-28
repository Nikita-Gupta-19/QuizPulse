"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quizStore";
import { Zap, BookOpen, User, Flame, Bookmark, BarChart3, Sun, Moon, Sparkles, RefreshCw } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    users, 
    currentUser, 
    activeSession, 
    bookmarks,
    theme, 
    loadUsers, 
    selectUser, 
    setTheme 
  } = useQuizStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Initial mount loading
    loadUsers();
    
    // Set theme from local storage
    const savedTheme = localStorage.getItem("quizpulse-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }
  }, [loadUsers, setTheme]);

  const handleUserChange = async (userId: string) => {
    await selectUser(userId);
    setDropdownOpen(false);
    // Refresh page or push to dashboard if we are there to update state
    router.refresh();
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Leaderboard", href: "/leaderboard", icon: Sparkles },
    { name: "Exams", href: "/exams", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--card-border)] bg-[rgba(9,13,22,0.65)] dark:bg-[rgba(9,13,22,0.65)] light:bg-[rgba(250,250,250,0.85)] backdrop-blur-md transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-white shadow-md shadow-green-500/20">
                <Zap className="h-5 w-5 fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Quiz<span className="text-green-500">Pulse</span>
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="mr-1.5 h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Action Items */}
          <div className="flex items-center space-x-3">
            {/* Active Resume Session Pop */}
            {activeSession && pathname !== `/quiz/${activeSession.sessionId}` && (
              <button
                onClick={() => router.push(`/quiz/${activeSession.sessionId}`)}
                className="hidden lg:flex items-center space-x-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-3.5 py-1.5 text-xs font-semibold text-orange-500 animate-pulse hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Resume: {activeSession.chapterName.split(":")[0]}</span>
              </button>
            )}

            {/* Bookmarks Counter */}
            {currentUser && (
              <div className="flex items-center space-x-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Bookmark className="h-3.5 w-3.5 fill-current text-slate-400 dark:text-slate-500" />
                <span>{bookmarks.length}</span>
              </div>
            )}

            {/* Streak Counter */}
            {currentUser && (
              <div className="flex items-center space-x-1 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 px-2.5 py-1.5 text-xs font-bold text-orange-500">
                <Flame className="h-4 w-4 fill-current animate-bounce" />
                <span>{currentUser.streakCount} Day Streak</span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Moon className="h-5 w-5 text-indigo-500" />
              )}
            </button>

            {/* Mock User Selector Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium hover:border-slate-400 dark:hover:border-slate-600 transition-all focus:outline-none"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="h-6 w-6 rounded-md bg-slate-200"
                  />
                  <span className="hidden sm:inline-block max-w-[100px] truncate text-slate-900 dark:text-white font-semibold">
                    {currentUser.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-[var(--card-border)] bg-slate-900/95 dark:bg-slate-900/95 light:bg-white backdrop-blur-xl p-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="px-3 py-2 border-b border-[var(--card-border)] mb-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Recruiter Sandbox Selector
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        Switch accounts to simulate diverse learning profiles and instantly load respective stats.
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {users.slice(0, 10).map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserChange(user.id)}
                          className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                            user.id === currentUser.id
                              ? "bg-green-500/10 text-green-500 border border-green-500/20"
                              : "text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100"
                          }`}
                        >
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="h-8 w-8 rounded-lg bg-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-xs text-white light:text-slate-800">
                              {user.username}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {user.email}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="flex items-center text-[10px] font-bold text-orange-500">
                              <Flame className="h-3 w-3 fill-current mr-0.5" />
                              {user.streakCount}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {user.bookmarkedQuestions?.length || 0} bkmk
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile navigation links */}
      <div className="flex md:hidden border-t border-[var(--card-border)] bg-[rgba(9,13,22,0.9)] px-4 py-2.5 justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {link.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
