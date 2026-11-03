"""Custom objectives are invented and opt-in; the original fixtures remain default."""
import json
from collections import Counter
import pytest

from anno1800.data.objectives import (
    CUSTOM_OBJECTIVES_DATA, create_objective_cards, load_custom_objectives,
)
from anno1800.game import Game
from anno1800.models.goods import Good
from anno1800.models.objective import ObjectiveType
from anno1800.models.population import PopulationType
from anno1800.services.objective_scoring import score_objective


def test_custom_objectives_count_and_rule_mix():
    cards = load_custom_objectives()
    assert len(cards) == len({c.id for c in cards}) == 20
    assert Counter(c.objective_type.value for c in cards) == {"end_game": 18, "effect": 2}
    assert len(create_objective_cards()) == 9
    assert len(create_objective_cards(use_custom=True)) == 20


def test_custom_objectives_combined_with_all_other_decks():
    game = Game.from_names(["Alice", "Bob"],
        use_custom_population=True, use_custom_new_world=True,
        use_custom_expeditions=True, use_custom_objectives=True)
    state = game.state
    assert len(state.objective_cards) + len(state.objective_effect_cards) == 5
    assert len(state.objective_deck) == 15
    assert len({c.id for c in state.objective_cards + state.objective_effect_cards + state.objective_deck}) == 20
    assert len(state.expedition_deck.cards) == 22
    assert len(state.population_deck.new_world_cards) == 24


def test_custom_effects_applied_equally_and_only_at_setup(monkeypatch):
    import anno1800.game_setup as setup_module
    monkeypatch.setattr(setup_module.random, "shuffle", lambda cards: cards.reverse())
    game = Game.from_names(["Alice", "Bob"], use_custom_objectives=True)
    assert len(game.state.objective_effect_cards) == 2
    assert [p.gold for p in game.state.players] == [3, 4]  # starting gold 0, 1 + both effects (1+2)
    assert all(score_objective(c, p) == 0 for c in game.state.objective_effect_cards for p in game.state.players)


def test_thresholds_score_at_boundary():
    cards = load_custom_objectives()
    game = Game.from_names(["Alice", "Bob"])
    player = game.state.players[0]
    population = next(c for c in cards if c.name == "Engineering Academy")
    player.population.cubes.clear()
    player.add_population(PopulationType.ENGINEER, 1)
    assert score_objective(population, player) == 0
    player.add_population(PopulationType.ENGINEER, 1)
    assert score_objective(population, player) == 7
    resource = next(c for c in cards if c.name == "Bakers Union")
    assert score_objective(resource, player) == 0
    player.record_production(Good.BREAD, 2)
    assert score_objective(resource, player) == 5


def test_reject_duplicate_ids(tmp_path):
    raw = json.loads(CUSTOM_OBJECTIVES_DATA.read_text(encoding="utf-8"))
    raw[1]["id"] = raw[0]["id"]
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate"):
        load_custom_objectives(path)


def test_reject_invalid_industry(tmp_path):
    raw = json.loads(CUSTOM_OBJECTIVES_DATA.read_text(encoding="utf-8"))
    raw[0]["rule"]["industries"] = ["nonexistent-factory"]
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    with pytest.raises(ValueError, match="unknown"):
        load_custom_objectives(path)
