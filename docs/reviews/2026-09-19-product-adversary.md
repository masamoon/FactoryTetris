# Independent product adversary — 2026-09-19

Reviewer: `product_adversary`. Scope: the current Gridforge product loop, return motivation, and fit with the user's factory-first, immediately legible mobile brief. This review does not adopt or implement a redesign. Gameplay proposals need individual scoped verdicts before adoption.

## Verdict on the current direction

**REVISE as the product hypothesis.** The implementation is a coherent small programming/construction puzzle. Its present rewards do not yet make a strong case for the experience the user wants: build something, see it work for you, discover a limitation, and improve the system. Here, the player assembles a very short batch program, repeatedly advances it, and finishes just as a working factory emerges. The rules are internally serious; the visible result is modest.

This is a mismatch claim, not a measured verdict that players find the game boring. No human comprehension, voluntary replay, retention, purchase, or acquisition results were available. Historical PASS decisions are scoped experiments, not evidence that the format has earned continuation.

## Evidence inspected

- `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/POC_PLAYTEST.md`, `docs/DESIGN_AND_VALIDATION.md`, `docs/GAMEPLAY_DECISIONS.md`, and `docs/COMMERCIAL_DIRECTION.md`.
- Actual tool definitions, sources, layouts and quotas in `src/game/content.ts`; production, folding and reducer rules in `src/game/simulation.ts`; input/result flow in `src/ui/App.ts`; rendering and event animation in `src/view/BoardScene.ts`.
- All ten standard replays and all five named alternatives, executed through the real reducer with `node --import tsx tools/replay.ts`. The npm/tsx CLI initially failed on sandbox IPC permission; using Node's loader ran the same replay file successfully.
- Replay counts computed from `winningReplay` command arrays. These are known witnesses, not optimality proofs or observed player sessions.
- Actual phone captures from the parallel gameplay review: `evidence/opening-390.png`, `evidence/opening-360.png`, `evidence/level-5-flow.png`, `evidence/level-5-complete.png`, `evidence/level-10-flow.png`, and `evidence/level-10-complete.png`, visually inspected after capture. No inference about animation timing is drawn from still images.

| Level | Paid actions | Explicit Run actions | Place/move/recycle actions | Free folds | Visible machines/modules at win |
| ----- | -----------: | -------------------: | -------------------------: | ---------: | ------------------------------: |
| 1     |            2 |                    1 |                          1 |          0 |                               1 |
| 2     |            4 |                    2 |                          2 |          0 |                               2 |
| 3     |            4 |                    2 |                          2 |          0 |                               2 |
| 4     |            5 |                    3 |                          2 |          1 |                               2 |
| 5     |            7 |                    4 |                          3 |          1 |                               3 |
| 6     |            4 |                    2 |                          2 |          0 |                               2 |
| 7     |            4 |                    2 |                          2 |          0 |                               2 |
| 8     |            4 |                    2 |                          2 |          0 |                               2 |
| 9     |            6 |                    3 |                          3 |          0 |                               3 |
| 10    |            7 |                    4 |                          3 |          2 |                               2 |

Across these ten witnesses, **25 of 47 paid actions are Run**. The final visible factory has one to three machines/modules. The early-fold Level 5 witness wins in six actions instead of seven; its rebuild alternative uses ten. Reversing operation order in Levels 3 and 10, or choosing the other processing branch in Level 9, preserves the witness's action cost. Equal costs prove neither equal strategic value nor meaningful tradeoffs.

### Phone evidence

The opening capture is a clear, orderly interface with a dominant empty 72-cell floor, one small source, a product quota, and a large action counter. The selected tool's preview equation is legible below the board, but there is no working process on the floor to demonstrate the fantasy. The Level 5 flow capture shows one Punch and a small output ring; most of the board is empty or blocked, and the three product quotas remain in the header. The completed Level 10 floor contains a Cutter near the supply and one detached folded module low on the board. The last commission's visual culmination is therefore sparse machinery and completed checkmarks, not a dense working system. These are observations of the supplied states, not claims that every possible player layout is sparse.

