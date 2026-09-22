# Independent mechanics adversary — 2026-09-19

Scope: current Gridforge mechanics, inspected independently for the requested factory/automation mobile product. No runtime changes and no new gameplay rule approvals. This audit is evidence for the parent product review, not a human playtest. Phone presentation is being inspected separately by the parent reviewer.

## Verdict

**REVISE as a product direction; PASS only as an understandable, deterministic factory-puzzle proof of concept.** The code delivers automatic inventory movement and preserved production graphs. It does not yet deliver enough visible factory activity, consequential production-system choices, or developing factory ownership to support the intended 10-second hook and long-term ambition. More commissions using this exact vocabulary would chiefly test the same small set of lessons.

This does not establish that turn-based factories, stages, or shaped machines cannot work. The objection is to this particular combination: a few serial machines, exact batch quotas, action-gated short production bursts, and compression that removes the machinery from view.

## Evidence method

- Read `AGENTS.md`, current content/types/reducer/UI explanations, replay witnesses, tests, and existing decision/playtest documents.
- Reproduced all ten standard wins and five alternative wins with `node --import tsx tools/replay.ts`. The equivalent `npm run replay` hit a sandbox IPC error in the `tsx` launcher; invoking the same TypeScript file through Node's loader succeeded.
- Counted the actual commands and maximum primitive-machine count in every standard replay.
- Ran a concrete legal Level 5 reuse sequence, then advanced its unchanged production rules another 100 ticks to distinguish a slow changeover from a permanently blocked one.
- Code-derived behavior and deterministic probes are identified below. Claims about likely comprehension, satisfaction, or retention are **design inferences**, not measured human outcomes. Winning costs are witnesses, not proven optima.

## Severity-ranked findings

### Critical: the production system has too few consequential interactions for the promised long-term factory game

**Observed rules:** Punch and Cutter each have one input, one output, and the same two-tick duration. Straight and Elbow merely transport one item unchanged. Punch adds a hole; Cutter adds a corner cut; their order does not affect the result, and repeating either does nothing new. See `src/game/content.ts:31–81`, `src/game/types.ts:1–3`, and `tests/simulation.test.ts:107–113`.

All realizable current lines are serial paths: there is no selectable splitting, merging, assembly, competing resource ratio, or recipe throughput choice. Precise adjacency permits at most one receiver at an output location (`src/game/simulation.ts:45–63`). A two-feature product requires two distinct operations in either order. Neither operation changes production rate. There is real spatial and scheduling work, but it occurs around a nearly fixed production dependency.

**Concrete attack:** transplant the plan “ship a single-feature batch, add the second operation, fold when space demands it” between Two Products, Tight Workshop, Keep Some Clipped, Split Deliveries, and One Dock, Three Orders. The coordinates and initial material change; much of the production reasoning does not. The shipped witnesses demonstrate this pattern (`tools/replay.ts:48–105`).

**Inference:** once the player knows the four tile states and port rules, the game risks becoming a sequence of placement exercises. Adding quantities increases Run presses; adding blockers can increase pose-search friction without increasing factory strategy.

**Evidence needed:** unaided players should identify a consequential production choice they want to change on another attempt. A different legal layout alone is insufficient; show an advantage gained and an advantage sacrificed. This is not a mandate for a large recipe tree.

### Critical: production exists in short bursts, and more than half of the baseline paid commands are Run

**Observed rules:** only paid commands advance time, by four ticks; a correct machine stops producing while the player looks at it or considers a move (`src/game/simulation.ts:339–385`). The command animation lasts 850 ms for tick events and then ends (`src/view/BoardScene.ts:348–427`).

Across the ten current standard witnesses, **25 of 47 paid commands are Run**, versus 22 placements/moves. There are four additional free folds. Each standard factory contains at most **one to three primitive machines**. These are replay statistics, not player-session measurements.

