// Mur de l'appart (accueil, salon, jeux d'ambiance) : un vrai mur plutôt qu'un aplat.
// Papier peint à motif, corniche et cimaise, lambris en bas ; une suspension et deux appliques qui éclairent
// le mur ; une fenêtre sur la ville la nuit ; une galerie de cadres avec de vrais contenus (paysage au
// coucher de soleil, disque d'or, affiche de concert, polaroïds, photomaton) ; une étagère (livres,
// bouteilles, plante), une boule à facettes, une horloge et un caisson lumineux « BAR OUVERT ».
// Dessin 1200 × 900 recadré au centre : au téléphone on voit la bande du milieu (x 390 à 810),
// sur ordinateur toute la largeur. Animations légères (opacité) coupées par prefers-reduced-motion.

const OR = '#B8913E';
const OR_C = '#E2C27A';
const BOIS = '#3A2A20';

function Cadre({ x, y, w, h, b = 8, c = OR, mat = '#EFE6D2', m = 0, children }) {
  return (
    <g>
      <rect x={x} y={y + 4} width={w} height={h} fill="#000" fill-opacity=".35" />
      <rect x={x} y={y} width={w} height={h} fill={c} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="none" stroke={OR_C} stroke-opacity=".5" stroke-width="1.5" />
      {m ? <rect x={x + b} y={y + b} width={w - b * 2} height={h - b * 2} fill={mat} /> : null}
      <svg x={x + b + m} y={y + b + m} width={w - (b + m) * 2} height={h - (b + m) * 2} viewBox={`0 0 ${w - (b + m) * 2} ${h - (b + m) * 2}`} preserveAspectRatio="none" overflow="hidden">
        {children}
      </svg>
    </g>
  );
}

function Polaroid({ x, y, r = 0, children }) {
  return (
    <g transform={`rotate(${r} ${x + 30} ${y + 36})`}>
      <rect x={x} y={y + 3} width="60" height="72" fill="#000" fill-opacity=".3" />
      <rect x={x} y={y} width="60" height="72" fill="#F4EFE4" />
      <svg x={x + 5} y={y + 5} width="50" height="50" viewBox="0 0 50 50" overflow="hidden">{children}</svg>
      <rect x={x + 20} y={y - 6} width="20" height="10" fill="#D9D0BD" fill-opacity=".85" />
    </g>
  );
}

function Livres({ x, y }) {
  const L = [[10, 46, '#C8301E'], [8, 40, '#2E4A5A'], [12, 50, '#E7C877'], [9, 44, '#3E6B4A'], [7, 38, '#F2EADB'], [11, 48, '#5A2430'], [10, 42, '#6B4FA8']];
  let cx = x;
  return (
    <g>
      {L.map(([w, h, c], i) => { const r = <g key={i}><rect x={cx} y={y - h} width={w} height={h} fill={c} /><rect x={cx + 2} y={y - h + 6} width={w - 4} height="2" fill="#000" fill-opacity=".25" /></g>; cx += w + 1; return r; })}
      <rect x={cx + 2} y={y - 44} width="9" height="44" fill="#22201C" transform={`rotate(-14 ${cx + 6} ${y})`} />
    </g>
  );
}

