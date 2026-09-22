# Independent challenge of proposed factory directions — 2026-09-19

Reviewer: `direction_adversary`, independently delegated by the main reviewer. This review covers proposals D1–D10 and approves experiments only. It does not select a shipping design, claim that players enjoy these mechanics, or authorize runtime changes in this documentation task.

## Evidence and limits

I inspected `AGENTS.md`, the current architecture/playtest/decision documentation, the machine definitions and level definitions, the production reducer, UI controls, board rendering, and winning replay source. The main review separately owns live browser observations and replay execution. I did not conduct a human playtest. Statements below distinguish code facts from failure hypotheses.

Current code facts relevant to this proposal:

- `src/game/content.ts:21–81` defines an 8 × 9 board, buffers of capacity two, two unary processing operations, and two transport pieces. Punch and Cutter set attributes idempotently; there is no assembly of two different inputs in the active tool set.
- `src/game/simulation.ts:262–270` ships exact requested products only from outputs without a downstream edge. Completed quotas do not consume surplus. The rebuild witness in `tools/replay.ts:60–67` explicitly recycles a Cutter whose completed-product contents obstruct repurposing.
- `src/game/simulation.ts:367–384` makes folding/relocation free while every paid command advances four ticks. `src/ui/App.ts:341–342` exposes Run as a paid action. This rewards combining construction with clock advancement, which differs from improving a factory's sustained capacity.
- The existing documentation openly identifies early-fold dominance, surplus traps, and unproven replay motivation. Earlier PASS verdicts concern solvability, teaching, or bounded experiments; they are not evidence that the present direction satisfies the user's renewed brief.

The central objection: changing tiles into cars while retaining the same action-clock, exact-quota and batching loop could produce a prettier version of the same unsatisfying game. The proposals have value insofar as they test actual changes in production, routing, and what the player tries to improve.

## Explicit decision verdicts

### D1 — Tangible assembly and a visible delivery exit: PASS

**Approved scope:** a comparative toy-factory visual/mechanical prototype. Recognizable intermediates and finished products, actual simulated production, and celebration proportional to deliveries are appropriate experimental constraints. Toy vehicles are a test subject, not a release theme commitment.

**Strongest attack:** animation can make a fixed recipe appear richer than it is. A long press/assembly performance can also hide item ownership and delay diagnosis. If a vehicle seems to acquire wheels while the wheel feeder is disconnected, the entire factory explanation becomes unreliable.

**Dominant-strategy risk:** put the one correct chain down once; watch an attractive screensaver forever. Tangibility improves comprehension but does not create competing layouts.

**Mobile cost:** wheels and bodies must remain distinguishable at the actual smallest phone size; satisfying close-ups are not evidence that the whole factory reads. Large exit spectacle must not cover the next decision.

**Evidence needed:** silent viewers identify the consumed inputs and actual finished output; disconnecting each feed prevents the relevant assembly; output feedback matches event counts; players can explain a second useful improvement after the reveal.

### D2 — Continuous observation with explicit paused editing: PASS

**Approved scope:** one experimental clock model with automatic foreground production, clearly indicated paused selection/editing, resume on commit/cancel, explicit pause, and no background/offline production or deadlines. The existing action-clock game remains an experimental comparator.

**Strongest attack:** if every tap freezes a busy scene, animation may feel discontinuous. Players may mistake a selection pause for starvation. If the fastest strategy is to repeatedly resume for tiny intervals and intervene, this becomes manual dispatch.

**Dominant-strategy risk:** optimal play is pause forever, build the known solution, then passively wait. Removing reflex pressure is appropriate; it does not guarantee interesting planning.

**Mobile cost:** pause state must be visible without consuming a large share of the playfield. Inspection should not silently switch production state in a way a returning player cannot infer.

**Evidence needed:** unaided players predict when the factory is paused; the next item movement is explained by their committed change; fastest passing layouts do not require timed intervention; menu/background transitions preserve state. Whether pause-on-selection is preferable to a separate edit mode remains a later interaction question.

