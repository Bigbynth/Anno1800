import pytest
from anno1800.game import Game
from anno1800.actions.base import InvalidActionError
from anno1800.actions.expand import ExpandAction
from anno1800.actions.explore_new_world import ExploreNewWorldAction
from anno1800.actions.open_old_world import OpenOldWorldAction
from anno1800.actions.take_expedition_cards import TakeExpeditionCardsAction
from anno1800.actions.festival import FestivalAction
from anno1800.models.ship import NavalTokenType

def snapshot(game):
    p=game.current_player
    s=game.state
    return (
        tuple((id(c), c.state) for c in p.population.cubes),
        tuple((id(t), t.exhausted) for t in p.naval_tokens),
        tuple(id(c) for c in p.hand),
        tuple(id(c) for c in p.expedition_cards),
        tuple(id(i) for i in p.new_world_islands),
        tuple(id(i) for i in p.old_world_islands),
        tuple(id(c) for c in s.expedition_deck.cards),
        tuple(id(c) for c in s.population_deck.new_world_cards),
        tuple(id(i) for i in s.new_world_islands),
        tuple(id(i) for i in s.old_world_islands),
        tuple(sorted(s.industry_supply.items())),
        tuple(sorted(s.ship_supply.items())),
        tuple(sorted(s.shipyard_supply.items())),
        p.gold,
        game.turn_state.main_action_used,
    )

@pytest.mark.parametrize("action", [
    ExpandAction(steps=[]),
    ExploreNewWorldAction(),
    OpenOldWorldAction(),
    TakeExpeditionCardsAction(),
])
def test_invalid_actions_are_atomic(action):
    game=Game.from_names(["Alice","Bob"])
    game.current_player.naval_tokens.clear()
    before=snapshot(game)
    with pytest.raises(InvalidActionError):
        game.perform_action(action)
    assert snapshot(game)==before

def test_invalid_action_does_not_consume_main_action():
    game=Game.from_names(["Alice","Bob"])
    with pytest.raises(InvalidActionError):
        game.perform_action(ExpandAction(steps=[]))
    assert not game.turn_state.main_action_used
    game.perform_action(FestivalAction())
    assert game.turn_state.main_action_used

def test_expedition_rollback_after_deck_draw(monkeypatch):
    game=Game.from_names(["Alice","Bob"])
    p=game.current_player
    # Ensure the test reaches the injected failure after token use and deck draw.
    from copy import deepcopy
    p.naval_tokens.append(deepcopy(p.available_naval_tokens(NavalTokenType.EXPLORATION)[0]))
    assert len(p.available_naval_tokens(NavalTokenType.EXPLORATION)) >= 2
    before=snapshot(game)
    def fail(_cards):
        raise RuntimeError("Injected failure")
    monkeypatch.setattr(p,"add_expedition_cards",fail)
    with pytest.raises(RuntimeError,match="Injected failure"):
        game.perform_action(TakeExpeditionCardsAction())
    assert snapshot(game)==before

def test_new_world_rollback_after_island_draw(monkeypatch):
    game=Game.from_names(["Alice","Bob"])
    p=game.current_player
    assert p.available_naval_tokens(NavalTokenType.EXPLORATION)
    before=snapshot(game)
    def fail(_island):
        raise RuntimeError("Injected failure")
    monkeypatch.setattr(p,"add_new_world_island",fail)
    with pytest.raises(RuntimeError,match="Injected failure"):
        game.perform_action(ExploreNewWorldAction())
    assert snapshot(game)==before
