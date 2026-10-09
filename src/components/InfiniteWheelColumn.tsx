import React, { useRef, useEffect, useCallback, useMemo } from 'react';

interface WheelItem {
  label: string;
  value: number;
}

interface InfiniteWheelColumnProps {
  items: WheelItem[];
  selectedValue: number;
  onChange: (value: number) => void;
  unitLabel?: string;
  itemHeight?: number;
  visibleCount?: number;
}

const REPEAT_COUNT = 9; // Number of cycles for infinite scrolling
const MIDDLE_CYCLE = Math.floor(REPEAT_COUNT / 2);

export const InfiniteWheelColumn: React.FC<InfiniteWheelColumnProps> = ({
  items,
  selectedValue,
  onChange,
  unitLabel,
  itemHeight = 44,
  visibleCount = 5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);
  const lastVibratedValueRef = useRef<number | null>(null);

  const totalCycleItems = items.length;
  const containerHeight = itemHeight * visibleCount;
  const paddingY = (containerHeight - itemHeight) / 2;

  // Flatten repeated items array for seamless infinite looping
  const repeatedItems = useMemo(() => {
    const list: { key: string; item: WheelItem; originalIndex: number }[] = [];
    for (let c = 0; c < REPEAT_COUNT; c++) {
      for (let i = 0; i < totalCycleItems; i++) {
        list.push({
          key: `cycle-${c}-idx-${i}`,
          item: items[i],
          originalIndex: i,
        });
      }
    }
    return list;
  }, [items, totalCycleItems]);

  // Find index of selected value in the middle cycle
  const getMiddleIndex = useCallback(
    (val: number) => {
      const idx = items.findIndex((it) => it.value === val);
      const safeIdx = idx >= 0 ? idx : 0;
      return MIDDLE_CYCLE * totalCycleItems + safeIdx;
    },
    [items, totalCycleItems]
  );

  // Scroll to a specific cycle item index
  const scrollToIndex = useCallback(
    (index: number, smooth = false) => {
      if (!containerRef.current) return;
      const targetScrollTop = index * itemHeight;
      if (smooth) {
        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      } else {
        containerRef.current.scrollTop = targetScrollTop;
      }
    },
    [itemHeight]
  );

  // Initial scroll positioning
  useEffect(() => {
    const initialIndex = getMiddleIndex(selectedValue);
    scrollToIndex(initialIndex, false);
  }, []);

  // Sync when selectedValue changes externally (e.g. from preset buttons)
  useEffect(() => {
    if (isUserScrollingRef.current) return;
    if (!containerRef.current) return;

    const currentScrollTop = containerRef.current.scrollTop;
    const currentAbsoluteIdx = Math.round(currentScrollTop / itemHeight);
    const currentItem = repeatedItems[currentAbsoluteIdx]?.item;

    if (!currentItem || currentItem.value !== selectedValue) {
      const targetIdx = getMiddleIndex(selectedValue);
      scrollToIndex(targetIdx, true);
    }
  }, [selectedValue, getMiddleIndex, scrollToIndex, repeatedItems, itemHeight]);

  // Keep scroll in the safe middle zone to allow infinite loop in both directions
  const recenterIfNearEdge = useCallback(
    (currentAbsoluteIdx: number) => {
      if (!containerRef.current) return;
      const currentCycle = Math.floor(currentAbsoluteIdx / totalCycleItems);

      // If we drifted too far from the middle cycle (cycles 0,1 or 7,8)
      if (currentCycle <= 1 || currentCycle >= REPEAT_COUNT - 2) {
        const itemInCycle = currentAbsoluteIdx % totalCycleItems;
        const recenteredIdx = MIDDLE_CYCLE * totalCycleItems + itemInCycle;
        containerRef.current.scrollTop = recenteredIdx * itemHeight;
      }
    },
    [totalCycleItems, itemHeight]
  );

  // Handle scroll events with snapping and modulo wrap
  const handleScroll = () => {
    if (!containerRef.current) return;
    isUserScrollingRef.current = true;

    const scrollTop = containerRef.current.scrollTop;
    const rawIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(repeatedItems.length - 1, rawIndex));
    const matched = repeatedItems[clampedIndex]?.item;

    if (matched && matched.value !== selectedValue) {
      // Soft haptic feedback when scrolling through items
      if (lastVibratedValueRef.current !== matched.value) {
        lastVibratedValueRef.current = matched.value;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(8);
          } catch {}
        }
      }
      onChange(matched.value);
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      recenterIfNearEdge(clampedIndex);
    }, 180);
  };

  // Click on any item directly to rotate and select it
  const handleItemClick = (absoluteIdx: number, val: number) => {
    onChange(val);
    scrollToIndex(absoluteIdx, true);
  };

  return (
    <div
      className="relative flex-1 select-none flex flex-col items-center justify-center overflow-hidden"
      style={{ height: `${containerHeight}px` }}
    >
      {/* Top & Bottom gradient mask for 3D barrel depth */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1C1C1E] via-[#1C1C1E]/80 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/80 to-transparent pointer-events-none z-10" />

      {/* Center Apple-style highlight lens bar */}
      <div
        className="absolute inset-x-2 pointer-events-none rounded-xl bg-white/[0.07] border-y border-[#00FF87]/30 shadow-[0_0_15px_rgba(0,255,135,0.1)] z-0"
        style={{
          top: `${paddingY}px`,
          height: `${itemHeight}px`,
        }}
      >
        {unitLabel && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black uppercase tracking-wider text-[#00FF87]/80">
            {unitLabel}
          </span>
        )}
      </div>

      {/* Scrollable wheel list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll overflow-x-hidden scrollbar-none snap-y snap-mandatory relative z-5"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: `${paddingY}px`,
          paddingBottom: `${paddingY}px`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {repeatedItems.map((itemObj, absIdx) => {
          const isSelected = itemObj.item.value === selectedValue;

          return (
            <div
              key={itemObj.key}
              onClick={() => handleItemClick(absIdx, itemObj.item.value)}
              className={`flex items-center justify-center cursor-pointer transition-all duration-150 snap-center ${
                isSelected
                  ? 'text-white font-black text-2xl sm:text-3xl scale-105'
                  : 'text-zinc-500 hover:text-zinc-300 font-semibold text-lg sm:text-xl scale-95 opacity-40'
              }`}
              style={{
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center',
              }}
            >
              <span className="font-mono tracking-tight">{itemObj.item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
