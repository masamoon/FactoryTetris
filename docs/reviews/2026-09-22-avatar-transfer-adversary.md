# Manual-transfer avatar — independent adversarial review

## Verdicts

| Decision                         | Verdict                           | Reason                                                                                                                         |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Player-piloted spaceship         | **REJECT**                        | It implies landing, piloting and exploration at a scale that competes with the machinery and dock.                             |
| Ground robot                     | **REJECT**                        | It introduces pathfinding, collision, stranding and camera-follow expectations, and is easily hidden by the side-view factory. |
| Compact flying service drone     | **PASS for a bounded experiment** | It makes real manual transfer readable without changing remote input into character locomotion.                                |
| Collection-to-processor delivery | **PASS**                          | It supports bootstrap and recovery while preserving belts as the sustained supply system.                                      |
| Machine-output pickup            | **REJECT for this scope**         | It would bypass conveyor routing, output backpressure and collection delivery.                                                 |

## Passing constraints

- The drone is a remote courier/tool, no larger than roughly half a grid cell, never a steerable avatar and never an input blocker.
- Tap COLLECTION to enter delivery targeting; only compatible destinations glow. Tapping a destination dispatches one item when its current input is odd, otherwise two, up to the real four-item cap.
- Stock decrements when cargo enters the drone. Processor input increments only when that same cargo arrives. No decorative item may imply nonexistent inventory.
- The deterministic route may cross belts, rails and machines but not unexcavated terrain. Cargo, target, route progress, reservations and return state are saved.
- Target slots are reserved during outbound travel. Courier arrival resolves before belt transfer, and belt acceptance counts input plus reservations. Processing then runs in the same tick.
- The factory and courier share the live 100 ms clock. Explicit pause, construction planning, dialogs and document hiding pause both.
- A dispatch creates no undo checkpoint; a complete-state construction undo still rewinds later courier and production state.

## Concrete failure cases to test

- A belt and drone target the last processor slot on the same transfer tick.
- The app saves outbound, returning and immediately after delivery, then resumes exactly.
- A full or incompatible processor and insufficient stock reject without removing cargo.
- Repeated manual hauling becomes a dominant strategy rather than a recovery tool.
- At 360 px portrait width the drone, cargo and highlighted destination remain legible without obscuring machinery.

## Truthful clip scenario

Start from a disclosed prepared save with two plates, an empty assembler feeding a belt to collection, and an exhausted drill. Tap COLLECTION, tap the assembler, show both plates entering the drone and travelling to the reserved input, then show the assembler produce a real part, the belt deliver it, and the player spend it on the drill extension. Keep the capture real-time and retain an uncut witness.
