from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType
from anno1800.services.shipping import ShippingService
from anno1800.actions.context import ActionContext

MAX_NEW_WORLD_ISLANDS = 4
NEW_WORLD_CARDS_PER_ISLAND = 3


class ExploreNewWorldAction(GameAction):

    def execute(self, context: ActionContext) -> ActionResult:
        state = context.state
        player = context.player
        deck = state.population_deck

        self._validate(context)

        exploration_cost = self._exploration_cost(player)
        naval_token_snapshot = (player.naval_token_snapshot())
        islands_snapshot = (player.new_world_islands.copy())
        hand_snapshot = player.hand.copy()
        deck_snapshot = deck.new_world_cards.copy()
        island_stack_snapshot = (state.new_world_islands.copy())

        try:
            island = (state.draw_new_world_island())
            ShippingService.use_capacity(player, NavalTokenType.EXPLORATION, exploration_cost)
            player.add_new_world_island(island)

            for _ in range(NEW_WORLD_CARDS_PER_ISLAND):
                card = deck.draw_new_world()
                player.add_card(card)

            return ActionResult(
                message=(
                    f"{player.name} explored {island.name}"
                )
            )
        except Exception:
            player.restore_naval_tokens(naval_token_snapshot)
            player.new_world_islands = islands_snapshot
            player.hand = hand_snapshot
            deck.new_world_cards = deck_snapshot
            state.new_world_islands = (island_stack_snapshot)

            raise

    def _validate(self, context: ActionContext) -> None:

        player = context.player
        state = context.state
        deck = state.population_deck

        if len(player.new_world_islands) >= MAX_NEW_WORLD_ISLANDS:
            raise InvalidActionError("A player cannot explore more than 4 New World islands")

        if not state.new_world_islands:
            raise InvalidActionError("No New World Islands remaining")

        if deck.remaining_new_world() < NEW_WORLD_CARDS_PER_ISLAND:
            raise InvalidActionError("Not enough New World cards remaining")

        required = self._exploration_cost(player)

        if not ShippingService.can_use_capacity(player, NavalTokenType.EXPLORATION, required):
            raise InvalidActionError("Not enough exploration capacity")

    def _exploration_cost(self, player: PlayerState) -> int:
        return len(player.new_world_islands) + 1
        
