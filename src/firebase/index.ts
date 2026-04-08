'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
/**
 * Initializes Firebase with prioritized strategies:
 * 1. Automatic initialization (for App Hosting production)
 * 2. Configuration object with environment variables
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  let app: FirebaseApp;
  try {
    // Attempt to initialize via Firebase App Hosting automatic environment variables (no args)
    app = initializeApp();
  } catch (e) {
    // Fallback to the explicit configuration object (for local dev or Studio preview)
    if (process.env.NODE_ENV === "production") {
      console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
    }
    app = initializeApp(firebaseConfig);
  }

  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// Initialize and export singleton instances
const sdk = initializeFirebase();
export const firebaseApp = sdk.firebaseApp;
export const auth = sdk.auth;
export const firestore = sdk.firestore;

// Export Google Auth Provider with necessary scopes for Google Calendar
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");
googleProvider.setCustomParameters({
  prompt: "consent",
});

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
