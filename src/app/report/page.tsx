
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Ban, Loader2, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, endOfDay, isBefore } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchReportEvents = async () => {
      if (!user) return;

      const now = new Date();
      const todayEnd = endOfDay(now);
      
      const eventsRef = collection(db, "users", user.uid, "events");
      
      // Get all events sorted by start time
      const q = query(eventsRef, orderBy("startAt", "desc"));

      try {
        const snap = await getDocs(q);
        const allEvents = snap.docs.map(doc => ({ ...doc.data() } as AppEvent));
        
        // Filter for past unreported events
        const filtered = allEvents.filter(ev => {
          const eventDate = new Date(ev.startAt);
          const isPast = isBefore(eventDate, todayEnd);
          const isUnreported = !ev.reportStatus;
          
          return isPast && isUnreported;
        });
        
        console.log("Firestore 取得総数:", allEvents.length);
        console.log("報告対象 (過去/未報告):", filtered.length);
        
        setEvents(filtered);
        
        // Initialize memos
        const initialMemos: Record<string, string> = {};
        filtered.forEach(ev => {
          initialMemos[ev.id] = ev.reportMemo || "";
        });
        setMemo(initialMemos);
      } catch (err: any) {
        if (err.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: eventsRef.path,
            operation: 'list',
          }));
        } else {
          console.error("Fetch past events failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!isUserLoading && user) {
      fetchReportEvents();
    }
  }, [user, isUserLoading, db]);

  const handleStatusUpdate = async (eventId: string, status: ReportStatus) => {
    if (!user) return;
    const eventDoc = doc(db, "users", user.uid, "events", eventId);
    const eventMemo = memo[eventId] || "";
    
    const updateData = {
      reportStatus: status,
      reportMemo: eventMemo,
      isReported: true,
      updatedAt: Date.now()
    };

    updateDoc(eventDoc, updateData)
      .then(() => {
        setEvents(prev => prev.filter(ev => ev.id !== eventId));
        // Remove memo for this event
        setMemo(prev => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
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

  const handleMemoChange = (eventId: string, value: string) => {
    setMemo(prev => ({ ...prev, [eventId]: value }));
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-6 pt-12">
        <h1 className="text-3xl font-bold font-headline">報告</h1>
        <p className="text-muted-foreground text-sm">今日までの完了した予定を記録しましょう</p>
      </header>

      <main className="flex-1 px-6 flex flex-col items-center justify-center">
        {events.length === 0 ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Check className="text-primary h-10 w-10" />
            </div>
            <h2 className="text-xl font-semibold">すべての報告が完了！</h2>
            <p className="text-muted-foreground text-sm px-10">
              現在、報告が必要な過去の予定はありません。
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm relative">
            <Carousel className="w-full">
              <CarouselContent>
                {events.map((event) => (
                  <CarouselItem key={event.id}>
                    <Card className="border-none shadow-xl bg-card relative overflow-hidden mx-1">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20" />
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase mb-1">
                          <CalendarIcon className="h-3 w-3" />
                          {event.calendarName}
                        </div>
                        <CardTitle className="text-xl font-headline leading-tight">{event.title}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(event.startAt), "M月d日(E) HH:mm", { locale: ja })}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">振り返りメモ</label>
                          <Textarea 
                            placeholder="何を感じましたか？" 
                            value={memo[event.id] || ""} 
                            onChange={(e) => handleMemoChange(event.id, e.target.value)}
                            className="text-sm min-h-[100px] bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            className="flex-col h-16 text-[10px] gap-1 border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all active:scale-95" 
                            onClick={() => handleStatusUpdate(event.id, 'done')}
                          >
                            <Check className="h-5 w-5 text-green-600" />
                            できた
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-col h-16 text-[10px] gap-1 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all active:scale-95" 
                            onClick={() => handleStatusUpdate(event.id, 'failed')}
                          >
                            <X className="h-5 w-5 text-red-600" />
                            失敗
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-col h-16 text-[10px] gap-1 border-slate-100 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 transition-all active:scale-95" 
                            onClick={() => handleStatusUpdate(event.id, 'cancelled')}
                          >
                            <Ban className="h-5 w-5 text-slate-600" />
                            中止
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {events.length > 1 && (
                <div className="flex justify-center gap-4 mt-6">
                  <CarouselPrevious className="relative left-0 translate-y-0 h-10 w-10 shadow-md border-none bg-white/80" />
                  <span className="flex items-center text-[10px] font-bold text-muted-foreground">
                    左右にスワイプ
                  </span>
                  <CarouselNext className="relative right-0 translate-y-0 h-10 w-10 shadow-md border-none bg-white/80" />
                </div>
              )}
            </Carousel>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
