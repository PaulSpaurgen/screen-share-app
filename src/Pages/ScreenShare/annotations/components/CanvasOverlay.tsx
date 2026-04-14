import { useRef } from "react";
import { useAppSelector } from "../../store/hooks";
import { useFabricManager } from "../hooks/useFabricManager";

const CanvasOverlay: React.FC = () => {
  const activeTool = useAppSelector((state) => state.annotation.activeTool);
  const strokeColor = useAppSelector((state) => state.annotation.strokeColor);
  const strokeWidth = useAppSelector((state) => state.annotation.strokeWidth);

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useFabricManager({
    containerRef,
    canvasElRef,
    activeTool,
    strokeColor,
    strokeWidth,
  });

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
