# Rockhopper: choosing where a dock goes

Requested by André on 2026-10-04: "dock upgrades should be visible: we should be able to choose on which direction we will build the new dock." Prices are out of scope here (they belong to the purchase-prices work).

## What changed

- The hub still has the same nine dock sites on its upper arc (`DOCK_ANGLES`), and the same 3 → 9 docks. A new dock is no longer put on the next site in a fixed order: the player picks the site.
- Tapping **Docks** in the hub bubble (when affordable) closes the bubble and enters an aiming mode. Free sites pulse as dashed ghosts. Pressing anywhere near the hub and sliding around it snaps a ghost dock to the free site nearest by angle, with a dashed ray out from the hub (so the finger never hides the aim), the price at the ray's tip, and the belts that would link to the new dock drawn where they would run. A warning says when that site adds crossings or would send a belt over the hub. Releasing builds it there; releasing far from the hub, or Escape, cancels with nothing bought. With one free site left, the button buys at once.
- While aiming, nothing else answers a press (no belt grabs, hub taps or panning).
- Sim: `State.dockSites` lists the site each dock stands on. It is absent in older saves and in games that never picked off the classic order, so those are unchanged. `upgradeHub(s, 'docks', site?)` refuses a taken or invalid site before charging; without a site it takes the first free one (the bot and old command logs). `dockPos(s, i)` reads the state. A malformed saved list puts the docks back in the classic order rather than refusing the save.

No menu switch: the change only adds a choice, and the default site is the old one.

## Review (one adversarial round, 2026-10-04)

Verdict REVISE overall; per point: state field PASS (with conditions), `upgradeHub` site PASS, aiming UI REVISE, no new sites REVISE. Resolved:

- Every `dockPos` call reads the state; save round-trip and malformed lists are tested (`tests/rockhopper-dock-sites.test.ts`); a refused site never charges; the command log carries the site.
- Aiming disables belt grabs, hub taps and panning; the reach is generous (dock radius + max(60, 110/zoom) units); a release outside it says "cancelled"; one free site buys at once; the notice says "tap away to cancel".
- The visible choice had an invisible result: the preview now draws the belts auto-link would send to that site, with added crossings or a belt over the hub flagged.
- Nine sites for nine docks means the final shape is the same every game: this is an **ordering choice for docks 4 to 8** (which machine gets a dock and where, while the rest wait). Accepted for this experiment (option a). If the choice should last, the next step is more sites than docks (option b), or replacing the 0° and −180° sites, which make belts from the side rocks run over the hub.

Open: whether the choice is felt in play (human playtest), and whether the side sites should go.