The product silhouettes are distinguishable when studied at full size. Their distinction is a small hole versus a missing corner, however, while the much larger machine silhouettes communicate placement. A quickly viewed clip therefore asks attention to switch among footprint, tiny product state, and distant quota. The UI can be technically readable and still fail to make the manufacturing payoff salient. This is a design inference requiring a silent-clip test, not an accessibility failure proved by the screenshots.

At 360 × 640, the opening controls and quota remain visible; the board's cells and small source shrink noticeably. This supports the existing layout claim, but increases the burden on tiny arrows and product features. The Level 5 completion capture shows two separated lines, three machine/module objects, and completed checkmarks. It is recognisably more developed than the opening, but still does not show a substantial accumulation of output. The Level 10 flow capture shows the same single-Punch production vocabulary under a larger three-order header. A later level's higher conceptual complexity has not yet produced a proportionally richer visual promise.

## Highest-risk failure cases

### 1. Automation exists in the simulation but is weak as the experienced reward

**Observed:** a paid command advances exactly four ticks; nothing produces while the player looks at or thinks about the board (`simulation.ts:382`). Each paid animation resolves in 850 ms (`BoardScene.ts:427`). Once all orders are filled, simulation stops, the results modal opens, and the next level starts with a new factory (`App.ts:217`, `content.ts:273`). Explicit Run commands are more than half of the standard witnesses' paid actions.

**Adversarial case:** a player places a valid line, expects it to keep working, watches it stop, and learns to pay actions to restart it. The emotionally salient action becomes advancing a batch rather than delegating labor to a system. An experienced player can optimize construction timing, but that subtle scheduling gain is hard to show without explanation in a silent clip.

**Strongest defense:** a paused, deterministic factory can be a good puzzle. It permits thought and mobile interruption without reflex pressure. Turn-based production is not inherently non-automation. The evidence problem is that the present sequence does not demonstrate a compelling repeated payoff after construction.

**Evidence needed:** unaided players describing what the factory is doing; spontaneous desire to watch or improve a running line; whether a player regards Run as a deliberate production-planning decision or a continue button. More particle effects alone would not settle this.

### 2. The payoff is detached from a concrete destination

**Observed:** exact requested products ship automatically from any unconnected output. Shipping updates quota values and emits a ring at the machine output. There is no routed destination in the board rules; manufacturing is represented by product icons, brief flow sprites, and work rings (`simulation.ts:262`, `BoardScene.ts:364–393`).

**Adversarial case:** an unfamiliar viewer sees pastel pieces and small counters changing, but cannot say what is being made, where it goes, or why the change is desirable. “Three tiles with a hole” is mechanically precise, but carries little intrinsic fantasy. A viewer can understand a hole without wanting to manufacture one.

**Strongest defense:** exact silhouettes are a compact, consistent visual language. They avoid memorized industrial recipe trees. This is a valuable teaching property and should be judged separately from the product's appeal.

**Evidence needed:** stop a silent clip after ten seconds and ask viewers to identify the material, transformation, intended result, and the action that caused it. Recognition of the word Punch is weaker evidence than recognition of the causal process.

### 3. The strongest visible reward shrinks the factory

**Observed:** an eligible upstream graph collapses into one cell, retaining simulation internals; single machines may fold, and folding also relocates them for no paid action. Eligibility requires three emitted products. The animation consists of squares converging on the module. Internal flow whose visible endpoints coincide is suppressed (`previewFold`, `foldedMachine`, `BoardScene.ts:365–367`).

**Adversarial case:** the player finally builds a visible working line, receives an opportunity to improve, and improvement hides it. The clip gets a satisfying compression beat but less visible automation afterward. On a tight floor, “fold when available” may become an instruction rather than a choice. Free relocation also bypasses some of the spatial costs that shaped pieces are supposed to make interesting.

