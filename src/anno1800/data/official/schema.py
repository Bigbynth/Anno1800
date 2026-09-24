from dataclasses import dataclass, field
from enum import Enum

class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    TRANSCRIBED = "transcribed"
    VERIFIED = "verified"
   
class CardCategory(str, Enum):
    WORKER = "worker"
    ARTISAN = "artisan"
    ENGINEER = "engineer"
    INVESTOR = "investor"
    NEW_WORLD = "new_world"


@dataclass(frozen=True)
class CardSource:
    reference: str
    image_path: str | None = None
    notes: str = ""


@dataclass(frozen=True)
class OfficialPopulationCard:
    id: str
    category: CardCategory
    requirements: dict[str, int]
    victory_points: int
    effects: list[dict] = field(default_factory=list)

    title: str | None = None
    artwork_path: str | None = None

    source: CardSource | None = None
    verification: VerificationStatus = (VerificationStatus.UNVERIFIED)

    def validate(self) -> None:
        if not self.id.strip():
            raise ValueError("Card ID cannot be empty")

        if self.victory_points < 0:
            raise ValueError(f"{self.id}: negative victory points")

        if any(amount <= 0 for amount in self.requirements.values()):
            raise ValueError(f"{self.id}: invalid requirements")

        if self.verification == VerificationStatus.VERIFIED:
            if self.source is None:
                raise ValueError(f"{self.id}: verified card requires a source")

            if not self.source.reference.strip():
                raise ValueError(f"{self.id}: source reference is empty")
