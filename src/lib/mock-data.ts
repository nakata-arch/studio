
import { Quote } from "./types";

export const MOCK_QUOTES: Quote[] = [
  {
    id: '1',
    text: "時間とは、使い方の最も下手な者が、最も不足を訴えるものである。",
    author: "ジャン・ド・ラ・ブリュイエール",
    displayTiming: 'morning',
    subMessage: "今日という一日をどう奏でますか？",
    question: "最も大切にしたい予定は何ですか？"
  },
  {
    id: '2',
    text: "明日死ぬかのように生きよ。永遠に生きるかのように学べ。",
    author: "マハトマ・ガンジー",
    displayTiming: 'any',
    subMessage: "今この瞬間は二度と戻りません。",
    question: "今日、自分にとって本当に価値のあることに時間を使えましたか？"
  },
  {
    id: '3',
    text: "行動は、必ずしも幸福をもたらさないが、行動のないところに幸福はない。",
    author: "ベンジャミン・ディズレーリ",
    displayTiming: 'evening',
    subMessage: "お疲れ様でした。今日の一歩を祝福しましょう。",
    question: "明日への一歩、何を積み上げたいですか？"
  }
];

export const QUADRANTS = {
  urgent_important: { label: '緊急かつ重要', color: 'bg-red-500', hover: 'hover:bg-red-600', icon: '🔥' },
  not_urgent_important: { label: '重要だが緊急でない', color: 'bg-blue-500', hover: 'hover:bg-blue-600', icon: '🌟' },
  urgent_not_important: { label: '緊急だが重要でない', color: 'bg-yellow-500', hover: 'hover:bg-yellow-600', icon: '⚡' },
  not_urgent_not_important: { label: '緊急でも重要でもない', color: 'bg-gray-500', hover: 'hover:bg-gray-600', icon: '☁️' },
} as const;
