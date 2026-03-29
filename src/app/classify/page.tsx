
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, QuadrantCategory } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUADRANTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, addDays, startOfDay, isAfter, isBefore } from "date-fns";
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
    const fetchClassifyEvents = async () => {
      if (!user) return;

      const now = new Date();
      const todayStart = startOfDay(now);
      const endLimit = addDays(todayStart, 30);
      
      const eventsRef = collection(db, "users", user.uid, "events");
      
      // インデックスエラーを避けるため、orderByのみのシンプルなクエリを使用
      const q = query(eventsRef, orderBy("startAt", "asc"));

      try {
        const snap = await getDocs(q);
        const allEvents = snap.docs.map(doc => ({ ...doc.data() } as AppEvent));
        
        // クライアント側で条件フィルタリング
        const filtered = allEvents.filter(ev => {
          const eventDate = new Date(ev.startAt);
          const isUnclassified = !ev.quadrantCategory;
          const isFuture = isAfter(eventDate, todayStart) || eventDate.getTime() === todayStart.getTime();
          const isWithin30Days = isBefore(eventDate, endLimit);
          
          return isUnclassified && isFuture && isWithin30Days;
        });

        console.log("Firestore 取得総数:", allEvents.length);
        console.log("分類対象 (未分類/30日以内):", filtered.length);
        
        setEvents(filtered);
      } catch (err: any) {
        if (err.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: eventsRef.path,
            operation: 'list',
          }));
        } else {
          console.error("Fetch events failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!isUserLoading && user) {
      fetchClassifyEvents();
    }
  }, [user, isUserLoading, db]);

  const handleClassify = async (category: QuadrantCategory) => {
    if (!events[currentIndex] || !user) return;
    const event = events[currentIndex];
    
    const eventDoc = doc(db, "users", user.uid, "events", event.id);
    const updateData = {
      quadrantCategory: category,
      updatedAt: Date.now(),
    };

    updateDoc(eventDoc, updateData)
      .then(() => {
        const nextEvents = events.filter((_, i) => i !== currentIndex);
        setEvents(nextEvents);
        if (currentIndex >= nextEvents.length && nextEvents.length > 0) {
          setCurrentIndex(nextEvents.length - 1);
        }
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: eventDoc.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const currentEvent = events[currentIndex];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-6 pt-12">
        <h1 className="text-3xl font-bold">未来の予定を分類</h1>
        <p className="text-muted-foreground text-sm">30日以内の未分類予定を4象限に分けましょう</p>
      </header>

      <main className="flex-1 px-6 flex flex-col items-center justify-center gap-8">
        {events.length === 0 ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="text-primary h-10 w-10" />
            </div>
            <h2 className="text-xl font-semibold">すべての分類が完了！</h2>
            <p className="text-muted-foreground text-sm px-10">
              現在、分類が必要な新しい予定はありません。
            </p>
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
