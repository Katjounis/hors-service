// Stats et records entre copains, gages maison (export et import par lien ou QR code), récap de soirée.
// Tout reste sur ce téléphone (localStorage).
import { useEffect, useMemo, useState } from 'preact/hooks';
import qrcode from 'qrcode-generator';
import { loadStats, profiles, allRecords, RECORDS, clearStats, loadGages, saveGages, loadPiques, savePiques, gagesOn, setGagesOn, gagesLink } from '../lib/stats.js';
import { GAMES } from '../games/index.js';
import { plural } from '../lib/util.js';
import { Av } from './common.jsx';
import { Seg, TopBack } from './screens.jsx';
import { WrappedView } from './wrapped.jsx';

const fdate = (t) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

export function StatsScreen({ onBack }) {
  const [tab, setTab] = useState('soirees');
  const [st, setSt] = useState(() => loadStats());
  const [recap, setRecap] = useState(null);
  const [wipe, setWipe] = useState(false);
  if (recap) {
    return (
      <div class="screen">
        <TopBack title="Récap de la soirée" onBack={() => setRecap(null)} />
        <WrappedView sum={recap} />
      </div>
    );
  }
  const recs = allRecords(st);
  const profs = profiles(st);
  return (
    <div class="screen">
      <TopBack title="Stats et gages maison" onBack={onBack} />
      <Seg name="Rubrique" value={tab} onChange={setTab} options={[['soirees', 'Soirées'], ['records', 'Records'], ['joueurs', 'Joueurs'], ['gages', 'Gages'], ['piques', 'Phrases']]} />
      {tab === 'soirees' ? (
        st.soirees.length ? (
          <ul class="soirees">
            {st.soirees.map((s) => (
              <li key={s.id} class="soiree paper">
                <div class="soiree-h"><b>{fdate(s.date)}</b><span class="muted small">{s.mode === 'salon' ? 'chacun son téléphone' : 'un téléphone'} · {s.minutes} min</span></div>
                <div class="soiree-av">{s.players.slice(0, 8).map((p) => <Av key={p.uid} p={p} size="s" />)}</div>
                {s.sur && s.sur.length ? <p class="small soiree-sur">{s.sur.map(([t, n]) => `${t} : ${n}`).join(' · ')}</p> : null}
                <p class="muted small">{s.played.map((id) => (GAMES[id] ? GAMES[id].name : id)).filter((x, i, a) => a.indexOf(x) === i).join(', ')}</p>
                <button type="button" class="btn btn-small" onClick={() => setRecap(s)}>Récap</button>
              </li>
            ))}
          </ul>
        ) : <p class="muted">Pas encore de soirée enregistrée : elles s’ajoutent ici dès qu’un jeu est lancé.</p>
      ) : null}
      {tab === 'records' ? (
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Record</th><th>Qui</th><th>Valeur</th></tr></thead>
          <tbody>{RECORDS.map((r) => {
            const b = recs[r.k];
            return <tr key={r.k}><td>{r.label}</td><td>{b ? b.nick : 'personne'}</td><td>{b ? `${b.v} ${r.unit}` : 'rien'}</td></tr>;
          })}</tbody>
        </table></div>
      ) : null}
      {tab === 'joueurs' ? (
        profs.length ? (
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Joueur</th><th>Soirées</th><th>Bues</th><th>Données</th><th>Gages</th><th>Points</th><th>Records</th></tr></thead>
            <tbody>{profs.map((p) => (
              <tr key={p.nick}><td><span class="who"><Av p={p} size="s" /><b>{p.nick}</b></span></td><td>{p.soirees}</td><td>{p.sips}</td><td>{p.given}</td><td>{p.gages}</td><td>{p.points}</td>
                <td class="small">{[p.best.degaine ? `${p.best.degaine} ms` : null, p.best.purple ? `série ${p.best.purple}` : null, p.best.ware ? `rafale ${p.best.ware}` : null].filter(Boolean).join(' · ') || 'rien'}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p class="muted">Les profils se créent tout seuls, soirée après soirée.</p>
      ) : null}
      {tab === 'gages' ? <GagesEditor /> : null}
      {tab === 'piques' ? <PiquesEditor /> : null}
      {tab !== 'gages' && tab !== 'piques' ? (
        wipe ? (
          <div class="quit paper tape pose" role="alertdialog" aria-label="Effacer les stats ?">
            <p><b>Effacer toutes les stats de ce téléphone ?</b> Historique, profils et records disparaissent. Les gages maison sont gardés.</p>
            <div class="bus-btns two">
              <button type="button" class="btn" onClick={() => setWipe(false)}>Garder</button>
              <button type="button" class="btn btn-danger" onClick={() => { clearStats(); setSt(loadStats()); setWipe(false); }}>Effacer</button>
            </div>
          </div>
        ) : <button type="button" class="link" onClick={() => setWipe(true)}>Effacer les stats de ce téléphone</button>
      ) : null}
    </div>
  );
}

export function PiquesEditor() {
  const [list, setList] = useState(() => loadPiques());
  const [txt, setTxt] = useState('');
  const update = (l) => { savePiques(l); setList(loadPiques()); };
  const add = () => { const t = txt.trim(); if (!t) return; update([...list, t]); setTxt(''); };
  return (
    <div class="stack gages">
      <p class="muted">{'Vos propres chambrages : ils s’affichent en grand quand quelqu’un se dégonfle, enchaîne les gorgées ou boit un cul sec. Écrivez {nom} pour placer le nom de la victime.'}</p>
      <label class="field" for="pique-new">
        <span class="field-l">Nouvelle phrase</span>
        <textarea id="pique-new" class="input" rows={2} maxLength={90} value={txt} placeholder="Ex. {nom} boit comme un trou, comme d’hab." onInput={(e) => setTxt(e.currentTarget.value)} />
      </label>
      <button type="button" class="btn btn-wide" disabled={!txt.trim()} onClick={add}>Ajouter cette phrase</button>
      {list.length ? (
        <ul class="gage-list">
          {list.map((g, i) => (
            <li key={`${i}-${g}`}><span>{g}</span><button type="button" class="icon-btn" aria-label={`Supprimer : ${g}`} onClick={() => update(list.filter((_, j) => j !== i))}>×</button></li>
          ))}
        </ul>
      ) : <p class="muted small">Aucune phrase maison pour l’instant.</p>}
    </div>
  );
}

export function GagesEditor() {
  const [list, setList] = useState(() => loadGages());
  const [txt, setTxt] = useState('');
  const [on, setOn] = useState(() => gagesOn());
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { let live = true; if (list.length) gagesLink(list).then((l) => { if (live) setLink(l); }); else setLink(''); return () => { live = false; }; }, [list.join('\n')]);
  const qr = useMemo(() => {
    if (!link || link.length > 2900) return '';
    try {
      const q = qrcode(0, 'L');
      q.addData(link);
      q.make();
      return q.createSvgTag({ cellSize: 3, margin: 2, scalable: true, title: 'Gages maison' }).replace(/fill="#000000"/g, 'fill="#22201C"').replace(/fill="#ffffff"/gi, 'fill="#F2EADB"');
    } catch (e) { return ''; }
  }, [link]);
  const update = (l) => { saveGages(l); setList(loadGages()); };
  const add = () => { const t = txt.trim(); if (!t) return; update([...list, t]); setTxt(''); };
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Nos gages maison', url: link }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(link); setMsg('Lien copié.'); } catch (e) { setMsg('Copie impossible : partage le QR code.'); }
  };
  return (
    <div class="stack gages">
      <p class="muted">Écrivez vos propres gages : ils se mélangent à ceux de l’appli quand quelqu’un joue sans alcool ou choisit « un gage à la place ».</p>
      <div class="field">
        <span class="field-l">Utiliser nos gages maison</span>
        <Seg name="Utiliser nos gages maison" value={on} onChange={(v) => { setGagesOn(v); setOn(v); }} options={[[true, 'Oui'], [false, 'Non']]} />
      </div>
      <label class="field" for="gage-new">
        <span class="field-l">Nouveau gage</span>
        <textarea id="gage-new" class="input" rows={2} maxLength={140} value={txt} placeholder="Ex. Imite le cri de ton animal préféré." onInput={(e) => setTxt(e.currentTarget.value)} />
      </label>
      <button type="button" class="btn btn-wide" disabled={!txt.trim()} onClick={add}>Ajouter ce gage</button>
      {list.length ? (
        <ul class="gage-list">
          {list.map((g, i) => (
            <li key={`${i}-${g}`}><span>{g}</span><button type="button" class="icon-btn" aria-label={`Supprimer : ${g}`} onClick={() => update(list.filter((_, j) => j !== i))}>×</button></li>
          ))}
        </ul>
      ) : <p class="muted small">Aucun gage maison pour l’instant.</p>}
      {list.length ? (
        <div class="panel gage-share">
          <h3>Partager nos {plural(list.length, 'gage', 'gages')}</h3>
          <p class="muted small">Les gages voyagent dans le lien lui-même (aucun serveur). Celui qui l’ouvre peut les importer.</p>
          {qr ? <div class="qr qr-gages" dangerouslySetInnerHTML={{ __html: qr }} /> : <p class="muted small">Trop de gages pour un QR code : partage le lien.</p>}
          <input class="input gage-link" readOnly value={link} aria-label="Lien des gages maison" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" class="btn btn-wide" disabled={!link} onClick={share}>Partager le lien</button>
          {msg ? <p class="muted small" role="status">{msg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

// ouverture d'un lien de gages : on propose d'importer
export function ImportGages({ list, onDone }) {
  const mine = loadGages();
  const fresh = list.filter((g) => !mine.includes(g));
  return (
    <div class="sheet-wrap">
      <div class="sheet paper" role="dialog" aria-label="Importer des gages maison">
        <h2>Gages maison reçus</h2>
        <p>{plural(list.length, 'gage', 'gages')} dans ce lien{fresh.length !== list.length ? `, dont ${plural(fresh.length, 'nouveau', 'nouveaux')}` : ''}.</p>
        <ul class="gage-list">{list.slice(0, 8).map((g) => <li key={g}><span>{g}</span></li>)}</ul>
        {list.length > 8 ? <p class="muted small">… et {list.length - 8} de plus.</p> : null}
        <div class="bus-btns two">
          <button type="button" class="btn" onClick={() => onDone(false)}>Ignorer</button>
          <button type="button" class="btn btn-main" onClick={() => { saveGages([...mine, ...fresh]); onDone(true); }}>Importer</button>
        </div>
      </div>
    </div>
  );
}
