from abc import ABC, abstractmethod
from dataclasses import dataclass

from anno1800.models.player import PlayerState

class InvalidActionError(Exception):
    pass

@dataclass
class ActionResult:
    message: str

class GameAction(ABC):

    @abstractmethod
    def execute(self, player: PlayerState) -> ActionResult:
        raise NotImplementedError()

