# Asteroid factory: independent progression and economy challenge

Date: 2026-09-20. Reviewer: `asteroid_progression_adversary`.

## Scope and evidence

This is an independent challenge of proposals B1–B6 supplied by the parent reviewer, following the user's new direction: manual asteroid mining grows into an incremental game with visually satisfying, consequential factory automation. I read the current `AGENTS.md` and the earlier direction review. This document contains design reasoning and proposed falsifiers, not observations of an implemented asteroid game. No runtime changes, economic simulation, phone session, or human playtest was performed by this reviewer.

The premise has a coherent experiential arc: first I do the work, then a machine does it, then my arrangement of machines determines how well it happens. Its largest risk is replacing that arc with a price ladder. If the optimal next action is always “buy whatever increases credits per second most,” the factory can become a decorative representation of a spreadsheet.

The verdicts below approve bounded experiments only. An initial REVISE is blocking until the revised proposal is independently resubmitted and accepted. Evidence to collect in an approved experiment is not evidence already obtained.

## B1 — Persistent outpost with short, self-chosen milestones

**Verdict: PASS for the stated structural experiment.** Retain one factory across a short break and one expansion; do not assume a campaign, service game, prestige loop, or final commercial format.

Persistence fits the promise that the player is building an owned production system. It can also preserve a bad layout, accumulate a mess that is unpleasant to return to, or allow the first good design to run unchanged forever. Self-chosen milestones cannot simply mean the game stops helping the player identify useful work.

Concrete failure case: the player resumes and sees every belt moving, but cannot identify the current production goal, resource shortage, or useful next change without reopening several inspectors. More activity has reduced agency. Another failure case is an expansion that adds identical source slots around the same universal central refinery layout: it asks for more construction but no different thinking.

Mobile cost: a persistent factory eventually exceeds a comfortably readable phone screen. Panning between a mine, a processor, and an export pad makes cause and effect harder to compare. The one-expansion scope must not be taken as proof that arbitrary factory growth fits the format.

Collect: time and actions needed to recover context after a real break; a player's unaided statement of their next intended improvement; useful equipment retained through the expansion; teardown required; voluntary desire to return. A short observed return does not establish long-term retention.

## B2 — Expansion through clearing and later depletion

**Initial verdict: REVISE.** The draft bundles three different hypotheses: visible mining changes terrain, clearing creates useful construction space, and finite sources eventually force redeployment. A single first-line prototype cannot explain which is responsible for enjoyment or frustration.

Concrete failure case: the player finally balances two ore feeds and a processor, then the earlier vein empties. Their reward for optimizing the system is a required reroute. A redeployment preview helps execute the chore but does not make it a new decision. If high efficiency empties sites sooner, playing well can increase maintenance frequency.

Another failure case: mining opens space, but all builders should simply wait until the best rectangle clears and use the same layout. Terrain animation is then spectacle attached to a fixed plan. Conversely, if construction permanently consumes access to unmined cells, the beginner may block their own expansion without realizing it.

Mobile cost: source reserves, equipment range, current routing, new building area, and a redeployment preview all compete for the same small view. Pausing automatically on depletion can be mistaken for a broken machine or a modal interruption unless the actual exhausted source remains visible.

**Required revision:** separate the experiment order. The first playable slice has stable useful sources, one deliberately controlled terrain/space expansion, and no depletion-driven maintenance. A later matched experiment may compare finite sources with stable sources only after players have demonstrated that rearranging the first factory is worthwhile. Keep the later hypothesis explicit and unselected; do not build auto-redeployment as part of the first slice. The future finite-source experiment must measure new planning versus repeated reconnection separately. No purchased equipment disappears.

## B3 — Progression adds production roles and one allocation conflict

**Verdict: PASS for a small functional-progression experiment.** The approved sequence is extraction, transport, then one two-input assembly role, with one shared material or power conflict. This does not approve a sprawling tech tree or claim that recipe complexity itself creates depth.

