import React from 'react';

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
  );
}