| Commission             | Paid commands | Run commands | Maximum primitive machines |
| ---------------------- | ------------: | -----------: | -------------------------: |
| First Delivery         |             2 |            1 |                          1 |
| Loading Bay            |             4 |            2 |                          2 |
| Either Way Round       |             4 |            2 |                          2 |
| Two Products           |             5 |            3 |                          2 |
| Tight Workshop         |             7 |            4 |                          3 |
| Corner Delivery        |             4 |            2 |                          2 |
| Keep Some Clipped      |             4 |            2 |                          2 |
| Repair Shop            |             4 |            2 |                          2 |
| Split Deliveries       |             6 |            3 |                          3 |
| One Dock, Three Orders |             7 |            4 |                          3 |

**Concrete attack:** a silent clip showing one Punch placed and then repeated Run presses can truthfully show production, but the viewer may read it as manual activation or a tiny abstract puzzle. A clip that keeps the factory continuously flowing would currently misrepresent the rules.

**Inference:** the factory fantasy of “I built a system and it keeps doing work” is weakly expressed. Turn-based automation can still succeed if one decision triggers a large, comprehensible consequence; the current small lines and quotas provide little room for that cascade. Do not assume real time alone fixes the problem: a solved continuously running line can simply become passive watching.

### High: folding solves space and relocation while removing the visible reward

**Observed rules:** after three emissions, a machine and its upstream group can be reduced to one cell, relocated and rotated anywhere legal, without a paid action or time advance (`src/game/simulation.ts:128–184`, `src/game/simulation.ts:367–380`). Single-machine folding is legal. The contents and throughput are preserved. The folded port arrangement becomes a standard one-cell module (`src/game/content.ts:239–245`).

Folding is therefore more than compression: it also changes accessible external geometry and grants relocation. Meanwhile ordinary movement costs one paid action. Current witnesses exploit this correctly: Tight Workshop costs 7 actions in its baseline, **6 with early construction/folding**, and **10 with rebuild**. One Dock, Three Orders folds the completed chain into a remote cell to free the dock (`tools/replay.ts:98–105`).

**Concrete attack:** use large shapes only until each productive section earns compression, then remove the spatial cost and reposition the output for the next tool. This is not proof that every fold is always optimal: an entire group can seal intermediate access, and external reconnection can matter. It does undermine any blanket claim that retaining tetrominoes continuously creates difficult layout decisions.

**Observed presentation consequence:** folded leaf events resolve to their owning module's output. A flow whose start and end resolve to the same point is skipped (`src/view/BoardScene.ts:350–367`). Successful compression hides the factory activity that might otherwise be the ad's visual reward.

**Inference:** “build a beautiful working factory” and “make the working factory disappear into one tile” are competing rewards. Folding can be an appealing magic trick, but its current long-term reason to exist is mostly to prepare another small batch line. Its spectacle and its strategic value require separate tests.

### High: sensible reuse can become a permanent stale-buffer trap

**Observed rules:** a terminal ships only the exact resource still requested by an incomplete order. Completed quotas refuse surplus. A machine processes only when its output buffer has space (`src/game/simulation.ts:262–270`, `src/game/simulation.ts:313–335`). Movement retains inventory; recycling destroys it (`src/game/simulation.ts:357–366`).

**Reproduced attack:** in Level 5, build Punch at (0,1); finish four Punched; fold it in place; put Cutter at (1,1); finish four Both. At tick 24 the Cutter contains one Both output, another Both in progress, and Punched input. Move that Cutter to the right-hand blank source at (5,5), rotation 2. After the move and **100 further simulation ticks**, Clipped remains **0/4**. The Cutter has two Both outputs and cannot clear them because that quota is complete. The machine is correctly connected but cannot change over.

The existing rebuild witness explicitly recycles and replaces this Cutter (`tools/replay.ts:60–67`); the inspector explains the blockage (`src/ui/explain.ts:64–77`). This is consistent conservation, not a simulation defect.

**Inference:** a player attempting the factory-like act of reusing equipment can be punished for invisible old work. New placement costs the same action as movement and gives a clean machine, weakening the economic reason to reuse. Preserving material is not by itself a satisfying player constraint. A visible, understandable consequence and useful recovery decision must carry this rule.

