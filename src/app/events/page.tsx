
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, Filter, Database } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function EventsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllEvents = async () => {
      if (!user) return;

      const eventsRef = collection(db, "users", user.uid, "events");
      // 1. users/{uid}/events を直接読み込み、startAt順にソート
      const q = query(
        eventsRef, 
        orderBy("startAt", "desc")
      );

      try {
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ ...doc.data() } as AppEvent));
        console.log("Firestore 読込件数 (/events):", fetched.length);
        setEvents(fetched);
      } catch (err) {
        console.error("Fetch all events failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!isUserLoading && user) {
      fetchAllEvents();
    }
  }, [user, isUserLoading, db]);

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 pt-12 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">予定一覧</h1>
          <p className="text-muted-foreground text-sm">Firestoreに保存された全ての予定</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Database className="h-3 w-3" /> {events.length}
          </Badge>
          <Filter className="h-5 w-5 text-muted-foreground" />
        </div>
      </header>

      <main className="px-6 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-20 space-y-4">
             <p className="text-muted-foreground">予定が見つかりません</p>
             <p className="text-xs text-muted-foreground/60">設定画面からカレンダーを同期してください</p>
          </div>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-muted/50 rounded-xl p-2 min-w-[50px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(event.startAt), "MMM")}</span>
                  <span className="text-xl font-bold text-foreground">{format(new Date(event.startAt), "d")}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate leading-none">{event.title}</h3>
                    {event.quadrantCategory && (
                      <div className={`w-2 h-2 rounded-full ${
                        event.quadrantCategory.startsWith('urgent') ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(event.startAt), "HH:mm")} - {format(new Date(event.endAt), "HH:mm")}
                  </p>
                  <p className="text-[10px] text-primary/70 font-medium truncate italic">{event.source === 'google_calendar' ? 'Google Calendar' : 'Manual Entry'}</p>
                </div>
                {event.reportStatus && (
                   <Badge variant="outline" className={`text-[9px] uppercase h-5 ${
                    event.reportStatus === 'done' ? 'border-green-200 text-green-700 bg-green-50' : 
                    event.reportStatus === 'failed' ? 'border-red-200 text-red-700 bg-red-50' : 'border-gray-200 text-gray-700 bg-gray-50'
                   }`}>
                    {event.reportStatus}
                   </Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Navigation />
    </div>
  );
}
