// Rendu photoréaliste des objets posés sur la table (vue de dessus), fond transparent avec ombres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

for (const [n, f, w] of [['Alfa Slab One', 'alfa-slab-one-400.woff2', '400'], ['Literata', 'literata-600.woff2', '600']]) {
  const ff = new FontFace(n, await (await fetch('./' + f)).arrayBuffer(), { weight: w }); await ff.load(); document.fonts.add(ff);
}
const Q = new URLSearchParams(location.search);
const W = Number(Q.get('w') || 1000), H = Number(Q.get('h') || 1000);
const SCENE = Q.get('s') || 'verre';
let seed = Number(Q.get('seed') || 7);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = Number(Q.get('exp') || 0.72);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const span = Number(Q.get('span') || 30); // largeur de table visible (cm)
const cam = new THREE.PerspectiveCamera(24, W / H, 1, 1000);
const dist = (span / 2) / Math.tan(THREE.MathUtils.degToRad(24 / 2)) / (W / H);
const tilt = Number(Q.get('tilt') || 0.42);
cam.position.set(0, dist * Math.cos(tilt), dist * Math.sin(tilt));
const LY = Number(Q.get('ly') || 0);
cam.position.y += LY; cam.lookAt(0, LY, 0);

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x203020, 0.55));
const key = new THREE.DirectionalLight(0xfff0d8, 2.0);
key.position.set(-9, 50, -5);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.left = -40; key.shadow.camera.right = 40; key.shadow.camera.top = 40; key.shadow.camera.bottom = -40;
key.shadow.camera.near = 1; key.shadow.camera.far = 120;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
key.shadow.radius = 6;
scene.add(key);
const fill = new THREE.DirectionalLight(0xd8e8ff, 0.5);
fill.position.set(20, 30, 20);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.42 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------------------------------------------------------------- textures dessinées
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function grain(g, w, h, a = 0.05) {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 255 * a; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

const SUIT_PATH = {
  '♠': 'M0 -1 C0.35 -0.55 1 -0.25 1 0.22 C1 0.62 0.55 0.8 0.18 0.5 C0.22 0.75 0.32 0.92 0.45 1 L-0.45 1 C-0.32 0.92 -0.22 0.75 -0.18 0.5 C-0.55 0.8 -1 0.62 -1 0.22 C-1 -0.25 -0.35 -0.55 0 -1 Z',
  '♥': 'M0 1 C-0.4 0.6 -1 0.15 -1 -0.35 C-1 -0.8 -0.55 -1 -0.28 -1 C-0.1 -1 0 -0.85 0 -0.7 C0 -0.85 0.1 -1 0.28 -1 C0.55 -1 1 -0.8 1 -0.35 C1 0.15 0.4 0.6 0 1 Z',
  '♦': 'M0 -1 C0.3 -0.55 0.55 -0.25 0.75 0 C0.55 0.25 0.3 0.55 0 1 C-0.3 0.55 -0.55 0.25 -0.75 0 C-0.55 -0.25 -0.3 -0.55 0 -1 Z',
  '♣': 'M0 -1 C0.3 -1 0.48 -0.78 0.48 -0.52 C0.48 -0.38 0.42 -0.28 0.36 -0.2 C0.48 -0.28 0.6 -0.3 0.68 -0.3 C0.92 -0.3 1.05 -0.08 1.05 0.15 C1.05 0.42 0.84 0.58 0.6 0.58 C0.42 0.58 0.25 0.47 0.16 0.35 C0.18 0.62 0.3 0.88 0.45 1 L-0.45 1 C-0.3 0.88 -0.18 0.62 -0.16 0.35 C-0.25 0.47 -0.42 0.58 -0.6 0.58 C-0.84 0.58 -1.05 0.42 -1.05 0.15 C-1.05 -0.08 -0.92 -0.3 -0.68 -0.3 C-0.6 -0.3 -0.48 -0.28 -0.36 -0.2 C-0.42 -0.28 -0.48 -0.38 -0.48 -0.52 C-0.48 -0.78 -0.3 -1 0 -1 Z',
};
function suit(g, s, x, y, size, color, flip = false) {
  g.save(); g.translate(x, y); if (flip) g.rotate(Math.PI);
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${size * 1.25}px "DejaVu Sans"`; g.fillText(s, 0, size * 0.04); g.restore();
}
const PIPS = { 7: [[0, -0.75], [0, 0.75], [-0.5, -0.75], [0.5, -0.75], [-0.5, 0], [0.5, 0], [0, -0.38]].slice(0), 10: [[-0.5, -0.8], [-0.5, -0.27], [-0.5, 0.27], [-0.5, 0.8], [0.5, -0.8], [0.5, -0.27], [0.5, 0.27], [0.5, 0.8], [0, -0.53], [0, 0.53]], 3: [[0, -0.7], [0, 0], [0, 0.7]] };
PIPS[7] = [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0], [0.5, 0], [-0.5, 0.8], [0.5, 0.8], [0, -0.4]];
function cardFace(rank, s) {
  const red = s === '♥' || s === '♦';
  const col = red ? '#B3121E' : '#141414';
  return canvasTex(630, 880, (g, w, h) => {
    rrect(g, 0, 0, w, h, 44); g.fillStyle = '#FBFAF4'; g.fill();
    g.save(); g.clip(); grain(g, w, h, 0.025); g.restore();
    g.fillStyle = col; g.textAlign = 'center';
    g.font = '700 92px Georgia, "Times New Roman", serif';
    for (const flip of [false, true]) {
      g.save(); if (flip) { g.translate(w, h); g.rotate(Math.PI); }
      g.fillText(rank, 62, 112); suit(g, s, 62, 168, 58, col); g.restore();
    }
    if (rank === 'A') {
      suit(g, s, w / 2, h / 2, s === '♠' ? 270 : 220, col);
      
    } else {
      const P = PIPS[rank] || PIPS[3];
      for (const [px, py] of P) suit(g, s, w / 2 + px * 150, h / 2 + py * 280, 112, col, py > 0.1);
    }
  });
}
function cardBack() {
  return canvasTex(630, 880, (g, w, h) => {
    rrect(g, 0, 0, w, h, 44); g.fillStyle = '#FBFAF4'; g.fill();
    rrect(g, 34, 34, w - 68, h - 68, 22); g.fillStyle = '#9E1B26'; g.fill();
    g.save(); rrect(g, 34, 34, w - 68, h - 68, 22); g.clip();
    g.strokeStyle = 'rgba(255,240,235,.55)'; g.lineWidth = 3;
    for (let k = -h; k < w + h; k += 26) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
    g.fillStyle = '#9E1B26'; g.beginPath(); g.ellipse(w / 2, h / 2, 150, 210, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#F4E6DE'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#F4E6DE'; g.textAlign = 'center'; g.font = '700 64px Georgia, serif'; g.fillText('HS', w / 2, h / 2 + 22);
    g.restore(); grain(g, w, h, 0.03);
  });
}
const cornerAlpha = canvasTex(630, 880, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); rrect(g, 0, 0, w, h, 44); g.fillStyle = '#fff'; g.fill(); }, false);

let cardN = 0;
function card(tex, x, z, rot, y = 0.03, bend = 0) {
  const geo = new THREE.PlaneGeometry(6.3, 8.8, 12, 16);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 3.15; p.setZ(i, bend * (u * u)); }
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaMap: cornerAlpha, alphaTest: 0.5, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -cardN, polygonOffsetUnits: -cardN * 4 });
  cardN += 1;
  const mesh = new THREE.Mesh(geo, m);
  mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = rot;
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------- jetons
function chipMats(base, insert) {
  const side = canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = insert; for (let i = 0; i < 6; i++) g.fillRect(i * w / 6 + 30, 0, w / 12 - 20, h);
    grain(g, w, h, 0.04);
  });
  const top = canvasTex(512, 512, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = base; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    g.fillStyle = insert;
    for (let i = 0; i < 6; i++) { g.save(); g.translate(c, c); g.rotate(i * Math.PI / 3 + 0.25); g.fillRect(-26, -c, 52, 54); g.restore(); }
    g.strokeStyle = insert; g.lineWidth = 6; g.setLineDash([14, 10]); g.beginPath(); g.arc(c, c, c * 0.66, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#F3EEE2'; g.beginPath(); g.arc(c, c, c * 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = base; g.textAlign = 'center'; g.font = '700 92px Georgia, serif'; g.fillText(base === '#1E1E22' ? '100' : base === '#1F4FA0' ? '10' : '25', c, c + 32);
    grain(g, w, h, 0.04);
  });
  const mk = (map) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  return [mk(side), mk(top), mk(top)];
}
const CHIPS = { rouge: chipMats('#B01E22', '#F3EEE2'), bleu: chipMats('#1F4FA0', '#F3EEE2'), noir: chipMats('#1E1E22', '#E8C25A'), vert: chipMats('#1E7A46', '#F3EEE2') };
const chipGeo = new THREE.CylinderGeometry(1.95, 1.95, 0.34, 72, 1);
function chip(kind, x, y, z, rx = 0, rz = 0, ry = rnd() * 6) {
  const m = new THREE.Mesh(chipGeo, CHIPS[kind]);
  m.position.set(x, y + 0.17, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function stack(kind, x, z, n) { for (let i = 0; i < n; i++) chip(kind, x + (rnd() - 0.5) * 0.18, i * 0.345, z + (rnd() - 0.5) * 0.18); }

// ---------------------------------------------------------------- dés
function dieFace(n) {
  const P = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.27, 0.22], [0.27, 0.5], [0.27, 0.78], [0.73, 0.22], [0.73, 0.5], [0.73, 0.78]] }[n];
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#F6F1E4'; g.fillRect(0, 0, w, w);
    for (const [x, y] of P) { const r = n === 1 ? 30 : 21; const gr = g.createRadialGradient(x * w - 4, y * w - 4, 2, x * w, y * w, r); gr.addColorStop(0, '#3A3A3A'); gr.addColorStop(1, '#0A0A0A'); g.fillStyle = n === 1 ? '#A0101A' : gr; g.beginPath(); g.arc(x * w, y * w, r, 0, Math.PI * 2); g.fill(); }
    grain(g, w, w, 0.03);
  });
}
const dieMats = [1, 6, 2, 5, 3, 4].map((n) => new THREE.MeshPhysicalMaterial({ map: dieFace(n), roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
function die(x, z, ry, top = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.7, 1.7, 5, 0.28), dieMats);
  // top : quelle face regarde en haut (rotation simple)
  const rots = [[0, 0, Math.PI / 2], [0, 0, -Math.PI / 2], [0, 0, 0], [Math.PI, 0, 0], [-Math.PI / 2, 0, 0], [Math.PI / 2, 0, 0]];
  const [a, b, c] = rots[top];
  m.rotation.set(a, 0, c);
  const grp = new THREE.Group(); grp.add(m); grp.rotation.y = ry; grp.position.set(x, 0.85, z);
  m.castShadow = true; m.receiveShadow = true; scene.add(grp);
}

// ---------------------------------------------------------------- verre de bière sur son sous-bock
function coaster(x, z, r = 5.4) {
  const tex = canvasTex(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#EFE6D2'; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#B3202A'; g.lineWidth = 22; g.beginPath(); g.arc(c, c, c - 40, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 72, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#B3202A'; g.font = '700 70px Georgia, serif'; g.textAlign = 'center';
    const txt = 'HORS SERVICE · BIÈRE DU SOIR · ';
    for (let i = 0; i < txt.length; i++) { g.save(); g.translate(c, c); g.rotate((i / txt.length) * Math.PI * 2); g.fillText(txt[i], 0, -c + 150); g.restore(); }
    g.strokeStyle = 'rgba(140,90,30,.25)'; g.lineWidth = 16; g.beginPath(); g.arc(c + 60, c + 40, 300, 0.3, 5.2); g.stroke();
    grain(g, w, w, 0.06);
  });
  const side = new THREE.MeshStandardMaterial({ color: 0xd9ccb2, roughness: 0.95 });
  const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 96), [side, top, top]);
  m.position.set(x, 0.11, z); m.rotation.y = rnd() * 6; m.castShadow = true; m.receiveShadow = true; scene.add(m);
}
function pint(x, z) {
  const prof = [];
  const hgt = 15;
  const pr = (t) => 3.15 + 1.2 * t + 0.25 * Math.sin(t * Math.PI) * (t > 0.7 ? 1 : 0);
  prof.push(new THREE.Vector2(0, 0.0));
  for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new THREE.Vector2(pr(t), t * hgt)); }
  for (let i = 24; i >= 1; i--) { const t = i / 24; prof.push(new THREE.Vector2(pr(t) - 0.22, t * hgt)); }
  prof.push(new THREE.Vector2(0, 0.9));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, envMapIntensity: 2.5, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.set(x, 0.22, z); glass.castShadow = false; glass.renderOrder = 2; scene.add(glass);
  // bière
  const bh = 12.8;
  const bprof = [new THREE.Vector2(0, 0.9)];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const yy = 0.9 + t * (bh - 0.9); bprof.push(new THREE.Vector2(pr(yy / hgt) - 0.26, yy)); }
  bprof.push(new THREE.Vector2(0, bh));
  const beer = new THREE.Mesh(new THREE.LatheGeometry(bprof, 96), new THREE.MeshPhysicalMaterial({ color: 0xB86A08, emissive: 0x8A4200, emissiveIntensity: 0.9, roughness: 0.08, clearcoat: 1 }));
  beer.position.set(x, 0.22, z); beer.castShadow = true; scene.add(beer);
  // mousse
  const foamTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#F7F0DE'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 2600; i++) { const r = 1 + Math.random() * 7; g.fillStyle = `rgba(${200 + Math.random() * 40},${185 + Math.random() * 40},${150 + Math.random() * 40},${0.25 + Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.stroke(); }
  });
  const fr = pr(13.6 / hgt) - 0.25;
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(fr, pr(bh / hgt) - 0.26, 13.6 - bh, 96), [new THREE.MeshStandardMaterial({ color: 0xF2E8D2, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: foamTex, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: 0xF2E8D2 })]);
  foam.position.set(x, 0.22 + (bh + 13.6) / 2, z); foam.castShadow = true; scene.add(foam);
  // ombre du verre (le verre transparent n'en porte pas, on en pose une douce à part)
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.2, 14, 48), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  sh.position.set(x, 7.2, z); sh.castShadow = true; scene.add(sh);
}