### High: shipping anywhere removes much of the routing problem

**Observed rules:** any top-level unconnected output ships its exact requested material, regardless of board position (`src/game/simulation.ts:262–270`). There is no required delivery destination. Directional belts are useful when a source inlet or obstacle blocks a direct processor; the tests prove those specific needs for Loading Bay and Corner Delivery (`tests/simulation.test.ts:85–94`, `tests/simulation.test.ts:330–340`).

**Concrete attack:** bypass most of the map once the source can feed the required operation chain; there is no need to carry the output onward. A decorative central obstacle cannot create logistics pressure if the player can ship before reaching it. The 72-cell board does not imply a large spatial problem: the standard witnesses use at most three machines.

**Inference:** the game currently offers connection geometry more than transportation-network design. Keeping shaped machines is defensible only if that geometry becomes readable and rewarding enough to justify the mobile manipulation cost. Removing shapes without changing production decisions would expose the same shallow serial-chain problem even more directly.

### Medium: exact mixed orders encourage withholding an upgrade instead of improving throughput

**Observed rules:** a connected downstream receiver takes priority; an upstream output no longer ships even when the downstream receiver is full (`src/game/simulation.ts:249–265`). Combined cannot satisfy Punched-only. Previews warn about diversion (`src/ui/explain.ts:53–61`).

**Concrete attack:** adding a Cutter to a working Punch line before the Punched quota is complete prevents further Punched shipments. The usual lesson is “wait for this batch, then attach the next operation.” That is a real timing decision, but it can feel like delaying construction rather than increasing capability. The current graph has no branch-control option to continue both deliveries.

**Counterweight:** advance construction during another line's production does improve action efficiency; the six-action Level 5 witness proves a small scheduling insight. This is the strongest demonstrated systemic choice in the current rules. It does not by itself prove long-term depth.

### Medium: the action budget measures schedule bookkeeping more than sustained factory quality

**Observed rules:** Run, placement, movement and recycling all cost one and all advance four ticks. Thinking is free. The last action can win; loss can be undone; undo restores only the most recent committed state (`src/game/simulation.ts:339–385`). Standard replay costs use 2–7 of the supplied 5–14 actions. The budgets are intentionally forgiving prototype controls.

**Concrete attack:** if a future useful placement can be made now without interrupting current shipments, make it instead of Run; both advance the same production, but only one also builds. This can support elegant scheduling, yet the player is optimizing action overlap rather than diagnosing production rates. Tightening the budget would make this rule more compulsory without necessarily making the factory more interesting.

**Inference:** a loss can read as “I pressed the time button too often,” especially when correct new construction still needs several Run actions to flush buffers. One-step undo helps immediate slips but cannot freely unwind a changeover mistake discovered several commands later. Generous budgets reduce frustration but also reduce tension; human evidence is needed before tightening them.

## What the current mechanics do establish

- The deterministic simulation, backpressure, exact products and whole-state undo make causal experiments reproducible.
- The two physical transformations are simple enough to teach visibly; preprocessed supplies reuse the same rules.
- Source constraints can make a belt genuinely necessary, demonstrated exhaustively in two specific levels.
- Building ahead and folding at the right time can save an action in an actual mixed-order scenario.
- Full graph preservation means compression can be tested without silently awarding free throughput.

These are reusable foundations. None establishes player enjoyment, silent-clip comprehension, a calibrated challenge curve, or commercial viability.

## Questions the redesign must answer before further content

1. What player decision visibly changes a functioning production system within ten seconds, and can an observer explain the cause without reading the HUD?
2. What future problem remains after the player has successfully automated the first one? A larger quantity is not sufficient evidence.
3. What does a shaped footprint add that a simple rectangle would not, and can the player see that advantage while placing it on a phone?
4. Does success grow the visible factory, transform its output, solve an obvious bottleneck, or compress it? Which is the primary reward, and do the rules support it consistently?
5. Which two strategies have a meaningful tradeoff after attempting earliest folding, free relocation, clean-machine replacement, and build-ahead scheduling?
6. Can a player recover from an understandable experiment without discovering a hidden irreversible backlog rule?

