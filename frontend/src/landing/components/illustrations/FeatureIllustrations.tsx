import { AvatarV2, AvatarV2Size } from "@juspay/blend-design-system";
import { BadgeCheck, CircleCheck, Lock, PenLine, Sparkles } from "lucide-react";
import type { FeatureIllustration } from "../../content";
import { avatarFill } from "../../blend/tokens";

function MatchIllustration() {
  const creators = [
    { initials: "MC", name: "Maya Chen", niche: "Tech & gadgets", fit: "94%" },
    { initials: "JR", name: "Jonah Reyes", niche: "Fitness", fit: "88%" },
    { initials: "SK", name: "Sana Kapoor", niche: "Travel", fit: "81%" },
  ];
  return (
    <div className="illo illo--match">
      <div className="illo-search">
        <Sparkles size={14} />
        <span>Tech creators · 50k–200k · US</span>
      </div>
      <ul className="illo-list">
        {creators.map((c, i) => (
          <li
            key={c.initials}
            className={`illo-row${i === 0 ? " is-top" : ""}`}
          >
            <AvatarV2
              fallbackText={c.initials}
              size={AvatarV2Size.SM}
              backgroundColor={avatarFill(i)}
            />
            <span className="illo-row__text">
              <span className="illo-row__name">
                {c.name} {i === 0 && <BadgeCheck size={13} />}
              </span>
              <span className="illo-row__meta">{c.niche}</span>
            </span>
            <span className="illo-row__fit">{c.fit}</span>
          </li>
        ))}
      </ul>
      <div className="illo-benchmark">
        <span className="illo-benchmark__label">Suggested rate</span>
        <span className="illo-benchmark__bar">
          <span />
        </span>
        <span className="illo-benchmark__value">$2.8k–$3.4k</span>
      </div>
    </div>
  );
}

function DealRoomIllustration() {
  return (
    <div className="illo illo--deal">
      <div className="illo-doc">
        <span className="illo-doc__line illo-doc__line--title" />
        <span className="illo-doc__line" />
        <span className="illo-doc__line illo-doc__line--short" />
        <div className="illo-doc__sign">
          <PenLine size={14} />
          <svg viewBox="0 0 80 24" width="80" height="24" focusable="false">
            <path
              d="M2 18c8-14 14-14 16-4s8 6 12-2 8-6 10 2 10 4 16-6 12-2 20-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <span className="mini-pill mini-pill--accent illo-deal__badge">
        <CircleCheck size={12} /> Signed 2 of 2
      </span>
    </div>
  );
}

function EscrowIllustration() {
  return (
    <div className="illo illo--escrow">
      <div className="illo-vault">
        <span className="illo-vault__icon">
          <Lock size={18} />
        </span>
        <span className="illo-vault__amount">$9,500</span>
        <span className="illo-vault__label">Held in escrow</span>
      </div>
      <svg
        className="illo-escrow__flow"
        viewBox="0 0 200 40"
        focusable="false"
        preserveAspectRatio="none"
      >
        <path
          d="M4 20 H196"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
      </svg>
      <span className="mini-pill mini-pill--outline">Released on delivery</span>
    </div>
  );
}

type EventTone = "primary" | "neutral" | "outline" | "ink";

function CalendarIllustration() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const events: Record<number, { label: string; tone: EventTone }> = {
    1: { label: "Brief", tone: "primary" },
    3: { label: "Draft", tone: "neutral" },
    4: { label: "Review", tone: "outline" },
    6: { label: "Live", tone: "ink" },
  };
  return (
    <div className="illo illo--calendar">
      {days.map((day, i) => (
        <div key={day} className="illo-day">
          <span className="illo-day__name">{day}</span>
          <span className="illo-day__num">{10 + i}</span>
          {events[i] && (
            <span className={`illo-event illo-event--${events[i].tone}`}>
              {events[i].label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function FeatureIllustrationView({
  kind,
}: {
  kind: FeatureIllustration;
}) {
  return (
    <div className="feature-media" aria-hidden="true">
      {kind === "match" && <MatchIllustration />}
      {kind === "dealroom" && <DealRoomIllustration />}
      {kind === "escrow" && <EscrowIllustration />}
      {kind === "calendar" && <CalendarIllustration />}
    </div>
  );
}
