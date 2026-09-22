# Asteroid factory direction — loop adversary

20 September 2026. Independent review of proposals A1–A5 supplied by the parent reviewer. This is a design review, not a playtest, simulation result, or implementation approval. Read alongside the [previous full review](../ADVERSARIAL_DESIGN_REVIEW.md).

## Overall finding

The direction has a clearer ownership promise than the current commission puzzle: **I used to do this work; now the machine does it; I can make the whole operation better.** The asteroid also provides a readable place for materials to originate. Neither incremental accumulation nor a space theme establishes interesting automation by itself.

The most dangerous substitute is an idle game in which conveyors decorate a buy-next-upgrade menu. A second danger is making extraction visually exciting while processing is a slow journey through identical boxes. A third is introducing construction costs that make experimenting with the actual factory feel financially foolish.

The existing reducer's paid-action clock and exact delivery quotas are current implementation facts. Continuous drilling, finite power, ore processing, new transport, and all proposed economics are unimplemented hypotheses. No human behavior was observed for this new direction.

## A1 — Manual bootstrap followed by automatic drilling

**PASS — bounded bootstrap experiment only.**

Reviewed proposal: tap or hold to chip an exposed starting deposit, with the same capped extraction rate; purchase a first automatic drill quickly; that drill replaces manual work at that site; no tap multiplier and no need to tap to keep the automated line productive.

This gives the first drill a direct, understandable benefit. Hold equivalence removes a reason to turn the introduction into an input-speed contest. The restriction on supplementing the automated site is substantive: if tapping could double the drill's output, the optimal behavior would remain repetitive manual labor.

Concrete attacks to run:

- A player holds the screen before reading anything and keeps holding after buying the drill. Do they notice the transition to automation, or assume holding still causes production?
- A player follows the flashing ore forever rather than purchasing the drill. Is the purchase visible and causally understandable without a tutorial paragraph?
- A player taps much faster than the extraction cap. Does feedback imply that all taps produced ore, accidentally teaching an incorrect economic rule?
- A player returns after automating one site and is told to manually bootstrap every new site. That would reintroduce the chore this first upgrade promised to remove. Expansion onboarding is outside this PASS.
- A player begins with insufficient knowledge to budget ore for a drill plus its usable output connection. Buying a drill that immediately stalls is a broken bootstrap even if the button becomes affordable quickly.

Evidence required: actual unaided touch play, resource traces showing tap and hold parity, first complete automatic work cycle, and an observer's explanation of what the drill replaced. “Quickly” is a hypothesis to tune from these observations, not a result or an industry target. Do not extend this approval to paid tap boosts, mandatory return tapping, or recurring manual extraction chores.

## A2 — One visible outpost; continuous operation; explicit paused planning

**PASS — bounded presentation and interaction experiment only.**

Reviewed proposal: a persistent portrait outpost arranged around an asteroid cutaway, top-down 2D presentation with large pieces, visibly continuous extraction/transport/processing, explicit pause while planning, no action charges, and shipment effects driven by actual production events.

This directly addresses the existing factory's repeated stop/start permission and concealed production. The pause also permits precise thought without taxing the player while their finger obscures the work. Persistence here means continuity of the experimental outpost; this PASS does not select an endless-world campaign, offline production, or a depletion/reset system.

Concrete attacks to run:

- The asteroid occupies most of the portrait screen and turns the factory into tiny peripheral machinery. The theme has then worsened the main readability problem.
- A finger covers the inlet the player needs to connect. A large machine sprite does not establish large, unambiguous interaction targets or readable port directions.
- Selecting a machine pauses the whole scene, but the visual pause indicator looks like a jam. A clip viewer attributes stopping to the wrong cause.
- The player repeatedly opens a purchase menu, stopping production for most of the session. “Continuous” operation then exists mainly when they are not interacting.
- A stored queue releases an attractive burst and immediately stalls again. The visual is honest but its apparent meaning—improved sustainable production—is false.

Evidence required: normal-speed recordings at actual phone size, muted viewing, visible input-to-output causal explanation, and time spent observing versus manipulating menus. Use both an early sparse outpost and the maximum complexity of the small experiment. Do not infer readability from desktop screenshots.

