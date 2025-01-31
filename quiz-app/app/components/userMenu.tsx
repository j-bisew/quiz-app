'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from './types/auth';

interface UserMenuProps {
    user: User;
    onLogout: () => void;
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClick(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const userInitial = user?.name?.charAt(0).toUpperCase() || '';

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center focus:outline-none"
            >
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                    {userInitial}
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-slate-700 divide-y divide-slate-700">
                    <div className="px-4 py-3">
                        <p className="text-sm text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div className='py-1'>
                        <button
                            onClick={() => {
                                router.push('/profile');
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                        >
                            Profile
                        </button>
                    </div>

                    <div className="py-1">
                        <button
                            onClick={() => {
                                onLogout();
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}