### D3 — Finite floor/inventory and sustained throughput replace move limits: PASS after revision

**Initial proposal:** no consumable moves; reversible rearrangement; visible floor and finite inventory; success means sustained requested throughput after settling, including blocked/interrupted flow.

**Blocking ambiguity:** a finite output sample is not necessarily sustainable throughput. A player can stockpile components, drain them during the scored interval, and pass a rate the sources cannot maintain. Rearranging buffered machines can teleport inventory into the scored route. A vague settling period does not rule this out.

**Required revision:** define a fair trial or validation method that distinguishes ongoing source-supported output from banked bursts; make measurement restart/invalidity after edits explicit; show the rate and observation state to players. State whether test trials use a standard starting inventory and whether they preserve the ordinary factory state. Include adversarial checks against later starvation and blocked branches. The authoring harness may establish sustained feasibility; the player should not need to understand that harness.

**First revision and historical verdict:** **PASS for the bounded prototype specification**, with its Test/Resume wording subsequently superseded by D3b below. The author initially supplied an explicit fair trial: Test/Resume starts the chosen layout with empty inventory and fixed source phase, independently of previously banked work. Pausing/cancelling ends and invalidates that trial and returns to editable layout; there is no penalty. Only small deterministic acyclic networks within the verified scope are eligible. Automated analysis includes all bounded operational state, router/source phases and backpressure, excludes cumulative shipment counters, and establishes source/capacity support plus adequate per-destination production over the recurrent state cycle. Transient bursts and total quotas cannot satisfy that test. The opening repair is judged on causal comprehension rather than mastery. Players see target and actual flow, with the exact check inspectable.

This resolves the stockpile exploit at the stated tiny-network scope. It does not approve a generic throughput verifier or make long trial cycles acceptable. A long wait or an opaque rates problem means this experiment fails usability; the response must not be to add more explanatory text. The trial reset is a real presentation risk: a player who sees accumulated work disappear may feel the simulation is arbitrary. Its behavior must be observed directly, and no persistent inventory/economy is implied.

**Additional attack:** without moves or money, the strongest possible layout may always be best and free experimentation may collapse into exhaustive placement. Finite inventory must create an actual allocation conflict, not merely count the required recipe pieces.

**Mobile cost:** throughput units, warm-up and two simultaneous goals can be more abstract than a visible delivery target. Observe whether players chase a numeric meter without understanding the queue.

**Evidence needed:** a known inadequate layout never passes just by waiting or stockpiling; an adequate layout passes without timed touches; at least two routes have a demonstrable allocation tradeoff; trial/reset behavior is understandable.

### D3b — Preserve ordinary production; check a separate fresh trial: PASS

**Review date:** 2026-09-20. A consolidated review correctly identified a contradiction in D3's earlier Test/Resume language: D9's opening shows queued parts flowing after a repair, but restarting with empty buffers would erase that queue. The revised distinction below supersedes the earlier conflation of ordinary Resume with a fresh throughput trial. The original concern and revision history remain recorded.

**Approved scope:** the same bounded prototype, with two explicit operations. Ordinary practice resumes its preserved physical inventory after paused edits, as in D2. The one-feed opening repair is unscored practice, so it may truthfully drain an existing backlog without claiming sustained-rate mastery. Hoarded practice output earns no later throughput completion credit.

The later depth task introduces a separate **Check design** action. It evaluates a clone of the selected layout from empty inventory and a fixed source phase. The real paused practice snapshot stays unchanged; the trial never silently clears its inventory or copies test inventory into it. The fresh check is explicitly labelled and locks editing. Cancel returns to the unchanged paused practice snapshot. Any committed layout or allocation edit invalidates the prior measurement; another explicit Check design is needed to assess the changed layout. The opening does not expose this check. The small-network recurrent-state proof remains an internal validation guardrail, not the player's task.

