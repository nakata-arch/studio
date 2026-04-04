
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, QuadrantCategory } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { QUADRANTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Clock, History, LayoutGrid } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { QuotePopup } from "@/components/QuotePopup";

export default function ClassifyPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [recentClassified, setRecentClassified] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchEvents = async () => {
    if (!user) return;
    const eventsRef = collection(db, "users", user.uid, "events");
    const q = query(eventsRef, orderBy("startAt", "asc"));

    try {
      const snap = await getDocs(q);
      const all = snap.docs.map(d => d.data() as AppEvent);
      
      // 未分類の抽出
      const unclassified = all.filter(ev => !ev.quadrantCategory);
      setEvents(unclassified);

      // 分類済みをすべて取得（完了後の表示用）
      const classified = all
        .filter(ev => !!ev.quadrantCategory)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setRecentClassified(classified);

    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventsRef.path, operation: 'list' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) fetchEvents();
  }, [user, isUserLoading, db]);

  const handleClassify = async (category: QuadrantCategory) => {
    if (!events[currentIndex] || !user) return;
    const event = events[currentIndex];
    const eventDoc = doc(db, "users", user.uid, "events", event.id);
    
    updateDoc(eventDoc, { quadrantCategory: category, updatedAt: Date.now() })
      .then(() => {
        fetchEvents();
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventDoc.path, operation: 'update' }));
      });
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" /></div>;

  const current = events[currentIndex];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-48">
      <QuotePopup />
      
      <main className="flex-1 px-8 flex flex-col items-center pt-24">
        {events.length === 0 ? (
          <div className="w-full max-w-sm space-y-10 animate-in fade-in duration-700">
            <div className="text-center space-y-4 opacity-60 pt-10">
              <div className="w-16 h-16 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10">
                <LayoutGrid className="text-primary/40 h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground/70 tracking-tight">すべての分類が整いました</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">All categories organized</p>
              </div>
            </div>

            {recentClassified.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-primary/30">
                  <History className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">分類済み予定一覧</span>
                </div>
                <div className="space-y-3">
                  {recentClassified.map(ev => (
                    <Card key={ev.id} className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-[13px] font-bold text-foreground/70 truncate">{ev.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground opacity-50 font-medium">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(ev.startAt), "M/d HH:mm")}
                          </div>
                        </div>
                        {ev.quadrantCategory && (
                          <div className="w-8 h-8 bg-primary/[0.03] rounded-lg flex items-center justify-center shrink-0" title={QUADRANTS[ev.quadrantCategory]?.label}>
                            <span className="text-sm">{QUADRANTS[ev.quadrantCategory]?.icon}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] text-center">
              Pending Classification: {events.length}
            </div>
            <Card className="w-full border-none shadow-xl bg-white relative overflow-hidden rounded-[2.5rem]">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10" />
               <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest block truncate">{current.calendarName}</span>
                  <h2 className="text-xl font-headline leading-snug text-foreground/80 break-words line-clamp-3">{current.title}</h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground opacity-60 font-medium">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {format(parseISO(current.startAt), "M月d日(E) HH:mm", { locale: ja })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {current && (
        <div className="fixed bottom-28 left-0 right-0 px-8 max-w-md mx-auto z-40">
           <div className="grid grid-cols-2 gap-3">
             {(Object.entries(QUADRANTS) as [QuadrantCategory, typeof QUADRANTS.urgent_important][]).map(([key, config]) => (
               <Button
                key={key}
                onClick={() => handleClassify(key)}
                className={`${config.color} ${config.hover} h-16 rounded-2xl flex flex-col gap-1 items-center justify-center border-none transition-all active:scale-95 shadow-sm group`}
               >
                 <span className="text-lg group-active:scale-125 transition-transform">{config.icon}</span>
                 <span className="text-[9px] font-bold tracking-tight opacity-90">{config.label}</span>
               </Button>
             ))}
           </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
