# Asteroid automation: direction exploration

20 September 2026 · Direction hypothesis with one bounded implemented experiment

**Latest user clarification:** the intended view is a 2D side-scrolling cross-section, like Terraria's perspective. The earlier top-down assumption is superseded. The excavation experiment below also replaces the stable-source assumption for this new branch of exploration; earlier reviews describe their original scope and do not establish evidence for destructible terrain. Character controls remain open: the user specified viewpoint, not necessarily Terraria's movement system.

## Recommendation

Explore **an asteroid mining outpost that grows from hand extraction into a factory the player designs**. This follows the user's new direction and becomes the leading exploration instead of the earlier toy-factory example. It does not select a final product or change the current ten-level runtime.

The strongest promise is: **start by doing the work; build machines that do it for you; spend your attention making the system better.** Incremental growth gives useful production an ongoing purpose: it funds more capability and a larger operation. The factory should become visibly busier, not merely display a larger earnings number.

Three independent adversaries reviewed the opening/loop, progression/economy, and mobile/visual scope. The selected experiments passed after revisions. A finite salvage/refund economy remains unresolved and is not selected. These verdicts approve exploration, not enjoyment, balance, retention, or implementation of a full game.

## Side-view refinement: how mining works

The world is a side-on grid of solid rock and ore, with open space where excavation has occurred. Manual mining targets an exposed, reachable block: tapping or holding applies the same capped extraction rate, cracks show progress, and the block becomes empty when exhausted. Its finite material yield is visibly collected into starter storage. Mining reveals the next layer instead of continuing to emit ore from an empty location. Exact reach, character movement, pathfinding, and collection interaction depend on the still-open control choice.

The first automatic machine experiment is a **shaft drill**. Place its base in cleared space at an accessible rock face and preview a straight horizontal mining corridor. Its head advances along that corridor as it removes blocks. A visible enclosed conveyor or auger inside the drill rail carries material back to the stationary base, whose output connects to the player's external belts. The first example needs no vertical lift mechanic.

This has a bounded reach, not unlimited remote extraction. It advances automatically within the selected corridor and stops visibly when the corridor is finished, its reach is exhausted, or output storage is full. The implemented experiment then offers one player-confirmed eight-cell extension through a timed tender or a second drill at an authored nearer rich face. Economical relocation, refunds, rail reclamation and further extension are not settled. The internal return path is a capability of the mining rig, and its capacity, reach and cost must remain balanced against external transport. It must not quietly make all hauling decisions irrelevant.

Planning hypotheses include choosing which vein to approach, choosing a shaft's direction/location, and reserving separate clear chambers for processing and belts. The drill rail occupies its corridor: those same cells are not also free machine floor. Both manual and automated excavation change real terrain. No structural-collapse, survival, combat, or gravity-simulation system follows automatically from the viewpoint; the first terrain experiment is static except for mining.

The ten-second developed clip begins with a player action: commit a previewed shaft drill or its earned extension with the base connected to an existing belt. The head then bites into the rock, the actual tunnel lengthens, ore returns behind the head, and downstream processing responds. If the real rates cannot deliver that sequence in ten seconds, abridge with disclosure or revise the scenario rather than showing false production. The mechanics exist; the clip remains an unvalidated capture storyboard.

Independent review: S1–S4 and revised S5 received PASS within their stated concept/experiment scopes. The original S5 clip received REVISE because it only showed an already-running machine; the accepted version makes the player's initiating action explicit and distinguishes occupied rail from free construction space. See [side-view mining review](reviews/2026-09-20-sideview-mining-adversary.md) for the exact verdicts and remaining attacks. A subsequent review passed and implementation narrowed the fixed-base sectional drill: the player confirms one continuation, then a tender executes it without moving the factory-connected base; a nearer second drill remains the comparison. Repeatable per-cell reach upgrades and routine whole-base relocation were not adopted. See [the drill end-stop review](reviews/2026-09-20-drill-endstop-adversary.md) and [exact implementation review](reviews/2026-09-20-drill-extension-implementation-review.md).

## The player's changing job

