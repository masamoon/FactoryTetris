# Manual stockpile input — independent adversarial review

20 September 2026. This review covers Factorio-style manual processor loading as an early-game and softlock recovery action.

## Product decision override

The first review rejected renewable loading because periodic taps could compete with conveyor-fed processor inputs, and passed only a one-use prime. The user explicitly rejected that restriction: processors must always accept compatible stockpile input when they have room. Limited manual throughput is intentional, and inability to recover is the more important failure. Repeatability is therefore fixed product scope; belt bypass remains an accepted risk to measure rather than a veto.

## Final verdict: PASS within the fixed scope

- Smelters accept only ore and assemblers accept only plates. Drills, belts, outputs, parts and mismatched resources are ineligible. Every press resolves the machine by id and revalidates the live state.
- One press completes the next queued two-item recipe pair: 0→2, 1→2, 2→4 or 3→4. A full four-item input rejects the command. If collection cannot complete the pair, nothing moves.
- Loading is allowed while the processor is already working, paused or blocked by a full output. Inputs remain in the real bounded queue until the simulation can consume them.
- Exact stock is subtracted and the same resources are appended to the input. Invalid calls mutate neither state nor history.
- Successful loads save immediately but create no undo checkpoint. This prevents repeated manual servicing from evicting the 40 construction snapshots. Undoing the preceding build still restores its complete snapshot and rewinds all later loading and production.
- The inspector shows live buffer counts, a dynamic **Load 1/2** button, exact disabled reasons and a 40px phone target. It calls this manual input and keeps right-side belts framed as automation.

## Risks and evidence

Manual loading is recovery, not automatic production. A short clip must not imply that a manual press demonstrates sustained supply. Human play must determine whether manual labor naturally motivates conveyor automation, whether it actually prevents the reported early softlock, and whether players strand construction resources in queued inputs. If accidental queued inputs remain a problem, an explicit compatible return action requires its own review; per-load undo history is not the remedy.

Automated evidence covers all queue parities, insufficient stock, incompatible targets, rapid repeat calls, processing and output-blocked states, exact conservation, persistence, unchanged history and whole-state build undo. Those checks establish correctness, not balance or player comprehension.
