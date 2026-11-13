// Écrans de la soirée : salle d'attente, jeu en cours, pénalités, menu.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import qrcode from 'qrcode-generator';
import { GAMES, GAME_LIST, GAME_META, CATS, catsOf } from '../games/index.js';
import { GameArt } from './gameart.jsx';
import { seats, sipsOf, csValue } from '../core/host.js';
import { plural } from '../lib/util.js';
import { Av, Who, nickOf, Sheet, ErrorBoundary, Waiting, useTicker, Stamp, Ribbon, Turn, Rules, MoodCtx } from './common.jsx';
import { Icon } from './icons.jsx';
import { buzz, confetti, useOnce, Ambiance } from './fx.jsx';
import { saveEvening, summarize } from '../lib/stats.js';
import { WrappedView } from './wrapped.jsx';
import { GagesEditor } from './stats.jsx';
import { Mentions, Confidentialite } from './legal.jsx';
import { PrefToggles } from './prefs.jsx';
import { ProfileFields, Seg, PartyFields, AdultPacks, defaultProfile, penMode } from './screens.jsx';

// ------------------------------------------------------------------ utilitaires
export function isOnline(dev, uid, local) {
  if (local) return true;
  const p = dev.players[uid];
  return !!(p && p.online);
}

export function QRBlock({ code }) {
  const url = useMemo(() => {
    try { return `${location.origin}${location.pathname}#${code}`; } catch (e) { return code; }
  }, [code]);
  const svg = useMemo(() => {
    try {
      const q = qrcode(0, 'M');
      q.addData(url);
      q.make();
      // encre sur papier (le QR code reste lisible : contraste 13:1)
      return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, title: `Rejoindre la soirée ${code}` })
        .replace(/fill="#000000"/g, 'fill="#22201C"').replace(/fill="#ffffff"/gi, 'fill="#F2EADB"');
    } catch (e) { return ''; }
  }, [url]);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }, () => {});
    } catch (e) { /* ignoré */ }
  };
  return (
    <div class="invite paper tape tilt-a">
      <div class="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div class="invite-txt">
        <span class="muted">Code de la soirée</span>
        <span class="code">{code}</span>
        <span class="muted small">Scanne le QR code ou tape le code dans « Rejoindre ».</span>
        <button type="button" class="btn btn-small" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
      </div>
    </div>
  );
}

export function Toasts({ dev }) {
  if (!dev.toasts.length) return null;
  return (
    <div class="toasts" role="status" aria-live="polite">
      {dev.toasts.map((t) => <div key={t.id} class={`toast toast-${t.k}`}>{t.txt}</div>)}
    </div>
  );
}

// bannière « l'hôte est parti » affichée seulement après quelques secondes d'absence
function useHostAway(dev) {
  const away = !!(dev.meta && !dev.isHost && dev.players[dev.meta.host] && dev.players[dev.meta.host].online === false);
  const [since, setSince] = useState(null);
  useEffect(() => { setSince(away ? Date.now() : null); }, [away]);
  useTicker(away, 1000);
  return away && since && Date.now() - since > 4000;
}

// ------------------------------------------------------------------ soirée
export function Party({ dev, local, embedded = false }) {
  const S = dev.S;
  const [menu, setMenu] = useState(null);
  const hostAway = useHostAway(dev);
  // stats de la soirée, gardées sur le téléphone de l'hôte (ou le téléphone unique), jamais dans la démo
  const keep = !!S && (local || dev.isHost) && dev.mode !== 'demo';
  const sig = S ? `${S.status}|${(S.played || []).length}|${JSON.stringify(S.tally)}|${JSON.stringify(S.rec || {})}` : '';
  useEffect(() => { if (keep) { try { saveEvening(S, local ? 'local' : 'salon'); } catch (e) { /* stockage plein */ } } }, [keep, sig]);
  // un jeu qui démarre (ou le retour au choix des jeux) s’affiche depuis le haut, avant d’être dessiné
  const scene = S && S.status === 'game' && S.game ? `g${S.game.seq}` : 'lobby';
  useLayoutEffect(() => { try { if (!embedded && window.scrollY) window.scrollTo(0, 0); } catch (e) { /* ignoré */ } }, [scene]);
  if (!S) return <div class="screen"><h1 class="visually-hidden">Hors Service</h1><Waiting>Redémarrage…</Waiting></div>;
  const inGame = S.status === 'game' && S.game;
  const G = inGame ? GAMES[S.game.id] : null;
  // les personnages réagissent : dépités avec une pénalité en attente, contents quand ils distribuent
  const moods = new Map();
  for (const x of S.pen) if (S.roster[x.uid]) moods.set(S.roster[x.uid], 'drink');
  for (const x of S.gifts) if (S.roster[x.uid]) moods.set(S.roster[x.uid], 'win');
  return (
    <MoodCtx.Provider value={moods}>
    <div class="party">
      <Ambiance game={inGame ? tintKey(S) : null} />
      <header class="topbar">
        <button type="button" class="topbar-code" onClick={() => setMenu('invite')} aria-label={local ? 'Joueurs' : `Inviter des joueurs, code ${S.code}`}>
          {local ? 'Un seul téléphone' : <>Soirée <b>{S.code}</b></>}
        </button>
        <span class={`net${dev.conn ? '' : ' is-off'}`}>{dev.conn ? (dev.isHost && !local ? 'Hôte' : 'En service') : 'Hors ligne'}</span>
        <button type="button" class="icon-btn" onClick={() => setMenu('menu')} aria-label="Menu"><Icon name="menu" /></button>
      </header>
      {!dev.conn ? (
        <div class="banner banner-warn" role="alert">
          <span class="banner-t"><Icon name="alert" /> Connexion perdue. La partie reprendra où elle en était.</span>
          <button type="button" class="btn btn-small" onClick={() => dev.retryConnection()}><Icon name="retry" size={20} /> Réessayer</button>
        </div>
      ) : null}
      {dev.conn && dev.isHost && !dev.sync ? <div class="banner banner-warn" role="status"><span class="banner-t"><Icon name="alert" /> Synchronisation difficile, nouvel essai en cours.</span></div> : null}
      {hostAway ? (
        <div class="banner">
          <span>{dev.canTakeOver === false ? 'L’hôte n’est plus connecté : il revient tout seul, la partie l’attend.' : 'L’hôte n’est plus connecté.'}</span>
          {dev.canTakeOver === false ? null : <button type="button" class="btn btn-small" onClick={() => dev.takeOver()}>Reprendre l’animation</button>}
        </div>
      ) : null}

      <main class="party-main ecran" key={inGame ? `jeu${S.game.seq}` : 'salle'}>
        {inGame ? <GameScreen dev={dev} S={S} G={G} local={local} /> : <Lobby dev={dev} S={S} local={local} />}
      </main>
      <Moments dev={dev} S={S} local={local} />

      <PenaltyDock dev={dev} S={S} local={local} />

      {menu === 'menu' ? <MenuSheet dev={dev} S={S} local={local} onClose={() => setMenu(null)} /> : null}
      {menu === 'invite' && !local ? (
        <Sheet title="Inviter des joueurs" onClose={() => setMenu(null)}><QRBlock code={S.code} /></Sheet>
      ) : null}
      {menu === 'invite' && local ? (
        <Sheet title="Joueurs" onClose={() => setMenu(null)}><LocalPlayersEditor local={local} S={S} /></Sheet>
      ) : null}
    </div>
    </MoodCtx.Provider>
  );
}

