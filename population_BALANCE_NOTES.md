# Anno 1800 custom Old World population catalogue — v1

**Every card face in population.json is invented (homebrew), not official.**
The base-game rulebook supports only the deck sizes and card point values used here.

- 46 Farmer/Worker cards: 23 Farmer, 23 Worker (invented split), 3 points each.
- 32 advanced cards: 12 Artisan, 11 Engineer, 9 Investor (invented split), 8 points each.
- New World, Expedition and Objective decks are intentionally excluded.
- One JSON record per physical card; quantity=1, all IDs unique.
- `verification: invented` and `source: custom_balanced_v1` distinguish them from official transcriptions.
- All goods and effects use enum values from the existing Python engine.
- Early cards generally need cheaper goods; advanced cards require multiple costly goods.
- One-time effects are limited to 0–4 gold, one capacity, or one population cube.
- The game engine's industry catalogue currently lacks producers for several goods,
  including clothing, beer, steel, windows, sewing machines, bicycles and gramophones.
  Those industries must be implemented before every card is fulfillable.
- Balance is a design hypothesis, not demonstrated game balance: playtest opening
  hands, completion rates, turn length, gold flow, population snowballing and win rates.
- `population_unverified_backup.json` preserves the previous 78 unidentified slots.

Official rulebook: https://cdn.1j1ju.com/medias/eb/80/1d-anno-1800-rulebook.pdf
