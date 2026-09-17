from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

UPGRADE_COST: dict[PopulationType, dict[Good, int]] = {
    PopulationType.FARMER: {
        Good.BRICK: 1
    },
    PopulationType.WORKER: {
        Good.COAL: 1
    },
    PopulationType.ARTISAN: {
        Good.STEEL: 1
    },
    PopulationType.ENGINEER: {
        Good.WINDOWS: 1
    }
}