// Assemblage de l'application : routage entre accueil, soirée en ligne,
// mode un seul téléphone et démo.
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { Home, CreateScreen, JoinScreen, ScreenSetup, Brand, AgeGate, ageOk } from './screens.jsx';
import { ScreenView } from './screen.jsx';
import { Party, Toasts } from './party.jsx';
import { LocalSession, LocalSetup, LocalParty } from './local.jsx';
import { DemoApp } from './demo.jsx';
import { StatsScreen, ImportGages } from './stats.jsx';
import { readGagesLink } from '../lib/stats.js';
import { Mentions, Confidentialite } from './legal.jsx';
import { TopBack } from './screens.jsx';
import { Waiting } from './common.jsx';
import { Ambiance } from './fx.jsx';
import { normalizeCode, isPartyCode } from '../lib/util.js';

// nouvel écran : on repart du haut (sinon une page ouverte depuis le bas de l'accueil s'affiche déjà défilée).
// Avant l'affichage (useLayoutEffect) : jamais de saut de page pendant qu'on touche l'écran suivant.
function useTop(key, on = true) {
  useLayoutEffect(() => { if (on && window.scrollY) { try { window.scrollTo(0, 0); } catch (e) { /* ignoré */ } } }, [key]);
}

// L'appareil peut changer entre le rendu et l'abonnement (ex. démarrage instantané du mode salons) :
// on se réabonne puis on redessine une fois, pour ne jamais rester bloqué sur un état périmé.
export function useDevice(dev) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!dev) return undefined;
    const off = dev.subscribe(() => set((x) => x + 1));
    set((x) => x + 1);
    return off;
  }, [dev]);
}

function useDevices(list) {
  const [, set] = useState(0);
  const key = list.map((d) => d.uid).join(',');
  useEffect(() => {
    const offs = list.map((d) => d.subscribe(() => set((x) => x + 1)));
    set((x) => x + 1);
    return () => offs.forEach((f) => f());
  }, [key]);
}

export function DeviceApp({ dev, onLocal, onResumeLocal, joinCode, onDemo, onStats, onLegal, embedded = false }) {
  useDevice(dev);
  let body;
  if (!dev.ready) body = <div class="screen"><Brand /><h1 class="visually-hidden">Hors Service</h1><Waiting>Redémarrage…</Waiting></div>;
  else if (dev.view === 'party' && dev.code) body = <Party dev={dev} embedded={embedded} />;
  else if (dev.view === 'screen' && dev.code) body = <ScreenView dev={dev} />;
  else if (dev.view === 'create') body = <CreateScreen dev={dev} />;
  else if (dev.view === 'join') body = <JoinScreen dev={dev} />;
  else if (dev.view === 'screen-setup') body = <ScreenSetup dev={dev} joinCode={joinCode} />;
  else body = <Home dev={dev} onLocal={onLocal} onResumeLocal={onResumeLocal} joinCode={joinCode} onDemo={onDemo} onStats={onStats} onLegal={onLegal} />;
  const view = dev.ready ? ((dev.view === 'party' || dev.view === 'screen') && dev.code ? dev.view : dev.view || 'home') : 'boot';
  useTop(view, !embedded); // dans la démo, chaque téléphone simulé défile dans son cadre
  // dans une soirée (et sur l'écran), c'est la vue elle-même qui pose le fond (teinté selon le jeu)
  return <div class="app">{view !== 'party' && view !== 'screen' ? <Ambiance /> : null}<div class="ecran" key={view}>{body}</div><Toasts dev={dev} /></div>;
}

function LocalRoot({ local }) {
  useDevices([...local.devs.values()]);
  return <LocalParty local={local} />;
}

function readHashCode() {
  try {
    const c = normalizeCode(decodeURIComponent((location.hash || '').slice(1)));
    return isPartyCode(c) ? c : '';
  } catch (e) { return ''; }
}

// lien « écran » (#ecran-CODE) : ouvert sur la télé (Chromecast, navigateur de la télé, ordinateur branché)
function readEcranCode() {
  try {
    const h = decodeURIComponent((location.hash || '').slice(1));
    if (!/^ecran-/i.test(h)) return '';
    const c = normalizeCode(h.slice(6));
    return isPartyCode(c) ? c : '';
  } catch (e) { return ''; }
}

