from collections import Counter
from dataclasses import dataclass, field

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.data.workforce import WORKFORCE_COSTS
from anno1800.models.goods import Good
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.models.workforce import WorkforceIncrease
from anno1800.actions.context import ActionContext
from anno1800.models.deck import PopulationCardDeck

MAX_WORKFORCE_INCREASES = 3

@dataclass
class IncreaseWorkforceACtion(GameAction):
    increases: list[WorkforceIncrease]

    production_plan: list[OwnedIndustry] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        deck = context.state.population_deck
        self._validate_count()

        self._validate_industries(player)

        population_snapshot = player.population.snapshot()

        island_snapshot = player.island.snapshot()

        hand_snapshot = player.hand.copy()

        gold_snapshot = player.gold

        deck_snapshot = {
            population_type: cards.copy()
            for population_type, cards in deck.cards.items()
        }

        resolver = player.start_production()

        try:
            for industry in self.production_plan:
                resolver.produce(industry)

            total_cost = self._calculate_cost()

            if not resolver.can_pay(total_cost):
                raise InvalidActionError(
                    "Not enough goods to increase workforce"
                )

            missing_cards = self._count_missing_cards(deck)

            if missing_cards > 0 and not player.can_spend_gold(missing_cards):
                raise InvalidActionError("Not enough gold to cover missing population cards")

            resolver.pay(total_cost)

            self._apply_increases(player, deck)

            return ActionResult(
                message=(
                    f"{player.name} increased"
                    f"workforce by "
                    f"{len(self.increases)}"
                )
            )
        except Exception:
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.hand = hand_snapshot
            player.gold = gold_snapshot
            deck.cards = {
                population_type: cards.copy()
                for population_type, cards in deck_snapshot.items()
            }

            raise

        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate_count(self) -> None:
        if not self.increases:
            raise InvalidActionError("At least one population cube must be added")

        if len(self.increases) > MAX_WORKFORCE_INCREASES:
            raise InvalidActionError("A maximum of 3 population cubes can be added")

    def _validate_industries(self, player: PlayerState) -> None:
        for industry in self.production_plan:
            if industry not in player.island.industries:
                raise InvalidActionError("Production plan contains an industry not owned by the player")

    def _calculate_cost(self) -> dict[Good, int]:
        total: Counter[Good] = Counter()
        for increase in self.increases:
            total.update(WORKFORCE_COSTS[increase.population_type])

        return dict(total)

    def _count_missing_cards(self, deck: PopulationCardDeck) -> int:
        requested = Counter(increase.population_type for increase in self.increases)
        missing = 0

        for (population_type, amount) in requested.items():
            available = deck.remaining(population_type)
            missing += max(0, amount - available)
        return missing

    def _apply_increases(self, player: PlayerState, deck: PopulationCardDeck) -> None:
        for increase in self.increases:
            population_type = increase.population_type

            player.add_population(population_type)

            if not deck.is_empty(population_type):
                card = deck.draw(population_type)
                player.add_card(card)

            else:
                player.spend_gold(1)
