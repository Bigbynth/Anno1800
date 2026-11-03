import pytest

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext
from anno1800.actions.festival import FestivalAction
from anno1800.game import Game
from anno1800.game_state import EndGamePhase
from anno1800.models.player import PlayerState


class FinishHandTestDriver(GameAction):
    """Test-only action: isolates turn sequencing from card fulfilment."""

    def execute(self, context: ActionContext) -> ActionResult:
        context.player.hand.clear()
        return ActionResult(message="Test driver finished hand")


@pytest.mark.parametrize("count", [2, 3, 4])
def test_round_robin_and_main_action_limit(count):
    game = Game.from_names([f"Player {i}" for i in range(count)])
    for round_number in range(1, 4):
        for position in range(count):
            assert game.state.turn_number == round_number
            assert game.state.current_player_index == position
            with pytest.raises(InvalidActionError):
                game.end_turn()
            game.perform_action(FestivalAction())
            with pytest.raises(InvalidActionError):
                game.perform_action(FestivalAction())
            game.end_turn()
    assert game.state.turn_number == 4
    assert game.state.end_game_phase == EndGamePhase.NORMAL


@pytest.mark.parametrize("count", [2, 3, 4])
@pytest.mark.parametrize("trigger_index", [0, 1, 2, 3])
def test_final_round_all_trigger_positions(count, trigger_index):
    if trigger_index >= count:
        pytest.skip("No player at this position")
    game = Game.from_names([f"Player {i}" for i in range(count)])
    for _ in range(trigger_index):
        game.perform_action(FestivalAction())
        game.end_turn()
    trigger = game.current_player
    game.perform_action(FinishHandTestDriver())
    assert game.state.fireworks_holder is trigger
    assert game.state.end_game_phase == EndGamePhase.CURRENT_ROUND_ENDING
    game.end_turn()
    while game.state.end_game_phase == EndGamePhase.CURRENT_ROUND_ENDING:
        game.perform_action(FestivalAction())
        game.end_turn()
    assert game.state.end_game_phase == EndGamePhase.FINAL_ROUND
    assert game.state.current_player_index == 0
    for index in range(count):
        assert game.state.current_player_index == index
        assert not game.state.game_over
        game.perform_action(FestivalAction())
        game.end_turn()
    assert game.state.game_over
    assert game.state.end_game_phase == EndGamePhase.FINISHED
    assert game.state.fireworks_holder is trigger
    assert game.result().winners
    with pytest.raises(RuntimeError):
        game.end_turn()


def test_invalid_trigger_does_not_modify_state():
    game = Game.from_names(["Alice", "Bob"])
    with pytest.raises(ValueError):
        game.state.trigger_end_game(PlayerState(name="Outsider"))
    assert game.state.end_game_phase == EndGamePhase.NORMAL
    assert game.state.fireworks_holder is None


@pytest.mark.parametrize("index,turn", [(-1, 1), (2, 1), (0, 0)])
def test_reject_invalid_resumed_game_state(index, turn):
    game = Game.from_names(["Alice", "Bob"])
    game.state.current_player_index = index
    game.state.turn_number = turn
    with pytest.raises(ValueError):
        Game.from_state(game.state)