// ------------------------------------------------------------------ moments forts
// Vibration quand une pénalité tombe ou quand c'est ton tour, confettis quand tu distribues ou en fin de partie.
function Moments({ dev, S, local }) {
  const mine = local ? new Set(seats(S)) : new Set([dev.uid]);
  const pen = S.pen.filter((x) => mine.has(x.uid)).slice(-1)[0];
  const gift = S.gifts.filter((x) => mine.has(x.uid)).slice(-1)[0];
  const g = S.status === 'game' && S.game ? S.game.g : null;
  const G = g ? GAMES[S.game.id] : null;
  const req = !local && g && G ? G.request({ S, g, secret: dev.secret, uid: dev.uid, now: dev.backend.now(), local: false }) : null;
  useOnce(pen ? `pen:${pen.id}` : null, () => buzz(pen.cs ? [120, 60, 120] : 70));
  useOnce(gift ? `gift:${gift.id}` : null, () => { buzz([30, 40, 30]); confetti(22); });
  useOnce(req && !req.optional ? `tour:${S.game.seq}:${req.k}:${dev.uid}` : null, () => buzz(25));
  useOnce(g && g.phase === 'end' ? `fin:${S.code}:${S.game.seq}` : null, () => confetti(34));
  return null;
}

// ------------------------------------------------------------------ salle d'attente
function Register({ dev, S, local, list }) {
  const me = local ? null : dev.uid;
  return (
    <section class="register">
      <h2>Registre <span class="count">{list.length}</span></h2>
      <ul class="players">
        {list.map((u, i) => {
          const p = S.roster[u];
          const on = isOnline(dev, u, local);
          return (
            <li key={u} class={`player${on ? '' : ' is-off'}`}>
              <span class="player-n">{String(i + 1).padStart(2, '0')}</span>
              <Av p={p} size="m" dim={!on} />
              <span class="player-name">{p.nick}{u === me ? <em class="you">toi</em> : null}{u === S.host && !local ? <em class="tag">hôte</em> : null}</span>
              <span class="player-meta">{penMode(p)}{on ? '' : <><br />hors ligne</>}</span>
            </li>
          );
        })}
      </ul>
      {list.length < 2 && !local ? <p class="empty">Personne en vue. Montre le QR code.</p> : null}
    </section>
  );
}

// Carrousel des jeux : au doigt on glisse ; à la souris, flèches, molette et cliquer-glisser
function useRail() {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const upd = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    upd();
    // molette verticale → défilement horizontal (souris sans molette latérale)
    const wheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // au bout du carrousel, la page défile normalement
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'auto' });
    };
    // cliquer-glisser à la souris (le toucher garde le défilement natif)
    let drag = null;
    const down = (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { x: e.clientX, left: el.scrollLeft, moved: false }; };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; el.classList.add('is-drag'); }
      if (drag.moved) el.scrollLeft = drag.left - dx;
    };
    const up = () => { if (drag && drag.moved) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; el.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 0); } drag = null; el.classList.remove('is-drag'); };
    el.addEventListener('scroll', upd, { passive: true });
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('resize', upd);
    return () => {
      el.removeEventListener('scroll', upd);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('resize', upd);
    };
  }, []);
  const step = (dir) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector('.gcard');
    const w = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * w * Math.max(1, Math.floor(el.clientWidth / w)), behavior: 'smooth' });
  };
  return { ref, edge, step };
}