## A3 — Ore → plates → parts with physical transport and construction delivery

**REVISE — transport demonstration is plausible; the economic and recovery contract is underspecified.**

Reviewed proposal: a small drill/smelter/assembler chain with conveyors, actual transported material, bounded buffers, consequential topology/capacity, no globally shared intermediates, and a construction wallet credited only with clearly delivered resources.

The separation between physical work in progress and spendable resources is useful. It can also create a severe trap. Suppose the player spends the last delivered ore or plates on a processor, then discovers its final connection requires more of the same resource. Their remaining production is trapped upstream or automatically converted into an unusable construction resource. They may possess plenty of visible material and still be unable to complete or undo the line. Exact-product jam behavior was already a weakness in the current game; recreating it with currency is worse.

The one-input serial recipe is sufficient to test whether drilling and processing feel satisfying. It is not sufficient evidence of planning depth. If every output has exactly one productive successor and every machine has an obvious position on that route, transport is a cost of clicking through the recipe.

Required revision before adoption:

1. Specify the first complete build's construction costs and material sources, including every necessary connection. Demonstrate that the purchase sequence reaches a productive state.
2. Specify recovery after a mistaken purchase, disconnected machine, or blocked line. State what happens to construction value, input/output buffers, and material already in transport. Recovery must not require an unannounced manual grind or duplicate/discard resources silently.
3. Name the terminal delivery behavior. A shipment destination that accepts construction material must not become an exact-quota sink that permanently refuses needed salvage or blocks the only productive line.
4. Narrow the initial serial chain's claim to causal readability and bootstrap. Route capacity matters only after an actual feasible alternative can change something valuable.

These revisions do not require a broad logistics simulation. A small explicit material-conserving rule is preferable to five recovery menus. The implementation must preserve visible causality: putting a machine in the warehouse must not make a belt's undelivered contents mysteriously spendable.

## A4 — Incremental capital investment constrained by power and build space

**REVISE — constraints alone do not establish competing plans.**

Reviewed proposal: spend earned resources on machinery/capacity; realized improvement depends on the rest of the network; finite starter power and limited connected build space create competition; no universal perpetual drill-percentage purchase; no decay or deadlines.

The dependency on physical production is the right direction. But a serial system can still have one obvious policy: inspect the slowest stage, buy its next increment, repeat. Power then becomes another upgrade currency, and space becomes a nuisance to expand before the next purchase. The scene may become attractive while the actual game remains a shopping checklist.

Concrete counterexamples:

- If raw material, plates, and parts all immediately become one exchangeable currency at fixed prices, their chains can be ranked by return per resource/power/tile. One best chain may dominate until the next unlock changes the ranking.
- If the only valuable product is parts, ore and plate accumulation are useful solely as a buffer. After the chain is balanced, the best plan is to raise its three serial capacities together. A large recipe tree can repeat that same decision many times.
- If power can be reassigned instantly with no fixed automation policy, the best play may become manually toggling powered machines to cycle a tiny generator between stages. That is dispatch labor, not the machine doing the work.
- If purchased machinery cannot be recovered, testing a creative layout loses resources relative to waiting for the obvious purchase. Players who most engage with construction may progress slowest.
- If build space can always be bought with the same currency, spatial planning becomes a temporary obstacle to the universal strip layout. If space never expands, persistent growth may instead require tedious teardown.

Required revision before adoption:

1. Give one small, fully specified scenario with at least two mutually exclusive investments or routes and distinct useful outcomes. Include actual recipes, capacities, budgets, power allocation, and resource destinations. Parent modeling can test it; a claim that “there will be tradeoffs” is insufficient.
2. Specify the recovery cost and the rule for changing power allocation. Attack any manual power-cycling strategy against the intended automatic solution.
3. State what waiting accomplishes. Waiting may legitimately be part of an incremental game, but it must not be the only sensible answer to every disclosed planning problem.
4. Keep the scope narrow: a successful local tradeoff does not select the long-term economy or establish retention.

## A5 — Truthful ten-second promise and thirty-second extension

**PASS — storyboard and capture experiment only.**

