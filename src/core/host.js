// Moteur de l'hôte : c'est l'arbitre de la soirée.
// Il tient l'état public (lu par tous), les secrets de chaque joueur (lus uniquement
// par le joueur concerné) et ses données privées (votes cachés…).
// Les joueurs envoient des actions ; l'hôte les valide puis publie le nouvel état.

import { rid, parseJSON, clone, shuffle, pick, avatarId } from '../lib/util.js';
import { GAMES } from '../games/index.js';
import { DEFIS } from '../content/defis.js';
import { CHAMBRE, pickLine, fill } from '../content/chambre.js';
import { surnoms } from '../lib/surnoms.js';

export const LEVELS = { 1: 'Tranquille', 2: 'Drôle', 3: 'Piquant' };
// combien de gorgées vaut un cul sec dans le compteur de la soirée (réglable par l'hôte)
export const CS_CHOICES = [5, 8, 10, 15, 20];
export const DEFAULT_CS = 10;
// ambiance par défaut : « Piquant ». Le contenu reste limité par la limite la plus basse des joueurs présents.
export const DEFAULT_LEVEL = 3;
// adult : paquets « Cul » et « HARD » de Qui oserait… ? — désactivés par défaut, activés par l'hôte avec confirmation
export const DEFAULT_CFG = { level: DEFAULT_LEVEL, cap: 0, cs: DEFAULT_CS, adult: false };
export const csValue = (S) => (S && S.cfg && CS_CHOICES.includes(S.cfg.cs) ? S.cfg.cs : DEFAULT_CS);

// gorgées bues par un joueur depuis le début de la soirée, culs secs convertis en gorgées
export function sipsOf(S, uid) {
  const t = S.tally[uid] || {};
  return (t.d || 0) + (t.cs || 0) * csValue(S);
}

export function newState(code, hostUid, cfg) {
  return {
    v: 1, code, host: hostUid, t: 0, rev: 0,
    status: 'lobby',
    // cap : plafond par pénalité (0 = aucun) ; cs : nombre de gorgées que vaut un cul sec dans le compteur
    cfg: { level: [1, 2, 3].includes(cfg.level) ? cfg.level : DEFAULT_LEVEL, cap: [0, 3, 5, 8].includes(cfg.cap) ? cfg.cap : 0, cs: CS_CHOICES.includes(cfg.cs) ? cfg.cs : DEFAULT_CS, adult: cfg.adult === true },
    order: [], roster: {}, tally: {}, t0: Date.now(), played: [],
    pen: [], gifts: [], ev: [], evi: 0,
    game: null, seq: 0, last: null, hist: [],
  };
}

export class HostEngine {
  constructor(device) {
    this.d = device;
    this.b = device.backend;
    this.code = device.code;
    this.S = null;
    this.priv = {};
    this.secrets = {};
    this.written = { secrets: {}, priv: null };
    this.processed = new Set();
    this.dirty = false;
    this.writing = false;
    this.unsub = [];
    this.stopped = false;
    this.fail = 0;
  }

  async start(initialS) {
    const privStr = await this.b.readPriv(this.code).catch(() => null);
    const saved = parseJSON(privStr, null) || {};
    this.priv = saved.priv || {};
    this.secrets = saved.secrets || {};
    this.written.priv = privStr || null;
    this.S = initialS ? clone(initialS) : null;
    if (!this.S) throw new Error('état introuvable');
    this.S.host = this.d.uid;
    this.unsub.push(this.b.watchInputs(this.code, (list) => this.onInputs(list), (e) => console.warn('entrées', e)));
    this.timer = setInterval(() => this.tick(), 400);
    this.syncPlayers();
    this.commit();
  }

  stop() {
    this.stopped = true;
    clearInterval(this.timer);
    this.unsub.forEach((u) => { try { u(); } catch (e) { /* ignoré */ } });
    this.unsub = [];
  }

  // ---------- joueurs
  online(uid) {
    const p = this.d.players[uid];
    return !!(p && p.online);
  }

