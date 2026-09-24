from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from .goods import Good
from .population import PopulationType

@dataclass
class PopulationCard:
    id: str
    population_type: PopulationType
    effects: tuple[CardEffect, ...] = field(default_factory=tuple)
    activated: bool = False
    requirements: dict[Good, int] = field(default_factory=dict)

    victory_points: int = 0
    is_new_world: bool = False

    def activate(self) -> None:
        if self.activated:
            raise ValueError(
                f"Card {self.id} has already been activated"
            )

        self.activated = True

class CardEffectType(str, Enum):
    GAIN_GOLD = "gain_gold"
    GAIN_TRADE_CAPACITY = "gain_trade_capacity"
    GAIN_EXPLORATION_CAPACITY = "gain_exploration_capacity"
    GAIN_POPULATION = "gain_population"

@dataclass(frozen=True)
class CardEffect:
    effect_type: CardEffectType
    amount: int = 1
    population_type: PopulationType | None = None

    def __post_init__(self) -> None:
        if self.amount <= 0:
            raise ValueError("Effect amount must be positive")

        if self.effect_type == CardEffectType.GAIN_POPULATION and self.population_type is None:
            raise ValueError("Population effect requires a population type")
    