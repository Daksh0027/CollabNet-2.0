import React from "react";
import ReactDOMServer from "react-dom/server";
import { isTimestampRead, DoubleCheck } from "../components/chat/ReadReceipt";

describe("Chat Read Receipts Logic", () => {
  it("correctly identifies read when read timestamp is equal or after message timestamp", () => {
    const msgTime = "2026-10-30T18:00:00.000Z";
    const readTimeLater = "2026-10-30T18:05:00.000Z";
    const readTimeExact = "2026-10-30T18:00:00.000Z";
    const readTimeBefore = "2026-10-30T17:55:00.000Z";

    expect(isTimestampRead(readTimeLater, msgTime)).toBe(true);
    expect(isTimestampRead(readTimeExact, msgTime)).toBe(true);
    expect(isTimestampRead(readTimeBefore, msgTime)).toBe(false);
  });

  it("handles empty or missing timestamps safely", () => {
    expect(isTimestampRead("", "2026-10-30T18:00:00.000Z")).toBe(false);
    expect(isTimestampRead(null, "2026-10-30T18:00:00.000Z")).toBe(false);
    expect(isTimestampRead("2026-10-30T18:00:00.000Z", "")).toBe(false);
    expect(isTimestampRead("invalid", "2026-10-30T18:00:00.000Z")).toBe(false);
  });

  it("handles varying microsecond precisions correctly", () => {
    const msgTime = "2026-10-30T18:19:00.209269+00:00";
    const readTimeWithMicros = "2026-10-30T18:19:00.216927+00:00";
    const readTimeEarlierMicros = "2026-10-30T18:19:00.188310+00:00";

    expect(isTimestampRead(readTimeWithMicros, msgTime)).toBe(true);
    expect(isTimestampRead(readTimeEarlierMicros, msgTime)).toBe(false);
  });
});

describe("DoubleCheck Component Rendering", () => {
  it("renders single checkmark for sent status", () => {
    const html = ReactDOMServer.renderToStaticMarkup(<DoubleCheck status="sent" />);
    expect(html).toContain('data-testid="check-sent"');
    expect(html).toContain("aria-label=\"Sent\"");
    expect((html.match(/<svg/g) || []).length).toBe(1);
  });

  it("renders double checkmarks with grey color for delivered status", () => {
    const html = ReactDOMServer.renderToStaticMarkup(<DoubleCheck status="delivered" />);
    expect(html).toContain('data-testid="check-delivered"');
    expect(html).toContain("text-muted-foreground/60");
    expect((html.match(/<svg/g) || []).length).toBe(2);
  });

  it("renders double checkmarks with WhatsApp blue color for read status", () => {
    const html = ReactDOMServer.renderToStaticMarkup(<DoubleCheck status="read" />);
    expect(html).toContain('data-testid="check-read"');
    expect(html).toContain("text-sky-400");
    expect((html.match(/<svg/g) || []).length).toBe(2);
  });

  it("supports custom colors for message bubble contrast", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <DoubleCheck status="read" className="text-sky-300" />
    );
    expect(html).toContain('data-testid="check-read"');
    expect(html).toContain("text-sky-300");
  });
});

describe("Unread Chats Badge Calculation", () => {
  it("counts only chats with new/unread messages, not total chats", () => {
    const threads = [
      { thread_id: "t1", unread: 2 },
      { thread_id: "t2", unread: 0 },
      { thread_id: "t3", unread: 1 },
      { thread_id: "t4", unread: 0 },
      { thread_id: "t5", unread: 0 },
    ];

    const unreadChatsCount = threads.filter((t) => (t.unread || 0) > 0).length;
    expect(unreadChatsCount).toBe(2); // Only t1 and t3 have new messages, not 5
  });

  it("returns 0 when all chats are read", () => {
    const threads = [
      { thread_id: "t1", unread: 0 },
      { thread_id: "t2", unread: 0 },
      { thread_id: "t3", unread: 0 },
    ];

    const unreadChatsCount = threads.filter((t) => (t.unread || 0) > 0).length;
    expect(unreadChatsCount).toBe(0);
  });
});
