import React from "react";

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function highlightText(text, query) {
  if (!query || !query.trim() || !text) return text;
  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="rounded bg-primary/15 px-0.5 font-semibold text-foreground"
        data-testid="search-highlight"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
