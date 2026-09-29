# Rockhopper redo: adversarial reviews (2026-09-29)

## Request

The user asked for a complete redo of the game: "it feels terrible to play". The brief was:

- a tiny ship or robot mining asteroids, first by hand and then with machinery;
- a cross between an automation game and an incremental game;
- visually readable from a 20-second video, like typical mobile "fake game ads" (their readability, not their deception);
- touch-first, with a minimum of buttons and panels;
- a visual identity found with Claude Design.

The visual identity is the Claude Design canvas "Rockhopper — Visual Identity". It holds the identity sheet, cast and materials, a phone frame and a 20-second storyboard. The design is in [../ROCKHOPPER_DESIGN.md](../ROCKHOPPER_DESIGN.md).

Every verdict below came from an independent adversarial agent. None of it is evidence of enjoyment, retention or balance for human players.

## Design rounds

| Round | Scope                | Result                                                                             |
| ----- | -------------------- | ---------------------------------------------------------------------------------- |
| 1     | R1–R13 plus the clip | **PASS:** R10, R12 and R13. **REVISE:** everything else.                           |
| 2     | Revision 2           | **PASS:** R2, R4, R7, R8 and R10–R13. **REVISE:** R1, R3, R5, R6, R9 and the clip. |
| 3     | Revision 3           | **PASS:** all of R1–R13. The clip passes for the design-stage plan only.           |

Main round 1 findings:

- Concentric rings wasted a portrait screen and shrank cells to about 2.5 px.
- A drill with limited reach stalled at about 22 % of a rock.
- Every belt into an unlimited hub made routing cosmetic, and smelting always won.
- Gesture conflicts: long-press versus drag.
- A single tap spent a whole unlock.

Resolutions:

- stacked tiers with a zoom floor;
- slot-anchored drills with no reach cap and rim sockets;
- limited hub docks, with smelters as merge points;
- the gesture map;
- two-tap unlocks and a hold-to-sell button.

Round 2 findings and resolutions:

- A still finger could stall: the beam now falls back to the nearest cell on the whole rock.
- The first drill must not earn less than the laser.
- Machines left unlinked now retry, smelters first.
- Hitting the dock ceiling.
- Smelter intake is round-robin.
- The belt-speed upgrade was a trap and was removed.
- The tier heights were compressed.

## Post-implementation review (round 4)

Decisions made while building, and bugs found in the working build:

| #      | Decision                                          | Verdict    | Resolution                                                                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1     | Retuned hardness and prices                       | **REVISE** | Belts capped at about 6 items/s, so drill upgrades from about level 4 and smelter upgrades from about level 5 were dead purchases, and the pace was about twice as fast as the targets. Now belt speed scales with the machine's level, drills top out at level 7, the bot buys docks, and prices are retuned. The pacing test holds the design's own targets again. |
| D2     | Smelter splices into a full hub                   | PASS       | The spliced belt now flashes.                                                                                                                                                                                                                                                                                                                                        |
| D3     | Docks on the upper arc                            | PASS       | —                                                                                                                                                                                                                                                                                                                                                                    |
| D4     | One pop stream                                    | **REVISE** | Pops overlapped. Now one collecting pop sits above the dock arc and released pops jump away.                                                                                                                                                                                                                                                                         |
| D5     | Framing only unlocked slots, with edge price tags | **REVISE** | Unlock bubbles could open off-screen, and pinch broke the 0.55 floor. Now the bubble anchors to the drawn tag and clamps, and zoom clamps at 0.55.                                                                                                                                                                                                                   |
| D6     | Tray and hint reveal                              | PASS       | Resize now ignores the tray transform.                                                                                                                                                                                                                                                                                                                               |
| D7     | No level numbers in the world                     | PASS       | Conditional on D1, which is resolved.                                                                                                                                                                                                                                                                                                                                |
| D8     | Income plateau before T3                          | **REVISE** | The cause was throughput and bot behaviour, not respawn. D1 fixes it: income now rises steadily through about 30 minutes.                                                                                                                                                                                                                                            |
| Clip A | Segment A capture                                 | **REVISE** | Touch was invisible, the hint hand was misleading, the drag was too fast, and there was no input recording. Now `?clip` shows real touches and hides the hints, a real CDP touch drag takes about 0.85 s, every line logs wall and sim time, and a command-log replay must be identical.                                                                             |

