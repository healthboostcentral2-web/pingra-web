import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Eye, EyeOff, Check, LogOut, Trash2, UserX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { User } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { userSettings, updateSettings, logoutAllDevices, deleteAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'privacy' | 'security' | 'account'>('privacy');
  
  // Local state for inputs
  const [pin, setPin] = useState(userSettings?.chatLockPin || '');
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedDetails, setBlockedDetails] = useState<User[]>([]);

  useEffect(() => {
    if (showBlocked && userSettings?.blockedUsers?.length) {
      const fetchBlocked = async () => {
        const promises = userSettings.blockedUsers.map(uid => 
          db.collection('users').doc(uid).get()
        );
        const docs = await Promise.all(promises);
        const users = docs.map(d => ({ uid: d.id, ...d.data() } as User));
        setBlockedDetails(users);
      };
      fetchBlocked();
    }
  }, [showBlocked, userSettings?.blockedUsers]);

  if (!isOpen) return null;

  const handleToggle = async (key: keyof typeof userSettings) => {
    if (!userSettings) return;
    await updateSettings({ [key]: !userSettings[key as keyof typeof userSettings] });
  };

  const handleSetLock = async () => {
    if (pin.length < 4) return alert("PIN must be at least 4 digits");
    await updateSettings({ chatLockPin: pin, chatLock: true });
  };

  const handleDisableLock = async () => {
    await updateSettings({ chatLock: false });
    setPin('');
  };

  const handleUnblock = async (uid: string) => {
    if (!userSettings) return;
    const newBlocked = userSettings.blockedUsers.filter(id => id !== uid);
    await updateSettings({ blockedUsers: newBlocked });
    setBlockedDetails(prev => prev.filter(u => u.uid !== uid));
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action is irreversible.")) {
      try {
        await deleteAccount();
      } catch (e) {
        alert("Failed to delete account. You may need to re-login.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] max-h-[90vh]">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4">
          <h2 className="text-xl font-bold text-white mb-6 pl-2">Settings</h2>
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'privacy' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Eye className="w-4 h-4" /> Privacy
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Shield className="w-4 h-4" /> Security
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Lock className="w-4 h-4" /> Account
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-surface flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-white capitalize">{activeTab} Settings</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {activeTab === 'privacy' && (
              <>
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-white font-medium mb-1">Last Seen</h4>
                    <p className="text-xs text-slate-400">Hide your online status timestamp from others</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('hideLastSeen')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${userSettings?.hideLastSeen ? 'bg-primary' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${userSettings?.hideLastSeen ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-white font-medium mb-1">Read Receipts</h4>
                    <p className="text-xs text-slate-400">Don't let others know when you've seen their messages</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('disableReadReceipts')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${userSettings?.disableReadReceipts ? 'bg-primary' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${userSettings?.disableReadReceipts ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="text-white font-medium">Blocked Users ({userSettings?.blockedUsers?.length || 0})</h4>
                     <button 
                       onClick={() => setShowBlocked(!showBlocked)} 
                       className="text-xs text-primary hover:underline"
                     >
                       {showBlocked ? 'Hide' : 'Manage'}
                     </button>
                   </div>
                   
                   {showBlocked && (
                     <div className="space-y-2 max-h-40 overflow-y-auto">
                       {blockedDetails.length > 0 ? blockedDetails.map(user => (
                         <div key={user.uid} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                               {user.displayName?.[0]}
                             </div>
                             <span className="text-sm text-slate-200">{user.displayName}</span>
                           </div>
                           <button 
                             onClick={() => handleUnblock(user.uid)}
                             className="text-xs text-red-400 hover:text-red-300"
                           >
                             Unblock
                           </button>
                         </div>
                       )) : (
                         <p className="text-center text-slate-500 text-xs py-2">No blocked users</p>
                       )}
                     </div>
                   )}
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-white font-medium mb-1">App Lock</h4>
                      <p className="text-xs text-slate-400">Require PIN to open Pingra</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${userSettings?.chatLock ? 'bg-primary' : 'bg-slate-700'}`}>
                       {/* This toggle is just visual status, actual toggle via logic below */}
                       <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${userSettings?.chatLock ? 'translate-x-6' : ''}`} />
                    </div>
                  </div>
                  
                  {!userSettings?.chatLock ? (
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder="Set 4-6 digit PIN" 
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <button 
                        onClick={handleSetLock}
                        className="bg-primary hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Enable
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleDisableLock}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Disable App Lock
                    </button>
                  )}
                </div>

                <button 
                  onClick={async () => {
                    if(window.confirm("Logout from all devices?")) {
                       await logoutAllDevices();
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    <div className="text-left">
                      <h4 className="text-slate-200 group-hover:text-white font-medium">Logout All Devices</h4>
                      <p className="text-xs text-slate-500">Sign out from all active sessions</p>
                    </div>
                  </div>
                </button>
              </>
            )}

            {activeTab === 'account' && (
              <>
                <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                   <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4" /> Danger Zone
                   </h4>
                   <p className="text-xs text-slate-400 mb-6">
                     Deleting your account is permanent. All your data, including chats and media, will be erased.
                   </p>
                   
                   <button 
                     onClick={handleDeleteAccount}
                     className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors"
                   >
                     <Trash2 className="w-4 h-4" /> Delete Account
                   </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component
const AlertTriangle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);