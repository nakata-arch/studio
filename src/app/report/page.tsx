
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy, where } from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Ban, Loader2, Clock, Calendar as CalendarIcon, History } from "lucide-react";
import { format, isBefore, endOfToday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { QuotePopup } from "@/components/QuotePopup";
import { Badge } from "@/components/ui/badge";

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState<Record<string, string>>({});

  const fetchEvents = async () => {
    if (!user) return;
    const eventsRef = collection(db, "users", user.uid, "events");
    
    try {
      const qAll = query(eventsRef, orderBy("startAt", "desc"));
      const snap = await getDocs(qAll);
      const all = snap.docs.map(d => d.data() as AppEvent);
      
      const today = endOfToday();
      const filtered = all.filter(ev => !ev.reportStatus && isBefore(parseISO(ev.startAt), today));
      setEvents(filtered);
      
      const initial: Record<string, string> = {};
      filtered.forEach(ev => initial[ev.id] = ev.reportMemo || "");
      setMemo(initial);

      // 直近の報告済みをすべて取得（完了後の表示用）
      const reported = all
        .filter(ev => !!ev.reportStatus)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setRecentEvents(reported);

    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventsRef.path, operation: 'list' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) fetchEvents();
  }, [user, isUserLoading, db]);

  const handleUpdate = async (eventId: string, status: ReportStatus) => {
    if (!user) return;
    const eventDoc = doc(db, "users", user.uid, "events", eventId);
    const updateData = { reportStatus: status, reportMemo: memo[eventId] || "", isReported: true, updatedAt: Date.now() };

    updateDoc(eventDoc, updateData)
      .then(() => {
        fetchEvents();
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventDoc.path, operation: 'update' }));
      });
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <QuotePopup />
      
      <main className="flex-1 px-8 flex flex-col items-center pt-16">
        {events.length === 0 ? (
          <div className="w-full max-w-sm space-y-10 animate-in fade-in duration-700">
            <div className="text-center space-y-4 opacity-60 pt-10">
              <div className="w-16 h-16 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10">
                <Check className="text-primary/40 h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground/70 tracking-tight">すべての報告がおわりました</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Today's reports completed</p>
              </div>
            </div>

            {recentEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-primary/30">
                  <History className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">直近の報告一覧</span>
                </div>
                <div className="space-y-3">
                  {recentEvents.map(ev => (
                    <Card key={ev.id} className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-[13px] font-bold text-foreground/70 truncate">{ev.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground opacity-50 font-medium">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(ev.startAt), "M/d HH:mm")}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[8px] uppercase px-2 h-5 rounded-full border-none font-bold shrink-0 ${
                          ev.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-600' : 
                          ev.reportStatus === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {ev.reportStatus === 'done' ? 'できた' : ev.reportStatus === 'failed' ? '未達' : '中止'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-6">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] text-center">
              Pending Reports: {events.length}
            </div>
            <Carousel className="w-full">
              <CarouselContent>
                {events.map((event) => (
                  <CarouselItem key={event.id}>
                    <Card className="border-none shadow-xl bg-white mx-1 rounded-[2.5rem] overflow-hidden">
                      <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                            <CalendarIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.calendarName}</span>
                          </div>
                          <h2 className="text-xl font-headline leading-snug text-foreground/80 break-words line-clamp-2">{event.title}</h2>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {format(parseISO(event.startAt), "M月d日(E) HH:mm", { locale: ja })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Textarea 
                            placeholder="どんな時間でしたか？" 
                            value={memo[event.id] || ""} 
                            onChange={(e) => setMemo({ ...memo, [event.id]: e.target.value })}
                            className="text-sm min-h-[100px] bg-primary/[0.02] border-none rounded-2xl focus-visible:ring-primary/5 resize-none italic"
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" className="flex-col h-16 rounded-2xl border-none bg-primary/[0.03] hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-95 px-1 group" onClick={() => handleUpdate(event.id, 'done')}>
                            <Check className="h-4 w-4 mb-1 opacity-40 group-hover:opacity-100" />
                            <span className="text-[9px] font-bold">できた</span>
                          </Button>
                          <Button variant="outline" className="flex-col h-16 rounded-2xl border-none bg-primary/[0.03] hover:bg-rose-50 hover:text-rose-700 transition-all active:scale-95 px-1 group" onClick={() => handleUpdate(event.id, 'failed')}>
                            <X className="h-4 w-4 mb-1 opacity-40 group-hover:opacity-100" />
                            <span className="text-[9px] font-bold">未達</span>
                          </Button>
                          <Button variant="outline" className="flex-col h-16 rounded-2xl border-none bg-primary/[0.03] hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95 px-1 group" onClick={() => handleUpdate(event.id, 'cancelled')}>
                            <Ban className="h-4 w-4 mb-1 opacity-40 group-hover:opacity-100" />
                            <span className="text-[9px] font-bold">中止</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