**Strongest defense:** compression is distinctive, understandable in silhouette, and potentially expressive: a complex machine becomes reusable infrastructure. The implementation's exact preservation is unusually sound. This defense is about potential; current witnesses do not establish a reusable-factory economy or a reason to retain expanded machinery.

**Evidence needed:** situations where keeping a graph expanded is rational, and players choosing differently for comprehensible reasons; evidence that players still understand and value their factory after compression. An animation preference alone cannot approve folding as a central mechanic.

### 4. More production can be punished by an opaque surplus trap

**Observed:** quota-complete products remain in bounded buffers. A moved or folded machine preserves them. A connected downstream consumer takes priority over direct shipment. Documentation explicitly withdrew a purported reuse strategy because it actually needed recycling and rebuilding.

**Adversarial case:** a player reasonably reuses an existing cutter for a new job, but old exact-output surplus prevents that job from proceeding. The simulation is correct; the player's conceptual model (“the same cutter still cuts”) is punished. Explanatory text makes the rule knowable but does not make the consequence enjoyable. More “help” could make a simple-looking game feel like operating a stateful debugger.

**Strongest defense:** preserved material and backpressure are real factory properties, and avoiding magical deletion protects system trust. Deliberate batch scheduling can make this a good optimization puzzle. The risk is mismatch between an inviting visual toy and the hidden state needed to use it.

**Evidence needed:** observe an unaided first recovery after a completed quota; count whether players diagnose through visible flow or repeatedly open inspectors. Separate confusion-driven retries from intentional experimentation.

### 5. The operation vocabulary limits decision growth

**Observed:** Punch and Cutter each add one permanent binary feature. They commute and are idempotent; neither consumes a distinct ingredient, competes for power, splits throughput, or creates another useful byproduct. Belts only transport. Quotas, entry points, blockers, fixed ports, buffers, and free compression supply most of the variation.

**Adversarial case:** after learning “complete the single-feature batch, then extend the line,” the player reuses a small library of solutions. A new blocked floor mostly changes where to put them. Current Level 9 gives an actual choice of branch, but two ways to achieve the same cost do not by themselves create a reason to replay. New quantities may mostly add Run actions.

**Strongest defense:** a small vocabulary is excellent for learning and can support deep spatial puzzles. The loading-bay and corner levels have concrete transport necessities. Level 5 demonstrates a real scheduling improvement. The critique is not that small systems cannot be deep; it is that the evidence here establishes introductory lessons, not a sustainable catalogue.

**Evidence needed:** attack new levels by transplanting solved line patterns and early folds. Document decisions that genuinely change rather than counting visual maps. Ask returning players what they intend to do differently before starting a replay.

### 6. Shaped machines impose several kinds of friction at once

**Observed:** tool type fixes both footprint and ports; rotation changes both, but not product orientation. The machine's written name is its primary visual identity (`BoardScene.ts:255`). Positioning requires selecting a tool, previewing, sometimes rotating, then confirming. There is no falling piece queue, row clear, or other Tetris loop.

**Adversarial case:** a player expects an L-shaped object to behave like a belt/path but discovers that its shape is occupancy plus a remote input/output relationship. They rotate for fit and break a port, or rotate expecting the clipped corner of the product to turn. The visual language offers familiarity while carrying a different contract.

**Strongest defense:** shape plus directional connection creates compact spatial choices without tiny freeform wires. A fixed machine footprint can teach recognisable affordances. Confirmation protects against thumb errors and should not be equated with bad UX just because it adds a tap.

**Evidence needed:** compare the contribution of shape to interesting choices against its contribution to alignment errors and explanation. Removing shapes could remove differentiation and collapse the solution space; retaining every tetromino constraint could preserve complexity with insufficient payoff. Neither change is approved by this critique.

## Opening and long-term product attack

