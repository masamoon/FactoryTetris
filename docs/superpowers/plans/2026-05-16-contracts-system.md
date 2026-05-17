# Contracts System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hidden Era/Transcendence threshold with an explicit, timed Contract loop; demote momentum to scoring juice; add a per-Contract boon pick.

**Architecture:** A Contract-state layer inside `GameScene` wraps the existing `eraConfig.js` math (era == contract number). Clearing a Contract calls the existing `triggerTranscendence()` unchanged; the per-Contract countdown reaching zero calls `endGame()`. Boons reuse `UpgradeManager`'s procedural-upgrade mechanism and replace the score-milestone upgrade trigger.

**Tech Stack:** Phaser 3.60, JavaScript, Webpack. No test runner — this repo verifies via `npm start` + console logs (same convention as `docs/superpowers/plans/2026-05-14-piece-traits.md`).

**Spec:** `docs/superpowers/specs/2026-05-16-contracts-system-design.md`

**Conventions for every task:**

- Verify by running `npm start` (dev server at http://localhost:8084) and reading the browser console unless a task says otherwise.
- Commit after each task with the message shown.
- Do not touch the tier/grid/chip math in `eraConfig.js` (only ADD the two new functions in Task 1).

---

## Task 1: Re-curve quantity + add time budget in eraConfig.js

**Files:**

- Modify: `src/config/eraConfig.js:50-60` (the `TRANSCEND_THRESHOLDS` object)

- [ ] **Step 1: Add tunable constants and rewrite the threshold; add the time-budget function**

Replace the existing `TRANSCEND_THRESHOLDS` block (lines 50-60) with:

```js
// === Contract tuning (Era == Contract number) ===
// Quantity: generous start, ~+25% per contract
export const CONTRACT_N_BASE = 4;
export const CONTRACT_N_GROWTH = 1.25;
// Time budget (seconds): grows slower than N so required throughput compounds
export const CONTRACT_T_BASE = 55;
export const CONTRACT_T_GROWTH = 1.12;

// Transcendence thresholds
export const TRANSCEND_THRESHOLDS = {
  // Units of qualifying resource a Contract demands. era == contract number.
  getDeliveryThreshold: (era) => Math.round(CONTRACT_N_BASE * Math.pow(CONTRACT_N_GROWTH, era - 1)),
};

// Per-Contract time budget in seconds. Grows slower than the quantity curve.
export function getContractTimeBudget(era) {
  return Math.round(CONTRACT_T_BASE * Math.pow(CONTRACT_T_GROWTH, era - 1));
}
```

- [ ] **Step 2: Verify the curves**

Run: `node -e "const g=1.25,b=4,tg=1.12,tb=55;for(let e=1;e<=8;e++)console.log('C'+e,'N='+Math.round(b*g**(e-1)),'T='+Math.round(tb*tg**(e-1))+'s')"`

Expected output:

```
C1 N=4 T=55s
C2 N=5 T=62s
C3 N=6 T=69s
C4 N=8 T=77s
C5 N=10 T=87s
C6 N=12 T=97s
C7 N=15 T=109s
C8 N=19 T=122s
```

- [ ] **Step 3: Commit**

```bash
git add src/config/eraConfig.js
git commit -m "feat(contracts): re-curve quantity + add per-contract time budget"
```

---

## Task 2: Contract state model + qualifying-delivery hook

Introduces the Contract object and switches delivery progress to "tier ≥ requiredTier". The hidden-path methods are replaced in this task; the countdown timer comes in Task 3.

**Files:**

- Modify: `src/scenes/GameScene.js` — imports (line ~9), state init (~90), the `=== TRANSCENDENCE SYSTEM METHODS ===` block (~2417-2549), `finalizeTranscendence` (~2834-2838)

- [ ] **Step 1: Import the new time-budget function**

In the `eraConfig` import block near `GameScene.js:9-11`, add `getContractTimeBudget`:

```js
import {
  getGridSizeForEra,
  getTranscendTier,
  TRANSCEND_THRESHOLDS,
  getContractTimeBudget,
} from '../config/eraConfig.js';
```

(Keep `CHIP_CONFIG` / any other existing members of that import as-is.)

- [ ] **Step 2: Add Contract state init**

Find `this.deliveredHighTierResources = 0;` at `GameScene.js:90`. Immediately after it add:

```js
// === Contract system state ===
// runState: 'CONTRACT_ACTIVE' | 'CONTRACT_CLEARED' | 'GRACE' | 'RUN_OVER'
this.runState = 'CONTRACT_ACTIVE';
this.contract = null; // built by buildContract()
this.contractTimerEvent = null; // Phaser.Time.TimerEvent for the countdown
this.contractDeliveryCount = 0; // for "Every Fifth Counts" boon tally
```

- [ ] **Step 3: Replace the hidden-path methods**

Replace the whole block from `checkTranscendCondition()` (`GameScene.js:2422`) through the end of `onHighTierDelivery()` (the closing brace at ~`2549`) with the Contract methods below. Keep `trackDelivery()` and `calculateThroughput()` (they sit inside that range at ~2501-2537) — paste them back unchanged inside the new block.

```js
  // === CONTRACT SYSTEM ===

  buildContract() {
    const era = this.currentEra;
    this.contract = {
      number: era,
      requiredTier: getTranscendTier(era),
      quantity: TRANSCEND_THRESHOLDS.getDeliveryThreshold(era),
      timeBudget: getContractTimeBudget(era),
      delivered: 0,
    };
    this.contractDeliveryCount = 0;
    return this.contract;
  }

  startContractTimer() {
    if (this.contractTimerEvent) {
      this.contractTimerEvent.remove();
      this.contractTimerEvent = null;
    }
    const ms = this.contract.timeBudget * 1000;
    this.contractTimerEvent = this.time.addEvent({
      delay: ms,
      callback: this.onContractTimeout,
      callbackScope: this,
    });
    this.runState = 'CONTRACT_ACTIVE';
    this.updateContractHud();
  }

  onContractTimeout() {
    if (this.runState !== 'CONTRACT_ACTIVE') return;
    this.runState = 'RUN_OVER';
    console.log('[CONTRACT] Time expired — run over');
    this.endGame();
  }

  // Returns remaining seconds on the active contract (0 if none / paused done)
  getContractTimeRemaining() {
    if (!this.contractTimerEvent) return this.contract ? this.contract.timeBudget : 0;
    const remMs = this.contractTimerEvent.delay - this.contractTimerEvent.getElapsed();
    return Math.max(0, remMs / 1000);
  }

  // Called by DeliveryNode for every level/purity delivery.
  onContractDelivery(tier) {
    if (this.runState !== 'CONTRACT_ACTIVE' || !this.contract) return;
    if (tier < this.contract.requiredTier) return;

    this.contractDeliveryCount++;
    // "Every Fifth Counts" boon: every 5th qualifying delivery counts double
    let credit = 1;
    if (
      this.upgradeManager &&
      this.upgradeManager.isProceduralUpgradeActive('boon_every_fifth') &&
      this.contractDeliveryCount % 5 === 0
    ) {
      credit = 2;
    }
    // "Momentum Engine" boon: faster fill while momentum is at combo threshold
    if (
      this.upgradeManager &&
      this.upgradeManager.isProceduralUpgradeActive('boon_momentum_engine') &&
      this.currentMomentum >= this.comboThreshold
    ) {
      credit = Math.ceil(credit * 1.2);
    }

    this.contract.delivered += credit;
    this.updateContractHud();

    if (this.contract.delivered >= this.contract.quantity) {
      this.clearContract();
    }
  }

  clearContract() {
    if (this.runState !== 'CONTRACT_ACTIVE') return;
    this.runState = 'CONTRACT_CLEARED';
    if (this.contractTimerEvent) {
      this.contractTimerEvent.remove();
      this.contractTimerEvent = null;
    }
    console.log(`[CONTRACT] Contract ${this.contract.number} cleared`);
    // canTranscend is required by triggerTranscendence(); set it here.
    this.canTranscend = true;
    this.triggerTranscendence();
  }

  // --- throughput tracking (unchanged, moved verbatim) ---
  trackDelivery(tier) {
    const transcendTier = getTranscendTier(this.currentEra);
    if (tier !== transcendTier) {
      return;
    }
    const now = this.time.now;
    this.deliveryHistory.push(now);
    const cutoff = now - this.deliveryHistoryWindow;
    this.deliveryHistory = this.deliveryHistory.filter((t) => t > cutoff);
  }

  calculateThroughput() {
    if (this.deliveryHistory.length < 2) {
      return 0;
    }
    const now = this.time.now;
    const cutoff = now - this.deliveryHistoryWindow;
    const recentDeliveries = this.deliveryHistory.filter((t) => t > cutoff);
    if (recentDeliveries.length === 0) {
      return 0;
    }
    const windowSeconds = this.deliveryHistoryWindow / 1000;
    return recentDeliveries.length / windowSeconds;
  }
```

- [ ] **Step 4: Point DeliveryNode at the new hook**

In `src/objects/DeliveryNode.js`, there are two identical blocks (lines ~167-170 and ~197-200) calling `onHighTierDelivery`. In **both**, replace:

```js
if (this.scene.onHighTierDelivery) {
  this.scene.onHighTierDelivery(level);
}
```

with (use `level` in the first block, `purity` in the second — match the existing variable on the line above it):

```js
if (this.scene.onContractDelivery) {
  this.scene.onContractDelivery(level);
}
```

Leave the `trackDelivery` calls right above them untouched.

- [ ] **Step 5: Remove stale resets and the manual TRANSCEND button**

In `finalizeTranscendence()` (`GameScene.js:2834-2838`) delete the lines:

```js
this.deliveredHighTierResources = 0;
this.canTranscend = false;
this.hideTranscendButton();
```

and keep `this.deliveryHistory = [];`.

Delete the TRANSCEND button block at `GameScene.js:549-560` (from the `// Transcend Button` comment through `this.addToUI(this.transcendButton.text);`).

- [ ] **Step 6: Build the first contract on run start**

Find the run-state init near `GameScene.js:189-194` (`this.score = 0;` … `this.gameOver = false;`). After `this.gameOver = false;` add:

```js
this.buildContract();
```

(The timer is started in Task 3 Step 3 once the HUD exists; for now the contract object just needs to exist so deliveries don't crash.)

- [ ] **Step 7: Verify**

`npm start`, open http://localhost:8084, start a run, deliver qualifying resources. Console shows `[CONTRACT] Contract 1 cleared` after the 4th qualifying delivery, the existing transcendence flow (grid grow / chip placement) still fires, and there is no console error about `onHighTierDelivery`/`transcendButton`. The old "TRANSCEND!" button is gone.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/GameScene.js src/objects/DeliveryNode.js
git commit -m "feat(contracts): contract state model + qualifying-delivery hook"
```

---

## Task 3: Contract HUD + start/pause the countdown

**Files:**

- Modify: `src/scenes/GameScene.js` — the transcend-progress text at ~`385-399`, add `updateContractHud()`, wire timer start, pause logic in `togglePause`/`showUpgradeScreen`-equivalents and chip mode.

- [ ] **Step 1: Repurpose the progress text into a Contract banner**

Replace the `// Transcend Progress Display` block (`GameScene.js:389-399`) with:

```js
// Contract Banner
this.contractText = this.add
  .text(centerX, currentY, '', {
    fontFamily: 'Arial',
    fontSize: 13,
    color: '#ffd966',
    align: 'center',
  })
  .setOrigin(0.5)
  .setScrollFactor(0);

currentY += spacing * 0.5;

this.contractTimerText = this.add
  .text(centerX, currentY, '', {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#88ccff',
    align: 'center',
  })
  .setOrigin(0.5)
  .setScrollFactor(0);
```

(Delete the trailing `this.updateTranscendProgress();` line that was in the old block.)

- [ ] **Step 2: Add the HUD updater**

Add this method next to the Contract methods from Task 2:

```js
  updateContractHud() {
    if (!this.contractText || !this.contract) return;
    const c = this.contract;
    if (this.runState === 'GRACE' || this.runState === 'CONTRACT_CLEARED') {
      this.contractText.setText(`Contract ${c.number} cleared`);
      this.contractTimerText.setText('Ship when ready');
      return;
    }
    this.contractText.setText(
      `Contract ${c.number}: deliver ${Math.min(c.delivered, c.quantity)}/${c.quantity}  ·  L${c.requiredTier}+`
    );
    const rem = Math.ceil(this.getContractTimeRemaining());
    const urgent = rem <= Math.max(5, c.timeBudget * 0.2);
    this.contractTimerText.setColor(urgent ? '#ff5555' : '#88ccff');
    this.contractTimerText.setText(`⏱ ${rem}s`);
  }
```

- [ ] **Step 3: Tick the timer text in update() and start the first timer**

In `update(time, delta)` find the trait HUD refresh block (`GameScene.js:283-287`, `this._traitHudAccum`). Right after it add:

```js
if (this.runState === 'CONTRACT_ACTIVE') {
  this.updateContractHud();
}
```

Find `this.gameTimer = this.time.addEvent(` at `GameScene.js:164`. After the full `this.difficultyTimer` block ends (line ~187) and after `this.buildContract()` will have run, add at the end of that timer-setup region (just before `// Initialize game state` at line ~189) nothing — instead start the contract timer at the END of `create()`. Find the end of `create()` (the `updateCameraBounds()` call at `GameScene.js:236`) and add immediately after it:

```js
this.startContractTimer();
```

- [ ] **Step 4: Pause the countdown during non-active states**

The countdown must not run during pause, the boon modal, or chip placement. In `togglePause()` (`GameScene.js:2912`) where it sets `this.gameTimer.paused = true;` (line ~2918) add alongside it:

```js
if (this.contractTimerEvent) this.contractTimerEvent.paused = true;
```

and in the resume branch where `this.gameTimer.paused = false;` (line ~2930) add:

```js
if (this.contractTimerEvent && this.runState === 'CONTRACT_ACTIVE')
  this.contractTimerEvent.paused = false;
```

- [ ] **Step 5: Verify**

`npm start`. HUD shows `Contract 1: deliver 0/4 · L4+` and a counting-down `⏱ 55s` that turns red under ~11s. Pausing (existing pause key) freezes the countdown. Delivering 4 qualifying items clears it and the banner switches to `Contract 1 cleared / Ship when ready`.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(contracts): contract HUD banner + countdown timer wiring"
```

---

## Task 4: Grace beat — boon → chip → ship-when-ready

Sequences the post-clear beat. `triggerTranscendence()` already runs grid resize then `enterChipPlacementMode()`; `confirmChipPlacement()` → `finalizeTranscendence()`. We insert the boon modal **before** chip placement and a ship-when-ready pause **after** it.

**Files:**

- Modify: `src/scenes/GameScene.js` — `triggerTranscendence()` (~2554), `confirmChipPlacement()` (~2791-2807), add grace-pause UI + `resumeFromUpgrade` boon path.

- [ ] **Step 1: Launch the boon modal before chip placement**

In `triggerTranscendence()` find `this.enterChipPlacementMode(newChip);` (`GameScene.js:2614`). Replace that single line with:

```js
// Boon pick first, chip placement after the player closes the boon modal.
this.pendingChipAfterBoon = newChip;
this.runState = 'GRACE';
this.showBoonScreen();
```

- [ ] **Step 2: Add showBoonScreen() and the boon-closed handler**

Add near `showUpgradeScreen()` (`GameScene.js:4810`):

```js
  showBoonScreen() {
    this.isPausedForUpgrade = true;
    if (this.contractTimerEvent) this.contractTimerEvent.paused = true;
    this.scene.launch('UpgradeScene', {
      upgradeManager: this.upgradeManager,
      callingSceneKey: this.scene.key,
      isLevelUp: false,
      isBoon: true,
    });
  }
```

Find `resumeFromUpgrade()` (`GameScene.js:4831`). Replace its body with a branch: if we are mid-grace (a chip is pending), continue into chip placement instead of the old upgrade bookkeeping.

```js
  resumeFromUpgrade() {
    this.isPausedForUpgrade = false;
    if (this.pendingChipAfterBoon) {
      const chip = this.pendingChipAfterBoon;
      this.pendingChipAfterBoon = null;
      this.enterChipPlacementMode(chip);
      return;
    }
    // (legacy level-up path removed in Task 6; nothing else to do)
  }
```

- [ ] **Step 3: Add the ship-when-ready pause after chip placement**

In `confirmChipPlacement()` (`GameScene.js:2791`) find the call `this.finalizeTranscendence();` (~line 2806). Replace it with:

```js
this.finalizeTranscendence();
this.showShipWhenReady();
```

- [ ] **Step 4: Implement the ship-when-ready prompt with 10s auto-accept**

Add this method near `finalizeTranscendence` (`GameScene.js:2860`):

```js
  showShipWhenReady() {
    this.runState = 'GRACE';
    this.buildContract();
    this.updateContractHud();

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const panel = this.add
      .rectangle(cx, cy, 420, 130, 0x102030, 0.92)
      .setStrokeStyle(3, 0xffd966)
      .setScrollFactor(0)
      .setDepth(5000);
    const msg = this.add
      .text(cx, cy - 28, `Contract ${this.contract.number} ready`, {
        fontFamily: 'Arial',
        fontSize: 20,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001);
    const btn = this.add
      .text(cx, cy + 14, 'SHIP IT (10)', {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffd966',
        backgroundColor: '#2a4060',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001)
      .setInteractive({ useHandCursor: true });

    let secs = 10;
    const cleanup = () => {
      countdown.remove();
      panel.destroy();
      msg.destroy();
      btn.destroy();
    };
    const accept = () => {
      cleanup();
      this.startContractTimer();
    };
    btn.on('pointerdown', accept);
    const countdown = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        secs--;
        if (secs <= 0) {
          accept();
        } else {
          btn.setText(`SHIP IT (${secs})`);
        }
      },
    });
  }
```

- [ ] **Step 5: Verify**

`npm start`. Clear Contract 1. Order observed: brief flash/sound → grid grows → **boon modal** (3 cards) → on pick, **chip ghost placement** on the bigger grid → on placing chip, a **"Contract 2 ready / SHIP IT (10…)"** panel that counts down; clicking it (or letting it hit 0) starts Contract 2's `⏱ 62s` countdown. The countdown does not tick during the boon modal or chip placement.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(contracts): grace beat — boon then chip then ship-when-ready"
```

---

## Task 5: Demote momentum (remove the death state)

**Files:**

- Modify: `src/scenes/GameScene.js:264-267` and `:3037-3038`

- [ ] **Step 1: Remove the update-loop death check**

At `GameScene.js:263-267` delete:

```js
// --- Check Game Over Condition ---
if (this.currentMomentum <= 0) {
  this.endGame();
  return; // Stop further updates if game is over
}
```

Leave the decay math above it (lines 250-261) intact.

- [ ] **Step 2: Remove the second death check**

At `GameScene.js:3037-3038` delete:

```js
if (this.currentMomentum <= 0) {
  this.endGame();
}
```

(Keep the `this.currentMomentum = Math.max(0, this.currentMomentum - momentumLoss);` line above it.)

- [ ] **Step 3: Verify**

`npm start`. Let momentum decay to 0 (stop delivering). The run does NOT end — the momentum bar sits at 0, combo/flow-surge still behave above the threshold when you resume delivering, and only the Contract timer can end the run.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(contracts): demote momentum — remove decay-to-zero death"
```

---

## Task 6: Boon pool config + UpgradeManager/Scene repurpose + remove milestone trigger

**Files:**

- Create: `src/config/boons.js`
- Modify: `src/managers/UpgradeManager.js` (add `getBoonChoices`), `src/scenes/UpgradeScene.js` (boon rendering), `src/scenes/GameScene.js` (remove milestone trigger + UPGRADE READY button)

- [ ] **Step 1: Create the boon pool**

Create `src/config/boons.js`:

```js
// Build-defining run boons. Each boon is a one-off ("procedural") upgrade:
// id is stored in UpgradeManager.activeProceduralUpgrades; effects are read
// at a single site (see per-boon comment). No tiers.
export const BOON_POOL = [
  {
    id: 'boon_heavy_haulers',
    name: 'Heavy Haulers',
    description: 'Conveyors carry 2 items, but processors are 15% slower.',
    rarity: 'rare',
  },
  {
    id: 'boon_every_fifth',
    name: 'Every Fifth Counts',
    description: 'Every 5th delivery toward a Contract counts double.',
    rarity: 'common',
  },
  {
    id: 'boon_overclock_surge',
    name: 'Overclock Surge',
    description: 'The first splitter output each cycle is one tier higher.',
    rarity: 'rare',
  },
  {
    id: 'boon_lean_lines',
    name: 'Lean Lines',
    description: '+25% conveyor speed, but −1 max inventory per machine.',
    rarity: 'common',
  },
  {
    id: 'boon_bulk_contracts',
    name: 'Bulk Contracts',
    description: 'Contracts need 20% fewer units, but give 15% less time.',
    rarity: 'rare',
  },
  {
    id: 'boon_momentum_engine',
    name: 'Momentum Engine',
    description: 'While momentum is at combo level, Contracts fill 20% faster.',
    rarity: 'common',
  },
];
```

- [ ] **Step 2: Add getBoonChoices to UpgradeManager**

In `src/managers/UpgradeManager.js`, add the import at the top (after line 2):

```js
import { BOON_POOL } from '../config/boons.js';
```

Add this method to the class (after `getUpgradeChoices`, before `isProceduralUpgradeActive`):

```js
  getBoonChoices(count = 3) {
    const available = BOON_POOL.filter(
      (b) => !this.activeProceduralUpgrades.has(b.id)
    );
    Phaser.Utils.Array.Shuffle(available);
    return available.slice(0, count).map((b) => ({
      type: b.id,
      name: b.name,
      description: b.description,
      rarity: b.rarity || 'common',
    }));
  }

  applyBoon(boonId) {
    this.activeProceduralUpgrades.add(boonId);
    console.log(`[BOON] Applied ${boonId}`);
  }
```

- [ ] **Step 3: Render boons in UpgradeScene**

In `src/scenes/UpgradeScene.js`:

- `init(data)` (line 13-19): add `this.isBoon = data.isBoon || false;`
- `create()` line 35: change title logic to:

```js
let titleText = this.isBoon
  ? 'Choose a Boon'
  : this.isLevelUp
    ? 'Upgrade Ready'
    : 'Choose an Upgrade';
```

- `create()` line 47: change choice source to:

```js
this.upgradeChoices = this.isBoon
  ? this.upgradeManager.getBoonChoices(3)
  : this.upgradeManager.getUpgradeChoices(3);
```

- `createUpgradeButton` line 90: boons have no `level`, so make the label robust:

```js
const textContent = choice.level
  ? `${choice.name} (Lvl ${choice.level})\n${choice.description}`
  : `${choice.name}\n${choice.description}`;
```

- `createUpgradeButton` `pointerdown` (line 106-118): apply boon vs upgrade:

```js
bg.on('pointerdown', () => {
  if (this.isBoon) {
    this.upgradeManager.applyBoon(choice.type);
  } else {
    this.upgradeManager.applyUpgrade(choice.type);
  }
  console.log(`Selected: ${choice.name}`);
  if (this.scene.get(this.callingSceneKey)?.playSound) {
    this.scene.get(this.callingSceneKey).playSound('upgrade-select');
  }
  this.closeScene();
});
```

- [ ] **Step 4: Remove the score-milestone upgrade trigger**

In `src/scenes/GameScene.js` `addScore()` delete the milestone-banking loop at `GameScene.js:2377-2382`:

```js
// Bank milestone upgrades so the player chooses when to break flow.
while (this.score >= this.nextUpgradeScore) {
  console.log(`[UPGRADE] Milestone ${this.nextUpgradeScore} reached - banking upgrade choice`);
  this.queueUpgradeChoice();
  this.advanceNextUpgradeMilestone();
}
```

- [ ] **Step 5: Remove the UPGRADE READY button**

Delete the `upgradeReadyButton` creation block at `GameScene.js:532-547` (from `// Banked Upgrade Button` comment through `this.updateUpgradeReadyButton();`). Then in `updateUpgradeReadyButton()` (`GameScene.js:2306`) make it a safe no-op by replacing the method body with `return;` (leave the method so any lingering callers don't crash). Leave `queueUpgradeChoice`/`advanceNextUpgradeMilestone` defined but unused — they are now dead and harmless; do not call them anywhere.

- [ ] **Step 6: Verify**

`npm start`. No "UPGRADE READY" button appears even at high score. Clearing a Contract shows the boon modal titled "Choose a Boon" with 3 named boon cards (no "Lvl" suffix). Picking one logs `[BOON] Applied boon_…` and proceeds to chip placement. Reaching a score milestone no longer logs `[UPGRADE] Milestone`.

- [ ] **Step 7: Commit**

```bash
git add src/config/boons.js src/managers/UpgradeManager.js src/scenes/UpgradeScene.js src/scenes/GameScene.js
git commit -m "feat(boons): boon pool + UpgradeScene repurpose; remove milestone upgrade trigger"
```

---

## Task 7: Boon effects — Bulk Contracts, Every Fifth, Momentum Engine

These three are read inside Contract code already partially wired in Task 2. This task finishes Bulk Contracts (it must affect `buildContract`).

**Files:**

- Modify: `src/scenes/GameScene.js` — `buildContract()`

- [ ] **Step 1: Apply Bulk Contracts in buildContract()**

In `buildContract()` (added in Task 2), after computing the base values, gate on the boon. Replace the `this.contract = { … }` assignment with:

```js
let quantity = TRANSCEND_THRESHOLDS.getDeliveryThreshold(era);
let timeBudget = getContractTimeBudget(era);
if (this.upgradeManager && this.upgradeManager.isProceduralUpgradeActive('boon_bulk_contracts')) {
  quantity = Math.max(1, Math.round(quantity * 0.8));
  timeBudget = Math.round(timeBudget * 0.85);
}
this.contract = {
  number: era,
  requiredTier: getTranscendTier(era),
  quantity,
  timeBudget,
  delivered: 0,
};
```

- [ ] **Step 2: Verify all three**

`npm start`. Use a quick debug check: in the browser console after a run starts, run `window` is not exposed — instead verify via gameplay:

- **Every Fifth Counts** (wired Task 2): take the boon, then deliver qualifying items; the progress jumps by 2 on the 5th delivery (watch `deliver x/N` in the HUD skip a number).
- **Momentum Engine** (wired Task 2): take the boon, build momentum to combo level, deliver — HUD progress advances faster (ceil(1.2)) than 1 per delivery while momentum is high.
- **Bulk Contracts**: take the boon; the _next_ Contract's HUD shows ~20% lower N and ~15% lower seconds than the Task 1 table value for that era.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(boons): Bulk Contracts / Every Fifth / Momentum Engine effects"
```

---

## Task 8: Boon effects — Heavy Haulers & Lean Lines (conveyor/processor/inventory)

**Files:**

- Modify: `src/objects/machines/ConveyorMachine.js:74-76`, processor speed read site, `src/managers/UpgradeManager.js`

- [ ] **Step 1: Add boon-aware modifier helpers to UpgradeManager**

In `src/managers/UpgradeManager.js` add after `getExtractionSpeedModifier()` (line 52):

```js
  // --- Boon-derived modifiers ---
  getConveyorCapacityBonus() {
    return this.activeProceduralUpgrades.has('boon_heavy_haulers') ? 1 : 0;
  }

  getInventoryCapacityBonus() {
    return this.activeProceduralUpgrades.has('boon_lean_lines') ? -1 : 0;
  }
```

Modify `getProcessorSpeedModifier()` (line 26-28) to fold in Heavy Haulers' 15% slowdown:

```js
  getProcessorSpeedModifier() {
    let m = this.getModifier(UPGRADE_TYPES.PROCESSOR_EFFICIENCY);
    if (this.activeProceduralUpgrades.has('boon_heavy_haulers')) m *= 0.85;
    return m;
  }
```

Modify `getConveyorSpeedModifier()` (line 38-40) to fold in Lean Lines' +25%:

```js
  getConveyorSpeedModifier() {
    let m = this.getModifier(UPGRADE_TYPES.CONVEYOR_SPEED);
    if (this.activeProceduralUpgrades.has('boon_lean_lines')) m *= 1.25;
    return m;
  }
```

- [ ] **Step 2: Apply capacity bonuses in ConveyorMachine**

In `src/objects/machines/ConveyorMachine.js:74-76` the code is:

```js
const capacityMod = this.scene.upgradeManager.getInventoryCapacityModifier();
this.maxCapacity = Math.floor(this.baseMaxCapacity * capacityMod);
```

Replace with:

```js
const capacityMod = this.scene.upgradeManager.getInventoryCapacityModifier();
const haulBonus = this.scene.upgradeManager.getConveyorCapacityBonus();
const leanPenalty = this.scene.upgradeManager.getInventoryCapacityBonus();
this.maxCapacity = Math.max(
  1,
  Math.floor(this.baseMaxCapacity * capacityMod) + haulBonus + leanPenalty
);
```

- [ ] **Step 3: Verify**

`npm start`. Take **Heavy Haulers**: place a conveyor — it visually buffers 2 items where it used to hold 1 (watch the belt), and processor progress bars tick ~15% slower. Take **Lean Lines** instead: conveyors move noticeably faster and machine inventory cap is 1 lower (a machine that held N now rejects at N−1; observe via existing canAcceptInput logs).

- [ ] **Step 4: Commit**

```bash
git add src/managers/UpgradeManager.js src/objects/machines/ConveyorMachine.js
git commit -m "feat(boons): Heavy Haulers & Lean Lines effects"
```

---

## Task 9: Boon effect — Overclock Surge (splitter +1 tier once per cycle)

**Files:**

- Modify: `src/objects/machines/SplitterMachine.js`

- [ ] **Step 1: Locate the splitter output point**

Run: `grep -n "outputQueue\|push\|deliver\|transferItem\|output" src/objects/machines/SplitterMachine.js | head -30`

Identify the single method where the splitter emits an item to a downstream machine (the line that pushes/transfers an item object that has a `level` or `purity` field).

- [ ] **Step 2: Add a per-cycle flag and bump the first output's tier**

In `SplitterMachine.js` constructor add: `this._surgeUsedThisCycle = false;`. Find where the splitter resets/rotates between its outputs (the "cycle" — the place a counter or output-index wraps back to 0). At that wrap, add `this._surgeUsedThisCycle = false;`.

At the emit site from Step 1, immediately before the item leaves, add:

```js
if (
  !this._surgeUsedThisCycle &&
  this.scene.upgradeManager &&
  this.scene.upgradeManager.isProceduralUpgradeActive('boon_overclock_surge') &&
  item
) {
  if (typeof item.level === 'number') item.level += 1;
  else if (typeof item.purity === 'number') item.purity += 1;
  this._surgeUsedThisCycle = true;
}
```

(Use the actual emitted-item variable name found in Step 1 in place of `item`.)

- [ ] **Step 3: Verify**

`npm start`. Take **Overclock Surge**. Feed a splitter a steady tier-K stream. The first item out of the splitter each cycle is tier K+1 (delivers for more points / can satisfy a higher Contract tier); subsequent items in the same cycle stay tier K. Confirm via the existing per-item delivery console log showing an elevated level/purity once per cycle.

- [ ] **Step 4: Commit**

```bash
git add src/objects/machines/SplitterMachine.js
git commit -m "feat(boons): Overclock Surge — first splitter output +1 tier per cycle"
```

---

## Task 10: Full integration pass

**Files:** none (verification only) unless a defect is found.

- [ ] **Step 1: Full run-through**

`npm start`. Play through Contracts 1→4:

- HUD N/T per contract matches the Task 1 table (adjusted if Bulk Contracts taken).
- Each clear runs flash → grid grow → boon modal → chip placement → ship-when-ready (10s) → next countdown.
- Letting a countdown hit 0 ends the run via GameOverScene (no momentum-zero early death; momentum at 0 never ends the run).
- No console errors referencing `onHighTierDelivery`, `transcendButton`, `upgradeReadyButton`, `queueUpgradeChoice`.

- [ ] **Step 2: Fix any defect found, then re-verify Step 1**

- [ ] **Step 3: Commit (if changes were needed)**

```bash
git add -A
git commit -m "fix(contracts): integration pass corrections"
```

- [ ] **Step 4: Format**

```bash
npm run format
git add -A
git commit -m "chore: prettier format"
```

---

## Self-Review Notes

- Spec §1 (state machine, remove hidden path, tier-or-better) → Tasks 2, 5.
- Spec §2 (re-curve N + time budget) → Task 1.
- Spec §3 (grace beat order: boon→chip→ship-ready, 10s auto-accept) → Task 4.
- Spec §4 (momentum demotion) → Task 5.
- Spec §5 (boon system, reuse procedural mechanism, replace milestone trigger, 6 boons) → Tasks 6–9.
- Spec §6 (Contract HUD + grace panel) → Tasks 3, 4.
- Naming consistency: `onContractDelivery`, `buildContract`, `startContractTimer`, `clearContract`, `runState`, `this.contract`, `getContractTimeBudget`, `applyBoon`/`getBoonChoices`, boon ids `boon_*` — used identically across all tasks.
