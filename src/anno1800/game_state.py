from dataclasses import dataclass, field

from anno1800.data.cards import create_population_deck
from anno1800.models.deck import PopulationCardDeck
from anno1800.models.player import PlayerState

@dataclass
class GameState:
    players: list[PlayerState] = field(
        default_factory=list
    )

    current_player_index: int = 0

    turn_number: int = 1

    game_over: bool = False

    population_deck: PopulationCardDeck = field(default_factory=create_population_deck)
    

    @property
    def current_player(self) -> PlayerState:
        if not self.players:
            raise RuntimeError("Game has no players")

        return self.players[self.current_player_index]

    