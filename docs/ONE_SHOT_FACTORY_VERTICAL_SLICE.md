# One-Shot Factory vertical slice

## Product thesis

Gridforge is strongest as a factory deckbuilding puzzle: draft awkward operator shapes, assemble a compact production plan, then commit and watch it prove itself. The factory should feel authored by the player before production starts and consequential once it does.

The central tension is therefore not “can I farm enough score?” It is “can this one layout satisfy every order, and how elegantly can it do so?”

## This slice

1. **Shape is function.** Operator inputs are enforced at their marked port. Tees and crosses are manifolds with several live outputs; closed bodies are reservoirs with extra buffers; cavity shapes are sockets with a smaller buffer. The shape is now a routing rule rather than a footprint tax.
2. **Orders share a production spine.** Every authored puzzle creates a tier ladder with a common routing group. Exact intermediate orders must leave the line before later refinement, so independent point-to-point factories are no longer the obvious answer.
3. **Execution is a finite batch.** Planning remains open-ended, but Start Production commits the design to a short batch of 24–52 one-second cycles. The batch clears when every order is filled and fails when its cycles run out.
4. **Upgrades alter topology.** The regular upgrade pool opens new output faces, removes a central blocker, adds a powered center spine, or converts taxed floor into quality floor. Percentage throughput and payout boons are removed from that pool.
5. **Generation wraps authored puzzles.** Each board family has an authored routing premise—trunk, fork, ladder, bus, spine, or tunnel. Round, order count, tier, color, inventory, and par values vary inside that premise.
6. **The grade judges the factory.** Clear results independently medal construction cost, discarded overflow, and cycles used against template-specific pars, then combine them into an S–C rank.
7. **Routing is drawn, not drafted.** Dragging across empty cells draws conveyors at a per-cell construction cost, so route length still matters without a second polyomino hand. Tees and crosses handle branching; mergers appear with binary Operators; fixed board tunnels teach crossings before a player-placeable tunnel appears on late crossing boards.

## Acceptance criteria

- Completing all primary orders is the only way to clear a batch.
- An Operator only accepts items at its marked input and only emits from functional output cells.
- A manifold can distribute one processed stream across several connected branches.
- Multi-order rounds ask for exact intermediate tiers and a later refined tier from one routing group.
- The HUD shows the authored puzzle, branch requirements, and current/maximum batch cycle.
- Every production phase has a finite cycle horizon and reports `BATCH ENDED` when it expires.
- Regular upgrade offers are topology-changing rules, not percentage modifiers.
- Every generated board family selects a matching authored puzzle profile.
- The clear screen reports cost, waste, and cycles against explicit template pars.
- Conveyors are always available through drag-to-draw routing and charge construction cost per occupied cell.
- The build panel has no disposable belt-piece hand and no standalone splitter.
- Mergers appear only when the current hand or factory contains a binary Operator.
- Player-placeable underground belts appear only after round 6 on authored crossing boards; board tunnels remain fixed infrastructure.
- Deterministic tests cover topology, shared orders, batch cycles, and grading.

## Deferred follow-ups

- Playtest and tune each template's inventory, cycle limit, and medal pars.
- Add a limited test-pulse mode before commitment.
- Preview live input/output ports on the placement ghost and explain topology in the tutorial.
- Add a deterministic solvability validator for generated board/template combinations.
- Give Boss audits bespoke topology constraints instead of only stronger pacing numbers.
- Bring the engagement simulator into parity with finite batches and shared order ladders.
