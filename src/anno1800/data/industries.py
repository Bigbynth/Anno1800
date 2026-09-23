from anno1800.models.industry import Industry
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

from dataclasses import dataclass
SHEEP_FARM = Industry(
    name="Sheep Farm",
    good=Good.WOOL,
    worker_type=PopulationType.FARMER
)

GRAIN_FARM = Industry(
    name="Grain Farm",
    good=Good.GRAIN,
    worker_type=PopulationType.FARMER
)

COAL_MINE = Industry(
    name="Coal Mine",
    good=Good.COAL,
    worker_type=PopulationType.WORKER
)

BAKERY = Industry(
    name="Bakery",
    good=Good.BREAD,
    worker_type=PopulationType.WORKER,
    build_cost={
        Good.GRAIN: 1,
        Good.COAL: 1
    }
)

BRICKWORKS = Industry(
    name="Brickworks",
    good=Good.BRICK,
    worker_type=PopulationType.ARTISAN,
    build_cost={
        Good.COAL: 1
    }
)

@dataclass(frozen=True)
class IndustryDefinition:
    id: str
    industry: Industry
    supply: int = 2

INDUSTRY_CATALOGUE: tuple[IndustryDefinition, ...] = (
    IndustryDefinition(
        id="sheep-farm",
        industry=SHEEP_FARM,
    ),
    IndustryDefinition(
        id="grain-farm",
        industry=GRAIN_FARM,
    ),
    IndustryDefinition(
        id="coal-mine",
        industry=COAL_MINE,
    ),
    IndustryDefinition(
        id="bakery",
        industry=BAKERY,
    ),
    IndustryDefinition(
        id="brickworks",
        industry=BRICKWORKS,
    ),
)

def create_industry_supply() -> dict[str, int]:
    return {
        definition.id: definition.supply for definition in INDUSTRY_CATALOGUE
    }

def get_industry_definition(industry: Industry) -> IndustryDefinition:
    for definition in INDUSTRY_CATALOGUE:
        if definition.industry is industry:
            return definition

    raise ValueError(f"Unknown industry: {industry.name}")

 