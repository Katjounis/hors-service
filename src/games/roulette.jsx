// Roulette russe : six verres alignés, un seul est piégé. Chacun son tour choisit un verre.
// • Verre piégé : cul sec (ou la sanction réglée), puis on remet six verres.
// • Plus il reste peu de verres, plus ça sent le roussi : le dernier est forcément le bon.
// • Se dégonfler coûte des gorgées et laisse la main au suivant.
import { Who, nickOf, Stamp, useTicker } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

const N = 6;
const SHOW = 1800; // durée du verdict avant le tour suivant

function load(c) {
  const g = c.g;
  g.used = Array(N).fill(''); // '' = verre encore plein
  c.priv.trap = Math.floor(Math.random() * N);
  g.round += 1;
}

function alive(c, g) { return g.pl.filter((u) => c.roster[u] && (g.local || c.online(u))); }

function nextTurn(c) {
  const g = c.g;
  const list = alive(c, g);
  if (!list.length) return;
  const cur = g.pl[g.t];
  let i = list.indexOf(cur);
  i = (i + 1) % list.length;
  g.t = g.pl.indexOf(list[i]);
  g.n += 1;
  g.phase = 'pick';
  g.last = null;
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, b: g.booms[u] || 0, s: g.safe[u] || 0, x: g.chick[u] || 0 }))
    .sort((a, b) => b.b - a.b || b.x - a.x || a.s - b.s);
  g.summary = { rows, rounds: g.booms_total };
}

function pickGlass(c, uid, idx) {
  const g = c.g;
  g.used[idx] = uid;
  const boom = idx === c.priv.trap;
  const left = g.used.filter((x) => !x).length;
  g.last = { uid, idx, boom, left, at: c.now() };
  g.phase = 'show';
  if (boom) {
    g.booms[uid] = (g.booms[uid] || 0) + 1;
    g.booms_total += 1;
    const why = 'Roulette russe : verre piégé';
    if (c.opts.pen === 'cs') c.penCS(uid, why); else c.pen(uid, Number(c.opts.pen) || 5, why);
    c.count(uid, 'boom');
  } else {
    g.safe[uid] = (g.safe[uid] || 0) + 1;
  }
}

function afterShow(c) {
  const g = c.g;
  if (g.last && g.last.boom) {
    if (g.max && g.booms_total >= g.max) { finish(c); return; }
    load(c);
  }
  nextTurn(c);
}

