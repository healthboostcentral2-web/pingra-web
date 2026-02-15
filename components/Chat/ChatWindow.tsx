import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MoreVertical, Phone, Video, ArrowLeft, Lock, Unlock, Timer, Sparkles, Paperclip, Mic, X, Image as ImageIcon, File as FileIcon, Loader2, StopCircle, UserX, ArrowUp } from 'lucide-react';
import firebase from 'firebase/compat/app';
import { Chat, Message, UserSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { db, database, storage } from '../../firebase';
import { MessageBubble } from './MessageBubble';
import { generateKey, encryptMessage } from '../../utils/encryption';
import { EncryptionKeyModal } from './EncryptionKeyModal';
import { AIAssistant } from './AIAssistant';
import { compressImage } from '../../utils/imageCompression';
import { Skeleton } from '../UI/Skeleton';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack }) => {
  const { currentUser, userSettings, updateSettings } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [limit, setLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Encryption States
  const [isEncryptMode, setIsEncryptMode] = useState(false);
  const [selfDestructTime, setSelfDestructTime] = useState<number>(0); 
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // AI Assistant State
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Presence & Typing State
  const [otherUserStatus, setOtherUserStatus] = useState<{ state: 'online' | 'offline', last_changed: number } | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  // Other User Settings State
  const [otherUserSettings, setOtherUserSettings] = useState<UserSettings | null>(null);

  // Media Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  const otherUserId = chat.members.find(id => id !== currentUser?.uid) || '';
  const otherUser = chat.memberDetails[otherUserId] || { displayName: 'Unknown', photoURL: '' };
  
  const isBlocked = userSettings?.blockedUsers?.includes(otherUserId);

  useEffect(() => {
    if (otherUserId) {
        db.collection('users').doc(otherUserId).collection('settings').doc('config').get().then(doc => {
            if (doc.exists) {
                setOtherUserSettings(doc.data() as UserSettings);
            }
        });
    }
  }, [otherUserId]);

  useEffect(() => {
    // Reset limit when chat changes
    setLimit(20);
    setLoading(true);
  }, [chat.id]);

  useEffect(() => {
    // Listen to messages with limit
    // Note: Using 'desc' to get the latest messages first, then we reverse them in memory.
    const unsubscribe = db.collection('messages')
      .where('chatId', '==', chat.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .onSnapshot((snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        
        // Reverse to show chronological order (oldest at top)
        setMessages(msgs.reverse());
        setLoading(false);
        setLoadingMore(false);
        
        // Handle read receipts
        if (!userSettings?.disableReadReceipts) {
            const batch = db.batch();
            let hasUpdates = false;
            
            snapshot.docs.forEach(d => {
              const data = d.data();
              if (data.senderId !== currentUser?.uid && !data.seen) {
                  batch.update(d.ref, { seen: true });
                  hasUpdates = true;
              }
            });

            if (chat.unreadCount && chat.unreadCount[currentUser!.uid] > 0) {
                const chatRef = db.collection('chats').doc(chat.id);
                batch.update(chatRef, {
                    [`unreadCount.${currentUser!.uid}`]: 0
                });
                hasUpdates = true;
            }

            if (hasUpdates) {
                batch.commit().catch(console.error);
            }
        }
      });

    return () => unsubscribe();
  }, [chat.id, currentUser, userSettings?.disableReadReceipts, limit]);

  // Scroll to bottom only on initial load or new messages (if at bottom)
  // Simple approach: Scroll to bottom if sending message or initial load
  useEffect(() => {
    if (!loadingMore && messagesEndRef.current) {
        // Only scroll if we are not loading old messages
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOtherUserTyping]); // Triggers too often, but acceptable for simple chat

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && !loading && !loadingMore && messages.length >= limit) {
        setLoadingMore(true);
        // Load more messages
        // Small delay to show spinner and prevent rapid firing
        setTimeout(() => {
            setLimit(prev => prev + 20);
        }, 500);
    }
  };

  // ... (Keep existing Presence & Typing Listeners)
  useEffect(() => {
    if (!otherUserId) return;
    const statusRef = database.ref('/status/' + otherUserId);
    const statusListener = statusRef.on('value', (snapshot) => {
      setOtherUserStatus(snapshot.val());
    });
    const typingRef = database.ref(`chats/${chat.id}/typing/${otherUserId}`);
    const typingListener = typingRef.on('value', (snapshot) => {
      setIsOtherUserTyping(snapshot.val() === true);
    });
    return () => {
      statusRef.off('value', statusListener);
      typingRef.off('value', typingListener);
      if (currentUser) {
        database.ref(`chats/${chat.id}/typing/${currentUser.uid}`).set(false);
      }
    };
  }, [chat.id, otherUserId, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (currentUser && !isBlocked) {
      const myTypingRef = database.ref(`chats/${chat.id}/typing/${currentUser.uid}`);
      myTypingRef.set(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        myTypingRef.set(false);
      }, 2000);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { url: string, type: 'image' | 'video' | 'audio' | 'file', name: string, size?: number }) => {
    if (e) e.preventDefault();
    if (isBlocked) return;
    if ((!newMessage.trim() && !mediaData) || !currentUser) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    database.ref(`chats/${chat.id}/typing/${currentUser.uid}`).set(false);

    const rawText = newMessage.trim();
    setNewMessage('');
    setIsAIOpen(false);
    
    let textToSend = rawText;
    let messageType: 'text' | 'encrypted' = 'text';
    let key = '';

    if (isEncryptMode && !mediaData) {
      key = generateKey();
      textToSend = encryptMessage(rawText, key);
      messageType = 'encrypted';
      setGeneratedKey(key);
      setIsEncryptMode(false);
      setSelfDestructTime(0);
    }

    try {
      const msgData: any = {
        chatId: chat.id,
        senderId: currentUser.uid,
        text: textToSend,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        seen: false,
        type: messageType,
        selfDestruct: messageType === 'encrypted' ? selfDestructTime : 0
      };

      if (mediaData) {
        msgData.mediaUrl = mediaData.url;
        msgData.mediaType = mediaData.type;
        msgData.fileName = mediaData.name;
        msgData.fileSize = mediaData.size;
        msgData.text = rawText;
        msgData.type = 'text';
      }

      await db.collection('messages').add(msgData);

      const lastMsgPreview = mediaData ? `[${mediaData.type.toUpperCase()}]` : (messageType === 'encrypted' ? '🔒 Encrypted Message' : rawText);

      await db.collection('chats').doc(chat.id).update({
        lastMessage: lastMsgPreview,
        lastTime: firebase.firestore.FieldValue.serverTimestamp(),
        [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || isBlocked) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Compress image if applicable
      const fileToUpload = await compressImage(file);
      
      const storageRef = storage.ref();
      const fileRef = storageRef.child(`chat_media/${chat.id}/${Date.now()}_${file.name}`);
      const uploadTask = fileRef.put(fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
          alert("Failed to upload file.");
        },
        async () => {
          const url = await uploadTask.snapshot.ref.getDownloadURL();
          
          let type: 'image' | 'video' | 'audio' | 'file' = 'file';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.startsWith('audio/')) type = 'audio';

          await handleSendMessage(undefined, {
            url,
            type,
            name: file.name,
            size: fileToUpload.size
          });
          setUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      console.error("File selection error:", error);
      setUploading(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ... (Keep existing Voice Recording functions: startRecording, stopRecording, cancelRecording, handleBlockUser, formatDuration, formatLastSeen, timerOptions)
  const startRecording = async () => {
    if (isBlocked) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !currentUser) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
      
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      setUploading(true);
      try {
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`chat_media/${chat.id}/${Date.now()}_voice.webm`);
        await fileRef.put(audioFile);
        const url = await fileRef.getDownloadURL();
        
        await handleSendMessage(undefined, {
          url,
          type: 'audio',
          name: 'Voice Message',
          size: audioFile.size
        });
      } catch (error) {
        console.error("Error uploading voice message:", error);
      } finally {
        setUploading(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleBlockUser = async () => {
    if (isBlocked) {
        const newBlocked = userSettings?.blockedUsers.filter(id => id !== otherUserId) || [];
        await updateSettings({ blockedUsers: newBlocked });
    } else {
        const newBlocked = [...(userSettings?.blockedUsers || []), otherUserId];
        await updateSettings({ blockedUsers: newBlocked });
    }
    setShowMenu(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerOptions = [
    { label: 'Off', value: 0 },
    { label: '5s', value: 5 },
    { label: '1m', value: 60 },
    { label: '1h', value: 3600 },
  ];

  const formatLastSeen = (timestamp: number) => {
    if (otherUserSettings?.hideLastSeen) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="flex flex-col h-full bg-slate-900 relative">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white mr-1">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {otherUser.photoURL ? (
                  <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  otherUser.displayName.charAt(0).toUpperCase()
                )}
              </div>
              {otherUserStatus?.state === 'online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white leading-tight">{otherUser.displayName}</h3>
              {isOtherUserTyping ? (
                <p className="text-xs text-primary font-medium animate-pulse">Typing...</p>
              ) : otherUserStatus?.state === 'online' ? (
                <p className="text-xs text-green-500">Online</p>
              ) : (
                <p className="text-xs text-slate-500">
                  {otherUserStatus?.last_changed && !otherUserSettings?.hideLastSeen 
                    ? `Last seen ${formatLastSeen(otherUserStatus.last_changed)}` 
                    : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-4 text-slate-400 relative">
            <Phone className="w-5 h-5 hover:text-white cursor-pointer" />
            <Video className="w-5 h-5 hover:text-white cursor-pointer" />
            <div className="relative">
                <MoreVertical 
                    className="w-5 h-5 hover:text-white cursor-pointer" 
                    onClick={() => setShowMenu(!showMenu)}
                />
                {showMenu && (
                    <div className="absolute right-0 top-8 w-40 bg-surface border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <button 
                            onClick={handleBlockUser}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-800 text-red-400 hover:text-red-300 flex items-center gap-2"
                        >
                            <UserX className="w-4 h-4" />
                            {isBlocked ? 'Unblock User' : 'Block User'}
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700"
            ref={chatContainerRef}
            onScroll={handleScroll}
        >
          {loading ? (
             <div className="space-y-4 py-8 px-2">
                 {[1, 2, 3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <Skeleton className="h-16 w-64 rounded-xl" />
                    </div>
                 ))}
             </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center py-4">
                <p className="text-xs text-slate-600 bg-slate-900/80 inline-block px-3 py-1 rounded-full">
                  Messages are encrypted and secure.
                </p>
              </div>
            </div>
          ) : (
            <>
              {loadingMore && (
                  <div className="flex justify-center py-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
              )}
              
              {messages.length >= limit && !loadingMore && (
                 <div className="flex justify-center">
                    <button onClick={() => {
                        setLoadingMore(true);
                        setLimit(prev => prev + 20);
                    }} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                        <ArrowUp className="w-3 h-3" /> Load Previous Messages
                    </button>
                 </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
              {uploading && (
                <div className="flex justify-end animate-fade-in">
                  <div className="bg-primary/20 p-3 rounded-2xl rounded-br-none text-white text-xs flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Uploading... {Math.round(uploadProgress)}%
                  </div>
                </div>
              )}
              {isOtherUserTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ... (Rest of UI: AI Assistant Modal, Input Area) */}
        {/* AI Assistant Modal */}
        {isAIOpen && (
          <AIAssistant 
            chat={chat} 
            messages={messages} 
            currentUser={currentUser} 
            currentInput={newMessage}
            onSelectReply={(text) => {
              setNewMessage(text);
              setIsAIOpen(false);
            }}
            onClose={() => setIsAIOpen(false)}
          />
        )}

        {/* Input Area */}
        <div className={`p-4 border-t border-slate-800 transition-colors duration-300 ${isEncryptMode ? 'bg-slate-950/80 border-t-primary/30 shadow-[0_-5px_20px_rgba(99,102,241,0.1)]' : 'bg-slate-950'}`}>
          {isBlocked ? (
             <div className="text-center text-red-400 text-sm py-3 bg-red-500/5 rounded-lg border border-red-500/20">
                 You have blocked this user. <button onClick={handleBlockUser} className="underline hover:text-red-300">Unblock</button> to send messages.
             </div>
          ) : isRecording ? (
             <div className="flex items-center gap-4 py-2 animate-in fade-in">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-red-500/50 shadow-lg"></div>
                <span className="text-white font-mono text-lg flex-1">{formatDuration(recordingDuration)}</span>
                <button onClick={cancelRecording} className="p-2 text-slate-400 hover:text-white rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <button onClick={stopRecording} className="p-2 text-red-500 hover:text-red-400 rounded-full transition-colors">
                  <Send className="w-6 h-6" />
                </button>
             </div>
          ) : (
            <>
              {isEncryptMode && (
                 <div className="flex items-center gap-4 mb-3 animate-fadeIn">
                   <div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                     <Lock className="w-3 h-3" /> Encrypt Mode
                   </div>
                   <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                      {timerOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelfDestructTime(opt.value)}
                          className={`text-xs px-2 py-1 rounded transition-all ${
                            selfDestructTime === opt.value 
                            ? 'bg-primary text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                   </div>
                   {selfDestructTime > 0 && (
                     <span className="text-xs text-orange-400 flex items-center gap-1">
                       <Timer className="w-3 h-3" /> Self-destruct enabled
                     </span>
                   )}
                 </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center max-w-4xl mx-auto relative">
                <button
                  type="button"
                  onClick={() => setIsAIOpen(!isAIOpen)}
                  className={`p-3 rounded-full transition-all duration-300 hidden sm:flex ${
                    isAIOpen
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-purple-400'
                  }`}
                  title="AI Help"
                >
                  <Sparkles className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect} 
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                    title="Attach File"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEncryptMode(!isEncryptMode)}
                  className={`p-3 rounded-full transition-all duration-300 hidden sm:flex ${
                    isEncryptMode 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 rotate-0' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={isEncryptMode ? "Cancel Encryption" : "Enable Encryption"}
                >
                  {isEncryptMode ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={isEncryptMode ? "Secret message..." : "Type a message..."}
                  className={`flex-1 rounded-full px-5 py-3 focus:outline-none focus:ring-2 border border-transparent transition-all
                    ${isEncryptMode 
                      ? 'bg-slate-900 text-primary placeholder-primary/40 focus:ring-primary border-primary/20' 
                      : 'bg-slate-800 text-white placeholder-slate-500 focus:ring-primary'
                    }`}
                />

                {newMessage.trim() ? (
                  <button
                    type="submit"
                    className={`p-3 rounded-full text-white transition-all shadow-lg
                      ${isEncryptMode
                        ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-primary/20'
                        : 'bg-primary hover:bg-indigo-600 shadow-primary/20'
                      }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-3 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                    title="Record Audio"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      {generatedKey && (
        <EncryptionKeyModal 
          encryptionKey={generatedKey} 
          onClose={() => setGeneratedKey(null)} 
        />
      )}
    </>
  );
};