import { useRef, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { startCaptureRequest, stopCaptureRequest } from '../screenShareSlice';
import { mediaRegistry } from '../mediaRegistry';

/**
 * Thin hook that:
 *  - dispatches saga trigger actions (startCaptureRequest / stopCaptureRequest)
 *  - owns the <video> ref and syncs the MediaStream to it whenever the
 *    saga updates Redux status to "active" or clears it back to "idle".
 *
 * All async work (permission prompt, MediaRecorder lifecycle, track-end
 * detection) is handled exclusively in screenShareSaga.ts.
 */
export function useScreenCapture() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.screenShare.status);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  // Sync the live stream to the video element whenever status changes.
  useEffect(() => {
    const video = liveVideoRef.current;
    if (!video) return;

    if (status === 'active') {
      const stream = mediaRegistry.stream;
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        void video.play().catch(() => {});
      }
    } else {
      video.srcObject = null;
    }
  }, [status]);

  const startCapture = useCallback(() => {
    dispatch(startCaptureRequest());
  }, [dispatch]);

  const stopCapture = useCallback(() => {
    dispatch(stopCaptureRequest());
  }, [dispatch]);

  return { liveVideoRef, startCapture, stopCapture };
}