The current opening is defensible as a tutorial and weak as a pitch. One machine on a mostly empty grid produces three abstract products, with a paid Run step before completion. A literal clip can show successful connection, small material sprites, and a counter completing. It cannot truthfully show an ongoing multi-stage production spectacle because the first commission does not contain one. Its weak appeal is not established to be an art-quality problem.

The best present clip candidate is likely a later fold/reconfigure sequence: the player completes a batch, compresses a line, reconnects it, and produces a different tile. That is more distinctive, but the viewer needs to understand quotas, eligibility, preserved internals, and exact silhouettes to appreciate why the change is clever. A ten-second ad can show an unexplained magic compression; that may attract the wrong expectation.

For repeat play, there is no visible lasting productive asset beyond the current save. Completion checkmarks preserve progress; they do not preserve the factory. The design may suit players wanting isolated construction puzzles. It may disappoint players drawn by automation, ownership, or “what could I make this do next?” A completion album is not evidence that this disappointment is resolved.

Conversely, persistence is not an automatic solution. With the present vocabulary and an eventual stable optimal layout, a permanent factory would run out of consequential edits. Endless quotas could turn into waiting; expansion could make the phone require camera management; compulsory retooling could erase attachment; routine repairs could become chores. Any persistent proposal must explain what decisions return after the player has a functional factory, without forcing pointless rebuilding or obsoleting it on schedule.

Authored levels make lessons controllable and give a clear stopping point. They also put the cost of continuing fun on authors: each level needs a new consequential situation, a genuine replay, bypass attacks, recovery checks, and phone comprehension testing. Existing ten-level solvability is inexpensive compared with proving fifty meaningfully different enjoyable puzzles. Generation is an authoring aid only until evidence shows it creates choices at acceptable review cost.

## Challenge to the inherited commercial conclusion

`COMMERCIAL_DIRECTION.md` correctly labels paid-unlock campaign design a hypothesis. It should remain a hypothesis, not a protected requirement or the default downstream implementation. Its rationale is coherence and validation cost, not demonstrated appeal, purchase conversion, or acquisition efficiency. A clear paid model cannot rescue a core loop players do not voluntarily want again.

The requested silent 10–30-second appeal also does not imply an ad-funded hypercasual product. A satisfying short causal demonstration could serve several audiences and business models. The production fantasy, moment-to-moment agency, repeat-return loop, authoring cost, and commercial structure need separate evidence. A high-performing clip would not establish that the installed game delivers the same reward over time.

**REJECT as an inference:** earlier scoped commercial PASS means the premium authored campaign is now settled. **REJECT as an inference:** mobile-ad-like spectacle means idle number growth, paid retries, or a particular monetization model is required. These are limits on claims, not new gameplay decisions.

## What should survive the critique

The determinism, exact save/resume, previews, undo, predictable transformations, bounded board, and real replay tooling make experimentation unusually cheap. A two-operation language is useful for isolating whether changing the experience produces improvement. None of that requires treating the current action budget, quota semantics, folding, shape system, or level resets as untouchable.

The game's strongest potential distinction is **small construction decisions visibly changing a production system**. The current design already has honest automation and causal rules. The next evidence should show that people can see the consequence, want the output, and want to make another consequential change. More levels would currently multiply an unresolved assumption.

## Open questions for the next decision slate

1. What does a player want to make, and can its manufacture be understood without reading?
2. Is the pleasurable interaction fitting machines, repairing a line, redirecting flow, balancing production, or watching the consequences? Which can sustain more than a tutorial?
3. Does production feel delegated after construction, or does the player feel responsible for repeatedly advancing it?
4. Which limitation invites a different next decision instead of a compulsory upgrade or rote reset?
5. Do players want to keep the factory or enjoy beginning a fresh constrained problem? The answer may differ between audiences.
6. Does folding earn its explanatory and visibility costs? Does shape earn its alignment costs?
7. What strategy-transplant attack defeats the proposed long-term structure?
8. What precisely would falsify a candidate after a small experiment? All chosen numeric cutoffs must be provisional decision rules, never industry benchmarks or measured results.

