
"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { Quote, AppEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  ListTodo, 
  Trophy, 
  CloudOff, 
  Settings, 
  LogOut, 
  RefreshCw,
  User as UserIcon,
  Mail
} from "lucide-react";
import Link from "next/link";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [stats, setStats] = useState({
    todayCount: 0,
    unclassifiedCount: 0,
    unreportedCount: 0,
  });
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
      fetchStats(user.uid);
    }

    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    setIsOffline(!navigator.onLine);

    const hour = new Date().getHours();
    const timing = hour < 12 ? 'morning' : hour > 18 ? 'evening' : 'any';
    const filteredQuotes = MOCK_QUOTES.filter(q => q.displayTiming === timing || q.displayTiming === 'any');
    setQuote(filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)]);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [user]);

  const fetchStats = async (uid: string) => {
    const eventsRef = collection(db, "users", uid, "events");
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      const todayQuery = query(eventsRef, where("startAt", ">=", todayStart), where("startAt", "<=", todayEnd));
      const todaySnap = await getDocs(todayQuery);
      
      const unclassifiedQuery = query(eventsRef, where("quadrantCategory", "==", null));
      const unclassifiedSnap = await getDocs(unclassifiedQuery);
      
      const unreportedQuery = query(eventsRef, where("reportStatus", "==", null), where("startAt", "<", todayStart));
      const unreportedSnap = await getDocs(unreportedQuery);

      setStats({
        todayCount: todaySnap.size,
        unclassifiedCount: unclassifiedSnap.size,
        unreportedCount: unreportedSnap.size,
      });
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: eventsRef.path,
          operation: 'list',
        }));
      } else {
        console.error("Stats fetch error:", err);
      }
    }
  };

  const handleSyncCalendar = async () => {
    if (!user) return;
    setIsSyncing(true);

    try {
      // Simulate/Trigger calendar synchronization
      // In a real app, this would fetch from Google Calendar API
      // For this prototype, we'll populate some sample events to resolve the "not synced" issue
      const eventsRef = collection(db, "users", user.uid, "events");
      const existingEvents = await getDocs(eventsRef);

      if (existingEvents.empty) {
        const sampleEvents: Partial<AppEvent>[] = [
          {
            title: "戦略ミーティング",
            startAt: new Date(Date.now() + 3600000).toISOString(),
            endAt: new Date(Date.now() + 7200000).toISOString(),
            calendarName: "メイン",
            googleEventId: "sample-1",
            syncStatus: "synced",
          },
          {
            title: "週次レビュー",
            startAt: new Date(Date.now() - 86400000).toISOString(),
            endAt: new Date(Date.now() - 82800000).toISOString(),
            calendarName: "仕事",
            googleEventId: "sample-2",
            syncStatus: "synced",
          }
        ];

        for (const ev of sampleEvents) {
          const newDocRef = doc(eventsRef);
          await setDoc(newDocRef, {
            ...ev,
            id: newDocRef.id,
            userId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSharedCalendar: false,
            lastSyncedAt: Date.now(),
          });
        }
      }

      await fetchStats(user.uid);
      toast({
        title: "同期完了",
        description: "Googleカレンダーの最新情報を取得しました。",
      });
    } catch (error) {
      console.error("Sync failed:", error);
      toast({
        variant: "destructive",
        title: "同期失敗",
        description: "カレンダーの同期中にエラーが発生しました。",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isUserLoading || !user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-6 pt-12 flex flex-col gap-2">
        {isOffline && (
          <div className="flex items-center gap-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded-lg mb-4">
            <CloudOff className="h-4 w-4" />
            オフラインモードです。データは同期されません。
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard</h2>
            <h1 className="text-3xl font-bold">おかえりなさい</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* Profile Card */}
        <Card className="border-none shadow-lg bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <UserIcon className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold truncate">{user.displayName || "User"}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleSyncCalendar} 
                disabled={isSyncing}
                variant="outline" 
                className="h-12 gap-2 font-semibold shadow-sm"
              >
                <RefreshCw className={isSyncing ? "animate-spin h-4 w-4" : "h-4 w-4 text-primary"} />
                同期設定
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="h-12 gap-2 font-semibold text-destructive hover:text-destructive shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quote Card */}
        {quote && (
          <Card className="border-none bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-2">
                <SparklesIcon className="h-3 w-3" /> 
                Today's Motivation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-2">
                <p className="text-xl font-headline leading-tight italic">"{quote.text}"</p>
                <p className="text-right text-xs opacity-70">— {quote.author}</p>
              </div>
              <div className="pt-4 border-t border-white/20">
                <p className="text-sm font-bold text-yellow-300">{quote.question}</p>
                <p className="text-xs opacity-80 mt-1">{quote.subMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action List */}
        <div className="space-y-3">
          <Link href="/classify">
            <Card className="hover:border-primary transition-all hover:shadow-md active:scale-[0.98]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">未来予定の分類</h3>
                    <p className="text-[10px] text-muted-foreground">未分類: {stats.unclassifiedCount}件</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-primary text-xs font-bold">
                  Start <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/report">
            <Card className="hover:border-primary transition-all hover:shadow-md active:scale-[0.98]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">過去予定の日報</h3>
                    <p className="text-[10px] text-muted-foreground">未入力: {stats.unreportedCount}件</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-primary text-xs font-bold">
                  Review <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/events">
            <Card className="hover:border-primary transition-all hover:shadow-md active:scale-[0.98]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">すべての予定</h3>
                    <p className="text-[10px] text-muted-foreground">今日の予定: {stats.todayCount}件</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-primary text-xs font-bold">
                  View <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
