from dataclasses import dataclass
from .population import PopulationType

@dataclass(frozen=True)
class ExpeditionReward:
    population_type: PopulationType
    victory_points: int


@dataclass(frozen=True)
class ExpeditionCard:
    id: str
    animal: ExpeditionReward
    artifact: ExpeditionReward