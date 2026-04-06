
"use client";

import { useEffect, useState } from "react";
import { useUser, useFirestore, DUMMY_USER_ID } from "@/firebase";
import { collection, query, orderBy, getDocs, where, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  LayoutGrid,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PREVIEW_EVENTS } from "@/lib/preview-data";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [memo, setMemo] = useState("");

  const fetchEvents = async () => {
    console.log("report:fetch-start");
    if (!user) {
      console.log("report:fetch-abort (no user)");
      setLoading(false);
      return;
    }

    if (user.uid === DUMMY_USER_ID) {
      console.log("report:fetch-mock");
      setEvents(PREVIEW_EVENTS.filter(e => !e.reportStatus));
      setLoading(false);
      return;
    }

    try {
      console.log("report:data-start");
      const now = new Date().toISOString();
      const eventsRef = collection(db, "users", user.uid, "events");
      
      const q = query(
        eventsRef,
        where("startAt", "<", now),
        orderBy("startAt", "desc"),
        limit(50)
      );
      
      const snap = await getDocs(q);
      const fetched = snap.docs
        .map(d => d.data() as AppEvent)
        .filter(ev => !ev.reportStatus);
      
      setEvents(fetched);
      console.log(`report:data-done (count: ${fetched.length})`);
    } catch (err: any) {
      console.error("report:error", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: "events", operation: 'list' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("report:init", { isUserLoading, hasUser: !!user });
    if (!isUserLoading) {
      fetchEvents();
    }
  }, [user, isUserLoading]);

  const currentEvent = events[0];

  const handleReport = async (status: ReportStatus) => {
    if (!currentEvent || !user) return;
    
    setIsSaving(true);
    const event = currentEvent;

    setEvents(prev => prev.slice(1));
    setMemo("");

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
        updatedAt: Date.now()
      });
      console.log(`report:saved (${status})`);
    } catch (err: any) {
      console.error("report:save-error", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: "events-update", operation: 'update' }));
      toast({ variant: "destructive", title: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
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
          <p className="text-[10px] uppercase tracking-widest">Please sign in to report events</p>
        </div>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/"><LogIn className="h-4 w-4" /> ログイン画面へ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
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
        {loading ? (
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
                <p className="text-sm font-bold text-foreground/70 tracking-tight">すべての報告が終わりました</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Daily reports completed</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full rounded-2xl py-6 font-bold gap-2 text-primary/40 border-primary/5 bg-white/50">
              <Link href="/weekly">今日の日記を書く <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center gap-8">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
              残り: {events.length}件の未報告
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentEvent.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100, pointerEvents: 'none' }}
                className="w-full"
              >
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
                      <Button 
                        onClick={() => handleReport('done')}
                        disabled={isSaving}
                        className="flex flex-col h-20 gap-1 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none shadow-sm"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-[10px] font-bold">できた</span>
                      </Button>
                      <Button 
                        onClick={() => handleReport('failed')}
                        disabled={isSaving}
                        className="flex flex-col h-20 gap-1 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border-none shadow-sm"
                      >
                        <XCircle className="h-5 w-5" />
                        <span className="text-[10px] font-bold">未達</span>
                      </Button>
                      <Button 
                        onClick={() => handleReport('cancelled')}
                        disabled={isSaving}
                        className="flex flex-col h-20 gap-1 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 border-none shadow-sm"
                      >
                        <MinusCircle className="h-5 w-5" />
                        <span className="text-[10px] font-bold">中止</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
