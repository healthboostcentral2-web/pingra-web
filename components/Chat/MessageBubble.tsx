import React from 'react';
import { FileText, Download, Play, Pause } from 'lucide-react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { EncryptedMessageBubble } from './EncryptedMessageBubble';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { currentUser } = useAuth();
  const isOwn = message.senderId === currentUser?.uid;

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (message.type === 'encrypted') {
    return (
      <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[75%] sm:max-w-[65%]">
          <EncryptedMessageBubble message={message} isOwn={isOwn} />
          <div className={`text-[10px] mt-1 flex items-center ${isOwn ? 'text-indigo-200 justify-end' : 'text-slate-400'}`}>
            <span>{formatTime(message.createdAt)}</span>
            {isOwn && (
              <span className="ml-1">
                {message.seen ? (
                  <span className="text-blue-200">✓✓</span>
                ) : (
                  <span className="text-indigo-200">✓</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    switch (message.mediaType) {
      case 'image':
        return (
          <div className="mb-2">
            <img 
              src={message.mediaUrl} 
              alt={message.fileName || 'Image'} 
              className="rounded-lg max-h-[300px] w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.mediaUrl, '_blank')}
            />
          </div>
        );
      case 'video':
        return (
          <div className="mb-2">
            <video 
              src={message.mediaUrl} 
              controls 
              className="rounded-lg max-h-[300px] w-full bg-black"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="mb-2 flex items-center min-w-[200px]">
             <audio controls className="w-full h-10 rounded-lg" src={message.mediaUrl} />
          </div>
        );
      case 'file':
        return (
          <a 
            href={message.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors border ${
              isOwn 
                ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
            }`}
          >
            <div className={`p-2 rounded-full ${isOwn ? 'bg-indigo-500' : 'bg-slate-500'}`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName || 'Document'}</p>
              <p className="text-xs opacity-70">{formatFileSize(message.fileSize)}</p>
            </div>
            <Download className="w-5 h-5 opacity-70" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
          isOwn
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-slate-800 text-slate-200 rounded-bl-none'
        }`}
      >
        {renderMedia()}
        {message.text && (
          <p className="text-sm sm:text-base leading-relaxed break-words">{message.text}</p>
        )}
        <div className={`text-[10px] mt-1 flex items-center ${isOwn ? 'text-indigo-200 justify-end' : 'text-slate-400'}`}>
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span className="ml-1">
              {message.seen ? (
                <span className="text-blue-200">✓✓</span>
              ) : (
                <span className="text-indigo-200">✓</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};