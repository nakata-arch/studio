"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, QuadrantCategory } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { QUADRANTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { QuotePopup } from "@/components/QuotePopup";

export default function ClassifyPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      const eventsRef = collection(db, "users", user.uid, "events");
      const q = query(eventsRef, orderBy("startAt", "asc"));

      try {
        const snap = await getDocs(q);
        const all = snap.docs.map(d => d.data() as AppEvent);
        // 優先度がついていないものをすべて表示
        const filtered = all.filter(ev => !ev.quadrantCategory);
        console.log(`Classify: Found ${filtered.length} unclassified events`);
        setEvents(filtered);
      } catch (err: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventsRef.path, operation: 'list' }));
      } finally {
        setLoading(false);
      }
    };
    if (!isUserLoading && user) fetchEvents();
  }, [user, isUserLoading, db]);

  const handleClassify = async (category: QuadrantCategory) => {
    if (!events[currentIndex] || !user) return;
    const event = events[currentIndex];
    const eventDoc = doc(db, "users", user.uid, "events", event.id);
    
    updateDoc(eventDoc, { quadrantCategory: category, updatedAt: Date.now() })
      .then(() => {
        const next = events.filter((_, i) => i !== currentIndex);
        setEvents(next);
        if (currentIndex >= next.length && next.length > 0) setCurrentIndex(next.length - 1);
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventDoc.path, operation: 'update' }));
      });
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  const current = events[currentIndex];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-40">
      <QuotePopup />
      
      <main className="flex-1 px-8 flex flex-col items-center pt-24">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6 opacity-60">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10">
              <CalendarIcon className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-sm">すべて整いました</p>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] text-center">
              {currentIndex + 1} / {events.length}
            </div>
            <Card className="w-full border-none shadow-xl bg-white relative overflow-hidden rounded-[2.5rem]">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10" />
               <CardContent className="p-8 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-primary opacity-40 uppercase tracking-widest block truncate">{current.calendarName}</span>
                  <h2 className="text-xl font-headline leading-snug text-foreground/80 break-words line-clamp-3">{current.title}</h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground opacity-60">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {format(new Date(current.startAt), "M月d日(E) HH:mm", { locale: ja })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {current && (
        <div className="fixed bottom-24 left-0 right-0 px-8 max-w-md mx-auto z-40">
           <div className="grid grid-cols-2 gap-3">
             {(Object.entries(QUADRANTS) as [QuadrantCategory, typeof QUADRANTS.urgent_important][]).map(([key, config]) => (
               <Button
                key={key}
                onClick={() => handleClassify(key)}
                className={`${config.color} ${config.hover} h-16 rounded-2xl flex flex-col gap-1 items-center justify-center border-none transition-all active:scale-95 shadow-sm`}
               >
                 <span className="text-lg">{config.icon}</span>
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
