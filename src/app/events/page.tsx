
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
      const q = query(eventsRef, orderBy("startAt", "desc"));

      try {
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ ...doc.data() } as AppEvent));
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

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-8 pt-16 flex justify-between items-end">
        <h1 className="text-3xl font-bold font-headline">予定</h1>
        <Badge variant="secondary" className="gap-1 rounded-full px-3">
          <Database className="h-3 w-3 opacity-40" /> {events.length}
        </Badge>
      </header>

      <main className="px-6 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-20 space-y-4">
             <p className="text-muted-foreground opacity-60">予定が見つかりません</p>
          </div>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="border-none shadow-sm overflow-hidden bg-white/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-muted/30 rounded-xl p-2 min-w-[50px]">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">{format(new Date(event.startAt), "MMM")}</span>
                  <span className="text-lg font-bold text-foreground">{format(new Date(event.startAt), "d")}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate leading-none text-foreground/80">{event.title}</h3>
                    {event.quadrantCategory && (
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        event.quadrantCategory.startsWith('urgent') ? 'bg-rose-400' : 'bg-indigo-400'
                      }`} />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-60">
                    <Clock className="h-2.5 w-2.5" />
                    {format(new Date(event.startAt), "HH:mm")}
                  </p>
                </div>
                {event.reportStatus && (
                   <Badge variant="outline" className={`text-[8px] uppercase h-5 px-2 rounded-full border-none bg-primary/5 ${
                    event.reportStatus === 'done' ? 'text-emerald-600' : 
                    event.reportStatus === 'failed' ? 'text-rose-600' : 'text-slate-500'
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
