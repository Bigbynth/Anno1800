from dataclasses import dataclass, field

from anno1800.data.cards import create_population_deck
from anno1800.models.deck import PopulationCardDeck
from anno1800.models.player import PlayerState
from anno1800.data.new_world import NEW_WORLD_CARDS, NEW_WORLD_ISLANDS
from anno1800.models.new_world import NewWorldIsland


def create_default_deck() -> PopulationCardDeck:
    deck = create_default_deck()

    deck.new_world_cards = NEW_WORLD_CARDS.copy()

    return deck
@dataclass
class GameState:
    players: list[PlayerState] = field(
        default_factory=list
    )

    current_player_index: int = 0

    turn_number: int = 1

    game_over: bool = False

    population_deck: PopulationCardDeck = field(default_factory=create_population_deck)
    new_world_islands: list[NewWorldIsland] = field(default_factory=lambda: NEW_WORLD_ISLANDS.copy())

    @property
    def current_player(self) -> PlayerState:
        if not self.players:
            raise RuntimeError("Game has no players")

        return self.players[self.current_player_index]

    def draw_new_world_island(self) -> NewWorldIsland:
        if not self.new_world_islands:
            raise RuntimeError("No New World islands remaining")

        return self.new_world_islands.pop()

    