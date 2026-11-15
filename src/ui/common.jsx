// Composants d'interface partagés par les écrans et les jeux.
import { Component, createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { SUIT_SYMBOL, label, isRed } from '../lib/cards.js';
import { Icon } from './icons.jsx';
import { Character } from './avatar.jsx';
import { BREF } from '../games/bref.js';

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
export function Turn({ S, uid, me, label: lab = 'Au tour de', meLabel = 'À toi de jouer', meSmall = 'Ton tour' }) {
  const mine = me && uid === me;
  return (
    <div class={`turn${mine ? ' is-me' : ''}`} aria-live="polite">
      <span class="turn-l">{mine ? meSmall : lab}</span>
      <span class="turn-who"><Av p={S.roster[uid]} size="m" /> {mine ? meLabel : nickOf(S, uid)}</span>
    </div>
  );
}

// Flèche « a voté pour » sans emoji
export function Vs({ a, b }) {
  return <span class="vs"><b>{a}</b><Icon name="arrow" size={16} label="pour" /><span>{b}</span></span>;
}

// Carte à jouer dessinée en CSS (les symboles restent du texte, jamais des emojis)
// couleurs dessinées en SVG : même rendu sur tous les téléphones (les caractères ♣ ♠ dépendent des polices)
const SUIT_D = {
  H: 'M12 21.6 C5 16 1.4 12.3 1.4 7.9 C1.4 4.6 3.9 2.4 6.8 2.4 C9 2.4 11 3.7 12 5.8 C13 3.7 15 2.4 17.2 2.4 C20.1 2.4 22.6 4.6 22.6 7.9 C22.6 12.3 19 16 12 21.6 Z',
  D: 'M12 1.2 C14.4 4.8 17.4 8.6 20.6 12 C17.4 15.4 14.4 19.2 12 22.8 C9.6 19.2 6.6 15.4 3.4 12 C6.6 8.6 9.6 4.8 12 1.2 Z',
  S: 'M12 1.4 C9.2 5.8 2.4 9.4 2.4 14 C2.4 16.9 4.6 18.7 7 18.7 C8.8 18.7 10.2 17.9 11 16.7 C10.8 19.1 10 20.8 8.2 22.6 L15.8 22.6 C14 20.8 13.2 19.1 13 16.7 C13.8 17.9 15.2 18.7 17 18.7 C19.4 18.7 21.6 16.9 21.6 14 C21.6 9.4 14.8 5.8 12 1.4 Z',
  C: 'M12 1.8 C14.6 1.8 16.6 3.8 16.6 6.4 C16.6 7.3 16.4 8.1 16 8.8 C16.6 8.6 17.2 8.5 17.8 8.5 C20.4 8.5 22.4 10.5 22.4 13.1 C22.4 15.7 20.4 17.7 17.8 17.7 C16.2 17.7 14.8 16.9 13.9 15.7 C14 18.5 14.9 20.6 16.6 22.6 L7.4 22.6 C9.1 20.6 10 18.5 10.1 15.7 C9.2 16.9 7.8 17.7 6.2 17.7 C3.6 17.7 1.6 15.7 1.6 13.1 C1.6 10.5 3.6 8.5 6.2 8.5 C6.8 8.5 7.4 8.6 8 8.8 C7.6 8.1 7.4 7.3 7.4 6.4 C7.4 3.8 9.4 1.8 12 1.8 Z',
};
const SYM = (s) => <svg class="pc-suit" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={SUIT_D[s]} fill="currentColor" /></svg>;
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
// d'abord trois lignes pour lancer la partie, la notice complète reste à déplier
export function Rules({ G, full }) {
  const b = BREF[G.id];
  const list = <ol>{G.rules.map((r, i) => <li key={i}>{r}</li>)}</ol>;
  if (!b || full) return <div class="rules paper">{list}</div>;
  return (
    <div class="rules paper">
      <p class="bref-t">En bref</p>
      <ul class="bref">{b.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <details class="bref-more">
        <summary>Toutes les règles</summary>
        {list}
      </details>
    </div>
  );
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
