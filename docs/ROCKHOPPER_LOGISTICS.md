# Rockhopper — logistics revision (proposal, 2026-09-30)

Status: **revision 2, pending round-2 adversarial review.** Nothing here is adopted until it passes.

## User feedback (2026-09-30)

> I really love the art and visual identity of the new version. However it needs to lean more heavily into automation and logistics. Right now it feels more like an incremental game which is fine but the player needs to have more of a say in logistics decisions. Another thing I noticed is that it's very hard to see when a smelter is actually placed and not just hovering over the belts.

## What is wrong now (observed in the build)

Evidence: [12-minute bot save](reviews/evidence/rockhopper-before-logistics-12min.png) and [placing a smelter in it](reviews/evidence/rockhopper-before-logistics-placing-smelter.png). Both are developed-save stills from the greedy bot, not a human session.

- **The game routes for the player.** New machines auto-link to the nearest free dock or smelter; a smelter placed at a full hub splices itself into a line; unlinked machines relink themselves. The only routing input is the optional drag-to-reroute, and the bot barely needs it.
- **Belts never bind.** Every belt carries one machine's output, and its capacity scales with that machine's level. A belt can never be the bottleneck, so a belt is never a decision.
- **Smelters are ×3 multipliers with an input cap.** They don't change how much has to be moved, so where a smelter sits doesn't matter; only how many inputs it has.
- **So the decisions are purchases.** The factory is "buy the best-value upgrade", and the layout is automatic spaghetti that converges on the hub.
- **Placed and hovering smelters look alike.** The ghost is the same sprite at 75 % opacity. Placed smelters sit on top of unrelated belts with no footprint, so they also look like they float. Nothing marks the moment of landing.

## Revision 2 (after round-1 review)

Round 1 sent L1–L7, P1 and the clip back for revision, and passed P2 and P3 (see [the review](reviews/2026-09-30-rockhopper-logistics-adversary.md)). The biggest change: **junctions are machines, not points on belts.** Every belt is owned by exactly one machine and is a single segment, so segments, taps and pricing all become simple.

Numbers (config after this revision):

