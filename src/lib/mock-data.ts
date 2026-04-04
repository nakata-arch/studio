import { Quote } from "./types";

export const MOCK_QUOTES: Quote[] = [
  {
    id: '1',
    text: "時間を大切にするということは、自分自身を大切にするということです。",
    author: "心に響く言葉",
    displayTiming: 'morning',
    subMessage: "今日は、どんな時間を過ごしたいですか？",
    question: "一番大切にしたいことは何ですか？"
  },
  {
    id: '2',
    text: "立ち止まることは、後退ではありません。次の一歩のための静かな準備です。",
    author: "静かな智慧",
    displayTiming: 'any',
    subMessage: "少し、深呼吸をしてみませんか。",
    question: "今の気持ちは、どんな色をしていますか？"
  },
  {
    id: '3',
    text: "完璧でなくても大丈夫。今日という日を終えられたことを、まずは喜びましょう。",
    author: "明日のための休息",
    displayTiming: 'evening',
    subMessage: "一日、本当にお疲れ様でした。",
    question: "今日、心が動いた瞬間はありましたか？"
  }
];

export const QUADRANTS = {
  urgent_important: { label: '緊急かつ重要', color: 'bg-rose-100 text-rose-700', hover: 'hover:bg-rose-200', icon: '🍃' },
  not_urgent_important: { label: '緊急ではないが重要', color: 'bg-indigo-100 text-indigo-700', hover: 'hover:bg-indigo-200', icon: '✨' },
  urgent_not_important: { label: '緊急だが重要ではない', color: 'bg-amber-100 text-amber-700', hover: 'hover:bg-amber-200', icon: '⌛' },
  not_urgent_not_important: { label: '緊急でも重要でもない', color: 'bg-slate-100 text-slate-700', hover: 'hover:bg-slate-200', icon: '☁️' },
} as const;
