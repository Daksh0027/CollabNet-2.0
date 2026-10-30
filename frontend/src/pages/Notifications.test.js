import React from "react";
import ReactDOMServer from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Notifications from "./Notifications";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

describe("Notifications Page and Category Filtering", () => {
  it("renders category filters with All, Creators, Companies and origin badges", () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const mockNotifications = {
      notifications: [
        {
          notif_id: "ntf_1",
          type: "message",
          title: "New message from Maya Chen",
          body: "Here is the signed brief document",
          origin: "creator",
          read: true,
          created_at: new Date().toISOString(),
        },
        {
          notif_id: "ntf_2",
          type: "connection",
          title: "Marcus Feld (Brewhaus Coffee) wants to connect",
          body: "Interested in co-sponsoring",
          origin: "company",
          read: false,
          created_at: new Date().toISOString(),
        },
      ],
      counts: {
        all: 2,
        creators: 1,
        companies: 1,
      },
      unread: 1,
    };

    qc.setQueryData(["notifications", "all"], mockNotifications);

    const html = ReactDOMServer.renderToString(
      <QueryClientProvider client={qc}>
        <Notifications />
      </QueryClientProvider>
    );

    // Verify filter buttons exist
    expect(html).toContain('data-testid="notification-filters"');
    expect(html).toContain('data-testid="filter-all"');
    expect(html).toContain('data-testid="filter-creators"');
    expect(html).toContain('data-testid="filter-companies"');

    // Verify counts are displayed
    expect(html).toContain('data-testid="filter-count-all"');
    expect(html).toContain('data-testid="filter-count-creators"');
    expect(html).toContain('data-testid="filter-count-companies"');

    // Verify notification cards and origin tags
    expect(html).toContain('data-testid="notification-ntf_1"');
    expect(html).toContain('data-testid="origin-badge-creator"');
    expect(html).toContain("Creator");

    expect(html).toContain('data-testid="notification-ntf_2"');
    expect(html).toContain('data-testid="origin-badge-company"');
    expect(html).toContain("Company");
  });

  it("renders empty state appropriately when there are no items", () => {
    const qc = new QueryClient();
    qc.setQueryData(["notifications", "all"], {
      notifications: [],
      counts: { all: 0, creators: 0, companies: 0 },
      unread: 0,
    });

    const html = ReactDOMServer.renderToString(
      <QueryClientProvider client={qc}>
        <Notifications />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="notifications-empty"');
    expect(html).toContain("All caught up");
  });
});
