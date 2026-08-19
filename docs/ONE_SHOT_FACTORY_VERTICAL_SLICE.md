# One-Shot Factory vertical slice

## Product thesis

Gridforge is strongest as a factory deckbuilding puzzle: draft awkward operator shapes, assemble a compact production plan, then commit and watch it prove itself. The factory should feel authored by the player before production starts and consequential once it does.

The central tension is therefore not “can I farm enough score?” It is “can this one layout satisfy every order, and how elegantly can it do so?”

## This slice

1. **Orders are mandatory.** Revenue is a performance target and payout input, not an alternate victory condition. A round clears only after every primary delivery order is complete.
2. **Planning has room to breathe.** Normal Factory Shift rounds are untimed. Surge and Boss rounds remain timed spikes that test throughput.
3. **Production is a commitment.** Starting production locks new construction and deletion. The player gets one emergency rewire per round, spent by picking up an existing machine and placing it again.
4. **Elegance is legible.** Every clear receives a factory grade based on material efficiency, occupied space, and best flow streak.
5. **Dominant anti-play is removed.** Completed delivery docks no longer farm revenue, and the oversized “no paid belts” payout is replaced by a transparent construction-spend summary.

## Acceptance criteria

- Reaching the revenue target with unfinished orders does not clear the round.
- Completing all primary orders clears the round even if revenue is below target.
- Factory Shift rounds show `UNTIMED`; Surge and Boss rounds retain countdowns and timeout failure.
- New machines, quick belts, and deletion are blocked during production.
- Picking up one existing non-fixed machine during production spends the emergency rewire; a second pickup is rejected.
- Round-clear feedback and the economy summary show the same material/space/flow grade.
- Completed delivery nodes award no repeat-delivery revenue.
- The rules module has deterministic automated tests and the production build succeeds.

## Deferred follow-ups

- Add a limited test-pulse mode before commitment.
- Author operation and topology contracts that demand specific operator families and routing structures.
- Give each Boss audit a bespoke rule rather than only stronger pacing numbers.
- Reduce the upgrade pool to fewer, more transformative factory archetypes.
- Bring the engagement simulator into parity with the live economy and order rules.
