export type Location = { id: string; name: string; description: string; production: string; x: number; y: number; icon: string; type: string };
export const locations: Location[] = [
  {id:'grain',name:'Wheatfields',description:'Fertile fields on the western coast.',production:'Grain',x:27,y:42,icon:'♧',type:'Agriculture'},
  {id:'sheep',name:'Sheep Pastures',description:'Rolling green pastures supply the textile workshops.',production:'Wool',x:39,y:28,icon:'✿',type:'Agriculture'},
  {id:'brick',name:'Brickworks',description:'Clay and fire fuel the growing industrial city.',production:'Bricks',x:57,y:43,icon:'▥',type:'Industry'},
  {id:'port',name:'Grand Harbor',description:'The commercial heart of your island.',production:'Trade',x:71,y:68,icon:'⚓',type:'Harbor'},
  {id:'forest',name:'Timber Yard',description:'A forest estate supporting construction.',production:'Timber',x:48,y:70,icon:'♠',type:'Industry'},
];
export function IslandBoard({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  return <div className="island-board">
    <div className="sea-label sea-label-top">THE NORTHERN PASSAGE <span>~ ~ ~</span></div>
    <div className="compass" aria-label="Compass rose"><span>N</span><b>✦</b><span>S</span></div>
    <svg className="island-svg" viewBox="0 0 1000 680" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Illustrated fictional island with five clickable locations">
      <defs>
        <pattern id="waves" width="48" height="40" patternUnits="userSpaceOnUse"><path d="M2 21q9-5 18 0t18 0" fill="none" stroke="#a6c9bb" strokeOpacity=".13" strokeWidth="1.3" /></pattern>
        <pattern id="farmland" width="25" height="25" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 0v25M9 0v25M18 0v25" stroke="#d8bd76" strokeOpacity=".3" strokeWidth="2"/></pattern>
        <filter id="shadow"><feDropShadow dx="0" dy="13" stdDeviation="17" floodColor="#05151b" floodOpacity=".52"/></filter>
      </defs>
      <rect width="1000" height="680" fill="url(#waves)" />
      <path d="M115 314L171 249L260 223L313 154L417 122L493 146L579 130L679 184L726 254L812 287L850 375L819 448L754 486L708 561L596 583L500 555L413 595L320 559L256 511L181 491L130 425Z" fill="#d3c296" stroke="#e4d8b6" strokeWidth="18" filter="url(#shadow)"/>
      <path d="M137 314L179 264L267 237L323 170L416 143L495 163L578 148L663 199L711 266L793 302L831 376L803 438L742 470L693 540L595 564L500 537L412 573L329 540L266 492L194 471L150 420Z" fill="#78916d" stroke="#a9ad7c" strokeWidth="5" />
      <path d="M165 339L230 270L339 244L398 195L474 210L507 294L435 355L339 366L286 439L195 427Z" fill="#9aab72"/>
      <path d="M174 331L250 274L338 255L387 305L315 377L218 405Z" fill="url(#farmland)" />
      <path d="M478 209L568 178L650 216L701 289L662 359L560 332L510 287Z" fill="#617e65"/>
      <path d="M400 392L483 346L564 362L622 431L596 520L504 510L420 541L344 496Z" fill="#547c69"/>
      <path d="M308 330L380 363L433 342L503 371L553 430L641 428L722 414" stroke="#ddc995" strokeWidth="11" fill="none" strokeLinecap="round" strokeDasharray="3 19"/>
      <path d="M715 419l64 50 50-9m-50 9-18 49" stroke="#b2aa80" strokeWidth="13" fill="none" strokeLinecap="round"/>
      <path d="M759 475l18 20 39-19m-55 29 18 18 40-17" stroke="#d4b887" strokeWidth="8" fill="none"/>
      <path d="M593 283l31-44 27 44zM616 292l27-32 27 32z" fill="#b3b8a0" stroke="#e0dac0" strokeWidth="4"/>
      <g fill="#3e675b" opacity=".8">{Array.from({length:12},(_,i)=><path key={i} d={`M${449+i*11} ${452+(i%3)*14}l8-24 8 24h-5v10h-6v-10z`}/>)}</g>
      <g fill="#e4d3a9" stroke="#9e8b67" strokeWidth="3"><rect x="545" y="323" width="44" height="30" rx="2"/><path d="M536 324l31-26 31 26z" fill="#aa765c"/><rect x="593" y="338" width="32" height="29"/><path d="M588 340l20-18 22 18z" fill="#c09d74"/></g>
      <g fill="#d2b785" stroke="#8e795a" strokeWidth="3"><rect x="688" y="397" width="46" height="34"/><path d="M680 400l31-28 32 28z" fill="#ad795c"/><rect x="746" y="415" width="26" height="24"/></g>
    </svg>
    {locations.map(location => <button key={location.id} type="button" className={`map-pin ${selectedId === location.id ? 'active' : ''}`} style={{left:`${location.x}%`,top:`${location.y}%`}} onClick={()=>onSelect(location.id)} aria-label={`Inspect ${location.name}`} aria-pressed={selectedId === location.id}><span className="map-pin-icon">{location.icon}</span><span className="map-pin-label">{location.name}</span></button>)}
    <div className="map-corner-label">OLD WORLD <span>·</span> ISLAND 01</div>
    <div className="map-scale">0 <span/> 100 <span/> 200 NM</div>
  </div>;
}
