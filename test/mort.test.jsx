// Purple jusqu'à la mort : le tirage s'arrête au premier purple, le compte des gorgées est juste.
import { drawUntilPurple, mortSips, mortTimeline, MORT_MAX } from '../src/games/purple.jsx';
import { isRed, newDeck } from '../src/lib/cards.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
for (let k = 0; k < 2000; k++) {
  const deck = newDeck(4);
  const pairs = drawUntilPurple(() => [deck.pop(), deck.pop()]);
  const last = pairs[pairs.length - 1];
  ok(isRed(last[0]) !== isRed(last[1]), 'la dernière paire est un purple');
  ok(pairs.slice(0, -1).every((p) => isRed(p[0]) === isRed(p[1])), 'aucun purple avant la dernière paire');
  ok(mortSips(pairs) === (pairs.length - 1) * 2, 'une gorgée par carte tirée avant le purple');
}
ok(mortSips([['AH', 'AS']]) === 0, 'purple du premier coup : 0 gorgée (il distribue)');
const fake = drawUntilPurple(() => ['AH', 'KH']);
ok(fake.length === MORT_MAX, 'garde-fou : jamais plus de MORT_MAX paires');
const tl = mortTimeline(5);
ok(tl.at.length === 5 && tl.at.every((t, i) => i === 0 || t > tl.at[i - 1]) && tl.end > tl.at[4] && tl.total > tl.end, 'minutage croissant');
console.log(`\n${pass} vérifications réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
