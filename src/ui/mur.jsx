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


// boule à facettes : des rangées de facettes calées sur la sphère (plus étroites vers les pôles), ombrée à droite
function Disco({ cx, cy, r, p }) {
  const rows = [];
  const step = 6.4;
  for (let y = -r + step / 2; y < r; y += step) {
    const w = Math.sqrt(Math.max(0, r * r - y * y));
    const n = Math.max(2, Math.round((2 * w) / step));
    const fw = (2 * w) / n;
    for (let i = 0; i < n; i++) {
      const x = cx - w + i * fw;
      const lum = 0.5 + 0.5 * (-(x - cx) / r * 0.6 - y / r * 0.5);
      const v = Math.round(110 + lum * 120 + ((i * 7 + Math.round(y)) % 3) * 12);
      rows.push(<rect key={`${y}-${i}`} x={x + 0.5} y={cy + y - step / 2 + 0.5} width={fw - 1} height={step - 1} fill={`rgb(${v}, ${v + 4}, ${v + 12})`} />);
    }
  }
  return (
    <g>
      <defs>
        <clipPath id={`${p}-dc`}><circle cx={cx} cy={cy} r={r} /></clipPath>
        <radialGradient id={`${p}-dsh`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stop-color="#fff" stop-opacity=".25" />
          <stop offset=".6" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity=".45" />
        </radialGradient>
      </defs>
      <path d={`M${cx} ${cy - r - 50} V${cy - r}`} stroke="#141010" stroke-width="2" />
      <rect x={cx - 4} y={cy - r - 4} width="8" height="6" fill="#4A4A50" />
      <circle cx={cx} cy={cy} r={r} fill="#3A3E46" />
      <g clip-path={`url(#${p}-dc)`}>{rows}</g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${p}-dsh)`} />
      <path class="mu-reflet r0" d={`M${cx - 12} ${cy - 14} l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 z`} fill="#FFFFFF" />
    </g>
  );
}

// applique murale : platine, bras, abat-jour, ampoule et lumière sur le mur
function Applique({ x, y, p }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 20} rx="95" ry="120" fill={`url(#${p}-chaud)`} />
      <rect x={x - 5} y={y + 14} width="10" height="18" rx="2" fill="#4A3E34" />
      <path d={`M${x} ${y + 20} Q${x + 2} ${y + 6} ${x} ${y - 2}`} stroke="#2A2420" stroke-width="4" fill="none" />
      <ellipse cx={x} cy={y + 4} rx="7" ry="4" fill="#FFE7B0" />
      <path d={`M${x - 20} ${y - 22} H${x + 20} L${x + 15} ${y + 2} H${x - 15} Z`} fill="#E7C877" />
      <path d={`M${x - 20} ${y - 22} H${x + 20}`} stroke="#C9A24A" stroke-width="2" />
      <path d={`M${x - 15} ${y + 2} H${x + 15}`} stroke="#FFF1D0" stroke-width="2" stroke-opacity=".8" />
    </g>
  );
}

// guitare folk accrochée au mur, un peu penchée
function Guitare({ x, y, r = -16 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M0 -168 V-162" stroke="#141010" stroke-width="2" />
      <path d="M-9 -160 H9 L7 -136 H-7 Z" fill="#2A1E18" />
      {[-150, -143].map((yy) => <g key={yy}><circle cx="-11" cy={yy} r="2.5" fill="#C9A24A" /><circle cx="11" cy={yy} r="2.5" fill="#C9A24A" /></g>)}
      <rect x="-5" y="-136" width="10" height="112" fill="#5A3A22" />
      {[-120, -104, -88, -72, -56, -40].map((yy) => <path key={yy} d={`M-5 ${yy} H5`} stroke="#C9A24A" stroke-width="1" />)}
      <circle cx="0" cy="0" r="26" fill="#C8702E" />
      <circle cx="0" cy="40" r="34" fill="#C8702E" />
      <rect x="-22" y="0" width="44" height="40" fill="#C8702E" />
      <circle cx="0" cy="12" r="9" fill="#2A1E18" />
      <circle cx="0" cy="12" r="11" fill="none" stroke="#E7C877" stroke-width="1.5" />
      <rect x="-12" y="48" width="24" height="5" fill="#2A1E18" />
      {[-3, -1, 1, 3].map((dx) => <path key={dx} d={`M${dx} -150 V50`} stroke="#F2EADB" stroke-opacity=".7" stroke-width=".7" />)}
    </g>
  );
}

// photomaton : bande de trois photos
function Photomaton({ x, y, r = 0 }) {
  return (
    <g transform={`rotate(${r} ${x + 22} ${y + 50})`}>
      <rect x={x} y={y + 3} width="44" height="100" fill="#000" fill-opacity=".3" />
      <rect x={x} y={y} width="44" height="100" fill="#F4EFE4" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={x + 4} y={y + 4 + i * 31} width="36" height="28" fill={['#C8301E', '#2E4A5A', '#E7C877'][i]} />
          <circle cx={x + 15} cy={y + 15 + i * 31} r="5" fill="#22201C" /><path d={`M${x + 8} ${y + 32 + i * 31} q7 -11 14 0 z`} fill="#22201C" />
          <circle cx={x + 29} cy={y + 15 + i * 31 + (i === 1 ? 2 : 0)} r="5" fill="#22201C" /><path d={`M${x + 22} ${y + 32 + i * 31} q7 -11 14 0 z`} fill="#22201C" />
        </g>
      ))}
      <rect x={x + 12} y={y - 6} width="20" height="10" fill="#D9D0BD" fill-opacity=".85" />
    </g>
  );
}

