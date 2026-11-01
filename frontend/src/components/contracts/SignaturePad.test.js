import React from "react";
import ReactDOMServer from "react-dom/server";
import { SignaturePad, strokesToPath } from "./SignaturePad";

describe("SignaturePad", () => {
  it("renders a labelled SVG signature field and helper text", () => {
    const html = ReactDOMServer.renderToStaticMarkup(<SignaturePad />);

    expect(html).toContain('aria-label="Empty signature pad"');
    expect(html).toContain("Sign here");
    expect(html).toContain("Use your mouse, touch, or stylus to sign.");
    expect(html).not.toContain('data-testid="clear-signature-button"');
  });

  it("converts captured strokes into standalone SVG path data", () => {
    const path = strokesToPath([
      [{ x: 10, y: 20 }, { x: 35, y: 40 }],
      [{ x: 80, y: 100 }, { x: 90, y: 110 }],
    ]);

    expect(path).toBe("M 10 20 L 35 40 M 80 100 L 90 110");
    expect(strokesToPath([[{ x: 1, y: 2 }]])).toBe("");
  });
});
