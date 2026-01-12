
import * as firebaseApp from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzRl83ISEt9eM0sj4eXaA1y6EMTQ8QRTU",
  authDomain: "doxa-portal.firebaseapp.com",
  projectId: "doxa-portal",
  storageBucket: "doxa-portal.firebasestorage.app",
  messagingSenderId: "474898750084",
  appId: "1:474898750084:web:e782e1f3a8baa8f93f80d1"
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);

// Initialize Firestore with standard settings to ensure stability
// Switching from persistentMultipleTabManager to default to resolve 'Unexpected state' assertions
export const db = getFirestore(app);

export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Initialize Firebase Functions
export const functions = getFunctions(app);

// Uncomment for local emulator testing:
// connectFunctionsEmulator(functions, 'localhost', 5001);

export default app;
