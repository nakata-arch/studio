import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  projectId: "studio-8319571679-fb38f",
  appId: "1:34460193112:web:...",
  apiKey: "AIza...",
  authDomain: "studio-8319571679-fb38f.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "34460193112",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);