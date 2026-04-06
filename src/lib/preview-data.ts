
import { AppEvent, Summary } from "./types";
import { subDays, startOfToday, format } from "date-fns";

const today = startOfToday();

export const PREVIEW_EVENTS: AppEvent[] = [
  {
    id: "preview-ev-1",
    userId: "preview-user-123",
    googleEventId: "preview-ev-1",
    title: "重要な戦略ミーティング",
    description: "次期プロジェクトの方向性について",
    startAt: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(),
    calendarId: "primary",
    calendarName: "メインカレンダー",
    syncStatus: "synced",
    source: "google_calendar",
    isReported: false,
    lastSyncedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "preview-ev-2",
    userId: "preview-user-123",
    googleEventId: "preview-ev-2",
    title: "読書・インプット時間",
    description: "技術書のキャッチアップ",
    startAt: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(),
    calendarId: "primary",
    calendarName: "メインカレンダー",
    syncStatus: "synced",
    source: "google_calendar",
    isReported: false,
    lastSyncedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "preview-ev-3",
    userId: "preview-user-123",
    googleEventId: "preview-ev-3",
    title: "昨日のタスク振り返り",
    description: "完了したタスクの整理",
    startAt: subDays(today, 1).toISOString(),
    endAt: subDays(today, 1).toISOString(),
    calendarId: "primary",
    calendarName: "メインカレンダー",
    syncStatus: "synced",
    source: "google_calendar",
    isReported: true,
    reportStatus: "done",
    reportMemo: "集中して取り組めた。",
    lastSyncedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export const PREVIEW_SUMMARIES: Summary[] = [
  {
    id: `daily-${format(today, "yyyy-MM-dd")}`,
    userId: "preview-user-123",
    summaryType: "daily",
    startDate: format(today, "yyyy-MM-dd"),
    endDate: format(today, "yyyy-MM-dd"),
    summaryText: "今日は朝から集中力が高い。午後のルーチンも守れた。",
    updatedAt: Date.now(),
  }
];
