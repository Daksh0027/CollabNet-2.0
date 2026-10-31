import {
  FOUNDATION_THEME,
  type ComponentTokenOverrides,
  type ThemeType,
} from '@juspay/blend-design-system'

/**
 * Single source for every visual value on the page. Everything here is read
 * from Blend's foundation tokens and exposed to CSS as custom properties, so
 * stylesheets never contain raw colors or magic numbers.
 */
export const foundationToken = FOUNDATION_THEME

export type ThemeMode = 'light' | 'dark'

const { colors, unit, border, shadows, font } = foundationToken
const gray = colors.gray
const primary = colors.primary
const green = colors.green
const red = colors.red
const purple = colors.purple
const orange = colors.orange
const yellow = colors.yellow

const str = (value: unknown) => String(value)
const px = (value: unknown) => (typeof value === 'number' ? `${value}px` : String(value))

// Blend's font family token ("InterDisplay") ships without a webfont, so we
// extend it with a system fallback stack instead of replacing it.
const SANS_STACK = `${font.family.body}, Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
const MONO_STACK = `"${font.family.mono}", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

/** Foundation tokens passed to Blend's ThemeProvider (font fallbacks only). */
export const blendFoundationTokens: ThemeType = {
  ...foundationToken,
  font: {
    ...font,
    family: {
      display: SANS_STACK,
      body: SANS_STACK,
      heading: SANS_STACK,
      mono: MONO_STACK,
    },
  },
}

const pill = border.radius.full
const pillByType = {
  primary: { default: pill, iconOnly: pill },
  secondary: { default: pill, iconOnly: pill },
  danger: { default: pill, iconOnly: pill },
  success: { default: pill, iconOnly: pill },
}
const buttonOverrides = {
  borderRadius: { sm: pillByType, md: pillByType, lg: pillByType },
}
const inputOverrides = {
  inputContainer: { borderRadius: { sm: pill, md: pill, lg: pill } },
}

/** Pill-shaped buttons and inputs, matching the reference composition. */
export const blendComponentTokens: ComponentTokenOverrides = {
  BUTTONV2: { sm: buttonOverrides, lg: buttonOverrides },
  TEXT_INPUTV2: { sm: inputOverrides, lg: inputOverrides },
}

type CssVars = Record<`--${string}`, string>

const spaceScale = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 100, 120] as const

const sharedVars = (): CssVars => {
  const vars: CssVars = {
    '--font-sans': SANS_STACK,
    '--font-mono': MONO_STACK,

    '--fw-regular': str(font.weight[400]),
    '--fw-medium': str(font.weight[500]),
    '--fw-semibold': str(font.weight[600]),
    '--fw-bold': str(font.weight[700]),

    '--fs-body-xs': px(font.size.body.xs.fontSize),
    '--fs-body-sm': px(font.size.body.sm.fontSize),
    '--fs-body-md': px(font.size.body.md.fontSize),
    '--fs-body-lg': px(font.size.body.lg.fontSize),
    '--fs-heading-sm': px(font.size.heading.sm.fontSize),
    '--fs-heading-md': px(font.size.heading.md.fontSize),
    '--fs-heading-lg': px(font.size.heading.lg.fontSize),
    '--fs-heading-xl': px(font.size.heading.xl.fontSize),
    '--fs-heading-2xl': px(font.size.heading['2xl'].fontSize),
    '--fs-display-sm': px(font.size.display.sm.fontSize),
    '--fs-display-md': px(font.size.display.md.fontSize),
    '--fs-display-lg': px(font.size.display.lg.fontSize),
    '--fs-display-xl': px(font.size.display.xl.fontSize),

    '--lh-body-sm': px(font.size.body.sm.lineHeight),
    '--lh-body-md': px(font.size.body.md.lineHeight),
    '--lh-body-lg': px(font.size.body.lg.lineHeight),

    '--ls-tight': px(font.letterSpacing.condensed),
    '--ls-wide': px(font.letterSpacing.expanded),

    '--radius-xs': px(border.radius[6]),
    '--radius-sm': px(border.radius[8]),
    '--radius-md': px(border.radius[12]),
    '--radius-lg': px(border.radius[16]),
    '--radius-xl': px(border.radius[20]),
    '--radius-2xl': px(border.radius[24]),
    '--radius-3xl': px(border.radius[28]),
    '--radius-full': px(border.radius.full),

    '--border-width': px(border.width[1]),
    '--border-width-strong': px(border.width[2]),

    '--shadow-xs': str(shadows.xs),
    '--shadow-sm': str(shadows.sm),
    '--shadow-md': str(shadows.md),
    '--shadow-lg': str(shadows.lg),
    '--shadow-xl': str(shadows.xl),
    '--shadow-2xl': str(shadows['2xl']),
    '--shadow-full': str(shadows.full),

    '--touch-target': px(unit[44]),
  }
  for (const step of spaceScale) {
    vars[`--space-${step}`] = px(unit[step])
  }
  return vars
}

