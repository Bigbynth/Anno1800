from dataclasses import dataclass

from anno1800.models.goods import Good
from anno1800.models.industry import OwnedIndustry
from anno1800.models.population import Population
from anno1800.models.production import ProductionContext


@dataclass(frozen=True)
class ProductionResolverSnapshot:
    goods: tuple[Good, ...]
    production_record_count: int
    trade_record_count: int
    new_world_record_count: int

class ProductionResolver:
    def __init__(self, population: Population):
        self.population = population
        self.context = ProductionContext()
        self.finished = False

    @property
    def goods(self) -> list[Good]:
        return self.context.goods.copy()

    def produce(self, industry: OwnedIndustry) -> Good:
        self._ensure_active()

        production = industry.produce(self.population)

        self.context.add_production(industry=industry, worker=production.worker, good=production.good)
        return production.good

    def consume(self, good: Good, amount: int = 1) -> None:
        self._ensure_active()

        self.context.consume(good, amount)

    def has(self, good: Good, amount: int = 1) -> bool:
        return self.context.has(good, amount)

    def finish(self) -> None:
        if self.finished:
            return
        
        self.context.clear()
        self.finished = True

    def _ensure_active(self) -> None:
        if self.finished:
            raise RuntimeError(
                "Production action has already finished"
            )

    def can_pay(self, cost: dict[Good, int]) -> bool:
        self._ensure_active()

        return all(
            self.context.has(good, amount)
            for good, amount in cost.items()
        )

    def pay(self, cost: dict[Good, int]) -> None:
        self._ensure_active()

        if not self.can_pay(cost):
            raise ValueError(
                f"Cannot pay production cost: {cost}" 
            )

        for good, amount in cost.items():
            self.context.consume(good, amount)

    def add_external_good(self, good: Good, amount: int = 1) -> None:
        self._ensure_active()
        self.context.add(good, amount)

    def snapshot(self) -> ProductionResolverSnapshot:
        self._ensure_active()
        return ProductionResolverSnapshot(goods=tuple(self.context.goods), production_record_count=len(self.context.production_records), trade_record_count=len(self.context.trade_records), new_world_record_count=len(self.context.new_world_records))

    def rollback(self, snapshot: ProductionResolverSnapshot) -> None:
        self._ensure_active()

        new_records = self.context.production_records[snapshot.production_record_count:]
        for record in reversed(new_records):
            if record.industry.workplace.worker is record.worker:
                record.industry.clear_worker(exhaust=False)

        self.context.goods = list(snapshot.goods)

        del self.context.production_records[snapshot.production_record_count:]