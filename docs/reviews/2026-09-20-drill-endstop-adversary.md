# Drill end-of-reach: independent adversarial review

20 September 2026. Design review only; no runtime rule was changed. The current authored drill has a fixed west output, reserves an eight-cell east corridor, produces 26 ore from that corridor and completes after approximately 23.1 simulation seconds. The full replay reaches its first part at 39.3 simulation seconds, by which time the drill reports that its shaft is complete. These are simulation observations, not human-play timings.

## Verdict ledger

| Candidate                                                             | Verdict                            | Principal objection or authorized scope                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeatable permanent reach upgrades                                   | **REJECT**                         | They postpone depletion without improving throughput, risk a compulsory stat ladder, extend into previously usable space and eventually recreate the same problem at the world edge.                                                                             |
| Move the entire drill after each shaft; manual first, automatic later | **REVISE**                         | Moving the base breaks its factory connection, can turn loaded machines into cargo shuttles and either automates routing or imposes repeated reconnection work. At most one player-planned relocation could be tested under stricter rules.                      |
| Generic reach upgrades plus later relocation automation               | **REJECT for the first prototype** | It stacks two solutions before either is validated, risks a deterministic purchase order and overloads the mobile interaction surface.                                                                                                                           |
| Fixed-base sectional drill with tender                                | **PASS for a bounded prototype**   | Keep the base/output fixed, advance the head through visible occupied rail, let the player plan the continuation and automate only its repeated execution. This preserves the initial routing investment and makes expansion itself a visible automation reward. |

## Passed prototype scope

1. One fixed base and output.
2. At most three straight eight-cell sections in the current 36-cell world.
3. The player previews and confirms the second section once. No return to hand mining at that automated site.
4. A tender executes one precommitted continuation automatically; it does not choose a branch or ore target.
5. At most one capped support tier increases the rig from two supported sections to three. There is no repeatable per-cell reach ladder.
6. Each section consumes visible construction resources and real time.
7. Return travel, in-flight capacity and backpressure continue across the full occupied rail.
8. A closer new drill remains a credible alternative: it costs a new machine and route, while the longer rail has slower response, finite capacity and greater corridor occupation.
9. Exhausted/blocked feedback and jump-to-head/jump-to-base controls keep both ends readable on a phone.
10. Forks, hazards, curved paths, rail reclamation and further reach tiers are deferred.

## Remaining attacks and required evidence

- Long internal haulage must not let one dock-adjacent drill dominate the entire map.
- Permanent corridors must not create unrecoverable mistakes or silently become free floor.
- Resource shortages must not make the tender a renamed manual confirmation button.
- The support tier must not always dominate a second drill.
- Off-screen head and base blockage states must both remain legible.
- Compare one extended rig with two shorter rigs at equal construction value using deterministic replays.
- Test conservation, full-output backpressure, missing section resources, save/resume and undo at maximum distance.
- Observe three consecutive sections on a phone and record interventions and player explanations of stops.
- Produce a truthful silent clip of route commitment, automatic section installation, excavation and real ore return, retaining an uncut witness.
- Author at least one state favoring extension and one favoring a new base before claiming a meaningful choice.

The PASS authorizes this experiment only. It does not establish permanent progression, balance, enjoyment or retention.

## Implementation amendment

The implemented experiment deliberately narrows the earlier ceiling: one global eight-cell extension and at most two bases, with no support-tier purchase. The first exact economy was returned **REVISE** because the extension dominated a comparable fresh drill. After revising the authored fresh vein and costs, the exact fork received **PASS for the bounded prototype**: extension costs one part and yields 30 ore; a fresh nearer drill costs one part plus two ore and yields 32, equalizing net ore while retaining different routing, return-distance and parallelism consequences. See [the implementation review](2026-09-20-drill-extension-implementation-review.md).