const lightVars: CssVars = {
  '--color-page': str(gray[0]),
  '--color-surface': str(gray[0]),
  '--color-surface-muted': str(gray[50]),
  '--color-surface-sunken': str(gray[100]),
  '--color-border': str(gray[200]),
  '--color-border-strong': str(gray[300]),
  '--color-text': str(gray[950]),
  '--color-text-muted': str(gray[600]),
  '--color-icon-muted': str(gray[400]),

  '--color-primary': str(primary[600]),
  '--color-primary-strong': str(primary[700]),
  '--color-primary-soft': str(primary[50]),
  '--color-primary-muted': str(primary[100]),
  '--color-primary-line': str(primary[300]),
  '--color-focus': str(primary[600]),

  '--color-emphasis-surface': str(primary[600]),
  '--color-on-emphasis': str(gray[0]),
  '--color-on-emphasis-muted': str(primary[100]),
  '--color-inverse-surface': str(gray[950]),
  '--color-on-inverse': str(gray[0]),
  '--color-on-inverse-muted': str(gray[300]),

  '--color-success-text': str(green[800]),
  '--color-success-surface': str(green[50]),
  '--color-success-line': str(green[200]),
  '--color-error-text': str(red[700]),
  '--color-error-surface': str(red[50]),
  '--color-error-line': str(red[200]),

  '--color-accent-purple': str(purple[500]),
  '--color-accent-purple-soft': str(purple[100]),
  '--color-accent-orange': str(orange[500]),
  '--color-accent-orange-soft': str(orange[100]),
  '--color-accent-yellow': str(yellow[400]),
  '--color-accent-green': str(green[500]),

  '--hero-stop-1': str(primary[200]),
  '--hero-stop-2': str(primary[50]),
  '--hero-stop-3': str(gray[0]),
  '--hero-glow': str(purple[100]),
}

const darkVars: CssVars = {
  '--color-page': str(gray[950]),
  '--color-surface': str(gray[900]),
  '--color-surface-muted': str(gray[800]),
  '--color-surface-sunken': str(gray[700]),
  '--color-border': str(gray[700]),
  '--color-border-strong': str(gray[600]),
  '--color-text': str(gray[25]),
  '--color-text-muted': str(gray[300]),
  '--color-icon-muted': str(gray[500]),

  '--color-primary': str(primary[300]),
  '--color-primary-strong': str(primary[200]),
  '--color-primary-soft': str(primary[950]),
  '--color-primary-muted': str(primary[900]),
  '--color-primary-line': str(primary[700]),
  '--color-focus': str(primary[300]),

  '--color-emphasis-surface': str(primary[700]),
  '--color-on-emphasis': str(gray[0]),
  '--color-on-emphasis-muted': str(primary[100]),
  '--color-inverse-surface': str(gray[50]),
  '--color-on-inverse': str(gray[950]),
  '--color-on-inverse-muted': str(gray[600]),

  '--color-success-text': str(green[300]),
  '--color-success-surface': str(green[950]),
  '--color-success-line': str(green[800]),
  '--color-error-text': str(red[300]),
  '--color-error-surface': str(red[950]),
  '--color-error-line': str(red[800]),

  '--color-accent-purple': str(purple[400]),
  '--color-accent-purple-soft': str(purple[950]),
  '--color-accent-orange': str(orange[400]),
  '--color-accent-orange-soft': str(orange[950]),
  '--color-accent-yellow': str(yellow[300]),
  '--color-accent-green': str(green[400]),

  '--hero-stop-1': str(primary[900]),
  '--hero-stop-2': str(primary[950]),
  '--hero-stop-3': str(gray[950]),
  '--hero-glow': str(purple[950]),
}

export const themeVars = (mode: ThemeMode): CssVars => ({
  ...sharedVars(),
  ...(mode === 'dark' ? darkVars : lightVars),
})
