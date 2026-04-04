import { Quote } from "./types";

export const MOCK_QUOTES: Quote[] = [
  {
    id: "1",
    text: "時間は命そのものです。",
    author: "アーノルド・ベネット",
    displayTiming: "evening",
    subMessage: "少しだけ立ち止まって振り返ってみましょう。",
    question: "今日の時間は、何に使われましたか？"
  },
  {
    id: "2",
    text: "あなたの時間は有限です。",
    author: "スティーブ・ジョブズ",
    displayTiming: "any",
    subMessage: "限りある一日を、丁寧に使っていきましょう。",
    question: "今の時間の使い方は、本当に大切なことにつながっていますか？"
  },
  {
    id: "3",
    text: "最も重要なことは、最も重要なことを最も重要なままにしておくことだ。",
    author: "スティーブン-R-コヴィー",
    displayTiming: "morning",
    subMessage: "今日の優先順位を静かに見直してみましょう。",
    question: "大切なことを、後回しにしていませんか？"
  },
  {
    id: "4",
    text: "忙しいということは、生産的であることを意味しない。",
    author: "ティム・フェリス",
    displayTiming: "any",
    subMessage: "量よりも意味に目を向けてみましょう。",
    question: "その忙しさは、本当に必要なものですか？"
  },
  {
    id: "5",
    text: "大切なのは、何をするかではなく、何をしないかである。",
    author: "スティーブ・ジョブズ",
    displayTiming: "morning",
    subMessage: "選ばないことも、大切な選択です。",
    question: "手放してよいことはありませんか？"
  },
  {
    id: "6",
    text: "ゆっくり進むことを恐れるな。ただ立ち止まることを恐れよ。",
    author: "中国のことわざ",
    displayTiming: "morning",
    subMessage: "少しずつでも、歩みは力になります。",
    question: "今日は小さくても前に進めましたか？"
  },
  {
    id: "7",
    text: "人生は短い。しかし、急ぐ必要はない。",
    author: "マハトマ・ガンジー",
    displayTiming: "evening",
    subMessage: "落ち着いて選ぶことも前進です。",
    question: "焦りが判断を曇らせていませんか？"
  },
  {
    id: "8",
    text: "昨日より少し良ければ、それでいい。",
    author: "不詳",
    displayTiming: "evening",
    subMessage: "大きな変化より、小さな積み重ねを大切にしましょう。",
    question: "昨日より少しだけ整えられたことはありますか？"
  },
  {
    id: "9",
    text: "すべてを変える必要はない。少しずつでいい。",
    author: "不詳",
    displayTiming: "morning",
    subMessage: "無理のない変化が、続く力になります。",
    question: "今日は何を少し変えてみますか？"
  },
  {
    id: "10",
    text: "立ち止まって振り返ることも、前に進む一歩です。",
    author: "不詳",
    displayTiming: "evening",
    subMessage: "見直す時間も、未来のための時間です。",
    question: "今日の振り返りから、何に気づけましたか？"
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
