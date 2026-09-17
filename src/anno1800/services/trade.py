from anno1800.actions.base import InvalidActionError
from anno1800.models.goods import Good
from anno1800.models.player import PlayerState
from anno1800.models.ship import ShipType
from anno1800.models.population import PopulationType
from anno1800.models.trade import ForeignProduction
from anno1800.services.shipping import ShippingService


TRADE_COSTS = {
    PopulationType.FARMER: 1,
    PopulationType.WORKER: 1,
    PopulationType.ARTISAN: 2,
    PopulationType.ENGINEER: 3
}

class TradeResolver:
    def __init__(self, buyer: PlayerState):
        self.buyer = buyer

    def validate(self, trades: list[ForeignProduction]) -> None:
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
        if not ShippingService.can_use_capacity(self.buyer, ShipType.TRADE, required_capacity):
            raise InvalidActionError("Not enough trade ship capacity")

    def execute(self, trades: list[ForeignProduction]) -> list[Good]:
        self.validate(trades)

        if not trades:
            return []

        goods: list[Good] = []
        for trade in trades:
            good = (trade.industry.industry.good)
            cost = self._trade_cost(trade)
            ShippingService.use_capacity(self.buyer, ShipType.TRADE, cost)

            trade.owner.add_gold(1)
            self.buyer.record_traded_good(good)
            goods.append(good)

        return goods

    def _trade_cost(self, trade: ForeignProduction) -> int:
        worker_type = (trade.industry.industry.worker_type)
        cost = TRADE_COSTS.get(worker_type)
        if cost is None:
            raise InvalidActionError(
                f"{worker_type.value} cannot be used for trade"
            )