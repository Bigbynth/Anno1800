from dataclasses import dataclass
from .population import PopulationType, next_population_type

@dataclass(frozen=True)
class PopulationUpgrade:
    from_type: PopulationType
    to_type: PopulationType

    def __post_init__(self) -> None:
        expected = next_population_type(self.from_type)

        if expected is None:
            raise ValueError("Investor cannot be upgrade")

        if self.to_type != expected:
            raise ValueError(
                f"Invalid population upgrade: "
                f"{self.from_type.value}"
                f"{self.to_type.value}"
            )


        