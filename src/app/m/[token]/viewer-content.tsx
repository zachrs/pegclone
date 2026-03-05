"use client";

import { useState } from "react";

interface ViewerMessageData {
  id: string;
  accessToken: string;
  expired: boolean;
  org: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string | null;
    phone: string | null;
    website: string | null;
  };
  provider: {
    name: string;
    title: string | null;
    photoUrl: string | null;
  };
  contentItems: Array<{
    id: string;
    title: string;
    type: "pdf" | "link";
    url: string;
  }>;
}

export function ViewerContent({
  message,
}: {
  message: ViewerMessageData;
}) {
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());
  const color = message.org.primaryColor;
  const accent = message.org.secondaryColor ?? color;
  const [optedOut, setOptedOut] = useState(false);

  const handleView = async (itemId: string, url: string, type: "pdf" | "link") => {
    setViewedItems((prev) => new Set(prev).add(itemId));

    // Log item_viewed event via API
    try {
      await fetch("/api/viewer/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: message.accessToken,
          contentItemId: itemId,
          eventType: "item_viewed",
        }),
      });
    } catch {
      // Non-critical, don't block the user
    }

    // Fix #22: Use PDF proxy for PDFs (token-gated access), direct URL for links
    if (type === "pdf") {
      const proxyUrl = `/api/viewer/pdf?token=${encodeURIComponent(message.accessToken)}&itemId=${encodeURIComponent(itemId)}`;
      window.open(proxyUrl, "_blank", "noopener");
    } else {
      window.open(url, "_blank", "noopener");
    }
  };

  const handleOptOut = async () => {
    try {
      await fetch("/api/viewer/opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: message.accessToken,
        }),
      });
      setOptedOut(true);
    } catch {
      // Fallback
      setOptedOut(true);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg">
        {/* Org header */}
        <header
          className="px-5 py-6 text-white"
          style={{ backgroundColor: color }}
        >
          <div className="flex items-center gap-3">
            {message.org.logoUrl ? (
              <img
                src={message.org.logoUrl}
                alt={message.org.name}
                className="h-10 w-10 rounded-lg bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold">
                {message.org.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold">{message.org.name}</h1>
              {message.org.phone && (
                <p className="text-sm text-white/80">{message.org.phone}</p>
              )}
            </div>
          </div>
        </header>

        {/* Provider block */}
        <div className="bg-white px-5 py-4 shadow-sm" style={{ borderLeft: `3px solid ${accent}` }}>
          <div className="flex items-center gap-3">
            {message.provider.photoUrl ? (
              <img
                src={message.provider.photoUrl}
                alt={message.provider.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white text-lg font-semibold"
                style={{ backgroundColor: color }}
              >
                {message.provider.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {message.provider.name}
              </p>
              {message.provider.title && (
                <p className="text-sm text-gray-500">
                  {message.provider.title}
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {message.provider.name.split(" ")[0]} has shared the following
            health information with you.
          </p>
        </div>

        {/* Content items */}
        <div className="mt-3 space-y-2 px-5">
          {message.contentItems.map((item) => {
            const viewed = viewedItems.has(item.id);
            return (
              <button
                key={item.id}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
                onClick={() => handleView(item.id, item.url, item.type)}
              >
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: viewed ? "#dcfce7" : color + "15",
                  }}
                >
                  {viewed ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 10l3.5 3.5L15 7"
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : item.type === "pdf" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 2h6l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
                        stroke={color}
                        strokeWidth="1.5"
                      />
                      <path d="M12 2v4h4" stroke={color} strokeWidth="1.5" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 4H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M11 3h6v6M17 3L9 11"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {viewed
                      ? "Viewed — tap to view again"
                      : item.type === "pdf"
                        ? "PDF Document"
                        : "Web Link"}
                  </p>
                </div>

                {/* Arrow */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 text-gray-500"
                  aria-hidden="true"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-8 border-t bg-white px-5 py-6 text-center text-xs text-gray-500">
          <p>
            Sent by{" "}
            <span className="font-medium text-gray-500">
              {message.org.name}
            </span>
          </p>
          {message.org.website && (
            <p className="mt-1">
              <a
                href={message.org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: accent }}
              >
                {message.org.website.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
          {message.org.phone && (
            <p className="mt-1">
              <a href={`tel:${message.org.phone}`} className="underline">
                {message.org.phone}
              </a>
            </p>
          )}
          <div className="mt-4 border-t pt-4">
            {optedOut ? (
              <p className="text-green-600 font-medium">
                You have been unsubscribed. You will no longer receive messages from {message.org.name}.
              </p>
            ) : (
              <p className="text-gray-400">
                If you no longer wish to receive these messages, reply <strong>STOP</strong> to the text message or{" "}
                <button
                  className="underline transition-colors hover:text-gray-600"
                  style={{ color: accent }}
                  onClick={handleOptOut}
                >
                  click here to unsubscribe
                </button>.
              </p>
            )}
          </div>
          <p className="mt-4 text-gray-400">
            Powered by Patient Education Genius
          </p>
        </footer>
      </div>
    </main>
  );
}
