'use strict';
/* ---------- 3D animals (three.js): sculpted bodies (cast/*.bin), shell fur, glossy eyes with real irises ---------- */
const T = window.THREE;
let has3D = false;
const R3 = {};
const V = (x,y,z) => new T.Vector3(x,y,z);
const lin = h => new T.Color(h).convertSRGBToLinear();
const asLin = v => v && v.isColor ? v : lin(v);
const mixc = (a, b, t) => asLin(a).clone().lerp(asLin(b), Math.min(1, Math.max(0, t)));
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3 - 2*t); };
const shared = o => { o.userData = o.userData || {}; o.userData.shared = true; return o; };
function init3D(){
  if (!T) return;
  try {
    const sc = document.createElement('canvas');
    R3.snap = new T.WebGLRenderer({canvas:sc, alpha:true, antialias:true, preserveDrawingBuffer:true});
    R3.snap.setPixelRatio(1); R3.snap.setSize(420, 420, false);
    R3.liveCanvas = document.createElement('canvas');
    R3.live = new T.WebGLRenderer({canvas:R3.liveCanvas, alpha:true, antialias:true});
    [R3.snap, R3.live].forEach(r => { r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.setClearColor(0x000000, 0); });
    R3.SPH = shared(new T.SphereGeometry(1, 40, 28));
    R3.SHINE = shared(new T.MeshBasicMaterial({color:0xffffff}));
    const n = document.createElement('canvas'); n.width = n.height = 128; const nx = n.getContext('2d'), id = nx.createImageData(128, 128);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random()*255; id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255; }
    nx.putImageData(id, 0, 0);
    R3.NOISE = shared(new T.CanvasTexture(n)); R3.NOISE.wrapS = R3.NOISE.wrapT = T.RepeatWrapping; R3.NOISE.magFilter = R3.NOISE.minFilter = T.NearestFilter; R3.NOISE.generateMipmaps = false;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(10,8,40,.55)'); g.addColorStop(1,'rgba(10,8,40,0)'); x.fillStyle = g; x.fillRect(0,0,128,128);
    R3.SHADOW = shared(new T.CanvasTexture(c));
    R3.envSnap = envFor(R3.snap); R3.envLive = envFor(R3.live);
    /* if the device drops 3D, show the picture again and stop drawing */
    R3.liveCanvas.addEventListener('webglcontextlost', e => { e.preventDefault(); has3D = false; if (Live.box) Live.box.classList.remove('live'); R3.liveCanvas.remove(); });
    has3D = true;
  } catch(e) { has3D = false; }
}
/* soft studio light for reflections in eyes, noses and frog skin */
function envFor(r){
  const pm = new T.PMREMGenerator(r), s = new T.Scene();
  const geo = new T.SphereGeometry(20, 32, 16), p = geo.attributes.position, cols = new Float32Array(p.count*3);
  const top = lin(0xfff1dc), mid = lin(0x8a82c8), bot = lin(0x2a2560);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i)/20, c = mid.clone().lerp(y > 0 ? top : bot, Math.abs(y)); cols.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(cols, 3));
  s.add(new T.Mesh(geo, new T.MeshBasicMaterial({vertexColors:true, side:T.BackSide})));
  const panel = new T.Mesh(new T.PlaneGeometry(8, 6), new T.MeshBasicMaterial({color:new T.Color(6, 5.6, 5), side:T.DoubleSide}));
  panel.position.set(-8, 10, 10); panel.lookAt(0, 0, 0); s.add(panel);
  const t = pm.fromScene(s, .02).texture; pm.dispose(); return shared(t);
}
function makeScene(env){
  const s = new T.Scene(); s.environment = env;
  s.add(new T.HemisphereLight(0xfff3e0, 0x4a4290, .4));
  const key = new T.DirectionalLight(0xfff0dc, 1.3); key.position.set(-3, 6, 6); s.add(key);
  const rim = new T.DirectionalLight(0xc0b2ff, 1.1); rim.position.set(4, 3, -5); s.add(rim);
  const fill = new T.DirectionalLight(0xffffff, .25); fill.position.set(3, 1, 5); s.add(fill);
  const sh = new T.Mesh(new T.PlaneGeometry(3.2, 2.2), new T.MeshBasicMaterial({map:R3.SHADOW, transparent:true, depthWrite:false}));
  sh.rotation.x = -Math.PI/2; sh.position.y = .005; s.add(sh);
  return s;
}
const std = (c, o={}) => new T.MeshStandardMaterial(Object.assign({color:lin(c), roughness:.6, metalness:0}, o));
const gloss = (c, o={}) => new T.MeshPhysicalMaterial(Object.assign({color:lin(c), roughness:.22, clearcoat:1, clearcoatRoughness:.06, metalness:0}, o));
function place(o, pos, opt){ o.position.set(...pos); if (opt.q) o.quaternion.copy(opt.q); else if (opt.rot) o.rotation.set(...opt.rot); }
function solid(g, mat, pos, scl, o={}){ const m = new T.Mesh(R3.SPH, mat); place(m, pos, o); m.scale.set(...scl); g.add(m); return m; }

