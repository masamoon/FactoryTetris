# Adversarial gameplay review

User requirement: every brainstormed gameplay decision receives independent adversarial agent review before adoption. Unresolved REVISE/REJECT verdicts block adoption. A scoped PASS is not approval beyond that scope. See AGENTS.md.

## 2026-09-22 — visible manual-delivery drone

The player-facing proxy is a compact flying service drone, not a ground robot or player-piloted spaceship. It preserves the remote tap/hold input model while giving manual stockpile recovery a visible collection → cargo → destination sequence. Tap COLLECTION, then a highlighted compatible processor; the inspector offers the same action as an accessibility route.

The independent adversarial review **REJECTED** a spaceship because its scale and landing implications compete with the factory, and **REJECTED** a ground robot because pathfinding, collision and camera-follow expectations would turn recovery into locomotion. It **PASSED the service drone for this bounded experiment** with these conditions: maximum two-item truthful cargo, collection-to-processor trips only, deterministic terrain-clear routes, persisted travel/return state, destination-slot reservation, no steering, and no machine-output pickup that could bypass belts or backpressure.

Stock leaves collection at dispatch and enters the processor only on arrival. Courier arrivals resolve before belts and processors on the shared 100 ms tick; reservations count against the four-item input cap. The factory remains live during targeting and travel, while explicit pause, planning, dialogs and document hiding pause both systems. The drone creates no undo checkpoint. This PASS authorizes the experiment and its clip-readability hypothesis, not player enjoyment or final balance. See [the independent review](reviews/2026-09-22-avatar-transfer-adversary.md).

## 2026-09-20 — repeatable manual stockpile input

The initial adversarial review proposed a one-use prime because repeatable loading could compete with processor input routing. The user explicitly rejected that restriction: Factorio-style manual insertion is required for early-game and softlock recovery, and its limited manual throughput is an intentional tradeoff. That product decision overrides the earlier veto.

The resulting implementation received **PASS within the fixed scope**: smelters accept stockpiled ore and assemblers accept stockpiled plates whenever their four-item input buffer has room, including while processing or output-blocked. Each press completes the next two-item pair: 0→2, 1→2, 2→4 or 3→4. Insufficient stock, full buffers and incompatible machines reject atomically. Loading conserves material, saves immediately and creates no undo checkpoint, so repeated recovery taps cannot evict construction history; undoing the preceding build still rewinds all later loading and production.

Manual insertion is recovery, not automation and not evidence of a sustainable factory. The risk that players repeatedly service machines instead of routing belts is accepted but unresolved; human play must compare that labor against automation and verify that the control prevents rather than merely relocates softlocks. See [the independent review](reviews/2026-09-20-stockpile-manual-input-adversary.md).

## 2026-09-20 — tap-and-drag conveyor installation

The initial interaction proposal received **REVISE** because path interpolation, camera arbitration, direction, replacement, cancellation and transaction behavior were unspecified. The exact revised scope received **PASS for a bounded input experiment**: belts remain free; tap retains precise single-cell preview and explicit replacement; drag order creates a live four-connected directional route; backtracking trims the route; existing belts are reused only when their direction matches; invalid or cancelled routes build nothing; and a valid route commits as one full-state undo checkpoint. Belt mode owns canvas drag while the visible camera buttons remain available, and production stays paused until Resume.

This improves construction fluency only. It does not demonstrate deeper routing, balance or enjoyment. A real-time touch capture through genuine cargo payoff and a small human test remain required. See [the independent review](reviews/2026-09-20-belt-drag-adversary.md).

## 2026-09-20 — truthful 30-second product constraint and drill extension

The user made short-form appeal a persistent product constraint: the real factory-building experience must be understandable and appealing in a silent, portrait 30-second clip, whether shown in real time or through clearly disclosed abridgement. The initial literal proposal received **REVISE** because requiring every individual decision to be photogenic would reward footage over the game. The revised portfolio-level rule received **PASS**: material decisions may create the hook, improve readability or cadence, preserve truth, support accessibility/recovery, or supply the ordinary-play agency, progression and replayability behind the moment.