  syncPlayers() {
    if (!this.S) return false;
    const S = this.S;
    let changed = false;
    for (const [uid, p] of Object.entries(this.d.players || {})) {
      if (!p || !p.nick) continue;
      if (S.ban && S.ban.includes(uid)) continue; // retiré par l'hôte : il ne revient pas tout seul
      const prof = { nick: p.nick, av: avatarId(p.av), drink: !!p.drink, sob: p.sob === 'points' ? 'points' : 'gage', lim: p.lim || 3, gn: p.gn === 'm' || p.gn === 'f' ? p.gn : 'x' };
      if (!S.roster[uid]) {
        S.roster[uid] = prof;
        if (!S.order.includes(uid)) S.order.push(uid);
        S.tally[uid] = S.tally[uid] || { d: 0, c: 0, x: 0 };
        this.ev(`${prof.nick} rejoint la soirée`, '*', 'join');
        changed = true;
      } else {
        const r = S.roster[uid];
        if (r.nick !== prof.nick || r.av !== prof.av || r.drink !== prof.drink || r.sob !== prof.sob || r.lim !== prof.lim || r.gn !== prof.gn) {
          S.roster[uid] = prof;
          changed = true;
        }
      }
    }
    if (changed) this.commit();
    return changed;
  }

  activeUids() { return this.S.order.filter((u) => this.online(u) && this.S.roster[u]); }

  // niveau d'ambiance effectif : le plus bas entre celui de la soirée et les limites des joueurs présents
  level() {
    let l = this.S.cfg.level;
    for (const u of this.activeUids()) l = Math.min(l, this.S.roster[u].lim || 3);
    return l;
  }

  // chambrage : une phrase en grand sur tous les écrans (une toutes les 5 s au plus, la plus forte gagne)
  chambre(uid, kind, b = null) {
    const S = this.S;
    if (!S.roster[uid] || !CHAMBRE[kind]) return;
    const t = Date.now();
    if (S.chT && t - S.chT < 5000) return;
    S.chT = t;
    S.evi += 1;
    let maison = [];
    try { maison = (this.d.piquesMaison ? this.d.piquesMaison() : []) || []; } catch (e) { maison = []; }
    let txt;
    if (maison.length && Math.random() < 0.4) {
      const m = pick(maison);
      txt = m.includes('{nom}') ? m.split('{nom}').join(this.name(uid)) : `${this.name(uid)} : ${m}`;
    } else txt = fill(pickLine(CHAMBRE[kind], `${S.evi}${uid}`), this.name(uid), b);
    S.ev.push({ i: S.evi, txt, to: '*', k: 'chambre', u: uid });
    if (S.ev.length > 30) S.ev.splice(0, S.ev.length - 30);
  }

  name(uid) { return (this.S.roster[uid] && this.S.roster[uid].nick) || 'Quelqu’un'; }

  // ---------- événements et pénalités
  ev(txt, to = '*', k = 'info') {
    const S = this.S;
    S.evi += 1;
    S.ev.push({ i: S.evi, txt: String(txt).slice(0, 180), to, k });
    if (S.ev.length > 30) S.ev.splice(0, S.ev.length - 30);
  }

  // gages possibles : ceux de l'appli (selon le niveau) et, s'il y en a, les gages maison du groupe
  // (écrits sur le téléphone de l'hôte, tirés une fois sur deux)
  gagePool(lvl) {
    const base = DEFIS.filter((d) => d[0] <= lvl);
    let maison = [];
    try { maison = (this.d.gagesMaison ? this.d.gagesMaison() : []) || []; } catch (e) { maison = []; }
    const mine = maison.filter((t) => typeof t === 'string' && t.trim()).map((t) => [1, t.trim().slice(0, 140)]);
    if (mine.length && this.S.cfg.maison !== false && Math.random() < 0.5) return mine;
    return base.length ? base : DEFIS;
  }