Concrete failure case: unlock the assembler, feed the only two resources into it, sell its higher-value output, and never use the old export route again. That is a new mandatory chain rather than a production choice. A second input can double diagnosis cost while still leaving one best answer.

Dominant strategy to attack: buy every machine in the prescribed order, assign all scarce capacity to the product with the highest marginal sale value, and copy the same topology at every site. If every material converts freely into the same investment currency and there are no relevant contextual constraints, a nominal allocation conflict can have one permanent answer.

Mobile cost: multiple bottlenecks are difficult to distinguish visually. Only one newly competing constraint should be introduced in the small slice; otherwise the player may solve by purchasing capacity everywhere. “More machines fixed it” is weaker evidence than correctly predicting which missing input prevented the next output.

Collect: a player predicts the effect of redirecting the contested input, makes a deliberate change, and sees that consequence. Compare two valid situations where different configurations are useful. Leave the system unattended long enough to show that success comes from its automatic policy, not repeated tapping or manually alternating consumers. If both situations favor the same allocation, reject that supposed tradeoff.

## B4 — Earned investment, reversible construction, and salvage

**Initial verdict: REVISE.** Reversible early construction is sensible for exploration, but the economy and recovery rules need two clarifications before approving this experiment.

First, equal earned budget does not itself create different good investments. If extraction, transport, and processing each have a price and a rate, “remove the cheapest active bottleneck” can be the universal purchase rule. That may be understandable but does not yet fulfill the user's planning ambition. Fixed repeatable export value also lets unlimited waiting hide a poor plan: every design eventually buys everything unless space or another consequential limit remains relevant.

**Required economy revision:** include two deliberately specified factory states and two rival investments under the same earned budget. The investments must differ in usefulness across those states, or one must serve an explicit nonfungible production obligation that credits alone do not satisfy. State which result is expected and allow the test to reject the configuration if the same investment dominates both. This is a bounded comparison, not a request for more currencies or dynamic commodity markets. The parent's local economy analysis can supply the concrete cases.

Second, “block operation if salvage capacity is full” is dangerous if it means stopping the whole factory. A full salvage store plus a dismantled or disconnected processing route can prevent both rearrangement and draining the store. A safe-looking conservation rule has created a softlock.

**Required recovery revision:** capacity failure rejects the proposed edit atomically and leaves the prior runnable state and its contents intact. Merely relocating a machine may preserve its inventory inside that machine instead of forcing it through salvage. Dismantling must explicitly conserve its actual held materials, charge/refund construction only once, and preserve an accessible way to consume or export salvage. Do not make all production globally stop merely because a proposed refund cannot fit. If another design is chosen, demonstrate equivalent recovery rather than relying on “no silent deletion.”

Additional exploit: fully refundable equipment is reusable capital. If momentary bulk exports or unlock thresholds are rewarded, a player can rent a huge processor, empty a stockpile, refund it, rent extraction, and repeat. The factory then becomes manual batch production. Do not infer sustainable efficiency from a short burst. Test the unattended result as well as total accumulated output.

Mobile cost: an invisible salvage bin turns moving a machine into inventory accounting. If a player needs a lengthy explanation of why a simple move fails, the early interaction is overbuilt. Recovery rules should be mechanically sound without putting an accounting interface in the opening.

## B5 — Offline production remains undecided; first prototype is foreground-only

**Verdict: PASS as an experimental scope boundary.** This isolates whether building and optimizing the line is interesting before a return-reward system can obscure it. It is not a verdict against eventual offline production.

Concrete failure case: the prototype's next useful action needs resources that require several minutes of foreground waiting, and researchers interpret the player leaving as a rejection of factory planning. A foreground-only prototype must keep the investment choices available at a timescale appropriate to the test; it cannot imitate an offline game's waiting schedule while withholding offline play.

Opposite failure case: future offline income is calculated from nominal machine levels while the visible factory is starved, blocked, or disconnected. The rational player stops caring about layout because the economy bypasses it. If offline production is later pursued, equivalence to the real resource/buffer/source constraints is a substantive requirement.

