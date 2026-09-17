from anno1800.actions.base import InvalidActionError
from anno1800.models.goods import Good
from anno1800.models.player import PlayerState
from anno1800.models.ship import ShipType
from anno1800.models.trade import ForeignProduction
from anno1800.services.shipping import ShippingService

class TradeResolver:
    def __init__(self, buyer: PlayerState):
        self.buyer = buyer

    def validate(self, trades: list[ForeignProduction]) -> None:
        if not trades:
            return

        seen_industries: set[int] = set()
        for trade in trades:
            if trade.owner is self.buyer:
                raise InvalidActionError(
                    "Foreign production must belong to another player"
                )

            if trade.industry not in trade.owner.island.industries:
                raise InvalidActionError(
                    f"{trade.owner.name} does not own the requested industry"
                )

            if trade.industry.occupied:
                raise InvalidActionError(
                    f"{trade.industry.industry.name} is already occupied"
                )

            industry_identity = id(trade.industry)

            if industry_identity in seen_industries:
                raise InvalidActionError("The same foreign industry cannot be used twice")

            seen_industries.add(industry_identity)

        required_capacity = len(trades)
        if not ShippingService.can_use_capacity(self.buyer, ShipType.TRADE, required_capacity):
            raise InvalidActionError("Not enough trade ship capacity")

    def execute(self, trades: list[ForeignProduction]) -> list[Good]:
        self.validate(trades)

        if not trades:
            return []

        ShippingService.use_capacity(self.buyer, ShipType.TRADE, len(trades))
        goods: list[Good] = []
        for trade in trades:
            goods.append(trade.industry.industry.good)

        return goods