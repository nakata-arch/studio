/**
 * @fileOverview Firebase configuration object.
 * This file only exports the configuration and does not initialize the Firebase app.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIza...", // Fallback to placeholder if env var is missing
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8319571679-fb38f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8319571679-fb38f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-8319571679-fb38f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "34460193112",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:34460193112:web:2a8f895f5904533038676a",
};
