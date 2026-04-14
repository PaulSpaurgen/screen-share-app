import { useEffect, useCallback, useRef } from 'react';
import { fabric } from 'fabric';
import type { DrawingTool } from '../../store/types';
import { toolRegistry } from '../tools';
import { canvasRegistry, isCanvasAlive } from '../canvasRegistry';
import { useAppDispatch } from '../../store/hooks';
import { strokeCommitted } from '../annotationSlice';

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
}: UseFabricManagerOptions): void {
  const dispatch = useAppDispatch();
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const onStrokeComplete = useCallback(() => {
    if (!canvasRegistry.isRestoring) {
      dispatch(strokeCommitted());
    }
  }, [dispatch]);

  // ── Canvas init + ResizeObserver ───────────────────────────────────────────
  //
  // <Activity mode="hidden"> runs effect cleanups but keeps the component
  // mounted.  We only create the Fabric canvas once (guarded by fabricRef)
  // so toggling visibility doesn't destroy drawings.
  //
  // The ResizeObserver is re-attached on every effect run (visible ↔ hidden)
  // because the container may have resized while hidden.
  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    if (!fabricRef.current) {
      const { clientWidth: width, clientHeight: height } = container;

      const fc = new fabric.Canvas(el, {
        isDrawingMode: false,
        width,
        height,
        selection: false,
        backgroundColor: 'transparent',
      });

      fabricRef.current = fc;
      canvasRegistry.canvas = fc;

      dispatch(strokeCommitted());
    }

    const fc = fabricRef.current!;

    // Sync size in case the container resized while hidden.
    if (isCanvasAlive(fc)) {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      const prevWidth = fc.getWidth();
      const prevHeight = fc.getHeight();

      if (prevWidth > 0 && prevHeight > 0 && (nextWidth !== prevWidth || nextHeight !== prevHeight)) {
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
      }
    }

    const onResize = () => {
      if (!isCanvasAlive(fc)) return;

      const pw = fc.getWidth();
      const ph = fc.getHeight();
      const nw = container.clientWidth;
      const nh = container.clientHeight;

      if (pw === 0 || ph === 0) return;

      const sx = nw / pw;
      const sy = nh / ph;

      fc.setWidth(nw);
      fc.setHeight(nh);

      fc.getObjects().forEach((obj) => {
        obj.set({
          left: (obj.left ?? 0) * sx,
          top: (obj.top ?? 0) * sy,
          scaleX: (obj.scaleX ?? 1) * sx,
          scaleY: (obj.scaleY ?? 1) * sy,
        });
        obj.setCoords();
      });

      fc.renderAll();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    roRef.current = ro;

    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas disposal is handled by the screenShareSaga's teardown — NOT by
  // effect cleanup — because <Activity mode="hidden"> runs all effect
  // cleanups without truly unmounting the component.

  // ── Tool activation — each tool owns its own setup and cleanup ────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!isCanvasAlive(fc)) return;

    const activate = toolRegistry[activeTool];
    const cleanup = activate(fc, { strokeColor, strokeWidth, onStrokeComplete });

    return cleanup;
  }, [activeTool, strokeColor, strokeWidth, onStrokeComplete]);
}
