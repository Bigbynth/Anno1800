from dataclasses import dataclass
from .industry import OwnedIndustry
from .player import PlayerState

@dataclass
class ForeignProduction:
    owner: PlayerState
    industry: OwnedIndustry
    