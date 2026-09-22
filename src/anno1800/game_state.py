from dataclasses import dataclass, field
from enum import Enum

from anno1800.data.cards import create_population_deck
from anno1800.models.deck import PopulationCardDeck, ExpeditionDeck
from anno1800.models.player import PlayerState
from anno1800.data.new_world import NEW_WORLD_CARDS, NEW_WORLD_ISLANDS
from anno1800.models.new_world import NewWorldIsland
from anno1800.models.old_world import OldWorldIsland


def create_default_deck() -> PopulationCardDeck:
    deck = create_population_deck()

    deck.new_world_cards = NEW_WORLD_CARDS.copy()

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

    current_player_index: int = 0

    turn_number: int = 1

    game_over: bool = False

    expedition_deck: ExpeditionDeck = field(default_factory=ExpeditionDeck)
    population_deck: PopulationCardDeck = field(default_factory=create_default_deck)
    new_world_islands: list[NewWorldIsland] = field(default_factory=lambda: NEW_WORLD_ISLANDS.copy())
    old_world_islands: list[OldWorldIsland] = field(default_factory=list)

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

    