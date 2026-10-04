# Rockhopper — logistics revision (proposal, 2026-09-30)

Status: **PASS (round 3), scoped as a reversible experiment for the user's playtest.** It is not evidence of fun or balance.

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

## Revision 3 (after round-2 review)

Round 2 passed L5, L6 and P1, and accepted a PASS scoped to an experiment once the rest is fixed. Revision 3 changes only these points; everything else in revision 2 stands.

- **L1**
  - **Input caps:** a drill accepts at most **2** input belts, so a wide merge has to branch through more drills. A star into one collector is impossible.
  - **Keeps forwarding:** a receiving drill forwards even while its own rock crumbles, is empty or is being towed.
  - **Zipper pointer:** it persists across loads, so the drill's own buffer is not served first every time.
  - **Target matrix:**
    - A drill may target a free dock, a smelter with a free input, or a drill with a free input (not itself, no loop).
    - A smelter may target a free dock or a drill with a free input. A smelter never feeds a smelter.
    - Bars joining a raw junction ride in their own bundles. Part-empty bundles are accepted.
- **L2**
  - **What the price counts:** `n` is the number of tier steps currently **bought** and owned. Selling a machine lowers it.
  - **Migrated tiers:** tiers granted by save migration are recorded as unbought and never raise `n`.
  - **Smelters:** the smelter bubble also shows Widen.
- **L3**
  - Intake peels **as many chunks per tick as the queue has room for** (still round-robin, one chunk per input in turn), so a smelter is never capped at 30 chunks/s.
  - Prices and pacing are re-derived with the bot.
- **L4**
  - **Tolerances are measured on screen:**
    - The crosshair splices when it is within max(8 u, 12 px / zoom) of a belt's centre line, and the ghost visibly **snaps** onto that line.
    - The drop is refused only if a second belt passes within max(3 u, 4 px / zoom) of the snapped point.
  - **Clearances:** the existing ones stay (rock radius + socket gap + smelter radius + 4 u, the hub + smelter radius + 26 u, and other machines).
  - **Recovery:** after a standalone drop, the first time, a hand shows dragging a drill onto the new smelter.
  - **Heal on sell:** the lowest-id input takes over the sold machine's target. The other inputs chain into it while it has free inputs, and any left over become unlinked. This can't create a loop.
- **L7**
  - **Blocked:** a **‖** chip at the belt's end, and the belt's dashes freeze. It uses the same glyph as P3.
  - **Saturated:** a **"full"** chip showing a stack of chunks, drawn on the machine that loads the belt. That includes a lone drill that outruns its own belt.
  - Both chips have 1 s of hysteresis.
- **Clip B1/B2**
  - **B1:** with a fair zipper, all three level-2 drills pile up (each gets about 2.8 of the 4.5 chunks/s it produces).
  - **B2:** a T1 rock yields about 90 cells before it crumbles, so the hold ends in the crumble. It is shown honestly as depletion followed by the tow, and "settled income" is measured only before the crumble, from belt deliveries (the bot witness logs the cells remaining).
- **Migration**
  - **Existing smelter links:** links over the new input caps are **grandfathered** until the player changes one.
  - **Tier counter:** migrated tiers don't count toward `n`.
  - **Backup:** before migrating, the untouched v1 text is copied to `rockhopper.save.v1.pre-logistics`, so the experiment can be undone.
  - **Save version:** the save stays under `rockhopper.save.v1`, with an internal `version: 2`.
- **Round-3 fixes (written in as the PASS requires)**
  - **Heal on sell:** the heir takes the sold machine's target only if the target matrix and the input caps allow it. Otherwise the heir and the remaining inputs become unlinked. Tested with smelter → drill → smelter.
  - **Restore path:** the experiment saves to a **new key**, `rockhopper.save.v2`. It migrates `rockhopper.save.v1` on first load and **never writes or deletes the v1 key**, so rolling back to the old build finds the untouched pre-logistics save.
    - `?restore=pre-logistics` deletes the v2 save and re-migrates from v1.
    - Menu → restart clears only v2.
    - A test covers migration, v1 staying untouched, restoring, and loading with the v1 validator.
- **Scope:** a PASS authorizes implementing this as a **reversible experiment for the user's playtest**. It is not evidence of fun or balance. Bot and clip results are reported separately from human findings.

## Open conditions

- A human playtest at 390 px must still check whether players find chaining and splicing without misfires. Only the user can run it; bot runs and scripted captures are not a substitute.
- A bot run must show that the bot still builds raw chains by 20 minutes, so smelters don't make every chain pointless.

