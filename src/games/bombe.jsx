// Bombe — sur un seul téléphone qui passe de main en main (demande de Thierry) :
// • Une mèche à durée cachée. À chaque passage, une consigne (« un pays en B », « une marque de bière »…) :
//   on répond à voix haute, puis on passe le téléphone.
// • Celui qui tient le téléphone quand ça explose prend la pénalité. Tic-tac qui accélère, vibration, explosion.
// Choix techniques : le téléphone tourne dans le sens des aiguilles d'une montre (ordre des places) ;
// le perdant relance la mèche suivante ; la durée de la mèche n'est connue que du téléphone, le temps de la manche.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Av, nickOf, Who, Stamp } from '../ui/common.jsx';
import { plural, shuffle } from '../lib/util.js';
import { CONSIGNES } from '../content/bombe.js';
import { Arena, blip, boomSound, buzz, fast, rand, tnow, unlockAudio } from './arcade.jsx';

const FUSES = { courte: [12, 25], normale: [20, 45], longue: [35, 70] };
const nextOf = (pl, u) => pl[(pl.indexOf(u) + 1) % pl.length];
function stat(g, u) { g.stats[u] = g.stats[u] || { booms: 0, passes: 0 }; return g.stats[u]; }
function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.summary = { rows: g.pl.map((u) => ({ u, ...stat(g, u) })).sort((a, b) => a.booms - b.booms || b.passes - a.passes) };
}

const BOMBE = {
  id: 'bombe',
  name: 'Bombe',
  tagline: 'Le téléphone passe de main en main avec une consigne. Mèche cachée : celui qui le tient quand ça explose prend la pénalité.',
  min: 2,
  local: true,
  solo: true,
  rules: [
    'On allume la mèche : sa durée est cachée.',
    'Celui qui tient le téléphone lit la consigne (« un pays en B », « une marque de bière »…), répond à voix haute, puis touche « Je passe » et donne le téléphone à son voisin.',
    'Le téléphone tourne dans le sens des aiguilles d’une montre. Le tic-tac accélère…',
    'Celui qui tient le téléphone quand la bombe explose prend la pénalité, et rallume la mèche suivante.',
  ],
  options: [
    { id: 'sips', label: 'Pénalité', choices: [[2, '2 gorgées'], [3, '3 gorgées'], [5, '5 gorgées']], def: 3 },
    { id: 'fuse', label: 'Mèche', choices: [['courte', 'Courte'], ['normale', 'Normale'], ['longue', 'Longue']], def: 'normale' },
  ],

  start(c) {
    const pl = c.activeUids();
    const g = { pl, first: pl[0], step: 1, phase: 'ready', res: null, stats: {}, hist: [] };
    pl.forEach((u) => stat(g, u));
    c.g = g;
    c.S.game.g = g;
    return g;
  },

  request() { return null; },
  input() { return false; },

  actions({ g }) {
    const out = [];
    if (g.phase === 'result') out.push({ id: 'next', label: 'Rallumer une mèche', primary: true });
    if (g.phase !== 'end') out.push({ id: 'end', label: 'Terminer', confirm: 'Terminer la Bombe et voir le rapport ?' });
    return out;
  },

  act(c, id, arg) {
    const g = c.g;
    if (id === 'boom' && g.phase === 'ready' && arg && arg.step === g.step && g.pl.includes(arg.holder)) {
      const passes = Math.max(0, Math.min(500, Math.floor(Number(arg.passes) || 0)));
      // qui a passé le téléphone pendant la manche (dans l'ordre, depuis le premier)
      let u = g.first;
      for (let i = 0; i < passes; i++) { stat(g, u).passes += 1; u = nextOf(g.pl, u); }
      const holder = arg.holder;
      stat(g, holder).booms += 1;
      if (c.count) c.count(holder, 'boom');
      const n = c.opts.sips || 3;
      c.pen(holder, n, 'Bombe : elle t’a explosé dans les mains');
      g.res = { holder, passes, n, t: c.now() };
      g.hist.push({ holder, passes });
      if (g.hist.length > 30) g.hist.shift();
      g.first = holder; // le perdant rallume la mèche
      g.phase = 'result';
      return true;
    }
    if (id === 'next' && g.phase === 'result') { g.step += 1; g.res = null; g.phase = 'ready'; return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'ready' ? g.first : null; },
  Table,
  Act: () => null,
};
export default BOMBE;

// ------------------------------------------------------------------ la mèche, en plein écran
function Fuse({ S, g, opts, onBoom }) {
  const [holder, setHolder] = useState(g.first);
  const [passes, setPasses] = useState(0);
  const [boom, setBoom] = useState(false);
  const [beat, setBeat] = useState(0);
  const deck = useRef(shuffle(CONSIGNES.slice()));
  const [prompt, setPrompt] = useState(() => deck.current.pop());
  const st = useRef({ holder: g.first, passes: 0 });
  useEffect(() => {
    const [lo, hi] = FUSES[opts.fuse] || FUSES.normale;
    const total = (fast() ? 2.5 : rand(lo, hi)) * 1000;
    const t0 = tnow();
    let tick = 0;
    const loop = () => {
      const p = Math.min(1, (tnow() - t0) / total);
      if (p >= 1) {
        setBoom(true);
        boomSound();
        buzz([400, 80, 250]);
        setTimeout(() => onBoom({ holder: st.current.holder, passes: st.current.passes }), fast() ? 900 : 1800);
        return;
      }
      setBeat((b) => b + 1);
      blip(p > 0.8 ? 1500 : 1100, 0.035, 'square', 0.04);
      if (p > 0.5) buzz(15);
      // de 0,9 s à 0,15 s entre deux tic-tac
      tick = setTimeout(loop, Math.max(150, 900 - 750 * p ** 1.4));
    };
    tick = setTimeout(loop, 400);
    return () => clearTimeout(tick);
  }, []);
  const pass = () => {
    if (boom) return;
    const next = nextOf(g.pl, st.current.holder);
    st.current = { holder: next, passes: st.current.passes + 1 };
    setHolder(next);
    setPasses(st.current.passes);
    if (!deck.current.length) deck.current = shuffle(CONSIGNES.slice());
    setPrompt(deck.current.pop());
    buzz(25);
  };
  return (
    <Arena cls={`bombe-arena${boom ? ' is-boom' : ''}`} label="Bombe" state={boom ? 'boom' : 'tic'}>
      {boom ? (
        <div class="boom" role="alert">
          <span class="boom-flash" aria-hidden="true" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} class="boom-bit" style={{ '--r': `${i * 45}deg` }} aria-hidden="true" />)}
          <p class="boom-word">BOUM !</p>
          <p class="boom-who"><Av p={S.roster[holder]} size="l" /> {nickOf(S, holder)}</p>
        </div>
      ) : (
        <>
          <p class="bombe-who"><Av p={S.roster[holder]} size="m" /> <b>{nickOf(S, holder)}</b></p>
          <div class="bombe-icon" key={beat} aria-hidden="true"><span class="bombe-ball" /><span class="bombe-meche" /></div>
          <p class="bombe-consigne" aria-live="polite">{prompt}</p>
          <button type="button" class="btn btn-main btn-big btn-wide bombe-pass" onClick={pass}>Je passe</button>
          <p class="muted small">{plural(passes, 'passage', 'passages')} · au voisin dans le sens des aiguilles d’une montre</p>
        </>
      )}
    </Arena>
  );
}

