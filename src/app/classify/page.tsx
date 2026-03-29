
"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, QuadrantCategory } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUADRANTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, Info } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ClassifyPage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchFutureEvents = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const now = new Date().toISOString();
      const eventsRef = collection(db, "events");
      const q = query(
        eventsRef, 
        where("userId", "==", user.uid), 
        where("startAt", ">=", now),
        where("quadrantCategory", "==", null),
        orderBy("startAt", "asc")
      );

      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent));
      setEvents(fetched);
      setLoading(false);
    };

    fetchFutureEvents();
  }, []);

  const handleClassify = async (category: QuadrantCategory) => {
    if (!events[currentIndex]) return;
    const event = events[currentIndex];
    
    try {
      const eventDoc = doc(db, "events", event.id);
      await updateDoc(eventDoc, {
        quadrantCategory: category,
        updatedAt: Date.now(),
        syncStatus: 'pending' // MVP sync simulation
      });

      // Move to next or remove from local list
      if (currentIndex < events.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setEvents(events.filter((_, i) => i !== currentIndex));
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Classification update failed:", err);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const currentEvent = events[currentIndex];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-6 pt-12">
        <h1 className="text-3xl font-bold">未来の予定を分類</h1>
        <p className="text-muted-foreground text-sm">30日以内の未分類予定を4象限に分けましょう</p>
      </header>

      <main className="flex-1 px-6 flex flex-col items-center justify-center gap-8">
        {!currentEvent ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Clock className="text-primary h-10 w-10" />
            </div>
            <h2 className="text-xl font-semibold">すべての分類が完了！</h2>
            <p className="text-muted-foreground">お疲れ様です。素晴らしいスタートですね。</p>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-between items-center text-xs text-muted-foreground mb-[-20px]">
              <span>{currentIndex + 1} / {events.length}件</span>
            </div>
            <Card className="w-full shadow-lg border-none bg-card/80 backdrop-blur-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
               <CardHeader>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                  <CalendarIcon className="h-3 w-3" />
                  {currentEvent.calendarName}
                </div>
                <CardTitle className="text-2xl font-headline leading-tight">{currentEvent.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(currentEvent.startAt), "M月d日(E) HH:mm", { locale: ja })}
                </div>
                {currentEvent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/50 p-3 rounded-lg border border-border/50">
                    {currentEvent.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Control Panel */}
      {currentEvent && (
        <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto z-40">
           <div className="grid grid-cols-2 gap-3">
             {(Object.entries(QUADRANTS) as [QuadrantCategory, typeof QUADRANTS.urgent_important][]).map(([key, config]) => (
               <Button
                key={key}
                onClick={() => handleClassify(key)}
                className={`${config.color} ${config.hover} h-20 text-white flex flex-col gap-1 items-center justify-center shadow-lg active:scale-95 transition-transform`}
               >
                 <span className="text-xl">{config.icon}</span>
                 <span className="text-[10px] font-bold tracking-tighter leading-none">{config.label}</span>
               </Button>
             ))}
           </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