// makeOnline : fonction qui crée l'appareil connecté au serveur (null dans l'aperçu)
export function Root({ makeOnline, store, notice = null }) {
  const [age, setAge] = useState(() => ageOk());
  const [incoming, setIncoming] = useState(null); // gages maison reçus par lien
  useEffect(() => {
    readGagesLink(typeof location !== 'undefined' ? location.hash : '').then((list) => { if (list && list.length) setIncoming(list); });
  }, []);
  const doneImport = () => {
    setIncoming(null);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignoré */ }
  };
  const [mode, setMode] = useState('home');
  const [joinCode] = useState(() => readHashCode());
  const [ecran] = useState(() => readEcranCode());
  // appareil « chacun son téléphone » créé dès le premier rendu (pas d'écran intermédiaire)
  const [online] = useState(() => {
    if (!makeOnline) return null;
    const d = makeOnline();
    if (joinCode) { d.view = 'join'; d.joinCode = joinCode; }
    return d;
  });
  const [local, setLocal] = useState(null);
  const [hasSaved, setHasSaved] = useState(() => LocalSession.hasSaved());

  useEffect(() => {
    if (!online) return;
    online.boot().then(() => {
      if (!ecran) return;
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignoré */ }
      online.openScreen(ecran).catch(() => {});
    });
  }, []);
  useTop(`${age}:${mode}`);

  const startLocal = () => setMode('local-setup');
  // la télé d'une soirée déjà lancée n'a pas à repasser l'écran 18+ (il a été validé sur le téléphone)
  if (!age && !ecran) return <div class="app"><Ambiance /><AgeGate onOk={() => setAge(true)} /></div>;
  const resumeLocal = async () => {
    const s = new LocalSession();
    if (await s.restore()) {
      s.subs.on(() => { setLocal(null); setMode('home'); setHasSaved(false); });
      setLocal(s);
      setMode('local');
    } else {
      try { localStorage.removeItem('hs:local'); } catch (e) { /* ignoré */ }
      setHasSaved(false);
    }
  };

  if (mode === 'local-setup') {
    return (
      <div class="app ecran" key="local-setup">
        <Ambiance />
        <LocalSetup onBack={() => setMode('home')} onStart={async (players, cfg) => {
          const s = new LocalSession();
          await s.start(players, cfg);
          s.subs.on(() => { setLocal(null); setMode('home'); setHasSaved(false); });
          setLocal(s);
          setMode('local');
        }} />
      </div>
    );
  }
  if (mode === 'local' && local) return <div class="app"><LocalRoot local={local} /></div>;
  if (incoming) return <div class="app"><Ambiance /><ImportGages list={incoming} onDone={doneImport} /></div>;
  if (mode === 'mentions' || mode === 'confid') {
    return (
      <div class="app ecran" key={mode}><Ambiance />
        <div class="screen"><TopBack title={mode === 'mentions' ? 'Mentions légales' : 'Confidentialité'} onBack={() => setMode('home')} />{mode === 'mentions' ? <Mentions /> : <Confidentialite />}</div>
      </div>
    );
  }
  if (mode === 'stats') return <div class="app ecran" key="stats"><Ambiance /><StatsScreen onBack={() => setMode('home')} /></div>;
  if (mode === 'demo') {
    const p = store.get('profile', null) || { nick: 'Moi', av: 'casque', drink: true, lim: 3 };
    return <DemoApp profile={p} DeviceApp={DeviceApp} onExit={() => setMode('home')} />;
  }
  if (online) {
    return <DeviceApp dev={online} onLocal={startLocal} onResumeLocal={hasSaved ? resumeLocal : null} joinCode={joinCode} onDemo={() => setMode('demo')} onStats={() => setMode('stats')} onLegal={setMode} />;
  }
  // aperçu sans serveur : démo + un seul téléphone
  const stub = { profile: store.get('profile', null), error: null, changed() {} };
  return (
    <div class="app ecran" key="home">
      <Ambiance />
      <Home dev={stub} onLocal={startLocal} onResumeLocal={hasSaved ? resumeLocal : null} onDemo={() => setMode('demo')} onStats={() => setMode('stats')} onLegal={setMode} preview notice={notice} />
    </div>
  );
}