// étagère avec ses équerres
function Etagere({ x, y, w }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="8" fill="#5A3A22" />
      <rect x={x} y={y} width={w} height="2" fill="#7A5232" />
      {[x + 14, x + w - 22].map((bx) => <path key={bx} d={`M${bx} ${y + 8} h8 v4 l-4 14 h-4 z`} fill="#2A1E18" />)}
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
      <ellipse class="mu-halo" cx="615" cy="300" rx="330" ry="300" fill={`url(#${p}-halo)`} />

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
        <path d="M396 128 C402 210 390 300 398 410 L372 410 C378 300 368 200 374 128 Z" fill="#6A2A36" />
        <path d="M562 128 C556 210 568 300 560 410 L586 410 C580 300 590 200 584 128 Z" fill="#6A2A36" />
        <path d="M384 140 C388 220 380 320 386 404" stroke="#4A1A24" stroke-width="2" fill="none" />
        <path d="M574 140 C570 220 578 320 572 404" stroke="#4A1A24" stroke-width="2" fill="none" />
        <rect x="364" y="122" width="230" height="6" fill="#2A1E18" /><circle cx="366" cy="125" r="5" fill="#2A1E18" /><circle cx="592" cy="125" r="5" fill="#2A1E18" />
        {/* plante sur le rebord */}
        <rect x="500" y="364" width="26" height="22" fill="#9A5A3A" />
        {[[-14, 30], [-4, 40], [6, 36], [14, 26]].map(([dx, h], i) => <path key={i} d={`M513 366 q${dx / 2} ${-h / 2} ${dx} ${-h}`} stroke="#4E8A5A" stroke-width="6" stroke-linecap="round" fill="none" />)}
      </g>

      {/* ---------- caisson lumineux au-dessus de la fenêtre */}
      <path d="M424 37 L434 60 M534 37 L524 60" stroke="#141010" stroke-width="1.5" />
      <g class="mu-enseigne">
        <rect x="414" y="58" width="130" height="40" fill="#2A1C14" />
        <rect x="419" y="63" width="120" height="30" fill="#FFB347" />
        <rect x="419" y="63" width="120" height="8" fill="#FFD27A" fill-opacity=".6" />
        <text x="479" y="84" text-anchor="middle" font-size="15" textLength="104" lengthAdjust="spacingAndGlyphs" fill="#3A1A08" font-family="Dela Gothic One, Arial Black, sans-serif">BAR OUVERT</text>
      </g>
      <ellipse cx="479" cy="78" rx="110" ry="50" fill={`url(#${p}-chaud)`} />

      {/* ---------- suspension au centre, avec son cône de lumière */}
      <path class="mu-cone" d="M600 122 L630 122 L720 640 L510 640 Z" fill={`url(#${p}-cone)`} />
      <path d="M615 26 V84" stroke="#141010" stroke-width="2" />
      <path d="M589 122 Q591 92 615 84 Q639 92 641 122 Z" fill="#C8301E" />
      <path d="M589 122 H641" stroke="#8A2014" stroke-width="3" />
      <ellipse cx="615" cy="124" rx="10" ry="5" fill="#FFF1D0" />

      {/* ---------- galerie de cadres (bande du téléphone, à droite) */}
      {/* paysage au coucher de soleil */}
      <Cadre x={656} y={150} w={150} h={118} b={9} m={8}>
        <rect width="128" height="86" fill={`url(#${p}-ciel)`} />
        <circle cx="86" cy="54" r="12" fill="#FFE2A0" />
        <path d="M0 62 L24 44 L42 56 L66 36 L90 58 L110 46 L128 56 V86 H0 Z" fill="#5A3A5A" />
        <path d="M0 72 L30 60 L56 70 L84 58 L128 70 V86 H0 Z" fill="#3A2440" />
        <path d="M0 80 Q40 74 64 80 T128 78 V86 H0 Z" fill="#7AA0B8" fill-opacity=".6" />
        {[18, 30, 44, 100, 112].map((x, i) => <rect key={i} x={x} y={68 + (i % 2) * 2} width="2" height="2" fill="#FFD27A" />)}
      </Cadre>
      {/* disque d'or */}
      <Cadre x={652} y={290} w={72} h={112} b={6} c="#22201C" mat="#141210" m={4}>
        <rect width="52" height="92" fill="#141210" />
        <circle cx="26" cy="38" r="21" fill="#C9A24A" />
        {[17, 13, 9].map((r, i) => <circle key={i} cx="26" cy="38" r={r} fill="none" stroke="#A88230" stroke-width="1" />)}
        <circle cx="26" cy="38" r="6" fill="#C8301E" />
        <circle cx="26" cy="38" r="1.4" fill="#141210" />
        <path d="M13 26 Q20 20 31 21" stroke="#F4DFA0" stroke-width="2" fill="none" stroke-opacity=".7" />
        <rect x="6" y="72" width="40" height="5" fill="#C9A24A" />
        <rect x="12" y="81" width="28" height="3" fill="#C9A24A" fill-opacity=".6" />
      </Cadre>
      {/* affiche de concert */}
      <Cadre x={732} y={286} w={64} h={120} b={5} c="#2A2420" m={0}>
        <rect width="64" height="110" fill="#E7C877" />
        <rect y="0" width="64" height="24" fill="#22201C" />
        <text x="32" y="17" text-anchor="middle" font-size="12" fill="#E7C877" font-family="Dela Gothic One, sans-serif">LIVE</text>
        <circle cx="27" cy="54" r="21" fill="#C8301E" />
        <circle cx="27" cy="38" r="5" fill="#22201C" />
        <path d="M21 44 H33 L35 66 H19 Z" fill="#22201C" />
        <path d="M21 66 L19 82 M33 66 L35 82" stroke="#22201C" stroke-width="4" />
        <path d="M14 62 L44 50" stroke="#22201C" stroke-width="3" />
        <ellipse cx="18" cy="62" rx="7" ry="5" fill="#22201C" transform="rotate(-22 18 62)" />
        <rect x="8" y="86" width="48" height="4" fill="#22201C" />
        <rect x="14" y="94" width="36" height="3" fill="#22201C" fill-opacity=".6" />
        <rect x="18" y="100" width="28" height="3" fill="#22201C" fill-opacity=".6" />
      </Cadre>
      {/* polaroïds scotchés */}
      <Polaroid x={600} y={438} r={-6}>
        <rect width="50" height="50" fill="#7EC4D8" />
        <rect y="32" width="50" height="18" fill="#E7C877" />
        <path d="M12 34 Q14 18 18 12" stroke="#5A3A22" stroke-width="2" fill="none" />
        <path d="M18 12 q-10 0 -12 6 M18 12 q10 -2 12 4 M18 12 q-4 -8 -10 -8" stroke="#3E6B4A" stroke-width="3" fill="none" />
        <circle cx="40" cy="10" r="5" fill="#FFE2A0" />
      </Polaroid>
      <Polaroid x={664} y={446} r={5}>
        <rect width="50" height="50" fill="#3A2440" />
        <g transform="rotate(-14 18 30)"><path d="M10 14 H26 L24 40 H12 Z" fill="#E7B04A" /><path d="M10 14 H26 L25.5 19 H10.5 Z" fill="#F4EFE4" /></g>
        <g transform="rotate(14 32 30)"><path d="M24 14 H40 L38 40 H26 Z" fill="#E7B04A" /><path d="M24 14 H40 L39.5 19 H24.5 Z" fill="#F4EFE4" /></g>
        {[[6, 8, '#C8301E'], [44, 10, '#6CC9A8'], [25, 5, '#FFD23F'], [8, 44, '#6CC9A8'], [42, 44, '#FFD23F']].map(([x, y, c], i) => <rect key={i} x={x} y={y} width="3" height="3" fill={c} transform={`rotate(${i * 30} ${x} ${y})`} />)}
      </Polaroid>
      <Photomaton x={734} y={430} r={4} />

      {/* ---------- horloge sous la fenêtre (il est tard) */}
      <g>
        <circle cx="478" cy="480" r="30" fill="#F2EADB" stroke="#2A2420" stroke-width="5" />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <rect key={i} x={478 + Math.sin(a) * 23 - 1} y={480 - Math.cos(a) * 23 - 2} width="2" height="4" fill="#2A2420" transform={`rotate(${i * 30} ${478 + Math.sin(a) * 23} ${480 - Math.cos(a) * 23})`} />; })}
        <path d="M478 480 L490 486" stroke="#22201C" stroke-width="3" stroke-linecap="round" />
        <path d="M478 480 L481 459" stroke="#22201C" stroke-width="2" stroke-linecap="round" />
        <circle cx="478" cy="480" r="2.5" fill="#C8301E" />
      </g>


      {/* ---------- petite étagère sous l'horloge : platine vinyle et pochettes */}
      <g>
        <Etagere x={470} y={560} w={132} />
        <rect x="476" y="530" width="70" height="30" fill="#2A2420" />
        <rect x="476" y="530" width="70" height="4" fill="#3A322C" />
        <circle cx="504" cy="545" r="12" fill="#141010" />
        <circle cx="504" cy="545" r="4" fill="#C8301E" />
        <path d="M536 534 L530 552" stroke="#C9C2B4" stroke-width="2" />
        <circle cx="536" cy="534" r="2.5" fill="#C9C2B4" />
        <rect x="554" y="520" width="30" height="40" fill="#2E4A5A" transform="rotate(-6 569 560)" />
        <circle cx="566" cy="538" r="8" fill="#E7C877" transform="rotate(-6 569 560)" />
        <rect x="572" y="524" width="26" height="36" fill="#C8301E" transform="rotate(4 585 560)" />
      </g>

      {/* ---------- côté gauche (ordinateur) : applique, étagère, boule à facettes, cible de fléchettes */}
      <g>
        <path d="M300 140 V96" stroke="#141010" stroke-width="2" />
        <circle cx="300" cy="96" r="5" fill="#141010" />
        <Disco cx={300} cy={170} r={28} p={p} />
        {[[236, 128, 0], [356, 150, 1], [222, 236, 2], [380, 250, 0], [262, 286, 1]].map(([x, y, k], i) => <ellipse key={i} class={`mu-reflet r${k}`} cx={x} cy={y} rx="5" ry="3.5" fill="#F4F8FF" fill-opacity=".55" transform={`rotate(${i * 37} ${x} ${y})`} />)}
        <Etagere x={214} y={330} w={170} />
        <Livres x={222} y={330} />
        <path d="M318 330 V300 Q318 294 322 291 V280 H327 V291 Q331 294 331 300 V330 Z" fill="#1F3A2A" />
        <path d="M338 330 V306 Q338 300 342 298 V288 H346 V298 Q350 300 350 306 V330 Z" fill="#6A2A36" />
        <rect x="358" y="314" width="18" height="16" fill="#C8301E" />
        <rect x="360" y="318" width="14" height="5" fill="#F2EADB" />
        <Etagere x={214} y={430} w={110} />
        <path d="M232 430 L236 400 H264 L268 430 Z" fill="#8A4A2E" />
        {[[-26, 30], [-10, 38], [10, 36], [24, 28]].map(([dx, h], i) => <path key={i} d={`M250 402 q${dx / 2} ${-h / 2} ${dx} ${-h}`} stroke="#4E8A5A" stroke-width="5" stroke-linecap="round" fill="none" />)}
        <g>
          <circle cx="150" cy="470" r="28" fill="#1A1514" />
          {[24, 17, 10].map((r, i) => <circle key={i} cx="150" cy="470" r={r} fill="none" stroke={i % 2 ? '#C8301E' : '#E9E1CF'} stroke-width="5" />)}
          <circle cx="150" cy="470" r="3" fill="#C8301E" />
          <path d="M156 464 l12 -12" stroke="#22201C" stroke-width="2" /><path d="M168 452 l5 -1 l-1 5 z" fill="#C8301E" />
        </g>
        {/* applique */}
        <Applique x={145} y={220} p={p} />
      </g>

      {/* ---------- côté droit (ordinateur) : applique, miroir, guitare, affiche de film */}
      <g>
        <Applique x={1055} y={220} p={p} />
        <circle cx="900" cy="200" r="50" fill={OR} />
        <circle cx="900" cy="200" r="42" fill="#4A5260" />
        <path d="M872 182 L900 160 M880 200 L918 168" stroke="#E9E1CF" stroke-opacity=".45" stroke-width="5" />
        <Guitare x={930} y={430} r={-14} />
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

