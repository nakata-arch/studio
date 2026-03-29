
"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { Quote, AppEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle2, ListTodo, Trophy, CloudOff } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [stats, setStats] = useState({
    todayCount: 0,
    unclassifiedCount: 0,
    unreportedCount: 0,
  });
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        fetchStats(user.uid);
      }
    });

    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    setIsOffline(!navigator.onLine);

    // Morning/Evening logic for quotes
    const hour = new Date().getHours();
    const timing = hour < 12 ? 'morning' : hour > 18 ? 'evening' : 'any';
    const filteredQuotes = MOCK_QUOTES.filter(q => q.displayTiming === timing || q.displayTiming === 'any');
    setQuote(filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)]);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [router]);

  const fetchStats = async (uid: string) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      const eventsRef = collection(db, "events");
      
      // Today's events
      const todayQuery = query(eventsRef, where("userId", "==", uid), where("startAt", ">=", todayStart), where("startAt", "<=", todayEnd));
      const todaySnap = await getDocs(todayQuery);
      
      // Future unclassified
      const unclassifiedQuery = query(eventsRef, where("userId", "==", uid), where("quadrantCategory", "==", null));
      const unclassifiedSnap = await getDocs(unclassifiedQuery);
      
      // Past unreported
      const unreportedQuery = query(eventsRef, where("userId", "==", uid), where("reportStatus", "==", null), where("startAt", "<", todayStart));
      const unreportedSnap = await getDocs(unreportedQuery);

      setStats({
        todayCount: todaySnap.size,
        unclassifiedCount: unclassifiedSnap.size,
        unreportedCount: unreportedSnap.size,
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 pt-12 flex flex-col gap-2">
        {isOffline && (
          <div className="flex items-center gap-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded-lg mb-4">
            <CloudOff className="h-4 w-4" />
            オフラインモードです。データは同期されません。
          </div>
        )}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Welcome back</h2>
        <h1 className="text-3xl font-bold">{user.displayName || "User"} さん</h1>
      </header>

      <main className="px-6 space-y-6">
        {/* Quote Card */}
        {quote && (
          <Card className="border-none bg-gradient-to-br from-primary/10 to-accent/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <Trophy className="h-4 w-4" /> 
                今日の名言
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-lg font-headline leading-relaxed italic">"{quote.text}"</p>
                <p className="text-right text-xs text-muted-foreground">— {quote.author}</p>
              </div>
              <div className="pt-2 border-t border-primary/10">
                <p className="text-sm font-semibold text-accent">{quote.question}</p>
                <p className="text-xs text-muted-foreground mt-1">{quote.subMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 gap-4">
          <Link href="/classify">
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">未来予定の分類</h3>
                    <p className="text-xs text-muted-foreground">未分類: {stats.unclassifiedCount}件</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/report">
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">過去予定の日報</h3>
                    <p className="text-xs text-muted-foreground">未入力: {stats.unreportedCount}件</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/events">
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">すべての予定</h3>
                    <p className="text-xs text-muted-foreground">今日の予定: {stats.todayCount}件</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="flex justify-center pt-4">
          <Button variant="outline" className="text-muted-foreground text-xs" onClick={() => auth.signOut()}>
            ログアウト
          </Button>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
