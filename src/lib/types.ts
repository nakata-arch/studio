
export type QuadrantCategory = 
  | 'urgent_important' 
  | 'not_urgent_important' 
  | 'urgent_not_important' 
  | 'not_urgent_not_important';

export type ReportStatus = 'done' | 'failed' | 'cancelled';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: number;
  lastLoginAt: number;
  streakCount: number;
}

export interface AppEvent {
  id: string; // Firestore doc ID (matches googleEventId)
  userId: string;
  googleEventId: string;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  description?: string;
  location?: string;
  calendarId: string;
  calendarName: string;
  googleColorId?: string;
  quadrantCategory?: QuadrantCategory | null;
  reportStatus?: ReportStatus | null;
  reportMemo?: string;
  isSharedCalendar?: boolean;
  syncStatus: SyncStatus;
  source: "google_calendar" | "app";
  isReported: boolean;
  lastSyncedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  displayTiming: 'morning' | 'evening' | 'any';
  subMessage: string;
  question: string;
}

export interface Summary {
  id: string;
  userId: string;
  summaryType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  summaryText: string;
  insightText?: string;
  totalEventsCount?: number;
  doneCount?: number;
  failedCount?: number;
  cancelledCount?: number;
  updatedAt?: any;
}
