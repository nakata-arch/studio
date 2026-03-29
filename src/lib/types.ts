
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
  id: string; // Firestore doc ID
  userId: string;
  googleEventId: string;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  description?: string;
  calendarId: string;
  calendarName: string;
  googleColorId?: string;
  quadrantCategory?: QuadrantCategory;
  reportStatus?: ReportStatus;
  reportMemo?: string;
  isSharedCalendar: boolean;
  syncStatus: SyncStatus;
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

export interface WeeklySummary {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  summaryText: string;
  insightText?: string;
  stats: {
    totalEvents: number;
    quadrantCounts: Record<QuadrantCategory, number>;
    statusCounts: Record<ReportStatus, number>;
  };
}
