# Rockhopper: joins and hinges (2026-10-03)

Status: **built for the user's playtest** after one adversarial review round, behind a menu switch ("Joins: on/off", a setting kept across new games, **off** by default).

## Why

The user: "I also want to be able to build belts into empty space so I can make turn on a hinge and join other belts, instead of drills having only the option of connecting to other drills or a dock".

Before this, a link had to end on a dock or a machine with a free input. Two lines could only merge at a drill (a junction) or a smelter, so merging meant routing to wherever a machine stood.

## The earlier objection, and how this handles it

`docs/ROCKHOPPER_LOGISTICS.md` rejected **hand-drawn polyline belts** as "fiddly on a phone, and straight links already read well". Joins keep both points: nothing is drawn freehand. A belt is still a few straight pieces, now between machines, posts and joins, and each join is one drag-and-release, the same gesture as any link.

## Rules

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | **A join is a small free machine** (`kind: 'join'`, radius 9) with up to 3 inputs and one output. It loads its belt as a fair zipper over its inputs, like a drill junction with no buffer of its own. Its belt's tier is the widest input's tier, so it is never widened or upgraded on its own.                                                                                                                                                                                                 |
| J2  | **Made by linking.** Drag a link (from a machine or a belt's dock end) with no dock or machine in reach. Released on another belt, a join goes into that belt there and both lines merge onto its belt to the old target. On open space, **pause** (the hold ring fills, the label reads "pause for a hinge"), then release: the join is a **hinge** with no output yet. A quick release on open space still cancels, so a slip never cuts a working line. Docks and machines in reach still win. |
| J3  | **A hinge** never auto-links. It pulses until the player drags on from it to a dock, machine, belt or another hinge. Its items wait meanwhile, like any unlinked machine.                                                                                                                                                                                                                                                                                                                         |
| J4  | **Where.** Like a smelter's spot, with a join's footprint: off the hub, rocks and other machines, on no belt but the one it joins. Dropped near a bend post of that belt, it snaps onto the post and the belts meet in its knee. The target matrix applies as for a drill junction, so no loops ("makes a loop"), and lanes and posts as for any link. Refusals say why over the ghost and flash on release.                                                                                      |
| J5  | **Moving, selling, emptying.** The bubble has Move and Sell only (no upgrade or widen). Selling heals the line as for other machines. A join whose last input leaves (re-routed or sold) goes away, freeing its dock. Turning the switch off keeps joins already built and stops new ones.                                                                                                                                                                                                        |
| J6  | **Saves.** `joins` on the state and `'join'` machines and targets are validated on load. Saves without them are unchanged.                                                                                                                                                                                                                                                                                                                                                                        |

## Evidence

- `tests/rockhopper-joins.test.ts`: off by default and refused while off; a link onto a belt merges both lines and the shared belt runs at full tier-1 rate; widening both inputs makes the join's belt tier 2; a hinge never auto-links, bends the line, and ore arrives once it is dragged on to a dock; loops and the hub are refused with no change; selling a join heals the line; save round-trip.
- Playwright at 390 px (`tests/rockhopper.browser.spec.ts`): a drag onto a belt makes a join, a quick release on open space cancels, a pause there makes a hinge, dragging on from the hinge reaches a free dock, and the menu shows the switch. The same flow was also driven with real touch events (CDP) at 390 px.

## Review record (one round, 2026-10-03)

| Finding                                                                                     | Change                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Releasing a linked machine's drag on open space moved its working belt onto a new hinge     | A hinge needs a pause first; a quick release cancels as before (J2) |
| Pausing before release pinned a bend post under the finger, and the hinge was then refused  | The post that pause pins becomes the hinge                          |
| Re-dragging a hinge's only input left an empty hinge pulsing, which could still hold a dock | Empty joins go away (J5)                                            |
| The join search ran twice per finger move on large factories                                | Cached per frame and gesture, coarser slide steps                   |
| A join at the widest tier said "widen a belt into it"                                       | It says "send a line elsewhere"                                     |
| Joins let a plain drill reach a factory or a smelter feed a smelter                         | Kept: items pass through unchanged, as through a drill junction     |

The reviewer's stress run (42 random factories, 60 random join, hinge, route, widen, move and sell operations each, 2 minutes of sim) found no stalls, loops, over-full inputs, state changed by a refused or checked link, or failed save round-trips, before and after the fixes.

## Open (for the playtest)

- Whether pause-to-hinge is discoverable from the label, and whether a link with two pinned posts (no room for a third pause) needs another way to end in a hinge.
- Whether 3 inputs per join is the right cap.
