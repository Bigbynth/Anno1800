from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from anno1800.models.player import PlayerState

if TYPE_CHECKING:
    from anno1800.game_state import GameState

@dataclass(frozen=True)
class ActionContext:
    state: GameState
    player: PlayerState