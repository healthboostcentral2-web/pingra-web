import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Chat } from '../../types';
import { db, database } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../UI/Skeleton';

interface ChatListProps {
  activeChatId?: string;
  onChatSelect: (chat: Chat) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ activeChatId, onChatSelect }) => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [userStatuses, setUserStatuses] = useState<Record<string, 'online' | 'offline'>>({});

  // 1. Fetch Chats
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = db.collection('chats')
      .where('members', 'array-contains', currentUser.uid)
      .orderBy('lastTime', 'desc')
      .onSnapshot((snapshot) => {
        const fetchedChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Chat[];
        setChats(fetchedChats);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Fetch User Statuses (Realtime Database)
  useEffect(() => {
    if (chats.length === 0 || !currentUser) return;

    const userIds = new Set<string>();
    chats.forEach(chat => {
      chat.members.forEach(memberId => {
        if (memberId !== currentUser.uid) userIds.add(memberId);
      });
    });

    const listeners: Function[] = [];

    userIds.forEach(uid => {
      const statusRef = database.ref('/status/' + uid);
      const listener = statusRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserStatuses(prev => ({ ...prev, [uid]: data.state }));
        }
      });
      listeners.push(() => statusRef.off('value', listener));
    });

    return () => {
      listeners.forEach(off => off());
    };
  }, [chats, currentUser]);

  const getChatMetadata = (chat: Chat) => {
    if (!currentUser) return { name: 'Unknown', avatar: '', unread: 0, uid: '' };
    
    const otherUserId = chat.members.find(id => id !== currentUser.uid);
    const details = otherUserId ? chat.memberDetails[otherUserId] : null;
    
    const unread = chat.unreadCount ? chat.unreadCount[currentUser.uid] || 0 : 0;
    
    return {
      name: details?.displayName || 'Unknown User',
      avatar: details?.photoURL || '',
      unread,
      uid: otherUserId
    };
  };

  const filteredChats = chats.filter(chat => {
      const meta = getChatMetadata(chat);
      return meta.name.toLowerCase().includes(filter.toLowerCase());
  });

  const formatTime = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search chats..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900 border-none rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
             <div className="p-4 space-y-4">
               {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-center gap-4">
                   <Skeleton variant="circular" className="w-12 h-12 flex-shrink-0" />
                   <div className="flex-1">
                     <div className="flex justify-between mb-2">
                       <Skeleton className="w-24 h-4" />
                       <Skeleton className="w-10 h-3" />
                     </div>
                     <Skeleton className="w-full h-3" />
                   </div>
                 </div>
               ))}
             </div>
        ) : filteredChats.length === 0 ? (
            <div className="text-center text-slate-500 p-4 text-sm">
                No chats found. Start a new one!
            </div>
        ) : (
          filteredChats.map((chat) => {
            const meta = getChatMetadata(chat);
            const isOnline = meta.uid ? userStatuses[meta.uid] === 'online' : false;
            
            return (
              <button
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`w-full flex items-center p-4 hover:bg-slate-900 transition-colors duration-200 border-b border-slate-900/50 ${
                  activeChatId === chat.id ? 'bg-slate-900 border-l-4 border-l-primary pl-[12px]' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                    {meta.avatar ? (
                         <img src={meta.avatar} alt={meta.name} className="w-full h-full object-cover" />
                    ) : (
                         meta.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-950 rounded-full"></div>
                  )}
                </div>
                
                <div className="ml-4 flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-slate-200 truncate pr-2 flex-1">{meta.name}</h3>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{formatTime(chat.lastTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate flex-1 pr-2 ${meta.unread > 0 ? 'text-white font-medium' : 'text-slate-500'}`}>
                      {chat.lastMessage || <span className="italic opacity-50">Draft</span>}
                    </p>
                    {meta.unread > 0 && (
                      <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1 bg-primary rounded-full text-[10px] font-bold text-white">
                        {meta.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};