**PASS:** the eight-point truthful-clip gate, disclosed prepared saves/cuts/speed changes, retained uncut witness, phone-size silent comprehension, representativeness check and companion ordinary-play review. Viral mobile clips are references only for framing, legibility, visual hierarchy and cadence. A clip verdict does not prove enjoyment, balance, retention or commercial viability. See [the persistent constraint](SHORT_FORM_PRODUCT_CONSTRAINT.md) and [its independent review](reviews/2026-09-20-short-form-constraint-adversary.md).

The drill end-of-reach alternatives were separately reviewed. **REJECT:** repeatable permanent reach increments as the core solution. **REVISE:** moving the entire connected drill after every shaft. **REJECT for the first prototype:** stacking generic reach tiers with relocation automation. **PASS for a bounded prototype:** keep the base/output fixed, extend the head through at most three visible eight-cell rail sections, require one teaching confirmation, then let a tender execute a player-precommitted continuation. One capped two-to-three-section support tier is permitted; repeatable `+1` reach, automatic branch choice, curved paths and indefinite extension are not.

Implementation follow-up: the experiment was narrowed to one global extension and at most two bases. The first exact economy received **REVISE** because extension dominated. The revised version received **PASS for the bounded prototype**: the shared first-part state contains one part and two ore; extension spends the part and exposes 30 ore, while a new nearer drill spends the part plus two ore and exposes 32, equalizing authored net ore while preserving routing, distance and parallelism differences. A visible tender installs the extension before mining resumes. Exact disabled reasons, head/base navigation, atomic corridor rejection, save/resume, undo, maximum-distance return and both deterministic branches are covered. Human phone play, truthful clip capture and ordinary-play maintenance/frontier-choice review remain required. See [the independent drill review](reviews/2026-09-20-drill-endstop-adversary.md) and [implementation review](reviews/2026-09-20-drill-extension-implementation-review.md).

## 2026-09-20 — side-view asteroid excavation

The user clarified a 2D side-scrolling viewpoint like Terraria. This supersedes the top-down assumption; character-control style remains open. Independent reviewer: `sideview_mining_adversary`.

**PASS for concept/prototype exploration only:** S1 actual finite block excavation in side-on terrain; S2 shared manual extraction loop, with exact reach/movement/collection interaction unresolved; S3 bounded straight shaft drill with stationary output base, advancing head and visible internal ore return; S4 static mined terrain without inferring structural collapse/survival systems; revised S5 clip beginning with a real player placement followed by actual excavation and ore transport. Original S5 received REVISE because passive observation omitted the causal player action; revised S5 explicitly fixes this and does not treat occupied drill rail as free factory floor.

This new excavation scope supersedes the earlier stable-source/no-carving experiment assumption only for the proposed side-view branch. Finite reach may produce relocation chores, and the rig's internal transport may weaken external logistics; those remain experiment risks. Vertical transport, rail reclamation, relocation economics, and character control are not selected. No runtime change or mining prototype was implemented. See [updated direction](ASTEROID_AUTOMATION_DIRECTION.md) and [independent review](reviews/2026-09-20-sideview-mining-adversary.md).

## 2026-09-20 — asteroid mining to incremental automation

The user proposed manual asteroid mining that gradually becomes an incremental game with satisfying visible automation and planning. This is the new leading exploration; no runtime pivot was requested or implemented.

Independent reviewers: `asteroid_loop_adversary`, `asteroid_progression_adversary`, and `asteroid_mobile_adversary`. **PASS as bounded experiments:** short tap/hold bootstrap with automation replacing manual work; a readable continuous outpost with paused editing; actual transported ore/plates/parts; shared plate allocation; meaningful investment/placement comparisons; one persistent outpost and expansion; truthful clip targets; simple footprints and optional snapped placements; sequential introduction of processing after the first autonomous drill. The thirty-second opening target covers manual extraction to the first working drill, not the full factory.