export function MurAppart({ id }) {
  const p = `mu-${id}`;
  return (
    <svg class="mu" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${p}-pp`} width="40" height="56" patternUnits="userSpaceOnUse">
          <rect width="40" height="56" fill="#2A1D24" />
          <path d="M20 6 C26 14 26 22 20 28 C14 22 14 14 20 6 Z" fill="#33242C" />
          <path d="M0 34 C6 42 6 50 0 56 M40 34 C34 42 34 50 40 56" fill="#33242C" />
          <circle cx="20" cy="42" r="1.6" fill="#3B2A33" />
        </pattern>
        <radialGradient id={`${p}-halo`}>
          <stop offset="0" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.32 }} />
          <stop offset=".5" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.1 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${p}-chaud`}>
          <stop offset="0" stop-color="#FFC877" stop-opacity=".45" />
          <stop offset=".55" stop-color="#FFB060" stop-opacity=".1" />
          <stop offset="1" stop-color="#FFB060" stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFD9A0" stop-opacity=".22" />
          <stop offset="1" stop-color="#FFD9A0" stop-opacity="0" />
        </linearGradient>
        <linearGradient id={`${p}-ciel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3A2A5A" />
          <stop offset=".55" stop-color="#C8603A" />
          <stop offset="1" stop-color="#F2B25A" />
        </linearGradient>
      </defs>

      {/* papier peint, corniche, cimaise, lambris */}
      <rect width="1200" height="900" fill={`url(#${p}-pp)`} />
      <rect width="1200" height="26" fill="#1E1418" />
      <rect y="26" width="1200" height="8" fill="#3A2A2E" />
      <rect y="34" width="1200" height="3" fill="#4A3A3E" />
      <rect y="112" width="1200" height="4" fill="#3A2A2E" />
      <rect y="640" width="1200" height="260" fill="#241816" />
      <rect y="632" width="1200" height="12" fill="#4A3426" />
      <rect y="632" width="1200" height="3" fill="#6A4A34" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={20 + i * 120} y="664" width="96" height="200" fill="none" stroke="#33231E" stroke-width="4" />)}

      {/* halos des lumières sur le mur */}
      <ellipse class="mu-halo" cx="600" cy="300" rx="330" ry="300" fill={`url(#${p}-halo)`} />
      <ellipse cx="300" cy="250" rx="150" ry="170" fill={`url(#${p}-chaud)`} />
      <ellipse cx="900" cy="250" rx="150" ry="170" fill={`url(#${p}-chaud)`} />

      {/* ---------- fenêtre sur la ville (bande du téléphone, à gauche) */}
      <g>
        <rect x="404" y="150" width="150" height="230" fill="#0C0F1A" />
        <circle cx="520" cy="190" r="12" fill="#E9E1CF" fill-opacity=".9" />
        <circle cx="515" cy="186" r="12" fill="#0C0F1A" />
        {[[404, 250, 34], [440, 220, 28], [470, 270, 36], [508, 236, 30], [534, 290, 20]].map(([x, t, w], i) => (
          <g key={i}>
            <rect x={x} y={t} width={w} height={380 - t} fill={i % 2 ? '#161B2A' : '#1B2132'} />
            {Array.from({ length: Math.floor((380 - t - 10) / 14) }, (_, r) => Array.from({ length: Math.floor((w - 6) / 9) }, (_, c) => ((r * 7 + c * 5 + i * 3) % 4 === 0
              ? <rect key={`${r}-${c}`} class={(r + c + i) % 7 === 0 ? 'amb-win b1' : (r + c) % 9 === 0 ? 'amb-win b2' : null} x={x + 4 + c * 9} y={t + 8 + r * 14} width="5" height="7" fill="#F2C46A" fill-opacity=".75" /> : null)))}
          </g>
        ))}
        <rect x="398" y="144" width="162" height="242" fill="none" stroke="#3A2C24" stroke-width="10" />
        <path d="M479 150 V380 M404 262 H554" stroke="#3A2C24" stroke-width="6" />
        <rect x="390" y="384" width="178" height="12" fill="#4A3A2E" />
        <path d="M384 128 C394 210 376 300 390 410 L356 410 C364 300 350 200 360 128 Z" fill="#6A2A36" />
        <path d="M574 128 C564 210 582 300 568 410 L602 410 C594 300 608 200 598 128 Z" fill="#6A2A36" />
        <path d="M372 140 C378 220 366 320 374 404" stroke="#4A1A24" stroke-width="2" fill="none" />
        <path d="M586 140 C580 220 592 320 584 404" stroke="#4A1A24" stroke-width="2" fill="none" />
        <rect x="350" y="122" width="258" height="6" fill="#2A1E18" />
        {/* plante sur le rebord */}
        <rect x="500" y="364" width="26" height="22" fill="#9A5A3A" />
        {[[-14, 30], [-4, 40], [6, 36], [14, 26]].map(([dx, h], i) => <path key={i} d={`M513 366 q${dx / 2} ${-h / 2} ${dx} ${-h}`} stroke="#4E8A5A" stroke-width="6" stroke-linecap="round" fill="none" />)}
      </g>

      {/* ---------- caisson lumineux au-dessus de la fenêtre */}
      <g class="mu-enseigne">
        <rect x="414" y="58" width="130" height="40" fill="#2A1C14" />
        <rect x="418" y="62" width="122" height="32" fill="#FFB347" fill-opacity=".9" />
        <text x="479" y="85" text-anchor="middle" font-size="17" fill="#3A1A08" font-family="Dela Gothic One, sans-serif">BAR OUVERT</text>
      </g>
      <ellipse cx="479" cy="78" rx="110" ry="50" fill={`url(#${p}-chaud)`} />

      {/* ---------- suspension au centre, avec son cône de lumière */}
      <path class="mu-cone" d="M582 122 L618 122 L760 640 L440 640 Z" fill={`url(#${p}-cone)`} />
      <path d="M600 26 V84" stroke="#141010" stroke-width="2" />
      <path d="M572 122 Q574 92 600 84 Q626 92 628 122 Z" fill="#C8301E" />
      <path d="M572 122 H628" stroke="#8A2014" stroke-width="3" />
      <ellipse cx="600" cy="124" rx="10" ry="5" fill="#FFF1D0" />

      {/* ---------- galerie de cadres (bande du téléphone, à droite) */}
      {/* paysage au coucher de soleil */}
      <Cadre x={640} y={150} w={160} h={118} b={9} m={8}>
        <rect width="128" height="86" fill={`url(#${p}-ciel)`} />
        <circle cx="86" cy="54" r="12" fill="#FFE2A0" />
        <path d="M0 62 L24 44 L42 56 L66 36 L90 58 L110 46 L128 56 V86 H0 Z" fill="#5A3A5A" />
        <path d="M0 72 L30 60 L56 70 L84 58 L128 70 V86 H0 Z" fill="#3A2440" />
        <path d="M0 80 Q40 74 64 80 T128 78 V86 H0 Z" fill="#7AA0B8" fill-opacity=".6" />
        {[18, 30, 44, 100, 112].map((x, i) => <rect key={i} x={x} y={68 + (i % 2) * 2} width="2" height="2" fill="#FFD27A" />)}
      </Cadre>
      {/* disque d'or */}
      <Cadre x={644} y={290} w={92} h={112} b={6} c="#22201C" mat="#141210" m={4}>
        <rect width="72" height="92" fill="#141210" />
        <circle cx="36" cy="38" r="27" fill="#C9A24A" />
        {[22, 17, 12].map((r, i) => <circle key={i} cx="36" cy="38" r={r} fill="none" stroke="#A88230" stroke-width="1" />)}
        <circle cx="36" cy="38" r="8" fill="#C8301E" />
        <circle cx="36" cy="38" r="1.6" fill="#141210" />
        <path d="M20 22 Q30 14 44 16" stroke="#F4DFA0" stroke-width="2" fill="none" stroke-opacity=".7" />
        <rect x="10" y="74" width="52" height="5" fill="#C9A24A" />
        <rect x="18" y="83" width="36" height="3" fill="#C9A24A" fill-opacity=".6" />
      </Cadre>
      {/* affiche de concert */}
      <Cadre x={748} y={286} w={74} h={120} b={5} c="#2A2420" m={0}>
        <rect width="64" height="110" fill="#E7C877" />
        <rect y="0" width="64" height="24" fill="#22201C" />
        <text x="32" y="17" text-anchor="middle" font-size="12" fill="#E7C877" font-family="Dela Gothic One, sans-serif">LIVE</text>
        <circle cx="32" cy="54" r="20" fill="#C8301E" />
        <path d="M24 80 L28 50 Q32 44 36 50 L40 80 Z M30 44 a4 4 0 1 0 0.1 0" fill="#22201C" />
        <path d="M18 62 L46 52 L48 56 L20 66 Z" fill="#22201C" />
        <rect x="8" y="86" width="48" height="4" fill="#22201C" />
        <rect x="14" y="94" width="36" height="3" fill="#22201C" fill-opacity=".6" />
        <rect x="18" y="100" width="28" height="3" fill="#22201C" fill-opacity=".6" />
      </Cadre>
      {/* polaroïds scotchés */}
      <Polaroid x={640} y={432} r={-6}>
        <rect width="50" height="50" fill="#7EC4D8" />
        <rect y="32" width="50" height="18" fill="#E7C877" />
        <path d="M12 34 Q14 18 18 12" stroke="#5A3A22" stroke-width="2" fill="none" />
        <path d="M18 12 q-10 0 -12 6 M18 12 q10 -2 12 4 M18 12 q-4 -8 -10 -8" stroke="#3E6B4A" stroke-width="3" fill="none" />
        <circle cx="40" cy="10" r="5" fill="#FFE2A0" />
      </Polaroid>
      <Polaroid x={708} y={440} r={5}>
        <rect width="50" height="50" fill="#3A2440" />
        <circle cx="16" cy="20" r="6" fill="#141010" /><path d="M8 50 Q10 30 16 28 Q22 30 24 50 Z" fill="#141010" />
        <circle cx="34" cy="20" r="6" fill="#141010" /><path d="M26 50 Q28 30 34 28 Q40 30 42 50 Z" fill="#141010" />
        <path d="M21 26 L25 16 L29 26 Z" fill="#E7C877" />
        {[6, 44, 25].map((x, i) => <circle key={i} cx={x} cy={6 + i * 2} r="1.5" fill="#FFD27A" />)}
      </Polaroid>
      <Polaroid x={770} y={428} r={-3}>
        <rect width="50" height="50" fill="#D9C3A0" />
        <path d="M10 46 Q10 26 24 24 Q40 24 40 46 Z" fill="#3A3530" />
        <circle cx="25" cy="22" r="10" fill="#3A3530" />
        <path d="M17 15 L16 6 L22 12 Z M33 15 L34 6 L28 12 Z" fill="#3A3530" />
        <circle cx="21" cy="21" r="1.8" fill="#E7C877" /><circle cx="29" cy="21" r="1.8" fill="#E7C877" />
      </Polaroid>

      {/* ---------- horloge sous la fenêtre (il est tard) */}
      <g>
        <circle cx="478" cy="480" r="30" fill="#F2EADB" stroke="#2A2420" stroke-width="5" />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <rect key={i} x={478 + Math.sin(a) * 23 - 1} y={480 - Math.cos(a) * 23 - 2} width="2" height="4" fill="#2A2420" transform={`rotate(${i * 30} ${478 + Math.sin(a) * 23} ${480 - Math.cos(a) * 23})`} />; })}
        <path d="M478 480 L490 486" stroke="#22201C" stroke-width="3" stroke-linecap="round" />
        <path d="M478 480 L481 459" stroke="#22201C" stroke-width="2" stroke-linecap="round" />
        <circle cx="478" cy="480" r="2.5" fill="#C8301E" />
      </g>

      {/* ---------- côté gauche (ordinateur) : applique, étagère, boule à facettes, cible de fléchettes */}
      <g>
        <path d="M300 140 V96" stroke="#141010" stroke-width="2" />
        <circle cx="300" cy="96" r="5" fill="#141010" />
        <g class="mu-disco">
          <circle cx="300" cy="166" r="26" fill="#8A8F9A" />
          {Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => <rect key={`${r}${c}`} x={281 + c * 6.5} y={147 + r * 6.5} width="5.5" height="5.5" fill={(r + c) % 3 ? '#B8BEC8' : '#E6ECF4'} fill-opacity=".8" />))}
        </g>
        {[[250, 120], [352, 140], [230, 220], [370, 238], [276, 270], [340, 300]].map(([x, y], i) => <rect key={i} class={`mu-reflet r${i % 3}`} x={x} y={y} width="6" height="6" fill="#F4F8FF" transform={`rotate(45 ${x + 3} ${y + 3})`} />)}
        <rect x="214" y="330" width="170" height="8" fill="#5A3A22" />
        <path d="M228 338 L236 352 M370 338 L362 352" stroke="#3A2618" stroke-width="5" />
        <Livres x={222} y={330} />
        <path d="M318 330 V300 Q318 294 322 291 V280 H327 V291 Q331 294 331 300 V330 Z" fill="#1F3A2A" />
        <path d="M338 330 V306 Q338 300 342 298 V288 H346 V298 Q350 300 350 306 V330 Z" fill="#6A2A36" />
        <rect x="358" y="314" width="18" height="16" fill="#C8301E" />
        <rect x="360" y="318" width="14" height="5" fill="#F2EADB" />
        <rect x="214" y="430" width="170" height="8" fill="#5A3A22" />
        <path d="M232 430 L236 400 H264 L268 430 Z" fill="#8A4A2E" />
        {[[-26, 30], [-10, 38], [10, 36], [24, 28]].map(([dx, h], i) => <path key={i} d={`M250 402 q${dx / 2} ${-h / 2} ${dx} ${-h}`} stroke="#4E8A5A" stroke-width="5" stroke-linecap="round" fill="none" />)}
        <g>
          <circle cx="330" cy="400" r="28" fill="#1A1514" />
          {[24, 17, 10].map((r, i) => <circle key={i} cx="330" cy="400" r={r} fill="none" stroke={i % 2 ? '#C8301E' : '#E9E1CF'} stroke-width="5" />)}
          <circle cx="330" cy="400" r="3" fill="#C8301E" />
          <path d="M340 392 l12 -10" stroke="#22201C" stroke-width="2" /><path d="M352 382 l4 -2 l-2 4 z" fill="#C8301E" />
        </g>
        {/* applique */}
        <rect x="140" y="220" width="10" height="34" fill="#2A2420" />
        <path d="M128 200 H162 L156 222 H134 Z" fill="#E7C877" fill-opacity=".9" />
        <ellipse cx="145" cy="230" rx="90" ry="110" fill={`url(#${p}-chaud)`} />
      </g>

      {/* ---------- côté droit (ordinateur) : applique, miroir, guitare, affiche de film */}
      <g>
        <rect x="1050" y="220" width="10" height="34" fill="#2A2420" />
        <path d="M1038 200 H1072 L1066 222 H1044 Z" fill="#E7C877" fill-opacity=".9" />
        <ellipse cx="1055" cy="230" rx="90" ry="110" fill={`url(#${p}-chaud)`} />
        <circle cx="900" cy="200" r="50" fill={OR} />
        <circle cx="900" cy="200" r="42" fill="#4A5260" />
        <path d="M872 182 L900 160 M880 200 L918 168" stroke="#E9E1CF" stroke-opacity=".45" stroke-width="5" />
        <g transform="rotate(-14 920 420)">
          <path d="M912 300 H928 V380 H912 Z" fill="#5A3A22" />
          <path d="M908 290 H932 V306 H908 Z" fill="#2A1E18" />
          <path d="M920 372 C890 372 884 404 898 420 C884 436 892 470 920 470 C948 470 956 436 942 420 C956 404 950 372 920 372 Z" fill="#C8601E" />
          <circle cx="920" cy="414" r="9" fill="#2A1E18" />
          <rect x="908" y="446" width="24" height="5" fill="#2A1E18" />
          {[914, 918, 922, 926].map((x) => <path key={x} d={`M${x} 296 V448`} stroke="#F2EADB" stroke-opacity=".5" stroke-width=".8" />)}
        </g>
        <Cadre x={990} y={330} w={110} h={160} b={6} c="#1A1514" m={0}>
          <rect width="98" height="148" fill="#18203A" />
          <circle cx="66" cy="34" r="16" fill="#E9E1CF" />
          <path d="M0 110 L14 90 H22 V70 H34 V96 H44 V80 H58 V104 H70 V88 H84 V112 H98 V148 H0 Z" fill="#0C0F1A" />
          {[18, 26, 38, 52, 62, 76, 88].map((x, i) => <rect key={i} x={x} y={96 + (i % 3) * 6} width="3" height="4" fill="#F2C46A" />)}
          <text x="49" y="132" text-anchor="middle" font-size="15" fill="#E7C877" font-family="Dela Gothic One, sans-serif">LA NUIT</text>
          <rect x="22" y="138" width="54" height="3" fill="#E7C877" fill-opacity=".5" />
        </Cadre>
      </g>
    </svg>
  );
}
