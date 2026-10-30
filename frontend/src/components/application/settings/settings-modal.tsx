"use client";

import { useDirection } from "@/components/foundations/direction/direction";
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  RiCheckboxCircleFill,
  RiCloseLine,
  RiDatabase2Line,
  RiSchoolLine,
  RiSettings6Line,
  RiToolsFill,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { useAuth } from "@/lib/auth";
import { SettingsProductPages } from "./SettingsProductPages";

/**
 * Figma sources: Board UI → "Settings/Profile" (node 4081:13943) and
 * "Settings/General" (node 4079:13037).
 *
 * The app-wide settings modal, opened from any sidebar's "Settings" item.
 *
 * Shell (1:1 with Figma):
 *   backdrop  color/bg_separator — black at 20%.
 *   panel     871×614 (max-height 614), radius/3xl (24px), white, shadow/xs.
 *   rail      240px desktop / 192px compact, bg background/secondary, 1px right border, p 10 —
 *             same group/item recipe as the board-team dropdown menus
 *             (label pl-8, items p-8 radius/2lg icon-20 + body-medium),
 *             selected row bg background/secondary/hover.
 *   content   px 32, title row fixed,
 *             the page itself scrolls when taller than the shell (General).
 *
 * Open/close animation: the panel fades + blurs in from scale 0.85 (300ms),
 * the backdrop cross-fades; the same transition plays in reverse on close,
 * and the modal unmounts only after the exit transition finishes.
 */

export type SettingsPage = "general" | "profile" | "storage" | "tools";

export interface SettingsModalProps {
  /** Controlled open state, owned by the host page, sidebar, or menu. */
  isOpen: boolean;
  /** Called by the backdrop, close button, and Escape key. */
  onClose: () => void;
  /** Page selected each time the modal opens. */
  defaultPage?: SettingsPage;
}

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

interface NavEntry {
  label: string;
  icon: IconComponent;
  page: SettingsPage;
}

const NAV_ITEMS: NavEntry[] = [
  { label: "General", icon: RiSettings6Line, page: "general" },
  { label: "Profile", icon: RiSchoolLine, page: "profile" },
  { label: "Tools", icon: RiToolsFill, page: "tools" },
  { label: "Storage", icon: RiDatabase2Line, page: "storage" },
];

const PAGE_TITLES: Record<SettingsPage, string> = {
  general: "General",
  profile: "Profile",
  storage: "Storage",
  tools: "Tools",
};

