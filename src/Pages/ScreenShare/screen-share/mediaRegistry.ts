/**
 * Module-level registry for non-serializable browser media objects.
 * MediaStream and MediaRecorder cannot be stored in Redux state, so they
 * live here and are managed exclusively by screenShareSaga.
 */
export const mediaRegistry = {
  stream: null as MediaStream | null,
  mediaRecorder: null as MediaRecorder | null,
  chunks: [] as Blob[],
};