**Revised A3r2/B4b PASS:** authored raw-ore bootstrap, retained-inventory relocation, and full-state construction checkpoint undo for the short prototype. **Earlier salvage/refund version remains UNSELECTED/UNRESOLVED:** finite salvage can strand resources even when invalid demolition is rejected atomically. The progression reviewer corrected its earlier permissive verdict after the loop reviewer identified the recovery gap.

**PASS as later comparisons/scope boundaries:** power/space alternatives, depletion versus stable sources, later two-input automation, and investigating offline production only after the foreground loop. No prestige, monetization, enormous recipe tree, fixed forced-depletion behavior, or permanent choice about Tetris is selected. Waiting can be legitimate incremental play; no separate throughput exam from the earlier toy proposal is imported.

Concrete risks remain: upgrade-the-minimum as a universal strategy, manual relocation beating belts, visually impressive transient output, depletion chores, and expensive undo of accumulated progress. Context-dependent feasibility of sample machine packages is not proof of interesting same-state strategy.

See [direction exploration](ASTEROID_AUTOMATION_DIRECTION.md) and its linked independent reviews for individual verdicts, revisions, illustrative capacity arithmetic and validation questions. No human enjoyment, retention, balance or sustainable strategy diversity has been demonstrated.

## 2026-09-19 — full adversarial product review

User direction: automation/factory gameplay is mandatory; appeal must be legible in a 10–30 second clip. Tetris footprints and level-based structure are open questions. The root AGENTS.md was updated with this review brief before evaluation.

Independent reviewers: `mechanics_adversary`, `product_adversary`, and `direction_adversary`. Current product direction: **REVISE**. Deterministic solvability and prior experimental PASS decisions do not establish the desired immediate appeal or lasting engagement.

**PASS for bounded experiments only:** D1 tangible toy transformation/visible delivery; D2 continuous observation and paused editing/background; revised D3 finite floor/inventory with free edits and standardized empty-state sustainable-output trials; D4 simple bottleneck opening followed by genuine construction alternatives; D5 shaped-machine/rectangle comparison; D6 disable folding in the experimental variant; revised D7 two-input assembly with automatic cyclic 1:1/2:1 no-skip routing and a spare-wheel destination; D8 three preserved jobs versus three standalone jobs; D9 truthful short-clip storyboard; D10 separate comprehension, desire, transfer, and return evidence. D3 initially received REVISE for hoarded-output exploits; D7 initially received REVISE for unspecified/manual routing. Their accepted specifications and remaining failure criteria are recorded in the independent direction report.

**PASS as product experiment priorities:** R1 test the small toy-factory loop; R2 compare continuity versus standalone structure; R3 defer commercial/retention conclusions. **PASS as alternatives/control scope:** revised A1 cosmetic real-shipment feedback with unchanged current rules; A2 defer reflex-driven falling/overflow as primary; revised A3 reject number-only merge/idle replacement while leaving consequential physical merging untested; A4 defer large content/meta/monetization investment. Original A1/A3 REVISE verdicts and accepted narrower wording are retained.

Final cross-check, completed 2026-09-20: **D3b PASS** supersedes ambiguous Test/Resume reset wording. Ordinary unscored practice preserves inventory and the opening backlog; a separately labelled Check design tests an empty-state clone and cancellation returns to the unchanged paused practice snapshot. Edits invalidate previous measurements. Mode confusion, perceived lost inventory and repeated checking/waiting are explicit failure criteria. Provisional research targets (6/8 explain clip causality, roughly 30 seconds to intentional first output, 5/8 voluntarily continue with a concrete idea) separately received PASS as exploratory redesign signals, not benchmarks or retention estimates.

See [full review](ADVERSARIAL_DESIGN_REVIEW.md), [mechanics report](reviews/2026-09-19-mechanics-adversary.md), [product report](reviews/2026-09-19-product-adversary.md), and [direction report](reviews/2026-09-19-direction-adversary.md). The review changed documentation and captured evidence, not runtime rules. No human enjoyment, retention, balance, or commercial claim is approved by these verdicts.

## 2026-09-17 — variety proposal

