# Rockhopper: bend posts (2026-09-30)

Status: **built for the user's playtest**, after one adversarial review round (the user chose "posts, one round" on 2026-09-30). This follows the crossings experiment ([ROCKHOPPER_CROSSINGS.md](ROCKHOPPER_CROSSINGS.md)), where posts were deferred until the playtest. It ships with crossings, so the menu's crossings switch still turns plates and lanes off; posts themselves stay.

## Why

The user, after playing crossings: "We still barely any power to tidy up routing."

What limited routing (observed in code before this change):

- A belt was one straight segment from its machine to its target. The only levers were a drill's angle on its rim, a smelter's position, and which target a belt went to.
- Every trunk ends on the fixed dock arc at the hub, so trunks converge there whatever the player does.
- Clear lanes (C8) refused 90 link targets in the prepared developed save, because a straight belt can't go around a machine.
- The dock swap (same branch) fixes the "no free dock" dead end but still leaves every belt straight.

## Rules

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **A belt may bend at up to 2 posts.** It runs machine → post → post → target as straight pieces (`Belt.via`, world points in order). Speed and capacity per tier are unchanged; a longer belt holds more bundles and takes longer to cross, but its rate is the same. Posts are free, like re-routes and moves.                                                                                                                                                                                                                                                                                                                                                                                   |
| P2  | **Placing.** Press and hold a belt for 0.35 s (a ring fills under the finger after a short grace, and the belt lights up), then drag: the new post rides 44 px above the finger so it stays in view; release to drop it. Drag an existing post to move it (posts are hit before machines). Drop a post back near the straight line between its neighbours (10 u, or 16 px when zoomed out) to remove it; the label reads "straighten". While dragging a link, pausing 0.35 s on open space pins a post there, so a blocked link can be bent round a machine in one gesture. The machine's bubble gets a **Straighten** button when its belt has posts. A short press or pan on a belt still pans. |
| P3  | **Where a post may stand, and what shape a belt may take.** Not on a rock slot, a machine or the hub. Each piece must be at least a bundle spacing plus 4 u long, turn at most 120° at a post, pass at least 4 u outside the hub's edge, and never cross another piece of the same belt. With crossings on, each piece keeps clear lanes (C8). A refused spot shows its reason ("belt blocked", "too sharp", "too short", "over the hub", "crosses itself", "no room here") over the ghost post, and again as a short flash where it was released.                                                                                                                                                |
| P4  | **Crossings.** Each piece is a segment for crossing purposes. Pieces of different belts that touch share a plate as before; pieces of one belt never plate each other. The shared-machine exemption applies only to the end pieces that touch that machine. A belt that crosses another twice gets two plates.                                                                                                                                                                                                                                                                                                                                                                                    |
| P5  | **What keeps and what clears posts.** Re-routing a belt or a dock swap keeps its posts when they still fit the new target, and drops them otherwise. Moving the machine at either end keeps them; a move is refused if a piece would then break P3. Splicing a smelter into a piece keeps the posts before the splice on the feed and moves the ones after it to the smelter's belt; a smelter can't land on a post. Selling a machine straightens the belts whose target changes as the line heals.                                                                                                                                                                                              |
| P6  | **Auto-link never places posts.** Only the player bends belts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| P7  | **Saves.** `via` is an optional array on a belt, validated on load (1–2 finite points inside the play area); a malformed one straightens that belt instead of rejecting the save. A save without it has straight belts. No migration.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| P8  | **Signals and teaching.** A post is a small ink-rimmed peg; the belt is drawn as a polyline, and bundles follow it. The crossing hint's second line reads "Hold a belt to bend it, or re-route".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Evidence

- **Untangling the prepared save** (`docs/reviews/evidence/rockhopper-crossings-prepared-save.json`, the developed, tangled factory from the crossings review). Bending three trunks round the hub with two posts each, and nothing else, takes it from **11 plates to 2** and income over 120 s from **191 to 262 cr/s (+37 %)**. The result is `docs/reviews/evidence/rockhopper-posts-untangled-save.json`; every bend goes through the real `bend` command. A greedy search that allows one post per belt only gets 11 → 10, so the second post is what makes posts useful around the hub.
- **Blocked links.** Of the 90 link targets that lanes refuse in the prepared save (the target matrix allows them, a straight belt would run under a machine), **all 90** become reachable with a single post (search over a 20 u grid of post spots through `targetWhy`).
- **Stress.** `tools/rockhopper-crossings-stress.ts` now adds random bends: 200 seeds × {no moves, moves} × {straight, random posts}, 150 s each, 690 runs with plates and 330 with bent belts, **0 locks or stalls**, worst wait 0.97 s.
- **Tests.** `tests/rockhopper-posts.test.ts` (untangling a crossed pair at full rate, every refusal, re-route/move/splice, save round-trip, a belt crossing another twice) and a Playwright test at 390 px: a quick drag pans and never bends, hold-then-drag places a post, dragging it onto the line removes it, it survives a reload. The Straighten button was checked in the same scripted run.
- **Frame time** while holding and dragging a post on the prepared save in headless Chromium: p50 16.7 ms, p95 33.4 ms.
- **Bot pace** is unchanged (it places no posts; `npm test` includes the bot pace checks).

## Review record (one round, 2026-09-30)

One adversarial pass over the proposal and first build. Findings and what changed:

| Finding                                                                                                | Change                                                                                |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Posts could route a belt straight over the hub, which reads as broken                                  | Every piece must pass outside the hub (P3, "over the hub")                            |
| Two posts could make a belt cross itself                                                               | Self-crossing refused ("crosses itself")                                              |
| Re-routing threw away carefully placed posts                                                           | Posts are kept when they still fit the new target (P5)                                |
| A blocked link needed a separate bend afterwards                                                       | Pause while dragging a link to pin a post (P2)                                        |
| A post near a machine could not be grabbed                                                             | Posts are hit-tested before machines                                                  |
| The finger hid the post being placed                                                                   | The new post rides above the finger; the held belt lights up                          |
| The removal zone was too small when zoomed out                                                         | Scaled with zoom (16 px)                                                              |
| A bad `via` in a save could reject the whole save                                                      | It straightens that belt instead (P7)                                                 |
| Two pieces crossing the same belt could share a plate key                                              | Plate keys include the piece                                                          |
| Found in the phone play-through after the review: releasing a new or moved post never applied the bend | Fixed (the release read the gesture after clearing it); the Playwright test covers it |

## Rejected

- **Free-form drawn belts:** rejected earlier (fiddly on a phone). Posts keep the belt a few straight pieces.
- **Charging for posts or length:** rejected earlier (makes experimenting costly).
- **More than 2 posts:** more pieces make the belt harder to read and the plate search slower; revisit if the playtest wants it.
- **Bridges:** still deferred; posts make most crossings avoidable.

## Open (for the playtest)

- Whether hold-to-bend is discoverable on a phone from the hint alone, and whether it ever fires when the player meant to pan.
- Whether posts make untangling feel like skill or just remove the puzzle.
