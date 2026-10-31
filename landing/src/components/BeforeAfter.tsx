import { AvatarV2, AvatarV2Size, CardV2, CardV2Padding, CardV2Variant } from '@juspay/blend-design-system'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { content, type MetricChip, type ProofCard } from '../content'
import { SectionHeader } from './SectionHeader'

function Chip({ chip, position }: { chip: MetricChip; position: 'top' | 'bottom' }) {
  const positive = chip.direction === 'up'
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <li className={`metric-chip metric-chip--${positive ? 'positive' : 'negative'} metric-chip--${position}`}>
      <Icon size={16} aria-hidden="true" />
      <span className="metric-chip__label">{chip.label}</span>
      <span className="metric-chip__change">
        <span className="visually-hidden">{positive ? 'up ' : 'down '}</span>
        {chip.change}
      </span>
    </li>
  )
}

function ProofPanel({ card, variant }: { card: ProofCard; variant: 'before' | 'after' }) {
  const headingId = `proof-${variant}`
  return (
    <article className={`proof-card proof-card--${variant}`} aria-labelledby={headingId}>
      <h3 id={headingId} className="proof-card__heading">
        {card.heading}
      </h3>
      <div className="proof-card__body">
        <CardV2
          variant={variant === 'after' ? CardV2Variant.ELEVATED : CardV2Variant.OUTLINED}
          padding={CardV2Padding.COMFORTABLE}
          width="100%"
          leadingSlot={<AvatarV2 fallbackText={card.initials} size={AvatarV2Size.LG} />}
          title={<span className="proof-card__name">{card.name}</span>}
          subtitle={card.role}
          description={card.summary}
          footer={<span className="proof-card__footnote">{card.footnote}</span>}
        />
        <ul className="proof-card__chips" aria-label={`${card.heading}: metric changes`}>
          {card.chips.map((chip, i) => (
            <Chip key={chip.label} chip={chip} position={i === 0 ? 'top' : 'bottom'} />
          ))}
        </ul>
      </div>
    </article>
  )
}

function CurvedArrow() {
  return (
    <div className="proof__arrow" aria-hidden="true">
      <svg viewBox="0 0 120 80" width="120" height="80" focusable="false">
        <path d="M6 58 C 36 6, 82 6, 108 44" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 7" />
        <path d="M96 42 L109 46 L112 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function BeforeAfter() {
  const { proof } = content
  return (
    <section id="results" className="section" aria-labelledby="results-title">
      <SectionHeader id="results-title" eyebrow={proof.eyebrow} title={proof.heading} subtext={proof.subtext} />
      <div className="proof">
        <ProofPanel card={proof.before} variant="before" />
        <CurvedArrow />
        <ProofPanel card={proof.after} variant="after" />
      </div>
    </section>
  )
}
