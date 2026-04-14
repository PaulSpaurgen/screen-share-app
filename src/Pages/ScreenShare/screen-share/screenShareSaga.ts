import { call, put, race, take, takeLatest } from 'redux-saga/effects';
import { eventChannel, END, EventChannel } from 'redux-saga';
import { mediaRegistry } from './mediaRegistry';
import {
  startCaptureRequest,
  stopCaptureRequest,
  setStatus,
  setError,
  reset,
} from './screenShareSlice';
import { resetAnnotation } from '../annotations/annotationSlice';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sentinel emitted by the track-end channel. */
const TRACK_ENDED = { type: 'TRACK_ENDED' } as const;
type TrackEndedEvent = typeof TRACK_ENDED;

/**
 * Creates an event-channel that emits once when the first video track ends,
 * then closes itself.  The saga uses this to detect the user stopping the
 * share from the OS picker / browser chrome.
 */
function createTrackEndChannel(stream: MediaStream): EventChannel<TrackEndedEvent> {
  return eventChannel<TrackEndedEvent>((emit) => {
    const track = stream.getVideoTracks()[0];
    if (!track) {
      emit(TRACK_ENDED);
      emit(END);
      return () => {};
    }

    const onEnded = () => {
      emit(TRACK_ENDED);
      emit(END);
    };

    track.addEventListener('ended', onEnded);
    return () => track.removeEventListener('ended', onEnded);
  });
}

/**
 * Requests display-media permission and returns the stream.
 * Throws a typed error so the caller can distinguish denial from other
 * failures.
 */
async function requestDisplayMedia(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
}

/**
 * Tears down the active stream and media recorder, then resets Redux state.
 */
function* teardown(): Generator {
  const { mediaRecorder, stream } = mediaRegistry;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  stream?.getTracks().forEach((t) => t.stop());

  mediaRegistry.stream = null;
  mediaRegistry.mediaRecorder = null;
  mediaRegistry.chunks = [];

  yield put(reset());
  yield put(resetAnnotation());
}

// ---------------------------------------------------------------------------
// Worker saga
// ---------------------------------------------------------------------------

function* handleStartCapture(): Generator {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    yield put(setError('Screen sharing is not supported in this browser.'));
    return;
  }

  yield put(setStatus('requesting'));

  // ── 1. Request media permission ──────────────────────────────────────────
  let stream: MediaStream;
  try {
    stream = (yield call(requestDisplayMedia)) as MediaStream;
  } catch (err) {
    const domErr = err as DOMException | undefined;
    if (domErr?.name === 'NotAllowedError') {
      yield put(setError('Permission denied. Please allow screen sharing.'));
    } else {
      yield put(setError('Screen sharing was cancelled or failed.'));
    }
    return;
  }

  // ── 2. Set up MediaRecorder ──────────────────────────────────────────────
  mediaRegistry.stream = stream;
  mediaRegistry.chunks = [];

  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  mediaRegistry.mediaRecorder = mediaRecorder;

  mediaRecorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) mediaRegistry.chunks.push(event.data);
  };

  mediaRecorder.start();
  yield put(setStatus('active'));

  // ── 3. Wait for stop – whichever comes first ─────────────────────────────
  const trackEndChannel = createTrackEndChannel(stream);

  yield race({
    trackEnded: take(trackEndChannel),
    userStop: take(stopCaptureRequest),
  });

  // Close the channel to free the event listener if still open.
  trackEndChannel.close();

  yield call(teardown as () => Generator);
}

// ---------------------------------------------------------------------------
// Root saga
// ---------------------------------------------------------------------------

export function* screenShareRootSaga(): Generator {
  // takeLatest: if the user somehow triggers start twice, cancel the first.
  yield takeLatest(startCaptureRequest, handleStartCapture);
}
