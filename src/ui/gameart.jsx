// Illustration de chaque jeu : une photo de table (objets rendus en 3D, posés sur le feutre),
// sur une surface propre à l'ambiance du jeu (feutre, bois de bar, zinc, nappe, kraft, ardoise…),
// rendue une fois pour toutes par tools/rendu-table (scènes « jeu-… », paramètre bg) et servie depuis jeux/.
export const IDS = new Set(['oserait', '96', 'pipoteur', 'purple', 'hippodrome', 'toutankhamon', 'autres', 'trouve', 'degaine', 'bombe', 'ware', 'jamais', 'garou', 'coinche', 'buzzer', 'dessin', 'president', 'cercle', 'perudo', 'paranoia', 'actionverite', 'tupref', 'poker', 'blackjack', 'roulette', 'ring', 'tournee']);

export function GameArt({ id }) {
  return (
    <span class="game-art" aria-hidden="true">
      {IDS.has(id) ? <img src={`jeux/${id}.webp`} alt="" width="600" height="400" loading="lazy" decoding="async" /> : null}
    </span>
  );
}
