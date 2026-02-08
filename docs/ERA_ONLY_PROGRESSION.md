# Era-Only Progression Refactor

> **Goal:** Remove the mid-era level system and grid clears. The only major reset happens at Transcendence when the factory becomes a chip. This should make progression feel less punitive and more satisfying.

## Problem Statement

The current level-up system feels bad because:

1. **Punishes success** - Hitting a score threshold destroys your working factory
2. **Breaks flow** - Forces constant rebuilding instead of iterating on a design
3. **Conflicts with Transcendence** - The chip system already provides a meaningful "cash out" moment; levels are redundant

## Design Changes

### What to Remove

1. **Level system** (`currentLevel`, `advanceLevel()`, `getScoreThresholdForLevel()`)
2. **Grid clears on level up** (the `clearPlacedItems()` call in `advanceLevel`)
3. **Score resets** - Score should be cumulative within an era
4. **Level-up button and UI** (`levelUpButton`, `pendingLevelUps`)
5. **Level display text** (`levelText`, "LEVEL: X")

### What to Keep

1. **Momentum** - Still the death timer, still drains constantly
2. **Score** - Cumulative within each era, displayed prominently
3. **Upgrades** - Still exist, but triggered differently (see below)
4. **Transcendence** - The only major reset, factory becomes chip
5. **Era system** - Continues to work as designed in TRANSCENDENCE_DESIGN.md

### New Upgrade Trigger

Replace level-based upgrades with **score milestone upgrades**:

- Every X points (e.g., 500), offer an upgrade choice
- **No grid clear, no score reset** - just pause for upgrade selection
- Track `lastUpgradeMilestone` to know when next upgrade triggers
- Formula: `nextUpgradeMilestone = Math.floor(score / 500) * 500 + 500`

### Difficulty Scaling

Without levels, difficulty should scale with cumulative score or time:

```javascript
// In update(), momentum drain scales with score
const scoreFactor = 1 + (this.score / 1000) * 0.1; // +10% decay per 1000 points
const effectiveDecayRate = this.baseMomentumDecayRate * scoreFactor;
```

This creates a soft difficulty curve - the longer you survive, the harder it gets to maintain momentum, but there's no sudden jumps or resets.

## Implementation Steps

### Phase 1: Remove Level System

1. **GameScene.js constructor**: Remove `currentLevel`, `currentLevelScoreThreshold`, `pendingLevelUps`
2. **GameScene.js create()**: Remove level-up button creation
3. **GameScene.js createUI()**: Remove level text display
4. **GameScene.js addScore()**: Remove threshold check and `queueLevelUp()` call
5. **Delete methods**: `advanceLevel()`, `queueLevelUp()`, `claimLevelUp()`, `getScoreThresholdForLevel()`, `updateLevelUpButton()`
6. **Remove keyboard handler**: The spacebar level-up trigger

### Phase 2: Implement Milestone Upgrades

1. Add new state: `lastUpgradeMilestone = 0`
2. In `addScore()`, check if score crossed a milestone:
   ```javascript
   const milestoneInterval = 500;
   const newMilestone = Math.floor(this.score / milestoneInterval) * milestoneInterval;
   if (newMilestone > this.lastUpgradeMilestone) {
     this.lastUpgradeMilestone = newMilestone;
     this.showUpgradeScreen();
   }
   ```
3. No grid clear, no score reset after upgrade

### Phase 3: Update Difficulty Scaling

1. In `update()`, replace level-based decay with score-based:
   ```javascript
   const scoreFactor = 1 + (this.score / 1000) * 0.1;
   const effectiveDecayRate = this.baseMomentumDecayRate * scoreFactor;
   ```
2. Remove `updateDifficulty()` calls tied to level advancement
3. Consider making node spawn rate also scale with score/time

### Phase 4: Clean Up UI

1. Remove "LEVEL: X" display entirely, or replace with "ERA: X" prominence
2. Update score display to not show "/ threshold" format
3. Consider adding a "Next Upgrade: X points" indicator

### Phase 5: Test & Balance

1. Playtest the new flow - does it feel better?
2. Tune the milestone interval (500 might be too frequent or too rare)
3. Tune the momentum decay scaling factor
4. Ensure Transcendence still triggers correctly (it uses level thresholds currently - may need update)

## Files to Modify

| File                       | Changes                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `src/scenes/GameScene.js`  | Major changes - remove level system, add milestone upgrades   |
| `src/config/gameConfig.js` | Remove `levelScoreThresholds`, add `upgradeMilestoneInterval` |
| `src/config/eraConfig.js`  | Update `TRANSCEND_THRESHOLDS` if it uses levels               |

## Notes for Implementation

- The Transcendence system in `TRANSCENDENCE_DESIGN.md` mentions "Level 5 + delivering 50 L3 resources" - this needs to change to a score/throughput threshold only
- The `updateDifficulty()` method references `this.currentRound` which may be a legacy name for level - clean this up
- Test that chips from Transcendence still work correctly after these changes

## Success Criteria

After implementation, the game should feel like:

1. Building ONE factory per era that evolves over time
2. Upgrades are bonuses that don't interrupt flow
3. Transcendence is the meaningful "cash out" moment
4. No forced rebuilding mid-era
