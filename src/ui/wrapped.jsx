// Récap de fin de soirée façon « Wrapped » : une image au format story (1080 × 1920) dessinée en canvas,
// avec les avatars, le MVP, des titres absurdes et les chiffres clés. Ni photo ni nom de famille :
// par défaut, seul le premier mot du pseudo apparaît. Partage avec la Web Share API, après confirmation.
import { h, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Character } from './avatar.jsx';
import { titles, mvp } from '../lib/stats.js';
import { plural } from '../lib/util.js';

const W = 1080;
const H = 1920;
const C = { bitume: '#1C1A17', bitume2: '#2B2721', papier: '#F2EADB', encre: '#22201C', jaune: '#FFD23F', rouge: '#E5502F', poussiere: '#A79F92', kraft: '#D9C3A0' };
const TITRE = '"Bagel Fat One", "Arial Black", Impact, sans-serif';
const TEXTE = '"Familjen Grotesk", system-ui, sans-serif';

function avatarImage(av, mood) {
  const box = document.createElement('div');
  render(h(Character, { av, mood, size: 256 }), box);
  let svg = box.innerHTML;
  render(null, box);
  if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img.decode().then(() => img, () => null);
}

function fit(ctx, text, max, size, weight, family) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 18 && ctx.measureText(text).width > max) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
  return s;
}

function stripe(ctx, x, y, w, hgt) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, hgt); ctx.clip();
  ctx.fillStyle = C.encre; ctx.fillRect(x, y, w, hgt);
  ctx.fillStyle = C.jaune;
  for (let i = -hgt; i < w + hgt; i += 44) { ctx.beginPath(); ctx.moveTo(x + i, y + hgt); ctx.lineTo(x + i + 22, y + hgt); ctx.lineTo(x + i + 22 + hgt, y); ctx.lineTo(x + i + hgt, y); ctx.fill(); }
  ctx.restore();
}

export async function drawWrapped(sum, { fullNames = false } = {}) {
  try { await Promise.all([document.fonts.load(`900 100px ${TITRE}`), document.fonts.load(`700 40px ${TEXTE}`)]); } catch (e) { /* polices système */ }
  const name = (n) => (fullNames ? n : String(n || '').split(/\s+/)[0]);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, C.bitume2); bg.addColorStop(1, C.bitume);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(820, 260, 20, 820, 260, 620);
  halo.addColorStop(0, 'rgba(255, 210, 63, .22)'); halo.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  // l'affichette « Hors Service »
  ctx.save(); ctx.translate(90, 90); ctx.rotate(-0.05);
  ctx.fillStyle = C.papier; ctx.fillRect(0, 0, 520, 250);
  ctx.fillStyle = C.encre; ctx.font = `900 118px ${TITRE}`; ctx.textBaseline = 'top';
  ctx.fillText('HORS', 34, 22); ctx.fillText('SERVICE', 34, 116);
  stripe(ctx, 0, 222, 520, 28);
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.papier; ctx.font = `900 76px ${TITRE}`;
  ctx.fillText('LE RÉCAP DE LA SOIRÉE', 90, 470);
  const d = new Date(sum.date);
  const date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  ctx.fillStyle = C.poussiere; ctx.font = `700 40px ${TEXTE}`;
  ctx.fillText(`${date} · ${plural(sum.players.length, 'joueur', 'joueurs')} · ${plural(sum.played.length, 'jeu', 'jeux')}`, 90, 530);

  // MVP
  const best = mvp(sum);
  if (best) {
    ctx.save(); ctx.translate(80, 590); ctx.rotate(0.015);
    ctx.fillStyle = C.papier; ctx.fillRect(0, 0, 920, 380);
    const img = await avatarImage(best.p.av, 'win');
    if (img) ctx.drawImage(img, 36, 60, 260, 260);
    ctx.save(); ctx.translate(330, 80); ctx.rotate(-0.06);
    ctx.font = `900 56px ${TITRE}`;
    const sw = ctx.measureText('MVP DE LA SOIRÉE').width + 32;
    ctx.strokeStyle = C.rouge; ctx.lineWidth = 6; ctx.strokeRect(0, 0, sw, 78);
    ctx.fillStyle = C.rouge; ctx.fillText('MVP DE LA SOIRÉE', 16, 60);
    ctx.restore();
    ctx.fillStyle = C.encre;
    const s = fit(ctx, name(best.p.nick).toUpperCase(), 540, 120, 900, TITRE);
    ctx.font = `900 ${s}px ${TITRE}`; ctx.fillText(name(best.p.nick).toUpperCase(), 330, 270);
    ctx.font = `700 36px ${TEXTE}`; ctx.fillStyle = '#57514A';
    const why = [best.p.given ? `${best.p.given} gorgées distribuées` : null, best.records ? plural(best.records, 'record', 'records') : null].filter(Boolean).join(' · ') || 'le plus en forme de la table';
    ctx.fillText(why, 330, 330);
    ctx.restore();
  }

  // titres absurdes
  let y = 1130;
  for (const t of titles(sum).slice(0, 4)) {
    const img = await avatarImage(t.p.av, t.title === 'Ministre de la soif' ? 'drink' : null);
    if (img) ctx.drawImage(img, 90, y - 92, 124, 124);
    ctx.fillStyle = C.jaune; const s = fit(ctx, t.title.toUpperCase(), 740, 64, 900, TITRE);
    ctx.font = `900 ${s}px ${TITRE}`; ctx.fillText(t.title.toUpperCase(), 244, y - 30);
    ctx.fillStyle = C.papier; ctx.font = `700 38px ${TEXTE}`;
    ctx.fillText(`${name(t.p.nick)} : ${t.detail}`, 244, y + 20);
    y += 150;
  }

  // chiffres clés
  const tot = (k) => sum.players.reduce((a, p) => a + (p[k] || 0), 0);
  const tiles = [[tot('sips'), 'gorgées bues'], [tot('given'), 'distribuées'], [tot('gages') + tot('points'), 'gages et points'], [sum.minutes, 'minutes']];
  tiles.forEach(([v, lab], i) => {
    const x = 90 + i * 232;
    ctx.fillStyle = 'rgba(242, 234, 219, .08)'; ctx.fillRect(x, 1650, 212, 150);
    ctx.fillStyle = C.jaune; ctx.font = `900 76px ${TITRE}`; ctx.fillText(String(v), x + 18, 1735);
    ctx.fillStyle = C.papier; ctx.font = `700 28px ${TEXTE}`; ctx.fillText(lab, x + 18, 1780);
  });
  ctx.fillStyle = C.poussiere; ctx.font = `700 28px ${TEXTE}`;
  ctx.fillText('Hors Service · L’abus d’alcool est dangereux pour la santé.', 90, 1868);
  return cv;
}

