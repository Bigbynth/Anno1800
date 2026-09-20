from dataclasses import dataclass, field

from .industry import Industry, OwnedIndustry
from .island import Island
from .population import Population, PopulationType
from .ship import NavalToken, NavalTokenType, Ship, Shipyard
from .cards import PopulationCard
from .new_world import NewWorldIsland
from .goods import Good
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
    shipyards: list[Shipyard] = field(default_factory=list)
    naval_tokens: list[NavalToken] = field(default_factory=list)
    new_world_islands: list[NewWorldIsland] = field(default_factory=list)
    hand: list[PopulationCard] = field(default_factory=list)
    completed_cards: list[PopulationCard] = field(default_factory=list)
    traded_goods_this_turn: set[Good] = field(default_factory=set)

    gold: int = 0

    def add_population(self, population_type: PopulationType, amount: int = 1) -> None:
        self.population.add(population_type, amount)

    def add_industry(self, industry: Industry, space_id: str | None = None) -> OwnedIndustry:
        return self.island.add_industry(industry, space_id=space_id)

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

        for _ in range(ship.trade_token):
            self.naval_tokens.append(NavalToken(token_type=(NavalTokenType.TRADE)))

        for _ in range(ship.exploration_tokens):
            self.naval_tokens.append(NavalToken(token_type=NavalTokenType.EXPLORATION))

    def available_ship_capacity(self, token_type: NavalTokenType) -> int:
        return sum(1 for token in self.naval_tokens if (token.token_type == token_type and token.available))

    def naval_token_snapshot(self) -> list[bool]:
        return [token.exhausted for token in self.naval_tokens]

    def restore_naval_token(self, snapshot: list[bool]) -> None:
        if len(snapshot) != len(self.naval_tokens):
            raise ValueError("Invalid naval token snapshot")

        for token, exhausted in zip(self.naval_tokens, snapshot):
            token.exhausted = exhausted

    def refresh_naval_tokens(self) -> None:
        for token in self.naval_tokens:
            token.refresh()

    def add_naval_tokens(self, token_type: NavalTokenType, amount: int = 1) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        for _ in range(amount):
            self.naval_tokens.append(NavalToken(token_type=token_type))

    def add_new_world_island(self, island: NewWorldIsland) -> None:
        self.new_world_islands.append(island)

    def has_new_world_resource(self, good) -> bool:
        return any(island.has_resource(good) for island in self.new_world_islands)

    def has_traded_good(self, good: Good) -> bool:
        return (good in self.traded_goods_this_turn)

    def record_traded_good(self, good: Good) -> None:
        self.traded_goods_this_turn.add(good)

    def reset_trade_history(self) -> None:
        self.traded_goods_this_turn.clear()

    def can_activate_card(self, card: PopulationCard) -> bool:
        return (card in self.completed_cards and not card.activated)

    def activate_card(self, card: PopulationCard) -> None:
        if card not in self.completed_cards:
            raise ValueError(
                f"Card {card.id} has not been completed"
            )
        card.activate()

    def add_shipyard(self, shipyard: Shipyard) -> None:
        self.shipyards.append(shipyard)

    def has_shipyard(self, shipyard: Shipyard) -> bool:
        return (shipyard in self.shipyards)

    def available_shipyards_for(self, ship: Ship) -> list[Shipyard]:
        return [shipyard for shipyard in self.shipyards if shipyard.can_build(ship)]