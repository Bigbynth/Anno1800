from dataclasses import dataclass, field
from typing import TypeAlias

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.models.cards import PopulationCard
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.services.production import ProductionResolver
from anno1800.models.trade import TradeRequest
from anno1800.services.trade import TradeResolver
from anno1800.actions.context import ActionContext
from anno1800.models.new_world import NewWorldProductionRequest
from anno1800.services.new_world import NewWorldResolver


@dataclass(frozen=True)
class ProduceForCardStep:
    industry: OwnedIndustry


@dataclass(frozen=True)
class TradeForCardStep:
    request: TradeRequest


@dataclass(frozen=True)
class NewWorldForCardStep:
    request: NewWorldProductionRequest

PopulationCardActionStep: TypeAlias = (
    ProduceForCardStep
    | TradeForCardStep
    | NewWorldForCardStep
)




@dataclass
class FulfillPopulationCardAction(GameAction):
    card: PopulationCard
    steps: list[PopulationCardActionStep] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        if not any(owned is self.card for owned in player.hand):
            raise InvalidActionError("Population card is not in player's hand")

        population_snapshot = player.population.snapshot()
        island_snapshot = player.island.snapshot()
        hand_snapshot = player.hand.copy()
        completed_snapshot = player.completed_cards.copy()
        resolver = player.start_production()
        trade_resolver = TradeResolver(player=player, production=resolver)
        new_world_resolver = NewWorldResolver(player=player, production=resolver)

        production_snapshot = resolver.snapshot()
        trade_snapshot = trade_resolver.snapshot()
        new_world_snapshot = new_world_resolver.snapshot()

        try:
            for step in self.steps:
                if isinstance(step, ProduceForCardStep):
                    if not any(owned is step.industry for owned in player.island.industries):
                        raise InvalidActionError("Player does not own this industry")

                    resolver.produce(step.industry)

                elif isinstance(step, TradeForCardStep):
                    trade_resolver.trade(step.request)

                elif isinstance(step, NewWorldForCardStep):
                    new_world_resolver.produce(step.request)

                else:
                    raise TypeError(f"Unsupported population card step: {type(step).__name__}")

            requirements = self.card.requirements

            if not resolver.can_pay(requirements):
                raise InvalidActionError(self._missing_goods_message(resolver))

            resolver.pay(requirements)

            player.play_population_card(self.card)


                    
            return ActionResult(
                message=(
                    f"{player.name} played population card {self.card.name}"
                )
            )
        except Exception:
            new_world_resolver.rollback(new_world_snapshot)
            trade_resolver.rollback(trade_snapshot)
            resolver.rollback(production_snapshot)
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.hand = hand_snapshot
            player.completed_cards = completed_snapshot
            raise

        finally:
            if not resolver.finished:
                resolver.finish()


    def _missing_goods_message(self, resolver: ProductionResolver) -> str:
        missing: list[str] = []
        for (good, required) in self.card.requirements.items():
            available = resolver.context.goods.count(good)
            if available < required:
                missing.append(
                    f"{good.value}: {available}/{required}"
                )

        return (
            f"Cannot fulfill card {self.card.id}"
            f"Missing "
            f"{', '.join(missing)}"
        )

    