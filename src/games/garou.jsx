// GlouGlou Garou : le loup-garou version soirée (demande de Samuel), en deux versions.
// • Classique + alcool : Loups-Garous, Voyante, Sorcière, Chasseur, Cupidon, Villageois.
// • Remasterisée : Loups-Garous, Voyante pompette, Mixologue, Barman, Pilier de bar, Dernier verre, Videur, Villageois.
// Alcool (les deux versions) : mort la nuit ou au vote = cul sec ; condamner un innocent = 2 gorgées pour
// chaque juge ; condamner un loup = chaque juge distribue 1 gorgée ; l'équipe perdante boit à la fin.
// Remasterisée en plus : les loups trinquent chaque nuit (1 gorgée chacun), le Barman fait boire son protégé.
// Tout se joue en secret : chacun voit son rôle sur son téléphone ; l'appareil en mode Écran fait le narrateur.
// Un seul téléphone : on se le passe à chaque étape de la nuit (tout le monde fait semblant à chaque appel).

import { useState, useRef, useEffect } from 'preact/hooks';
import { Who, nickOf, PlayerGrid, Waiting, Av, Stamp, useTicker } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

export const ROLES = {
  loup: { name: 'Loup-Garou', team: 'loups', desc: 'Chaque nuit, avec les autres loups, tu choisis une victime. Le jour, fais-toi passer pour un villageois.' },
  villageois: { name: 'Villageois', team: 'village', desc: 'Aucun pouvoir, juste ton flair et ta mauvaise foi. Trouve les loups au vote.' },
  voyante: { name: 'Voyante', team: 'village', desc: 'Chaque nuit, tu découvres le rôle d’un joueur.' },
  sorciere: { name: 'Sorcière', team: 'village', desc: 'Une potion de vie (sauver la victime de la nuit) et une potion de mort (éliminer quelqu’un). Une seule fois chacune.' },
  chasseur: { name: 'Chasseur', team: 'village', desc: 'Quand tu meurs, tu emportes quelqu’un avec toi.' },
  cupidon: { name: 'Cupidon', team: 'village', desc: 'La première nuit, tu lies deux amoureux : si l’un meurt, l’autre meurt de chagrin.' },
  pompette: { name: 'Voyante pompette', team: 'village', desc: 'Chaque nuit, tu vois le rôle d’un joueur… mais une nuit sur trois, tu as trop bu et ce que tu vois est faux. Tu ne sais pas quand.' },
  mixologue: { name: 'Mixologue', team: 'village', desc: 'Un cocktail de soin (sauver la victime de la nuit) et un cocktail mortel (éliminer quelqu’un). Une seule fois chacun.' },
  barman: { name: 'Barman', team: 'village', desc: 'Chaque nuit, tu sers une tournée à un joueur : il est protégé des loups cette nuit-là, mais il boit 2 gorgées au réveil. Pas deux fois de suite le même.' },
  pilier: { name: 'Pilier de bar', team: 'village', desc: 'Tu as la peau dure : tu survis à la première attaque des loups (et tu prends un cul sec à la place).' },
  dernier: { name: 'Dernier verre', team: 'village', desc: 'Quand tu meurs, tu offres ton dernier verre : tu emportes quelqu’un avec toi.' },
  videur: { name: 'Videur', team: 'village', desc: 'Une fois dans la partie, après un vote, tu peux annuler l’élimination : personne ne sort.' },
};

// composition selon le nombre de joueurs
export function deal(n, version, rnd = Math.random) {
  const loups = n <= 5 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4;
  const special = version === 'remaster'
    ? ['pompette', 'mixologue', 'barman', 'dernier', 'pilier', 'videur']
    : ['voyante', 'sorciere', 'chasseur', 'cupidon'];
  const room = n - loups;
  const keep = special.slice(0, Math.max(1, Math.min(special.length, room - 1)));
  const roles = [...Array(loups).fill('loup'), ...keep];
  while (roles.length < n) roles.push('villageois');
  // mélange (Fisher-Yates)
  for (let i = roles.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [roles[i], roles[j]] = [roles[j], roles[i]]; }
  return roles;
}

const STEP_LABEL = {
  cupidon: 'Cupidon se réveille et lie deux amoureux.',
  voyante: 'La Voyante se réveille et sonde un joueur.',
  pompette: 'La Voyante pompette se réveille, un verre à la main.',
  barman: 'Le Barman se réveille et sert une tournée.',
  loups: 'Les Loups-Garous se réveillent et choisissent leur victime.',
  sorciere: 'La Sorcière se réveille et regarde ses potions.',
  mixologue: 'Le Mixologue se réveille et prépare ses cocktails.',
  tour: 'Le téléphone fait le tour : chacun regarde en secret, agit s’il a un pouvoir, puis le passe.',
  potions: 'Dernier tour de téléphone : quelqu’un prépare peut-être une potion…',
};
const ORDER = ['cupidon', 'loups', 'voyante', 'pompette', 'barman', 'sorciere', 'mixologue'];
// un seul téléphone : un seul tour de téléphone par nuit (chacun fait son action, ou « je dors »),
// plus un second tour rapide s'il y a une Sorcière ou un Mixologue (elle doit connaître la victime)
const witchOf = (g) => g.dealt.find((r) => r === 'sorciere' || r === 'mixologue');
export function localKind(g, role) {
  if (g.step === 'tour') {
    if (role === 'loup') return 'wolf';
    if (role === 'cupidon') return g.night === 1 ? 'cupidon' : 'dummy';
    if (role === 'voyante' || role === 'pompette' || role === 'barman') return role;
    return 'dummy';
  }
  if (g.step === 'potions' && (role === 'sorciere' || role === 'mixologue')) return role;
  return 'dummy';
}

const alive = (g) => g.pl.filter((u) => !g.dead[u]);
const roleOf = (c, u) => c.priv.roles[u];
const holder = (c, g, role) => g.pl.find((u) => roleOf(c, u) === role);

