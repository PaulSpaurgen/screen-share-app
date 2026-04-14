import { useEffect, useRef, useCallback } from "react";
import { fabric } from "fabric";
import { hexToRgba } from "../utils/hexToRgba";
import type { DrawingTool } from "../../store/types";

interface UseFabricManagerOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  activeTool: DrawingTool;
  strokeColor: string;
  strokeWidth: number;
}

export function useFabricManager({
  containerRef,
  canvasElRef,
  activeTool,
  strokeColor,
  strokeWidth,
}: UseFabricManagerOptions): React.RefObject<fabric.Canvas | null> {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isErasingRef = useRef(false);

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
    const radius = 20;

    fc.getObjects().forEach((obj) => {
      const objCenter = obj.getCenterPoint();
      const dx = objCenter.x - pointer.x;
      const dy = objCenter.y - pointer.y;
      if (Math.sqrt(dx * dx + dy * dy) < radius + Math.max(obj.width ?? 0, obj.height ?? 0) / 2) {
        fc.remove(obj);
      }
    });

    fc.renderAll();
  }, []);

  // Initialise fabric canvas once on mount
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

    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      fc.dispose();
      fabricRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync tool / colour / width changes into the fabric canvas
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    fc.off("mouse:down", onEraseDown);
    fc.off("mouse:up", onEraseUp);
    fc.off("mouse:move", onEraseMove);
    isErasingRef.current = false;

    if (activeTool === "eraser") {
      fc.isDrawingMode = false;
      fc.defaultCursor = "cell";
      fc.on("mouse:down", onEraseDown);
      fc.on("mouse:up", onEraseUp);
      fc.on("mouse:move", onEraseMove);
      return;
    }

    fc.isDrawingMode = true;
    fc.defaultCursor = "crosshair";

    const brush = new fabric.PencilBrush(fc);

    if (activeTool === "highlighter") {
      brush.color = hexToRgba(strokeColor, 0.35);
      brush.width = strokeWidth * 6;
      brush.strokeLineCap = "square";
    } else {
      brush.color = strokeColor;
      brush.width = strokeWidth;
      brush.strokeLineCap = "round";
    }

    fc.freeDrawingBrush = brush;
  }, [activeTool, strokeColor, strokeWidth, onEraseDown, onEraseUp, onEraseMove]);

  return fabricRef;
}
