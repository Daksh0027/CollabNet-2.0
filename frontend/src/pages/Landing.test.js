import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Landing from "./Landing";

const mockNavigate = jest.fn();
const mockPost = jest.fn();
const mockSetUser = jest.fn();
let mockAuth;

jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { post: (...args) => mockPost(...args) },
}));
// Exercise the route/auth bridge without loading Blend's browser-only bundle in Jest.
jest.mock("@/landing/LandingPage", () => ({
  __esModule: true,
  default: ({ onSignIn }) => <button onClick={onSignIn}>Sign in</button>,
}));

describe("Landing route integration", () => {
  let root;
  let container;

  beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: null, loading: false, setUser: mockSetUser };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render() {
    await act(async () => root.render(<Landing />));
  }

  async function click(label) {
    const button = [...document.querySelectorAll("button")].find((el) => el.textContent === label);
    expect(button).toBeDefined();
    await act(async () => button.click());
  }

  it("shows the new landing page without redirecting a visitor", async () => {
    await render();
    expect(container.textContent).toContain("Sign in");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each([
    [{ verified: true, role: "creator" }, "/app/overview"],
    [{ verified: false, role: "company" }, "/verify"],
    [{ verified: false, role: null }, "/onboarding"],
  ])("preserves the authenticated-user redirect to %s", async (user, path) => {
    mockAuth.user = user;
    await render();
    expect(mockNavigate).toHaveBeenCalledWith(path, { replace: true });
  });

  it.each([
    ["Creator demo", "creator"],
    ["Sponsor demo", "company"],
  ])("keeps %s sign-in connected to the existing API", async (label, role) => {
    const user = { user_id: "demo", role, verified: true };
    mockPost.mockResolvedValueOnce({ data: user });
    await render();
    await click("Sign in");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await click(label);
    expect(mockPost).toHaveBeenCalledWith("/auth/demo", { role });
    expect(mockSetUser).toHaveBeenCalledWith(user);
    expect(mockNavigate).toHaveBeenCalledWith("/app/overview");
  });

  it("shows a sign-in error inline without navigating", async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { detail: "Backend unavailable" } } });
    await render();
    await click("Sign in");
    await click("Creator demo");
    expect(document.querySelector('[role="alert"]').textContent).toBe("Backend unavailable");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
