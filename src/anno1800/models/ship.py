from dataclasses import dataclass, field
from __future__ import annotations
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
    ship: Ship | None = None
    exhausted: bool = False

    @property
    def available(self) -> bool:
        return not self.exhausted

    def use(self) -> None:
        if self.exhausted:
            raise ValueError(
                f"{self.token_type.value} token is already exhausted"
            )
        self.exhausted = True

    def refresh(self) -> None:
        self.exhausted = False


@dataclass(frozen=True)
class NavalTokenSnapshot:
    token: NavalToken
    exhausted: bool


@dataclass(frozen=True)
class Ship:
    name: str
    ship_type: ShipType
    strength: int = 1

    trade_token: int = 0
    exploration_tokens: int = 0

    build_cost: dict[Good, int] = field(default_factory=dict)
    requires_shipyard: bool = True

    def __post_init__(self) -> None:
        if (self.trade_token < 0 or self.exploration_tokens < 0):
            raise ValueError("Ship token counts cannot be negative")

        if self.strength not in {1,2,3}:
            raise ValueError("Ship strength must be 1, 2, or 3")

        if (self.trade_token + self.exploration_tokens != self.strength):
            raise ValueError("A ship must grant naval tokens equal to its strength")


@dataclass(frozen=True)
class Shipyard:
    name: str
    strength: int
    build_cost: dict[Good, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.strength not in {1,2,3}:
            raise ValueError("Shipyard strength must be 1,2, or 3")

    def can_build(self, ship: Ship) -> bool:
        return (ship.strength <= self.strength)
