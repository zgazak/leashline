"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SnapPoint = "collapsed" | "expanded" | "full";

const SNAP_RATIOS: Record<SnapPoint, number> = {
  collapsed: 0.33,
  expanded: 0.66,
  full: 0.95,
};

const TRANSITION = "height 300ms cubic-bezier(0.4, 0, 0.2, 1)";

export function useBottomSheet(initial: SnapPoint = "collapsed") {
  const [snapPoint, setSnapPoint] = useState<SnapPoint>(initial);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const isDragging = useRef(false);

  const getHeight = useCallback(
    (sp: SnapPoint) => window.innerHeight * SNAP_RATIOS[sp],
    [],
  );

  // Apply snap height on change
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = TRANSITION;
    el.style.height = `${getHeight(snapPoint)}px`;
  }, [snapPoint, getHeight]);

  // Recalc on resize
  useEffect(() => {
    const onResize = () => {
      const el = sheetRef.current;
      if (!el || isDragging.current) return;
      el.style.height = `${getHeight(snapPoint)}px`;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [snapPoint, getHeight]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartH.current = el.getBoundingClientRect().height;
    el.style.transition = "none";
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (!el || !isDragging.current) return;
    const dy = dragStartY.current - e.touches[0].clientY;
    const newH = Math.max(0, Math.min(window.innerHeight * 0.95, dragStartH.current + dy));
    el.style.height = `${newH}px`;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const el = sheetRef.current;
      if (!el) return;

      const endY = e.changedTouches[0].clientY;
      const velocity = dragStartY.current - endY; // positive = swiped up
      const currentH = el.getBoundingClientRect().height;
      const vh = window.innerHeight;

      // Determine nearest snap based on velocity + position
      let target: SnapPoint;
      if (Math.abs(velocity) > 80) {
        // Strong swipe — go in swipe direction
        if (velocity > 0) {
          target =
            currentH > vh * 0.5 ? "full" : "expanded";
        } else {
          target =
            currentH < vh * 0.5 ? "collapsed" : "expanded";
        }
      } else {
        // Weak swipe — snap to nearest
        const dists: [SnapPoint, number][] = (
          Object.entries(SNAP_RATIOS) as [SnapPoint, number][]
        ).map(([sp, r]) => [sp, Math.abs(currentH - vh * r)]);
        dists.sort((a, b) => a[1] - b[1]);
        target = dists[0][0];
      }

      el.style.transition = TRANSITION;
      el.style.height = `${getHeight(target)}px`;
      setSnapPoint(target);
    },
    [getHeight],
  );

  const handleProps = { onTouchStart, onTouchMove, onTouchEnd };

  return {
    snapPoint,
    setSnapPoint,
    sheetRef,
    snapHeights: SNAP_RATIOS,
    handleProps,
    getHeight,
  };
}
