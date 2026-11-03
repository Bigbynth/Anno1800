from copy import deepcopy
import pytest
from anno1800.game_state import GameState
from anno1800.data.industries import INDUSTRY_CATALOGUE
from anno1800.data.ships import SHIP_CATALOGUE
from anno1800.data.shipyards import SHIPYARD_CATALOGUE
from anno1800.models.production import ProductionContext
from anno1800.models.goods import Good
from anno1800.services.production import ProductionResolver
from anno1800.models.population import Population

@pytest.mark.parametrize('definition', INDUSTRY_CATALOGUE)
def test_industry_supply_boundaries(definition):
    state = GameState()
    item = deepcopy(definition.industry)
    assert state.industry_remaining(item) == definition.supply
    for _ in range(definition.supply):
        state.take_industry(item)
    assert state.industry_remaining(item) == 0
    with pytest.raises(ValueError):
        state.take_industry(item)
    for _ in range(definition.supply):
        state.return_industry(item)
    with pytest.raises(ValueError):
        state.return_industry(item)

@pytest.mark.parametrize('definition', SHIP_CATALOGUE)
def test_ship_supply_boundaries(definition):
    state = GameState()
    item = deepcopy(definition.ship)
    for _ in range(definition.supply):
        state.take_ship(item)
    with pytest.raises(ValueError):
        state.take_ship(item)
    for _ in range(definition.supply):
        state.return_ship(item)
    with pytest.raises(ValueError):
        state.return_ship(item)

@pytest.mark.parametrize('definition', SHIPYARD_CATALOGUE)
def test_shipyard_supply_boundaries(definition):
    state = GameState()
    item = deepcopy(definition.shipyard)
    for _ in range(definition.supply):
        state.take_shipyard(item)
    with pytest.raises(ValueError):
        state.take_shipyard(item)
    for _ in range(definition.supply):
        state.return_shipyard(item)
    with pytest.raises(ValueError):
        state.return_shipyard(item)

def test_resource_payment_is_atomic():
    resolver = ProductionResolver(Population())
    resolver.add_external_good(Good.GRAIN)
    before = resolver.goods
    with pytest.raises(ValueError):
        resolver.pay({Good.GRAIN: 1, Good.COAL: 1})
    assert resolver.goods == before
    resolver.pay({Good.GRAIN: 1})
    assert resolver.goods == []

@pytest.mark.parametrize('amount', [-1, -5])
def test_negative_resource_amounts_rejected(amount):
    context = ProductionContext()
    with pytest.raises(ValueError):
        context.consume(Good.GRAIN, amount)
    with pytest.raises(ValueError):
        context.has(Good.GRAIN, amount)
    resolver = ProductionResolver(Population())
    with pytest.raises(ValueError):
        resolver.add_external_good(Good.GRAIN, amount)
    with pytest.raises(ValueError):
        resolver.pay({Good.GRAIN: amount})