  pen(uid, n, why, from = null) {
    const S = this.S;
    const p = S.roster[uid];
    n = Math.round(n);
    if (!p || !(n > 0)) return 0;
    if (S.cfg.cap > 0) n = Math.min(n, S.cfg.cap);
    const lvl = Math.min(this.S.cfg.level, p.lim || 3);
    // sans alcool : un gage, ou des points de pénalité (une gorgée = un point), au choix du joueur
    const pts = !(p.drink && S.cfg.adult) && p.sob === 'points';
    const item = { id: rid(6), uid, n, why: why || '', sober: !(p.drink && S.cfg.adult) && !pts };
    if (from && S.roster[from]) item.from = from; // gorgées reçues d'un autre joueur (distribution)
    if (pts) item.pts = n;
    if (item.sober) item.def = (globalThis.HS_TIRE || pick)(this.gagePool(lvl))[1];
    S.pen.push(item);
    // pas plus de 6 cartes en attente par joueur : on regroupe les plus anciennes
    const mine = S.pen.filter((x) => x.uid === uid);
    if (mine.length > 6) {
      const [a, b] = mine;
      if (!a.sober) { b.n += a.n; if (a.pts && b.pts) b.pts += a.pts; b.why = 'cumul'; delete b.from; }
      S.pen.splice(S.pen.indexOf(a), 1);
    }
    return n;
  }

  // cul sec : si l'hôte a fixé un plafond, il est respecté (le cul sec devient ce nombre de gorgées)
  penCS(uid, why) {
    const S = this.S;
    const p = S.roster[uid];
    if (!p) return;
    if (S.cfg.cap > 0) { this.pen(uid, S.cfg.cap, `${why} (cul sec plafonné)`); return; }
    const lvl = Math.min(S.cfg.level, p.lim || 3);
    const pts = !(p.drink && S.cfg.adult) && p.sob === 'points';
    const item = { id: rid(6), uid, n: 0, cs: true, why: why || '', sober: !(p.drink && S.cfg.adult) && !pts };
    if (pts) item.pts = csValue(S); // un cul sec vaut autant de points que sa valeur en gorgées
    if (item.sober) item.def = (globalThis.HS_TIRE || pick)(this.gagePool(lvl))[1];
    S.pen.push(item);
  }

  gift(uid, n, why) {
    if (!this.S.roster[uid] || !(n > 0)) return;
    this.S.gifts.push({ id: rid(6), uid, n: Math.round(n), why: why || '' });
  }

  // ---------- entrées des joueurs
  onInputs(list) {
    let changed = false;
    for (const { uid, id, str } of list) {
      if (this.processed.has(id)) continue;
      this.processed.add(id);
      const msg = parseJSON(str, null);
      if (msg && typeof msg.k === 'string') {
        try { changed = this.input(uid, msg.k, msg.v) || changed; } catch (e) { console.error('action refusée', e); }
      }
      this.b.ackInput(this.code, uid, id).catch(() => {});
    }
    if (changed) this.commit();
  }

  input(uid, k, v) {
    const S = this.S;
    if (!S || !S.roster[uid]) return false;
    if (k.startsWith('pen:')) return this.ackPen(uid, k.slice(4), v);
    if (k.startsWith('gift:')) return this.applyGift(uid, k.slice(5), v);
    if (S.game && S.status === 'game') {
      const G = GAMES[S.game.id];
      const c = this.ctx();
      if (!k.startsWith(`${S.game.seq}:`)) return false;
      return !!G.input(c, uid, k.slice(String(S.game.seq).length + 1), v);
    }
    return false;
  }

  ackPen(uid, id, v) {
    const S = this.S;
    const i = S.pen.findIndex((x) => x.id === id && x.uid === uid);
    if (i < 0) return false;
    const item = S.pen[i];
    if (v === 'swap') {
      // alternative sans pénalité : un gage à la place des gorgées (ou des points), ou un autre gage
      const p = S.roster[uid];
      const lvl = Math.min(S.cfg.level, (p && p.lim) || 3);
      const all = this.gagePool(lvl);
      const pool = all.filter((d) => d[1] !== item.def);
      item.sober = true;
      delete item.pts;
      item.def = pick(pool.length ? pool : all)[1];
      item.swaps = (item.swaps || 0) + 1;
      return true;
    }
    S.pen.splice(i, 1);
    const lead0 = this.leader();
    const sur0 = surnoms(S);
    const t = S.tally[uid] || (S.tally[uid] = { d: 0, c: 0, x: 0 });
    if (v === 'pass') t.x += 1;
    else if (item.sober) t.c += 1;
    else if (item.pts) t.p = (t.p || 0) + item.pts;
    else if (item.cs) t.cs = (t.cs || 0) + 1;
    else t.d += item.n;
    // séries : pénalités prises coup sur coup (moins de 4 minutes entre deux)
    S.serie = S.serie || {};
    const now = Date.now();
    const sr = S.serie[uid] && now - S.serie[uid].at < 240000 ? S.serie[uid] : { n: 0 };
    S.serie[uid] = { n: v === 'pass' ? 0 : sr.n + 1, at: now };
    const lead1 = this.leader();
    if (v === 'pass') this.chambre(uid, 'pass');
    else if (S.serie[uid].n === 5) this.chambre(uid, 'serie5');
    else if (S.serie[uid].n === 3) this.chambre(uid, 'serie3');
    else if (lead1 === uid && lead0 !== uid && sipsOf(S, uid) >= 8) this.chambre(uid, 'roi');
    else if (item.cs && !item.sober && !item.pts) this.chambre(uid, 'cs');
    else if (!item.sober && !item.pts && item.n >= 5) this.chambre(uid, 'big', item.n);
    this.annonceSurnoms(sur0);
    return true;
  }

