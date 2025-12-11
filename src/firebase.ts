
import * as firebaseApp from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Initialize Firestore with modern persistence settings
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);

export default app;
