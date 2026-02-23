"use client";

import { useState } from "react";
import type { PlaybackState } from "@/hooks/useHistoryPlayback";

interface HistoryTabProps {
  state: PlaybackState;
  currentIndex: number;
  totalFrames: number;
  currentTime: string | null;
  onLoad: (date: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (index: number) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HistoryTab({
  state,
  currentIndex,
  totalFrames,
  currentTime,
  onLoad,
  onPlay,
  onPause,
  onSeek,
}: HistoryTabProps) {
  const [date, setDate] = useState(todayString);

  const canPlay = state === "ready" || state === "paused";
  const canPause = state === "playing";
  const showControls = state !== "idle" && state !== "loading";

  return (
    <div className="p-4 space-y-4">
      {/* Date picker row */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={todayString()}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
        <button
          onClick={() => onLoad(date)}
          disabled={state === "loading"}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state === "loading" ? "Loading..." : "Load"}
        </button>
      </div>

      {/* Playback controls */}
      {showControls && (
        <div className="space-y-3">
          {/* Play/pause + timestamp */}
          <div className="flex items-center gap-3">
            <button
              onClick={canPause ? onPause : onPlay}
              disabled={!canPlay && !canPause}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition-colors"
            >
              {canPause ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {currentTime ? formatTime(currentTime) : "--:--:--"}
              </div>
              <div className="text-xs text-gray-400">
                {totalFrames} positions
              </div>
            </div>
          </div>

          {/* Timeline scrubber */}
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentIndex}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
        </div>
      )}

      {/* Idle state hint */}
      {state === "idle" && (
        <p className="text-sm text-gray-400">
          Pick a date and tap Load to replay GPS data.
        </p>
      )}
    </div>
  );
}