No runtime files were modified. Independent proposal verdicts follow with explicit scope.

## Independent verdicts on product recommendation slate

The parent reviewer submitted R1–R3 after this current-game audit. The following are **unconditional PASS verdicts for the stated experiment/review scope only**. They are not conditional approval of implementation, not selection of the final product direction, and not claims about enjoyment or retention. Detailed mechanics D1–D10 receive a separate independent review; this product-level review cannot overrule any REVISE or REJECT there.

### R1 — Build the first experiment around a small, visible toy factory

**Submitted:** actual body-and-wheel assembly with toys visibly rolling out; automatic continuous production with free paused editing; floor and machine-stock constraints replacing a move budget; a repaired bottleneck hook followed by fresh construction and competing simultaneous outputs; shaped-versus-rectangular-machine comparison; folding disabled within this experiment.

**Verdict: PASS as the first bounded product prototype to test.** It attacks the observed mismatch directly: the output has a recognisable purpose, multiple ingredients must be coordinated, the player's modification can cause a visible productive consequence, and automatic production can be experienced after input stops. Keeping a fresh-build task after the repair prevents the proposal from relying entirely on an obvious missing-piece trick. The experiment deliberately does not preserve every existing rule, so it can test a coherent alternative experience rather than assuming the current format only needs polish.

**Concrete ways this can fail:**

- The factory starts broken in an obvious place; the player snaps in the only plausible part; toys emerge; the next three minutes contain no decision. This is a good demonstration and a weak game.
- Body and wheel rates are constant and only one economical arrangement works. Every job becomes the same ratio with more demand. “Competing outputs” may add quota juggling without making a different production topology desirable.
- A player builds one universally useful layout, pauses whenever anything changes, and swaps the same limited machines between positions. Pausing removes reflex pressure but does not create choices. Scarce stock can become the old action-budget frustration in another form if it merely prevents experiments.
- Too many physical items obscure the lanes and joins on a phone. Four tiny wheels assembling a tiny car might be less legible than two abstract tiles. The concrete fantasy earns nothing if the assembly action cannot be seen.
- Continuous production becomes noisy wallpaper; player success reduces interaction to waiting. A rate increase is visible but not inherently interesting over repeated play.
- The toy theme supplies charm but the build interaction feels identical to familiar conveyor puzzles. Theme alone is not differentiation. The potential distinction is a compact, manipulable factory whose small arrangement changes matter immediately; that remains an untested claim.

**Dominance and comparison attacks:** try one layout across all fresh-build and simultaneous-output tasks; try maximum straight-through throughput with only temporary swaps; deliberately build too much of one ingredient and observe whether recovery is clear. Compare shapes and rectangles without interpreting a change in rates, ports, total usable area, or stock as evidence about shape alone. A useful coherent-variant comparison can change several things, but it should then be reported as a comparison of variants, not a causal proof that tetrominoes help or hurt.

**Evidence that matters:** viewers can identify the action, assembly, and changed outcome in the silent hook; players can subsequently create a line without a pre-solved scene; their next modification changes a real constraint; at least some can explain a different plan and choose to try it. No acceptance threshold or user result is asserted here. Failure is informative: if repair is attractive but construction is not, do not treat clip success as approval of the construction game.

### R2 — Compare three jobs on one preserved board with three comparable standalone boards

**Verdict: PASS as a bounded structure experiment.** Current evidence cannot choose a permanent board or campaign. Holding a small job set approximately comparable while changing whether the factory carries forward is a focused way to observe attachment, reuse, reset frustration, and stale-layout behavior.

**Concrete ways this can fail:**

