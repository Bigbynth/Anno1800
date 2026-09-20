from dataclasses import dataclass, field
from .goods import Good
from .industry import OwnedIndustry
from .population import PopulationCube

@dataclass(frozen=True)
class ProductionRecord:
    industry: OwnedIndustry
    worker: PopulationCube
    good: Good

@dataclass
class ProductionContext:
    goods: list[Good] = field(default_factory=list)
    records: list[ProductionRecord] = field(default_factory=list)

    def add(self, good: Good) -> None:
        self.goods.append(good)

    def has(self, good: Good, amount: int = 1) -> bool:
        return self.goods.count(good) >= amount

    def consume(self, good: Good, amount: int = 1) -> None:
        if not self.has(good, amount):
            raise ValueError(
                f"Not enough {good.value}"
                f"need {amount}, have {self.goods.count(good)}"
            )

        for _ in range(amount):
            self.goods.remove(good)

    def add_production(self, *, industry: OwnedIndustry, worker: PopulationCube, good: Good) -> None:
        self.goods.append(good)

        self.records.append(ProductionRecord(industry=industry, worker=worker, good=good))

    def clear(self) -> None:
        self.goods.clear()
        self.records.clear()
