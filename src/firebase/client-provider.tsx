"use client";

import React, { type ReactNode } from "react";
import { FirebaseProvider } from "@/firebase/provider";
import { firebaseApp, auth, firestore } from "@/firebase/index";

type FirebaseClientProviderProps = {
  children: ReactNode;
};

/**
 * FirebaseClientProvider ensures Firebase is initialized and its context is provided
 * to the entire client-side application.
 */
export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