No replacement rules are adopted by this audit. Proposed prototypes must receive their own explicit independent verdicts under `AGENTS.md`.

## Alternative-direction decision review

The parent reviewer submitted four individual recommendations for independent challenge. Verdicts below apply to experiment selection and deferral, not implementation. A REVISE verdict remains pending until revised wording is independently accepted.

### A1 — Existing exact-tile game with clearer destination/production feedback as a comparison control

**Initial verdict: REVISE.** A small improved-feedback control is useful, but “clearer actual output destination” is ambiguous. Current shipping has no spatial destination; a disconnected terminal can ship anywhere. Adding a required dock would change routing and cannot quietly be described as a presentation control.

**Strongest case for this direction:** the current simulation is reliable, familiar to the project, and has proven solvable examples. It may be under-expressing cause and consequence rather than failing solely because of its rules. A small control can falsify an expensive redesign rationale. In particular, showing actual deliveries could explain why a placed machine matters without adding another mechanic.

**Concrete failure case:** give this control a new exit location, slower larger products, and a replay of the solution while comparing it against an empty-board prototype. Any preference could reflect new routing, onboarding, or unequal polish rather than the production loop. Conversely, compare the redesigned prototype against the untouched blank opening and the test merely rewards having something to watch.

**Requested revision:** preserve current command timing, exact orders, shipping eligibility, topology, costs, and transforms. Improve only truthful feedback: show actual automatic shipments from the existing terminal outputs to quota/collection feedback, without requiring a new spatial dock. Use a similarly readable baseline task and equal introductory explanation. Treat this as a control, not evidence that cosmetic polish will solve the product.

**Evidence needed:** compare whether people can explain what changed after their own action and what they want to do next. Observe behavior beyond a single attractive clip. Do not label a new destination mechanic as a control unless it receives separate review.

**Revised submission and final verdict: PASS for this control experiment.** The parent explicitly preserved current any-terminal exact shipping, paid-clock/fold/cost rules, and identical replay outcomes. Actual shipped objects may reach a cosmetic collection/manifest; there is no new fixed sink or routing mechanic. This resolves the control confound identified above. The initial REVISE is superseded for this wording only. The verdict does not establish that feedback polish will make the existing loop compelling.

### A2 — Defer falling tetrominoes with real-time overflow/loss as the primary redesign

**Verdict: PASS, strictly as a priority decision.** It is reasonable to defer a redesign whose central pressure is real-time landing and overflow while testing the mandatory automation fantasy. This is not a finding that falling pieces cannot support factory gameplay, and it does not authorize an arcade mode.

**Strongest case for falling pieces:** “catch this useful machine, fit it into the live factory, and unleash a bigger output stream” could communicate input, tension and payoff extremely quickly. A predictable incoming piece can force a meaningful adaptation rather than permit a universal solved layout. Overflow can provide visible stakes without teaching an abstract action allowance.

**Concrete counterexample to an absolute rejection:** a slow, forecasted falling-machine system with reversible placement or planning pauses could emphasize layout planning more than reflexes. Falling motion by itself does not destroy automation. Such a version is outside the specific “real-time overflow/loss” option being deferred.

**Risks supporting deferral:** finger occlusion, simultaneous port-reading and landing, accidental sealing of the only supply route, and pressure to place a useless machine simply to survive. Players may optimize stacking height rather than productive flow. Adding abundant recovery features could leave a complex compromise between two games.

**Evidence needed to reopen:** a small actual interactive clip must show that a falling piece's factory function changes the choice of where it lands. Mobile players should explain the production consequence of their placement and want to improve the factory, not merely survive longer. These are qualitative hypotheses, not measured thresholds.

