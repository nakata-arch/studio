"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirestore, useUser, DUMMY_USER_ID } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Clock,
  CalendarDays,
  ChevronDown,
  LogIn,
  FolderKanban,
} from "lucide-react";
import {
  format,
  parseISO,
  isAfter,
  endOfToday,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUADRANTS } from "@/lib/mock-data";
import { PREVIEW_EVENTS } from "@/lib/preview-data";
import Link from "next/link";

const EVENTS_PER_PAGE = 20;

function isPastOrToday(dateString: string) {
  try {
    return !isAfter(parseISO(dateString), endOfToday());
  } catch {
    return false;
  }
}

function normalizeClassifiedEvents(items: AppEvent[]) {
  return items
    .filter((event) => !!event.quadrantCategory)
    .filter((event) => !!event.startAt)
    .filter((event) => isPastOrToday(event.startAt))
    .sort((a, b) => {
      return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
    });
}

export default function EventsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPreviewFallback = (isLoadMore = false) => {
    const fallback = normalizeClassifiedEvents(PREVIEW_EVENTS as AppEvent[]);

    if (isLoadMore) {
      setEvents((prev) => [
        ...prev,
        ...fallback.slice(prev.length, prev.length + EVENTS_PER_PAGE),
      ]);
    } else {
      setEvents(fallback.slice(0, EVENTS_PER_PAGE));
    }

    setHasMore(fallback.length > EVENTS_PER_PAGE && !isLoadMore);
  };

  const fetchEvents = async (isLoadMore = false) => {
    if (!user) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setErrorMessage(null);
    }

    // プレビュー環境
    if (user.uid === DUMMY_USER_ID) {
      setTimeout(() => {
        const previewItems = normalizeClassifiedEvents(
          PREVIEW_EVENTS as AppEvent[]
        );

        if (isLoadMore) {
          setEvents((prev) => [
            ...prev,
            ...previewItems.slice(prev.length, prev.length + EVENTS_PER_PAGE),
          ]);
        } else {
          setEvents(previewItems.slice(0, EVENTS_PER_PAGE));
        }

        setHasMore(previewItems.length > EVENTS_PER_PAGE);
        setLoading(false);
        setLoadingMore(false);
      }, 400);

      return;
    }

    try {
      const eventsRef = collection(db, "users", user.uid, "events");

      let q = query(
        eventsRef,
        orderBy("startAt", "desc"),
        limit(EVENTS_PER_PAGE)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          eventsRef,
          orderBy("startAt", "desc"),
          startAfter(lastDoc),
          limit(EVENTS_PER_PAGE)
        );
      }

      const snap = await getDocs(q);

      const fetched = snap.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        } as AppEvent;
      });

      const classifiedOnly = normalizeClassifiedEvents(fetched);

      if (isLoadMore) {
        setEvents((prev) => [...prev, ...classifiedOnly]);
      } else {
        setEvents(classifiedOnly);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === EVENTS_PER_PAGE);
    } catch (err) {
      console.error("events:error", err);
      setErrorMessage("予定の読み込みに失敗したため、サンプルデータを表示しています。");
      applyPreviewFallback(isLoadMore);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading) {
      fetchEvents(false);
    }
  }, [user, isUserLoading]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, AppEvent[]> = {};

    events.forEach((event) => {
      try {
        const dayKey = format(parseISO(event.startAt), "yyyy年 M月d日(E)", {
          locale: ja,
        });

        if (!groups[dayKey]) {
          groups[dayKey] = [];
        }

        groups[dayKey].push(event);
      } catch (e) {
        console.warn("Invalid date format:", event.startAt);
      }
    });

    return groups;
  }, [events]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          ユーザー情報を確認しています...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <div className="space-y-2 opacity-40">
          <CalendarDays className="h-12 w-12 mx-auto" />
          <p className="text-sm font-bold">ログインが必要です</p>
        </div>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/">
            <LogIn className="h-4 w-4" />
            ログイン画面へ
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/40">
            <FolderKanban className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              分類済み一覧
            </span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-foreground/70">
            予定一覧
          </h1>
        </div>

        {!loading && (
          <Badge
            variant="secondary"
            className="gap-1 rounded-full px-3 h-6 bg-primary/5 text-primary/40 border-none font-bold"
          >
            {events.length}件表示中
          </Badge>
        )}
      </header>

      <main className="px-6 space-y-8">
        {loading ? (
          <div className="flex py-32 justify-center">
            <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-32 space-y-4 opacity-30">
            <CalendarDays className="h-12 w-12 mx-auto" />
            <p className="text-xs font-medium uppercase tracking-widest">
              分類済みの予定が見つかりません
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {errorMessage && (
              <div className="text-center text-[10px] font-bold tracking-widest text-amber-600">
                {errorMessage}
              </div>
            )}

            {Object.entries(groupedEvents).map(([dayLabel, dayEvents]) => (
              <section key={dayLabel} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <span className="text-[11px] font-bold text-primary/30 uppercase tracking-[0.2em] whitespace-nowrap">
                    {dayLabel}
                  </span>
                  <div className="h-[1px] w-full bg-primary/5" />
                </div>

                <div className="space-y-3">
                  {dayEvents.map((event) => {
                    const quadrant = event.quadrantCategory
                      ? QUADRANTS[event.quadrantCategory]
                      : null;

                    const statusLabel =
                      event.reportStatus === "done"
                        ? "完了"
                        : event.reportStatus === "failed"
                        ? "未完了"
                        : "未報告";

                    return (
                      <Card
                        key={event.id}
                        className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden hover:bg-white transition-all"
                      >
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0 space-y-2 flex-1">
                            <h4 className="text-[13px] font-bold text-foreground/70 truncate">
                              {event.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-1.5 opacity-70 font-medium">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(event.startAt), "HH:mm")}
                                {event.endAt
                                  ? ` - ${format(parseISO(event.endAt), "HH:mm")}`
                                  : ""}
                              </div>

                              <Badge
                                variant="secondary"
                                className="rounded-full px-2 py-0 text-[10px]"
                              >
                                分類: {event.quadrantCategory ?? "-"}
                              </Badge>

                              <Badge
                                variant="outline"
                                className="rounded-full px-2 py-0 text-[10px]"
                              >
                                状態: {statusLabel}
                              </Badge>
                            </div>
                          </div>

                          <div className="w-10 h-10 bg-primary/[0.03] rounded-xl flex items-center justify-center shrink-0 border border-primary/[0.02]">
                            <span
                              className="text-sm"
                              title={quadrant?.label ?? "未分類"}
                            >
                              {quadrant?.icon ?? "?"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}

            {hasMore && (
              <div className="pt-4 pb-8 flex justify-center">
                <Button
                  variant="ghost"
                  onClick={() => fetchEvents(true)}
                  disabled={loadingMore}
                  className="rounded-full text-[10px] font-bold uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/5 px-8 gap-2"
                >
                  {loadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  さらに読み込む
                </Button>
              </div>
            )}

            {!hasMore && events.length > 0 && (
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/20 pb-10">
                すべての分類済み予定を表示しました
              </p>
            )}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}