- The preserved-board version wins because the later jobs are mostly already solved, creating less work rather than more interesting attachment.
- The standalone version wins because repeating the same introductory build is shorter than diagnosing inherited buffers. This does not prove players prefer resets; it may expose poor state legibility.
- The same people see identical jobs twice and benefit from solution memory. Order effects get mistaken for format preference.
- Later jobs force demolition of the first job's line. “Persistence” becomes compulsory reconstruction without the clarity of a fresh board.
- A preserved factory has a single stable optimum; job three is merely collecting another quantity. Short-session preference then overstates repeat-return potential.
- Standalone levels need different maps to remain interesting, but “equivalence” ignores that authoring cost. A comparison of three curated boards does not establish an affordable campaign.

**Evidence that matters:** what players voluntarily preserve, reuse, improve, and tear down; whether they can name the next decision; whether restarting feels like relief or loss; mistakes caused by inherited state; whether one layout survives every job without consequential change. Record order/learning effects and what differs between versions. Three jobs support local structure selection for further experimentation, never a retention conclusion.

### R3 — Defer long-run progression and monetization selection; do not equate a good clip/first session with retention

**Verdict: PASS as a product decision boundary.** Neither authored campaign nor persistence has earned a permanent commitment. It is sensible to investigate immediate causal appeal and meaningful follow-up choices before choosing a progression economy or business model. This does not imply that long-term requirements can be ignored: candidates must expose plausible continuing decisions early enough to reject a beautiful dead end.

**Concrete failure case:** a team gets strong ten-second preference for toys rolling off a line, expands production and cosmetics, then discovers that players saw everything after one working factory. Purchase intent, completion, or “looks satisfying” responses would not resolve the absence of voluntary return.

**Evidence needed later:** independent delayed returns, reasons for return, whether new jobs demand different decisions, observed authoring effort, and business-model evidence appropriate to the selected audience. An intentionally invited follow-up test is useful but should not be reported as an organic retention cohort. No numeric industry target is asserted.

## Follow-up: proposed exploratory research gates — 2026-09-20

The parent submitted explicit local research gates for D10. Each receives **PASS as a provisional research decision rule only**. No numerical value is derived from population evidence or an industry benchmark, and reaching a value does not establish that the direction is enjoyable, retained, commercially viable, or ready to expand.

| Proposed gate                                                                         | Verdict | Interpretation and strongest counterexample                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At least 6 of 8 viewers explain the silent clip's player action and production effect | PASS    | A practical early comprehension/redesign signal. A mixed sample can pass entirely through factory-player familiarity while casual players struggle; keep individual answers and segment observations visible. Accurate recognition does not establish desire to play.               |
| First visible result in roughly 30 seconds after gaining control                      | PASS    | A provisional usability target for a result intentionally caused by the player's action, not background movement or accidental tutorial completion. Record distribution, mistakes and explanations; speed alone can reward a trivial highlighted gap.                               |
| Initially, 5 of 8 choose another layout with a concrete production idea               | PASS    | A signal worth investigating further, not a continuation-rate estimate. Researcher presence, a desire to resolve confusion, or the novelty of the art can inflate it. Record what participants choose to change or demonstrate, rather than rewarding eloquent verbal explanations. |

Small mixed audience, separate segment records, open questions before explanation, fresh unaided touch participants, equally acceptable stopping, and counterbalanced structural comparison are appropriate safeguards for this exploratory scope. They do not make eight participants representative. If the local gate passes while a severe failure case remains, the failure still requires investigation; the count does not override it.

## Final consolidated-document check — 2026-09-20

**PASS for accuracy and review scope only.** The consolidated `docs/ADVERSARIAL_DESIGN_REVIEW.md` reflects the inspected evidence and scoped verdicts. Independently accepted D3b resolves queue continuity by preserving practice inventory and checking a separate empty-state clone. The return-motivation wording now accommodates new standalone factories, and the research gates remain exploratory. This is no additional gameplay approval, implementation authorization, or claim of player enjoyment or retention. No runtime work was performed.
