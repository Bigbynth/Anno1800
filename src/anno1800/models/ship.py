from dataclasses import dataclass
from enum import Enum

class ShipType(str, Enum):
    TRADE = "trade"
    EXPLORATION = "exploration"

@dataclass
class Ship:
    name: str
    ship_type: ShipType
    capacity: int
    used: int = 0

    @property
    def available_capacity(self) -> int:
        return self.capacity - self.used

    def can_use(self, amount: int = 1) -> bool:
        if amount <= 0:
            return False

        return self.available_capacity >= amount

    def use(self, amount: int = 1) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        if not self.can_use(amount):
            raise ValueError(
                f"Ship {self.name} does not have enough capacity"
            )
        self.used += amount

    def refresh(self) -> None:
        self.used = 0