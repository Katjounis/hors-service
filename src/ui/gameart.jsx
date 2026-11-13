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

const ART = {
  oserait: () => (
    <>
      <path d="M92 46h116a18 18 0 0 1 18 18v52a18 18 0 0 1-18 18h-56l-22 22v-22h-38a18 18 0 0 1-18-18V64a18 18 0 0 1 18-18z" fill={CREME} />
      <text x="150" y="115" text-anchor="middle" font-size="64" fill={ENCRE} font-family="Bagel Fat One, sans-serif">?</text>
      {[60, 240, 46, 254].map((x, i) => <circle key={i} cx={x} cy={i < 2 ? 70 : 150} r={i < 2 ? 15 : 11} fill="#fff" fill-opacity={i < 2 ? .25 : .15} />)}
    </>
  ),
  96: () => (
    <>
      <Card x={110} y={108} r={-16} rank="9" suit="♠" red={false} />
      <Card x={150} y={100} r={0} rank="6" suit="♥" />
      <Card x={190} y={108} r={16} rank="R" suit="♦" />
      <text x="150" y="52" text-anchor="middle" font-size="40" fill={CREME} font-family="Bagel Fat One, sans-serif">96</text>
    </>
  ),
  pipoteur: () => (
    <>
      <path d="M80 82c22-16 48-14 70 0 22-14 48-16 70 0 0 34-18 58-44 58-14 0-20-10-26-18-6 8-12 18-26 18-26 0-44-24-44-58z" fill={CREME} />
      <ellipse cx="118" cy="98" rx="15" ry="10" fill={ENCRE} />
      <ellipse cx="182" cy="98" rx="15" ry="10" fill={ENCRE} />
      <text x="228" y="62" font-size="34" fill={CREME} font-family="Bagel Fat One, sans-serif">?</text>
      <text x="58" y="66" font-size="24" fill={CREME} fill-opacity=".6" font-family="Bagel Fat One, sans-serif">?</text>
    </>
  ),
  purple: () => (
    <>
      <circle cx="150" cy="100" r="62" fill="#B57CFF" fill-opacity=".35" />
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
      <path d="M150 34l92 132H58z" fill="#E7C877" fill-opacity=".25" />
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
      <circle cx="184" cy="82" r="26" fill="#fff" fill-opacity=".15" />
      <path d="M205 104l26 26" stroke={CREME} stroke-width="12" stroke-linecap="round" />
    </>
  ),
  degaine: () => (
    <>
      <path d="M162 30L104 112h40l-14 60 64-90h-42z" fill="#FFD23F" stroke={ENCRE} stroke-width="3" stroke-linejoin="round" />
      <circle cx="70" cy="100" r="20" fill={CREME} fill-opacity=".2" />
      <circle cx="232" cy="100" r="20" fill={CREME} fill-opacity=".2" />
    </>
  ),
  bombe: () => (
    <>
      <circle cx="140" cy="114" r="52" fill={ENCRE} />
      <circle cx="122" cy="96" r="12" fill="#fff" fill-opacity=".18" />
      <rect x="168" y="54" width="22" height="20" rx="4" fill="#5A544B" transform="rotate(32 179 64)" />
      <path d="M186 56c10-14 22-16 30-8" stroke="#C9A97A" stroke-width="5" fill="none" stroke-linecap="round" />
      <circle cx="218" cy="46" r="11" fill="#FFD23F" />
      <circle cx="218" cy="46" r="20" fill="#FF8A3D" fill-opacity=".35" />
    </>
  ),
  ware: () => (
    <>
      <rect x="78" y="62" width="144" height="80" rx="40" fill={CREME} />
      <rect x="104" y="94" width="30" height="10" rx="3" fill={ENCRE} />
      <rect x="114" y="84" width="10" height="30" rx="3" fill={ENCRE} />
      <circle cx="182" cy="92" r="8" fill={ROUGE} />
      <circle cx="198" cy="108" r="8" fill={NUIT} />
      <text x="62" y="52" font-size="22" fill={CREME} font-family="Bagel Fat One, sans-serif">3</text>
      <text x="226" y="50" font-size="26" fill={CREME} font-family="Bagel Fat One, sans-serif">2</text>
      <text x="236" y="168" font-size="30" fill={CREME} font-family="Bagel Fat One, sans-serif">1</text>
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
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color={`rgb(${color})`} />
          <stop offset="1" stop-color={`rgb(${color})`} stop-opacity=".25" />
        </linearGradient>
        <radialGradient id={`${gid}-l`} cx=".3" cy=".2" r=".9">
          <stop offset="0" stop-color="#fff" stop-opacity=".25" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="#1A1514" />
      <rect width="300" height="200" fill={`url(#${gid})`} />
      <rect width="300" height="200" fill={`url(#${gid}-l)`} />
      {draw ? draw() : null}
    </svg>
  );
}