function pushSecret(c, u) {
  const g = c.g;
  const P = c.priv;
  const role = P.roles[u];
  const s = { game: 'garou', gid: g.gid, role, alive: !g.dead[u], visions: P.visions[u] || [] };
  if (role === 'loup') s.mates = g.pl.filter((x) => x !== u && P.roles[x] === 'loup');
  if (P.lovers && P.lovers.includes(u)) s.lover = P.lovers.find((x) => x !== u);
  if (role === 'sorciere' || role === 'mixologue') { s.potions = { ...P.potions }; s.victim = g.step === role || g.step === 'potions' ? P.victim : null; }
  if (role === 'loup' && (g.step === 'loups' || g.step === 'tour')) s.wvotes = { ...P.wolfVotes };
  if (role === 'barman') s.last = P.lastServed || null;
  c.setSecret(u, s);
}
function pushAll(c) { for (const u of c.g.pl) if (c.roster[u]) pushSecret(c, u); }

function stepsFor(c, g) {
  if (g.local) return witchOf(g) ? ['tour', 'potions'] : ['tour'];
  return ORDER.filter((st) => {
    if (st === 'cupidon') return g.night === 1 && g.dealt.includes('cupidon');
    if (st === 'loups') return true;
    return g.dealt.includes(st);
  });
}

function startNight(c) {
  const g = c.g;
  const P = c.priv;
  g.night += 1;
  g.phase = 'night';
  g.steps = stepsFor(c, g);
  g.si = -1;
  P.victim = null;
  P.saved = false;
  P.poison = null;
  P.served = null;
  P.wolfVotes = {};
  g.log.push({ t: 'night', n: g.night });
  if (g.local) for (const u of g.pl) { if (P.visions[u]) P.visions[u] = P.visions[u].slice(); }
  nextStep(c);
}

function nextStep(c) {
  const g = c.g;
  g.si += 1;
  if (g.si >= g.steps.length) { dawn(c); return; }
  g.step = g.steps[g.si];
  g.stepAt = c.now();
  g.done = {};
  const P = c.priv;
  // rôle mort (ou personne) : on fait semblant quelques secondes pour ne rien trahir
  const who = g.step === 'loups' ? null : holder(c, g, g.step);
  P.fake = !g.local && g.step !== 'loups' && (!who || g.dead[who]) ? c.now() + 2000 + Math.random() * 1800 : 0;
  if (g.step === 'loups') { P.wolfVotes = {}; }
  pushAll(c);
}

// l'étape de la nuit est-elle finie ? Sur un seul téléphone, tout le monde passe à chaque étape (on fait semblant)
function progress(c) {
  const g = c.g;
  const al = alive(g);
  if (g.local) {
    // un seul téléphone : l'étape est finie quand tout le monde est passé (et que la Voyante a vu sa vision)
    if (!al.every((u) => g.done[u])) return;
    if (al.some((u) => ['voyante', 'pompette'].includes(c.priv.roles[u]) && localKind(g, c.priv.roles[u]) !== 'dummy' && !g.done[`${u}ok`])) return;
    if (g.step === 'tour') resolveWolves(c); else nextStep(c);
    return;
  }
  if (g.step === 'loups') {
    if (!wolvesAlive(c, g).every((w) => g.done[w])) return;
    if (g.local && !al.every((u) => g.done[u])) return;
    resolveWolves(c);
    return;
  }
  const h = holder(c, g, g.step);
  if (h && !g.dead[h]) {
    if (!g.done[h]) return;
    if ((g.step === 'voyante' || g.step === 'pompette') && !g.done[`${h}ok`]) return;
  } else if (!g.local) return; // en salon, le tick fait semblant tout seul
  if (g.local && !al.every((u) => g.done[u])) return;
  nextStep(c);
}

function wolvesAlive(c, g) { return alive(g).filter((u) => roleOf(c, u) === 'loup'); }

