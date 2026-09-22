# Ten-level tile workshop PoC

This replaces the commodity/queue runtime with ten authored commissions. It is a playable experiment, not a claim of balanced difficulty or long-term engagement.

## Play

Run `npm start` and open http://localhost:8084. The **Levels** button opens all ten commissions; winning offers the next commission. Choosing a level starts it fresh. The current factory resumes exactly on reload. There is no offline production. Old commodity saves remain untouched in their old namespace; tile saves use `gridforge.tiles.poc.v2`. Compatible audio settings remain shared.

Select Punch, Cutter, Straight or Elbow; tap a board square, rotate if needed, and confirm. Dragging the selected tool also produces a preview. Placement, movement, recycling and Run each spend one action and advance four ticks. Thinking, rotation, preview and folding are free. Undo restores the latest complete committed state.

A Punch adds a round hole. A Cutter clips the top-right corner. Each preserves the other change; repeating a change has no additional effect. Machine rotation changes its footprint and ports, never the product silhouette. Actual input/output previews show connected material and stored work rather than assuming a blank.

Orders accept exact silhouettes concurrently. Combined tiles cannot fill punched-only or clipped-only orders. Connected downstream machinery takes priority over shipping; the placement preview warns when this diverts an outstanding requested product. Once a quota fills, excess waits in bounded buffers. It is never silently discarded. Inspect a machine to see its stored products and blocked-output explanation. Recycling explicitly removes the machine and its contents.

After three outputs have left a terminal machine, folding can compress its upstream graph. Buffers, in-progress work, material requirements and tick timing are preserved. Folding can relocate the group for free under the existing experimental rules. Single-machine folding remains legal; its effect on strategic depth is under scrutiny.

## Replay evidence and adversarial findings

Independent agent: `poc_challenge_adversary`. The agent inspected maps, ran the real simulation, exhaustively tested the loading bay's direct punch placements, and found a faster Level 5 construction schedule.

| Level            | Actions available |                            Known winning cost | Adversarial verdict                                                                                     |
| ---------------- | ----------------: | --------------------------------------------: | ------------------------------------------------------------------------------------------------------- |
| First Delivery   |                 5 |                                             2 | PASS as connection/production onboarding. Deliberately forgiving.                                       |
| Loading Bay      |                 7 |                                             4 | PASS as transport lesson. All 288 punch poses checked; none can legally connect directly to the supply. |
| Either Way Round |                 8 |                   4 in either operation order | PASS as composition experiment. Equal costs do not demonstrate a consequential strategic tradeoff.      |
| Two Products     |                 9 |                                             5 | PASS as batching/folding lesson. Punched-first remains an obvious teaching solution.                    |
| Tight Workshop   |                13 | 6 with early construction/folding; baseline 7 | PASS as mixed-order scheduling experiment. Balanced alternative strategies are not established.         |

These are observed winning costs, not proven global optima. `npm run replay` executes the baseline and alternatives. The faster fifth-level sequence places a second cutter while the first batch is producing, then folds the punch to connect it. Building ahead can therefore save a paid Run action.

### Critique acted on

The proposed reuse alternative did not survive inspection: its replay recycles a cutter and constructs a replacement. Old output from a completed quota can block a moved machine's new product. Material preservation makes this correct, but it can feel like a trap. Level 5 now says **Complete a mixed order**, and its brief and machine inspector explain surplus. The alternative replay is called **rebuild**, not reuse. No claim of balanced reuse-versus-parallel strategies is made.

Budgets include generous recovery margins. They do not establish calibrated tension. Early folding remains powerful and may collapse spatial choices. The small visual product vocabulary is a learning experiment; no claim of infinite meaningful levels is made.

## Human playtest questions

