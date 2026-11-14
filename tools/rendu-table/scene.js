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
PIPS[6] = [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0], [0.5, 0], [-0.5, 0.8], [0.5, 0.8]];
PIPS[9] = [[-0.5, -0.8], [-0.5, -0.27], [-0.5, 0.27], [-0.5, 0.8], [0.5, -0.8], [0.5, -0.27], [0.5, 0.27], [0.5, 0.8], [0, 0]];
PIPS[2] = [[0, -0.7], [0, 0.7]];
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


// ---------------------------------------------------------------- mode cul : string, menottes, capote, rouge à lèvres
function noise2(x, y) { return Math.sin(x * 1.7 + Math.sin(y * 0.9)) * 0.5 + Math.sin(y * 2.3 + x * 0.4) * 0.3 + Math.sin((x + y) * 3.1) * 0.2; }
function laceTex() {
  // dentelle rouge : tulle en maille fine, motifs floraux pleins, bord festonné à cils
  const N = 1400;
  const shapePath = (g) => { g.beginPath(); g.moveTo(90, 170); g.bezierCurveTo(420, 260, 980, 260, N - 90, 170); g.bezierCurveTo(N - 200, 620, N / 2 + 240, 980, N / 2 + 80, 1300); g.lineTo(N / 2 - 80, 1300); g.bezierCurveTo(N / 2 - 240, 980, 200, 620, 90, 170); g.closePath(); };
  const col = canvasTex(N, N, (g) => {
    g.fillStyle = '#9E0F1C'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,90,100' : '60,0,8'},${rnd() * 0.12})`; g.fillRect(rnd() * N, rnd() * N, 3, 3); }
  });
  const flowers = [];
  for (let i = 0; i < 400 && flowers.length < 15; i++) { const f = [180 + rnd() * (N - 360), 300 + rnd() * 800, 50 + rnd() * 40]; if (flowers.every((q) => Math.hypot(q[0] - f[0], q[1] - f[1]) > q[2] + f[2] + 30)) flowers.push(f); }
  const alpha = canvasTex(N, N, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
    g.save(); shapePath(g); g.clip();
    // tulle : maille hexagonale fine
    g.fillStyle = 'rgb(70,70,70)'; g.fillRect(0, 0, N, N);
    g.strokeStyle = '#fff'; g.lineWidth = 2.2; const c = 14;
    for (let y = 0; y < N; y += c * 1.5) for (let x = 0; x < N; x += c * 1.732) { const ox = (Math.round(y / (c * 1.5)) % 2) * c * 0.866; g.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3; const px = x + ox + Math.cos(an) * c, py = y + Math.sin(an) * c; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.stroke(); }
    // fleurs : pétales pleins avec nervures ajourées, tiges et feuilles
    for (const [cx, cy, r] of flowers) {
      g.fillStyle = '#fff';
      for (let k = 0; k < 7; k++) { const an = k * 2 * Math.PI / 7; g.beginPath(); g.ellipse(cx + Math.cos(an) * r * 0.55, cy + Math.sin(an) * r * 0.55, r * 0.5, r * 0.3, an, 0, 6.283); g.fill(); }
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, r * 0.22, 0, 6.283); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r * 0.12, 0, 6.283); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 3; for (let k = 0; k < 7; k++) { const an = k * 2 * Math.PI / 7; g.beginPath(); g.moveTo(cx + Math.cos(an) * r * 0.3, cy + Math.sin(an) * r * 0.3); g.lineTo(cx + Math.cos(an) * r * 0.9, cy + Math.sin(an) * r * 0.9); g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = 5; const a2 = rnd() * 6.28; g.beginPath(); g.moveTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r); g.quadraticCurveTo(cx + Math.cos(a2 + 0.5) * r * 1.8, cy + Math.sin(a2 + 0.5) * r * 1.8, cx + Math.cos(a2 + 0.2) * r * 2.3, cy + Math.sin(a2 + 0.2) * r * 2.3); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + Math.cos(a2 + 0.35) * r * 1.8, cy + Math.sin(a2 + 0.35) * r * 1.8, r * 0.32, r * 0.14, a2 + 1.2, 0, 6.283); g.fill();
    }
    g.restore();
    // bord festonné : bande pleine puis petits arcs vers l'extérieur
    g.save(); shapePath(g); g.clip(); g.strokeStyle = '#fff'; g.lineWidth = 44; shapePath(g); g.stroke(); g.restore();
    g.fillStyle = '#fff';
    // festons le long du bord haut (courbe de Bézier échantillonnée)
    const bz = (t, a, b, c2, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c2 + t ** 3 * d;
    for (let k = 0; k <= 46; k++) { const t = k / 46; const x = bz(t, 90, 420, 980, N - 90), y = bz(t, 170, 260, 260, 170); g.beginPath(); g.arc(x, y - 6, 15, Math.PI, 0); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(x, y - 12, 4, 0, 6.283); g.fill(); g.fillStyle = '#fff'; }
  }, false);
  return { col, alpha, N };
}
function tube(points, r, mat, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), closed, 'catmullrom', 0.4);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 10, closed), mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function thong(x0, z0, ry) {
  const grp = new THREE.Group(); grp.position.set(x0, 0, z0); grp.rotation.y = ry; scene.add(grp);
  const { col, alpha } = laceTex();
  const geo = new THREE.PlaneGeometry(15, 15, 90, 90);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.2 + 0.22 * noise2(x * 0.45, y * 0.45) + 0.35 * Math.max(0, Math.sin(x * 0.8 + y * 0.3)) ** 3 + 0.3 * Math.exp(-((x + 1.5) ** 2) / 2) * Math.max(0, (y + 2) / 9)); }
  geo.computeVertexNormals();
  const lace = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: col, alphaMap: alpha, alphaTest: 0.2, transparent: true, side: THREE.DoubleSide, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color(0xff6070) }));
  lace.rotation.x = -Math.PI / 2; lace.castShadow = true; lace.receiveShadow = true; lace.material.depthWrite = true; grp.add(lace);
  const satin = new THREE.MeshPhysicalMaterial({ color: 0x8E0C18, roughness: 0.3, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0xff8090) });
  const add = (m) => { scene.remove(m); grp.add(m); };
  // ceinture : ellipse souple qui part des deux coins du haut du triangle
  const E = []; const cx = 0, cz = -11.5, rx = 10.5, rz = 6.6;
  const a0 = Math.atan2((-5.9 - cz) / rz, (6.55) / rx);
  for (let k = 0; k <= 40; k++) { const an = a0 + (k / 40) * (Math.PI * 2 - 2 * (a0 + Math.PI / 2) + Math.PI) ; }
  const ring = [];
  for (let k = 0; k <= 48; k++) { const an = Math.PI * 0.62 + (k / 48) * Math.PI * 1.76; ring.push([cx + Math.cos(an) * rx * (1 + 0.1 * Math.sin(an * 2 + 0.7)), 0.28, cz + Math.sin(an) * rz * (1 + 0.14 * Math.cos(an * 3 + 0.3)) - 1.2 * Math.max(0, Math.cos(an + 0.4))]); }
  ring[0] = [-6.55, 0.3, -5.9]; ring[ring.length - 1] = [6.55, 0.3, -5.9];
  add(tube(ring, 0.3, satin));
  // ficelle arrière, de la pointe jusqu'au milieu de la ceinture
  add(tube([[0, 0.3, 7.6], [1.6, 0.18, 9.4], [4.8, 0.16, 8.8], [8.6, 0.16, 4.5], [10.6, 0.18, -2], [9.2, 0.2, -10], [3, 0.24, -17.4], [0.4, 0.28, -18.1]], 0.11, satin));
  // nœud en satin rose
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xF0A2B6, roughness: 0.35, sheen: 1, sheenColor: new THREE.Color(0xffd0dc), clearcoat: 0.4 });
  for (const sg of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), pink); b.scale.set(1.15, 0.35, 0.6); b.rotation.y = sg * 0.35; b.position.set(sg * 0.85, 0.55, -5.3); b.castShadow = true; grp.add(b); }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), pink); knot.scale.set(1, 0.6, 1); knot.position.set(0, 0.6, -5.3); grp.add(knot);
  for (const sg of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 1.3), pink); t.rotation.y = sg * 0.4; t.position.set(sg * 0.35, 0.5, -4.6); t.castShadow = true; grp.add(t); }
  return grp;
}
function fluffyRing(x, z, R, mat) {
  const geo = new THREE.TorusGeometry(R, 0.72, 48, 160);
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { const px0 = p.getX(i), py0 = p.getY(i), pz0 = p.getZ(i); const h = Math.sin(px0 * 91.7 + py0 * 47.3 + pz0 * 13.1) * 43758.5453; const f = 0.08 + (h - Math.floor(h)) * 0.24; v.fromBufferAttribute(n, i); p.setXYZ(i, p.getX(i) + v.x * f, p.getY(i) + v.y * f, p.getZ(i) + v.z * f); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.8, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function handcuffs(x0, z0) {
  const fur = new THREE.MeshPhysicalMaterial({ color: 0xE0559A, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xFFB0D8) });
  const metal = new THREE.MeshStandardMaterial({ color: 0xD8D8DC, metalness: 1, roughness: 0.25 });
  fluffyRing(x0 - 5.2, z0, 3.0, fur); fluffyRing(x0 + 5.4, z0 + 1.2, 3.0, fur);
  // charnières et chaîne
  for (const [x, z] of [[x0 - 1.7, z0 + 0.2], [x0 + 1.9, z0 + 0.9]]) { const b = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.9, 1.2, 3, 0.2), metal); b.position.set(x, 0.45, z); b.castShadow = true; scene.add(b); }
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 12, 32), metal); const t = (k + 0.5) / 3; l.position.set(x0 - 0.7 + t * 1.6, 0.18, z0 + 0.35 + t * 0.4); l.rotation.set(k % 2 ? 0 : -Math.PI / 2, 0.3, 0); l.castShadow = true; scene.add(l); }
}
function condom(x, z, ry) {
  const S = 5.6;
  const geo = new THREE.PlaneGeometry(S, S, 90, 90); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i); const r = Math.hypot(px, py); const ring = 0.22 * Math.exp(-((r - 1.75) ** 2) / 0.08) + 0.12 * Math.exp(-(r * r) / 1.2); const edge = Math.max(Math.abs(px), Math.abs(py)) > S / 2 - 0.45 ? 0.04 * Math.sin((px + py) * 18) : 0; p.setZ(i, 0.08 + ring + edge); }
  geo.computeVertexNormals();
  const tex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#8E1420'; g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(255,220,200,.25)'; g.lineWidth = 2; for (let k = 0; k < w; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 36); g.moveTo(k, w); g.lineTo(k, w - 36); g.moveTo(0, k); g.lineTo(36, k); g.moveTo(w, k); g.lineTo(w - 36, k); g.stroke(); }
    g.fillStyle = '#F3E2C8'; g.textAlign = 'center'; g.font = '400 54px "Alfa Slab One"'; g.fillText('HS', w / 2, 120); g.font = '600 30px Literata'; g.fillText('Sortez couverts', w / 2, 410);
  });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, metalness: 0.75, roughness: 0.32 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
}
function lipstick(x0, z0, ry) {
  const grp = new THREE.Group(); grp.position.set(x0, 0.75, z0); grp.rotation.y = ry; scene.add(grp);
  const gold = new THREE.MeshStandardMaterial({ color: 0xC9A15A, metalness: 1, roughness: 0.28 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xA0101E, roughness: 0.35, clearcoat: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 5, 48), gold); body.rotation.z = Math.PI / 2; body.castShadow = true; grp.add(body);
  const bulletG = new THREE.CylinderGeometry(0.55, 0.55, 2.2, 48, 8); const bp = bulletG.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i), xx = bp.getX(i); if (y > 0.2) bp.setY(i, Math.min(y, 0.2 + (xx + 0.55) * 0.9)); }
  bulletG.computeVertexNormals();
  const bullet = new THREE.Mesh(bulletG, red); bullet.rotation.z = -Math.PI / 2; bullet.position.x = 3.4; bullet.castShadow = true; grp.add(bullet);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.4, 48, 1, false), gold); cap.rotation.z = Math.PI / 2; cap.position.set(1.5, 0.05, 3.2); cap.castShadow = true; grp.add(cap);
  return grp;
}


