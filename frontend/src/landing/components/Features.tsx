import {
  CardV2,
  CardV2Padding,
  CardV2Variant,
} from "@juspay/blend-design-system";
import { content } from "../content";
import { FeatureIllustrationView } from "./illustrations/FeatureIllustrations";
import { SectionHeader } from "./SectionHeader";

export function Features() {
  const { features } = content;
  return (
    <section id="features" className="section" aria-labelledby="features-title">
      <SectionHeader
        id="features-title"
        eyebrow={features.eyebrow}
        title={features.heading}
        accents={features.accents}
        subtext={features.subtext}
      />
      <ul className="bento bento--features">
        {features.items.map((feature) => (
          <li
            key={feature.id}
            className={`bento__item bento__item--${feature.size}`}
          >
            <CardV2
              variant={CardV2Variant.OUTLINED}
              padding={CardV2Padding.COMFORTABLE}
              height="100%"
              width="100%"
              media={<FeatureIllustrationView kind={feature.illustration} />}
              title={<h3 className="card-heading">{feature.title}</h3>}
              description={feature.description}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
