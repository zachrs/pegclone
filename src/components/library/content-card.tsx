"use client";

import { Button } from "@/components/ui/button";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
  url?: string;
  isFavorite?: boolean;
  onSendSingle?: (item: CartItem) => void;
}

export function ContentCard({
  id,
  title,
  source,
  type,
  url,
  isFavorite,
  onSendSingle,
}: ContentCardProps) {
  const { toggleItem, hasItem } = useSendCart();
  const { toggleFavorite } = useLibraryStore();
  const isSelected = hasItem(id);
  const cartItem: CartItem = { id, title, source, type };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-lg border-2 transition-colors",
        isSelected
          ? "border-orange-400 bg-orange-100"
          : "border-orange-200 bg-orange-50 hover:border-orange-300"
      )}
    >
      {/* Source label */}
      <div className="rounded-t-md bg-orange-200/60 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {source}
        </span>
      </div>

      {/* Title area */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
        {type === "pdf" && (
          <span className="mt-2 self-end text-xs text-muted-foreground">
            PDF
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-around border-t border-orange-200 px-1 py-1.5">
        <ActionButton
          label="Select"
          active={isSelected}
          onClick={() => toggleItem(cartItem)}
        >
          <SelectIcon active={isSelected} />
        </ActionButton>
        <ActionButton
          label="View"
          onClick={() => {
            if (url) window.open(url, "_blank");
          }}
        >
          <ViewIcon />
        </ActionButton>
        <ActionButton
          label="Favorite"
          active={isFavorite}
          onClick={() => toggleFavorite(id)}
        >
          <HeartIcon active={isFavorite} />
        </ActionButton>
        <ActionButton
          label="Send"
          onClick={() => onSendSingle?.(cartItem)}
        >
          <SendIcon />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex h-auto flex-col gap-0.5 px-2 py-1 text-xs hover:bg-orange-100"
      onClick={onClick}
    >
      {children}
      <span className={cn("text-[10px]", active && "font-semibold")}>
        {label}
      </span>
    </Button>
  );
}

function SelectIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect
        x="2"
        y="2"
        width="14"
        height="14"
        rx="2"
        stroke={active ? "#16a34a" : "#6b7280"}
        strokeWidth="1.5"
        fill={active ? "#16a34a" : "none"}
      />
      {active && (
        <path d="M5 9l2.5 2.5L13 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6" stroke="#d97706" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2.5" fill="#d97706" />
    </svg>
  );
}

function HeartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 15s-6-4.35-6-7.5A3.5 3.5 0 019 4.96 3.5 3.5 0 0115 7.5C15 10.65 9 15 9 15z"
        fill={active ? "#dc2626" : "none"}
        stroke="#dc2626"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="#16a34a" strokeWidth="1.5" />
      <path d="M2 5.5l7 4.5 7-4.5" stroke="#16a34a" strokeWidth="1.5" />
    </svg>
  );
}
