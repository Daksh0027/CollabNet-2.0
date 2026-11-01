import { content } from '../content'

/** Two interlocking rings: creator + sponsor. Inherits color from text. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <circle cx="12.5" cy="16" r="6" fill="none" stroke="var(--color-on-emphasis)" strokeWidth="2.4" />
      <circle cx="19.5" cy="16" r="6" fill="none" stroke="var(--color-on-emphasis)" strokeWidth="2.4" opacity="0.75" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo__name">{content.product.name}</span>
    </span>
  )
}
