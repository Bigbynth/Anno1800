import { useEffect, useMemo, useState } from 'react';
import { catalogue as fallbackCatalogue, deckLabels } from './data/catalogue';
import { fetchGameData } from './api';
import { CardFace, isPopulation, isExpedition } from './components/CardFace';
import { IslandBoard, locations } from './components/IslandBoard';
import { pretty } from './types';
import type { AnyCard, DeckName, Catalogue, GameSnapshot } from './types';
import './styles.css';


type Screen = 'harbor' | 'codex';
const decks: DeckName[] = ['population', 'new_world', 'expedition', 'objectives'];
const players = [
  { name: 'Your Company', subtitle: 'The Crown & Anchor', color: '#bd995d', initials: 'YC' },
  { name: 'Rival Company', subtitle: 'North Trading Guild', color: '#7a9c94', initials: 'RC' },
];

function App() {
  const [screen, setScreen] = useState<Screen>('harbor');
  const [activeDeck, setActiveDeck] = useState<DeckName>('population');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>('port');
  const [activePlayer, setActivePlayer] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [hand, setHand] = useState<string[]>(() =>
  fallbackCatalogue.population.slice(0, 3).map(card => card.id)
);
  const [notice, setNotice] = useState('Select an island location to inspect it.');
  
  // Step 52: Backend integration
  const [catalogue, setCatalogue] = useState<Catalogue>(
    fallbackCatalogue as Catalogue
  );
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchGameData()
      .then(data => {
        if (!active) return;

        setCatalogue(data.catalogue);
        setGame(data.game);
        setActivePlayer(data.game.current_player_index);
        setApiError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;

        setApiError(
          error instanceof Error
            ? error.message
            : 'Unknown API error'
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const deckCounts = decks.map(deck => ({
    deck,
    count: catalogue[deck].reduce(
      (sum, card) =>
        sum + ('quantity' in card ? card.quantity : 1),
      0
    ),
  }));

  const visibleHand = game
    ? (game.players[activePlayer]?.hand ?? [])
    : hand;


  const visibleCards = useMemo(() => {
    const source = catalogue[activeDeck] as AnyCard[];
    return source.filter(card => {
      if (isPopulation(card) && category !== 'all' && card.category !== category) return false;
      const content = isPopulation(card) ? `${card.category} ${Object.keys(card.requirements).join(' ')} ${card.id}` :
        isExpedition(card) ? `${card.animal.name} ${card.artifact.name} ${card.id}` : `${card.name} ${card.id}`;
      return content.toLowerCase().includes(search.trim().toLowerCase());
    });
  }, [catalogue, activeDeck, category, search]);
  const selectedCard = visibleCards.find(card => card.id === selectedCardId) ?? visibleCards[0];
  const location = locations.find(item => item.id === selectedLocation);
  const handCards = catalogue.population
  .filter(isPopulation)
  .filter(card => visibleHand.includes(card.id));

  function openDeck(deck: DeckName) { setActiveDeck(deck); setSelectedCardId(null); setCategory('all'); setSearch(''); setScreen('codex'); }
  
  function resetDemo() {
    if (game) {
      setActivePlayer(game.current_player_index);
      setSelectedLocation('port');
      setNotice('UI view reset. Backend game state remains unchanged.');
      setScreen('harbor');
      return;
    }

    setHand(
      fallbackCatalogue.population.slice(0, 3).map(card => card.id)
    );
    setActivePlayer(0);
    setSelectedLocation('port');
    setNotice('Demo reset. No backend state was changed.');
    setScreen('harbor');
  }


  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">A<span>·</span></div><div><div className="brand-title">ANNO <em>1800</em></div><div className="brand-caption">THE BOARD GAME · COMPANION</div></div></div>
      <div className="sidebar-section-title">YOUR TABLE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        <button className={screen === 'harbor' ? 'active' : ''} onClick={()=>setScreen('harbor')}><span className="nav-symbol">⌂</span> Harbor overview <span className="nav-arrow">↗</span></button>
        <button className={screen === 'codex' ? 'active' : ''} onClick={()=>setScreen('codex')}><span className="nav-symbol">▤</span> Card collection <span className="nav-arrow">↗</span></button>
      </nav>
      <div className="sidebar-section-title deck-heading">CARD CATALOGUES</div>
      <nav className="deck-nav" aria-label="Card catalogues">
        {deckCounts.map(({deck,count}) => <button key={deck} className={screen === 'codex' && activeDeck === deck ? 'current' : ''} onClick={()=>openDeck(deck)}><span className={`deck-dot ${deck}`}/>{deckLabels[deck]}<span className="deck-count">{count}</span></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-bottom-icon">✦</div><div><strong>Custom edition</strong><p>Original, invented card decks. Balance is provisional.</p></div></div>
      <button className="sidebar-help" onClick={()=>setShowHelp(true)}>ⓘ <span>About this prototype</span><span>↗</span></button>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">THE ARCHIPELAGO <span>/</span> {screen === 'harbor' ? 'HARBOR OVERVIEW' : deckLabels[activeDeck].toUpperCase()}</div><div className="topbar-actions"><span className="prototype-pill">
  <span />
  {game ? 'ENGINE CONNECTED' : apiError ? 'DEMO MODE' : 'CONNECTING'}
</span><button className="topbar-icon" onClick={()=>setShowHelp(true)} aria-label="Help">?</button><div className="avatar">YC</div></div></header>
      {screen === 'harbor' ? <>
        <div className="page-intro"><div><div className="eyebrow">YOUR EMPIRE AWAITS</div><h1>Welcome to your <i>harbor.</i></h1><p>A new age of industry, discovery and trade begins here.</p></div><div className="page-intro-actions"><button className="ghost-button" onClick={resetDemo}>↺ Reset demo</button><button className="gold-button" onClick={()=>openDeck('population')}>Explore cards <span>↗</span></button></div></div>
        <div className="dashboard-grid"><section className="board-panel"><div className="panel-heading"><div><span className="eyebrow">THE OLD WORLD</span><h2>Your island estate</h2></div><span className="panel-kicker">5 LOCATIONS · EXPLORE THE MAP</span></div><IslandBoard selectedId={selectedLocation} onSelect={id=>{setSelectedLocation(id);setNotice(`${locations.find(x=>x.id===id)?.name} selected. Production actions will be connected in a later step.`);}}/><div className="board-bottom"><div className="location-info"><div className="location-icon">{location?.icon ?? '✦'}</div><div><span className="eyebrow">{location?.type ?? 'LOCATION'}</span><strong>{location?.name ?? 'Select a location'}</strong><p>{location?.description ?? 'Explore the island.'}</p></div></div><div className="production-badge">PRODUCES <b>{location?.production ?? '—'}</b></div></div></section>
          <aside className="dashboard-right"><section className="company-panel"><div className="eyebrow">THE TRADING COMPANIES</div><h2>At the table</h2><div className="player-list">{players.map((player,i)=><button key={player.name} onClick={()=>setActivePlayer(i)} className={`player-row ${activePlayer===i?'selected':''}`}><span className="player-avatar" style={{background:player.color}}>{player.initials}</span><span className="player-description"><strong>{player.name}</strong><small>{player.subtitle}</small></span>{activePlayer===i?<span className="turn-marker">VIEWING</span>:<span className="player-arrow">↗</span>}</button>)}</div>
<div className="company-stats">
  <div>
    <span>ROUND</span>
    <strong>
      {String(game?.round ?? 1).padStart(2, '0')}
    </strong>
  </div>
  <div>
    <span>GOLD</span>
    <strong>
      {game?.players[activePlayer]?.gold ?? '—'}
    </strong>
  </div>
  <div>
    <span>VICTORY POINTS</span>
    <strong>
      {game?.players[activePlayer]?.victory_points ?? '—'}
    </strong>
  </div>
</div>
<div className="small-note">
  {game
    ? 'Live game snapshot · Read-only'
    : apiError
      ? `Demo mode: ${apiError}`
      : 'Connecting to Python game engine...'}
</div></section>
            <section className="hand-panel"><div className="hand-panel-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h2>Preview hand</h2></div><span className="hand-count">{visibleHand.length} CARDS</span></div><div className="mini-card-stack">{handCards.map(card=><button key={card.id} className="mini-card" onClick={()=>{openDeck('population');setSelectedCardId(card.id);}}><span className={`mini-card-emblem ${card.category}`}>{card.category==='farmer'?'♧':'⚒'}</span><span><strong>{pretty(card.category)}</strong><small>{Object.entries(card.requirements).map(([good,amount])=>`${amount}× ${pretty(good)}`).join(' · ')}</small></span><b>{card.victory_points} VP</b></button>)}</div><button className="link-button" onClick={()=>openDeck('population')}>View complete card catalogue <span>→</span></button></section>
          </aside></div>
        <div className="bottom-strip"><div className="strip-intro"><span className="strip-icon">⚓</span><div><strong>Set sail for discovery</strong><p>Four custom decks are ready to explore.</p></div></div><div className="strip-decks">{deckCounts.map(({deck,count})=><button key={deck} onClick={()=>openDeck(deck)}><strong>{count}</strong><span>{deckLabels[deck]}</span><i>↗</i></button>)}</div></div>
        <div className="notice" role="status">✦ {notice}</div>
      </> : <>
        <div className="page-intro codex-intro"><div><div className="eyebrow">THE GRAND ARCHIVE</div><h1>Card <i>collection.</i></h1><p>Explore the custom cards powering your Anno 1800 prototype.</p></div><div className="catalogue-total"><strong>144</strong><span>CARDS ACROSS<br/>FOUR DECKS</span></div></div>
        <section className="codex-panel"><div className="codex-tabs">{deckCounts.map(({deck,count})=><button key={deck} className={activeDeck===deck?'active':''} onClick={()=>{setActiveDeck(deck);setCategory('all');setSearch('');setSelectedCardId(null);}}>{deckLabels[deck]} <span>{count}</span></button>)}</div><div className="codex-toolbar"><div><h2>{deckLabels[activeDeck]} cards</h2><p>{visibleCards.length} designs displayed · Original homebrew data</p></div><div className="filters"><label className="search-box"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cards or goods…" aria-label="Search cards"/></label>{activeDeck==='population'&&<select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter by population tier"><option value="all">All tiers</option>{['farmer','worker','artisan','engineer','investor'].map(tier=><option key={tier} value={tier}>{pretty(tier)}</option>)}</select>}</div></div>{game
  ? 'Read-only mode'
  : visibleHand.includes(selectedCard.id)
    ? 'In preview hand'
    : 'Add to preview hand'}
          <div className="codex-layout"><div className="card-gallery">{visibleCards.map(card=><CardFace key={card.id} card={card} selected={selectedCard?.id===card.id} onClick={()=>setSelectedCardId(card.id)}/>)}{visibleCards.length===0&&<div className="empty-state">No cards match this search. Try another term.</div>}</div><aside className="inspector"><div className="eyebrow">CARD INSPECTOR</div>{selectedCard?<><h2>{isPopulation(selectedCard)?pretty(selectedCard.category):isExpedition(selectedCard)?'Expedition':selectedCard.name}</h2><p className="inspector-id">{selectedCard.id}</p><div className="inspector-divider"/>{isPopulation(selectedCard)?<><div className="inspector-label">REQUIREMENTS</div>{Object.entries(selectedCard.requirements).map(([good,count])=><div className="inspector-line" key={good}><span>{pretty(good)}</span><strong>× {count}</strong></div>)}<div className="inspector-divider"/><div className="inspector-line"><span>Victory points</span><strong>{selectedCard.victory_points}</strong></div><div className="inspector-label inspector-label-later">CARD EFFECTS</div>{selectedCard.effects.length?selectedCard.effects.map((effect,i)=><p className="inspector-effect" key={i}>{pretty(effect.type)} {effect.amount??''} {effect.population_type?pretty(effect.population_type):''}</p>):<p className="inspector-effect">None</p>}<div className="inspector-line"><span>Copies in deck</span><strong>{selectedCard.quantity}</strong></div>{activeDeck==='population'&&<button className="gold-button inspector-action" disabled={Boolean(game) || visibleHand.includes(selectedCard.id)} onClick={()=>{setHand(previous=>[...previous,selectedCard.id]);setNotice('Added card to the UI-only preview hand.');}}></button>}</>:isExpedition(selectedCard)?<><div className="inspector-label">ANIMAL</div><div className="inspector-line"><span>{selectedCard.animal.name}</span><strong>{selectedCard.animal.victory_points} VP</strong></div><div className="inspector-label inspector-label-later">ARTIFACT</div><div className="inspector-line"><span>{selectedCard.artifact.name}</span><strong>{selectedCard.artifact.victory_points} VP</strong></div></>:<><div className="inspector-label">SCORING RULE</div><pre className="rule-json">{JSON.stringify(selectedCard.rule,null,2)}</pre></>}<div className="inspector-divider"/><div className="verification-note">✦ Invented card. Gameplay balance is provisional.</div></>:<p>Select a card to see its details.</p>}</aside></div></section>
      </>}
      <footer className="app-footer"><span>ANNO 1800 · UNOFFICIAL FAN-MADE PROTOTYPE</span><span>STEP 51 · UI FOUNDATION</span></footer>
    </main>
    {showHelp&&<div className="modal-backdrop" onClick={()=>setShowHelp(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowHelp(false)} aria-label="Close">×</button><div className="eyebrow">ABOUT THIS BUILD</div><h2 id="modal-title">A beautiful beginning.</h2><p>This is the Step 51 interface prototype. You can explore five island locations, browse all four custom card decks, filter and inspect cards, and preview a hand.</p><p>Production, trading, turn progression, multiplayer and saving are not yet connected to the Python game engine. The displayed companies and island are sample UI data.</p><button className="gold-button" onClick={()=>setShowHelp(false)}>Return to harbor</button></div></div>}
  </div>;
}
export default App;
