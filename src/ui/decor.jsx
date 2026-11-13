// Décor de fond, une scène par type de jeu (choix de Samuel, 13/11) :
// • appart étudiant en bazar (accueil, salon, jeux d'ambiance) : posters scotchés, porte de cuisine éclairée avec
//   des silhouettes qui trinquent, canapé, table basse en vrac, canettes, chaussettes, enceinte, lampe ;
// • tapis de jeu (jeux de cartes) ; forêt de nuit (GlouGlou Garou) ; plateau télé (Quiz buzzer) ;
//   salle d'arcade (jeux réflexes) ; atelier (Dessine et devine).
// Animations légères (transform / opacity) : fenêtres qui s'allument, bougie et lampe, bulles et vapeur,
// silhouettes qui se balancent. Tout s'arrête avec prefers-reduced-motion.

const W = 800;
const H = 300;

export function sceneOf(key) {
  const k = String(key || '');
  if (k.startsWith('garou')) return 'foret';
  if (['96', 'purple', 'hippodrome', 'toutankhamon', 'trouve', 'coinche'].includes(k)) return 'tapis';
  if (k === 'buzzer') return 'plateau';
  if (['ware', 'degaine', 'bombe'].includes(k)) return 'arcade';
  if (k === 'dessin') return 'atelier';
  return 'appart';
}

// silhouette qui trinque (tête, corps, bras levé avec un verre) ; flip : tournée vers la gauche
function Perso({ x, y, s = 1, flip = false, glass = true, d = 0, color = '#0E0A0C' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g class="dc-sway" style={{ animationDelay: `${d}s` }}>
        <circle cx="0" cy="-58" r="11" fill={color} />
        <path d="M-15 -44 Q0 -50 15 -44 L19 0 H-19 Z" fill={color} />
        {glass ? <path d="M12 -40 L26 -62" stroke={color} stroke-width="7" stroke-linecap="round" /> : <path d="M12 -40 L20 -16" stroke={color} stroke-width="7" stroke-linecap="round" />}
        {glass ? <path d="M22 -74 h10 l-2 12 h-6 z" fill="#E7B04A" fill-opacity=".9" /> : null}
      </g>
    </g>
  );
}

// verre avec bulles qui montent
function Verre({ x, y, c = 'rgba(var(--d1), .55)', bulles = true, k = 0 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-9 -26 L-7 0 H7 L9 -26 Z" fill="rgba(255,255,255,.07)" stroke="rgba(255,246,230,.45)" stroke-width="1.2" />
      <path d="M-8.2 -15 L-6.6 -1 H6.6 L8.2 -15 Z" style={{ fill: c }} />
      {bulles ? [0, 1, 2].map((i) => <circle key={i} class="dc-bulle" cx={-4 + i * 4} cy="-3" r="1.2" fill="rgba(255,255,255,.75)" style={{ animationDelay: `${(i * 0.6 + k * 0.3).toFixed(1)}s` }} />) : null}
    </g>
  );
}

function Vapeur({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 1].map((i) => <path key={i} class="dc-fumee" d={`M${i * 6} 0 q-6 -8 0 -16 t0 -16`} stroke="rgba(242,234,219,.45)" stroke-width="2" fill="none" style={{ animationDelay: `${i * 1.2}s` }} />)}
    </g>
  );
}

function Bougie({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-5" y="-12" width="10" height="12" fill="rgba(242,234,219,.65)" />
      <circle class="dc-flamme" cx="0" cy="-20" r="16" fill="#FFB060" fill-opacity=".18" />
      <path class="dc-flamme" d="M0 -22 C3 -19 3 -16 0 -14 C-3 -16 -3 -19 0 -22 Z" fill="#FFE2A6" />
    </g>
  );
}

