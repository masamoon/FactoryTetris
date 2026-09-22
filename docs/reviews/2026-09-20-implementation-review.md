# Side-view implementation scope — independent adversarial review

20 September 2026. Reviewer: implementation_design_review, separate from the implementing agent.

This review authorizes only a bounded playable experiment. It does not establish fun, retention, balance, or completion of a long-term incremental game. The user has requested implementation of the side-on excavation concept. Existing unrelated working-tree changes must be preserved.

## Initial individual verdicts

| Decision | Verdict | Authorized scope or blocking objection |
| --- | --- | --- |
| I1: remote exposed-block tap/hold, paused build, drag navigation | PASS | A remote command interface, with no simulated astronaut locomotion. Movement cancels mining. Holding and repeated taps share a rate cap. Visibility pause and explicit pause prevent unintended production. |
| I2: deterministic finite 36 × 14 terrain, manual bootstrap | PASS | An authored experimental map, not a procedural-content or balance claim. Manual finite ore is collected into starter construction storage with a visible collection effect. No collapse, survival, or gravity mechanics. |
| I3: east-facing drill, eight-cell reach, internal return rail | PASS | Actual terrain excavation, finite ore payloads, finite return travel, bounded output capacity and backpressure. Extended rail occupies its corridor. Another shaft needs another rig; automatic indefinite excavation is outside scope. |
| I4: directed belts, physical ore/plate/part chain, construction dock | REVISE | The proposed reversible rerouting conflicts with the prohibition on removing or editing installed belts. A completed ore-to-dock line can prevent placing processing without rewinding all subsequent progress. No automatic junction means this cannot claim simultaneous automatic allocation between plate stocks and parts. |
| I5: full-state checkpoint undo, no salvage or machine relocation | REVISE | Whole-state undo is valid recovery, but using it as the only routing edit creates a reconstruction tax and erases earned production. Scope needs a narrow belt-edit operation or a different explicit route-change design. |
| I6: sequential milestones without resetting the factory | PASS | Manual ore, first drill, automatic delivery, plate delivery, part delivery, optional second shaft. Milestones guide without halting production. Thirty seconds to a working first drill is an unmeasured target. |
| I7: portrait controls, camera navigation, inspection and truthful effects | PASS | Explicit paused editing, preview/confirm, dock navigation and buffer/status inspection. Test actual phone-size screenshots and interactions; a UI specification alone does not prove usability. |

## Requested revision

Permit paused replacement or removal of **empty belts only**, with full-state undo checkpoints. Reject occupied edits visibly. Machines remain fixed; no salvage/refund economy is introduced. This permits switching an emptied route without cargo teleportation, material duplication or machine shuttling. A stopped loop of full belts still needs undo/reset; communicate that limitation.

The no-junction slice tests physical extraction, transport, processing and staged resource allocation. It does not test a rich shared-resource factory or fulfill the earlier automatic branching hypothesis.

Ensure the authored opening provides enough reachable starter material to buy both a drill and a smelter (at least 14 raw ore at proposed costs), and enough automatic mine yield to reach assembly and a delivered part. Verify an actual end-to-end trajectory with ports, capacities, inventory and travel, rather than recipe arithmetic alone.

## Resubmission and final individual verdicts

The implementer accepted empty-belt removal/replacement. An empty belt may also be replaced by a machine at its normal material cost. Occupied belts and all installed machines cannot be removed or replaced; undo/reset remains the recovery path. The placement preview identifies blocked edits. No simultaneous splitting claim is made.

The opening authoring was clarified: manually clear three exposed rock blocks for six ore, buy a drill at (7, 6), and deliver its remaining corridor yield of 26 ore through belts to the dock at (1, 6). This can fund an eight-ore smelter, the twelve ore that becomes six plates for an assembler, and four further ore that becomes two plates for the first part. This resolves the earlier starter-wealth requirement through real automatic delivery instead of requiring fourteen manually mined ore. It is recipe-budget feasibility; the implementation still needs the executable trajectory.

Drill timings were revised to two seconds per rock block and three per rich ore block, with finite payload return at four cells per second. These values are prototype authoring choices, not release balance or measured playtest results.

| Decision | Final verdict | Scope |
| --- | --- | --- |
| I1 | PASS | Remote tap/hold exposed-block controls as initially specified. |
| I2 | PASS | Finite authored terrain and the clarified manual-to-automatic resource budget. |
| I3r | PASS | Bounded real excavation with revised timings and finite internal return. |
| I4r | PASS | Directed physical transport, three-stage recipes, collection dock and explicit empty-belt edits; no automatic split. |
| I5r | PASS | Complete-state checkpoint undo plus empty-belt edits; no machine relocation, cargo destruction or salvage. |
| I6 | PASS | Sequential non-resetting guidance milestones. |
| I7 | PASS | Paused preview/confirm, inspection, camera controls and truthful production effects. |

All seven decisions now pass for this bounded playable experiment. Required implementation validation below is not yet completed by these design verdicts. None of these decisions establishes long-term incremental depth.

## Concrete attacks and required evidence

