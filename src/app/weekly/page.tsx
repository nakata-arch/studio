
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { AppEvent, QuadrantCategory, Summary } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  Sparkles, 
  Heart, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  Mic,
  Square,
  Wand2,
  Clock,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  format, 
  isWithinInterval, 
  parseISO, 
  isSameDay,
  addDays,
  subDays,
  startOfDay,
  endOfDay
} from "date-fns";
import { ja } from "date-fns/locale";
import { aiWeeklyReportSummary } from "@/ai/flows/ai-weekly-report-summary";
import { refineReflection } from "@/ai/flows/ai-refine-reflection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { QUADRANTS } from "@/lib/mock-data";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type MainTabType = 'diary' | 'aggregate';
type SubTabType = 'weekly' | 'monthly' | 'yearly';

export default function DiaryPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<MainTabType>('diary');
  const [subTab, setSubTab] = useState<SubTabType>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiResult, setAiResult] = useState<{ summary: string; insight: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dailyMemo, setDailyMemo] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  // 録音関連のステート
  const [isRecording, setIsRecording] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 全予定の取得
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("startAt", "desc")
    );
  }, [user, db]);

  const { data: allEvents, isLoading: isEventsLoading } = useCollection<AppEvent>(eventsQuery);

  // 日記メモ（Summaryエンティティのdailyタイプ）の取得
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dailySummaryRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "users", user.uid, "summaries", `daily-${dateStr}`);
  }, [user, db, dateStr]);

  const { data: dailySummaryDoc } = useDoc<Summary>(dailySummaryRef);

  useEffect(() => {
    if (dailySummaryDoc) {
      setDailyMemo(dailySummaryDoc.summaryText || "");
    } else {
      setDailyMemo("");
    }
  }, [dailySummaryDoc]);

  const handleSaveDailyMemo = async () => {
    if (!user || !dailySummaryRef) return;
    setIsSavingMemo(true);
    try {
      await setDoc(dailySummaryRef, {
        id: `daily-${dateStr}`,
        userId: user.uid,
        summaryType: 'daily',
        startDate: dateStr,
        endDate: dateStr,
        summaryText: dailyMemo,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "保存しました", description: "日記を更新しました。" });
    } catch (e) {
      console.error("Save daily memo failed:", e);
    } finally {
      setIsSavingMemo(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          handleRefine(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast({ variant: "destructive", title: "録音エラー", description: "マイクの使用を許可してください。" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRefine = async (audioDataUri?: string) => {
    setIsRefining(true);
    try {
      const result = await refineReflection({
        text: audioDataUri ? undefined : dailyMemo,
        audioDataUri
      });
      setDailyMemo(result.refinedText);
      toast({ title: audioDataUri ? "聞き取りました" : "AIが整えました", description: "日記を清書しました。" });
    } catch (err) {
      console.error("Refine failed:", err);
      toast({ variant: "destructive", title: "AI整形エラー", description: "うまく文章を整えられませんでした。" });
    } finally {
      setIsRefining(false);
    }
  };

  const getPeriodRange = (type: SubTabType) => {
    const now = new Date();
    switch (type) {
      case 'weekly': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly': return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const periodEvents = useMemo(() => {
    if (!allEvents) return [];
    if (mainTab === 'diary') {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      return allEvents.filter(e => {
        const date = parseISO(e.startAt);
        return isWithinInterval(date, { start, end });
      });
    }
    const range = getPeriodRange(subTab);
    return allEvents.filter(e => {
      const date = parseISO(e.startAt);
      return isWithinInterval(date, range);
    });
  }, [allEvents, mainTab, subTab, selectedDate]);

  const stats = useMemo(() => {
    return {
      total: periodEvents.length,
      done: periodEvents.filter(e => e.reportStatus === 'done').length,
      failed: periodEvents.filter(e => e.reportStatus === 'failed').length,
      cancelled: periodEvents.filter(e => e.reportStatus === 'cancelled').length,
    };
  }, [periodEvents]);

  useEffect(() => {
    const fetchAiSummary = async () => {
      if (mainTab === 'diary' || periodEvents.length === 0) {
        setAiResult(null);
        return;
      }
      setIsAiLoading(true);
      const range = getPeriodRange(subTab);
      try {
        const result = await aiWeeklyReportSummary({
          targetPeriod: `${format(range.start, "yyyy年M月d日")} 〜 ${format(range.end, "M月d日")}`,
          eventCount: periodEvents.length,
          quadrantCounts: {
            urgent_important: periodEvents.filter(e => e.quadrantCategory === 'urgent_important').length,
            not_urgent_important: periodEvents.filter(e => e.quadrantCategory === 'not_urgent_important').length,
            urgent_not_important: periodEvents.filter(e => e.quadrantCategory === 'urgent_not_important').length,
            not_urgent_not_important: periodEvents.filter(e => e.quadrantCategory === 'not_urgent_not_important').length,
          },
          statusCounts: {
            done: stats.done,
            failed: stats.failed,
            cancelled: stats.cancelled,
          }
        });
        setAiResult(result);
      } catch (err) {
        console.error("AI Summary failed:", err);
      } finally {
        setIsAiLoading(false);
      }
    };
    if (user && !isEventsLoading && mainTab === 'aggregate') {
      fetchAiSummary();
    }
  }, [mainTab, subTab, periodEvents, user, isEventsLoading, stats]);

  const dateLabel = useMemo(() => {
    const now = new Date();
    if (isSameDay(selectedDate, now)) return "今日";
    if (isSameDay(selectedDate, subDays(now, 1))) return "昨日";
    if (isSameDay(selectedDate, addDays(now, 1))) return "明日";
    return format(selectedDate, "E", { locale: ja });
  }, [selectedDate]);

  if (isUserLoading || (isEventsLoading && !allEvents)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="px-8 pt-16 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/5">
            {mainTab === 'diary' ? <BookOpen className="text-primary/40 h-5 w-5" /> : <BarChart3 className="text-primary/40 h-5 w-5" />}
          </div>
          <h1 className="text-xl font-headline font-bold text-foreground/70">{mainTab === 'diary' ? '日記' : '集計'}</h1>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-primary/5 rounded-2xl h-12 p-1 border-none">
            <TabsTrigger value="diary" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">日記</TabsTrigger>
            <TabsTrigger value="aggregate" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">集計</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="px-8 mt-8">
        <Tabs value={mainTab}>
          <TabsContent value="diary" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 日付ナビゲーション */}
            <div className="flex items-center justify-between bg-white/50 p-2 rounded-[2rem] shadow-sm">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ChevronLeft className="h-5 w-5 opacity-40" />
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{dateLabel}</span>
                <span className="text-sm font-bold text-foreground/70">{format(selectedDate, "yyyy年 M月d日", { locale: ja })}</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ChevronRight className="h-5 w-5 opacity-40" />
              </Button>
            </div>

            {/* 日次サマリー */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '予定', val: stats.total, color: 'text-primary/60' },
                { label: 'できた', val: stats.done, color: 'text-emerald-600' },
                { label: '未達', val: stats.failed, color: 'text-rose-600' },
                { label: '中止', val: stats.cancelled, color: 'text-slate-500' }
              ].map((s) => (
                <Card key={s.label} className="border-none bg-white shadow-sm rounded-2xl">
                  <CardContent className="p-3 flex flex-col items-center">
                    <span className={`text-lg font-bold tracking-tighter ${s.color}`}>{s.val}</span>
                    <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">{s.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 今日の日記メモ */}
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary/30">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">一日の振り返り</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-full transition-all ${isRecording ? 'text-rose-500 bg-rose-50 animate-pulse' : 'text-primary/40 hover:text-primary hover:bg-primary/5'}`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isRefining}
                    >
                      {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5"
                      onClick={() => handleRefine()}
                      disabled={isRecording || isRefining || !dailyMemo}
                    >
                      {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-full text-[10px] font-bold gap-2 text-primary/40 hover:text-primary hover:bg-primary/5"
                      onClick={handleSaveDailyMemo}
                      disabled={isSavingMemo || isRecording || isRefining}
                    >
                      {isSavingMemo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      保存
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Textarea 
                    placeholder={isRecording ? "録音中... お話しください。" : (isRefining ? "AIが文章を整えています..." : "今日はどんな日でしたか？ 感じたこと、残したいことを自由に書いてみましょう。")}
                    value={dailyMemo}
                    onChange={(e) => setDailyMemo(e.target.value)}
                    className="min-h-[160px] bg-primary/[0.02] border-none rounded-2xl resize-none text-sm leading-relaxed italic placeholder:text-muted-foreground/30 focus-visible:ring-primary/5"
                    disabled={isRefining}
                  />
                  {isRefining && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                        <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">AI Refining...</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* その日の予定一覧 */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] px-2">今日の歩み</h3>
              {periodEvents.length === 0 ? (
                <div className="text-center py-12 opacity-30 space-y-3">
                  <Clock className="h-8 w-8 mx-auto" />
                  <p className="text-xs">予定はありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {periodEvents.map((event) => (
                    <Card key={event.id} className="border-none shadow-sm bg-white/60 rounded-[1.5rem] overflow-hidden">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate text-foreground/80">{event.title}</h4>
                              {event.quadrantCategory && (
                                <span className="text-[14px]" title={QUADRANTS[event.quadrantCategory]?.label}>
                                  {QUADRANTS[event.quadrantCategory]?.icon}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground opacity-60 font-medium">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(event.startAt), "HH:mm")}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-[8px] uppercase px-2 h-5 rounded-full border-none font-bold ${
                              event.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-600' : 
                              event.reportStatus === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {!event.reportStatus ? '未報告' : (event.reportStatus === 'done' ? 'できた' : event.reportStatus === 'failed' ? '未達' : '中止')}
                          </Badge>
                        </div>
                        {event.reportMemo && (
                          <div className="flex gap-2 p-3 bg-primary/[0.02] rounded-xl border border-primary/[0.03]">
                            <MessageSquare className="h-3 w-3 text-primary/20 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-foreground/60 leading-relaxed italic">
                              {event.reportMemo}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="aggregate" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 期間切り替え */}
            <div className="flex justify-center">
              <div className="inline-flex bg-primary/5 p-1 rounded-2xl border border-primary/5">
                {[
                  { id: 'weekly', label: '週間' },
                  { id: 'monthly', label: '月間' },
                  { id: 'yearly', label: '年間' }
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubTab(item.id as SubTabType)}
                    className={`h-9 rounded-xl text-[10px] font-bold tracking-widest uppercase px-6 transition-all ${subTab === item.id ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 集計サマリー */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                <CardContent className="p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary/80 tracking-tighter">{periodEvents.length}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">過ごした時間</span>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                <CardContent className="p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary/80 tracking-tighter">
                    {periodEvents.filter(e => e.reportStatus === 'done').length}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">実を結んだこと</span>
                </CardContent>
              </Card>
            </div>

            {/* AI振り返りメッセージ */}
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <div className="flex items-center gap-3 text-primary/30">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    この期間のあなたへ
                  </span>
                </div>

                {isAiLoading ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    心を整えています...
                  </div>
                ) : aiResult ? (
                  <div className="space-y-10">
                    <p className="text-lg font-headline leading-relaxed text-foreground/70 italic">
                      {aiResult.summary}
                    </p>
                    
                    <div className="p-8 bg-primary/5 rounded-[2rem] space-y-4 border border-primary/5">
                      <div className="flex items-center gap-2 text-primary/60">
                        <Heart className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">自分への問いかけ</span>
                      </div>
                      <p className="text-xs text-foreground/60 leading-relaxed italic">
                        {aiResult.insight}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-10">
                    まだ振り返るための記録がありません。<br />
                    日々の歩みを残すことから始めましょう。
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 四象限の内訳 */}
            {periodEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] px-2">時間の質</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(QUADRANTS) as [QuadrantCategory, any][]).map(([key, config]) => {
                    const count = periodEvents.filter(e => e.quadrantCategory === key).length;
                    return (
                      <Card key={key} className="border-none bg-white/40 shadow-sm rounded-2xl overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{config.icon}</span>
                            <span className="text-[10px] font-bold text-foreground/60">{config.label}</span>
                          </div>
                          <span className="text-sm font-bold text-primary/60">{count}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Navigation />
    </div>
  );
}
