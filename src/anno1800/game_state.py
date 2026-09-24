from dataclasses import dataclass, field
from enum import Enum

from anno1800.models.deck import PopulationCardDeck, ExpeditionDeck
from anno1800.models.player import PlayerState
from anno1800.models.industry import Industry

from anno1800.data.new_world import NEW_WORLD_CARDS, create_new_world_islands
from anno1800.data.industries import create_industry_supply, get_industry_definition
from anno1800.data.ships import create_ship_supply, get_ship_definition
from anno1800.data.shipyards import create_shipyard_supply, get_shipyard_definition
from anno1800.data.old_world import create_old_world_islands
from anno1800.data.expeditions import create_expedition_deck
from anno1800.data.cards import create_population_deck
from anno1800.data.objectives import create_objective_cards

from anno1800.models.new_world import NewWorldIsland
from anno1800.models.old_world import OldWorldIsland
from anno1800.models.objective import ObjectiveCard
from anno1800.models.ship import Ship, Shipyard

from copy import deepcopy

def create_default_deck() -> PopulationCardDeck:
    deck = create_population_deck()

    deck.new_world_cards = deepcopy(NEW_WORLD_CARDS)

    return deck

class EndGamePhase(str, Enum):
    NORMAL = "normal"
    CURRENT_ROUND_ENDING = "current_round_ending"
    FINAL_ROUND = "final_round"
    FINISHED = "finished"



@dataclass
class GameState:
    players: list[PlayerState] = field(
        default_factory=list
    )

    industry_supply: dict[str, int] = field(default_factory=create_industry_supply)
    ship_supply: dict[str, int] = field(default_factory=create_ship_supply)
    shipyard_supply: dict[str, int] = field(default_factory=create_shipyard_supply)

    current_player_index: int = 0

    turn_number: int = 1

    game_over: bool = False

    objective_cards: list[ObjectiveCard] = field(default_factory=list)
    objective_deck: list[ObjectiveCard] = field(default_factory=create_objective_cards)
    expedition_deck: ExpeditionDeck = field(default_factory=create_expedition_deck)
    population_deck: PopulationCardDeck = field(default_factory=create_default_deck)
    new_world_islands: list[NewWorldIsland] = field(default_factory=create_new_world_islands)
    old_world_islands: list[OldWorldIsland] = field(default_factory=create_old_world_islands)

    end_game_phase: EndGamePhase = EndGamePhase.NORMAL
    end_game_triggered_by: PlayerState | None = None
    fireworks_holder: PlayerState | None = None

    @property
    def current_player(self) -> PlayerState:
        if not self.players:
            raise RuntimeError("Game has no players")

        return self.players[self.current_player_index]

    def draw_new_world_island(self) -> NewWorldIsland:
        if not self.new_world_islands:
            raise RuntimeError("No New World islands remaining")

        return self.new_world_islands.pop()

    def draw_old_world_island(self) -> OldWorldIsland:
        if not self.old_world_islands:
            raise RuntimeError("No Old World islands remaining")

        return self.old_world_islands.pop()

    def trigger_end_game(self, player: PlayerState) -> None:
        if self.end_game_phase != EndGamePhase.NORMAL:
            return

        self.end_game_phase = (EndGamePhase.CURRENT_ROUND_ENDING)

        self.end_game_triggered_by = player
        self.fireworks_holder = player

    def industry_remaining(self, industry: Industry) -> int:
        definition = get_industry_definition(industry)
        return self.industry_supply[definition.id]

    def take_industry(self, industry: Industry,) -> None:
        definition = get_industry_definition(industry)

        remaining = self.industry_supply.get(definition.id, 0)
        if remaining <= 0:
            raise ValueError(f"No {industry.name} remaining")

        self.industry_supply[definition.id] = (remaining -1)

    def return_industry(self, industry: Industry) -> None:
        definition = get_industry_definition(industry)

        current = self.industry_supply.get(definition.id, 0)

        if current >= definition.supply:
            raise ValueError(f"Cannot return {industry.name} supply is already full")

        self.industry_supply[definition.id] = (current + 1)

    def ship_remaining(self, ship: Ship) -> int:
        definition = get_ship_definition(ship)

        return self.ship_supply[definition.id]

    def take_ship(self, ship: Ship) -> None:
        definition = get_ship_definition(ship)

        remaining = self.ship_supply.get(definition.id, 0,)

        if remaining <= 0:
            raise ValueError(f"No {ship.name} remaining")

        self.ship_supply[definition.id] = (remaining - 1)

    def return_ship(self, ship: Ship) -> None:
        definition = get_ship_definition(ship)

        current = self.ship_supply.get(definition.id, 0,)

        if current >= definition.supply:
            raise ValueError(f"Cannot return {ship.name}: supply is already full")

        self.ship_supply[definition.id] = (current + 1)

    def shipyard_remaining(self, shipyard: Shipyard) -> int:
        definition = get_shipyard_definition(shipyard)

        return self.shipyard_supply[definition.id]

    def take_shipyard(self, shipyard: Shipyard) -> None:
        definition = get_shipyard_definition(shipyard)

        remaining = self.shipyard_supply.get(definition.id, 0,)

        if remaining <= 0:
            raise ValueError(f"No {shipyard.name} remaining")

        self.shipyard_supply[definition.id] = (remaining - 1)

    def return_shipyard(self, shipyard: Shipyard) -> None:
        definition = get_shipyard_definition(shipyard)

        current = self.shipyard_supply.get(definition.id, 0,)

        if current >= definition.supply:
            raise ValueError(f"Cannot return {shipyard.name} supply is already full")

        self.shipyard_supply[definition.id] = (current + 1)


    