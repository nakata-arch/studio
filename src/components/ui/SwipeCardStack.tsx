"use client";

import { AnimatePresence, motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useMemo } from "react";

type CardItem = {
  id: string;
  title: string;
  source?: string;
  timeLabel?: string;
};

type SwipeCardStackProps = {
  items: CardItem[];
  currentIndex: number;
  onSwipe: (direction: "left" | "right", item: CardItem) => void;
};

const SWIPE_THRESHOLD = 110;

export default function SwipeCardStack({
  items,
  currentIndex,
  onSwipe,
}: SwipeCardStackProps) {
  const visibleCards = useMemo(() => {
    return items.slice(currentIndex, currentIndex + 3);
  }, [items, currentIndex]);

  if (!visibleCards.length) {
    return (
      <div className="flex h-[540px] items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-400 shadow-sm">
        表示できるカードがありません
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[380px]">
      {visibleCards
        .map((item, stackIndex) => {
          const isActive = stackIndex === 0;
          const zIndex = 30 - stackIndex;
          const scale = isActive ? 1 : 1 - stackIndex * 0.04;
          const translateY = stackIndex * 14;

          return (
            <SwipeCard
              key={`${item.id}-${currentIndex}-${stackIndex}`}
              item={item}
              isActive={isActive}
              zIndex={zIndex}
              scale={scale}
              translateY={translateY}
              onSwipe={onSwipe}
            />
          );
        })
        .reverse()}
    </div>
  );
}

type SwipeCardProps = {
  item: CardItem;
  isActive: boolean;
  zIndex: number;
  scale: number;
  translateY: number;
  onSwipe: (direction: "left" | "right", item: CardItem) => void;
};

function SwipeCard({
  item,
  isActive,
  zIndex,
  scale,
  translateY,
  onSwipe,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-12, 0, 12]);
  const opacity = useTransform(x, [-260, -180, 0, 180, 260], [0.4, 0.8, 1, 0.8, 0.4]);

  useEffect(() => {
    x.set(0);
  }, [item.id, x]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isActive) return;

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    const shouldSwipeLeft = offsetX < -SWIPE_THRESHOLD || velocityX < -700;
    const shouldSwipeRight = offsetX > SWIPE_THRESHOLD || velocityX > 700;

    if (shouldSwipeLeft) {
      onSwipe("left", item);
      return;
    }

    if (shouldSwipeRight) {
      onSwipe("right", item);
      return;
    }

    x.set(0);
  };

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        initial={{ scale, y: translateY, opacity: 1 }}
        animate={{
          scale,
          y: translateY,
          opacity: 1,
          x: 0,
        }}
        exit={{
          opacity: 0,
          x: 0,
          transition: { duration: 0.18 },
        }}
        drag={isActive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{
          x: isActive ? x : 0,
          rotate: isActive ? rotate : 0,
          opacity: isActive ? opacity : 1,
          zIndex,
          pointerEvents: isActive ? "auto" : "none",
          touchAction: isActive ? "pan-y" : "auto",
        }}
        className="absolute inset-0 rounded-[32px] border border-slate-100 bg-white p-8 shadow-[0_16px_48px_rgba(15,23,42,0.12)]"
      >
        <div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          <span>Google Calendar</span>
        </div>

        <div className="text-4xl font-semibold leading-tight text-slate-700">
          {item.title}
        </div>

        {item.timeLabel && (
          <div className="mt-10 text-base text-slate-400">
            {item.timeLabel}
          </div>
        )}

        {item.source && (
          <div className="mt-3 text-sm text-slate-300">
            {item.source}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}