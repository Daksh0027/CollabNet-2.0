import { createContext, useContext } from 'react'

export type WaitlistStatus = 'idle' | 'loading' | 'success' | 'error'

export type WaitlistContextValue = {
  status: WaitlistStatus
  email: string
  join: (email: string) => Promise<void>
  reset: () => void
}

export const WaitlistContext = createContext<WaitlistContextValue | null>(null)

export function useWaitlist(): WaitlistContextValue {
  const ctx = useContext(WaitlistContext)
  if (!ctx) throw new Error('useWaitlist must be used inside <WaitlistProvider>')
  return ctx
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
