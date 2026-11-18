// Hors Service : serveur des comptes (Cloudflare Worker + base D1, offres gratuites).
// Connexion sans mot de passe : un code à 6 chiffres envoyé par e-mail. Le compte garde le perso, les cartes débloquées
// en jouant et le skin choisi. Aucune donnée de jeu (questions, réponses, gorgées) n'arrive ici.
//
// Liaison (wrangler.toml) : DB (base D1). Variables : ORIGINES, EXPEDITEUR, MODE_ESSAI.
// Secrets (npx wrangler secret put …) : SEL, et RESEND_CLE ou BREVO_CLE pour envoyer les e-mails.
// MODE_ESSAI = "1" : pour les adresses en @essai.test (domaine réservé, qui ne peut pas exister), le code est rendu
// dans la réponse au lieu d'être envoyé. Les vraies adresses passent toujours par l'e-mail.

const DUREE_CODE = 15 * 60;                 // un code vaut 15 minutes
const DUREE_SESSION = 365 * 24 * 3600;      // on reste connecté un an sur un téléphone
const ESSAIS_PAR_CODE = 5;                  // cinq essais par code
const CODES_PAR_HEURE = 5;                  // par adresse
const DEMANDES_RESEAU_PAR_HEURE = 30;       // par réseau (adresse IP)
const ECHECS_PAR_JOUR = 20;                 // au-delà, l'adresse est bloquée 24 h (contre les essais au hasard)
const DOMAINE_ESSAI = '@essai.test';

// Le catalogue des 100 skins : 55 communes, 30 rares, 10 épiques, 5 légendaires (mêmes identifiants que cartes-skins.js)
const serie = (p, nb) => Array.from({ length: nb }, (_, i) => `${p}-${String(i + 1).padStart(3, '0')}`);
export const CATALOGUE = { C: serie('C', 55), R: serie('R', 30), E: serie('E', 10), L: serie('L', 5) };
// Déblocage en jouant (proposition, à régler ici) : nombre de cartes de chaque rareté dues après « p » parties lancées.
// Tout est débloqué après 400 parties. Gratuit : pas de boutique, pas de tirage payant.
export const PALIERS_LEGENDAIRES = [50, 120, 200, 300, 400];
export function dues(p) {
  return { C: Math.min(55, 1 + Math.floor(p / 2)), R: Math.min(30, Math.floor(p / 6)), E: Math.min(10, Math.floor(p / 25)), L: PALIERS_LEGENDAIRES.filter((s) => p >= s).length };
}
export function prochaine(p) {
  const d = dues(p);
  for (let k = p + 1; k <= p + 500; k++) { const e = dues(k); for (const r of 'CREL') if (e[r] > d[r]) return { dans: k - p, rarete: r }; }
  return null;
}

