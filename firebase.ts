import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/database';
import 'firebase/compat/messaging';

const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: `https://${env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` // Assuming default RTDB instance
};

const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
export const database = app.database();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

let messaging: firebase.messaging.Messaging | null = null;
try {
  if (firebase.messaging.isSupported()) {
    messaging = app.messaging();
  }
} catch (e) {
  console.error('Messaging not supported', e);
}
export { messaging };

export default app;