from anno1800.actions.base import InvalidActionError
from anno1800.models.goods import Good
from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType
from anno1800.services.shipping import ShippingService
from anno1800.models.new_world import NewWorldIsland, NewWorldProductionRecord
from anno1800.services.production import ProductionResolver

from dataclasses import dataclass


@dataclass(frozen=True)
class NewWorldResolverSnapshot:
    record_count: int

class NewWorldResolver:
    def __init__(self, player: PlayerState, production: ProductionResolver):
        self.player = player
        self.production = production

    def can_produce(self, good: Good) -> bool:
        return (self.player.has_new_world_resource(good)) \
                and ShippingService.can_use_capacity(self.player, NavalTokenType.TRADE, 1)

    def produce(self,island: NewWorldIsland, good: Good) -> Good:
        self.production._ensure_active()

        self._validate_island(island)
        self._validate_resource(island, good)
        available = self.player.available_naval_tokens(NavalTokenType.TRADE)

        if not available:
            raise InvalidActionError(f"Not enough trade tokens to produce {good.value} from the New World")

        token = self.player.use_naval_tokens(NavalTokenType.TRADE, 1)[0]
        record = NewWorldProductionRecord(island=island, good=good, token=token)
        self.production.context.add_new_world_production(record)
        return good

    def _validate_island(self, island: NewWorldIsland) -> None:
        if not any(owned is island for owned in self.player.new_world_islands):
            raise InvalidActionError("Player does not own this New World island")

    def _validate_resource(self, island: NewWorldIsland, good: Good) -> None:
        if good not in island.resources:
            raise InvalidActionError(f"{island.name} does not produce {good.value}")

    def snapshot(self) -> NewWorldResolverSnapshot:
        self.production._ensure_active()
        return NewWorldResolverSnapshot(record_count=len(self.production.context.new_world_records))

    def rollback(self, snapshot: NewWorldResolverSnapshot) -> None:
        self.production._ensure_active()

        new_records = self.production.context.new_world_records[snapshot.record_count:]

        for record in reversed(new_records):
            record.token.refresh()

        del self.production.context.new_world_records[snapshot.record_count:]