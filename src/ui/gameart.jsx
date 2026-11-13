// Illustration de chaque jeu (la « photo » de la tuile) : SVG dessiné à la main, aucun fichier image.
// Fond dans la couleur du jeu, un motif simple et lisible même en petit.
const CREME = '#F2EADB';
const ENCRE = '#22201C';
const ROUGE = '#D23A26';
const NUIT = '#1D2440';

function Card({ x, y, r = 0, s = 1, rank = 'A', suit = '♥', red = true, back = false }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x="-26" y="-36" width="52" height="72" rx="6" fill={back ? '#C9A97A' : CREME} stroke={ENCRE} stroke-opacity=".5" stroke-width="1.5" />
      {back ? (
        <rect x="-21" y="-31" width="42" height="62" rx="3" fill="none" stroke={ENCRE} stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="3 3" />
      ) : (
        <>
          <text x="-19" y="-18" font-size="14" font-weight="700" fill={red ? ROUGE : NUIT} font-family="Familjen Grotesk, sans-serif">{rank}</text>
          <text x="0" y="12" font-size="30" text-anchor="middle" fill={red ? ROUGE : NUIT}>{suit}</text>
        </>
      )}
    </g>
  );
}

// décor derrière chaque affiche : tapis de jeu, mur de bar, scène, piste… (jamais un aplat de couleur)
const SCENE = {
  oserait: 'brique', 96: 'tapis', pipoteur: 'scene', purple: 'tapis', hippodrome: 'piste', toutankhamon: 'sable',
  autres: 'brique', trouve: 'tapis', degaine: 'saloon', bombe: 'scene', ware: 'damier', jamais: 'brique',
};
function Scene({ kind, id }) {
  const p = `sc-${id}`;
  if (kind === 'tapis') {
    return (
      <>
        <defs>
          <pattern id={p} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="14" height="14" fill="#1F5A3E" />
            <rect width="1" height="14" fill="#2A6B4B" />
          </pattern>
        </defs>
        <rect width="300" height="200" fill={`url(#${p})`} />
        <ellipse cx="150" cy="104" rx="128" ry="70" fill="none" stroke="#E7C877" stroke-opacity=".35" stroke-width="2" />
        <rect y="176" width="300" height="24" fill="#5A3A22" />
        <rect y="176" width="300" height="3" fill="#7A5232" />
      </>
    );
  }
  if (kind === 'brique') {
    return (
      <>
        <defs>
          <pattern id={p} width="40" height="20" patternUnits="userSpaceOnUse">
            <rect width="40" height="20" fill="#4A2A22" />
            <rect x="1" y="1" width="38" height="8" fill="#6B3A2C" />
            <rect x="-19" y="11" width="38" height="8" fill="#5E3327" />
            <rect x="21" y="11" width="38" height="8" fill="#5E3327" />
          </pattern>
        </defs>
        <rect width="300" height="200" fill={`url(#${p})`} />
        <rect y="160" width="300" height="40" fill="#2A1A14" />
        <rect y="160" width="300" height="4" fill="#8A5A36" />
      </>
    );
  }
  if (kind === 'scene') {
    return (
      <>
        <rect width="300" height="200" fill="#2A1416" />
        <path d="M0 0h56c-4 60 6 130 -10 200H0z" fill="#8E1F25" />
        <path d="M300 0h-56c4 60 -6 130 10 200h46z" fill="#8E1F25" />
        {[14, 30, 46].map((x) => <path key={x} d={`M${x} 0v200`} stroke="#6E161B" stroke-width="3" />)}
        {[254, 270, 286].map((x) => <path key={x} d={`M${x} 0v200`} stroke="#6E161B" stroke-width="3" />)}
        <rect width="300" height="16" fill="#6E161B" />
        <rect y="168" width="300" height="32" fill="#4A2E1E" />
        <rect y="168" width="300" height="3" fill="#7A5232" />
      </>
    );
  }
  if (kind === 'piste') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} y={i * 25} width="300" height="25" fill={i % 2 ? '#3E6B2E' : '#4A7A36'} />)}
        <rect y="0" width="300" height="20" fill="#E9E1CF" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <rect key={i} x={i * 26} y="4" width="3" height="16" fill="#8A7E68" />)}
      </>
    );
  }
  if (kind === 'sable') {
    return (
      <>
        <rect width="300" height="200" fill="#D9A55A" />
        <rect width="300" height="120" fill="#E8B96A" />
        <circle cx="244" cy="40" r="18" fill="#F6DE9C" />
        <path d="M0 140 Q 80 118 160 138 T 300 132 V200 H0z" fill="#C88F48" />
      </>
    );
  }
  if (kind === 'saloon') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <rect key={i} x={i * 30} width="30" height="200" fill={i % 2 ? '#6B4528' : '#5E3C22'} />)}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <rect key={i} x={i * 30} width="1.5" height="200" fill="#3E2614" />)}
        <rect y="170" width="300" height="30" fill="#3E2614" />
      </>
    );
  }
  if (kind === 'nuit') {
    return (
      <>
        <rect width="300" height="200" fill="#121828" />
        <circle cx="226" cy="54" r="30" fill="#E9E1CF" />
        <circle cx="216" cy="46" r="5" fill="#CFC5B0" />
        {[[20, 8], [60, 30], [120, 14], [150, 40], [270, 20], [90, 50]].map(([x, y], i) => <rect key={i} x={x} y={y} width="2" height="2" fill="#E9E1CF" />)}
        {[0, 34, 68, 230, 262].map((x, i) => <path key={i} d={`M${x + 18} 70 L${x + 40} 200 H${x - 4} Z`} fill="#0B1A14" />)}
        <rect y="176" width="300" height="24" fill="#0E1410" />
      </>
    );
  }
  // damier (arcade)
  return (
    <>
      <rect width="300" height="200" fill="#1E1A24" />
      {Array.from({ length: 60 }, (_, i) => <rect key={i} x={(i % 10) * 30} y={140 + Math.floor(i / 10) * 10} width="15" height="10" fill={(i + Math.floor(i / 10)) % 2 ? '#E9E1CF' : '#2A2430'} />)}
      {[30, 90, 150, 210, 270].map((x) => <rect key={x} x={x - 6} y="20" width="12" height="12" fill="#FFD23F" fill-opacity=".5" />)}
    </>
  );
}

