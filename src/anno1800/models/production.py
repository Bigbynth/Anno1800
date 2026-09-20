from dataclasses import dataclass, field
from .goods import Good
from .industry import OwnedIndustry
from .population import PopulationCube
from .trade import TradeRecord
from .new_world import NewWorldProductionRecord

@dataclass(frozen=True)
class ProductionRecord:
    industry: OwnedIndustry
    worker: PopulationCube
    good: Good

@dataclass
class ProductionContext:
    goods: list[Good] = field(default_factory=list)
    new_world_records: list[NewWorldProductionRecord] = field(default_factory=list)
    production_records: list[ProductionRecord] = field(default_factory=list)

    trade_records: list[TradeRecord] = field(default_factory=list)

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

        self.production_records.append(ProductionRecord(industry=industry, worker=worker, good=good))

    def add_trade(self, record: TradeRecord) -> None:
        self.goods.append(record.good)

        self.trade_records.append(record)

    def add_new_world_production(self, record: NewWorldProductionRecord) -> None:
        self.goods.append(record.good)
        self.new_world_records.append(record)

    def clear(self) -> None:
        self.goods.clear()
        self.production_records.clear()
        self.trade_records.clear()
        self.new_world_records.clear()
