import React from 'react';
import { MessageSquareDashed } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-8 h-full">
      <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <MessageSquareDashed className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to Pingra</h2>
      <p className="text-center max-w-md text-slate-500">
        Select a conversation from the sidebar to start chatting, or search for new friends to connect with.
      </p>
      <div className="mt-8 flex gap-2">
        <div className="h-1 w-16 bg-slate-800 rounded-full"></div>
        <div className="h-1 w-8 bg-slate-800 rounded-full"></div>
        <div className="h-1 w-4 bg-slate-800 rounded-full"></div>
      </div>
    </div>
  );
};