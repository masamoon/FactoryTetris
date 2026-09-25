# Asteroid Works simulated-run adversarial review — 2026-09-23

## Scope and evidence

I reran `npm run replay:asteroid`, traced its deterministic ticks through the first part and an extension, and exercised the real browser UI. Five selected Playwright checks passed, including the full mining → drill → smelter → assembler route at 390×844 and layout checks at 360×640, 390×844, desktop and landscape. I also loaded the replay's valid first-part state through the app's existing test hook at 360×640 and tapped the drill. An independent adversarial agent repeated that small-screen check and reviewed the prepared, uncut second-drill capture. No runtime code changed.

The times below are **simulation time** (10 ticks per second). Tool selection and route drawing pause the simulation; real first-session wall time also includes the player's actions and has not been measured with players.

| Moment in the straightforward first-part route | Tick | Simulation time |
| --- | ---: | ---: |
| Three exposed blocks mined; five belts and first drill built | 36 | 3.6 s |
| First drill excavation | 57 | 5.7 s |
| First ore reaches collection | 78 | 7.8 s |
| Eight ore available and replacement belt empty; smelter built | 147 | 14.7 s |
| First plate reaches collection | 198 | 19.8 s |
| Six plates available and replacement belt empty; assembler built | 303 | 30.3 s |
| First part reaches collection | 375 | 37.5 s |

The replay's three explicit waits after drill, smelter and assembler construction are 11.1, 15.6 and 7.2 simulation seconds. The factory is operating during these waits; the weakness is the gap between meaningful new decisions on this guided route, not a claim that nothing moves.

**Overall presentation verdict: REVISE.** The run is causally valid, but the short-phone inspector failure and delayed extension payoff prevent this tested path from being treated as a sound portrait demonstration. The cold-start ten-second hook remains unverified: the replay's 7.8 seconds to first delivered ore gives no time to the player's three holds, conveyor drawing or drill placement.

## Ranked findings

### 1. High — the drill inspector hides the factory on a short phone

At 360×640, opening the drill inspector in a valid first-part state expands the footer to 301 px and leaves a 198 px world. The `#a-canvas` parent is 160 px high while the Phaser canvas remains 312 px high. The playfield becomes mostly black, with the active machines clipped to a thin strip at the bottom. [Fresh opening](evidence/2026-09-23-run-opening-360.png) and [inspector open](evidence/2026-09-23-run-inspection-360.png) show the change. The UI still fits inside the document, which explains why the current no-overflow layout assertions pass.

Reproduce at 360×640 with the first-part replay state loaded, then tap the drill. The likely ownership is dynamic footer sizing and Phaser/scene resize or camera recentering. Verify a fix with a screenshot assertion after opening the inspector, not document dimensions alone.

### 2. High — the paid extension has an 84-second action-to-new-dig delay here

The first part arrives at tick 375. At tick 377 the old shaft is clear and the player can queue an extension, but its deep pocket still holds 80 ore. That pocket empties at tick 1151, the tender launches at 1171 and installs at 1191, and the first new-section block breaks at tick 1221. Thus the new excavation begins **84.4 simulation seconds after the commitment**. The old factory continues to produce; the queued action itself is represented mostly by a label until the final few seconds.

The current objective switches to “Your outpost is expanding” as soon as a kit is queued. The inspector explains that the tender waits but gives no estimate of the long remaining pocket phase. A silent 30-second clip beginning at this ordinary first-part choice cannot show the paid extension's new digging in real time. A disclosed prepared state near depletion could show it, but would not represent this opening trajectory.

### 3. Medium — the cheap second drill adds stock without advancing the first part

The early-drill replay buys the second base at tick 81 for two earned ore and routes its independent output. Its first own shipment reaches collection at tick 138. Continuing that branch through the same smelter and assembler placements yields the **same first-part tick, 375**, as the one-drill route. At that tick, ore stock is 32 instead of 2. The new drill is productive, but the extra line feeds collection rather than the smelter, so this branch accumulates ore without speeding the first downstream milestone. This is one specific route, not proof that every two-drill strategy is weak.

The objective also fails to acknowledge the chosen expansion: it remains “Grow or refine” during the early second-drill capture, and after that route earns a part it says “Choose your expansion” even though two drills already operate. This makes the genuine effect harder to attribute. The [390×844 first-part screen](evidence/2026-09-23-run-production-390.png) shows the small cargo and off-screen drilling frontier that add to the silent-read problem.

### 4. Medium — the key phone controls and explanations are cramped

In the 360×640 drill inspector, the option buttons are 32 px high with 10 px text; the close button is about 26×32 px. The choice explanation is 10 px. The six main tool buttons are roughly 53×64 px but use 8–9 px labels and costs. These measured sizes and the screenshot support a readability and touch-target concern. They do not measure actual thumb errors; a device playtest is still needed.

The 390×844 factory view cannot show collection and the deep shaft head in one static frame. The “View head” and “View base” controls can pan between them, but a viewer must mentally connect production across views. In the prepared second-drill footage, the production gain is real, yet the persistent objective and small parallel ore streams make its cause easy to miss without prior knowledge.

## Adversarial interpretation and next checks

- The straight first-part route proves the production chain works. It does not establish that a new player understands where inputs go or enjoys the waits. Observe a fresh player trying to get the first automated ore and first plate; record real wall time, pauses and interventions.
- The second-drill replay proves extra ore, not stronger downstream throughput. Ask players what they think changed after building it, then check whether they use or merely stockpile the added output.
- The extension replay proves its wait is a truthful consequence of finite pockets and returning loads. Test whether players understand the queued state, expected delay and cancellation before changing any gameplay rule.
- Reproduce the inspector defect on a physical short phone after the Chromium fix. Also check the opened inspector and preview states in browser screenshots; the current layout test does not cover this failure mode.

These are simulation and emulated-browser findings, not human enjoyment, balance or retention results. The existing [prepared second-drill witness](evidence/2026-09-23-prepared-second-drill-uncut.webm) is developed-outpost footage and should not be presented as the cold start.
