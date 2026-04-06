
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  ClipboardCheck,
  LogIn,
  ChevronRight,
  MessageSquare,
  History,
  Sparkles,
  Edit3,
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
const PAGE_SIZE_UNREPORTED = 10;
const PAGE_SIZE_REPORTED = 15;

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // スワイプ用（未報告）
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memo, setMemo] = useState("");
  const [swipeCandidate, setSwipeCandidate] = useState<SwipeCandidate>(null);
  const [lastVisibleUnreported, setLastVisibleUnreported] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreUnreported, setHasMoreUnreported] = useState(true);

  // 履歴用（報告済み）
  const [reportedEvents, setReportedEvents] = useState<AppEvent[]>([]);
  const [loadingReported, setLoadingReported] = useState(false);
  const [lastVisibleReported, setLastVisibleReported] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreReported, setHasMoreReported] = useState(true);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-180, 0, 180], [-10, 0, 10]);
  const doneOpacity = useTransform(x, [-140, -60, 0], [1, 0.5, 0]);
  const failedOpacity = useTransform(x, [0, 60, 140], [0, 0.5, 1]);
  const cancelledOpacity = useTransform(y, [-140, -60, 0], [1, 0.5, 0]);

  // 未報告データの取得
  const fetchUnreported = useCallback(async (isLoadMore = false) => {
    if (!user || loadingMore) return;

    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    if (user.uid === DUMMY_USER_ID) {
      const unlisted = PREVIEW_EVENTS.filter((e) => !e.reportStatus);
      const startIdx = isLoadMore ? events.length : 0;
      const nextBatch = unlisted.slice(startIdx, startIdx + PAGE_SIZE_UNREPORTED);
      setEvents(prev => isLoadMore ? [...prev, ...nextBatch] : nextBatch);
      setHasMoreUnreported(startIdx + PAGE_SIZE_UNREPORTED < unlisted.length);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      const eventsRef = collection(db, "users", user.uid, "events");
      let q = query(
        eventsRef,
        where("startAt", "<", now),
        where("isReported", "==", false),
        orderBy("startAt", "desc"),
        limit(PAGE_SIZE_UNREPORTED)
      );

      if (isLoadMore && lastVisibleUnreported) {
        q = query(
          eventsRef,
          where("startAt", "<", now),
          where("isReported", "==", false),
          orderBy("startAt", "desc"),
          startAfter(lastVisibleUnreported),
          limit(PAGE_SIZE_UNREPORTED)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AppEvent));
      setLastVisibleUnreported(snap.docs[snap.docs.length - 1] || null);
      setHasMoreUnreported(snap.docs.length === PAGE_SIZE_UNREPORTED);
      setEvents((prev) => isLoadMore ? [...prev, ...fetched] : fetched);
    } catch (err: any) {
      console.error("report:unreported-error", err);
      errorEmitter.emit("permission-error", new FirestorePermissionError({ path: "events", operation: "list" }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, db, events.length, lastVisibleUnreported, loadingMore]);

  // 報告済みデータの取得
  const fetchReported = useCallback(async (isLoadMore = false) => {
    if (!user || loadingReported || (!isLoadMore && reportedEvents.length > 0)) return;

    setLoadingReported(true);

    if (user.uid === DUMMY_USER_ID) {
      const listed = PREVIEW_EVENTS.filter((e) => !!e.reportStatus);
      const startIdx = isLoadMore ? reportedEvents.length : 0;
      const nextBatch = listed.slice(startIdx, startIdx + PAGE_SIZE_REPORTED);
      setReportedEvents(prev => isLoadMore ? [...prev, ...nextBatch] : nextBatch);
      setHasMoreReported(startIdx + PAGE_SIZE_REPORTED < listed.length);
      setLoadingReported(false);
      return;
    }

    try {
      const eventsRef = collection(db, "users", user.uid, "events");
      let q = query(
        eventsRef,
        where("isReported", "==", true),
        orderBy("startAt", "desc"),
        limit(PAGE_SIZE_REPORTED)
      );

      if (isLoadMore && lastVisibleReported) {
        q = query(
          eventsRef,
          where("isReported", "==", true),
          orderBy("startAt", "desc"),
          startAfter(lastVisibleReported),
          limit(PAGE_SIZE_REPORTED)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AppEvent));
      setLastVisibleReported(snap.docs[snap.docs.length - 1] || null);
      setHasMoreReported(snap.docs.length === PAGE_SIZE_REPORTED);
      setReportedEvents((prev) => isLoadMore ? [...prev, ...fetched] : fetched);
    } catch (err: any) {
      console.error("report:reported-error", err);
    } finally {
      setLoadingReported(false);
    }
  }, [user, db, reportedEvents.length, lastVisibleReported, loadingReported]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchUnreported();
      fetchReported();
    }
  }, [user, isUserLoading]);

  // 完了後の自動読み込み
  useEffect(() => {
    if (events.length === 0 && !loading && !isUserLoading && user && reportedEvents.length === 0) {
      fetchReported();
    }
  }, [events.length, loading, isUserLoading, user]);

  const handleReport = async (status: ReportStatus, eventToUpdate: AppEvent, customMemo?: string) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    const targetMemo = customMemo !== undefined ? customMemo : memo;

    // UIを即座に更新
    if (events.length > 0 && events[0].id === eventToUpdate.id) {
      setEvents((prev) => prev.slice(1));
      setMemo("");
      setSwipeCandidate(null);
      x.set(0);
      y.set(0);
    }

    const updatedEvent = {
      ...eventToUpdate,
      reportStatus: status,
      reportMemo: targetMemo,
      isReported: true,
      updatedAt: Date.now(),
    };

    // 履歴に追加/更新
    setReportedEvents(prev => {
      const exists = prev.find(e => e.id === updatedEvent.id);
      if (exists) {
        return prev.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      }
      return [updatedEvent, ...prev];
    });

    if (user.uid === DUMMY_USER_ID) {
      // プレビューデータの更新
      const idx = PREVIEW_EVENTS.findIndex(e => e.id === updatedEvent.id);
      if (idx !== -1) PREVIEW_EVENTS[idx] = updatedEvent;
      setIsSaving(false);
      setEditingEvent(null);
      return;
    }

    try {
      const eventDoc = doc(db, "users", user.uid, "events", eventToUpdate.id);
      await updateDoc(eventDoc, {
        reportStatus: status,
        reportMemo: targetMemo,
        isReported: true,
        updatedAt: Date.now(),
      });
      setEditingEvent(null);
    } catch (err: any) {
      console.error("report:save-error", err);
      toast({ variant: "destructive", title: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  const detectSwipeCandidate = (offsetX: number, offsetY: number): SwipeCandidate => {
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);
    if (offsetY < -50 && absY > absX * 0.9) return "cancelled";
    if (offsetX < -50) return "done";
    if (offsetX > 50) return "failed";
    return null;
  };

  const handleDrag = (_: any, info: PanInfo) => {
    setSwipeCandidate(detectSwipeCandidate(info.offset.x, info.offset.y));
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { x: offsetX, y: offsetY } = info.offset;
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);
    if (offsetY < -SWIPE_Y_THRESHOLD && absY > absX * 0.9) {
      handleReport("cancelled", events[0]);
    } else if (offsetX < -SWIPE_X_THRESHOLD) {
      handleReport("done", events[0]);
    } else if (offsetX > SWIPE_X_THRESHOLD) {
      handleReport("failed", events[0]);
    } else {
      setSwipeCandidate(null);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">ユーザー情報を確認しています...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <div className="space-y-2 opacity-40">
          <ClipboardCheck className="h-12 w-12 mx-auto" />
          <p className="text-sm font-bold">ログインが必要です</p>
        </div>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/"><LogIn className="h-4 w-4" /> ログイン画面へ</Link>
        </Button>
      </div>
    );
  }

  const currentEvent = events[0];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <QuotePopup />
      
      <header className="p-8 pt-16 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/40">
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">一日の振り返り</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-foreground/70">報告</h1>
        </div>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center pt-4">
        {loading && events.length === 0 ? (
          <div className="flex py-32 justify-center w-full">
            <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
          </div>
        ) : currentEvent ? (
          // スワイプモード
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
                残り: {events.length}件{hasMoreUnreported ? "+" : ""}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentEvent.id}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.92,
                  x: swipeCandidate === "done" ? -220 : swipeCandidate === "failed" ? 220 : 0,
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
                  {/* スワイプ時のラベル */}
                  <motion.div style={{ opacity: doneOpacity }} className="pointer-events-none absolute inset-y-6 left-4 z-20 flex items-center">
                    <div className="rounded-full bg-emerald-500 px-4 py-2 text-white text-xs font-bold shadow-lg">できた</div>
                  </motion.div>
                  <motion.div style={{ opacity: failedOpacity }} className="pointer-events-none absolute inset-y-6 right-4 z-20 flex items-center">
                    <div className="rounded-full bg-rose-500 px-4 py-2 text-white text-xs font-bold shadow-lg">未達</div>
                  </motion.div>
                  <motion.div style={{ opacity: cancelledOpacity }} className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
                    <div className="rounded-full bg-slate-600 px-4 py-2 text-white text-xs font-bold shadow-lg">中止</div>
                  </motion.div>

                  <Card className="w-full border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-10 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary/40 truncate">
                          <div className="w-2 h-2 rounded-full bg-primary/20" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{currentEvent.calendarName}</span>
                        </div>
                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 line-clamp-3">{currentEvent.title}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                          <Clock className="h-4 w-4 shrink-0" />
                          {format(parseISO(currentEvent.startAt), "M月d日(E) HH:mm", { locale: ja })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="h-px w-full bg-primary/[0.03]" />
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">一言メモ</label>
                          <Textarea
                            placeholder="どんな様子でしたか？"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="bg-primary/[0.01] border-none rounded-2xl resize-none text-sm min-h-[100px] focus-visible:ring-primary/5 placeholder:text-muted-foreground/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <Button onClick={() => handleReport("done", currentEvent)} disabled={isSaving} className="flex flex-col h-20 gap-1 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none shadow-sm">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-[10px] font-bold">できた</span>
                        </Button>
                        <Button onClick={() => handleReport("cancelled", currentEvent)} disabled={isSaving} className="flex flex-col h-20 gap-1 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 border-none shadow-sm">
                          <MinusCircle className="h-5 w-5" />
                          <span className="text-[10px] font-bold">中止</span>
                        </Button>
                        <Button onClick={() => handleReport("failed", currentEvent)} disabled={isSaving} className="flex flex-col h-20 gap-1 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border-none shadow-sm">
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
        ) : (
          // 完了画面 & 履歴一覧
          <div className="w-full max-w-sm space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4 pt-6">
              <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10 mb-2">
                <CheckCircle2 className="text-primary/40 h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-headline font-bold text-foreground/70">今日の報告がすべて整いました</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Daily mission accomplished</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-primary/30">
                  <History className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">報告済みの歩み</span>
                </div>
                {loadingReported && <Loader2 className="h-3 w-3 animate-spin text-primary/20" />}
              </div>

              {reportedEvents.length === 0 && !loadingReported ? (
                <div className="text-center py-20 opacity-30 space-y-2">
                   <Clock className="h-10 w-10 mx-auto" />
                   <p className="text-xs font-bold uppercase tracking-widest">履歴はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportedEvents.map((ev) => (
                    <Card 
                      key={ev.id} 
                      onClick={() => setEditingEvent(ev)}
                      className="group border-none shadow-sm bg-white/60 rounded-3xl overflow-hidden cursor-pointer hover:bg-white transition-all active:scale-[0.98]"
                    >
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          ev.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-500' :
                          ev.reportStatus === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {ev.reportStatus === 'done' ? <CheckCircle2 className="h-6 w-6" /> :
                           ev.reportStatus === 'failed' ? <XCircle className="h-6 w-6" /> : <MinusCircle className="h-6 w-6" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-[13px] font-bold text-foreground/70 truncate">{ev.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground opacity-50 font-medium">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(ev.startAt), "HH:mm")}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit3 className="h-4 w-4 text-primary/20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {hasMoreReported && (
                    <Button 
                      variant="ghost" 
                      onClick={() => fetchReported(true)} 
                      disabled={loadingReported}
                      className="w-full h-14 rounded-3xl text-[10px] font-bold uppercase tracking-widest text-primary/30 hover:text-primary"
                    >
                      {loadingReported ? <Loader2 className="h-4 w-4 animate-spin" /> : "過去の記録を読み込む"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Button asChild variant="outline" className="w-full rounded-2xl py-6 font-bold gap-2 text-primary/40 border-primary/5 bg-white/50">
              <Link href="/weekly">今日の日記を書く <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        )}
      </main>

      {/* 編集モーダル */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-[420px] border-none bg-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>報告内容の編集</DialogTitle>
          </DialogHeader>
          
          {editingEvent && (
            <div className="p-8 space-y-8">
               <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary/40 truncate">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{editingEvent.calendarName}</span>
                </div>
                <h2 className="text-xl font-headline leading-tight text-foreground/80">{editingEvent.title}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
                  <Clock className="h-4 w-4" />
                  {format(parseISO(editingEvent.startAt), "M月d日 HH:mm", { locale: ja })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-px w-full bg-primary/[0.03]" />
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> 一言メモ
                  </label>
                  <Textarea
                    placeholder="修正したい内容を入力..."
                    defaultValue={editingEvent.reportMemo || ""}
                    id="edit-memo"
                    className="bg-primary/[0.01] border-none rounded-2xl resize-none text-sm min-h-[120px] focus-visible:ring-primary/5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'done', label: 'できた', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
                  { id: 'cancelled', label: '中止', icon: MinusCircle, color: 'bg-slate-50 text-slate-500' },
                  { id: 'failed', label: '未達', icon: XCircle, color: 'bg-rose-50 text-rose-600' }
                ].map((status) => (
                  <Button
                    key={status.id}
                    onClick={() => {
                      const newMemo = (document.getElementById('edit-memo') as HTMLTextAreaElement)?.value;
                      handleReport(status.id as ReportStatus, editingEvent, newMemo);
                    }}
                    disabled={isSaving}
                    className={`flex flex-col h-20 gap-1 rounded-2xl border-none shadow-sm transition-all hover:scale-105 ${status.color} ${editingEvent.reportStatus === status.id ? 'ring-2 ring-primary/20' : 'opacity-60'}`}
                  >
                    <status.icon className="h-5 w-5" />
                    <span className="text-[10px] font-bold">{status.label}</span>
                  </Button>
                ))}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    const newMemo = (document.getElementById('edit-memo') as HTMLTextAreaElement)?.value;
                    handleReport(editingEvent.reportStatus!, editingEvent, newMemo);
                  }}
                  disabled={isSaving}
                  className="w-full rounded-2xl h-12 font-bold"
                >
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "変更を保存"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
}
