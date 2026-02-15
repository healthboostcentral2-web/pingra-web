import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Story } from '../../types';
import { StoryUploader } from './StoryUploader';
import { StoryViewer } from './StoryViewer';
import firebase from 'firebase/compat/app';

export const StoryList: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeStories, setActiveStories] = useState<Record<string, Story[]>>({});
  const [usersWithStories, setUsersWithStories] = useState<string[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  
  // UI State
  const [showUploader, setShowUploader] = useState(false);
  const [viewingUserIndex, setViewingUserIndex] = useState<number | null>(null);

  // 1. Fetch Friends (Chat Members)
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = db.collection('chats')
      .where('members', 'array-contains', currentUser.uid)
      .onSnapshot(snapshot => {
        const ids = new Set<string>();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          data.members.forEach((uid: string) => {
             if (uid !== currentUser.uid) ids.add(uid);
          });
        });
        setFriendIds(ids);
      });
    return () => unsubscribe();
  }, [currentUser]);

  // 2. Fetch Active Stories
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = db.collection('stories')
      .where('expireAt', '>', new Date())
      .orderBy('expireAt', 'desc') // Need index for this? Using client side sort might be safer for simple queries if index missing.
      // Firestore requires index for filtering field + sorting.
      // Let's just filter by expireAt > now.
      .onSnapshot(snapshot => {
        const grouped: Record<string, Story[]> = {};
        
        snapshot.docs.forEach(doc => {
          const story = { id: doc.id, ...doc.data() } as Story;
          
          // Visibility Logic
          const isOwner = story.userId === currentUser.uid;
          const isFriend = friendIds.has(story.userId);
          const isPublic = story.visibility === 'public';
          
          if (isOwner || isPublic || (story.visibility === 'friends' && isFriend)) {
            if (!grouped[story.userId]) grouped[story.userId] = [];
            grouped[story.userId].push(story);
          }
        });

        // Sort stories per user by createdAt
        Object.keys(grouped).forEach(uid => {
            grouped[uid].sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
        });

        setActiveStories(grouped);
        
        // Order users: Me first, then others with unseen stories, then seen
        const others = Object.keys(grouped).filter(uid => uid !== currentUser.uid);
        // We could sort others by whether they have unseen stories... keeping it simple for now
        
        const sortedUsers = [];
        if (grouped[currentUser.uid]) sortedUsers.push(currentUser.uid);
        sortedUsers.push(...others);
        
        setUsersWithStories(sortedUsers);
      });

    return () => unsubscribe();
  }, [currentUser, friendIds]);

  const hasUnseen = (userId: string) => {
    const stories = activeStories[userId];
    if (!stories) return false;
    return stories.some(s => !s.viewers.includes(currentUser?.uid || ''));
  };

  const myStories = activeStories[currentUser?.uid || ''];
  const hasMyStory = myStories && myStories.length > 0;

  return (
    <>
      <div className="w-full overflow-x-auto py-4 px-2 no-scrollbar bg-slate-950 border-b border-slate-800">
        <div className="flex gap-4 min-w-min px-2">
          {/* My Story Add / View */}
          <div className="flex flex-col items-center gap-1 cursor-pointer group">
            <div className="relative">
              <button 
                onClick={() => {
                   if (hasMyStory) setViewingUserIndex(usersWithStories.indexOf(currentUser!.uid));
                   else setShowUploader(true);
                }}
                className={`w-14 h-14 rounded-full p-[2px] ${hasMyStory ? 'bg-gradient-to-tr from-primary to-purple-500' : 'border-2 border-slate-700 border-dashed'}`}
              >
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-950">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold">{currentUser?.displayName?.[0]}</span>
                  )}
                </div>
              </button>
              
              {!hasMyStory && (
                <div 
                  onClick={(e) => { e.stopPropagation(); setShowUploader(true); }}
                  className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-slate-950 flex items-center justify-center text-white"
                >
                  <Plus className="w-3 h-3" />
                </div>
              )}
               {hasMyStory && (
                <div 
                  onClick={(e) => { e.stopPropagation(); setShowUploader(true); }}
                  className="absolute bottom-0 right-0 w-5 h-5 bg-slate-700 hover:bg-slate-600 rounded-full border-2 border-slate-950 flex items-center justify-center text-white z-10"
                >
                  <Plus className="w-3 h-3" />
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-300">Your Story</span>
          </div>

          {/* Other Stories */}
          {usersWithStories.map((uid, idx) => {
            if (uid === currentUser?.uid) return null;
            const stories = activeStories[uid];
            const story = stories[0];
            const unseen = hasUnseen(uid);
            
            return (
              <div 
                key={uid} 
                className="flex flex-col items-center gap-1 cursor-pointer"
                onClick={() => setViewingUserIndex(idx)}
              >
                <div className={`w-14 h-14 rounded-full p-[2px] ${unseen ? 'bg-gradient-to-tr from-primary to-purple-500' : 'bg-slate-700'}`}>
                   <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-950">
                     <img 
                        src={story.userPhotoURL || `https://ui-avatars.com/api/?name=${story.userDisplayName}`} 
                        alt={story.userDisplayName} 
                        className="w-full h-full object-cover" 
                     />
                   </div>
                </div>
                <span className="text-[10px] font-medium text-slate-300 max-w-[60px] truncate">
                    {story.userDisplayName.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showUploader && (
        <StoryUploader onClose={() => setShowUploader(false)} />
      )}

      {viewingUserIndex !== null && (
        <StoryViewer 
          stories={activeStories[usersWithStories[viewingUserIndex]]}
          initialStoryIndex={0}
          onClose={() => setViewingUserIndex(null)}
          onNextUser={() => {
             if (viewingUserIndex < usersWithStories.length - 1) {
                 setViewingUserIndex(viewingUserIndex + 1);
             } else {
                 setViewingUserIndex(null);
             }
          }}
          onPrevUser={() => {
              if (viewingUserIndex > 0) {
                  setViewingUserIndex(viewingUserIndex - 1);
              }
          }}
        />
      )}
    </>
  );
};