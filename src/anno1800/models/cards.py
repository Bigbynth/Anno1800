from dataclasses import dataclass, field

from .goods import Good
from .population import PopulationType

@dataclass(frozen=True)
class PopulationCard:
    id: str
    population_type: PopulationType

    requirements: dict[Good, int] = field(default_factory=dict)

    victory_points: int = 0
    