| Stage            | Player action                                                                           | Reward                                                                     | Failure to watch for                                                    |
| ---------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Hand mining      | Tap an exposed ore patch; holding provides the same capped extraction rate.             | Chips break away and ore is visibly collected.                             | The game teaches repetitive tapping as the best long-term strategy.     |
| First automation | Use the initial ore to install a drill and its starter delivery connection.             | The drill continues extracting while the player stops touching the screen. | Automation is too slow or still needs manual collection.                |
| Processing       | Connect mined ore to a smelter; later connect plates to an assembler.                   | Rock becomes glowing plates, then useful machine parts.                    | Several menus and dependencies delay the first satisfying result.       |
| Investment       | Decide where to place machinery, route materials, and reserve plates versus make parts. | A useful change visibly improves production and finances expansion.        | Always buy whichever statistic is currently lowest.                     |
| Expansion        | Reach another source or add capacity around the same persistent outpost.                | Earlier construction becomes infrastructure for the next problem.          | Every expansion repeats the identical chain or requires total teardown. |

The first autonomous drill is a complete payoff. Smelting, assembly, and allocation arrive sequentially; they are not a checklist the player must finish before the game becomes enjoyable. A provisional opening target is manual mining to the first genuinely hands-free extraction within roughly thirty seconds of gaining control. Measure that with actual players rather than treating it as an established duration.

At an automated site the drill fully replaces tapping. No tap-speed multiplier or manual boost is selected. Active play should move into choosing investments, routes, and expansion. Requiring extra tapping alongside every drill would make automation feel incomplete.

## What a short clip sells

### Opening: manual work becomes automatic

In a genuine starter capture, the player chips a little ore, installs the first drill, and takes their finger away. The drill continues working; a visible stream reaches storage. The important shot is the machine continuing without the player's hand, not a rapidly rising number beside a tapping finger.

Thirty seconds is a target for this transition alone. Do not promise the whole three-stage factory in that time unless the playable economy actually permits it. A later, developed factory can communicate its appeal in ten seconds without pretending it is the opening ten seconds.

### Developed factory: improve a visibly constrained line

| Time         | Actual scene                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 0–2 seconds  | A drill's output is backed up; downstream machinery receives ore intermittently.                                 |
| 2–5 seconds  | The player opens the paused build view and commits a better transport connection or additional route.            |
| 5–10 seconds | Delivery becomes steadier and actual refined output increases; backlog changes according to the simulated rates. |

A thirty-second extension can show that plates serve two purposes: construction stock and the parts assembler. Changing the network affects what the outpost can build next. The clip must show a consequential choice, not only a second camera angle or more particles.

Chips correspond to extraction, machine movement corresponds to work, and outgoing objects correspond to delivered resources. Small sparks can decorate actual work; they must not suggest extraction from an inactive machine. Distinguish a temporary release of stored ore from improved sustained output. The earlier stable-source proposal could not honestly show terrain carving. The newer side-view excavation experiment requires actual terrain removal and finite yield before showing either effect.

## Incremental growth and real planning

The minimal chain is **ore → plates → machine parts**. Actual material travels through transport and bounded machine buffers. Intermediates are not globally available merely because they exist somewhere on the map. Construction uses resources that have reached explicitly marked collection stores.

Later construction requires plates and parts as distinct resources. Some plates must reach the construction store; others can feed the parts assembler. That gives the player a reason to plan distribution instead of treating every recipe as a conversion into identical coins. It still may converge to one best allocation, so it is a hypothesis to attack rather than proof of depth.

For the small experiment, a two-output junction automatically alternates between available outputs, skips a full output, and advances its routing cursor only on a successful transfer. The player builds the branches; they do not repeatedly tap to dispatch individual pieces. This policy is specific to this new experiment, not the no-skip router previously proposed for the toy-factory concept.

### What bottlenecks establish—and what they do not

An illustrative capacity calculation uses two ore per plate and two plates per part. The drill can supply eight ore/second, the ore connection carries two, the smelter makes two plates/second, and assembly makes one part/second. All plates go to assembly for this calculation.

