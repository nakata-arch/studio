
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isPreviewMode: boolean;
  loginAsMockUser: () => void;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isPreviewMode: boolean;
  loginAsMockUser: () => void;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isPreviewMode: boolean;
  loginAsMockUser: () => void;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Dummy user for preview mode
const DUMMY_USER = {
  uid: 'preview-user-123',
  displayName: 'Preview User',
  email: 'preview@example.com',
  photoURL: 'https://picsum.photos/seed/user/200/200',
  isAnonymous: true,
  emailVerified: true,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'dummy-token',
  getIdTokenResult: async () => ({}) as any,
  reload: async () => {},
  toJSON: () => ({}),
} as unknown as User;

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [mockUser, setMockUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isStudioPreview =
        hostname.includes("cloudworkstations.dev") ||
        hostname === "studio.firebase.google.com";
      setIsPreviewMode(isStudioPreview);

      // Restore mock session if exists
      if (isStudioPreview && sessionStorage.getItem('isMockLoggedIn') === 'true') {
        setMockUser(DUMMY_USER);
      }
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // Only set real user if not in mock mode
        if (!mockUser) {
          setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        if (!mockUser) {
          console.error("FirebaseProvider: onAuthStateChanged error:", error);
          setUserAuthState({ user: null, isUserLoading: false, userError: error });
        }
      }
    );
    return () => unsubscribe();
  }, [auth, mockUser]);

  const loginAsMockUser = () => {
    if (isPreviewMode) {
      setMockUser(DUMMY_USER);
      sessionStorage.setItem('isMockLoggedIn', 'true');
      setUserAuthState({ user: DUMMY_USER, isUserLoading: false, userError: null });
    }
  };

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    const currentUser = mockUser || userAuthState.user;
    const loading = mockUser ? false : userAuthState.isUserLoading;

    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: currentUser,
      isUserLoading: loading,
      userError: userAuthState.userError,
      isPreviewMode,
      loginAsMockUser,
    };
  }, [firebaseApp, firestore, auth, userAuthState, isPreviewMode, mockUser]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    isPreviewMode: context.isPreviewMode,
    loginAsMockUser: context.loginAsMockUser,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, isPreviewMode, loginAsMockUser } = useFirebase();
  return { user, isUserLoading, userError, isPreviewMode, loginAsMockUser };
};