// --- outils ---
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hacher(texte, sel) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(`${sel || ''}|${texte}`))); }
function aleatoire(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
const jeton = () => btoa(String.fromCharCode(...aleatoire(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const code6 = () => String(new DataView(aleatoire(4).buffer).getUint32(0) % 1000000).padStart(6, '0');
const normaliser = (e) => String(e || '').trim().toLowerCase();
const emailValide = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const maintenant = () => Math.floor(Date.now() / 1000);
const lireJson = (t, defaut) => { try { return t == null ? defaut : JSON.parse(t); } catch { return defaut; } };
// ordre de déblocage propre à chaque compte (mélange rejouable), C-001 toujours en premier
function ordre(id) {
  let x = 0; for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  if (!x) x = 1;
  const h = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const melange = (l) => { const t = l.slice(); for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(h() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; } return t; };
  return { C: ['C-001', ...melange(CATALOGUE.C.slice(1))], R: melange(CATALOGUE.R), E: melange(CATALOGUE.E), L: melange(CATALOGUE.L) };
}
export function debloquer(c) {
  const d = dues(c.parties || 0), o = ordre(c.id), avant = new Set(c.cartes), nouvelles = [];
  for (const r of 'CREL') {
    let n = c.cartes.filter((x) => x[0] === r).length;
    for (const id of o[r]) { if (n >= d[r]) break; if (!avant.has(id)) { nouvelles.push(id); n++; } }
  }
  c.cartes = [...c.cartes, ...nouvelles];
  return nouvelles;
}
const versCompte = (l) => l && ({ id: l.id, email: l.email, cree: l.cree, cartes: lireJson(l.cartes, ['C-001']), skin: l.skin || null, perso: lireJson(l.perso, null), parties: l.parties || 0, jeux: lireJson(l.jeux, {}), cles: lireJson(l.cles, []) });
const publicCompte = (c) => ({ email: c.email, cartes: c.cartes, skin: c.skin || null, perso: c.perso || null, parties: c.parties || 0, prochaine: prochaine(c.parties || 0), cree: c.cree });
// le perso est celui de l'appli (« hs:profile ») : des champs simples, une taille raisonnable
function persoPropre(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || JSON.stringify(p).length > 6000) return null;
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (!/^[a-zA-Z0-9_]{1,24}$/.test(k)) continue;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    else if (typeof v === 'object' && JSON.stringify(v).length < 3000) out[k] = v;
  }
  if (typeof out.nick === 'string') out.nick = out.nick.slice(0, 24);
  return out;
}

// --- base ---
const sql = (env, q, ...args) => env.DB.prepare(q).bind(...args);
async function compter(env, cle, max, duree) {
  const t = maintenant();
  const l = await sql(env, 'INSERT INTO limites (cle, n, expire) VALUES (?1, 1, ?2) ON CONFLICT (cle) DO UPDATE SET n = CASE WHEN expire < ?3 THEN 1 ELSE n + 1 END, expire = CASE WHEN expire < ?3 THEN ?2 ELSE expire END RETURNING n', cle, t + duree, t).first();
  return l.n <= max;
}
async function depasse(env, cle, max) { const l = await sql(env, 'SELECT n FROM limites WHERE cle = ?1 AND expire >= ?2', cle, maintenant()).first(); return !!l && l.n >= max; }
async function sauver(env, c) {
  await sql(env, 'UPDATE comptes SET cartes = ?2, skin = ?3, perso = ?4, perso_maj = ?5, parties = ?6, jeux = ?7, cles = ?8, vu = ?9 WHERE id = ?1',
    c.id, JSON.stringify(c.cartes), c.skin || null, c.perso ? JSON.stringify(c.perso) : null, c.persoMaj || null, c.parties || 0, JSON.stringify(c.jeux || {}), JSON.stringify(c.cles || []), new Date().toISOString()).run();
}
export async function nettoyer(env) {
  const t = maintenant();
  await env.DB.batch([sql(env, 'DELETE FROM limites WHERE expire < ?1', t), sql(env, 'DELETE FROM codes WHERE expire < ?1', t), sql(env, 'DELETE FROM sessions WHERE expire < ?1', t)]);
}

// --- e-mail ---
function message(code, langue) {
  const en = langue === 'en';
  const sujet = en ? `Your Hors Service code: ${code}` : `Ton code Hors Service : ${code}`;
  const texte = en ? `Your code to sign in to Hors Service: ${code}\nIt is valid for 15 minutes. If you did not ask for it, ignore this e-mail.`
    : `Ton code pour te connecter à Hors Service : ${code}\nIl est valable 15 minutes. Si tu ne l'as pas demandé, ignore cet e-mail.`;
  const html = `<div style="font-family:Georgia,serif;background:#1f4d38;padding:24px"><div style="background:#f6efdf;color:#22201c;max-width:420px;margin:0 auto;padding:24px;border:2px solid #22201c"><p style="margin:0 0 8px;font-size:15px">${en ? 'Your code to sign in to Hors Service' : 'Ton code pour te connecter à Hors Service'}</p><p style="margin:0 0 12px;font-size:34px;letter-spacing:6px;font-weight:bold">${code}</p><p style="margin:0;font-size:13px">${en ? 'Valid for 15 minutes. If you did not ask for it, ignore this e-mail.' : 'Valable 15 minutes. Si tu ne l’as pas demandé, ignore cet e-mail.'}</p></div></div>`;
  return { sujet, texte, html };
}
async function envoyer(env, email, code, langue) {
  const m = message(code, langue), de = env.EXPEDITEUR || 'Hors Service <compte@exemple.fr>';
  if (env.GMAIL_URL && env.GMAIL_CLE) {
    // Envoi par un Gmail dédié, via le script Google « serveur-comptes/gmail/Envoi des codes.gs » (gratuit, sans domaine).
    const r = await fetch(env.GMAIL_URL, { method: 'POST', redirect: 'follow', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ cle: env.GMAIL_CLE, a: email, sujet: m.sujet, texte: m.texte, html: m.html }) });
    const t = r.ok ? (await r.text()).trim() : '';
    if (t !== 'ok') throw new Error(`Gmail ${r.status} ${t.slice(0, 40)}`);
    return 'gmail';
  }
  if (env.RESEND_CLE) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_CLE}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: de, to: [email], subject: m.sujet, text: m.texte, html: m.html }) });
    if (!r.ok) throw new Error(`Resend ${r.status}`);
    return 'resend';
  }
  if (env.BREVO_CLE) {
    const nom = (de.match(/^(.*?)\s*</) || [])[1] || 'Hors Service', adr = (de.match(/<([^>]+)>/) || [])[1] || de;
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_CLE, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: { name: nom, email: adr }, to: [{ email }], subject: m.sujet, textContent: m.texte, htmlContent: m.html }) });
    if (!r.ok) throw new Error(`Brevo ${r.status}`);
    return 'brevo';
  }
  throw new Error('aucun service d’envoi configuré');
}

