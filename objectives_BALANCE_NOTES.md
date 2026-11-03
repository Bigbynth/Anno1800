# Custom Objective Deck — Balance Notes

**Status:** 20 original homebrew cards, not official Anno 1800 card transcriptions. All cards are marked `verification: invented`.

## Composition

- 6 industry scoring objectives: three two-industry groups worth 2 VP per owned tile, and three specialized single-industry groups worth 3 VP per tile.
- 6 population threshold objectives: four to eight VP for meeting a target at the end of the game.
- 6 cumulative-production objectives: four to seven VP for producing a target quantity of one good during the game.
- 2 global effect objectives: every player gains 1 or 2 gold during setup. These award no direct victory points.

Exactly five cards are selected per game, mixing end-game and effect cards. The default fixture deck remains unchanged unless `use_custom_objectives=True`.

## Design rationale

- Industry objectives refer only to the five currently implemented Old World industry definitions; no unavailable industries are required.
- Each industry definition has two physical copies in the existing engine, limiting single-industry objectives to 6 VP and two-industry objectives to 8 VP in a two-player game. In games with more players, supply is shared and individual ceilings are lower.
- Population thresholds scale with tier: starting Farmer/Worker/Artisan cubes do not automatically satisfy the respective objectives.
- Resource objectives count **cumulative goods produced**, not current inventory; production ledger must record completed production.
- Setup effects apply equally to every player. The two effects together grant at most 3 gold to each player if both are selected.
- Some combinations reward the same strategy; overlapping objectives can make specialization unusually valuable. Shuffle five objectives before play and collect playtest results to adjust thresholds or rewards.

## Engine limitations

This custom deck uses only rule types already supported by the engine: `IndustryObjectiveRule`, `PopulationObjectiveRule`, `ResourceObjectiveRule`, `StartingGoldEffectRule`. The default nine-card test catalogue remains in place for old tests. The game does not yet have a complete set of official industries or fully validated official rules; balance is provisional.
