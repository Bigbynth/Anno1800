from dataclasses import dataclass, field

from .industry import Industry, OwnedIndustry
from .island import Island
from .population import Population, PopulationType
from .ship import ShipType, Ship
from .cards import PopulationCard
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
    ships: list[Ship] = field(default_factory=list)
    hand: list[PopulationCard] = field(default_factory=list)
    completed_cards: list[PopulationCard] = field(default_factory=list)

    gold: int = 0

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

    def add_card(self, card: PopulationCard) -> None:
        self.hand.append(card)

    def add_gold(self, amount: int) -> None:

        if amount < 0:
            raise ValueError("Amount cannot be negative")

        self.gold += amount

    def can_spend_gold(self, amount: int) -> bool:
        return self.gold >= amount

    def spend_gold(self, amount: int) -> None:
        if amount < 0:
            raise ValueError("Amount cannot be negative")

        if not self.can_spend_gold(amount):
            raise ValueError("Not enough gold")

        self.gold -= amount

    def has_card(self, card: PopulationCard) -> bool:
        return card in self.hand

    def complete_card(self, card: PopulationCard) -> None:
        if card not in self.hand:
            raise ValueError(
                f"Card {card.id} is not in player's hand"
            )

        self.hand.remove(card)
        self.completed_cards.append(card)

    def card_victory_points(self) -> int:
        return sum(card.victory_points for card in self.completed_cards)

    def total_victory_points(self) -> int:
        return self.victory_points + self.card_victory_points()

    def add_ship(self, ship: Ship) -> None:
        self.ships.append(ship)

    def get_ships(self, ship_type: ShipType) -> list[Ship]:
        return [ship for ship in self.ships if ship.ship_type == ship_type]

    def available_ship_capacity(self, ship_type: ShipType) -> int:
        return sum(ship.available_capacity for ship in self.get_ships(ship_type))

    def ship_usage_snapshot(self) -> list[int]:
        return [ship.used for ship in self.ships]

    def restore_ship_usage(self, snapshot: list[int]) -> None:
        if len(snapshot) != len(self.ships):
            raise ValueError("Invalid ship snapshot")

        for ship, used in zip(self.ships, snapshot):
            ship.used = used

    def refresh_ships(self) -> None:
        for ship in self.ships:
            ship.refresh()