Reviewer: independent `gameplay_adversary` agent, with access to the actual simulation and content. No gameplay changes were made during this review. The proposal as a whole did not pass.

| Proposal                                           | Verdict                      | Scope or unresolved objection                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unrestricted toolbox replaces queue                | REVISE                       | Removes supply frustration but does not itself create varied choices. Early downstream machinery can intercept active-order shipments. Needs explicit warning design and concrete different build choices across boards.                                                              |
| Belts available from the start                     | PASS for availability        | Their strategic usefulness is unproven. Require a verified routing problem before claiming meaningful conveyor gameplay.                                                                                                                                                              |
| Distinct board families                            | REVISE                       | Geometry alone is insufficient. Free fold relocation may bypass passages. Each family needs a replay and a consequential decision distinct from other families.                                                                                                                       |
| Folding creates strategy by sealing intermediates  | REJECT as justified          | Single multi-cell machines can fold and relocate for free without sealing any intermediate. Existing single-output routing already restricts intermediate access. Need competing strategies where remaining unfolded is rational, including comparison with individual-machine folds. |
| Keep recipes and gear → motor → robot orders       | PASS as experimental control | Holds rules constant while testing other changes; not approval of permanent objective sameness.                                                                                                                                                                                       |
| Curated seeds, real winning replays, recovery room | PASS as validation method    | Proves solvability only. Assess realistic recovery costs and observe human attempts. Alternative strategies must differ meaningfully when used to support strategic-choice claims.                                                                                                    |
| Keep 24 actions                                    | PASS as prototype control    | Not an approved balanced release budget. Current reference solutions consume nine actions; changed routing requires new evidence.                                                                                                                                                     |
| Avoid recently played families                     | PASS as New Run scheduling   | Retry preserves the seed. Scheduling does not establish strategic variety.                                                                                                                                                                                                            |

The next design discussion must resolve the folding/spatial-constraint interaction before treating the proposed redesign as approved. Any revised gameplay rule returns to independent review; no replacement folding rule has been selected.

## 2026-09-17 — structure, variety, and return motivation

Three independent adversaries reviewed these questions separately: `structure_adversary`, `variety_adversary`, and `retention_adversary`. These are design verdicts, not implementation or playtest results.

- **PASS:** one persistent portrait board, three successive orders visible from the start, unlimited thinking, win when the last action's production completes all orders, lose at zero actions with unfinished orders. A blocked layout is recoverable while actions remain. Free undo restores the latest committed command, including after defeat; it does not promise to skip intervening free commands.
- **PASS as experimental controls only:** retain current recipes, gears → motors → robots, shared paid-action/four-tick rules, and 24 actions. Twenty-four is not an approved release balance. Four-to-six minutes remains a human playtest target.
- **PASS as description only:** folding earns compactness while preserving production. **REVISE:** assuming free compression/relocation is a settled foundation for spatial challenges or a meaningful sacrifice.
- **PASS for a bounded experiment:** author candidate source/floor/contract combinations under existing supply rules. Compare strategies across boards, attempting to transplant the same build order, connection topology, and earliest individual/group folds. A voluntarily different replay alone is insufficient evidence of different decisions.
- **REVISE:** quantity/intermediate-order variation as a replayability system. Extra Run presses alone do not count. **REVISE:** claiming every New Run already poses a distinct problem. The unrestricted toolbox remains unresolved.
- **PASS:** reproducible seeded selection, all orders revealed upfront, no permanent player-power differences, no shops or escalating rounds in this short-run scope.
- **PASS as usability/payoff experiment:** readable material flow and folding feedback. **PASS:** authored tutorial that retires step-by-step solution hints after onboarding. These do not establish retention.
- **PASS as optional experiment:** personal best actions used, with completion primary and comparisons only within the same seed, scenario, and rules. This measures action efficiency, not all aspects of factory mastery.
- **PASS:** clear Retry Same Layout and New Run, avoidance of recently played families on New Run, no power grind/login penalties/chores. **DEFER:** daily shared challenge; it does not repair weak underlying content.
- **PASS as evidence method:** observe voluntary second runs, ask what decision the player wants to change, and separately observe later voluntary returns. Confusion-driven retries are not positive engagement evidence.
- **REJECT:** recovered cells as primary competitive score; unnecessary construction can increase it. Nested folds do not inherently double-count savings: current visible footprints determine savings, and isolated one-cell refolds are disallowed. Descriptive space-recovered results may remain.