  annonceSurnoms(avant) {
    const apres = surnoms(this.S);
    for (const [u, t] of Object.entries(apres)) if (avant[u] !== t) this.ev(`${this.name(u)} devient « ${t} »`, '*', 'surnom');
  }

  leader() {
    let best = null; let n = 0;
    for (const u of Object.keys(this.S.tally)) { const k = sipsOf(this.S, u); if (k > n) { n = k; best = u; } }
    return best;
  }

  applyGift(uid, id, v) {
    const S = this.S;
    const i = S.gifts.findIndex((x) => x.id === id && x.uid === uid);
    if (i < 0 || !v || typeof v !== 'object') return false;
    const gift = S.gifts[i];
    let total = 0;
    const plan = [];
    for (const [to, n] of Object.entries(v)) {
      const m = Math.floor(Number(n));
      if (!S.roster[to] || to === uid || !(m > 0)) continue;
      total += m;
      plan.push([to, m]);
    }
    if (total < 1 || total > gift.n) return false;
    S.gifts.splice(i, 1);
    const sur0 = surnoms(S);
    for (const [to, m] of plan) this.pen(to, m, `de la part de ${this.name(uid)}`, uid);
    const [top] = plan.slice().sort((a, b) => b[1] - a[1]);
    if (top && top[1] >= 4 && plan.length === 1) this.chambre(top[0], 'cible', this.name(uid));
    // gorgées données (pour les stats et le récap de la soirée)
    const tg = S.tally[uid] || (S.tally[uid] = { d: 0, c: 0, x: 0 });
    tg.g = (tg.g || 0) + total;
    this.ev(`${this.name(uid)} a distribué ${gift.n} gorgée${gift.n > 1 ? 's' : ''}`, '*', 'gift');
    this.annonceSurnoms(sur0);
    return true;
  }

  record(uid, key, v, low = false) {
    const S = this.S;
    if (!S.roster[uid] || typeof v !== 'number' || !Number.isFinite(v)) return;
    S.rec = S.rec || {};
    const cur = S.rec[key];
    if (!cur || (low ? v < cur.v : v > cur.v)) S.rec[key] = { uid, v };
    S.prec = S.prec || {};
    const mine = (S.prec[uid] = S.prec[uid] || {});
    if (mine[key] == null || (low ? v < mine[key] : v > mine[key])) mine[key] = v;
  }

  count(uid, key, n = 1) {
    const S = this.S;
    if (!S.roster[uid] || !(n > 0)) return;
    S.cnt = S.cnt || {};
    const mine = (S.cnt[uid] = S.cnt[uid] || {});
    mine[key] = (mine[key] || 0) + n;
  }

