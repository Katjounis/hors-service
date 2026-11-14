// Mode Écran : un appareil (télé dans un navigateur, tablette, téléphone posé au milieu) affiche le plateau,
// les scores et les animations. Il ne joue pas : les téléphones servent de manettes. On rejoint avec son QR code.
import { GAMES, GAME_META } from '../games/index.js';
import { seats, sipsOf } from '../core/host.js';
import { plural } from '../lib/util.js';
import { Av, Waiting, ErrorBoundary } from './common.jsx';
import { Ambiance } from './fx.jsx';
import { QRBlock, tintKey } from './party.jsx';
import { Brand } from './screens.jsx';

export function ScreenView({ dev }) {
  const S = dev.S;
  const code = dev.code;
  const host = dev.meta && dev.meta.host;
  const g = S && S.status === 'game' && S.game ? S.game.g : null;
  const G = g && GAMES[S.game.id] ? GAMES[S.game.id] : null;
  const roster = S ? S.roster : dev.players;
  const ids = S ? seats(S) : Object.keys(dev.players || {});
  const nick = (u) => (roster && roster[u] ? roster[u].nick : '…');
  const ranked = S ? ids.slice().sort((a, b) => sipsOf(S, b) - sipsOf(S, a)).slice(0, 8) : [];
  return (
    <div class={`screen-view${G ? ' is-game' : ''}`}>
      <Ambiance game={G ? tintKey(S) : null} hot={!!(S && S.cfg && S.cfg.adult)} />
      <header class="sv-head">
        <Brand small />
        <span class={`net${dev.conn ? '' : ' is-off'}`}>{dev.conn ? `Écran · salon ${code}` : 'Reconnexion…'}</span>
        <button type="button" class="btn btn-small" onClick={() => dev.leaveParty()}>Fermer l’écran</button>
      </header>
      {!G ? (
        <div class="sv-lobby">
          <QRBlock code={code} />
          <section class="sv-players" aria-live="polite">
            <h2>{ids.length ? `${plural(ids.length, 'joueur', 'joueurs')} dans le salon` : 'En attente des joueurs'}</h2>
            <ul class="sv-list">
              {ids.map((u) => <li key={u}><Av p={roster[u]} size="l" /><b>{nick(u)}</b>{u === host ? <em class="tag">hôte</em> : null}</li>)}
            </ul>
            <p class="muted">{host ? `${nick(host)} anime la soirée et lance les jeux depuis son téléphone.` : 'Le premier téléphone qui rejoint anime la soirée.'}</p>
            {S && S.status === 'game' && !G ? <Waiting>Lancement du jeu…</Waiting> : null}
          </section>
        </div>
      ) : (
        <div class="sv-game">
          <div class="sv-main">
            <p class="sv-no muted">Jeu {GAME_META[G.id].no}</p>
            <h1 class="sv-title">{G.name}</h1>
            <ErrorBoundary>
              <G.Table S={S} g={g} uid={null} clock={() => dev.backend.now()} secret={null} local={false} sendAs={null} dev={dev} screen />
            </ErrorBoundary>
          </div>
          <aside class="sv-side paper tape">
            <h2>Compteur</h2>
            <ol class="sv-tally">
              {ranked.map((u) => <li key={u}><Av p={roster[u]} size="s" /><span>{nick(u)}</span><b>{sipsOf(S, u)}</b></li>)}
            </ol>
            <p class="muted small">Salon {code}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
