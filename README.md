# Screen Share with Annotations

A React application that captures and records the user's screen while providing a real-time annotation overlay. Built with React 19, Redux Toolkit, redux-saga, and Fabric.js.

## Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- A Chromium-based browser (Chrome, Edge) — `getDisplayMedia` support is required

### Install and run

```bash
npm install
npm start          # dev server at http://localhost:3001
```

### Other commands

```bash
npm run build      # production bundle → dist/
npm run typecheck   # tsc --noEmit
```

---

## Canvas Layering and Scaling

### Layer stack

The video container uses `position: relative` with three layers stacked via `position: absolute`:

```
┌─────────────────────────────────┐
│  <video>                        │  z-index: auto (base)
│  Live screen capture stream     │
├─────────────────────────────────┤
│  Status overlay                 │  z-index: auto, pointerEvents: none
│  "Ready to share" / error text  │  (only visible when not active)
├─────────────────────────────────┤
│  <CanvasOverlay>                │  z-index: 10, pointerEvents: auto/none
│  Fabric.js annotation canvas    │  (toggled via visibility + pointerEvents)
└─────────────────────────────────┘
```

The annotation canvas sits directly on top of the video. When drawing is disabled, `visibility: hidden` hides annotations visually and `pointerEvents: none` passes mouse events through to the video — but the component stays mounted (see [Activity-based state preservation](#activity-based-state-preservation)).

### Aspect-ratio scaling

The video's native resolution rarely matches the available container space. The app computes a fitted size on every resize:

1. On `loadedmetadata`, the video's native aspect ratio (`videoWidth / videoHeight`) is captured.
2. A `ResizeObserver` on the outer wrapper fires whenever the viewport changes.
3. The inner container is resized to the largest rectangle that fits within the available space while maintaining the video's aspect ratio (letterbox/pillarbox).
4. Both the `<video>` and the Fabric canvas fill this container at 100% width/height, ensuring pixel-perfect alignment.

### Annotation scaling on resize

When the container resizes, the Fabric canvas dimensions must be updated. Every existing object is repositioned and rescaled proportionally:

```ts
const scaleX = nextWidth / prevWidth;
const scaleY = nextHeight / prevHeight;

fc.getObjects().forEach((obj) => {
  obj.set({
    left:   (obj.left ?? 0)   * scaleX,
    top:    (obj.top ?? 0)    * scaleY,
    scaleX: (obj.scaleX ?? 1) * scaleX,
    scaleY: (obj.scaleY ?? 1) * scaleY,
  });
  obj.setCoords();
});
```

This keeps strokes, shapes, and text aligned with the video content they were drawn over, regardless of window resizing.

### Screenshot compositing

The screenshot feature captures the video frame and annotation canvas into a single PNG at the **native video resolution** (e.g. 1920x1080), not the rendered CSS size. The annotation layer is scaled up from its rendered dimensions during compositing:

```ts
ctx.drawImage(video, 0, 0, outW, outH);                          // video frame
ctx.drawImage(annotationEl, 0, 0, elW, elH, 0, 0, outW, outH);  // annotations scaled to match
```

---

## Key Architectural Decisions

### 1. Redux-saga for all async workflows

All async operations are managed by redux-saga rather than thunks or in-component async logic:

- **`screenShareSaga`** — handles `getDisplayMedia` permission requests, `MediaRecorder` lifecycle, and track-end detection via `eventChannel`. A `race` between the OS ending the share and the user clicking Stop ensures clean teardown in both cases.
- **`annotationSaga`** — owns the undo/redo history stack as saga-local state. Listens for `strokeCommitted`, `undoRequested`, `redoRequested`, and `resetAnnotation` actions.

**Why sagas:** Side-effect-heavy workflows (media permissions, event-channel bridging, long-running history management) are expressed as linear, testable generator functions rather than scattered across hooks and callbacks.

### 2. Module-level registries for non-serializable objects

`MediaStream`, `MediaRecorder`, `HTMLVideoElement`, and `fabric.Canvas` are non-serializable browser objects that cannot live in Redux state without disabling the serialisability check.

Two registries hold them:

| Registry | Contents | Written by | Read by |
|---|---|---|---|
| `mediaRegistry` | stream, mediaRecorder, chunks, videoEl | screenShareSaga, useScreenCapture | screenshotUtils |
| `canvasRegistry` | canvas, isRestoring | useFabricManager | annotationSaga, screenshotUtils |

Each registry is a plain module-level object. Write access is restricted by convention to a single owner (the saga or the hook that creates the resource).

### 3. Strategy pattern for drawing tools

Each tool (pen, highlighter, eraser, rectangle, arrow, text) is a self-contained function satisfying one type:

```ts
type AnnotationTool = (fc: fabric.Canvas, opts: ToolOptions) => () => void;
```

The tool activates itself on the canvas and returns a cleanup function. The `useFabricManager` tool effect is six lines:

```ts
useEffect(() => {
  const fc = fabricRef.current;
  if (!fc) return;
  const activate = toolRegistry[activeTool];
  return activate(fc, { strokeColor, strokeWidth, onStrokeComplete });
}, [activeTool, strokeColor, strokeWidth, onStrokeComplete]);
```

React's effect cleanup handles deactivation. Adding a new tool requires one new file and one entry in `tools/index.ts` — nothing else changes.

### 4. Saga-owned undo/redo

The undo/redo history is kept as JSON-snapshot stacks (`past[]`, `future[]`) inside the annotation saga's generator scope — not in Redux state, not in React refs. The saga listens for three actions:

- `strokeCommitted` → capture snapshot, push to `past`, clear `future`
- `undoRequested` → pop `past` to `future`, restore previous snapshot
- `redoRequested` → pop `future` to `past`, restore that snapshot

Only two boolean flags (`canUndo`, `canRedo`) are synced to Redux for the Toolbar to read. The `isRestoring` flag on `canvasRegistry` prevents Fabric's internal `object:added` events during `loadFromJSON` from triggering spurious `strokeCommitted` dispatches.

### 5. Activity-based state preservation

`CanvasOverlay` is wrapped in React 19's `<Activity>` component. When the user toggles drawing off, the mode switches to `"hidden"` rather than unmounting the component. This preserves:

- The Fabric canvas instance and all drawn objects
- The saga's undo/redo history (tied to canvas identity)

`<Activity mode="hidden">` runs all effect cleanups. To prevent the Fabric canvas from being destroyed during Activity cycles, canvas disposal is performed **by the screen-share saga's teardown** — not by any effect cleanup. The mount effect guards canvas creation with `if (!fabricRef.current)` so it only initialises once; on re-show it reattaches the `ResizeObserver` and syncs any size changes that occurred while hidden.

### 6. Narrow selectors for render isolation

The Toolbar is split into sub-components (`StartStopButton`, `ToolPicker`, `StrokeControls`, `UndoRedoControls`, etc.), each with a narrow `useAppSelector` reading only the specific state it renders. This ensures that high-frequency state changes (e.g. `strokeColor` updating ~60 times/second while dragging the colour picker) only re-render the affected sub-component, not the entire toolbar.

---

## Scaling: Features and Architecture

This section covers how the codebase is designed to scale — both in terms of new features and in terms of production-grade concerns.

### Adding new drawing tools

The tool strategy pattern means adding a tool is a contained, zero-risk operation:

1. Create a file in `annotations/tools/` that exports an `AnnotationTool` function.
2. Add one entry to the `toolRegistry` map in `tools/index.ts`.
3. Add the tool's ID to the `DrawingTool` union in `store/types.ts`.

No other file needs to change. The tool effect, undo/redo history, screenshot compositing, and toolbar rendering all work automatically because they depend on the registry, not on individual tool implementations.

### Adding new sagas

The store wires sagas by calling `sagaMiddleware.run()` for each root saga. A new feature with async workflows (e.g. collaborative cursors, cloud save) adds its own root saga and one `run()` call — it does not modify existing sagas. Each saga manages its own local state and listens for its own action types.

### State boundaries

The architecture enforces a clear separation between what belongs in Redux and what does not:

| In Redux (serializable) | Outside Redux (registries) |
|---|---|
| Share status, error messages | MediaStream, MediaRecorder |
| Active tool, stroke colour/width | Fabric.js canvas instance |
| canUndo / canRedo flags | Undo/redo JSON snapshot stacks (saga-local) |
| Annotation enabled toggle | HTMLVideoElement reference |

This boundary means Redux DevTools time-travel, state persistence, and SSR hydration all remain viable without workarounds. Non-serializable resources are accessed through registries with single-writer discipline.

### Toolbar render performance

The Toolbar is split into sub-components with narrow selectors. This means the cost of adding new toolbar sections is constant — a new section with its own selector does not increase the re-render cost of existing sections. High-frequency updates (colour picker, stroke width slider) only touch the `StrokeControls` sub-component.

### Undo/redo scalability concerns

The current snapshot-based approach stores a full JSON serialisation of the canvas on every committed stroke. For sessions with hundreds of strokes this has two costs:

- **Memory**: each snapshot is a complete canvas serialisation. For a canvas with 200 objects, each snapshot may be 50-100 KB. 200 snapshots = ~10-20 MB.
- **Restore latency**: `loadFromJSON` must deserialise and re-render every object, which can take 50-100 ms on large canvases.

**If this becomes a bottleneck**, the approach can be migrated to a command-based (delta) undo system where each entry stores the forward and reverse operation rather than a full snapshot. This would be a change localised entirely to `annotationSaga.ts` and `canvasRegistry` — the tools, toolbar, and slice would not change because they only interact via the `strokeCommitted` / `undoRequested` / `redoRequested` action interface.

### Multi-page / multi-instance scaling

The entire feature is self-contained under `Pages/ScreenShare/` with its own Redux store (provided via a scoped `<Provider>`). This means:

- Multiple screen share instances can coexist without store collisions.
- The feature can be lazy-loaded as a route without pulling in unrelated state.
- Each instance's sagas, registries, and canvas lifecycle are fully independent.


---

## Project Structure

```
src/
├── App.tsx
├── index.tsx
└── Pages/ScreenShare/
    ├── index.tsx                     # ScreenSharePage — Provider + layout
    ├── store/
    │   ├── index.ts                  # configureStore + saga middleware
    │   ├── types.ts                  # RootState, ShareStatus, DrawingTool
    │   └── hooks.ts                  # useAppDispatch, useAppSelector
    ├── screen/
    │   ├── screenShareSlice.ts       # status/error reducers + saga triggers
    │   ├── screenShareSaga.ts        # getDisplayMedia, MediaRecorder, teardown
    │   ├── mediaRegistry.ts          # stream, recorder, videoEl singleton
    │   ├── screenshotUtils.ts        # video + canvas → PNG download
    │   └── hooks/
    │       └── useScreenCapture.ts   # dispatches saga actions, syncs video el
    ├── annotations/
    │   ├── annotationSlice.ts        # drawing state + saga triggers
    │   ├── annotationSaga.ts         # undo/redo history loop
    │   ├── canvasRegistry.ts         # Fabric canvas + isRestoring flag
    │   ├── components/
    │   │   └── CanvasOverlay.tsx      # Fabric canvas container
    │   ├── hooks/
    │   │   └── useFabricManager.ts   # canvas init, resize, tool delegation
    │   ├── tools/
    │   │   ├── types.ts              # AnnotationTool type + ToolOptions
    │   │   ├── penTool.ts
    │   │   ├── highlighterTool.ts
    │   │   ├── eraserTool.ts
    │   │   ├── rectangleTool.ts
    │   │   ├── arrowTool.ts
    │   │   ├── textTool.ts
    │   │   └── index.ts              # toolRegistry map
    │   └── utils/
    │       └── hexToRgba.ts
    └── components/
        └── Toolbar.tsx               # split sub-components with narrow selectors
```
