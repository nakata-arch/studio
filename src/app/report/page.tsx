"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Ban, Loader2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      const eventsRef = collection(db, "users", user.uid, "events");
      const q = query(eventsRef, orderBy("startAt", "desc"));

      try {
        const snap = await getDocs(q);
        const filtered = snap.docs
          .map(d => d.data() as AppEvent)
          .filter(ev => !ev.reportStatus && new Date(ev.startAt) < new Date());
        
        setEvents(filtered);
        const initial: Record<string, string> = {};
        filtered.forEach(ev => initial[ev.id] = ev.reportMemo || "");
        setMemo(initial);
      } catch (err: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventsRef.path, operation: 'list' }));
      } finally {
        setLoading(false);
      }
    };
    if (!isUserLoading && user) fetchEvents();
  }, [user, isUserLoading, db]);

  const handleUpdate = async (eventId: string, status: ReportStatus) => {
    if (!user) return;
    const eventDoc = doc(db, "users", user.uid, "events", eventId);
    const updateData = { reportStatus: status, reportMemo: memo[eventId] || "", isReported: true, updatedAt: Date.now() };

    updateDoc(eventDoc, updateData)
      .then(() => {
        setEvents(prev => prev.filter(ev => ev.id !== eventId));
        setMemo(prev => { const n = { ...prev }; delete n[eventId]; return n; });
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventDoc.path, operation: 'update' }));
      });
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16">
        <h1 className="text-3xl font-bold font-headline">報告</h1>
        <p className="text-muted-foreground text-sm">今日という一日の、小さな足跡をのこす。</p>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center">
        {events.length === 0 ? (
          <div className="text-center space-y-6 opacity-60">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto border border-primary/10">
              <Check className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-sm">すべての報告がおわりました。</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <Carousel className="w-full">
              <CarouselContent>
                {events.map((event) => (
                  <CarouselItem key={event.id}>
                    <Card className="border-none shadow-xl bg-white mx-1 rounded-[2rem] overflow-hidden">
                      <CardContent className="p-8 space-y-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                            <CalendarIcon className="h-3 w-3" />
                            {event.calendarName}
                          </div>
                          <h2 className="text-xl font-headline leading-tight text-foreground/80">{event.title}</h2>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(event.startAt), "M月d日(E) HH:mm", { locale: ja })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest ml-1">静かなふりかえり</label>
                          <Textarea 
                            placeholder="どんな時間でしたか？" 
                            value={memo[event.id] || ""} 
                            onChange={(e) => setMemo({ ...memo, [event.id]: e.target.value })}
                            className="text-sm min-h-[120px] bg-primary/5 border-none rounded-2xl focus-visible:ring-primary/10"
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <Button variant="outline" className="flex-col h-20 rounded-2xl border-none bg-primary/5 hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-95" onClick={() => handleUpdate(event.id, 'done')}>
                            <Check className="h-5 w-5 mb-1 opacity-60" />
                            <span className="text-[10px] font-bold">できた</span>
                          </Button>
                          <Button variant="outline" className="flex-col h-20 rounded-2xl border-none bg-primary/5 hover:bg-rose-50 hover:text-rose-700 transition-all active:scale-95" onClick={() => handleUpdate(event.id, 'failed')}>
                            <X className="h-5 w-5 mb-1 opacity-60" />
                            <span className="text-[10px] font-bold">失敗</span>
                          </Button>
                          <Button variant="outline" className="flex-col h-20 rounded-2xl border-none bg-primary/5 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95" onClick={() => handleUpdate(event.id, 'cancelled')}>
                            <Ban className="h-5 w-5 mb-1 opacity-60" />
                            <span className="text-[10px] font-bold">中止</span>
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