1. Without explanation, can a player predict what happens when a clipped tile enters a Punch?
2. Does the loading bay make the belt's purpose obvious?
3. Do players understand that attaching a Cutter stops punched-only shipments?
4. Do they notice the exact difference between punched and combined orders on a phone?
5. Does folding feel like an opportunity or an obligatory instruction?
6. Is preserved surplus understandable, or does it make reasonable experimentation feel unfair?
7. In Level 5, does a player discover building the next tool while the current batch runs?
8. After finishing, do players voluntarily try another arrangement? Ask which decision they want to change.

Automated tests verify deterministic rules and UI operation. They do not answer these engagement questions.

## UI validation

Browser verification covers 360×640, 390×844, tablet, desktop and landscape. Actual touch commands win all ten levels; tests also exercise reversed operation order, early-fold scheduling, exact save/resume, next-level flow, invalid placement, cancellation, undo, settings and blocked storage. Screenshots are inspected in addition to DOM assertions.

Adversarial screenshot review found a misleading generic Cutter badge and weak opening action. Machine badges now use the same actual buffered/connected-product prediction as placement previews. The first empty level offers a free Punch placement preview, then explicit paid confirmation; later levels retain normal controls. Source labels no longer collide with row coordinates.

## Commissions 6–10

Reviewer: `new_commissions_adversary`. Each level and its starting budget received PASS as a content experiment. Preprocessed sources and empty editable starting machines received separate PASS verdicts. The first five definitions and budgets remain unchanged, preserving their existing saves.

| Level                      | New situation                                            | Actions available |          Known winning cost |
| -------------------------- | -------------------------------------------------------- | ----------------: | --------------------------: |
| 6. Corner Delivery         | An elbow turns the top-left supply into the workshop     |                 8 |                           4 |
| 7. Keep Some Clipped       | Ship pre-clipped tiles unchanged, then punch them        |                 9 |                           4 |
| 8. Repair Shop             | Move the existing empty tools to reconnect their line    |                 9 |                           4 |
| 9. Split Deliveries        | Choose which processed supply becomes the Both line      |                12 |     6 through either branch |
| 10. One Dock, Three Orders | Reconfigure a single supply between incompatible outputs |                14 | 7 in either operation order |

These costs are winning witnesses, not global optima or a calibrated difficulty curve. Level 6 enumerates all direct Punch/Cutter placements to rule out bypassing its corner entrance. Level 7's witness needs no folding. Level 8 begins at tick zero with empty buffers and no earned fold eligibility. Level 9 has real alternative branch replays. Level 10's witnesses fold a module together with its downstream tool, then move that whole factory away to free the dock for the remaining single-feature batch. All nested work and surplus remain inside the module.

The rejected tenth-level proposal merely supplied a spare Cutter: moving it cost the same as placing a new one, so it added clutter without a meaningful decision. The implemented single-dock commission replaces it.

Unresolved human questions: do processed-source silhouettes communicate clearly; do players realize preplaced tools are editable; does switching exact-output batches feel satisfying or like a stale-buffer trap; do levels 7 and 9 feel distinct; does free fold relocation overpower other approaches? Do not infer engagement or commercial viability from the winning replays. Budgets intentionally leave recovery room.

Implementation review reproduced both alternative witnesses and passed each actual level. Phone screenshots caught cropped CLIPPED/PUNCHED supply labels and an upward-offset top supply icon; labels now stay within the canvas and icons are centered. Remaining minor presentation findings: the long tenth-level title wraps, and the initial selected Punch may distract from the elbow/repair briefs. Neither changes the rules or invalidates the witnesses.

Verification for this expansion: 24 simulation/persistence tests and 26 browser tests passed, plus TypeScript, ESLint and the production build. The build retains the existing 1.18 MiB bundle-size warnings. Browser coverage includes all ten touch solutions, both new alternate paths, source explanations, the scrollable commission picker, exact resume and the five existing viewport sizes. After the final label adjustment, all 13 focused layout/new-level browser checks passed. The adversarial reviewer independently inspected the refreshed source screenshots and passed the visual fixes.