Reviewed proposal: the beginner sequence shows manual mining followed by a hands-free drill, an ore stream, and visible refining; a mature ten-second clip shows a real stalled queue and a placement/routing change that restarts production. Entire beginner progression need not occur within ten seconds. Timing is explicitly hypothetical.

The strongest defensible promise is “the system keeps working after my hand leaves.” The first drill should deliver a visibly different behavior, not merely make the ore counter rise more quickly. For the mature clip, the queue must actually exist within bounded buffers, and the intervention must improve real flow. A temporary backlog burst is not proof that sustained rate improved.

Concrete attacks to run:

- Start with the live ordinary save instead of a prepared demonstration. Is a compelling intervention still available, or does every good clip need a designer to break the factory first?
- Freeze the clip just after intervention and ask what will happen next. If viewers only predict “more particles,” the factory relationship is not clear.
- Show a full minute after the repair. Does production continue, hit the same unchanged downstream bottleneck, or run out of useful destination capacity?
- Remove glow, shake, sound, and counters. Can the action and improvement still be identified from materials and motion? The final game can use those effects, but they cannot replace causal information.
- Continue the same clip to thirty seconds with another normal decision. If the only extension is tapping Buy twice, the hook has exposed an idle-upgrade game rather than consequential factory design.

Evidence required: unmodified simulation capture, inventory/throughput traces matching the visible flow, muted comprehension, and a record of ordinary player attempts alongside the chosen clip. The hook can truthfully sell a moment of relief; it must not use that moment to claim depth not yet demonstrated.

## Initial verdict ledger

| Decision | Verdict | Scope or blocking reason                                                                           |
| -------- | ------- | -------------------------------------------------------------------------------------------------- |
| A1       | PASS    | Short manual-to-automatic bootstrap experiment                                                     |
| A2       | PASS    | Portrait outpost/readability and paused-edit experiment                                            |
| A3       | REVISE  | Exact build path, recovery/material handling, delivery behavior, and narrower depth claim required |
| A4       | REVISE  | One concrete competing investment case, recovery/power rule, and waiting analysis required         |
| A5       | PASS    | Truthful storyboard and recording experiment                                                       |

No runtime changes are approved by this document. No verdict establishes that players find the proposed game fun. Revisions will be appended below rather than silently replacing the original objections.

## Revision round 1

The parent narrowed the proposals to a specification/prototype experiment, rather than demonstrated depth, and supplied the following changes.

### A3 revision — near resolution, recovery guarantee still required

The revised bootstrap uses hand-mined raw ore to pay for the first drill and its usable delivery connection before any plate/part requirement. First-slice construction costs are fully refundable. Moving a paused machine preserves buffers. Demolition atomically recovers original construction materials and held/work materials to finite visible salvage, or rejects the edit without changing state when storage lacks room. Work in progress refunds original ingredients once and visibly discards only processing progress; conservation and roundtrip refund checks are required.

The revised chain branches after smelting between a construction plate store and a parts assembler. Later construction requires distinct plates and parts. An automatic branch alternates across destinations with capacity, skips full outputs, and advances its cursor only when a transfer succeeds. This is a real allocation rule rather than an unexplained perfect dispatcher. Its numeric behavior still needs a simulation witness.

**A3 remains REVISE at this step:** full refunds do not guarantee recovery when the finite salvage store is full. A blocked disassembly can still leave all wealth inside an unusable factory. Resolve this with a verified always-available reclaim route or enough reserved salvage capacity for every reclaimable installed asset and all held/work/transport materials within the bounded slice. Do not choose an arbitrary small cap and assume full refund solves the trap.

### A4 revision — explicit scoped authoring comparison

**A4 PASS — bounded specification and prototype comparison only.**

The parent supplied an explicit parameter witness: equal installed material cost buys either compact processing of 3 plates/second using 2 cells and 4 power, or a wider efficient arrangement processing 4 plates/second using 6 cells and 2 power. A 4-free-cell/4-free-power context favors the compact option's feasibility; a 6-free-cell/2-free-power context favors the wider option's feasibility. Actual footprint, port, transport, and replay feasibility remain to be authored and verified.

