import { Fragment } from 'react'
import type { Accents } from '../content'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Renders a plain headline string with its highlight words wrapped in the
 * `accent-serif` / `mark` utility classes. The text content is unchanged, so
 * the accessible name of the heading stays the original copy.
 */
export function Accented({ text, accents }: { text: string; accents?: Accents }) {
  const entries: Array<[string, 'accent-serif' | 'mark']> = [
    ...(accents?.serif ?? []).map((word): [string, 'accent-serif'] => [word, 'accent-serif']),
    ...(accents?.mark ?? []).map((word): [string, 'mark'] => [word, 'mark']),
  ].filter(([word]) => word.length > 0)

  if (entries.length === 0) return <>{text}</>

  // Longest first so "deal room" wins over a shorter overlapping entry.
  entries.sort((a, b) => b[0].length - a[0].length)
  const classes = new Map(entries)
  const pattern = new RegExp(`(${entries.map(([word]) => escapeRegExp(word)).join('|')})`)

  return (
    <>
      {text.split(pattern).map((part, index) => {
        const className = classes.get(part)
        return className ? (
          <span key={index} className={className}>
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      })}
    </>
  )
}