// ---------------------------------------------------------------- murs des autres scènes
// Même principe que l'appart : dessin 1200 × 900, bande utile au téléphone de x 390 à 810.

// carte à jouer dessinée (coin et symbole central)
function Carte({ x, y, w = 40, h = 56, r = 0, v = 'A', s = '♠', red = false }) {
  const c = red ? '#C8301E' : '#22201C';
  return (
    <g transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#F4EFE4" stroke="#C9C2B4" stroke-width="1" />
      <text x={x + 4} y={y + 12} font-size="10" font-weight="700" fill={c} font-family="Familjen Grotesk, Arial, sans-serif">{v}</text>
      <text x={x + w / 2} y={y + h / 2 + 8} text-anchor="middle" font-size={w * 0.55} fill={c}>{s}</text>
    </g>
  );
}

export function MurTapis({ id }) {
  const p = `mt-${id}`;
  return (
    <svg class="mu" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${p}-bois`} width="60" height="900" patternUnits="userSpaceOnUse">
          <rect width="60" height="900" fill="#241812" />
          <rect x="58" width="2" height="900" fill="#1A110C" />
          <path d="M20 0 V900" stroke="#2A1C15" stroke-width="6" />
        </pattern>
        <radialGradient id={`${p}-chaud`}>
          <stop offset="0" stop-color="#FFC877" stop-opacity=".4" />
          <stop offset=".55" stop-color="#FFB060" stop-opacity=".08" />
          <stop offset="1" stop-color="#FFB060" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="900" fill={`url(#${p}-bois)`} />
      <rect width="1200" height="30" fill="#140E0A" />
      <rect y="30" width="1200" height="6" fill="#3A2A1E" />
      <rect y="560" width="1200" height="10" fill="#3A2A1E" />
      <rect y="570" width="1200" height="330" fill="#1C130E" />
      <Applique x={330} y={230} p={p} />
      <Applique x={870} y={230} p={p} />
      {/* as de pique encadré */}
      <g>
        <rect x="410" y="230" width="110" height="150" fill={OR} />
        <rect x="418" y="238" width="94" height="134" fill="#1F4A34" />
        <Carte x={436} y={254} w={58} h={84} v="A" s="♠" r={-4} />
        <rect x="430" y="350" width="70" height="10" fill={OR_C} fill-opacity=".7" />
      </g>
      {/* quinte flush royale sous verre */}
      <g>
        <rect x="560" y="260" width="200" height="100" fill="#2A1E16" />
        <rect x="566" y="266" width="188" height="88" fill="#1F4A34" />
        {[['10', -10], ['V', -5], ['D', 0], ['R', 5], ['A', 10]].map(([v, r], i) => <Carte key={v} x={578 + i * 32} y={286} w={34} h={48} v={v} s="♥" red r={r} />)}
      </g>
      {/* horloge et jetons */}
      <circle cx="765" cy="420" r="26" fill="#F2EADB" stroke={OR} stroke-width="5" />
      <path d="M765 420 L776 413 M765 420 L765 402" stroke="#22201C" stroke-width="3" stroke-linecap="round" />
      <rect x="430" y="490" width="300" height="10" fill="#5A3A22" />
      {[440, 470, 500].map((x, i) => Array.from({ length: 3 + i }, (_, k) => <rect key={`${x}-${k}`} x={x} y={482 - k * 7} width="24" height="7" rx="2" fill={['#C8301E', '#2E4A5A', '#F2EADB'][i]} stroke="#000" stroke-opacity=".3" />))}
      {[550, 585, 620, 655, 690].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 490 V${450 - (i % 2) * 10} Q${x} ${442 - (i % 2) * 10} ${x + 6} ${438 - (i % 2) * 10} V${420 - (i % 2) * 10} H${x + 12} V${438 - (i % 2) * 10} Q${x + 18} ${442 - (i % 2) * 10} ${x + 18} ${450 - (i % 2) * 10} V490 Z`} fill={['#6A3A1A', '#1F3A2A', '#8A5A1A', '#3A1A1A', '#2E4A5A'][i]} />
          <rect x={x + 3} y="460" width="12" height="12" fill="#E7C877" fill-opacity=".7" />
        </g>
      ))}
      {/* roi de cœur encadré, à droite (ordinateur) */}
      <g>
        <rect x="960" y="150" width="110" height="150" fill={OR} />
        <rect x="968" y="158" width="94" height="134" fill="#3A1A1A" />
        <Carte x={986} y={174} w={58} h={84} v="R" s="♥" red r={4} />
      </g>
      {/* dés à gauche (ordinateur) */}
      <g>
        <rect x="140" y="170" width="120" height="120" fill={OR} />
        <rect x="148" y="178" width="104" height="104" fill="#1F4A34" />
        <rect x="168" y="204" width="32" height="32" rx="5" fill="#F4EFE4" transform="rotate(-12 184 220)" />
        <rect x="204" y="226" width="32" height="32" rx="5" fill="#F4EFE4" transform="rotate(10 220 242)" />
        {[[178, 212], [190, 226], [212, 236], [226, 250], [212, 250], [226, 236]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#22201C" />)}
      </g>
    </svg>
  );
}

// petite image en pixels (grille de 0 et 1)
function Pixels({ x, y, k = 6, c, rows }) {
  return <g>{rows.map((row, j) => row.split('').map((v, i) => (v === '1' ? <rect key={`${i}-${j}`} x={x + i * k} y={y + j * k} width={k} height={k} fill={c} /> : null)))}</g>;
}

export function MurArcade() {
  const alien = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
  const fantome = ['0011100', '0111110', '1101011', '1111111', '1111111', '1010101'];
  return (
    <svg class="mu" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <rect width="1200" height="900" fill="#15121C" />
      {Array.from({ length: 40 }, (_, j) => <path key={j} d={`M0 ${j * 24} H1200`} stroke="#1B1724" stroke-width="2" />)}
      {Array.from({ length: 40 }, (_, j) => Array.from({ length: 13 }, (_, i) => <path key={`${i}-${j}`} d={`M${i * 96 + (j % 2) * 48} ${j * 24} v24`} stroke="#1B1724" stroke-width="2" />))}
      <g>
        <rect x="520" y="56" width="160" height="56" fill="#0E0C12" stroke="#FFD23F" stroke-width="4" />
        <text x="600" y="96" text-anchor="middle" font-size="26" textLength="128" lengthAdjust="spacingAndGlyphs" fill="#FFD23F" font-family="Dela Gothic One, sans-serif">ARCADE</text>
      </g>
      {/* affiches pixel */}
      <g>
        <rect x="410" y="150" width="120" height="160" fill="#22201C" />
        <rect x="416" y="156" width="108" height="148" fill="#1A1430" />
        <Pixels x={437} y={190} k={6} c="#6CC9A8" rows={alien} />
        <text x="470" y="282" text-anchor="middle" font-size="13" fill="#FFD23F" font-family="Dela Gothic One, sans-serif">INVASION</text>
      </g>
      <g>
        <rect x="680" y="150" width="120" height="160" fill="#22201C" />
        <rect x="686" y="156" width="108" height="148" fill="#2A1020" />
        <Pixels x={719} y={190} k={6} c="#E5502F" rows={fantome} />
        {[0, 1, 2, 3].map((i) => <circle key={i} cx={704 + i * 22} cy={258} r="3" fill="#FFD23F" />)}
        <text x="740" y="290" text-anchor="middle" font-size="13" fill="#F2EADB" font-family="Dela Gothic One, sans-serif">GLOUTON</text>
      </g>
      {/* tableau des records */}
      <g>
        <rect x="550" y="330" width="110" height="130" fill="#0E0C12" stroke="#FFD23F" stroke-opacity=".6" stroke-width="3" />
        <text x="605" y="352" text-anchor="middle" font-size="11" fill="#FFD23F" font-family="Dela Gothic One, sans-serif">RECORDS</text>
        {[['SAM', '98 420'], ['GRG', '87 150'], ['DRE', '66 010'], ['LUC', '41 300'], ['???', '12 900']].map(([n, v], i) => (
          <g key={n}>
            <text x="562" y={374 + i * 18} font-size="11" fill={i ? '#E9E1CF' : '#6CC9A8'} font-family="Familjen Grotesk, monospace">{n}</text>
            <text x="648" y={374 + i * 18} text-anchor="end" font-size="11" fill={i ? '#E9E1CF' : '#6CC9A8'} font-family="Familjen Grotesk, monospace">{v}</text>
          </g>
        ))}
      </g>
      {/* manette au mur et câbles */}
      <g>
        <rect x="430" y="380" width="84" height="40" rx="18" fill="#3A3540" />
        <path d="M444 400 h14 M451 393 v14" stroke="#E9E1CF" stroke-width="4" />
        <circle cx="492" cy="396" r="5" fill="#E5502F" /><circle cx="502" cy="406" r="5" fill="#5B8DEF" />
        <path d="M472 380 C472 340 520 330 540 300" stroke="#3A3540" stroke-width="3" fill="none" />
      </g>
      <g>
        <rect x="150" y="160" width="120" height="160" fill="#22201C" />
        <rect x="156" y="166" width="108" height="148" fill="#10203A" />
        <Pixels x={186} y={196} k={6} c="#F2EADB" rows={['0001000', '0011100', '0011100', '0111110', '1111111', '0101010']} />
        <text x="210" y="292" text-anchor="middle" font-size="13" fill="#5B8DEF" font-family="Dela Gothic One, sans-serif">FUSÉE</text>
      </g>
      <g>
        <rect x="940" y="300" width="140" height="70" fill="#22201C" />
        <rect x="946" y="306" width="128" height="58" fill="#3A1F3A" />
        <text x="1010" y="343" text-anchor="middle" font-size="16" fill="#FFD23F" font-family="Dela Gothic One, sans-serif">INSERT COIN</text>
      </g>
    </svg>
  );
}

export function MurAtelier({ id }) {
  const p = `ma-${id}`;
  return (
    <svg class="mu" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${p}-jour`}>
          <stop offset="0" stop-color="#C8D8F0" stop-opacity=".22" />
          <stop offset="1" stop-color="#C8D8F0" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="900" fill="#2A2522" />
      {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 137) % 1200} cy={(i * 251) % 560} r={1.5 + (i % 3)} fill={['#C8301E', '#5B8DEF', '#FFD23F', '#6CC9A8'][i % 4]} fill-opacity=".18" />)}
      {/* verrière */}
      <g>
        <rect x="430" y="40" width="340" height="130" fill="#141A2A" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${430 + i * 85} 40 V170`} stroke="#3A3530" stroke-width="6" />)}
        <path d="M430 105 H770" stroke="#3A3530" stroke-width="5" />
        <rect x="430" y="40" width="340" height="130" fill="none" stroke="#3A3530" stroke-width="8" />
        {[[470, 70], [560, 60], [650, 90], [720, 66], [505, 135], [690, 140]].map(([x, y], i) => <rect key={i} class={i % 2 ? 'amb-win b1' : null} x={x} y={y} width="3" height="3" fill="#E9E1CF" />)}
        <ellipse cx="600" cy="260" rx="260" ry="180" fill={`url(#${p}-jour)`} />
      </g>
      {/* croquis scotchés */}
      {[[420, 220, -5, 'chat'], [520, 236, 4, 'maison'], [690, 220, -3, 'portrait']].map(([x, y, r, k]) => (
        <g key={k} transform={`rotate(${r} ${x + 40} ${y + 50})`}>
          <rect x={x} y={y + 3} width="80" height="100" fill="#000" fill-opacity=".3" />
          <rect x={x} y={y} width="80" height="100" fill="#F4EFE4" />
          <rect x={x + 28} y={y - 6} width="24" height="10" fill="#D9D0BD" fill-opacity=".85" />
          {k === 'chat' ? <path d={`M${x + 20} ${y + 80} Q${x + 18} ${y + 50} ${x + 40} ${y + 48} Q${x + 62} ${y + 50} ${x + 60} ${y + 80} Z M${x + 30} ${y + 50} L${x + 28} ${y + 30} L${x + 38} ${y + 44} M${x + 50} ${y + 50} L${x + 52} ${y + 30} L${x + 42} ${y + 44} M${x + 60} ${y + 76} Q${x + 72} ${y + 70} ${x + 68} ${y + 56}`} fill="none" stroke="#22201C" stroke-width="2" /> : null}
          {k === 'maison' ? <path d={`M${x + 14} ${y + 84} V${y + 50} L${x + 40} ${y + 28} L${x + 66} ${y + 50} V${y + 84} Z M${x + 34} ${y + 84} V${y + 64} H${x + 46} V${y + 84} M${x + 20} ${y + 56} h10 v10 h-10 z`} fill="none" stroke="#22201C" stroke-width="2" /> : null}
          {k === 'portrait' ? <g fill="none" stroke="#22201C" stroke-width="2"><circle cx={x + 40} cy={y + 44} r="18" /><path d={`M${x + 32} ${y + 42} h4 M${x + 44} ${y + 42} h4 M${x + 34} ${y + 52} q6 5 12 0 M${x + 16} ${y + 92} q24 -30 48 0`} /></g> : null}
        </g>
      ))}
      {/* nuancier */}
      <g>
        {['#C8301E', '#E5502F', '#FFD23F', '#6CC9A8', '#5B8DEF', '#6B4FA8'].map((c, i) => <rect key={c} x={612 + i * 12} y="240" width="10" height="70" fill={c} transform={`rotate(${-20 + i * 8} 612 310)`} />)}
      </g>
      {/* étagère : pots de peinture et pinceaux */}
      <g>
        <Etagere x={420} y={420} w={360} />
        {['#C8301E', '#FFD23F', '#5B8DEF', '#6CC9A8'].map((c, i) => (
          <g key={c}><rect x={436 + i * 40} y="390" width="30" height="30" fill="#C9C2B4" /><rect x={436 + i * 40} y="390" width="30" height="8" fill={c} /><path d={`M${436 + i * 40} 398 q6 10 4 18`} stroke={c} stroke-width="4" fill="none" /></g>
        ))}
        <rect x="610" y="384" width="26" height="36" fill="#8A6A4A" />
        {[-10, -3, 4, 11].map((d, i) => <g key={d}><path d={`M${623 + d} 384 L${623 + d * 1.6} 344`} stroke="#5A3A22" stroke-width="3" /><path d={`M${623 + d * 1.6} 344 l-3 -10 h6 z`} fill={['#C8301E', '#FFD23F', '#5B8DEF', '#22201C'][i]} /></g>)}
        <path d="M660 420 Q700 380 750 400 Q770 410 760 420 Z" fill="#E9E1CF" />
        {[[690, 404, '#C8301E'], [710, 398, '#FFD23F'], [730, 404, '#5B8DEF']].map(([x, y, c]) => <circle key={x} cx={x} cy={y} r="5" fill={c} />)}
      </g>
      {/* tablier accroché et grand cadre vide (ordinateur) */}
      <g>
        <path d="M200 200 L230 200 L240 240 L250 380 H180 L190 240 Z" fill="#5A6470" />
        <circle cx="215" cy="196" r="5" fill="#22201C" />
        {[[200, 280, '#C8301E'], [222, 320, '#FFD23F'], [206, 350, '#5B8DEF']].map(([x, y, c]) => <circle key={y} cx={x} cy={y} r="5" fill={c} />)}
        <rect x="920" y="190" width="160" height="200" fill="none" stroke={OR} stroke-width="10" />
        <rect x="935" y="205" width="130" height="170" fill="#E9E1CF" />
        <circle cx="990" cy="260" r="34" fill="#C8301E" />
        <rect x="1010" y="270" width="44" height="80" fill="#2E4A5A" />
        <path d="M940 360 Q990 300 1060 330" stroke="#FFD23F" stroke-width="10" fill="none" />
      </g>
    </svg>
  );
}
