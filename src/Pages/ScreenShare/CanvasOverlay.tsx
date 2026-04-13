import { useEffect, useRef, useCallback } from "react";
import { fabric } from "fabric";
import { useAppSelector } from "./store/hooks";

/** Convert a hex color + alpha into an rgba() string fabric can use. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const CanvasOverlay: React.FC = () => {
  const { activeTool, strokeColor, strokeWidth } = useAppSelector(
    (s) => s.annotation
  );

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isErasingRef = useRef(false);

  // ── Eraser handlers (kept stable via useCallback) ──────────────────────────
  const onEraseDown = useCallback(() => {
    isErasingRef.current = true;
  }, []);

  const onEraseUp = useCallback(() => {
    isErasingRef.current = false;
  }, []);

  const onEraseMove = useCallback((opt: fabric.IEvent) => {
    if (!isErasingRef.current || !fabricRef.current) return;
    const fc = fabricRef.current;
    const pointer = fc.getPointer(opt.e as MouseEvent);
    const radius = 20; // eraser hit radius in canvas pixels

    fc.getObjects().forEach((obj) => {
      const objCenter = obj.getCenterPoint();
      const dx = objCenter.x - pointer.x;
      const dy = objCenter.y - pointer.y;
      // Remove objects whose bounding-box centre falls within the eraser circle
      if (Math.sqrt(dx * dx + dy * dy) < radius + Math.max(obj.width ?? 0, obj.height ?? 0) / 2) {
        fc.remove(obj);
      }
    });

    fc.renderAll();
  }, []);

  // ── Initialise fabric canvas once on mount ─────────────────────────────────
  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const { clientWidth: width, clientHeight: height } = container;

    const fc = new fabric.Canvas(el, {
      isDrawingMode: true,
      width,
      height,
      selection: false,
      backgroundColor: "transparent",
    });
    fabricRef.current = fc;

    // Scale all objects proportionally when the container changes size.
    const onResize = () => {
      const prevWidth = fc.getWidth();
      const prevHeight = fc.getHeight();
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;

      if (prevWidth === 0 || prevHeight === 0) return;

      const scaleX = nextWidth / prevWidth;
      const scaleY = nextHeight / prevHeight;

      fc.setWidth(nextWidth);
      fc.setHeight(nextHeight);

      fc.getObjects().forEach((obj) => {
        obj.set({
          left: (obj.left ?? 0) * scaleX,
          top: (obj.top ?? 0) * scaleY,
          scaleX: (obj.scaleX ?? 1) * scaleX,
          scaleY: (obj.scaleY ?? 1) * scaleY,
        });
        obj.setCoords();
      });

      fc.renderAll();
    };

    // ResizeObserver catches ALL size changes (window resize, DevTools open/close,
    // panel resizes, etc.) — more reliable than window "resize" alone.
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      fc.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ── Sync tool / colour / width changes into the fabric canvas ──────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    // Remove any previously attached eraser listeners first
    fc.off("mouse:down", onEraseDown);
    fc.off("mouse:up", onEraseUp);
    fc.off("mouse:move", onEraseMove);
    isErasingRef.current = false;

    if (activeTool === "eraser") {
      // Eraser: disable free-drawing; use mouse events to delete hit paths
      fc.isDrawingMode = false;
      fc.defaultCursor = "cell";
      fc.on("mouse:down", onEraseDown);
      fc.on("mouse:up", onEraseUp);
      fc.on("mouse:move", onEraseMove);
      return;
    }

    // Pen or Highlighter: free-drawing with PencilBrush
    fc.isDrawingMode = true;
    fc.defaultCursor = "crosshair";

    const brush = new fabric.PencilBrush(fc);

    if (activeTool === "highlighter") {
      brush.color = hexToRgba(strokeColor, 0.35);
      brush.width = strokeWidth * 6;
      // Flat, chisel-like line cap gives a marker feel
      brush.strokeLineCap = "square";
    } else {
      // pen
      brush.color = strokeColor;
      brush.width = strokeWidth;
      brush.strokeLineCap = "round";
    }

    fc.freeDrawingBrush = brush;
  }, [activeTool, strokeColor, strokeWidth, onEraseDown, onEraseUp, onEraseMove]);

  return (
    <div ref={containerRef} style={overlayStyle}>
      <canvas ref={canvasElRef} />
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 10,
  pointerEvents: "auto",
};

export default CanvasOverlay;