Collect in the first experiment: actual building time, watching time, unavoidable waiting, and decisions made. Record when the player wants to leave because they have completed a satisfying task versus because the only remaining action is waiting. Do not infer login habits or offline retention from this test.

## B6 — Defer prestige, merge core, premium currency, and monetization multipliers

**Verdict: PASS as a scope boundary.** The first evidence should be a satisfying automated line, deliberate improvement, and interest in returning to one's factory. None requires selecting a reset system or monetization model now.

Concrete failure case: the central line is easy to solve, so the design repeatedly wipes progress and sells rebuilding speed as depth. Another is a merge mechanic that lets a higher-level object replace several interacting production stages: the game gains a familiar upgrade gesture while losing the automation the user insists on keeping.

This deferral must not become an unsupported claim that the concept will sustain hundreds of sessions. A one-expansion slice can reveal obvious depth failures; it cannot establish a long-term content budget, live-operations strategy, or retention curve.

Collect: whether a player asks to try a different configuration without prompting; whether a new site requires a reasoned change; whether “tap more,” “wait longer,” or “buy the next highlighted upgrade” defeats the supposed planning problem. Evidence of mechanical variety and evidence of enjoyment must be recorded separately.

## Cross-cutting stop conditions

- The clip promises an automated industrial system but the strongest strategy remains continual mining taps or timed resource dispatch.
- Every useful investment is determined by one permanent return-on-investment ranking, independent of layout or current production context.
- Expansion mainly increases the amount of repeated placement or required scrolling.
- Source depletion repeatedly invalidates a successful line without introducing a new consequential choice.
- Time alone erases all planning consequences, and suboptimal factories differ only in how long they wait.
- Free refunds encourage constant rental/batch toggling rather than stable unattended automation.
- A visually busy system hides why output changed; players buy upgrades until the numbers improve.

Initial decision register: **B1 PASS; B2 REVISE; B3 PASS; B4 REVISE; B5 PASS; B6 PASS.** Revised verdicts, if any, are recorded below rather than silently replacing this history.

## Resubmission review — B2 and B4

The parent resubmitted the following narrower specifications after the initial objections. The revisions below are accepted as bounded exploration specifications; their eventual implementation and playability remain untested.

### B2 revision: PASS

The first prototype has a stable starter vein and one reachable expansion. Depletion is a separate later matched comparison against stable sources, conducted only after the core loop warrants further testing. No automatic global pause on depletion, loss of purchased machinery, or mandatory reconstruction of the whole factory is selected.

This removes the maintenance experiment from the first automation experiment and resolves the blocking scope issue. It does not establish that permanent sources are the shipping rule or that visual terrain clearing creates useful spatial choices. The initial failure cases remain relevant to the later comparison.

### B4 revision: PASS

The revised recovery contract preserves a moved machine's buffers. Demolition/refund is an atomic operation: it returns each actually paid construction/upgrade resource once, plus the original ingredients held in unfinished work once, into finite visible salvage storage. If the complete recovery cannot fit, the edit is rejected and the prior state remains intact. The proposed failed edit does not globally stop normal production. Salvage can pay construction costs, and restoring the starting drill and connection needs raw resources rather than processed products that require the missing line to make them.

This resolves the specific conservation/softlock ambiguities at a specification level. Validation still needs witnesses for full storage, partly completed work, several upgrades, repeated move/demolish/undo sequences, and restoring a productive path from the allowed early states. PASS does not certify that an implementation is bug-free.

The economy exploration now requires distinct plates and machine parts for later construction rather than treating all output as one freely interchangeable coin. The first allocation experiment is plate export/use versus feeding the component assembler. Power comparison is deferred to a later separate experiment, so the opening is not required to teach both conflicts.

The parent also supplied an illustrative equal-cost comparison: a compact smelter package makes three plates per second using two cells and four power; a wide package makes four plates per second using six cells and two power. A floor-constrained state and a power-constrained state can reverse which package fits the available constraints. These numbers are **examples for constructing a comparison, not approved balance values**, and no actual feasible port/layout witness has been supplied here.

