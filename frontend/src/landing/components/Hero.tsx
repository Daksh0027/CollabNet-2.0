import {
  AvatarV2,
  AvatarV2Size,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from "@juspay/blend-design-system";
import { Handshake } from "lucide-react";
import { content } from "../content";
import { HERO_EMAIL_ID, PRIMARY_ACTION_ANCHOR } from "../primaryAction";
import { avatarFill } from "../blend/tokens";
import { Accented } from "./Accented";
import { WaitlistForm } from "./WaitlistForm";

const proofInitials = ["MC", "NA", "JR", "SK"];

export function Hero() {
  const { hero } = content;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__status">
        <TagV2
          text={hero.status}
          color={TagV2Color.PRIMARY}
          type={TagV2Type.ATTENTIVE}
          subType={TagV2SubType.ROUNDED}
          size={TagV2Size.MD}
          leftSlot={{
            slot: <span className="status-dot" aria-hidden="true" />,
          }}
        />
      </div>

      <h1 id="hero-title" className="hero__title">
        <Accented text={hero.headlineBefore} accents={hero.accents} />{" "}
        <span className="icon-chip" aria-hidden="true">
          <Handshake />
        </span>{" "}
        <Accented text={hero.headlineAfter} accents={hero.accents} />
      </h1>

      <p className="hero__subtext">{hero.subtext}</p>

      <div id={PRIMARY_ACTION_ANCHOR} className="hero__form">
        <WaitlistForm
          idPrefix={HERO_EMAIL_ID.replace("-email", "")}
          tone="hero"
        />
      </div>

      <div className="hero__proof">
        <div className="avatar-stack" aria-hidden="true">
          {proofInitials.map((initials, index) => (
            <span className="avatar-stack__item" key={initials}>
              <AvatarV2
                fallbackText={initials}
                size={AvatarV2Size.SM}
                backgroundColor={avatarFill(index)}
              />
            </span>
          ))}
        </div>
        <p>{hero.proof}</p>
      </div>
    </section>
  );
}
