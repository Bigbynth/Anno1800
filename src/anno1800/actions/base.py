from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

from anno1800.actions.context import ActionContext


class ActionTiming(str, Enum):
    MAIN = "main"
    FREE = "free"

class InvalidActionError(Exception):
    pass

@dataclass
class ActionResult:
    message: str

class GameAction(ABC):
    timing: ActionTiming = ActionTiming.MAIN

    def execute(self, context: ActionContext) -> ActionResult:
        raise NotImplementedError()

