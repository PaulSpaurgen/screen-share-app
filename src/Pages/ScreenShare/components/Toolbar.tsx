import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setAnnotationEnabled,
  setActiveTool,
  setStrokeColor,
  setStrokeWidth,
} from "../store/slices/annotationSlice";
import { DrawingTool } from "../store/types";

interface ToolbarProps {
  onStartSharing: () => void;
  onStopCapture: () => void;
}

const tools: { id: DrawingTool; label: string }[] = [
  { id: "pen", label: "Pen" },
  { id: "highlighter", label: "Highlighter" },
  { id: "eraser", label: "Eraser" },
];

export default function Toolbar({ onStartSharing, onStopCapture }: ToolbarProps) {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.screenShare);
  const { isEnabled, activeTool, strokeColor, strokeWidth } = useAppSelector(
    (s) => s.annotation
  );

  const isActive = status === "active";

  return (
    <div style={{
      height: 64,
      background: "#1f2937",
      borderTop: "1px solid #374151",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 1.25rem",
      gap: "0.75rem",
      flexShrink: 0,
    }}>

      {/* Left: start / stop */}
      <button
        onClick={() => (isActive ? onStopCapture() : onStartSharing())}
        disabled={status === "requesting"}
        style={{
          padding: "0.5rem 1.1rem",
          borderRadius: "6px",
          cursor: status === "requesting" ? "not-allowed" : "pointer",
          background: isActive ? "#dc2626" : "#2563eb",
          color: "white",
          border: "none",
          fontWeight: 700,
          fontSize: "0.875rem",
          opacity: status === "requesting" ? 0.6 : 1,
        }}
      >
        {isActive ? "Stop Sharing" : status === "requesting" ? "Connecting…" : "Start Sharing"}
      </button>

      {/* Center: annotation toggle + tool picker (only while active) */}
      {isActive && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => dispatch(setAnnotationEnabled(!isEnabled))}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              background: isEnabled ? "#10b981" : "#4b5563",
              color: "white",
              border: "none",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            {isEnabled ? "Drawing ON" : "Drawing OFF"}
          </button>

          {isEnabled && tools.map((t) => (
            <button
              key={t.id}
              onClick={() => dispatch(setActiveTool(t.id))}
              title={t.label}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                cursor: "pointer",
                background: activeTool === t.id ? "#6366f1" : "#374151",
                color: "white",
                border: activeTool === t.id ? "2px solid #a5b4fc" : "2px solid transparent",
                fontWeight: activeTool === t.id ? 700 : 400,
                fontSize: "0.8rem",
                transition: "background 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}

          {isEnabled && (
            <>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => dispatch(setStrokeColor(e.target.value))}
                title="Stroke color"
                style={{ width: 30, height: 30, border: "none", borderRadius: 4, cursor: "pointer", background: "transparent" }}
              />
              <input
                type="range"
                min={1}
                max={20}
                value={strokeWidth}
                onChange={(e) => dispatch(setStrokeWidth(Number(e.target.value)))}
                title="Stroke width"
                style={{ width: 80, accentColor: "#6366f1" }}
              />
            </>
          )}
        </div>
      )}

      {/* Right: error message */}
      {status === "error" && (
        <span style={{ color: "#f87171", fontSize: "0.8rem" }}>{error}</span>
      )}
    </div>
  );
}