// Dans le visualiseur d'artifacts de claude.ai, un fichier ne peut être proposé qu'avec la capacité « downloads »
// (confirmation affichée par le visualiseur). Ailleurs (GitHub Pages, Hostinger), window.claude n'existe pas.
let dlNs; // undefined : pas encore demandé ; null : indisponible
function claudeDownloads() {
  if (dlNs !== undefined) return Promise.resolve(dlNs);
  const c = typeof window !== 'undefined' ? window.claude : null;
  if (!c || typeof c.use !== 'function') { dlNs = null; return Promise.resolve(null); }
  return c.use('downloads').then((ns) => { dlNs = ns || null; return dlNs; }, () => { dlNs = null; return null; });
}

const SHARE_MSG = {
  partagé: 'Récap partagé.',
  enregistré: 'Image enregistrée.',
  annulé: '',
  erreur: 'Impossible de préparer l’image, réessaie.',
  indisponible: 'Partage impossible ici : appuie longuement sur l’image pour l’enregistrer.',
};

async function shareCanvas(cv) {
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  if (!blob) return 'erreur';
  const dl = await claudeDownloads();
  if (dl) {
    try { await dl.save({ filename: 'hors-service-recap.png', data: blob }); return 'enregistré'; } catch (e) { return e && e.code === 'declined' ? 'annulé' : 'indisponible'; }
  }
  const file = typeof File !== 'undefined' ? new File([blob], 'hors-service-recap.png', { type: 'image/png' }) : null;
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'Récap Hors Service' });
      return 'partagé';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'annulé'; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'hors-service-recap.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'enregistré';
}

export function WrappedView({ sum }) {
  const [full, setFull] = useState(false);
  const [src, setSrc] = useState(null);
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState('');
  const cv = useRef(null);
  useEffect(() => { claudeDownloads(); }, []);
  useEffect(() => {
    let live = true;
    setSrc(null);
    drawWrapped(sum, { fullNames: full }).then((c) => { if (!live) return; cv.current = c; setSrc(c.toDataURL('image/png')); });
    return () => { live = false; };
  }, [sum && sum.id, full]);
  if (!sum) return <p class="muted">Pas encore de soirée à résumer : lancez au moins un jeu.</p>;
  return (
    <div class="wrapped">
      {src ? <img class="wrapped-img" src={src} alt="Récap de la soirée au format story" width="1080" height="1920" /> : <p class="muted">Préparation de l’image…</p>}
      <label class="check"><input type="checkbox" checked={full} onChange={(e) => setFull(e.currentTarget.checked)} /> Afficher les pseudos en entier</label>
      <p class="muted small">Par défaut, seul le premier mot de chaque pseudo apparaît. Aucune photo sur le récap.</p>
      {ask ? (
        <div class="quit paper tape pose" role="alertdialog" aria-label="Tout le monde est d’accord pour être sur la story ?">
          <p><b>Tout le monde est d’accord pour être sur la story ?</b> Le récap montre les pseudos et les avatars de la soirée.</p>
          <div class="bus-btns two">
            <button type="button" class="btn" onClick={() => setAsk(false)}>Pas encore</button>
            <button type="button" class="btn btn-main" onClick={async () => { setAsk(false); setMsg(''); setMsg(SHARE_MSG[await shareCanvas(cv.current)] || ''); }}>Oui, partager</button>
          </div>
        </div>
      ) : (
        <button type="button" class="btn btn-main btn-big btn-wide" disabled={!src} onClick={() => setAsk(true)}>Partager la story</button>
      )}
      {msg ? <p class="muted" role="status">{msg}</p> : null}
    </div>
  );
}
