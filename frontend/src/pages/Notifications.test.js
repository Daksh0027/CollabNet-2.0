import React from "react";
import ReactDOMServer from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Notifications from "./Notifications";

const mockNavigate = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: (...args) => mockApiGet(...args),
    post: (...args) => mockApiPost(...args),
  },
  timeAgo: () => "2m ago",
}));

describe("Notifications Page and Category Filtering", () => {
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  beforeEach(() => {
    mockNavigate.mockReset();
    mockApiGet.mockReset();
    mockApiPost.mockReset().mockResolvedValue({ data: { ok: true } });
  });

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

    qc.setQueryData(["notifications", "all"], {
      pages: [
        {
          ...mockNotifications,
          has_more: true,
          next_offset: 50,
        },
      ],
      pageParams: [0],
    });

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
    expect(html).toContain('class="notification-filter-list mb-6"');
    expect(html).toContain('class="notification-filter-button is-active"');

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
    expect(html).toContain('data-testid="load-more-notifications"');
    expect(html).toContain("Load more");
  });

  it("renders empty state appropriately when there are no items", () => {
    const qc = new QueryClient();
    qc.setQueryData(["notifications", "all"], {
      pages: [{
        notifications: [],
        counts: { all: 0, creators: 0, companies: 0 },
        unread: 0,
        has_more: false,
        next_offset: 0,
      }],
      pageParams: [0],
    });

    const html = ReactDOMServer.renderToString(
      <QueryClientProvider client={qc}>
        <Notifications />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="notifications-empty"');
    expect(html).toContain("All caught up");
  });

  it("filters when a category button is clicked", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        notifications: [],
        counts: { all: 0, creators: 0, companies: 0 },
        has_more: false,
        next_offset: 0,
      },
    });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["notifications", "all"], {
      pages: [{
        notifications: [],
        counts: { all: 0, creators: 0, companies: 0 },
        has_more: false,
        next_offset: 0,
      }],
      pageParams: [0],
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Notifications />
        </QueryClientProvider>
      );
    });
    await act(async () => {
      container.querySelector('[data-testid="filter-creators"]').click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="filter-creators"]').getAttribute("aria-pressed")).toBe("true");
    expect(mockApiGet).toHaveBeenCalledWith("/notifications", {
      params: { origin: "creators", offset: 0, limit: 50 },
    });

    await act(async () => root.unmount());
    qc.clear();
  });

  it("marks an unread notification as read and navigates to its assigned destination", async () => {
    const notification = {
      notif_id: "ntf_unread",
      type: "message",
      title: "New message",
      body: "A new message arrived",
      link: "/app/messages",
      origin: "creator",
      read: false,
      created_at: new Date().toISOString(),
    };
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["notifications", "all"], {
      pages: [{
        notifications: [notification],
        counts: { all: 1, creators: 1, companies: 0 },
        unread: 1,
        unread_counts: { all: 1, creators: 1, companies: 0 },
        has_more: false,
        next_offset: 1,
      }],
      pageParams: [0],
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Notifications />
        </QueryClientProvider>
      );
    });
    await act(async () => {
      container.querySelector('[data-testid="notification-ntf_unread"]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockNavigate).toHaveBeenCalledWith("/app/messages");
    expect(mockApiPost).toHaveBeenCalledWith("/notifications/ntf_unread/read");
    expect(
      qc.getQueryData(["notifications", "all"]).pages[0].notifications[0].read
    ).toBe(true);

    await act(async () => root.unmount());
    qc.clear();
  });

  it("loads the next notification page when Load more is clicked", async () => {
    const nextNotification = {
      notif_id: "ntf_page_2",
      type: "contract",
      title: "Contract update",
      body: "The agreement is ready",
      link: "/app/contracts",
      origin: "company",
      read: true,
      created_at: new Date().toISOString(),
    };
    mockApiGet.mockResolvedValue({
      data: {
        notifications: [nextNotification],
        counts: { all: 51, creators: 25, companies: 26 },
        has_more: false,
        next_offset: 51,
      },
    });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["notifications", "all"], {
      pages: [{
        notifications: [{
          notif_id: "ntf_page_1",
          type: "message",
          title: "First page",
          body: "Earlier notification",
          link: "/app/messages",
          origin: "creator",
          read: true,
          created_at: new Date().toISOString(),
        }],
        counts: { all: 51, creators: 25, companies: 26 },
        has_more: true,
        next_offset: 50,
      }],
      pageParams: [0],
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Notifications />
        </QueryClientProvider>
      );
    });
    await act(async () => {
      container.querySelector('[data-testid="load-more-notifications"]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockApiGet).toHaveBeenCalledWith("/notifications", {
      params: { offset: 50, limit: 50 },
    });
    expect(container.querySelector('[data-testid="notification-ntf_page_2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="load-more-notifications"]')).toBeNull();

    await act(async () => root.unmount());
    qc.clear();
  });
});
