import { content } from '../content'
import { SectionHeader } from './SectionHeader'

/**
 * Custom tiles: Blend's StatCardV2 uses a fixed neutral surface, but this
 * bento needs contrasting emphasis / inverse surfaces from the brief.
 */
export function Stats() {
  const { stats } = content
  return (
    <section className="section" aria-labelledby="stats-title">
      <SectionHeader id="stats-title" eyebrow={stats.eyebrow} title={stats.heading} />
      <ul className="bento bento--stats">
        {stats.items.map((stat) => (
          <li key={stat.label} className={`stat-tile stat-tile--${stat.tone}`}>
            <p className="stat-tile__value">{stat.value}</p>
            <div>
              <p className="stat-tile__label">{stat.label}</p>
              <p className="stat-tile__detail">{stat.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
