# Contracts System — Design

Date: 2026-05-16
Status: Approved (pending spec review)

## Summary

Replace the hidden Era/Transcendence threshold system with an explicit, timed
**Contract** loop. A run is a sequence of Contracts. Each Contract is a single
demand — _deliver N units of tier ≥ T within a time budget_ — surfaced with a
visible progress bar and countdown. Clearing a Contract fires the existing
transcend effects (grid growth, tier unlock, chip placement). Running out of
time ends the run. Momentum is demoted from a death timer to pure scoring juice.
A per-Contract **boon** pick (build-defining) replaces the old score-milestone
upgrade trigger.

The era system stays as the math engine, untouched. **Era == Contract number.**
We wrap `eraConfig.js`, we do not replace it.

## Goals

- Make the win/lose condition visible and fair (you see the timer; no hidden checks).
- Preserve all transcend effects exactly as-is.
- Turn momentum into a scoring/juice mechanic, not a fail state.
- Add in-run variety via a small curated boon pool.

## Non-Goals

- No changes to the tier/grid/chip math in `eraConfig.js`.
- No second fail state beyond the Contract timer.
- Not shipping the full 12–15 boon pool now (6 starter boons; expand later).

## 1. Era = Contract — State Machine

Contract state wraps the existing era math. **Nothing in `eraConfig.js` changes**;
new tuning functions are _added_ there (Section 2).

```
Contract = {
  number:       currentEra,                 // Era == Contract number
  requiredTier: getTranscendTier(era),      // existing, unchanged
  quantity:     getDeliveryThreshold(era),  // re-curved (Section 2)
  timeBudget:   getContractTimeBudget(era), // new (Section 2)
  delivered:    0,
}
```

Run states:

- `CONTRACT_ACTIVE` — countdown running, deliveries fill the bar.
- `CONTRACT_CLEARED` — brief celebration tween.
- `GRACE` — boon → chip → ship-when-ready (Section 3).
- `RUN_OVER` — terminal; `endGame()`.

Transitions:

- Qualifying delivery: a delivered resource with `tier >= requiredTier`
  increments `delivered`. **Tier-or-better counts** (the current
  `onHighTierDelivery` requires exact tier — that exact-match restriction is
  removed for Contract progress).
- `delivered >= quantity` while `CONTRACT_ACTIVE` → `CONTRACT_CLEARED` →
  call existing **`triggerTranscendence()` unchanged**.
- Countdown reaches zero while `CONTRACT_ACTIVE` → `RUN_OVER` → `endGame()`.

The per-Contract countdown is a `Phaser.Time` event sized to `timeBudget`.
It is paused during `GRACE`, the boon modal, and chip placement; it starts
(for the next Contract) only when the player accepts the ship-when-ready prompt
or the 10s auto-accept fires.

Code to remove (the hidden path):

- `checkTranscendCondition()`, `onHighTierDelivery()`, `updateTranscendProgress()`'s
  old text format, `canTranscend` flag, `showTranscendButton()`/`hideTranscendButton()`,
  and the manual **TRANSCEND!** button at `GameScene.js:550`.
