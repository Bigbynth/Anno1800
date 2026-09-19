from anno1800.actions.base import ActionResult, GameAction

from anno1800.game_state import GameState
from anno1800.models.player import PlayerState
from anno1800.actions.context import ActionContext

class Game: 

    MIN_PLAYERS = 2
    MAX_PLAYERS = 4

    def __init__(self, players: list[PlayerState]):
        if not (self.MIN_PLAYERS <= len(players) <= self.MAX_PLAYERS):
            raise ValueError("Anno 1800 requires 2 to 4 players")

        self.state = GameState(players=players)

    @property
    def current_player(self) -> PlayerState:
        return self.state.current_player

    def perform_action(self, action: GameAction) -> ActionResult:
        if self.state.game_over:
            raise RuntimeError("The game is already over")

        context = ActionContext(state=self.state, player=self.current_player)
        result = action.execute(context)

        self.end_turn()

        return result

    def end_turn(self) -> None:
        current_player = self.state.current_player
        current_player.reset_trade_history()
        player_count = len(self.state.players)

        self.state.current_player_index = (self.state.current_player_index + 1) % player_count

        self.state.turn_number += 1

    def perform_free_action(self, action: GameAction) -> ActionResult:
        if self.state.game_over:
            raise RuntimeError("The game is already over")

        context = ActionContext(state=self.state, player=self.current_player)
        return action.execute(context)