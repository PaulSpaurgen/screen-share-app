import { fabric } from 'fabric';

/**
 * Module-level registry for the active Fabric canvas instance.
 *
 * Fabric's canvas is non-serializable and imperative, so it cannot live in
 * Redux state.  The annotation saga reads from here to capture snapshots and
 * restore them during undo/redo.
 *
 * `isRestoring` is set to true while loadFromJSON is running so that
 * Fabric's internal object:added / path:created events don't cause tools
 * to dispatch spurious strokeCommitted actions.
 */
export const canvasRegistry = {
  canvas: null as fabric.Canvas | null,
  isRestoring: false,
};
