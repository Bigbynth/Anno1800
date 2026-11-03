export type PopulationTier = 'farmer' | 'worker' | 'artisan' | 'engineer' | 'investor' | 'new_world';
export type Goods = Record<string, number>;
export interface CardEffect { type: string; amount?: number; population_type?: string; }
export interface PopulationCard {
  id: string;
  category: PopulationTier;
  requirements: Goods;
  victory_points: number;
  effects: CardEffect[];
  quantity: number;
  verification: string;
}
export interface ExpeditionCard {
  id: string;
  animal: { name: string; population_type: string; victory_points: number };
  artifact: { name: string; population_type: string; victory_points: number };
  verification: string;
}
export interface ObjectiveCard {
  id: string;
  name: string;
  objective_type: string;
  rule: Record<string, unknown>;
  verification: string;
}
export type AnyCard = PopulationCard | ExpeditionCard | ObjectiveCard;
export type DeckName = 'population' | 'new_world' | 'expedition' | 'objectives';
export const pretty = (value: string) => value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
