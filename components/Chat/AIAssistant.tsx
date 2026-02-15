import React, { useState } from 'react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Sparkles, RefreshCw, FileText, Languages, Bot, X, Check, Copy, Wand2 } from 'lucide-react';
import { Message, Chat, User } from '../../types';

interface AIAssistantProps {
  chat: Chat;
  messages: Message[];
  currentUser: any;
  currentInput: string;
  onSelectReply: (text: string) => void;
  onClose: () => void;
}

type Mode = 'suggestions' | 'rewrite' | 'summarize' | 'translate' | 'permission';

const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  chat, 
  messages, 
  currentUser, 
  currentInput,
  onSelectReply,
  onClose 
}) => {
  const [mode, setMode] = useState<Mode>('permission');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string> | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [error, setError] = useState<string>('');

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const getContext = () => {
    // Get last 20 messages
    const recentMessages = messages.slice(-20);
    return recentMessages.map(msg => {
      const senderName = chat.memberDetails[msg.senderId]?.displayName || 'Unknown';
      const isMe = msg.senderId === currentUser.uid;
      const content = msg.type === 'encrypted' ? '[Encrypted Message]' : msg.text;
      return `${isMe ? 'Me' : senderName}: ${content}`;
    }).join('\n');
  };

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const context = getContext();
      
      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          romantic: { type: Type.STRING },
          friendly: { type: Type.STRING },
          professional: { type: Type.STRING },
          funny: { type: Type.STRING },
          short_smart: { type: Type.STRING },
        },
        required: ['romantic', 'friendly', 'professional', 'funny', 'short_smart']
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: `Read the following chat history and suggest 5 different replies for "Me".
        
Chat History:
${context}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          systemInstruction: "You are a helpful chat assistant. Generate replies that fit the context of the conversation.",
        }
      });

      const jsonStr = response.text || "{}";
      const result = JSON.parse(jsonStr);
      setSuggestions(result);
      setMode('suggestions');
    } catch (err: any) {
      console.error(err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!currentInput.trim()) {
      setError('Please type something in the input box to rewrite.');
      return;
    }
    setLoading(true);
    setError('');
    setMode('rewrite');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: `Rewrite the following text in 3 styles (Professional, Casual, Enthusiastic): "${currentInput}"`,
        config: {
          systemInstruction: "You are an expert editor. Provide the output as a clean list.",
        }
      });
      setResultText(response.text || '');
    } catch (err: any) {
      setError('Failed to rewrite text.');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setLoading(true);
    setError('');
    setMode('summarize');
    try {
      const context = getContext();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: `Summarize this chat conversation in bullet points:
        
${context}`,
      });
      setResultText(response.text || '');
    } catch (err: any) {
      setError('Failed to summarize.');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setLoading(true);
    setError('');
    setMode('translate');
    try {
      const context = getContext();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: `Translate the last few messages of this conversation into English (if not already) or provide a translation of the context if it's mixed:
        
${context}`,
      });
      setResultText(response.text || '');
    } catch (err: any) {
      setError('Failed to translate.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Sparkles className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-slate-400 animate-pulse">Consulting Gemini...</p>
        </div>
      );
    }

    if (mode === 'permission') {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">AI Chat Assistant</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
            To provide suggestions, we need to send the last 20 messages of this chat to Google Gemini. 
            Data is used only for generation and not stored.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button 
              onClick={handleGenerateSuggestions}
              className="bg-primary hover:bg-indigo-600 text-white p-3 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Reply Ideas
            </button>
             <button 
              onClick={handleRewrite}
              className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Rewrite Input
            </button>
             <button 
              onClick={handleSummarize}
              className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Summarize
            </button>
             <button 
              onClick={handleTranslate}
              className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-2"
            >
              <Languages className="w-5 h-5" />
              Translate
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'suggestions' && suggestions) {
      const labels: Record<string, { label: string, color: string }> = {
        romantic: { label: '❤️ Romantic', color: 'text-pink-400 border-pink-500/30 hover:bg-pink-500/10' },
        friendly: { label: '👋 Friendly', color: 'text-green-400 border-green-500/30 hover:bg-green-500/10' },
        professional: { label: '👔 Professional', color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
        funny: { label: '😂 Funny', color: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10' },
        short_smart: { label: '⚡ Smart', color: 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10' },
      };

      return (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Suggested Replies
          </h3>
          {Object.entries(suggestions).map(([key, text]) => (
             <button
              key={key}
              onClick={() => onSelectReply(text)}
              className={`w-full text-left p-3 rounded-lg border bg-slate-900/50 transition-colors group ${labels[key]?.color || 'border-slate-700 text-slate-200'}`}
             >
               <div className="text-xs font-bold mb-1 opacity-70 group-hover:opacity-100">{labels[key]?.label || key}</div>
               <div className="text-sm text-slate-200">{text}</div>
             </button>
          ))}
          <button onClick={() => setMode('permission')} className="text-xs text-slate-500 hover:text-white mt-4 underline">
            Back to Tools
          </button>
        </div>
      );
    }

    if (['rewrite', 'summarize', 'translate'].includes(mode)) {
      return (
        <div className="space-y-3">
           <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2 capitalize">
            {mode === 'rewrite' && <RefreshCw className="w-4 h-4 text-primary" />}
            {mode === 'summarize' && <FileText className="w-4 h-4 text-primary" />}
            {mode === 'translate' && <Languages className="w-4 h-4 text-primary" />}
            {mode} Result
          </h3>
          <div className="bg-slate-900 p-4 rounded-lg text-sm text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-700">
            {resultText}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                onSelectReply(resultText);
              }}
              className="flex-1 bg-primary hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Use Text
            </button>
            <button onClick={() => setMode('permission')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300">
              Back
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="absolute bottom-20 right-4 w-80 md:w-96 bg-surface border border-slate-700 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-5 fade-in-20">
      <div className="bg-slate-950 p-3 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold text-white text-sm">Pingra AI</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {error ? (
          <div className="text-red-400 text-sm text-center py-4 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
            {error}
            <button onClick={() => setMode('permission')} className="block mx-auto mt-2 text-xs underline">Try Again</button>
          </div>
        ) : renderContent()}
      </div>
    </div>
  );
};