Bugs fixed from the same review:

- **The laser persisted through saves:** a reload kept mining with no finger down. The laser is no longer saved, and blur or hide now ends gestures.
- **Save validation** now checks machine slot, socket, level, buffer and queue.
- **The 300 ms tap limit** is enforced.
- **Vibration** waits for user activation.

## Re-review of the fixes (round 5)

All five REVISE items now pass:

- **D1 — PASS.** Belts keep up at every level, and pacing meets the design's targets.
- **D4 — PASS.** Pops are readable. They still overlap the hub-side smelters, which is left as a playtest note.
- **D5 — PASS.**
- **D8 — PASS.** Income rises from 14 to about 1,470 credits/s over 40 minutes. The flat stretches are short: about 2 minutes and about 4 minutes before T3.
- **Clip A — PASS.** The capture uses real touch input, draws visible touch dots, hides the tutorial hands, and sim time tracks wall time within 0.01 s. The replay witness is identical.

At the reviewer's request, the clip tool now also saves stills with a finger down (`rockhopper-clip-02s-holding.png` and `rockhopper-clip-05s-dragging.png`).

Flags that do not block:

- **Fast belts may strobe.** High-level belts move about 30 units per tick, which could blur the developed-factory footage. Check this before capturing segment B.
- **Marks in the 30-minute still.** The dashed teal lines off the left edge and the large green arc are intended:
  - the lines are the tractor beams of a rock being towed in;
  - the arc is a slot's respawn progress ring.

  Whether they read clearly is a playtest question.

## Belt readability at high speed (round 6)

The user asked for belts that stay readable at high speed. With speed scaling by level, a level-7 belt moved about 890 u/s, roughly 30 u per tick against 13 u spacing, so chunks strobed.

**Proposal B1, stacked belts:**

- belt speed capped at 200 u/s;
- upgraded machines ship bundles of up to 4 chunks.

**First verdict: REVISE.**

- 200 u/s is still about half the spacing per frame at 25 fps, and the dash would appear to run backwards.
- Drills were limited to one break per tick, so bundles never grew below level 7.
- Smelter levels 7 and 8 both ran at 2 ticks per bar.
- Bundle contents were not validated on load.

**Revisions:**

- The speed cap is 135 u/s, and the dash period is 18 u.
- Leftover work and time carry across ticks for drills and smelters.
- The tests now check:
  - per-frame travel;
  - the dash;
  - mean bundle size growing with level;
  - every smelter level being a real speed-up;
  - corrupt bundles being rejected.
- Saves validate ores.
- The pacing bot was rerun.
- A 25 fps capture of a factory with every drill at level 7 and every smelter at level 8 was reviewed.

**Re-verdict: PASS** for belt speed, bundles, the smelter output buffer and save migration.

Measured mean bundle size, averaged over three seeds:

| Level | Mean bundle size |
| ----- | ---------------- |
| L3    | 1.00             |
| L4    | about 1.08       |
| L5    | about 1.4        |
| L6    | about 1.95       |
| L7    | about 2.75       |

At every level, throughput was about 100 % of the drill's nominal rate and no ticks had a full buffer.

Accepted risks:

- **Pure rock at L7 runs at 93 % of belt capacity.** Any later change to drill rate, the belt cap or spacing must re-check this.
- **Clutter near the hub.** The late-game area around the hub is dense from routing, not from bundles.
- **Motion not yet watched.** A person still needs to watch [the 25 fps max-level capture](evidence/rockhopper-belts-max-level-25fps.webm) in motion before claiming late-game clip readability. Its still is [here](evidence/rockhopper-belts-max-level.png); it is a prepared save with every machine at max level.

## Open questions (need people, not bots)

- Is holding the laser late in the game a chore? It adds about 14–23 % to income at 20 minutes.
- Do players notice or dislike the automatic splice?
- Can players tell upgraded machines apart without level numbers?
- Does 9-dock crowding stay readable?
- How does human pacing compare with the bot's upper bound?
- What is the late-game goal after T4?
- What frame rate do real phones reach? It has not been measured on devices.
