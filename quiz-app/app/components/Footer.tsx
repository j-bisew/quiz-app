'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/app/services/mqtt';

export default function Footer() {
  const [userCount, setUserCount] = useState<number>(1);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  
    socket.on('connect', () => {
      console.log('Socket connected in Footer');
      setIsConnected(true);
    });
  
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });
  
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });
  
    socket.on('userCount', ({ count }) => {
      console.log('Received user count:', count);
      setUserCount(count);
    });
  
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('userCount');
    };
  }, []);

  return (
    <footer className="fixed bottom-0 w-full bg-gray-800 text-white py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <p>© 2024 QuizIt</p>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <p>{userCount} {userCount === 1 ? 'user' : 'users'} in room</p>
        </div>
      </div>
    </footer>
  );
}