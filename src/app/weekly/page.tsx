
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { AppEvent, QuadrantCategory, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Heart, Calendar as CalendarIcon, Clock, MessageSquare, BookOpen } from "lucide-react";
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
  isSameDay 
} from "date-fns";
import { ja } from "date-fns/locale";
import { aiWeeklyReportSummary } from "@/ai/flows/ai-weekly-report-summary";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { QUADRANTS } from "@/lib/mock-data";

type PeriodType = 'diary' | 'weekly' | 'monthly' | 'yearly';

export default function DiaryPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<PeriodType>('diary');
  const [aiResult, setAiResult] = useState<{ summary: string; insight?: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 全イベントを取得
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("startAt", "desc")
    );
  }, [user, db]);

  const { data: allEvents, isLoading: isEventsLoading } = useCollection<AppEvent>(eventsQuery);

  // 期間ごとのフィルタリング
  const getPeriodRange = (type: PeriodType) => {
    const now = new Date();
    switch (type) {
      case 'weekly': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly': return { start: startOfYear(now), end: endOfYear(now) };
      default: return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
  };

  const periodEvents = useMemo(() => {
    if (!allEvents) return [];
    if (activeTab === 'diary') {
      // 日記タブでは報告済みのものすべてを表示
      return allEvents.filter(e => e.reportStatus);
    }
    const range = getPeriodRange(activeTab);
    return allEvents.filter(e => {
      const date = parseISO(e.startAt);
      return isWithinInterval(date, range);
    });
  }, [allEvents, activeTab]);

  // 日記タブ用の日付グルーピング
  const groupedDiaryEvents = useMemo(() => {
    if (activeTab !== 'diary') return [];
    const groups: { date: Date; events: AppEvent[] }[] = [];
    periodEvents.forEach(event => {
      const date = startOfDay(parseISO(event.startAt));
      const existing = groups.find(g => isSameDay(g.date, date));
      if (existing) {
        existing.events.push(event);
      } else {
        groups.push({ date, events: [event] });
      }
    });
    return groups;
  }, [periodEvents, activeTab]);

  function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // AI要約の取得
  useEffect(() => {
    const fetchAiSummary = async () => {
      if (activeTab === 'diary' || periodEvents.length === 0) {
        setAiResult(null);
        return;
      }

      setIsAiLoading(true);
      const range = getPeriodRange(activeTab);
      const done = periodEvents.filter(e => e.reportStatus === 'done').length;

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
            done,
            failed: periodEvents.filter(e => e.reportStatus === 'failed').length,
            cancelled: periodEvents.filter(e => e.reportStatus === 'cancelled').length,
          }
        });
        setAiResult(result);
      } catch (err) {
        console.error("AI Summary failed:", err);
      } finally {
        setIsAiLoading(false);
      }
    };

    if (user && !isEventsLoading) {
      fetchAiSummary();
    }
  }, [activeTab, periodEvents, user, isEventsLoading]);

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
            <BookOpen className="text-primary/40 h-5 w-5" />
          </div>
          <h1 className="text-xl font-headline font-bold text-foreground/70">歩みの記録</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PeriodType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-primary/5 rounded-2xl h-12 p-1 border-none">
            <TabsTrigger value="diary" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">日記</TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">週間</TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">月間</TabsTrigger>
            <TabsTrigger value="yearly" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">年間</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="px-8 mt-8 space-y-8">
        {activeTab === 'diary' ? (
          <div className="space-y-12">
            {groupedDiaryEvents.length === 0 ? (
              <div className="text-center py-20 opacity-40 space-y-4">
                <CalendarIcon className="h-10 w-10 mx-auto" />
                <p className="text-xs">まだ記録がありません</p>
              </div>
            ) : (
              groupedDiaryEvents.map((group) => (
                <div key={group.date.toISOString()} className="space-y-4">
                  <h3 className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] border-l-2 border-primary/10 pl-3 ml-1">
                    {format(group.date, "yyyy年 M月d日 (E)", { locale: ja })}
                  </h3>
                  <div className="space-y-3">
                    {group.events.map((event) => (
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
                              {event.reportStatus === 'done' ? 'できた' : event.reportStatus === 'failed' ? '未達' : '中止'}
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
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 期間サマリーカード */}
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

            {/* AIリフレクションカード */}
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <div className="flex items-center gap-3 text-primary/30">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {activeTab === 'weekly' ? '今週' : activeTab === 'monthly' ? '今月' : '今年'}のあなたへ
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
                    
                    {aiResult.insight && (
                      <div className="p-8 bg-primary/5 rounded-[2rem] space-y-4 border border-primary/5">
                        <div className="flex items-center gap-2 text-primary/60">
                          <Heart className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">ひとさじの助言</span>
                        </div>
                        <p className="text-xs text-foreground/60 leading-relaxed italic">
                          {aiResult.insight}
                        </p>
                      </div>
                    )}
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
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
