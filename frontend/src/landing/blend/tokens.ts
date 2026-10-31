import {
  FOUNDATION_THEME,
  type ComponentTokenOverrides,
  type ThemeType,
} from "@juspay/blend-design-system";

/**
 * Single source for every visual value on the landing page.
 *
 * The palette is three brand literals. Every other color is derived from them
 * with `mix()`, then exposed three ways:
 *   1. CSS custom properties on the `.blend-landing` wrapper (`themeVars`)
 *   2. Blend foundation tokens (`blendFoundationTokens`)
 *   3. Blend component token overrides, generated per theme (`blendComponentTokens`)
 * The only non-brand colors are Blend's own red / green scales, kept for form
 * feedback and the before/after metric chips.
 */
export const BRAND = {
  white: "#ffffff",
  black: "#000000",
  pink: "#ff45bc",
} as const;

export const foundationToken = FOUNDATION_THEME;

export type ThemeMode = "light" | "dark";

/* ---------------------------------------------------------------- color math */

type Rgb = readonly [number, number, number];

const parseHex = (hex: string): Rgb => {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const channel = (v: number) =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, "0");

/** Linear sRGB mix: `t` is the share of `b` (0 returns `a`, 1 returns `b`). */
export const mix = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return `#${channel(ar + (br - ar) * t)}${channel(ag + (bg - ag) * t)}${channel(ab + (bb - ab) * t)}`;
};

/** 8-digit hex (`#rrggbbaa`) for the rare translucent value. */
const withAlpha = (hex: string, a: number) =>
  `${hex.slice(0, 7)}${channel(a * 255)}`;

