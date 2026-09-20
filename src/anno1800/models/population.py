from enum import Enum
from dataclasses import dataclass, field

class PopulationType(str, Enum):
    FARMER = "farmer"
    WORKER = "worker"
    ARTISAN = "artisan"
    ENGINEER = "engineer"
    INVESTOR = "investor"

class PopulationCubeState(str, Enum):
    AVAILABLE = "available"
    EXHAUSTED = "exhausted"
    ASSIGNED = "assigned"

POPULATION_ORDER  = (
    PopulationType.FARMER,
    PopulationType.WORKER,
    PopulationType.ARTISAN,
    PopulationType.ENGINEER,
    PopulationType.INVESTOR
)

NEXT_POPULATION_TYPE = {
    PopulationType.FARMER: PopulationType.WORKER,
    PopulationType.WORKER: PopulationType.ARTISAN,
    PopulationType.ARTISAN: PopulationType.ENGINEER,
    PopulationType.ENGINEER: PopulationType.INVESTOR
}

def next_population_type(population_type: PopulationType) -> PopulationType | None:
    return NEXT_POPULATION_TYPE.get(population_type)


@dataclass
class PopulationCube:
    id: int
    population_type: PopulationType
    state: PopulationCubeState = (PopulationCubeState.AVAILABLE)

    @property
    def is_available(self) -> bool:
        return (self.state == PopulationCubeState.AVAILABLE)

    @property
    def is_exhausted(self) -> bool:
        return (self.state == PopulationCubeState.EXHAUSTED)

    @property
    def is_assigned(self) -> bool:
        return self.state == PopulationCubeState.ASSIGNED

    def assign(self) -> None:
        if not self.is_available:
            raise ValueError(f"Population cube {self.id} is not available")

        self.state = PopulationCubeState.ASSIGNED

    def exhaust(self) -> None:
        if self.is_exhausted:
            raise ValueError(f"Population cube {self.id} is already exhausted")

        self.state = (PopulationCubeState.EXHAUSTED)

    def refresh(self) -> None:
        self.state = (PopulationCubeState.AVAILABLE)

@dataclass(frozen=True)
class PopulationCubeSnapshot:
    cube: PopulationCube
    population_type: PopulationType
    state: PopulationCubeState

@dataclass(frozen=True)
class PopulationSnapshot:
    cubes: tuple[PopulationCubeSnapshot, ...]
    next_cube_id: int

@dataclass
class Population:

    cubes: list[PopulationCube] = field(default_factory=list)

    _next_cube_id: int = 1

    def total(self, population_type: PopulationType) -> int:
        return sum(1 for cube in self.cubes if (cube.population_type == population_type))

    def add(self, population_type: PopulationType, amount: int = 1) -> list[PopulationCube]:
        if amount < 0:
            raise ValueError("Amount cannot be negative")

        created: list[PopulationCube] = []
        for _ in range(amount):
            cube = PopulationCube(id=self._next_cube_id, population_type=population_type)
            self._next_cube_id += 1
            self.cubes.append(cube)
            created.append(cube)
        return created

        self.avalable[population_type] += amount

    def can_use(self, population_type: PopulationType, amount: int = 1) -> bool:
        return (self.available_count(population_type) >= amount)

    def use(self, population_type: PopulationType) -> PopulationCube:
        cubes = self.available_cubes(population_type)
        if not cubes:
            raise ValueError(f"No available {population_type.value} population")

        cube = cubes[0]
        cube.exhaust()
        return cube

    def refresh_all(self) -> None:
        for cube in self.cubes:
            if cube.is_exhausted:
                cube.refresh()

    def snapshot(self) -> PopulationSnapshot:
        return PopulationSnapshot(cubes=tuple(PopulationCubeSnapshot(cube=cube, population_type=(cube.population_type), state=cube.state) for cube in self.cubes))

    def restore(self, snapshot: PopulationSnapshot) -> None:
        original_cubes: list[PopulationCube] = []

        for cube_snapshot in snapshot.cubes:
            cube = cube_snapshot.cube
            cube.population_type = (cube_snapshot.population_type)
            cube.state = (cube_snapshot.state)
            original_cubes.append(cube)

        self.cubes = original_cubes
        self._next_cube_id = (snapshot.next_cube_id)

    def can_upgrade_available(self, from_type: PopulationType) -> bool:
        return bool(self.available_cubes(from_type))

    def upgrade_available(self, from_type: PopulationType) -> PopulationCube:
        to_type = next_population_type(from_type)

        if to_type is None:
            raise ValueError(
                f"{from_type.value} cannot"
                f"be upgraded"
            )

        cubes = self.available_cubes(from_type)

        if not cubes:
            raise ValueError(f"No available {from_type.value} population to upgrade")

        cube = cubes[0]
        cube.population_type = (to_type)
        return cube

    def available_count(self, population_type: PopulationType) -> int:
        return sum(1 for cube in self.cubes if (cube.population_type == population_type and cube.is_available))

    def exhausted_count(self, population_type: PopulationType) -> int:
        return sum(1 for cube in self.cubes if (cube.population_type == population_type and cube.is_exhausted))

    def available_cubes(self, population_type: PopulationType) -> list[PopulationCube]:
        return [cube for cube in self.cubes if (cube.population_type == population_type and cube.is_available)]

    def get_cube(self, cube_id: int) -> PopulationCube:
        for cube in self.cubes:
            if cube.i == cube_id:
                return cube

        raise ValueError(f"Unknown population cube: {cube_id}")

    def upgrade_cube(self, cube: PopulationCube) -> None:
        if not any(owned_cube is cube for owned_cube in self.cubes):
            raise ValueError("Population cube does not belong to this population")

        if not cube.is_available:
            raise ValueError(f"Population cube {cube.id} is not available")

        next_type = (next_population_type(cube.population_type))
        if next_type is None:
            raise ValueError(f"{cube.population_type.value} cannot be upgraded")

        cube.population_type = (next_type)

    def acquire_available(self, population_type: PopulationType) -> PopulationCube:
        cubes = self.available_cubes(population_type)

        if not cubes:
            raise ValueError(f"No available {population_type.value} population")

        cube = cubes[0]
        cube.assign()
        return cube
    
    
    

