import json
from collections import Counter

import pytest

from anno1800.data.expeditions import (
    CUSTOM_EXPEDITION_DATA, create_expedition_deck, load_custom_expedition_deck,
)
from anno1800.game import Game
from anno1800.models.population import PopulationType
from anno1800.scoring import ScoringEngine


def test_custom_expedition_deck_size_and_balance():
    cards = load_custom_expedition_deck().cards
    assert len(cards) == 22
    assert len({card.id for card in cards}) == 22
    counts = Counter(
        reward.population_type.value
        for card in cards for reward in (card.animal, card.artifact)
    )
    assert counts == {"artisan": 15, "engineer": 15, "investor": 14}
    assert max(card.animal.victory_points + card.artifact.victory_points for card in cards) <= 10
    assert min(card.animal.victory_points + card.artifact.victory_points for card in cards) >= 5


def test_opt_in_and_default_fixture_unchanged():
    assert len(create_expedition_deck().cards) == 12
    assert len(create_expedition_deck(use_custom=True).cards) == 22
    game = Game.from_names(["Alice", "Bob"], use_custom_expeditions=True)
    assert len(game.state.expedition_deck.cards) == 22
    assert all(card.id.startswith("custom-expedition-") for card in game.state.expedition_deck.cards)


def test_three_custom_decks_together():
    game = Game.from_names(
        ["Alice", "Bob"],
        use_custom_population=True,
        use_custom_new_world=True,
        use_custom_expeditions=True,
    )
    assert len(game.state.expedition_deck.cards) == 22
    assert len(game.state.population_deck.new_world_cards) == 24
    assert len(game.state.population_deck.farmer_worker_cards) == 46 - 2 * 7
    assert len(game.state.population_deck.advanced_cards) == 32 - 2 * 2


def test_scoring_respects_unique_population_cubes():
    game = Game.from_names(["Alice", "Bob"], use_custom_expeditions=True)
    player = game.state.players[0]
    player.population.cubes.clear()
    player.add_population(PopulationType.ARTISAN, 1)
    player.add_population(PopulationType.ENGINEER, 1)
    card = next(c for c in game.state.expedition_deck.cards
                if {c.animal.population_type, c.artifact.population_type} ==
                   {PopulationType.ARTISAN, PopulationType.ENGINEER})
    player.expedition_cards = [card]
    assert ScoringEngine()._score_expeditions(player) == (card.animal.victory_points + card.artifact.victory_points)
    player.population.cubes.clear()
    player.add_population(PopulationType.ARTISAN, 1)
    assert ScoringEngine()._score_expeditions(player) == next(
        reward.victory_points for reward in (card.animal, card.artifact)
        if reward.population_type == PopulationType.ARTISAN
    )


def test_duplicate_id_rejected(tmp_path):
    records = json.loads(CUSTOM_EXPEDITION_DATA.read_text(encoding="utf-8"))
    records[1]["id"] = records[0]["id"]
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(records), encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate"):
        load_custom_expedition_deck(path)
