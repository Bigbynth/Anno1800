import population from './population.json';
import newWorld from './new_world.json';
import expedition from './expedition.json';
import objectives from './objectives.json';

import type {
  DeckName,
  PopulationCard,
  ExpeditionCard,
  ObjectiveCard,
} from '../types';

function normalizePopulationCards(
  cards: typeof population | typeof newWorld
): PopulationCard[] {
  return cards.map(card => ({
    ...card,
    requirements: Object.fromEntries(
      Object.entries(card.requirements).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number'
      )
    ),
  })) as PopulationCard[];
}

export const catalogue: {
  population: PopulationCard[];
  new_world: PopulationCard[];
  expedition: ExpeditionCard[];
  objectives: ObjectiveCard[];
} = {
  population: normalizePopulationCards(population),
  new_world: normalizePopulationCards(newWorld),
  expedition: expedition as ExpeditionCard[],
  objectives: objectives as ObjectiveCard[],
};

export const deckLabels: Record<DeckName, string> = {
  population: 'Old World',
  new_world: 'New World',
  expedition: 'Expeditions',
  objectives: 'Objectives',
};
