"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser, DUMMY_USER_ID } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy, limit } from "firebase/firestore";
import { AppEvent, QuadrantCategory } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { QUADRANTS } from "@/lib/mock-data";
import { Loader2, Clock, History, LayoutGrid, ArrowRight, Sparkles, LogIn } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { QuotePopup } from "@/components/QuotePopup";
import { PREVIEW_EVENTS } from "@/lib/preview-data";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";

type ExitDirection = { x: number; y: number };

function SwipeCard({
  event,
  onClassify,
  exitDirection,
}: {
  event: AppEvent;
  exitDirection: ExitDirection;
  onClassify: (category: QuadrantCategory, xDir: number, yDir: number) => void;
}) {
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
    if (lx < 0 && ly < 0) return "rgba(244, 63, 94, 0.8)";
    if (lx > 0 && ly < 0) return "rgba(99, 102, 241, 0.8)";
    if (lx < 0 && ly > 0) return "rgba(245, 158, 11, 0.8)";
    if (lx > 0 && ly > 0) return "rgba(100, 116, 139, 0.8)";
    return "transparent";
  });

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 80;
    const { x: ox, y: oy } = info.offset;

    if (Math.abs(ox) < threshold && Math.abs(oy) < threshold) {
      x.set(0);
      y.set(0);
      return;
    }

    if (ox < 0 && oy < 0) onClassify("urgent_important", -1000, -1000);
    else if (ox > 0 && oy < 0) onClassify("not_urgent_important", 1000, -1000);
    else if (ox < 0 && oy > 0) onClassify("urgent_not_important", -1000, 1000);
    else if (ox > 0 && oy > 0) onClassify("not_urgent_not_important", 1000, 1000);
    else {
      x.set(0);
      y.set(0);
    }
  };

  return (
    <motion.div
      key={event.id}
      style={{ x, y, rotate, zIndex: 10, position: "absolute", width: "100%", height: "100%" }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      exit={{
        x: exitDirection.x,
        y: exitDirection.y,
        opacity: 0,
        scale: 0.5,
        pointerEvents: "none",
        transition: { duration: 0.4 },
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileDrag={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="cursor-grab active:cursor-grabbing touch-none"
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
                {event.calendarName}
              </span>
            </div>
            <h2 className="text-2xl font-headline leading-tight text-foreground/80 break-words line-clamp-4">
              {event.title}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="h-px w-12 bg-primary/10" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
              <Clock className="h-4 w-4 shrink-0" />
              {format(parseISO(event.startAt), "M月d日(E) HH:mm", { locale: ja })}
            </div>
          </div>

          {event.description && (
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed italic line-clamp-3">
              {event.description}
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
  );
}

export default function ClassifyPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [recentClassified, setRecentClassified] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exitDirection, setExitDirection] = useState<ExitDirection>({ x: 0, y: 0 });

  const fetchEvents = async () => {
    console.log("classify:fetch-start");
    if (!user) {
      console.log("classify:fetch-abort (no user)");
      setLoading(false);
      return;
    }

    if (user.uid === DUMMY_USER_ID) {
      console.log("classify:fetch-mock");
      setEvents(PREVIEW_EVENTS.filter((e) => !e.quadrantCategory));
      setRecentClassified(PREVIEW_EVENTS.filter((e) => !!e.quadrantCategory));
      setLoading(false);
      return;
    }

    try {
      const eventsRef = collection(db, "users", user.uid, "events");
      const qAll = query(eventsRef, orderBy("startAt", "asc"));
      const snapAll = await getDocs(qAll);
      const all = snapAll.docs.map((d) => d.data() as AppEvent);

      const unclassified = all.filter((ev) => !ev.quadrantCategory);
      setEvents(unclassified);

      const qRecent = query(eventsRef, orderBy("updatedAt", "desc"), limit(30));
      const snapRecent = await getDocs(qRecent);
      setRecentClassified(
        snapRecent.docs
          .map((d) => d.data() as AppEvent)
          .filter((ev) => !!ev.quadrantCategory)
      );
      console.log(`classify:fetch-done (unclassified: ${unclassified.length})`);
    } catch (err: any) {
      console.error("classify:error", err);
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({ path: "events", operation: "list" })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("classify:init", { isUserLoading, hasUser: !!user });
    if (!isUserLoading) {
      fetchEvents();
    }
  }, [user, isUserLoading]);

  const currentEvent = events[0];
  const nextEvent = events[1];

  const handleClassify = (category: QuadrantCategory, xDir: number, yDir: number) => {
    if (!currentEvent || !user) return;

    const event = currentEvent;
    setExitDirection({ x: xDir, y: yDir });

    setEvents((prev) => prev.slice(1));
    setRecentClassified((prev) => [{ ...event, quadrantCategory: category }, ...prev].slice(0, 30));

    if (user.uid === DUMMY_USER_ID) return;

    const eventDoc = doc(db, "users", user.uid, "events", event.id);
    updateDoc(eventDoc, { quadrantCategory: category, updatedAt: Date.now() }).catch(() => {
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({ path: eventDoc.path, operation: "update" })
      );
    });
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          ユーザー情報を確認しています...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <div className="space-y-2 opacity-40">
          <LayoutGrid className="h-12 w-12 mx-auto" />
          <p className="text-sm font-bold">ログインが必要です</p>
          <p className="text-[10px] uppercase tracking-widest">Please sign in to classify events</p>
        </div>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/">
            <LogIn className="h-4 w-4" /> ログイン画面へ
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32 overflow-hidden">
      <QuotePopup />

      <main className="flex-1 px-8 flex flex-col items-center pt-20 relative">
        {loading ? (
          <div className="flex py-32 justify-center">
            <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
          </div>
        ) : !currentEvent ? (
          <div className="w-full max-w-sm space-y-10 animate-in fade-in duration-700">
            <div className="text-center space-y-4 opacity-60 pt-10">
              <div className="w-16 h-16 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10">
                <LayoutGrid className="text-primary/40 h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground/70 tracking-tight">すべての分類が整いました</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  All categories organized
                </p>
              </div>
            </div>

            {recentClassified.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-primary/30">
                    <History className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">最近の分類一覧</span>
                  </div>
                  <Link
                    href="/events"
                    className="text-[9px] font-bold text-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    すべて見る <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentClassified.slice(0, 5).map((ev) => (
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
                          <div className="w-8 h-8 bg-primary/[0.03] rounded-lg flex items-center justify-center shrink-0">
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
          <div className="w-full max-w-sm h-full flex flex-col items-center relative">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] mb-12">
              斜めスワイプで分類: {events.length}
            </div>

            <div className="relative w-full aspect-[3/4] flex items-center justify-center">
              {nextEvent && (
                <div
                  key={`next-${nextEvent.id}`}
                  className="absolute w-full h-full opacity-50 scale-95 translate-y-4 pointer-events-none z-0"
                >
                  <Card className="w-full h-full border-none shadow-lg bg-white/80 rounded-[2.5rem] flex flex-col overflow-hidden">
                    <CardContent className="p-10 flex-1 flex flex-col justify-center space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest block truncate">
                            {nextEvent.calendarName}
                          </span>
                        </div>
                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 line-clamp-4">
                          {nextEvent.title}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                        <Clock className="h-4 w-4 shrink-0" />
                        {format(parseISO(nextEvent.startAt), "M/d HH:mm")}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <AnimatePresence initial={false} mode="wait">
                <SwipeCard
                  key={currentEvent.id}
                  event={currentEvent}
                  exitDirection={exitDirection}
                  onClassify={handleClassify}
                />
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}