// ---------------------------------------------------------------- appart étudiant en bazar
function Appart() {
  return (
    <>
      {/* porte de cuisine éclairée, avec des silhouettes qui trinquent */}
      <rect x="170" y="36" width="112" height="196" fill="#3A2A1E" />
      <rect x="178" y="44" width="96" height="188" fill="#E9B866" fill-opacity=".85" />
      <rect x="178" y="44" width="96" height="188" style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".25" />
      <Perso x={200} y={198} s={1.2} d={0} />
      <Perso x={252} y={196} s={1.1} flip d={0.8} />
      <Perso x={226} y={204} s={1.25} glass={false} d={1.6} />
      {/* posters scotchés */}
      <g transform="rotate(-4 335 70)"><rect x="300" y="24" width="56" height="78" fill="#C8301E" /><circle cx="328" cy="56" r="15" fill="#FFD23F" /><rect x="308" y="80" width="40" height="5" fill="#F2EADB" /><rect x="314" y="89" width="28" height="4" fill="#F2EADB" fill-opacity=".7" /><rect x="318" y="18" width="20" height="10" fill="#D9D0BD" fill-opacity=".85" /></g>
      <g transform="rotate(3 525 64)"><rect x="490" y="22" width="76" height="84" fill="#2E4A5A" /><path d="M496 92 L520 56 L536 76 L548 62 L560 92 Z" fill="#6CC9A8" /><text x="528" y="44" text-anchor="middle" font-size="12" fill="#F2EADB" font-family="Dela Gothic One, sans-serif">FEST</text><rect x="516" y="16" width="22" height="10" fill="#D9D0BD" fill-opacity=".85" /></g>
      <g transform="rotate(-2 420 56)"><rect x="386" y="30" width="68" height="52" fill="#F2EADB" /><text x="420" y="62" text-anchor="middle" font-size="14" fill="#22201C" font-family="Dela Gothic One, sans-serif">BAR</text><rect x="408" y="24" width="22" height="10" fill="#D9D0BD" fill-opacity=".85" /></g>
      {/* parquet */}
      <rect x="0" y="230" width={W} height="70" fill="#2A1B12" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${238 + i * 14} H${W}`} stroke="#1E130C" stroke-width="1.5" />)}
      {/* pouf */}
      <ellipse cx="190" cy="236" rx="34" ry="18" fill="#C8301E" fill-opacity=".8" />
      <ellipse cx="190" cy="226" rx="28" ry="12" fill="#D9442E" fill-opacity=".8" />
      {/* canapé */}
      <path d="M232 172 Q232 150 254 150 H546 Q568 150 568 172 V230 H232 Z" fill="#3B2430" />
      <path d="M248 166 Q248 158 258 158 H396 V208 H248 Z" fill="#46293A" />
      <path d="M404 158 H542 Q552 158 552 166 V208 H404 Z" fill="#46293A" />
      <rect x="220" y="176" width="32" height="62" fill="#33202A" />
      <rect x="548" y="176" width="32" height="62" fill="#33202A" />
      {/* chaussettes et sweat qui traînent sur le canapé */}
      <path d="M470 172 q14 -8 26 2 l-4 10 q-12 -6 -20 0 z" fill="#E9E1CF" fill-opacity=".8" />
      <path d="M270 176 q26 -12 54 0 l-6 20 h-40 z" fill="#2E4A5A" fill-opacity=".9" />
      {/* enceinte avec membrane qui bat */}
      <rect x="600" y="160" width="44" height="72" fill="#1A1514" stroke="#3A3530" stroke-width="2" />
      <circle class="dc-pulse" cx="622" cy="208" r="13" fill="#2A2420" stroke="#4A453E" stroke-width="2" />
      <circle cx="622" cy="178" r="6" fill="#2A2420" stroke="#4A453E" stroke-width="2" />
      {/* lampe sur pied */}
      <defs>
        <radialGradient id="dc-halo">
          <stop offset="0" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.3 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse class="dc-lampe" cx="700" cy="140" rx="90" ry="110" fill="url(#dc-halo)" />
      <path d="M674 112 H726 L740 156 H660 Z" style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".6" />
      <path d="M700 156 V284" stroke="#2A2420" stroke-width="4" />
      <ellipse cx="700" cy="286" rx="20" ry="5" fill="#1A120C" />
      {/* table basse en bazar */}
      <rect x="262" y="230" width="276" height="12" fill="#5A3A22" />
      <rect x="262" y="230" width="276" height="3" fill="#7A5232" />
      <rect x="274" y="242" width="10" height="38" fill="#4A2E1A" />
      <rect x="516" y="242" width="10" height="38" fill="#4A2E1A" />
      <path d="M276 230 L280 220 H340 L336 230 Z" fill="#B88A55" />
      <path d="M286 220 L292 198 H344 L340 220 Z" fill="#C99A62" />
      <path d="M288 228 l16 -6 l9 6 z" fill="#E7B04A" fill-opacity=".85" />
      {/* canettes, dont une couchée */}
      <rect x="352" y="210" width="12" height="20" fill="#C8301E" />
      <rect x="352" y="210" width="12" height="3" fill="#E9E1CF" />
      <rect x="368" y="214" width="12" height="16" fill="#6CC9A8" />
      <path d="M384 222 h20 v8 h-20 z" fill="#5B8DEF" />
      <Verre x={422} y={230} k={0} />
      <Verre x={446} y={230} c="rgba(var(--d2), .55)" k={1} />
      <path d="M462 230 V198 Q462 192 466 189 V178 H471 V189 Q475 192 475 198 V230 Z" fill="#1F3A2A" />
      {/* mug fumant */}
      <rect x="486" y="214" width="16" height="16" fill="#F2EADB" fill-opacity=".85" />
      <path d="M502 218 h4 a4 4 0 0 1 0 8 h-4" fill="none" stroke="#F2EADB" stroke-opacity=".85" stroke-width="2" />
      <Vapeur x={490} y={210} />
      <Bougie x={526} y={230} />
      {/* chaussette par terre */}
      <path d="M140 270 q10 -10 22 -2 l18 2 v8 h-30 z" fill="#E9E1CF" fill-opacity=".7" />
    </>
  );
}

// ---------------------------------------------------------------- tapis de jeu (cartes)
function Tapis() {
  return (
    <>
      <Perso x={250} y={196} s={1.1} glass={false} d={0.3} />
      <Perso x={550} y={196} s={1.1} flip d={1.1} />
      <Perso x={400} y={192} s={1.15} glass={false} d={0.7} />
      <rect x="0" y="230" width={W} height="70" fill="#2A1B12" />
      <path d="M120 196 H680 L720 250 H80 Z" fill="#1F5A3E" />
      <path d="M120 196 H680 L720 250 H80 Z" fill="none" stroke="#5A3A22" stroke-width="10" stroke-linejoin="round" />
      <path d="M86 254 H714 V266 H86 Z" fill="#4A2E1A" />
      <ellipse cx="400" cy="222" rx="200" ry="20" fill="none" stroke="#E7C877" stroke-opacity=".35" stroke-width="2" />
      {[[330, 214, -12], [360, 210, 4], [392, 216, -4], [430, 212, 10], [470, 218, 16]].map(([x, y, r], i) => (
        <rect key={i} x={x} y={y} width="22" height="14" fill="#F2EADB" stroke="#22201C" stroke-width="1" transform={`rotate(${r} ${x + 11} ${y + 7})`} />
      ))}
      {[[200, 0], [214, 1], [600, 2], [586, 3]].map(([x, k]) => (
        <g key={x}>{[0, 1, 2, 3].map((j) => <ellipse key={j} cx={x} cy={236 - j * 4} rx="9" ry="3.4" fill={['#C8301E', '#F2EADB', '#2E4A5A', '#FFD23F'][(j + k) % 4]} stroke="#22201C" stroke-width=".6" />)}</g>
      ))}
      <Verre x={250} y={238} k={0} />
      <Verre x={556} y={238} c="rgba(var(--d2), .55)" k={2} />
      <Bougie x={640} y={240} />
    </>
  );
}
function LampeSuspendue() {
  return (
    <svg class="dc-top dc-suspendue" viewBox="0 0 300 260" aria-hidden="true" focusable="false">
      <path d="M150 0 V70" stroke="#3A3530" stroke-width="3" />
      <defs>
        <radialGradient id="dc-halo2" cy=".3">
          <stop offset="0" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse class="dc-lampe" cx="150" cy="160" rx="150" ry="100" fill="url(#dc-halo2)" />
      <path d="M110 70 H190 L222 116 H78 Z" fill="#1F3A2A" />
      <path d="M78 116 H222" stroke="#E7C877" stroke-width="3" />
      <ellipse cx="150" cy="118" rx="22" ry="6" fill="#FFE2A6" fill-opacity=".9" />
    </svg>
  );
}

// ---------------------------------------------------------------- forêt de nuit (GlouGlou Garou)
function Foret() {
  return (
    <>
      {[30, 90, 150, 650, 710, 770].map((x, i) => <path key={x} d={`M${x} ${60 + (i % 3) * 14} L${x + 34} 240 H${x - 34} Z`} fill={i % 2 ? '#0D1A14' : '#0B1610'} />)}
      {/* village au loin */}
      {[[230, 0], [300, 1], [500, 2], [560, 1]].map(([x, k]) => (
        <g key={x}>
          <rect x={x} y="176" width="46" height="40" fill="#1A1F2C" />
          <path d={`M${x - 6} 178 L${x + 23} 154 L${x + 52} 178 Z`} fill="#141824" />
          <rect class={k === 1 ? 'amb-win b1' : k === 2 ? 'amb-win b2' : null} x={x + 16} y="190" width="10" height="12" fill="#F2C46A" fill-opacity=".8" />
        </g>
      ))}
      <rect x="0" y="230" width={W} height="70" fill="#0E1410" />
      {/* feu de camp */}
      <g transform="translate(400 250)">
        <path d="M-30 6 L30 -4 M-30 -4 L30 6" stroke="#4A2E1A" stroke-width="8" stroke-linecap="round" />
        <ellipse class="dc-flamme" cx="0" cy="-20" rx="60" ry="40" fill="#FF8A3D" fill-opacity=".14" />
        <path class="dc-flamme" d="M0 -48 C14 -30 18 -16 0 -2 C-18 -16 -14 -30 0 -48 Z" fill="#E5502F" />
        <path class="dc-flamme" d="M0 -32 C8 -22 9 -12 0 -4 C-9 -12 -8 -22 0 -32 Z" fill="#FFD23F" />
        <Vapeur x={-4} y={-56} />
      </g>
      <Perso x={330} y={250} s={1} d={0.2} color="#07090E" />
      <Perso x={470} y={250} s={1} flip d={1.4} color="#07090E" />
    </>
  );
}

// ---------------------------------------------------------------- plateau télé (Quiz buzzer)
function Plateau() {
  return (
    <>
      <rect x="150" y="30" width="500" height="150" fill="#1A1430" stroke="#3A3060" stroke-width="4" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} class={i % 3 === 0 ? 'amb-win b1' : i % 3 === 1 ? 'amb-win b2' : null} x={170 + i * 47} y="50" width="36" height="20" style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".5" />)}
      <text x="400" y="130" text-anchor="middle" font-size="40" fill="#FFD23F" fill-opacity=".85" font-family="Dela Gothic One, sans-serif">QUIZ</text>
      <rect x="0" y="230" width={W} height="70" fill="#141018" />
      {[200, 400, 600].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 50} 180 H${x + 50} L${x + 40} 236 H${x - 40} Z`} fill="#2E2A40" stroke="#4A4560" stroke-width="2" />
          <ellipse cx={x} cy="178" rx="16" ry="6" fill="#E5502F" />
          <Perso x={x} y={180} s={0.9} glass={i !== 1} d={i * 0.5} />
        </g>
      ))}
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={40 + i * 66} cy="290" r="18" fill="#08060A" />)}
    </>
  );
}
function Projecteurs() {
  return (
    <svg class="dc-top dc-projos" viewBox="0 0 800 220" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="800" height="14" fill="#2A2630" />
      {[120, 300, 500, 680].map((x, i) => (
        <g key={x}>
          <path class="dc-lampe" d={`M${x - 10} 22 L${x - 90 + i * 30} 220 H${x + 90 - i * 10} L${x + 10} 22 Z`} style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".08" />
          <rect x={x - 12} y="12" width="24" height="14" fill="#3A3540" />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- salle d'arcade
function Arcade() {
  return (
    <>
      <rect x="0" y="230" width={W} height="70" fill="#1E1A24" />
      {Array.from({ length: 32 }, (_, i) => <rect key={i} x={(i % 16) * 50} y={244 + Math.floor(i / 16) * 18} width="25" height="18" fill={(i + Math.floor(i / 16)) % 2 ? '#2A2430' : '#E9E1CF'} fill-opacity=".25" />)}
      {[160, 300, 500, 640].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 46} 236 V96 L${x - 36} 70 H${x + 36} L${x + 46} 96 V236 Z`} fill={['#3A1F3A', '#1F2E3A', '#3A2A1F', '#1F3A2A'][i]} stroke="#0E0C10" stroke-width="3" />
          <rect class={i % 2 ? 'amb-win b1' : 'amb-win b2'} x={x - 32} y="100" width="64" height="48" style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".55" />
          <rect x={x - 36} y="76" width="72" height="16" fill="#FFD23F" fill-opacity=".7" />
          <path d={`M${x - 40} 166 H${x + 40} L${x + 46} 182 H${x - 46} Z`} fill="#1A1514" />
          <circle cx={x - 18} cy="172" r="4" fill="#E5502F" />
          <circle cx={x + 10} cy="172" r="4" fill="#6CC9A8" />
          <circle cx={x + 22} cy="172" r="4" fill="#5B8DEF" />
        </g>
      ))}
      <Perso x={230} y={250} s={1.05} glass={false} d={0.4} />
      <Perso x={570} y={250} s={1.05} flip d={1.2} />
    </>
  );
}

// ---------------------------------------------------------------- atelier (Dessine et devine)
function Atelier() {
  return (
    <>
      <rect x="0" y="230" width={W} height="70" fill="#2A1B12" />
      <path d="M400 236 L360 120 M400 236 L440 120 M400 236 V150" stroke="#7A5232" stroke-width="6" />
      <rect x="330" y="60" width="140" height="110" fill="#F2EADB" stroke="#5A3A22" stroke-width="6" />
      <path d="M350 140 Q370 90 400 120 T452 92" stroke="#22201C" stroke-width="4" fill="none" stroke-linecap="round" />
      <circle cx="440" cy="84" r="10" fill="none" stroke="#C8301E" stroke-width="3" />
      {[[220, '#C8301E'], [250, '#FFD23F'], [280, '#5B8DEF']].map(([x, c]) => (
        <g key={x}><rect x={x - 10} y="214" width="20" height="20" fill="#E9E1CF" fill-opacity=".8" /><rect x={x - 10} y="214" width="20" height="6" fill={c} /></g>
      ))}
      <Perso x={560} y={240} s={1.05} glass={false} d={0.3} />
      <Perso x={620} y={240} s={1} flip d={1} />
      <Perso x={180} y={240} s={1} d={1.6} />
      <Verre x={500} y={236} k={1} />
      <Bougie x={300} y={236} />
    </>
  );
}

const SCENES = { appart: Appart, tapis: Tapis, foret: Foret, plateau: Plateau, arcade: Arcade, atelier: Atelier };

export function DecorBas({ scene }) {
  const C = SCENES[scene] || Appart;
  return (
    <svg class={`amb-salon dc-${scene}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <C />
    </svg>
  );
}

export function DecorHaut({ scene, Fenetre, Cadres, id }) {
  if (scene === 'appart') return <><Fenetre id={id} /><Cadres /></>;
  if (scene === 'tapis') return <LampeSuspendue />;
  if (scene === 'plateau') return <Projecteurs />;
  if (scene === 'foret') {
    return (
      <svg class="dc-top dc-lune" viewBox="0 0 300 200" aria-hidden="true" focusable="false">
        <circle cx="210" cy="80" r="46" fill="#E9E1CF" />
        <circle cx="196" cy="70" r="8" fill="#D6CCB4" />
        <circle cx="226" cy="98" r="6" fill="#D6CCB4" />
        {[[30, 30], [80, 70], [120, 20], [150, 120], [270, 160], [60, 150]].map(([x, y], i) => <rect key={i} class={i % 2 ? 'amb-win b1' : null} x={x} y={y} width="3" height="3" fill="#E9E1CF" />)}
      </svg>
    );
  }
  if (scene === 'arcade') {
    return (
      <svg class="dc-top dc-neon" viewBox="0 0 300 120" aria-hidden="true" focusable="false">
        <rect x="20" y="20" width="260" height="70" fill="none" stroke="#FFD23F" stroke-opacity=".5" stroke-width="4" />
        <text x="150" y="68" text-anchor="middle" font-size="34" fill="#FFD23F" fill-opacity=".6" font-family="Dela Gothic One, sans-serif">ARCADE</text>
      </svg>
    );
  }
  return <Cadres />;
}