| Change in isolation                           | Finished parts/second |
| --------------------------------------------- | --------------------: |
| Existing line                                 |                   0.5 |
| Double drill capacity                         |                   0.5 |
| Increase ore transport from 2 to 4 ore/second |                   1.0 |
| Double smelting capacity                      |                   0.5 |
| Double assembly capacity                      |                   0.5 |

This arithmetic was checked during the review. It is an illustrative upper-bound model, not a playable simulation, selected balance, or a measured improvement. It excludes travel time, startup and buffers. It demonstrates why production visuals should identify a constrained connection; it does not demonstrate enjoyable decisions. A game of repeatedly buying the labelled bottleneck can still be shallow.

For spatial choice, author and verify two actual routes: a short direct connection that occupies valuable central expansion space, and a longer perimeter route that preserves that space but adds transport and startup latency. A longer route does not necessarily reduce steady throughput; show its actual cost instead of inventing one. Both layouts must be legal and useful before claiming this tradeoff exists.

An optional later power comparison can explore compact high-power versus larger efficient processing. The reviewers considered illustrative equal-cost packages of three plates/second using two cells/four power, and four plates/second using six cells/two power. Different available floor/power can favor different packages. **That can merely be a feasibility test** where one option cannot fit, not a rich choice between two good plans. The numbers are authoring examples only. Keep power out of the first onboarding slice; add it only as a separate test if the simpler interaction warrants it.

### Waiting is legitimate in this direction

This is an incremental proposal. A slower functioning factory can still accumulate resources. That is not automatically an exploit or a failure. Optimization should improve what the player can afford, how quickly, and what capacity remains for expansion.

The problem is mandatory dead time with nothing worthwhile to decide, or an inevitable purchase order disguised as freedom. Do not import the prior toy concept's separate throughput exam or empty-state Check design interaction. Useful production already supplies feedback and reward. Test whether people enjoy observing, planning, and returning rather than requiring every player to maximize a rate.

## A portrait outpost with room to think

Following the user’s clarification, use a chunky side-on 2D asteroid cross-section and a small connected work area. This supersedes the earlier top-down assumption. Use the existing Phaser/TypeScript stack for a future prototype; a new engine is unnecessary for this experiment. Large material silhouettes, visible buffers, and readable machine work matter more initially than elaborate space scenery.

The scene stays alive during foreground observation. An explicit planning/edit state pauses it; menus/backgrounding preserve state. No consumable action budget or real-time disaster deadline is selected. Pause state must be obvious; if selection repeatedly freezes the rewarding motion, the interaction needs revision.

Use generous touch targets and snapping for optional placement cells and ports. These are not compulsory sockets with one correct machine for each hole. The initial control uses simple footprints. Compare irregular footprints later if they add useful packing decisions without imposing excessive rotation and placement work. Falling pieces and folding are outside the first slice.

Free paused relocation preserves a machine and its contents. The prototype's recovery mechanism is complete-state undo at construction/upgrade checkpoints, with history retained for the bounded slice. Rewinding restores machinery, materials, inventories, time, rewards, and unlocks together, including production since that checkpoint. It must clearly communicate that subsequent earnings are also rewound. A chapter-start retry provides a clean baseline.

The hand-mining bootstrap must buy the first drill and a working delivery connection with raw ore; it cannot require the processed materials that the unfinished factory is supposed to produce. Verify reachable construction sequences, not merely a list of affordable machines.

**Recovery remains a design risk:** rewinding may sacrifice enough earned progress to discourage experimentation. Free relocation with full buffers may let manual machine shuttling outperform belts. These attacks must be tested before claiming automation is the attractive or optimal way to operate. A broader demolition/refund system is not yet selected: the earlier finite-salvage proposal could strand wealth when storage is full, despite rejecting invalid edits correctly.

## Persistence, asteroids, and longer-term growth

A persistent outpost is the leading structure to investigate for this user direction. Short sessions can end after completing a useful connection or affording an expansion while leaving the factory intact. This is more directly aligned with incremental accumulation than repeatedly clearing the board, but ownership and later returns remain unmeasured.

