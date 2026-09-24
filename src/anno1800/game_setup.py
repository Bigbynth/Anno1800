from dataclasses import dataclass
import random

from anno1800.data.setup import (
    MAX_PLAYERS,
    MIN_PLAYERS,
    STARTING_ADVANCED_CARDS,
    STARTING_FARMER_WORKER_CARDS,
    STARTING_GOLD_BY_POSITION,
    STARTING_POPULATION
)
from anno1800.data.islands import create_home_island
from anno1800.data.ships import create_starting_ships
from anno1800.data.shipyards import create_starting_shipyard

from anno1800.game_state import GameState
from anno1800.models.player import PlayerState
from anno1800.models.objective import ObjectiveType, ResourceObjectiveRule

@dataclass
class GameSetup:

    def create_game(self, player_names: list[str]) -> GameState:
        self._validate_players(player_names)

        state = self._create_state()

        for position, name in enumerate(player_names):
            player = self._create_player(state=state, name=name, position=position)

            state.players.append(player)

        state.current_player_index = 0
        state.turn_number = 1
        state.game_over = False

        return state

    def _validate_players(self, player_names: list[str]) -> None:
        if not (MIN_PLAYERS <= len(player_names) <= MAX_PLAYERS):
            raise ValueError("Anno 1800 requires 2 to 4 players")

        if any(not name.strip() for name in player_names):
            raise ValueError("Player names cannot be empty")


    def _add_starting_population(self, player: PlayerState) -> None:
        for population_type, amount in (STARTING_POPULATION.items()):
            player.add_population(population_type, amount)

    def _draw_starting_cards(self, state: GameState, player: PlayerState) -> None:
        for _ in range(STARTING_FARMER_WORKER_CARDS):
            player.add_card(state.population_deck.draw_farmer_worker())

        for _ in range(STARTING_ADVANCED_CARDS):
            player.add_card(state.population_deck.draw_advanced())

    def _add_starting_gold(self, player: PlayerState, position: int) -> None:
        gold = STARTING_GOLD_BY_POSITION[position]

        if gold:
            player.add_gold(gold)

    def _add_starting_constructions(self, player: PlayerState) -> None:
        for ship in create_starting_ships():
            player.add_ship(ship)

        player.add_shipyard(create_starting_shipyard())

    def _create_state(self) -> GameState:
        state = GameState()

        random.shuffle(state.old_world_islands)
        random.shuffle(state.new_world_islands)
        random.shuffle(state.population_deck.farmer_worker_cards)
        random.shuffle(state.population_deck.advanced_cards)
        random.shuffle(state.population_deck.new_world_cards)
        random.shuffle(state.expedition_deck.cards)
        random.shuffle(state.objective_deck)

        if len(state.objective_deck) < 5:
            raise ValueError("At least file objective cards are required")

        selected = state.objective_deck[:5]

        state.objective_cards = [card for card in selected if card.objective_type == ObjectiveType.END_GAME]

        state.objective_effect_cards = [card for card in selected if card.objective_type == ObjectiveType.EFFECT]

        state.objective_deck = state.objective_deck[5:]


        return state

    def _create_player(self, state: GameState, name: str, position: int) -> PlayerState:
        player = PlayerState(name=name, island=create_home_island())

        self._add_starting_population(player)

        self._draw_starting_cards(state, player)

        self._add_starting_gold(player, position)

        self._add_starting_constructions(player)

        return player