  // ---------- contexte donné aux jeux
  ctx() {
    const S = this.S;
    const self = this;
    const g = S.game ? S.game.g : null;
    if (S.game) {
      this.priv.games = this.priv.games || {};
      this.priv.games[S.game.seq] = this.priv.games[S.game.seq] || {};
    }
    return {
      S, g,
      opts: S.game ? S.game.opts : {},
      seq: S.game ? S.game.seq : 0,
      priv: S.game ? this.priv.games[S.game.seq] : {},
      now: () => self.b.now(),
      isLocal: self.d.mode === 'local',
      host: self.d.uid,
      online: (u) => self.online(u),
      // l'ordre des joueurs tourne d'une partie à l'autre : ce n'est pas toujours le même qui commence
      activeUids: () => { const L = self.activeUids(); const k = S.game && L.length ? S.game.seq % L.length : 0; return L.slice(k).concat(L.slice(0, k)); },
      level: () => self.level(),
      name: (u) => self.name(u),
      roster: S.roster,
      pen: (u, n, why) => self.pen(u, n, why),
      penCS: (u, why) => self.penCS(u, why),
      gift: (u, n, why) => self.gift(u, n, why),
      // records de la soirée : meilleure valeur par joueur et pour la table (low : plus petit = mieux)
      record: (u, key, v, low = false) => self.record(u, key, v, low),
      // compteurs de la soirée pour les titres du récap (ex. faux départs, bombes, vies perdues)
      count: (u, key, n = 1) => self.count(u, key, n),
      ev: (txt, to, k) => self.ev(txt, to, k),
      setSecret: (u, obj) => { if (obj == null) delete self.secrets[u]; else self.secrets[u] = obj; },
      getSecret: (u) => self.secrets[u] || null,
      // contenus.js : tirage sans répétition d'une partie à l'autre (sauf mélange avec graine)
      shuffle: (arr, rnd) => (rnd || !globalThis.HS_MELANGE ? shuffle(arr, rnd) : globalThis.HS_MELANGE((S.game && S.game.id) || 'jeu', arr, shuffle)),
      rid,
    };
  }

  // ---------- actions de l'hôte (boutons)
  act(name, arg) {
    const S = this.S;
    if (!S) return;
    let changed = false;
    if (name === 'settings') {
      if (arg && typeof arg === 'object') {
        if ([1, 2, 3].includes(arg.level)) S.cfg.level = arg.level;
        if ([0, 3, 5, 8].includes(arg.cap)) S.cfg.cap = arg.cap;
        if (CS_CHOICES.includes(arg.cs)) S.cfg.cs = arg.cs;
        if (typeof arg.adult === 'boolean') S.cfg.adult = arg.adult;
        changed = true;
      }
    } else if (name === 'start') {
      changed = this.startGame(arg.id, arg.opts || {});
    } else if (name === 'lobby') {
      changed = this.toLobby();
    } else if (name === 'replay') {
      if (S.game) changed = this.startGame(S.game.id, S.game.opts);
    } else if (name === 'kick') {
      if (arg && arg !== this.d.uid && S.roster[arg]) {
        this.ev(`${this.name(arg)} a été retiré de la soirée`, '*', 'info');
        delete S.roster[arg];
        S.order = S.order.filter((u) => u !== arg);
        S.pen = S.pen.filter((x) => x.uid !== arg);
        S.gifts = S.gifts.filter((x) => x.uid !== arg);
        delete this.secrets[arg];
        S.ban = [...(S.ban || []).filter((x) => x !== arg), arg].slice(-20);
        this.b.removePlayer(this.code, arg).catch(() => {});
        changed = true;
      }
    } else if (name === 'move') {
      const { uid, dir } = arg || {};
      const i = S.order.indexOf(uid);
      const j = i + (dir < 0 ? -1 : 1);
      if (i >= 0 && j >= 0 && j < S.order.length) {
        [S.order[i], S.order[j]] = [S.order[j], S.order[i]];
        changed = true;
      }
    } else if (name === 'clearPen') {
      S.pen = S.pen.filter((x) => x.uid !== arg);
      S.gifts = S.gifts.filter((x) => x.uid !== arg);
      changed = true;
    } else if (name === 'game' && S.game && S.status === 'game') {
      const G = GAMES[S.game.id];
      try { changed = !!G.act(this.ctx(), arg && arg.id, arg && arg.arg); } catch (e) { console.error(e); }
    }
    if (changed) this.commit();
  }