// --- réponses ---
function cors(req, env) {
  const o = req.headers.get('origin') || '', ok = (env.ORIGINES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = { 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '86400', vary: 'Origin' };
  if (o && (ok.includes(o) || ok.includes('*'))) h['access-control-allow-origin'] = o;
  return h;
}
const json = (corps, statut, h) => new Response(JSON.stringify(corps), { status: statut || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });
const ERR = {
  email: ['Adresse e-mail invalide.', 'Invalid e-mail address.'],
  trop: ['Trop de demandes. Réessaie plus tard.', 'Too many requests. Try again later.'],
  expire: ['Code expiré. Demande un nouveau code.', 'Code expired. Ask for a new one.'],
  faux: ['Code incorrect.', 'Wrong code.'],
  essais: ['Trop d’essais. Demande un nouveau code.', 'Too many attempts. Ask for a new code.'],
  session: ['Session expirée. Reconnecte-toi.', 'Session expired. Sign in again.'],
  skin: ['Cette carte n’est pas encore débloquée.', 'This card is not unlocked yet.'],
  perso: ['Perso illisible.', 'Unreadable character.'],
  envoi: ['L’e-mail n’a pas pu partir. Réessaie plus tard.', 'The e-mail could not be sent. Try again later.'],
  inconnu: ['Introuvable.', 'Not found.'],
};
const erreur = (cle, langue, statut, h) => json({ erreur: ERR[cle][langue === 'en' ? 1 : 0], cle }, statut, h);

async function compteDeLaSession(req, env) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const sh = await hacher(t, env.SEL);
  const l = await sql(env, 'SELECT c.* FROM sessions s JOIN comptes c ON c.id = s.compte_id WHERE s.h = ?1 AND s.expire > ?2', sh, maintenant()).first();
  return l ? { c: versCompte(l), sh } : null;
}

