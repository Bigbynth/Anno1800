"""Step 39 integration tests.

The scripted hand-finishing action below is a TEST DRIVER, not a game rule.
It isolates turn and end-game orchestration; actual card fulfilment is tested
separately and must be covered in the next action-validation phase.
"""
import pytest

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext
from anno1800.actions.festival import FestivalAction
from anno1800.game import Game
from anno1800.game_state import EndGamePhase


class FinishHandTestDriver(GameAction):
    def execute(self, context: ActionContext) -> ActionResult:
        context.player.hand.clear()
        return ActionResult(message="Test driver cleared hand")


@pytest.mark.parametrize("count", [2, 3, 4])
def test_full_setup_and_regular_round(count):
    game = Game.from_names([f"Player {i}" for i in range(count)])
    assert len(game.state.players) == count
    assert len(game.state.objective_cards) + len(game.state.objective_effect_cards) == 5
    assert all(len(player.hand) == 9 for player in game.state.players)

    for i in range(count):
        assert game.current_player is game.state.players[i]
        game.perform_action(FestivalAction())
        with pytest.raises(InvalidActionError):
            game.perform_action(FestivalAction())
        game.end_turn()

    assert game.state.turn_number == 2
    assert game.state.current_player_index == 0
    assert game.state.end_game_phase == EndGamePhase.NORMAL


@pytest.mark.parametrize("count,trigger_index", [(2, 0), (3, 1), (4, 3)])
def test_scripted_game_reaches_final_scores(count, trigger_index):
    game = Game.from_names([f"Player {i}" for i in range(count)])

    # Move to the player who will finish their hand.
    for _ in range(trigger_index):
        game.perform_action(FestivalAction())
        game.end_turn()

    trigger = game.current_player
    game.perform_action(FinishHandTestDriver())
    assert game.state.end_game_phase == EndGamePhase.CURRENT_ROUND_ENDING
    assert game.state.fireworks_holder is trigger
    game.end_turn()

    # Finish the current round, then play one full final round.
    while game.state.end_game_phase == EndGamePhase.CURRENT_ROUND_ENDING:
        game.perform_action(FestivalAction())
        game.end_turn()
    assert game.state.end_game_phase == EndGamePhase.FINAL_ROUND

    for _ in range(count):
        game.perform_action(FestivalAction())
        game.end_turn()

    assert game.state.game_over
    assert game.state.end_game_phase == EndGamePhase.FINISHED
    result = game.result()
    assert len(result.scores) == count
    assert result.winners
    assert next(x.score.fireworks for x in result.scores
                if x.player is trigger) == 7
    with pytest.raises(RuntimeError):
        game.perform_action(FestivalAction())
    with pytest.raises(RuntimeError):
        game.end_turn()


def test_cannot_score_before_game_ends():
    game = Game.from_names(["Alice", "Bob"])
    with pytest.raises(RuntimeError):
        game.result()


def test_from_state_keeps_initialized_decks():
    game = Game.from_names(["Alice", "Bob"])
    same_state = Game.from_state(game.state)
    assert same_state.state is game.state
    assert same_state.state.population_deck is game.state.population_deck
