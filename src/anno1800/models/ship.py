from dataclasses import dataclass, field
from .goods import Good
from enum import Enum

class ShipType(str, Enum):
    TRADE = "trade"
    EXPLORATION = "exploration"

class NavalTokenType(str, Enum):
    TRADE = "trade"
    EXPLORATION = "exploration"

@dataclass
class NavalToken:
    token_type: NavalTokenType
    exhausted: bool = False

    @property
    def available(self) -> bool:
        return not self.exhausted

    def use(self) -> None:
        if self.exhausted:
            raise ValueError(
                f"{self.token_type.value} token is already exhausted"
            )

    def refresh(self) -> None:
        self.exhausted = False

@dataclass(frozen=True)
class Ship:
    name: str
    ship_type: ShipType

    trade_token: int = 0
    exploration_tokens: int = 0

    build_cost: dict[Good, int] = field(default_factory=dict)
    requires_shipyard: bool = True

    def __post_init__(self) -> None:
        if (self.trade_token < 0 or self.exploration_tokens < 0):
            raise ValueError("Ship token counts cannot be negative")
