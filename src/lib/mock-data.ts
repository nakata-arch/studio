import { Quote } from "./types";

export const MOCK_QUOTES: Quote[] = [
  {
    id: "1",
    text: "時間は命そのものです。時間は、あなたが持つ唯一の真の財産です。",
    author: "アーノルド・ベネット",
    displayTiming: "evening",
    subMessage: "一日の終わりに、静かに自分をねぎらいましょう。",
    question: "今日、あなたの命（時間）は、何のために輝きましたか？"
  },
  {
    id: "2",
    text: "あなたの時間は限られています。他人の人生を生きることで、その時間を無駄にしてはいけません。",
    author: "スティーブ・ジョブズ",
    displayTiming: "any",
    subMessage: "誰かの期待ではなく、あなたの心の声に耳を傾けてみましょう。",
    question: "今、あなたは「自分のための時間」を過ごせていますか？"
  },
  {
    id: "3",
    text: "最も重要なことは、最も重要なことを、最も重要なままにしておくことだ。",
    author: "スティーブン・R・コヴィー",
    displayTiming: "morning",
    subMessage: "今日、これだけは大切にしたいと思うことを一つだけ選んでみましょう。",
    question: "あなたにとって、今日一番「大切なこと」は何ですか？"
  },
  {
    id: "4",
    text: "忙しいということは、しばしば生産的であることの「言い訳」に使われる。",
    author: "ティム・フェリス",
    displayTiming: "any",
    subMessage: "ただ動いているのと、目的地に向かっているのは違います。",
    question: "その忙しさは、あなたをどこへ運んでくれますか？"
  },
  {
    id: "5",
    text: "何をしないかを決めることは、何をするかを決めることと同じくらい重要だ。",
    author: "スティーブ・ジョブズ",
    displayTiming: "morning",
    subMessage: "選ばない勇気が、本当に大切なものを守ってくれます。",
    question: "今日、あえて「やらない」と決めることはありますか？"
  },
  {
    id: "6",
    text: "ゆっくり進むことを恐れるな。ただ立ち止まることだけを恐れなさい。",
    author: "中国のことわざ",
    displayTiming: "morning",
    subMessage: "歩みの速さは人それぞれ。あなたらしい速度で大丈夫です。",
    question: "今日は、昨日より一歩だけ、心の向く方へ踏み出してみませんか？"
  },
  {
    id: "7",
    text: "人生には、ただスピードを上げるよりも、もっと大切なことがある。",
    author: "マハトマ・ガンジー",
    displayTiming: "evening",
    subMessage: "焦らなくても、時間はあなたのそばにあります。",
    question: "今日は、ゆっくりとした呼吸で過ごせる時間がありましたか？"
  },
  {
    id: "8",
    text: "昨日より少し良ければ、それでいい。完璧である必要はありません。",
    author: "不詳",
    displayTiming: "evening",
    subMessage: "小さな変化を、自分自身で認めてあげましょう。",
    question: "今日、少しだけ「自分を褒めてあげたい」ことは何ですか？"
  },
  {
    id: "9",
    text: "休息は怠惰ではありません。それは、次に進むための大切な準備です。",
    author: "ジョン・ラボック",
    displayTiming: "any",
    subMessage: "休むことも、立派なタスクの一つです。",
    question: "心と体を休める時間を、自分に許してあげていますか？"
  },
  {
    id: "10",
    text: "今日という日は、残りの人生の最初の日。いつだって、新しく始められます。",
    author: "不詳",
    displayTiming: "morning",
    subMessage: "昨日の後悔は昨日に置いて、新しい朝を迎えましょう。",
    question: "新しい一日、どんな「小さな幸せ」を予定に入れますか？"
  }
];

export const QUADRANTS = {
  urgent_important: {
    label: "緊急・重要",
    icon: "🔥",
    color: "bg-rose-50 text-rose-700",
    hover: "hover:bg-rose-100"
  },
  not_urgent_important: {
    label: "緊急でない・重要",
    icon: "🌱",
    color: "bg-indigo-50 text-indigo-700",
    hover: "hover:bg-indigo-100"
  },
  urgent_not_important: {
    label: "緊急・重要でない",
    icon: "⚡",
    color: "bg-amber-50 text-amber-700",
    hover: "hover:bg-amber-100"
  },
  not_urgent_not_important: {
    label: "緊急でない・重要でない",
    icon: "☁️",
    color: "bg-slate-50 text-slate-700",
    hover: "hover:bg-slate-100"
  }
};
