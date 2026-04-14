import { call, put, take } from 'redux-saga/effects';
import { canvasRegistry } from './canvasRegistry';
import {
  strokeCommitted,
  undoRequested,
  redoRequested,
  setCanUndo,
  setCanRedo,
  resetAnnotation,
} from './annotationSlice';

// ---------------------------------------------------------------------------
// Canvas helpers (plain functions so saga can call them)
// ---------------------------------------------------------------------------

function captureSnapshot(): string | null {
  const { canvas } = canvasRegistry;
  return canvas ? JSON.stringify(canvas.toJSON()) : null;
}

/**
 * Restores the canvas from a JSON snapshot.
 * Sets `isRestoring` while loadFromJSON runs so Fabric's internal
 * object:added / path:created events don't trigger spurious strokeCommitted
 * dispatches from the active tool's event listeners.
 */
function restoreSnapshot(snapshot: string): Promise<void> {
  return new Promise((resolve) => {
    const { canvas } = canvasRegistry;
    if (!canvas) {
      resolve();
      return;
    }
    canvasRegistry.isRestoring = true;
    canvas.loadFromJSON(snapshot, () => {
      canvas.renderAll();
      canvasRegistry.isRestoring = false;
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Root saga
// ---------------------------------------------------------------------------

/**
 * Long-running saga that owns the undo/redo history as local state.
 *
 * History is kept as JSON-string stacks rather than in Redux state because
 * the strings can be very large and Redux is not the right place for them.
 * Only the two boolean flags (canUndo / canRedo) are synced to Redux so the
 * Toolbar can enable/disable its buttons.
 *
 *  past    = [..., older, newer, current]   ← last entry is always current
 *  future  = [..., older, newer]            ← last entry is next redo target
 */
export function* annotationRootSaga(): Generator {
  const past: string[] = [];
  const future: string[] = [];

  while (true) {
    const action = (yield take([
      strokeCommitted.type,
      undoRequested.type,
      redoRequested.type,
      resetAnnotation.type,
    ])) as { type: string };

    if (action.type === strokeCommitted.type) {
      // ── New stroke committed: snapshot current canvas, clear redo stack ──
      const snapshot = (yield call(captureSnapshot)) as string | null;
      if (snapshot) {
        past.push(snapshot);
        future.length = 0;
      }

    } else if (action.type === undoRequested.type) {
      // ── Undo: move current state to future, restore previous ─────────────
      if (past.length >= 2) {
        future.push(past.pop()!);
        yield call(restoreSnapshot, past[past.length - 1]);
      }

    } else if (action.type === redoRequested.type) {
      // ── Redo: pop from future, apply, push to past ───────────────────────
      if (future.length > 0) {
        const snapshot = future.pop()!;
        past.push(snapshot);
        yield call(restoreSnapshot, snapshot);
      }

    } else if (action.type === resetAnnotation.type) {
      // ── Canvas unmounted (screen share stopped): wipe history ────────────
      past.length = 0;
      future.length = 0;
    }

    // Sync UI flags after every action
    yield put(setCanUndo(past.length > 1));
    yield put(setCanRedo(future.length > 0));
  }
}
