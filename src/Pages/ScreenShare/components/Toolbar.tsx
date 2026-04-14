import { memo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setAnnotationEnabled,
  setActiveTool,
  setStrokeColor,
  setStrokeWidth,
  undoRequested,
  redoRequested,
  clearCanvasRequested,
} from '../annotations/annotationSlice';
import { DrawingTool } from '../store/types';
import { captureScreenshot } from '../screen/screenshotUtils';

const btn = (
  active: boolean,
  disabled = false,
  danger = false,
): React.CSSProperties => ({
  padding: '0.4rem 0.75rem',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: danger ? '#dc2626' : active ? '#6366f1' : '#374151',
  color: 'white',
  border: active ? '2px solid #a5b4fc' : '2px solid transparent',
  fontWeight: active ? 700 : 400,
  fontSize: '0.8rem',
  opacity: disabled ? 0.45 : 1,
  transition: 'background 0.15s',
  whiteSpace: 'nowrap' as const,
});

const DRAWING_TOOLS: { id: DrawingTool; label: string }[] = [
  { id: 'pen',         label: 'Pen'       },
  { id: 'highlighter', label: 'Highlight' },
  { id: 'rectangle',   label: 'Rect'      },
  { id: 'arrow',       label: 'Arrow'     },
  { id: 'text',        label: 'Text'      },
  { id: 'eraser',      label: 'Eraser'    },
];

// ---------------------------------------------------------------------------
// Sub-components — each has a narrow selector so only it re-renders
// when its specific slice of state changes.
// ---------------------------------------------------------------------------

interface StartStopButtonProps {
  onStartSharing: () => void;
  onStopCapture: () => void;
}

function StartStopButton({ onStartSharing, onStopCapture }: StartStopButtonProps) {
  const status = useAppSelector((s) => s.screenShare.status);
  const isActive = status === 'active';
  const isRequesting = status === 'requesting';

  return (
    <button
      onClick={() => (isActive ? onStopCapture() : onStartSharing())}
      disabled={isRequesting}
      style={{
        ...btn(false, isRequesting, isActive),
        background: isActive ? '#dc2626' : '#2563eb',
        fontWeight: 700,
        fontSize: '0.875rem',
        padding: '0.5rem 1.1rem',
      }}
    >
      {isActive ? 'Stop Sharing' : isRequesting ? 'Connecting…' : 'Start Sharing'}
    </button>
  );
}

function AnnotationToggle() {
  const dispatch = useAppDispatch();
  const isEnabled = useAppSelector((s) => s.annotation.isEnabled);

  return (
    <button
      onClick={() => dispatch(setAnnotationEnabled(!isEnabled))}
      style={{
        ...btn(isEnabled),
        background: isEnabled ? '#10b981' : '#4b5563',
        fontWeight: 700,
        fontSize: '0.875rem',
        padding: '0.5rem 1rem',
      }}
    >
      {isEnabled ? 'Drawing ON' : 'Drawing OFF'}
    </button>
  );
}

function ToolPicker() {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((s) => s.annotation.activeTool);

  return (
    <select
      value={activeTool}
      onChange={(e) => dispatch(setActiveTool(e.target.value as DrawingTool))}
      style={{
        padding: '0.4rem 0.6rem',
        borderRadius: '6px',
        cursor: 'pointer',
        background: '#374151',
        color: 'white',
        border: '2px solid #4b5563',
        fontWeight: 700,
        fontSize: '0.8rem',
        outline: 'none',
      }}
    >
      {DRAWING_TOOLS.map((t) => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  );
}

function StrokeControls() {
  const dispatch = useAppDispatch();
  const strokeColor = useAppSelector((s) => s.annotation.strokeColor);
  const strokeWidth = useAppSelector((s) => s.annotation.strokeWidth);
  const activeTool  = useAppSelector((s) => s.annotation.activeTool);

  if (activeTool === 'eraser' || activeTool === 'text') return null;

  return (
    <>
      <input
        type="color"
        value={strokeColor}
        onChange={(e) => dispatch(setStrokeColor(e.target.value))}
        title="Stroke colour"
        style={{
          width: 30,
          height: 30,
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'transparent',
        }}
      />
      <input
        type="range"
        min={1}
        max={20}
        value={strokeWidth}
        onChange={(e) => dispatch(setStrokeWidth(Number(e.target.value)))}
        title="Stroke width"
        style={{ width: 72, accentColor: '#6366f1' }}
      />
    </>
  );
}

function UndoRedoControls() {
  const dispatch = useAppDispatch();
  const canUndo = useAppSelector((s) => s.annotation.canUndo);
  const canRedo = useAppSelector((s) => s.annotation.canRedo);

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        borderLeft: '1px solid #4b5563',
        paddingLeft: '0.5rem',
        marginLeft: '0.25rem',
      }}
    >
      <button
        onClick={() => dispatch(undoRequested())}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={btn(false, !canUndo)}
      >
        ↩ Undo
      </button>
      <button
        onClick={() => dispatch(redoRequested())}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        style={btn(false, !canRedo)}
      >
        ↪ Redo
      </button>
      <button
        onClick={() => dispatch(clearCanvasRequested())}
        title="Clear all drawings"
        style={{ ...btn(false, false, true), fontSize: '0.75rem' }}
      >
        Clear All
      </button>
    </div>
  );
}

// No Redux reads, no props — truly never needs to re-render after mount.
const ScreenshotButton = memo(() => (
  <button
    onClick={captureScreenshot}
    title="Download screenshot (video + annotations)"
    style={{
      ...btn(false),
      background: '#0f766e',
      fontWeight: 700,
      fontSize: '0.8rem',
      padding: '0.4rem 0.85rem',
    }}
  >
    📷 Screenshot
  </button>
));
ScreenshotButton.displayName = 'ScreenshotButton';

// ---------------------------------------------------------------------------
// Root Toolbar
// ---------------------------------------------------------------------------

interface ToolbarProps {
  onStartSharing: () => void;
  onStopCapture: () => void;
}

export default function Toolbar({ onStartSharing, onStopCapture }: ToolbarProps) {
  const status    = useAppSelector((s) => s.screenShare.status);
  const error     = useAppSelector((s) => s.screenShare.error);
  const isEnabled = useAppSelector((s) => s.annotation.isEnabled);

  const isActive = status === 'active';

  return (
    <div
      style={{
        minHeight: 64,
        background: '#1f2937',
        borderTop: '1px solid #374151',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        padding: '0.5rem 1.25rem',
        gap: '0.5rem',
        flexShrink: 0,
      }}
    >
      <StartStopButton onStartSharing={onStartSharing} onStopCapture={onStopCapture} />

      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
          <AnnotationToggle />
          {isEnabled && (
            <>
              <ToolPicker />
              <StrokeControls />
              <UndoRedoControls />
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
        {isActive && <ScreenshotButton />}
        {status === 'error' && (
          <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</span>
        )}
      </div>
    </div>
  );
}
