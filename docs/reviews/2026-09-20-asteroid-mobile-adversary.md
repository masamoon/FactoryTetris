# Asteroid automation: independent mobile and visual adversary

20 September 2026. Review of proposed experiments, not implemented gameplay or measured player response. Reviewed `AGENTS.md`, the previous adversarial review, and the parent agent's C1–C3 proposal. No new current-game capture was needed: this review challenges the proposed direction rather than repeating the existing runtime audit.

## Initial verdicts

| Decision                                                                                                                                                            | Verdict    | Scope and objection                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1: Recognizable real mining/transformation in a ten-second midgame clip; a thirty-second manual-to-first-automation starter only if actual rates and inputs permit | **PASS**   | A truthful storyboard and capture experiment. Not a guarantee that the opening fits those times, or that a clip demonstrates engaging play. Actual ore removal/work/queues must drive the effects. A non-depleting source cannot imply persistent terrain excavation.                                 |
| C2: Simple footprints and clear route snapping before a later shape comparison; no falling pieces or folding                                                        | **REVISE** | Simplification is sensible, but "large slots" could mean unique predetermined sockets. In that case construction becomes filling silhouettes rather than planning. Resolve what remains the player's choice and how the player can see its consequence.                                               |
| C3: One persistent outpost; manual bootstrap, drill, smelter, assembler, automatic split belts, shared plate investment and one expansion; defer other systems      | **REVISE** | A credible technical slice can still overload the opening. Do not require the whole pipeline, multiple currencies, and allocation before the first rewarding autonomous behavior. State that first drill operation is a complete early payoff and expose subsequent construction stages sequentially. |

REVISE blocks adoption until resubmission receives PASS. These are independent experiment reviews, not permission for a permanent redesign.

## Revised proposal and final verdicts

The parent resubmitted C2 with large touch targets for optional grid placements and ports, not compulsory recipe sockets. A simple starter landing pad is allowed for onboarding. A later matched task will be authored with at least two feasible routes: a direct route using central expansion space, and a perimeter route using more transport length/latency while preserving the center for the next machine. These layouts must be made legal and their consequences verified before claiming they demonstrate planning. Later tasks have no unique-solution placement hints.

The parent resubmitted C3 with the first autonomous drill as a complete early payoff. The thirty-second opening targets manual mining handing off to automatic extraction only. Smelting follows that reward; parts follow understanding of the preceding transformation; shared-material allocation is a later decision. The complete slice still contains all these stages, but the first screen does not present them as a checklist. Power, depletion, offline production, and prestige remain outside the first experiment.

| Decision    | Final verdict | Authorized scope                                                                                                                                                                                                            |
| ----------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1          | **PASS**      | Truthful clip/storyboard experiment as initially specified.                                                                                                                                                                 |
| C2, revised | **PASS**      | Simple-footprint touch and placement experiment with optional placements and two authored candidate routes to test. Neither route nor strategic depth is claimed already demonstrated. Shape comparisons remain later work. |
| C3, revised | **PASS**      | Sequentially introduced vertical-slice experiment beginning with the first working autonomous drill. No full-chain-in-thirty-seconds promise or long-term fun claim.                                                        |

All three now pass for the stated experiments. These revisions resolve the original scope objections; the following risks and evidence requirements remain the questions those experiments must investigate, not additional conditional verdicts.

## Concrete failure cases

**The opening reads as a tap miner.** A close-up of sparks and flying chips can communicate destruction more easily than automation. If the drill appears after a long grind, the first impression promises a different game. Show repeated unattended extraction after the player's purchase; assess whether unprompted viewers understand that work continues without tapping. Manual mining is a bridge to the promise, not sufficient evidence of it.

**The camera sells excavation the simulation does not provide.** A visually shrinking or carved asteroid promises changing geography, finite deposits, and route adaptation. The first slice defers depletion, so those effects would introduce an untested mechanic or misrepresent the stable source. Real emitted ore and cycling machinery can supply feedback without pretending terrain changes.

**A three-stage pipeline becomes tiny identical rectangles.** Ore, plates, and parts must be distinguishable by silhouette and motion on a phone, without requiring a legend or relying only on color. Tiny items disappearing into a wallet would reproduce the existing critique even with nicer sparks. More simultaneous particles can obscure the actual causal event.

**Snapping solves the game for the player.** If the drill can only sit on its marked socket and the smelter can only receive a highlighted route, all placement is instruction following. Conversely, making the player paint every tiny belt corner imposes touch work without necessarily adding decisions. The experiment must identify a small but real placement/routing choice, then observe whether participants can anticipate its consequences.

**Everything pauses whenever the player becomes interested.** Paused editing is defensible on mobile, but repeatedly entering edit mode can interrupt the satisfying production rhythm. A novice who spends most of the session in placement menus may never experience a working factory. Measure that interruption instead of assuming continuous foreground simulation guarantees a continuous factory experience.

**The splitter is a hidden arithmetic exam.** The meaningful plate-versus-part tradeoff can become a ratio interface with no physical explanation. A player needs to locate which branch is consuming the shared material and see the consequence of changing allocation. If split behavior is visually mysterious when one branch fills, the advanced control is not yet accessible. The mechanics review must separately specify and attack routing rules.

**The visually loud action is the strategically weak action.** If manual taps retain large explosions while automation quietly increments small counts, the audiovisual hierarchy teaches continued tapping. Similarly, an expensive new drill should not look like the right purchase when the existing smelter is already saturated. Machine starvation and blocked output must remain readable through the effects.

**Expansion is just a bigger version of the same solved pipeline.** A second drill plus second smelter can produce more spectacle while adding no decision. A small slice cannot establish long-term play. It can establish whether an explicit spatial or capacity conflict causes deliberate redesign rather than the same serial recipe at larger scale.

## Initial revision requests, resolved above

For C2, distinguish generous touch targets and snapping from mandatory recipe sockets. State a bounded test with at least two plausible placements/routes with different production or space consequences. This is a requirement to demonstrate a choice, not a proposal to add a large routing system. Do not claim such choices already exist merely because the board has several empty cells.

For C3, make successful handsfree drill operation the first self-contained reward. The thirty-second opening targets only manual work handing off to automation; it does not need to teach a complete smelting and assembly economy. Test later stages sequentially and retain permission to stop the experiment if placement or observation is already unappealing. Having all stages in the eventual vertical slice is acceptable; presenting all of them together at onboarding is not.

## Evidence needed

- Capture normal, unaccelerated play at phone size with sound muted. Ask viewers what the player changed, what now happens by itself, and what currently limits output before explaining the design.
- Record the first real automatic extraction, the first downstream transformation, and the first intentional improvement separately. An attractive prepared midgame clip does not validate the opening experience.
- Observe fingers, cancellations, mistaken connections, and time spent with production paused on actual phones. Emulated screenshots only establish part of the usability evidence.
- Ask players to predict the consequence of two available placements or a changed allocation, then let them run it. Correct construction by following highlights is weaker evidence than understanding.
- Check that a stalled line remains diagnosable during effects, and that ore, plates, and parts can be recognized without reading counters.
- Compare an ordinary session with the proposed clip. If the clip's best moment requires a specially arranged backlog that typical play rarely produces, label it an example setup and reconsider whether it represents the product appeal.

No numeric success thresholds or industry benchmarks are asserted here. Passing the visual test would support further experimentation, not long-term retention claims.
