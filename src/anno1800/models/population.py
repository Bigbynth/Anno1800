from enum import Enum
from dataclasses import dataclass, field

class PopulationType(str, Enum):
    FARMER = "farmer"
    WORKER = "worker"
    ARTISAN = "artisan"
    ENGINEER = "engineer"
    INVESTOR = "investor"

POPULATION_ORDER  = (
    PopulationType.FARMER,
    PopulationType.WORKER,
    PopulationType.ARTISAN,
    PopulationType.ENGINEER,
    PopulationType.INVESTOR
)

NEXT_POPULATION_TYPE = {
    PopulationType.FARMER: PopulationType.WORKER,
    PopulationType.WORKER: PopulationType.ARTISAN,
    PopulationType.ARTISAN: PopulationType.ENGINEER,
    PopulationType.ENGINEER: PopulationType.INVESTOR
}

def next_population_type(population_type: PopulationType) -> PopulationType | None:
    return NEXT_POPULATION_TYPE.get(population_type)

@dataclass
class Population:
    avalable: dict[PopulationType, int] = field(
        default_factory=lambda: {
            population_type: 0
            for population_type in POPULATION_ORDER
        }
    )

    exhausted: dict[PopulationType, int] = field(
        default_factory=lambda: {
            population_type: 0
            for population_type in POPULATION_ORDER
        }
    )

    def total(self, population_type: PopulationType) -> int:
        return (
            self.avalable[population_type] + self.exhausted[population_type]
        )

    def add(self, population_type: PopulationType, amount: int = 1) -> None:
        if amount < 0:
            raise ValueError("Amount cannot be negative")

        self.avalable[population_type] += amount

    def can_use(self, population_type: PopulationType, amount: int = 1) -> bool:
        return self.avalable[population_type] >= amount

    def use(self, population_type: PopulationType, amount: int = 1) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        if not self.can_use(population_type, amount):
            raise ValueError(f"not enough available {population_type.value}")

        self.avalable[population_type] -= amount
        self.exhausted[population_type] += amount

    def refresh_all(self) -> None:
        for population_type in POPULATION_ORDER:
            self.avalable[population_type] += (
                self.exhausted[population_type]
            )
            self.exhausted[population_type] = 0 

    def snapshot(self) -> tuple[dict[PopulationType, int], dict[PopulationType, int]]:
        return (self.avalable.copy(), self.exhausted.copy())

    def restore(self, snapshot: tuple[dict[PopulationType, int], dict[PopulationType, int]]) -> None:
        available, exhausted = snapshot
        self.avalable = available.copy()
        self.exhausted = exhausted.copy() 

    def can_upgrade_available(self, from_type: PopulationType) -> bool:
        return self.avalable[from_type] > 0

    def upgrade_available(self, from_type: PopulationType) -> PopulationType:
        to_type = next_population_type(from_type)

        if to_type is None:
            raise ValueError(
                f"{from_type.value} cannot"
                f"be upgraded"
            )


        if not self.can_upgrade_available(from_type):
            raise ValueError(
                f"No available "
                f"{from_type.value}"
                f"to upgrade"
            )

        self.avalable[from_type] -= 1
        self.avalable[to_type] += 1

        return to_type

    

