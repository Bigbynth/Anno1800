from anno1800.models.population import PopulationType

MIN_PLAYERS = 2
MAX_PLAYERS = 4

STARTING_POPULATION = {
    PopulationType.FARMER: 4,
    PopulationType.WORKER: 3,
    PopulationType.ARTISAN: 2
}

STARTING_FARMER_WORKER_CARDS = 7
STARTING_ADVANCED_CARDS = 2

STARTING_GOLD_BY_POSITION = (0,1,2,3)