**Verdict rationale:** **PASS for this experimental specification.** This resolves both the visual continuity contradiction and the banked-output exploit without silently changing the meaning of ordinary Resume. It is specific enough to build and falsify. It is not evidence that two modes are a good permanent mobile interaction.

**Strongest attack:** players may understand the practice factory but experience Check design as an exam in an apparently different factory. A successful backlog release can be followed by a failing empty-start check; without causal understanding that feels arbitrary. Repeatedly stopping, checking, cancelling and restarting could consume more attention than making toys. A screenshot or clip containing only practice must not imply it shows verified sustainable performance.

**Dominant-strategy risk:** moving loaded machines can still create attractive bursts in practice. The fresh clone prevents those bursts from passing the goal, but it does not make practice behavior irrelevant or prove the scored loop fun. Stockpiling must not leak into check state, and no previous passing result may survive a changed layout.

**Mobile cost and falsifiers:** players must distinguish practice from check without a long explanation, predict whether their real queue is preserved, and understand why transient practice output can differ from the check. If they repeatedly mistake trial state for lost inventory, cannot identify which factory they are viewing, need several checks to discover hidden goal rules, or spend substantial play time waiting for checks, revise or reject this interaction experiment. Do not solve those failures by adding more rate labels or more tutorial paragraphs.

**Evidence needed:** verify clone isolation before, during and after cancelled/completed checks; test a hoarded-output layout that looks productive but has inadequate source supply; ensure edits invalidate its old result; observe unaided predictions about queue preservation and check outcome. Report extra interaction and waiting time separately from actual construction time. These are measurements of the approved experiment, not conditional approval for a permanent design.

### D4 — A partially working factory with one opening bottleneck: PASS

**Approved scope:** one onboarding vignette with one readable fault and an actual change visible within ten seconds, followed by fresh construction and repairs with at least two plausible choices. This is not approval for a campaign made entirely of highlighted gaps.

**Strongest attack:** fixing a conspicuous missing connector can sell agency the rest of the game lacks. Alternatively, two plausible repairs may be cosmetically different ways of making the same connection.

**Dominant-strategy risk:** follow the only empty socket; later copy the tutorial topology. The next tasks must expose this, rather than infer depth from a tutorial completion rate.

**Mobile cost:** bodies, queues and possible intervention points compete for attention. A pointing arrow may conceal unreadability rather than teach causality.

**Evidence needed:** after the initial repair, remove solution guidance and ask what is blocked and what they would change. Observe unaided construction on a new layout and the reasons players choose between repairs. Ten seconds is a hypothesis to measure at actual rates.

### D5 — Compare shaped machines against simple rectangles: PASS

**Approved scope:** matched-role/rate prototypes with explicit ports and reported geometry differences. This does not assume that every difference is caused only by shape, and it does not preserve tetrominoes by default.

**Strongest attack:** port placement can secretly decide the entire result. If rectangles have easier endpoints or more effective free area, the experiment may compare two difficulty levels. Conversely, a contrived board can force interlocking without making it enjoyable.

**Dominant-strategy risk:** always rotate each shape to the same orientation along the same source-to-exit chain; then the tetromino outline adds gestures without adding decisions.

**Mobile cost:** irregular footprints create occlusion, rotation and anchor-location errors. Rectangles still have size/rotation costs; simplifying shape is not proof of simple input.

**Evidence needed:** compare port topology, occupied/free area, legal alternatives, errors and recovery effort explicitly. Ask players to identify a useful packing choice. Retain shapes only when the observed benefit exceeds their manipulation cost; removing them is an allowed outcome.

### D6 — Disable folding in the core prototype: PASS

**Approved scope:** a separate experiment that keeps the growing working factory visible and tests routing without free compression/relocation. The current implementation stays intact. No replacement fold rule is approved.

