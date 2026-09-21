from dataclasses import dataclass

from .island import Island

@dataclass
class OldWorldIsland:
    id: str
    island: Island

