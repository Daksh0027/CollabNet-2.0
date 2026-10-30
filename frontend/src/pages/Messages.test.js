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

describe("In-Chat Search & Highlighting", () => {
  it("highlights search terms inside message text", () => {
    const { highlightText } = require("../lib/chatMedia");
    const html = ReactDOMServer.renderToStaticMarkup(
      <div>{highlightText("Here is the contract draft agreement", "contract")}</div>
    );
    expect(html).toContain('data-testid="search-highlight"');
    expect(html).toContain("contract");
  });

  it("handles case-insensitive and empty queries safely", () => {
    const { highlightText } = require("../lib/chatMedia");
    expect(highlightText("Hello world", "")).toBe("Hello world");
    const html = ReactDOMServer.renderToStaticMarkup(
      <div>{highlightText("Hello World", "hello")}</div>
    );
    expect(html).toContain('data-testid="search-highlight"');
  });
});

describe("Voice Note & Media Utilities", () => {
  it("formats audio duration into mm:ss format", () => {
    const { formatDuration } = require("../lib/chatMedia");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(120)).toBe("2:00");
  });

  it("formats file sizes cleanly", () => {
    const { formatFileSize } = require("../components/chat/AttachmentPreview");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(2621440)).toBe("2.5 MB");
  });

  it("renders voice note player with play button and waveform", () => {
    const { VoiceNotePlayer } = require("../components/chat/VoiceNotePlayer");
    const html = ReactDOMServer.renderToStaticMarkup(
      <VoiceNotePlayer src="data:audio/webm;base64,GkXf..." duration={12} mine={true} />
    );
    expect(html).toContain('data-testid="voice-note-player"');
    expect(html).toContain('data-testid="voice-play-button"');
    expect(html).toContain('data-testid="voice-seek-slider"');
    expect(html).toContain("0:12");
  });

  it("renders document attachment cards with download link", () => {
    const { AttachmentPreview } = require("../components/chat/AttachmentPreview");
    const attachments = [
      {
        name: "Agreement_Draft.pdf",
        size: 524288,
        type: "application/pdf",
        data_url: "data:application/pdf;base64,JVBE...",
      },
    ];
    const html = ReactDOMServer.renderToStaticMarkup(
      <AttachmentPreview attachments={attachments} mine={false} />
    );
    expect(html).toContain('data-testid="attachment-doc-0"');
    expect(html).toContain("Agreement_Draft.pdf");
    expect(html).toContain("512 KB");
    expect(html).toContain('data-testid="download-attachment-button"');
  });

  it("renders image attachments cleanly", () => {
    const { AttachmentPreview } = require("../components/chat/AttachmentPreview");
    const attachments = [
      {
        name: "product_photo.png",
        size: 204800,
        type: "image/png",
        data_url: "data:image/png;base64,iVBORw0KGgo...",
      },
    ];
    const html = ReactDOMServer.renderToStaticMarkup(
      <AttachmentPreview attachments={attachments} mine={true} />
    );
    expect(html).toContain('data-testid="attachment-image-0"');
    expect(html).toContain("product_photo.png");
  });
});
