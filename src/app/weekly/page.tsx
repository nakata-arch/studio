
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Heart } from "lucide-react";
import { startOfWeek, endOfWeek, format, isWithinInterval } from "date-fns";
import { ja } from "date-fns/locale";
import { aiWeeklyReportSummary } from "@/ai/flows/ai-weekly-report-summary";

export default function WeeklyPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, done: 0 });
  const [aiResult, setAiResult] = useState<{ summary: string; insight?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      
      const eventsRef = collection(db, "users", user.uid, "events");
      const q = query(eventsRef, orderBy("startAt", "desc"));

      try {
        const snap = await getDocs(q);
        const allEvents = snap.docs.map(d => d.data() as AppEvent);
        
        // 今週のイベントのみフィルタリング
        const events = allEvents.filter(e => {
          const date = new Date(e.startAt);
          return isWithinInterval(date, { start, end });
        });

        const done = events.filter(e => e.reportStatus === 'done').length;
        setStats({ total: events.length, done });

        if (events.length > 0) {
          const result = await aiWeeklyReportSummary({
            targetPeriod: `${format(start, "MM/dd")} - ${format(end, "MM/dd")}`,
            eventCount: events.length,
            quadrantCounts: {
              urgent_important: events.filter(e => e.quadrantCategory === 'urgent_important').length,
              not_urgent_important: events.filter(e => e.quadrantCategory === 'not_urgent_important').length,
              urgent_not_important: events.filter(e => e.quadrantCategory === 'urgent_not_important').length,
              not_urgent_not_important: events.filter(e => e.quadrantCategory === 'not_urgent_not_important').length,
            },
            statusCounts: {
              done,
              failed: events.filter(e => e.reportStatus === 'failed').length,
              cancelled: events.filter(e => e.reportStatus === 'cancelled').length,
            }
          });
          setAiResult(result);
        } else {
          setAiResult({ summary: "今週はまだ予定がありません。ゆっくりと準備を始めましょう。" });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user, db]);

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16 space-y-1">
        <h1 className="text-3xl font-bold font-headline">日記</h1>
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">
          {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "M月d日")} 〜 {format(new Date(), "M月d日")}
        </p>
      </header>

      <main className="px-8 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm bg-white rounded-3xl">
            <CardContent className="p-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-primary/80 tracking-tighter">{stats.total}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">過ごした時間</span>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-3xl">
            <CardContent className="p-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-primary/80 tracking-tighter">{stats.done}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">実を結んだこと</span>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardContent className="p-10 space-y-8">
            <div className="flex items-center gap-3 text-primary/30">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">今週のあなたへ</span>
            </div>
            {aiResult ? (
              <div className="space-y-8">
                <p className="text-lg font-headline leading-relaxed text-foreground/70 italic">
                  {aiResult.summary}
                </p>
                {aiResult.insight && (
                  <div className="p-6 bg-primary/5 rounded-[1.5rem] space-y-3 border border-primary/5">
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
              <div className="flex items-center gap-3 text-sm text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                心を整えています...
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Navigation />
    </div>
  );
}
