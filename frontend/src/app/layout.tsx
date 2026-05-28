import type { Metadata } from "next";
import "./globals.css";
import { Navbar, Footer } from "@/components/shared";

export const metadata: Metadata = {
  title: "QuizPulse — WhatsApp Style Micro-Learning Analytics Platform",
  description: "A premium micro-learning EdTech dashboard platform with real-time streak trackers, bookmark management, and advanced MongoDB aggregations analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#090d16] text-[#f8fafc] transition-colors duration-300">
        <Navbar />
        <main className="flex-1 flex flex-col justify-start">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
