import { useLayoutEffect, useRef, useState } from "react";
import "./FlipCard.css";

function cssLength(value) {
  return typeof value === "number" ? `${value}px` : value;
}

export default function FlipCard({
  front,
  back,
  axis = "y",
  flipOnClick = true,
  draggable = false,
  dragDistance = 0,
  tilt = false,
  tiltMax = 12,
  glare = false,
  glareOpacity = 0.22,
  hoverScale = 1,
  perspective = 1100,
  stiffness = 170,
  damping = 20,
  width = "100%",
  height,
  radius = 22,
  background,
  color,
  shadow = true,
  shadowColor = "#000000",
  shadowOpacity = 0.16,
  role = "group",
  onFlipChange,
}) {
  const [flipped, setFlipped] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [activeHeight, setActiveHeight] = useState(null);
  const frontContentRef = useRef(null);
  const backContentRef = useRef(null);
  const dragStart = useRef(null);
  const skipClick = useRef(false);
  const transitionDuration = Math.round(
    Math.min(700, Math.max(280, 1000 * Math.sqrt(damping / stiffness))),
  );
  const style = {
    "--flip-perspective": cssLength(perspective),
    "--flip-radius": cssLength(radius),
    "--flip-duration": `${transitionDuration}ms`,
    "--flip-hover-scale": hoverScale,
    ...(tilt
      ? {
          "--flip-tilt-x": `${rotation.x}deg`,
          "--flip-tilt-y": `${rotation.y}deg`,
        }
      : {}),
    "--flip-shadow": shadow
      ? `0 14px 36px ${shadowColor}${Math.round(shadowOpacity * 255)
          .toString(16)
          .padStart(2, "0")}`
      : "none",
    width: cssLength(width),
    height: height ? cssLength(height) : activeHeight ? `${activeHeight}px` : undefined,
    color,
    background,
  };

  useLayoutEffect(() => {
    if (height) return undefined;
    const activeContent = flipped ? backContentRef.current : frontContentRef.current;
    if (!activeContent) return undefined;

    const updateHeight = () => {
      const nextHeight = Math.ceil(activeContent.getBoundingClientRect().height);
      setActiveHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(activeContent);
    return () => resizeObserver.disconnect();
  }, [flipped, front, back, height]);

  const toggle = () => {
    setFlipped((current) => {
      onFlipChange?.(!current);
      return !current;
    });
  };

  const isInteractiveTarget = (target) =>
    target instanceof Element &&
    Boolean(target.closest("button, a, input, textarea, select, [role='button']"));

  const handleClick = (event) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (event.target instanceof Element && event.target.closest("[data-flip-card-trigger]")) {
      toggle();
      return;
    }
    if (!flipOnClick || isInteractiveTarget(event.target)) return;
    toggle();
  };

  const handleKeyDown = (event) => {
    if (flipOnClick && (event.key === "Enter" || event.key === " ")) {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      toggle();
    }
  };

  const handlePointerDown = (event) => {
    if (!draggable || event.button !== 0 || isInteractiveTarget(event.target)) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    if (!dragStart.current) return;
    const delta =
      axis === "x"
        ? event.clientY - dragStart.current.y
        : event.clientX - dragStart.current.x;
    dragStart.current = null;
    if (Math.abs(delta) <= dragDistance) return;

    skipClick.current = true;
    toggle();
    window.setTimeout(() => {
      skipClick.current = false;
    }, 0);
  };

  const handlePointerMove = (event) => {
    if (!tilt || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setRotation({
      x: -y * tiltMax,
      y: x * tiltMax,
    });
  };

  const resetTilt = () => setRotation({ x: 0, y: 0 });

  return (
    <div
      className={`flip-card${flipped ? " is-flipped" : ""}${flipOnClick ? " flip-card--clickable" : ""}${tilt ? " flip-card--tilt" : ""}${hoverScale !== 1 ? " flip-card--scale" : ""}`}
      style={style}
      data-axis={axis}
      role={role}
      tabIndex={0}
      aria-label={flipped ? "Card details; activate to flip back" : "Card summary; activate to see details"}
      aria-roledescription="flippable card"
      aria-expanded={flipped}
      data-testid="flip-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
        resetTilt();
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <div
        className="flip-card-inner"
        style={{ transform: `rotate${axis.toUpperCase()}(${flipped ? 180 : 0}deg)` }}
      >
        <div className="flip-card-face flip-card-front" aria-hidden={flipped} inert={flipped ? true : undefined}>
          <div className="flip-card-content" ref={frontContentRef}>
            {front}
          </div>
        </div>
        <div className="flip-card-face flip-card-back" aria-hidden={!flipped} inert={!flipped ? true : undefined}>
          <div className="flip-card-content" ref={backContentRef}>
            {back}
          </div>
        </div>
      </div>
      {glare ? (
        <span
          className="flip-card-glare"
          aria-hidden="true"
          style={{ "--flip-glare-opacity": glareOpacity }}
        />
      ) : null}
    </div>
  );
}
