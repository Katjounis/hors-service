// Écrans hors soirée : âge, accueil, profil, créer, rejoindre.
import { PrefToggles } from './prefs.jsx';
import { useEffect, useRef, useState } from 'preact/hooks';
import { normalizeCode, isPartyCode, sanitizeNick, avatarId } from '../lib/util.js';
import { Av } from './common.jsx';
import { Icon } from './icons.jsx';
import { Character, AV_NAMES, AV_PARTS, AV_EDIT, AV_SWATCH, KIND_SKINS, KIND_HAIR, parseAv, makeAv, randomAv, describeAv } from './avatar.jsx';
import { LEVELS, CS_CHOICES, DEFAULT_CFG } from '../core/host.js';

export const LEVEL_HELP = {
  1: 'Questions et gages bon enfant.',
  2: 'Chambrage et situations absurdes.',
  3: 'Coquin et limite, toujours pour rire. Les paquets Cul et HARD s’activent à part, avec l’interrupteur du salon.',
};
// ce que coûte une pénalité à ce joueur : gorgées, gages ou points (mode sans alcool)
export const penMode = (p) => (!p || p.drink ? 'Gorgées' : p.sob === 'points' ? 'Points' : 'Gages');
export const SANTE = 'L’abus d’alcool est dangereux pour la santé. À consommer avec modération.';
export const CAP_CHOICES = [[0, 'Aucun'], [3, '3'], [5, '5'], [8, '8']];
export const CS_OPTS = CS_CHOICES.map((v) => [v, String(v)]);

export function Brand({ small }) {
  return (
    <div class={`brand${small ? ' brand-s' : ''}`} role="img" aria-label="Hors Service">
      <span class="brand-name" aria-hidden="true">Hors<br />service</span>
      <span class="brand-stripe" aria-hidden="true" />
    </div>
  );
}

export function Seg({ value, options, onChange, name, off = null }) {
  return (
    <div class="seg" role="radiogroup" aria-label={name}>
      {options.map(([v, lab]) => (
        <button type="button" key={String(v)} role="radio" aria-checked={value === v ? 'true' : 'false'} disabled={off ? off(v) : false}
          class={`seg-btn${value === v ? ' is-on' : ''}`} onClick={() => onChange(v)}>{lab}</button>
      ))}
    </div>
  );
}

// Sélecteur à crans : chaque niveau dit en une ligne ce qu'il change
export function Crans({ value, onChange, name, options }) {
  return (
    <div class="crans" role="radiogroup" aria-label={name}>
      {options.map(([v, lab, desc]) => (
        <button type="button" key={String(v)} role="radio" aria-checked={value === v ? 'true' : 'false'}
          class={`cran${value === v ? ' is-on' : ''}`} onClick={() => onChange(v)}>
          <span class="cran-n">{lab}</span>
          <span class="cran-d">{desc}</span>
        </button>
      ))}
    </div>
  );
}
export const LEVEL_OPTS = [1, 2, 3].map((l) => [l, LEVELS[l], LEVEL_HELP[l]]);