function resolveWolves(c) {
  const g = c.g;
  const P = c.priv;
  const counts = {};
  for (const t of Object.values(P.wolfVotes)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((u) => counts[u] === max);
  P.victim = top.length ? top[Math.floor(Math.random() * top.length)] : null;
  if (g.version === 'remaster') for (const w of wolvesAlive(c, g)) c.pen(w, 1, 'GlouGlou Garou : les loups trinquent');
  nextStep(c);
}

function kill(c, u, how, out) {
  const g = c.g;
  if (!u || g.dead[u]) return;
  g.dead[u] = { how, role: c.priv.roles[u], n: g.night };
  out.push(u);
  // victime des loups : 2 gorgées ; villageois éliminé autrement : 1 ; loup démasqué : cul sec
  if (how === 'dévoré par les loups') c.pen(u, 2, `GlouGlou Garou : ${how}`);
  else if (c.priv.roles[u] !== 'loup') c.pen(u, 1, `GlouGlou Garou : ${how}`);
  else c.penCS(u, `GlouGlou Garou : ${how}`);
  // amoureux : l'autre meurt de chagrin
  const L = c.priv.lovers;
  if (L && L.includes(u)) {
    const o = L.find((x) => x !== u);
    if (o && !g.dead[o]) kill(c, o, 'mort de chagrin', out);
  }
}

function dawn(c) {
  const g = c.g;
  const P = c.priv;
  const out = [];
  g.step = null;
  let v = P.victim;
  if (v && P.served === v) { g.log.push({ t: 'protect' }); v = null; } // la tournée du Barman protège
  if (v && P.saved) v = null; // potion / cocktail de soin
  if (v && P.roles[v] === 'pilier' && !P.pilierUsed) {
    P.pilierUsed = true;
    c.penCS(v, 'GlouGlou Garou : le Pilier de bar encaisse');
    g.log.push({ t: 'pilier' });
    v = null;
  }
  if (v) kill(c, v, 'dévoré par les loups', out);
  if (P.poison) kill(c, P.poison, g.version === 'remaster' ? 'cocktail mortel' : 'empoisonné', out);
  if (P.served && !g.dead[P.served]) c.pen(P.served, 2, 'GlouGlou Garou : la tournée du Barman');
  g.lastDeaths = out.slice();
  g.log.push({ t: 'dawn', dead: out.slice() });
  pushAll(c);
  afterDeaths(c, out, 'day');
}

// un Chasseur / Dernier verre vient de mourir ? il tire avant la suite
function afterDeaths(c, out, then) {
  const g = c.g;
  const shooter = out.find((u) => ['chasseur', 'dernier'].includes(c.priv.roles[u]) && !c.priv.shot);
  if (shooter) {
    c.priv.shot = true;
    g.phase = 'shoot';
    g.shooter = shooter;
    g.then = then;
    return;
  }
  if (checkEnd(c)) return;
  if (then === 'day') { g.phase = 'day'; g.dayAt = c.now(); g.votes = {}; }
  else startNight(c);
}

function checkEnd(c) {
  const g = c.g;
  const P = c.priv;
  const al = alive(g);
  const wolves = al.filter((u) => P.roles[u] === 'loup').length;
  const others = al.length - wolves;
  let winner = null;
  if (P.lovers && al.length === 2 && P.lovers.every((u) => al.includes(u)) && P.roles[P.lovers[0]] === 'loup' !== (P.roles[P.lovers[1]] === 'loup')) winner = 'amoureux';
  else if (wolves === 0) winner = 'village';
  else if (wolves >= others) winner = 'loups';
  if (!winner) return false;
  finish(c, winner);
  return true;
}

function finish(c, winner) {
  const g = c.g;
  const P = c.priv;
  g.phase = 'end';
  g.winner = winner;
  g.reveal = { ...P.roles };
  g.lovers = P.lovers || null;
  const wins = (u) => (winner === 'amoureux' ? P.lovers.includes(u) : winner === 'loups' ? P.roles[u] === 'loup' : P.roles[u] !== 'loup');
  for (const u of g.pl) {
    if (!c.roster[u]) continue;
    if (!wins(u) && c.opts.sips > 0) c.pen(u, c.opts.sips, 'GlouGlou Garou : équipe perdante');
  }
  for (const u of g.pl) c.setSecret(u, null);
  g.summary = { winner, nights: g.night };
}

function resolveVote(c) {
  const g = c.g;
  const P = c.priv;
  const counts = {};
  for (const t of Object.values(P.votes || {})) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((u) => counts[u] === max);
  g.vres = { counts, who: { ...(P.votes || {}) }, top };
  g.voteN = (g.voteN || 0) + 1;
  if (top.length !== 1) {
    g.verdict = { none: true };
    g.phase = 'verdict';
    g.log.push({ t: 'tie' });
    return;
  }
  g.verdict = { uid: top[0] };
  // Videur : peut annuler une fois
  const vid = holder(c, g, 'videur');
  if (vid && !g.dead[vid] && !P.videurUsed) { g.phase = 'videur'; g.videurAt = c.now(); return; }
  applyVerdict(c);
}

function applyVerdict(c) {
  const g = c.g;
  const P = c.priv;
  const u = g.verdict.uid;
  const out = [];
  kill(c, u, 'éliminé par le village', out);
  const judges = Object.keys(g.vres.who).filter((x) => g.vres.who[x] === u);
  if (P.roles[u] === 'loup') { for (const j of judges) if (!g.dead[j]) c.gift(j, 1, 'GlouGlou Garou : bien vu, c’était un loup'); }
  else for (const j of judges) c.pen(j, 2, 'GlouGlou Garou : tu as condamné un innocent');
  g.verdict.role = P.roles[u];
  g.verdict.out = out;
  g.phase = 'verdict';
  g.log.push({ t: 'vote', uid: u, role: P.roles[u] });
  pushAll(c);
  g.afterVerdict = out;
}

const GAROU = {
  id: 'garou',
  name: 'GlouGlou Garou',
  tagline: 'Le loup-garou version soirée : la nuit les loups dévorent, le jour le village vote. Chaque mort boit.',
  min: 5,
  local: true,
  rules: [
    'Chacun découvre son rôle en secret. Les Loups-Garous se connaissent entre eux.',
    'La nuit, chaque rôle se réveille à son tour sur son téléphone (Cupidon la première nuit, la Voyante, la Sorcière… et les loups qui choisissent une victime).',
    'Au matin, on découvre les morts. Le village débat, puis chacun vote en secret pour éliminer un suspect. Égalité : personne ne sort.',
    'Alcool : une victime des loups boit 2 gorgées, un villageois éliminé autrement (vote, poison, tir) en boit 1, un loup démasqué prend un cul sec. Condamner un innocent coûte 2 gorgées à chaque juge ; condamner un loup permet à chaque juge de distribuer 1 gorgée.',
    'Les villageois gagnent quand tous les loups sont morts ; les loups gagnent quand ils sont aussi nombreux que les autres. Les amoureux d’équipes différentes gagnent s’ils restent seuls. L’équipe perdante boit.',
    'Version remasterisée : Voyante pompette (une vision sur trois est fausse), Mixologue, Barman (protège en faisant boire), Pilier de bar (survit à une attaque), Dernier verre, Videur (annule un vote). Les loups trinquent chaque nuit.',
    'En mode Écran, la télé fait le narrateur. Sur un seul téléphone, on se le passe à chaque étape : tout le monde fait semblant à chaque appel.',
  ],
  options: [
    { id: 'version', label: 'Version', choices: [['classique', 'Classique + alcool'], ['remaster', 'Remasterisée']], def: 'classique' },
    { id: 'sips', label: 'L’équipe perdante boit', choices: [[0, 'Rien'], [2, '2 gorgées'], [3, '3 gorgées'], [5, '5 gorgées']], def: 3 },
  ],

  start(c) {
    const pl = c.activeUids();
    const version = c.opts.version === 'remaster' ? 'remaster' : 'classique';
    const roles = deal(pl.length, version);
    const g = {
      gid: c.rid(5), pl, version, phase: 'roles', seen: {}, night: 0, step: null, steps: [], si: -1, dead: {}, log: [],
      votes: {}, vres: null, verdict: null, shooter: null, lastDeaths: [], dealt: [...new Set(roles)],
      compo: roles.reduce((o, r) => { o[r] = (o[r] || 0) + 1; return o; }, {}), local: !!c.isLocal,
    };
    c.g = g;
    c.S.game.g = g;
    const P = c.priv;
    P.roles = Object.fromEntries(pl.map((u, i) => [u, roles[i]]));
    P.visions = {};
    P.potions = { vie: true, mort: true };
    P.lovers = null;
    P.votes = {};
    pushAll(c);
    return g;
  },

  request({ g, uid, secret }) {
    if (!secret || secret.game !== 'garou' || secret.gid !== g.gid) return null;
    if (g.phase === 'roles' && !g.seen[uid]) return { k: `r${g.gid}`, kind: 'role', secret: true };
    if (g.dead[uid] && g.phase !== 'shoot') return null;
    if (g.phase === 'night') {
      const k = `n${g.night}${g.step}`;
      if (g.local) {
        const kind = localKind(g, secret.role);
        if (g.done[uid]) return (kind === 'voyante' || kind === 'pompette') && !g.done[`${uid}ok`] ? { k: `${k}ok`, kind: 'vision', secret: true } : null;
        return { k, kind, secret: true };
      }
      if (g.done[uid]) {
        // la Voyante voit le résultat avant de rendre le téléphone
        if ((g.step === 'voyante' || g.step === 'pompette') && secret.role === g.step && !g.done[`${uid}ok`]) return { k: `${k}ok`, kind: 'vision', secret: true };
        return null;
      }
      if (g.step === 'loups' && secret.role === 'loup') return { k, kind: 'wolf', secret: true };
      if (g.step !== 'loups' && secret.role === g.step) return { k, kind: g.step, secret: true };
      // un seul téléphone : chacun passe à chaque étape et fait semblant, pour ne trahir personne
      if (g.local) return { k, kind: 'dummy', secret: true };
      return null;
    }
    if (g.phase === 'shoot' && g.shooter === uid) return { k: `s${g.night}`, kind: 'shoot' };
    if (g.phase === 'vote' && !g.votes[uid]) return { k: `v${g.night}.${g.voteN || 0}`, kind: 'vote', secret: true };
    if (g.phase === 'videur' && secret.role === 'videur') return { k: `vd${g.night}`, kind: 'videur', secret: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    const P = c.priv;
    const live = (x) => typeof x === 'string' && g.pl.includes(x) && !g.dead[x];
    if (g.phase === 'roles' && k === `r${g.gid}` && !g.seen[uid]) {
      g.seen[uid] = true;
      if (g.pl.filter((u) => c.roster[u] && (g.local || c.online(u))).every((u) => g.seen[u])) startNight(c);
      return true;
    }
    if (g.phase === 'night' && !g.dead[uid]) {
      const base = `n${g.night}${g.step}`;
      const role = P.roles[uid];
      if (k === `${base}ok` && g.done[uid]) { g.done[`${uid}ok`] = true; progress(c); return true; }
      if (k !== base || g.done[uid]) return false;
      if (g.local) {
        const kind = localKind(g, role);
        if (kind === 'dummy') { g.done[uid] = true; progress(c); return true; }
        if (kind === 'wolf') { if (!live(v) || P.roles[v] === 'loup') return false; P.wolfVotes[uid] = v; }
        else if (kind === 'cupidon') { if (!Array.isArray(v) || v.length !== 2 || v[0] === v[1] || !v.every(live)) return false; P.lovers = v.slice(); }
        else if (kind === 'barman') { if (!live(v) || v === P.lastServed) return false; P.served = v; P.lastServed = v; }
        else if (kind === 'voyante' || kind === 'pompette') {
          if (!live(v) || v === uid) return false;
          let seen = P.roles[v];
          if (kind === 'pompette' && Math.random() < 1 / 3) { const o = Object.keys(ROLES).filter((r) => r !== seen && g.dealt.includes(r)); seen = o[Math.floor(Math.random() * o.length)] || seen; }
          P.visions[uid] = [...(P.visions[uid] || []), { u: v, role: seen, n: g.night }];
        } else if (kind === 'sorciere' || kind === 'mixologue') {
          if (!v || typeof v !== 'object') return false;
          if (v.save && P.potions.vie && P.victim) { P.saved = true; P.potions.vie = false; }
          if (v.kill && P.potions.mort && live(v.kill) && v.kill !== uid) { P.poison = v.kill; P.potions.mort = false; }
        }
        g.done[uid] = true;
        pushAll(c);
        progress(c);
        return true;
      }
      const mine = g.step === 'loups' ? role === 'loup' : role === g.step;
      if (!mine) {
        if (!g.local) return false;
        g.done[uid] = true; // il a fait semblant
        progress(c);
        return true;
      }
      if (g.step === 'loups' && role === 'loup') {
        if (!live(v) || P.roles[v] === 'loup') return false;
        P.wolfVotes[uid] = v;
        g.done[uid] = true;
        pushAll(c);
        progress(c);
        return true;
      }
      if (role !== g.step) return false;
      if (g.step === 'cupidon') {
        if (!Array.isArray(v) || v.length !== 2 || v[0] === v[1] || !v.every(live)) return false;
        P.lovers = v.slice();
        g.done[uid] = true;
        pushAll(c);
        progress(c);
        return true;
      }
      if (g.step === 'voyante' || g.step === 'pompette') {
        if (!live(v) || v === uid) return false;
        let seen = P.roles[v];
        // pompette : une nuit sur trois, la vision est fausse (elle ne le sait pas)
        if (g.step === 'pompette' && Math.random() < 1 / 3) {
          const others = Object.keys(ROLES).filter((r) => r !== seen && g.dealt.includes(r));
          seen = others[Math.floor(Math.random() * others.length)] || seen;
        }
        P.visions[uid] = [...(P.visions[uid] || []), { u: v, role: seen, n: g.night }];
        g.done[uid] = true;
        pushSecret(c, uid);
        return true;
      }
      if (g.step === 'barman') {
        if (!live(v) || v === P.lastServed) return false;
        P.served = v;
        P.lastServed = v;
        g.done[uid] = true;
        progress(c);
        return true;
      }
      if (g.step === 'sorciere' || g.step === 'mixologue') {
        if (!v || typeof v !== 'object') return false;
        if (v.save && P.potions.vie && P.victim) { P.saved = true; P.potions.vie = false; }
        if (v.kill && P.potions.mort && live(v.kill) && v.kill !== uid) { P.poison = v.kill; P.potions.mort = false; }
        g.done[uid] = true;
        progress(c);
        return true;
      }
      return false;
    }
    if (g.phase === 'shoot' && uid === g.shooter && k === `s${g.night}`) {
      if (!live(v) || v === uid) return false;
      const out = [];
      kill(c, v, P.roles[uid] === 'dernier' ? 'emporté par le dernier verre' : 'abattu par le Chasseur', out);
      g.log.push({ t: 'shot', by: uid, uid: v });
      g.shooter = null;
      pushAll(c);
      afterDeaths(c, out, g.then);
      return true;
    }
    if (g.phase === 'vote' && k === `v${g.night}.${g.voteN || 0}` && !g.dead[uid] && !g.votes[uid]) {
      if (!live(v) || v === uid) return false;
      P.votes[uid] = v;
      g.votes[uid] = true;
      if (alive(g).filter((u) => g.local || c.online(u)).every((u) => g.votes[u])) resolveVote(c);
      return true;
    }
    if (g.phase === 'videur' && k === `vd${g.night}` && P.roles[uid] === 'videur') {
      if (v === 'cancel') {
        P.videurUsed = true;
        g.verdict = { cancelled: true, uid: g.verdict.uid };
        g.phase = 'verdict';
        g.log.push({ t: 'videur' });
        return true;
      }
      applyVerdict(c);
      return true;
    }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'roles') {
      const n = Object.keys(g.seen).length;
      return [{ id: 'night', label: `Faire tomber la nuit (${n}/${g.pl.length} prêts)`, disabled: n < 2 }];
    }
    if (g.phase === 'day') return [{ id: 'vote', label: 'Débat terminé : voter', primary: true }];
    if (g.phase === 'vote') {
      const n = Object.keys(g.votes).length;
      return [{ id: 'resolve', label: `Dépouiller maintenant (${n})`, disabled: n < 1, confirm: 'Dépouiller sans attendre les autres ?' }];
    }
    if (g.phase === 'verdict') return [{ id: 'next', label: 'La nuit tombe', primary: true }];
    if (g.phase === 'night') return [{ id: 'skip', label: 'Passer cette étape (joueur absent)', confirm: 'Passer l’étape en cours ?' }];
    return [{ id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et révéler les rôles ?' }];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'night' && g.phase === 'roles') { startNight(c); return true; }
    if (id === 'vote' && g.phase === 'day') { g.phase = 'vote'; g.votes = {}; c.priv.votes = {}; return true; }
    if (id === 'resolve' && g.phase === 'vote' && Object.keys(g.votes).length) { resolveVote(c); return true; }
    if (id === 'next' && g.phase === 'verdict') {
      const out = g.afterVerdict || [];
      g.afterVerdict = null;
      if (g.verdict && !g.verdict.none && !g.verdict.cancelled && out.length) { afterDeaths(c, out, 'night'); return true; }
      if (!checkEnd(c)) startNight(c);
      return true;
    }
    if (id === 'skip' && g.phase === 'night') {
      if (g.step === 'loups') resolveWolves(c); else nextStep(c);
      return true;
    }
    if (id === 'end' && g.phase !== 'end') { finish(c, 'village'); g.winner = 'stop'; g.summary.winner = 'stop'; return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    const P = c.priv;
    if (g.phase === 'night' && P.fake && c.now() > P.fake) { P.fake = 0; nextStep(c); return true; }
    if (g.phase === 'videur' && c.now() - g.videurAt > 25000) { applyVerdict(c); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'shoot' ? g.shooter : null; },
  tintOf(g) { return g && (g.phase === 'night') ? 'garou-nuit' : 'garou'; },
  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  bot({ g, uid, req, secret }) {
    const others = alive(g).filter((u) => u !== uid);
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    if (!req) return undefined;
    if (req.kind === 'role' || req.kind === 'vision') return true;
    if (req.kind === 'dummy') return true;
    if (req.kind === 'wolf') return any(others.filter((u) => !(secret.mates || []).includes(u))) || any(others);
    if (req.kind === 'cupidon') { const a = any(alive(g)); return [a, any(alive(g).filter((u) => u !== a))]; }
    if (req.kind === 'sorciere' || req.kind === 'mixologue') return { save: Math.random() < 0.5, kill: Math.random() < 0.25 ? any(others) : null };
    if (req.kind === 'barman') return any(alive(g).filter((u) => u !== secret.last));
    if (req.kind === 'videur') return Math.random() < 0.3 ? 'cancel' : 'keep';
    return any(others);
  },

  Table,
  Act,
};

export default GAROU;

// ---------------------------------------------------------------- affichage

const TEAM = { village: 'Le village', loups: 'Les Loups-Garous', amoureux: 'Les amoureux', stop: 'Partie arrêtée' };

function Graveyard({ S, g, uid }) {
  const dead = g.pl.filter((u) => g.dead[u]);
  const al = alive(g);
  return (
    <div class="garou-people">
      <div class="garou-row">
        {al.map((u) => <span key={u} class="garou-p"><Av p={S.roster[u]} size="m" /><b>{nickOf(S, u)}</b></span>)}
      </div>
      {dead.length ? (
        <div class="garou-row is-dead">
          {dead.map((u) => <span key={u} class="garou-p"><Av p={S.roster[u]} size="m" dim /><b>{nickOf(S, u)}</b><small>{ROLES[g.dead[u].role].name}</small></span>)}
        </div>
      ) : null}
    </div>
  );
}

// rôles distribués ce soir (nombre et morts), sans dire qui les a
function RolesInPlay({ g, onClose }) {
  const C = g.compo || Object.fromEntries((g.dealt || []).map((x) => [x, 1]));
  const M = {};
  for (const d of Object.values(g.dead || {})) if (d && d.role) M[d.role] = (M[d.role] || 0) + 1;
  const keys = Object.keys(C).sort((a, b) => (a === 'loup' ? -1 : b === 'loup' ? 1 : 0));
  return (
    <div class="gr-roles paper tape" role="dialog" aria-label="Rôles en jeu">
      <div class="gr-roles-h"><b>Rôles en jeu</b><button type="button" class="btn btn-small" onClick={onClose}>Fermer</button></div>
      <ul>
        {keys.map((k) => {
          const R = ROLES[k] || { name: k, desc: '' };
          const m = M[k] || 0;
          return (
            <li key={k} class={`gr-r${R.team === 'loups' ? ' is-loup' : ''}`}>
              <span class="gr-n">{C[k]} × <b>{R.name}</b>{m ? <span class="gr-dead"> · {m} mort{m > 1 ? 's' : ''}</span> : null}</span>
              <span class="gr-d">{R.desc}</span>
            </li>
          );
        })}
      </ul>
      <p class="muted small">Les rôles distribués ce soir, sans dire qui les a.</p>
    </div>
  );
}

// la nuit, ceux qui n'agissent pas ont de quoi s'occuper : même écran chargé pour tous, personne ne se trahit
const NUIT_Q = ['Qui est ton amoureux secret ici ?', 'Qui finit sous la table ce soir ?', 'Qui a le pire historique de recherche ?', 'Avec qui tu partirais en road trip ?', 'Qui ment le mieux ici ?', 'Qui te doit de l’argent ?', 'Qui ronfle le plus fort, à ton avis ?', 'Qui serait le pire coloc ?', 'Qui envoie des vocaux de 5 minutes ?', 'Qui pleure devant les dessins animés ?', 'Qui a le plus de chances de finir célèbre ?', 'Qui danse le plus mal ?', 'Qui stalke encore son ex ?', 'Qui survit le plus longtemps dans un film d’horreur ?', 'Qui a le pire goût musical ?', 'Qui oublie toujours son portefeuille ?', 'Qui raconte les pires blagues ?', 'Qui appellerais-tu pour cacher un corps ?', 'Qui est le plus jaloux ici ?', 'Qui a déjà vomi en soirée ?', 'Qui serait le pire président ?', 'Qui triche aux jeux de société ?', 'Qui se perd même avec un GPS ?', 'Qui a le plus beau sourire ici ?'];
function NightQuestion({ S, g, uid }) {
  const [k, setK] = useState(() => Math.floor(Math.random() * NUIT_Q.length));
  const [pick, setPick] = useState(null);
  const others = alive(g).filter((x) => x !== uid);
  return (
    <div class="hs-nq">
      <p class="hs-nq-q">{NUIT_Q[k % NUIT_Q.length]}</p>
      {pick ? (
        <div class="hs-nq-ok">
          <span>Noté : <b>{nickOf(S, pick)}</b>. Personne ne le saura.</span>
          <button type="button" class="btn btn-small" onClick={() => { setPick(null); setK(k + 1 + Math.floor(Math.random() * 5)); }}>Autre question</button>
        </div>
      ) : <PlayerGrid S={S} uids={others} onPick={(x) => setPick(x)} />}
    </div>
  );
}

// mini-jeu de nuit : la pinte saute les bouteilles (record gardé sur le téléphone)
function NightRunner() {
  const ref = useRef(null);
  const [best, setBest] = useState(() => { try { return +localStorage.getItem('hs:nuit') || 0; } catch (e) { return 0; } });
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    const d = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d;
    const x = cv.getContext('2d');
    x.scale(d, d);
    const G = H - 18;
    const S = { y: 0, vy: 0, ob: [], t: 0, sp: 4, mort: false, sc: 0, next: 60, raf: 0, best };
    const jump = () => {
      if (S.mort) { S.y = 0; S.vy = 0; S.ob = []; S.t = 0; S.sp = 4; S.sc = 0; S.next = 60; S.mort = false; return; }
      if (S.y === 0) S.vy = 10.5;
    };
    const down = (e) => { e.preventDefault(); jump(); };
    cv.addEventListener('pointerdown', down);
    const step = () => {
      if (!S.mort) {
        S.t += 1; S.sc = Math.floor(S.t / 6); S.sp = 4 + S.t / 700;
        S.vy -= 0.62; S.y = Math.max(0, S.y + S.vy); if (S.y === 0) S.vy = 0;
        if (--S.next <= 0) { S.ob.push({ x: W + 10, h: 14 + Math.random() * 16, w: 10 + Math.random() * 8 }); S.next = 48 + Math.random() * 60 - Math.min(30, S.t / 80); }
        for (const o of S.ob) o.x -= S.sp;
        S.ob = S.ob.filter((o) => o.x > -30);
        for (const o of S.ob) {
          if (o.x < 54 && o.x + o.w > 30 && S.y < o.h - 2) {
            S.mort = true;
            if (S.sc > S.best) { S.best = S.sc; try { localStorage.setItem('hs:nuit', String(S.sc)); } catch (e) { /* stockage bloqué */ } setBest(S.sc); }
          }
        }
      }
      x.clearRect(0, 0, W, H);
      x.fillStyle = 'rgba(246,239,223,.25)'; x.fillRect(0, G, W, 2);
      for (let k = 0; k < 6; k++) { const sx = (k * 97 - ((S.t * 0.4) % 97) + W) % W; x.fillRect(sx, 12 + ((k * 7) % 30), 2, 2); }
      const py = G - S.y;
      x.fillStyle = '#F2C230'; x.fillRect(30, py - 24, 20, 24);
      x.fillStyle = '#F6EFDF'; x.fillRect(28, py - 29, 24, 7);
      x.strokeStyle = '#F2C230'; x.lineWidth = 3; x.strokeRect(50, py - 19, 6, 10);
      x.fillStyle = '#C83A2E';
      for (const o of S.ob) { x.fillRect(o.x, G - o.h, o.w, o.h); x.fillRect(o.x + o.w / 2 - 2, G - o.h - 6, 4, 6); }
      x.fillStyle = '#F6EFDF'; x.font = '600 13px system-ui, sans-serif'; x.textAlign = 'right';
      x.fillText(`${S.sc}  ·  record ${S.best}`, W - 8, 16);
      if (S.mort) { x.textAlign = 'center'; x.font = '700 15px system-ui, sans-serif'; x.fillText('Renversé ! Touche pour rejouer', W / 2, H / 2 - 6); }
      if (S.t === 0 && !S.mort) { x.textAlign = 'center'; x.font = '600 13px system-ui, sans-serif'; x.fillText('Touche pour sauter', W / 2, H / 2 - 6); }
      S.raf = requestAnimationFrame(step);
    };
    S.raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(S.raf); cv.removeEventListener('pointerdown', down); };
  }, []);
  return (
    <div class="hs-nuit">
      <p class="hs-nuit-t">Et en attendant, saute les bouteilles.</p>
      <canvas ref={ref} class="hs-nuit-c" aria-label="Mini-jeu : la pinte saute les bouteilles" />
    </div>
  );
}

// tir du chasseur (ou dernier verre) : on choisit, puis on confirme
function Shoot({ S, uids, last, onFire, disabled }) {
  const [pick, setPick] = useState(null);
  return (
    <div class="act">
      <h3>{last ? 'Ton dernier verre : qui emportes-tu ?' : 'Dernier tir : qui emportes-tu ?'}</h3>
      <p class="hint">Touche un joueur, puis confirme. Prends ton temps, personne ne sort sans ta confirmation.</p>
      <PlayerGrid S={S} uids={uids} picked={pick} onPick={(u) => setPick(pick === u ? null : u)} disabled={disabled} />
      <button type="button" class="btn btn-main btn-big btn-wide" disabled={disabled || !pick} onClick={() => pick && onFire(pick)}>
        {pick ? (last ? `Emporter ${nickOf(S, pick)}` : `Tirer sur ${nickOf(S, pick)}`) : 'Choisis ta cible'}
      </button>
    </div>
  );
}

function Table({ S, g, uid, clock, screen }) {
  const [rolesOpen, setRolesOpen] = useState(false);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const night = g.phase === 'night';
  return (
    <div class={`garou${night ? ' is-night' : ''}${screen ? ' is-screen' : ''}`}>
      <div class="pipo-top">
        <span class="chip">{g.version === 'remaster' ? 'Remasterisée' : 'Classique + alcool'}</span>
        <span class="chip">{g.night ? `Nuit ${g.night}` : 'Distribution'}</span>
        <span class="chip">{plural(alive(g).length, 'survivant', 'survivants')}</span>
        <button type="button" class="chip gr-roles-btn" aria-pressed={rolesOpen ? 'true' : 'false'} onClick={() => setRolesOpen(!rolesOpen)}>Rôles en jeu</button>
      </div>
      {rolesOpen ? <RolesInPlay g={g} onClose={() => setRolesOpen(false)} /> : null}
      <Narration S={S} g={g} clock={clock} />
      {night && uid && !screen && !g.local ? (
        <div class="hs-nuit-wrap">
          <NightQuestion key={`q${g.night}${g.step}`} S={S} g={g} uid={uid} />
          <NightRunner key={`n${g.night}`} />
        </div>
      ) : null}
      <Graveyard S={S} g={g} uid={uid} />
      {g.vres && (g.phase === 'verdict') ? <VoteLog S={S} g={g} /> : null}
    </div>
  );
}

function Narration({ S, g, clock }) {
  let big = '';
  let small = '';
  if (g.phase === 'roles') { big = 'Chacun découvre son rôle'; small = `${Object.keys(g.seen).length} / ${g.pl.length} prêts. Ne montrez votre écran à personne.`; }
  else if (g.phase === 'night') { big = 'La nuit tombe sur le village'; small = STEP_LABEL[g.step] || ''; }
  else if (g.phase === 'shoot') { big = `${nickOf(S, g.shooter)} est mort…`; small = `Avant de partir, ${nickOf(S, g.shooter)} emporte quelqu’un avec lui.`; }
  else if (g.phase === 'day') {
    const d = g.lastDeaths || [];
    big = d.length ? `Le village se réveille : ${d.map((u) => nickOf(S, u)).join(' et ')} ${d.length > 1 ? 'sont morts' : 'est mort'}` : 'Le village se réveille : personne n’est mort cette nuit';
    small = d.length ? `${d.map((u) => `${nickOf(S, u)} était ${ROLES[g.dead[u].role].name}`).join(', ')}. Les morts boivent : 2 gorgées pour une victime des loups, 1 pour un villageois, cul sec pour un loup. Débattez, puis votez.` : 'Débattez, puis votez.';
  } else if (g.phase === 'vote') { big = 'Le village vote'; small = `${Object.keys(g.votes).length} / ${alive(g).length} votes. Vote secret.`; }
  else if (g.phase === 'videur') { big = 'Le verdict tombe…'; small = 'Quelqu’un réfléchit encore.'; }
  else if (g.phase === 'verdict') {
    const v = g.verdict || {};
    if (v.none) { big = 'Égalité : personne ne sort'; small = 'La nuit va tomber.'; }
    else if (v.cancelled) { big = `Le Videur intervient : ${nickOf(S, v.uid)} est épargné`; small = 'Le Videur a utilisé son pouvoir.'; }
    else { big = `${nickOf(S, v.uid)} est éliminé`; small = v.role === 'loup' ? 'C’était un Loup-Garou ! Ceux qui l’ont désigné distribuent 1 gorgée.' : `C’était ${ROLES[v.role] ? ROLES[v.role].name : '…'}. Innocent : 2 gorgées pour chaque juge.`; }
  }
  return (
    <div class={`garou-narr${g.phase === 'night' ? ' is-night' : ''}`} key={`${g.phase}${g.step || ''}${g.night}`}>
      <p class="garou-big">{big}</p>
      {small ? <p class="garou-small">{small}</p> : null}
    </div>
  );
}

function VoteLog({ S, g }) {
  const rows = Object.entries(g.vres.counts).sort((a, b) => b[1] - a[1]);
  return (
    <details class="log" open>
      <summary>Votes</summary>
      <ul>{rows.map(([u, n]) => <li key={u}><b>{nickOf(S, u)}</b> : {plural(n, 'vote', 'votes')}</li>)}</ul>
    </details>
  );
}

function End({ S, g, uid }) {
  return (
    <div class="end">
      <h3 class="end-title">{g.winner === 'stop' ? 'Partie arrêtée' : `${TEAM[g.winner]} ${g.winner === 'village' ? 'gagne' : 'gagnent'}`}</h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Rôle</th><th>État</th></tr></thead>
          <tbody>{g.pl.filter((u) => S.roster[u]).map((u) => (
            <tr key={u}><td><Who S={S} uid={u} you={uid} /></td><td>{ROLES[g.reveal[u]].name}{g.lovers && g.lovers.includes(u) ? ' · amoureux' : ''}</td><td>{g.dead[u] ? g.dead[u].how : 'vivant'}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- actions secrètes

function RoleCard({ secret, small }) {
  const R = ROLES[secret.role];
  if (small) return <p class="garou-mini">Ton rôle : <b>{R.name}</b>{secret.lover ? ' · amoureux' : ''}</p>;
  return (
    <div class={`garou-role word-card paper${secret.role === 'loup' ? ' is-wolf' : ''}`}>
      <span>Tu es</span>
      <b>{R.name}</b>
      <span class="garou-desc">{R.desc}</span>
    </div>
  );
}

function Act({ S, g, uid, req, send, sent, secret }) {
  const [pick, setPick] = useState([]);
  const [kill, setKill] = useState(null);
  const others = alive(g).filter((u) => u !== uid);
  if (!secret) return <Waiting>…</Waiting>;
  if (req.kind === 'role') {
    return (
      <div class="act">
        <h3>Ton rôle secret</h3>
        <RoleCard secret={secret} />
        {secret.mates && secret.mates.length ? <p>Tes complices : <b>{secret.mates.map((u) => nickOf(S, u)).join(', ')}</b></p> : null}
        <button type="button" class="btn btn-main btn-big btn-wide" disabled={sent} onClick={() => send(req.k, true)}>J’ai retenu mon rôle</button>
      </div>
    );
  }
  if (req.kind === 'vision') {
    const last = secret.visions[secret.visions.length - 1];
    return (
      <div class="act">
        <h3>Ta vision</h3>
        {last ? <p class="garou-vision"><b>{nickOf(S, last.u)}</b> est <Stamp size="s">{ROLES[last.role].name}</Stamp></p> : null}
        {secret.role === 'pompette' ? <p class="hint">Une nuit sur trois, tu as trop bu et tu te trompes. Ce soir ? Mystère.</p> : null}
        <button type="button" class="btn btn-main btn-wide" disabled={sent} onClick={() => send(req.k, true)}>Compris, je me rendors</button>
      </div>
    );
  }
  if (req.kind === 'wolf') {
    const prey = others.filter((u) => !(secret.mates || []).includes(u));
    const wv = secret.wvotes || {};
    return (
      <div class="act">
        <h3>Choisissez votre victime</h3>
        {secret.mates && secret.mates.length ? <p class="hint">Complices : {secret.mates.map((u) => `${nickOf(S, u)}${wv[u] ? ` (vise ${nickOf(S, wv[u])})` : ''}`).join(', ')}</p> : null}
        <PlayerGrid S={S} uids={prey} onPick={(u) => send(req.k, u)} disabled={sent} />
      </div>
    );
  }
  if (req.kind === 'cupidon') {
    const all = alive(g);
    return (
      <div class="act">
        <h3>Lie deux amoureux</h3>
        <PlayerGrid S={S} uids={all} picked={pick[0]} onPick={(u) => setPick(pick.includes(u) ? pick.filter((x) => x !== u) : [...pick, u].slice(-2))} disabled={sent} sub={(u) => (pick.includes(u) ? 'choisi' : '')} />
        <button type="button" class="btn btn-main btn-wide" disabled={sent || pick.length !== 2} onClick={() => send(req.k, pick)}>Lier {pick.map((u) => nickOf(S, u)).join(' et ') || '…'}</button>
      </div>
    );
  }
  if (req.kind === 'voyante' || req.kind === 'pompette') {
    return (
      <div class="act">
        <h3>Qui veux-tu sonder ?</h3>
        <PlayerGrid S={S} uids={others} onPick={(u) => send(req.k, u)} disabled={sent} />
      </div>
    );
  }
  if (req.kind === 'barman') {
    return (
      <div class="act">
        <h3>À qui sers-tu la tournée ?</h3>
        <p class="hint">Il est protégé cette nuit, mais il boit 2 gorgées au réveil.{secret.last ? ` Pas ${nickOf(S, secret.last)} deux fois de suite.` : ''}</p>
        <PlayerGrid S={S} uids={alive(g).filter((u) => u !== secret.last)} onPick={(u) => send(req.k, u)} disabled={sent} />
      </div>
    );
  }
  if (req.kind === 'sorciere' || req.kind === 'mixologue') {
    const p = secret.potions || {};
    const mix = req.kind === 'mixologue';
    return (
      <div class="act">
        <h3>{mix ? 'Tes cocktails' : 'Tes potions'}</h3>
        <p>{secret.victim ? <>Les loups ont attaqué <b>{nickOf(S, secret.victim)}</b>.</> : 'Les loups n’ont attaqué personne.'}</p>
        {p.mort ? (
          <>
            <p class="hint">{mix ? 'Cocktail mortel' : 'Potion de mort'} : touche un joueur pour l’éliminer (ou personne).</p>
            <PlayerGrid S={S} uids={others} picked={kill} onPick={(u) => setKill(kill === u ? null : u)} disabled={sent} />
          </>
        ) : <p class="hint">{mix ? 'Cocktail mortel' : 'Potion de mort'} déjà utilisé.</p>}
        <div class="bus-btns two">
          <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, { save: false, kill })}>{kill ? `Éliminer ${nickOf(S, kill)}` : 'Ne rien faire'}</button>
          <button type="button" class="btn btn-main" disabled={sent || !p.vie || !secret.victim} onClick={() => send(req.k, { save: true, kill })}>{p.vie ? `Sauver ${secret.victim ? nickOf(S, secret.victim) : ''}` : 'Soin utilisé'}</button>
        </div>
      </div>
    );
  }
  if (req.kind === 'shoot') return <Shoot key={req.k} S={S} uids={others} last={secret.role === 'dernier'} onFire={(u) => send(req.k, u)} disabled={sent} />;
  if (req.kind === 'videur') {
    return (
      <div class="act">
        <h3>Le village élimine {nickOf(S, g.verdict && g.verdict.uid)}</h3>
        <p class="hint">Tu es le Videur : une fois dans la partie, tu peux annuler cette élimination.</p>
        <div class="bus-btns two">
          <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, 'keep')}>Laisser faire</button>
          <button type="button" class="btn btn-main" disabled={sent} onClick={() => send(req.k, 'cancel')}>Personne ne sort</button>
        </div>
      </div>
    );
  }
  if (req.kind === 'dummy') {
    return (
      <div class="act">
        <h3>Tu dors…</h3>
        <RoleCard secret={secret} small />
        <p class="hint">Pas d’action pour toi cette fois. Prends ton temps comme si tu jouais, puis passe le téléphone.</p>
        <button type="button" class="btn btn-main btn-big btn-wide" disabled={sent} onClick={() => send(req.k, true)}>Je dors, au suivant</button>
      </div>
    );
  }
  if (req.kind === 'vote') {
    return (
      <div class="act">
        <h3>Ton vote secret</h3>
        <p class="hint">Qui est un Loup-Garou ?</p>
        <PlayerGrid S={S} uids={others} onPick={(u) => send(req.k, u)} disabled={sent} />
      </div>
    );
  }
  return null;
}
