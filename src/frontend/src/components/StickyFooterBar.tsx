import type { ReactNode } from "react";

interface StickyFooterBarProps {
  children: ReactNode;
  className?: string;
}

export function StickyFooterBar({
  children,
  className = "",
}: StickyFooterBarProps) {
  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4 flex items-center justify-end gap-3 ${className}`}
    >
      {children}
    </div>
  );
}
