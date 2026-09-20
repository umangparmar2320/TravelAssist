import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Route Optimization System - Part A Foundation",
  description: "Next.js & FastAPI Clean Architecture Foundation for Multi-Modal Route Planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