  startGame(id, opts) {
    const S = this.S;
    const G = GAMES[id];
    if (!G) return false;
    // jeux arcade (Dégaine, Bombe, Ware) : un seul téléphone posé ou passé de main en main, jamais en salon
    if (G.solo && this.d.mode !== 'local') {
      this.d.toast('Ce jeu se joue sur un seul téléphone : lance-le en mode « Un téléphone qui tourne ».', 'warn');
      return false;
    }
    const active = this.activeUids();
    if (active.length < G.min) {
      this.d.toast(`Il faut au moins ${G.min} joueurs connectés pour ce jeu.`, 'warn');
      return false;
    }
    if (S.game) this.cleanupGame();
    S.seq += 1;
    const o = {};
    for (const opt of G.options || []) {
      const v = opts[opt.id];
      if (opt.multi) {
        // plusieurs choix cochés (ex. niveaux de « Je n’ai jamais ») : on garde les choix connus, au moins un
        const list = Array.isArray(v) ? v.filter((x, i) => v.indexOf(x) === i && opt.choices.some((ch) => ch[0] === x)) : [];
        o[opt.id] = list.length ? list : opt.def.slice();
      } else o[opt.id] = opt.choices.some((ch) => ch[0] === v) ? v : opt.def;
    }
    S.game = { id, seq: S.seq, opts: o, g: null };
    this.secrets = {};
    try {
      S.game.g = G.start(this.ctx());
    } catch (e) {
      console.error(e);
      S.game = null;
      this.d.toast('Impossible de lancer ce jeu.', 'warn');
      return false;
    }
    S.status = 'game';
    S.played = [...(S.played || []), id].slice(-40); // pour l'historique des soirées
    this.ev(`C'est parti : ${G.name}`, '*', 'game');
    return true;
  }

  cleanupGame() {
    const S = this.S;
    if (!S.game) return;
    const G = GAMES[S.game.id];
    try { if (G.cleanup) G.cleanup(this.ctx()); } catch (e) { /* ignoré */ }
    if (S.game.g && S.game.g.phase === 'end' && S.game.g.summary) {
      S.hist.push({ id: S.game.id, seq: S.game.seq, summary: S.game.g.summary });
      if (S.hist.length > 20) S.hist.splice(0, S.hist.length - 20);
    }
    if (this.priv.games) delete this.priv.games[S.game.seq];
    this.secrets = {};
  }

  toLobby() {
    const S = this.S;
    if (S.game) {
      this.cleanupGame();
      S.last = { id: S.game.id };
      S.game = null;
    }
    S.status = 'lobby';
    return true;
  }

  tick() {
    if (this.stopped || !this.S) return;
    const S = this.S;
    if (S.game && S.status === 'game') {
      const G = GAMES[S.game.id];
      if (G.tick) {
        try { if (G.tick(this.ctx())) this.commit(); } catch (e) { console.error(e); }
      }
    }
  }

  // ---------- publication
  commit() {
    if (this.stopped) return;
    this.dirty = true;
    this.d.onHostState(this.S); // affichage immédiat sur l'appareil de l'hôte
    if (!this.writing) this.flush();
  }

  async flush() {
    this.writing = true;
    while (this.dirty && !this.stopped) {
      this.dirty = false;
      const S = this.S;
      S.rev += 1;
      S.t = this.b.now();
      const str = JSON.stringify(S);
      try {
        await this.b.writeState(this.code, str);
        for (const [uid, sec] of Object.entries(this.secrets)) {
          if (this.stopped) break;
          const s = JSON.stringify(sec);
          if (this.written.secrets[uid] !== s) {
            await this.b.writeSecret(this.code, uid, s);
            this.written.secrets[uid] = s;
          }
        }
        for (const uid of Object.keys(this.written.secrets)) {
          if (this.stopped) break;
          if (!this.secrets[uid]) {
            await this.b.writeSecret(this.code, uid, null);
            delete this.written.secrets[uid];
          }
        }
        const p = JSON.stringify({ priv: this.priv, secrets: this.secrets });
        if (!this.stopped && p !== this.written.priv) {
          await this.b.writePriv(this.code, p);
          this.written.priv = p;
        }
        this.fail = 0;
        this.d.setSync(true);
      } catch (e) {
        if (this.stopped) break;
        console.warn('écriture', e);
        this.fail += 1;
        this.d.setSync(false);
        this.dirty = true;
        await new Promise((r) => setTimeout(r, Math.min(4000, 400 * this.fail)));
        if (e && e.code === 'PERMISSION_DENIED' && this.fail > 3) {
          this.d.lostHost();
          break;
        }
      }
    }
    this.writing = false;
  }
}

// Utilitaire partagé : liste des joueurs d'un état dans l'ordre des places
export function seats(S) {
  return S ? S.order.filter((u) => S.roster[u]) : [];
}

export { shuffle };