/* ---------- sculpted bodies: one smooth chibi mesh per animal, built offline by sculpt/cute.py (cast/<kind>.txt, base64) ---------- */
const CAST_KINDS = ['doudou','bobo','xiaoju','paopao','xingxing','owl','deer'];
const MESH = {};
let castLoaded = false, castFailed = false;
function decodeMesh(buf){
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'LLM1') throw new Error('bad mesh');
  const nv = dv.getUint32(4, true), ni = dv.getUint32(8, true), big = dv.getUint32(12, true) === 1;
  const lo = [0,1,2].map(i => dv.getFloat32(16 + i*4, true)), hi = [0,1,2].map(i => dv.getFloat32(28 + i*4, true));
  let o = 40;
  const q = new Int16Array(buf, o, nv*3); o += nv*6;
  const nn = new Int8Array(buf, o, nv*3); o += nv*3;
  const cc = new Uint8Array(buf, o, nv*3); o += nv*3;
  const ff = new Uint8Array(buf, o, nv); o += nv;
  o += (4 - o % 4) % 4;
  const idx = big ? new Uint32Array(buf, o, ni) : new Uint16Array(buf, o, ni);
  const pos = new Float32Array(nv*3), nrm = new Float32Array(nv*3), col = new Float32Array(nv*3), fur = new Float32Array(nv);
  const toLin = v => { v /= 255; return v <= .04045 ? v/12.92 : Math.pow((v + .055)/1.055, 2.4); };
  const spines = [];
  for (let i = 0; i < nv; i++) {
    for (let a = 0; a < 3; a++) {
      pos[i*3+a] = lo[a] + (q[i*3+a] + 32767) / 65534 * (hi[a] - lo[a]);
      nrm[i*3+a] = nn[i*3+a] / 127;
      col[i*3+a] = toLin(cc[i*3+a]);
    }
    if (ff[i] === 255) { fur[i] = .3; spines.push(i); } else fur[i] = ff[i] / 128;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setAttribute('fur', new T.BufferAttribute(fur, 1));
  geo.setIndex(new T.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  geo.userData.shared = true; geo.userData.spines = spines;
  return geo;
}
const castReady = new Promise(resolve => {
  const go = () => Promise.all(CAST_KINDS.map(k => fetch(new URL(`cast/${k}.txt`, document.baseURI)).then(r => { if (!r.ok) throw new Error(k); return r.text(); }).then(t => { const s = atob(t.trim()), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); MESH[k] = decodeMesh(u.buffer); })))
    .then(() => { castLoaded = true; }, e => { castFailed = true; console.warn('3D cast did not load; using flat drawings.', e); })
    .then(resolve);
  if (T) go(); else { castFailed = true; resolve(); }
});
/* fur: the sculpted skin plus stacked shells; strands come from a 3D cell hash of the body, so they line up through every shell */
const FUR_SHELLS = 8;
function furMat(shell, len, rough, density){
  const m = new T.MeshStandardMaterial({vertexColors:true, roughness:rough, metalness:0});
  m.onBeforeCompile = sh => {
    sh.uniforms.uShell = {value:shell}; sh.uniforms.uLen = {value:len}; sh.uniforms.uDen = {value:density};
    sh.vertexShader = 'uniform float uShell;\nuniform float uLen;\nuniform float uDen;\nattribute float fur;\nvarying vec3 vFurPos;\nvarying float vFur;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvFurPos = position * uDen;\nvFur = fur;\ntransformed += normalize(objectNormal) * uShell * uLen * fur;\ntransformed.y -= uShell * uShell * uLen * fur * 0.35;');
    sh.fragmentShader = 'uniform float uShell;\nvarying vec3 vFurPos;\nvarying float vFur;\n' + sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat hair = fract(sin(dot(floor(vFurPos), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\nif (uShell > 0.0 && (vFur < 0.03 || hair < uShell * 0.85 + 0.12)) discard;\ndiffuseColor.rgb *= mix(0.55, 1.08, uShell);');
  };
  m.customProgramCacheKey = () => 'fur-v2';
  return m;
}
/* body: fur coat (len > 0) or glossy skin (len 0, the frog) */
function body(g, kind, o={}){
  o = Object.assign({}, o);
  const geo = MESH[kind], part = new T.Group();
  if (!o.len) {
    part.add(new T.Mesh(geo, new T.MeshPhysicalMaterial({vertexColors:true, roughness:o.rough ?? .32, clearcoat:.6, clearcoatRoughness:.15, envMapIntensity:.35})));
  } else {
    const n = o.shells ?? FUR_SHELLS;
    for (let k = 0; k <= n; k++) { const m = new T.Mesh(geo, furMat(k/n, o.len, o.rough ?? .85, o.den ?? 60)); m.userData.shell = k/n; part.add(m); }
  }
  g.add(part); return part;
}
/* eyes: a glossy ball with a painted iris, species-shaped pupil and a catchlight */
const eyeCache = {};
const shade = (hex, f) => '#' + [1,3,5].map(i => Math.min(255, Math.round(parseInt(hex.slice(i, i+2), 16)*f)).toString(16).padStart(2, '0')).join('');
function eyeTex(iris, pupil){
  const k = iris + pupil; if (eyeCache[k]) return eyeCache[k];
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#120d10'; x.fillRect(0, 0, 256, 128);
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 40); g.addColorStop(0, shade(iris, 1.3)); g.addColorStop(.65, iris); g.addColorStop(1, shade(iris, .4));
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 40, 0, 7); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 1;
  for (let i = 0; i < 72; i++) { const a = i/72*Math.PI*2, r0 = 12 + (i%3)*2; x.beginPath(); x.moveTo(64 + Math.cos(a)*r0, 64 + Math.sin(a)*r0); x.lineTo(64 + Math.cos(a)*39, 64 + Math.sin(a)*39); x.stroke(); }
  x.fillStyle = '#040203'; x.beginPath();
  if (pupil === 'slit') x.ellipse(64, 64, 6, 30, 0, 0, 7);
  else if (pupil === 'bar') x.ellipse(64, 64, 25, 9, 0, 0, 7);
  else x.arc(64, 64, pupil === 'big' ? 25 : 17, 0, 7);
  x.fill();
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return eyeCache[k] = shared(t);
}
function eye(g, pos, r, dir, iris, pupil, o={}){
  const e = new T.Group(); e.position.set(...pos);
  const b = new T.Mesh(R3.SPH, new T.MeshPhysicalMaterial({map:eyeTex(iris, pupil), roughness:.06, clearcoat:1, clearcoatRoughness:.02}));
  b.scale.set(r, r*(o.sy || 1), r); b.userData.eye = {iris, pupil}; e.add(b);
  const h = new T.Mesh(R3.SPH, R3.SHINE); h.scale.setScalar(r*.17); h.position.set(-r*.32, r*.36*(o.sy || 1), r*.88); e.add(h);
  e.lookAt(e.position.clone().add(V(...dir)));
  g.add(e); (g.userData.eyes = g.userData.eyes || []).push(e); return e;
}
function whiskers(g, at, color, len=.56){
  const m = std(color, {roughness:.4});
  [-1, 1].forEach(side => { for (let i = 0; i < 3; i++) {
    const w = new T.Mesh(new T.CylinderGeometry(.004, .009, len, 4), m), a = Math.PI/2 + .08 + (i - 1)*.14;
    w.rotation.set(0, side*.3, -side*a); w.position.set(at[0] + side*(.2 + len*.46*Math.sin(a)), at[1] - len*.46*Math.cos(a), at[2] - side*side*.04); g.add(w);
  } });
}
function mouthLine(g, pos, w, color){ const m = new T.Mesh(new T.TorusGeometry(w, .012, 6, 20, Math.PI*.8), std(color, {roughness:.5})); m.position.set(...pos); m.rotation.z = Math.PI*1.1; g.add(m); return m; }
const HEROES_3D = ['doudou','bobo','xiaoju','paopao','xingxing'];
/* everything the sculpt does not hold: eyes, noses, whiskers, props. Positions match sculpt/sculpt.py */
const BUILD = {
  /* panda: white head and tummy, black ears, eye patches, arms and legs, pink paw pads, a bamboo sprig */
  doudou(g){
    body(g, 'doudou', FELT);
    [-1, 1].forEach(s => bead(g, [s*.33,2.08,.73], .135, [s*.2,0,1], {ring:true}));
    nose(g, [0,1.95,.9]); mouthW(g, [0,1.8,.92]);
    const leaf = std(0x6cbf4a, {roughness:.6}), stem = std(0x8cc65a, {roughness:.5});
    const st = new T.Mesh(new T.CylinderGeometry(.045, .05, .9, 10), stem); st.position.set(.05, 1.1, .78); st.rotation.z = -.5; g.add(st);
    [[.3,1.38,.82,-.2],[.42,1.3,.78,.6],[.2,1.45,.8,-.9],[.36,1.48,.74,.2]].forEach(([x,y,z,r]) => solid(g, leaf, [x,y,z], [.2,.07,.05], {rot:[.3,0,r]}));
    g.userData.anchor = CHIBI;
  },
  /* otter: brown with a cream face and tummy, holding a pebble */
  bobo(g){
    body(g, 'bobo', FELT);
    [-1, 1].forEach(s => {
      bead(g, [s*.34,2.1,.73], .135, [s*.2,0,1]);
      [[.13,1.83,.9],[.2,1.87,.87],[.19,1.79,.88]].forEach(([x,y,z]) => solid(g, std(0x6b4a36), [s*x,y,z], [.018,.018,.018]));
    });
    nose(g, [0,1.94,.9]); mouthW(g, [0,1.78,.91]);
    solid(g, std(0x9fb3c8, {roughness:.35}), [0,.96,.72], [.16,.12,.13]);
    g.userData.anchor = CHIBI;
  },
  /* hedgehog: cream face, pink ears, soft rounded spikes */
  xiaoju(g){
    body(g, 'xiaoju', FELT);
    const sg = new T.ConeGeometry(.08, .26, 10, 4); sg.translate(0, .1, 0);
    paintGeo(sg, (x,y) => y < .05 ? 0x6b4329 : y < .15 ? 0x8a5f3e : 0xd9b88f);
    const geo = MESH.xiaoju, P = geo.attributes.position, N = geo.attributes.normal, sites = geo.userData.spines.filter((_, i) => i % 7 === 0);
    const sp = new T.InstancedMesh(sg, std(0xffffff, {vertexColors:true, roughness:.7}), sites.length);
    const mtx = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), up = V(0,1,0);
    sites.forEach((vi, i) => {
      const p = V(P.getX(vi), P.getY(vi), P.getZ(vi)), d = V(N.getX(vi), N.getY(vi) + .2, N.getZ(vi) - .55).normalize();
      q.setFromUnitVectors(up, d); const s = .85 + ((i*37) % 30)/100; sc.set(s, s, s); mtx.compose(p, q, sc); sp.setMatrixAt(i, mtx);
    });
    g.add(sp);
    [-1, 1].forEach(s => bead(g, [s*.22,1.1,.98], .1, [s*.25,0,1]));
    nose(g, [0,.86,1.36], .07); mouthW(g, [0,.76,1.17], .7);
    g.scale.setScalar(1.35);
    g.userData.anchor = {neck:[.6,.28,.78], back:[1.85,-.45], top:[1.95,.2]};
  },
  /* frog: bright green, big eyes on top, wide smile, cream tummy */
  paopao(g){
    body(g, 'paopao', {rough:.55});
    [-1, 1].forEach(s => bead(g, [s*.43,2.14,.53], .18, [s*.25,.1,1], {ring:true}));
    const sm = new T.Mesh(new T.TorusGeometry(.3, .024, 8, 30, Math.PI*.9), std(0x2d4a22, {roughness:.5})); sm.position.set(0, 1.47, .83); sm.rotation.set(-.15, 0, Math.PI*1.05); g.add(sm);
    g.scale.setScalar(1.15);
    g.userData.anchor = {neck:[1.15,.1,.82], back:[1.0,-.75], top:[2.42,.1]};
  },
  /* fox: orange with a white face and chest, big dark-tipped ears, black socks, fluffy white-tipped tail */
  xingxing(g){
    body(g, 'xingxing', FELT);
    [-1, 1].forEach(s => bead(g, [s*.34,2.12,.73], .135, [s*.2,0,1]));
    nose(g, [0,1.91,.98]); mouthW(g, [0,1.75,.95]);
    g.userData.anchor = CHIBI;
  },
  /* owl guide: round and soft, cream face, amber eyes behind gold glasses */
  owl(g){
    body(g, 'owl', FELT);
    const Gd = std(0xe2a63b, {roughness:.25, metalness:.7});
    [-1, 1].forEach(s => {
      eye(g, [s*.33,2.1,.74], .17, [s*.12,0,1], '#f0a020', 'big');
      const ring = new T.Mesh(new T.TorusGeometry(.23, .025, 10, 40), Gd); ring.position.set(s*.33, 2.1, .9); g.add(ring);
    });
    const br = new T.Mesh(new T.CylinderGeometry(.018, .018, .2, 8), Gd); br.rotation.z = Math.PI/2; br.position.set(0, 2.14, .92); g.add(br);
    const bk = new T.Mesh(new T.ConeGeometry(.08, .2, 14), std(0xf2a33a, {roughness:.5})); bk.position.set(0, 1.88, .86); bk.rotation.x = 2.6; g.add(bk);
  },
  /* fawn guide: tan with white spots, big soft ears, red collar with a gold bell */
  deer(g){
    body(g, 'deer', FELT);
    [-1, 1].forEach(s => bead(g, [s*.34,2.12,.73], .135, [s*.2,0,1]));
    nose(g, [0,1.94,.98]); mouthW(g, [0,1.77,.93]);
    const col = new T.Mesh(new T.TorusGeometry(.6, .06, 10, 40), std(0xd9442b, {roughness:.8})); col.position.set(0, 1.47, .0); col.rotation.x = Math.PI/2; g.add(col);
    solid(g, std(0xffd466, {roughness:.2, metalness:.7}), [0,1.36,.62], [.11,.11,.11]);
  }
};
const FELT = {len:.02, den:150, rough:.9};
const CHIBI = {neck:[1.48,.0,.66], back:[1.05,-.72], top:[2.87,.05]};
/* glossy bead eyes with two catchlights; ring: a white rim, for eyes on dark patches */
function bead(g, pos, r, dir, o={}){
  const e = new T.Group(); e.position.set(...pos);
  if (o.ring) { const w = new T.Mesh(R3.SPH, std(0xfffaf2, {roughness:.35})); w.scale.set(r*1.3, r*1.35, r*.55); w.position.z = -r*.25; e.add(w); }
  const b = new T.Mesh(R3.SPH, gloss(0x17121a)); b.scale.set(r, r*1.1, r*.7); e.add(b);
  const h = new T.Mesh(R3.SPH, R3.SHINE); h.scale.setScalar(r*.32); h.position.set(-r*.32, r*.42, r*.55); e.add(h);
  const h2 = new T.Mesh(R3.SPH, R3.SHINE); h2.scale.setScalar(r*.13); h2.position.set(r*.32, -r*.32, r*.6); e.add(h2);
  e.lookAt(e.position.clone().add(V(...dir)));
  g.add(e); (g.userData.eyes = g.userData.eyes || []).push(e); return e;
}
function nose(g, pos, r=.085){ solid(g, gloss(0x231a1e), pos, [r, r*.72, r*.7]); }
/* a small "w" mouth: two little arcs */
function mouthW(g, pos, s=1){
  const m = std(0x3a2a2c, {roughness:.5});
  [-1, 1].forEach(k => { const a = new T.Mesh(new T.TorusGeometry(.055*s, .013*s, 6, 16, Math.PI), m); a.position.set(pos[0] + k*.055*s, pos[1], pos[2]); a.rotation.z = Math.PI; g.add(a); });
}
function paintGeo(geo, fn){
  const p = geo.attributes.position, cols = new Float32Array(p.count*3);
  for (let i = 0; i < p.count; i++) { const c = asLin(fn(p.getX(i), p.getY(i), p.getZ(i))); cols.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(cols, 3)); return geo;
}
/* growth gear: a knitted scarf, an explorer's backpack, a gold crown */
function accessories(g, st){
  const a = g.userData.anchor; if (!a || st < 1) return;
  const [ny, nz, nr, tilt = 0] = a.neck;
  const R = std(0xd9442b, {roughness:.95});
  const sc = new T.Mesh(new T.TorusGeometry(nr, Math.min(.12, nr*.22), 14, 48), R); sc.rotation.x = Math.PI/2 - tilt; sc.position.set(0, ny, nz); g.add(sc);
  solid(g, R, [nr*.35, ny - .26 + tilt*.1, nz + nr*.9 + tilt*.1], [.11,.26,.06], {rot:[0,0,.3]});
  if (st >= 2) {
    const Y = std(0xe9b23c, {roughness:.8});
    const bp = new T.Mesh(new T.BoxGeometry(.7, .7, .36), Y); bp.position.set(0, a.back[0], a.back[1]); g.add(bp);
    solid(g, std(0xc98f22, {roughness:.8}), [0, a.back[0] + .26, a.back[1] - .02], [.37,.15,.21]);
  }
  if (st >= 3) {
    const Gd = std(0xffd466, {roughness:.25, metalness:.7, side:T.DoubleSide});
    const cr = new T.Mesh(new T.CylinderGeometry(.24, .28, .2, 16, 1, true), Gd); cr.position.set(0, a.top[0], a.top[1]); g.add(cr);
    for (let i = 0; i < 5; i++) { const t = i/5*Math.PI*2; solid(g, Gd, [Math.sin(t)*.25, a.top[0] + .13, a.top[1] + Math.cos(t)*.25], [.05,.05,.05]); }
  }
}
function build(kind, st=0){
  const root = new T.Group(), g = new T.Group(); root.add(g);
  BUILD[kind](g); if (HEROES_3D.includes(kind)) accessories(g, st);
  root.userData.eyes = g.userData.eyes || [];
  return root;
}
function disposeObj(o){ o.traverse(m => { if (m.isMesh) { if (!m.geometry.userData.shared) m.geometry.dispose(); if (!m.material.userData.shared) m.material.dispose(); } }); }
const snapCache = {};
function portrait(kind, st=0){
  const k = kind + st; if (snapCache[k]) return snapCache[k];
  const s = makeScene(R3.envSnap), h = build(kind, st); h.rotation.y = -.3; s.add(h);
  const cam = new T.PerspectiveCamera(27, 1, .1, 50); cam.position.set(0, 1.9, 9.6); cam.lookAt(0, 1.6, 0);
  R3.snap.render(s, cam);
  const url = R3.snap.domElement.toDataURL('image/png');
  disposeObj(s);
  return snapCache[k] = url;
}
const Live = {scene:null, cam:null, hero:null, raf:0, jumpT:-1, last:0, pend:null};
function threeMount(box, kind, st){
  if (!has3D || castFailed) return;
  if (!castLoaded) { const tok = Live.pend = {}; castReady.then(() => { if (Live.pend === tok && box.isConnected) threeMount(box, kind, st); }); return; }
  Live.pend = null; Live.box = box; Live.shown = false;
  R3.liveCanvas.classList.add('live-cv'); box.append(R3.liveCanvas);
  const w = box.clientWidth || 300, h = box.clientHeight || 300;
  R3.live.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R3.live.setSize(w, h, false);
  if (!Live.scene) { Live.scene = makeScene(R3.envLive); Live.cam = new T.PerspectiveCamera(27, 1, .1, 50); }
  Live.cam.aspect = w / h; Live.cam.updateProjectionMatrix(); Live.cam.position.set(0, 1.95, 10.8); Live.cam.lookAt(0, 1.6, 0);
  if (Live.hero) { Live.scene.remove(Live.hero); disposeObj(Live.hero); }
  Live.hero = build(kind, st); Live.scene.add(Live.hero); Live.jumpT = 0;
  if (reduced) { R3.live.render(Live.scene, Live.cam); box.classList.add('live'); return; }
  if (!Live.raf) { Live.last = performance.now(); Live.raf = requestAnimationFrame(liveLoop); }
}
function liveLoop(now){
  const cv = R3.liveCanvas;
  if (!cv.isConnected || cv.offsetParent === null) { Live.raf = 0; return; }
  const dt = Math.min((now - Live.last) / 1000, .05); Live.last = now;
  const t = now / 1000, h = Live.hero;
  let y = Math.sin(t*2.2)*.035, sq = 1;
  if (Live.jumpT >= 0) { Live.jumpT += dt; const p = Live.jumpT / .75; if (p >= 1) Live.jumpT = -1; else { y += Math.sin(Math.PI*p)*1.0; sq = 1 + Math.sin(Math.PI*p*2)*.06; } }
  h.position.y = y; h.scale.set(1/Math.sqrt(sq), sq, 1/Math.sqrt(sq));
  h.rotation.y = Math.sin(t*.7)*.45;
  const blink = (t % 3.7) < .13 ? .12 : 1; h.userData.eyes.forEach(e => e.scale.y = blink);
  R3.live.render(Live.scene, Live.cam);
  if (!Live.shown) { Live.shown = true; if (!R3.live.getContext().isContextLost()) Live.box.classList.add('live'); }
  Live.raf = requestAnimationFrame(liveLoop);
}
const threeCheer = () => { Live.jumpT = 0; };

