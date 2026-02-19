"use client";

import type { ReactNode } from "react";

export default function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="w-80 h-full bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
      {children}
    </aside>
  );
}
