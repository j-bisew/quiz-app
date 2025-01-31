'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from './modal';
import SignIn from './auth/signIn';
import SignUp from './auth/signUp';
import UserMenu from './userMenu';
import type { SignUpData, SignInData, User } from './types/auth';
import { authService } from '@/app/services/auth';

export default function Navbar() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  
  const handleSignIn = async (data: SignInData) => {
    try {
      setAuthError(null);
      const userRes = await authService.login(data.email, data.password);
      if (userRes.error) {
        setAuthError(userRes.error);
        return;
      }
        setAuthError(null);
      if (userRes.data) {
        setAuthError(null);
        localStorage.setItem('user', JSON.stringify(userRes.data.user));
        setUser(userRes.data.user as User);
        setTimeout(() => {
          setShowSignIn(false);
          router.push('/quizzes');
        }, 100);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to sign in');
    }
  }

  const handleSignUp = async (data: SignUpData) => {
    try {
      setAuthError(null);
      const user = await authService.register(data.username, data.email, data.password);
      if (user.error) {
        setAuthError(user.error);
        return;
      }
      if (user.data) {
        setAuthError(null);
        localStorage.setItem('user', JSON.stringify(user.data.user));
        setUser(user.data.user);
        setTimeout(() => {
        setShowSignUp(false);
        router.push('/quizzes');
      }, 100);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to sign up');
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  }

  return (
    <>
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-blue-500">
              QuizIt
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/quizzes" className="text-slate-300 hover:text-slate-100 transition-colors">
                Quizzes
              </Link>
              
              {user && (
                <Link href="/create" className="text-slate-300 hover:text-slate-100 transition-colors">
                  Create Quiz
                </Link>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <UserMenu user={user} onLogout={handleLogout} />
              ) : (
                <>
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowSignUp(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Modal isOpen={showSignIn} onClose={() => setShowSignIn(false)}>
        <SignIn
          onSignIn={handleSignIn}
          onSwitchToSignUp={() => {
            setShowSignIn(false);
            setShowSignUp(true);
            setAuthError(null);
          }}
          error={authError}
        />
      </Modal>

      <Modal isOpen={showSignUp} onClose={() => setShowSignUp(false)}>
        <SignUp
          onSignUp={handleSignUp}
          onSwitchToSignIn={() => {
            setShowSignUp(false);
            setShowSignIn(true);
            setAuthError(null);
          }}
          error={authError}
        />
      </Modal>
    </>
  );
}