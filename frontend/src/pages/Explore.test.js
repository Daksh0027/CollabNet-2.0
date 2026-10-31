import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Explore from "./Explore";

const mockNavigate = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

let mockUser = {
  user_id: "usr_elena",
  name: "Elena Brand",
  display_name: "Elena Brand",
  role: "company",
  verified: true,
};

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: (...args) => mockApiGet(...args),
    post: (...args) => mockApiPost(...args),
  },
  fmtMoney: (n) => "$" + Number(n || 0).toLocaleString(),
  fmtNum: (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n || 0)),
  fmtDate: () => "Dec 1, 2026",
}));

describe("Explore Page Serious Filters and Stats System", () => {
  let container = null;
  let root = null;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.ResizeObserver =
      window.ResizeObserver ||
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    window.HTMLElement.prototype.setPointerCapture =
      window.HTMLElement.prototype.setPointerCapture || function () {};
    window.HTMLElement.prototype.releasePointerCapture =
      window.HTMLElement.prototype.releasePointerCapture || function () {};
    window.HTMLElement.prototype.hasPointerCapture =
      window.HTMLElement.prototype.hasPointerCapture || function () { return false; };
    window.HTMLElement.prototype.scrollIntoView =
      window.HTMLElement.prototype.scrollIntoView || function () {};
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
    mockApiGet.mockReset();
    mockApiPost.mockReset();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it("renders company view with search input, filters toolbar, and creator cards with stats matrix", async () => {
    mockUser = {
      user_id: "usr_elena",
      name: "Elena Brand",
      display_name: "Elena Brand",
      role: "company",
      verified: true,
    };

    const mockCreators = [
      {
        user_id: "cr_maya",
        display_name: "Maya Chen",
        name: "Maya Chen",
        niche: "Tech & Gadgets",
        sub_niches: ["Smart Home", "AI"],
        bio: "Reviewing consumer tech gear.",
        location: "Austin, USA",
        verified: true,
        total_reach: 970000,
        top_followers: 850000,
        avg_views: 240000,
        engagement_rate: 4.8,
        connections_count: 14,
        completed_deals_count: 8,
        on_time_delivery_rate: 98.5,
        rating_avg: 4.9,
        rate_from: 800,
        content_types: ["Dedicated Long-Form Video", "Short-Form Video"],
        commercial_terms: ["100% Escrow Upfront", "1-Round Revision Guarantee"],
        platforms: [
          { platform: "YouTube", handle: "@mayabuilds", followers: 850000, posts_count: 312 },
          { platform: "Instagram", handle: "@maya.chen", followers: 120000, posts_count: 184 },
        ],
        projects: [
          {
            project_id: "prj_maya_1",
            title: "Smart Desk Tour 2026",
            bio: "Dev workstation ergonomics with motorized desk.",
            genre: "Tech & Gadgets",
            tags: ["Smart Home", "Hardware", "Ergonomics"],
            brand: "Autonomous AI",
            pinned: true,
          },
        ],
      },
    ];

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(
      ["creators", "", "all", "all", "all", "", "", "", "", "", "followers"],
      mockCreators
    );
    qc.setQueryData(["connections"], []);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Explore />
        </QueryClientProvider>
      );
    });

    // Check main elements
    expect(container.querySelector('[data-testid="explore-creators-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="creator-search-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="niche-filter-select"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="platform-filter-select"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sort-by-select"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="filter-toggle-button"]')).not.toBeNull();

    // Check creator card
    expect(container.querySelector('[data-testid="creator-card-cr_maya"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="creator-connections-cr_maya"]').textContent).toContain("14 connections");
    expect(container.querySelector('[data-testid="creator-stats-matrix-cr_maya"]')).not.toBeNull();
    expect(container.textContent).toContain("970K"); // Total reach
    expect(container.textContent).toContain("240K"); // Avg views
    expect(container.textContent).toContain("4.8%"); // Engagement
    expect(container.textContent).toContain("Dedicated Long-Form Video");
    expect(container.textContent).toContain("Smart Desk Tour 2026");
    expect(container.textContent).toContain("#Smart Home");
  });

  it("toggles advanced filters drawer when clicking the Filters button", async () => {
    mockUser = { user_id: "usr_elena", role: "company" };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(
      ["creators", "", "all", "all", "all", "", "", "", "", "", "followers"],
      []
    );
    qc.setQueryData(["connections"], []);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Explore />
        </QueryClientProvider>
      );
    });

    const filterBtn = container.querySelector('[data-testid="filter-toggle-button"]');
    expect(container.querySelector('[data-testid="min-views-slider"]')).toBeNull();

    // Click to open
    await act(async () => {
      filterBtn.click();
    });

    expect(container.querySelector('[data-testid="min-followers-slider"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="min-views-slider"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="min-engagement-slider"]')).not.toBeNull();
    // Public rate slider is cleanly removed
    expect(container.querySelector('[data-testid="max-rate-slider"]')).toBeNull();
  });

  it("renders creator view with campaign filters and sponsor reliability metrics", async () => {
    mockUser = {
      user_id: "cr_maya",
      name: "Maya Chen",
      display_name: "Maya Chen",
      role: "creator",
      verified: true,
    };

    const mockCampaigns = [
      {
        camp_id: "cmp_1",
        title: "Zero-Drop Runner Launch",
        brief: "Looking for runners and tech creators.",
        budget_min: 4000,
        budget_max: 12000,
        deadline: "2026-12-15",
        niches: ["Fitness", "Tech & Gadgets"],
        deliverables: ["1 YouTube dedicated review", "3 Instagram reels"],
        company: {
          user_id: "usr_elena",
          display_name: "Nova Athletics",
          industry: "Sportswear",
          employees: 240,
          connections_count: 15,
          total_spend: 42000,
        },
      },
    ];

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["campaigns", "", "all", "all"], mockCampaigns);
    qc.setQueryData(["applications"], []);

    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <Explore />
        </QueryClientProvider>
      );
    });

    expect(container.querySelector('[data-testid="explore-campaigns-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="campaign-search-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="campaign-niche-select"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="campaign-card-cmp_1"]')).not.toBeNull();
    expect(container.textContent).toContain("Nova Athletics");
    expect(container.textContent).toContain("15 connections");
    expect(container.textContent).toContain("Paid Campaign · Negotiable");
    // Public budget inputs are cleanly removed
    expect(container.querySelector('[data-testid="campaign-min-budget-input"]')).toBeNull();
    expect(container.querySelector('[data-testid="campaign-max-budget-input"]')).toBeNull();
  });
});