const CAT_KEY = 'hs:cat';
function loadCat() { try { return localStorage.getItem(CAT_KEY) || 'tous'; } catch (e) { return 'tous'; } }
function Lobby({ dev, S, local }) {
  const rail = useRail();
  const [cat, setCatState] = useState(loadCat);
  const setCat = (v) => { setCatState(v); try { localStorage.setItem(CAT_KEY, v); } catch (e) { /* stockage bloqué */ } if (rail.ref.current) rail.ref.current.scrollLeft = 0; };
  const shown = cat === 'tous' ? GAME_LIST : GAME_LIST.filter((G) => catsOf(G).includes(cat));
  const [sheet, setSheet] = useState(null);
  const list = seats(S);
  const active = list.filter((u) => isOnline(dev, u, local)).length;
  return (
    <div class="lobby stack">
      <h1>Soirée en service</h1>
      {!local && dev.isHost ? <QRBlock code={S.code} /> : null}
      <Register dev={dev} S={S} local={local} list={list} />
      {!local && !dev.isHost ? <p class="muted">L’hôte choisit le jeu. Tu peux lire les règles en attendant.</p> : null}
      <SpicySwitch dev={dev} S={S} local={local} />
      <section class="sec games-sec">
        <div class="games-h">
          <h2>Jeux</h2>
          <label class="cat-pick"><span class="visually-hidden">Catégorie</span>
            <select class="cat-select" value={cat} onChange={(e) => setCat(e.currentTarget.value)}>
              <option value="tous">Tous les jeux ({GAME_LIST.length})</option>
              {CATS.map(([id, label]) => { const n = GAME_LIST.filter((G) => catsOf(G).includes(id)).length; return n ? <option key={id} value={id}>{label} ({n})</option> : null; })}
            </select>
          </label>
          <span class="muted small games-tip">Glisse, puis touche un jeu</span>
          <span class="rail-nav">
            <button type="button" class="icon-btn" aria-label="Jeux précédents" disabled={rail.edge.start} onClick={() => rail.step(-1)}><Icon name="back" /></button>
            <button type="button" class="icon-btn rail-next" aria-label="Jeux suivants" disabled={rail.edge.end} onClick={() => rail.step(1)}><Icon name="back" /></button>
          </span>
        </div>
        <div class="games-rail" ref={rail.ref}>
          {shown.map((G) => {
            const m = GAME_META[G.id];
            const ban = local && G.local === false ? 'Un téléphone par joueur' : !local && G.solo ? 'Sur un seul téléphone' : active < G.min ? `Il faut ${G.min} joueurs` : null;
            return (
              <button type="button" key={G.id} class={`gcard${ban ? ' is-off' : ''}`} style={{ '--c': m.color, '--n': Number(m.no) }} onClick={() => setSheet(G.id)}
                aria-label={`Jeu ${m.no}, ${G.name}${ban ? `, ${ban}` : ''}`}>
                <span class="gcard-art"><GameArt id={G.id} color={m.color} />{ban ? <span class="tile-ban" aria-hidden="true"><span>{ban}</span></span> : null}</span>
                <span class="gcard-no">{m.no}</span>
                <span class="gcard-body">
                  <span class="gcard-name">{G.name}</span>
                  <span class="gcard-min">{`${G.min}+ joueurs${G.solo ? ' · un seul téléphone' : ''}`}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      {S.hist && S.hist.length ? (
        <section class="sec hist-sec">
          <p class="muted small hist-line">Déjà joué : {S.hist.slice().reverse().slice(0, 6).map((h) => (GAMES[h.id] ? GAMES[h.id].name : h.id)).join(', ')}</p>
        </section>
      ) : null}
      {sheet ? <GameSheet dev={dev} S={S} G={GAMES[sheet]} local={local} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

// Interrupteur « Mode Cul et HARD », en vue dans le salon (plus besoin d'aller dans le menu).
// L'activer passe aussi l'ambiance de la soirée en « Piquant » ; chacun garde ses propres limites.
function SpicySwitch({ dev, S, local }) {
  const [ask, setAsk] = useState(false);
  const on = !!S.cfg.adult;
  const host = !!local || dev.isHost;
  const low = seats(S).filter((u) => (S.roster[u].lim || 3) < 3);
  const flip = () => { if (!host) return; if (on) dev.host('settings', { adult: false }); else setAsk(true); };
  return (
    <div class={`spicy${on ? ' is-on' : ''}`}>
      <button type="button" class="spicy-btn" role="switch" aria-checked={on ? 'true' : 'false'} disabled={!host} onClick={flip}>
        <span class="spicy-knob" aria-hidden="true" />
        <span class="spicy-t">Mode Cul et HARD</span>
        <span class="spicy-s">{on ? 'Activé' : 'Désactivé'}</span>
      </button>
      {on && low.length ? <p class="small spicy-h">Limites plus basses pour {low.map((u) => S.roster[u].nick).join(', ')} : ces paquets restent fermés tant qu’ils n’ont pas mis « Piquant ».</p> : null}
      {!host && !on ? <p class="small spicy-h">Seul l’hôte peut l’activer.</p> : null}
      {ask ? (
        <div class="quit paper tape pose" role="alertdialog" aria-label="Activer le mode Cul et HARD ?">
          <p><b>Activer le mode Cul et HARD ?</b> Questions sexuelles et humour sur des situations limites, entre adultes. Tout le monde à la table est d’accord ?</p>
          <div class="bus-btns two">
            <button type="button" class="btn" onClick={() => setAsk(false)}>Annuler</button>
            <button type="button" class="btn btn-main" onClick={() => { setAsk(false); dev.host('settings', { adult: true, level: 3 }); }}>Oui, activer</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function GameSheet({ dev, S, G, local, onClose }) {
  const [opts, setOpts] = useState(() => Object.fromEntries((G.options || []).map((o) => [o.id, o.def])));
  const present = seats(S).filter((u) => isOnline(dev, u, local));
  const active = present.length;
  // niveau effectif : ambiance de la soirée et limite la plus basse des joueurs présents
  const level = Math.min(S.cfg.level, ...present.map((u) => (S.roster[u] && S.roster[u].lim) || 3));
  const enough = active >= G.min;
  const blocked = (local && G.local === false) || (!local && !!G.solo);
  // choix multiples : on n’envoie que les choix ouverts à cette table (il en faut au moins un)
  const openOf = (o, v) => {
    const ch = o.choices.find((x) => x[0] === v);
    return !!ch && (ch[2] || 1) <= level && !(ch[3] === 'adult' && !S.cfg.adult);
  };
  const multiOk = (G.options || []).every((o) => !o.multi || opts[o.id].some((v) => openOf(o, v)));
  const launchOpts = () => Object.fromEntries(Object.entries(opts).map(([k, v]) => {
    const o = (G.options || []).find((x) => x.id === k);
    return [k, o && o.multi ? v.filter((x) => openOf(o, x)) : v];
  }));
  return (
    <Sheet title={G.name} onClose={onClose} side>
      <div class="side-art" style={{ '--c': GAME_META[G.id].color }}><GameArt id={G.id} color={GAME_META[G.id].color} /></div>
      <p class="sheet-tag">{G.tagline}</p>
      <p class="muted small">{G.min} joueurs minimum{G.solo ? ' · un seul téléphone' : ''}{G.local === false ? ' · un téléphone chacun' : ''}</p>
      <details class="rules-fold">
        <summary>Règles du jeu</summary>
        <Rules G={G} />
      </details>
      {dev.isHost ? (
        <>
          {(G.options || []).map((o) => {
            const needOf = (v) => { const ch = o.choices.find((x) => x[0] === v); return ch && ch[2] ? ch[2] : 1; };
            const adultOff = (v) => { const ch = o.choices.find((x) => x[0] === v); return !!ch && ch[3] === 'adult' && !S.cfg.adult; };
            const locked = o.choices.some((ch) => ch[2] && ch[2] > level);
            const adultLocked = o.choices.some((ch) => ch[3] === 'adult') && !S.cfg.adult;
            const off = (v) => needOf(v) > level || adultOff(v);
            return (
              <div class="field" key={o.id}>
                <span class="field-l">{o.label}</span>
                {o.multi ? (
                  // plusieurs choix à la fois (ex. niveaux de « Je n’ai jamais ») : les cartes se mélangent
                  <div class="multi" role="group" aria-label={o.label}>
                    {o.choices.map((ch) => {
                      const on = opts[o.id].includes(ch[0]) && !off(ch[0]);
                      return (
                        <button type="button" key={ch[0]} class={`multi-btn${on ? ' is-on' : ''}`} aria-pressed={on ? 'true' : 'false'} disabled={off(ch[0])}
                          onClick={() => setOpts({ ...opts, [o.id]: on ? opts[o.id].filter((x) => x !== ch[0]) : [...opts[o.id], ch[0]] })}>
                          <span class="multi-box" aria-hidden="true" />{ch[1]}
                        </button>
                      );
                    })}
                  </div>
                ) : <Seg name={o.label} value={opts[o.id]} onChange={(v) => setOpts({ ...opts, [o.id]: v })} options={o.choices} off={off} />}
                {o.multi && !opts[o.id].some((v) => !off(v)) ? <span class="field-h">Coche au moins un niveau.</span> : null}
                {adultLocked ? <span class="field-h">Cul et HARD sont désactivés : l’hôte les active avec l’interrupteur « Mode Cul et HARD » du salon.</span> : null}
                {locked && !adultLocked ? <span class="field-h">Certains paquets demandent que tout le monde ait réglé ses limites sur « Piquant », et une ambiance « Piquant » pour la soirée.</span> : null}
              </div>
            );
          })}
          {blocked && G.solo ? <p class="panel panel-warn">Ce jeu se joue sur un seul téléphone, posé ou passé de main en main : lance-le en mode « Un téléphone qui tourne ».</p> : null}
          {blocked && !G.solo ? <p class="panel panel-warn">Ce jeu se joue avec un téléphone par joueur. Il n’est pas disponible sur un seul téléphone.</p> : null}
          {!enough && !blocked ? <p class="panel panel-warn">Il faut au moins {G.min} joueurs connectés ({active} pour l’instant).</p> : null}
          <button type="button" class="btn btn-main btn-big btn-wide" disabled={!enough || blocked || !multiOk}
            onClick={() => { dev.host('start', { id: G.id, opts: launchOpts() }); onClose(); }}>Lancer {G.name}</button>
        </>
      ) : <p class="muted">L’hôte lancera le jeu.</p>}
    </Sheet>
  );
}

// teinte du décor : celle du jeu, ou celle que le jeu choisit pour l’instant présent (ex. niveau de la carte)
export function tintKey(S) {
  const G = S && S.game ? GAMES[S.game.id] : null;
  if (!G) return null;
  try { return G.tintOf && S.game.g ? G.tintOf(S.game.g) : G.id; } catch (e) { return G.id; }
}

// ------------------------------------------------------------------ jeu en cours
function GameScreen({ dev, S, G, local }) {
  const g = S.game ? S.game.g : null; // l'état peut changer pendant un rendu (retour au salon)
  const [rules, setRules] = useState(false);
  const [quit, setQuit] = useState(false);
  if (!G || !g) return <Waiting>Redémarrage du jeu…</Waiting>;
  const m = GAME_META[G.id];
  const uid = local ? null : dev.uid;
  const clock = () => dev.backend.now();
  const req = !local ? G.request({ S, g, secret: dev.secret, uid, now: clock(), local: false }) : null;
  const sendAs = local ? (u, k, v) => { const d = local.deviceOf(u); if (d) d.gameInput(k, v); } : null;
  const turn = G.turnOf ? G.turnOf(g) : null;
  const ended = g.phase === 'end';
  const table = <G.Table S={S} g={g} uid={uid} clock={clock} secret={local ? null : dev.secret} local={!!local} sendAs={sendAs} dev={dev} />;
  return (
    <div class="game">
      <div class="game-head">
        <div>
          <span class="game-no">Jeu {m.no}</span>
          <h1>{G.name}</h1>
        </div>
        <div class="game-tools">
          <button type="button" class="btn btn-small" onClick={() => setRules(true)}>Règles</button>
          {dev.isHost ? <button type="button" class="btn btn-small" onClick={() => setQuit(true)}>Quitter</button> : null}
        </div>
      </div>
      {quit ? (
        <div class="quit paper tape pose" role="alertdialog" aria-label="Quitter le jeu">
          <p><b>Quitter ce jeu ?</b> La partie de {G.name} s’arrête pour tout le monde et vous revenez au choix des jeux. Les gorgées déjà comptées restent dans le compteur.</p>
          <div class="bus-btns two">
            <button type="button" class="btn" onClick={() => setQuit(false)}>Continuer</button>
            <button type="button" class="btn btn-danger" onClick={() => { setQuit(false); dev.host('lobby'); }}>Quitter le jeu</button>
          </div>
        </div>
      ) : null}
      <Ribbon key={S.game.seq} />
      {turn && !ended && S.roster[turn] ? <Turn S={S} uid={turn} me={uid} /> : null}
      <ErrorBoundary>
        {ended ? <Report S={S} G={G} g={g}>{table}</Report> : table}
      </ErrorBoundary>
      {req ? (
        <ErrorBoundary>
          <G.Act S={S} g={g} secret={dev.secret} uid={uid} req={req} clock={clock} dev={dev}
            send={(k, v) => dev.gameInput(k, v)} post={(k, v) => dev.gamePost(k, v)} sent={!req.live && dev.isSent(req.k)} />
          <Retry dev={dev} k={`${S.game.seq}:${req.k}`} />
        </ErrorBoundary>
      ) : null}
      {local ? <LocalTurns dev={dev} S={S} G={G} local={local} /> : null}
      {dev.isHost ? <HostBar dev={dev} S={S} G={G} g={g} local={local} quiet={!!req} />
        : ended ? <Waiting>L’hôte choisit la suite.</Waiting> : null}
      {rules ? (
        <Sheet title={`Règles : ${G.name}`} onClose={() => setRules(false)}><Rules G={G} /></Sheet>
      ) : null}
    </div>
  );
}

// Fin de partie : rapport d'incident, avec le compteur de la soirée
function Report({ S, G, g, children }) {
  const m = GAME_META[G.id];
  const rows = seats(S).map((u) => ({ u, n: sipsOf(S, u), t: S.tally[u] || {} })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const top = rows.length ? rows.filter((r) => r.n === rows[0].n) : [];
  return (
    <section class="report paper tape tilt-c">
      <header class="report-head">
        <h2>Rapport d’incident</h2>
        <span class="report-ref">Jeu {m.no} · {G.name} · n° {String(S.game.seq).padStart(3, '0')}</span>
      </header>
      {children}
      {top.length ? (
        <footer class="report-foot">
          <span>Le plus servi ce soir : <b>{top.map((r) => nickOf(S, r.u)).join(', ')}</b></span>
          <Stamp size="s">{plural(top[0].n, 'gorgée', 'gorgées')}</Stamp>
        </footer>
      ) : null}
    </section>
  );
}

// si une action reste sans réponse, on propose de la renvoyer
function Retry({ dev, k }) {
  const at = dev.sent[k];
  useTicker(!!at, 1000);
  if (!at || dev.isHost || Date.now() - at < 6000) return null;
  return <p class="retry">L’hôte n’a pas encore reçu ta réponse. Vérifie ta connexion et renvoie-la.</p>;
}

// Commandes de l'hôte. Un seul bouton jaune par écran : si l'hôte doit aussi jouer, ses commandes passent en secondaire.
function HostBar({ dev, S, G, g, local, quiet }) {
  const [confirm, setConfirm] = useState(null);
  const actions = G.actions({ S, g, online: (u) => isOnline(dev, u, local) }) || [];
  const run = (a) => {
    if (a.confirm && confirm !== a.id) { setConfirm(a.id); return; }
    setConfirm(null);
    dev.host('game', { id: a.id });
  };
  if (g.phase === 'end') {
    return (
      <div class="hostbar">
        <button type="button" class="btn btn-main btn-big" onClick={() => dev.host('replay')}>Remettre en service</button>
        <button type="button" class="btn btn-big" onClick={() => dev.host('lobby')}>Changer de jeu</button>
      </div>
    );
  }
  if (!actions.length) return null;
  return (
    <div class="hostbar">
      {!local ? <span class="hostbar-l">Commandes de l’hôte</span> : null}
      {actions.map((a) => (
        <button type="button" key={a.id} disabled={a.disabled}
          class={`btn${a.primary && !quiet ? ' btn-main btn-big' : ''}${confirm === a.id ? ' btn-danger' : ''}`}
          onClick={() => run(a)}>{confirm === a.id ? `Confirmer : ${a.label}` : a.label}</button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ mode un seul téléphone
function LocalTurns({ dev, S, G, local }) {
  const [shown, setShown] = useState(null); // clé de la demande dévoilée
  const g = S.game.g;
  let pending = null;
  for (const u of seats(S)) {
    const d = local.deviceOf(u);
    if (!d) continue;
    const r = G.request({ S, g, secret: d.secret, uid: u, now: dev.backend.now(), local: true });
    if (r && (r.live || !d.isSent(r.k))) { pending = { u, d, r }; break; }
  }
  if (!pending) return null;
  const { u, d, r } = pending;
  const key = `${u}|${r.k}`;
  if (r.secret && shown !== key) {
    return (
      <div class="pass paper tape tilt-b">
        <Av p={S.roster[u]} size="xl" />
        <p>Passe le téléphone à <b>{nickOf(S, u)}</b></p>
        <p class="muted small">Les autres ne regardent pas l’écran.</p>
        <button type="button" class="btn btn-main btn-big" onClick={() => setShown(key)}>C’est moi, {nickOf(S, u)}</button>
      </div>
    );
  }
  return (
    <div class="local-act">
      <p class="local-who"><Av p={S.roster[u]} size="s" /> À <b>{nickOf(S, u)}</b></p>
      <G.Act S={S} g={g} secret={d.secret} uid={u} req={r} local clock={() => dev.backend.now()} dev={d}
        send={(k, v) => { d.gameInput(k, v); setShown(null); }} post={(k, v) => d.gamePost(k, v)} sent={!r.live && d.isSent(r.k)} />
    </div>
  );
}

function LocalPlayersEditor({ local, S }) {
  const [prof, setProf] = useState(defaultProfile(null));
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!prof.nick.trim() || busy) return;
    setBusy(true);
    await local.addPlayer(prof);
    setProf(defaultProfile(null));
    setBusy(false);
  };
  return (
    <div class="stack">
      <ul class="players">{seats(S).map((u) => <li class="player" key={u}><Av p={S.roster[u]} /><span class="player-name">{S.roster[u].nick}</span><span class="player-meta">{penMode(S.roster[u])}</span></li>)}</ul>
      <h3>Ajouter un joueur</h3>
      <ProfileFields value={prof} onChange={setProf} idp="addp" />
      <button type="button" class="btn btn-main btn-wide" disabled={!prof.nick.trim() || busy} onClick={add}>Ajouter</button>
    </div>
  );
}

// ------------------------------------------------------------------ pénalités et distributions
function PenaltyDock({ dev, S, local }) {
  const uids = local ? seats(S) : [dev.uid];
  const sendFor = (u, k, v) => (local ? local.deviceOf(u) : dev).input(k, v, { mark: v !== 'swap' });
  const sentFor = (u, k) => (local ? local.deviceOf(u) : dev).recent(k);
  const gifts = S.gifts.filter((x) => uids.includes(x.uid) && !sentFor(x.uid, `gift:${x.id}`));
  const pens = S.pen.filter((x) => uids.includes(x.uid) && !sentFor(x.uid, `pen:${x.id}`));
  const [mini, setMini] = useState(false);
  const total = gifts.length + pens.length;
  useEffect(() => { if (!total) setMini(false); }, [total]);
  if (!total) return null;
  const gift = gifts[0];
  if (mini) {
    return (
      <div class="dock" role="region" aria-label="À régler">
        <button type="button" class="dock-mini" onClick={() => setMini(false)}>
          <span>{gifts.length ? 'Tu as des gorgées à donner' : pens.length > 1 ? `${pens.length} pénalités à régler` : 'Une pénalité à régler'}</span>
          <span>Ouvrir</span>
        </button>
      </div>
    );
  }
  // un seul téléphone : plusieurs joueurs à régler (ex. « Je n’ai jamais ») → gorgées et points validés d’un coup ;
  // les gages et les culs secs restent à régler un par un, et chacun peut toujours passer sur sa propre carte
  const simple = local && !gift ? pens.filter((x) => !x.sober && !x.cs) : [];
  const settleAll = () => simple.forEach((x) => { local.deviceOf(x.uid).sent[`pen:${x.id}`] = Date.now(); sendFor(x.uid, `pen:${x.id}`, 'done'); });
  return (
    <div class="dock" role="region" aria-label="À régler">
      <button type="button" class="pen-later" onClick={() => setMini(true)}>Plus tard</button>
      {simple.length > 1 && new Set(simple.map((x) => x.uid)).size > 1 ? (
        <button type="button" class="btn btn-wide dock-all" onClick={settleAll}>{simple.some((x) => x.pts) ? `Gorgées bues, points notés : valider les ${simple.length}` : `Tout le monde a bu : valider les ${simple.length}`}</button>
      ) : null}
      {gift ? (
        <Distribute key={gift.id} S={S} gift={gift} local={local} onSend={(alloc) => sendFor(gift.uid, `gift:${gift.id}`, alloc)} />
      ) : (
        <PenCard key={pens[0].id} S={S} item={pens[0]} more={pens.length - 1} local={local}
          onSend={(v) => {
            if (v !== 'swap') (local ? local.deviceOf(pens[0].uid) : dev).sent[`pen:${pens[0].id}`] = Date.now();
            sendFor(pens[0].uid, `pen:${pens[0].id}`, v);
          }} />
      )}
    </div>
  );
}

// L'avis de pénalité : on voit d'abord CE QUE TU PRENDS (bandeau rouge), puis d'où ça vient.
// Les distributions (ce que TU DONNES) ont leur propre bandeau jaune : pas de confusion possible.
function PenCard({ S, item, more, local, onSend }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => { setBusy(false); }, [item.def, item.sober]);
  const kind = item.sober ? 'Ton gage' : item.pts ? 'Tes points' : item.cs ? 'Cul sec' : 'Tu bois';
  const big = item.sober ? null : item.pts ? item.pts : item.cs ? null : item.n;
  const unit = item.pts ? (item.pts > 1 ? 'points' : 'point') : item.n > 1 ? 'gorgées' : 'gorgée';
  const stamp = item.sober ? 'Gage' : item.pts ? plural(item.pts, 'point', 'points') : item.cs ? 'Cul sec' : plural(item.n, 'gorgée', 'gorgées');
  const csNote = item.cs && !item.sober && !item.pts;
  const from = item.from && S.roster[item.from] ? item.from : null;
  const why = from ? '' : item.why === 'cumul' ? 'Plusieurs pénalités regroupées' : item.why;
  return (
    <div class="pen pen-take" role="alertdialog" aria-label={`Pénalité : ${stamp}`}>
      <div class="pen-band">
        <span class="pen-kind">{kind}</span>
        {local ? <span class="dock-who"><Av p={S.roster[item.uid]} size="s" /> {nickOf(S, item.uid)}</span> : null}
        {more > 0 ? <span class="pen-ref">+{more} après</span> : null}
      </div>
      <div class="pen-main">
        {big != null ? <span class="pen-big" key={`${item.id}-n`}><b>{big}</b> {unit}</span> : <span class="pen-big pen-big-t" key={`${item.id}-t`}>{item.cs && !item.sober ? 'Cul sec' : 'Gage'}</span>}
        {from ? (
          <p class="pen-from"><span>envoyé par</span> <Av p={S.roster[from]} size="s" /> <b>{nickOf(S, from)}</b></p>
        ) : why ? <p class="pen-why">{why}</p> : null}
      </div>
      {csNote ? <p class="pen-why">Compte pour {csValue(S)} gorgées dans le compteur.</p> : null}
      {item.pts ? <p class="pen-why">Sans alcool : points de pénalité{item.cs ? ' (un cul sec)' : ''}.</p> : null}
      {item.sober ? <p class="pen-defi-txt">{item.def}</p> : null}
      <div class="pen-btns">
        <button type="button" class="btn btn-main" disabled={busy} onClick={() => onSend('done')}>{item.sober ? 'Gage fait' : item.pts ? 'Points notés' : 'C’est bu'}</button>
        <button type="button" class="btn" disabled={busy} onClick={() => { setBusy(true); onSend('swap'); }}>{item.sober ? 'Un autre gage' : 'Un gage à la place'}</button>
        <button type="button" class="btn btn-ghost" disabled={busy} onClick={() => onSend('pass')}>Je passe</button>
      </div>
    </div>
  );
}

function Distribute({ S, gift, local, onSend }) {
  const [alloc, setAlloc] = useState({});
  const given = Object.values(alloc).reduce((a, b) => a + b, 0);
  const left = gift.n - given;
  const others = seats(S).filter((u) => u !== gift.uid);
  const add = (u, d) => {
    const cur = alloc[u] || 0;
    const next = Math.max(0, cur + d);
    if (d > 0 && left <= 0) return;
    setAlloc({ ...alloc, [u]: next });
  };
  return (
    <div class="pen pen-give pen-gift" role="dialog" aria-label={`Tu distribues ${plural(gift.n, 'gorgée', 'gorgées')}`}>
      <div class="pen-band">
        <span class="pen-kind">Tu donnes</span>
        {local ? <span class="dock-who"><Av p={S.roster[gift.uid]} size="s" /> {nickOf(S, gift.uid)}</span> : null}
      </div>
      <div class="pen-main">
        <span class="pen-big"><b>{gift.n}</b> {gift.n > 1 ? 'gorgées' : 'gorgée'} à distribuer</span>
        {gift.why ? <p class="pen-why">{gift.why}</p> : null}
      </div>
      <div class="pen-left" aria-live="polite">
        <span class="pen-dots" aria-hidden="true">{Array.from({ length: Math.min(gift.n, 20) }, (_, i) => <i key={i} class={i < given ? 'on' : ''} />)}</span>
        <span>{left > 0 ? `Reste ${left}` : 'Tout est donné'}</span>
      </div>
      <div class="dist">
        {others.map((u) => (
          <div class={`dist-row${alloc[u] ? ' is-on' : ''}`} key={u}>
            <button type="button" class="dist-who" onClick={() => add(u, 1)} disabled={left <= 0}>
              <Av p={S.roster[u]} size="s" /> <span>{nickOf(S, u)}</span>
            </button>
            <span class="dist-n">{alloc[u] || 0}</span>
            <button type="button" class="icon-btn" aria-label={`Retirer une gorgée à ${nickOf(S, u)}`} onClick={() => add(u, -1)} disabled={!alloc[u]}><Icon name="minus" /></button>
            <button type="button" class="icon-btn" aria-label={`Donner une gorgée à ${nickOf(S, u)}`} onClick={() => add(u, 1)} disabled={left <= 0}><Icon name="plus" /></button>
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-main btn-wide" disabled={left !== 0} onClick={() => onSend(alloc)}>
        {left === 0 ? 'Valider la distribution' : `Encore ${left} à donner`}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ menu
function MenuSheet({ dev, S, local, onClose }) {
  const [tab, setTab] = useState('main');
  const [confirm, setConfirm] = useState(null);
  const [prof, setProf] = useState(defaultProfile(dev.profile));
  const inGame = S.status === 'game';
  if (tab === 'profile') {
    return (
      <Sheet title="Mon profil" onClose={onClose}>
        <ProfileFields value={prof} onChange={setProf} idp="edit" />
        <button type="button" class="btn btn-main btn-wide" onClick={() => { dev.saveProfile(prof); onClose(); }}>Enregistrer</button>
      </Sheet>
    );
  }
  if (tab === 'mentions') return <Sheet title="Mentions légales" onClose={onClose}><Mentions /></Sheet>;
  if (tab === 'confid') return <Sheet title="Confidentialité" onClose={onClose}><Confidentialite /></Sheet>;
  if (tab === 'recap') {
    return (
      <Sheet title="Récap de la soirée" onClose={onClose}>
        {(S.played || []).length ? <WrappedView sum={summarize(S)} /> : <p class="muted">Lancez au moins un jeu : le récap se remplit au fil de la soirée.</p>}
      </Sheet>
    );
  }
  if (tab === 'gages') {
    return (
      <Sheet title="Gages maison" onClose={onClose}>
        <GagesEditor />
      </Sheet>
    );
  }
  if (tab === 'tally') {
    return (
      <Sheet title="Compteur de la soirée" onClose={onClose}>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Joueur</th><th>Gorgées</th><th>Culs secs</th><th>Total</th><th>Gages</th><th>Points</th><th>Passés</th></tr></thead>
          <tbody>
            {seats(S).map((u) => {
              const t = S.tally[u] || { d: 0, c: 0, x: 0 };
              return <tr key={u}><td><Who S={S} uid={u} you={local ? null : dev.uid} /></td><td>{t.d}</td><td>{t.cs || 0}</td><td><b>{sipsOf(S, u)}</b></td><td>{t.c}</td><td>{t.p || 0}</td><td>{t.x}</td></tr>;
            })}
          </tbody>
        </table></div>
        <p class="muted small">Total en gorgées : un cul sec compte pour {csValue(S)} gorgées (réglable par l’hôte). Sans alcool, les pénalités deviennent des gages ou des points de pénalité, au choix de chacun. Passer ne coûte rien : personne n’est obligé de boire.</p>
      </Sheet>
    );
  }
  if (tab === 'players') {
    return (
      <Sheet title="Joueurs et places" onClose={onClose}>
        <p class="muted small">L’ordre des places sert aux jeux au tour par tour, comme le 96. Mettez-le dans le même ordre qu’autour de la table.</p>
        <ul class="players">
          {seats(S).map((u, i, arr) => (
            <li class="player" key={u}>
              <Av p={S.roster[u]} dim={!isOnline(dev, u, local)} />
              <span class="player-name">{S.roster[u].nick}</span>
              <span class="row-btns">
                <button type="button" class="icon-btn" aria-label={`Monter ${S.roster[u].nick}`} disabled={i === 0} onClick={() => dev.host('move', { uid: u, dir: -1 })}><Icon name="up" /></button>
                <button type="button" class="icon-btn" aria-label={`Descendre ${S.roster[u].nick}`} disabled={i === arr.length - 1} onClick={() => dev.host('move', { uid: u, dir: 1 })}><Icon name="down" /></button>
                {u !== dev.uid ? (
                  confirm === `kick:${u}`
                    ? <button type="button" class="btn btn-small btn-danger" onClick={() => { dev.host('kick', u); setConfirm(null); if (local) local.removePlayer(u); }}>Retirer ?</button>
                    : <button type="button" class="icon-btn" aria-label={`Retirer ${S.roster[u].nick}`} onClick={() => setConfirm(`kick:${u}`)}><Icon name="close" /></button>
                ) : null}
              </span>
              {local && local.devs && local.devs.get(u) ? (
                <div class="player-mode">
                  <Seg name={`Pénalités de ${S.roster[u].nick}`} value={!S.roster[u].drink ? (S.roster[u].sob === 'points' ? 'points' : 'gage') : 'drink'}
                    onChange={(m) => { const d = local.devs.get(u); d.saveProfile({ ...d.profile, drink: m === 'drink', sob: m === 'points' ? 'points' : 'gage' }); }}
                    options={[['drink', 'Gorgées'], ['gage', 'Gages'], ['points', 'Points']]} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {local ? <p class="muted small">Sans alcool : « Gages » ou « Points » remplacent les gorgées de ce joueur dans tous les jeux. Ça se change à tout moment.</p> : null}
      </Sheet>
    );
  }
  if (tab === 'settings') {
    return (
      <Sheet title="Réglages de la soirée" onClose={onClose}>
        <p class="muted small">Réglages par défaut : ambiance « Piquant », cul sec à 10 gorgées, pas de plafond, paquets Cul et HARD désactivés. Les limites de chaque joueur restent toujours respectées.</p>
        <PartyFields level={S.cfg.level} cap={S.cfg.cap} cs={csValue(S)} onChange={(x) => dev.host('settings', x)} />
        <AdultPacks on={!!S.cfg.adult} onChange={(v) => dev.host('settings', { adult: v })} />
      </Sheet>
    );
  }
  const item = (label, fn, cls = '') => <button type="button" class={`menu-item ${cls}`} onClick={fn}>{label}</button>;
  return (
    <Sheet title="Menu" onClose={onClose}>
      <div class="menu">
        <PrefToggles compact />
        {!local ? item('Mon profil', () => setTab('profile')) : null}
        {item('Compteur de la soirée', () => setTab('tally'))}
        {item('Récap de la soirée (story)', () => setTab('recap'))}
        {item('Gages maison', () => setTab('gages'))}
        {item('Mentions légales', () => setTab('mentions'))}
        {item('Confidentialité', () => setTab('confid'))}
        {dev.isHost ? item('Joueurs et ordre des places', () => setTab('players')) : null}
        {dev.isHost ? item('Réglages de la soirée', () => setTab('settings')) : null}
        {dev.isHost && inGame ? item('Revenir à la salle d’attente', () => { dev.host('lobby'); onClose(); }) : null}
        {dev.isHost ? (
          confirm === 'end'
            ? item('Confirmer : mettre la soirée hors service pour tout le monde', () => { onClose(); if (local) local.end(); else dev.endParty(); }, 'is-danger')
            : item('Terminer la soirée', () => setConfirm('end'), 'is-danger')
        ) : (
          confirm === 'leave'
            ? item('Confirmer : quitter la soirée', () => { onClose(); dev.leaveParty(); }, 'is-danger')
            : item('Quitter la soirée', () => setConfirm('leave'), 'is-danger')
        )}
      </div>
    </Sheet>
  );
}
