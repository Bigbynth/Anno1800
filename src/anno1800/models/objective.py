from dataclasses import dataclass
from typing import TypeAlias
from enum import Enum

class ObjectiveType(str, Enum):
    END_GAME = "end_game"
    EFFECT = "effect"

@dataclass(frozen=True)
class ObjectiveCard:
    id: str
    name: str
    objective_type: ObjectiveType

@dataclass(frozen=True)
class IndustryObjectiveRule:
    industries: tuple[str, ...]
    points_per_industry: int

@dataclass(frozen=True)
class PopulationObjectiveRule:
    population_type: str
    minimum: int
    points: int

@dataclass(frozen=True)
class ResourceObjectiveRule:
    resource: str
    minimum: int
    points: int

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