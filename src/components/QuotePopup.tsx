
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
      
      // 時間帯の判定: 0〜11時 → morning, 12〜23時 → evening
      const currentTiming = (hour >= 0 && hour < 12) ? 'morning' : 'evening';

      // 1. 時間帯に合う名言を抽出 (現在の時間帯 または 'any')
      const candidates = MOCK_QUOTES.filter(q => 
        q.displayTiming === 'any' || q.displayTiming === currentTiming
      );

      // 2. 直前に表示された名言を除外 (localStorageを利用)
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('last_quote_id') : null;
      let filtered = candidates.filter(q => q.id !== lastId);

      // 3. 候補が空になった場合は、除外前のリスト（candidates）に戻す
      const finalPool = filtered.length > 0 ? filtered : candidates;
      
      if (finalPool.length > 0) {
        const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
        setQuote(selected);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_quote_id', selected.id);
        }
        
        // ページ遷移直後ではなく、一呼吸置いてから表示
        const timer = setTimeout(() => setOpen(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [trigger]);

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-none bg-white/95 backdrop-blur-2xl max-w-[88vw] sm:max-w-[400px] rounded-[2.5rem] p-10 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
        <DialogTitle className="sr-only">今日のことば</DialogTitle>
        
        <div className="flex flex-col items-center space-y-8 py-4">
          <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
            <Sparkles className="text-primary/30 h-5 w-5" />
          </div>

          <div className="space-y-6 text-center">
            <blockquote className="space-y-4">
              <p className="text-xl font-headline leading-relaxed italic text-foreground/80 tracking-wide px-2">
                "{quote.text}"
              </p>
              <cite className="block text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] not-italic">
                — {quote.author}
              </cite>
            </blockquote>
          </div>

          <div className="w-12 h-px bg-primary/10" />

          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-foreground/60 leading-relaxed px-4">
              {quote.question}
            </p>
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
              {quote.subMessage}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