export function SettingsModal({
  isOpen,
  onClose,
  defaultPage = "general",
}: SettingsModalProps) {
  const direction = useDirection();
  const { user } = useAuth();
  const [page, setPage] = useState<SettingsPage>(defaultPage);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mount/visible two-phase state so both the enter and the exit play the
  // full fade + blur + scale transition before the DOM goes away.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const requestCloseRef = useRef<() => void>(() => {});

  // "Saved" toast — floats half-out of the panel's bottom edge for ~2s
  // whenever a profile field commits a change (Enter / blur). Three phases
  // so the motion is directional: it rises in from below ("hidden" starting
  // offset) and keeps drifting upward while fading out ("leaving" offset).
  const [savedPhase, setSavedPhase] = useState<"hidden" | "shown" | "leaving">("hidden");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSavedToast = () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedPhase("shown");
    savedTimer.current = setTimeout(() => {
      setSavedPhase("leaving");
      // Reset to the below-the-edge start once the fade-out finished, so the
      // next save rises in from the bottom again (invisible: opacity 0 → 0).
      savedTimer.current = setTimeout(() => setSavedPhase("hidden"), 220);
    }, 2000);
  };

  // Top fade over the scrolling page so rows dissolve under the title row
  // instead of cutting sharply (same recipe as the medical alerts feed).
  const [contentScrolled, setContentScrolled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setPage(defaultPage);
      setHasUnsavedChanges(false);
      setMounted(true);
      // Double rAF: the panel must commit its hidden state before the
      // transition to visible starts, or the browser skips the animation.
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      setSavedPhase("hidden");
      unmountTimer.current = setTimeout(() => setMounted(false), 180);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultPage only matters at the open transition
  }, [isOpen]);

  const requestClose = () => {
    if (hasUnsavedChanges && !window.confirm("Discard your unsaved changes?")) return false;
    setHasUnsavedChanges(false);
    onClose();
    return true;
  };
  requestCloseRef.current = requestClose;

  // Keep keyboard focus within the dialog, lock page scroll, and restore focus.
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseRef.current();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
        event.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [isOpen]);

  const selectPage = (nextPage: SettingsPage) => {
    if (nextPage === page) return;
    if (hasUnsavedChanges && !window.confirm("Discard your unsaved changes?")) return;
    setHasUnsavedChanges(false);
    setPage(nextPage);
    setContentScrolled(false);
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = NAV_ITEMS.findIndex((item) => item.page === page);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? NAV_ITEMS.length - 1
        : (currentIndex + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + NAV_ITEMS.length) % NAV_ITEMS.length;
    const nextItem = NAV_ITEMS[nextIndex];
    selectPage(nextItem.page);
    requestAnimationFrame(() => document.getElementById(`settings-tab-${nextItem.page}`)?.focus());
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div dir={direction} className="fixed inset-0 z-100 flex items-center justify-center p-4 max-sm:p-0" role="presentation">
      <button
        type="button"
        aria-label="Close Account settings"
        tabIndex={-1}
        onClick={requestClose}
        className={cx(
          "absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm transition-opacity duration-150 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Animated wrapper — carries the open/close transition for the panel
          AND the saved toast, which straddles the panel's bottom edge and so
          must live outside the panel's overflow-clip. */}
      <div
        className={cx(
          "relative",
          // Kept light on purpose: an 8px blur over the full 871×614 panel
          // forces a huge re-filter every frame of the scale-down, which is
          // what made the close stutter. 4px + GPU promotion stays smooth.
          "transform-gpu transition-[opacity,transform,filter] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[opacity,transform,filter]",
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.85] opacity-0 blur-[4px]",
        )}
      >
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-title"
        tabIndex={-1}
        className={cx(
          "relative flex h-[min(700px,calc(100dvh-32px))] max-h-[calc(100dvh-32px)] w-[min(880px,calc(100vw-32px))]",
          // overflow-CLIP, not hidden: hidden boxes are still programmatically
          // scrollable, so focusing a switch's hidden input in a row clipped
          // by the inner scroller made the browser scroll-reveal it through
          // the panel too — shifting the whole modal content up with no way
          // back. clip forbids scrolling outright.
          "overflow-hidden rounded-2xl border border-border bg-background shadow-2xl outline-none max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-full max-sm:rounded-none",
        )}
      >
        <nav
          aria-label="Settings sections"
          role="tablist"
          aria-orientation="vertical"
          className="flex w-14 shrink-0 flex-col gap-1 overflow-y-auto border-e border-border bg-secondary/60 p-2.5 sm:w-48 lg:w-56 max-sm:absolute max-sm:inset-x-0 max-sm:top-[68px] max-sm:z-10 max-sm:h-12 max-sm:w-full max-sm:flex-row max-sm:overflow-x-auto max-sm:border-e-0 max-sm:border-b max-sm:bg-background max-sm:p-1"
        >
          {NAV_ITEMS.map((item) => {
            const selected = item.page === page;
            return (
              <button
                key={item.page}
                id={`settings-tab-${item.page}`}
                type="button"
                role="tab"
                aria-label={item.label}
                aria-selected={selected}
                aria-controls="settings-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectPage(item.page)}
                onKeyDown={handleTabKeyDown}
                className={cx(
                  "flex min-h-10 w-full shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-start text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 max-sm:w-auto max-sm:min-h-9 max-sm:justify-center max-sm:px-3",
                  selected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden truncate sm:block">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4 sm:px-7"
          >
            <div>
              <h2 id="account-settings-title" className="text-base font-semibold text-foreground">Account settings</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{PAGE_TITLES[page]}</p>
            </div>
            <button
              type="button"
              aria-label="Close Account settings"
              onClick={requestClose}
              className={cx(
                "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border",
                "text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
            >
              <RiCloseLine className="size-4" aria-hidden />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              id="settings-panel"
              role="tabpanel"
              aria-labelledby={`settings-tab-${page}`}
              tabIndex={0}
              className="h-full overflow-y-auto px-5 py-4 sm:px-7 sm:py-5 max-sm:pt-[68px]"
              onScroll={(e) => setContentScrolled(e.currentTarget.scrollTop > 0)}
            >
              <SettingsProductPages
                page={page}
                user={user}
                onDirty={setHasUnsavedChanges}
                onSaved={showSavedToast}
                onNavigate={requestClose}
              />
            </div>
            {/* Progressive top fade — eases in once the page is scrolled so
                content dissolves under the title row instead of hard-cutting. */}
            <div
              aria-hidden
              className={cx(
                "pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-background-primary-default to-transparent",
                "transition-opacity duration-200 ease-out",
                contentScrolled ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      {/* Saved toast — straddles the panel's bottom edge, half in / half out. */}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1",
          "rounded-full border border-border-button-default bg-background-primary-default py-1 pe-2.5 ps-1.5 shadow-dropdown",
          "transition-[opacity,transform,filter] duration-200 ease-out",
          savedPhase === "shown" && "translate-y-1/2 opacity-100 scale-100 blur-0",
          // Starts below the resting spot, rises in; keeps drifting up on exit.
          savedPhase === "hidden" && "translate-y-[calc(50%+12px)] opacity-0 scale-90 blur-[2px]",
          savedPhase === "leaving" && "translate-y-[calc(50%-10px)] opacity-0 scale-90 blur-[2px]",
        )}
      >
        <RiCheckboxCircleFill className="size-4 shrink-0 text-lime-600" aria-hidden />
        <span className="text-body-2-medium whitespace-nowrap text-text-primary">Saved</span>
      </div>
      </div>
    </div>,
    document.body,
  );
}
