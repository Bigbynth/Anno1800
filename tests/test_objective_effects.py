"""Engine test fixtures, not official Anno 1800 Objective cards."""
import pytest
from anno1800.game import Game
from anno1800.models.goods import Good
from anno1800.models.objective import (
    ObjectiveCard, ObjectiveType, ResourceObjectiveRule,
    StartingGoldEffectRule,
)
from anno1800.services.objective_scoring import (
    score_objective, apply_starting_objective_effects,
)

@pytest.mark.parametrize("count", [2, 3, 4])
def test_effect_applied_only_when_selected(count, monkeypatch):
    import anno1800.game_setup as setup_module
    monkeypatch.setattr(setup_module.random, "shuffle", lambda cards: cards.reverse())
    game = Game.from_names([f"P{i}" for i in range(count)])
    assert len(game.state.objective_cards) == 4
    assert len(game.state.objective_effect_cards) == 1
    assert [player.gold for player in game.state.players] == [i + 2 for i in range(count)]
    effect = game.state.objective_effect_cards[0]
    assert effect.objective_type == ObjectiveType.EFFECT
    assert all(score_objective(effect, player) == 0 for player in game.state.players)

def test_resource_threshold_counts_cumulative_production():
    game = Game.from_names(["Alice", "Bob"])
    player = game.state.players[0]
    card = ObjectiveCard(
        "audit-resource", "Bread Producer", ObjectiveType.END_GAME,
        ResourceObjectiveRule("bread", 2, 5),
    )
    assert score_objective(card, player) == 0
    player.record_production(Good.BREAD)
    assert score_objective(card, player) == 0
    player.record_production(Good.BREAD)
    assert score_objective(card, player) == 5

def test_negative_ledger_amount_rejected():
    game = Game.from_names(["Alice", "Bob"])
    player = game.state.players[0]
    with pytest.raises(ValueError):
        player.record_production(Good.BREAD, -1)

def test_unknown_resource_rejected():
    game = Game.from_names(["Alice", "Bob"])
    card = ObjectiveCard(
        "bad-resource", "Invalid", ObjectiveType.END_GAME,
        ResourceObjectiveRule("unobtainium", 2, 5),
    )
    with pytest.raises(ValueError):
        score_objective(card, game.state.players[0])

def test_effect_not_added_to_score():
    game = Game.from_names(["Alice", "Bob"])
    player = game.state.players[0]
    effect = ObjectiveCard(
        "bonus", "Bonus", ObjectiveType.EFFECT,
        StartingGoldEffectRule(3),
    )
    starting_gold = player.gold
    apply_starting_objective_effects([effect], [player])
    assert player.gold == starting_gold + 3
    assert score_objective(effect, player) == 0
