export interface UserSettings {
  hideLastSeen: boolean;
  disableReadReceipts: boolean;
  blockedUsers: string[];
  chatLock: boolean;
  chatLockPin: string;
  lastLogoutAt?: any;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastSeen?: any;
  username?: string;
  fcmToken?: string;
}

export interface Chat {
  id: string;
  members: string[];
  memberDetails: {
    [uid: string]: {
      displayName: string;
      photoURL: string;
      email: string;
    }
  };
  lastMessage: string;
  lastTime: any;
  unreadCount?: {
    [uid: string]: number;
  };
  createdBy: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
  seen: boolean;
  type?: 'text' | 'encrypted';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  fileName?: string;
  fileSize?: number;
  selfDestruct?: number; // Duration in seconds
}

export interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  visibility: 'public' | 'friends';
  viewers: string[];
  createdAt: any;
  expireAt: any;
}

export enum AuthStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}