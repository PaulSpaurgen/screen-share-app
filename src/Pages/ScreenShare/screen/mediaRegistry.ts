/**
 * Module-level registry for non-serializable browser media objects.
 * MediaStream and MediaRecorder cannot be stored in Redux state, so they
 * live here and are managed exclusively by screenShareSaga.
 *
 * `videoEl` is mirrored from useScreenCapture so that screenshotUtils can
 * capture the current video frame without prop-drilling.
 */
export const mediaRegistry = {
  stream: null as MediaStream | null,
  mediaRecorder: null as MediaRecorder | null,
  chunks: [] as Blob[],
  videoEl: null as HTMLVideoElement | null,
};
