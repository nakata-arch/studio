
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
  const [exitDirection, setExitDirection] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

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

  const handleClassify = (category: QuadrantCategory, xDir: number, yDir: number) => {
    if (events.length === 0 || !user) return;
    
    const event = events[0];
    setExitDirection({ x: xDir, y: yDir });

    // 楽観的UI更新: 配列から削除して次のカードを前面に出す
    setEvents(prev => prev.slice(1));
    setRecentClassified(prev => [{ ...event, quadrantCategory: category }, ...prev].slice(0, 30));

    // 非同期更新
    const eventDoc = doc(db, "users", user.uid, "events", event.id);
    updateDoc(eventDoc, { quadrantCategory: category, updatedAt: Date.now() })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventDoc.path, operation: 'update' }));
      });
  };

  // Tinderアニメーション用のHooks
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  
  const overlayOpacity = useTransform([x, y], ([latestX, latestY]) => {
    const dist = Math.sqrt(Number(latestX) ** 2 + Number(latestY) ** 2);
    return Math.min(dist / 150, 0.8);
  });

  const activeLabel = useTransform([x, y], ([latestX, latestY]) => {
    const lx = Number(latestX);
    const ly = Number(latestY);
    if (Math.abs(lx) < 40 && Math.abs(ly) < 40) return "";
    
    if (lx < 0 && ly < 0) return "重要 × 緊急";
    if (lx > 0 && ly < 0) return "重要";
    if (lx < 0 && ly > 0) return "緊急";
    if (lx > 0 && ly > 0) return "低優先";
    return "";
  });

  const activeColor = useTransform([x, y], ([latestX, latestY]) => {
    const lx = Number(latestX);
    const ly = Number(latestY);
    if (lx < 0 && ly < 0) return "rgba(244, 63, 94, 0.8)"; // Rose
    if (lx > 0 && ly < 0) return "rgba(99, 102, 241, 0.8)"; // Indigo
    if (lx < 0 && ly > 0) return "rgba(245, 158, 11, 0.8)"; // Amber
    if (lx > 0 && ly > 0) return "rgba(100, 116, 139, 0.8)"; // Slate
    return "transparent";
  });

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    const { x: ox, y: oy } = info.offset;
    
    if (Math.abs(ox) < threshold && Math.abs(oy) < threshold) {
      x.set(0);
      y.set(0);
      return;
    }

    if (ox < 0 && oy < 0) handleClassify('urgent_important', -1000, -1000);
    else if (ox > 0 && oy < 0) handleClassify('not_urgent_important', 1000, -1000);
    else if (ox < 0 && oy > 0) handleClassify('urgent_not_important', -1000, 1000);
    else if (ox > 0 && oy > 0) handleClassify('not_urgent_not_important', 1000, 1000);
    
    // スワイプ後はリセット
    x.set(0);
    y.set(0);
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" /></div>;

  const currentEvent = events[0];
  const nextEvent = events[1];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32 overflow-hidden">
      <QuotePopup />
      
      <main className="flex-1 px-8 flex flex-col items-center pt-20 relative">
        {!currentEvent ? (
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
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">最近の分類一覧</span>
                  </div>
                  <Link href="/events" className="text-[9px] font-bold text-primary/40 hover:text-primary transition-colors flex items-center gap-1">
                    すべて見る <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentClassified.slice(0, 5).map(ev => (
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
              斜めスワイプで分類: {events.length}
            </div>

            <div className="relative w-full aspect-[3/4] flex items-center justify-center">
              {/* Swipe Hints */}
              <div className="absolute -left-4 -top-8 flex flex-col items-start opacity-20 z-0">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">↖ 重要・緊急</span>
              </div>
              <div className="absolute -right-4 -top-8 flex flex-col items-end opacity-20 z-0">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">重要 ↗</span>
              </div>
              <div className="absolute -left-4 -bottom-8 flex flex-col items-start opacity-20 z-0">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">↙ 緊急</span>
              </div>
              <div className="absolute -right-4 -bottom-8 flex flex-col items-end opacity-20 z-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">低優先 ↘</span>
              </div>

              {/* Back Card (Next) */}
              {nextEvent && (
                <div 
                  key={`next-${nextEvent.id}`}
                  className="absolute w-full h-full opacity-50 scale-95 translate-y-4 pointer-events-none z-0"
                >
                  <Card className="w-full h-full border-none shadow-lg bg-white/80 rounded-[2.5rem] flex flex-col overflow-hidden">
                    <CardContent className="p-10 flex-1 flex flex-col justify-center space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest block truncate">{nextEvent.calendarName}</span>
                        </div>
                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 line-clamp-4">{nextEvent.title}</h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                        <Clock className="h-4 w-4 shrink-0" />
                        {format(parseISO(nextEvent.startAt), "M/d HH:mm")}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Front Card (Current) */}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentEvent.id}
                  style={{ x, y, rotate, zIndex: 10 }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  onDragEnd={handleDragEnd}
                  exit={{ 
                    x: exitDirection.x, 
                    y: exitDirection.y,
                    opacity: 0,
                    scale: 0.5,
                    transition: { duration: 0.4 }
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileDrag={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute w-full h-full cursor-grab active:cursor-grabbing"
                >
                  <Card className="w-full h-full border-none shadow-2xl bg-white relative overflow-hidden rounded-[2.5rem] flex flex-col">
                    <CardContent className="p-10 flex-1 flex flex-col justify-center space-y-8">
                      <motion.div 
                        style={{ backgroundColor: activeColor, opacity: overlayOpacity }}
                        className="absolute inset-0 z-10 flex items-center justify-center p-10 pointer-events-none"
                      >
                        <motion.span 
                          style={{ opacity: overlayOpacity }}
                          className="text-2xl font-bold text-white text-center drop-shadow-md"
                        >
                          {activeLabel}
                        </motion.span>
                      </motion.div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary/20" />
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest block truncate">
                            {currentEvent.calendarName}
                          </span>
                        </div>
                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 break-words line-clamp-4">
                          {currentEvent.title}
                        </h2>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="h-px w-12 bg-primary/10" />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                          <Clock className="h-4 w-4 shrink-0" />
                          {format(parseISO(currentEvent.startAt), "M月d日(E) HH:mm", { locale: ja })}
                        </div>
                      </div>

                      {currentEvent.description && (
                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed italic line-clamp-3">
                          {currentEvent.description}
                        </p>
                      )}
                    </CardContent>
                    
                    <div className="p-8 bg-primary/[0.01] flex justify-center border-t border-primary/[0.03]">
                      <div className="text-[9px] font-bold text-primary/20 uppercase tracking-[0.4em]">
                        斜めへ弾いて分類
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
