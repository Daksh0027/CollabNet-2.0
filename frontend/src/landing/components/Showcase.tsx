import { AvatarV2, AvatarV2Size } from "@juspay/blend-design-system";
import {
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  FileSignature,
  LayoutDashboard,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { content } from "../content";
import { BRAND } from "../blend/tokens";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Search, label: "Explore" },
  { icon: MessageSquare, label: "Messages" },
  { icon: FileSignature, label: "Contracts", active: true },
  { icon: CalendarDays, label: "Calendar" },
];

const checklist = [
  { label: "Scope & deliverables agreed", done: true },
  { label: "Signed by Nova Athletics", done: true },
  { label: "Signed by Maya Chen", done: true },
  { label: "First draft due Nov 12", done: false },
];

const timeline = [
  { day: "Nov 04", label: "Brief accepted" },
  { day: "Nov 06", label: "Contract signed" },
  { day: "Nov 12", label: "Draft review" },
  { day: "Nov 18", label: "Go live" },
];

/** CSS/SVG product mockup. Purely illustrative, described by one label. */
function DealRoomMockup() {
  return (
    <div className="mockup">
      <div className="mockup__chrome">
        <span className="mockup__dot" />
        <span className="mockup__dot" />
        <span className="mockup__dot" />
        <span className="mockup__url">collabonet.app/deals/launch-week</span>
      </div>
      <div className="mockup__body">
        <aside className="mockup__sidebar">
          {sidebarItems.map(({ icon: Icon, label, active }) => (
            <span
              key={label}
              className={`mockup__nav${active ? " is-active" : ""}`}
            >
              <Icon size={16} />
              <span className="mockup__nav-label">{label}</span>
            </span>
          ))}
        </aside>
        <div className="mockup__main">
          <div className="mockup__header">
            <div>
              <p className="mockup__eyebrow">Deal room</p>
              <p className="mockup__title">Launch Week Sprint</p>
            </div>
            <span className="mini-pill mini-pill--accent">
              <CircleCheck size={12} /> Active
            </span>
          </div>

          <div className="mockup__grid">
            <div className="mockup__card">
              <p className="mockup__card-title">
                <FileSignature size={14} /> Contract
              </p>
              <ul className="mockup__checklist">
                {checklist.map((item) => (
                  <li key={item.label} className={item.done ? "is-done" : ""}>
                    <span className="mockup__check">
                      {item.done && <CircleCheck size={14} />}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mockup__card mockup__card--escrow">
              <p className="mockup__card-title">
                <ShieldCheck size={14} /> Escrow
              </p>
              <p className="mockup__amount">$9,500</p>
              <div className="mockup__progress">
                <span style={{ width: "62%" }} />
              </div>
              <p className="mockup__muted">Funded · releases on delivery</p>
              <div className="mockup__parties">
                <AvatarV2
                  fallbackText="NA"
                  size={AvatarV2Size.SM}
                  backgroundColor={BRAND.white}
                />
                <span className="mockup__arrow" />
                <AvatarV2
                  fallbackText="MC"
                  size={AvatarV2Size.SM}
                  backgroundColor={BRAND.pink}
                />
              </div>
            </div>
          </div>

          <ol className="mockup__timeline">
            {timeline.map((step, i) => (
              <li key={step.day} className={i < 2 ? "is-done" : ""}>
                <span className="mockup__timeline-dot" />
                <span className="mockup__timeline-day">{step.day}</span>
                <span className="mockup__timeline-label">{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function FloatingCards() {
  return (
    <div className="floaters" aria-hidden="true">
      <div className="float-card floater floater--a">
        <span className="float-card__icon float-card__icon--accent">
          <Wallet size={16} />
        </span>
        <span>
          <span className="float-card__label">Escrow funded</span>
          <span className="float-card__value">+$9,500</span>
        </span>
      </div>
      <div className="float-card floater floater--b">
        <AvatarV2
          fallbackText="JR"
          size={AvatarV2Size.SM}
          backgroundColor={BRAND.pink}
        />
        <span>
          <span className="float-card__label">Brief match</span>
          <span className="float-card__value">94% fit</span>
        </span>
      </div>
      <div className="float-card floater floater--c">
        <span className="float-card__icon float-card__icon--ink">
          <BadgeCheck size={16} />
        </span>
        <span>
          <span className="float-card__label">Contract</span>
          <span className="float-card__value">Signed 2 of 2</span>
        </span>
      </div>
      <div className="float-card floater floater--d">
        <span className="float-card__icon float-card__icon--outline">
          <Star size={16} />
        </span>
        <span>
          <span className="float-card__label">New review</span>
          <span className="float-card__value">4.9 rating</span>
        </span>
      </div>
    </div>
  );
}

export function Showcase() {
  const { showcase } = content;
  return (
    <section
      id="showcase"
      className="showcase"
      aria-labelledby="showcase-title"
    >
      <h2 id="showcase-title" className="visually-hidden">
        {showcase.heading}
      </h2>
      <div className="showcase__stage">
        <FloatingCards />
        <div
          className="showcase__device"
          role="img"
          aria-label={showcase.caption}
        >
          <DealRoomMockup />
        </div>
      </div>
    </section>
  );
}
