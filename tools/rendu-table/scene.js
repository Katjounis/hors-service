// Rendu photoréaliste des objets posés sur la table (vue de dessus), fond transparent avec ombres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
cam.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x203020, 0.55));
const key = new THREE.DirectionalLight(0xfff0d8, 2.0);
key.position.set(-18, 40, -10);
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

function card(tex, x, z, rot, y = 0.03, bend = 0.12) {
  const geo = new THREE.PlaneGeometry(6.3, 8.8, 12, 16);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 3.15; p.setZ(i, bend * (u * u)); }
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaMap: cornerAlpha, alphaTest: 0.5, roughness: 0.55, side: THREE.DoubleSide });
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

// ---------------------------------------------------------------- compositions
if (SCENE === 'verre') {
  coaster(0, 3); pint(0, 3);
  cap(7.2, 7.8, '#1E4E8A'); cap(-6.6, 8.8, '#B3202A', true);
}
if (SCENE === 'cartes') {
  const back = cardBack();
  card(back, -7, 1.5, 0.35, 0.03);
  card(back, -5.6, 1.2, 0.18, 0.06);
  card(cardFace('A', '♠'), -2.4, 0.4, -0.12, 0.1);
  card(cardFace('7', '♥'), 1.6, 1.0, -0.38, 0.14);
  card(cardFace('A', '♥'), 5.4, 3.1, -0.62, 0.03);
  stack('rouge', 9.6, -3.8, 7); stack('bleu', 12.8, -1.4, 4);
  chip('noir', 12, -6.6, 0, 0.0, 0.0); chip('rouge', 7.4, -7.4, 0, 0.0, 0.0);
  chip('vert', 14.6, 3.2, 0.2, 0.18, 0);
  die(-10.6, -5.2, 0.4, 2); die(-7.6, -6.6, 1.1, 4);
}
if (SCENE === 'jetons') {
  const back = cardBack();
  for (let i = 0; i < 9; i++) card(back, -3 + i * 0.03, -0.6 - i * 0.02, 0.22, 0.03 + i * 0.035, 0.02);
  stack('noir', 5.2, -3.4, 10); stack('rouge', 7.6, 0.6, 6); stack('vert', 4.4, 3.6, 3);
  chip('bleu', -8, 5.2, 0); chip('rouge', -6.2, 7.2, 0);
  die(1, 7.4, 0.8, 0);
}

renderer.render(scene, cam);
// rendu progressif : un deuxième passage pour la transmission
renderer.render(scene, cam);
window.__done = renderer.domElement.toDataURL('image/png');
