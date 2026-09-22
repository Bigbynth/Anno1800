from dataclasses import dataclass

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext

from anno1800.models.ship import NavalTokenType

MAX_OLD_WORLD_ISLANDS = 4

OLD_WORLD_EXPLORATION_COSTS = (1,2,3,4)

@dataclass
class OpenOldWorldAction(GameAction):

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        state = context.state

        island_count = len(player.old_world_islands)

        if island_count >= MAX_OLD_WORLD_ISLANDS:
            raise InvalidActionError("Player already has the maximum number of Old World islands")

        if not state.old_world_islands:
            raise InvalidActionError("No Old World islands remaining")

        token_cost = OLD_WORLD_EXPLORATION_COSTS[island_count]

        available_tokens = (player.available_naval_tokens(NavalTokenType.EXPLORATION))

        if len(available_tokens) <= token_cost:
            raise InvalidActionError("Not enough exploration tokens")

        naval_snapshot = (player.naval_token_snapshot())

        deck_snapshot = (state.old_world_islands.copy())

        owned_snapshot = (player.old_world_islands.copy())

        try:
            player.use_naval_tokens(NavalTokenType.EXPLORATION, token_cost)

            island = state.draw_old_world_island()

            player.add_old_world_island(island)

            return ActionResult(
                message=(f"{player.name} opened Old World island {island.id}")
            )

        except Exception:
            player.restore_naval_tokens(naval_snapshot)

            state.old_world_islands = deck_snapshot

            player.old_world_islands = owned_snapshot

            raise
