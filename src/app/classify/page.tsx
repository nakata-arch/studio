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
        const filtered = snap.docs
          .map(d => d.data() as AppEvent)
          .filter(ev => !ev.quadrantCategory);
        setEvents(filtered);
        console.log("Classify events fetched:", filtered.length);
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
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16">
        <h1 className="text-3xl font-bold font-headline">分類</h1>
        <p className="text-muted-foreground text-sm">今のあなたにとって、どんな意味がありますか？</p>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center gap-12">
        {events.length === 0 ? (
          <div className="text-center space-y-6 opacity-60">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto border border-primary/10">
              <CalendarIcon className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-sm">すべての予定が整いました。</p>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest px-2">
              <span>{currentIndex + 1} / {events.length}件</span>
            </div>
            <Card className="w-full border-none shadow-xl bg-white relative overflow-hidden rounded-[2rem]">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20" />
               <CardContent className="p-8 space-y-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-primary opacity-50 uppercase tracking-wider block truncate">{current.calendarName}</span>
                  <h2 className="text-2xl font-headline leading-snug text-foreground/80 break-words">{current.title}</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(current.startAt), "M月d日(E) HH:mm", { locale: ja })}
                </div>
                {current.description && (
                  <p className="text-sm text-muted-foreground/70 leading-relaxed italic border-t border-primary/5 pt-4 break-words">
                    {current.description}
                  </p>
                )}
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
                className={`${config.color} ${config.hover} h-20 rounded-2xl flex flex-col gap-1 items-center justify-center border-none transition-all active:scale-95 px-2 text-center`}
               >
                 <span className="text-xl opacity-80">{config.icon}</span>
                 <span className="text-[9px] font-bold tracking-tighter leading-tight opacity-80 break-words px-1">{config.label}</span>
               </Button>
             ))}
           </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
