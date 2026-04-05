"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/firebase/client-provider";

export default function ReportPage() {
  const { user, isUserLoading } = useUser();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;

    // ▼ 未ログインでもダミーデータ表示
    if (!user) {
      setItems([
        {
          id: "demo1",
          title: "研修",
          date: "3/12 17:00",
        },
        {
          id: "demo2",
          title: "打ち合わせ",
          date: "3/13 10:00",
        },
      ]);
      setLoading(false);
      return;
    }

    // ▼ 本来の処理（Firestore）
    const fetchData = async () => {
      try {
        // TODO: Firestoreから取得
        setItems([]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isUserLoading]);

  // ▼ ローディング
  if (isUserLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-center">レポート</h1>

        {/* 未ログイン注意表示（軽く） */}
        {!user && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
            ※プレビュー表示（ログインなし）
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center text-slate-500">
            データがありません
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border bg-white p-4 shadow-sm"
            >
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-slate-500">{item.date}</div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}