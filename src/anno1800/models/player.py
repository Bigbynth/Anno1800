from dataclasses import dataclass, field

from .industry import Industry, OwnedIndustry
from .island import Island
from .population import Population, PopulationType

from anno1800.services.production import ProductionResolver

@dataclass
class PlayerState:
    name: str

    population: Population = field(
        default_factory=Population
    )

    island: Island = field(
        default_factory=lambda: Island(
            name="Home Island"
        )
    )

    victory_points: int = 0

    def add_population(self, population_type: PopulationType, amount: int = 1) -> None:
        self.population.add(population_type, amount)

    def add_industry(self, industry: Industry) -> OwnedIndustry:
        return self.island.add_industry(industry)

    def has_industry(self, industry: Industry) -> bool:
        return self.island.has_industry(industry)

    def get_industry(self, industry: Industry) -> OwnedIndustry:
        return self.island.get_industry(industry)

    def get_industries(self, industry: Industry) -> list[OwnedIndustry]:
        return self.island.get_industries(industry)

    def start_production(self) -> ProductionResolver:
        return ProductionResolver(self.population)

    def add_victory_points(self, amount: int) -> None:
        if amount < 0:
            raise ValueError("victory points cannot be negative")

        self.victory_points += amount

    def refresh_population(self) -> None: 
        self.population.refresh_all()
        self.island.clear_worker()