const ROULETTE = {
  id: 'roulette',
  name: 'Roulette russe',
  tagline: 'Six verres, un seul piégé. Chacun son tour, choisis le tien.',
  min: 2,
  local: true,
  rules: [
    'Six verres sont alignés, un seul est piégé. Personne ne sait lequel, même pas l’hôte.',
    'Chacun son tour, choisis un verre. Verre propre : ouf, au suivant.',
    'Verre piégé : cul sec (ou la sanction réglée), puis on remet six verres et ça repart.',
    'Plus il reste peu de verres, plus le risque monte. Le dernier verre est forcément le piégé.',
    'Tu peux te dégonfler et passer ton tour, mais ça coûte des gorgées et toute la table le saura.',
  ],
  options: [
    { id: 'pen', label: 'Verre piégé', choices: [['cs', 'Cul sec'], [5, '5 gorgées'], [3, '3 gorgées']], def: 'cs' },
    { id: 'chick', label: 'Se dégonfler coûte', choices: [[2, '2 gorgées'], [3, '3 gorgées'], [0, 'Interdit']], def: 2 },
    { id: 'max', label: 'Fin de partie', choices: [[3, 'Après 3 verres piégés'], [5, 'Après 5'], [0, 'Sans fin']], def: 3 },
  ],

  start(c) {
    const pl = c.activeUids();
    const g = { pl, t: Math.floor(Math.random() * pl.length), n: 1, round: 0, local: !!c.isLocal, phase: 'pick', used: [], last: null,
      booms: {}, safe: {}, chick: {}, booms_total: 0, max: c.opts.max || 0, chickCost: Number(c.opts.chick) || 0, hist: [] };
    c.g = g;
    c.S.game.g = g;
    load(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase !== 'pick' || g.pl[g.t] !== uid) return null;
    return { k: `p${g.n}`, kind: 'pick' };
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'pick' || k !== `p${g.n}` || g.pl[g.t] !== uid) return false;
    if (v === 'pass') {
      if (!g.chickCost || g.used.filter((x) => !x).length <= 1) return false;
      g.chick[uid] = (g.chick[uid] || 0) + 1;
      c.pen(uid, g.chickCost, 'Roulette russe : dégonflé');
      c.ev(`${c.name(uid)} se dégonfle à la roulette`, '*', 'info');
      nextTurn(c);
      return true;
    }
    const idx = Number(v);
    if (!Number.isInteger(idx) || idx < 0 || idx >= N || g.used[idx]) return false;
    pickGlass(c, uid, idx);
    return true;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'show' && g.last && c.now() - g.last.at > SHOW + (g.last.boom ? 900 : 0)) { afterShow(c); return true; }
    // joueur parti pendant son tour : la main passe
    if (g.phase === 'pick' && !g.local && !c.online(g.pl[g.t])) { nextTurn(c); return true; }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'show') return [{ id: 'next', label: 'Au suivant', primary: true }];
    if (g.phase === 'pick') return [{ id: 'skip', label: 'Passer ce joueur' }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le bilan ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'show') { afterShow(c); return true; }
    if (id === 'skip' && g.phase === 'pick') { nextTurn(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf(g) { return g && g.phase === 'pick' ? g.pl[g.t] : null; },
  turnText() { return { meLabel: 'Choisis ton verre' }; },
  tintOf() { return 'roulette'; },
  bot({ g }) {
    const free = g.used.map((x, i) => (x ? -1 : i)).filter((x) => x >= 0);
    if (g.chickCost && free.length > 2 && Math.random() < 0.12) return 'pass';
    return free[Math.floor(Math.random() * free.length)];
  },

  Table,
  Act,
};
export default ROULETTE;

// ---------------------------------------------------------------- affichage

// un verre à shot vu de face, plein, vide (renversé) ou piégé
function Shot({ state, n }) {
  return (
    <svg class={`rr-shot is-${state}`} viewBox="0 0 40 56" aria-hidden="true">
      <path d="M6 6 L34 6 L30 50 C29.6 52.6 28 53.6 25.6 53.6 L14.4 53.6 C12 53.6 10.4 52.6 10 50 Z" fill="rgba(251,246,234,.22)" stroke="#FBF6EA" stroke-width="2.2" stroke-linejoin="round" />
      {state === 'full' || state === 'boom' ? <path d="M8.2 16 L31.8 16 L29.4 49.2 C29.2 51 28 52 26 52 L14 52 C12 52 10.8 51 10.6 49.2 Z" fill={state === 'boom' ? '#C8301E' : '#E9A93A'} /> : null}
      {state === 'boom' ? <path d="M20 22 L22 30 L28 28 L23 33 L27 40 L20 35 L13 40 L17 33 L12 28 L18 30 Z" fill="#FFD23F" /> : null}
      <path d="M10 10 L12 44" stroke="#FFFFFF" stroke-width="1.6" opacity=".35" stroke-linecap="round" />
      <text x="20" y="13" text-anchor="middle" font-size="7" fill="#FBF6EA" font-family="Familjen Grotesk, sans-serif" font-weight="700">{n}</text>
    </svg>
  );
}

function Table({ S, g, uid, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const left = g.used.filter((x) => !x).length;
  const L = g.last;
  return (
    <div class="rr">
      <div class="ose-top">
        <span class="chip">{`Série ${g.round}`}</span>
        <span class="chip">{left > 1 ? `1 chance sur ${left}` : 'Dernier verre : piégé'}</span>
      </div>
      <div class="rr-row" key={g.round}>
        {g.used.map((u, i) => {
          const state = L && L.idx === i && g.phase === 'show' ? (L.boom ? 'boom' : 'empty') : u ? 'empty' : 'full';
          return (
            <div class={`rr-glass${u ? ' is-used' : ''}${L && L.idx === i && g.phase === 'show' ? ' is-last' : ''}`} key={i}>
              <Shot state={state} n={i + 1} />
              {u && S.roster[u] ? <span class="rr-who">{nickOf(S, u)}</span> : null}
            </div>
          );
        })}
      </div>
      {g.phase === 'show' && L ? <Verdict S={S} g={g} uid={uid} clock={clock} /> : null}
    </div>
  );
}

function Verdict({ S, g, uid, clock }) {
  const L = g.last;
  const wait = Math.max(0, L.at + 700 - clock());
  useTicker(wait > 0, 120);
  if (wait > 0) return <div class="suspense" role="status">{`${nickOf(S, L.uid)} boit le verre ${L.idx + 1}…`}</div>;
  const pen = S.game && S.game.opts ? S.game.opts.pen : 'cs';
  return L.boom ? (
    <div class="verdict paper tape rr-boom">
      <span class="ose-lead">Verre piégé</span>
      <div class="verdict-who"><Who S={S} uid={L.uid} size="l" you={uid} /></div>
      <div class="verdict-line"><Stamp size="l">{pen === 'cs' ? 'Cul sec' : plural(Number(pen) || 5, 'gorgée', 'gorgées')}</Stamp></div>
    </div>
  ) : (
    <div class="verdict paper rr-ouf">
      <span class="ose-lead">Ouf</span>
      <div class="verdict-who"><Who S={S} uid={L.uid} size="l" you={uid} /></div>
      <p class="center">{L.left > 1 ? `Plus que ${L.left} verres, dont un piégé.` : 'Le prochain n’a plus le choix.'}</p>
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [] };
  const top = s.rows.length && s.rows[0].b > 0 ? s.rows.filter((r) => r.b === s.rows[0].b) : [];
  return (
    <div class="end">
      <h3 class="end-title">{`Bilan · ${plural(s.rounds || 0, 'verre piégé', 'verres piégés')}`}</h3>
      {top.length ? <div class="awards"><div class="award"><span class="award-t">Pas de chance</span><span class="award-who">{top.map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span></div></div> : null}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Piégé</th><th>Ouf</th><th>Dégonflé</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.b}</td><td>{r.s}</td><td>{r.x}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, req, send, sent }) {
  const free = g.used.map((x, i) => (x ? -1 : i)).filter((x) => x >= 0);
  return (
    <div class="act">
      <h3>Choisis ton verre</h3>
      <div class="rr-pick">
        {free.map((i) => <button type="button" key={i} class="btn btn-big" disabled={sent} onClick={() => send(req.k, i)}>{`Verre ${i + 1}`}</button>)}
      </div>
      {g.chickCost && free.length > 1 ? (
        <button type="button" class="btn btn-ghost btn-wide" disabled={sent} onClick={() => send(req.k, 'pass')}>{`Je me dégonfle (${plural(g.chickCost, 'gorgée', 'gorgées')})`}</button>
      ) : null}
    </div>
  );
}
