from abc import ABC, abstractmethod
from dataclasses import dataclass

from anno1800.actions.context import ActionContext

class InvalidActionError(Exception):
    pass

@dataclass
class ActionResult:
    message: str

class GameAction(ABC):

    @abstractmethod
    def execute(self, context: ActionContext) -> ActionResult:
        raise NotImplementedError()