/* ---------- flat art fallback when 3D is unavailable ---------- */
const INK = '#2b2452';
const eyes2 = y => `<circle cx="49" cy="${y}" r="4.6" fill="${INK}"/><circle cx="71" cy="${y}" r="4.6" fill="${INK}"/><circle cx="50.6" cy="${y-1.6}" r="1.7" fill="#fff"/><circle cx="72.6" cy="${y-1.6}" r="1.7" fill="#fff"/>`;
const FLAT = {
  doudou:'#f1ece2', bobo:'#5e4130', xiaoju:'#6b4c35', paopao:'#4f9e3a', xingxing:'#d2652a', owl:'#7a5a3f', deer:'#a8642f'
};
const svgHero = kind => `<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="34" ry="5" fill="rgba(10,8,40,.35)"/><ellipse cx="60" cy="90" rx="28" ry="22" fill="${FLAT[kind]}"/><circle cx="60" cy="52" r="30" fill="${FLAT[kind]}"/>${eyes2(52)}<path d="M55 63 Q60 68 65 63" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="41" cy="60" rx="5" ry="3" fill="#ff9fb0"/><ellipse cx="79" cy="60" rx="5" ry="3" fill="#ff9fb0"/></svg>`;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
function threeHeroHTML(kind, st=0, cls=''){
  if (!has3D || castFailed) return svgHero(kind).replace('<svg', `<svg class="${cls}"`);
  if (!castLoaded) return `<img class="${cls}" src="${BLANK}" alt="" data-portrait="${kind}:${st}">`;
  return `<img class="${cls}" src="${portrait(kind, st)}" alt="">`;
}
/* fill the pictures that were drawn before the meshes arrived */
castReady.then(() => document.querySelectorAll('img[data-portrait]').forEach(img => {
  const [kind, st] = img.dataset.portrait.split(':');
  if (castFailed || !has3D) img.outerHTML = svgHero(kind).replace('<svg', `<svg class="${img.className}"`);
  else { img.src = portrait(kind, +st); img.removeAttribute('data-portrait'); }
}));

