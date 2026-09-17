from dataclasses import dataclass

from anno1800.game_state import GameState
from anno1800.models.player import PlayerState

@dataclass
class ActionContext:
    state: GameState
    player: PlayerState