
"use client";

import { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy, where } from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Ban, Loader2, MessageSquare, Clock } from "lucide-react";
import { format, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    const fetchReportEvents = async () => {
      if (!user) return;

      const now = new Date();
      const todayEnd = endOfDay(now);
      
      const eventsRef = collection(db, "users", user.uid, "events");
      
      // クエリをシンプルにして複合インデックス要件を回避
      const q = query(
        eventsRef, 
        where("startAt", "<=", todayEnd.toISOString()),
        orderBy("startAt", "desc")
      );

      try {
        const snap = await getDocs(q);
        const fetched = snap.docs
          .map(doc => ({ ...doc.data() } as AppEvent))
          .filter(ev => !ev.reportStatus); // 未報告のもののみ
        
        console.log("Firestore 読込件数 (/report クエリ結果):", snap.docs.length);
        console.log("フィルタリング後の件数 (未報告のみ):", fetched.length);
        
        setEvents(fetched);
      } catch (err: any) {
        if (err.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: eventsRef.path,
            operation: 'list',
          }));
        } else {
          console.error("Fetch past events failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!isUserLoading && user) {
      fetchReportEvents();
    }
  }, [user, isUserLoading, db]);

  const handleStatusUpdate = async (eventId: string, status: ReportStatus) => {
    if (!user) return;
    const eventDoc = doc(db, "users", user.uid, "events", eventId);
    const updateData = {
      reportStatus: status,
      reportMemo: memo || "",
      isReported: true,
      updatedAt: Date.now()
    };

    updateDoc(eventDoc, updateData)
      .then(() => {
        setEvents(events.filter(ev => ev.id !== eventId));
        setSelectedEventId(null);
        setMemo("");
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: eventDoc.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 pt-12">
        <h1 className="text-3xl font-bold">報告</h1>
        <p className="text-muted-foreground text-sm">今日までの完了した予定を記録しましょう</p>
      </header>

      <main className="px-6 space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-muted-foreground">報告が必要な予定はありません</p>
            <p className="text-xs text-muted-foreground/60">すべて報告済みか、予定が入っていません</p>
          </div>
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
                      {event.reportMemo || "実績を選択してください..."}
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
