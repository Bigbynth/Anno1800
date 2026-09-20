from anno1800.actions.base import InvalidActionError
from anno1800.models.goods import Good
from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType
from anno1800.models.population import PopulationType
from anno1800.models.trade import TradeRecord, trade_token_cost
from anno1800.services.shipping import ShippingService
from anno1800.models.industry import OwnedIndustry
from anno1800.services.production import ProductionResolver

from dataclasses import dataclass


TRADE_COSTS = {
    PopulationType.FARMER: 1,
    PopulationType.WORKER: 1,
    PopulationType.ARTISAN: 2,
    PopulationType.ENGINEER: 3
}

@dataclass(frozen=True)
class TradeResolverSnapshot:
    trade_record_count: int

class TradeResolver:
    def __init__(self, player: PlayerState, production: ProductionResolver) -> None:
        self.player = player
        self.production = production

    def validate(self, trades: list[TradeRecord]) -> None:
        if not trades:
            return

        goods_in_this_trade: set[Good] = set()

        for trade in trades:
            if trade.owner is self.buyer:
                raise InvalidActionError(
                    "Foreign production must belong to another player"
                )

            good = (trade.industry.industry.good)
            if self.buyer.has_traded_good(good):
                raise InvalidActionError(
                    f"{good.value} has already been traded this turn"
                )

            if good in goods_in_this_trade:
                raise InvalidActionError(
                    f"{good.value} cannot be traded more than once in the same turn"
                )

            goods_in_this_trade.add(good)

            if trade.industry not in trade.owner.island.industries:
                raise InvalidActionError(
                    f"{trade.owner.name} does not own the requested industry"
                )

        required_capacity = sum(self._trade_cost(trade) for trade in trades)
        if not ShippingService.can_use_capacity(self.buyer, NavalTokenType.TRADE, required_capacity):
            raise InvalidActionError("Not enough trade ship capacity")

    def execute(self, trades: list[TradeRecord]) -> list[Good]:
        self.validate(trades)

        if not trades:
            return []

        goods: list[Good] = []
        for trade in trades:
            good = (trade.industry.industry.good)
            cost = self._trade_cost(trade)
            ShippingService.use_capacity(self.buyer, NavalTokenType.TRADE, cost)

            trade.owner.add_gold(1)
            self.buyer.record_traded_good(good)
            goods.append(good)

        return goods

    def _trade_cost(self, trade: TradeRecord) -> int:
        worker_type = (trade.industry.industry.worker_type)
        cost = TRADE_COSTS.get(worker_type)
        if cost is None:
            raise InvalidActionError(
                f"{worker_type.value} cannot be used for trade"
            )

    def _find_foreign_industry(self, partner: PlayerState, good: Good) -> OwnedIndustry:
        if partner is self.player:
            raise InvalidActionError("A player cannot trade with themselves")

        for owned in partner.get_all_industries():
            if owned.industry.good == good:
                return owned

        raise InvalidActionError(f"{partner.name} cannot produce {good.value}")

    def trade(self, partner: PlayerState, good: Good) -> Good:
        self.production._ensure_active()
        if good in self.player.traded_goods_this_turn:
            raise InvalidActionError(f"{good.value} has already been traded this turn")

        industry = self._find_foreign_industry(partner, good)
        token_cost = trade_token_cost(industry)
        available = self.player.available_naval_tokens(NavalTokenType.TRADE)

        if len(available) < token_cost:
            raise InvalidActionError(f"Not enough trade tokens to trade {good.value}")

        tokens = self.player.use_naval_tokens(NavalTokenType.TRADE, token_cost)
        partner.add_gold(1)
        self.player.mark_good_traded(good)

        record = TradeRecord(good=good, partner=partner, industry=industry, tokens=tuple(tokens))

        self.production.context.add_trade(record)
        return good

    def snapshot(self) -> TradeResolverSnapshot:
        self.production._ensure_active()
        return TradeResolverSnapshot(trade_record_count=len(self.production.context.trade_records))

    def rollback(self, snapshot: TradeResolverSnapshot) -> None:
        self.production._ensure_active()

        new_records = self.production.context.trade_records[snapshot.trade_record_count:]

        for record in reversed(new_records):
            for token in record.tokens:
                token.refresh()

            record.partner.remove_gold(1)
            self.player.traded_goods_this_turn.discard(record.good)

            del self.production.context.trade_records[snapshot.trade_record_count:]