// ---------------------------------------------------------------- capsules
function cap(x, z, colorTop, upside = false) {
  const geo = new THREE.CylinderGeometry(1.42, 1.62, 0.62, 126, 3, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vz = p.getZ(i), vy = p.getY(i);
    const a = Math.atan2(vz, vx); const k = (0.31 - vy) / 0.62; // 0 en haut, 1 en bas
    const r = Math.hypot(vx, vz) * (1 + k * 0.07 * Math.cos(a * 21));
    p.setX(i, Math.cos(a) * r); p.setZ(i, Math.sin(a) * r);
  }
  geo.computeVertexNormals();
  const metal = new THREE.MeshStandardMaterial({ color: 0xC9C2B0, metalness: 1, roughness: 0.32, side: THREE.DoubleSide });
  const topTex = canvasTex(512, 512, (g, w) => {
    const c = w / 2; g.fillStyle = colorTop; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#F3E9D2'; g.lineWidth = 14; g.beginPath(); g.arc(c, c, c * 0.7, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#F3E9D2'; g.font = '700 120px Georgia, serif'; g.textAlign = 'center'; g.fillText('HS', c, c + 42);
  });
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.42, 96), upside ? new THREE.MeshStandardMaterial({ color: 0xD8D2C4, roughness: 0.7 }) : new THREE.MeshStandardMaterial({ map: topTex, metalness: 0.5, roughness: 0.35 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.31;
  const g = new THREE.Group(); const sk = new THREE.Mesh(geo, metal); g.add(sk); g.add(top);
  if (upside) g.rotation.x = Math.PI;
  g.position.set(x, 0.31, z); g.rotation.y = rnd() * 6;
  sk.castShadow = true; top.castShadow = true; sk.receiveShadow = true; scene.add(g);
}


// ---------------------------------------------------------------- tapis de roulette (fond des menus)
const ROUGES = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
// dispose le tapis à la verticale (zéro en haut) ; renvoie aussi le centre de chaque case, en fraction de la texture
function rouletteLayout(TW, TH) {
  const mx = TW * 0.06, top = TH * 0.05, zeroH = TH * 0.1, colH = TH * 0.07, bottom = TH * 0.05;
  const unit = (TW - mx * 2) / 5;
  const rowH = (TH - top - zeroH - colH - bottom) / 12;
  const gx = mx + unit * 2, gy = top + zeroH;
  return { mx, top, zeroH, colH, unit, rowH, gx, gy };
}
function cellCenter(L, n, TW, TH) {
  const r = Math.floor((n - 1) / 3), c = (n - 1) % 3;
  return [(L.gx + (c + 0.5) * L.unit) / TW, (L.gy + (r + 0.5) * L.rowH) / TH];
}
function rouletteTex(TW, TH) {
  const L = rouletteLayout(TW, TH);
  const tex = canvasTex(TW, TH, (g) => {
    // feutre
    g.fillStyle = '#1B6B44'; g.fillRect(0, 0, TW, TH);
    const img = g.getImageData(0, 0, TW, TH); const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 22; d[i] += n * 0.6; d[i + 1] += n; d[i + 2] += n * 0.7; }
    g.putImageData(img, 0, 0);
    const ink = '#EADFAE';
    const lw = Math.max(6, TW * 0.004);
    g.lineJoin = 'round';
    const box = (x, y, w, h, fill) => { if (fill) { g.fillStyle = fill; g.fillRect(x + lw, y + lw, w - lw * 2, h - lw * 2); } g.strokeStyle = ink; g.lineWidth = lw; g.strokeRect(x, y, w, h); };
    const txt = (t, x, y, size, rot = 0, col = ink) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${size}px "DejaVu Serif"`; g.fillText(t, 0, 0); g.restore(); };
    // zéro : case en pointe
    g.beginPath(); g.moveTo(L.gx, L.gy); g.lineTo(L.gx, L.top + L.zeroH * 0.35); g.lineTo(L.gx + L.unit * 1.5, L.top); g.lineTo(L.gx + L.unit * 3, L.top + L.zeroH * 0.35); g.lineTo(L.gx + L.unit * 3, L.gy); g.closePath();
    g.fillStyle = '#167A46'; g.fill(); g.strokeStyle = ink; g.lineWidth = lw; g.stroke();
    txt('0', L.gx + L.unit * 1.5, L.top + L.zeroH * 0.58, L.unit * 0.42);
    // numéros
    for (let n = 1; n <= 36; n++) {
      const r = Math.floor((n - 1) / 3), c = (n - 1) % 3;
      const x = L.gx + c * L.unit, y = L.gy + r * L.rowH;
      box(x, y, L.unit, L.rowH, ROUGES.has(n) ? '#A8161F' : '#151515');
      txt(String(n), x + L.unit / 2, y + L.rowH / 2 + 2, L.rowH * 0.5, 0, '#F3EAD0');
    }
    // colonnes
    for (let c = 0; c < 3; c++) { const x = L.gx + c * L.unit, y = L.gy + 12 * L.rowH; box(x, y, L.unit, L.colH); txt('2 à 1', x + L.unit / 2, y + L.colH / 2, L.colH * 0.3); }
    // douzaines
    const dz = ['P12', 'M12', 'D12'];
    for (let k = 0; k < 3; k++) { const x = L.mx + L.unit, y = L.gy + k * 4 * L.rowH; box(x, y, L.unit, L.rowH * 4); txt(dz[k], x + L.unit / 2, y + L.rowH * 2, L.unit * 0.3, -Math.PI / 2); }
    // chances simples
    const ch = ['MANQUE', 'PAIR', '◆', '◆', 'IMPAIR', 'PASSE'];
    for (let k = 0; k < 6; k++) {
      const x = L.mx, y = L.gy + k * 2 * L.rowH;
      box(x, y, L.unit, L.rowH * 2);
      if (k === 2 || k === 3) {
        g.save(); g.translate(x + L.unit / 2, y + L.rowH); g.beginPath(); const dw = L.unit * 0.32, dh = L.rowH * 0.62;
        g.moveTo(0, -dh); g.lineTo(dw, 0); g.lineTo(0, dh); g.lineTo(-dw, 0); g.closePath(); g.fillStyle = k === 2 ? '#A8161F' : '#151515'; g.fill(); g.strokeStyle = ink; g.lineWidth = lw * 0.7; g.stroke(); g.restore();
      } else txt(ch[k], x + L.unit / 2, y + L.rowH, L.unit * 0.2, -Math.PI / 2);
    }
    // usure de l'encre
    const im2 = g.getImageData(0, 0, TW, TH); const e = im2.data;
    for (let i = 0; i < e.length; i += 4) { if (e[i] > 180 && e[i + 1] > 170) { const k = 0.85 + Math.random() * 0.15; e[i] *= k; e[i + 1] *= k; e[i + 2] *= k; } }
    g.putImageData(im2, 0, 0);
  });
  return { tex, L };
}
function feltNormal(n) {
  const t = canvasTex(n, n, (g) => {
    const img = g.createImageData(n, n); const d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = 128 + (Math.random() - 0.5) * 60; d[i + 1] = 128 + (Math.random() - 0.5) * 60; d[i + 2] = 255; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 60);
  return t;
}


// ---------------------------------------------------------------- cartes de l'app (crème, titre Alfa Slab, texte Literata)
function wrap(g, t, maxW) { const out = []; let line = ''; for (const w of t.split(' ')) { const tt = line ? line + ' ' + w : w; if (g.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; } out.push(line); return out; }
function appCard(head, body, tag, col = '#B8261A') {
  return canvasTex(630, 880, (g, w, h) => {
    rrect(g, 0, 0, w, h, 44); g.fillStyle = '#F6EFDF'; g.fill();
    g.save(); g.clip(); grain(g, w, h, 0.03); g.restore();
    g.strokeStyle = 'rgba(28,25,21,.18)'; g.lineWidth = 3; rrect(g, 30, 30, w - 60, h - 60, 26); g.stroke();
    g.fillStyle = col; g.font = '400 50px "Alfa Slab One"'; g.textAlign = 'left';
    wrap(g, head, w - 130).forEach((l, i) => g.fillText(l, 66, 150 + i * 60));
    g.fillStyle = '#1C1915'; g.font = '600 56px Literata';
    wrap(g, body, w - 130).forEach((l, i) => g.fillText(l, 66, 330 + i * 72));
    g.fillStyle = 'rgba(28,25,21,.55)'; g.font = '400 30px "Alfa Slab One"'; g.fillText(tag, 66, h - 74);
    g.textAlign = 'right'; g.fillText('HORS SERVICE', w - 66, h - 74);
  });
}
// ---------------------------------------------------------------- château de cartes
function cardSolid(tex, back) {
  // carte en volume très fin, recto / verso
  const geo = new THREE.BoxGeometry(6.3, 0.03, 8.8);
  const edge = new THREE.MeshStandardMaterial({ color: 0xF4EEE0, roughness: 0.6 });
  const top = new THREE.MeshStandardMaterial({ map: tex, alphaMap: cornerAlpha, alphaTest: 0.5, roughness: 0.55 });
  const bot = new THREE.MeshStandardMaterial({ map: back, alphaMap: cornerAlpha, alphaTest: 0.5, roughness: 0.55 });
  const m = new THREE.Mesh(geo, [edge, edge, top, bot, edge, edge]);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function house(x0, z0, levels, faces, back, ry = 0) {
  const grp = new THREE.Group(); grp.position.set(x0, 0, z0); grp.rotation.y = ry; scene.add(grp);
  const lean = 0.36; // inclinaison des cartes par rapport à la verticale
  const hh = 8.8 * Math.cos(lean), half = 8.8 * Math.sin(lean);
  let k = 0;
  for (let lv = 0; lv < levels; lv++) {
    const n = levels - lv, y0 = lv * (hh + 0.03), span = 2 * half + 0.6;
    const xs = (i) => (i - (n - 1) / 2) * span;
    for (let i = 0; i < n; i++) {
      for (const sgn of [-1, 1]) {
        const c = cardSolid(faces[k++ % faces.length], back);
        c.rotation.order = 'YXZ'; c.rotation.z = -sgn * lean; c.rotation.x = 0;
        // carte debout : on la fait pivoter pour que la grande dimension soit verticale
        c.geometry = new THREE.BoxGeometry(0.03, 8.8, 6.3);
        c.material = [c.material[2], c.material[3], c.material[0], c.material[0], c.material[0], c.material[0]];
        c.position.set(xs(i) - sgn * half / 2, y0 + hh / 2, 0);
        grp.add(c);
      }
      if (i < n - 1 && lv < levels) {
        const f = cardSolid(back, back); f.rotation.y = Math.PI / 2; f.position.set((xs(i) + xs(i + 1)) / 2, y0 + hh + 0.02, 0); grp.add(f);
      }
    }
  }
  return grp;
}
// ---------------------------------------------------------------- pizza
function pizzaTex() {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2;
    let gr = g.createRadialGradient(c, c, c * 0.8, c, c, c); gr.addColorStop(0, '#D99A4E'); gr.addColorStop(0.7, '#C07A35'); gr.addColorStop(1, '#8E5524');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 260; i++) { const a = rnd() * 6.283, r = c * (0.86 + rnd() * 0.12); g.fillStyle = `rgba(70,35,10,${0.15 + rnd() * 0.35})`; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 2 + rnd() * 9, 0, 6.283); g.fill(); }
    g.fillStyle = '#B5341C'; g.beginPath(); g.arc(c, c, c * 0.84, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(c, c, c * 0.84, 0, Math.PI * 2); g.clip();
    g.filter = 'blur(10px)';
    for (let i = 0; i < 160; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * c * 0.8; g.fillStyle = `rgba(${236 + rnd() * 16},${196 + rnd() * 30},${120 + rnd() * 40},${0.55 + rnd() * 0.35})`; g.beginPath(); g.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r, 26 + rnd() * 50, 20 + rnd() * 34, rnd() * 3, 0, 6.283); g.fill(); }
    g.filter = 'blur(3px)';
    for (let i = 0; i < 120; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * c * 0.8; g.fillStyle = `rgba(${170 + rnd() * 40},${100 + rnd() * 30},${40 + rnd() * 20},${0.2 + rnd() * 0.3})`; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 4 + rnd() * 12, 0, 6.283); g.fill(); }
    g.filter = 'none'; g.restore();
    for (let i = 0; i < 400; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * c * 0.8; g.fillStyle = `rgba(150,90,30,${rnd() * 0.25})`; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 3 + rnd() * 10, 0, 6.283); g.fill(); }
    const pep = []; while (pep.length < 15) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * c * 0.7; const p = [c + Math.cos(a) * r, c + Math.sin(a) * r]; if (pep.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 120)) pep.push(p); }
    for (const [x, y] of pep) { gr = g.createRadialGradient(x - 8, y - 8, 4, x, y, 52); gr.addColorStop(0, '#B8322A'); gr.addColorStop(0.8, '#8E1F1A'); gr.addColorStop(1, '#5E120E'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 50, 0, 6.283); g.fill(); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(240,200,160,.45)'; g.beginPath(); g.arc(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 60, 3 + rnd() * 4, 0, 6.283); g.fill(); } }
    for (let i = 0; i < 40; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * c * 0.75; g.fillStyle = '#3F5A1E'; g.beginPath(); g.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r, 6 + rnd() * 8, 3 + rnd() * 4, rnd() * 3, 0, 6.283); g.fill(); }
    for (let i = 0; i < 9; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * c * 0.72; const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; g.strokeStyle = '#1D1A16'; g.lineWidth = 11; g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.stroke(); }
  });
}
function pizza(x, z, R, missing = []) {
  // disque découpé en 8 parts, certaines manquent
  const tex = pizzaTex();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 });
  const side = new THREE.MeshStandardMaterial({ color: 0xB0712F, roughness: 0.8 });
  const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
  for (let i = 0; i < 8; i++) {
    if (missing.includes(i)) continue;
    const a0 = i * Math.PI / 4 + 0.01, a1 = (i + 1) * Math.PI / 4 - 0.01;
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, R, a0, a1, false); sh.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 24 });
    // UV planes depuis x,y
    const p = geo.attributes.position, uv = geo.attributes.uv; for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k) / (2 * R) + 0.5, p.getY(k) / (2 * R) + 0.5);
    const m = new THREE.Mesh(geo, [mat, side]); m.rotation.x = -Math.PI / 2; m.position.y = 0.06;
    m.castShadow = true; m.receiveShadow = true; grp.add(m);
  }
  return grp;
}
function boxTex(w, h, inside) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = inside ? '#D9C3A0' : '#C9A877'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(110,80,40,${0.04 + rnd() * 0.06})`; g.lineWidth = 1 + rnd() * 2; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (rnd() - 0.5) * 12); g.stroke(); }
    if (inside) { for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(140,80,20,${0.08 + rnd() * 0.1})`; g.beginPath(); g.ellipse(w * (0.25 + rnd() * 0.5), h * (0.25 + rnd() * 0.5), 20 + rnd() * 50, 14 + rnd() * 30, rnd() * 3, 0, 6.283); g.fill(); } }
    else { g.fillStyle = '#A3231B'; g.textAlign = 'center'; g.font = '400 90px "Alfa Slab One"'; g.fillText('PIZZA', w / 2, h / 2 + 10); g.font = '600 40px Literata'; g.fillText('chaude et à l’heure', w / 2, h / 2 + 70); g.strokeStyle = '#A3231B'; g.lineWidth = 8; g.strokeRect(40, 40, w - 80, h - 80); }
    grain(g, w, h, 0.05);
  });
}
function pizzaBox(x, z, S, open = 1.9) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
  const T = 0.18, Hh = 2.6;
  const cb = new THREE.MeshStandardMaterial({ color: 0xC9A877, roughness: 0.9 });
  const inT = new THREE.MeshStandardMaterial({ map: boxTex(1024, 1024, true), roughness: 0.92 });
  const outT = new THREE.MeshStandardMaterial({ map: boxTex(1024, 1024, false), roughness: 0.9 });
  const add = (geo, mats, px, py, pz) => { const m = new THREE.Mesh(geo, mats); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  add(new THREE.BoxGeometry(S, T, S), [cb, cb, inT, cb, cb, cb], 0, T / 2, 0);
  add(new THREE.BoxGeometry(S, Hh, T), cb, 0, Hh / 2, S / 2 - T / 2);
  add(new THREE.BoxGeometry(S, Hh, T), cb, 0, Hh / 2, -S / 2 + T / 2);
  add(new THREE.BoxGeometry(T, Hh, S), cb, S / 2 - T / 2, Hh / 2, 0);
  add(new THREE.BoxGeometry(T, Hh, S), cb, -S / 2 + T / 2, Hh / 2, 0);
  // couvercle ouvert, charnière à l'arrière
  const hinge = new THREE.Group(); hinge.position.set(0, Hh, -S / 2); grp.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(S, T, S), [cb, cb, outT, inT, cb, cb]);
  lid.position.set(0, 0, S / 2); lid.castShadow = true; lid.receiveShadow = true; hinge.add(lid);
  hinge.rotation.x = -open;
  return grp;
}

// ---------------------------------------------------------------- compositions
if (SCENE === 'verre') {
  coaster(0, 3); pint(0, 3);
  cap(7.2, 7.8, '#1E4E8A'); cap(-6.6, 8.8, '#B3202A');
}
if (SCENE === 'cartes') {
  const back = cardBack();
  card(back, -7, 1.5, 0.35, 0.03);
  card(back, -5.6, 1.2, 0.18, 0.08);
  card(cardFace('A', '♠'), -2.4, 0.4, -0.12, 0.13);
  card(cardFace('7', '♥'), 1.6, 1.0, -0.38, 0.18);
  card(cardFace('A', '♥'), 5.4, 3.1, -0.62, 0.03);
  card(appCard('Je n’ai jamais…', 'chanté sous la douche en pensant que personne n’écoutait.', 'Je n’ai jamais'), 10.6, -2.2, 0.28, 0.03);
  card(appCard('Qui oserait… ?', 'envoyer un vocal de trois minutes à son ex.', 'Qui oserait', '#1F4FA0'), 14.2, 3.4, -0.2, 0.08);
  die(-10.6, -5.2, 0.4, 2); die(-7.6, -6.6, 1.1, 4);
}
if (SCENE === 'pyramide') {
  // le tombeau de Toutankhamon : pyramide à plat, la base déjà en partie retournée
  const back = cardBack();
  const up = { '0-0': cardFace('7', '♥'), '0-1': cardFace('A', '♠'), '0-2': cardFace('3', '♣') };
  const rows = 4, dx = 7.0, dz = 9.6;
  for (let r = 0; r < rows; r++) {
    const n = rows - r;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * dx + (rnd() - 0.5) * 0.35, z = (rows / 2 - r - 0.5) * dz + (rnd() - 0.5) * 0.35;
      card(up[`${r}-${i}`] || back, x, z, (rnd() - 0.5) * 0.08, 0.03);
    }
  }
  // la pioche à côté
  for (let i = 0; i < 6; i++) card(back, 16 + i * 0.03, 10.5 - i * 0.03, 0.3, 0.03 + i * 0.05);
}
if (SCENE === 'pizza') {
  pizzaBox(0, 0, 26);
  pizza(0, 0, 11.6, [1, 2]);
  // une part posée à côté
  const p = pizza(0, 0, 11.6, [0, 1, 2, 3, 4, 5, 6]); p.rotation.y = 2.6; p.position.set(24, 0, 2);
}
renderer.render(scene, cam);
// rendu progressif : un deuxième passage pour la transmission
renderer.render(scene, cam);
window.__done = renderer.domElement.toDataURL('image/png');
