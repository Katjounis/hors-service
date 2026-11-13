// Banc d'essai visuel des écrans qui demandent le serveur (créer, rejoindre, accueil en ligne).
import { render } from 'preact';
import { CreateScreen, JoinScreen, Home } from '../src/ui/screens.jsx';
import { StreakFire } from '../src/ui/fx.jsx';

const which = location.hash.slice(1) || 'create';
const dev = {
  profile: which === 'home' ? { nick: 'Thierry', av: 'casque', drink: true, lim: 3 } : null,
  error: which === 'joinerr' ? 'Cette soirée n’existe pas. Vérifie le code.' : null,
  busy: false, view: which, joinCode: which === 'joinerr' ? 'ABCX' : '',
  changed() { draw(); }, saveProfile() {}, createParty() {}, joinParty() {},
};
function draw() {
  let body;
  if (which === 'fire') {
    body = (
      <div class="screen">
        <h1>Feu de série</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 8px', justifyItems: 'center' }}>
          {[[2, 'Série de 2 : ça chauffe'], [4, 'Série de 4'], [6, 'Série de 6 : en feu'], [9, 'Série de 9 : incendie']].map(([n, t]) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}><StreakFire streak={n} /><span class="muted small">{t}</span></div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}><StreakFire streak={0} smokeKey={String(Date.now())} smoked={6} /><span class="muted small">Série cassée : fumée</span></div>
        </div>
      </div>
    );
  } else if (which === 'join' || which === 'joinerr') body = <JoinScreen dev={dev} />;
  else if (which === 'home') body = <Home dev={dev} onLocal={() => {}} />;
  else body = <CreateScreen dev={dev} />;
  render(<div class="app">{body}</div>, document.getElementById('app'));
}
draw();
