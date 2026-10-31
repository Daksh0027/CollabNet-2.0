import { useEffect, useRef, useState } from "react";
import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  IconButton,
} from "@juspay/blend-design-system";
import { Menu, Moon, Sun, X } from "lucide-react";
import { content } from "../content";
import { useThemeMode } from "../blend/themeMode";
import { goToPrimaryAction } from "../primaryAction";
import { Logo } from "./Logo";

const MOBILE_MENU_ID = "mobile-menu";

export function ThemeIconButton() {
  const { mode, toggleMode } = useThemeMode();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <IconButton
      buttonType={ButtonV2Type.SECONDARY}
      size={ButtonV2Size.LARGE}
      aria-label={`Switch to ${next} theme`}
      icon={
        mode === "dark" ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )
      }
      onClick={toggleMode}
    />
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onChange = () => desktop.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  const handleCta = () => {
    setOpen(false);
    goToPrimaryAction();
  };

  return (
    <header className="site-header">
      <nav className="nav-pill" aria-label="Primary">
        <a
          className="nav-pill__brand"
          href="#top"
          aria-label={`${content.product.name} home`}
        >
          <Logo />
        </a>

        <ul className="nav-pill__links">
          {content.nav.links.map((link) => (
            <li key={link.href}>
              <a className="nav-link" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav-pill__actions">
          <div className="nav-pill__theme">
            <ThemeIconButton />
          </div>
          <div className="nav-pill__cta">
            <ButtonV2
              buttonType={ButtonV2Type.PRIMARY}
              size={ButtonV2Size.LARGE}
              text={content.primaryAction.label}
              onClick={handleCta}
            />
          </div>
          <div className="nav-pill__menu-toggle">
            <IconButton
              ref={toggleRef}
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.LARGE}
              aria-label={open ? "Close menu" : content.nav.menuLabel}
              aria-expanded={open}
              aria-controls={MOBILE_MENU_ID}
              icon={
                open ? (
                  <X size={18} aria-hidden="true" />
                ) : (
                  <Menu size={18} aria-hidden="true" />
                )
              }
              onClick={() => setOpen((v) => !v)}
            />
          </div>
        </div>

        <div id={MOBILE_MENU_ID} className="mobile-menu" hidden={!open}>
          <ul className="mobile-menu__links">
            {content.nav.links.map((link) => (
              <li key={link.href}>
                <a
                  className="mobile-menu__link"
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mobile-menu__footer">
            <span className="mobile-menu__label">Theme</span>
            <ThemeIconButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