export default {
  async fetch(req, env) {
    const h = cors(req, env); const url = new URL(req.url); const chemin = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    let corps = {};
    if (req.method === 'POST' || req.method === 'PUT') { try { corps = await req.json(); } catch { corps = {}; } }
    const langue = corps.langue === 'en' || url.searchParams.get('langue') === 'en' ? 'en' : 'fr';
    try {
      if (chemin === '/sante') return json({ ok: true }, 200, h);

      if (chemin === '/code' && req.method === 'POST') {
        const email = normaliser(corps.email); if (!emailValide(email)) return erreur('email', langue, 400, h);
        const eh = await hacher(email, env.SEL), reseau = await hacher(req.headers.get('cf-connecting-ip') || 'local', env.SEL);
        if (await depasse(env, 'echecs:' + eh, ECHECS_PAR_JOUR)) return erreur('trop', langue, 429, h);
        if (!(await compter(env, 'reseau:' + reseau, DEMANDES_RESEAU_PAR_HEURE, 3600)) || !(await compter(env, 'code:' + eh, CODES_PAR_HEURE, 3600))) return erreur('trop', langue, 429, h);
        const code = code6();
        await sql(env, 'INSERT INTO codes (email_h, h, essais, expire) VALUES (?1, ?2, 0, ?3) ON CONFLICT (email_h) DO UPDATE SET h = ?2, essais = 0, expire = ?3', eh, await hacher(code, env.SEL), maintenant() + DUREE_CODE).run();
        if (env.MODE_ESSAI === '1' && email.endsWith(DOMAINE_ESSAI)) return json({ ok: true, essai: true, code }, 200, h);
        try { await envoyer(env, email, code, langue); } catch (e) { console.log('envoi impossible :', e.message); return erreur('envoi', langue, 502, h); }
        return json({ ok: true }, 200, h);
      }

      if (chemin === '/connexion' && req.method === 'POST') {
        const email = normaliser(corps.email), code = String(corps.code || '').replace(/\D/g, '');
        if (!emailValide(email)) return erreur('email', langue, 400, h);
        const eh = await hacher(email, env.SEL);
        if (await depasse(env, 'echecs:' + eh, ECHECS_PAR_JOUR)) return erreur('trop', langue, 429, h);
        const rec = await sql(env, 'SELECT h, essais FROM codes WHERE email_h = ?1 AND expire >= ?2', eh, maintenant()).first();
        if (!rec) return erreur('expire', langue, 400, h);
        if (rec.essais >= ESSAIS_PAR_CODE) return erreur('essais', langue, 429, h);
        if ((await hacher(code, env.SEL)) !== rec.h) {
          await sql(env, 'UPDATE codes SET essais = essais + 1 WHERE email_h = ?1', eh).run();
          await compter(env, 'echecs:' + eh, 1e9, 24 * 3600);
          return erreur(rec.essais + 1 >= ESSAIS_PAR_CODE ? 'essais' : 'faux', langue, 400, h);
        }
        await sql(env, 'DELETE FROM codes WHERE email_h = ?1', eh).run();
        let c = versCompte(await sql(env, 'SELECT * FROM comptes WHERE email_h = ?1', eh).first());
        if (!c) {
          const id = crypto.randomUUID(), cree = new Date().toISOString();
          await sql(env, 'INSERT INTO comptes (id, email_h, email, cree, vu) VALUES (?1, ?2, ?3, ?4, ?4)', id, eh, email, cree).run();
          c = { id, email, cree, cartes: ['C-001'], skin: null, perso: null, parties: 0, jeux: {}, cles: [] };
        }
        const t = jeton();
        await sql(env, 'INSERT INTO sessions (h, compte_id, expire) VALUES (?1, ?2, ?3)', await hacher(t, env.SEL), c.id, maintenant() + DUREE_SESSION).run();
        await sql(env, 'UPDATE comptes SET vu = ?2 WHERE id = ?1', c.id, new Date().toISOString()).run();
        return json({ jeton: t, compte: publicCompte(c) }, 200, h);
      }

      if (chemin.startsWith('/compte') || chemin === '/deconnexion') {
        const s = await compteDeLaSession(req, env); if (!s) return erreur('session', langue, 401, h);
        const { c } = s;
        if (chemin === '/compte' && req.method === 'GET') return json({ compte: publicCompte(c) }, 200, h);
        if (chemin === '/compte/perso' && req.method === 'PUT') {
          const p = persoPropre(corps.perso); if (!p) return erreur('perso', langue, 400, h);
          c.perso = p; c.persoMaj = new Date().toISOString(); await sauver(env, c);
          return json({ compte: publicCompte(c) }, 200, h);
        }
        if (chemin === '/compte/skin' && req.method === 'PUT') {
          const k = corps.skin == null ? null : String(corps.skin);
          if (k && !c.cartes.includes(k)) return erreur('skin', langue, 400, h);
          c.skin = k; await sauver(env, c);
          return json({ compte: publicCompte(c) }, 200, h);
        }
        if (chemin === '/compte/partie' && req.method === 'POST') {
          const cle = String(corps.cle || '').slice(0, 80), jeu = String(corps.jeu || '').slice(0, 40);
          if (!cle || c.cles.includes(cle)) return json({ compte: publicCompte(c), nouvelles: [] }, 200, h);
          c.cles = [...c.cles, cle].slice(-300); c.parties = (c.parties || 0) + 1; if (jeu) c.jeux[jeu] = (c.jeux[jeu] || 0) + 1;
          const nouvelles = debloquer(c); await sauver(env, c);
          return json({ compte: publicCompte(c), nouvelles }, 200, h);
        }
        if (chemin === '/deconnexion' && req.method === 'POST') { await sql(env, 'DELETE FROM sessions WHERE h = ?1', s.sh).run(); return json({ ok: true }, 200, h); }
        if (chemin === '/compte' && req.method === 'DELETE') {
          await env.DB.batch([sql(env, 'DELETE FROM sessions WHERE compte_id = ?1', c.id), sql(env, 'DELETE FROM comptes WHERE id = ?1', c.id), sql(env, 'DELETE FROM codes WHERE email_h = ?1', await hacher(c.email, env.SEL))]);
          return json({ ok: true }, 200, h);
        }
      }
      return erreur('inconnu', langue, 404, h);
    } catch (e) {
      console.log('erreur', (e && e.stack) || e);
      return json({ erreur: langue === 'en' ? 'Server error.' : 'Erreur du serveur.' }, 500, h);
    }
  },
  // ménage quotidien (codes, sessions et compteurs périmés)
  async scheduled(evt, env, ctx) { ctx.waitUntil(nettoyer(env)); },
};