Conclusion: the finite factory-puzzle structure passes. Meaningful variety and repeat-return motivation remain unproven. No gameplay changes were made during this discussion.

## 2026-09-18 — systemic, compact, easy to experiment with

User direction: highly systemic, compact, and easy to play with. Independent reviewer: `compact_systems_adversary`. All four principles below received PASS as design/validation criteria, after revising principles 2 and 4. No runtime changes or new folding rule are approved by these verdicts.

1. Seek depth primarily through interactions of footprints, directional flow, buffers, recipes, and compression before expanding the number of mechanics. This is scope discipline, not evidence that the existing fixed recipe chain has sufficient depth.
2. Keep a compact interaction loop: choose/place/rotate; paid placement or explicit Run advances production; inspect flow and named reasons for stalls; adjust/fold. Inventory transfers remain automatic, while relevant stored contents and processing progress remain inspectable. Existing paid-command behavior is unchanged. Hiding causal state is not simplification.
3. Keep local rules consistent. Seeds may change the problem, not arbitrarily change how a machine works. Machine roles may differ clearly without board-specific exceptions.
4. Preserve the original simulation graph when folding. Free relocation remains unresolved. Before claiming systemic variety, demonstrate competing plans with a consequential tradeoff and try to dominate them with earliest individual/group folding and free relocation. Separately test whether humans understand and enjoy the choice. Two merely viable plans are insufficient if one is obviously inferior.

## 2026-09-18 — tension release and open construction

User wants a tension/release cycle, sandbox freedom, broad board generation, and clear victory/defeat. Independent reviewers: `tension_cycle_adversary` and `sandbox_generation_adversary`. The following are prototype approvals, not implemented rules or proven retention.

- **PASS after revision:** show three contracts, initial action allowance, and fixed grants for completing the first two contracts upfront. Unspent actions carry forward. Each grant applies atomically once with milestone advancement. Complete production, shipments, and grants before exhaustion checks. Undo restores all relevant state. No grants per item or fold; total action availability is bounded. Amounts remain experimental and require recovery margin at every checkpoint. This replaces the flat initial budget only in the proposed experiment.
- **PASS:** win by fulfilling the third contract, including on the last action; lose when actions are exhausted with an active unfinished contract. No real-time deadline or instant loss just because the board is full. Replenishment is a proposed release, not demonstrated balance.
- **PASS for a controlled toolbox experiment after revision:** all five machines and both belts available immediately. Placement/movement/folding previews must name any newly diverted active-order products and their destination; allow free cancellation without repetitive confirmation modals. Inspectors explain the destination. This permits construction freedom, not a claim of replayability. Existing recipes and three visible contracts remain experimental controls.
- **PASS for an offline generation harness:** construct candidate boards from complete valid command sequences and replay them in the actual simulation. Verify each prefix survives to its checkpoint reward, along with resources, timing, placement, and folding. Attempt to transplant strategies across candidates, including earliest individual/group folding and free relocation.
- **REVISE:** serving a generated board solely because a winning witness exists. Keep playable candidates curated until quality criteria are concrete; a witness alone establishes neither multiple viable approaches nor interesting decisions. Obstacles placed around one witness can create a brittle single-solution puzzle.
- **REJECT as an established claim:** unlimited meaningful solutions or strategic variety. The intended experience is many challenges and freedom to construct a solution. Combinatorial setup count alone is insufficient evidence.
- **UNRESOLVED:** existing single-output recipes largely fix the production dependency graph; free compression/relocation may erase spatial distinctions. Folding as a spatial tension/release mechanism remains unproven.
- **DEFER:** a splitter for shared versus dedicated production. Exact output routing, blocking, capacity, shipment and folding behavior require a separate proposal and review; no splitter rule was adopted.

