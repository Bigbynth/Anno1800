import type { AnyCard, PopulationCard, ExpeditionCard, ObjectiveCard } from '../types';
import { pretty } from '../types';

export function isPopulation(card: AnyCard): card is PopulationCard { return 'requirements' in card; }
export function isExpedition(card: AnyCard): card is ExpeditionCard { return 'animal' in card; }

function effectLabel(effect: { type: string; amount?: number; population_type?: string }) {
  return `${pretty(effect.type)}${effect.amount ? ` +${effect.amount}` : ''}${effect.population_type ? ` · ${pretty(effect.population_type)}` : ''}`;
}

export function CardFace({ card, selected = false, onClick }: {
  card: AnyCard;
  selected?: boolean;
  onClick?: () => void;
}) {
  const population = isPopulation(card);
  const expedition = isExpedition(card);
  const kind = population ? card.category : expedition ? 'expedition' : 'objective';
  const title = population ? pretty(card.category) : expedition ? 'Voyage of Discovery' : (card as ObjectiveCard).name;
  return (
    <button className={`game-card ${kind} ${selected ? 'selected' : ''}`} onClick={onClick} type="button" aria-pressed={selected}>
      <div className="card-inner">
        <div className="card-overline"><span>✦</span> {expedition ? 'THE EXPEDITION' : population ? 'POPULATION' : 'THE COUNCIL'} <span>✦</span></div>
        <div className="card-illustration" aria-hidden="true">
          <span className="card-illustration-ring" />
          <span className="card-illustration-symbol">{population ? ({farmer:'♧',worker:'⚒',artisan:'✥',engineer:'⚙',investor:'♛',new_world:'❀'}[card.category]) : expedition ? '⚓' : '❖'}</span>
        </div>
        <div className="card-title">{title}</div>
        <div className="card-subtitle">{card.id.replace('custom-', '').replaceAll('-', ' · ')}</div>
        <div className="card-rule" >
          {population ? (
            <>
              <div className="card-rule-title">REQUIRED GOODS</div>
              <div className="goods-list">{Object.entries(card.requirements).map(([good, count]) => <span className="good-pill" key={good}><b>{count}×</b> {pretty(good)}</span>)}</div>
              <div className="card-effect">{card.effects.length ? card.effects.map((e, i) => <div key={i}>✦ {effectLabel(e)}</div>) : 'No additional reward'}</div>
            </>
          ) : expedition ? (
            <div className="expedition-rewards"><div><strong>{card.animal.name}</strong><small>{pretty(card.animal.population_type)} · {card.animal.victory_points} VP</small></div><div><strong>{card.artifact.name}</strong><small>{pretty(card.artifact.population_type)} · {card.artifact.victory_points} VP</small></div></div>
          ) : (
            <div className="objective-rule">{pretty((card as ObjectiveCard).rule.type as string)} · {JSON.stringify((card as ObjectiveCard).rule).replace(/[{}\"_]/g, ' ').slice(0, 105)}</div>
          )}
        </div>
        <div className="card-footer"><span>HOME BREW · {card.verification.toUpperCase()}</span><strong>{population ? `${card.victory_points} VP` : expedition ? '2 REWARDS' : 'OBJECTIVE'}</strong></div>
      </div>
    </button>
  );
}
