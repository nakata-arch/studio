
"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser, useFirestore, DUMMY_USER_ID } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  doc,
  updateDoc,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
} from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  History,
  Edit3,
} from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
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

const FETCH_LIMIT = 50;

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [reportedEvents, setReportedEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memo, setMemo] = useState("");
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-10, 0, 10]);

  const fetchAllEvents = useCallback(async (isLoadMore = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    if (user.uid === DUMMY_USER_ID) {
      const all = PREVIEW_EVENTS;
      const now = new Date();
      setEvents(all.filter(e => !e.reportStatus && isBefore(parseISO(e.startAt), now)));
      setReportedEvents(all.filter(e => !!e.reportStatus));
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      const eventsRef = collection(db, "users", user.uid, "events");
      
      // 過去の予定（報告対象）を優先的に取得
      let q = query(
        eventsRef, 
        where("startAt", "<=", now),
        orderBy("startAt", "desc"), 
        limit(FETCH_LIMIT)
      );

      if (isLoadMore && lastVisible) {
        q = query(
          eventsRef, 
          where("startAt", "<=", now),
          orderBy("startAt", "desc"), 
          startAfter(lastVisible), 
          limit(FETCH_LIMIT)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AppEvent));
      
      const unreported = fetched.filter(e => !e.deleted && !e.reportStatus);
      const reported = fetched.filter(e => !e.deleted && !!e.reportStatus);

      setEvents(prev => isLoadMore ? [...prev, ...unreported] : unreported);
      setReportedEvents(prev => isLoadMore ? [...prev, ...reported] : reported);
      
      setLastVisible(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === FETCH_LIMIT);
    } catch (err: any) {
      console.error("report:fetch-error", err);
      // インデックス未作成の場合は全取得にフォールバック
      const eventsRef = collection(db, "users", user.uid, "events");
      const fallbackSnap = await getDocs(query(eventsRef, orderBy("startAt", "desc"), limit(FETCH_LIMIT)));
      const fetched = fallbackSnap.docs.map((d) => ({ ...d.data(), id: d.id } as AppEvent));
      const now = new Date();
      const unreported = fetched.filter(e => !e.deleted && !e.reportStatus && isBefore(parseISO(e.startAt), now));
      const reported = fetched.filter(e => !e.deleted && !!e.reportStatus);
      setEvents(unreported);
      setReportedEvents(reported);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, db, lastVisible]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchAllEvents();
    }
  }, [user, isUserLoading, fetchAllEvents]);

  const handleReport = async (status: ReportStatus, eventToUpdate: AppEvent, customMemo?: string) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    const targetMemo = customMemo !== undefined ? customMemo : memo;

    if (events.length > 0 && events[0].id === eventToUpdate.id) {
      setEvents((prev) => prev.slice(1));
      setMemo("");
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

    setReportedEvents(prev => {
      const filtered = prev.filter(e => e.id !== updatedEvent.id);
      return [updatedEvent, ...filtered];
    });

    if (user.uid === DUMMY_USER_ID) {
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

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 110;
    const { x: offsetX } = info.offset;
    if (offsetX < -threshold) handleReport("done", events[0]);
    else if (offsetX > threshold) handleReport("failed", events[0]);
    else {
      x.set(0);
      y.set(0);
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
        <ClipboardCheck className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-sm font-bold">ログインが必要です</p>
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
            <span className="text-[10px] font-bold uppercase tracking-widest">日報</span>
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
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
              残り: {events.length}件
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentEvent.id}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.24 }, pointerEvents: "none" }}
                className="w-full relative"
              >
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  style={{ x, rotate }}
                  className="relative touch-none"
                >
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
                        <Textarea
                          placeholder="振り返りメモ..."
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          className="bg-primary/[0.01] border-none rounded-2xl resize-none text-sm min-h-[100px] focus-visible:ring-primary/5"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => handleReport("done", currentEvent)} className="h-16 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none">
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          <span className="font-bold text-sm">できた</span>
                        </Button>
                        <Button onClick={() => handleReport("failed", currentEvent)} className="h-16 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border-none">
                          <XCircle className="h-5 w-5 mr-2" />
                          <span className="font-bold text-sm">未達</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-12">
            <div className="text-center space-y-4 pt-6">
              <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10 mb-2">
                <CheckCircle2 className="text-primary/40 h-10 w-10" />
              </div>
              <p className="text-lg font-headline font-bold text-foreground/70">報告すべき予定はありません</p>
            </div>

            {reportedEvents.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary/30 px-2">
                  <History className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">最近の報告履歴</span>
                </div>
                <div className="space-y-4">
                  {reportedEvents.map((ev) => (
                    <Card key={ev.id} onClick={() => setEditingEvent(ev)} className="border-none shadow-sm bg-white/60 rounded-3xl cursor-pointer hover:bg-white transition-all">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-500' : ev.reportStatus === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                          {ev.reportStatus === 'done' ? <CheckCircle2 className="h-5 w-5" /> : ev.reportStatus === 'failed' ? <XCircle className="h-5 w-5" /> : <MinusCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-bold text-foreground/70 truncate">{ev.title}</h4>
                          <p className="text-[10px] text-muted-foreground opacity-50">{format(parseISO(ev.startAt), "M/d HH:mm")}</p>
                        </div>
                        <Edit3 className="h-4 w-4 text-primary/20" />
                      </CardContent>
                    </Card>
                  ))}
                  {hasMore && (
                    <Button variant="ghost" onClick={() => fetchAllEvents(true)} className="w-full text-[10px] font-bold text-primary/30">
                      {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "続きを読み込む"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-[420px] rounded-[2.5rem] p-8 border-none">
          {editingEvent && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-primary/40">{editingEvent.calendarName}</span>
                <h2 className="text-xl font-headline font-bold text-foreground/70">{editingEvent.title}</h2>
              </div>
              <Textarea
                placeholder="メモを編集..."
                defaultValue={editingEvent.reportMemo}
                id="edit-memo-dialog"
                className="bg-primary/[0.01] border-none rounded-2xl min-h-[120px] resize-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleReport("done", editingEvent, (document.getElementById('edit-memo-dialog') as HTMLTextAreaElement)?.value)} className="bg-emerald-50 text-emerald-600 rounded-2xl h-16 hover:bg-emerald-100 border-none">できた</Button>
                <Button onClick={() => handleReport("failed", editingEvent, (document.getElementById('edit-memo-dialog') as HTMLTextAreaElement)?.value)} className="bg-rose-50 text-rose-600 rounded-2xl h-16 hover:bg-rose-100 border-none">未達</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
}