No gameplay code changed in this discussion. Approved next work is a bounded prototype of the checkpoint budget and warned toolbox, plus candidate generation/strategy rejection tooling. This is not approval to ship unrestricted procedural content.

## 2026-09-19 — potentially endless arcade and visual products

User direction supersedes the three-order endpoint: explore potentially endless arcade runs and intuitive visual materials rather than a memorized commodity recipe tree. Reviewers: `endless_arcade_adversary` and `visual_materials_adversary`. No runtime changes made.

- **PASS for an experiment:** one persistent board with repeatable contracts and no scripted final order. Completed contracts provide success beats and score (exclude surplus/folding/recycling). Personal-best comparisons must respect seed/rule differences. Save/resume allows short sessions within a long run.
- **PASS for an experiment:** paid actions advance simulation while thinking remains free; current plus next two targets are visible, with seed-stable revealed sequence across undo/save. Difficulty may plateau rather than demand exceed physical capacity. These are testable rules, not proven challenge.
- **PASS as defeat ordering:** evaluate production and earned rewards before testing exhausted actions with an unfinished contract. **REVISE for endless use:** a capped action extension does not prevent an automated factory farming cheap orders; extensions below unavoidable costs instead guarantee defeat. The finite three-contract grant approval does not establish a balanced infinite economy. Amounts/renewal accounting remain unresolved.
- **REVISE:** mixed targets and folding claimed as recurring strategic pressure/release. Test universal factories, cheap-order farming, impossible contract transitions, and meaningful construction decisions between contracts. Indefinite operation alone is not indefinite play depth. Do not fix a solved universal factory merely by tuning every run to inevitable exhaustion.
- **PASS for a readability prototype:** a common chunky blank and directly visible physical transformations, enlarged exact targets, actual input/output previews, and few color-independent geometric attributes. Phone-scale products must remain distinguishable, including moving/buffered items. Machine rotation and product rotation must be visually distinct if both exist.
- **REVISE as final vocabulary:** central punch, corner notch, quarter-turn. They are only disposable examples for testing comprehension; a finite easily prebuilt catalogue and commuting operations do not establish systemic depth. **REJECT:** these operations alone claimed to supply endless meaningful orders. Unspecified joining is not adopted.
- **No uniqueness claim:** physical visual transformations can be designed independently; no claim of being unlike any specific existing game was verified.

The endless direction and visual-language direction pass for exploration. The ongoing pressure economy, final operation vocabulary, and protection against a fully automated universal solution remain pending adversarial review and evidence.

## 2026-09-19 — recommendation between arcade and stage progression

User asks which structure is better: infinite arcade or a level-based game. Independent reviewers `structure_choice_adversary` and `arcade_case_adversary` both recommend **short, open-ended factory stages within continuing progression** as the primary prototype direction. This recommendation does not claim the user has approved implementation or that stages are proven engaging.

- **PASS as direction:** each stage is a visibly finite commission with an objective and action allowance, free thinking, save/pause, free retry after defeat, and progression after success. Players construct solutions within consistent visual transformation rules. Exact objectives, budgets, and scores remain separate decisions.
- **PASS as scope:** no lives, waiting penalties, paid retries, or permanent power grind. The proposal adopts stage progression, not an existing game's interaction or economy.
- **PASS as content ambition:** a continuing series of authored/generated challenges; generator quality and strategic variety require validation. **REJECT:** promises of unlimited meaningful configurations or solutions.
- **REVISE:** making an endless same-factory survival game the primary structure before demonstrating pressure that recurs naturally after successful automation. Free compression preserves capability and can eventually leave only Run presses; arbitrary breakdowns or guaranteed exhaustion do not resolve this.
- **Required failure probes:** stages may repeatedly discard player investment, become single-strategy packing puzzles, or merely rearrange obstacles around the same production chain. Present a completed commission honestly from its start; observe whether players want another. Verify different consequential decisions rather than publishing more cosmetic variants.

