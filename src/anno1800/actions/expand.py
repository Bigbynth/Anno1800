from collections import Counter
from dataclasses import dataclass, field

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext

from anno1800.models.goods import Good
from anno1800.models.industry import Industry, OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.models.ship import Ship, Shipyard

from anno1800.services.production import ProductionResolver


@dataclass(frozen=True)
class ConstructionTarget:
    space_id: str
    build_over: bool = False

@dataclass(frozen=True)
class ShipBuild:
    shipyard: Shipyard
    ship: Ship
    space_id: str
    build_over: bool = False

@dataclass
class ExpandAction(GameAction):
    industry: Industry | None = None
    shipyard: Shipyard | None = None
    industry_space_id: str | None = None
    shipyard_space_id: str | None = None

    industry_build_over: bool = False
    shipyard_build_over: bool = False

    remove_space_id: str | None = None

    ships: list[ShipBuild] = field(default_factory=list)
    production_plan: list[OwnedIndustry] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        self._validate(player)

        population_snapshot = (player.population.snapshot())
        island_snapshot = (player.island.snapshot())
        shipyards_snapshot = (player.shipyards.copy())
        ships_snapshot = (player.ships.copy())
        naval_tokens_snapshot = (player.naval_tokens.copy())
        resolver = (player.start_production())

        try:
            for owned_industry in self.production_plan:
                resolver.produce(owned_industry)

            total_cost = self._total_cost()

            if not resolver.can_pay(total_cost):
                raise InvalidActionError(self._missing_goods_message(resolver, total_cost))

            resolver.pay(total_cost)
            if self.remove_space_id is not None:
                player.remove_construction(self.remove_space_id)

            if self.industry is not None and self.industry_space_id is not None:
                owned_industry = (OwnedIndustry(self.industry))
                if self.industry_build_over:
                    player.replace_construction(self.industry_space_id, owned_industry)
                else:
                    player.add_industry(self.industry, space_id=(self.industry_space_id))
            if self.shipyard is not None and self.shipyard_space_id is not None:
                if self.shipyard_build_over:
                    player.replace_construction(self.shipyard_space_id, self.shipyard)
                else:
                    player.add_shipyard(self.shipyard, space_id=(self.shipyard_space_id))

            for ship_build in self.ships:
                if ship_build.build_over:
                    player.replace_construction(ship_build.space_id, ship_build.ship)
                else:
                    player.add_ship(ship_build.ship, space_id=(ship_build.space_id))

            return ActionResult(
                message=(self._result_message(player))
            )
        except Exception:
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.shipyards = (shipyards_snapshot)
            player.ships = (ships_snapshot)
            player.naval_tokens = (naval_tokens_snapshot)
            raise
        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate(self, player: PlayerState) -> None:
        if self.industry is None and self.shipyard is None and not self.ships:
            raise InvalidActionError("Expand action must build at least one construction")

        self._validate_production_plan(player)
        self._validate_industry(player)
        self._validate_shipyard()
        self._validate_ships(player)
        self._validate_target_spaces(player)
        self._validate_removal(player)

    def _validate_production_plan(self, player: PlayerState) -> None:
        for owned_industry in self.production_plan:
            if owned_industry not in player.island.industries:
                raise InvalidActionError(f"{player.name} does not own {owned_industry.industry.name}")

    def _validate_industry(self, player: PlayerState) -> None:
        if self.industry is None:
            if self.industry_space_id is not None:
                raise InvalidActionError("Industry space was provided without an industry")
            return

        if self.industry_space_id is None:
            raise InvalidActionError("Industry requires an island space")

        if player.has_industry(self.industry):
            raise InvalidActionError(f"{player.name} already owns {self.industry.name}")

    def _validate_shipyard(self) -> None:
        if self.shipyard is None:
            if self.shipyard_space_id is not None:
                raise InvalidActionError("Shipyard space was provided without a shipyard")
            return

        if self.shipyard_space_id is None:
            raise InvalidActionError("Shipyardd requires an island space")

    def _validate_ships(self, player: PlayerState) -> None:
        used_shipyards: set[int] = set()

        for ship_build in self.ships:
            shipyard = (ship_build.shipyard)
            ship = ship_build.ship

            if not player.has_shipyard(shipyard):
                raise InvalidActionError(f"{player.name} does not own {shipyard.name}")

            shipyard_id = id(shipyard)
            if shipyard_id in used_shipyards:
                raise InvalidActionError("A shipyard can build only one ship during an expand action")

            used_shipyards.add(shipyard_id)

            if not shipyard.can_build(ship):
                raise InvalidActionError(
                    f"{shipyard.name} cannot build strength-{ship.strength} {ship.name}"
                )

    def _validate_target_spaces(self, player: PlayerState):
        island = player.island

        targets: list[tuple[str, object, bool]] = []

        if self.industry is not None and self.industry_space_id is not None:
            targets.append((self.industry_space_id, OwnedIndustry(self.industry), self.industry_build_over))

        if self.shipyard is not None and self.shipyard_space_id is not None:
            targets.append((self.shipyard_space_id, self.shipyard, self.shipyard_build_over))

        for ship_build in self.ships:
            targets.append((ship_build.space_id, ship_build.ship, ship_build.build_over))

        used_space_ids: set[str] = set()

        for space_id, construction, build_over in targets:
            if space_id in used_space_ids:
                raise InvalidActionError(f"Island space {space_id} is targeted more than once")

            used_space_ids.add(space_id)
            try:
                space = island.get_space(space_id)
            except ValueError as exc:
                raise InvalidActionError(str(exc)) from exc

            if space.is_empty:
                if build_over:
                    raise InvalidActionError(f"Cannot build over empty space {space_id}")

            else:
                if not build_over:
                    raise InvalidActionError(f"Island space {space_id} is already occupied")

            existing = space.construction
            space.construction = None
            try:
                can_place = space.can_place(construction)
            finally:
                space.construction = existing


            if not can_place:
                raise InvalidActionError(f"Cannot place {type(construction).__name__} on {space.space_type.value} space {space_id}")

        if self.remove_space_id is not None and self.remove_space_id in used_space_ids:
            raise InvalidActionError(f"Space {self.remove_space_id}  cannot be both removed and targeted for construction")

    def _validate_removal(self, player: PlayerState) -> None:
        if self.remove_space_id is None:
            return

        try:
            space = (player.island.get_space(self.remove_space_id))

        except ValueError as exc:
            raise InvalidActionError(str(exc)) from exc

        if space.is_empty:
            raise InvalidActionError(f"Cannot remove construction from empty space {self.remove_space_id}")

    def _total_cost(self) -> dict[Good, int]:
        total: Counter[Good] = Counter()

        if self.industry is not None:
            total.update(self.industry.build_cost)

        if self.shipyard is not None:
            total.update(self.shipyard.build_cost)

        for ship_build in self.ships:
            total.update(ship_build.ship.build_cost)

        return dict(total)

    def _missing_goods_message(self, resolver: ProductionResolver, cost: dict[Good, int]) -> str:
        missing: list[str] = []

        for good, required in cost.items():
            available = (resolver.goods.count(good))

            if available < required:
                missing.append(f"{good.value}: {available}/{required}")

        return ("Cannot expand. Missing"
                f"{', '.join(missing)}")

    def _result_message(self, player: PlayerState) -> str:
        built: list[str] = []

        if self.industry is not None:
            built.append(self.industry.name)

        if self.shipyard is not None:
            built.append(self.shipyard.name)

        built.extend(ship_build.ship.name for ship_build in self.ships)

        return (
            f"{player.name} expanded: "
            f"{', '.join(built)}"
        )