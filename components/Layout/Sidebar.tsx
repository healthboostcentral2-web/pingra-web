import React, { useState } from 'react';
import { Settings, LogOut, Plus } from 'lucide-react';
import { ChatList } from '../Chat/ChatList';
import { Chat } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NewChatModal } from '../Chat/NewChatModal';
import { StoryList } from '../Story/StoryList';
import { SettingsModal } from '../Settings/SettingsModal';

interface SidebarProps {
  activeChatId?: string;
  onChatSelect: (chat: Chat) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeChatId, onChatSelect, className = '' }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const avatarUrl = currentUser?.photoURL || null;
  const displayName = currentUser?.displayName || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <>
      <aside className={`flex flex-col h-full bg-slate-950 border-r border-slate-800 ${className}`}>
        {/* Header Profile */}
        <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
               {avatarUrl ? (
                 <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
               ) : (
                 initials
               )}
            </div>
            <div className="hidden md:block">
              <h2 className="text-sm font-semibold text-white max-w-[120px] truncate">{displayName}</h2>
              <p className="text-xs text-slate-500">Online</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors" 
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors" 
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stories */}
        <StoryList />

        {/* Chat List Area */}
        <ChatList activeChatId={activeChatId} onChatSelect={onChatSelect} />
      </aside>

      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
        onChatCreated={(chat) => {
            onChatSelect(chat);
            setIsNewChatModalOpen(false);
        }}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};