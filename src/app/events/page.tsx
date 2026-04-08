
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useUser, DUMMY_USER_ID } from "@/firebase";
import { collection, query, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, CalendarDays, ChevronDown, LogIn, History } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUADRANTS } from "@/lib/mock-data";
import { PREVIEW_EVENTS } from "@/lib/preview-data";
import Link from "next/link";

const EVENTS_PER_PAGE = 20;

export default function EventsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEvents = async (isLoadMore = false) => {
    if (!user) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setErrorMessage(null);
    }

    // プレビュー環境（ダミーユーザー）の処理
    if (user.uid === DUMMY_USER_ID) {
      setTimeout(() => {
        const sorted = [...PREVIEW_EVENTS].sort((a, b) => 
          new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
        );
        if (isLoadMore) {
          setEvents(prev => [...prev, ...sorted.slice(prev.length, prev.length + EVENTS_PER_PAGE)]);
        } else {
          setEvents(sorted.slice(0, EVENTS_PER_PAGE));
        }
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
      }, 500);
      return;
    }

    try {
      const eventsRef = collection(db, "users", user.uid, "events");
      let q = query(
        eventsRef, 
        orderBy("startAt", "desc"), 
        limit(EVENTS_PER_PAGE)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          eventsRef, 
          orderBy("startAt", "desc"), 
          startAfter(lastDoc), 
          limit(EVENTS_PER_PAGE)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ ...doc.data() } as AppEvent));
      
      if (isLoadMore) {
        setEvents(prev => [...prev, ...fetched]);
      } else {
        setEvents(fetched);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === EVENTS_PER_PAGE);
    } catch (err: any) {
      console.error("events:error", err);
      setErrorMessage("予定の読み込みに失敗しました。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading) {
      fetchEvents();
    }
  }, [user, isUserLoading]);

  // 日ごとにグループ化
  const groupedEvents = useMemo(() => {
    const groups: Record<string, AppEvent[]> = {};
    events.forEach(event => {
      try {
        const dayKey = format(parseISO(event.startAt), "yyyy年 M月d日(E)", { locale: ja });
        if (!groups[dayKey]) groups[dayKey] = [];
        groups[dayKey].push(event);
      } catch (e) {
        console.warn("Invalid date format:", event.startAt);
      }
    });
    return groups;
  }, [events]);

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
          <CalendarDays className="h-12 w-12 mx-auto" />
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
      <header className="p-8 pt-16 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/40">
            <History className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">タイムライン</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-foreground/70">すべての記録</h1>
        </div>
        {!loading && (
          <Badge variant="secondary" className="gap-1 rounded-full px-3 h-6 bg-primary/5 text-primary/40 border-none font-bold">
            {events.length}件
          </Badge>
        )}
      </header>

      <main className="px-6 space-y-10">
        {loading ? (
          <div className="flex py-32 justify-center">
            <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
          </div>
        ) : errorMessage ? (
          <div className="text-center py-32 text-rose-500 text-xs font-bold uppercase tracking-widest">
            {errorMessage}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-32 space-y-4 opacity-30">
             <CalendarDays className="h-12 w-12 mx-auto" />
             <p className="text-xs font-medium uppercase tracking-widest">記録が見つかりません</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedEvents).map(([dayLabel, dayEvents]) => (
              <div key={dayLabel} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <span className="text-[11px] font-bold text-primary/30 uppercase tracking-[0.2em] whitespace-nowrap">{dayLabel}</span>
                  <div className="h-[1px] w-full bg-primary/5" />
                </div>
                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <Card key={event.id} className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden hover:bg-white transition-all">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13px] font-bold text-foreground/70 truncate">{event.title}</h4>
                            {event.reportStatus && (
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                event.reportStatus === 'done' ? 'bg-emerald-400' : 
                                event.reportStatus === 'failed' ? 'bg-rose-400' : 'bg-slate-300'
                              }`} />
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground opacity-50 font-medium">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(event.startAt), "HH:mm")}
                            </div>
                            {event.reportStatus && (
                              <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                {event.reportStatus === 'done' ? 'DONE' : event.reportStatus === 'failed' ? 'FAILED' : 'CANCELLED'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {event.quadrantCategory ? (
                          <div className="w-9 h-9 bg-primary/[0.03] rounded-xl flex items-center justify-center shrink-0 border border-primary/[0.02]">
                            <span className="text-sm" title={QUADRANTS[event.quadrantCategory]?.label}>
                              {QUADRANTS[event.quadrantCategory]?.icon}
                            </span>
                          </div>
                        ) : (
                          <div className="w-9 h-9 bg-primary/[0.01] rounded-xl border border-dashed border-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-primary/10 font-bold">?</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="pt-4 pb-8 flex justify-center">
                <Button 
                  variant="ghost" 
                  onClick={() => fetchEvents(true)} 
                  disabled={loadingMore}
                  className="rounded-full text-[10px] font-bold uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/5 px-8 gap-2"
                >
                  {loadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  さらに読み込む
                </Button>
              </div>
            )}

            {!hasMore && events.length > 0 && (
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/20 pb-10">
                すべての記録を表示しました
              </p>
            )}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
