import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Timer, EyeOff, AlertTriangle } from 'lucide-react';
import { Message } from '../../types';
import { decryptMessage } from '../../utils/encryption';
import { Button } from '../UI/Button';

interface EncryptedMessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const EncryptedMessageBubble: React.FC<EncryptedMessageBubbleProps> = ({ message, isOwn }) => {
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isDecrypted && message.selfDestruct && message.selfDestruct > 0) {
      setTimeLeft(message.selfDestruct);
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            handleExpire();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isDecrypted, message.selfDestruct]);

  const handleExpire = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setIsExpired(true);
    setIsDecrypted(false);
    setDecryptedContent('');
  };

  const handleDecrypt = () => {
    if (!inputKey.trim()) return;
    
    const content = decryptMessage(message.text, inputKey.trim());
    
    if (content) {
      setDecryptedContent(content);
      setIsDecrypted(true);
      setError('');
    } else {
      setError('Invalid key');
    }
  };

  const renderDecryptedContent = () => {
    // Simple regex for image/audio detection
    const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
    const isAudioUrl = (url: string) => /\.(mp3|wav|ogg)$/i.test(url);

    if (isImageUrl(decryptedContent)) {
      return (
        <img 
          src={decryptedContent} 
          alt="Encrypted content" 
          className="max-w-full rounded-lg mt-2 border border-slate-700"
          onError={(e) => {
            // Fallback if image fails to load, show text
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }

    if (isAudioUrl(decryptedContent)) {
      return (
        <audio controls className="w-full mt-2">
          <source src={decryptedContent} />
          Your browser does not support the audio element.
        </audio>
      );
    }

    return <p className="text-sm sm:text-base leading-relaxed break-words">{decryptedContent}</p>;
  };

  if (isExpired) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 border border-slate-700/50 rounded-lg ${isOwn ? 'bg-primary/20' : 'bg-slate-800/50'} text-slate-400 italic`}>
        <EyeOff className="w-5 h-5 mb-1" />
        <span className="text-xs">Message Expired</span>
      </div>
    );
  }

  if (!isDecrypted) {
    return (
      <div className={`p-1 rounded-lg ${isOwn ? 'bg-indigo-600/50' : 'bg-slate-800/80'} border border-slate-700`}>
        <div className="flex items-center gap-2 mb-2 text-yellow-500 font-medium text-xs px-2 pt-2">
          <Lock className="w-3 h-3" />
          <span>Encrypted Message</span>
          {message.selfDestruct && message.selfDestruct > 0 && (
            <span className="flex items-center gap-1 text-slate-400 ml-auto">
               <Timer className="w-3 h-3" /> 
               {message.selfDestruct < 60 ? `${message.selfDestruct}s` : message.selfDestruct < 3600 ? `${Math.floor(message.selfDestruct/60)}m` : `${Math.floor(message.selfDestruct/3600)}h`}
            </span>
          )}
        </div>
        
        <div className="flex gap-1 p-2">
          <input
            type="text"
            placeholder="Enter Key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="flex-1 min-w-0 bg-slate-950 text-white text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-primary focus:outline-none"
          />
          <button 
            onClick={handleDecrypt}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            Unlock
          </button>
        </div>
        {error && <p className="text-red-400 text-[10px] px-2 pb-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`relative ${isOwn ? 'bg-primary/90' : 'bg-slate-800'} rounded-lg p-3 min-w-[200px]`}>
      <div className="flex justify-between items-start mb-2 border-b border-white/10 pb-1">
        <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
          <Unlock className="w-3 h-3" />
          Decrypted
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-1 text-xs text-orange-400 font-mono animate-pulse">
            <Timer className="w-3 h-3" />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>
      
      {renderDecryptedContent()}
      
      {timeLeft !== null && (
        <div className="w-full bg-slate-900/50 h-1 mt-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / (message.selfDestruct || 1)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};