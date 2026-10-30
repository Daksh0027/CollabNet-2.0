import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";
import { AccountSettingsTrigger } from "./AccountSettingsTrigger";

describe("AccountSettingsTrigger", () => {
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("uses the exact Account settings label and invokes its open handler", () => {
    const onOpen = jest.fn();
    const container = document.createElement("div");
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<AccountSettingsTrigger onClick={onOpen} />));

    const trigger = container.querySelector("button");
    expect(trigger.textContent).toBe("Account settings");
    expect(trigger.getAttribute("aria-label")).toBe("Account settings");
    expect(trigger.getAttribute("title")).toBe("Account settings");

    act(() => trigger.click());
    expect(onOpen).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
