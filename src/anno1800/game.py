from anno1800.actions.base import ActionResult, GameAction, ActionTiming, InvalidActionError

from anno1800.game_state import GameState, EndGamePhase
from anno1800.models.player import PlayerState
from anno1800.actions.context import ActionContext
from anno1800.turn import TurnState

class Game: 

    MIN_PLAYERS = 2
    MAX_PLAYERS = 4


    def __init__(self, players: list[PlayerState]):
        if not (self.MIN_PLAYERS <= len(players) <= self.MAX_PLAYERS):
            raise ValueError("Anno 1800 requires 2 to 4 players")

        self.state = GameState(players=players)
        self.turn_state = TurnState()

    @property
    def current_player(self) -> PlayerState:
        return self.state.current_player

    def perform_action(self, action: GameAction) -> ActionResult:
        if self.state.game_over:
            raise RuntimeError("The game is already over")

        if action.timing != ActionTiming.MAIN:
            raise InvalidActionError("Expected a main action")

        if self.turn_state.main_action_used:
            raise InvalidActionError("Main action has already been used this turn")

        context = ActionContext(state=self.state, player=self.current_player)
        hand_size_before = len(self.current_player.hand)
        result = action.execute(context)
        
        self.turn_state.consume_main_action()
        self._check_end_game_trigger(player=self.current_player, hand_size_before=hand_size_before)
        return result

    def end_turn(self) -> None:
        if not self.turn_state.main_action_used:
            raise InvalidActionError("Player must perform a main action before ending the turn")
        current_player = self.current_player
        current_player.reset_trade_history()
        player_count = len(self.state.players)

        self.state.current_player_index += 1

        round_finished = (self.state.current_player_index) >= player_count

        if round_finished:
            self.state.current_player_index = 0
            self.state.turn_number += 1

            self._handle_round_end()

        self.turn_state.reset()

    def perform_free_action(self, action: GameAction) -> ActionResult:
        if self.state.game_over:
            raise RuntimeError("The game is already over")

        if action.timing != ActionTiming.FREE:
            raise InvalidActionError("Expected a free action")

        context = ActionContext(state=self.state, player=self.current_player)
        hand_size_before = len(self.current_player.hand)
        result = action.execute(context)
        self._check_end_game_trigger(player=self.current_player, hand_size_before=hand_size_before)

        return result

    def _check_end_game_trigger(self, player: PlayerState, hand_size_before: int) -> None:
        if (self.state.end_game_phase) != EndGamePhase.NORMAL:
            return

        if (hand_size_before > 0 and not player.hand):
            self.state.trigger_end_game(player)


    def _handle_round_end(self) -> None:
         phase = self.state.end_game_phase

         if phase == EndGamePhase.CURRENT_ROUND_ENDING:
             self.state.end_game_phase = EndGamePhase.FINAL_ROUND
             return

         if phase == EndGamePhase.FINAL_ROUND:
             self.state.end_game_phase = (EndGamePhase.FINISHED)
             self.state.game_over = True

        

    