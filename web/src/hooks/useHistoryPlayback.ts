"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackPoint } from "@/lib/types";

export type PlaybackState = "idle" | "loading" | "ready" | "playing" | "paused";

interface HistoryPlayback {
  state: PlaybackState;
  currentIndex: number;
  totalFrames: number;
  currentTime: string | null;
  currentPositions: Record<string, TrackPoint>;
  currentTrails: Record<string, TrackPoint[]>;
  load: (positions: TrackPoint[]) => void;
  play: () => void;
  pause: () => void;
  seek: (index: number) => void;
  reset: () => void;
}

const PLAYBACK_DURATION_MS = 30_000;
const TARGET_FPS = 30;

function computeState(positions: TrackPoint[], upToIndex: number) {
  const currentPositions: Record<string, TrackPoint> = {};
  const currentTrails: Record<string, TrackPoint[]> = {};

  for (let i = 0; i <= upToIndex && i < positions.length; i++) {
    const tp = positions[i];
    currentPositions[tp.device_id] = tp;
    if (!currentTrails[tp.device_id]) currentTrails[tp.device_id] = [];
    currentTrails[tp.device_id].push(tp);
  }

  return { currentPositions, currentTrails };
}

export function useHistoryPlayback(): HistoryPlayback {
  const [state, setState] = useState<PlaybackState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const positionsRef = useRef<TrackPoint[]>([]);
  const rafRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const playingRef = useRef(false);

  const totalFrames = positionsRef.current.length;

  const currentTime =
    totalFrames > 0 && currentIndex < totalFrames
      ? positionsRef.current[currentIndex].received_at
      : null;

  const { currentPositions, currentTrails } = computeState(
    positionsRef.current,
    currentIndex,
  );

  const load = useCallback((positions: TrackPoint[]) => {
    cancelAnimationFrame(rafRef.current);
    playingRef.current = false;
    positionsRef.current = positions;
    setCurrentIndex(0);
    setState(positions.length > 0 ? "ready" : "idle");
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setState("paused");
  }, []);

  const seek = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, positionsRef.current.length - 1));
    setCurrentIndex(clamped);
  }, []);

  const play = useCallback(() => {
    const positions = positionsRef.current;
    if (positions.length === 0) return;

    playingRef.current = true;
    setState("playing");

    const frameDelay = PLAYBACK_DURATION_MS / positions.length;
    // How many frames to advance per animation step to keep ~TARGET_FPS
    const step = Math.max(1, Math.floor(1000 / TARGET_FPS / frameDelay));

    lastFrameTime.current = performance.now();

    const animate = (now: number) => {
      if (!playingRef.current) return;

      const elapsed = now - lastFrameTime.current;
      if (elapsed >= frameDelay * step) {
        lastFrameTime.current = now;
        setCurrentIndex((prev) => {
          const next = prev + step;
          if (next >= positions.length) {
            playingRef.current = false;
            setState("paused");
            return positions.length - 1;
          }
          return next;
        });
      }

      if (playingRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    playingRef.current = false;
    positionsRef.current = [];
    setCurrentIndex(0);
    setState("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      playingRef.current = false;
    };
  }, []);

  return {
    state,
    currentIndex,
    totalFrames,
    currentTime,
    currentPositions,
    currentTrails,
    load,
    play,
    pause,
    seek,
    reset,
  };
}