| Quantity                   | Value                                                     |
| -------------------------- | --------------------------------------------------------- |
| Belt speed                 | 110 u/s (constant)                                        |
| Belt spacing               | 13 u                                                      |
| Bundles per second         | about 8.5                                                 |
| Belt capacity by tier      | 8.5 / 17 / 25 / 34 chunks/s (tiers 1–4)                   |
| Level-1 drill on a T1 rock | about 3.1 chunks/s (level 2 about 4.5, level 4 about 9.5) |

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Chain machines.** A drill's output may target a free dock, a smelter with a free input, **or another drill**. A machine that receives belts forwards everything onto its own output belt, so a receiving drill is a junction you can see and tap. It **loads its belt as a fair zipper**: one chunk at a time, round-robin over its own buffer and each input belt with an item waiting, until the bundle is full. A bundle never mixes raw chunks and bars. Every change to the network (link, re-route, splice, move) rejects loops by walking downstream. Belts are drawn with an **in-port** notch where they enter a machine, so a belt that ends at a machine reads differently from one passing under it.                                                                  |
| L2  | **Belts have tiers, bought per machine and priced globally.** A belt's tier (1–4) is the most chunks a bundle can hold. The tier belongs to the owning machine and follows it through re-routes and moves. The price depends only on how many tier purchases have been made so far (base × growth^n, tuned with the bot), never on length, so re-routing can't be used to buy cheaply. Machine levels no longer change belts. **Widening happens in the machine's bubble:** Upgrade (machine), Widen (belt), Move, Sell. Nobody has to tap a thin belt. The drill bubble shows **"belt-limited"** in words, next to Widen, when its buffer has been full for most of the last few seconds.                                                                                          |
| L3  | **Smelters compress, with an input cap.** A smelter turns 2 chunks of the same ore into 1 bar worth 6 chunks (still ×3 per chunk, half the items). Inputs: 2 at level 1, 3 at level 3, 4 at level 5, so raw lines have to be merged upstream through drill junctions to feed more than a couple. Intake is round-robin into a 6-chunk queue, and a smelter never idles on a full queue. If the queue is full without a pair, the oldest chunk is smelted alone into a ×3 bar. Bars that arrive at a smelter bypass the queue and go straight to its output. Bar time is set so that a level-1 smelter takes in at least 8.5 chunks/s (0.23 s per bar), so a new smelter never jams the tier-1 line it is spliced into.                                                              |
| L4  | **Drop a smelter on a belt to splice it into that line.** The splice point is the ghost's crosshair (the footprint centre), not the finger. It must be within 8 u of a belt's centre line, and away from rocks and the hub. If two belts are within 6 u of the crosshair (a crossing), the drop is refused with a "pick one" hint. After a splice, the belt's owner feeds the smelter, and the smelter's output takes the owner's old target. Anywhere else in open space the smelter stands alone, with "no link" until the player links it. Moving a smelter drags its links along; it can't be spliced again while it has an output. Selling a machine that has exactly one input **heals the line** (the input takes over the target). With more inputs, those become unlinked. |
| L5  | **Auto-link to free docks only.** New drills and smelters take the nearest free dock, never a smelter or a drill. Unlinked machines retry when a dock frees up. **Onboarding:** the first dock-less machine (expected to be the first smelter, at about 1:24) shows a hand dragging the smelter onto a belt while it is being placed. The first unlinked drill shows a hand dragging from it onto a neighbouring drill or smelter.                                                                                                                                                                                                                                                                                                                                                  |
| L6  | **Layout is free; capacity costs.** Linking, re-routing, splicing and moving are free. Tiers, docks, machines and levels cost credits. Selling refunds 50 % of what was spent on the machine and its tiers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| L7  | **Two separate bottleneck signatures.** **Saturated**: a machine can't load its belt as fast as items arrive, so its buffer or input belts back up. The feeding drill shows its piled chunks, and the junction machine shows a "!" chip. Bundles on the belt are visibly full stacks. **Blocked**: a belt whose front item is waiting at a machine that won't take it has frozen dashes, and its end shows a "!" chip. Both use a shape and stopped motion, not only colour. Docks never block.                                                                                                                                                                                                                                                                                     |
| P1  | **Hologram ghost.** Cream, flat, no ink, lifted and bobbing, with a shadow and a crosshair on the footprint. Mint or coral appear only in the footprint ring and the ✕. While placing, pops fade and belts other than the splice target are dimmed. The splice target glows yellow with a notch at the crosshair.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| P2  | _(PASS)_ **Bolted pad and landing.** The pad gets a light rim.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| P3  | _(PASS)_ **Status light with a shape.** ● working, ‖ blocked, ○ idle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Save migration (v1 stays loadable):

- A belt's tier is `stackSize(machine level)`, so nothing drops below its feed.
- Belt items and smelter-ready items get a value multiplier. Old bars keep ×3 and new bars are ×6, and old bars are never re-paired, so credits are preserved.
- An old smelter job returns to the front of the queue.
- Round-trip tests cover all of this.

## Clip scenario (revised, staged from the numbers)

- **A, 0–10 s** (fresh save, real time): unchanged.
- **B, 10–30 s** (disclosed cut to a developed save, with the bot replay kept as the uncut witness):
  - **B1.** Three level-2 drills (about 13.5 chunks/s) are chained through the middle drill onto one tier-1 belt (8.5/s). The two feeding drills show chunk piles, and the junction drill shows "!".
  - **B2.** The player taps the junction drill, and the bubble reads "belt-limited". Widen to tier 2 (17/s): stacks of two appear, the piles drain, and the shot holds about 6 s so the settled income is shown, not the backlog flush.
  - **B3.** On another line (two level-1 drills, about 6.2/s), the player drags a smelter. The cream hologram floats, the line glows at the crosshair, and the smelter lands on its pad. Pairs go in, single bars come out, and the pops show the ×3 rate once it settles.
  - **B4.** A newly bought drill shows "no link": the next decision.

## Open conditions

- A human playtest at 390 px must still check whether players find chaining and splicing without misfires. Only the user can run it; bot runs and scripted captures are not a substitute.
- A bot run must show that the bot still builds raw chains by 20 minutes, so smelters don't make every chain pointless.

## Rejected or deferred

- **A rock sifter** (drop rock filler to save belt capacity) is deferred until L1–L7 are playtested.
- **Hand-drawn polyline belts** are rejected: fiddly on a phone, and straight links already read well.
- **Charging per unit of belt length** is rejected: it makes experimenting costly (see L6).
- **Ore-specific recipes and alloys** are deferred: too much at once.
