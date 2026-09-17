from dataclasses import dataclass

from .population import PopulationType

@dataclass(frozen=True)
class WorkforceIncrease:
    population_type: PopulationType