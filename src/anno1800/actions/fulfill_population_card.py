from dataclasses import dataclass, field
from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.models.cards import PopulationCard
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.services.production import ProductionResolver
from anno1800.models.trade import TradeRequest
from anno1800.services.trade import TradeResolver
from anno1800.actions.context import ActionContext

@dataclass
class FulfillPopulationCardAction(GameAction):
    card: PopulationCard
    production_plan: list[OwnedIndustry] = field(default_factory=list)
    trade_plan: list[TradeRequest] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        self._validate_card(player)
        self._validate_industries(player)

        population_snapshot = player.population.snapshot()
        island_snapshot = player.island.snapshot()
        hand_snapshot = player.hand.copy()
        completed_snapshot = player.completed_cards.copy()
        resolver = player.start_production()
        trade_resolver = TradeResolver(player=player, production=resolver)

        production_snapshot = resolver.snapshot()
        trade_snapshot = trade_resolver.snapshot()

        try:
            for industry in self.production_plan:
                resolver.produce(industry)

            for request in self.trade_plan:
                trade_resolver.trade(partner=request.partner, good=request.good)

            if not resolver.can_pay(self.card.requirements):
                raise InvalidActionError(self._missing_goods_message(resolver))

            resolver.pay(self.card.requirements)
            player.complete_card(self.card)
            return ActionResult(
                message=(
                    f"{player.name} fulfilled population card {self.card.id} for {self.card.victory_points} VP"
                )
            )
        except Exception:
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

    def _validate_card(self, player: PlayerState) -> None:
        if not player.has_card(self.card):
            raise InvalidActionError(
                f"{player.name} does not have card {self.card.id}"
            )

    def _validate_industries(self, player: PlayerState) -> None:
        for industry in self.production_plan:
            if not any(owned is industry for owned in player.island.industries):
                raise InvalidActionError(
                    f"{player.name} does not own {industry.industry.name}"
                )

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

    