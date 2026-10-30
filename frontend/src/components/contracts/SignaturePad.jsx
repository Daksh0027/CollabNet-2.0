import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

const WIDTH = 300;
const HEIGHT = 180;

export function strokesToPath(strokes) {
  return (strokes || [])
    .filter((stroke) => stroke.length > 1)
    .map((stroke) => {
      const [first, ...rest] = stroke;
      return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
    })
    .join(" ");
}

export function SignaturePad({ strokes = [], onChange, disabled = false, readOnly = false }) {
  const [drawing, setDrawing] = useState(false);
  const strokesRef = useRef(strokes);
  const activeStrokeRef = useRef(null);
  const isDisabled = disabled || readOnly;

  const localPoint = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(WIDTH, ((event.clientX - bounds.left) / bounds.width) * WIDTH)),
      y: Math.max(0, Math.min(HEIGHT, ((event.clientY - bounds.top) / bounds.height) * HEIGHT)),
    };
  };

  const startStroke = (event) => {
    if (isDisabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = [localPoint(event)];
    activeStrokeRef.current = stroke;
    strokesRef.current = [...strokesRef.current, stroke];
    setDrawing(true);
    onChange?.(strokesRef.current);
  };

  const continueStroke = (event) => {
    if (!activeStrokeRef.current || isDisabled) return;
    const point = localPoint(event);
    activeStrokeRef.current.push(point);
    strokesRef.current = [...strokesRef.current.slice(0, -1), activeStrokeRef.current];
    onChange?.(strokesRef.current);
  };

  const finishStroke = (event) => {
    if (!activeStrokeRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activeStrokeRef.current = null;
    setDrawing(false);
    onChange?.(strokesRef.current);
  };

  const clear = () => {
    if (isDisabled) return;
    activeStrokeRef.current = null;
    strokesRef.current = [];
    setDrawing(false);
    onChange?.([]);
  };

  return (
    <div className={`signature-pad${isDisabled ? " is-disabled" : ""}`} data-testid="signature-pad">
      <div className="signature-pad-frame">
        <svg
          className="signature-pad-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={strokesRef.current.length ? "Captured signature" : "Empty signature pad"}
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onContextMenu={(event) => event.preventDefault()}
          data-drawing={drawing || undefined}
        >
          <line className="signature-pad-baseline" x1="20" y1="142" x2="280" y2="142" />
          {strokesRef.current.length === 0 && !readOnly ? (
            <text className="signature-pad-hint" x="150" y="130">Sign here</text>
          ) : null}
          {strokesRef.current.map((stroke, index) => (
            <path
              key={index}
              className="signature-pad-ink"
              d={strokesToPath([stroke])}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {!isDisabled && strokesRef.current.length > 0 ? (
          <button
            type="button"
            className="signature-pad-clear"
            onClick={clear}
            aria-label="Clear signature"
            data-testid="clear-signature-button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>
      <span className="signature-pad-helper">Use your mouse, touch, or stylus to sign.</span>
    </div>
  );
}
