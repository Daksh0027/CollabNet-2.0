import {
  BRAND,
  blendComponentTokens,
  blendFoundationTokens,
  contrastRatio,
  mix,
  palettes,
  themeVars,
} from "./tokens";

// Blend's browser bundle cannot load in Jest; tokens.ts only reads plain token
// values, so a minimal copy of the ones it uses is enough. Red / green are the
// real Blend 0.0.38 scales because the semantic colors must stay unmodified.
jest.mock("@juspay/blend-design-system", () => {
  const range = (keys, value) => Object.fromEntries(keys.map((k) => [k, value(k)]));
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const scale = (values) => Object.fromEntries(steps.map((s, i) => [s, values[i]]));
  const group = (fontSize, lineHeight) => ({ fontSize, lineHeight, letterSpacing: 0 });
  return {
    FOUNDATION_THEME: {
      colors: {
        gray: { 0: "#FFFFFF", 950: "#0E121B" },
        primary: scale(Array(11).fill("#2B7FFF")),
        purple: scale(Array(11).fill("#AD46FF")),
        orange: scale(Array(11).fill("#FF6900")),
        yellow: scale(Array(11).fill("#EFB100")),
        red: scale([
          "#FEF2F2", "#FFE2E2", "#FFC9C9", "#FFA2A2", "#FF6467", "#FB2C36",
          "#E7000B", "#C10007", "#9F0712", "#82181A", "#460809",
        ]),
        green: scale([
          "#F0FDF4", "#DCFCE7", "#B9F8CF", "#7BF1A8", "#00D492", "#00C951",
          "#00A63E", "#008236", "#016630", "#0D542B", "#052E16",
        ]),
      },
      unit: new Proxy({}, { get: (_, key) => `${String(key)}px` }),
      border: {
        radius: new Proxy({}, { get: (_, key) => (key === "full" ? "9999px" : `${String(key)}px`) }),
        width: { 1: "1px", 2: "2px" },
      },
      shadows: { xs: "x", sm: "x", md: "x", lg: "x", xl: "x", "2xl": "x", full: "x" },
      font: {
        family: { display: "x", body: "x", heading: "x", mono: "x" },
        weight: range([100, 200, 300, 400, 500, 600, 700, 800, 900], (k) => k),
        letterSpacing: {},
        fontSize: {},
        lineHeight: {},
        size: {
          body: { xs: group(10, 14), sm: group(12, 18), md: group(14, 20), lg: group(16, 24) },
          heading: {
            sm: group(18, 24), md: group(20, 28), lg: group(24, 32),
            xl: group(32, 38), "2xl": group(40, 46),
          },
          display: { sm: group(48, 56), md: group(56, 64), lg: group(64, 70), xl: group(72, 78) },
        },
      },
    },
  };
});

const AA = 4.5;
const NON_TEXT = 3;
const LARGE_TEXT = 3;

const textPairs = (p) => [
  ["text / page", p.text, p.page],
  ["text-muted / page", p.textMuted, p.page],
  ["text-subtle / page", p.textSubtle, p.page],
  ["text-muted / surface-muted", p.textMuted, p.surfaceMuted],
  ["text-subtle / surface-muted", p.textSubtle, p.surfaceMuted],
  ["text-muted / surface-sunken", p.textMuted, p.surfaceSunken],
  ["on-primary / primary", p.onPrimary, p.primary],
  ["on-primary / primary hover", p.onPrimary, p.primaryHover],
  ["on-primary / primary active", p.onPrimary, p.primaryActive],
  ["on-primary-muted / primary", p.onPrimaryMuted, p.primary],
  ["on-inverse / inverse", p.onInverse, p.inverseSurface],
  ["on-inverse-muted / inverse", p.onInverseMuted, p.inverseSurface],
  ["text / primary-soft", p.text, p.primarySoft],
  ["text-muted / primary-soft", p.textMuted, p.primarySoft],
  ["success text / success surface", p.successText, p.successSurface],
  ["error text / error surface", p.errorText, p.errorSurface],
  ["error text / page", p.errorText, p.page],
];

const nonTextPairs = (p) => [
  ["form control border / page", p.borderStrong, p.page],
  ["focus ring / page", p.focus, p.page],
  ["focus ring / pink", p.focus, p.primary],
  ["pink fill / page", p.primary, p.page],
  ["error border / page", p.errorStrong, p.page],
  ["switch thumb / track", BRAND.black, p.borderStrong],
];

