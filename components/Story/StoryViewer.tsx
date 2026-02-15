import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, MoreHorizontal } from 'lucide-react';
import { Story } from '../../types';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import firebase from 'firebase/compat/app';

interface StoryViewerProps {
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ 
  stories, 
  initialStoryIndex, 
  onClose,
  onNextUser,
  onPrevUser
}) => {
  const { currentUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const currentStory = stories[currentIndex];
  const DURATION = 5000; // 5 seconds per story
  const intervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mark as viewed
  useEffect(() => {
    if (currentUser && currentStory && !currentStory.viewers.includes(currentUser.uid)) {
      db.collection('stories').doc(currentStory.id).update({
        viewers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      }).catch(console.error);
    }
  }, [currentStory, currentUser]);

  // Timer logic
  useEffect(() => {
    if (isPaused) return;

    // Reset progress when index changes
    setProgress(0);

    const startTime = Date.now();
    
    // If video, use video duration, else fixed duration
    let duration = DURATION;
    
    // Simple interval for progress
    const updateProgress = () => {
      if (currentStory.mediaType === 'video' && videoRef.current) {
        if (!videoRef.current.paused) {
           const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
           setProgress(percent);
           if (videoRef.current.ended) {
             handleNext();
           }
        }
      } else {
        const elapsed = Date.now() - startTime;
        const percent = Math.min((elapsed / duration) * 100, 100);
        setProgress(percent);
        
        if (elapsed >= duration) {
          handleNext();
        }
      }
    };

    intervalRef.current = window.setInterval(updateProgress, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentIndex, isPaused, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // End of this user's stories
      if (onNextUser) onNextUser();
      else onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      if (onPrevUser) onPrevUser();
      // else reset to 0 or close? stay at 0
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 z-20 flex gap-1 px-4">
        {stories.map((story, idx) => (
          <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ 
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 z-20 px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <img 
            src={currentStory.userPhotoURL || `https://ui-avatars.com/api/?name=${currentStory.userDisplayName}&background=random`} 
            alt={currentStory.userDisplayName} 
            className="w-10 h-10 rounded-full border border-white/20" 
          />
          <div>
            <p className="font-semibold text-sm">{currentStory.userDisplayName}</p>
            <p className="text-xs opacity-70">
              {new Date(currentStory.createdAt.seconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* If owner, show views */}
           {currentUser?.uid === currentStory.userId && (
             <div className="flex items-center gap-1 text-sm opacity-80">
               <Eye className="w-4 h-4" />
               <span>{currentStory.viewers.length}</span>
             </div>
           )}
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
             <X className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* Navigation Touch Areas */}
      <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={handlePrev} />
      <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={handleNext} />
      
      {/* Content */}
      <div 
        className="w-full h-full flex items-center justify-center bg-black"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {currentStory.mediaType === 'video' ? (
          <video 
            ref={videoRef}
            src={currentStory.mediaUrl} 
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            // muted={false} // Browsers might block unmuted autoplay
          />
        ) : (
          <img 
            src={currentStory.mediaUrl} 
            alt="Story" 
            className="max-h-full max-w-full object-contain animate-in fade-in duration-300" 
          />
        )}
      </div>

      {/* Footer / Reply (optional, skip for now to keep simple) */}
    </div>
  );
};