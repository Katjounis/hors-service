// Composants d'interface partagés par les écrans et les jeux.
import { Component, createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { SUIT_SYMBOL, label, isRed } from '../lib/cards.js';
import { Icon } from './icons.jsx';
import { Character } from './avatar.jsx';

const AV_PX = { s: 30, m: 42, l: 56, xl: 92 };

// humeur des personnages pendant la soirée (profil → « win » / « drink »), fournie par l'écran de soirée
export const MoodCtx = createContext(null);

// Avatar : le personnage de chaque joueur. Il sourit quand le joueur distribue, il est dépité quand il doit boire.
export function Av({ p, size = 'm', dim = false, mood = null }) {
  const moods = useContext(MoodCtx);
  const m = mood || (moods && p ? moods.get(p) : null) || null;
  return (
    <span class={`av av-${size}${dim ? ' av-dim' : ''}${m ? ` av-${m}` : ''}`} aria-hidden="true">
      {p ? <Character av={p.av} mood={m} size={AV_PX[size] || 42} /> : null}
    </span>
  );
}

export function Who({ S, uid, size = 's', you = null }) {
  const p = S && S.roster ? S.roster[uid] : null;
  return (
    <span class="who">
      <Av p={p} size={size} />
      <b>{p ? p.nick : 'Joueur parti'}</b>
      {you && uid === you ? <em class="you">toi</em> : null}
    </span>
  );
}

export const nickOf = (S, uid) => (S && S.roster && S.roster[uid] ? S.roster[uid].nick : 'Joueur parti');

// Tampon rouge (pénalités) : uniquement sur papier, sauf variante « sombre »
export function Stamp({ children, size = '', tone = '', rot = null }) {
  const cls = ['tampon'];
  if (size) cls.push(`tampon-${size}`);
  if (tone) cls.push(`tampon-${tone}`);
  return <span class={cls.join(' ')} style={rot != null ? { '--rot': `${rot}deg` } : null}>{children}</span>;
}

// Ruban jaune et noir : séparateur fort (entrée dans un jeu, tour double, bus, fin de partie)
export function Ribbon({ children, anim = true }) {
  if (!children) return <span class={`ruban${anim ? ' ruban-in' : ''}`} aria-hidden="true" />;
  return <div class="ruban-txt" role="status"><span>{children}</span></div>;
}

// Le joueur dont c'est le tour, en grand
export function Turn({ S, uid, me, label: lab = 'Au tour de', meLabel = 'À toi de jouer' }) {
  const mine = me && uid === me;
  return (
    <div class={`turn${mine ? ' is-me' : ''}`} aria-live="polite">
      <span class="turn-l">{mine ? 'Ton tour' : lab}</span>
      <span class="turn-who"><Av p={S.roster[uid]} size="m" /> {mine ? meLabel : nickOf(S, uid)}</span>
    </div>
  );
}

// Flèche « a voté pour » sans emoji
export function Vs({ a, b }) {
  return <span class="vs"><b>{a}</b><Icon name="arrow" size={16} label="pour" /><span>{b}</span></span>;
}

// Carte à jouer dessinée en CSS (les symboles restent du texte, jamais des emojis)
const SYM = (s) => `${SUIT_SYMBOL[s]}︎`;
export function PlayingCard({ c, size = 'm', back = false, onClick, disabled, sel, children, tag, posee = false, flip = false }) {
  // retournement en 3D : la carte arrive face cachée puis se retourne
  if (flip && !back && !onClick) {
    return (
      <span class="flip3d">
        <span class="flip3d-in">
          <PlayingCard c={c} size={size} tag={tag}>{children}</PlayingCard>
          <span class="flip3d-back"><PlayingCard c={c} size={size} back /></span>
        </span>
      </span>
    );
  }
  const cls = ['pc', `pc-${size}`];
  if (back) cls.push('pc-back');
  else cls.push(isRed(c) ? 'pc-red' : 'pc-black');
  if (sel) cls.push('pc-sel');
  if (onClick) cls.push('pc-btn');
  if (posee) cls.push('posee');
  const inner = back ? <span class="pc-pattern" /> : (
    <>
      <span class="pc-corner">{label(c)}<i>{SYM(c[1])}</i></span>
      <span class="pc-mid">{SYM(c[1])}</span>
      <span class="pc-corner pc-corner-b">{label(c)}<i>{SYM(c[1])}</i></span>
    </>
  );
  const body = (
    <>
      {inner}
      {tag ? <span class="pc-tag">{tag}</span> : null}
      {children}
    </>
  );
  const name = back ? 'Carte cachée' : `${label(c)} ${SUIT_SYMBOL[c[1]]}`;
  if (onClick) {
    return (
      <button type="button" class={cls.join(' ')} onClick={onClick} disabled={disabled} aria-pressed={sel ? 'true' : 'false'} aria-label={name}>
        {body}
      </button>
    );
  }
  return <span class={cls.join(' ')} role="img" aria-label={name}>{body}</span>;
}

export function Sheet({ title, onClose, children, side = false }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div class={`sheet-wrap${side ? ' is-side' : ''}`} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-head">
          <h2>{title}</h2>
          {onClose ? <button type="button" class="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button> : null}
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// Règles d'un jeu : notice numérotée sur papier
export function Rules({ G }) {
  return <div class="rules paper"><ol>{G.rules.map((r, i) => <li key={i}>{r}</li>)}</ol></div>;
}

export function PlayerGrid({ S, uids, onPick, picked, disabled, sub }) {
  return (
    <div class="pgrid">
      {uids.map((u) => (
        <button type="button" key={u} class={`pgrid-btn${picked === u ? ' is-picked' : ''}`} disabled={disabled}
          onClick={() => onPick(u)}>
          <Av p={S.roster[u]} size="l" />
          <span class="pgrid-name">{nickOf(S, u)}</span>
          {sub ? <span class="pgrid-sub">{sub(u)}</span> : null}
        </button>
      ))}
    </div>
  );
}

// Re-rendu périodique (chronos, animations synchronisées)
export function useTicker(active, ms = 250) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [active, ms]);
}

export class ErrorBoundary extends Component {
  constructor() { super(); this.state = { err: null }; }
  componentDidCatch(err) { console.error(err); this.setState({ err }); }
  render() {
    if (this.state.err) {
      return (
        <div class="panel panel-warn">
          <p><b>Affichage en panne.</b> La partie continue : touche « Réafficher ».</p>
          <button type="button" class="btn" onClick={() => this.setState({ err: null })}>Réafficher</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Attente : un texte, pas d'animation qui clignote
export function Waiting({ children }) {
  return <p class="waiting" role="status">{children}</p>;
}
