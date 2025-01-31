import { Suspense } from 'react';
import QuizPlayPage from '@/app/components/quiz/QuizPlay';

interface QuizPageProps {
  params: {
    id: string;
  };
}

export default async function QuizPage({ params }: QuizPageProps) {
    const { id: quizId } = await params;
    return (
        <div className="container mx-auto px-4">
        <Suspense fallback={
            <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
                <div className="bg-slate-800 rounded-lg p-6">
                <div className="h-8 bg-slate-700 w-1/3 rounded mb-4" />
                <div className="h-2 bg-slate-700 rounded-full mb-6" />
                <div className="space-y-4">
                    <div className="h-6 bg-slate-700 w-3/4 rounded" />
                    <div className="h-4 bg-slate-700 w-full rounded" />
                </div>
                </div>
            </div>
            </div>
        }>
            <div className="max-w-4xl mx-auto">
            
                <QuizPlayPage id={quizId} />
            
            </div>
        </Suspense>
        </div>
    );
}