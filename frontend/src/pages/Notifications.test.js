import React from "react";
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
  let activeContainers = [];

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

  afterEach(async () => {
    for (const { root, qc } of activeContainers) {
      await act(async () => {
        root.unmount();
      });
      qc.clear();
    }
    activeContainers = [];
  });

  async function renderNotifications(initialData) {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });

    if (initialData) {
      qc.setQueryData(["notifications", "all"], {
        pages: [initialData],
        pageParams: [0],
      });
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Notifications />
        </QueryClientProvider>
      );
      await Promise.resolve();
    });

    activeContainers.push({ root, qc, container });
    return { container, qc };
  }

  it("renders category filters with All, Creators, Companies and origin badges", async () => {
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
      counts: { all: 1, creators: 0, companies: 1 },
      unread: 1,
      has_more: true,
      next_offset: 50,
    };

    const { container } = await renderNotifications(mockNotifications);

    // Filter controls are rendered
    expect(container.querySelector('[data-testid="notification-filters"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="filter-all"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="filter-creators"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="filter-companies"]')).not.toBeNull();

    // Counts are visible
    expect(container.querySelector('[data-testid="filter-count-all"]')?.textContent).toContain("1");
    expect(container.querySelector('[data-testid="filter-count-creators"]')?.textContent).toContain("0");
    expect(container.querySelector('[data-testid="filter-count-companies"]')?.textContent).toContain("1");

    // Notification items and badges
    expect(container.querySelector('[data-testid="notification-ntf_1"]')).toBeNull();
    expect(container.querySelector('[data-testid="origin-badge-creator"]')).toBeNull();
    expect(container.querySelector('[data-testid="notification-ntf_2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="origin-badge-company"]')).not.toBeNull();

    // Pagination button
    expect(container.querySelector('[data-testid="load-more-notifications"]')).not.toBeNull();
  });

  it("renders empty state appropriately when there are no items", async () => {
    const { container } = await renderNotifications({
      notifications: [],
      counts: { all: 0, creators: 0, companies: 0 },
      unread: 0,
      has_more: false,
      next_offset: 0,
    });

    expect(container.querySelector('[data-testid="notifications-empty"]')).not.toBeNull();
    expect(container.textContent).toContain("All caught up");
  });

  it("marks unread notifications as read in the backend when the page is opened", async () => {
    const notification = {
      notif_id: "ntf_auto_read",
      type: "connection",
      title: "New connection",
      body: "A connection request arrived",
      origin: "creator",
      read: false,
      created_at: new Date().toISOString(),
    };

    const { qc } = await renderNotifications({
      notifications: [notification],
      counts: { all: 1, creators: 1, companies: 0 },
      unread: 1,
      unread_counts: { all: 1, creators: 1, companies: 0 },
      has_more: false,
      next_offset: 1,
    });

    expect(mockApiPost).toHaveBeenCalledWith("/notifications/read");
    const cached = qc.getQueryData(["notifications", "all"]);
    expect(cached.pages[0].notifications[0].read).toBe(true);
    expect(cached.pages[0].unread).toBe(0);
    expect(cached.pages[0].unread_counts).toEqual({ all: 0, creators: 0, companies: 0 });
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

    const { container } = await renderNotifications({
      notifications: [],
      counts: { all: 0, creators: 0, companies: 0 },
      has_more: false,
      next_offset: 0,
    });

    await act(async () => {
      container.querySelector('[data-testid="filter-creators"]').click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="filter-creators"]').getAttribute("aria-pressed")).toBe("true");
    expect(mockApiGet).toHaveBeenCalledWith("/notifications", {
      params: { origin: "creators", offset: 0, limit: 50 },
    });
  });

  it("marks an unread notification as read and navigates to its assigned destination", async () => {
    const notification = {
      notif_id: "ntf_unread",
      type: "connection",
      title: "New connection",
      body: "A connection request arrived",
      link: "/app/connections",
      origin: "creator",
      read: false,
      created_at: new Date().toISOString(),
    };

    const { container, qc } = await renderNotifications({
      notifications: [notification],
      counts: { all: 1, creators: 1, companies: 0 },
      unread: 1,
      unread_counts: { all: 1, creators: 1, companies: 0 },
      has_more: false,
      next_offset: 1,
    });

    await act(async () => {
      container.querySelector('[data-testid="notification-ntf_unread"]').click();
      await Promise.resolve();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/app/connections");
    expect(mockApiPost).toHaveBeenCalledWith("/notifications/ntf_unread/read");
    expect(
      qc.getQueryData(["notifications", "all"]).pages[0].notifications[0].read
    ).toBe(true);
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

    const { container } = await renderNotifications({
      notifications: [
        {
          notif_id: "ntf_page_1",
          type: "contract",
          title: "First page",
          body: "Earlier notification",
          link: "/app/messages",
          origin: "creator",
          read: true,
          created_at: new Date().toISOString(),
        },
      ],
      counts: { all: 51, creators: 25, companies: 26 },
      has_more: true,
      next_offset: 50,
    });

    await act(async () => {
      container.querySelector('[data-testid="load-more-notifications"]').click();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockApiGet).toHaveBeenCalledWith("/notifications", {
      params: { offset: 50, limit: 50 },
    });
    expect(container.querySelector('[data-testid="notification-ntf_page_2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="load-more-notifications"]')).toBeNull();
  });
});
