import { Quote } from "./types";

export const MOCK_QUOTES: Quote[] = [
  {
    id: "1",
    text: "時間は命そのものです。",
    author: "アーノルド・ベネット",
    displayTiming: "morning",
    subMessage: "今日は、どんな時間を過ごしたいですか？",
    question: "本当に大切にしたいことは何ですか？"
  },
  {
    id: "2",
    text: "立ち止まることは、後退ではありません。次の一歩のための準備です。",
    author: "不詳",
    displayTiming: "any",
    subMessage: "少し、深呼吸をしてみませんか。",
    question: "今の気持ちは、どんな状態ですか？"
  },
  {
    id: "3",
    text: "人生は短い。しかし、急ぐ必要はない。",
    author: "マハトマ・ガンジー",
    displayTiming: "evening",
    subMessage: "一日、お疲れさまでした。",
    question: "今日の時間の使い方に、納得できていますか？"
  }
];

export const QUADRANTS = {
  urgent_important: {
    label: "緊急かつ重要",
    color: "bg-rose-100 text-rose-700",
    hover: "hover:bg-rose-200",
    icon: "🚨"
  },
  not_urgent_important: {
    label: "緊急ではないが重要",
    color: "bg-indigo-100 text-indigo-700",
    hover: "hover:bg-indigo-200",
    icon: "✨"
  },
  urgent_not_important: {
    label: "緊急だが重要ではない",
    color: "bg-amber-100 text-amber-700",
    hover: "hover:bg-amber-200",
    icon: "⏳"
  },
  not_urgent_not_important: {
    label: "緊急でも重要でもない",
    color: "bg-slate-100 text-slate-700",
    hover: "hover:bg-slate-200",
    icon: "☁️"
  }
} as const;