- `trackDelivery()`/throughput → chip-emission-rate logic **stays** (it feeds
  `triggerTranscendence()`'s chip grade and is unrelated to the hidden gate).

## 2. Escalation Numbers

Re-curve quantity and add a time budget, both in `eraConfig.js` with named,
tunable constants.

```js
// quantity: generous start, ~+25%/contract
const CONTRACT_N_BASE = 4;
const CONTRACT_N_GROWTH = 1.25;
getDeliveryThreshold(era) = round(CONTRACT_N_BASE * CONTRACT_N_GROWTH ** (era - 1));
// → 4, 5, 6, 8, 10, 12, 15, 19, ...

// time budget (seconds): grows slower than N
const CONTRACT_T_BASE = 55;
const CONTRACT_T_GROWTH = 1.12;
getContractTimeBudget(era) = round(CONTRACT_T_BASE * CONTRACT_T_GROWTH ** (era - 1));
// → 55, 62, 69, 77, 87, 97, ...
```

Required throughput `N/T` rises ~+12%/contract — the compounding squeeze.
Early contracts are deliberately loose (N=4 in 55s) so the player learns and
builds; the wall is far enough out that a good factory feels powerful first.

`getDeliveryThreshold` keeps its existing signature/name (it is the tuning
hook the rest of the codebase already calls).

## 3. Grace Beat Sequence

On `CONTRACT_CLEARED`:

1. Brief celebration tween + existing `round-complete` sound.
2. `triggerTranscendence()` runs as today through grid resize + tier unlock.
3. **Boon modal** — repurposed `UpgradeScene`, pick 1 of 3 from the boon pool
   (Section 5). Blocking; no timeout (requires input).
4. **Chip placement** — existing `enterChipPlacementMode` /
   `confirmChipPlacement` flow on the new grid. Blocking.
5. **Ship when ready** — untimed prompt: "Contract N cleared — ship when
   ready". A 10s auto-accept timer starts **after the chip is placed**.
   Accept (or timeout) → `finalizeTranscendence()` completes → next Contract's
   countdown begins.

Ordering rationale: boon before chip so the player's layout decision can react
to the boon they just took. Only the final ready-pause auto-starts; the two
input-required steps never time out.

## 4. Momentum Demotion

- Remove the death checks: `currentMomentum <= 0 → endGame()` at
  `GameScene.js:264` and `GameScene.js:3037`.
- Keep momentum decay, the combo threshold, flow-surge, and the HUD bar —
  momentum is now a pure score-multiplier / juice mechanic that never ends
  the run.
- Keep the `finalizeTranscendence` momentum bump (`~65` floor refill) as
  harmless celebratory juice.

## 5. Boon System + 6 Starter Boons

Boons reuse `UpgradeManager`'s existing **procedural upgrade** mechanism
(`activeProceduralUpgrades`, per-config `effect(manager)`, `rarity`) — it
already supports one-off, non-tiered effects with side-effecting `effect`
functions.

- New config `src/config/boons.js` defines the boon pool.
- `getUpgradeChoices()` draws from the boon pool, **replacing** the tiered
  `+stat` upgrades in the choice set.
- The score-milestone / banked-upgrade trigger is removed entirely:
  `queueUpgradeChoice()`, `pendingUpgradeChoices`, `advanceNextUpgradeMilestone()`,
  the **UPGRADE READY** button (`GameScene.js:538`/`2306`), and the
  score-milestone scheduling. The **only** boon source is clearing a Contract
  (1 Contract = 1 boon).

Starter pool (6, build-defining):

| Boon               | Effect                                                      | Hook                                                                |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Heavy Haulers      | Conveyors carry 2 items; processors 15% slower              | conveyor capacity + processor speed modifier                        |
| Every Fifth Counts | Every 5th Contract delivery counts as 2                     | delivery-tally hook in Contract progress                            |
| Overclock Surge    | First splitter output each cycle is +1 tier                 | splitter output tier, once-per-cycle flag                           |
| Lean Lines         | +25% conveyor speed; −1 max inventory/machine               | conveyor speed modifier + inventory cap                             |
| Bulk Contracts     | Contract N −20%, time budget −15%                           | applied in `getDeliveryThreshold`/`getContractTimeBudget` consumers |
| Momentum Engine    | While momentum ≥ combo threshold, Contract fill +20% faster | momentum-gated multiplier on delivery increment                     |

~3 boons need small new modifier hooks (conveyor capacity, delivery tally,
momentum-gated fill); the rest reuse existing modifier reads. Each effect is
read at a single known site.

## 6. Contract HUD

- Replace the `Transcend: L4 x/y` text with a Contract banner:
  requirement `Deliver N × L{tier}+`, a progress bar `delivered / N`, and a
  countdown bar/ring that switches to an urgent state under ~20% time
  remaining.
- `GRACE`: a "Contract N cleared — ship when ready" panel with the visible
  10s auto-accept countdown (post chip placement).

## Risks / Tuning Flags

- **Early contracts may feel toothless** without momentum death — the only
  pressure on contracts 1–3 is a loose timer. Counterweights: the +12%
  throughput squeeze and boons #5/#6. Mitigation if it reads soft in
  playtest: lower `CONTRACT_T_BASE` (tighten the timer) rather than add a
  second fail state.
- Boons are balance surface; ship 6 curated, expand only after playtest.
- Removing the score-milestone upgrade stream removes a reward cadence;
  acceptable because the Contract cadence replaces it 1:1.

## Out of Scope / Future

- Full 12–15 boon pool.
- Boon rarity weighting / synergy tuning.
- Any change to tier color/name/points math.
