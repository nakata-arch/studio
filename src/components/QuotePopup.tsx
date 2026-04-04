
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
      const randomQuote = MOCK_QUOTES[Math.floor(Math.random() * MOCK_QUOTES.length)];
      setQuote(randomQuote);
      setOpen(true);
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
