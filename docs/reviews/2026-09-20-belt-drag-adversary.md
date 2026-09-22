# Belt drag input experiment — independent adversarial review

20 September 2026. This review covers a mobile input experiment, not a new routing system or evidence of player enjoyment.

## Initial verdict: REVISE

The first proposal, “tap and drag to install belts,” did not define gesture ownership, path interpolation, direction, cost, invalid-cell behavior, replacement, undo or cancellation. Concrete risks included conflict with camera panning, diagonal jitter, skipped cells, partial installation across obstacles, silent redirection of working belts, one undo checkpoint per cell and an opening economy blocked by positive belt costs.

## Revised decision: PASS for the bounded experiment

- Belts remain free. This is an input improvement and does not change the opening economy.
- A tap keeps the existing precise one-cell preview, rotation and confirmation flow.
- In belt mode a canvas drag previews a four-connected route. Visible left, Dock and right controls remain available for camera movement.
- Skipped samples are filled one orthogonal cell at a time, with the larger remaining axis first and horizontal movement winning ties. Revisiting a route cell trims the tail, so backtracking erases rather than creating duplicates.
- Each belt points toward the next dragged cell. The last continues the preceding direction; a one-cell drag uses the selected direction.
- The full route is validated and committed atomically as one checkpoint. Invalid routes build nothing. A route containing no new cells is a true no-op.
- Matching empty conveyors may be reused. A drag cannot redirect an existing conveyor; tap preview is the explicit replacement path. Terrain, dock, drill rail, machines, loaded conveyors and inaccessible cells retain their existing rejection rules.
- Pointer cancellation, blur, tool changes, second-pointer interference and release outside cancel without committing.
- Production remains paused until explicit Resume.

The reviewer returned **PASS** for this exact scope. The shortest route remains a likely dominant strategy; this verdict does not claim added routing depth, balance, enjoyment or a permanent input choice.

## Evidence and open validation

Automated acceptance covers route interpolation, direction, backtracking, atomic rejection, existing and loaded conveyors, one-step undo, no-op history, fast pointer movement, pointer cancellation, portrait layouts and camera-button access. Portrait screenshots verify the route arrows and paused-planning copy.

Still required before treating the experiment as validated: a real-time touch capture of drag preview → commit → Resume → genuine cargo movement, plus a small human test of drawing direction, accidental cells, camera-control discovery and recovery.