The earlier slice proposed one stable starter vein and one expansion. The new side-view branch instead tests actual finite blocks and one bounded automatic mining corridor; expansion and long-term depletion behavior remain open. It does not need offline production, procedural asteroid generation, or a map of hundreds of destinations. The next functional automation experiment can introduce a second material and a two-input recipe, making supply coordination matter. That is a separate small step, not approval for a large technology tree.

Depletion is attractive because excavation can visibly change an asteroid and reveal new opportunities. Its adverse case is severe: an optimized system stops because its source disappears, requiring repeated relocation. The next bounded experiment keeps the base/output fixed and treats reach as visible eight-cell rail sections. The player confirms the second section once; a tender may then execute one precommitted continuation. At most one capped support tier increases two supported sections to three. This is a prototype hypothesis, not an indefinite crawler network or permanent progression rule. No global forced pause on exhaustion, equipment erasure, automatic branch choice, rail reclamation or full-factory relocation rule is selected. Terrain removal, transport, costs and backpressure must remain real if shown.

Offline production is also undecided. Foreground-only operation in the first mechanical prototype isolates whether building and improving the factory is rewarding. It is not a release recommendation against offline play. A later offline experiment must preserve the same resource, capacity, and backpressure constraints rather than award an unrelated income formula. Login penalties, mandatory collection boosts, and prestige resets are not selected.

## Adversarial verdicts and boundaries

| IDs                            | Final selected scope                                                                                  | Verdict                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| A1, A2, A5                     | Brief manual bootstrap, replacement by automatic mining, readable paused-edit outpost, truthful clips | PASS for experiments                         |
| A3r2, B4b                      | Physical production, shared materials, reachable bootstrap, complete-state checkpoint recovery        | Revised PASS for bounded prototype           |
| A4, A4b                        | Investigate investment/layout tradeoffs; power is a separate later comparison                         | Revised PASS for authoring/experiment only   |
| B1, B3                         | Persistent small outpost and later functional automation step                                         | PASS for limited progression experiments     |
| B2                             | Depletion versus stable supplies only after core loop                                                 | Revised PASS for later comparison            |
| B5, B6                         | Foreground first, offline undecided, defer prestige/monetization/scale                                | PASS as scope boundaries                     |
| C1, C2, C3                     | Honest clips, optional snapped placement, sequential first-drill-to-factory teaching                  | PASS after C2/C3 revisions                   |
| Earlier A3/B4 salvage proposal | Finite salvage/refund economy                                                                         | UNSELECTED; recovery reachability unresolved |

The progression reviewer explicitly corrected an earlier overly permissive salvage verdict after cross-review. A PASS elsewhere does not overrule that unresolved objection. See the [loop review](reviews/2026-09-20-asteroid-loop-adversary.md), [progression review](reviews/2026-09-20-asteroid-progression-adversary.md), and [mobile review](reviews/2026-09-20-asteroid-mobile-adversary.md) for original verdicts, revisions and failure cases.

## Smallest useful next experiment

One asteroid outpost; manual ore bootstrap; one autonomous drill and working collection; sequential smelting and parts assembly; an automatic branch between plate stock and parts; one expansion; optional snapped placement; whole-state recovery. The side-view refinement adds actual finite block excavation to that scope. Power, offline production, prestige, and a long-term depletion/relocation system remain outside it.

Observe whether players stop tapping because automation actually frees them; whether the first drill is rewarding before more systems appear; whether they can diagnose a constrained line from the scene; and whether they make a useful placement/distribution choice rather than follow an upgrade list. Present the second task without copying the demonstrated layout. Separately observe whether players choose to improve or return to their own outpost.

Attack tap spam, stockpile bursts, machine-shuttling transport bypasses, universally optimal purchase order, one universal route, repeated manual batch changes, and buy/produce/undo reward duplication. Test ports and full production trajectories; capacity arithmetic alone cannot verify them.

If the first drill feels good but the next ten minutes are merely buying larger numbers, preserve the initial automation payoff and revise the investment/planning layer. If players enjoy planning but the ore and finished materials are unreadable in a clip, revise presentation. These are different failures and should not trigger the same redesign.

No game assets, simulation rules, or saves were changed during this exploration. No new playable asteroid prototype or human playtest exists yet.
