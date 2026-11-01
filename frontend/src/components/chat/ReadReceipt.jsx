import React from "react";

/**
 * Compares two ISO timestamps (with potential differing microseconds/timezones).
 * Returns true if readTimestamp is equal to or later than messageTimestamp.
 */
export function isTimestampRead(readTimestamp, messageTimestamp) {
  if (!readTimestamp || !messageTimestamp) return false;
  try {
    const rTime = new Date(readTimestamp).getTime();
    const mTime = new Date(messageTimestamp).getTime();
    return !isNaN(rTime) && !isNaN(mTime) && rTime >= mTime;
  } catch {
    return false;
  }
}

/**
 * WhatsApp-style read receipt icon:
 * - "sent": single grey checkmark
 * - "delivered": double grey checkmark
 * - "read": double blue checkmark
 */
export function DoubleCheck({ status = "read", className = "" }) {
  if (status === "sent") {
    return (
      <svg
        viewBox="0 0 16 16"
        className={`inline-block h-3.5 w-3.5 shrink-0 ${className || "text-muted-foreground/60"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Sent"
        data-testid="check-sent"
      >
        <path d="M2.5 8.5l3.5 3.5L13.5 4" />
      </svg>
    );
  }

  const isRead = status === "read";
  const hasCustomColor = className.includes("text-");
  const colorClass = hasCustomColor ? "" : (isRead ? "text-primary" : "text-muted-foreground/60");

  return (
    <span
      className={`inline-flex items-center -space-x-1.5 shrink-0 ${colorClass} ${className}`}
      title={isRead ? "Read" : "Delivered"}
      data-testid={isRead ? "check-read" : "check-delivered"}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 8.5l3.5 3.5L13.5 4" />
      </svg>
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 8.5l3.5 3.5L13.5 4" />
      </svg>
    </span>
  );
}
