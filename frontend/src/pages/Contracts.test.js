import React from "react";
import ReactDOMServer from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Contracts from "./Contracts";

const mockApiGet = jest.fn();

jest.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams("deal=deal_1")],
}));

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { user_id: "company_1", display_name: "Nova Athletics", role: "company" },
  }),
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: (...args) => mockApiGet(...args),
    post: jest.fn(),
  },
  fmtMoney: (value) => `$${Number(value).toLocaleString()}`,
  fmtDate: () => "Nov 1, 2026",
  timeAgo: () => "just now",
  STATUS_STYLES: {},
}));

describe("Contracts workspace", () => {
  it("renders an expanded full-page workspace instead of a compact deal dialog", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["contracts"], [{
      deal_id: "deal_1",
      title: "Launch Week Sprint",
      status: "in_review",
      funding_status: "unfunded",
      compensation: 9500,
      start_date: "2026-11-01",
      end_date: "2026-11-20",
      deliverables: ["Review video", "Three reels"],
      agreement_text: "The current contract terms.",
      current_version: 2,
      versions: [
        { version: 1, version_id: "v1", change_summary: "Original agreement", created_at: "2026-10-01" },
        { version: 2, version_id: "v2", change_summary: "Updated delivery dates", created_at: "2026-10-10" },
      ],
      change_requests: [],
      signatures: {
        company: { signed: false, name: "", signed_at: "" },
        creator: { signed: false, name: "", signed_at: "" },
      },
      my_role: "company",
      other_role: "creator",
      other: { user_id: "creator_1", display_name: "Maya Chen", role: "creator", verified: true },
      reviews: [],
    }]);

    const html = ReactDOMServer.renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <Contracts />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="deal-room-workspace"');
    expect(html).toContain('data-testid="close-deal-workspace"');
    expect(html).toContain("Contract review workspace");
    expect(html).toContain("Review history");
    expect(html).toContain("Version 2");
    expect(html).not.toContain('data-testid="deal-room-dialog"');
  });
});