// Atelier du personnage : aperçu en grand, puis couleur, expression et accessoires.
const PART_LABEL = { kind: 'Personnage', skin: 'Peau', hair: 'Coiffure', hairCol: 'Cheveux', expr: 'Expression', color: 'Tee-shirt', head: 'Sur la tête', face: 'Sur le visage', extra: 'En plus' };
// cinq onglets courts : on ne voit qu'une ou deux familles de choix à la fois
const MAKER_TABS = [
  ['perso', 'Perso', ['kind', 'skin']],
  ['visage', 'Visage', ['expr', 'face']],
  ['cheveux', 'Cheveux', ['hair', 'hairCol']],
  ['tete', 'Tête', ['head']],
  ['tenue', 'Tenue', ['color', 'extra']],
];
export function AvatarMaker({ value, onChange, idp, gn }) {
  const parts = parseAv(value);
  const [mood, setMood] = useState(null);
  const [tab, setTab] = useState('perso');
  const box = useRef(null);
  // au premier affichage, chaque bande montre le choix en cours
  useEffect(() => {
    if (!box.current) return;
    for (const strip of box.current.querySelectorAll('.maker-strip')) {
      const on = strip.querySelector('.is-on');
      if (on) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.offsetLeft - 8);
    }
  }, []);
  const set = (i, x) => { const p = parts.slice(); p[i] = x; onChange(makeAv(p)); };
  return (
    <div class="field maker" ref={box}>
      <span class="field-l" id={`${idp}-av-l`}>Ton personnage</span>
      <div class="maker-top">
        <div class="maker-preview" key={value}>
          <Character av={value} mood={mood} size={124} label={describeAv(value)} />
        </div>
        <div class="maker-side">
          <button type="button" class="btn btn-small" onClick={() => onChange(randomAv())}><Icon name="retry" size={18} /> Au hasard</button>
          <div class="maker-moods" role="group" aria-label="Essayer une réaction">
            <button type="button" class={`btn btn-small${mood === 'win' ? ' is-on' : ''}`} aria-pressed={mood === 'win' ? 'true' : 'false'} onClick={() => setMood(mood === 'win' ? null : 'win')}>Gagne</button>
            <button type="button" class={`btn btn-small${mood === 'drink' ? ' is-on' : ''}`} aria-pressed={mood === 'drink' ? 'true' : 'false'} onClick={() => setMood(mood === 'drink' ? null : 'drink')}>Boit</button>
            <button type="button" class={`btn btn-small${mood === 'rire' ? ' is-on' : ''}`} aria-pressed={mood === 'rire' ? 'true' : 'false'} onClick={() => setMood(mood === 'rire' ? null : 'rire')}>Rigole</button>
          </div>
        </div>
      </div>
      <div class="maker-tabs" role="tablist" aria-label="Partie du personnage">
        {MAKER_TABS.filter(([id]) => id !== 'cheveux' || KIND_HAIR[parts[8]]).map(([id, lab]) => (
          <button type="button" key={id} role="tab" aria-selected={tab === id ? 'true' : 'false'} class={`cat-tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>{lab}</button>
        ))}
      </div>
      {(MAKER_TABS.find(([id]) => id === tab) || MAKER_TABS[0])[2].filter((k) => (k !== 'hair' && k !== 'hairCol') || KIND_HAIR[parts[8]]).map((k) => {
        const i = AV_PARTS.indexOf(k);
        const sw = k === 'skin' ? KIND_SKINS[parts[8]] : AV_SWATCH[k];
        return (
          <div class="maker-row" key={k}>
            <span class="maker-l">{k === 'skin' && parts[8] !== 0 && parts[8] !== 2 && parts[8] !== 3 && parts[8] !== 8 ? 'Teinte' : PART_LABEL[k]}</span>
            <div class={`maker-grid${sw ? ' is-colors' : ''}`} role="radiogroup" aria-label={PART_LABEL[k]}>
              {AV_NAMES[k].map((name, x) => {
                const p = parts.slice();
                p[i] = x;
                const on = parts[i] === x;
                return (
                  <button type="button" key={x} role="radio" aria-checked={on ? 'true' : 'false'} aria-label={globalThis.HS_GENRE_NOM ? globalThis.HS_GENRE_NOM(name, gn) : name} title={globalThis.HS_GENRE_NOM ? globalThis.HS_GENRE_NOM(name, gn) : name}
                    class={`maker-opt${on ? ' is-on' : ''}${sw ? ' is-color' : ''}`} onClick={() => set(i, x)}>
                    {sw ? <span class="swatch" style={{ background: sw[x] }} /> : <Character av={makeAv(p)} size={52} bg={false} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProfileFields({ value, onChange, idp = 'p' }) {
  const v = value;
  const set = (k, x) => onChange({ ...v, [k]: x });
  return (
    <div class="form">
      <label class={`field field-nick${(v.nick || "").trim() ? '' : ' is-empty'}`} for={`${idp}-nick`}>
        <span class="field-l">Ton pseudo</span>
        <input id={`${idp}-nick`} class="input input-nick" aria-describedby={(v.nick || "").trim() || idp === 'local' ? undefined : `${idp}-nick-h`} maxLength={16} autoComplete="nickname" value={v.nick}
          placeholder="Ex. Julie" onInput={(e) => set('nick', e.currentTarget.value)} />
        {(v.nick || "").trim() || idp === 'local' ? null : <span class="field-h nick-h" id={`${idp}-nick-h`}>Obligatoire pour entrer dans la soirée.</span>}
      </label>
      <AvatarMaker value={avatarId(v.av)} onChange={(a) => set('av', a)} idp={idp} gn={v.gn} />
      <div class="field">
        <span class="field-l">Ce soir</span>
        <Seg name="Alcool" value={v.drink} onChange={(x) => set('drink', x)}
          options={[[false, 'Sans alcool'], [true, 'Gorgées (Version Adulte)']]} />
        {!v.drink ? (
          <Seg name="À la place des gorgées" value={v.sob === 'points' ? 'points' : 'gage'} onChange={(x) => set('sob', x)}
            options={[['gage', 'Des gages'], ['points', 'Des points']]} />
        ) : null}
        <span class="field-h">{v.drink ? 'Gorgées seulement si l’hôte active la Version Adulte (18 ans et plus). Sinon, gages. Tu peux toujours prendre un gage à la place, ou passer.'
          : v.sob === 'points' ? 'Sans alcool : chaque gorgée devient un point de pénalité, dans tous les jeux. Tu peux toujours passer.'
            : 'Sans alcool : chaque pénalité devient un gage, dans tous les jeux. Tu peux toujours passer.'}</span>
      </div>
      <div class="field">
        <span class="field-l">Mes limites</span>
        <Seg name="Limites" value={v.lim} onChange={(x) => set('lim', x)}
          options={[[1, LEVELS[1]], [2, LEVELS[2]], [3, LEVELS[3]]]} />
        <span class="field-h">Le contenu ne dépasse jamais la limite la plus basse de la table. {LEVEL_HELP[v.lim]}</span>
      </div>
      <div class="field">
        <span class="field-l">Accord des textes</span>
        <Seg name="Accord des textes" value={v.gn === 'm' || v.gn === 'f' ? v.gn : 'x'} onChange={(x) => set('gn', x)}
          options={[['x', 'Ne pas préciser'], ['m', 'Masculin'], ['f', 'Féminin']]} />
        <span class="field-h">Les cartes s’accordent avec toi : « surpris », « surprise » ou « surpris(e) ».</span>
      </div>
    </div>
  );
}

// Réglages de prévention et d'ambiance, partagés par « Créer », « Un seul téléphone » et le menu
export function PartyFields({ level, cap, cs, onChange }) {
  return (
    <div class="form">
      <div class="field">
        <span class="field-l">Ambiance de la soirée</span>
        <Crans name="Ambiance" value={level} onChange={(v) => onChange({ level: v })} options={LEVEL_OPTS} />
      </div>
      <div class="field">
        <span class="field-l">Un cul sec vaut (en gorgées)</span>
        <Seg name="Valeur d’un cul sec en gorgées" value={cs} onChange={(v) => onChange({ cs: v })} options={CS_OPTS} />
        <span class="field-h">Pour le compteur de la soirée : chaque cul sec compte pour {cs} gorgées.</span>
      </div>
      <div class="field">
        <span class="field-l">Plafond par pénalité</span>
        <Seg name="Plafond par pénalité" value={cap} onChange={(v) => onChange({ cap: v })} options={CAP_CHOICES} />
        <span class="field-h">{cap ? `Jamais plus de ${cap} gorgées d’un coup. Les culs secs deviennent ${cap} gorgées.` : 'Les pénalités s’appliquent telles quelles.'}</span>
      </div>
    </div>
  );
}

export const defaultProfile = (p) => ({
  nick: (p && p.nick) || '',
  av: p && p.av ? avatarId(p.av) : randomAv(),
  drink: p ? p.drink !== false : true,
  sob: p && p.sob === 'points' ? 'points' : 'gage',
  lim: (p && p.lim) || 3,
  gn: p && (p.gn === 'm' || p.gn === 'f') ? p.gn : 'x',
});

// ------------------------------------------------------------------ accès 18 ans et plus
const AGE_KEY = 'hs:age';
// version store : plus d'écran 18+ à l'ouverture, la confirmation se fait à l'activation de la Version Adulte
export function ageOk() { return true; }
export function AgeGate({ onOk }) {
  return (
    <div class="screen age">
      <Brand />
      <h1>Hors Service est réservé aux plus de 18 ans</h1>
      <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => { try { localStorage.setItem(AGE_KEY, '1'); } catch (e) { /* stockage bloqué */ } onOk(); }}>
        J’ai 18 ans ou plus
      </button>
      <ul class="panel prevention" aria-label="Prévention">
        <li>L’abus d’alcool est dangereux pour la santé.</li>
        <li>Après avoir bu, on ne prend pas le volant.</li>
        <li>On a toujours le droit de passer son tour.</li>
      </ul>
      <p class="muted">Moins de 18 ans : cette appli n’est pas pour toi.</p>
    </div>
  );
}

// Paquets « Cul » et « HARD » : désactivés par défaut, activation confirmée par l'hôte
export function AdultPacks({ on, onChange }) {
  const [ask, setAsk] = useState(false);
  return (
    <div class="field adult-packs">
      <span class="field-l">Version Adulte (gorgées, questions coquines et autres)</span>
      <Seg name="Version Adulte" value={on} onChange={(v) => { if (v && !on) setAsk(true); else { setAsk(false); onChange(v); } }}
        options={[[false, 'Désactivés'], [true, 'Activés']]} />
      <span class="field-h">{on ? 'Activés : l’hôte peut les choisir, si les limites de chacun le permettent.' : 'Désactivés par défaut : questions sexuelles et humour sur des situations limites.'}</span>
      {ask ? (
        <div class="quit paper tape pose" role="alertdialog" aria-label="Activer la Version Adulte ?">
          <p><b>Activer la Version Adulte ?</b> Réservée aux plus de 18 ans : gorgées pour ceux qui boivent, questions sexuelles et humour sur des situations limites. Tout le monde à la table a 18 ans ou plus et est d’accord ?</p>
          <p class="muted small">L’abus d’alcool est dangereux pour la santé. Après avoir bu, on ne prend pas le volant.</p>
          <div class="bus-btns two">
            <button type="button" class="btn" onClick={() => setAsk(false)}>Annuler</button>
            <button type="button" class="btn btn-main" onClick={() => { setAsk(false); onChange(true); }}>Oui, tous majeurs</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ accueil
// Deux gros choix, rien d'autre. « Chacun son téléphone » ouvre un second écran (créer, rejoindre, mode Écran).
export function Home({ dev, onLocal, onDemo, onResumeLocal, joinCode, preview, notice, onStats, onLegal }) {
  const salons = !!(dev.backend && dev.backend.kind && dev.backend.kind() === 'salons');
  const [multi, setMulti] = useState(false);
  const go = (view) => { dev.view = view; dev.error = null; if (view === 'join') dev.joinCode = joinCode || ''; dev.changed(); };
  if (multi) {
    return (
      <div class="screen home ecran" key="multi">
        <TopBack dev={dev} title="Chacun son téléphone" onBack={() => setMulti(false)} />
        <p class="muted">Un salon, un code. Chacun garde ses secrets sur son écran.</p>
        {dev.error ? <p class="panel panel-warn" role="alert">{dev.error}</p> : null}
        <div class="home-choices">
          <button type="button" class="choice choice-main" onClick={() => go('create')}>
            <span class="choice-t">Créer un salon</span><span class="choice-d">Tu animes la soirée</span>
          </button>
          <button type="button" class="choice" onClick={() => go('join')}>
            <span class="choice-t">Rejoindre avec un code</span><span class="choice-d">4 lettres ou QR code</span>
          </button>
        </div>
        <button type="button" class="btn btn-ghost" onClick={() => go('screen-setup')}>Mode Écran (télé, tablette)</button>
      </div>
    );
  }
  return (
    <div class="screen home ecran" key="home">
      <div class="home-top">
        <Brand />
        {onStats ? <button type="button" class="icon-btn icon-round" aria-label="Stats, records et gages maison" onClick={onStats}><Icon name="jauge" /></button> : null}
      </div>
      <h1 class="visually-hidden">Hors Service</h1>
      <p class="lead home-lead">Jeux de soirée, avec ou sans alcool.</p>
      <PrefToggles />
      {dev.error ? <p class="panel panel-warn" role="alert">{dev.error}</p> : null}
      <div class="home-choices">
        {onResumeLocal ? (
          <button type="button" class="choice choice-main" onClick={onResumeLocal}>
            <span class="choice-t">Reprendre la partie</span><span class="choice-d">Sur ce téléphone</span>
          </button>
        ) : null}
        {onLocal ? (
          <button type="button" class={`choice${onResumeLocal ? '' : ' choice-main'}`} aria-label="Jouer sur un seul téléphone" onClick={onLocal}>
            <span class="choice-ico" aria-hidden="true"><Icon name="tel" /></span>
            <span class="choice-t">Un téléphone</span><span class="choice-d">On se le passe, sans réseau</span>
          </button>
        ) : null}
        {salons ? (
          <button type="button" class="choice" onClick={() => { dev.error = null; setMulti(true); }}>
            <span class="choice-ico" aria-hidden="true"><Icon name="tel" /><Icon name="tel" /></span>
            <span class="choice-t">Chacun son téléphone</span><span class="choice-d">Un salon avec un code</span>
          </button>
        ) : null}
        {onDemo && !salons ? (
          <button type="button" class="choice" aria-label="Essayer avec 4 téléphones simulés" onClick={onDemo}>
            <span class="choice-t">Démo à 4 téléphones</span><span class="choice-d">Pour voir le mode salon</span>
          </button>
        ) : null}
      </div>
      {preview ? <p class="muted small">{notice || 'Aperçu : les salons sur plusieurs vrais téléphones marchent sur le site publié. Ici, essaie la démo.'}</p> : null}
      <footer class="home-foot">
        <p>{SANTE}</p>
        {onLegal ? (
          <nav class="legal-links" aria-label="Informations légales">
            <button type="button" class="link" onClick={() => onLegal('mentions')}>Mentions légales</button>
            <button type="button" class="link" onClick={() => onLegal('confid')}>Confidentialité</button>
          </nav>
        ) : null}
      </footer>
    </div>
  );
}

// Mode Écran : la télé (ou la tablette) affiche le plateau et le QR code, mais ne joue pas
export function ScreenSetup({ dev, joinCode }) {
  const [code, setCode] = useState(joinCode || '');
  const ok = isPartyCode(code);
  return (
    <div class="screen">
      <TopBack dev={dev} title="Mode Écran" />
      <p class="muted">Cet appareil affiche le plateau, les scores et les animations. Il ne joue pas : les téléphones servent de manettes.</p>
      {dev.error ? <p class="panel panel-warn" role="alert">{dev.error}</p> : null}
      <button type="button" class="btn btn-main btn-big btn-wide" disabled={dev.busy} onClick={() => dev.openScreen(null)}>
        {dev.busy ? 'Ouverture…' : 'Créer un salon sur cet écran'}
      </button>
      <p class="muted small">Un QR code s’affiche : le premier téléphone qui rejoint anime la soirée (il choisit les jeux).</p>
      <div class="panel">
        <h3>Afficher un salon déjà ouvert</h3>
        <label class="field-l" for="screen-code">Code du salon</label>
        <CodeBoxes id="screen-code" value={code} onChange={setCode} />
        <button type="button" class="btn btn-wide" disabled={!ok || dev.busy} onClick={() => dev.openScreen(code)}>Afficher ce salon</button>
      </div>
    </div>
  );
}

export function CreateScreen({ dev }) {
  const [prof, setProf] = useState(defaultProfile(dev.profile));
  const cfg = DEFAULT_CFG; // ambiance, culs secs et plafond se règlent ensuite dans le menu de la soirée
  const ok = sanitizeNick(prof.nick).length > 0;
  const go = async () => {
    if (!ok) return;
    dev.saveProfile(prof);
    await dev.createParty(cfg);
  };
  return (
    <div class="screen">
      <TopBack dev={dev} title={dev.backend && dev.backend.kind && dev.backend.kind() === 'salons' ? 'Créer un salon' : 'Créer une soirée'} />
      <ProfileFields value={prof} onChange={setProf} idp="create" />
      <p class="hint">Ambiance, valeur du cul sec et plafond : réglés par défaut, modifiables à tout moment dans le menu de la soirée.</p>
      {dev.error ? <p class="panel panel-warn">{dev.error}</p> : null}
      <button type="button" class="btn btn-main btn-big btn-wide" disabled={!ok || dev.busy} onClick={go}>
        {dev.busy ? 'Mise en service…' : 'Mettre la soirée en service'}
      </button>
    </div>
  );
}

// Champ du code : une case par caractère (un vrai champ texte invisible par-dessus, pour le clavier et le collage)
export function CodeBoxes({ value, onChange, bad, id }) {
  const cells = [0, 1, 2, 3];
  return (
    <div class={`codebox${bad ? ' is-bad' : ''}`}>
      {cells.map((i) => (
        <span key={i} class={`codebox-cell${value[i] ? ' is-on' : ''}${i === Math.min(value.length, 3) ? ' is-cur' : ''}`} aria-hidden="true">{value[i] || ''}</span>
      ))}
      <input id={id} class="codebox-input" inputMode="text" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellcheck={false}
        maxLength={4} value={value} aria-describedby={bad ? `${id}-err` : undefined} aria-invalid={bad ? 'true' : 'false'}
        onInput={(e) => onChange(normalizeCode(e.currentTarget.value))} />
    </div>
  );
}

export function JoinScreen({ dev }) {
  const [prof, setProf] = useState(defaultProfile(dev.profile));
  const [code, setCode] = useState(normalizeCode(dev.joinCode || ''));
  const ok = sanitizeNick(prof.nick).length > 0 && isPartyCode(code);
  const go = async () => {
    if (!ok) return;
    dev.saveProfile(prof);
    await dev.joinParty(code);
  };
  return (
    <div class="screen">
      <TopBack dev={dev} title={dev.backend && dev.backend.kind && dev.backend.kind() === 'salons' ? 'Rejoindre un salon' : 'Rejoindre une soirée'} />
      <div class="field">
        <label class="field-l" for="join-code">Code de la soirée</label>
        <CodeBoxes id="join-code" value={code} bad={!!dev.error} onChange={(c) => { setCode(c); if (dev.error) { dev.error = null; dev.changed(); } }} />
        {dev.error ? <p class="field-err" id="join-code-err">{dev.error}</p> : <span class="field-h">4 caractères, affichés sur le téléphone de l’hôte.</span>}
      </div>
      <ProfileFields value={prof} onChange={setProf} idp="join" />
      <button type="button" class="btn btn-main btn-big btn-wide" disabled={!ok || dev.busy} onClick={go}>
        {dev.busy ? 'Connexion…' : 'Rejoindre'}
      </button>
    </div>
  );
}

export function TopBack({ dev, title, onBack }) {
  return (
    <div class="topback">
      <button type="button" class="icon-btn" aria-label="Retour" onClick={() => {
        if (onBack) onBack(); else { dev.view = 'home'; dev.error = null; dev.changed(); }
      }}><Icon name="back" /></button>
      <h1>{title}</h1>
    </div>
  );
}