describe("landing palette", () => {
  it.each(["light", "dark"])("keeps every %s text pair at WCAG AA (4.5:1)", (mode) => {
    for (const [label, fg, bg] of textPairs(palettes[mode])) {
      expect({ label, ratio: contrastRatio(fg, bg) >= AA }).toEqual({ label, ratio: true });
    }
  });

  it.each(["light", "dark"])("keeps %s non-text indicators at 3:1", (mode) => {
    for (const [label, fg, bg] of nonTextPairs(palettes[mode])) {
      expect({ label, ratio: contrastRatio(fg, bg) >= NON_TEXT }).toEqual({ label, ratio: true });
    }
  });

  it("only uses pink as text at large display sizes", () => {
    // 3.07:1 on white passes the 3:1 large-text threshold, not the 4.5:1 body one.
    expect(contrastRatio(BRAND.pink, BRAND.white)).toBeGreaterThanOrEqual(LARGE_TEXT);
    expect(contrastRatio(BRAND.pink, BRAND.white)).toBeLessThan(AA);
    expect(contrastRatio(BRAND.black, BRAND.pink)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(BRAND.pink, BRAND.black)).toBeGreaterThanOrEqual(AA);
  });

  it("mixes brand colors predictably", () => {
    expect(mix(BRAND.white, BRAND.black, 0)).toBe("#ffffff");
    expect(mix(BRAND.white, BRAND.black, 1)).toBe("#000000");
    expect(mix(BRAND.white, BRAND.black, 0.6)).toBe("#666666");
  });

  it("inverts page and text between modes", () => {
    expect(palettes.light).toMatchObject({ page: BRAND.white, text: BRAND.black });
    expect(palettes.dark).toMatchObject({ page: BRAND.black, text: BRAND.white });
    expect(palettes.dark.primary).toBe(BRAND.pink);
    expect(palettes.dark.onPrimary).toBe(BRAND.black);
  });
});

describe("landing css variables", () => {
  const SEMANTIC = /^--color-(success|error)-/;

  it.each(["light", "dark"])("%s variables are flat brand colors", (mode) => {
    const vars = themeVars(mode);
    const colorVars = Object.entries(vars).filter(([name]) => name.startsWith("--color-"));
    expect(colorVars.length).toBeGreaterThan(20);
    for (const [name, value] of colorVars) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
      if (SEMANTIC.test(name)) continue;
      // Neutral, or a mix of the pink with white / black (green is always the weakest channel).
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
      expect(g <= b && b <= r).toBe(true);
    }
    expect(JSON.stringify(vars)).not.toMatch(/gradient|blur|rgb|hsl/i);
  });

  it("exposes the sans / accent fonts and a single float shadow", () => {
    const vars = themeVars("light");
    expect(vars["--font-sans"]).toMatch(/^"Inter Variable", Inter,/);
    expect(vars["--font-accent"]).toMatch(/^"Playfair Display"/);
    expect(vars["--shadow-float"]).toBeDefined();
    expect(Object.keys(vars).filter((k) => k.startsWith("--shadow-"))).toEqual(["--shadow-float"]);
    expect(vars["--font-mono"]).toBeUndefined();
  });
});

describe("Blend token overrides", () => {
  const hexRed = blendFoundationTokens.colors.red;

  it("replaces gray / primary and folds other hues into the pink scale", () => {
    const { gray, primary, purple, orange, yellow } = blendFoundationTokens.colors;
    expect(gray[0]).toBe(BRAND.white);
    expect(gray[1000]).toBe(BRAND.black);
    for (const hex of Object.values(gray)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(r === g && g === b).toBe(true);
    }
    expect(primary[500]).toBe(BRAND.pink);
    expect([purple, orange, yellow]).toEqual([primary, primary, primary]);
    expect(hexRed[600]).toBe("#E7000B");
  });

  it("uses Inter for every Blend font family", () => {
    const { family } = blendFoundationTokens.font;
    expect(new Set(Object.values(family)).size).toBe(1);
    expect(family.body).toMatch(/^"Inter Variable"/);
  });

  it.each(["light", "dark"])("%s button, input and card tokens are flat", (mode) => {
    const tokens = blendComponentTokens[mode];
    expect(JSON.stringify(tokens)).not.toMatch(/gradient|rgba?\(|blur/i);

    const { backgroundColor, text } = tokens.BUTTONV2.lg;
    expect(backgroundColor.primary.default.default).toBe(palettes[mode].primary);
    expect(text.color.primary.default.default).toBe(BRAND.black);
    expect(backgroundColor.secondary.default.default).toBe(palettes[mode].surface);

    const { border } = tokens.TEXT_INPUTV2.lg.inputContainer;
    expect(border.default).toBe(`1px solid ${palettes[mode].borderStrong}`);
    expect(border.focus).toBe(`2px solid ${palettes[mode].focus}`);
    expect(tokens.TEXT_INPUTV2.lg.inputContainer.boxShadow).toBe("none");
  });
});