**Strongest attack:** removing folding may remove the one visually unusual moment and expose an ordinary small conveyor puzzle. Large visible layouts can exceed phone readability sooner.

**Dominant-strategy risk:** with too little floor, the experiment becomes an exact packing answer; with too much, place every machine at maximum capacity without tradeoffs.

**Mobile cost:** more visible machines compete with product readability. A one-screen prototype needs a small, controlled vocabulary rather than unlimited growth.

**Evidence needed:** real routing/allocation decisions exist without folding; players can follow flow across the complete board; floor pressure does not force a single brittle construction. Do not add compression back merely to make a crowded screenshot fit.

### D7 — Two-input assembly and competition for limited feeds: PASS after revision

**Initial proposal:** after the opening hook, use one explicit two-input recipe and controllable branching between competing destinations, with limited feeds, floor and machine stock. Cap the experiment at three machine roles and two finished products.

**Blocking ambiguity:** controllable branching has no automatic policy yet. If the player must tap between consumers to meet their needs, the efficient strategy may be repeated manual dispatch. If delivery goals are sequential totals, making one full batch then switching to the other recreates the current scheduling problem. A splitter label alone does not resolve this.

**Required revision:** specify the branch's automatic behavior once production resumes, what happens when a destination blocks, and how the player edits the policy. Test simultaneous demands or another explicit conflict that cannot be solved by batching to finite quotas. Clarify whether transport/splitting counts within the three-role scope.

**Revised proposal and verdict:** **PASS for the bounded prototype specification.** The author selected weighted cyclic routing at 1:1 or 2:1, chosen while paused. It never skips a blocked destination; its cursor advances only after a successful transfer. An unavailable scheduled destination visibly holds the material and stalls its upstream feed. Editing policy invalidates prior measurement; another explicit Check design starts the standardized D3b trial. The two simultaneous consumers are the body-and-wheel car assembler and a physical spare-wheel shipment destination. Packaging at the exit visualizes delivery and adds neither an extra processing role nor free production. The three machine roles are body press, assembler and router; belts are transport. The experiment includes rate scenarios favouring each setting, tries to transplant a universal design, and verifies no duplicated routing or hidden buffer disappearance.

The initial two-input visual does not require the player to design both feeds immediately: the introductory repair has a working body feed and one missing wheel connection. Later tasks transfer responsibility for both feeds and shared allocation to the player. This is coherent with D4/D9 and does not pretend assembly is a unary operation.

**Specific rejection trigger for this router:** if players cannot explain why a full spare-wheel destination stops wheel delivery to the car assembler, or repeatedly attempt timed switching to bypass it, literal weighted routing has failed the mobile comprehension experiment. Do not call that confusion depth, and do not add this rule permanently on the strength of this PASS. The fixed policy has been made explicit so that the experiment can actually disprove it.

**Additional attack:** 'always give the scarce part to the more valuable product' can be a universal answer. Demand and resource constraints must support a meaningful allocation decision. Extra inputs alone make diagnosis harder without necessarily creating depth.

**Mobile cost:** players must see which input starves which assembler without opening several inspectors. A row of small ratio buttons could turn a tactile factory into a settings panel.

**Evidence needed:** automatic unattended operation meets both intended demands; all manual-toggle strategies are unnecessary for success; blocked-branch behavior matches visible feedback; a moved or reallocated machine changes a visible bottleneck for an understandable reason.

### D8 — Compare three jobs in one factory with three standalone boards: PASS

**Approved scope:** a three-job comparison with upfront goals, no time penalties, saved checkpoints and optional chapter-start replay. No persistent economy, endless campaign, blueprint system, unlock schedule, or commercial retention claim is approved.

**Strongest attack:** persistence can preserve a mistake rather than investment. Known upfront jobs may allow a universal layout that solves every stage without changes, while unknown jobs would punish planning. Neither structure is inherently correct.