### A3 — Do not select merging machines/number-only idle upgrades as the primary redesign

**Initial verdict: REVISE.** The objection to number-only progression is appropriate to this brief, but grouping every merge mechanic with it is too broad. The deciding criterion is consequential control of production, not whether two objects can merge.

**Strongest case for merging:** two visible machines becoming one larger or stranger machine is an exceptionally legible action/reward sequence. A merge that alters footprint, ports, recipe, processing time, or resource requirements could create more genuine factory decisions than the current fixed serial chains. Even numerical capacity changes can matter if they force an observable routing or resource tradeoff; automatic dismissal would miss that possibility.

**Concrete failure case for a number-only core:** repeatedly merge duplicate generators because the higher level is always better, then watch a currency counter rise. If every new machine has the same placement requirements and its best use is predetermined, the factory is a skin over an upgrade ladder. Adding a belt animation does not restore control of the system.

**Requested revision:** reject a number-only merging/idle-upgrade core as the primary direction for this product brief. Defer physical merging that changes factory behavior as a separate, untested candidate requiring its own tradeoff and anti-dominance review. Do not claim all merging removes routing decisions.

**Evidence needed:** explain a case where merging now is worse than keeping the two machines separate, without relying only on an arbitrary timer or currency gate. Show how the merged machine changes actual resource flow or assembly. A bigger sprite alone is insufficient.

**Revised submission and final verdict: PASS as a primary-direction rejection/deferral decision.** The parent narrowed the rejected option to number-only merging/idle upgrades that replace consequential layout/routing for this brief. Physical merges with recipe, footprint, or port tradeoffs remain untested and deferred. This resolves the overbroad grouping above. The initial REVISE is superseded for this wording only; no physical merge mechanic is approved.

### A4 — Defer dozens of commissions, monetization and meta-progression production until the core earns comprehension/desire evidence

**Verdict: PASS as scope restraint.** Additional authored volume and an economy would make an unproven interaction loop expensive to replace. Passing old scoped prototype reviews and winning automated replays does not supply the missing product evidence.

**Strongest case against deferral:** persistent investment, returning to a recognizable factory, and anticipating the next product can be part of the core pleasure. A single isolated test room may unfairly remove the context that makes factory building worthwhile. Commercial constraints can also influence session length and content costs early.

**Boundary:** this decision should not forbid a small sequence of preserved jobs, a standalone-stage comparison, or lightweight examination of content cost. Those are ways to test the core and ownership hypotheses. It should block production of a large commission catalogue, an upgrade economy, and monetization integrations before that evidence exists.

**Concrete failure case:** players complete a comprehensible first task politely but cannot name any change they want to make next. Building 40 more obstacle layouts would not resolve that result. The opposite failure is holding the project to a vague “fun proven” gate forever; the parent review should use explicit provisional stop/revise/continue criteria and distinguish curiosity from confusion-driven retries.

**Evidence needed:** voluntary continued construction, an articulated next factory change, and a comparison of what is lost or gained when the board resets. Early comprehension is necessary but cannot by itself establish long-term appeal.

## Phone screenshot cross-check

Inspected the actual files `docs/reviews/evidence/opening-390.png` and `docs/reviews/evidence/level-5-complete.png`. These are still-image observations, not a touch usability test or motion assessment.

- The opening frame shows a largely empty 8 × 9 board, a single small Blank source, the Punched quota, a large action count and a Place a Punch button. It communicates an orderly puzzle workspace; it does not itself depict the production transformation or the factory payoff. The large empty floor is a burden on an immediately understandable clip unless the player's next action supplies the spectacle.
- The completed fifth-level frame truthfully shows completed quotas and three visible top-level machines, one of them a folded module. It supports the replay finding that a “complete workshop” remains visually small. No physical shipment destination appears on the board; the quota panel carries the visible result.
- The shapes and product symbols are distinct in these stills, which is a useful foundation. The screenshots cannot establish that moving goods are readable, that ports are easy to target under a finger, or that the process is satisfying to watch.
