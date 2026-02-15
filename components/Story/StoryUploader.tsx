import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Globe, Users, Upload, Loader2 } from 'lucide-react';
import firebase from 'firebase/compat/app';
import { storage, db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';

interface StoryUploaderProps {
  onClose: () => void;
}

export const StoryUploader: React.FC<StoryUploaderProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;
    setUploading(true);

    try {
      // Upload to Firebase Storage
      const storageRef = storage.ref();
      const fileRef = storageRef.child(`stories/${currentUser.uid}/${Date.now()}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();

      // Save to Firestore
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + 24);

      await db.collection('stories').add({
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'User',
        userPhotoURL: currentUser.photoURL || '',
        mediaUrl: url,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        visibility,
        viewers: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expireAt: firebase.firestore.Timestamp.fromDate(expireAt)
      });

      onClose();
    } catch (error) {
      console.error("Error uploading story:", error);
      alert("Failed to upload story. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-white font-semibold">Create Story</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-950/50 min-h-[300px]">
          {preview ? (
            <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden border border-slate-800 bg-black">
              {file?.type.startsWith('video') ? (
                <video src={preview} controls className="max-h-[50vh] w-auto" />
              ) : (
                <img src={preview} alt="Preview" className="max-h-[50vh] w-auto object-contain" />
              )}
              <button 
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-slate-900/50 transition-all group"
            >
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-primary" />
              </div>
              <p className="text-slate-400 font-medium">Click to select photo or video</p>
              <p className="text-xs text-slate-600 mt-2">Supports JPG, PNG, MP4</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*,video/*" 
            className="hidden" 
          />
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setVisibility('public')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border ${
                visibility === 'public' 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <Globe className="w-4 h-4" /> Public
            </button>
            <button
              onClick={() => setVisibility('friends')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border ${
                visibility === 'friends' 
                  ? 'bg-green-500/20 border-green-500 text-green-500' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <Users className="w-4 h-4" /> Friends
            </button>
          </div>

          <Button 
            fullWidth 
            disabled={!file || uploading} 
            onClick={handleUpload}
            isLoading={uploading}
            icon={<Upload className="w-4 h-4" />}
          >
            {uploading ? 'Uploading...' : 'Share to Story'}
          </Button>
        </div>
      </div>
    </div>
  );
};