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

Re-review of the fixes: see the next section.

## Open questions (need people, not bots)

- Is holding the laser late in the game a chore? It adds about 14–23 % to income at 20 minutes.
- Do players notice or dislike the automatic splice?
- Can players tell upgraded machines apart without level numbers?
- Does 9-dock crowding stay readable?
- How does human pacing compare with the bot's upper bound?
- What is the late-game goal after T4?
- What frame rate do real phones reach? It has not been measured on devices.
