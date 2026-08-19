# One-Shot Factory vertical slice

## Product thesis

Gridforge is strongest as a factory deckbuilding puzzle: draft awkward operator shapes, assemble a compact production plan, then commit and watch it prove itself. The factory should feel authored by the player before production starts and consequential once it does.

The central tension is therefore not “can I farm enough score?” It is “can this one layout satisfy every order, and how elegantly can it do so?”

## This slice

1. **Orders are mandatory.** Shipped value is a payout input, not an alternate victory condition. A round clears only after every primary delivery order is complete.
2. **Planning has room to breathe.** Normal Factory Shift rounds are untimed. Surge and Boss rounds remain timed spikes that test throughput.
3. **Production is a commitment.** Starting production locks new construction and deletion. The player gets one emergency rewire per round, spent by picking up an existing machine and placing it again.
4. **The objective is singular.** The live HUD tracks completed orders. Revenue is shown as shipped value and converted into shop cash after the round; it is not presented as a second target.
5. **Unfair judgment is removed.** Flow scoring and the factory grade are cut until the game can measure efficiency against a board-specific baseline.
6. **Dominant anti-play is removed.** Completed delivery docks no longer advance rewards, and the oversized “no paid belts” payout is replaced by a transparent construction-spend summary.

## Acceptance criteria

- Completing all primary orders is the only way to clear the round.
- The live objective panel shows completed orders, not a revenue quota.
- Factory Shift rounds show `UNTIMED`; Surge and Boss rounds retain countdowns and timeout failure.
- New machines, quick belts, and deletion are blocked during production.
- Picking up one existing non-fixed machine during production spends the emergency rewire; a second pickup is rejected.
- Delivery timing does not multiply score and round clear does not assign an arbitrary grade.
- Completed delivery nodes award no repeat-delivery revenue.
- The rules module has deterministic automated tests and the production build succeeds.

## Deferred follow-ups

- Add a limited test-pulse mode before commitment.
- Author operation and topology contracts that demand specific operator families and routing structures.
- Give each Boss audit a bespoke rule rather than only stronger pacing numbers.
- Reduce the upgrade pool to fewer, more transformative factory archetypes.
- Bring the engagement simulator into parity with the live economy and order rules.
