import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { BlendProvider } from "./provider";
import { useThemeMode } from "./themeMode";

const mockThemeProps = [];

jest.mock("@juspay/blend-design-system", () => ({
  Theme: { LIGHT: "light", DARK: "dark" },
  ThemeProvider: ({ children, theme, componentTokens }) => {
    mockThemeProps.push({ theme, componentTokens });
    return children;
  },
}));
jest.mock("./tokens", () => ({
  blendComponentTokens: {
    light: { tokens: "light" },
    dark: { tokens: "dark" },
  },
  blendFoundationTokens: {},
  themeVars: (mode) => ({ "--landing-test-mode": mode }),
}));

function Toggle() {
  const { mode, toggleMode } = useThemeMode();
  return <button onClick={toggleMode}>{mode}</button>;
}

describe("Landing theme isolation", () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    mockThemeProps.length = 0;
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    document.documentElement.dataset.theme = "dashboard";
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete document.documentElement.dataset.theme;
    localStorage.clear();
  });

  it("keeps token variables and theme changes inside the landing wrapper", () => {
    act(() =>
      root.render(
        <BlendProvider>
          <Toggle />
        </BlendProvider>,
      ),
    );
    const wrapper = container.querySelector(".blend-landing");
    expect(wrapper.dataset.theme).toBe("light");
    act(() => container.querySelector("button").click());
    expect(wrapper.dataset.theme).toBe("dark");
    expect(wrapper.style.getPropertyValue("--landing-test-mode")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dashboard");
    expect(
      document.documentElement.style.getPropertyValue("--landing-test-mode"),
    ).toBe("");
    expect(localStorage.getItem("collabonet-theme")).toBe("dark");
  });

  it("hands Blend the component tokens that match the active theme", () => {
    act(() =>
      root.render(
        <BlendProvider>
          <Toggle />
        </BlendProvider>,
      ),
    );
    expect(mockThemeProps.at(-1)).toEqual({
      theme: "light",
      componentTokens: { tokens: "light" },
    });
    act(() => container.querySelector("button").click());
    expect(mockThemeProps.at(-1)).toEqual({
      theme: "dark",
      componentTokens: { tokens: "dark" },
    });
  });

  it("removes document-level landing scrolling styles on unmount", () => {
    act(() =>
      root.render(
        <BlendProvider>
          <Toggle />
        </BlendProvider>,
      ),
    );
    expect(
      document.documentElement.classList.contains("blend-landing-active"),
    ).toBe(true);
    act(() => root.render(null));
    expect(
      document.documentElement.classList.contains("blend-landing-active"),
    ).toBe(false);
  });

  it("restores a saved landing theme without changing the app theme", () => {
    localStorage.setItem("collabonet-theme", "dark");
    act(() =>
      root.render(
        <BlendProvider>
          <Toggle />
        </BlendProvider>,
      ),
    );
    expect(container.querySelector(".blend-landing").dataset.theme).toBe(
      "dark",
    );
    expect(document.documentElement.dataset.theme).toBe("dashboard");
  });
});
