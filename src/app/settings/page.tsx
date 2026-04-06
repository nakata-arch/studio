
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
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
  AlertTriangle,
  Loader2,
  LogIn
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, isPreviewMode } = useUser();
  const { toast } = useToast();
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saving' | 'success' | 'failed'>('idle');
  const [counts, setCounts] = useState({ report: 0, classify: 0 });
  const [isCountsLoading, setIsCountsLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    setIsCountsLoading(true);
    try {
      const eventsRef = collection(db, "users", user.uid, "events");
      const snap = await getDocs(eventsRef);
      const all = snap.docs.map(d => d.data() as AppEvent);
      
      setCounts({
        report: all.filter(e => !e.reportStatus && new Date(e.startAt) < new Date()).length,
        classify: all.filter(e => !e.quadrantCategory).length
      });
    } catch (e) {
      console.error("settings:fetch-counts-error", e);
    } finally {
      setIsCountsLoading(false);
    }
  }, [user, db]);

  const processSync = useCallback(async (accessToken: string) => {
    if (!user) return;
    setSyncStatus('saving');
    try {
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=100&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || response.statusText);

      const items = body.items || [];
      const now = Date.now();
      
      for (const ev of items) {
        const eventRef = doc(db, "users", user.uid, "events", ev.id);
        await setDoc(eventRef, {
          id: ev.id,
          userId: user.uid,
          googleEventId: ev.id,
          title: ev.summary || "(タイトルなし)",
          description: ev.description || "",
          startAt: ev.start?.dateTime || ev.start?.date,
          endAt: ev.end?.dateTime || ev.end?.date,
          calendarName: "Google Calendar",
          quadrantCategory: null,
          reportStatus: null,
          syncStatus: 'synced',
          isReported: false,
          source: "google_calendar",
          lastSyncedAt: now,
          updatedAt: now,
        }, { merge: true });
      }

      setSyncStatus('success');
      toast({ title: "整いました", description: `${items.length}件の予定を同期しました。` });
      fetchCounts();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      console.error("settings:sync-error", err);
      setSyncStatus('failed');
      toast({ variant: "destructive", title: "同期失敗", description: err.message });
    }
  }, [user, db, toast, fetchCounts]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchCounts();
      
      // プレビュー環境でのリダイレクトチェックをスキップ (Auth API 呼び出し防止)
      if (isPreviewMode) return;

      getRedirectResult(auth).then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const accessToken = credential?.accessToken;
          if (accessToken) {
            processSync(accessToken);
          }
        }
      }).catch((error) => {
        console.error("settings:redirect-sync-error", error);
      });
    }
  }, [user, isUserLoading, auth, fetchCounts, processSync, isPreviewMode]);

  const handleSyncTrigger = () => {
    if (!user) return;
    if (isPreviewMode) {
      toast({
        variant: "destructive",
        title: "プレビュー環境制限",
        description: "Google同期にはデプロイ済み環境でのログインが必要です。",
      });
      return;
    }

    setSyncStatus('syncing');
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    signInWithRedirect(auth, provider).catch((error) => {
      console.error("settings:redirect-trigger-error", error);
      setSyncStatus('failed');
    });
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">ユーザー情報を確認しています...</p>
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
          <Link href="/"><LogIn className="h-4 w-4" /> ログイン画面へ</Link>
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
            <h3 className="text-xl font-bold truncate tracking-tight text-foreground/80">{user.displayName || "User"}</h3>
            <p className="text-[10px] text-muted-foreground opacity-60 truncate uppercase font-bold tracking-widest">{user.email || "Temporary Account"}</p>
          </div>
        </div>

        {isPreviewMode && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">プレビューモードで実行中</p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                現在の環境では Google 同期が制限されています。
              </p>
            </div>
          </div>
        )}

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

        <div className="space-y-3">
          <Button 
            type="button"
            onClick={handleSyncTrigger} 
            disabled={syncStatus === 'syncing' || syncStatus === 'saving'}
            variant="outline" 
            className="w-full h-14 rounded-2xl gap-3 font-medium bg-white/50 border-primary/5 hover:bg-white transition-all shadow-sm"
          >
            <RefreshCw className={(syncStatus === 'syncing' || syncStatus === 'saving') ? "animate-spin h-4 w-4" : "h-4 w-4 opacity-40"} />
            カレンダーを同期する
          </Button>

          <Button 
            type="button"
            onClick={() => {
              sessionStorage.removeItem('isMockLoggedIn');
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
