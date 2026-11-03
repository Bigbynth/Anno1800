from anno1800.data.cards import create_population_deck
from anno1800.data.new_world import NEW_WORLD_CARDS
from anno1800.game_setup import GameSetup
from anno1800.game_state import GameState
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType
from anno1800.models.deck import EmptyDeckError
from anno1800.scoring import ScoringEngine
import pytest


def test_fixture_counts_and_unique_ids():
    deck = create_population_deck()
    cards = deck.farmer_worker_cards + deck.advanced_cards + NEW_WORLD_CARDS
    assert (len(deck.farmer_worker_cards), len(deck.advanced_cards), len(NEW_WORLD_CARDS)) == (46, 32, 24)
    assert len({card.id for card in cards}) == 102
    assert len({tuple(sorted((g.value, n) for g, n in c.requirements.items())) for c in cards}) >= 20
    assert any(len(card.requirements) > 1 for card in cards)
    assert any(card.effects for card in cards)


def test_deck_draw_and_exhaustion():
    deck = create_population_deck()
    assert deck.remaining(PopulationType.FARMER) == 46
    assert deck.draw(PopulationType.FARMER).population_type in (PopulationType.FARMER, PopulationType.WORKER)
    assert deck.remaining(PopulationType.FARMER) == 45
    for _ in range(45):
        deck.draw_farmer_worker()
    assert deck.is_empty(PopulationType.WORKER)
    with pytest.raises(EmptyDeckError):
        deck.draw(PopulationType.WORKER)


@pytest.mark.parametrize('n', [2, 3, 4])
def test_setup_remaining_counts(n):
    state = GameSetup().create_game([f'P{i}' for i in range(n)])
    assert len(state.players) == n
    assert all(len(player.hand) == 9 for player in state.players)
    assert len(state.population_deck.farmer_worker_cards) == 46 - 7*n
    assert len(state.population_deck.advanced_cards) == 32 - 2*n
    assert len(state.population_deck.new_world_cards) == 24
    assert len(state.objective_cards) + len(state.objective_effect_cards) == 5


def test_independent_mutable_cards():
    first, second = GameState(), GameState()
    first.population_deck.farmer_worker_cards[0].requirements[Good.BREAD] = 99
    assert second.population_deck.farmer_worker_cards[0].requirements.get(Good.BREAD) != 99


def test_scoring_import_and_initial_score():
    state = GameSetup().create_game(['A', 'B'])
    result = ScoringEngine().score_player(state, state.players[0])
    assert result.total >= 0
