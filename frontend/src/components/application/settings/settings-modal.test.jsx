import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";
import { SettingsModal } from "./settings-modal";

jest.mock("@/components/foundations/direction/direction", () => ({
  useDirection: () => "ltr",
}));

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      user_id: "creator-1",
      name: "Creator",
      display_name: "Creator",
      email: "creator@example.com",
      role: "creator",
      creator: {},
    },
    refresh: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock("react-router-dom", () => {
  const React = jest.requireActual("react");
  return {
    Link: ({ to, children, ...props }) => React.createElement("a", { href: to, ...props }, children),
    useNavigate: () => jest.fn(),
  };
});

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid="account-settings-trigger">
        Account settings
      </button>
      <SettingsModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe("SettingsModal", () => {
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("opens with the accessible Account settings title, switches tabs, closes with Escape, and restores focus", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<ModalHarness />);
    });

    const trigger = container.querySelector('[data-testid="account-settings-trigger"]');
    act(() => {
      trigger.focus();
      trigger.click();
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-labelledby")).toBe("account-settings-title");
    expect(document.getElementById("account-settings-title").textContent).toBe("Account settings");
    expect(document.body.style.overflow).toBe("hidden");

    await act(async () => {
      document.getElementById("settings-tab-profile").click();
    });
    expect(document.body.querySelector('[role="tabpanel"]').getAttribute("aria-labelledby"))
      .toBe("settings-tab-profile");

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);

    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps keyboard focus inside the modal", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => root.render(<ModalHarness />));
    act(() => container.querySelector('[data-testid="account-settings-trigger"]').click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));

    const dialog = document.body.querySelector('[role="dialog"]');
    act(() => dialog.focus());
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await act(async () => root.unmount());
    container.remove();
    document.body.style.overflow = "";
  });
});
