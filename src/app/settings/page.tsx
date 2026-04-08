"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AppEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  RefreshCw,
  User as UserIcon,
  ClipboardCheck,
  ListTodo,
  Loader2,
  LogIn,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { endOfToday, isAfter, parseISO, subYears } from "date-fns";

type SyncSummary = {
  fetched: number;
  cancelled: number;
};

function isPastOrToday(dateString?: string) {
  if (!dateString) return false;
  try {
    return !isAfter(parseISO(dateString), endOfToday());
  } catch {
    return false;
  }
}

async function fetchAllGoogleCalendarEvents(accessToken: string) {
  const allItems: any[] = [];
  let nextPageToken: string | undefined = undefined;

  const timeMin = subYears(new Date(), 5).toISOString();
  const timeMax = endOfToday().toISOString();

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults: "250",
      singleEvents: "true",
      orderBy: "startTime",
    });

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error?.message || response.statusText);
    }

    allItems.push(...(body.items || []));
    nextPageToken = body.nextPageToken;
  } while (nextPageToken);

  return allItems;
}

export default function SettingsPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, isPreviewMode } = useUser();
  const { toast } = useToast();

  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "saving" | "success" | "failed">("idle");
  const [counts, setCounts] = useState({ report: 0, classify: 0 });
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    setIsCountsLoading(true);
    try {
      const eventsRef = collection(db, "users", user.uid, "events");
      const snap = await getDocs(eventsRef);

      const all = snap.docs
        .map((d) => d.data() as AppEvent)
        .filter((e) => !e.deleted)
        .filter((e) => isPastOrToday(e.startAt));

      setCounts({
        report: all.filter((e) => !e.reportStatus).length,
        classify: all.filter((e) => !e.quadrantCategory).length,
      });
    } catch (e) {
      console.error("settings:fetch-counts-error", e);
    } finally {
      setIsCountsLoading(false);
    }
  }, [user, db]);

  const processSync = useCallback(async (accessToken: string) => {
    if (!user) return;
    setSyncStatus("saving");
    setSyncSummary(null);

    try {
      const items = await fetchAllGoogleCalendarEvents(accessToken);
      const now = Date.now();

      let cancelled = 0;

      for (const ev of items) {
        if (!ev?.id) continue;

        const startAt = ev.start?.dateTime || ev.start?.date;
        const endAt = ev.end?.dateTime || ev.end?.date;

        if (!startAt) continue;

        const isCancelled = ev.status === "cancelled";
        if (isCancelled) cancelled += 1;

        const eventRef = doc(db, "users", user.uid, "events", ev.id);

        await setDoc(
          eventRef,
          {
            id: ev.id,
            userId: user.uid,
            googleEventId: ev.id,
            title: ev.summary || "(タイトルなし)",
            description: ev.description || "",
            startAt,
            endAt: endAt || startAt,
            calendarName: "Google Calendar",
            syncStatus: "synced",
            deleted: isCancelled,
            source: "google_calendar",
            lastSyncedAt: now,
            updatedAt: now,
            isReported: false,
          },
          { merge: true }
        );
      }

      setSyncSummary({
        fetched: items.length,
        cancelled,
      });

      setSyncStatus("success");
      await fetchCounts();

      toast({
        title: "同期完了",
        description: `${items.length}件の予定を同期しました。キャンセル反映 ${cancelled}件`,
      });

      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err: any) {
      console.error("settings:sync-error", err);
      setSyncStatus("failed");
      toast({
        variant: "destructive",
        title: "同期失敗",
        description: err.message || "カレンダー同期に失敗しました。",
      });
    }
  }, [user, db, toast, fetchCounts]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchCounts();
      if (isPreviewMode) return;

      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const accessToken = credential?.accessToken;
            if (accessToken) {
              processSync(accessToken);
            }
          }
        })
        .catch((error) => {
          console.error("settings:redirect-sync-error", error);
        });
    }
  }, [user, isUserLoading, auth, fetchCounts, processSync, isPreviewMode]);

  const handleSyncTrigger = () => {
    if (!user) return;
    if (isPreviewMode) {
      toast({
        variant: "destructive",
        title: "プレビュー制限",
        description: "Google同期にはデプロイ済み環境でのログインが必要です。",
      });
      return;
    }

    setSyncStatus("syncing");
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

    signInWithRedirect(auth, provider).catch((error) => {
      console.error("settings:redirect-trigger-error", error);
      setSyncStatus("failed");
    });
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          ユーザー情報を確認しています...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <div className="space-y-2 opacity-40">
          <UserIcon className="h-12 w-12 mx-auto" />
          <p className="text-sm font-bold">ログインが必要です</p>
        </div>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/">
            <LogIn className="h-4 w-4" /> ログイン画面へ
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16" />

      <main className="px-8 space-y-10">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-white shadow-sm shrink-0">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback><UserIcon className="h-8 w-8 opacity-20" /></AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xl font-bold truncate tracking-tight text-foreground/80">
              {user.displayName || "User"}
            </h3>
            <p className="text-[10px] text-muted-foreground opacity-60 truncate uppercase font-bold tracking-widest">
              {user.email || "Account"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none bg-primary/5 shadow-sm rounded-3xl">
            <CardContent className="p-6 space-y-1">
              <div className="flex items-center gap-2 text-primary/40">
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">未報告</span>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-primary/80">
                {isCountsLoading ? <Loader2 className="h-6 w-6 animate-spin opacity-20" /> : counts.report}
                <span className="text-xs font-normal ml-1 opacity-40">件</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-none bg-primary/5 shadow-sm rounded-3xl">
            <CardContent className="p-6 space-y-1">
              <div className="flex items-center gap-2 text-primary/40">
                <ListTodo className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">未分類</span>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-primary/80">
                {isCountsLoading ? <Loader2 className="h-6 w-6 animate-spin opacity-20" /> : counts.classify}
                <span className="text-xs font-normal ml-1 opacity-40">件</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {syncSummary && (
          <Card className="border-none bg-emerald-50 shadow-sm rounded-3xl">
            <CardContent className="p-5 text-xs text-emerald-800 space-y-1">
              <div>取得件数: <span className="font-bold">{syncSummary.fetched}</span></div>
              <div>キャンセル反映: <span className="font-bold">{syncSummary.cancelled}</span></div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleSyncTrigger}
            disabled={syncStatus === "syncing" || syncStatus === "saving"}
            variant="outline"
            className="w-full h-14 rounded-2xl gap-3 font-medium bg-white/50 border-primary/5 hover:bg-white transition-all shadow-sm"
          >
            <RefreshCw className={(syncStatus === "syncing" || syncStatus === "saving") ? "animate-spin h-4 w-4" : "h-4 w-4 opacity-40"} />
            カレンダーを同期する
          </Button>

          <Button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("isMockLoggedIn");
              auth.signOut();
              window.location.reload();
            }}
            variant="ghost"
            className="w-full h-12 rounded-2xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4 mr-2 opacity-40" />
            ログアウト
          </Button>
        </div>
      </main>

      <Navigation />
    </div>
  );
}