function Table({ S, g, uid, dev }) {
  const [run, setRun] = useState(false);
  useEffect(() => { setRun(false); }, [g.step]);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  return (
    <div class="bombe">
      {run && g.phase === 'ready' ? (
        <Fuse S={S} g={g} opts={S.game.opts || {}} key={g.step}
          onBoom={(r) => dev.host('game', { id: 'boom', arg: { step: g.step, ...r } })} />
      ) : null}
      <div class="duel-card paper tape pose">
        {g.phase === 'ready' ? (
          <>
            <p class="bombe-who"><Av p={S.roster[g.first]} size="l" /> <span><span class="muted small">Commence</span><b>{nickOf(S, g.first)}</b></span></p>
            <p class="muted">Réponds à la consigne à voix haute, touche « Je passe » et donne le téléphone à ton voisin. Personne ne sait quand ça explose.</p>
            <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => { unlockAudio(); setRun(true); }}>Allumer la mèche</button>
          </>
        ) : null}
        {g.phase === 'result' && g.res ? (
          <div class="duel-res">
            <Stamp>Boum</Stamp>
            <p>La bombe a explosé dans les mains de <b>{nickOf(S, g.res.holder)}</b> après {plural(g.res.passes, 'passage', 'passages')}.</p>
            <p class="muted">{nickOf(S, g.res.holder)} prend {plural(g.res.n, 'gorgée', 'gorgées')}, et rallume la mèche.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = (g.summary && g.summary.rows) || [];
  return (
    <div class="end">
      <h3 class="end-title">Bilan des explosions</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Explosions</th><th>Passages</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.booms}</td><td>{r.passes}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