const toLinear = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string): number => {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

/** WCAG 2.x contrast ratio between two opaque hex colors. */
export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `t` share of black over white, e.g. `ink(0.6)` is black at 60% on white. */
const ink = (t: number) => mix(BRAND.white, BRAND.black, t);
/** `t` share of white over black, e.g. `paper(0.6)` is white at 60% on black. */
const paper = (t: number) => mix(BRAND.black, BRAND.white, t);

/* --------------------------------------------------------------- font stacks */

const str = (value: unknown) => String(value);
const px = (value: unknown) =>
  typeof value === "number" ? `${value}px` : String(value);

const { colors, unit, border, shadows, font } = foundationToken;
const green = colors.green;
const red = colors.red;

/** Inter Variable is self-hosted (`@fontsource-variable/inter`). */
const SANS_STACK =
  '"Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** Playfair Display italic is self-hosted; used for highlight words only. */
const ACCENT_STACK =
  '"Playfair Display", ui-serif, Georgia, "Times New Roman", serif';

/* -------------------------------------------------------------- semantic roles */

export type Palette = {
  page: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  /** Decorative hairlines (cards, dividers). */
  border: string;
  /** Form control / button outlines, >= 3:1 on the page. */
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  iconMuted: string;
  focus: string;

  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;
  primaryMuted: string;
  primaryLine: string;
  onPrimary: string;
  onPrimaryMuted: string;
  /** Pink for large display text only (>= 24px). */
  accentDisplay: string;

  inverseSurface: string;
  onInverse: string;
  onInverseMuted: string;

  successText: string;
  successSurface: string;
  successLine: string;
  successSolid: string;
  successSolidHover: string;
  errorText: string;
  errorSurface: string;
  errorLine: string;
  errorStrong: string;
  errorSolid: string;
  errorSolidHover: string;

  shadowFloat: string;
};

const lightPalette: Palette = {
  page: BRAND.white,
  surface: BRAND.white,
  surfaceMuted: ink(0.04),
  surfaceSunken: ink(0.07),
  border: ink(0.12),
  borderStrong: ink(0.55),
  text: BRAND.black,
  textMuted: ink(0.68),
  textSubtle: ink(0.6),
  iconMuted: ink(0.55),
  focus: BRAND.black,

  primary: BRAND.pink,
  primaryHover: mix(BRAND.pink, BRAND.black, 0.1),
  primaryActive: mix(BRAND.pink, BRAND.black, 0.18),
  primarySoft: mix(BRAND.white, BRAND.pink, 0.12),
  primaryMuted: mix(BRAND.white, BRAND.pink, 0.3),
  primaryLine: BRAND.pink,
  onPrimary: BRAND.black,
  onPrimaryMuted: mix(BRAND.pink, BRAND.black, 0.78),
  accentDisplay: BRAND.pink,

  inverseSurface: BRAND.black,
  onInverse: BRAND.white,
  onInverseMuted: paper(0.68),

  successText: str(green[800]),
  successSurface: str(green[50]),
  successLine: str(green[200]),
  successSolid: str(green[700]),
  successSolidHover: str(green[800]),
  errorText: str(red[700]),
  errorSurface: str(red[50]),
  errorLine: str(red[200]),
  errorStrong: str(red[600]),
  errorSolid: str(red[600]),
  errorSolidHover: str(red[700]),

  shadowFloat: `0 2px 12px 0 ${withAlpha(BRAND.black, 0.06)}`,
};

const darkPalette: Palette = {
  page: BRAND.black,
  surface: BRAND.black,
  surfaceMuted: paper(0.08),
  surfaceSunken: paper(0.13),
  border: paper(0.16),
  borderStrong: paper(0.55),
  text: BRAND.white,
  textMuted: paper(0.68),
  textSubtle: paper(0.6),
  iconMuted: paper(0.55),
  focus: BRAND.white,

  primary: BRAND.pink,
  primaryHover: mix(BRAND.pink, BRAND.white, 0.12),
  primaryActive: mix(BRAND.pink, BRAND.white, 0.22),
  primarySoft: mix(BRAND.black, BRAND.pink, 0.2),
  primaryMuted: mix(BRAND.black, BRAND.pink, 0.38),
  primaryLine: BRAND.pink,
  onPrimary: BRAND.black,
  onPrimaryMuted: mix(BRAND.pink, BRAND.black, 0.78),
  accentDisplay: BRAND.pink,

  inverseSurface: BRAND.white,
  onInverse: BRAND.black,
  onInverseMuted: ink(0.68),

  successText: str(green[300]),
  successSurface: str(green[950]),
  successLine: str(green[800]),
  successSolid: str(green[700]),
  successSolidHover: str(green[800]),
  errorText: str(red[300]),
  errorSurface: str(red[950]),
  errorLine: str(red[800]),
  errorStrong: str(red[400]),
  errorSolid: str(red[600]),
  errorSolidHover: str(red[700]),

  shadowFloat: "none",
};

export const palettes: Record<ThemeMode, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

/** Avatar fills alternate between two brand constants; initials are always black. */
export const AVATAR_FILLS = [BRAND.pink, BRAND.white] as const;
export const avatarFill = (index: number): string =>
  AVATAR_FILLS[index % AVATAR_FILLS.length];

/* ------------------------------------------------------ Blend foundation tokens */

const scaleFrom = (stops: Record<string, number>, from: string, to: string) =>
  Object.fromEntries(
    Object.entries(stops).map(([key, t]) => [key, mix(from, to, t)]),
  );

/** Pure neutral: black mixed into white. Keys match Blend's gray scale. */
const GRAY_STOPS = {
  0: 0,
  25: 0.015,
  50: 0.04,
  100: 0.07,
  150: 0.1,
  200: 0.14,
  300: 0.22,
  400: 0.45,
  500: 0.6,
  600: 0.7,
  700: 0.84,
  800: 0.9,
  900: 0.94,
  950: 0.98,
  1000: 1,
};
const grayScale = scaleFrom(GRAY_STOPS, BRAND.white, BRAND.black);

/** Pink tints toward white (50-400), the pink itself (500), shades toward black (600-950). */
const primaryScale = {
  ...scaleFrom(
    { 50: 0.08, 100: 0.16, 200: 0.32, 300: 0.55, 400: 0.8 },
    BRAND.white,
    BRAND.pink,
  ),
  500: BRAND.pink,
  ...scaleFrom(
    { 600: 0.08, 700: 0.25, 800: 0.45, 900: 0.62, 950: 0.78 },
    BRAND.pink,
    BRAND.black,
  ),
};

const noShadows = {
  xs: "none",
  sm: "none",
  md: "none",
  lg: "none",
  xl: "none",
  "2xl": "none",
  full: "none",
  focusPrimary: "none",
  focusError: "none",
};

/**
 * Foundation tokens passed to Blend's ThemeProvider. Same in both modes: Blend
 * derives its light/dark component defaults from these scales. Red and green
 * stay untouched for the semantic exception; purple / orange / yellow collapse
 * onto the pink scale so no other hue can appear.
 */
export const blendFoundationTokens: ThemeType = {
  ...foundationToken,
  colors: {
    ...colors,
    gray: grayScale,
    primary: primaryScale,
    purple: primaryScale,
    orange: primaryScale,
    yellow: primaryScale,
  },
  shadows: { ...shadows, ...noShadows },
  font: {
    ...font,
    family: {
      display: SANS_STACK,
      body: SANS_STACK,
      heading: SANS_STACK,
      mono: SANS_STACK,
    },
  },
};

/* ------------------------------------------------- Blend component token overrides */

const pill = border.radius.full;
const panelRadius = border.radius[20];

const sizes = <T>(v: T) => ({ sm: v, md: v, lg: v });
const buttonStates = <T>(d: T, h: T, a: T, x: T) => ({
  default: d,
  hover: h,
  active: a,
  disabled: x,
});
const inputStates = <T>(d: T, h: T, f: T, e: T, x: T) => ({
  default: d,
  hover: h,
  focus: f,
  error: e,
  disabled: x,
});
const buttonSubTypes = <T>(base: T, inline: T) => ({
  default: base,
  iconOnly: base,
  inline,
});
const byType = <T>(primary: T, secondary: T, danger: T, success: T) => ({
  primary,
  secondary,
  danger,
  success,
});
const pillRadius = buttonSubTypes(pill, border.radius[6]);
const pillRadiusByType = byType(pillRadius, pillRadius, pillRadius, pillRadius);

const buttonTokens = (p: Palette) => {
  const flat = (v: string) => buttonStates(v, v, v, v);
  const noneBy = byType(
    buttonSubTypes(flat("none"), flat("none")),
    buttonSubTypes(flat("none"), flat("none")),
    buttonSubTypes(flat("none"), flat("none")),
    buttonSubTypes(flat("none"), flat("none")),
  );

  const primaryFill = buttonStates(
    p.primary,
    p.primaryHover,
    p.primaryActive,
    p.primaryMuted,
  );
  const secondaryFill = buttonStates(
    p.surface,
    p.surfaceMuted,
    p.surfaceSunken,
    p.surfaceMuted,
  );
  const dangerFill = buttonStates(
    p.errorSolid,
    p.errorSolidHover,
    p.errorSolidHover,
    p.errorLine,
  );
  const successFill = buttonStates(
    p.successSolid,
    p.successSolidHover,
    p.successSolidHover,
    p.successLine,
  );
  const outlineOf = (width: string, fill: typeof primaryFill) =>
    buttonStates(
      `${width} solid ${fill.default}`,
      `${width} solid ${fill.hover}`,
      `${width} solid ${fill.active}`,
      `${width} solid ${fill.disabled}`,
    );
  const secondaryOutline = buttonStates(
    `1px solid ${p.borderStrong}`,
    `1px solid ${p.text}`,
    `1px solid ${p.text}`,
    `1px solid ${p.border}`,
  );

  const labelOn = (color: string, disabled: string) =>
    buttonStates(color, color, color, disabled);
  const inlineText = (color: string) => flat(color);

  return {
    // Blend's default ring is a pastel box-shadow; the landing page uses the
    // global 2px outline instead (see landing.css).
    focusRing: byType(
      buttonSubTypes("none", "none"),
      buttonSubTypes("none", "none"),
      buttonSubTypes("none", "none"),
      buttonSubTypes("none", "none"),
    ),
    // Flat fills in place of Blend's default two-stop button fills.
    backgroundColor: byType(
      buttonSubTypes(primaryFill, flat("none")),
      buttonSubTypes(secondaryFill, flat("none")),
      buttonSubTypes(dangerFill, flat("none")),
      buttonSubTypes(successFill, flat("none")),
    ),
    border: byType(
      buttonSubTypes(outlineOf("1.5px", primaryFill), flat("none")),
      buttonSubTypes(secondaryOutline, flat("none")),
      buttonSubTypes(outlineOf("1.5px", dangerFill), flat("none")),
      buttonSubTypes(outlineOf("1.5px", successFill), flat("none")),
    ),
    shadow: noneBy,
    text: {
      color: byType(
        buttonSubTypes(labelOn(p.onPrimary, p.textSubtle), inlineText(p.text)),
        buttonSubTypes(labelOn(p.text, p.textSubtle), inlineText(p.text)),
        buttonSubTypes(
          labelOn(BRAND.white, p.textSubtle),
          inlineText(p.errorText),
        ),
        buttonSubTypes(
          labelOn(BRAND.white, p.textSubtle),
          inlineText(p.successText),
        ),
      ),
      fontWeight: sizes(font.weight[600]),
    },
    borderRadius: sizes(pillRadiusByType),
  };
};

const textInputTokens = (p: Palette) => ({
  topContainer: {
    label: {
      color: inputStates(p.text, p.text, p.text, p.errorText, p.textSubtle),
    },
    subLabel: {
      color: inputStates(
        p.textSubtle,
        p.textSubtle,
        p.textSubtle,
        p.errorText,
        p.textSubtle,
      ),
    },
    helpIcon: {
      color: inputStates(
        p.iconMuted,
        p.iconMuted,
        p.iconMuted,
        p.errorText,
        p.iconMuted,
      ),
    },
    required: { color: p.errorText },
  },
  inputContainer: {
    placeholder: {
      color: inputStates(
        p.textSubtle,
        p.textSubtle,
        p.textSubtle,
        p.errorText,
        p.textSubtle,
      ),
    },
    inputText: {
      color: inputStates(p.text, p.text, p.text, p.text, p.textSubtle),
    },
    borderRadius: sizes(pill),
    boxShadow: "none",
    border: inputStates(
      `1px solid ${p.borderStrong}`,
      `1px solid ${p.text}`,
      `2px solid ${p.focus}`,
      `2px solid ${p.errorStrong}`,
      `1px solid ${p.border}`,
    ),
    backgroundColor: inputStates(
      p.surface,
      p.surface,
      p.surface,
      p.surface,
      p.surfaceMuted,
    ),
  },
  bottomContainer: {
    hintText: {
      color: inputStates(
        p.textSubtle,
        p.textSubtle,
        p.textSubtle,
        p.errorText,
        p.textSubtle,
      ),
    },
    errorMessage: { color: p.errorText },
  },
});

const cardTokens = (p: Palette) => ({
  borderRadius: panelRadius,
  border: {
    outlined: `1px solid ${p.border}`,
    // The emphasised card swaps its hairline for a full-contrast one.
    elevated: `1px solid ${p.text}`,
    ghost: "1px solid transparent",
  },
  backgroundColor: {
    outlined: p.surface,
    elevated: p.surface,
    ghost: "transparent",
  },
  boxShadow: { outlined: "none", elevated: "none", ghost: "none" },
  state: {
    hover: { border: `1px solid ${p.borderStrong}`, boxShadow: "none" },
    selected: { border: `1px solid ${p.text}`, boxShadow: "none" },
    focus: { outline: `2px solid ${p.focus}`, outlineOffset: unit[2] },
  },
  media: { backgroundColor: p.surfaceMuted, borderRadius: border.radius[12] },
  header: {
    eyebrow: { color: p.textSubtle },
    title: { color: p.text },
    subtitle: { color: p.textMuted },
  },
  body: { description: { color: p.textMuted } },
  footer: { borderTop: `1px solid ${p.border}` },
});

const tagTokens = (p: Palette) => ({
  // Pink fill with black text in both themes (6.83:1).
  backgroundColor: { attentive: { primary: p.primary } },
  border: { attentive: { primary: `1px solid ${p.primary}` } },
  text: { color: { attentive: { primary: p.onPrimary } } },
});

const avatarTokens = (p: Palette) => ({
  container: {
    fallbackText: {
      border: `1px solid ${p.border}`,
      // Fills are always pink or white (see `avatarFill`), so initials are black.
      color: BRAND.black,
    },
    // Status dots are unused here; drop Blend's translucent white halo anyway.
    status: { boxShadow: "none" },
  },
});

const accordionTokens = (p: Palette) => {
  const states = (d: string, h: string, a: string, x: string, o: string) => ({
    default: d,
    hover: h,
    active: a,
    disabled: x,
    open: o,
  });
  const fill = states(
    "transparent",
    p.surfaceMuted,
    p.surfaceMuted,
    p.surfaceMuted,
    "transparent",
  );
  const line = `1px solid ${p.border}`;
  const lineStates = states(line, line, line, line, line);
  return {
    trigger: {
      backgroundColor: { border: fill, noBorder: fill },
      border: { border: lineStates, noBorder: lineStates },
      text: {
        title: { color: states(p.text, p.text, p.text, p.textSubtle, p.text) },
        subtext: {
          color: states(
            p.textMuted,
            p.textMuted,
            p.textMuted,
            p.textSubtle,
            p.textMuted,
          ),
        },
      },
    },
    separator: { color: { border: p.border, noBorder: p.border } },
    chevron: {
      color: states(p.iconMuted, p.text, p.text, p.iconMuted, p.text),
    },
  };
};

const switchTokens = (p: Palette) => {
  const checked = inputStates(
    p.primary,
    p.primaryHover,
    p.primary,
    p.errorStrong,
    p.primaryMuted,
  );
  const track = p.borderStrong;
  const unchecked = inputStates(track, track, track, track, p.surfaceSunken);
  return {
    switch: {
      backgroundColor: { checked, unchecked },
      thumb: {
        // Black reads on both the pink and the neutral track in either theme.
        backgroundColor: BRAND.black,
        border: "none",
        outline: `2px solid ${p.focus}`,
      },
    },
    content: {
      label: {
        color: inputStates(p.text, p.text, p.text, p.errorText, p.textSubtle),
      },
      subLabel: {
        color: inputStates(
          p.textMuted,
          p.textMuted,
          p.textMuted,
          p.errorText,
          p.textSubtle,
        ),
      },
      required: { color: p.errorText },
    },
  };
};

const componentTokensFor = (mode: ThemeMode): ComponentTokenOverrides => {
  const p = palettes[mode];
  const button = buttonTokens(p);
  const input = textInputTokens(p);
  const card = cardTokens(p);
  const tag = tagTokens(p);
  const avatar = avatarTokens(p);
  const accordion = accordionTokens(p);
  const switchV2 = switchTokens(p);
  return {
    BUTTONV2: { sm: button, lg: button },
    TEXT_INPUTV2: { sm: input, lg: input },
    CARDV2: { sm: card, lg: card },
    TAGV2: { sm: tag, lg: tag },
    AVATARV2: { sm: avatar, lg: avatar },
    ACCORDIONV2: { sm: accordion, lg: accordion },
    SWITCHV2: { sm: switchV2, lg: switchV2 },
  };
};

/**
 * Blend merges overrides onto both its light and dark defaults, so each theme
 * gets its own object. Built once so ThemeProvider's token cache stays warm.
 */
export const blendComponentTokens: Record<ThemeMode, ComponentTokenOverrides> =
  {
    light: componentTokensFor("light"),
    dark: componentTokensFor("dark"),
  };

/* ------------------------------------------------------------ CSS custom properties */

type CssVars = Record<`--${string}`, string>;

const spaceScale = [
  1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80,
  100, 120, 280,
] as const;

const sharedVars = (): CssVars => {
  const vars: CssVars = {
    "--font-sans": SANS_STACK,
    "--font-accent": ACCENT_STACK,

    "--fw-regular": str(font.weight[400]),
    "--fw-medium": str(font.weight[500]),
    "--fw-semibold": str(font.weight[600]),
    "--fw-bold": str(font.weight[700]),

    "--fs-body-xs": px(font.size.body.xs.fontSize),
    "--fs-body-sm": px(font.size.body.sm.fontSize),
    "--fs-body-md": px(font.size.body.md.fontSize),
    "--fs-body-lg": px(font.size.body.lg.fontSize),
    "--fs-heading-sm": px(font.size.heading.sm.fontSize),
    "--fs-heading-md": px(font.size.heading.md.fontSize),
    "--fs-heading-lg": px(font.size.heading.lg.fontSize),
    "--fs-heading-xl": px(font.size.heading.xl.fontSize),
    "--fs-heading-2xl": px(font.size.heading["2xl"].fontSize),
    "--fs-display-sm": px(font.size.display.sm.fontSize),
    "--fs-display-md": px(font.size.display.md.fontSize),
    "--fs-display-lg": px(font.size.display.lg.fontSize),
    "--fs-display-xl": px(font.size.display.xl.fontSize),

    "--lh-body-sm": px(font.size.body.sm.lineHeight),
    "--lh-body-md": px(font.size.body.md.lineHeight),
    "--lh-body-lg": px(font.size.body.lg.lineHeight),

    // Heavy sans headings tighten with size; uppercase labels open up.
    "--ls-display": "-0.04em",
    "--ls-heading": "-0.03em",
    "--ls-title": "-0.015em",
    "--ls-wide": "0.08em",

    // Small radius scale: tiny / small / inner card / panel / pill.
    "--radius-xs": px(border.radius[6]),
    "--radius-sm": px(border.radius[8]),
    "--radius-md": px(border.radius[12]),
    "--radius-lg": px(panelRadius),
    "--radius-full": px(border.radius.full),

    "--border-width": px(border.width[1]),
    "--border-width-strong": px(border.width[2]),

    "--touch-target": px(unit[44]),
  };
  for (const step of spaceScale) {
    vars[`--space-${step}`] = px(unit[step]);
  }
  return vars;
};

const paletteVars = (p: Palette): CssVars => ({
  "--color-page": p.page,
  "--color-surface": p.surface,
  "--color-surface-muted": p.surfaceMuted,
  "--color-surface-sunken": p.surfaceSunken,
  "--color-border": p.border,
  "--color-border-strong": p.borderStrong,
  "--color-text": p.text,
  "--color-text-muted": p.textMuted,
  "--color-text-subtle": p.textSubtle,
  "--color-icon-muted": p.iconMuted,

  "--color-primary": p.primary,
  "--color-primary-strong": p.primaryHover,
  "--color-primary-soft": p.primarySoft,
  "--color-primary-muted": p.primaryMuted,
  "--color-primary-line": p.primaryLine,
  "--color-accent-display": p.accentDisplay,
  "--color-focus": p.focus,

  "--color-emphasis-surface": p.primary,
  "--color-on-emphasis": p.onPrimary,
  "--color-on-emphasis-muted": p.onPrimaryMuted,
  "--color-inverse-surface": p.inverseSurface,
  "--color-on-inverse": p.onInverse,
  "--color-on-inverse-muted": p.onInverseMuted,

  "--color-success-text": p.successText,
  "--color-success-surface": p.successSurface,
  "--color-success-line": p.successLine,
  "--color-error-text": p.errorText,
  "--color-error-surface": p.errorSurface,
  "--color-error-line": p.errorLine,

  "--shadow-float": p.shadowFloat,
});

export const themeVars = (mode: ThemeMode): CssVars => ({
  ...sharedVars(),
  ...paletteVars(palettes[mode]),
});
