import React from "react";

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function getEmojiOnlyCount(text) {
  const value = text?.trim();
  if (!value || !/^[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3\p{Emoji_Modifier}\s]+$/u.test(value)) {
    return 0;
  }

  const emojiText = value.replace(/\s+/g, "");
  const segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
  const count = segmenter
    ? Array.from(segmenter.segment(emojiText)).length
    : (emojiText.match(/\p{Extended_Pictographic}|\p{Regional_Indicator}/gu) || []).length;

  return count > 0 && count <= 3 ? count : 0;
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
