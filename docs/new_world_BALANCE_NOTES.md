# Custom New World population deck — v1

**All 24 cards are invented homebrew designs, not official card transcriptions.**
They are compatible with the previous custom Old World `population.json`.

- 24 cards, each worth 5 VP (matching the current engine fixture convention, not an independently verified printed value).
- 6 one-good cards: no extra reward.
- 12 two-good cards: six receive +1 gold; six have no reward.
- 6 three-good cards: four receive +2 gold; one +1 trade capacity; one +1 exploration capacity.
- Each of the six New World goods appears exactly eight times across the 24 cards.
- All requirements use one unit of each listed good, to avoid demanding duplicate production from a scarce resource.
- The three-good cards are a deliberate late-game option and require more trade capacity.
- These are balancing assumptions, not evidence of competitive balance. Playtest card completion rates, exploration speed, naval-token economy, gold supply and scoring.

The project keeps its existing fixture deck as the default. To enable the custom decks:

```python
from anno1800.game_state import create_default_deck
deck = create_default_deck(use_custom_population=True, use_custom_new_world=True)
```

JSON: `src/anno1800/data/official/new_world.json`
Loader: `src/anno1800/data/new_world.py` (`load_custom_new_world_cards`)
