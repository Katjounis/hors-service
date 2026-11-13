// Mode clair généré à partir de la feuille sombre : chaque déclaration de couleur est recopiée sous
// :root[data-theme="light"], dans le même ordre (la cascade reste identique), avec les couleurs sombres
// remplacées par leurs équivalents clairs. Le papier des cartes, le jaune et le rouge ne bougent pas.

const PROPS = /^(color|background|background-color|border|border-color|border-top|border-bottom|border-left|border-right|border-top-color|border-bottom-color|outline|outline-color|fill|stroke|text-shadow|box-shadow|caret-color|accent-color)$/;

// couleurs de texte claires sur fond sombre : passent en encre
const TEXT_LIGHT = ['var(--papier)', 'var(--papier-2)', '#F2EADB', '#FFFDF6', '#E6DCC8', '#fff', '#FFF', '#ffffff', '#FFFFFF'];
const VARS = {
  'var(--bitume)': '#EFE8DB', 'var(--bitume-2)': '#F7F2E8', 'var(--bitume-3)': '#E6DDCC',
  'var(--surface)': '#FBF7EF', 'var(--surface-2)': '#F2EBDD', 'var(--filet)': '#CBBEA8',
};

function hexLum(h) {
  let x = h.slice(1);
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  if (x.length !== 6) return null;
  const n = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255);
  return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
}
// fond sombre codé en dur : éclairci en gardant une pointe de sa teinte
function lighten(h) {
  let x = h.slice(1);
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  const n = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  const mix = n.map((v) => Math.round(244 - (255 - v) * 0.06 + (v - 40) * 0.05));
  return '#' + mix.map((v) => Math.max(200, Math.min(252, v)).toString(16).padStart(2, '0')).join('');
}

function mapValue(prop, v) {
  let out = v;
  const isText = prop === 'color' || prop === 'caret-color';
  if (isText) {
    for (const t of TEXT_LIGHT) if (out.trim() === t || out.trim() === `${t} !important`) return out.replace(t, 'var(--encre)');
    if (out.includes('var(--poussiere)')) return out.replace('var(--poussiere)', '#5C554B');
    if (out.trim() === 'var(--jaune)' || out.trim() === 'var(--jaune-2)') return '#7A5A00';
    const m = out.trim().match(/^#[0-9A-Fa-f]{3,6}/);
    if (m) { const l = hexLum(m[0]); if (l !== null && l > 0.72) return out.replace(m[0], 'var(--encre)'); }
    return out;
  }
  if (prop === 'text-shadow') return 'none';
  for (const [k, r] of Object.entries(VARS)) out = out.split(k).join(r);
  // fonds sombres en dur
  out = out.replace(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g, (h) => {
    const l = hexLum(h);
    if (l === null || prop.startsWith('border') || prop.startsWith('outline')) return l !== null && l < 0.12 && prop.startsWith('border') ? '#CBBEA8' : h;
    return l < 0.14 ? lighten(h) : h;
  });
  // voiles sombres translucides
  out = out.replace(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/g, (s, r, g, b, a) => {
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (l < 0.15 && !prop.startsWith('border')) return `rgba(251, 247, 239, ${a})`;
    if (l > 0.85 && prop.startsWith('border')) return `rgba(34, 32, 28, ${Math.min(1, Number(a) + 0.08)})`;
    return s;
  });
  return out;
}

// découpe très simple en blocs (gère un niveau de @media / @supports)
function walk(css, prefix) {
  const out = [];
  let i = 0;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    if (head.startsWith('@media') || head.startsWith('@supports')) {
      let depth = 1;
      let j = open + 1;
      while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      const inner = walk(css.slice(open + 1, j - 1), prefix);
      if (inner.trim()) out.push(`${head} {\n${inner}\n}`);
      i = j;
      continue;
    }
    const close = css.indexOf('}', open);
    if (head.startsWith('@')) {
      // @keyframes, @font-face : on saute le bloc entier
      let depth = 1;
      let j = open + 1;
      while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      i = j;
      continue;
    }
    const body = css.slice(open + 1, close);
    i = close + 1;
    if (head.includes(':root') && !head.includes('[')) continue;
    const decls = [];
    for (const d of body.split(/;(?![^(]*\))/)) {
      const k = d.indexOf(':');
      if (k < 0) continue;
      const p = d.slice(0, k).trim();
      const v = d.slice(k + 1).trim();
      if (!PROPS.test(p) || p.startsWith('--')) continue;
      const COLOR = /(var\(--[a-z0-9-]+\)|#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)|currentColor|transparent|\b(?:white|black)\b)/;
      // raccourcis (border, outline, background) : on ne recopie que la couleur, sinon l'épaisseur ou l'image
      // d'une règle plus loin dans la feuille seraient écrasées
      if (/^(border(-top|-bottom|-left|-right)?|outline)$/.test(p)) {
        const m = v.match(COLOR);
        if (!m) continue;
        decls.push(`${p}-color: ${mapValue(p + '-color', m[1])}`);
        continue;
      }
      if (p === 'background') {
        if (/gradient|url\(/.test(v)) { const mv = mapValue(p, v); if (mv !== v) decls.push(`${p}: ${mv}`); continue; }
        const m = v.match(COLOR);
        if (!m || v.replace(m[1], '').replace('!important', '').trim()) { const mv = mapValue(p, v); if (mv !== v) decls.push(`${p}: ${mv}`); continue; }
        decls.push(`background-color: ${mapValue('background-color', v)}`);
        continue;
      }
      if (p === 'box-shadow' || p === 'text-shadow') { const mv = mapValue(p, v); if (mv !== v) decls.push(`${p}: ${mv}`); continue; }
      decls.push(`${p}: ${mapValue(p, v)}`);
    }
    if (!decls.length) continue;
    const sel = head.split(',').map((s) => {
      s = s.trim();
      if (/^(html|:root)\b/.test(s)) return s.replace(/^(html|:root)/, `${prefix}`);
      if (/^body\b/.test(s)) return `${prefix} ${s}`;
      return `${prefix} ${s}`;
    }).join(', ');
    out.push(`${sel} { ${decls.join('; ')}; }`);
  }
  return out.join('\n');
}

export function lightCSS(css) {
  const P = ':root[data-theme="light"]';
  const base = `${P} { color-scheme: light; --ligne: rgba(34, 32, 28, .14); --ligne-2: rgba(34, 32, 28, .22); }
${P} body { background: #EFE8DB; color: var(--encre); }
${P} .ambiance::before { background: rgba(243, 237, 226, .86); z-index: 5; }
${P} .ambiance::after { opacity: 0; }
${P} .amb-fenetre, ${P} .amb-cadres, ${P} .amb-lampe, ${P} .dc-top { opacity: .12 !important; }`;
  return `${base}\n${walk(css, P)}`;
}
