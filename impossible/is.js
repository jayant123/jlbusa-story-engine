// JLB USA "The Impossible Store" scroll experience.
// A product in a dark studio, a boutique that assembles around it, four store types the same fixtures
// reshape into, an interactive product page, an iris in the floor that opens onto the systems behind
// every order, and a finale where the whole world folds into a luminous cube.
// Every scene state is derived from scroll progress (0..1), so scrolling back and jumping both work.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/RGBELoader.js/+esm';
import { MeshoptDecoder } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/meshopt_decoder.module.js/+esm';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutputPass.js/+esm';

const BASE = new URL('./', import.meta.url).href;
const OBS = 0x0b0c0e;
const cl = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function main() {
  const root = document.getElementById('jlb-is');
  if (!root || root.dataset.xInit) return;
  root.dataset.xInit = '1';
  const stage = root.querySelector('.x-stage');
  const story = root.querySelector('.x-story');
  const hud = root.querySelector('.x-hud');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMob = () => innerWidth < 820;
  const LOW = isMob() || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch (e) { root.classList.add('x-nogl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(OBS, 1);
  stage.insertBefore(renderer.domElement, hud);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(OBS);
  scene.fog = new THREE.Fog(OBS, 8, 30);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 120);

  let composer = null, bloom = null;
  if (!LOW) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.45, 0.45, 0.97);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- materials ----------
  const glow = (r, g, b, o = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
  function marbleTex() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#d6cfc2'; g.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 60; i++) {
      g.beginPath(); let x = Math.random() * 1024, y = Math.random() * 256; g.moveTo(x, y);
      for (let k = 0; k < 30; k++) { x += Math.random() * 46 - 12; y += Math.random() * 26 - 13; g.lineTo(x, y); }
      g.strokeStyle = `rgba(${110 + Math.random() * 40 | 0},${104 + Math.random() * 30 | 0},96,${0.04 + Math.random() * 0.2})`;
      g.lineWidth = 0.4 + Math.random() * 2.4; g.filter = `blur(${(Math.random() * 1.6).toFixed(1)}px)`; g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }
  function radialTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function gridTex() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); return t;
  }
  const M = {
    stone: new THREE.MeshPhysicalMaterial({ color: 0xd9d1c2, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
    marble: new THREE.MeshPhysicalMaterial({ map: marbleTex(), roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.6 }),
    floor: new THREE.MeshPhysicalMaterial({ color: 0xb9b1a3, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.22 }),
    metal: new THREE.MeshPhysicalMaterial({ color: 0xcdb68c, metalness: 1, roughness: 0.3 }),
    iris: new THREE.MeshPhysicalMaterial({ color: 0x2a2b2f, metalness: 0.75, roughness: 0.32, clearcoat: 0.6 }),
    module: new THREE.MeshPhysicalMaterial({ color: 0x1e2024, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    item: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.42, clearcoat: 0.45 }),
    fabric: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.85, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff) }),
    device: new THREE.MeshPhysicalMaterial({ color: 0x18191c, metalness: 0.6, roughness: 0.25, clearcoat: 1 }),
    netFloor: new THREE.MeshStandardMaterial({ color: 0x0f1114, roughness: 0.55, metalness: 0.2, emissive: new THREE.Color(0x2fb8c4), emissiveIntensity: 0.08, emissiveMap: gridTex() }),
  };
  const baseFloor = M.floor.color.clone(), darkFloor = new THREE.Color(0x24231f);

  // ---------- lights ----------
  const key = new THREE.SpotLight(0xfff0dc, 2.3, 0, 0.42, 0.65, 0);
  key.position.set(0.6, 7.2, 2.2);
  key.target.position.set(0, 0.6, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 1; key.shadow.camera.far = 16;
  scene.add(key, key.target);
  const room = new THREE.DirectionalLight(0xfff1e2, 0);
  room.position.set(-4, 8, 6);
  scene.add(room);
  const rim = new THREE.DirectionalLight(0xb9ccff, 1.3);
  rim.position.set(3, 4, -6);
  scene.add(rim);
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x0c0d10, 0.12);
  scene.add(hemi);

  // everything above ground lives in `world`, so the finale can fold it into the cube
  const world = new THREE.Group(); scene.add(world);

  // ---------- void glow + pedestal ----------
  const voidGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(255,226,190,.16)'], [0.4, 'rgba(255,214,170,.05)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  voidGlow.rotation.x = -Math.PI / 2; voidGlow.position.y = 0.004;
  world.add(voidGlow);

  const ped = new THREE.Group(); world.add(ped);
  const pedBody = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.5, 128, 1), M.marble);
  pedBody.position.y = 0.25; pedBody.castShadow = true; pedBody.receiveShadow = true;
  ped.add(pedBody);
  const rimMat = glow(1.6, 1.4, 1.15);
  const pedRim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.007, 8, 200), rimMat);
  pedRim.rotation.x = Math.PI / 2; pedRim.position.y = 0.5;
  ped.add(pedRim);
  const pedBand = new THREE.Mesh(new THREE.TorusGeometry(0.925, 0.012, 8, 160), M.metal);
  pedBand.rotation.x = Math.PI / 2; pedBand.position.y = 0.012;
  ped.add(pedBand);
  const heroes = new THREE.Group(); heroes.position.y = 0.5; ped.add(heroes);

  // ---------- luminous outline that becomes the floor ----------
  const outMat = glow(2.0, 1.85, 1.6, 0);
  const outline = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), outMat); world.add(m); return m; });
  function setOutline(hx, hz, t) {
    const th = 0.02, ht = 0.012, y = 0.012;
    const f = [0, 1, 2, 3].map((i) => cl(t * 4 - i));
    const L = [2 * hx * f[0], 2 * hz * f[1], 2 * hx * f[2], 2 * hz * f[3]];
    outline[0].position.set(-hx + L[0] / 2, y, hz); outline[0].scale.set(Math.max(L[0], 1e-4), ht, th);
    outline[1].position.set(hx, y, hz - L[1] / 2); outline[1].scale.set(th, ht, Math.max(L[1], 1e-4));
    outline[2].position.set(hx - L[2] / 2, y, -hz); outline[2].scale.set(Math.max(L[2], 1e-4), ht, th);
    outline[3].position.set(-hx, y, -hz + L[3] / 2); outline[3].scale.set(th, ht, Math.max(L[3], 1e-4));
    outline.forEach((m, i) => { m.visible = f[i] > 0; });
  }

  // ---------- collar + iris + floor tiles ----------
  const flat = (shape, depth) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 96 }); g.rotateX(-Math.PI / 2); g.translate(0, -depth, 0); return g; };
  const IR = 1.36;
  const collarShape = new THREE.Shape(); collarShape.moveTo(-1.5, -1.5); collarShape.lineTo(1.5, -1.5); collarShape.lineTo(1.5, 1.5); collarShape.lineTo(-1.5, 1.5); collarShape.lineTo(-1.5, -1.5);
  const hole = new THREE.Path(); hole.absarc(0, 0, IR, 0, Math.PI * 2, true); collarShape.holes.push(hole);
  const collar = new THREE.Mesh(flat(collarShape, 0.08), M.floor);
  collar.receiveShadow = true; collar.castShadow = true;
  world.add(collar);
  const irisRing = new THREE.Mesh(new THREE.TorusGeometry(IR, 0.008, 8, 200), glow(0.35, 1.9, 2.1, 0));
  irisRing.rotation.x = Math.PI / 2; irisRing.position.y = 0.002;
  world.add(irisRing);
  const NB = 10;
  const blades = [];
  for (let i = 0; i < NB; i++) {
    const a0 = (i / NB) * Math.PI * 2, a1 = ((i + 1) / NB) * Math.PI * 2;
    const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, IR - 0.004, a0, a1, false); s.lineTo(0, 0);
    const b = new THREE.Mesh(flat(s, 0.08), M.iris); b.receiveShadow = true; b.castShadow = true;
    const am = (a0 + a1) / 2;
    // extruded shapes map shape y to -z
    b.userData.dir = new THREE.Vector3(Math.cos(am), 0, -Math.sin(am));
    world.add(b); blades.push(b);
  }
  const tiles = [];
  for (let ix = 0; ix < 20; ix++) for (let iz = 0; iz < 14; iz++) {
    const x = -4.75 + ix * 0.5, z = -3.25 + iz * 0.5;
    if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) continue;
    const dn = Math.max(Math.abs(x) / 5, Math.abs(z) / 3.5);
    tiles.push({ x, z, t0: 0.132 + 0.06 * cl((dn - 0.3) / 0.7) + Math.random() * 0.006, sx: Math.random() < 0.5 ? -1 : 1 });
  }
  const tileMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.488, 0.08, 0.488), M.floor, tiles.length);
  tileMesh.receiveShadow = true; tileMesh.castShadow = true;
  world.add(tileMesh);

  // ---------- stone display wall + glass walls ----------
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.3), M.stone);
  wall.castShadow = true; wall.receiveShadow = true;
  world.add(wall);
  const PANELS = [[-3.55, -3.6, 0, 2.9], [3.55, -3.6, 0, 2.9], [-5, -1.8, Math.PI / 2, 3.6], [-5, 1.8, Math.PI / 2, 3.6], [5, -1.8, -Math.PI / 2, 3.6], [5, 1.8, -Math.PI / 2, 3.6]];
  const PH = 3.2;
  const panels = PANELS.map(([x, z, ry, w], i) => {
    const g = new THREE.Group(); g.rotation.order = 'YXZ';
    const gm = new THREE.MeshPhysicalMaterial({ color: 0xeaf3f6, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.07, envMapIntensity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, PH), gm); glass.position.y = PH / 2; g.add(glass);
    const bar = (bw, bh, bd, px, py) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), M.metal); m.position.set(px, py, 0); m.castShadow = true; g.add(m); };
    bar(w, 0.035, 0.05, 0, PH); bar(w, 0.05, 0.06, 0, 0.025); bar(0.03, PH, 0.05, -w / 2, PH / 2); bar(0.03, PH, 0.05, w / 2, PH / 2);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.008, 0.014), glow(2.1, 1.9, 1.6, 1)); strip.position.y = 0.06; g.add(strip);
    world.add(g);
    return { g, gm, strip, x, z, ry, i };
  });

  // ---------- shelves on the stone wall ----------
  const SHELF_Z = -3.5;
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.metal, 15); boards.castShadow = true; boards.receiveShadow = true;
  const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow(1, 1, 1, 1), 15);
  strips.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(45), 3);
  const cylItems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 24), M.item, 60);
  const boxItems = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.12), M.item, 60);
  [cylItems, boxItems].forEach((m) => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(180), 3); m.castShadow = true; m.receiveShadow = true; });
  world.add(boards, strips, cylItems, boxItems);
  const itemJit = Array.from({ length: 60 }, () => Math.random() * 2 - 1);

  // ---------- islands + what stands on them ----------
  const islands = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.stone); m.castShadow = true; m.receiveShadow = true; world.add(m); return m; });
  // home: stone bowls on islands 2..5 (0 and 1 get the vase and clock models)
  const bowls = [2, 3, 4, 5].map((i) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.metal); b.scale.y = 0.6; b.rotation.x = Math.PI; b.position.y = 0.12; b.castShadow = true;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16), M.marble); s.position.set(0.24, 0.1, 0.05); s.castShadow = true;
    g.add(b, s); world.add(g); return { g, i };
  });
  // fashion: rails with garments, mannequins on islands 4 and 5
  const RAILS = [-3.3, 3.3];
  const rails = RAILS.map((x) => {
    const g = new THREE.Group(); g.position.set(x, 0, -0.1);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 4.2, 12), M.metal); rod.rotation.x = Math.PI / 2; rod.position.y = 1.55;
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.55, 12), M.metal); p1.position.set(0, 0.775, -2.1);
    const p2 = p1.clone(); p2.position.z = 2.1;
    [rod, p1, p2].forEach((m) => { m.castShadow = true; g.add(m); });
    world.add(g); return g;
  });
  const FABRIC = [0x2e3138, 0xb7a487, 0x6c7264, 0x8a3e30, 0xd9d1c3, 0x3d4a5c];
  const garments = new THREE.InstancedMesh(new RoundedBoxGeometry(0.5, 0.9, 0.06, 2, 0.025), M.fabric, 18);
  garments.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(54), 3);
  for (let i = 0; i < 18; i++) garments.setColorAt(i, new THREE.Color(FABRIC[(i * 5 + (i > 8 ? 2 : 0)) % FABRIC.length]));
  garments.castShadow = true; world.add(garments);
  function mannequin(scale) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 8, 24), M.stone); torso.scale.set(1, 1, 0.72); torso.position.y = 1.05;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 16), M.metal); neck.position.y = 1.41;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), M.stone); head.scale.set(0.85, 1.1, 0.9); head.position.y = 1.55;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 12), M.metal); rod.position.y = 0.42;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 32), M.metal); base.position.y = 0.015;
    [torso, neck, head, rod, base].forEach((m) => { m.castShadow = true; g.add(m); });
    g.scale.setScalar(scale); return g;
  }
  const manq = [4, 5].map((i) => { const g = mannequin(0.95); world.add(g); return { g, i }; });
  // beauty: bottles along the curved counter
  const bottles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.04, 0.2, 20), M.item, 18);
  bottles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(54), 3);
  const BOT = [0xe8c9c0, 0xf2e8da, 0xc9a77c, 0x7e5d58];
  for (let i = 0; i < 18; i++) bottles.setColorAt(i, new THREE.Color(BOT[i % 4]));
  bottles.castShadow = true; world.add(bottles);
  // electronics: a device with a lit screen on each plinth
  const devices = Array.from({ length: 6 }, () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.022), M.device); body.castShadow = true;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.25), glow(0.55, 0.75, 0.95, 0.9)); scr.position.z = 0.0115;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), M.metal); stand.position.set(0, -0.15, -0.03);
    const tilt = new THREE.Group(); tilt.add(body, scr); tilt.rotation.x = -0.22; tilt.position.y = 0.22;
    stand.position.y = 0.06;
    g.add(tilt, stand); world.add(g); return g;
  });

  // ---------- ceiling planes ----------
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, emissive: new THREE.Color(1, 0.92, 0.8), emissiveIntensity: 0 });
  const ceil = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), ceilMat); world.add(m); return m; });

  // ---------- heroes on the pedestal ----------
  // perfume sculpture for beauty
  const perfume = new THREE.Group();
  {
    const glass = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.62, 0.24, 4, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xf6ece0, roughness: 0.04, transmission: 1, thickness: 0.35, ior: 1.5, envMapIntensity: 1.4 }));
    glass.position.y = 0.31; glass.castShadow = true;
    const liquid = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.16, 3, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xd9893b, roughness: 0.2, transmission: 0.6, thickness: 0.2 }));
    liquid.position.y = 0.24;
    const collarM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 32), M.metal); collarM.position.y = 0.645;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 48), M.metal); cap.position.y = 0.77; cap.castShadow = true;
    perfume.add(glass, liquid, collarM, cap);
  }
  const bigManq = mannequin(1.0);
  const HERO = [null, bigManq, perfume, null]; // 0 chair and 3 boombox load as models
  HERO.forEach((h) => h && heroes.add(h));

  // ---------- models ----------
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const models = {};
  const loadingBar = root.querySelector('.x-loading i');
  const MODELS = [['chair', 'mid_century_lounge_chair', 1.25], ['lamp', 'desk_lamp_arm_01', 1.9], ['boom', 'boombox', 1.05], ['vase', 'ceramic_vase_02', 0.55], ['clock', 'alarm_clock_01', 0.36]];
  function loadModel([id, file, size]) {
    return new Promise((res) => loader.load(BASE + 'models/' + file + '.glb', (g) => {
      const m = g.scene; m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const k = size / Math.max(sz.x, sz.y, sz.z);
      m.scale.setScalar(k); m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      const r = new THREE.Group(); r.add(m);
      m.traverse((o) => {
        if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
        if (/glass/i.test(o.material.name)) { o.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.16, envMapIntensity: 2 }); o.castShadow = false; }
        if (/light/i.test(o.material.name)) { o.material.emissive = new THREE.Color(0xffd7a8); o.material.emissiveIntensity = 0; r.userData.bulb = o; }
      });
      r.userData.h = sz.y * k;
      models[id] = r;
      loadingBar && (loadingBar.style.width = (Object.keys(models).length / MODELS.length * 100) + '%');
      res(r);
    }, undefined, () => res(null)));
  }

  // lamp finish recolor (orange parts take the chosen finish, with a glowing seam sweeping up)
  const RECOLOR = `
  uniform vec4 uTintA,uTintB;uniform float uWipe;
  vec3 xrgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
  vec3 xhsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}
  vec3 xRecolor(vec3 c,vec3 rp){
    vec3 hsv=xrgb2hsv(c);
    float hd=min(abs(hsv.x-.035),1.-abs(hsv.x-.035));
    float m=smoothstep(.28,.5,hsv.y)*(1.-smoothstep(.05,.11,hd));
    float hn=clamp((rp.y-uMinY)/(uMaxY-uMinY),0.,1.);
    vec4 t=hn<uWipe?uTintB:uTintA;
    if(t.w<.01) return c;
    vec3 o=xhsv2rgb(vec3(t.x,clamp(hsv.y*t.y,0.,1.),hsv.z*t.z));
    return mix(c,o,m*t.w);
  }`;
  const LU = { uRootInv: { value: new THREE.Matrix4() }, uMinY: { value: 0 }, uMaxY: { value: 1.55 }, uTintA: { value: new THREE.Vector4(0, 1, 1, 0) }, uTintB: { value: new THREE.Vector4(0, 1, 1, 0) }, uWipe: { value: 0 } };
  function patchLamp(r) {
    LU.uMaxY.value = r.userData.h;
    r.traverse((o) => {
      if (!o.isMesh) return;
      const mat = o.material;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, LU);
        sh.vertexShader = 'uniform mat4 uRootInv;\nvarying vec3 vRP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvRP=(uRootInv*modelMatrix*vec4(transformed,1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vRP;\nuniform float uMinY,uMaxY;\n' + RECOLOR + '\n' + sh.fragmentShader
          .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb=xRecolor(diffuseColor.rgb,vRP);')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{float xh=clamp((vRP.y-uMinY)/(uMaxY-uMinY),0.,1.);totalEmissiveRadiance+=vec3(1.,.75,.55)*(1.-smoothstep(0.,.015,abs(xh-uWipe)))*step(.001,uWipe)*step(uWipe,.999)*3.;}');
      };
      mat.customProgramCacheKey = () => 'is-recolor';
      mat.needsUpdate = true;
    });
  }

  // ---------- product card (the lamp becomes a shopping card) ----------
  const card3 = new THREE.Group(); scene.add(card3);
  {
    const W3 = 1.0, H3 = 1.32;
    const pane = new THREE.Mesh(new RoundedBoxGeometry(W3, H3, 0.04, 4, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x1b1c20, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1 }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W3, H3, 0.04)), new THREE.LineBasicMaterial({ color: new THREE.Color(1.8, 1.65, 1.4), transparent: true, opacity: 0.8 }));
    const price = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.09), glow(2.4, 1.35, 0.4, 0.95)); price.position.set(0, -H3 / 2 + 0.13, 0.025);
    const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.025), glow(1.2, 1.15, 1.05, 0.7)); line1.position.set(-0.1, -H3 / 2 + 0.3, 0.025);
    card3.add(pane, edge, price, line1);
  }
  card3.visible = false;
  const lampHolder = new THREE.Group(); scene.add(lampHolder);

  // ---------- the systems under the floor ----------
  const NET_Y = -2.9;
  const net = new THREE.Group(); scene.add(net);
  const netFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), M.netFloor);
  netFloor.rotation.x = -Math.PI / 2; netFloor.position.y = NET_Y; netFloor.receiveShadow = true;
  net.add(netFloor);
  const MODS = [[-1.25, 1.0], [-2.3, -0.35], [-1.1, -1.6], [1.1, -1.6], [2.3, -0.35], [1.25, 1.0]];
  const modGeo = new RoundedBoxGeometry(0.78, 0.3, 0.78, 4, 0.06);
  const mods = MODS.map(([x, z], i) => {
    const m = new THREE.Mesh(modGeo, M.module); m.position.set(x, NET_Y + 0.15, z); m.castShadow = true; m.receiveShadow = true;
    const ringM = glow(0.3, 1.7, 1.9, 0.35);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 64), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(x, NET_Y + 0.305, z);
    const coreM = glow(0.3, 1.7, 1.9, 0);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), coreM); core.rotation.x = -Math.PI / 2; core.position.set(x, NET_Y + 0.303, z);
    net.add(m, ring, core);
    return { m, ringM, coreM, x, z, u: 0, label: root.querySelector('.x-node[data-node="' + i + '"]') };
  });
  const PY = NET_Y + 0.4;
  const pathPts = [new THREE.Vector3(0, PY, 0), ...MODS.map(([x, z]) => new THREE.Vector3(x, PY, z))];
  const path = new THREE.CatmullRomCurve3(pathPts, false, 'centripetal');
  // where each module sits along the path
  { const N = 600; mods.forEach((md) => { let best = 1e9; for (let k = 0; k <= N; k++) { const q = path.getPointAt(k / N); const d = (q.x - md.x) ** 2 + (q.z - md.z) ** 2; if (d < best) { best = d; md.u = k / N; } } }); }
  const TUBE_VS = `varying float vT; void main(){ vT=uv.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
  const TUBE_FS = `varying float vT; uniform float uDraw,uTime; uniform vec3 uColor;
    void main(){ if(vT>uDraw) discard;
      float f=fract(vT*3.-uTime*.35);
      float pulse=smoothstep(0.,.04,f)*(1.-smoothstep(.04,.12,f));
      gl_FragColor=vec4(uColor*(.55+pulse*2.2),1.); }`;
  const uTime = { value: 0 };
  const tubeMat = new THREE.ShaderMaterial({ uniforms: { uDraw: { value: 0 }, uTime, uColor: { value: new THREE.Color(0.3, 1.5, 1.7) } }, vertexShader: TUBE_VS, fragmentShader: TUBE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  net.add(new THREE.Mesh(new THREE.TubeGeometry(path, 500, 0.011, 8, false), tubeMat));
  const dropMat = new THREE.ShaderMaterial({ uniforms: { uDraw: { value: 0 }, uTime, uColor: { value: new THREE.Color(0.3, 1.5, 1.7) } }, vertexShader: TUBE_VS, fragmentShader: TUBE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const drop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0, PY, 0)), 40, 0.008, 6, false), dropMat);
  net.add(drop);
  const netLight = new THREE.PointLight(0x7fe9f2, 0, 7, 0); netLight.position.set(0, NET_Y + 1.4, 0.4); net.add(netLight);
  // the amber order packet and its trail
  const packet = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.11, 0.11, 2, 0.025), glow(2.8, 1.5, 0.42, 1));
  packet.material.blending = THREE.NormalBlending;
  const packetLight = new THREE.PointLight(0xffa548, 0, 2.6, 0);
  scene.add(packet, packetLight);
  const trail = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.032 * (1 - i / 9), 12, 8), glow(2.6, 1.4, 0.4, 0.5 * (1 - i / 7))); scene.add(m); return m; });

  // ---------- the finale cube ----------
  const CS = 1.5;
  const cube = new THREE.Group(); scene.add(cube);
  const faceMat = new THREE.MeshPhysicalMaterial({ color: 0xf1ebe0, roughness: 0.2, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color(1, 0.94, 0.84), emissiveIntensity: 0 });
  const edgeMat = glow(2.2, 2.0, 1.7, 0);
  function cubeFace() {
    const g = new THREE.Group(); g.rotation.order = 'YXZ';
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(CS, CS), faceMat); pl.position.y = CS / 2; g.add(pl);
    const e = 0.014;
    [[CS, e, 0, CS], [CS, e, 0, 0], [e, CS, -CS / 2, CS / 2], [e, CS, CS / 2, CS / 2]].forEach(([w, h, x, y]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, e), edgeMat); m.position.set(x, y, 0); g.add(m); });
    cube.add(g); return g;
  }
  const faces = [[0, CS / 2, 0], [0, -CS / 2, Math.PI], [-CS / 2, 0, -Math.PI / 2], [CS / 2, 0, Math.PI / 2]].map(([x, z, ry]) => { const f = cubeFace(); f.position.set(x, 0, z); f.rotation.y = ry; return f; });
  const top = new THREE.Group(); {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(CS, CS), faceMat); pl.rotation.x = -Math.PI / 2; top.add(pl);
    top.position.y = CS; cube.add(top);
  }
  const platform = new THREE.Group(); {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 96), M.marble); d.position.y = 0.03; d.receiveShadow = true; d.castShadow = true;
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.006, 8, 160), glow(2.2, 1.95, 1.6, 1)); r.rotation.x = Math.PI / 2; r.position.y = 0.06;
    platform.add(d, r); cube.add(platform);
  }
  cube.visible = false;

  // ---------- store types ----------
  // Every fixture has a target state per store type; the scene blends between them.
  const CAT_NAMES = ['Home and living', 'Fashion', 'Beauty', 'Electronics'];
  const L = {}; let NS = 0; const slot = (n, k) => { L[n] = NS; NS += k; };
  slot('isl', 36); slot('shelf', 9); slot('glow', 1); slot('item', 20); slot('ceil', 30); slot('ceilE', 4); slot('w', 4);
  const S = [0, 1, 2, 3].map(() => new Float32Array(NS));
  const put = (k, name, arr) => S[k].set(arr, L[name]);
  const rgb = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  // islands: x, z, w, h, d, ry
  put(0, 'isl', [-3.3, 0.6, 1.5, 0.32, 1.0, 0.2, 3.3, 0.6, 1.5, 0.32, 1.0, -0.2, -3.4, -2.1, 1.2, 0.5, 0.8, 0, 3.4, -2.1, 1.2, 0.5, 0.8, 0, -1.9, 2.3, 0.7, 0.42, 0.7, 0.5, 1.9, 2.3, 0.7, 0.42, 0.7, -0.5]);
  put(1, 'isl', [-3.3, 1.0, 0.5, 0.12, 2.0, 0, 3.3, 1.0, 0.5, 0.12, 2.0, 0, -3.3, -1.2, 0.5, 0.12, 2.0, 0, 3.3, -1.2, 0.5, 0.12, 2.0, 0, -1.8, -1.6, 0.6, 0.25, 0.6, 0.3, 1.8, -1.6, 0.6, 0.25, 0.6, -0.3]);
  {
    const arc = [5, 0, 4, 1, 3, 2], R = 3.0, a = [];
    for (let i = 0; i < 6; i++) { const ang = Math.PI * (0.18 + 0.64 * arc[i] / 5); a.push(R * Math.cos(ang), -0.2 - R * 0.85 * Math.sin(ang), 1.2, 0.95, 0.55, ang - Math.PI / 2); }
    put(2, 'isl', a);
  }
  put(3, 'isl', [-4.0, -1.0, 0.5, 1.05, 0.5, 0, 4.0, -1.0, 0.5, 1.05, 0.5, 0, -2.8, -1.0, 0.5, 1.05, 0.5, 0, 2.8, -1.0, 0.5, 1.05, 0.5, 0, -1.6, -1.0, 0.5, 1.05, 0.5, 0, 1.6, -1.0, 0.5, 1.05, 0.5, 0]);
  // shelves: y0, spacing, width, depth, rows x5 ; glow
  put(0, 'shelf', [0.75, 0.62, 1.22, 0.32, 1, 1, 1, 1, 0]); put(0, 'glow', [0.25]);
  put(1, 'shelf', [0.6, 0.66, 1.26, 0.4, 1, 1, 1, 1, 0]); put(1, 'glow', [0.15]);
  put(2, 'shelf', [0.55, 0.5, 1.26, 0.22, 1, 1, 1, 1, 1]); put(2, 'glow', [1]);
  put(3, 'shelf', [1.3, 0.7, 1.26, 0.2, 1, 1, 0, 0, 0]); put(3, 'glow', [0.6]);
  // shelf items: w, h, d, boxness, 4 colors, 4 slot visibilities
  put(0, 'item', [0.18, 0.3, 0.18, 0, ...rgb(0xd9cfbf), ...rgb(0x9a6b4f), ...rgb(0x8a9a84), ...rgb(0x2f2f30), 1, 1, 1, 0]);
  put(1, 'item', [0.34, 0.15, 0.27, 1, ...rgb(0x3b3f46), ...rgb(0xb9a68a), ...rgb(0x6d7465), ...rgb(0x8c3b2f), 1, 1, 1, 0]);
  put(2, 'item', [0.08, 0.2, 0.08, 0, ...rgb(0xe8c9c0), ...rgb(0xf1e6d8), ...rgb(0xc9a77c), ...rgb(0x7e5d58), 1, 1, 1, 1]);
  put(3, 'item', [0.34, 0.22, 0.03, 1, ...rgb(0x1a1b1e), ...rgb(0x2a2c30), ...rgb(0xc9ccd1), ...rgb(0x1a1b1e), 1, 1, 0, 0]);
  // ceiling planes: x, z, w, d, ry ; emissive intensity + rgb
  put(0, 'ceil', [-3, 0.6, 1.4, 1.4, 0, 3, 0.6, 1.4, 1.4, 0, -3, -2.1, 1.1, 1.1, 0, 3, -2.1, 1.1, 1.1, 0, 0, 0, 1.7, 1.7, 0.785, 0, -2.6, 2.2, 0.5, 0]);
  put(1, 'ceil', [-3.3, -0.1, 0.32, 4.4, 0, 3.3, -0.1, 0.32, 4.4, 0, -1.8, -1.6, 0.6, 0.6, 0, 1.8, -1.6, 0.6, 0.6, 0, 0, 0, 1.2, 1.2, 0, 0, -2.7, 4.0, 0.25, 0]);
  {
    const a = []; const arc = [5, 0, 4, 1, 3, 2];
    for (let i = 0; i < 6; i++) { const ang = Math.PI * (0.18 + 0.64 * arc[i] / 5); a.push(2.6 * Math.cos(ang), -0.2 - 2.6 * 0.85 * Math.sin(ang), 0.9, 0.35, ang - Math.PI / 2); }
    put(2, 'ceil', a);
  }
  put(3, 'ceil', [0, -2.5, 7, 0.07, 0, 0, -1.5, 7, 0.07, 0, 0, -0.5, 7, 0.07, 0, 0, 0.5, 7, 0.07, 0, 0, 1.5, 7, 0.07, 0, 0, 2.5, 7, 0.07, 0]);
  put(0, 'ceilE', [1.3, 1, 0.9, 0.76]); put(1, 'ceilE', [1.7, 1, 0.95, 0.88]); put(2, 'ceilE', [1.5, 1, 0.9, 0.86]); put(3, 'ceilE', [2.4, 0.84, 0.94, 1]);
  for (let k = 0; k < 4; k++) S[k][L.w + k] = 1;
  const T = new Float32Array(NS), D = new Float32Array(NS);
  D.set(S[0]);
  const wt = [1, 0, 0, 0];
  function scrollWeights(p) {
    if (p >= 0.84) return [1, 0, 0, 0];
    const a = ss(0.335, 0.36, p), b = ss(0.385, 0.41, p), c = ss(0.435, 0.46, p);
    return [1 - a, a * (1 - b), b * (1 - c), c];
  }
  let picked = -1;
  const catBtns = [...root.querySelectorAll('.x-cats button')];
  catBtns.forEach((b) => b.addEventListener('click', () => { picked = +b.dataset.cat; }));
  const cats = root.querySelector('.x-cats');

  // ---------- lamp finishes + cart ----------
  const FINISH = [new THREE.Vector4(0, 1, 1, 0), new THREE.Vector4(0.6, 0.08, 0.075, 1), new THREE.Vector4(0.44, 0.62, 0.95, 1)];
  const FINISH_NAME = ['Signal orange', 'Graphite', 'Mint'];
  let finish = 0, wipeT = -1, userFinish = false;
  const finishBtns = root.querySelectorAll('.x-finishes button');
  const stepItem = root.querySelector('.x-step__item');
  function setFinish(i, byUser) {
    if (byUser) userFinish = true;
    if (i === finish) return;
    finish = i;
    finishBtns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.finish === i)));
    if (stepItem) stepItem.textContent = 'Arc desk lamp, ' + FINISH_NAME[i];
    LU.uTintB.value.copy(FINISH[i]);
    if (reduce) { LU.uTintA.value.copy(FINISH[i]); return; }
    wipeT = performance.now();
  }
  finishBtns.forEach((b) => b.addEventListener('click', () => setFinish(+b.dataset.finish, true)));
  const addBtn = root.querySelector('.x-add');
  const bag = root.querySelector('.x-bag');
  let addT = -1;
  addBtn.addEventListener('click', () => { if (addT < 0) addT = performance.now(); addBtn.classList.add('is-added'); addBtn.textContent = 'Added to cart'; });

  // ---------- camera ----------
  // [progress, position, target, fov]
  const CAM = [
    [0.000, [0, 1.15, 5.3], [0, 0.9, 0], 30],
    [0.100, [0, 1.25, 6.0], [0, 0.9, 0], 30],
    [0.130, [0, 1.6, 7.2], [0, 0.8, 0], 32],
    [0.300, [0.6, 5.2, 13.0], [0, 0.8, -0.6], 36],
    [0.335, [4.4, 3.6, 11.0], [0, 1.0, -0.8], 36],
    [0.405, [0, 3.4, 11.6], [0, 1.0, -0.8], 36],
    [0.475, [-4.4, 3.6, 11.0], [0, 1.0, -0.8], 36],
    [0.530, [0.6, 2.0, 6.4], [0, 1.3, 0], 30],
    [0.620, [-0.3, 2.1, 6.0], [0, 1.35, 0], 30],
    [0.665, [0, 3.4, 5.0], [0, 0.2, 0], 34],
    [0.715, [0, 3.0, 0.5], [0, -1.5, -0.2], 40],
    [0.745, [0, -0.7, 0.35], [0, -2.7, -0.6], 46],
    [0.775, [0.7, -0.75, 5.6], [0.3, -2.75, -0.3], 38],
    [0.820, [-0.1, -0.8, 5.3], [0.3, -2.75, -0.3], 38],
    [0.835, [0, -0.6, 0.35], [0, 0.5, 0], 46],
    [0.860, [0, 2.4, 1.0], [0, 1.2, 0], 40],
    [0.885, [0, 3.0, 14.0], [0, 1.0, 0], 34],
    [0.950, [0, 3.4, 9.6], [0, 0.7, 0], 30],
    [1.000, [0, 3.1, 8.6], [0, 0.55, 0], 30],
  ];
  const OFF = [[0, -0.14], [0.12, -0.1], [0.49, -0.1], [0.53, -0.04], [0.63, -0.04], [0.68, -0.1], [0.75, -0.17], [0.83, -0.17], [0.885, -0.1], [0.95, -0.17], [1, -0.17]];
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  let camFov = 30;
  function camAt(p) {
    let i = 0; while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
    const [p0, a0, t0, f0] = CAM[i], [p1, a1, t1, f1] = CAM[i + 1];
    const f = ss(p0, p1, p);
    camPos.copy(vA.fromArray(a0)).lerp(vB.fromArray(a1), f);
    camTgt.copy(vA.fromArray(t0)).lerp(vB.fromArray(t1), f);
    camFov = lerp(f0, f1, f);
    if (isMob()) { const cOn = ss(0.5, 0.52, p) * (1 - ss(0.6, 0.63, p)); camPos.sub(camTgt).multiplyScalar(1.3 + 0.55 * cOn).add(camTgt); camFov += 8; }
  }
  function offAt(p) {
    let i = 0; while (i < OFF.length - 2 && p > OFF[i + 1][0]) i++;
    return lerp(OFF[i][1], OFF[i + 1][1], ss(OFF[i][0], OFF[i + 1][0], p));
  }

  // ---------- chapters + HUD ----------
  const chapters = [...root.querySelectorAll('.x-ch')].map((el) => ({ el, s: parseFloat(el.style.getPropertyValue('--s')), e: parseFloat(el.style.getPropertyValue('--e')) }));
  const railBtns = [...root.querySelectorAll('.x-rail button')];
  const card = root.querySelector('.x-card'), checkout = root.querySelector('.x-checkout');
  const steps = [...root.querySelectorAll('.x-step')];
  const fade = (el, on) => { el.style.opacity = on; el.style.visibility = on > 0.01 ? 'visible' : 'hidden'; };
  function progress() {
    const r = story.getBoundingClientRect();
    return cl(-r.top / (r.height - innerHeight));
  }
  railBtns.forEach((b) => b.addEventListener('click', () => {
    const r = story.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + parseFloat(b.dataset.go) * (r.height - innerHeight) + 2, behavior: 'auto' });
  }));

  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  let W = 1, H = 1;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    if (composer) composer.setSize(W, H);
    camera.aspect = W / H;
  }
  addEventListener('resize', resize);
  resize();

  // ---------- load ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  let ready = false;
  const goReady = () => { if (ready) return; ready = true; root.classList.add('x-ready'); };
  new RGBELoader().load(BASE + 'env/studio_small_09_1k.hdr', (t) => { t.mapping = THREE.EquirectangularReflectionMapping; scene.environment = pmrem.fromEquirectangular(t).texture; t.dispose(); });
  loadModel(MODELS[0]).then((chair) => {
    if (chair) { HERO[0] = chair; heroes.add(chair); }
    goReady();
    MODELS.slice(1).reduce((ch, d) => ch.then(() => loadModel(d)).then((r) => {
      if (!r) return;
      if (d[0] === 'lamp') { patchLamp(r); lampHolder.add(r); }
      if (d[0] === 'boom') { HERO[3] = r; heroes.add(r); }
      if (d[0] === 'vase' || d[0] === 'clock') world.add(r);
    }), Promise.resolve());
  });
  setTimeout(goReady, 5000);

  // ---------- loop ----------
  let pS = progress(), visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { rootMargin: '100px' }).observe(story);
  const clock = new THREE.Clock();
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color(), col2 = new THREE.Color();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), proj = new THREE.Vector3();
  const setI = (mesh, i, x, y, z, sx, sy, sz, ry = 0, rx = 0) => {
    e3.set(rx, ry, 0, 'YXZ'); q.setFromEuler(e3); pos.set(x, y, z);
    scl.set(Math.max(sx, 1e-5), Math.max(sy, 1e-5), Math.max(sz, 1e-5));
    mesh.setMatrixAt(i, mtx.compose(pos, q, scl));
  };
  let lastRail = -1;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = reduce ? 0 : clock.elapsedTime;
    uTime.value = time;
    const pT = progress();
    // jumps (chapter rail, links, keyboard) land directly on the new scene
    if (reduce || Math.abs(pT - pS) > 0.06) pS = pT; else pS += (pT - pS) * Math.min(1, dt * 7);
    const p = pS;
    if (p < 0.3) picked = -1;

    // ---- store type blend ----
    const sw = scrollWeights(p);
    const usePick = picked >= 0 && p >= 0.3 && p < 0.84;
    for (let k = 0; k < 4; k++) wt[k] = usePick ? (k === picked ? 1 : 0) : sw[k];
    T.fill(0);
    for (let k = 0; k < 4; k++) if (wt[k] > 0) for (let j = 0; j < NS; j++) T[j] += S[k][j] * wt[k];
    const kD = reduce ? 1 : 1 - Math.exp(-dt * (usePick ? 3.2 : 12));
    for (let j = 0; j < NS; j++) D[j] += (T[j] - D[j]) * kD;
    const wH = D[L.w], wF = D[L.w + 1], wB = D[L.w + 2], wE = D[L.w + 3];
    const dom = [wH, wF, wB, wE].indexOf(Math.max(wH, wF, wB, wE));
    const catsOn = p > 0.31 && p < 0.475;
    cats.classList.toggle('is-on', catsOn);
    catBtns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cat === dom)));

    // ---- chapter phases ----
    const build = ss(0.13, 0.27, p);                               // store construction
    const F = ss(0.48, 0.52, p) * (1 - ss(0.84, 0.875, p));          // store folds away around the product
    const sink = ss(0.645, 0.675, p) * (1 - ss(0.86, 0.885, p));     // pedestal lowers into the floor
    const irisO = ss(0.675, 0.705, p) * (1 - ss(0.855, 0.872, p));   // floor iris
    const f6 = ss(0.89, 0.93, p);                                    // world folds into the cube
    const o6 = ss(0.932, 0.968, p);                                  // cube opens

    // ---- camera ----
    camAt(p);
    ptr.sx += (ptr.x - ptr.sx) * dt * 2.5; ptr.sy += (ptr.y - ptr.sy) * dt * 2.5;
    const par = reduce ? 0 : 1;
    camera.position.copy(camPos).add(vA.set(ptr.sx * 0.22 * par, -ptr.sy * 0.1 * par, 0));
    camera.lookAt(camTgt);
    camera.fov = camFov;
    const cardOn = ss(0.5, 0.52, p) * (1 - ss(0.585, 0.6, p));
    if (isMob()) camera.setViewOffset(W, H, 0, -H * 0.17 + H * 0.25 * ss(0.5, 0.52, p) * (1 - ss(0.6, 0.63, p)), W, H);
    else camera.setViewOffset(W, H, W * offAt(p), 0, W, H);
    camera.updateProjectionMatrix();
    const cd = camPos.distanceTo(camTgt);
    scene.fog.near = cd * 0.9 + 2; scene.fog.far = cd * 0.9 + 24;

    // ---- moment 1: pedestal, outline trace ----
    const trace = ss(0.025, 0.09, p);
    const expand = ss(0.12, 0.165, p);
    setOutline(lerp(1.5, 5, expand), lerp(1.5, 3.5, expand), trace);
    outMat.opacity = (trace > 0 ? 1 : 0) * (1 - ss(0.2, 0.25, p));
    const collarIn = ss(0.085, 0.118, p);
    collar.visible = collarIn > 0; collar.position.y = -(1 - collarIn) * 0.4;
    voidGlow.material.opacity = 1 - build * 0.6;

    // ---- floor tiles ----
    tiles.forEach((t, i) => {
      const f = ss(t.t0, t.t0 + 0.028, p);
      if (f <= 0) { setI(tileMesh, i, t.x, -10, t.z, 0, 0, 0); return; }
      setI(tileMesh, i, t.x, -0.04 - (1 - f) * 0.6, t.z, 0.2 + 0.8 * f, 1, 0.2 + 0.8 * f, 0, (1 - f) * 1.3 * t.sx);
    });
    tileMesh.instanceMatrix.needsUpdate = true;
    M.floor.color.copy(baseFloor).lerp(darkFloor, F * 0.8);

    // ---- iris ----
    blades.forEach((b) => {
      b.visible = collarIn > 0;
      const sinkB = ss(0, 0.3, irisO) * 0.12, slide = ss(0.25, 1, irisO) * 1.6;
      b.position.copy(b.userData.dir).multiplyScalar(slide); b.position.y = -sinkB - (1 - collarIn) * 0.4;
      b.rotation.y = irisO * 0.5;
    });
    irisRing.material.opacity = ss(0.66, 0.69, p) * (1 - ss(0.86, 0.88, p));

    // ---- pedestal + heroes ----
    ped.position.y = -0.62 * sink;
    ped.visible = sink < 0.98;
    rimMat.opacity = 0.9 + 0.6 * (1 - Math.max(wH, wF, wB, wE));
    const lampIn = ss(0.49, 0.525, p) * (1 - ss(0.84, 0.86, p));
    const heroW = [wH, wF, wB, wE].map((w) => w * (1 - ss(0.48, 0.505, p)));
    HERO.forEach((h, k) => {
      if (!h) return;
      const w = heroW[k];
      h.visible = w > 0.01;
      const s = ss(0.15, 1, w);
      h.scale.setScalar(Math.max(s, 1e-4));
      const hover = k === 0 ? 0.1 + Math.sin(time * 0.9) * 0.012 : 0.02;
      h.position.y = hover + (1 - w) * 0.35;
      h.rotation.y = (k === 0 ? -0.55 : k === 3 ? -0.4 : 0) + (1 - w) * 1.4 + Math.sin(time * 0.25) * 0.06 + ptr.sx * 0.12;
    });

    // ---- stone wall + glass ----
    const wallIn = ss(0.165, 0.215, p) * (1 - F);
    wall.visible = wallIn > 0.001;
    wall.scale.set(1, Math.max(wallIn, 1e-4), 1); wall.position.set(0, 1.6 * wallIn, -3.65);
    panels.forEach((P) => {
      const f = ss(0.18 + P.i * 0.009, 0.235 + P.i * 0.009, p);
      P.g.visible = f > 0.001 && F < 0.97;
      P.g.position.set(P.x, (1 - f) * (1 - f) * 5, P.z);
      P.g.rotation.y = P.ry + (1 - f) * 1.2;
      P.g.rotation.x = -F * Math.PI / 2 * 0.98;
      P.gm.opacity = 0.07 * f * (1 - F);
      P.strip.material.opacity = f * (1 - F);
    });

    // ---- shelves ----
    const emerge = ss(0.215, 0.26, p) * (1 - F);
    const sh = L.shelf, y0 = D[sh], sp = D[sh + 1], bw = D[sh + 2], bd = D[sh + 3] * emerge;
    const glowK = D[L.glow];
    const it = L.item, iw = D[it], ih = D[it + 1], idp = D[it + 2], boxness = D[it + 3];
    let nVis = 0; for (let j = 0; j < 4; j++) nVis += D[it + 16 + j];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      const b = r * 3 + c, rv = D[sh + 4 + r];
      const x = (c - 1) * 1.38, y = y0 + r * sp, d = bd * rv;
      const bOn = emerge > 0.01 ? 1 : 0;
      setI(boards, b, x, y, SHELF_Z + d / 2, bw * (rv > 0.01 ? 1 : rv) * bOn, 0.028 * bOn, d);
      const sOn = rv > 0.02 && emerge > 0.02 ? 1 : 0;
      setI(strips, b, x, y - 0.018, SHELF_Z + d - 0.01, bw * 0.96 * sOn, 0.006 * sOn, 0.012 * sOn);
      const gk = glowK * rv * emerge;
      strips.setColorAt(b, col.setRGB(2.0 * gk, 1.85 * gk, 1.6 * gk));
      for (let j = 0; j < 4; j++) {
        const ii = b * 4 + j, vis = D[it + 16 + j] * rv * emerge;
        const ix = x + (j - (nVis - 1) / 2) * bw / (nVis + 0.5);
        const hh = ih * (1 + 0.22 * itemJit[ii]);
        const iy = y + 0.014 + hh * vis / 2, iz = SHELF_Z + d * 0.55;
        const pc = (b + j) % 4;
        col.setRGB(D[it + 4 + pc * 3], D[it + 5 + pc * 3], D[it + 6 + pc * 3]);
        setI(cylItems, ii, ix, iy, iz, iw * vis * (1 - boxness), hh * vis * (1 - boxness), iw * vis * (1 - boxness));
        setI(boxItems, ii, ix, iy, iz, iw * vis * boxness, hh * vis * boxness, idp * vis * boxness);
        cylItems.setColorAt(ii, col); boxItems.setColorAt(ii, col);
      }
    }
    [boards, strips, cylItems, boxItems].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });

    // ---- islands + dressing ----
    const isl = [];
    for (let i = 0; i < 6; i++) {
      const o = L.isl + i * 6;
      const a = ss(0.235 + i * 0.006, 0.275 + i * 0.006, p) * (1 - F);
      const x = D[o], z = D[o + 1], w = D[o + 2], h = D[o + 3] * a, d = D[o + 4], ry = D[o + 5];
      islands[i].visible = a > 0.001;
      islands[i].position.set(x, h / 2, z); islands[i].scale.set(w, Math.max(h, 1e-4), d); islands[i].rotation.y = ry;
      isl.push({ x, z, top: h, ry, a, w });
    }
    const vase = models.vase, clk = models.clock;
    if (vase) { const s = isl[0].a * wH; vase.visible = s > 0.01; vase.scale.setScalar(Math.max(s, 1e-4)); vase.position.set(isl[0].x - 0.2, isl[0].top, isl[0].z); }
    if (clk) { const s = isl[1].a * wH; clk.visible = s > 0.01; clk.scale.setScalar(Math.max(s, 1e-4)); clk.position.set(isl[1].x + 0.2, isl[1].top, isl[1].z); clk.rotation.y = -0.6; }
    bowls.forEach((bw2) => { const I = isl[bw2.i], s = I.a * wH; bw2.g.visible = s > 0.01; bw2.g.scale.setScalar(Math.max(s, 1e-4)); bw2.g.position.set(I.x, I.top, I.z); bw2.g.rotation.y = I.ry; });
    manq.forEach((m) => { const I = isl[m.i], s = I.a * ss(0.2, 1, wF); m.g.visible = s > 0.01; m.g.scale.setScalar(0.95 * Math.max(s, 1e-4)); m.g.position.set(I.x, I.top, I.z); m.g.rotation.y = I.ry + (m.i === 4 ? 0.4 : -0.4); });
    const railK = wF * (1 - F) * build;
    rails.forEach((g) => { g.visible = railK > 0.01; g.scale.set(1, Math.max(railK, 1e-4), Math.max(0.3 + 0.7 * railK, 1e-4)); });
    for (let i = 0; i < 18; i++) {
      const r = i < 9 ? 0 : 1, k = i % 9;
      const gs = ss(0.1 + k * 0.05, 0.55 + k * 0.05, railK);
      const z = -0.1 + (-1.8 + k * 0.45) * (0.3 + 0.7 * railK);
      setI(garments, i, RAILS[r], 1.55 * railK - 0.06 - 0.45 * gs, z, gs, gs, gs, Math.sin(k * 1.7 + time * 0.6) * 0.04);
    }
    garments.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 18; i++) {
      const I = isl[(i / 3) | 0], k = (i % 3) - 1, s = I.a * ss(0.1 + (i % 3) * 0.1, 0.7 + (i % 3) * 0.1, wB);
      const lx = k * 0.32, lz = (i % 2 ? 0.08 : -0.08);
      const cx = I.x + Math.cos(I.ry) * lx + Math.sin(I.ry) * lz, cz = I.z - Math.sin(I.ry) * lx + Math.cos(I.ry) * lz;
      const hh = (0.85 + 0.35 * itemJit[i]) * s;
      setI(bottles, i, cx, I.top + 0.1 * hh, cz, s, hh, s);
    }
    bottles.instanceMatrix.needsUpdate = true;
    devices.forEach((g, i) => { const I = isl[i], s = I.a * ss(0.3, 1, wE); g.visible = s > 0.01; g.scale.setScalar(Math.max(s, 1e-4)); g.position.set(I.x, I.top, I.z); g.rotation.y = I.ry + (I.x < 0 ? 0.25 : -0.25); });

    // ---- ceiling ----
    const ce = L.ceilE;
    ceilMat.emissive.setRGB(D[ce + 1], D[ce + 2], D[ce + 3]);
    ceilMat.emissiveIntensity = D[ce] * build * (1 - F);
    ceil.forEach((m, i) => {
      const o = L.ceil + i * 5;
      const a = ss(0.235 + i * 0.006, 0.275 + i * 0.006, p);
      m.visible = a > 0.001;
      m.position.set(D[o], 3.5 + (1 - a) * 5 + F * 4, D[o + 1]);
      m.scale.set(D[o + 2], 1, D[o + 3]); m.rotation.y = D[o + 4];
    });

    // ---- lights ----
    room.intensity = build * 0.55 * (1 - F * 0.75) * (1 - ss(0.66, 0.7, p) * (1 - ss(0.85, 0.88, p)));
    hemi.intensity = 0.1 + build * 0.16 * (1 - F * 0.6);
    key.angle = lerp(0.42, 0.34, F);
    key.intensity = 2.3 * (1 - 0.6 * sink);
    rim.intensity = 1.3;

    // ---- moment 4: lamp, finishes, cart ----
    const lamp = lampHolder.children[0];
    let cartA = ss(0.588, 0.615, p);
    if (addT > 0) { if (p < 0.49) { addT = -1; addBtn.classList.remove('is-added'); addBtn.textContent = 'Add to cart'; } else cartA = Math.max(cartA, ss(0, 1, (performance.now() - addT) / 1100)); }
    const fly = ss(0.615, 0.64, p);
    bag.classList.toggle('is-on', fly > 0.95 && p < 0.86 || (addT > 0 && p < 0.86));
    right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const flyOff = vA.copy(right).multiplyScalar(2.1 * fly).addScaledVector(up, 1.35 * fly);
    const flyS = 1 - 0.86 * fly;
    if (lamp) {
      lamp.visible = lampIn > 0.01 && fly < 0.999;
      const s = ss(0.1, 1, lampIn) * lerp(1, 0.4, cartA) * flyS;
      lamp.scale.setScalar(Math.max(s, 1e-4));
      lamp.position.set(0, lerp(0.5 + (1 - lampIn) * 0.4, 1.08, cartA), 0).add(flyOff);
      lamp.rotation.y = -0.7 + (p - 0.5) * 4 + time * 0.04 + ptr.sx * 0.12;
      lamp.updateMatrixWorld(true);
      LU.uRootInv.value.copy(lamp.matrixWorld).invert();
      const bulb = lamp.userData.bulb; if (bulb) bulb.material.emissiveIntensity = ss(0.52, 0.54, p) * 5;
      if (wipeT > 0) { const f = Math.min(1, (performance.now() - wipeT) / 900); LU.uWipe.value = f; if (f >= 1) { LU.uTintA.value.copy(LU.uTintB.value); LU.uWipe.value = 0; wipeT = -1; } }
    }
    card3.visible = cartA > 0.01 && fly < 0.999;
    card3.position.set(0, 1.45, 0).add(flyOff);
    card3.quaternion.copy(camera.quaternion);
    card3.scale.setScalar(Math.max(ss(0.25, 1, cartA) * flyS, 1e-4));
    fade(card, cardOn);
    if (!userFinish && p > 0.505 && p < 0.585) setFinish(p < 0.53 ? 0 : p < 0.556 ? 1 : 2);
    // checkout steps
    const co = ss(0.628, 0.64, p) * (1 - ss(0.68, 0.692, p));
    fade(checkout, co);
    const spp = (p - 0.632) / 0.045;
    steps.forEach((s, i) => { s.classList.toggle('is-active', (spp >= i / 3 && spp < (i + 1) / 3) || (i === 2 && spp >= 1)); s.classList.toggle('is-done', spp >= (i + 1) / 3 && i !== 2); });

    // ---- moment 5: network ----
    net.visible = p > 0.64 && p < 0.865;
    const netOn = ss(0.68, 0.72, p) * (1 - ss(0.83, 0.86, p));
    netLight.intensity = 1.6 * netOn;
    M.netFloor.emissiveIntensity = 0.1 + 0.25 * netOn;
    dropMat.uniforms.uDraw.value = ss(0.69, 0.72, p);
    tubeMat.uniforms.uDraw.value = ss(0.705, 0.745, p);
    const u = cl((p - 0.745) / 0.07);
    const dropT = ss(0.695, 0.745, p);
    const pkOn = p > 0.69 && p < 0.83;
    packet.visible = pkOn; packetLight.intensity = pkOn ? 2.2 : 0;
    if (pkOn) {
      if (u <= 0) packet.position.set(0, lerp(1.0, PY, dropT), 0); else path.getPointAt(u, packet.position);
      packet.rotation.set(time * 1.3, time * 1.7, 0);
      packet.scale.setScalar(ss(0.69, 0.7, p) * (1 - ss(0.815, 0.83, p)) + 1e-4);
      packetLight.position.copy(packet.position);
    }
    trail.forEach((m, i) => {
      const uu = u - (i + 1) * 0.012;
      m.visible = pkOn && u > 0 && uu > 0;
      if (m.visible) path.getPointAt(uu, m.position);
    });
    mods.forEach((md, i) => {
      const act = ss(md.u - 0.02, md.u + 0.01, u);
      md.ringM.opacity = (0.25 + 0.75 * act) * netOn;
      md.coreM.opacity = act * (0.35 + 0.15 * Math.sin(time * 3 + i)) * netOn;
      if (md.label) {
        const on = netOn * ss(0.74, 0.76, p);
        if (on > 0.01) { proj.set(md.x, NET_Y + 0.42, md.z).project(camera); md.label.style.transform = `translate(${(proj.x * 0.5 + 0.5) * W}px,${(-proj.y * 0.5 + 0.5) * H}px) translate(-50%,-130%)`; }
        md.label.style.opacity = on;
        md.label.classList.toggle('is-on', act > 0.5);
      }
    });

    // ---- moment 6: fold into the cube, then open it ----
    const ws = lerp(1, 0.125, f6);
    world.visible = o6 < 0.12;
    world.scale.setScalar(ws);
    world.rotation.y = f6 * Math.PI / 2;
    cube.visible = f6 > 0.001;
    cube.scale.setScalar(lerp(7.1, 1, f6));
    cube.rotation.y = f6 * Math.PI / 2;
    const lum = ss(0.55, 1, f6);
    faceMat.opacity = lerp(0.04, 0.95, lum) * (1 - 0.75 * o6);
    faceMat.emissiveIntensity = lum * 0.55 * (1 - 0.6 * o6);
    edgeMat.opacity = ss(0, 0.3, f6) * (1 - 0.55 * o6);
    faces.forEach((fc, i) => { fc.rotation.x = ss(i * 0.06, 0.82 + i * 0.06, o6) * Math.PI / 2; });
    top.position.y = CS + o6 * 1.6; top.visible = o6 < 0.98;
    platform.visible = o6 > 0.02;
    platform.scale.setScalar(Math.max(ss(0.2, 1, o6), 1e-4));
    if (bloom) bloom.strength = 0.45 + 0.15 * lum * (1 - o6);

    // ---- chapter copy + rail ----
    for (const c of chapters) {
      const o = c.s <= 0 ? 1 - ss(c.e - 0.02, c.e + 0.005, p) : ss(c.s - 0.005, c.s + 0.02, p) * (c.e >= 1 ? 1 : 1 - ss(c.e - 0.015, c.e + 0.005, p));
      c.el.style.opacity = o;
    }
    let ri = 0; railBtns.forEach((b, i) => { if (p >= parseFloat(b.dataset.go) - 0.02) ri = i; });
    if (ri !== lastRail) { railBtns.forEach((b, i) => { b.classList.toggle('is-on', i === ri); if (i === ri) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }); lastRail = ri; }

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  frame();
  window.__is = { go(p) { const r = story.getBoundingClientRect(); scrollTo(0, scrollY + r.top + p * (r.height - innerHeight)); }, scene, camera, D, L, setFinish, get p() { return pS; } };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main); else main();