The revised proposal is specific enough to explore and falsify. The asymmetry also needs to be judged honestly: forcing only one package to fit can be a simple eligibility puzzle, not evidence of a rich optimization choice. The wide package has both higher throughput and lower power use; it may dominate whenever space is plentiful. Show the spatial consequence in actual reachable layouts and test whether players can understand and reason about it. Distinct construction resources can still have one stable optimal production ratio; the revised specification has created a place to look for planning depth, not demonstrated depth.

Final decision register: **B1 PASS; B2 PASS after revision; B3 PASS; B4 PASS after revision; B5 PASS; B6 PASS.** Every PASS permits only its stated experiment or scope boundary. The proposal is not a selected shipping design, an implementation authorization, or proof of long-term fun.

## Cross-review correction and selected B4b recovery

The independent loop reviewer identified a remaining reachability failure in the B4 salvage proposal: rejecting demolition atomically prevents deletion or duplication, but it does not guarantee that a finite salvage store filled with the wrong materials can fund or accommodate the recovery the player needs. My earlier B4 PASS was too permissive about that part of the specification. It remains recorded as review history, **but the finite salvage/refund design is now unselected and unresolved for implementation**. Do not cite the earlier PASS as authorization to implement it.

### B4b — Relocation and complete-state checkpoints: PASS

**Selected scope:** recovery in the bounded first prototype only. No demolition/refund economy or finite salvage system is selected. Free paused relocation preserves the whole machine, held items, and unfinished work. Construction and upgrade checkpoints retain complete states across the bounded prototype. Undo rewinds all resources, machine state, elapsed production, rewards, and other progression since the selected snapshot; it does not refund construction while preserving the production that construction enabled. Chapter-start retry is also available. The authored starting economy can buy the first drill and delivery connection using raw ore, before plates or machine parts are required.

This narrower experiment has a direct recovery path without requiring a second inventory economy. It resolves the newly identified salvage-capacity objection. It does not approve an unlimited-history architecture or the same rules for a long-running game with offline production.

Concrete failure case to validate: build a machine, let it produce a reward, upgrade it, produce another reward, then undo across both checkpoints. Machine contents, consumed ingredients, construction funds, elapsed simulation state, and rewards must return to the exact chosen snapshot. No retained reward, export credit, unlock, or external counter may permit gaining value by repeating the sequence. Moving a loaded machine must preserve that machine and its contents exactly. A later implementation needs these checks before this specification is treated as working.

Mobile cost: rolling back time as well as construction can surprise someone who only wanted to move a machine. Relocation therefore remains a separate reversible action, and the checkpoint action must clearly communicate that it restores the whole earlier factory state. If people repeatedly lose work unintentionally or fear experimenting because undo is unclear, this recovery interaction has failed the test despite being mathematically conservative.

### Waiting and incremental progress: clarification

Waiting is legitimate in the user's incremental brief. A factory producing useful resources while the player watches, leaves, or chooses not to intervene is part of the fantasy; slower layouts may also progress. Waiting by itself is neither an exploit nor a failure. The question is whether a deliberate arrangement or investment produces an understandable, worthwhile difference and whether players enjoy choosing the next improvement.

Earlier warnings about time erasing planning consequences apply when every configuration leads to effectively the same choices and the only apparent agency is waiting through a fixed price ladder. They must not be interpreted as a requirement to prevent slow progress or impose a rate exam. No fresh-state “Check design” throughput trial from the earlier toy-factory review is selected for this asteroid experiment. Assess planning through actual persistent production and player choices, separating useful anticipation and watching from waiting that participants describe as empty.

**Current register:** B1 PASS; B2 PASS after revision; B3 PASS; B4's finite-salvage recovery UNSELECTED/UNRESOLVED; **B4b PASS for the first prototype's recovery**; B5 PASS; B6 PASS. The B4 economy-comparison hypothesis remains exploratory; B4b changes recovery scope, not the need to test whether investments produce meaningful choices.
