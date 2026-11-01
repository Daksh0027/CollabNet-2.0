export const PRIMARY_ACTION_ANCHOR = 'join'
export const HERO_EMAIL_ID = 'hero-email'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Every "Join waitlist" trigger outside a form routes here: scroll to the
 * hero form and put focus in the email field (or on the success message).
 */
export function goToPrimaryAction() {
  const anchor = document.getElementById(PRIMARY_ACTION_ANCHOR)
  if (!anchor) return
  anchor.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
  const target =
    document.getElementById(HERO_EMAIL_ID) ?? anchor.querySelector<HTMLElement>('[tabindex="-1"]') ?? anchor
  target.focus({ preventScroll: true })
}
