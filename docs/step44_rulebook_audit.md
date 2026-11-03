# Step 44 — Base-game rulebook audit

Source: English Anno 1800 base-game rulebook (16 pages), https://gameland.com.ua/content/files/pravila-anno-1800-angl.-18854751.pdf . Scope: BASE GAME, not 2024 expansion. Status refers to current Python engine, not the physical game.

| Mechanic | Official rule | Engine finding | Status |
|---|---|---|---|
| Players | 2–4 (p. 1) | Validated by GameSetup | Match |
| Initial population | 4 farmer, 3 worker, 2 artisan (p. 3) | Matches `data/setup.py` | Match |
| Initial hand | 7 basic + 2 advanced (p. 3) | Matches `data/setup.py` | Match |
| Initial gold | 0/1/2/3 by position (p. 3) | Matches `data/setup.py` | Match |
| Objective selection | Five cards, mixed scoring and reusable effects (pp. 2, 12) | Corrected from three scoring + all effects to five selected total | Fixed selection; incomplete effect engine |
| Objective catalogue | 20 physical objective cards (p. 1) | Nine invented test fixtures | Incomplete; NOT official data |
| Population cards | 46 basic, 32 advanced, 24 New World (p. 1) | Matching-sized INVENTED fixture decks | Counts match; card identities unverified |
| Expeditions | 22 cards; cost 2 exploration for up to 3 cards (pp. 1, 10) | Engine uses cost 2, draw 3; catalogue identities unverified | Partial |
| Islands | 12 Old World, 8 New World (p. 1) | Reduced fixture island decks | Incomplete |
| Construction | 35 industries × 2; shipyards 4/6/4; six ships × 6 (p. 2) | Reduced fixture catalogue and supplies | Incomplete |
| Trade | Other player's producing construction, token cost 1/2/3, other player gains 1 gold; same good once/turn (p. 5) | Services exist, full rule matrix not verified | Needs targeted audit |
| Construction | One industry and one shipyard per expand action; up to one ship per shipyard (p. 6) | Expansion service exists; full sequence not audited | Needs targeted audit |
| Festival | All population and naval tokens reset (p. 10) | Existing festival action and lifecycle tests | Tested; rulebook edge cases not exhaustive |
| End-game | Trigger on empty hand; complete current round and one final round (p. 10) | Existing Step 42 lifecycle tests | Match for tested paths |
| Base scoring | Basic 3, advanced 8, New World 5, gold 3:1, fireworks 7; expedition slots use unique cubes (p. 11) | Existing Step 43 tests | Match for supported cards |
| Objective scoring | Industry awards, rank-based awards, island awards, zoo/museum, hand penalties (p. 12) | Only test-fixture industry/population/cumulative-resource scoring | Incomplete |
| Objective effects | Four reusable named effects, some once per turn (p. 12) | Invented setup-only starting-gold test fixture | Incomplete; NOT equivalent to official effects |

## Corrected in Step 44
- Exactly five objectives are selected from the shuffled catalogue, without automatically enabling every effect.
- Selected scoring and effect objectives are stored separately; unselected cards stay in the deck.
- Test-only starting-gold effect is applied only when selected. It is NOT an official objective effect.
- Tests explicitly verify selection with and without the effect, plus 2–4-player setups.

## Next implementation priorities
1. Replace the invented nine-card objective fixture with the verified twenty official objective definitions; implement rank-based scoring and zoo/museum modifiers.
2. Implement the four actual reusable objective effects, with per-turn limits where specified; remove the starting-gold fixture from official gameplay.
3. Add complete official industry, ship, shipyard and island data and verify tile counts.
4. Audit expansion, trading, population-card effects and legal-action interactions against pages 5–10 and 13–16.
5. Keep fixture mode explicitly separate from official mode until the verified catalogue is complete.
