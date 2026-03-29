
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, BarChart, Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, format, isWithinInterval } from "date-fns";
import { ja } from "date-fns/locale";
import { aiWeeklyReportSummary } from "@/ai/flows/ai-weekly-report-summary";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function WeeklyPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    quadrants: {
      urgent_important: 0,
      not_urgent_important: 0,
      urgent_not_important: 0,
      not_urgent_not_important: 0,
    },
    status: {
      done: 0,
      failed: 0,
      cancelled: 0,
    }
  });
  const [aiResult, setAiResult] = useState<{ summary: string; insight?: string } | null>(null);

  useEffect(() => {
    const fetchWeekData = async () => {
      if (!user) return;

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const eventsRef = collection(db, "users", user.uid, "events");
      
      // 集計処理: 今週の範囲の全予定をFirestoreから取得
      const q = query(
        eventsRef, 
        where("startAt", ">=", weekStart.toISOString()),
        where("startAt", "<=", weekEnd.toISOString())
      );

      try {
        const snap = await getDocs(q);
        const fetchedEvents = snap.docs.map(doc => doc.data() as AppEvent);
        console.log("集計対象期間 (/weekly):", format(weekStart, "yyyy-MM-dd"), "to", format(weekEnd, "yyyy-MM-dd"));
        console.log("Firestore 読込件数 (/weekly):", fetchedEvents.length);

        const newStats = {
          total: fetchedEvents.length,
          quadrants: {
            urgent_important: fetchedEvents.filter(e => e.quadrantCategory === 'urgent_important').length,
            not_urgent_important: fetchedEvents.filter(e => e.quadrantCategory === 'not_urgent_important').length,
            urgent_not_important: fetchedEvents.filter(e => e.quadrantCategory === 'urgent_not_important').length,
            not_urgent_not_important: fetchedEvents.filter(e => e.quadrantCategory === 'not_urgent_not_important').length,
          },
          status: {
            done: fetchedEvents.filter(e => e.reportStatus === 'done').length,
            failed: fetchedEvents.filter(e => e.reportStatus === 'failed').length,
            cancelled: fetchedEvents.filter(e => e.reportStatus === 'cancelled').length,
          }
        };

        setStats(newStats);

        if (newStats.total > 0) {
          try {
            const result = await aiWeeklyReportSummary({
              targetPeriod: `${format(weekStart, "MM/dd")} - ${format(weekEnd, "MM/dd")}`,
              eventCount: newStats.total,
              quadrantCounts: newStats.quadrants,
              statusCounts: newStats.status,
              userReflection: "今週のFirestoreデータに基づいた振り返りです。"
            });
            setAiResult(result);
          } catch (err) {
            console.error("AI Summary generation failed:", err);
          }
        }
      } catch (err: any) {
        if (err.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/events`,
            operation: 'list',
          }));
        }
      } finally {
        setLoading(false);
      }
    };

    if (!isUserLoading && user) {
      fetchWeekData();
    }
  }, [user, isUserLoading, db]);

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 pt-12">
        <h1 className="text-3xl font-bold">日記</h1>
        <p className="text-muted-foreground text-sm">
          {format(weekStart, "M月d日")} 〜 {format(weekEnd, "M月d日")} の振り返り
        </p>
      </header>

      <main className="px-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground shadow-lg border-none">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{stats.total}</span>
              <span className="text-xs opacity-80">今週の予定</span>
            </CardContent>
          </Card>
          <Card className="bg-accent text-accent-foreground shadow-lg border-none">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">
                {stats.total > 0 ? Math.round((stats.status.done / stats.total) * 100) : 0}%
              </span>
              <span className="text-xs opacity-80">完了率</span>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700">
              <Sparkles className="h-4 w-4" /> AIコーチング要約
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.total === 0 ? (
               <p className="text-sm text-muted-foreground italic">今週はまだ予定がありません。</p>
            ) : aiResult ? (
              <>
                <p className="text-sm leading-relaxed text-indigo-900">{aiResult.summary}</p>
                {aiResult.insight && (
                  <div className="p-3 bg-white/60 rounded-lg border border-indigo-100">
                    <p className="text-xs font-bold text-accent uppercase mb-1">アドバイス</p>
                    <p className="text-sm text-indigo-800 italic">{aiResult.insight}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Firestoreを分析中...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="h-4 w-4 text-primary" /> 4象限分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: '緊急かつ重要', count: stats.quadrants.urgent_important, color: 'bg-red-500' },
              { label: '重要だが緊急でない', count: stats.quadrants.not_urgent_important, color: 'bg-blue-500' },
              { label: '緊急だが重要でない', count: stats.quadrants.urgent_not_important, color: 'bg-yellow-500' },
              { label: '緊急でも重要でもない', count: stats.quadrants.not_urgent_not_important, color: 'bg-gray-400' },
            ].map((q) => (
              <div key={q.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>{q.label}</span>
                  <span>{q.count}件</span>
                </div>
                <Progress value={stats.total > 0 ? (q.count / stats.total) * 100 : 0} className="h-1.5" indicatorClassName={q.color} />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <Navigation />
    </div>
  );
}
