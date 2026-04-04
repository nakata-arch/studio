"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { Quote } from "@/lib/types";

interface QuotePopupProps {
  trigger?: boolean;
}

export function QuotePopup({ trigger = true }: QuotePopupProps) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (trigger) {
      const now = new Date();
      const hour = now.getHours();
      
      // 時間帯の定義 (morning: 5-12, evening: 18-5, any: always)
      const currentTiming = 
        hour >= 5 && hour < 12 ? 'morning' : 
        hour >= 18 || hour < 5 ? 'evening' : 'any';

      // 1. 時間帯に合う名言を抽出 (anyは常に候補)
      const candidates = MOCK_QUOTES.filter(q => 
        q.displayTiming === 'any' || q.displayTiming === currentTiming
      );

      // 2. 直前に表示された名言を除外 (localStorageを利用)
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('last_quote_id') : null;
      const filtered = candidates.filter(q => q.id !== lastId);

      // 除外した結果、候補が空になった場合は除外前のリストから選ぶ
      const finalPool = filtered.length > 0 ? filtered : candidates;
      
      if (finalPool.length > 0) {
        const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
        setQuote(selected);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_quote_id', selected.id);
        }
        
        // 少し遅らせて表示することで、画面遷移時のチラつきを抑え、静かな登場を演出
        const timer = setTimeout(() => setOpen(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [trigger]);

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-none bg-white/90 backdrop-blur-xl max-w-[90vw] rounded-[2.5rem] p-10 shadow-2xl">
        <DialogTitle className="sr-only">今日のことば</DialogTitle>
        <div className="space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center">
              <Sparkles className="text-primary/40 h-6 w-6" />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-lg font-headline leading-relaxed italic text-foreground/70">
              "{quote.text}"
            </p>
          </div>
          <div className="pt-6 border-t border-primary/5 space-y-2">
            <p className="text-sm font-medium text-foreground/60">{quote.question}</p>
            <p className="text-[10px] text-muted-foreground opacity-50 uppercase tracking-widest">
              {quote.subMessage}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