- **Instant depletion:** eight cells at about one second per block can leave a drill exhausted soon after it is built. Return travel extends visible operation but not its material supply. Measure time spent making new shafts; no claim that this solves long-term maintenance.
- **Manual dominance:** remote manual mining bypasses ore transport. If belts constrain automatic delivery below manual extraction, continued mining may be the efficient path. Compare hands-free output and manual output; do not introduce tapping boosts to obscure this.
- **Single best layout:** fixed east-input/west-output machines encourage repeated horizontal strings. An authored second shaft is needed to test vertical routing; multiple legal routes are not automatically meaningful alternatives.
- **Free belt dominance:** zero-cost belts remove bootstrap risk but also transport investment. They can still compete for space and have startup travel latency; do not invent a monetary tradeoff or falsely claim longer belts lower steady throughput.
- **Finite-resource lock:** placing an incompatible machine or diverting all plates could strand purchasing power. A complete replay must reach ore delivery, plate stocks, assembler purchase and part delivery. Full-state undo must restore terrain and all produced material consistently.
- **Full buffers and return reservations:** a drill must not destroy rock for ore it cannot retain. Count ore in terrain, payloads, machine buffers, belt buffers, dock stock and recipe conversions through blocking and recovery.
- **Phone navigation:** one-cell targets and scrolling compete with hold-to-mine. Verify drag cancellation, preview, wrong-target recovery, panning, tool costs and legible pause state at a narrow phone viewport.
- **Misleading animation:** mining and rail travel must correspond to actual terrain removal and item movement. No ore effects from completed or blocked heads. A short capture must show an actual placement/routing action causing the visible result.

No implementation evidence or human playtest results were available at the initial review.

## Independent implementation audit

The reviewer subsequently inspected `src/asteroid/simulation.ts`, `persistence.ts`, `App.ts`, `Scene.ts`, `tests/asteroid.test.ts` and `tools/asteroid-replay.ts`.

Evidence reproduced independently:

- All eight initial simulation tests passed.
- The actual ore-to-plate-to-part replay reached its first delivered part after 393 ticks, or 39.3 seconds of simulation. This excludes player planning/input time and is not a measured human session.
- A separate deterministic 30,000-tick exploratory run made legal random construction attempts and mined exposed cells. At 300 sampled checkpoints, extracted ore equalled stored/transit/in-process material plus construction costs, with plates weighted as two ore and parts as four. Every sampled current state passed save parsing. This exercised 30 installed machines; it is an additional conservation check, not exhaustive coverage or a player strategy test.
- Snapshot eligibility in the transfer phase prevents newly arrived material from moving again in the same tick. Drill load reservations prevent output overflow while delayed ore is returning. The replay's weighted accounting includes recipe work in progress.

Findings sent to the implementing agent:

1. **P2: unrestricted edit history can invalidate the game's own saves.** `build` and `removeBelt` append complete terrain/state snapshots. A reproduced sequence of 1,000 legal empty-belt replacements produced 8,712,388 characters; `parseSave` rejected it because its limit is 8,000,000. Browser storage can run out earlier. Repeated identical replacement should be a no-op, but that alone does not bound legitimate edit history. Recommendation: preserve current state, keep a bounded recent undo history and discard oldest snapshots to meet a conservative serialized-size budget. Document the bound.
2. **P2: parser accepts impossible machine inventories.** A belt with `input: ['part']` passed validation even though belts never consume their input array. Per-machine recipe resource types, allowed input/output fields, rail ownership and load-source bounds need semantic validation. Ordinary gameplay did not produce this state in the reviewed tests; this is corrupt-save protection rather than a demonstrated runtime material exploit.
3. **P2: pause does not cancel the active scene pointer.** The Pause button clears App manual targeting but leaves `Scene.down` intact. On a phone, holding terrain with one finger and toggling pause/resume with another can reacquire the original mining hold. Apply the same `scene.cancelPointer()` used for tools, modals and visibility transitions. Verify with a two-contact interaction or equivalent cancellation test.

A bounded recent history plus byte budget is **PASS** as a narrow recovery amendment, provided its retention limit is communicated and each retained checkpoint still rewinds the whole state. Reducing the authored world height from fourteen to twelve cells is also **PASS**; this is an authoring adjustment, not a new mechanic. These review amendments do not by themselves verify that the fixes have landed.

The reviewer has not performed a human playtest. Short shaft lifetime, the potential advantage of continued remote hand mining, and shallow fixed-port layouts remain product questions despite mechanical test success.

### Fix verification and small control amendments

The implementer applied the three audit fixes. Independent retesting confirmed:

- One thousand legal alternating-direction belt edits now retain forty checkpoints, serialize to 356,888 characters and successfully reload. The implementation also trims oldest snapshots against a 2 MB session budget. Retained checkpoints still contain complete states.
- Replacing an empty belt with the identical direction leaves the entire session unchanged. This no-op behavior is **PASS**; it avoids misleading Undo entries without changing the factory.
- The earlier hidden-input belt save is rejected. The parser now checks machine-specific resource types, drill load positions and rail overlap. All eight original tests still pass after these changes.
- The Pause handler now invokes `scene.cancelPointer()` alongside clearing the manual target. This resolves the identified code path; an actual two-contact phone interaction remains part of browser validation.

The proposed addition of vertical dragging to the existing camera is **PASS** for a bounded mobile adaptation. Keep the minimum 26-pixel cell size, clamp both camera axes, initially frame the dock around row six, and let Dock reset both axes. Horizontal arrow buttons remain horizontal. Movement on either axis cancels mining; building does not automatically recenter the camera. This makes all terrain rows reachable on short phone/landscape canvases without introducing smaller interaction targets. The verdict authorizes implementation; screenshots and touch checks establish whether the result is usable.
