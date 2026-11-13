// Dégaine — duel de réflexes à deux, sur un seul téléphone posé entre les joueurs (demande de Thierry) :
// • Écran coupé en deux, une moitié par joueur. « Attends… » puis « TAPE ! » après un délai aléatoire.
// • Le plus rapide gagne. Celui qui tape trop tôt perd direct. Le perdant prend la pénalité.
// Choix techniques : les duels tournent dans l'ordre des places (1 contre 2, 2 contre 3…) ;
// le temps de réaction est mesuré sur le téléphone (performance.now), le moteur applique la pénalité.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Av, nickOf, Who, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';
import { Arena, blip, buzz, fast, rand, tnow, unlockAudio } from './arcade.jsx';

function pairOf(g) {
  const n = g.pl.length;
  const i = g.round % n;
  return [g.pl[i], g.pl[(i + 1) % n]];
}
function stat(g, u) {
  g.stats[u] = g.stats[u] || { duels: 0, wins: 0, early: 0, best: null };
  return g.stats[u];
}
function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.summary = { rows: g.pl.map((u) => ({ u, ...stat(g, u) })).sort((a, b) => b.wins - a.wins || (a.best || 9e9) - (b.best || 9e9)) };
}

const DEGAINE = {
  id: 'degaine',
  name: 'Dégaine',
  tagline: 'Duel de réflexes à deux, le téléphone posé entre vous. Au signal « TAPE ! », le plus rapide gagne.',
  min: 2,
  local: true,
  solo: true,
  rules: [
    'Deux joueurs s’affrontent, le téléphone posé à plat entre eux : l’écran est coupé en deux, une moitié chacun.',
    '« Attends… » s’affiche, puis « TAPE ! » après un délai au hasard.',
    'Le premier qui tape sa moitié après le signal gagne. Celui qui tape trop tôt perd direct.',
    'Le perdant prend la pénalité. Les duels tournent dans l’ordre des places.',
  ],
  options: [
    { id: 'sips', label: 'Le perdant prend', choices: [[1, '1 gorgée'], [2, '2 gorgées'], [3, '3 gorgées']], def: 2 },
  ],

  start(c) {
    const pl = c.activeUids();
    const g = { pl, round: 0, step: 1, phase: 'ready', duel: null, res: null, stats: {}, hist: [] };
    g.duel = pairOf(g);
    pl.forEach((u) => stat(g, u));
    c.g = g;
    c.S.game.g = g;
    return g;
  },

  request() { return null; },
  input() { return false; },

  actions({ g }) {
    const out = [];
    if (g.phase === 'result') out.push({ id: 'next', label: 'Duel suivant', primary: true });
    if (g.phase === 'ready' && g.pl.length > 2) out.push({ id: 'skip', label: 'Passer ce duel' });
    if (g.phase !== 'end') out.push({ id: 'end', label: 'Terminer', confirm: 'Terminer Dégaine et voir le rapport ?' });
    return out;
  },

  act(c, id, arg) {
    const g = c.g;
    if (id === 'duel' && g.phase === 'ready' && arg && arg.step === g.step) {
      const [a, b] = g.duel;
      if (arg.winner !== a && arg.winner !== b) return false;
      const winner = arg.winner;
      const loser = winner === a ? b : a;
      const early = !!arg.early;
      const ms = !early && Number.isFinite(arg.ms) && arg.ms > 0 && arg.ms < 10000 ? Math.round(arg.ms) : null;
      const other = !early && Number.isFinite(arg.other) && arg.other > 0 && arg.other < 10000 ? Math.round(arg.other) : null;
      const sw = stat(g, winner);
      const sl = stat(g, loser);
      sw.duels += 1; sl.duels += 1; sw.wins += 1;
      if (early) sl.early += 1;
      if (ms && (sw.best == null || ms < sw.best)) sw.best = ms;
      if (other && (sl.best == null || other < sl.best)) sl.best = other;
      if (ms && c.record) c.record(winner, 'degaine', ms, true); // meilleur temps de réaction de la soirée
      if (c.count) { c.count(winner, 'duelWon'); c.count(loser, 'duelLost'); if (early) c.count(loser, 'early'); }
      const n = c.opts.sips || 2;
      c.pen(loser, n, early ? 'Dégaine : tapé trop tôt' : `Dégaine : battu par ${c.name(winner)}`);
      g.res = { winner, loser, early, ms, other, n, t: c.now() };
      g.hist.push({ winner, loser, early, ms });
      if (g.hist.length > 30) g.hist.shift();
      g.phase = 'result';
      return true;
    }
    if ((id === 'next' && g.phase === 'result') || (id === 'skip' && g.phase === 'ready')) {
      g.round += 1;
      g.step += 1;
      g.duel = pairOf(g);
      g.res = null;
      g.phase = 'ready';
      return true;
    }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf() { return null; },
  Table,
  Act: () => null,
};
export default DEGAINE;

// ------------------------------------------------------------------ duel en plein écran
function Duel({ S, a, b, onDone, onCancel }) {
  const [phase, setPhase] = useState('wait'); // wait → go → done
  const [res, setRes] = useState(null);
  const ref = useRef({ go: 0, first: null, timer: 0, tail: 0, firstMs: 0 });
  useEffect(() => {
    const r = ref.current;
    r.timer = setTimeout(() => {
      r.go = tnow();
      setPhase('go');
      blip(1320, 0.12, 'square', 0.07);
      buzz(60);
      // personne ne tape : on annule ce duel
      r.tail = setTimeout(() => { if (!r.first) onCancel(); }, fast() ? 2500 : 6000);
    }, fast() ? 400 : rand(1600, 5200));
    return () => { clearTimeout(r.timer); clearTimeout(r.tail); };
  }, []);
  const tap = (who) => (e) => {
    e.preventDefault();
    const r = ref.current;
    if (r.done) {
      // le second joueur, pour afficher son temps
      if (r.first && who !== r.first && !r.second && r.go) { r.second = tnow() - r.go; setRes((x) => (x ? { ...x, other: Math.round(r.second) } : x)); }
      return;
    }
    const other = who === a ? b : a;
    if (!r.go) {
      r.done = true; r.first = who;
      clearTimeout(r.timer);
      const out = { winner: other, early: true, faute: who };
      setRes(out); setPhase('done');
      buzz([120, 60, 120]); blip(160, 0.3, 'sawtooth', 0.06);
      setTimeout(() => onDone(out), fast() ? 300 : 1600);
      return;
    }
    r.done = true; r.first = who;
    clearTimeout(r.tail);
    const ms = tnow() - r.go;
    const out = { winner: who, early: false, ms: Math.round(ms) };
    setRes(out); setPhase('done');
    buzz([40, 30, 40]); blip(990, 0.08, 'triangle', 0.06);
    setTimeout(() => onDone({ ...out, other: r.second ? Math.round(r.second) : undefined }), fast() ? 300 : 1600);
  };
  const half = (u, cls) => {
    let txt = phase === 'wait' ? 'Attends…' : phase === 'go' ? 'TAPE !' : '';
    if (phase === 'done' && res) {
      if (res.early) txt = res.faute === u ? 'Trop tôt !' : 'Gagné !';
      else txt = res.winner === u ? `Gagné ! ${res.ms} ms` : 'Trop lent…';
    }
    return (
      <button type="button" class={`duel-half ${cls}${phase === 'go' ? ' is-go' : ''}${phase === 'done' && res && res.winner === u ? ' is-win' : ''}`}
        onPointerDown={tap(u)} aria-label={`Moitié de ${nickOf(S, u)}`}>
        <span class="duel-who"><Av p={S.roster[u]} size="m" /> {nickOf(S, u)}</span>
        <span class="duel-txt">{txt}</span>
      </button>
    );
  };
  return (
    <Arena cls="duel" label={`Duel : ${nickOf(S, a)} contre ${nickOf(S, b)}`} state={phase}>
      {half(a, 'a')}
      <span class="duel-mid" aria-hidden="true" />
      {half(b, 'b')}
    </Arena>
  );
}

function Table({ S, g, uid, dev }) {
  const [run, setRun] = useState(false);
  useEffect(() => { setRun(false); }, [g.step]);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const [a, b] = g.duel;
  return (
    <div class="degaine">
      {run && g.phase === 'ready' ? (
        <Duel S={S} a={a} b={b} key={g.step}
          onDone={(r) => { dev.host('game', { id: 'duel', arg: { step: g.step, ...r } }); }}
          onCancel={() => setRun(false)} />
      ) : null}
      <div class="duel-card paper tape pose">
        <p class="duel-vs"><span><Av p={S.roster[a]} size="l" /><b>{nickOf(S, a)}</b></span><em>contre</em><span><Av p={S.roster[b]} size="l" /><b>{nickOf(S, b)}</b></span></p>
        {g.phase === 'ready' ? (
          <>
            <p class="muted">Posez le téléphone à plat entre vous : {nickOf(S, a)} prend la moitié du haut, {nickOf(S, b)} celle du bas. On ne touche à rien avant « TAPE ! ».</p>
            <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => { unlockAudio(); setRun(true); }}>Lancer le duel</button>
          </>
        ) : null}
        {g.phase === 'result' && g.res ? (
          <div class="duel-res">
            <Stamp>{g.res.early ? 'Trop tôt' : `${g.res.ms} ms`}</Stamp>
            <p>{g.res.early
              ? <><b>{nickOf(S, g.res.loser)}</b> a tapé avant le signal : <b>{nickOf(S, g.res.winner)}</b> gagne.</>
              : <><b>{nickOf(S, g.res.winner)}</b> dégaine en {g.res.ms} ms{g.res.other ? <> (contre {g.res.other} ms)</> : null}.</>}</p>
            <p class="muted">{nickOf(S, g.res.loser)} prend {plural(g.res.n, 'gorgée', 'gorgées')}.</p>
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
      <h3 class="end-title">Bilan des duels</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Duels</th><th>Gagnés</th><th>Trop tôt</th><th>Record</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.duels}</td><td>{r.wins}</td><td>{r.early}</td><td>{r.best ? `${r.best} ms` : '—'}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
