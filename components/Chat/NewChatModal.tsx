import React, { useState } from 'react';
import { X, Search, MessageSquarePlus } from 'lucide-react';
import firebase from 'firebase/compat/app';
import { db } from '../../firebase';
import { User, Chat } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chat: Chat) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Simple search by username prefix
      const snapshot = await db.collection('users')
        .where('username', '>=', searchTerm)
        .where('username', '<=', searchTerm + '\uf8ff')
        .limit(10)
        .get();

      const users = snapshot.docs
        .map(doc => doc.data() as User)
        .filter(user => user.uid !== currentUser?.uid);

      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (user: User) => {
    if (!currentUser) return;
    setCreating(true);

    try {
      // Check if chat exists
      const existingChatsSnapshot = await db.collection('chats')
        .where('members', 'array-contains', currentUser.uid)
        .get();

      let existingChatDoc = existingChatsSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.members.includes(user.uid) && data.members.length === 2;
      });

      if (existingChatDoc) {
        onChatCreated({ id: existingChatDoc.id, ...existingChatDoc.data() } as Chat);
        onClose();
        return;
      }

      // Create new chat
      const newChatData = {
        members: [currentUser.uid, user.uid],
        memberDetails: {
            [currentUser.uid]: {
                displayName: currentUser.displayName || 'User',
                photoURL: currentUser.photoURL || '',
                email: currentUser.email || ''
            },
            [user.uid]: {
                displayName: user.username || user.displayName || 'Unknown',
                photoURL: user.photoURL || '',
                email: user.email
            }
        },
        lastMessage: '',
        lastTime: firebase.firestore.FieldValue.serverTimestamp(),
        unreadCount: {
            [currentUser.uid]: 0,
            [user.uid]: 0
        },
        createdBy: currentUser.uid
      };

      const docRef = await db.collection('chats').add(newChatData);
      onChatCreated({ id: docRef.id, ...newChatData } as Chat);
      onClose();

    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            New Chat
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSearch} className="relative mb-6">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <Search className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
            <button 
              type="submit" 
              className="absolute right-2 top-2 bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-1.5 rounded-md transition-colors"
            >
              Search
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loading ? (
               <div className="text-center py-8 text-slate-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => startChat(user)}
                  disabled={creating}
                  className="w-full flex items-center p-3 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold mr-3">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        (user.username || user.displayName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-medium text-slate-200 group-hover:text-white">{user.username || user.displayName}</h3>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? 'No users found' : 'Search for a user to start chatting'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};