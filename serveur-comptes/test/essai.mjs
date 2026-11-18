// Essais du serveur des comptes, sans réseau : base SQLite au schéma de D1, faux service d'e-mail, horloge réglable.
import serveur, { dues, prochaine, CATALOGUE, nettoyer } from '../src/index.js';
import { fausseBase } from './d1.mjs';
let ok = 0, ko = 0; const verif = (c, msg) => { if (c) ok++; else { ko++; console.log('ÉCHEC', msg); } };
const vraiNow = Date.now; let decalage = 0; Date.now = () => vraiNow() + decalage;
const DB = fausseBase(); const mails = [];
globalThis.fetch = async (url, o) => { mails.push({ url, corps: JSON.parse(o.body) }); return new Response('{}', { status: 200 }); };
const env = { DB, SEL: 'sel-essai', ORIGINES: 'https://katjounis.github.io', RESEND_CLE: 'cle', EXPEDITEUR: 'Hors Service <compte@hs.fr>', MODE_ESSAI: '1' };
let ip = '1.2.3.4';
const appel = async (methode, chemin, corps, jeton, e = env) => { const r = await serveur.fetch(new Request('https://comptes.test' + chemin, { method: methode, headers: { origin: 'https://katjounis.github.io', 'cf-connecting-ip': ip, 'content-type': 'application/json', ...(jeton ? { authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined }), e); return { s: r.status, j: await r.json().catch(() => null), h: r.headers }; };
const codeDuMail = () => mails[mails.length - 1].corps.text.match(/\d{6}/)[0];
const autre = (c) => (c === '000000' ? '111111' : '000000');

let r = await appel('GET', '/sante'); verif(r.s === 200 && r.j.ok, 'santé'); verif(r.h.get('access-control-allow-origin') === 'https://katjounis.github.io', 'CORS autorisé pour le site');
r = await serveur.fetch(new Request('https://comptes.test/sante', { headers: { origin: 'https://pirate.example' } }), env); verif(!r.headers.get('access-control-allow-origin'), 'autre site : pas d’autorisation CORS');
r = await serveur.fetch(new Request('https://comptes.test/code', { method: 'OPTIONS', headers: { origin: 'https://katjounis.github.io' } }), env); verif(r.status === 204 && /authorization/.test(r.headers.get('access-control-allow-headers')), 'pré-vérification CORS');
r = await appel('POST', '/code', { email: 'pas-une-adresse' }); verif(r.s === 400 && r.j.cle === 'email', 'adresse invalide refusée');
r = await appel('POST', '/code', { email: ' Bit@Exemple.FR ' }); verif(r.s === 200 && r.j.ok && !r.j.code, 'vraie adresse : code envoyé par e-mail, jamais renvoyé dans la réponse (même en mode essai)');
verif(mails.length === 1 && mails[0].url.includes('resend') && mails[0].corps.to[0] === 'bit@exemple.fr' && /Ton code Hors Service/.test(mails[0].corps.subject), 'e-mail parti chez Resend, adresse normalisée, en français');
const code = codeDuMail();
r = await appel('POST', '/connexion', { email: 'bit@exemple.fr', code: autre(code) }); verif(r.s === 400 && r.j.cle === 'faux', 'mauvais code refusé');
r = await appel('POST', '/connexion', { email: 'bit@exemple.fr', code }); verif(r.s === 200 && r.j.jeton && r.j.compte.cartes.join() === 'C-001' && r.j.compte.parties === 0, 'connexion : compte créé avec la carte C-001');
const t1 = r.j.jeton;
r = await appel('POST', '/connexion', { email: 'bit@exemple.fr', code }); verif(r.s === 400 && r.j.cle === 'expire', 'un code ne sert qu’une fois');
r = await appel('GET', '/compte', null, 'faux-jeton'); verif(r.s === 401 && r.j.cle === 'session', 'jeton inconnu refusé');
r = await appel('GET', '/compte', null, t1); verif(r.s === 200 && r.j.compte.email === 'bit@exemple.fr', 'lecture du compte');
r = await appel('PUT', '/compte/perso', { perso: { nick: 'Bit le magnifique et trop long', av: '5.0.0.0.0.1.1.1.0', drink: true, lim: 3, gn: 'f', '<script>': 1 } }, t1);
verif(r.s === 200 && r.j.compte.perso.nick.length === 24 && r.j.compte.perso.av === '5.0.0.0.0.1.1.1.0' && !('<script>' in r.j.compte.perso), 'perso enregistré (pseudo coupé à 24, clé bizarre écartée)');
r = await appel('PUT', '/compte/perso', { perso: 'texte' }, t1); verif(r.s === 400 && r.j.cle === 'perso', 'perso illisible refusé');
r = await appel('PUT', '/compte/skin', { skin: 'L-001' }, t1); verif(r.s === 400 && r.j.cle === 'skin', 'skin non débloqué refusé');
r = await appel('PUT', '/compte/skin', { skin: 'C-001' }, t1); verif(r.s === 200 && r.j.compte.skin === 'C-001', 'skin débloqué accepté');
r = await appel('PUT', '/compte/skin', { skin: null }, t1); verif(r.s === 200 && r.j.compte.skin === null, 'retour aux cartes d’origine');
const nouvelles = [];
for (let i = 1; i <= 26; i++) { r = await appel('POST', '/compte/partie', { jeu: i % 2 ? 'le96' : 'purple', cle: 'ABCD:' + i }, t1); nouvelles.push(...r.j.nouvelles); }
r = await appel('POST', '/compte/partie', { jeu: 'le96', cle: 'ABCD:26' }, t1); verif(r.j.nouvelles.length === 0 && r.j.compte.parties === 26, 'même partie comptée une seule fois');
const d = dues(26); const cpt = (l, p) => l.filter((x) => x[0] === p).length; const cartes = r.j.compte.cartes;
verif(cpt(cartes, 'C') === d.C && cpt(cartes, 'R') === d.R && cpt(cartes, 'E') === d.E && cpt(cartes, 'L') === 0, `26 parties : ${d.C} communes, ${d.R} rares, ${d.E} épique (reçu ${cpt(cartes, 'C')}, ${cpt(cartes, 'R')}, ${cpt(cartes, 'E')})`);
verif(nouvelles.length === cartes.length - 1, 'chaque nouvelle carte a été annoncée une fois');
verif(new Set(cartes).size === cartes.length && cartes.every((x) => [...CATALOGUE.C, ...CATALOGUE.R, ...CATALOGUE.E, ...CATALOGUE.L].includes(x)), 'cartes uniques et du catalogue');
verif(r.j.compte.prochaine && r.j.compte.prochaine.dans >= 1, 'prochaine carte annoncée');
const ligne = DB._db.prepare('SELECT jeux FROM comptes').get(); verif(JSON.parse(ligne.jeux).le96 === 13 && JSON.parse(ligne.jeux).purple === 13, 'parties comptées par jeu');
// deuxième téléphone : même adresse, même compte, perso retrouvé
await appel('POST', '/code', { email: 'bit@exemple.fr', langue: 'en' }); verif(mails[mails.length - 1].corps.subject.startsWith('Your Hors Service code'), 'e-mail en anglais si l’appli est en anglais');
r = await appel('POST', '/connexion', { email: 'BIT@exemple.fr', code: codeDuMail() }); const t2 = r.j.jeton;
verif(r.s === 200 && r.j.compte.parties === 26 && r.j.compte.perso.av === '5.0.0.0.0.1.1.1.0' && t2 !== t1, 'second téléphone : même compte, perso retrouvé, nouveau jeton');
// mode essai : seulement le domaine réservé @essai.test
r = await appel('POST', '/code', { email: 'sam@essai.test' }); verif(r.s === 200 && /^\d{6}$/.test(r.j.code) && r.j.essai, 'mode essai : code rendu pour @essai.test');
const nbMails = mails.length; r = await appel('POST', '/connexion', { email: 'sam@essai.test', code: r.j.code }); verif(r.s === 200 && mails.length === nbMails, 'mode essai : connexion sans e-mail envoyé');
r = await appel('POST', '/code', { email: 'sam@essai.test' }, null, { ...env, MODE_ESSAI: '0' }); verif(r.s === 200 && !r.j.code, 'mode essai coupé : plus de code dans la réponse');
r = await appel('POST', '/code', { email: 'rien@exemple.fr' }, null, { ...env, RESEND_CLE: undefined }); verif(r.s === 502 && r.j.cle === 'envoi', 'sans service d’envoi : erreur claire');
r = await appel('POST', '/code', { email: 'brevo@exemple.fr' }, null, { ...env, RESEND_CLE: undefined, BREVO_CLE: 'b' }); verif(r.s === 200 && mails[mails.length - 1].url.includes('brevo') && mails[mails.length - 1].corps.to[0].email === 'brevo@exemple.fr', 'envoi par Brevo');
// limites
ip = '5.5.5.5'; for (let i = 0; i < 5; i++) await appel('POST', '/code', { email: 'spam@exemple.fr' }); r = await appel('POST', '/code', { email: 'spam@exemple.fr' }); verif(r.s === 429 && r.j.cle === 'trop', 'plus de 5 codes par heure pour une adresse : refusé');
ip = '6.6.6.6'; let refus = 0; for (let i = 0; i < 32; i++) { r = await appel('POST', '/code', { email: `x${i}@exemple.fr` }); if (r.s === 429) refus++; } verif(refus === 2, `plus de 30 demandes par heure depuis un même réseau : refusé (${refus} refus)`);
decalage += 3700 * 1000; ip = '6.6.6.6'; r = await appel('POST', '/code', { email: 'x99@exemple.fr' }); verif(r.s === 200, 'une heure plus tard, le réseau peut redemander');
// essais et blocage
ip = '7.7.7.7'; await appel('POST', '/code', { email: 'essais@exemple.fr' }); const ce = codeDuMail();
for (let i = 0; i < 5; i++) r = await appel('POST', '/connexion', { email: 'essais@exemple.fr', code: autre(ce) }); verif(r.j.cle === 'essais', 'cinq mauvais essais : le code est bloqué');
r = await appel('POST', '/connexion', { email: 'essais@exemple.fr', code: ce }); verif(r.s === 429 && r.j.cle === 'essais', 'même le bon code ne passe plus après cinq erreurs');
for (let k = 0; k < 3; k++) { decalage += 3700 * 1000; ip = '8.8.8.' + k; await appel('POST', '/code', { email: 'essais@exemple.fr' }); const c2 = codeDuMail(); for (let i = 0; i < 5; i++) await appel('POST', '/connexion', { email: 'essais@exemple.fr', code: autre(c2) }); }
r = await appel('POST', '/code', { email: 'essais@exemple.fr' }); verif(r.s === 429 && r.j.cle === 'trop', '20 erreurs dans la journée : adresse bloquée');
decalage += 25 * 3600 * 1000; ip = '9.9.9.9'; r = await appel('POST', '/code', { email: 'essais@exemple.fr' }); verif(r.s === 200, 'débloquée le lendemain');
r = await appel('POST', '/connexion', { email: 'essais@exemple.fr', code: codeDuMail() }); verif(r.s === 200, 'connexion possible le lendemain');
await appel('POST', '/code', { email: 'lent@exemple.fr' }); const lent = codeDuMail(); decalage += 16 * 60 * 1000; r = await appel('POST', '/connexion', { email: 'lent@exemple.fr', code: lent }); verif(r.s === 400 && r.j.cle === 'expire', 'code périmé après 15 minutes');
// session d'un an : t1 et t2 ont un peu plus d'un jour, toujours valides
r = await appel('GET', '/compte', null, t2); verif(r.s === 200, 'session encore valide le lendemain');
// déconnexion, suppression
r = await appel('POST', '/deconnexion', {}, t1); verif(r.s === 200, 'déconnexion'); r = await appel('GET', '/compte', null, t1); verif(r.s === 401, 'jeton déconnecté refusé');
r = await appel('GET', '/compte', null, t2); verif(r.s === 200, 'l’autre téléphone reste connecté');
r = await appel('DELETE', '/compte', null, t2); verif(r.s === 200, 'suppression du compte'); r = await appel('GET', '/compte', null, t2); verif(r.s === 401, 'compte supprimé : plus de session');
verif(!DB._db.prepare("SELECT 1 FROM comptes WHERE email = 'bit@exemple.fr'").get(), 'plus aucune ligne pour cette adresse');
await appel('POST', '/code', { email: 'bit@exemple.fr' }); r = await appel('POST', '/connexion', { email: 'bit@exemple.fr', code: codeDuMail() }); verif(r.s === 200 && r.j.compte.parties === 0 && r.j.compte.cartes.length === 1, 'même adresse après suppression : compte neuf');
// ménage
decalage += 2 * 3600 * 1000; await nettoyer(env); const restes = DB._db.prepare('SELECT (SELECT count(*) FROM codes) c, (SELECT count(*) FROM limites WHERE expire < ?) l').get(Math.floor(Date.now() / 1000)); verif(restes.c === 0 && restes.l === 0, 'ménage : codes et compteurs périmés effacés');
// 400 parties : les 100 cartes, dans un ordre propre à chaque compte
const parcours = async (email) => { await appel('POST', '/code', { email }); const r1 = await appel('POST', '/connexion', { email, code: codeDuMail() }); const t = r1.j.jeton; const vu = []; let rr; for (let i = 1; i <= 400; i++) { rr = await appel('POST', '/compte/partie', { jeu: 'le96', cle: email + ':' + i }, t); vu.push(...rr.j.nouvelles); } return { final: rr.j.compte.cartes, vu }; };
ip = '10.0.0.1'; const A = await parcours('a400@exemple.fr'); ip = '10.0.0.2'; const B = await parcours('b400@exemple.fr');
verif(A.final.length === 100 && new Set(A.final).size === 100, `400 parties : 100 cartes différentes (${A.final.length})`);
verif(A.vu.join() !== B.vu.join(), 'deux comptes ne débloquent pas les cartes dans le même ordre');
verif(A.vu.slice(-1)[0][0] === 'L' || A.final.filter((x) => x[0] === 'L').length === 5, 'les 5 légendaires sont débloquées');
// progression sur la durée
verif(dues(0).C === 1 && dues(108).C === 55 && dues(180).R === 30 && dues(250).E === 10 && dues(400).L === 5, 'tout est débloqué après 400 parties');
verif(prochaine(0).dans === 2 && prochaine(0).rarete === 'C' && prochaine(400) === null, 'prochaine carte : après 2 parties au départ, plus rien après 400');
console.log(`${ok} vérifications réussies, ${ko} échec(s)`); process.exit(ko ? 1 : 0);
