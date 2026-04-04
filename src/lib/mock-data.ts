import { Quote } from "./types";

export const QUADRANTS = {
  urgent_important: {
    icon: '🔥',
    label: '緊急・重要',
    color: 'bg-rose-50 text-rose-600',
    hover: 'hover:bg-rose-100',
  },
  not_urgent_important: {
    icon: '🌱',
    label: '緊急ではない・重要',
    color: 'bg-indigo-50 text-indigo-600',
    hover: 'hover:bg-indigo-100',
  },
  urgent_not_important: {
    icon: '🔔',
    label: '緊急・重要ではない',
    color: 'bg-amber-50 text-amber-600',
    hover: 'hover:bg-amber-100',
  },
  not_urgent_not_important: {
    icon: '☁️',
    label: '緊急ではない・重要ではない',
    color: 'bg-slate-50 text-slate-600',
    hover: 'hover:bg-slate-100',
  },
};

export const MOCK_QUOTES: Quote[] = [
  {
    id: '1',
    text: "時間は、私たちが最も欲しがるものですが、最も無駄に使ってしまうものでもあります。",
    author: "ウィリアム・ペン",
    displayTiming: 'any',
    subMessage: "今この瞬間、何に心を向けていますか？",
    question: "本当に大切にしたいことは何ですか？"
  },
  {
    id: '2',
    text: "時間は命そのものです。時間を無駄にすることは、人生を無駄にすることです。",
    author: "アーノルド・ベネット",
    displayTiming: 'morning',
    subMessage: "新しい一日の始まりに、少しだけ深呼吸を。",
    question: "今日は、どんな時間を過ごしたいですか？"
  },
  {
    id: '3',
    text: "あなたの時間は限られている。だから、誰か他の人の人生を生きることで無駄にしてはいけない。",
    author: "スティーブ・ジョブズ",
    displayTiming: 'morning',
    subMessage: "あなた自身の心の声に、耳を澄ませてみてください。",
    question: "あなたにとって、一番自然な自分でいられる時間はいつですか？"
  },
  {
    id: '4',
    text: "一日は、一生の縮図である。",
    author: "アーサー・ショーペンハウアー",
    displayTiming: 'evening',
    subMessage: "今日という小さな一生が、もうすぐ幕を閉じます。",
    question: "今日の時間の使い方に、納得できていますか？"
  },
  {
    id: '5',
    text: "今日という日は、残りの人生の最初の日である。",
    author: "チャールズ・ディードリッヒ",
    displayTiming: 'morning',
    subMessage: "まっさらなキャンバスに、何を描きましょうか。",
    question: "今日、新しく始めたい小さなことはありますか？"
  },
  {
    id: '6',
    text: "立ち止まることは、後退ではありません。次の一歩のための準備です。",
    author: "不詳",
    displayTiming: 'any',
    subMessage: "休息もまた、大切な予定の一つです。",
    question: "今の気持ちは、どんな状態ですか？"
  },
  {
    id: '7',
    text: "最も忙しい人が、最も多くの時間を持つ。",
    author: "アレクサンドル・デュマ",
    displayTiming: 'any',
    subMessage: "時間は「作る」ものではなく、「見出す」ものかもしれません。",
    question: "忙しさの中に、自分を失っていませんか？"
  },
  {
    id: '8',
    text: "何事も、成し遂げるまでは不可能に見えるものだ。",
    author: "ネルソン・マンデラ",
    displayTiming: 'any',
    subMessage: "一歩ずつ、静かに進んでいきましょう。",
    question: "今日、少しだけ前に進めたことは何ですか？"
  },
  {
    id: '9',
    text: "完璧である必要はない。ただ、誠実であればいい。",
    author: "不詳",
    displayTiming: 'evening',
    subMessage: "できなかった自分も、優しく受け入れてあげてください。",
    question: "今日、自分に「ありがとう」と言えることは何ですか？"
  },
  {
    id: '10',
    text: "人生は短い。しかし、急ぐ必要はない。",
    author: "マハトマ・ガンジー",
    displayTiming: 'any',
    subMessage: "あなたのペースで、あなたの道を歩んでください。",
    question: "今、心に余裕はありますか？"
  }
];
