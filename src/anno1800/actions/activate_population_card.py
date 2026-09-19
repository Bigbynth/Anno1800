from dataclasses import dataclass
from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.models.cards import CardEffect, CardEffectType, PopulationCard
from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType
from anno1800.actions.context import ActionContext

@dataclass
class ActivatePopulationCardAction(GameAction):
    card: PopulationCard

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        if not player.can_activate_card(self.card):
            raise InvalidActionError(
                f"Card {self.card.id} cannot be activated"
            )

        self._validate_effects()

        gold_snapshot = player.gold
        population_snapshot = (player.population.snapshot())
        ships_snapshot = (player.ships.copy())
        naval_tokens_snapshot = (player.naval_tokens.copy())
        activated_snapshot = (self.card.activated)

        try:
            for effect in self.card.effects:
                self._apply_effect(player, effect)

            player.activate_card(self.card)

            return ActionResult(
                message=(
                    f"{player.name} activated card {self.card.id}"
                )
            )
        except Exception:
            player.gold = gold_snapshot
            player.population.restore(population_snapshot)
            player.ships = (ships_snapshot)
            player.naval_tokens = (naval_tokens_snapshot)
            self.card.activated = (activated_snapshot)
            raise

    def _validate_effects(self) -> None:
        for effect in self.card.effects:
            if effect.effect_type not in {
                CardEffectType.GAIN_GOLD,
                CardEffectType.GAIN_TRADE_CAPACITY,
                CardEffectType.GAIN_EXPLORATION_CAPACITY,
                CardEffectType.GAIN_POPULATION
            }:
                raise InvalidActionError("Unsupportedd card effect: "
                                         f"{effect.effect_type}")

    def _apply_effect(self, player: PlayerState, effect: CardEffect) -> None:
        if effect.effect_type == CardEffectType.GAIN_GOLD:
            player.add_gold(effect.amount)
            return

        if effect.effect_type == CardEffectType.GAIN_TRADE_CAPACITY:
            player.add_naval_tokens(NavalTokenType.TRADE, effect.amount)
            return

        if effect.effect_type == CardEffectType.GAIN_EXPLORATION_CAPACITY:
            player.add_naval_tokens(NavalTokenType.EXPLORATION, effect.amount)
            return

        if effect.effect_type == CardEffectType.GAIN_POPULATION:
            if effect.population_type is None:
                raise InvalidActionError("Population type is required")

            player.add_population(effect.population_type, effect.amount)
            return

        raise InvalidActionError(f"Unsupported effect: {effect.effect_type}")