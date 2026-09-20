from dataclasses import dataclass
from .goods import Good
from .ship import NavalToken
@dataclass(frozen=True)
class NewWorldIsland:
    id: str
    name: str
    resources: tuple[Good, Good, Good]

    def has_resource(self, good: Good) -> bool:
        return good in self.resources

@dataclass(frozen=True)
class NewWorldProductionRecord:
    island: NewWorldIsland
    good: Good
    token: NavalToken

@dataclass(frozen=True)
class NewWorldProductionRequest:
    island: NewWorldIsland
    good: Good