The principal rationale: finishing a challenge provides release, and the next challenge can renew construction decisions. This mechanism fits short sessions without requiring one factory to operate indefinitely. Endless same-factory play remains an unresolved alternative; no additional mode was promised. No gameplay code changed.

## 2026-09-19 — five illustrative levels

Reviewer `five_levels_adversary` passed the revised examples strictly as paper prototypes. Neither new materials nor these levels are implemented. Counts illustrate orders; action budgets await simulation and playtesting.

Shared prototype rules: square blanks; punch adds a central hole; cutter clips the top-right corner. Both operations preserve the tile, commute, and repeated identical operations have no additional effect. Machine rotation changes footprint/ports but not the product orientation shown in its preview. Punch uses an L footprint, cutter a T footprint. All tools and belts are selectable. A visible manifest may accept multiple exact product types concurrently; each shipment counts once and only toward an incomplete matching quota. Connected downstream machinery retains priority, with explicit diversion previews. Folding retains the existing graph and behavior, without claiming a universal flexibility sacrifice.

1. **First Delivery:** three punched tiles, open floor, one blank supply. Connection/production tutorial; no deep alternatives claimed.
2. **Loading Bay:** four punched tiles. A narrow inlet prevents a direct punch placement and makes transport useful. Concrete access witness: source at (3,-1) facing south; rows 0 and 1 blocked except column 3; open workshop below. A vertical straight belt at (3,0) feeds an L punch rotated once at (1,2), whose inlet is (3,2). No direct punch fits the inlet. Full new-material simulation remains unimplemented.
3. **Either Way Round:** four punched-and-clipped tiles. Punch then cutter or cutter then punch yields the same product. Work areas explore order/geometry; a final layout must establish which alternatives are useful.
4. **Two Products:** three punched tiles plus three punched-and-clipped tiles. Teaches delivering an intermediate batch before extending production, with exact-match goals and downstream-diversion preview. Intermediate-first likely dominates; do not advertise equally strong alternatives. Folding a single punch preserves its output; folding the combined line seals it.
5. **Tight Workshop:** two sources, constrained work areas, four each of punched, clipped, and combined tiles. Intended experiment compares tool reuse/reconfiguration with dedicated lines. Benefits and costs, including early free folding, are unverified.

Rejected framings: a decorative central pillar is not sufficient routing pressure when outputs ship anywhere; batching is not evidence of balanced strategy choices; the tiny example material vocabulary does not establish endless depth. No runtime changes made.

## 2026-09-19 — implemented five-level PoC and adversarial review

User explicitly requested implementation and an adversarial critique of challenge/engagement. Independent `poc_challenge_adversary` inspected the running simulation, tested concrete layouts, compared winning strategies and reviewed screenshots. **PASS for a forgiving teaching/challenge PoC; no pass for balanced alternatives or sustained engagement.**

- All five named commissions are playable with the visual tile vocabulary, selectable tools, exact concurrent manifests, original graph-preserving folding, paid four-tick actions, undo, save/resume and level progression.
- Approved experimental action budgets: **5 / 7 / 8 / 9 / 13**. Baseline replay costs: **2 / 4 / 4 / 5 / 7**. The adversary found a **6-action** fifth-level solution by constructing ahead during production and then folding to connect the next tool.
- Level 2 direct connection impossibility was exhaustively checked across 288 Punch poses. Both third-level operation orders win in four actions. These facts establish specific functionality, not strategic depth.
- The supposed reuse alternative actually recycles and replaces a Cutter. **REVISE acted on:** rename it rebuild, change Level 5 to neutral mixed-order framing, and explain surplus blockage. Preserve conservation; do not claim two balanced strategies.
- **Screenshot critique acted on:** all board machine/module badges now predict actual buffered/connected output; generic clipped-only artwork no longer contradicts a combined product. Source/coordinate overlap was reduced. Actual input/output and diversion previews remain visible.
- **PASS for first-level tutorial UI:** on the empty first level with Punch selected, the primary invitation opens a free cancellable placement preview; explicit Place · 1 confirms. Normal controls resume afterward. It changes presentation, not the action rules.