## Rejected or deferred

- **A rock sifter** (drop rock filler to save belt capacity) is deferred until L1–L7 are playtested.
- **Hand-drawn polyline belts** are rejected: fiddly on a phone, and straight links already read well. (Joins and hinges, 2026-10-03, keep belts as straight pieces between machines, posts and joins: `docs/ROCKHOPPER_JOINS.md`.)
- **Charging per unit of belt length** is rejected: it makes experimenting costly (see L6).
- **Ore-specific recipes and alloys** are deferred: too much at once.

## As implemented (PR #14, fixed in PR #15)

Where this section and the revisions above disagree, this section wins.

### Numbers

| Quantity                  | Value                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Belt capacity             | 7.5 / 15 / 22.5 / 30 chunks/s by tier (not 8.5/17/25/34). A belt loads at most every 4 ticks, whatever its length. |
| Level-1 smelter           | 0.23 s per bar, taking in about 8.7 chunks/s                                                                       |
| Max-level drill (T1 rock) | about 29 chunks/s, which fits a tier-4 belt                                                                        |
| Widen price               | 90 × 1.7^(tier steps bought and owned)                                                                             |
| Smelter price             | 520 × 2^n                                                                                                          |
| T1 slot prices            | 0 / 700 / 3000                                                                                                     |
| T2 slot prices            | 15k / 40k                                                                                                          |

### Layout and placement

- **Slot heights:** T1 −270, T2 −490, T3 −750, T4 −1010. The tiers moved up to leave a yard for smelters between the T1 rocks and the hub.
- **Smelter clearances:**
  - rock radius + smelter radius + 2 u;
  - every socket, free or not, reserved for a drill (dropped with free drill placement: drills and smelters now just refuse to overlap);
  - hub: dock radius + smelter radius + 6 u;
  - a splice must leave a feed belt of at least 17 u.
- **Snapping:**
  - Within max(8 u, 12 px/zoom) of a belt, the ghost snaps to it and slides up to one smelter width to a legal spot.
  - A belt that can't take a smelter refuses the drop with a reason, shown above the ghost.

### Bottleneck signals

| Signal                       | Meaning and rule                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| "full" (pile-of-chunks chip) | Sampled at each load chance (bundle full, items still waiting), smoothed with hysteresis. Never blamed on a belt held downstream. |
| "‖" (blocked)                | A smelter refused intake because its queue was full.                                                                              |
| Frozen dashes                | The front has waited about 0.4 s.                                                                                                 |
| Drill piles                  | Show for 0.6 s after a stall.                                                                                                     |

### Pacing (greedy bot; an upper bound, not human evidence; seeds 1–3)

| Beat              | Time        |
| ----------------- | ----------- |
| First smelter     | 1:35–1:37   |
| First drill chain | about 2:41  |
| T1 fully unlocked | 6:49–6:51   |
| T2                | 11:30–11:39 |

The bot builds 6–10 raw drill chains by 13–20 minutes, and 6–7 smelters and 7 docks by 20 minutes.

### Segment B witness

[`rockhopper-clip-segment-b-witness.log.txt`](reviews/evidence/rockhopper-clip-segment-b-witness.log.txt), from `npx tsx tools/rockhopper-clip-b.ts`:

- **B1** runs at 7.3 chunks/s on a 7.5 cap. Only the junction shows "full".
- **B2** widening lifts it to 12–14 chunks/s before the T2 rock crumbles, which is logged as depletion.
- **B3** splicing a smelter gives ×2.8 credits/s with half as many items.

The live capture of segment B is still to do. Stills (developed saves from the bot, labelled):

- [developed at 12 min](reviews/evidence/rockhopper-logistics-developed-12min.png)
- [hologram](reviews/evidence/rockhopper-logistics-placing-12min.png)
- [landed](reviews/evidence/rockhopper-logistics-landed-12min.png)
- [bubble](reviews/evidence/rockhopper-logistics-bubble-12min.png)
- [first splice](reviews/evidence/rockhopper-logistics-first-splice-hologram.png)

### Undoing the experiment

The pre-logistics save is never written. `?restore=pre-logistics` re-migrates it, once. Rolling the build back finds it untouched.

### Open

- The human playtest at 390 px (the user).
- Free drill placement: built in `docs/ROCKHOPPER_FREE_DRILLS.md`.
- The geometry-has-no-cost critique from round 4.
