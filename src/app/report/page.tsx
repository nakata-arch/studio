
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser, useFirestore, DUMMY_USER_ID } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  limit,
  doc,
  updateDoc,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  ClipboardCheck,
  LogIn,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PREVIEW_EVENTS } from "@/lib/preview-data";
import { QuotePopup } from "@/components/QuotePopup";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";

type SwipeCandidate = ReportStatus | null;

const SWIPE_X_THRESHOLD = 110;
const SWIPE_Y_THRESHOLD = 90;
const PAGE_SIZE = 10;

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memo, setMemo] = useState("");
  const [swipeCandidate, setSwipeCandidate] = useState<SwipeCandidate>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-180, 0, 180], [-10, 0, 10]);
  const doneOpacity = useTransform(x, [-140, -60, 0], [1, 0.5, 0]);
  const failedOpacity = useTransform(x, [0, 60, 140], [0, 0.5, 1]);
  const cancelledOpacity = useTransform(y, [-140, -60, 0], [1, 0.5, 0]);

  const fetchEvents = useCallback(async (isLoadMore = false) => {
    if (!user || (!isLoadMore && !loading) || (isLoadMore && !hasMore) || loadingMore) return;

    console.log(`report:fetch-start (more: ${isLoadMore})`);
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    if (user.uid === DUMMY_USER_ID) {
      console.log("report:fetch-mock");
      // モックデータは一括で取得するが、ページネーション風に振る舞う
      const unlisted = PREVIEW_EVENTS.filter((e) => !e.reportStatus);
      const startIdx = isLoadMore ? events.length : 0;
      const nextBatch = unlisted.slice(startIdx, startIdx + PAGE_SIZE);
      
      setEvents(prev => isLoadMore ? [...prev, ...nextBatch] : nextBatch);
      setHasMore(startIdx + PAGE_SIZE < unlisted.length);
      setLoading(false);
      setLoadingMore(false);
      console.log("report:data-done (mock)");
      return;
    }

    try {
      console.log("report:data-start");
      const now = new Date().toISOString();
      const eventsRef = collection(db, "users", user.uid, "events");

      let q = query(
        eventsRef,
        where("startAt", "<", now),
        orderBy("startAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (isLoadMore && lastVisible) {
        q = query(
          eventsRef,
          where("startAt", "<", now),
          orderBy("startAt", "desc"),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs
        .map((d) => d.data() as AppEvent)
        .filter((ev) => !ev.reportStatus);

      setLastVisible(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      
      setEvents((prev) => isLoadMore ? [...prev, ...fetched] : fetched);
      console.log(`report:data-done (count: ${fetched.length})`);
    } catch (err: any) {
      console.error("report:error", err);
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({ path: "events", operation: "list" })
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, db, loading, hasMore, loadingMore, events.length, lastVisible]);

  useEffect(() => {
    console.log("report:init", { isUserLoading, hasUser: !!user });
    if (!isUserLoading) {
      fetchEvents();
    }
  }, [user, isUserLoading]);

  // カードが少なくなったら自動ロード
  useEffect(() => {
    if (events.length > 0 && events.length <= 3 && hasMore && !loadingMore && !loading) {
      console.log("report:auto-load-next");
      fetchEvents(true);
    }
  }, [events.length, hasMore, loadingMore, loading, fetchEvents]);

  useEffect(() => {
    x.set(0);
    y.set(0);
    setSwipeCandidate(null);
  }, [events.length, x, y]);

  const currentEvent = events[0];

  const handleReport = async (status: ReportStatus) => {
    if (!currentEvent || !user || isSaving) return;

    setIsSaving(true);
    const event = currentEvent;

    // UIを即座に更新
    setEvents((prev) => prev.slice(1));
    setMemo("");
    setSwipeCandidate(null);
    x.set(0);
    y.set(0);

    if (user.uid === DUMMY_USER_ID) {
      setIsSaving(false);
      return;
    }

    try {
      const eventDoc = doc(db, "users", user.uid, "events", event.id);
      await updateDoc(eventDoc, {
        reportStatus: status,
        reportMemo: memo,
        isReported: true,
        updatedAt: Date.now(),
      });
      console.log(`report:saved (${status})`);
    } catch (err: any) {
      console.error("report:save-error", err);
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({
          path: "events-update",
          operation: "update",
        })
      );
      toast({ variant: "destructive", title: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  const detectSwipeCandidate = (offsetX: number, offsetY: number): SwipeCandidate => {
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);

    if (offsetY < -50 && absY > absX * 0.9) {
      return "cancelled";
    }

    if (offsetX < -50) {
      return "done";
    }

    if (offsetX > 50) {
      return "failed";
    }

    return null;
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setSwipeCandidate(detectSwipeCandidate(info.offset.x, info.offset.y));
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { x: offsetX, y: offsetY } = info.offset;
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);

    if (offsetY < -SWIPE_Y_THRESHOLD && absY > absX * 0.9) {
      handleReport("cancelled");
      return;
    }

    if (offsetX < -SWIPE_X_THRESHOLD) {
      handleReport("done");
      return;
    }

    if (offsetX > SWIPE_X_THRESHOLD) {
      handleReport("failed");
      return;
    }

    setSwipeCandidate(null);
  };

  const getHintText = () => {
    switch (swipeCandidate) {
      case "done":
        return "← 左に離すと「できた」";
      case "cancelled":
        return "↑ 上に離すと「中止」";
      case "failed":
        return "右に離すと「未達」 →";
      default:
        return "左右または上にスワイプして仕分け";
    }
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
          <ClipboardCheck className="h-12 w-12 mx-auto" />
          <p className="text-sm font-bold">ログインが必要です</p>
          <p className="text-[10px] uppercase tracking-widest">
            Please sign in to report events
          </p>
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
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <QuotePopup />
      
      <header className="p-8 pt-16 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/40">
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              一日の振り返り
            </span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-foreground/70">
            報告
          </h1>
        </div>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center pt-4">
        {loading && events.length === 0 ? (
          <div className="flex py-32 justify-center">
            <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
          </div>
        ) : !currentEvent ? (
          <div className="w-full max-w-sm space-y-10 animate-in fade-in duration-700">
            <div className="text-center space-y-4 opacity-60 pt-10">
              <div className="w-16 h-16 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10">
                <CheckCircle2 className="text-primary/40 h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground/70 tracking-tight">
                  すべての報告が終わりました
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  Daily reports completed
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-2xl py-6 font-bold gap-2 text-primary/40 border-primary/5 bg-white/50"
            >
              <Link href="/weekly">
                今日の日記を書く <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
                残り: {events.length}件{hasMore ? "+" : ""}
              </div>
              {loadingMore && <Loader2 className="h-3 w-3 animate-spin text-primary/20" />}
            </div>

            <div className="text-[11px] font-bold tracking-wide text-center text-muted-foreground/60">
              {getHintText()}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentEvent.id}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.92,
                  x:
                    swipeCandidate === "done"
                      ? -220
                      : swipeCandidate === "failed"
                      ? 220
                      : 0,
                  y: swipeCandidate === "cancelled" ? -220 : 0,
                  transition: { duration: 0.24 },
                  pointerEvents: "none",
                }}
                className="w-full relative"
              >
                <motion.div
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.18}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  style={{ x, y, rotate }}
                  whileDrag={{ scale: 1.02 }}
                  className="relative touch-none"
                >
                  <motion.div
                    style={{ opacity: doneOpacity }}
                    className="pointer-events-none absolute inset-y-6 left-4 z-20 flex items-center"
                  >
                    <div className="rounded-full bg-emerald-500 px-4 py-2 text-white text-xs font-bold shadow-lg">
                      できた
                    </div>
                  </motion.div>

                  <motion.div
                    style={{ opacity: failedOpacity }}
                    className="pointer-events-none absolute inset-y-6 right-4 z-20 flex items-center"
                  >
                    <div className="rounded-full bg-rose-500 px-4 py-2 text-white text-xs font-bold shadow-lg">
                      未達
                    </div>
                  </motion.div>

                  <motion.div
                    style={{ opacity: cancelledOpacity }}
                    className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2"
                  >
                    <div className="rounded-full bg-slate-600 px-4 py-2 text-white text-xs font-bold shadow-lg">
                      中止
                    </div>
                  </motion.div>

                  <Card className="w-full border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-10 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary/20" />
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest block truncate">
                            {currentEvent.calendarName}
                          </span>
                        </div>

                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 line-clamp-3">
                          {currentEvent.title}
                        </h2>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                          <Clock className="h-4 w-4 shrink-0" />
                          {format(parseISO(currentEvent.startAt), "M月d日(E) HH:mm", {
                            locale: ja,
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="h-px w-full bg-primary/[0.03]" />
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">
                            一言メモ
                          </label>
                          <Textarea
                            placeholder="どんな様子でしたか？"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="bg-primary/[0.01] border-none rounded-2xl resize-none text-sm min-h-[100px] focus-visible:ring-primary/5 placeholder:text-muted-foreground/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          onClick={() => handleReport("done")}
                          disabled={isSaving}
                          className="flex flex-col h-20 gap-1 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none shadow-sm"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-[10px] font-bold">できた</span>
                        </Button>

                        <Button
                          onClick={() => handleReport("cancelled")}
                          disabled={isSaving}
                          className="flex flex-col h-20 gap-1 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 border-none shadow-sm"
                        >
                          <MinusCircle className="h-5 w-5" />
                          <span className="text-[10px] font-bold">中止</span>
                        </Button>

                        <Button
                          onClick={() => handleReport("failed")}
                          disabled={isSaving}
                          className="flex flex-col h-20 gap-1 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border-none shadow-sm"
                        >
                          <XCircle className="h-5 w-5" />
                          <span className="text-[10px] font-bold">未達</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
