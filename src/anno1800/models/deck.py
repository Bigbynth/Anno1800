from dataclasses import dataclass, field

from .cards import PopulationCard
from .population import PopulationType
from .expedition import ExpeditionCard

class EmptyDeckError(Exception):
    pass


@dataclass
class ExpeditionDeck:
    cards: list[ExpeditionCard] = field(default_factory=list)

    def remaining(self) -> int:
        return len(self.cards)

    def is_empty(self) -> bool:
        return not self.cards


    def draw(self, amount: int) -> list[ExpeditionCard]:
        if amount < 0:
            raise ValueError("Draw amount cannot be negative")

        amount = min(amount, len(self.cards))

        return [self.cards.pop() for _ in range(amount)]



@dataclass
class PopulationCardDeck:
    farmer_worker_cards: list[PopulationCard] = field(default_factory=list)
    advanced_cards: list[PopulationCard] = field(default_factory=list)
    new_world_cards: list[PopulationCard] = field(default_factory=list)

    def remaining_farmer_worker(self) -> int:
        return len(self.farmer_worker_cards)

    def remaining_advanced(self) -> int:
        return len(self.advanced_cards)

    def remaining_new_world(self) -> int:
        return len(self.new_world_cards)

    def is_empty_for_population(self, population_type: PopulationType
                                ) -> bool:
        if population_type in (PopulationType.FARMER, PopulationType.WORKER):
            return not self.farmer_worker_cards

        return not self.advanced_cards

    def remaining(self, population_type: PopulationType) -> int:
        if population_type in (PopulationType.FARMER, PopulationType.WORKER):
            return len(self.farmer_worker_cards)
        return len(self.advanced_cards)

    def is_empty(self, population_type: PopulationType) -> bool:
        return self.remaining(population_type) == 0

    def draw(self, population_type: PopulationType) -> PopulationCard:
        return self.draw_for_population(population_type)

    def draw_for_population(self, population_type: PopulationType) -> PopulationCard:
        if population_type in {PopulationType.FARMER, PopulationType.WORKER}:
            return self.draw_farmer_worker()

        return self.draw_advanced()

    def draw_farmer_worker(self) -> PopulationCard:
        if not self.farmer_worker_cards:
            raise EmptyDeckError("No farmer/worker cards remaining")

        return self.farmer_worker_cards.pop()

    def draw_advanced(self) -> PopulationCard:
        if not self.advanced_cards:
            raise EmptyDeckError("No artisan/engineer/investor cards remaining")

        return self.advanced_cards.pop()

    def draw_new_world(self) -> PopulationCard:
        if not self.new_world_cards:
            raise EmptyDeckError("No New World cards remaining")

        return self.new_world_cards.pop()    