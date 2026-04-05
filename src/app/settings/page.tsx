
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
  ExternalLink
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saving' | 'success' | 'failed'>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [counts, setCounts] = useState({ report: 0, classify: 0 });

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const eventsRef = collection(db, "users", user.uid, "events");
      const snap = await getDocs(eventsRef);
      const all = snap.docs.map(d => d.data() as AppEvent);
      
      setCounts({
        report: all.filter(e => !e.reportStatus && new Date(e.startAt) < new Date()).length,
        classify: all.filter(e => !e.quadrantCategory).length
      });
    } catch (e) {
      console.error("Count fetch failed", e);
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
      
      if (!response.ok) {
        const errorMsg = body.error?.message || response.statusText;
        if (errorMsg.includes("Google Calendar API has not been used") || errorMsg.includes("disabled")) {
          setErrorDetails("Google Cloud ConsoleでCalendar APIを有効にする必要があります。");
          setSyncStatus('failed');
          return;
        }
        throw new Error(`APIエラー: ${errorMsg}`);
      }

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
          location: ev.location || "",
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
      console.error("Sync Error:", err);
      setSyncStatus('failed');
      setErrorDetails(err.message);
      toast({ variant: "destructive", title: "同期できませんでした", description: err.message });
    }
  }, [user, db, toast, fetchCounts]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/");
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
      fetchCounts();
      // Handle redirect result specifically for syncing (re-authentication)
      getRedirectResult(auth).then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const accessToken = credential?.accessToken;
          if (accessToken) {
            processSync(accessToken);
          }
        }
      }).catch((error) => {
        console.error("Redirect sync failed:", error);
      });
    }
  }, [user, auth, fetchCounts, processSync]);

  const handleSyncTrigger = () => {
    if (!user) return;
    setSyncStatus('syncing');
    setErrorDetails(null);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    // Ensure no async/await before calling redirect
    signInWithRedirect(auth, provider).catch((error) => {
      console.error("Redirect sync trigger failed:", error);
      setSyncStatus('failed');
    });
  };

  if (isUserLoading || !user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16 flex justify-between items-center" />

      <main className="px-8 space-y-10">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-white shadow-sm shrink-0">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback><UserIcon className="h-8 w-8 opacity-20" /></AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xl font-bold truncate tracking-tight text-foreground/80">{user.displayName}</h3>
            <p className="text-[10px] text-muted-foreground opacity-60 truncate uppercase font-bold tracking-widest">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none bg-primary/5 shadow-sm rounded-3xl">
            <CardContent className="p-6 space-y-1">
              <div className="flex items-center gap-2 text-primary/40">
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">未報告</span>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-primary/80">{counts.report}<span className="text-xs font-normal ml-1 opacity-40">件</span></p>
            </CardContent>
          </Card>
          <Card className="border-none bg-primary/5 shadow-sm rounded-3xl">
            <CardContent className="p-6 space-y-1">
              <div className="flex items-center gap-2 text-primary/40">
                <ListTodo className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">未分類</span>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-primary/80">{counts.classify}<span className="text-xs font-normal ml-1 opacity-40">件</span></p>
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

          {syncStatus === 'failed' && errorDetails?.includes("APIを有効にする") && (
            <Button
              type="button"
              variant="secondary"
              className="w-full h-12 rounded-xl gap-2 text-xs"
              asChild
            >
              <a href={`https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=34460193112`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Google Cloud ConsoleでAPIを有効化する
              </a>
            </Button>
          )}

          <Button 
            type="button"
            onClick={() => auth.signOut()}
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
