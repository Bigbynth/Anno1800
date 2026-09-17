from anno1800.models.goods import Good
from anno1800.models.industry import OwnedIndustry
from anno1800.models.population import Population
from anno1800.models.production import ProductionContext

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

        good = industry.produce(self.population)

        self.context.add(good)

        return good

    def consume(self, good: Good, amount: int = 1) -> None:
        self._ensure_active()

        self.context.consume(good, amount)

    def has(self, good: Good, amount: int = 1) -> bool:
        return self.context.has(good, amount)

    def finish(self) -> None:
        self._ensure_active()

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

    