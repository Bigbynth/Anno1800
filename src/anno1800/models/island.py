from enum import Enum
from dataclasses import dataclass, field

from .industry import Industry, OwnedIndustry
from .ship import Ship, Shipyard
from .population import PopulationCube



class IslandSpaceType(str, Enum):
    LAND =  "land"
    COAST = "coast"
    SEA = "sea"

Construction = (OwnedIndustry | Shipyard | Ship)

@dataclass(frozen=True)
class IndustryWorkplaceSnapshot:
    industry: OwnedIndustry
    worker: PopulationCube | None

@dataclass
class IslandSpace:
    id: str
    space_type: IslandSpaceType
    construction: Construction | None = None

    @property
    def is_empty(self) -> bool:
        return self.construcction is None

    def can_place(self, construction: Construction) -> bool:
        if not self.is_empty:
            return False

        if isinstance(construction, OwnedIndustry):
            return self.space_type in (IslandSpaceType.LAND, IslandSpaceType.COAST)

        if isinstance(construction, Shipyard):
            return self.space_type == IslandSpaceType.COAST

        if isinstance(construction, Ship):
            return self.space_type == IslandSpaceType.SEA

        return False

    def place(self, construction: Construction) -> None:
        if not self.is_empty:
            raise ValueError(f"Island space {self.id} is alreay occupied")

        if not self.can_place(construction):
            raise ValueError(f"Cannot place {type(construction).__name__ } on {self.space_type.value} space {self.id}")

        self.construction = construction

    def remove(self) -> Construction:
        if self.construction is None:
            raise ValueError(f"Island space {self.id} is empty")
        construction = (self.construction)
        self.construction  = None
        return construction

        

@dataclass
class IslandSnapshot:
    industries: list[IndustryWorkplaceSnapshot]

    spaces: list[tuple[IslandSpace, Construction | None]]

@dataclass
class Island:
    name: str
    industries: list[OwnedIndustry] = field(
        default_factory=list
    )
    spaces: list[IslandSpace] = field(default_factory=list)

    def add_industry(
            self,
            industry: Industry,
            space_id: str | None = None
    ) -> OwnedIndustry:
        owned_industry = OwnedIndustry(industry)

        if space_id is not None:
            self.place(space_id, owned_industry)

        self.industries.append(owned_industry)

        return owned_industry

    def has_industry(self, industry: Industry) -> bool:
        return any(
            owned.industry == industry
            for owned in self.industries
        )

    def get_industries(self, industry: Industry) -> list[OwnedIndustry]:
        return [
            owned
            for owned in self.industries
            if owned.industry == industry
        ]

    def get_industry(self, industry: Industry) -> OwnedIndustry:
        matches = self.get_industries(industry)

        if not matches:
            raise ValueError(
                f"Industry not owned: {industry.name}"
            )

        return matches[0]

    def clear_worker(self) -> None:
        for owned_industry in self.industries:
            owned_industry.clear_worker()

    def occupancy_snapshot(self) -> list[bool]:
        return [industry.occupied for industry in self.industries]

    def restore_occupancy(self, snapshot: list[bool]) -> None:
        if len(snapshot) != len(self.industries):
            raise ValueError("Invalid island occupancy snapshot")

        for industry, occupied in zip(self.industries, snapshot):
            industry.occupied = occupied

    def snapshot(self) -> IslandSnapshot:
        return IslandSnapshot(industries=[IndustryWorkplaceSnapshot(industry=owned, worker=(owned.workplace.worker)) for owned in self.industries])

    def restore(self, snapshot: IslandSnapshot) -> None:
        original_industries = [item.industry for item in snapshot.industries]
        for item in snapshot.industries:
            item.industry.workplace.worker = item.worker
        self.industries = original_industries
        original_spaces = [space for space, _ in snapshot.spaces]
        for space, construction in snapshot.spaces:
            space.construction = construction

        self.spaces = (original_spaces)

        

    def get_space(self, space_id: str) -> IslandSpace:
        for space in self.spaces:
            if space.id == space_id:
                return space

        raise ValueError(f"Unknown island place: {space_id}")

    def available_space_for(self, construction: Construction) -> list[IslandSpace]:
        return [space for space in self.spaces if space.can_place(construction)]

    def place(self, space_id: str, construction: Construction) -> None:
        space = self.get_space(space_id)

        space.place(construction)

    def remove_from_space(self, space_id: str) -> Construction:
        space = self.get_space(space_id)
        return space.remove()

    def find_construction_space(self, construction: Construction) -> IslandSpace | None:
        for space in self.spaces:
            if space.construction is construction:
                return space

        return None

    def remove_construction(self, space_id: str) -> Construction:
        construction = (self.remove_from_space(space_id))
        if isinstance(construction, OwnedIndustry):
            self.industries.remove(construction)

        return construction

    def replace_construction(self, space_id: str, construction: Construction) -> Construction:
        space = self.get_space(space_id)
        existing = (space.construction)

        if existing is None:
            raise ValueError(f"Island space {space_id} is empty")

        original = space.construction
        space.construction = None

        try:
            if not space.can_place(construction):
                raise ValueError(f"Cannot place {type(construction).__name__} on {space.space_type.value} space {space_id}")

        finally:
            space.construction = original

        removed = (self.remove_construction(space_id))

        space.place(construction)

        if isinstance(construction, OwnedIndustry):
            self.industries.append(construction)

        return removed

