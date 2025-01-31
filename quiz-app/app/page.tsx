import Link from 'next/link';
import { Brain, Search, Trophy, Users } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900">
      <section className="bg-slate-800 py-20">
        <div className="container">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-100 mb-6">
              Welcome to QuizIt
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Challenge yourself with interactive quizzes and learn something new every day
            </p>
            <div className="space-x-4">
              <Link 
                href="/quizzes" 
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start a Quiz
              </Link>
              <Link
                href="/create"
                className="inline-block bg-slate-700 text-slate-200 px-8 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                Create Quiz
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Brain />}
              title="Multiple Quiz Types"
              description="Choose from various quiz types including single or multiple choice and open questions"
            />
            <FeatureCard
              icon={<Search />}
              title="Easy Search"
              description="Find quizzes by category, difficulty level, or keywords"
            />
            <FeatureCard
              icon={<Trophy />}
              title="Earn Achievements"
              description="Complete quizzes to earn badges and climb the leaderboard"
            />
            <FeatureCard
              icon={<Users />}
              title="Community Driven"
              description="Join a community of quiz creators and learners"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="w-12 h-12 text-blue-500 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-slate-100">{title}</h3>
      <p className="text-slate-300">
        {description}
      </p>
    </div>
  );
}