from dataclasses import dataclass
from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.models.deck import PopulationCardDeck
from anno1800.models.new_world import NewWorldIsland
from anno1800.models.player import PlayerState
from anno1800.models.ship import ShipType
from anno1800.services.shipping import ShippingService

MAX_NEW_WORLD_ISLANDS = 4
NEW_WORLD_CARDS_PER_ISLAND = 3

@dataclass
class ExploreNewWorldAction(GameAction):
    island: NewWorldIsland
    deck: PopulationCardDeck

    def execute(self, player: PlayerState) -> ActionResult:
        self._validate(player)

        exploration_cost = self._exploration_cost(player)
        ship_snapshot = player.ship_usage_snapshot()
        islands_snapshot = player.new_world_islands.copy()
        hand_snapshot = player.hand.copy()
        deck_snapshot = self.deck.new_world_cards.copy()

        try:
            ShippingService.use_capacity(player, ShipType.EXPLORATION, exploration_cost)
            player.add_new_world_island(self.island)

            for _ in range(NEW_WORLD_CARDS_PER_ISLAND):
                card = self.deck.draw_new_world()
                player.add_card(card)

            return ActionResult(
                message=(
                    f"{player.name} explored {self.island.name}"
                )
            )
        except Exception:
            player.restore_ship_usage(ship_snapshot)
            player.new_world_islands = islands_snapshot
            player.hand = hand_snapshot
            self.deck.new_world_cards = deck_snapshot

            raise

    def _validate(self, player: PlayerState) -> None:
        if len(player.new_world_islands) >= MAX_NEW_WORLD_ISLANDS:
            raise InvalidActionError("A player cannot explore more than 4 New World islands")

        if self.island in player.new_world_islands:
            raise InvalidActionError("This New World island has already been explored")

        if self.deck.remaining_new_world() < NEW_WORLD_CARDS_PER_ISLAND:
            raise InvalidActionError("Not enough New World cards remaining")

        required = self._exploration_cost(player)

        if not ShippingService.can_use_capacity(player, ShipType.EXPLORATION, required):
            raise InvalidActionError("Not enough exploration capacity")

    def _exploration_cost(self, player: PlayerState) -> int:
        return len(player.new_world_islands) + 1
        
