# Rockhopper: factories (proposal, revision 4, 2026-09-30)

Status: **revision 4. Round 3 gave a scoped PASS for a factories-only prototype**, behind the "Factories" switch and **off by default**, once conditions C1–C6 are written in; this revision writes them in. The prototype exists to produce the round-4 evidence. It does not authorize the sorter, a default-on release, or any claim of fun or balance. Rounds 1–3 are in [the review](reviews/2026-09-30-rockhopper-sorter-adversary.md). The sorter (revision 3, S1–S9) is **deferred** until it has a job no other machine does (see [Deferred: the sorter](#deferred-the-sorter)). The file keeps its old name so that the review's links still work.

## Why

The user, 2026-09-30: "what more logistics can we add? factories? tunnels?" They picked a sorter and factories, and chose to design them together under the full review process. The goal they set earlier is that tidy routing is how a player shows skill ([ROCKHOPPER_CROSSINGS.md](ROCKHOPPER_CROSSINGS.md)).

What three review rounds established (simulation, not playtest):

- A bar pays ×3 per chunk whatever the ore, rock included, so pulling rock off a line only loses money (round 1).
- Most rocks already carry pairable ores. A factory that pairs any two ores at 1.5× just goes at the end of every line (round 2).
- Only copper and crystal never share a rock. With a copper + crystal premium, meeting two lines adds +7 to +47 %, and one T1 copper line brought to a crystal factory adds +31 to +95 /s (round 3).
- A sorter never beat sending the whole line: in 7 of 9 runs the whole line matched or won, and T2 lines carry too little copper to sort (round 3).

## The rule, stated honestly (C4)

**Ship all copper to crystal.** From the moment T3 opens, every paired copper bar earns 4–40× more at a crystal factory than anywhere else, and crystal is always in surplus, so the rule is not _whether_ to send copper but _how_:

- where the crystal factory stands (near the crystal rock, or near the hub);
- which way the long copper belt goes past the T2 field, and where it crosses other belts;
- when its output belt becomes the bottleneck (it carries 6.5–10.3 items/s against 7.5 per tier).

Whether routing one long belt to a fixed destination is satisfying is a playtest question.

## Factories (F)

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **A factory pairs two bars of different ores into an alloy.** It takes only paired bars (×6) of non-rock ores. An alloy is worth **1.25×** its two bars, except **copper + crystal, at 2.5×** (18 + 180 = 198 → 495). **Copper and crystal are reserved for each other** (the user's choice, 2026-10-01): an arriving copper bar pairs only with a waiting crystal bar and the reverse, and ice and gold pair only with each other. A bar with no partner waits in the stock; once it has waited `LONE_WAIT` (2 s), it takes any different-ore partner. Both multipliers are config constants (`ALLOY_MULT`, `PREMIUM_MULT`), so the prototype can tune them.                                                   |
| F2  | **Pass-through.** Rock bars, lone ×3 bars, pre-logistics bars, alloys and raw chunks go straight on to the output. So do bars that find no partner at all within `LONE_WAIT`, and a bar that can't pair when the stock (6 bars) is full. Nothing is destroyed. Refusing rock was tried and is off (`FACTORY_REFUSE_ROCK`): see the evidence below.                                                                                                                                                                                                                                                                                                                                                              |
| F2b | **Output tier (C1).** A factory's output belt **starts at tier 1**, like every new machine; it never inherits a tier. When a factory is spliced onto, or linked from, a belt wider than tier 1, the placement ghost reads "belt will be tier 1", and Widen is one tap away in the bubble. A sim test checks that no sequence of place, splice, link, re-route, move and sell gives any belt a tier without a matching `tierBought` (or a migrated grant).                                                                                                                                                                                                                                                       |
| F3  | **Work time and levels (C3).** An alloy takes 0.4 s at level 1, 1.35× faster per level, **up to level 3** (0.22 s). Pairs that are waiting for the worker stay in the stock, and F2's stock rule still applies. Inputs: 2, and 3 at level 3. Upgrades: 600 and 1 320. Measured load: one T3 line has only 0.9–2.1 pairable bars/s, so a level-1 factory is 13–36 % busy on it and at most 58 % busy in every meeting measured. Levels 4–6 come back only if the prototype's bot shows a factory more than 70 % busy.                                                                                                                                                                                            |
| F4  | **Placement and links (C3).** Placed like a smelter: tray drag, splice or open space, with the same clearances and lane refusals. `canSplice` is generalised to a factory as the machine being placed and tested with it. Inputs: smelters and drill junctions. A **drill junction** is a drill with at least one input belt when the link is made; the link is kept (grandfathered) if the drill later loses its inputs. A drill with no inputs is refused ("smelt it first"). While only raw chunks have arrived for 5 s, the factory shows a "smelt it first" hint. Output: a dock or a drill junction; never a smelter or another factory. `relinkAll` retries smelters first, then factories, then drills. |
| F5  | **Alloy item (C2).** See the next section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F6  | **Price and unlock.** 2 400 × 2ⁿ. The tray shows it once the player owns 2 smelters (the bot reaches that at 3:20–3:33), through one predicate, `factoryUnlocked(s)`, that the tech tree being discussed in the project can replace. With the sorter deferred, the tray has three items and keeps its sizes.                                                                                                                                                                                                                                                                                                                                                                                                    |

## The alloy item (C2)

- **Representation.** An item on a belt is a bundle: `BeltItem { pos, ores, mult, alloy?, v? }`. An alloy bundle has `mult` 6, `alloy` set to the higher ore id of the pair, and every entry of `ores` equal to the lower ore id (canonical order). `v` is the alloy's value in whole credits: floor(multiplier × 6 × (value(a) + value(b))), for example Cu + Ice 60, Ice + Au 127, Au + Cr 315, Cu + Cr 495. One alloy is one item: two bars go in and one comes out.
- **Bundles.** A bundle never mixes values: the class key used in `loadBelts` becomes `(mult, alloy, v)`, so Au + Cr and Cu + Cr alloys never share a bundle, and alloys never share one with bars or chunks.
- **Taking items off belts.** `takeFront` returns the whole item (`{ore, mult, alloy?, v?}`), and every consumer keeps it: drill junctions, the smelter bypass (`mult > 1` goes to `ready`), and the factory.
- **Smelter bypass.** `Bar` gains `alloy?` and `v?`, and the smelter's loading step groups by the same class key, so an alloy that passes a smelter keeps its value.
- **Delivery.** The deliver event carries `v` when present, and the pops, `inTransitValue` and credits use it. `stats.delivered` counts one alloy as one item.
- **Saves.** The validator accepts `alloy` as an ore id greater than `ores[0]`, and `v` as a non-negative integer.
- **Look.** A chunk split diagonally in the two ores' colours.
- **Test.** An alloy made at a factory, passed through a junction and a smelter, delivers exactly `v`.

## Switch and saves (C5)

- **Switch.** The menu item "Factories: on/off" is **off by default** during the prototype. Off hides the tray item; existing factories keep working.
- **Save key.** Saves move to **`rockhopper.save.v3`**. On first load, the build migrates `rockhopper.save.v2` (or v1 if there is no v2), and never writes or deletes v2 or v1, so a rolled-back build finds the player's v2 save untouched.
- **Loader.** `deserialize` reads the v1, v2 and v3 formats. The v3 validator admits `factory` machines and alloy items.
- **Restore paths.**
  - `?restore=pre-factories` deletes v3 and migrates v2 again.
  - `?restore=pre-logistics` deletes v3 and migrates v1, without touching v2.
  - Menu → restart clears only v3.
- **Rollback, then forward again.** A player who rolls back plays on the frozen v2 save. Returning to the v3 build loads the older v3 and loses the play in between. That is accepted for an experiment.
- **AGENTS.md** gets the new save invariant.
- **Test.** Migration, v1/v2 untouched, both restore paths, and loading v2 with the current validator.

## The decisions it gives the player

- **Where the crystal factory stands and how copper gets there.** Near the crystal rock (short crystal belts, one long copper belt up and one long alloy belt down), or near the hub (a short output and two long inputs). Either way the long belt has to find a route past the T2 field, which is what bend posts and crossing plates were built for.
- **The output belt.** A busy crystal factory outruns a tier-1 output. Widening costs the global widen price, and a second factory spreads the load but costs 2ⁿ.
- **Local factories.** At 1.25×, a factory at the end of a T1 line pays back in 11–24 min; on a T3 line it pays back in 51–116 s, so "a factory after every T3 smelter" is still a rule there. The bot reports how often it happens.

## Clip scenario (revision 4, for the prototype only)

- **0–10 s (developed save, disclosed, T3 open).** A crystal factory already stands near the crystal rock, making local alloys, and the counter shows its settled rate.
- **10–20 s.** The player drags a T1 copper smelter's belt up to the factory, bending it once around the T2 rocks. Orange bars climb the map (about 5 s), and the first orange-and-pink alloy lands at the hub with a big pop.
- **20–30 s.** The factory's output belt shows "full": the next decision (widen it, or place a second factory). A crossing plate on the long belt is the other visible cost.

The beats show pop-level truth. The settled rates (+31 to +95 /s on 259–319 /s in the round-3 measurements, simulation) are logged only in the witness, which also logs T1 crumbles. The uncut witness is kept, and the clip is shot only on the prototype.

## Evidence the prototype must produce (C6)

- **The bot, run to 60 min** (it reaches T3 at 28–29 min or later), taught the long copper route and labelled as a scripted upper bound, not a player. It reports:
  - T3 and T4 times against the current bot;
  - income at 20, 30, 45 and 60 min;
  - the share of paired copper bars that reach a crystal factory;
  - factory busy share and output "full" share;
  - `tiersBought` and the factory levels bought.
- **The crossings stress tool** with factories: 0 locks, 0 stalls.
- **The clip witness** described above.
- **A 390 px screenshot** of a factory, an alloy on a belt, and the "belt will be tier 1" ghost.

## Prototype evidence (2026-10-01, simulation)

The prototype is built as revision 4 describes, behind the switch and off by default. The bot is a scripted upper bound, not a player: `npm run bot:rockhopper -- --minutes 60 --factories`. It buys a factory spliced after a smelter (a crystal factory when a smelter carries T3 or T4 ore, otherwise a local one) and routes every T1-only copper smelter's belt to a crystal factory with a free input.

| Seed | T3 (base → factories) | Income /s at 20 / 30 / 45 / 60 min, base | With factories        | Copper bars reaching crystal | Busy | Output full | Factories (levels)                | tiersBought |
| ---- | --------------------- | ---------------------------------------- | --------------------- | ---------------------------- | ---- | ----------- | --------------------------------- | ----------- |
| 1    | 28:46 → 29:52         | 408 / 483 / 527 / 681                    | 410 / 453 / 574 / 707 | 0 % (1 of 8 653)             | 8 %  | 37 %        | 1 crystal (52:13), 3 local (3333) | 15 → 15     |
| 2    | 28:26 → 30:28         | 397 / 594 / 664 / 832                    | 373 / 464 / 547 / 789 | 0 % (22 of 9 218)            | 10 % | 18 %        | 1 crystal (52:31), 3 local (3333) | 15 → 15     |
| 3    | 32:15 → 34:58         | 317 / 378 / 434 / 488                    | 302 / 353 / 414 / 500 | 0 % (0 of 11 847)            | 2 %  | 35 %        | 3 local (333)                     | 13 → 13     |

Neither bot reaches T4 within 60 min. Income is within ±10 % at 60 min and up to 22 % lower at 30 min, because the bot spends on local factories before T3.

**Why copper never meets crystal.** A 5-minute trace of seed 1's crystal factory (in a first bot version that also routed a T2 line to it) made 2 copper + crystal alloys against 230 copper + ice, 86 ice + gold and 16 gold + crystal:

- **Rock floods the output.** Its T3 smelter made 526 rock bars and 101 crystal bars. Rock bars pass through (F2), fill the output belt (full 55 % of the time, all 4 ready slots holding rock bars), and the factory then stops taking anything in, so the copper belt backs up.
- **Pairing on arrival spends crystal and copper on other partners.** A copper bar pairs at once with any waiting ice or gold, and a crystal bar pairs with ice or gold when no copper is waiting at that instant, so the premium pair almost never forms.

The round-3 measurements that promised +31 to +95 /s assumed copper and crystal meet; the rules as written don't let them.

**Crossings stress with factories.** `npx tsx tools/rockhopper-crossings-stress.ts 200 150 --factories`: 800 runs, 416 ending with factories, 732 with plates, 336 with bent belts; 0 failures, worst wait 0.93 s.

**Tests.** `tests/rockhopper-factories.test.ts`: premium and plain alloys, pass-through, lone wait, the copper-for-crystal preference, an alloy through a junction and a smelter delivering exactly `v`, the matrix and "smelt it first", the switch and unlock, tier 1 on a wide belt, a fuzz of place, splice, route, move, widen and sell that never grants an unbought tier, and the v3 save round trip. The browser spec covers v2 and v1 migration and both restore paths.

### Round 2: reserve and refuse (2026-10-01)

The user chose "reserve and refuse": copper and crystal wait for each other, and a factory refuses rock.

**Refusing rock jams every factory.** Rock is 58–74 % of every rock's cells, so a rock bar reaches the front of almost every line within seconds and stops it. With the same bot, 3 seeds, 60 min: income was 444 / 416 / 442 /s against 681 / 832 / 488 without factories (−35 %, −50 %, −9 %). T3 came 6–9 min later, and the factories delivered 1 alloy in total. Refusal needs a way to take rock off a line first, which is the deferred sorter's job, so `FACTORY_REFUSE_ROCK` is off.

**Reserving copper and crystal, rock passing through:**

| Seed | T3            | Income /s at 20 / 30 / 45 / 60 min (base → reserve)       | Copper bars reaching crystal | Busy | Output full | Factories                  |
| ---- | ------------- | --------------------------------------------------------- | ---------------------------- | ---- | ----------- | -------------------------- |
| 1    | 28:46 → 29:33 | 408 / 483 / 527 / 681 → 399 / 493 / 610 / **854** (+25 %) | 1 % (60 of 9 266)            | 7 %  | 18 %        | 1 crystal (50:15), 3 local |
| 2    | 28:26 → 30:44 | 397 / 594 / 664 / 832 → 352 / 464 / 531 / **693** (−17 %) | 0 %                          | 3 %  | 35 %        | 3 local                    |
| 3    | 32:15 → 34:58 | 317 / 378 / 434 / 488 → 302 / 353 / 505 / **658** (+35 %) | 0 %                          | 2 %  | 35 %        | 3 local                    |

The copper route still barely happens in the bot. It builds its first crystal factory at 50 min or never, because it opens T3 late and puts a smelter on a T3 line later still. So these numbers measure the bot's local factories more than the premium. Whether a player sends copper to crystal earlier is a playtest question. The stress tool with reserve (100 seeds × 4 modes, 196 runs ending with factories) had 0 failures, worst wait 0.73 s.

Still owed: the clip witness and 390 px screenshots.

## Deferred: the sorter

Revision 3's sorter (S1–S9, including S6's belt-id refactor and S7's side port) is deferred. It comes back only if the prototype shows a job that no other machine does, measured against whole lines, widening and a spare dock. Round 3's candidates:

- keeping rock bars off a crystal factory's saturated output;
- separating crystal from gold before a local T3 factory, so that crystal is saved for copper;
- splitting copper between two sinks, if a second copper recipe is added.

The design is in git history (revision 3 of this file).

## Open questions

- Is routing one long copper belt to a fixed destination satisfying? This needs a playtest.
- Should copper get a second, nearer sink (for example Cu + Au at the T2 gold rock), so that where copper goes becomes a choice? The prototype can test it by changing a constant.
- Does the premium make the T1 field so valuable at T3 that the climb from T3 to T4 flattens?
- Is the two-colour alloy readable at 390 px?

## Rejected or deferred

- **Venting** (round 1): cut.
- **A recipe chip** (round 2): cut.
- **Tier inheritance** (round 3): cut, because it made widening free.
- **The sorter:** deferred (above).
- **Tunnels or bridges:** deferred. Bend posts already make most crossings avoidable, and a free underpass would remove the crossing puzzle.
