// Pages « Mentions légales » et « Confidentialité », ouvertes depuis le menu et depuis l'accueil.
import { useState } from 'preact/hooks';
import { hebergeur, HEBERGEUR_SALONS, SALON_EFFACE_APRES } from '../content/legal.js';

function Host({ h }) {
  return <p class="legal-host"><b>{h.nom}</b><br />{h.adresse}<br /><span class="muted small">{h.site.replace('https://', '')}</span></p>;
}

export function Mentions() {
  const app = hebergeur();
  return (
    <div class="legal">
      <h3>Éditeurs</h3>
      <p>Hors Service est un projet personnel, édité à titre non professionnel par des particuliers, sans publicité ni vente. Comme le permet la loi pour la confiance dans l’économie numérique (article 1-1, II), les éditeurs ont choisi de rester anonymes vis-à-vis du public ; leurs éléments d’identification ont été communiqués à l’hébergeur, qui ne peut les divulguer que sur réquisition de la justice.</p>
      <h3>Hébergement de l’appli</h3>
      <Host h={app} />
      <h3>Hébergement des salons</h3>
      <p class="muted small">Pour le mode « Chacun son téléphone » uniquement.</p>
      <Host h={HEBERGEUR_SALONS} />
      <h3>Contenus et santé</h3>
      <p>Appli réservée aux plus de 18 ans. Jeux d’ambiance entre adultes, sur le ton de l’humour : aucune carte ne demande de commettre une infraction. L’abus d’alcool est dangereux pour la santé ; après avoir bu, on ne prend pas le volant. Chaque joueur peut jouer sans alcool et passer son tour à tout moment.</p>
      <p>Pour signaler un contenu, adressez-vous à l’hébergeur ci-dessus.</p>
    </div>
  );
}

const KEYS_PREFIX = 'hs:';
function wipeAll() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEYS_PREFIX)) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* stockage indisponible */ }
}

export function Confidentialite() {
  const [ask, setAsk] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div class="legal">
      <h3>L’essentiel</h3>
      <p>Pas de compte, pas de publicité, pas de mesure d’audience, pas de traceur. Tout ce que l’appli garde reste sur ce téléphone, sauf les échanges temporaires d’une partie en salon.</p>
      <h3>Sur ce téléphone</h3>
      <p>Dans la mémoire du navigateur (localStorage) : ton profil (pseudo, avatar, avec ou sans alcool, limites de contenu), la confirmation 18 ans et plus, la partie en cours sur un seul téléphone, l’historique et les stats des soirées, les gages maison, et un identifiant technique pour revenir dans un salon après une coupure. Rien de tout cela n’est envoyé.</p>
      <h3>Dans un salon (« Chacun son téléphone »)</h3>
      <p>Le temps de la partie, le serveur de salons ({HEBERGEUR_SALONS.nom}) relaie entre les téléphones : les pseudos, les avatars (avec le choix avec ou sans alcool et les limites de contenu), les actions de jeu (votes, réponses, touches) et l’état de la partie. Les infos secrètes (ton mot, par exemple) ne vont qu’à ton téléphone. Rien n’est gardé après la partie : un salon s’efface automatiquement après {SALON_EFFACE_APRES} d’inactivité.</p>
      <h3>Capteurs, partage, liens</h3>
      <p>Les micro-jeux qui demandent de secouer ou de pencher le téléphone lisent ses capteurs pendant le jeu seulement, sans rien enregistrer. Le récap « story » est dessiné sur le téléphone et n’est partagé que si tu le décides, après confirmation. Un lien de gages maison contient les gages eux-mêmes : seuls ceux à qui tu l’envoies les voient.</p>
      <h3>Hébergeurs</h3>
      <p>Comme tout hébergeur, {hebergeur().nom} (et {HEBERGEUR_SALONS.nom} pour les salons) peut traiter des données techniques de connexion, comme l’adresse IP, pour faire fonctionner et sécuriser le service.</p>
      <h3>Tout effacer</h3>
      {done ? <p role="status">Données effacées sur ce téléphone.</p> : ask ? (
        <div class="quit paper tape pose" role="alertdialog" aria-label="Effacer toutes mes données ?">
          <p><b>Effacer toutes les données de l’appli sur ce téléphone ?</b> Profil, stats, gages maison et partie en cours disparaissent.</p>
          <div class="bus-btns two">
            <button type="button" class="btn" onClick={() => setAsk(false)}>Annuler</button>
            <button type="button" class="btn btn-danger" onClick={() => { wipeAll(); setDone(true); setAsk(false); }}>Tout effacer</button>
          </div>
        </div>
      ) : <button type="button" class="btn btn-wide" onClick={() => setAsk(true)}>Effacer toutes mes données</button>}
    </div>
  );
}
