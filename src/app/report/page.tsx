
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy, limit } from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Ban, Loader2, Clock, Calendar as CalendarIcon, History, ArrowRight } from "lucide-react";
import { format, isBefore, endOfToday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { QuotePopup } from "@/components/QuotePopup";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState<Record<string, string>>({});
  const [exitDirection, setExitDirection] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  const fetchEvents = async () => {
    if (!user) return;
    const eventsRef = collection(db, "users", user.uid, "events");
    
    try {
      const today = endOfToday();
      const qAll = query(eventsRef, orderBy("startAt", "desc"));
      const snapAll = await getDocs(qAll);
      const all = snapAll.docs.map(d => d.data() as AppEvent);
      
      const filtered = all.filter(ev => !ev.reportStatus && isBefore(parseISO(ev.startAt), today));
      setEvents(filtered);
      
      const initial: Record<string, string> = {};
      filtered.forEach(ev => initial[ev.id] = ev.reportMemo || "");
      setMemo(initial);

      const qRecent = query(eventsRef, orderBy("updatedAt", "desc"), limit(30));
      const snapRecent = await getDocs(qRecent);
      setRecentEvents(
        snapRecent.docs
          .map(d => d.data() as AppEvent)
          .filter(ev => !!ev.reportStatus)
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

  const currentEvent = events[0];
  const nextEvent = events[1];

  // デバッグログ
  useEffect(() => {
    if (events.length > 0) {
      console.log('ReportPage: events.length', events.length);
      console.log('ReportPage: currentCard', events[0]?.id);
      console.log('ReportPage: nextCard', events[1]?.id);
    }
  }, [events]);

  const handleUpdate = (eventId: string, status: ReportStatus, xDir: number, yDir: number) => {
    if (!user || !currentEvent) return;
    
    const event = currentEvent;
    setExitDirection({ x: xDir, y: yDir });

    // UIを即座に進める（配列の先頭を削除）
    setEvents(prev => prev.slice(1));
    setRecentEvents(prev => [{ ...event, reportStatus: status }, ...prev].slice(0, 30));
    
    // 非同期でDB更新
    const eventDoc = doc(db, "users", user.uid, "events", eventId);
    const updateData = { 
      reportStatus: status, 
      reportMemo: memo[eventId] || "", 
      isReported: true, 
      updatedAt: Date.now() 
    };

    updateDoc(eventDoc, updateData)
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: eventDoc.path, 
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  };

  // ドラッグ制御用 Motion Values
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
    if (ly < -80) return "中止";
    if (lx < -80) return "できた"; 
    if (lx > 80) return "未達";   
    return "";
  });

  const activeColor = useTransform([x, y], ([latestX, latestY]) => {
    const lx = Number(latestX);
    const ly = Number(latestY);
    if (ly < -80) return "rgba(100, 116, 139, 0.8)"; 
    if (lx < -80) return "rgba(16, 185, 129, 0.8)"; 
    if (lx > 80) return "rgba(244, 63, 94, 0.8)"; 
    return "transparent";
  });

  const handleDragEnd = (_: any, info: any) => {
    if (!currentEvent) return;
    const threshold = 80;
    const { x: ox, y: oy } = info.offset;
    
    if (Math.abs(ox) < threshold && Math.abs(oy) < threshold) {
      x.set(0);
      y.set(0);
      return;
    }

    if (oy < -threshold) {
      handleUpdate(currentEvent.id, 'cancelled', 0, -1000);
    } else if (ox < -threshold) {
      handleUpdate(currentEvent.id, 'done', -1000, 0);
    } else if (ox > threshold) {
      handleUpdate(currentEvent.id, 'failed', 1000, 0);
    }

    x.set(0);
    y.set(0);
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32 overflow-hidden">
      <QuotePopup />
      
      <main className="flex-1 px-8 flex flex-col items-center pt-16 relative">
        {!currentEvent ? (
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
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-primary/30">
                    <History className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">最近の報告一覧</span>
                  </div>
                  <Link href="/events" className="text-[9px] font-bold text-primary/40 hover:text-primary transition-colors flex items-center gap-1">
                    すべて見る <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentEvents.slice(0, 5).map(ev => (
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
          <div className="w-full max-w-sm h-full flex flex-col items-center relative">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] mb-12">
              スワイプで報告: {events.length}
            </div>

            <div className="relative w-full aspect-[3/4] flex items-center justify-center">
              {/* ガイドラベル */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-10 pointer-events-none">
                <Ban className="h-5 w-5 text-slate-400" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">中止</span>
              </div>
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-10 pointer-events-none">
                <Check className="h-5 w-5 text-emerald-400" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">できた</span>
              </div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-10 pointer-events-none">
                <X className="h-5 w-5 text-rose-400" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-rose-500">未達</span>
              </div>

              {/* 2枚目: プレビュー（操作不可） */}
              {nextEvent && (
                <div 
                  key={`next-${nextEvent.id}`}
                  className="absolute w-full h-full opacity-50 scale-95 translate-y-4 pointer-events-none z-0"
                >
                  <Card className="w-full h-full border-none shadow-lg bg-white/80 rounded-[2.5rem] flex flex-col overflow-hidden">
                    <CardContent className="p-8 flex-1 flex flex-col space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{nextEvent.calendarName}</span>
                        </div>
                        <h2 className="text-xl font-headline leading-snug text-foreground/80 line-clamp-2">{nextEvent.title}</h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                        <Clock className="h-4 w-4 shrink-0" />
                        {format(parseISO(nextEvent.startAt), "M/d HH:mm")}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 1枚目: 操作可能カード */}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentEvent.id}
                  style={{ x, y, rotate, zIndex: 10, position: 'absolute', width: '100%', height: '100%' }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  onDragEnd={handleDragEnd}
                  exit={{ 
                    x: exitDirection.x, 
                    y: exitDirection.y,
                    opacity: 0,
                    scale: 0.5,
                    pointerEvents: 'none', // 退場中に背面カードの操作を遮らない
                    transition: { duration: 0.4 }
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileDrag={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="cursor-grab active:cursor-grabbing touch-none"
                >
                  <Card className="w-full h-full border-none shadow-2xl bg-white relative overflow-hidden rounded-[2.5rem] flex flex-col">
                    <CardContent className="p-8 flex-1 flex flex-col space-y-6">
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
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{currentEvent.calendarName}</span>
                        </div>
                        <h2 className="text-xl font-headline leading-snug text-foreground/80 break-words line-clamp-2">
                          {currentEvent.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                          <Clock className="h-4 w-4 shrink-0" />
                          {format(parseISO(currentEvent.startAt), "M月d日(E) HH:mm", { locale: ja })}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col space-y-3">
                        <Textarea 
                          placeholder="どんな時間でしたか？" 
                          value={memo[currentEvent.id] || ""} 
                          onChange={(e) => setMemo({ ...memo, [currentEvent.id]: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()} 
                          className="flex-1 text-sm bg-primary/[0.02] border-none rounded-2xl resize-none text-sm leading-relaxed italic placeholder:text-muted-foreground/30 focus-visible:ring-primary/5"
                        />
                      </div>
                      
                      <div className="pt-4 flex justify-center">
                        <div className="text-[9px] font-bold text-primary/20 uppercase tracking-[0.4em]">
                          左へ弾いて「できた」
                        </div>
                      </div>
                    </CardContent>
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
