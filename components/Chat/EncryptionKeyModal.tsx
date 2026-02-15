import React, { useState } from 'react';
import { Copy, Check, Lock, X } from 'lucide-react';

interface EncryptionKeyModalProps {
  encryptionKey: string;
  onClose: () => void;
}

export const EncryptionKeyModal: React.FC<EncryptionKeyModalProps> = ({ encryptionKey, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(encryptionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-xl border border-primary shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>
        
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Message Encrypted</h3>
          <p className="text-sm text-slate-400 mb-6">
            Share this secret key with the recipient securely. They will need it to unlock your message.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between mb-6 group hover:border-primary/50 transition-colors">
            <code className="font-mono text-primary text-lg tracking-wider">{encryptionKey}</code>
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
              title="Copy Key"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};