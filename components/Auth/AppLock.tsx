import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AppLock: React.FC = () => {
  const { unlockApp } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockApp(pin)) {
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">App Locked</h2>
      <p className="text-slate-400 mb-8">Enter your PIN to access Pingra</p>

      <form onSubmit={handleUnlock} className="w-full max-w-xs">
        <input
          type="password"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={`
            w-full bg-slate-900 border text-center text-2xl tracking-[0.5em] rounded-xl py-4 mb-4 text-white
            focus:outline-none focus:ring-2 focus:ring-primary transition-all
            ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-800'}
          `}
          placeholder="••••"
          autoFocus
        />
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">Incorrect PIN</p>
        )}
        <button
          type="submit"
          className="w-full bg-primary hover:bg-indigo-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Unlock className="w-5 h-5" /> Unlock
        </button>
      </form>
    </div>
  );
};