import { lazy, Suspense, useRef, useState, useCallback, useLayoutEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAppSelector } from "./store/hooks";
import { useScreenCapture } from "./screen-share/hooks/useScreenCapture";
import Toolbar from "./components/Toolbar";

const CanvasOverlay = lazy(
  () => import("./annotations/components/CanvasOverlay")
);

function ScreenShareInner() {
  const status = useAppSelector((s) => s.screenShare.status);
  const error = useAppSelector((s) => s.screenShare.error);
  const isEnabled = useAppSelector((s) => s.annotation.isEnabled);

  const { liveVideoRef, startCapture, stopCapture } = useScreenCapture();

  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoAspectRef = useRef<number | null>(null);
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number } | null>(null);

  const updateRenderedSize = useCallback(() => {
    const wrapper = videoWrapperRef.current;
    const aspect = videoAspectRef.current;
    if (!wrapper || !aspect) return;

    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;

    let w: number, h: number;
    if (availW / availH > aspect) {
      h = availH;
      w = availH * aspect;
    } else {
      w = availW;
      h = availW / aspect;
    }

    setRenderedSize({ width: Math.round(w), height: Math.round(h) });
  }, []);

  useLayoutEffect(() => {
    const wrapper = videoWrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(updateRenderedSize);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [updateRenderedSize]);

  const isActive = status === "active";

  const statusMessage: Record<string, string> = {
    idle: "Ready to share your screen.",
    requesting: "Waiting for permission…",
    active: "Sharing and recording…",
    error: error ?? "An error occurred.",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#111827", overflow: "hidden" }}>

      <div
        ref={videoWrapperRef}
        style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#111827" }}
      >
        <div
          id="video-container"
          style={{
            position: "relative",
            width: renderedSize ? renderedSize.width : "100%",
            height: renderedSize ? renderedSize.height : "100%",
          }}
        >
          <video
            ref={liveVideoRef}
            muted
            autoPlay
            playsInline
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              videoAspectRef.current = v.videoWidth / v.videoHeight;
              updateRenderedSize();
            }}
            style={{ width: "100%", height: "100%", display: "block", background: "#111827" }}
          />

          {!isActive && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "1rem", pointerEvents: "none" }}>
              {statusMessage[status]}
            </div>
          )}

          {isEnabled && isActive && (
            <Suspense fallback={null}>
              <CanvasOverlay />
            </Suspense>
          )}
        </div>
      </div>

      <Toolbar onStartSharing={startCapture} onStopCapture={stopCapture} />
    </div>
  );
}

export default function ScreenSharePage() {
  return (
    <Provider store={store}>
      <ScreenShareInner />
    </Provider>
  );
}
