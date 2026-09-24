from dataclasses import dataclass
from typing import TypeAlias
from enum import Enum

class ObjectiveType(str, Enum):
    END_GAME = "end_game"
    EFFECT = "effect"

@dataclass(frozen=True)
class IndustryObjectiveRule:
    industries: tuple[str, ...]
    points_per_industry: int

    def __post_init__(self) -> None:
        if not self.industries:
            raise ValueError("Industry objective requires at least one industry")

        if self.points_per_industry < 0:
            raise ValueError("Points per industry cannot be negative")

@dataclass(frozen=True)
class PopulationObjectiveRule:
    population_type: str
    minimum: int
    points: int

    def __post_init__(self) -> None:
        if self.minimum <= 0:
            raise ValueError("Population minimum must be positive")

        if self.points < 0:
            raise ValueError("Objective points cannot be negative")

@dataclass(frozen=True)
class ResourceObjectiveRule:
    resource: str
    minimum: int
    points: int

    def __post_init__(self) -> None:
        if self.minimum <= 0:
            raise ValueError("Resource minimum must be positive")

        if self.points < 0:
            raise ValueError("Objective points cannot be negative")

ObjectiveRule: TypeAlias =(
    IndustryObjectiveRule
    | PopulationObjectiveRule
    | ResourceObjectiveRule
)

@dataclass(frozen=True)
class ObjectiveCard:
    id: str
    name: str
    objective_type: ObjectiveType
    rule: ObjectiveRule