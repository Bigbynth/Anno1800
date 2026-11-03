# Custom Expedition Deck — Balance Notes

These 22 cards are **original homebrew content**, not transcriptions of the physical Anno 1800 board-game cards. They use the game's existing Python `ExpeditionCard` model: each card contains an `animal` and an `artifact`, each requiring one matching population cube to score its printed points. The existing scoring engine cannot reuse a cube for two rewards.

## Composition

- 22 cards, quantity 1 each.
- 8 Artisan/Engineer pairs, 7 Artisan/Investor pairs, 7 Engineer/Investor pairs.
- Across the 44 reward slots: 15 Artisan, 15 Engineer, 14 Investor.
- Reward-point bands: Artisan 2–4, Engineer 3–5, Investor 4–6.
- Card total potential: 5–10 points; one 10-point card is deliberately rare and requires both an Engineer and an Investor cube.
- Animal and Artifact names are flavor metadata for future UI rendering. They do not add gameplay effects.

## Intended balance

Lower-tier population cubes are easier to obtain and therefore score fewer points per reward; Investor cubes score more. Each card has two **different** population types, encouraging mixed population development. This is a first-pass design and needs playtesting, particularly to verify the rare 10-point pairing and how quickly each tier becomes available in your custom economy.

## Files and usage

- `src/anno1800/data/official/expedition.json`: custom card catalogue.
- `src/anno1800/data/expeditions.py`: `load_custom_expedition_deck()` and `create_expedition_deck(use_custom=True)`.
- `Game.from_names(["Alice", "Bob"], use_custom_population=True, use_custom_new_world=True, use_custom_expeditions=True)` enables all three custom decks.
- Default game setup still uses the existing test-fixture decks.

## Schema example

```json
{
  "id": "custom-expedition-001",
  "record_type": "custom_game_card",
  "deck": "expedition",
  "animal": {"name": "Scarlet Macaw", "population_type": "artisan", "victory_points": 2},
  "artifact": {"name": "Bronze Compass", "population_type": "engineer", "victory_points": 3},
  "quantity": 1,
  "verification": "invented",
  "source": "custom_balanced_v1"
}
```
