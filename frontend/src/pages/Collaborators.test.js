import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Collaborators from "./Collaborators";

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock("react-router-dom", () => ({
  Navigate: () => null,
}));

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      user_id: "creator_me",
      role: "creator",
      display_name: "Creator Me",
    },
  }),
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: (...args) => mockApiGet(...args),
    post: (...args) => mockApiPost(...args),
    delete: (...args) => mockApiDelete(...args),
  },
  fmtNum: (value) => String(value || 0),
}));

describe("Collaborators page", () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.ResizeObserver = window.ResizeObserver || class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockApiGet.mockReset();
    mockApiPost.mockReset().mockResolvedValue({ data: { ok: true } });
    mockApiDelete.mockReset().mockResolvedValue({ data: { ok: true } });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows a real creator directory and opens the collaboration request form", async () => {
    const filters = {
      search: "",
      niche: "all",
      platform: "all",
      contentType: "all",
      location: "",
      tag: "",
      minF: 0,
      maxF: 0,
      minViews: 0,
      maxViews: 0,
      minEngagement: 0,
      maxEngagement: 0,
      minConnections: 0,
      sortBy: "followers",
    };
    const creator = {
      user_id: "creator_jules",
      display_name: "Jules Rivera",
      verified: true,
      niche: "Travel",
      location: "Lisbon, Portugal",
      bio: "Travel video creator.",
      platforms: [{ platform: "YouTube", followers: 12000 }],
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["collaborators", filters], {
      pages: [[creator]],
      pageParams: [0],
    });
    queryClient.setQueryData(["saved-creators"], []);
    queryClient.setQueryData(["my-creator-connections"], []);
    queryClient.setQueryData(["collaboration-requests"], []);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Collaborators />
        </QueryClientProvider>
      );
    });

    expect(container.querySelector('[data-testid="collaborators-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="collaborator-card-creator_jules"]')).not.toBeNull();
    expect(container.textContent).toContain("Jules Rivera");

    await act(async () => {
      container.querySelector('[data-testid="request-collaboration-creator_jules"]').click();
    });
    expect(document.querySelector('[data-testid="collaboration-request-dialog"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="collaboration-title"]')).not.toBeNull();
  });
});
