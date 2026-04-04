
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, CalendarDays, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUADRANTS } from "@/lib/mock-data";

const EVENTS_PER_PAGE = 20;

export default function EventsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchEvents = async (isLoadMore = false) => {
    if (!user) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

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

    try {
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ ...doc.data() } as AppEvent));
      
      if (isLoadMore) {
        setEvents(prev => [...prev, ...fetched]);
      } else {
        setEvents(fetched);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === EVENTS_PER_PAGE);

    } catch (err) {
      console.error("Fetch events failed:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchEvents();
    }
  }, [user, isUserLoading, db]);

  // 月ごとにグループ化
  const groupedEvents = useMemo(() => {
    const groups: Record<string, AppEvent[]> = {};
    events.forEach(event => {
      const monthKey = format(parseISO(event.startAt), "yyyy年 M月");
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    });
    return groups;
  }, [events]);

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/40">
            <CalendarDays className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">すべての記録</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-foreground/70">予定一覧</h1>
        </div>
        <Badge variant="secondary" className="gap-1 rounded-full px-3 h-6 bg-primary/5 text-primary/40 border-none font-bold">
          {events.length}件表示中
        </Badge>
      </header>

      <main className="px-6 space-y-10">
        {events.length === 0 ? (
          <div className="text-center py-32 space-y-4 opacity-30">
             <CalendarDays className="h-12 w-12 mx-auto" />
             <p className="text-xs font-medium uppercase tracking-widest">記録が見つかりません</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <span className="text-[11px] font-bold text-primary/30 uppercase tracking-[0.2em] whitespace-nowrap">{month}</span>
                  <div className="h-[1px] w-full bg-primary/5" />
                </div>
                <div className="space-y-3">
                  {monthEvents.map((event) => (
                    <Card key={event.id} className="border-none shadow-sm overflow-hidden bg-white/60 rounded-2xl transition-all hover:shadow-md">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center bg-primary/[0.03] rounded-xl p-2 min-w-[54px] aspect-square">
                          <span className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter">{format(parseISO(event.startAt), "EEE", { locale: ja })}</span>
                          <span className="text-lg font-bold text-foreground/70 leading-none">{format(parseISO(event.startAt), "d")}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[13px] truncate leading-none text-foreground/80">{event.title}</h3>
                            {event.quadrantCategory && (
                              <span className="text-sm shrink-0" title={QUADRANTS[event.quadrantCategory]?.label}>
                                {QUADRANTS[event.quadrantCategory]?.icon}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-60 font-medium">
                            <Clock className="h-2.5 w-2.5" />
                            {format(parseISO(event.startAt), "HH:mm")}
                          </p>
                        </div>
                        {event.reportStatus && (
                          <Badge variant="outline" className={`text-[8px] uppercase h-5 px-2 rounded-full border-none font-bold shrink-0 ${
                            event.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-600' : 
                            event.reportStatus === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                          }`}>
                            {event.reportStatus === 'done' ? 'できた' : event.reportStatus === 'failed' ? '未達' : '中止'}
                          </Badge>
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
