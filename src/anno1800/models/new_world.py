from dataclasses import dataclass
from .goods import Good

@dataclass(frozen=True)
class NewWorldIsland:
    id: str
    name: str
    resources: tuple[Good, Good, Good]

    def has_resource(self, good: Good) -> bool:
        return good in self.resources
    