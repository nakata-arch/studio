
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy, limit } from "firebase/firestore";
import { AppEvent, QuadrantCategory } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { QUADRANTS } from "@/lib/mock-data";
import { Loader2, Clock, History, LayoutGrid, ArrowRight, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { QuotePopup } from "@/components/QuotePopup";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

export default function ClassifyPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [recentClassified, setRecentClassified] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);

  const fetchEvents = async () => {
    if (!user) return;
    const eventsRef = collection(db, "users", user.uid, "events");

    try {
      const qAll = query(eventsRef, orderBy("startAt", "asc"));
      const snapAll = await getDocs(qAll);
      const all = snapAll.docs.map(d => d.data() as AppEvent);
      
      setEvents(all.filter(ev => !ev.quadrantCategory));

      const qRecent = query(eventsRef, orderBy("updatedAt", "desc"), limit(30));
      const snapRecent = await getDocs(qRecent);
      setRecentClassified(
        snapRecent.docs
          .map(d => d.data() as AppEvent)
          .filter(ev => !!ev.quadrantCategory)
          .slice(0, 30)
      );

    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventsRef.path, operation: 'list' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) fetchEvents();
  }, [user, isUserLoading, db]);

  const handleClassify = (category: QuadrantCategory, direction: 'left' | 'right' | 'up' | 'down') => {
    if (events.length === 0 || !user) return;
    
    const event = events[0];
    setExitDirection(direction);

    // 1. 楽観的にUIを更新（次のカードを即座に表示）
    setEvents(prev => prev.slice(1));
    setRecentClassified(prev => [{ ...event, quadrantCategory: category }, ...prev].slice(0, 30));

    // 2. 非同期でFirestoreを更新
    const eventDoc = doc(db, "users", user.uid, "events", event.id);
    updateDoc(eventDoc, { quadrantCategory: category, updatedAt: Date.now() })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventDoc.path, operation: 'update' }));
        // 必要に応じてロールバック処理を追加
      });
  };

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(
    [x, y],
    ([latestX, latestY]) => {
      const dist = Math.sqrt(Number(latestX) ** 2 + Number(latestY) ** 2);
      return Math.max(1 - dist / 500, 0.5);
    }
  );

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.x < -threshold) {
      handleClassify('urgent_important', 'left');
    } else if (info.offset.x > threshold) {
      handleClassify('not_urgent_important', 'right');
    } else if (info.offset.y < -threshold) {
      handleClassify('urgent_not_important', 'up');
    } else if (info.offset.y > threshold) {
      handleClassify('not_urgent_not_important', 'down');
    }
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" /></div>;

  const current = events[0];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32 overflow-hidden">
      <QuotePopup />
      
      <main className="flex-1 px-8 flex flex-col items-center pt-24 relative">
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
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-primary/30">
                    <History className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">分類済み予定一覧</span>
                  </div>
                  <Link href="/events" className="text-[9px] font-bold text-primary/40 hover:text-primary transition-colors flex items-center gap-1">
                    すべて見る <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
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
          <div className="w-full max-w-sm h-full flex flex-col items-center">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] mb-12">
              スワイプで分類: {events.length}
            </div>

            <div className="relative w-full aspect-[3/4] flex items-center justify-center">
              {/* Swipe Hints */}
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-30 animate-pulse text-center">
                <span className="text-xl">🚨</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-rose-500">緊急・重要</span>
              </div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-30 animate-pulse text-center">
                <span className="text-xl">✨</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-500">重要・非緊急</span>
              </div>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30 animate-pulse text-center">
                <span className="text-xl">⏳</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-amber-500">緊急・非重要</span>
              </div>
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30 animate-pulse text-center">
                <span className="text-xl">☁️</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">非重要・非緊急</span>
              </div>

              <AnimatePresence mode="popLayout">
                <motion.div
                  key={current.id}
                  style={{ x, y, rotate, opacity }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  onDragEnd={handleDragEnd}
                  exit={{ 
                    x: exitDirection === 'left' ? -1000 : exitDirection === 'right' ? 1000 : 0, 
                    y: exitDirection === 'up' ? -1000 : exitDirection === 'down' ? 1000 : 0,
                    opacity: 0,
                    scale: 0.5,
                    transition: { duration: 0.4 }
                  }}
                  whileDrag={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute w-full h-full cursor-grab active:cursor-grabbing"
                >
                  <Card className="w-full h-full border-none shadow-2xl bg-white relative overflow-hidden rounded-[2.5rem] flex flex-col">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10" />
                    <CardContent className="p-10 flex-1 flex flex-col justify-center space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary/20" />
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest block truncate">
                            {current.calendarName}
                          </span>
                        </div>
                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 break-words line-clamp-4">
                          {current.title}
                        </h2>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="h-px w-12 bg-primary/10" />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                          <Clock className="h-4 w-4 shrink-0" />
                          {format(parseISO(current.startAt), "M月d日(E) HH:mm", { locale: ja })}
                        </div>
                      </div>

                      {current.description && (
                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed italic line-clamp-3">
                          {current.description}
                        </p>
                      )}
                    </CardContent>
                    
                    <div className="p-8 bg-primary/[0.01] flex justify-center border-t border-primary/[0.03]">
                      <div className="text-[9px] font-bold text-primary/20 uppercase tracking-[0.4em]">
                        スワイプで分類
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
