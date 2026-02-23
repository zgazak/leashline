"use client";

import type { ReactNode, Ref } from "react";
import type { SnapPoint } from "@/hooks/useBottomSheet";

export type TabId = "live" | "history" | "zones" | "settings";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "live", label: "Live" },
  { id: "history", label: "History" },
  { id: "zones", label: "Zones" },
  { id: "settings", label: "Settings" },
];

const TAB_COLORS: Record<TabId, { active: string; bg: string }> = {
  live: { active: "text-emerald-600 border-emerald-600", bg: "bg-emerald-50/60" },
  history: { active: "text-sky-600 border-sky-600", bg: "bg-sky-50/60" },
  zones: { active: "text-violet-600 border-violet-600", bg: "bg-violet-50/60" },
  settings: { active: "text-slate-600 border-slate-600", bg: "bg-slate-50/60" },
};

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
        {TABS.map((tab) => {
          const colors = TAB_COLORS[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? `${colors.active} border-b-2`
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className={`flex-1 overflow-y-auto overscroll-contain min-h-0 ${TAB_COLORS[activeTab].bg}`}>
        {children}
      </div>
    </div>
  );
}