// ---------------------------------------------------------------- objets des illustrations de jeux
function figureCard(rank, s) {
  // figure (V, D, R) : grande lettre encadrée, sans portrait
  const red = s === '♥' || s === '♦'; const col = red ? '#B3121E' : '#141414';
  return canvasTex(630, 880, (g, w, h) => {
    rrect(g, 0, 0, w, h, 44); g.fillStyle = '#FBFAF4'; g.fill(); g.save(); g.clip(); grain(g, w, h, 0.025); g.restore();
    g.fillStyle = col; g.textAlign = 'center'; g.font = '700 92px Georgia, serif';
    for (const flip of [false, true]) { g.save(); if (flip) { g.translate(w, h); g.rotate(Math.PI); } g.fillText(rank, 62, 112); suit(g, s, 62, 168, 58, col); g.restore(); }
    g.strokeStyle = col; g.lineWidth = 6; rrect(g, 120, 150, w - 240, h - 300, 18); g.stroke();
    g.fillStyle = red ? 'rgba(179,18,30,.08)' : 'rgba(20,20,20,.06)'; g.fill();
    g.fillStyle = col; g.font = '700 260px Georgia, serif'; g.fillText(rank, w / 2, h / 2 + 90);
    suit(g, s, w / 2, h / 2 + 200, 70, col);
  });
}
function shotGlass(x, z, liquid = 0xC0401E) {
  const prof = []; const H = 6;
  for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(1.7 + 0.5 * t, t * H)); }
  for (let i = 12; i >= 0; i--) { const t = i / 12; prof.push(new THREE.Vector2(1.45 + 0.5 * t, 1.1 + t * (H - 1.1))); }
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 2.5, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.set(x, 0, z); glass.renderOrder = 2; scene.add(glass);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.45, 3.6, 48), new THREE.MeshPhysicalMaterial({ color: liquid, emissive: liquid, emissiveIntensity: 0.35, roughness: 0.1, clearcoat: 1 }));
  liq.position.set(x, 1.1 + 1.8, z); liq.castShadow = true; scene.add(liq);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.1, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.3, clearcoat: 1 }));
  base.position.set(x, 0.55, z); base.castShadow = true; scene.add(base);
}
function phone(x, z, ry, screenDraw) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const body = new THREE.Mesh(new RoundedBoxGeometry(7.4, 0.8, 15.4, 6, 0.8), new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, roughness: 0.35, metalness: 0.3, clearcoat: 0.6 }));
  body.position.y = 0.4; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const tex = canvasTex(700, 1440, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); screenDraw(c, w, h); });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 14.6), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.15 }));
  scr.rotation.x = -Math.PI / 2; scr.position.y = 0.81; g.add(scr);
  return g;
}
function pencil(x, z, ry, col = 0xF2C230) {
  const g = new THREE.Group(); g.position.set(x, 0.45, z); g.rotation.y = ry; scene.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 13, 6), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.45, clearcoat: 0.6 })); body.rotation.z = Math.PI / 2; body.castShadow = true; g.add(body);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2, 6), new THREE.MeshStandardMaterial({ color: 0xE8C9A0, roughness: 0.8 })); wood.rotation.z = -Math.PI / 2; wood.position.x = 7.5; wood.castShadow = true; g.add(wood);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2a })); lead.rotation.z = -Math.PI / 2; lead.position.x = 8.3; g.add(lead);
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1, 16), new THREE.MeshStandardMaterial({ color: 0xC9C9C9, metalness: 0.9, roughness: 0.3 })); fer.rotation.z = Math.PI / 2; fer.position.x = -7; g.add(fer);
  const gum = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0xE88AA0, roughness: 0.9 })); gum.rotation.z = Math.PI / 2; gum.position.x = -8.1; g.add(gum);
}
function paper(x, z, ry, w, h, draw, lined = true) {
  const tex = canvasTex(Math.round(w * 60), Math.round(h * 60), (g, W, H) => {
    g.fillStyle = '#FBF8EE'; g.fillRect(0, 0, W, H);
    if (lined) { g.strokeStyle = 'rgba(80,120,190,.35)'; g.lineWidth = 2; for (let y = 90; y < H; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.strokeStyle = 'rgba(200,60,60,.4)'; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, H); g.stroke(); }
    if (draw) draw(g, W, H); grain(g, W, H, 0.03);
  });
  const geo = new THREE.PlaneGeometry(w, h, 20, 20); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 + 0.05 * Math.sin(p.getX(i) * 0.4 + p.getY(i) * 0.3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.02, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
}
function bomb(x, z) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(3.6, 48, 36), new THREE.MeshPhysicalMaterial({ color: 0x1d1e22, roughness: 0.3, clearcoat: 0.8, metalness: 0.2 }));
  b.position.set(x, 3.6, z); b.castShadow = true; scene.add(b);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x3a3b40, metalness: 0.6, roughness: 0.4 })); neck.position.set(x + 1.6, 6.7, z - 1); neck.rotation.set(-0.3, 0, -0.45); neck.castShadow = true; scene.add(neck);
  const fuse = new THREE.CatmullRomCurve3([new THREE.Vector3(x + 2, 7.3, z - 1.3), new THREE.Vector3(x + 3.4, 8.6, z - 1.8), new THREE.Vector3(x + 5.2, 8.4, z - 1.2), new THREE.Vector3(x + 6, 7.4, z)]);
  const f = new THREE.Mesh(new THREE.TubeGeometry(fuse, 30, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xC9A87A, roughness: 0.9 })); f.castShadow = true; scene.add(f);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: 0xFFD25A, emissive: 0xFF9A20, emissiveIntensity: 3 })); spark.position.set(x + 6, 7.4, z); scene.add(spark);
  const glow = new THREE.PointLight(0xffa040, 30, 12); glow.position.set(x + 6, 8, z); scene.add(glow);
}
function buzzer(x, z) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.6, 2.6, 64), new THREE.MeshPhysicalMaterial({ color: 0x1d1e22, roughness: 0.35, clearcoat: 0.6 })); base.position.set(x, 1.3, z); base.castShadow = true; scene.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.35, 16, 64), new THREE.MeshStandardMaterial({ color: 0xC9C9C9, metalness: 0.9, roughness: 0.25 })); ring.rotation.x = Math.PI / 2; ring.position.set(x, 2.65, z); scene.add(ring);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.9, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xD3201C, roughness: 0.15, clearcoat: 1 })); dome.scale.y = 0.55; dome.position.set(x, 2.6, z); dome.castShadow = true; scene.add(dome);
}
function candle(x, z, h = 8) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, h, 40), new THREE.MeshPhysicalMaterial({ color: 0xF4ECD8, roughness: 0.6, sheen: 0.5, transmission: 0.1 })); c.position.set(x, h / 2, z); c.castShadow = true; scene.add(c);
  const drip = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.25, 10, 40), c.material); drip.rotation.x = Math.PI / 2; drip.position.set(x, h - 0.1, z); scene.add(drip);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); wick.position.set(x, h + 0.3, z); scene.add(wick);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), new THREE.MeshStandardMaterial({ color: 0xFFE7A0, emissive: 0xFFB040, emissiveIntensity: 3 })); fl.scale.set(1, 2.2, 1); fl.position.set(x, h + 1.3, z); scene.add(fl);
  const L = new THREE.PointLight(0xffb060, 80, 30); L.position.set(x, h + 2, z); scene.add(L);
}
function crown(x, z, s = 1) {
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xE8B83A, metalness: 0.7, roughness: 0.25, clearcoat: 0.8 });
  const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 10; i++) sh.lineTo(i * 0.4, i % 2 ? 0.75 : 0.42); sh.lineTo(4, 0); sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = (p.getX(i) / 4) * Math.PI * 2; const r = 0.82 + p.getZ(i); p.setXYZ(i, Math.sin(a) * r, p.getY(i), Math.cos(a) * r); }
  geo.computeVertexNormals(); geo.scale(3.4 * s, 3.4 * s, 3.4 * s);
  const m = new THREE.Mesh(geo, gold); m.position.set(x, 1.2, z); m.rotation.set(1.15, 0.5, 0.2); m.castShadow = true; scene.add(m);
  for (const [a, c] of [[0, 0xd9342b], [1.4, 0x2f55a4], [-1.4, 0x5cbf9c]]) { const j = new THREE.Mesh(new THREE.SphereGeometry(0.35 * s, 16, 12), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.1, clearcoat: 1 })); j.position.set(Math.sin(a) * 3.0 * s, 1.6 * s, Math.cos(a) * 3.0 * s); m.add(j); j.position.applyMatrix4(new THREE.Matrix4()); }
}
function diceCup(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 3.4, z); g.rotation.set(0, ry, Math.PI / 2 - 0.08); scene.add(g);
  const prof = [new THREE.Vector2(0, -4.5), new THREE.Vector2(3.0, -4.5), new THREE.Vector2(3.4, 4.5), new THREE.Vector2(3.1, 4.5), new THREE.Vector2(2.7, -4.1), new THREE.Vector2(0, -4.1)];
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshPhysicalMaterial({ color: 0x6A3418, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0xC08050), side: THREE.DoubleSide }));
  cup.castShadow = true; g.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.2, 10, 48), new THREE.MeshStandardMaterial({ color: 0xC9A15A, metalness: 0.8, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.y = 4.4; g.add(rim);
}
function coin(x, z, s = 1) {
  const tex = canvasTex(256, 256, (g, w) => { g.fillStyle = '#C9A15A'; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(80,50,10,.5)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w * 0.4, 0, 6.28); g.stroke(); g.fillStyle = 'rgba(80,50,10,.6)'; g.textAlign = 'center'; g.font = '400 92px "Alfa Slab One"'; g.fillText('2', w / 2, w / 2 + 32); });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * s, 1.4 * s, 0.24, 48), [new THREE.MeshStandardMaterial({ color: 0xC9A15A, metalness: 0.9, roughness: 0.35 }), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0xC9A15A, metalness: 0.9, roughness: 0.35 })]);
  m.position.set(x, 0.12, z); m.castShadow = true; scene.add(m);
}
function bottle(x, z, ry) {
  const prof = []; const P = [[0, 0], [3.2, 0], [3.4, 0.4], [3.4, 13], [3.1, 15], [1.3, 18], [1.1, 22], [1.25, 22.4], [1.25, 23], [0, 23]];
  for (const [r, y] of P) prof.push(new THREE.Vector2(r, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshPhysicalMaterial({ color: 0x2E6B2E, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85 }));
  const g = new THREE.Group(); g.scale.setScalar(0.62); g.position.set(x, 3.4 * 0.62, z); g.rotation.set(0, ry, Math.PI / 2); scene.add(g); m.position.y = -11.5; m.castShadow = true; g.add(m);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.45, 6, 64, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#F2E8D0'; c.fillRect(0, 0, w, h); c.fillStyle = '#9E1B26'; c.textAlign = 'center'; c.font = '400 70px "Alfa Slab One"'; c.fillText('HS', w / 4, h / 2 + 24); c.fillText('HS', w * 3 / 4, h / 2 + 24); }), roughness: 0.7 }));
  label.position.y = -4; g.add(label);
}
function feltShadowLight() { /* la lumière principale reste celle de la scène */ }


// ---------------------------------------------------------------- surfaces de table (illustrations des jeux)
const BG = Q.get('bg');
function surfaceTex(kind) {
  const W = 2048, H = 1400;
  return canvasTex(W, H, (g) => {
    const noise = (n, a, col) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${col},${Math.random() * a})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 2 + Math.random() * 3); } };
    if (kind === 'bois' || kind === 'bois-clair') {
      const base = kind === 'bois' ? [92, 56, 32] : [176, 132, 86];
      const pw = 300;
      for (let x = 0; x < W; x += pw) {
        const k = 0.88 + Math.random() * 0.2;
        g.fillStyle = `rgb(${base.map((v) => Math.round(v * k)).join(',')})`; g.fillRect(x, 0, pw, H);
        for (let i = 0; i < 70; i++) { const y0 = Math.random() * H; g.strokeStyle = `rgba(${kind === 'bois' ? '30,15,6' : '90,55,25'},${0.08 + Math.random() * 0.18})`; g.lineWidth = 1 + Math.random() * 4; g.beginPath(); g.moveTo(x, y0); for (let xx = x; xx <= x + pw; xx += 20) g.lineTo(xx, y0 + Math.sin(xx * 0.02 + i) * 6); g.stroke(); }
        if (Math.random() < 0.5) { const cx = x + 60 + Math.random() * (pw - 120), cy = Math.random() * H; for (let r = 4; r < 40; r += 5) { g.strokeStyle = 'rgba(40,20,8,.18)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, r * 0.7, r * 1.6, 0, 0, 6.28); g.stroke(); } }
        g.fillStyle = 'rgba(20,10,4,.55)'; g.fillRect(x, 0, 4, H);
      }
      noise(9000, 0.08, '255,230,200');
    } else if (kind === 'zinc') {
      g.fillStyle = '#9EA4A8'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 3000; i++) { const y = Math.random() * H; g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,45,50'},${Math.random() * 0.08})`; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (Math.random() - 0.5) * 6); g.stroke(); }
      for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(60,65,70,.12)'; g.lineWidth = 3; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 60 + Math.random() * 90, 0, 6.28); g.stroke(); }
    } else if (kind === 'nappe') {
      g.fillStyle = '#F2EBDD'; g.fillRect(0, 0, W, H);
      const c = 110;
      for (let x = 0; x < W; x += c) { g.fillStyle = 'rgba(178,32,40,.55)'; g.fillRect(x, 0, c / 2, H); }
      for (let y = 0; y < H; y += c) { g.fillStyle = 'rgba(178,32,40,.55)'; g.fillRect(0, y, W, c / 2); }
      for (let i = 0; i < 6000; i++) { g.strokeStyle = `rgba(90,20,20,${Math.random() * 0.08})`; g.lineWidth = 1; const x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y); g.stroke(); }
    } else if (kind === 'kraft') {
      g.fillStyle = '#B98F5E'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 2500; i++) { g.strokeStyle = `rgba(80,50,20,${Math.random() * 0.12})`; g.lineWidth = 1; const x = Math.random() * W, y = Math.random() * H, a = Math.random() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
      noise(8000, 0.1, '255,240,210');
    } else if (kind === 'ardoise') {
      g.fillStyle = '#2C3330'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`; g.lineWidth = 20 + Math.random() * 60; g.beginPath(); const x = Math.random() * W, y = Math.random() * H; g.moveTo(x, y); g.quadraticCurveTo(x + 200, y + (Math.random() - 0.5) * 200, x + 400, y + (Math.random() - 0.5) * 100); g.stroke(); }
      noise(9000, 0.06, '255,255,255');
    } else {
      const F = { feutre: ['#2A7350', '#16422D'], nuit: ['#2A3A66', '#121A33'], bordeaux: ['#7A1E30', '#3A0A16'], violet: ['#4E3277', '#24143C'], gazon: ['#3E7F3A', '#1E4A1E'] }[kind] || ['#2A7350', '#16422D'];
      const gr = g.createRadialGradient(W * 0.45, H * 0.4, 50, W * 0.5, H * 0.5, W * 0.7); gr.addColorStop(0, F[0]); gr.addColorStop(1, F[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (kind === 'gazon') { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 14; for (let y = 240; y < H; y += 260) { g.setLineDash([60, 40]); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.setLineDash([]); }
      noise(16000, 0.07, '0,0,0'); noise(8000, 0.05, '255,255,255');
    }
  });
}
if (BG) {
  ground.material = new THREE.MeshStandardMaterial({ map: surfaceTex(BG), roughness: BG === 'zinc' ? 0.45 : BG.startsWith('bois') ? 0.6 : 0.95, metalness: BG === 'zinc' ? 0.5 : 0 });
  ground.geometry = new THREE.PlaneGeometry(140, 96);
  renderer.setClearColor(0x000000, 1);
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
if (SCENE === 'rouge') {
  lipstick(0, 0, -0.5);
}
if (SCENE === 'string') {
  thong(0, 0, 0.35);
  lipstick(11.5, 9, -0.5);
}
if (SCENE === 'menottes') {
  handcuffs(-2, -2);
  condom(9.5, 6.5, 0.4);
  card(appCard('Je n’ai jamais…', 'oublié de fermer les rideaux au mauvais moment.', 'Mode cul', '#B8261A'), -6.5, 8.5, -0.25, 0.03);
}

// ---------------------------------------------------------------- illustrations des jeux (cadrage 3:2)
const J = SCENE.startsWith('jeu-') ? SCENE.slice(4) : null;
if (J) {
  const back = cardBack();
  const fan = (list, x0, z0, rot0, step, dx = 2.4, dz = 0.3) => list.forEach((t, i) => card(t, x0 + i * dx, z0 + Math.abs(i - (list.length - 1) / 2) * dz, rot0 + i * step, 0.03 + i * 0.05));
  const deck = (x, z, rot, n = 8) => { for (let i = 0; i < n; i++) card(back, x + i * 0.02, z - i * 0.02, rot, 0.03 + i * 0.05); };
  switch (J) {
    case 'oserait': card(appCard('Qui oserait… ?', 'envoyer un vocal de trois minutes à son ex ?', 'Qui oserait', '#1F4FA0'), -4, 0.5, -0.12); shotGlass(5.5, -2.5); shotGlass(9.5, 1.5, 0x3F7A2A); break;
    case '96': fan([cardFace('9', '♠'), cardFace('6', '♥'), cardFace('10', '♦'), cardFace('A', '♣')], -6, 1, -0.45, 0.28, 3.6, 0.5); deck(10, -1, 0.3); break;
    case 'pipoteur': deck(-8.5, -1, -0.2, 3); card(back, -1.5, 2.5, 0.25); card(appCard('Ton mot', 'PISCINE', 'Garde-le pour toi', '#1E6B44'), 5.5, -0.5, -0.12); pencil(4, 6.6, 0.15); break;
    case 'purple': deck(-9, -1, 0.2); card(cardFace('A', '♥'), -1.8, 0.6, -0.1); card(cardFace('A', '♠'), 2.6, 0.2, 0.2, 0.08); card(cardFace('7', '♥'), 7.2, 0.8, 0.45, 0.13); break;
    case 'hippodrome': { const lane = [['A', '♥', -3], ['A', '♠', 2.5], ['A', '♦', -6.5], ['A', '♣', 5]]; lane.forEach(([r, su, z], i) => card(cardFace(r, su), z + 3, -6.6 + i * 4.4, Math.PI / 2, 0.03 + i * 0.03)); for (let i = 0; i < 4; i++) card(back, -10, -6.6 + i * 4.4, Math.PI / 2); break; }
    case 'toutankhamon': { const up = { '0-0': cardFace('7', '♥'), '0-1': cardFace('A', '♠'), '0-2': cardFace('3', '♣') }; for (let r = 0; r < 4; r++) { const n = 4 - r; for (let i = 0; i < n; i++) card(up[`${r}-${i}`] || back, (i - (n - 1) / 2) * 7, (1.5 - r) * 9.6 - 3.4, (rnd() - 0.5) * 0.06); } break; }
    case 'autres': paper(-2, 0.5, 0.06, 15, 11, (g) => { g.fillStyle = '#1F3F8A'; g.font = '600 52px Literata'; g.fillText('Le mot de passe', 110, 160); g.fillText('de Julie, c’est', 110, 220); g.fillText('sûrement…', 110, 280); g.font = 'italic 600 58px Literata'; g.fillStyle = '#B8261A'; g.fillText('« jaimeLaBiere »', 110, 380); }); pencil(5, 6.2, -0.3); shotGlass(10.5, -3.5); break;
    case 'trouve': deck(-7, 0, -0.15); card(back, 0.5, 0.5, 0.1, 0.03); card(cardFace('7', '♥'), 7.4, 1, 0.2); break;
    case 'degaine': phone(0, 0, Math.PI / 2, (c, w, h) => { c.fillStyle = '#E5502F'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#2F55A4'; c.fillRect(0, h / 2, w, h / 2); c.fillStyle = '#FFF6E8'; c.textAlign = 'center'; c.font = '400 150px "Alfa Slab One"'; c.save(); c.translate(w / 2, h / 4); c.rotate(Math.PI); c.fillText('TAPE !', 0, 50); c.restore(); c.fillText('TAPE !', w / 2, h * 3 / 4 + 50); }); break;
    case 'bombe': phone(-5, 0.5, 0.35, (c, w, h) => { c.fillStyle = '#1C1915'; c.fillRect(0, 0, w, h); c.fillStyle = '#FF8A3D'; c.textAlign = 'center'; c.font = '400 110px "Alfa Slab One"'; c.fillText('Cite une', w / 2, h / 2 - 60); c.fillText('marque', w / 2, h / 2 + 60); c.fillText('de bière', w / 2, h / 2 + 180); }); bomb(6, 0); break;
    case 'ware': phone(0, 0, -0.25, (c, w, h) => { c.fillStyle = '#2B9C8C'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFF6E8'; c.textAlign = 'center'; c.font = '400 128px "Alfa Slab One"'; c.fillText('SECOUE !', w / 2, h / 2 + 20); c.font = '600 80px Literata'; c.fillText('3', w / 2, h / 2 + 200); c.fillRect(w * 0.15, h - 140, w * 0.7 * 0.6, 26); }); die(8.5, -3, 0.5, 4); break;
    case 'jamais': card(appCard('Je n’ai jamais…', 'chanté sous la douche en pensant que personne n’écoutait.', 'Je n’ai jamais'), -5, 0.6, -0.1); coaster(7, 0.5, 4.4); shotGlass(7, 0.5, 0xB86A08); break;
    case 'garou': card(appCard('Loup-Garou', 'Chaque nuit, avec les autres loups, tu choisis une victime.', 'Rôle secret', '#2A3B6E'), -6, 1, -0.16); card(appCard('Voyante', 'Chaque nuit, tu découvres le rôle d’un joueur.', 'Rôle secret', '#6A3B8E'), 1, 0.2, 0.1, 0.08); candle(9, -2.5); break;
    case 'coinche': fan([figureCard('V', '♣'), cardFace('9', '♣'), cardFace('A', '♣'), cardFace('10', '♣')], -8, 1.5, -0.4, 0.26, 3.2, 0.45); paper(8, 0.3, -0.08, 8, 11, (g) => { g.fillStyle = '#1F3F8A'; g.font = '600 46px Literata'; g.fillText('Nous   Eux', 100, 150); g.fillText('80      0', 100, 240); g.fillText('160    90', 100, 330); g.fillText('250   250', 100, 420); }); break;
    case 'buzzer': buzzer(-2, 0); card(appCard('Question 7', 'Quelle est la capitale de l’Australie ?', 'Quiz buzzer', '#1F4FA0'), 9, 1, 0.18); break;
    case 'dessin': paper(-1.5, 0.3, -0.05, 16, 11.5, (g) => { g.strokeStyle = '#1C1915'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.ellipse(430, 380, 150, 115, 0, 0, 6.28); g.moveTo(330, 300); g.lineTo(300, 210); g.lineTo(380, 275); g.moveTo(520, 275); g.lineTo(570, 205); g.lineTo(535, 300); g.stroke(); g.beginPath(); g.arc(380, 360, 10, 0, 6.28); g.arc(480, 360, 10, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(400, 420); g.quadraticCurveTo(430, 450, 460, 420); g.moveTo(330, 410); g.lineTo(230, 395); g.moveTo(330, 425); g.lineTo(230, 440); g.moveTo(530, 410); g.lineTo(630, 395); g.moveTo(530, 425); g.lineTo(630, 440); g.stroke(); g.fillStyle = '#B8261A'; g.font = '600 60px Literata'; g.fillText('?', 760, 200); }, false); pencil(8, 5, -0.5, 0x2F55A4); break;
    case 'president': deck(-9, -0.5, -0.2, 6); fan([cardFace('3', '♣'), cardFace('7', '♦'), cardFace('A', '♥'), cardFace('2', '♠')], -2, 1, -0.3, 0.22, 3.4, 0.4); card(cardFace('2', '♥'), 10, -1.5, 0.4, 0.4); break;
    case 'cercle': { pint(0, 0); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; card(back, Math.sin(a) * 12.5, Math.cos(a) * 9.5, -a + Math.PI / 2, 0.03); } break; }
    case 'perudo': diceCup(-5, 0, 0.5); [[2.5, -2, 0.3, 5], [5.2, 1.2, 1.1, 0], [8, -1, 0.7, 4], [4.2, 4.6, 0.2, 1], [8.8, 3.2, 1.4, 2]].forEach(([x, z, r, t]) => die(x, z, r, t)); break;
    case 'paranoia': card(back, -4.5, 0.6, -0.25); card(appCard('Paranoïa', 'Qui est le plus susceptible de…', 'Question secrète', '#5A3A82'), 3.5, 0, 0.12, 0.08); coin(10.5, -3); break;
    case 'actionverite': card(appCard('Action', 'Imite un pingouin jusqu’à ton prochain tour.', 'Action ou vérité', '#B8261A'), -6.5, 0.5, -0.15); card(appCard('Vérité', 'Ton pire râteau ?', 'Action ou vérité', '#1F4FA0'), 0.5, 0, 0.1, 0.08); bottle(10.5, -1, 0.9); break;
    case 'poker': card(cardFace('A', '♠'), -9.5, 2.5, -0.3, 0.03); card(cardFace('A', '♥'), -6.4, 2.9, 0.08, 0.08); [cardFace('7', '♦'), cardFace('A', '♣'), cardFace('9', '♠')].forEach((t, i) => card(t, -1.6 + i * 4.6, -3.4, (rnd() - 0.5) * 0.08, 0.03)); deck(13.4, -3.2, 0.2, 5); [[8.5, 5.6], [11.6, 4.6], [10.6, 8.2]].forEach(([x, z]) => shotGlass(x, z, 0xC88A1E)); break;
    case 'blackjack': card(back, -2.5, -4.5, 0.05, 0.03); card(figureCard('R', '♠'), 1.2, -4.2, 0.12, 0.08); card(cardFace('A', '♠'), -5.5, 4, -0.18, 0.03); card(figureCard('V', '♥'), -2.3, 4.6, 0.12, 0.08); deck(10.5, -4, 0.3, 6); shotGlass(5.4, 5.2, 0xC88A1E); shotGlass(8.6, 4.4, 0xC88A1E); break;
    case 'tupref': card(appCard('Tu préfères…', 'ne plus jamais boire de café', 'Option A', '#B8261A'), -4, 0.4, -0.12); card(appCard('…ou bien', 'ne plus jamais dormir plus de six heures', 'Option B', '#1F4FA0'), 4, 0, 0.12, 0.08); break;
  }
}

renderer.render(scene, cam);
// rendu progressif : un deuxième passage pour la transmission
renderer.render(scene, cam);
window.__done = renderer.domElement.toDataURL('image/png');
