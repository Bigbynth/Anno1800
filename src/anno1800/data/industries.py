from anno1800.models.industry import Industry
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

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

 