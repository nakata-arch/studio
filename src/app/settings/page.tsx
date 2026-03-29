
"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { Quote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  CloudOff, 
  LogOut, 
  RefreshCw,
  User as UserIcon,
  Mail,
  Sparkles,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'failed'>('idle');
  const [fetchedEvents, setFetchedEvents] = useState<any[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
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
  }, []);

  const handleSyncCalendar = async () => {
    if (!user) return;
    setSyncStatus('syncing');
    setSyncError(null);
    setFetchedEvents([]);

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');

    try {
      // 1. signInWithPopup から accessToken を取得
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      console.log("--- Sync Debug Log Start ---");
      console.log("1. accessToken取得可否:", !!accessToken);

      if (!accessToken) {
        throw new Error("アクセストークンの取得に失敗しました。");
      }

      // 2. Google Calendar API を fetch (primary calendar)
      const now = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=10&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("2. calendar api status:", response.status);

      const body = await response.json();
      console.log("3. response body:", body);

      if (!response.ok) {
        throw new Error(`APIエラー: ${body.error?.message || response.statusText}`);
      }

      const items = body.items || [];
      console.log("4. items.length:", items.length);

      // 5. 予定のプレビュー（正規化）
      const normalizedEvents = items.map((item: any) => ({
        id: item.id,
        title: item.summary || "(タイトルなし)",
        startAt: item.start?.dateTime || item.start?.date,
        endAt: item.end?.dateTime || item.end?.date,
        description: item.description || "",
      }));

      console.log("5. normalized events preview:", normalizedEvents);
      console.log("--- Sync Debug Log End ---");

      setFetchedEvents(normalizedEvents);
      setSyncStatus('success');
      
      toast({
        title: "同期成功",
        description: `${normalizedEvents.length}件の予定を取得しました。`,
      });

    } catch (error: any) {
      console.error("Sync failed:", error);
      setSyncError(error.message || "同期中に不明なエラーが発生しました。");
      setSyncStatus('failed');
      
      toast({
        variant: "destructive",
        title: "同期失敗",
        description: error.message || "カレンダーの同期中にエラーが発生しました。",
      });
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
        <h1 className="text-3xl font-bold font-headline">設定</h1>
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
                disabled={syncStatus === 'syncing'}
                variant="outline" 
                className="h-12 gap-2 font-semibold shadow-sm"
              >
                <RefreshCw className={syncStatus === 'syncing' ? "animate-spin h-4 w-4" : "h-4 w-4 text-primary"} />
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

        {/* Sync Status Feedback */}
        {syncStatus !== 'idle' && (
          <Card className="border-none shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {syncStatus === 'syncing' && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
                {syncStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {syncStatus === 'failed' && <AlertCircle className="h-4 w-4 text-destructive" />}
                同期ステータス
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncStatus === 'syncing' && <p className="text-sm text-muted-foreground">Googleカレンダーから情報を取得しています...</p>}
              {syncStatus === 'failed' && (
                <div className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                  <p className="font-bold">同期に失敗しました</p>
                  <p className="text-xs opacity-80">{syncError}</p>
                </div>
              )}
              {syncStatus === 'success' && (
                <div className="space-y-4">
                  <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                    {fetchedEvents.length === 0 ? "取得可能な予定はありませんでした。" : `${fetchedEvents.length}件の予定を取得しました。`}
                  </p>
                  
                  {fetchedEvents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase">取得結果プレビュー（未保存）</p>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {fetchedEvents.map((ev) => (
                          <div key={ev.id} className="p-3 bg-muted/30 rounded-lg text-sm border border-border/50">
                            <div className="font-semibold truncate">{ev.title}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(ev.startAt), "M/d HH:mm", { locale: ja })} 〜
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quote Card */}
        {quote && (
          <Card className="border-none bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-2">
                <Sparkles className="h-3 w-3" /> 
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
      </main>

      <Navigation />
    </div>
  );
}
