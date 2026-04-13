import { useRef, useState, useCallback, useLayoutEffect } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setStatus, setError, reset } from "./store/slices/screenShareSlice";
import { resetAnnotation } from "./store/slices/annotationSlice";
import Toolbar from "./components/Toolbar";
import CanvasOverlay from "./CanvasOverlay";

export default function ScreenShare() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.screenShare);
  const { isEnabled } = useAppSelector((s) => s.annotation);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoAspectRef = useRef<number | null>(null);
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number } | null>(null);

  // Recompute the exact pixel area the video content occupies (objectFit: contain logic).
  const updateRenderedSize = useCallback(() => {
    const wrapper = videoWrapperRef.current;
    const aspect = videoAspectRef.current;
    if (!wrapper || !aspect) return;

    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;

    let w: number, h: number;
    if (availW / availH > aspect) {
      // Wrapper is wider than video → constrained by height
      h = availH;
      w = availH * aspect;
    } else {
      // Wrapper is taller than video → constrained by width
      w = availW;
      h = availW / aspect;
    }

    setRenderedSize({ width: Math.round(w), height: Math.round(h) });
  }, []);

  // Watch the wrapper for any size change and recompute.
  useLayoutEffect(() => {
    const wrapper = videoWrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(updateRenderedSize);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [updateRenderedSize]);

  const isActive = status === "active";

  const streamToVideoTag = (stream: MediaStream | null) => {
    const video = liveVideoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => {});
  };

  const stopCapture = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    streamToVideoTag(null);
    dispatch(reset());
    dispatch(resetAnnotation());
  };

  const handleStartSharing = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      dispatch(setError("Screen sharing is not supported in this browser."));
      return;
    }
    dispatch(setStatus("requesting"));
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      chunksRef.current = [];
      streamRef.current = stream;
      streamToVideoTag(stream);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        dispatch(reset());
      };

      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopCapture());

      mediaRecorder.start();
      dispatch(setStatus("active"));
    } catch {
      dispatch(setError("Screen sharing was cancelled or failed."));
    }
  };

  const statusMessage: Record<string, string> = {
    idle: "Ready to share your screen.",
    requesting: "Waiting for permission…",
    active: "Sharing and recording…",
    error: error ?? "An error occurred.",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#111827", overflow: "hidden" }}>

      {/* Outer wrapper — takes all remaining space and centres the video box */}
      <div
        ref={videoWrapperRef}
        style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#111827" }}
      >
        {/* Inner box — sized exactly to the rendered video content, no letterbox gaps */}
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

          {isEnabled && isActive && <CanvasOverlay />}
        </div>
      </div>

      <Toolbar onStartSharing={handleStartSharing} onStopCapture={stopCapture} />
    </div>
  );
}
