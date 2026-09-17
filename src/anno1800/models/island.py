from dataclasses import dataclass, field

from .industry import Industry, OwnedIndustry


@dataclass
class IslandSnapshot:
    industries: list[tuple[Industry, bool]]

@dataclass
class Island:
    name: str
    industries: list[OwnedIndustry] = field(
        default_factory=list
    )

    def add_industry(
            self,
            industry: Industry
    ) -> OwnedIndustry:
        owned_industry = OwnedIndustry(industry)

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
        return IslandSnapshot(industries=[(owned.industry, owned.occupied) for owned in self.industries])

    def restore(self, snapshot: IslandSnapshot) -> None:
        self.industries = [OwnedIndustry(industry=industry, occupied=occupied) for industry, occupied in snapshot.industries]
        
        