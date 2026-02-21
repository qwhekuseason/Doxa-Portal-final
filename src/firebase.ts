
import * as firebaseApp from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);

// Initialize Firestore with standard settings to ensure stability
export const db = getFirestore(app);

// Initialize Messaging safely
let messagingInternal = null;
if (typeof window !== 'undefined') {
  try {
    // Note: getMessaging() itself checks for support but throws if unsupported.
    // It's better to use isSupported() if we want to be safe, 
    // but in some versions getMessaging() is enough if we catch the error.
    messagingInternal = getMessaging(app);
  } catch (error) {
    console.warn("Firebase Messaging is not supported in this browser environment.", error);
  }
}
export const messaging = messagingInternal;

// Initialize Firebase Functions
export const functions = getFunctions(app);

export default app;
