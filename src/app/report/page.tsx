"use client";

import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  id: string;
  title: string;
  source?: string;
  timeLabel?: string;
};

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      console.log("report:init");
      setLoading(true);
      setErrorMessage("");

      try {
        // まずは必ず画面を出すためのダミーデータ
        // 後で実データ取得に差し替えます
        const mockItems: ReportItem[] = [
          {
            id: "1",
            title: "研修",
            source: "Google Calendar",
            timeLabel: "3/12 17:00",
          },
          {
            id: "2",
            title: "打ち合わせ",
            source: "Google Calendar",
            timeLabel: "3/13 10:00",
          },
          {
            id: "3",
            title: "資料作成",
            source: "Google Calendar",
            timeLabel: "3/14 14:00",
          },
        ];

        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!active) return;

        console.log("report:data-ready", mockItems);
        setItems(mockItems);
      } catch (error) {
        console.error("report:error", error);
        if (!active) return;
        setErrorMessage("レポートの読み込みに失敗しました。");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const count = useMemo(() => items.length, [items]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <div className="text-sm text-slate-400">スワイプで報告： {count}</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">レポート</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            予定を確認して、完了・未完了を整理します。
          </p>
        </header>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500" />
            <div className="text-sm text-slate-500">レポートを読み込んでいます...</div>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm leading-7 text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && items.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            表示できる予定がありません。
          </div>
        )}

        {!loading && !errorMessage && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {item.source || "Google Calendar"}
                </div>

                <div className="text-2xl font-semibold text-slate-700">
                  {item.title}
                </div>

                {item.timeLabel && (
                  <div className="mt-5 text-sm text-slate-400">{item.timeLabel}</div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    onClick={() => console.log("report:not-done", item.id)}
                  >
                    未完了
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                    onClick={() => console.log("report:done", item.id)}
                  >
                    完了
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}