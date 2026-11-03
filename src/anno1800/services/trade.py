
from dataclasses import dataclass

from anno1800.actions.base import InvalidActionError
from anno1800.models.goods import Good
from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType
from anno1800.models.trade import TradeRecord, trade_token_cost
from anno1800.services.production import ProductionResolver


@dataclass(frozen=True)
class TradeResolverSnapshot:
    trade_record_count: int


class TradeResolver:
    def __init__(
        self,
        player: PlayerState,
        production: ProductionResolver,
    ) -> None:
        self.player = player
        self.production = production

    def _find_foreign_industry(
        self,
        partner: PlayerState,
        good: Good,
    ):
        if partner is self.player:
            raise InvalidActionError(
                "A player cannot trade with themselves"
            )

        for owned in partner.get_all_industries():
            if owned.industry.good == good:
                return owned

        raise InvalidActionError(
            f"{partner.name} cannot produce {good.value}"
        )

    def trade(
        self,
        partner: PlayerState,
        good: Good,
    ) -> Good:
        self.production._ensure_active()

        # A good can only be traded once per turn.
        if good in self.player.traded_goods_this_turn:
            raise InvalidActionError(
                f"{good.value} has already been traded this turn"
            )

        # Partner must own an industry producing the good.
        industry = self._find_foreign_industry(
            partner, good
        )

        # Token cost depends on worker tier.
        cost = trade_token_cost(industry)

        available = self.player.available_ship_capacity(
            NavalTokenType.TRADE
        )

        if available < cost:
            raise InvalidActionError(
                f"Not enough trade tokens to trade {good.value}"
            )

        # Consume buyer's naval tokens.
        tokens = self.player.use_naval_tokens(
            NavalTokenType.TRADE,
            cost,
        )

        # Reward the producing player.
        partner.add_gold(1)

        # Record the trade for duplicate protection.
        self.player.record_traded_good(good)

        # Register the good in the production context.
        record = TradeRecord(
            good=good,
            partner=partner,
            industry=industry,
            tokens=tuple(tokens),
        )

        self.production.context.add_trade(record)

        return good

    def snapshot(self) -> TradeResolverSnapshot:
        self.production._ensure_active()

        return TradeResolverSnapshot(
            trade_record_count=len(
                self.production.context.trade_records
            )
        )

    def rollback(
        self,
        snapshot: TradeResolverSnapshot,
    ) -> None:
        self.production._ensure_active()

        records = self.production.context.trade_records[
            snapshot.trade_record_count:
        ]

        for record in reversed(records):
            # Restore naval tokens.
            for token in record.tokens:
                token.refresh()

            # Revert the seller's gold reward.
            record.partner.remove_gold(1)

            # Restore duplicate-trade tracking.
            self.player.traded_goods_this_turn.discard(
                record.good
            )

            # Remove the good created by the trade.
            self.production.context.goods.remove(
                record.good
            )

        # Remove rolled-back trade records.
        del self.production.context.trade_records[
            snapshot.trade_record_count:
        ]
