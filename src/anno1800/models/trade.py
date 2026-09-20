from dataclasses import dataclass
from typing import TYPE_CHECKING

from anno1800.models.goods import Good
from .industry import OwnedIndustry
from .ship import NavalToken
from .population import PopulationType

if TYPE_CHECKING:
    from anno1800.models.player import PlayerState


@dataclass(frozen=True)
class TradeRequest:
    partner: "PlayerState"
    good: Good

@dataclass(frozen=True)
class TradeRecord:
    good: Good
    partner: "PlayerState"
    industry: OwnedIndustry
    tokens: tuple[NavalToken, ...]

TRADE_TOKEN_COST: dict[PopulationType, int] = {
    PopulationType.FARMER: 1,
    PopulationType.WORKER: 1,
    PopulationType.ARTISAN: 2,
    PopulationType.ENGINEER: 3,
    PopulationType.INVESTOR: 5
}

def trade_token_cost(industry: OwnedIndustry) -> int:
    worker_type = industry.industry.worker_type
    try:
        return TRADE_TOKEN_COST[worker_type]
    except KeyError as exc:
        raise ValueError(f"No trade token cost for {worker_type.value}") from exc
    