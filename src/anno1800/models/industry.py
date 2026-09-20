from dataclasses import dataclass, field

from .goods import Good
from .population import Population, PopulationType, PopulationCube

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


@dataclass(frozen=True)
class IndustryProduction:
    good: Good
    worker: PopulationCube

@dataclass
class Workplace:
    worker: PopulationCube | None = None

    @property
    def is_occupied(self) -> bool:
        return self.worker is not None

    @property
    def is_empty(self) -> bool:
        return self.worker is None

    def assign(self, worker: PopulationCube) -> None:
        if self.worker is not None:
            raise ValueError("Workplace is already occupied")

        if not worker.is_assigned:
            raise ValueError(f"Population cube {worker.id} must be assigned first")

        self.worker = worker

    def release(self, *, exhaust: bool) -> PopulationCube | None:
        worker = self.worker

        if worker is None:
            return None

        self.worker = None

        if exhaust:
            worker.exhaust()
        else:
            worker.refresh()

        return worker

@dataclass
class OwnedIndustry():
    industry: Industry
    workplace: Workplace = field(default_factory=Workplace)

    @property
    def occupied(self) -> bool:
        return self.workplace.is_occupied

    def can_produce(self, population: Population) -> bool:
        return (
            self.workplace.is_empty
            and population.can_use(self.industry.worker_type)
        )

    def produce(self, population: Population) -> IndustryProduction:

        if not self.can_produce(population):
            raise ValueError(f"{self.industry.name} cannot produce")

        worker = population.acquire_available(self.industry.worker_type)

        try:
            self.workplace.assign(worker)

        except Exception:
            worker.refresh()
            raise

        return IndustryProduction(good=self.industry.good, worker=worker)

    def clear_worker(self, *, exhaust: bool = False)  -> PopulationCube | None:
        return self.workplace.release(exhaust=exhaust)