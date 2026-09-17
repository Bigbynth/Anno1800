from dataclasses import dataclass, field

from .goods import Good
from .population import Population, PopulationType

@dataclass(frozen=True)
class Industry:
    name: str
    good: Good
    worker_type: PopulationType

    build_cost: dict[Good, int] = field(default_factory=dict)

class IndustryNotAvailableError(Exception):
    pass

class WrongWorkerError(Exception):
    pass


@dataclass
class OwnedIndustry():
    industry: Industry
    occupied: bool = False

    def can_produce(self, population: Population) -> bool:
        return (
            not self.occupied
            and population.can_use(self.industry.worker_type)
        )

    def produce(self, population: Population) -> bool:
        if self.occupied:
            raise IndustryNotAvailableError(
                f"{self.industry.name} is already occupied"
            )

        if not population.can_use(self.industry.worker_type):
            raise WrongWorkerError(
                f"{self.industry.name} requires"
                f"{self.industry.worker_type.value}"
            )

        population.use(self.industry.worker_type)

        self.occupied = True

        return self.industry.good

    def clear_worker(self) -> None:
        self.occupied = False