This resolves the missing concreteness sufficiently to test area/power/capacity alternatives. It does **not** demonstrate a meaningful choice between two alternatives in the same state: each witness removes one option by feasibility. In a room where both fit and extra cells have no other value, the wider option is better on rate and power. That dominant-choice attack remains essential. Do not present these example values as balanced statistics or as evidence of a strategic economy.

**A4b PASS — later optional power comparison only.**

The first slice may omit power and test shared plates plus space first. Power is a separate later comparison if it reveals a decision the simpler prototype lacks. This approval does not authorize stacking a power tutorial onto the bootstrap, power-switch micromanagement, or a permanent energy economy. If cycling power by hand outperforms sensible automatic operation, revise the mechanic before extending it.

Full recovery removes the economic penalty for trying a layout in the first slice, once the A3 recovery guarantee is resolved. Waiting and upgrading the current bottleneck remain legal adversarial strategies to execute; there is no claim that the revised specification has defeated them.

## Revision round 2 — narrow recovery to reversible construction

**A3r2 PASS — bounded concept/prototype experiment with checkpoint undo, not a salvage/refund economy.**

The parent removed demolition/refunds and salvage storage from the proposed first slice. Free paused relocation keeps the whole machine and its contents together. Build/upgrade checkpoints support complete-state undo for the whole short experiment: restore resources, machinery, inventories, and production state together. The UI explicitly states that undo also rewinds output earned after the checkpoint; no later earnings or unlocks survive the rewind. A chapter-start restart is available. No transactional connection to purchases, cloud rewards, or offline accumulation is part of this experiment.

This resolves the recovery objection for a small local prototype without requiring a new salvage game. The authored raw-ore bootstrap still needs to reach the first drill and usable delivery path before requiring processed material. The automatic plate/parts branch, bounded work buffers, real transport, and distinct delivered construction balances remain in scope. Waiting for stock is a legitimate consequence of working automation here, not a test failure by definition. The previous toy-factory proposal's throughput examination is not imported.

The earlier salvage/full-refund implementation remains **REVISE/deferred**; this PASS does not resolve or adopt it. Checkpoint undo is likewise not a permanent incremental-economy selection. Once sessions become long, throwing away substantial later production may be an unacceptable cost of correcting an old purchase. That future recovery problem still needs a design.

Specific attacks for the approved prototype:

- Buy an unusable machine with all available wealth, let the current line run, then undo. Verify exactly one consistent prior state, including delivered balances, in-flight stock, work in progress, outputs, and unlocks. Repeat the roundtrip; no material or reward may accumulate.
- Rewind past a plate/part conversion and check that raw ingredients and finished goods are never both retained.
- Move a full machine next to delivery, run briefly, move it back, and repeat. Free movement with retained buffers can become manual hauling that beats transport. Compare this with a good automatic route before claiming automation is the best way to play.
- Fill every visible buffer and construction store allowed by the slice. An automatic branch that skips full destinations must continue serving the other destination when it can accept material; feedback must explain genuine full-system blockage.
- Present the player with a purchase that increases extraction but leaves processing unchanged. Observe whether they understand why ore piles up and can make a consequential correction without being told to buy a highlighted upgrade.

## Final verdict ledger

| Decision                  | Final verdict     | Authorized scope                                                                                                             |
| ------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A1                        | PASS              | Capped tap/hold bootstrap and first automated replacement experiment                                                         |
| A2                        | PASS              | Readable continuous outpost with explicit paused planning experiment                                                         |
| A3r2                      | PASS              | Physical serial chain plus plate/parts branch; free relocation and complete-state checkpoint undo in a short local prototype |
| A4                        | PASS              | Authoring/prototype comparison of explicit area/capacity alternatives; no proven same-state strategic depth                  |
| A4b                       | PASS              | Optional later power comparison, separate from the opening slice                                                             |
| A5                        | PASS              | Truthful short-clip storyboard and capture experiment                                                                        |
| A3 salvage/refund variant | REVISE / deferred | Not adopted; recovery from full salvage remains unresolved                                                                   |

The central surviving objection is unchanged: **a satisfying drilling clip can still lead to a repetitive incremental purchase list.** The prototype earns a larger scope only if players improve the production system through decisions they can explain, rather than merely obeying the next affordable purchase.
