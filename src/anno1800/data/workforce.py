from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

WORKFORCE_COSTS: dict[PopulationType, dict[Good, int]] = {
    PopulationType.FARMER: {
        Good.GRAIN: 1
    },

    PopulationType.WORKER: {
        Good.BREAD: 1
    },

    PopulationType.ARTISAN: {
        Good.CLOTHING: 1
    },

    PopulationType.ENGINEER: {
        Good.STEEL: 1
    },

    PopulationType.INVESTOR: {
        Good.WINDOWS: 1
    }
}