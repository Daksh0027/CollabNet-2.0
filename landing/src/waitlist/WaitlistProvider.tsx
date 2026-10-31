import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { WaitlistContext, type WaitlistStatus } from './context'

const SIMULATED_LATENCY_MS = 1200

/**
 * Placeholder for the real waitlist endpoint. Replace the body with a fetch
 * to your API. Addresses containing "+error" simulate a server failure so the
 * error state can be reviewed.
 */
async function submitToWaitlist(email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS))
  if (!navigator.onLine || email.toLowerCase().includes('+error')) {
    throw new Error('Waitlist request failed')
  }
}

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WaitlistStatus>('idle')
  const [email, setEmail] = useState('')

  const join = useCallback(async (value: string) => {
    setStatus('loading')
    try {
      await submitToWaitlist(value)
      setEmail(value)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => setStatus('idle'), [])

  const value = useMemo(() => ({ status, email, join, reset }), [status, email, join, reset])
  return <WaitlistContext.Provider value={value}>{children}</WaitlistContext.Provider>
}
