type SectionHeaderProps = {
  id: string
  eyebrow: string
  title: string
  subtext?: string
}

export function SectionHeader({ id, eyebrow, title, subtext }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {subtext && <p className="section-subtext">{subtext}</p>}
    </div>
  )
}