const ART = {
  dessin: () => (
    <>
      <path d="M150 168 L120 196 M150 168 L180 196" stroke="#5A3A22" stroke-width="5" />
      <rect x="86" y="34" width="128" height="120" fill="#F2EADB" stroke="#5A3A22" stroke-width="6" />
      <path d="M104 132 Q124 70 150 104 T196 70" stroke="#22201C" stroke-width="5" fill="none" stroke-linecap="round" />
      <circle cx="176" cy="60" r="10" fill="none" stroke="#C8301E" stroke-width="4" />
      <path d="M214 120 l26 -40 l10 6 l-26 40 z" fill="#FFD23F" stroke="#22201C" stroke-width="2" />
    </>
  ),
  buzzer: () => (
    <>
      <rect x="96" y="136" width="108" height="30" fill="#22201C" />
      <ellipse cx="150" cy="136" rx="54" ry="14" fill="#3A3530" />
      <path d="M108 136 Q108 92 150 92 Q192 92 192 136 Z" fill="#E5502F" />
      <ellipse cx="136" cy="108" rx="12" ry="6" fill="#FF9A80" />
      <text x="150" y="60" text-anchor="middle" font-size="26" fill="#FFD23F" font-family="Dela Gothic One, sans-serif">BUZZ !</text>
    </>
  ),
  coinche: () => (
    <>
      <Card x={96} y={104} r={-22} rank="V" suit="♥" />
      <Card x={130} y={96} r={-8} rank="9" suit="♥" />
      <Card x={164} y={96} r={8} rank="A" suit="♠" red={false} />
      <Card x={198} y={104} r={22} rank="10" suit="♣" red={false} />
      <rect x="112" y="150" width="76" height="22" fill="#FFD23F" stroke="#22201C" stroke-width="2" transform="rotate(-6 150 161)" />
      <text x="150" y="167" text-anchor="middle" font-size="15" fill="#22201C" font-family="Dela Gothic One, sans-serif" transform="rotate(-6 150 161)">COINCHE</text>
    </>
  ),
  garou: () => (
    <>
      <path d="M96 168 L104 92 L84 52 L116 74 L150 64 L184 74 L216 52 L196 92 L204 168 Z" fill="#4A4F5A" />
      <path d="M118 104 l14 6 l-14 4 z M182 104 l-14 6 l14 4 z" fill="#FFD23F" />
      <path d="M132 140 h36 l-6 12 h-24 z" fill="#22201C" />
      <path d="M136 140 l4 6 l4 -6 M156 140 l4 6 l4 -6" fill="#F2EADB" />
      <rect x="208" y="120" width="34" height="46" fill="#E7B04A" stroke="#22201C" stroke-width="2" />
      <path d="M242 128 h8 a8 8 0 0 1 0 22 h-8" fill="none" stroke="#22201C" stroke-width="3" />
      <rect x="206" y="112" width="38" height="12" fill="#F2EADB" />
    </>
  ),
  oserait: () => (
    <>
      <path d="M92 46h116a18 18 0 0 1 18 18v52a18 18 0 0 1-18 18h-56l-22 22v-22h-38a18 18 0 0 1-18-18V64a18 18 0 0 1 18-18z" fill={CREME} />
      <text x="150" y="115" text-anchor="middle" font-size="64" fill={ENCRE} font-family="Dela Gothic One, sans-serif">?</text>
    </>
  ),
  96: () => (
    <>
      <Card x={110} y={108} r={-16} rank="9" suit="♠" red={false} />
      <Card x={150} y={100} r={0} rank="6" suit="♥" />
      <Card x={190} y={108} r={16} rank="R" suit="♦" />
      <text x="150" y="52" text-anchor="middle" font-size="40" fill={CREME} font-family="Dela Gothic One, sans-serif">96</text>
    </>
  ),
  pipoteur: () => (
    <>
      <path d="M80 82c22-16 48-14 70 0 22-14 48-16 70 0 0 34-18 58-44 58-14 0-20-10-26-18-6 8-12 18-26 18-26 0-44-24-44-58z" fill={CREME} />
      <ellipse cx="118" cy="98" rx="15" ry="10" fill={ENCRE} />
      <ellipse cx="182" cy="98" rx="15" ry="10" fill={ENCRE} />
      <text x="228" y="62" font-size="34" fill={CREME} font-family="Dela Gothic One, sans-serif">?</text>
      <text x="58" y="66" font-size="24" fill={CREME} fill-opacity=".6" font-family="Dela Gothic One, sans-serif">?</text>
    </>
  ),
  purple: () => (
    <>
      <Card x={128} y={102} r={-12} rank="A" suit="♥" s={1.15} />
      <Card x={172} y={98} r={10} rank="A" suit="♠" red={false} s={1.15} />
    </>
  ),
  hippodrome: () => (
    <>
      {[56, 92, 128, 164].map((y, i) => <line key={y} x1="30" x2="250" y1={y} y2={y} stroke={CREME} stroke-opacity=".25" stroke-width="2" stroke-dasharray="6 6" />)}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={254} y={40 + i * 17} width="12" height="17" fill={i % 2 ? CREME : ENCRE} />)}
      {[[200, '♥', true], [150, '♠', false], [118, '♦', true], [84, '♣', false]].map(([x, s, red], i) => (
        <Card key={i} x={x} y={56 + i * 36} s={.42} rank="A" suit={s} red={red} />
      ))}
    </>
  ),
  toutankhamon: () => (
    <>
      <path d="M150 34l92 132H58z" fill="#B98A44" />
      <path d="M150 34l92 132h-40z" fill="#9C7234" />
      {[[150, 62], [128, 104], [172, 104], [106, 146], [150, 146], [194, 146]].map(([x, y], i) => <Card key={i} x={x} y={y} s={.5} back />)}
    </>
  ),
  autres: () => (
    <>
      <rect x="54" y="44" width="124" height="54" rx="16" fill={CREME} />
      <rect x="122" y="108" width="124" height="54" rx="16" fill="#fff" fill-opacity=".25" />
      {[80, 100, 120].map((x) => <circle key={x} cx={x} cy="71" r="6" fill={ENCRE} />)}
      <rect x="140" y="126" width="88" height="8" rx="4" fill={CREME} fill-opacity=".8" />
      <rect x="140" y="140" width="56" height="8" rx="4" fill={CREME} fill-opacity=".6" />
    </>
  ),
  trouve: () => (
    <>
      <Card x={130} y={104} back s={1.2} />
      <circle cx="184" cy="82" r="30" fill="none" stroke={CREME} stroke-width="9" />
      <path d="M205 104l26 26" stroke={CREME} stroke-width="12" stroke-linecap="round" />
    </>
  ),
  degaine: () => (
    <>
      <path d="M162 30L104 112h40l-14 60 64-90h-42z" fill="#FFD23F" stroke={ENCRE} stroke-width="3" stroke-linejoin="round" />
    </>
  ),
  bombe: () => (
    <>
      <circle cx="140" cy="114" r="52" fill={ENCRE} />
      <circle cx="122" cy="96" r="10" fill="#4A453E" />
      <rect x="168" y="54" width="22" height="20" rx="4" fill="#5A544B" transform="rotate(32 179 64)" />
      <path d="M186 56c10-14 22-16 30-8" stroke="#C9A97A" stroke-width="5" fill="none" stroke-linecap="round" />
      <circle cx="218" cy="46" r="11" fill="#FFD23F" />
    </>
  ),
  ware: () => (
    <>
      <rect x="78" y="62" width="144" height="80" rx="40" fill={CREME} />
      <rect x="104" y="94" width="30" height="10" rx="3" fill={ENCRE} />
      <rect x="114" y="84" width="10" height="30" rx="3" fill={ENCRE} />
      <circle cx="182" cy="92" r="8" fill={ROUGE} />
      <circle cx="198" cy="108" r="8" fill={NUIT} />
      <text x="62" y="52" font-size="22" fill={CREME} font-family="Dela Gothic One, sans-serif">3</text>
      <text x="226" y="50" font-size="26" fill={CREME} font-family="Dela Gothic One, sans-serif">2</text>
      <text x="236" y="168" font-size="30" fill={CREME} font-family="Dela Gothic One, sans-serif">1</text>
    </>
  ),
  jamais: () => (
    <>
      <path d="M128 48h44l-6 104h-32z" fill={CREME} fill-opacity=".9" />
      <path d="M131 92h38l-3 60h-32z" fill="#E0325E" fill-opacity=".75" />
      <circle cx="150" cy="100" r="66" fill="none" stroke={CREME} stroke-width="10" />
      <path d="M104 54l92 92" stroke={CREME} stroke-width="10" stroke-linecap="round" />
    </>
  ),
};

export function GameArt({ id, color = '255, 210, 63' }) {
  const draw = ART[id];
  const gid = `ga-${id}`;
  return (
    <svg class="game-art" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Scene kind={SCENE[id] || 'brique'} id={gid} />
      <rect y="196" width="300" height="4" fill={`rgb(${color})`} />
      {draw ? draw() : null}
    </svg>
  );
}
