import type { Accents } from "../content";
import { Accented } from "./Accented";

type SectionHeaderProps = {
  id: string;
  eyebrow: string;
  title: string;
  accents?: Accents;
  subtext?: string;
};

export function SectionHeader({
  id,
  eyebrow,
  title,
  accents,
  subtext,
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="section-title">
        <Accented text={title} accents={accents} />
      </h2>
      {subtext && <p className="section-subtext">{subtext}</p>}
    </div>
  );
}
