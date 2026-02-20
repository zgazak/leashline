"use client";

import type { ReactNode, Ref } from "react";
import type { SnapPoint } from "@/hooks/useBottomSheet";

export type TabId = "live" | "dogs" | "zones" | "settings";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "live", label: "Live" },
  { id: "dogs", label: "Dogs" },
  { id: "zones", label: "Zones" },
  { id: "settings", label: "\u2699" },
];

interface BottomSheetProps {
  sheetRef: Ref<HTMLDivElement>;
  handleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  snapPoint: SnapPoint;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

export default function BottomSheet({
  sheetRef,
  handleProps,
  snapPoint,
  activeTab,
  onTabChange,
  children,
}: BottomSheetProps) {
  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.15)] z-30 flex flex-col ${
        snapPoint === "full" ? "" : "rounded-t-2xl"
      }`}
      style={{ height: "33vh" }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center py-2 cursor-grab touch-none shrink-0"
        {...handleProps}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 shrink-0 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        {children}
      </div>
    </div>
  );
}
