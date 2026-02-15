import React, { useState } from 'react';
import { Sidebar } from '../components/Layout/Sidebar';
import { EmptyState } from '../components/Chat/EmptyState';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { Chat } from '../types';

const ChatPage: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className={`
        flex-shrink-0 h-full w-full md:w-[350px] lg:w-[400px] border-r border-slate-800
        ${selectedChat ? 'hidden md:block' : 'block'} 
      `}>
        <Sidebar 
          activeChatId={selectedChat?.id} 
          onChatSelect={(chat) => setSelectedChat(chat)} 
        />
      </div>

      {/* Main Chat Area */}
      <main className={`
        flex-1 flex-col h-full bg-slate-900 relative shadow-2xl
        ${selectedChat ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedChat ? (
          <ChatWindow 
            key={selectedChat.id} 
            chat={selectedChat} 
            onBack={() => setSelectedChat(null)} 
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
};

export default ChatPage;