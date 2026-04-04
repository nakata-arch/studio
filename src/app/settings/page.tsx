
"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { Quote, AppEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  RefreshCw,
  User as UserIcon,
  Sparkles,
  ClipboardCheck,
  ListTodo
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saving' | 'success' | 'failed'>('idle');
  const [counts, setCounts] = useState({ report: 0, classify: 0 });

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/");
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // 起動時に名言をランダムに設定
    const randomQuote = MOCK_QUOTES[Math.floor(Math.random() * MOCK_QUOTES.length)];
    setQuote(randomQuote);

    const fetchCounts = async () => {
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
    };
    if (user) fetchCounts();
  }, [user, db]);

  const handleSync = async () => {
    if (!user) return;
    setSyncStatus('syncing');
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) throw new Error("認証に失敗しました。");

      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=100&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "同期に失敗しました。");

      setSyncStatus('saving');
      const now = Date.now();
      for (const ev of (body.items || [])) {
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
          lastSyncedAt: now,
          updatedAt: now,
        }, { merge: true });
      }

      setSyncStatus('success');
      toast({ title: "整いました", description: "カレンダーの情報を更新しました。" });
      
      // 数値の再取得
      const eventsRef = collection(db, "users", user.uid, "events");
      const snap = await getDocs(eventsRef);
      const all = snap.docs.map(d => d.data() as AppEvent);
      setCounts({
        report: all.filter(e => !e.reportStatus && new Date(e.startAt) < new Date()).length,
        classify: all.filter(e => !e.quadrantCategory).length
      });
      setSyncStatus('idle');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setSyncStatus('idle');
        return;
      }
      setSyncStatus('failed');
      toast({ variant: "destructive", title: "お困りですか？", description: err.message });
    }
  };

  if (isUserLoading || !user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <main className="px-6 pt-16 space-y-10">
        <div className="flex items-center gap-4 px-2">
          <Avatar className="h-16 w-16 ring-4 ring-white shadow-sm shrink-0">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback><UserIcon className="h-8 w-8 opacity-20" /></AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xl font-bold truncate tracking-tight">{user.displayName}</h3>
            <p className="text-xs text-muted-foreground opacity-60 truncate">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none bg-primary/5 shadow-sm rounded-3xl">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2 text-primary/60">
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">未報告</span>
              </div>
              <p className="text-3xl font-bold tracking-tighter">{counts.report}<span className="text-xs font-normal ml-1 opacity-40">件</span></p>
            </CardContent>
          </Card>
          <Card className="border-none bg-primary/5 shadow-sm rounded-3xl">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2 text-primary/60">
                <ListTodo className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">未分類</span>
              </div>
              <p className="text-3xl font-bold tracking-tighter">{counts.classify}<span className="text-xs font-normal ml-1 opacity-40">件</span></p>
            </CardContent>
          </Card>
        </div>

        {quote && (
          <Card className="border-none bg-white shadow-xl overflow-hidden relative rounded-[2.5rem]">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">静かなことば</span>
                </div>
                <p className="text-lg font-headline leading-relaxed italic text-foreground/70">"{quote.text}"</p>
              </div>
              <div className="pt-5 border-t border-primary/5 space-y-1">
                <p className="text-sm font-medium text-foreground/60">{quote.question}</p>
                <p className="text-[11px] text-muted-foreground opacity-50">{quote.subMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3 pt-4">
          <Button 
            onClick={handleSync} 
            disabled={syncStatus === 'syncing' || syncStatus === 'saving'}
            variant="outline" 
            className="w-full h-14 rounded-2xl gap-3 font-medium bg-white/50 border-primary/10 hover:bg-white transition-all shadow-sm"
          >
            <RefreshCw className={(syncStatus === 'syncing' || syncStatus === 'saving') ? "animate-spin h-4 w-4" : "h-4 w-4 opacity-50"} />
            カレンダーを同期する
          </Button>
          <Button 
            onClick={() => auth.signOut()}
            variant="ghost" 
            className="w-full h-12 rounded-2xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4 mr-2 opacity-50" />
            ログアウト
          </Button>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