**Dominant-strategy risk:** build the chapter's largest solution immediately, then wait through all three jobs. In the standalone version, repeatedly rebuild the same line from memory. Both are falsifiers for the selected task set.

**Mobile cost:** resuming a saved busy factory requires reconstructing its purpose. Standalone boards carry repeated setup taps. Count these separately from consequential decisions.

**Evidence needed:** actual edits across jobs, amount of preserved useful work, teardown effort, time to reorient after a break, voluntary replay and reasons for that replay. The experiment must be allowed to conclude that three jobs are not distinct enough to decide the structure.

### D9 — A truthful ten-second repair clip and thirty-second allocation extension: PASS

**Approved scope:** record an actual player action reconnecting assembly and genuine deliveries, followed by a competing destination and measurable response to a branch change. In the clarified opening, the body feed already reaches a transparent assembler; the player supplies missing wheels, and a modest handful of actual finished vehicles exits. Timing is a hypothesis and can fail. No fake congestion, manual-production multiplier, or accelerated result presented as ordinary gameplay is approved.

**Strongest attack:** a clip can achieve immediate comprehensibility while advertising a solved one-gap toy. The thirty-second extension must reveal a decision, not only more vehicles or a new camera angle. A queued backlog can also exaggerate sustainable improvement; disclose/measure the transient burst.

**Dominant-strategy risk:** the best-looking edit is always the obvious missing connector. The clip should not imply open-ended layout depth that the playable task does not possess.

**Mobile cost:** a giant close-up can be legible while the shipped full board is not. Test the actual phone framing and a silent presentation.

**Evidence needed:** uncut simulation events substantiate before/after output; naive viewers identify the action and consequence; they can name a next action; separate desire to play from understanding what occurred.

### D10 — Measure comprehension, agency and voluntary return separately: PASS

**Approved scope:** small exploratory silent-clip and unaided-phone tests, voluntary second layouts/later return, and attacks on copyable universal layouts and idle-wait exploits. Proposed numeric gates are local decision rules, not industry benchmarks or statistical proof.

**Strongest attack:** participants may say they understand to be polite, keep playing because the researcher is watching, or return to resolve confusion. Enthusiastic factory-game experts can hide poor mass-mobile readability.

**Dominant-strategy risk:** a player copies the demonstrator's solution and reports mastery. Ask for predictions and observe a changed board; do not reward agreement with the intended explanation.

**Mobile cost:** all manipulation and reading must happen on actual phone-sized targets, not a large desktop presentation.

**Evidence needed:** record wrong predictions, unaided actions, stated reasons for replay/abandonment, distinct layouts and elapsed real play. Use findings to decide the next experiment. Do not market an exploratory sample as retention, profitability, or proof of long-term fun.

## What would invalidate the entire direction

Final verdicts: **D1 PASS; D2 PASS; D3 PASS after revision; D3b PASS; D4 PASS; D5 PASS; D6 PASS; D7 PASS after revision; D8 PASS; D9 PASS; D10 PASS.** D3 and D7 initially received REVISE; the exact corrective specifications above were resubmitted by the author and independently accepted. D3b, reviewed on 2026-09-20, supersedes D3's conflation of ordinary Resume and fresh checking. All verdicts permit the stated experiments to be proposed; none permits assuming a successful result or shipping the package. Evidence requests above are measurements for those experiments, not concealed conditions that must be satisfied before starting them.

Even with these scoped approvals, reject the package as a product direction if the only satisfaction is an attractive output animation; if the player cannot infer causes of starvation; if one maximum-capacity chain solves every task; if later jobs require repetitive teardown without a new decision; or if the visually clear mobile board cannot contain enough interacting choices. None of those failures is repaired by more levels, rewards, or an idle income counter.

The most credible route to long-term decisions in this package is allocation of scarce production capacity under spatial constraints. That remains an untested hypothesis. The most credible short-form payoff is a visibly repaired flow producing a recognizable object. That is a communication hypothesis, not evidence of a durable game.
