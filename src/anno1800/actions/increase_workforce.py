from dataclasses import dataclass, field
from typing import TypeAlias

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.data.workforce import WORKFORCE_COSTS
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.actions.context import ActionContext
from anno1800.models.population import PopulationType
from anno1800.services.production import ProductionResolver

MAX_WORKFORCE_INCREASES = 3


@dataclass(frozen=True)
class ProduceForWorkforceStep:
    industry: OwnedIndustry


@dataclass(frozen=True)
class IncreaseWorkforceStep:
    population_type: PopulationType

WorkforceActionStep: TypeAlias = (
    ProduceForWorkforceStep
    | IncreaseWorkforceStep
)




@dataclass
class IncreaseWorkforceAction(GameAction):
    steps: list[WorkforceActionStep] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        deck = context.state.population_deck

        increase_count = sum(isinstance(step, IncreaseWorkforceStep) for step in self.steps)

        if increase_count == 0:
            raise InvalidActionError("Increase workforce action requires at least one population increase")

        if increase_count > MAX_WORKFORCE_INCREASES:
            raise InvalidActionError("Increase workforce action allows at most 3 new population cubes")
        

        population_snapshot = player.population.snapshot()

        island_snapshot = player.island.snapshot()

        hand_snapshot = player.hand.copy()

        gold_snapshot = player.gold

        deck_snapshot = {
            population_type: cards.copy()
            for population_type, cards in deck.cards.items()
        }

        resolver = player.start_production()

        production_snapshot = resolver.snapshot()

        try:
            for step in self.steps:
                if isinstance(step, ProduceForWorkforceStep):
                    if not any(owned is step.industry for owned in player.island.industries):
                        raise InvalidActionError("Player does not own this industry")

                    resolver.produce(step.industry)

                elif isinstance(step, IncreaseWorkforceStep):
                    self._increase(context, resolver, step)

                else:
                    raise TypeError(f"Unsupported workforce step: {type(step).__name__}")


        

            return ActionResult(
                message=(
                    f"{player.name} increased"
                    f"workforce by "
                    f"{increase_count}"
                )
            )
        except Exception:
            resolver.rollback(production_snapshot)
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.hand = hand_snapshot
            player.gold = gold_snapshot
            deck.cards = {
                population_type: cards.copy()
                for population_type, cards in deck_snapshot.items()
            }

            raise

        finally:
            if not resolver.finished:
                resolver.finish()

    def _increase(self, context: ActionContext, resolver: ProductionResolver, step: IncreaseWorkforceStep) -> None:
        player = context.player

        cost = WORKFORCE_COSTS[step.population_type]

        if not resolver.can_pay(cost):
            raise InvalidActionError(f"Not enough resources to add {step.population_type.value}")

        resolver.pay(cost)

        cubes = player.add_population(step.population_type)
        cube = cubes[0]

        self._draw_population_card(context, player, cube.population_type)

    def _draw_population_card(self, context: ActionContext, player: PlayerState, population_type: PopulationType) -> None:
        deck = context.state.population_deck

        if not deck.is_empty_for_population(population_type):
            card = deck.draw_for_population(population_type)

            player.add_card(card)

        else:
            player.spend_gold(1)

