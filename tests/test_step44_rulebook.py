"""Base-game rulebook audit: objective setup and physical component counts.

The existing objective catalogue contains invented test fixtures, not official cards.
"""
import pytest
from anno1800.game_setup import GameSetup
from anno1800.models.objective import ObjectiveType
from anno1800.data.objectives import create_objective_cards

@pytest.mark.parametrize('players', [2, 3, 4])
def test_five_objectives_total(players):
    state = GameSetup().create_game([f'P{i}' for i in range(players)])
    selected = state.objective_cards + state.objective_effect_cards
    assert len(selected) == 5
    assert len({card.id for card in selected}) == 5
    assert all(card.objective_type == ObjectiveType.END_GAME for card in state.objective_cards)
    assert all(card.objective_type == ObjectiveType.EFFECT for card in state.objective_effect_cards)
    assert not ({card.id for card in selected} & {card.id for card in state.objective_deck})

def test_selection_can_include_effect(monkeypatch):
    # Shuffle reversed so fixture EFFECT card is among the first five.
    import anno1800.game_setup as setup_module
    monkeypatch.setattr(setup_module.random, 'shuffle', lambda cards: cards.reverse())
    state = GameSetup().create_game(['A', 'B'])
    assert len(state.objective_effect_cards) == 1
    assert len(state.objective_cards) == 4
    assert [p.gold for p in state.players] == [2, 3]

def test_selection_can_exclude_effect(monkeypatch):
    import anno1800.game_setup as setup_module
    monkeypatch.setattr(setup_module.random, 'shuffle', lambda cards: None)
    state = GameSetup().create_game(['A', 'B'])
    assert len(state.objective_effect_cards) == 0
    assert len(state.objective_cards) == 5
    assert [p.gold for p in state.players] == [0, 1]

def test_fixture_catalogue_not_official_complete():
    # The official base game contains 20 objectives; our fixture is smaller.
    assert len(create_objective_cards()) < 20
