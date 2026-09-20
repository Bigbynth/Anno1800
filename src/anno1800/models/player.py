from dataclasses import dataclass, field

from .industry import Industry, OwnedIndustry
from .island import Island
from .population import Population, PopulationType, PopulationCube
from .ship import NavalToken, NavalTokenType, Ship, Shipyard, NavalTokenSnapshot
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

    def add_population(self, population_type: PopulationType, amount: int = 1) -> list[PopulationCube]:
        return self.population.add(population_type, amount)

    def add_industry(self, industry: Industry, space_id: str | None = None) -> OwnedIndustry:
        return self.island.add_industry(industry, space_id=space_id)

    def has_industry(self, industry: Industry) -> bool:
        return self.island.has_industry(industry)

    def get_industry(self, industry: Industry) -> OwnedIndustry:
        return self.island.get_industry(industry)

    def get_industries(self, industry: Industry) -> list[OwnedIndustry]:
        return self.island.get_industries(industry)

    def get_all_industries(self) -> list[OwnedIndustry]:
        return self.island.industries.copy()

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

    def add_ship(self, ship: Ship, space_id: str | None = None) -> None:
        if space_id is not None:
            self.island.place(space_id, ship)
        self.ships.append(ship)

        for _ in range(ship.trade_token):
            self.naval_tokens.append(NavalToken(token_type=NavalTokenType.TRADE, ship=ship))

        for _ in range(ship.exploration_tokens):
            self.naval_tokens.append(NavalToken(token_type=NavalTokenType.EXPLORATION, ship=ship))

    def available_ship_capacity(self, token_type: NavalTokenType) -> int:
        return sum(1 for token in self.naval_tokens if (token.token_type == token_type and token.available))

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

    def add_shipyard(self, shipyard: Shipyard, space_id: str | None = None) -> None:
        if space_id is not None:
            self.island.place(space_id, shipyard)
        self.shipyards.append(shipyard)

    def has_shipyard(self, shipyard: Shipyard) -> bool:
        return (shipyard in self.shipyards)

    def available_shipyards_for(self, ship: Ship) -> list[Shipyard]:
        return [shipyard for shipyard in self.shipyards if shipyard.can_build(ship)]

    def remove_construction(self, space_id: str):
        space = self.island.get_space(space_id)

        construction = space.construction

        if construction is None:
            raise ValueError(f"Island space {space_id} is empty")

        if isinstance(construction, OwnedIndustry):
            construction.clear_worker(exhaust=True)
            self.island.remove_construction(space_id)
            return construction

        if isinstance(construction, Shipyard):
            self.island.remove_from_space(space_id)
            self._remove_by_identity(self.shipyards, construction)
            return construction

        if isinstance(construction, Ship):
            self.island.remove_from_space(space_id)
            self._remove_by_identity(self.ships, construction)
            self._remove_ship_naval_tokens(construction)
            return construction
        raise ValueError("Unknown construction type")

    @staticmethod
    def _remove_by_identity(items: list, target) -> None:
        for index, item in enumerate(items):
            if item is target:
                items.pop(index)
                return

        raise ValueError("Construction is not owned by this player")

    def _remove_ship_naval_tokens(self, ship: Ship) -> None:
        self.naval_tokens = [token for token in self.naval_tokens if token.ship is not ship]

    def replace_construction(self, space_id: str, construction) -> object:
        space = self.island.get_space(space_id)

        existing = (space.construction)

        if existing is None:
            raise ValueError(f"Island space {space_id} is empty")

        try:
            if not space.can_place(construction):
                raise ValueError(f"Cannot place construction on space {space.id}")

        finally:
            space.construction = (existing)

        removed = (self.remove_construction(space_id))
        if isinstance(construction, OwnedIndustry):
            space.place(construction)
            self.island.industries.append(construction)

        elif isinstance(construction, Shipyard):
            space.place(construction)
            self.shipyards.append(construction)

        elif isinstance(construction, Ship):
            self.add_ship(construction, space_id=space_id)

        else:
            raise ValueError("Unknown construction type")

        return removed

    def available_naval_tokens(self, token_type: NavalTokenType) -> list[NavalToken]:
        return [token for token in self.naval_tokens if token.token_type == token_type and token.available]

    def use_naval_tokens(self, token_type: NavalTokenType, amount: int) -> list[NavalToken]:
        if amount < 0:
            raise ValueError("Naval token amount cannot be negative")

        available = (self.available_naval_tokens(token_type))
        if len(available) < amount:
            raise ValueError(f"Not enough available {token_type.value} tokens")

        selected = available[:amount]
        for token in selected:
            token.use()

        return selected

    def remove_gold(self, amount: int) -> None:
        if amount < 0:
            raise ValueError("Gold amount cannot be negative")

        if self.gold < amount:
            raise ValueError("Not enough gold")

        self.gold -= amount

    def naval_token_snapshot(self) -> list[NavalTokenSnapshot]:
        return [NavalTokenSnapshot(token=token, exhausted=token.exhausted) for token in self.naval_tokens]

    def restore_naval_tokens(self, snapshot: list[NavalTokenSnapshot]) -> None:
        original_tokens: list[NavalToken] = []

        for item in snapshot:
            item.token.exhausted = item.exhausted

            original_tokens.append(item.token)

        self.naval_tokens = original_tokens

    def refresh_naval_tokens(self) -> None:
        for token in self.naval_tokens:
            if token.exhausted:
                token.refresh()