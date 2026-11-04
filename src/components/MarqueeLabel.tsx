import React, { useEffect, useRef, useState } from 'react';

interface MarqueeLabelProps {
  text: string;
  /** Layout and typography classes for the label container. */
  className?: string;
}

/**
 * Single-line label that scrolls horizontally like a banner only when its text
 * is wider than the available space; shorter labels stay static and centered.
 * The duplicated copy used by the scroll is hidden from assistive tech.
 */
export const MarqueeLabel: React.FC<MarqueeLabelProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    setIsOverflowing(measure.getBoundingClientRect().width > container.clientWidth + 1);
  }, [text]);

  return (
    <span ref={containerRef} className={`relative block overflow-hidden ${className}`}>
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {text}
      </span>
      {isOverflowing ? (
        <span className="flex">
          <span className="marquee-banner-item">{text}</span>
          <span aria-hidden="true" className="marquee-banner-item">
            {text}
          </span>
        </span>
      ) : (
        <span className="block truncate text-center">{text}</span>
      )}
    </span>
  );
};
