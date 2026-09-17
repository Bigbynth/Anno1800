from dataclasses import dataclass, field

from .cards import PopulationCard
from .population import PopulationType

class EmptyDeckError(Exception):
    pass

@dataclass
class PopulationCardDeck:
    cards: dict[PopulationType, list[PopulationCard]] = field(default_factory=dict)
    new_world_cards: list[PopulationCard] = field(default_factory=list)

    def remaining(self, population_type: PopulationType) -> int:
        return len(self.cards.get(population_type, []))

    def is_empty(self, population_type: PopulationType) -> bool:
        return self.remaining(population_type) == 0

    def draw(self, population_type: PopulationType) -> PopulationCard:
        stack = self.cards.get(population_type)

        if not stack:
            raise EmptyDeckError(
                f"No "
                f"{population_type.value}"
                "population cards remaining"
            )
        return stack.pop()

    def remaining_new_world(self) -> int:
        return len(self.new_world_cards)

    def draw_new_world(self) -> PopulationCard:
        if not self.new_world_cards:
            raise EmptyDeckError("No New World cards remaining")

        return self.new_world_cards.pop()
    