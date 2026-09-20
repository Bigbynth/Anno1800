from dataclasses import dataclass, field
from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.models.cards import PopulationCard
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.services.production import ProductionResolver
from anno1800.models.trade import ForeignProduction
from anno1800.services.trade import TradeResolver
from anno1800.actions.context import ActionContext

@dataclass
class FulfillPopulationCardAction(GameAction):
    card: PopulationCard
    production_plan: list[OwnedIndustry] = field(default_factory=list)
    foreign_production: list[ForeignProduction] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        self._validate_card(player)
        self._validate_industries(player)

        population_snapshot = player.population.snapshot()
        island_snapshot = player.island.snapshot()
        hand_snapshot = player.hand.copy()
        completed_snapshot = player.completed_cards.copy()
        naval_token_snapshot = (player.naval_token_snapshot())
        trade_history_snapshot = player.traded_goods_this_turn.copy()
        trade_owner_gold_snapshots = {id(trade.owner): (trade.owner, trade.owner.gold) for trade in self.foreign_production}
        resolver = player.start_production()

        production_snapshot = resolver.snapshot()

        try:
            for industry in self.production_plan:
                resolver.produce(industry)

            trade_resolver = TradeResolver(buyer=player)

            traded_goods = trade_resolver.execute(self.foreign_production)
            for good in traded_goods:
                resolver.add_external_good(good)

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
            resolver.rollback(production_snapshot)
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.hand = hand_snapshot
            player.completed_cards = completed_snapshot
            player.restore_naval_token(naval_token_snapshot)
            player.traded_goods_this_turn = trade_history_snapshot
            for owner, gold in (trade_owner_gold_snapshots.values):
                owner.gold = gold
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
            if industry not in player.island.industries:
                raise InvalidActionError(
                    f"{player.name} does not own {industry.industry.name}"
                )

    def _missing_goods_message(self, resolver: ProductionResolver) -> str:
        missing: list[str] = []
        for (good, required) in self.card.requirements.items():
            available = resolver.goods.count(good)
            if available < required:
                missing.append(
                    f"{good.value}: {available}/required"
                )

        return (
            f"Cannot fulfill card {self.card.id}"
            f"Missing "
            f"{', '.join(missing)}"
        )

    