import { content } from '../content'
import { WaitlistForm } from './WaitlistForm'

export function ClosingCta() {
  const { closing } = content
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="closing__panel">
        <h2 id="closing-title" className="closing__title">
          {closing.heading}
        </h2>
        <p className="closing__subtext">{closing.subtext}</p>
        <div className="closing__form">
          <WaitlistForm idPrefix="closing" tone="closing" />
        </div>
      </div>
    </section>
  )
}