See `POC_PLAYTEST.md` for reproducible evidence, remaining risks and human playtest questions. Tool reuse with stale surplus, powerful early folds, small phone ports, and the limited material vocabulary still need observation. No automated check establishes that players find the game compelling.

## 2026-09-19 — commercial structure

Independent agents `commercial_structure_adversary` and `monetization_adversary` reviewed the product and business-model proposals. **PASS as hypotheses:** short open-ended commissions, authored chapter progression, simple navigation, optional completed-factory album without power/currency, completion-primary progress, free opening plus paid collection, and later distinct chapter packs. **PASS as a later experiment:** optional untimed shared daily/weekly puzzle after voluntary returns are established. **REVISE/defer:** cosmetic meta-economy, rewarded cosmetic ads and direct cosmetic monetization without demonstrated attachment. **REJECT:** automatic content scaling via generated variants, efficiency as a compulsory progress gate, and claims of commercial viability from current automated wins. Exact prices, content quantities, metrics thresholds and online services were not selected or implemented. See `COMMERCIAL_DIRECTION.md` for scope, evidence gaps and current source context.

## 2026-09-19 — five additional implemented commissions

Independent reviewer: `new_commissions_adversary`. Scope: authored content experiments using existing transformations, action costs, buffers and folding rules. No claim of measured balance or engagement.

- **PASS:** static preprocessed supplies, provided the actual tile is shown by source labels, help and predictions. Fixed the prior blank-only prediction fallback.
- **PASS:** empty editable starting machines; all start at tick zero with no inventory, progress or emission credit.
- **PASS — L6 Corner Delivery:** elbow routing lesson; enumerate direct processor placements to verify the corner matters. Budget 8.
- **PASS — L7 Keep Some Clipped:** pass through an existing product, then transform it; open board avoids repeating compulsory folding. Budget 9.
- **PASS — L8 Repair Shop:** inspect and reconnect an existing line, framed as repair practice rather than advanced optimization. Budget 9.
- **PASS — L9 Split Deliveries:** choose which preprocessed supply to convert after unchanged shipments; prove both branch witnesses. Budget 12.
- **REVISE, superseded — original L10 Moving Day:** moving a spare tool costs the same as a new tool, so it repeated the earlier fold lesson without meaningful value.
- **PASS — revised L10 One Dock, Three Orders:** one supply must change production between incompatible single-feature outputs. Nested folding frees the dock while preserving work; prove both operation orders. Budget 14.

All budget verdicts apply to forgiving prototype experiments. Free fold relocation may dominate paid movement; alternative witnesses are not evidence of equally competitive strategies. Preserved completed-product surplus can confuse players. See `POC_PLAYTEST.md` for actual replay costs and human playtest questions.

## 2026-09-20 — implemented side-view asteroid experiment

The user requested implementation. Independent reviewer `implementation_design_review` returned individual PASS verdicts for remote exposed-block mining, finite authored terrain, bounded advancing drill/return rail, directed conveyors and ore/plate/part processing, full-state undo with empty-belt editing, persistent guidance milestones, and portrait preview/inspection/camera controls. Initial objections to irreversible belt layouts were resolved by permitting replacement/removal of empty conveyors only.

Scope is one 36 × 12 asteroid, eight-cell shafts, fixed processors, free conveyors and a first-part milestone. No character locomotion, splitting, offline economy or long-term incremental progression is claimed. The tile workshop is retained separately. The exact simulation trajectory earns every construction cost and delivers a part at tick393; human completion time and engagement are unmeasured.

Subsequent narrow PASS amendments cover a bounded full-state Undo history (up to40 edits within2MB), identical empty-belt no-ops, and vertical camera dragging so small screens can reach all terrain rows. The implementation audit identified and verified fixes for save growth, impossible saved inventories and held-pointer cancellation. See [the full independent review](reviews/2026-09-20-implementation-review.md) and [prototype scope/evidence](ASTEROID_PROTOTYPE.md). These verdicts permit this experiment; they do not select permanent product rules.
