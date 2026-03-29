"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Ban, Loader2, MessageSquare, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    const fetchPastEvents = async () => {
      if (!user) return;

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const eventsRef = collection(db, "users", user.uid, "events");
      const q = query(
        eventsRef, 
        where("startAt", "<=", today.toISOString()),
        orderBy("startAt", "desc")
      );

      try {
        const snap = await getDocs(q);
        setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent)));
      } catch (err) {
        console.error("Fetch past events failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!isUserLoading && user) {
      fetchPastEvents();
    }
  }, [user, isUserLoading, db]);

  const handleStatusUpdate = async (eventId: string, status: ReportStatus) => {
    if (!user) return;
    try {
      const eventDoc = doc(db, "users", user.uid, "events", eventId);
      await updateDoc(eventDoc, {
        reportStatus: status,
        reportMemo: memo || "",
        updatedAt: Date.now()
      });
      setEvents(events.map(ev => ev.id === eventId ? { ...ev, reportStatus: status, reportMemo: memo } : ev));
      setSelectedEventId(null);
      setMemo("");
    } catch (err) {
      console.error("Report update failed:", err);
    }
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 pt-12">
        <h1 className="text-3xl font-bold">日報入力</h1>
        <p className="text-muted-foreground text-sm">過去の予定に実績を記録しましょう</p>
      </header>

      <main className="px-6 space-y-4">
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground pt-12">対象の予定はありません</p>
        ) : (
          events.map((event) => (
            <Card key={event.id} className={`overflow-hidden transition-all ${selectedEventId === event.id ? 'ring-2 ring-primary border-transparent' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-tight">{event.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.startAt), "M月d日(E) HH:mm", { locale: ja })}
                    </p>
                  </div>
                  {event.reportStatus && !selectedEventId && (
                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      event.reportStatus === 'done' ? 'bg-green-100 text-green-700' : 
                      event.reportStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {event.reportStatus}
                    </div>
                  )}
                </div>

                {selectedEventId === event.id ? (
                  <div className="space-y-3 pt-2">
                    <Textarea 
                      placeholder="メモを入力..." 
                      value={memo} 
                      onChange={(e) => setMemo(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1" onClick={() => handleStatusUpdate(event.id, 'done')}>
                        <Check className="h-4 w-4" /> できた
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-red-50 gap-1" onClick={() => handleStatusUpdate(event.id, 'failed')}>
                        <X className="h-4 w-4" /> 失敗
                      </Button>
                      <Button size="sm" variant="outline" className="text-gray-600 border-gray-200 bg-gray-50 gap-1" onClick={() => handleStatusUpdate(event.id, 'cancelled')}>
                        <Ban className="h-4 w-4" /> 中止
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate flex-1 italic">
                      {event.reportMemo || "メモなし"}
                    </p>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                      setSelectedEventId(event.id);
                      setMemo(event.reportMemo || "");
                    }}>
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
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
