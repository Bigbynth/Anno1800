from anno1800.models.cards import PopulationCard
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

POPULATION_CARDS = [
    PopulationCard(id="farmer-001", population_type=PopulationType.FARMER, requirements={Good.BREAD: 1}, victory_points=2),
    PopulationCard(id="farmer-002", population_type=PopulationType.FARMER, requirements={Good.CLOTHING: 1}, victory_points=3),
    PopulationCard(id="worker-001", population_type=PopulationType.WORKER, requirements={Good.BEER: 1}, victory_points=3),
    
]