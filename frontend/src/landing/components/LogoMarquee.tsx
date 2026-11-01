import { useState } from "react";
import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
} from "@juspay/blend-design-system";
import { Pause, Play } from "lucide-react";
import { content } from "../content";

const shapes = ["circle", "square", "diamond", "ring"] as const;

/** Placeholder logo: a geometric glyph plus a fictional wordmark. */
function PlaceholderLogo({ name, index }: { name: string; index: number }) {
  const shape = shapes[index % shapes.length];
  return (
    <span className="logo-placeholder">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {shape === "circle" && (
          <circle cx="12" cy="12" r="9" fill="currentColor" />
        )}
        {shape === "square" && (
          <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" />
        )}
        {shape === "diamond" && (
          <path d="M12 2 22 12 12 22 2 12Z" fill="currentColor" />
        )}
        {shape === "ring" && (
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
          />
        )}
      </svg>
      <span>{name}</span>
    </span>
  );
}

export function LogoMarquee() {
  const { logos } = content;
  const [paused, setPaused] = useState(false);

  return (
    <section className="trust" aria-labelledby="trust-title">
      <div className="trust__header">
        <h2 id="trust-title" className="trust__title">
          {logos.heading}
        </h2>
        <div className="trust__control">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.LARGE}
            text={paused ? "Play logos" : "Pause logos"}

            leftSlot={{
              slot: paused ? (
                <Play size={14} aria-hidden="true" />
              ) : (
                <Pause size={14} aria-hidden="true" />
              ),
            }}
            onClick={() => setPaused((p) => !p)}
          />
        </div>
      </div>

      <div className={`marquee${paused ? " is-paused" : ""}`}>
        <div className="marquee__track">
          <ul className="marquee__list">
            {logos.names.map((name, i) => (
              <li key={name}>
                <PlaceholderLogo name={name} index={i} />
              </li>
            ))}
          </ul>
          {/* Visual duplicate for a seamless loop; hidden from assistive tech. */}
          <ul className="marquee__list" aria-hidden="true">
            {logos.names.map((name, i) => (
              <li key={name}>
                <PlaceholderLogo name={name} index={i} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
