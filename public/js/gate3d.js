'use strict';
/* ---------- the entrance as a real 3D scene (three.js r128) ----------
   A stone castle with a gatehouse, tiled conical roofs, ticket booths, turnstiles and a queue on a cobbled
   plaza; behind the walls a Ferris wheel, a roller coaster with a loop, a drop tower, a carousel and a tall
   keep at the end of the main street. Seasons change the sky, trees, ground and snow.
   Units are metres: the gate arch is 6.4 m wide, the front wall 9 m high.
   If WebGL is missing or the context is lost, the illustrated castle (castle.js) is used instead.
   Performance: shadows are rendered once (static), only small parts animate, and the loop runs only while the
   entrance is on screen. */
const Gate3D = (function(){
  const T = window.THREE;
  let ok = false, R = null, scene = null, cam = null, holder = null, running = false, raf = 0, last = 0;
  let season = -1, anim = [], frame = null, walk = null, failed = false, maxAniso = 4, partsObj = null;

  function supported(){
    if (!T || failed) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch(e) { return false; }
  }

  /* ---------- procedural textures ---------- */
  const seeded = seed => { seed = Math.abs(Math.round(seed)) % 2147483646 + 1; return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; };
  function canvas(size, draw){ const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
  function tex(c, srgb = true){ const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso; return t; }
  const rep = (t, x, y) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c; };
  const shade = (hex, k) => { const c = new T.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); };

  /* limestone blocks (a 4 m tile, blocks 0.5 m tall) with mortar; a matching bump map */
  function stonePair(base, seed){
    const draw = bump => (g, n) => { const r = seeded(seed), rowH = n / 8;
      g.fillStyle = bump ? '#202020' : shade(base, -.16); g.fillRect(0, 0, n, n);
      for (let row = 0; row < 8; row++) { let x = -r() * 80;
        while (x < n) { const w = 70 + r() * 70, y = row * rowH;
          const v = (r() - .5) * .07;
          if (bump) { const gr = g.createLinearGradient(0, y, 0, y + rowH); gr.addColorStop(0, '#f0f0f0'); gr.addColorStop(1, '#b8b8b8'); g.fillStyle = gr; }
          else g.fillStyle = shade(base, v);
          g.fillRect(x + 2, y + 2, w - 4, rowH - 4);
          if (!bump) for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '90,80,60'},${.05 + r() * .06})`; g.fillRect(x + r() * w, y + r() * rowH, 2 + r() * 5, 2 + r() * 4); }
          x += w; } }
    };
    return {map: tex(canvas(512, draw(false))), bump: tex(canvas(512, draw(true)), false)};
  }
  /* roof tiles: overlapping rounded shingles */
  function shinglePair(base, seed){
    const draw = bump => (g, n) => { const r = seeded(seed), rows = 16, rh = n / rows, cw = n / 16;
      g.fillStyle = bump ? '#111' : shade(base, -.2); g.fillRect(0, 0, n, n);
      for (let row = rows; row >= 0; row--) for (let i = -1; i <= 16; i++) {
        const x = i * cw + (row % 2) * cw / 2, y = row * rh;
        if (bump) { const gr = g.createLinearGradient(0, y, 0, y + rh * 1.3); gr.addColorStop(0, '#999'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; }
        else g.fillStyle = shade(base, (r() - .5) * .1);
        g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + cw - 1, y); g.lineTo(x + cw - 1, y + rh * .7); g.quadraticCurveTo(x + cw / 2, y + rh * 1.35, x + 1, y + rh * .7); g.closePath(); g.fill();
        if (!bump) { g.strokeStyle = 'rgba(40,20,30,.25)'; g.lineWidth = 1.5; g.stroke(); } }
    };
    return {map: tex(canvas(256, draw(false))), bump: tex(canvas(256, draw(true)), false)};
  }
  function cobbles(base, seed){
    const draw = bump => (g, n) => { const r = seeded(seed);
      g.fillStyle = bump ? '#111' : shade(base, -.22); g.fillRect(0, 0, n, n);
      const s = 28;
      for (let y = 0; y < n + s; y += s * .8) for (let x = ((y / (s * .8)) % 2) * s / 2 - s; x < n + s; x += s) {
        const cx = x + (r() - .5) * 6, cy = y + (r() - .5) * 6, rx = s * .42 + r() * 3, ry = s * .34 + r() * 3;
        if (bump) { const gr = g.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, rx); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#777'); g.fillStyle = gr; }
        else g.fillStyle = shade(base, (r() - .5) * .12);
        g.beginPath(); g.ellipse(cx, cy, rx, ry, r() * 3, 0, 7); g.fill(); }
    };
    return {map: tex(canvas(256, draw(false))), bump: tex(canvas(256, draw(true)), false)};
  }
  function grass(base, seed, snow){
    return tex(canvas(256, (g, n) => { const r = seeded(seed); g.fillStyle = base; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 2600; i++) { const x = r() * n, y = r() * n;
        if (snow) { g.fillStyle = `rgba(${r() < .5 ? '200,215,235' : '255,255,255'},.5)`; g.fillRect(x, y, 2, 2); }
        else { g.strokeStyle = shade(base, (r() - .5) * .22); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 3, y - 3 - r() * 4); g.stroke(); } } }));
  }
  const stripes = (a, b, n = 12) => tex(canvas(256, (g, s) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * s / n, 0, s / n + 1, s); } }));
  const hstripes = (a, b, n = 10) => tex(canvas(256, (g, s) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, i * s / n, s, s / n + 1); } }));
  const bannerTex = () => tex(canvas(256, (g, n) => {
    g.fillStyle = '#c93b6a'; g.fillRect(0, 0, n, n);
    g.fillStyle = '#e7b54a'; g.fillRect(0, 0, n, 14); g.fillRect(0, 0, 12, n); g.fillRect(n - 12, 0, 12, n);
    g.save(); g.translate(n / 2, n * .42); g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 26 : 62; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = '#f2c94c'; g.fill(); g.restore();
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < n; i += 6) g.fillRect(i, 0, 2, n); }));
  const cloudTex = () => tex(canvas(256, (g, n) => { const r = seeded(9);
    for (let i = 0; i < 26; i++) { const x = n * (.2 + r() * .6), y = n * (.45 + (r() - .5) * .25), rr = n * (.08 + r() * .12);
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); } }));
  const dotTex = () => tex(canvas(64, (g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }));

  /* ---------- season palette ---------- */
  const SEA = [
    {sky:['#7dbdf5','#e6f3ff'], fog:'#e3eef8', grass:'#86c060', leaves:['#f6b3cb','#f2a0bf','#fbd0de','#93c96c'], part:{color:'#ffb3cc', n:180, size:.55, fall:1.2}},
    {sky:['#3f9df0','#d6efff'], fog:'#d7ebfa', grass:'#6db347', leaves:['#4f9e3a','#5fae45','#3e8a30','#68b84c'], part:null},
    {sky:['#8fb6e0','#ffe6c8'], fog:'#f3e3cf', grass:'#b4a04c', leaves:['#e8862e','#d9542f','#e9b33a','#c9662a'], part:{color:'#e8862e', n:120, size:.65, fall:1.4}},
    {sky:['#9cb9d6','#eef4fa'], fog:'#e9f0f7', grass:'#f2f6fb', leaves:null, part:{color:'#ffffff', n:320, size:.45, fall:1.6}, snow:true}
  ];

  /* ---------- scene ---------- */
  let MAT = {};
  function materials(si){
    const P = SEA[si], stone = stonePair('#e8dfcf', 7), stoneDark = stonePair('#d9cdb8', 11);
    const roofRose = shinglePair('#c75b6e', 3), roofSlate = shinglePair('#5d7397', 5), cob = cobbles('#cfc6b8', 13), cobLight = cobbles('#e3d7c2', 17);
    /* one material per surface; each mesh scales its own UVs to its size (see add), so textures are shared, not copied */
    const cacheM = {};
    const sm = (pair, rx, ry, extra = {}) => { uvNext = [rx, ry]; const key = pair.map.uuid; return cacheM[key] || (cacheM[key] = smNew(pair, extra)); };
    const smNew = (pair, extra) => new T.MeshStandardMaterial(Object.assign({map: pair.map, bumpMap: pair.bump, bumpScale: .05, roughness: .93}, extra));
    MAT = {
      stone: (rx, ry) => sm(stone, rx, ry),
      stoneDark: (rx, ry) => sm(stoneDark, rx, ry),
      rose: (rx, ry) => sm(roofRose, rx, ry, {roughness: .7, bumpScale: .08}),
      slate: (rx, ry) => sm(roofSlate, rx, ry, {roughness: .65, bumpScale: .08}),
      cob: (rx, ry) => sm(cob, rx, ry, {roughness: 1}),
      cobLight: (rx, ry) => sm(cobLight, rx, ry, {roughness: 1}),
      grass: (rx, ry) => { uvNext = [rx, ry]; return cacheM.grass || (cacheM.grass = new T.MeshStandardMaterial({map: grass(P.grass, 21, !!P.snow), roughness: 1})); },
      gold: new T.MeshStandardMaterial({color: 0xd9ab45, metalness: .85, roughness: .3}),
      iron: new T.MeshStandardMaterial({color: 0x2d2f36, metalness: .7, roughness: .5}),
      wood: new T.MeshStandardMaterial({color: 0x7a4f32, roughness: .8}),
      glass: new T.MeshStandardMaterial({color: 0x3a3a46, emissive: 0xffc46a, emissiveIntensity: 1.1, roughness: .2, metalness: .1}),
      darkGlass: new T.MeshStandardMaterial({color: 0x1d2433, roughness: .3}),
      white: new T.MeshStandardMaterial({color: 0xf7f7f2, roughness: .6}),
      snow: new T.MeshStandardMaterial({color: 0xfafcff, roughness: .9}),
      enamel: new T.MeshStandardMaterial({color: 0xc9416f, roughness: .35, metalness: .15}),
      red: new T.MeshStandardMaterial({color: 0xc8323f, roughness: .5}),
      steel: new T.MeshStandardMaterial({color: 0xe9ecf2, metalness: .6, roughness: .35}),
      track: new T.MeshStandardMaterial({color: 0xe04a62, metalness: .4, roughness: .4}),
      lamp: new T.MeshStandardMaterial({color: 0xfff1c4, emissive: 0xffd98a, emissiveIntensity: .9}),
      green: new T.MeshStandardMaterial({color: 0x2f4a3c, metalness: .5, roughness: .5}),
      banner: new T.MeshStandardMaterial({map: bannerTex(), roughness: .85, side: T.DoubleSide}),
      awning: new T.MeshStandardMaterial({map: stripes('#d23c55', '#fbf3e6', 10), roughness: .8, side: T.DoubleSide}),
      canopy: new T.MeshStandardMaterial({map: stripes('#e24e6f', '#fff4dc', 16), roughness: .7, side: T.DoubleSide}),
      tower: new T.MeshStandardMaterial({map: hstripes('#d94352', '#f4f4f0', 14), roughness: .5, metalness: .2}),
      bark: new T.MeshStandardMaterial({color: 0x6e4a33, roughness: 1}),
      orb: new T.MeshStandardMaterial({color: 0x8fe0c4, emissive: 0x5fd6b0, emissiveIntensity: .7, roughness: .15, metalness: .1})
    };
  }
  let uvNext = null;
  /* materials by colour, shared */
  const colCache = {};
  const matC = (color, o = {}) => { const k = color + JSON.stringify(o); return colCache[k] || (colCache[k] = new T.MeshStandardMaterial(Object.assign({color}, o))); };
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, shadow = true) => {
    if (uvNext && geo.attributes.uv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvNext[0], uv.getY(i) * uvNext[1]); }
    uvNext = null;
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };

  /* a round tower: stone body, corbelled crown with merlons, tiled cone roof, gold finial and a flag */
  function roundTower(g, x, z, r, h, roof, opt = {}){
    const t = new T.Group(); t.position.set(x, 0, z); g.add(t);
    add(t, new T.CylinderGeometry(r, r * 1.04, h, 28, 1), MAT.stone(2 * Math.PI * r / 4, h / 4), 0, h / 2, 0);
    add(t, new T.CylinderGeometry(r + .45, r + .2, .9, 28), MAT.stoneDark(2 * Math.PI * r / 4, .3), 0, h + .2, 0);
    const n = Math.max(8, Math.round(2 * Math.PI * (r + .3) / 1.5));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const m = add(t, new T.BoxGeometry(.75, 1, .55), MAT.stoneDark(.3, .3), Math.sin(a) * (r + .25), h + 1.1, Math.cos(a) * (r + .25)); m.rotation.y = a; }
    const roofH = opt.roofH || r * 2.4;
    const cone = add(t, new T.ConeGeometry(r + .75, roofH, 28, 1, true), roof === 'slate' ? MAT.slate(10, 5) : MAT.rose(10, 5), 0, h + .7 + roofH / 2, 0);
    cone.material.side = T.DoubleSide;
    if (season === 3) add(t, new T.ConeGeometry((r + .75) * .55, roofH * .55, 28), MAT.snow, 0, h + .7 + roofH - roofH * .55 / 2 + .02, 0);
    add(t, new T.SphereGeometry(.28, 12, 10), MAT.gold, 0, h + .7 + roofH + .15, 0);
    add(t, new T.CylinderGeometry(.05, .05, 2.6, 6), MAT.gold, 0, h + .7 + roofH + 1.4, 0, false);
    const flag = new T.Mesh(new T.PlaneGeometry(1.8, 1, 8, 1), new T.MeshStandardMaterial({color: opt.flag || 0x3cc8b8, side: T.DoubleSide, roughness: .8}));
    flag.position.set(.95, h + .7 + roofH + 2.2, 0); flag.userData.dyn = true; t.add(flag);
    const base = flag.geometry.attributes.position.array.slice();
    anim.push(tt => { const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x0 = base[i*3]; p.setZ(i, Math.sin(tt * 3 + x0 * 2.2 + x) * .18 * (x0 + .9)); } p.needsUpdate = true; });
    /* windows facing the plaza */
    (opt.windows || []).forEach(wy => archWindow(t, 0, wy, r + .02, .7, 1.3));
    return t;
  }
  /* an arched, lit window set into a wall facing +z */
  function archWindow(parent, x, y, z, w, h){
    const s = new T.Shape(); s.moveTo(-w/2, 0); s.lineTo(-w/2, h - w/2); s.absarc(0, h - w/2, w/2, Math.PI, 0, true); s.lineTo(w/2, 0); s.closePath();
    const frame = new T.Shape(); const fw = w + .3, fh = h + .2; frame.moveTo(-fw/2, -.12); frame.lineTo(-fw/2, fh - fw/2); frame.absarc(0, fh - fw/2, fw/2, Math.PI, 0, true); frame.lineTo(fw/2, -.12); frame.closePath();
    add(parent, new T.ExtrudeGeometry(frame, {depth: .12, bevelEnabled: false}), MAT.stoneDark(.2, .2), x, y - .06, z - .02, false);
    add(parent, new T.ExtrudeGeometry(s, {depth: .1, bevelEnabled: false}), MAT.glass, x, y, z + .05, false);
  }
  function crenellate(g, x0, x1, y, z, d = .6, mat){
    for (let x = x0 + .5; x <= x1 - .5; x += 2) add(g, new T.BoxGeometry(1.05, 1.2, d), mat || MAT.stone(.3, .3), x, y + .6, z);
  }
  function wall(g, x0, x1, h, z, depth = 2.2){
    const w = x1 - x0;
    add(g, new T.BoxGeometry(w, h, depth), MAT.stone(w / 4, h / 4), (x0 + x1) / 2, h / 2, z);
    add(g, new T.BoxGeometry(w, .5, depth + .3), MAT.stoneDark(w / 4, .2), (x0 + x1) / 2, h - .2, z);
    crenellate(g, x0, x1, h, z + depth / 2 - .3);
    if (season === 3) add(g, new T.BoxGeometry(w, .12, depth + .3), MAT.snow, (x0 + x1) / 2, h + .06, z, false);
  }
  function tree(g, x, z, s, si){
    const P = SEA[si];
    if (!P.leaves) { /* winter: snowy pine */
      const t = new T.Group(); t.position.set(x, 0, z); g.add(t);
      add(t, new T.CylinderGeometry(.18 * s, .25 * s, 1.4 * s, 8), MAT.bark, 0, .7 * s, 0);
      [[1.9, 2.4, 1.6], [1.5, 2.1, 2.9], [1.05, 1.8, 4.1]].forEach(([r, h, y]) => {
        add(t, new T.ConeGeometry(r * s, h * s, 12), matC(0x2f6b52, {roughness: .9}), 0, y * s, 0);
        add(t, new T.ConeGeometry(r * s * .62, h * s * .45, 12), MAT.snow, 0, (y + h * .3) * s, 0, false); });
      return;
    }
    const t = new T.Group(); t.position.set(x, 0, z); g.add(t);
    add(t, new T.CylinderGeometry(.16 * s, .26 * s, 2.4 * s, 8), MAT.bark, 0, 1.2 * s, 0);
    const r = seeded(Math.round(x * 13 + z * 7) + 99);
    for (let i = 0; i < 7; i++) { const c = P.leaves[Math.floor(r() * P.leaves.length)];
      const m = add(t, new T.IcosahedronGeometry((.75 + r() * .5) * s, 1), matC(c, {roughness: .85, flatShading: true}),
        (r() - .5) * 1.6 * s, (2.6 + r() * 1.3) * s, (r() - .5) * 1.4 * s); m.rotation.set(r() * 3, r() * 3, 0); }
  }
  function lampPost(g, x, z){
    add(g, new T.CylinderGeometry(.09, .14, 3.6, 8), MAT.green, x, 1.8, z);
    add(g, new T.CylinderGeometry(.22, .3, .3, 8), MAT.green, x, .15, z);
    add(g, new T.SphereGeometry(.3, 14, 10), MAT.lamp, x, 3.85, z, false);
    add(g, new T.ConeGeometry(.34, .32, 8), MAT.green, x, 4.25, z);
  }
  function stanchion(g, x, z){ add(g, new T.CylinderGeometry(.05, .05, 1, 8), MAT.gold, x, .5, z, false); add(g, new T.CylinderGeometry(.2, .22, .06, 12), MAT.gold, x, .03, z, false); add(g, new T.SphereGeometry(.08, 8, 6), MAT.gold, x, 1.02, z, false); }
  function rope(g, a, b){
    const mid = new T.Vector3((a.x + b.x) / 2, .72, (a.z + b.z) / 2);
    const c = new T.QuadraticBezierCurve3(new T.Vector3(a.x, .95, a.z), mid, new T.Vector3(b.x, .95, b.z));
    add(g, new T.TubeGeometry(c, 10, .035, 6), MAT.red, 0, 0, 0, false);
  }
  function booth(g, x, z){
    add(g, new T.BoxGeometry(2.4, 2.6, 2), MAT.stone(.6, .6), x, 1.3, z);
    add(g, new T.BoxGeometry(1.6, .9, .06), MAT.glass, x, 1.65, z + 1.02, false);
    const aw = add(g, new T.PlaneGeometry(2.8, 1.1), MAT.awning, x, 2.55, z + 1.35, false); aw.rotation.x = -.55;
    add(g, new T.BoxGeometry(2.8, .35, 2.4), MAT.stoneDark(.6, .2), x, 2.75, z);
    add(g, new T.ConeGeometry(1.9, 1.3, 4, 1), MAT.rose(3, 2), x, 3.55, z).rotation.y = Math.PI / 4;
    add(g, new T.SphereGeometry(.14, 8, 6), MAT.gold, x, 4.25, z, false);
  }
  function turnstile(g, x, z){
    add(g, new T.BoxGeometry(.35, 1, .5), MAT.steel, x, .5, z);
    for (let i = 0; i < 3; i++) { const a = add(g, new T.CylinderGeometry(.03, .03, .7, 6), MAT.steel, x + .35, .85, z, false); a.rotation.z = Math.PI / 2; a.rotation.y = i * Math.PI * 2 / 3; }
  }

  /* ---------- natural clouds ----------
     Each cumulus is a cluster of soft, ragged puffs (one shared noise texture, randomly turned), domed on top
     with a flatter base: sunlit white on top and on the sun's side, cool grey-blue underneath. A thin haze band
     sits on the horizon. All puffs are one instanced mesh (a single draw call), drawn far to near, drifting slowly. */
  function puffTex(seed){
    return tex(canvas(128, (g, n) => {
      const img = g.createImageData(n, n), h = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7 + seed * 17.3) * 43758.5453; return v - Math.floor(v); };
      const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = (x - n / 2) / (n / 2), dy = (y - n / 2) / (n / 2), d = Math.sqrt(dx * dx + dy * dy);
        const nz = .5 * vn(x / 16, y / 16) + .3 * vn(x / 8, y / 8) + .2 * vn(x / 4, y / 4);
        const edge = Math.max(0, Math.min(1, (1 - d) / .55));
        const a = Math.max(0, Math.min(1, edge * edge * (3 - 2 * edge) * (.45 + nz * 1.1) - .08));
        const k = (y * n + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255); }
      g.putImageData(img, 0, 0); }));
  }
  const CLOUD_SKY = [
    {lit: '#ffffff', shade: '#aebdd3', count: 9, puffy: 1},
    {lit: '#ffffff', shade: '#a2b3cf', count: 11, puffy: 1.25},
    {lit: '#fff5e6', shade: '#c4b2a8', count: 9, puffy: .95},
    {lit: '#f6f8fb', shade: '#b4bdcc', count: 8, puffy: .7}
  ];
  function clouds(g, si){
    const C = CLOUD_SKY[si], r = seeded(4242 + si), gauss = () => (r() + r() + r() - 1.5) / 1.5;
    const lit = new T.Color(C.lit), shade = new T.Color(C.shade), puffs = [];
    /* cumulus: spread across the sky, a few near the middle so narrow phone screens see them too */
    const spots = [[-30, 78, -260], [42, 98, -300], [-110, 70, -230], [120, 84, -280], [6, 120, -340], [-190, 92, -320], [200, 74, -260], [-70, 112, -360], [90, 128, -380], [-150, 130, -400], [170, 110, -360]];
    spots.slice(0, C.count).forEach(([cx, cy, cz], ci) => {
      const w = (34 + r() * 30) * C.puffy, hgt = w * (.32 + r() * .14) * C.puffy, n = Math.round(22 + w * .35);
      for (let i = 0; i < n; i++) {
        const px = cx + gauss() * w * .32, side = (px - cx) / (w * .62), dome = Math.max(.15, 1 - side * side);
        const ty = Math.min(1, Math.abs(gauss()) * .8 * dome);          /* 0 = base of the cloud, 1 = top */
        const py = cy + ty * hgt, pz = cz + gauss() * w * .18;
        const size = w * (.2 + r() * .14) * (.55 + .6 * dome) * (1 - ty * .35);
        const sun = Math.max(0, Math.min(1, .25 + ty * .9 - side * .25));   /* sun from the upper left */
        if (ty > .45 && r() < .5) puffs.push({x: px + gauss() * size * .4, y: py + size * .22, z: pz + 1, cz, ty: ty + .01, s: size * (.45 + r() * .2), c: lit.clone(), rot: r() * 6, flat: .9});
        puffs.push({x: px, y: py, z: pz, cz, ty, s: size, c: shade.clone().lerp(lit, sun * sun * (3 - 2 * sun)), rot: r() * Math.PI * 2, flat: ty < .2 ? .55 + r() * .15 : .82 + r() * .2});
      }
    });
    /* haze band on the horizon */
    for (let i = 0; i < 26; i++) puffs.push({x: -260 + i * 21 + gauss() * 6, y: 26 + r() * 10, z: -420 - r() * 40, s: 60 + r() * 30, c: shade.clone().lerp(lit, .55), rot: r() * 6, flat: .28, alpha: .5});
    /* far clouds first; within a cloud the shaded base first and the sunlit tops last, so the light stays on top */
    puffs.sort((a, b) => (a.cz ?? a.z) - (b.cz ?? b.z) || (a.ty ?? 0) - (b.ty ?? 0));
    const mat = new T.MeshBasicMaterial({map: puffTex(7 + si), transparent: true, depthWrite: false, fog: false, opacity: .96});
    const im = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, puffs.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3();
    puffs.forEach((p, i) => { q.setFromEuler(e3.set(0, 0, p.rot)); m4.compose(v.set(p.x, p.y, p.z), q, sc.set(p.s, p.s * p.flat, 1)); im.setMatrixAt(i, m4);
      if (im.setColorAt) im.setColorAt(i, p.alpha ? p.c.clone().lerp(new T.Color(SEA[si].fog), .4) : p.c); });
    im.frustumCulled = false; im.renderOrder = -1; im.userData.dyn = true;
    g.add(im);
    anim.push(t => { im.position.x = Math.sin(t * .006) * 30; });
  }

  /* fuse every mesh that never moves into one mesh per material: a few dozen draw calls instead of hundreds */
  function mergeStatic(root){
    root.updateMatrixWorld(true);
    const buckets = new Map(), found = [];
    root.traverse(o => { if (!o.isMesh || o.isInstancedMesh) return; for (let a = o; a; a = a.parent) if (a.userData.dyn) return; found.push(o); });
    found.forEach(o => {
      let gm = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      gm.applyMatrix4(o.matrixWorld);
      const key = o.material.uuid + '|' + o.castShadow;
      if (!buckets.has(key)) buckets.set(key, {mat: o.material, cast: o.castShadow, list: []});
      buckets.get(key).list.push(gm);
      o.parent.remove(o); o.geometry.dispose();
    });
    buckets.forEach(b => {
      let n = 0; b.list.forEach(gm => n += gm.attributes.position.count);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let off = 0;
      b.list.forEach(gm => { const c = gm.attributes.position.count;
        pos.set(gm.attributes.position.array, off * 3);
        if (gm.attributes.normal) nor.set(gm.attributes.normal.array, off * 3);
        if (gm.attributes.uv) uv.set(gm.attributes.uv.array, off * 2);
        off += c; gm.dispose(); });
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const m = new T.Mesh(geo, b.mat); m.castShadow = b.cast; m.receiveShadow = true; root.add(m);
    });
  }
  /* fuse the fixed parts inside a moving group (wheel spokes and lights, carousel poles) in the group's own space */
  function mergeLocal(group, keep = () => true){
    const meshes = group.children.filter(o => o.isMesh && !o.isInstancedMesh && !o.userData.dyn && keep(o));
    const buckets = new Map();
    meshes.forEach(o => { o.updateMatrix(); let gm = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); gm.applyMatrix4(o.matrix);
      const k = o.material.uuid; if (!buckets.has(k)) buckets.set(k, {mat: o.material, list: []}); buckets.get(k).list.push(gm); group.remove(o); o.geometry.dispose(); });
    buckets.forEach(b => { let n = 0; b.list.forEach(gm => n += gm.attributes.position.count);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      b.list.forEach(gm => { pos.set(gm.attributes.position.array, off * 3); if (gm.attributes.normal) nor.set(gm.attributes.normal.array, off * 3); off += gm.attributes.position.count; gm.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.computeBoundingSphere();
      group.add(new T.Mesh(geo, b.mat)); });
  }
  function build(si){
    anim = []; partsObj = null;
    materials(si);
    const P = SEA[si];
    scene = new T.Scene();
    scene.background = tex(canvas(4, (g) => {}));
    const bg = canvas(64, (g, n) => { const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, P.sky[0]); gr.addColorStop(.75, P.sky[1]); gr.addColorStop(1, P.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, n, n); });
    scene.background = new T.CanvasTexture(bg); scene.background.encoding = T.sRGBEncoding;
    scene.fog = new T.Fog(P.fog, 110, 330);

    const hemi = new T.HemisphereLight(0xe8f3ff, 0x9a8a6a, .75); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff0d8, 1.35); sun.position.set(-45, 70, 55); sun.castShadow = true;
    Object.assign(sun.shadow.camera, {left: -70, right: 70, top: 70, bottom: -40, near: 10, far: 220});
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; scene.add(sun);
    const fill = new T.DirectionalLight(0xd8e6ff, .3); fill.position.set(40, 20, 60); scene.add(fill);

    const g = new T.Group(); scene.add(g);

    /* ground: grass, the cobbled plaza in front of the gate and the main street inside */
    add(g, new T.PlaneGeometry(700, 700), MAT.grass(120, 120), 0, 0, 0).rotation.x = -Math.PI / 2;
    const plaza = add(g, new T.PlaneGeometry(96, 150), MAT.cob(32, 50), 0, .02, 76.5); plaza.rotation.x = -Math.PI / 2;
    const street = add(g, new T.PlaneGeometry(9, 46), MAT.cobLight(3, 15), 0, .025, -21); street.rotation.x = -Math.PI / 2;
    const inner = add(g, new T.PlaneGeometry(80, 30), MAT.cob(25, 9), 0, .015, -12); inner.rotation.x = -Math.PI / 2;
    if (P.snow) [-1, 1].forEach(sd => { const s1 = add(g, new T.PlaneGeometry(30, 150), MAT.snow, sd * 33, .03, 76.5, false); s1.rotation.x = -Math.PI / 2; });

    /* gatehouse: a stone block with a real arched passage (the arch is part of the outline, extruded 3.2 m) */
    const gs = new T.Shape();
    gs.moveTo(-8.5, 0); gs.lineTo(-3.2, 0); gs.lineTo(-3.2, 5); gs.absarc(0, 5, 3.2, Math.PI, 0, true); gs.lineTo(3.2, 0); gs.lineTo(8.5, 0); gs.lineTo(8.5, 13); gs.lineTo(-8.5, 13); gs.closePath();
    const gmat = MAT.stone(.25, .25);
    add(g, new T.ExtrudeGeometry(gs, {depth: 3.2, bevelEnabled: false, curveSegments: 24}), gmat, 0, 0, -1.6);
    add(g, new T.BoxGeometry(17.6, .55, 3.8), MAT.stoneDark(4, .2), 0, 12.8, 0);
    crenellate(g, -8.6, 8.6, 13, 1.35);
    if (P.snow) add(g, new T.BoxGeometry(17.6, .12, 3.8), MAT.snow, 0, 13.1, 0, false);
    /* arch moulding, keystone, raised portcullis and the open wooden doors */
    const ring = add(g, new T.TorusGeometry(3.5, .3, 10, 32, Math.PI), MAT.stoneDark(1, .2), 0, 5, 1.62); ring.scale.z = .8;
    [-3.5, 3.5].forEach(x => add(g, new T.BoxGeometry(.6, 5, .5), MAT.stoneDark(.2, 1), x, 2.5, 1.62));
    add(g, new T.BoxGeometry(.9, 1.1, .7), MAT.stoneDark(.2, .2), 0, 8.55, 1.65);
    for (let x = -2.8; x <= 2.81; x += .56) add(g, new T.BoxGeometry(.1, 1.3, .1), MAT.iron, x, 7.7 - Math.abs(x) * .02, .2, false);
    add(g, new T.BoxGeometry(6, .1, .1), MAT.iron, 0, 7.4, .2, false);
    [-1, 1].forEach(sd => { const d = add(g, new T.BoxGeometry(.18, 6.4, 3), MAT.wood, sd * 3.05, 3.2, -.2); for (let k = 0; k < 3; k++) add(g, new T.BoxGeometry(.2, .14, 2.9), MAT.iron, sd * 3.03, 1 + k * 2.2, -.2, false); });
    /* the park's name sign over the arch (the zhuyin title is HTML laid over it) */
    const sign = new T.Shape(); { const w = 8.8, h = 2.2, r = 1.1; sign.moveTo(-w/2 + r, -h/2); sign.lineTo(w/2 - r, -h/2); sign.absarc(w/2 - r, 0, r, -Math.PI/2, Math.PI/2, false); sign.lineTo(-w/2 + r, h/2); sign.absarc(-w/2 + r, 0, r, Math.PI/2, Math.PI*1.5, false); }
    const frameS = new T.Shape(); { const w = 9.4, h = 2.7, r = 1.35; frameS.moveTo(-w/2 + r, -h/2); frameS.lineTo(w/2 - r, -h/2); frameS.absarc(w/2 - r, 0, r, -Math.PI/2, Math.PI/2, false); frameS.lineTo(-w/2 + r, h/2); frameS.absarc(-w/2 + r, 0, r, Math.PI/2, Math.PI*1.5, false); }
    add(g, new T.ExtrudeGeometry(frameS, {depth: .25, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2}), MAT.gold, 0, 10.4, 1.6);
    add(g, new T.ExtrudeGeometry(sign, {depth: .3, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2}), MAT.enamel, 0, 10.4, 1.7);
    add(g, new T.SphereGeometry(.35, 12, 10), MAT.gold, 0, 11.95, 1.85);
    /* windows on the gatehouse, banners on the walls */
    [-6, 6].forEach(x => archWindow(g, x, 7.4, 1.6, .8, 1.5));

    /* towers flanking the gate, the great corner towers, and towers further out for wide screens */
    roundTower(g, -10.6, .8, 2.5, 16, 'rose', {windows: [5.5, 10], flag: 0x3cc8b8});
    roundTower(g, 10.6, .8, 2.5, 16, 'rose', {windows: [5.5, 10], flag: 0xf2a33a});
    wall(g, -34, -12.8, 9, 0); wall(g, 12.8, 34, 9, 0);
    roundTower(g, -36, 0, 4.2, 21, 'rose', {windows: [7, 13], flag: 0xf2c94c, roofH: 10});
    roundTower(g, 36, 0, 4.2, 21, 'rose', {windows: [7, 13], flag: 0x8c7bff, roofH: 10});
    wall(g, -66, -40, 8, -1); wall(g, 40, 66, 8, -1);
    roundTower(g, -68, -1, 3.3, 17, 'rose', {windows: [8], flag: 0x3cc8b8});
    roundTower(g, 68, -1, 3.3, 17, 'rose', {windows: [8], flag: 0xf2a33a});
    wall(g, -110, -71, 8, -2); wall(g, 71, 110, 8, -2);
    [-29, -18, 18, 29].forEach(x => { const b = add(g, new T.PlaneGeometry(1.7, 4.4), MAT.banner, x, 6.2, 1.13, false); });
    [-23, 23, -52, 52].forEach(x => archWindow(g, x, 4.2, 1.1, .7, 1.4));

    /* the ticket check: booths, turnstiles across the arch, and roped queue lanes on the plaza */
    booth(g, -6.6, 5.2); booth(g, 6.6, 5.2);
    [-2.2, -.4, 1.4].forEach(x => turnstile(g, x, 2.6));
    const lanes = [-2.6, -.6, 1.4, 3.4];
    lanes.forEach(x => { for (let z = 4.5; z <= 14.5; z += 2.5) stanchion(g, x, z); });
    lanes.forEach(x => { for (let z = 4.5; z < 14.5; z += 2.5) rope(g, {x, z}, {x, z: z + 2.5}); });
    [[-4.6, 10], [4.6, 10], [-4.6, 20], [4.6, 20]].forEach(([x, z]) => lampPost(g, x, z));
    for (let z = 14; z <= 110; z += 12) [-11, 11].forEach(x => lampPost(g, x, z));
    /* planters with flowers by the gate */
    const flowerCols = si === 3 ? [0xffffff, 0xe6eef7] : si === 2 ? [0xf08a2c, 0xe5553a, 0xf2bb38] : [0xff8fb3, 0xffd84d, 0xffffff, 0xc7a6ff];
    [-12.5, 12.5].forEach(x => {
      add(g, new T.BoxGeometry(5, .8, 2.6), MAT.stoneDark(1.2, .3), x, .4, 4.2);
      const fl = new T.InstancedMesh(new T.SphereGeometry(.17, 8, 6), new T.MeshStandardMaterial({roughness: .8}), 60);
      const r = seeded(Math.abs(x * 31)), mtx = new T.Matrix4(), col = new T.Color();
      for (let i = 0; i < 60; i++) { mtx.setPosition(x + (r() - .5) * 4.4, .9 + r() * .2, 4.2 + (r() - .5) * 2.1); fl.setMatrixAt(i, mtx);
        if (fl.setColorAt) fl.setColorAt(i, col.set(flowerCols[i % flowerCols.length])); }
      fl.castShadow = true; g.add(fl);
      if (si !== 3) add(g, new T.BoxGeometry(4.8, .25, 2.4), new T.MeshStandardMaterial({color: 0x5b8f3c, roughness: 1}), x, .85, 4.2, false);
    });
    /* seasonal touches in view of the gate: planters with a small tree, a garland across the gatehouse, leaves on the ground */
    [-10.6, 10.6].forEach(x => {
      add(g, new T.CylinderGeometry(1.5, 1.3, 1, 24), MAT.stoneDark(1.2, .3), x, .5, 6.2);
      add(g, new T.CylinderGeometry(1.35, 1.35, .1, 24), new T.MeshStandardMaterial({color: si === 3 ? 0xf6f9fd : 0x5a3f2c, roughness: 1}), x, 1.02, 6.2, false);
      const pg = new T.Group(); pg.position.set(0, 1, 0); g.add(pg); tree(pg, x, 6.2, .62, si);
      if (si === 2) [[-.9, .5], [.8, .7], [.2, -.9]].forEach(([dx, dz]) => { const pm = add(g, new T.SphereGeometry(.32, 12, 8), new T.MeshStandardMaterial({color: 0xe8862e, roughness: .6}), x + dx, 1.3, 6.2 + dz); pm.scale.y = .75; });
    });
    {
      const GC = [[0xff9fbf, 0xffffff, 0xffd0e0, 0xf6b3cb], [0xf2c94c, 0x3cc8b8, 0xe24e6f, 0x5fb8ff], [0xe8862e, 0xd9542f, 0xe9b33a, 0x8c4a2a], [0x2f6b52, 0x2f6b52, 0xc8323f, 0x2f6b52]][si];
      const swags = [[-8.3, -4.7], [4.7, 8.3]], n = 26, mtx = new T.Matrix4(), col = new T.Color();
      const im = new T.InstancedMesh(si === 1 ? new T.ConeGeometry(.2, .42, 3) : new T.IcosahedronGeometry(.2, 0), new T.MeshStandardMaterial({roughness: .7, flatShading: true}), n * 2);
      let k = 0;
      swags.forEach(([x0, x1]) => { for (let i = 0; i < n; i++) { const u = i / (n - 1), x = x0 + (x1 - x0) * u, y = 9.5 - Math.sin(u * Math.PI) * .9;
        const q = new T.Quaternion(); if (si === 1) q.setFromEuler(new T.Euler(Math.PI, 0, 0));
        mtx.compose(new T.Vector3(x, y, 1.75), q, new T.Vector3(1, 1, 1)); im.setMatrixAt(k, mtx); if (im.setColorAt) im.setColorAt(k, col.set(GC[(i * 7 + k) % GC.length])); k++; } });
      g.add(im);
      if (si === 1) swags.forEach(([x0, x1]) => { const c = new T.QuadraticBezierCurve3(new T.Vector3(x0, 9.55, 1.76), new T.Vector3((x0 + x1) / 2, 7.75, 1.76), new T.Vector3(x1, 9.55, 1.76)); add(g, new T.TubeGeometry(c, 16, .03, 4), MAT.iron, 0, 0, 0, false); });
      if (si === 3) swags.forEach(([x0, x1]) => add(g, new T.SphereGeometry(.28, 10, 8), MAT.red, (x0 + x1) / 2, 8.55, 1.85, false));
      [[-8.3, 9.5], [-4.7, 9.5], [4.7, 9.5], [8.3, 9.5]].forEach(([x, y]) => add(g, new T.SphereGeometry(.32, 10, 8), si === 3 ? MAT.red : MAT.gold, x, y, 1.8, false));
    }
    if (si === 2) { const n = 260, im = new T.InstancedMesh(new T.CircleGeometry(.16, 5), new T.MeshStandardMaterial({roughness: 1, side: T.DoubleSide}), n), r = seeded(55), mtx = new T.Matrix4(), col = new T.Color(), cols = [0xe8862e, 0xd9542f, 0xe9b33a, 0xa65a2a];
      for (let i = 0; i < n; i++) { const q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, r() * 6)); mtx.compose(new T.Vector3((r() - .5) * 40, .04, 3 + r() * 70), q, new T.Vector3(1, 1, 1)); im.setMatrixAt(i, mtx); if (im.setColorAt) im.setColorAt(i, col.set(cols[i % 4])); }
      g.add(im); }

    /* trees around the plaza and inside the walls */
    for (let z = 20; z <= 110; z += 13) [-17, 17].forEach((x, i) => tree(g, x + (i ? 1 : -1) * ((z / 13) % 2) * 2, z, 1.15 + ((z / 13) % 3) * .12, si));
    [[-24, 10, 1.2], [24, 10, 1.2], [-32, 22, 1.5], [33, 24, 1.5],
     [-14, -10, 1.3], [14, -9, 1.2], [-24, -14, 1.5], [26, -16, 1.4], [-8, -26, 1.1], [9, -27, 1.2]].forEach(([x, z, s]) => tree(g, x, z, s, si));

    /* ---- inside the park ---- */
    /* the first stop waiting on the main street: a glowing orb on a pedestal */
    add(g, new T.CylinderGeometry(.9, 1.1, .6, 20), MAT.stoneDark(.6, .2), 0, .3, -15);
    const orb = add(g, new T.SphereGeometry(.75, 24, 18), MAT.orb, 0, 1.45, -15); orb.userData.dyn = true;
    anim.push(t => { orb.position.y = 1.45 + Math.sin(t * 2) * .12; MAT.orb.emissiveIntensity = .55 + Math.sin(t * 3) * .2; });
    [[-3.6, -6], [3.6, -6], [-3.6, -16], [3.6, -16]].forEach(([x, z]) => lampPost(g, x, z));
    /* carousel, peeking past the edge of the arch */
    const car = new T.Group(); car.position.set(-9, 0, -12); g.add(car);
    add(car, new T.CylinderGeometry(4, 4.2, .6, 32), MAT.white, 0, .3, 0);
    add(car, new T.CylinderGeometry(.35, .35, 4.2, 12), MAT.gold, 0, 2.6, 0);
    add(car, new T.ConeGeometry(4.6, 2.2, 32, 1, true), MAT.canopy, 0, 5.8, 0).material.side = T.DoubleSide;
    add(car, new T.CylinderGeometry(4.6, 4.6, .5, 32, 1, true), MAT.canopy, 0, 4.45, 0);
    add(car, new T.SphereGeometry(.3, 10, 8), MAT.gold, 0, 7.05, 0);
    const spin = new T.Group(); spin.userData.dyn = true; car.add(spin);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 3, z = Math.sin(a) * 3;
      add(spin, new T.CylinderGeometry(.05, .05, 3.6, 6), MAT.gold, x, 2.6, z, false);
      const horse = add(spin, new T.BoxGeometry(.4, .55, 1.2), new T.MeshStandardMaterial({color: [0xfdfdfd, 0xf5c3d3, 0xbfe3f5, 0xf7e2a8][i % 4], roughness: .5}), x, 1.6, z);
      horse.rotation.y = -a; horse.userData.a = a; }
    mergeLocal(spin, m => m.userData.a === undefined);
    anim.push(t => { spin.rotation.y = t * .5; spin.children.forEach(c => { if (c.userData.a !== undefined) c.position.y = 1.6 + Math.sin(t * 2 + c.userData.a * 2) * .25; }); });

    /* the keep at the end of the main street: tall walls, corner turrets, slate roofs, a gold-tipped spire */
    const keep = new T.Group(); keep.position.set(0, 0, -46); g.add(keep);
    add(keep, new T.BoxGeometry(18, 26, 14), MAT.stone(4.5, 6.5), 0, 13, 0);
    add(keep, new T.BoxGeometry(18.8, .7, 14.8), MAT.stoneDark(4, .2), 0, 26, 0);
    const pyr = add(keep, new T.ConeGeometry(12.6, 12, 4, 1), MAT.slate(8, 4), 0, 32.3, 0); pyr.rotation.y = Math.PI / 4;
    if (P.snow) { const sp = add(keep, new T.ConeGeometry(7, 6.6, 4), MAT.snow, 0, 35.1, 0, false); sp.rotation.y = Math.PI / 4; }
    roundTower(keep, 0, 0, 2.6, 34, 'slate', {roofH: 12, flag: 0xc93b6a});
    [[-9, 7], [9, 7], [-9, -7], [9, -7]].forEach(([x, z]) => roundTower(keep, x, z, 1.9, 29, 'slate', {roofH: 6.5, flag: 0x3cc8b8}));
    for (let row = 0; row < 3; row++) for (const x of [-5, 0, 5]) archWindow(keep, x, 6 + row * 6.5, 7.02, 1.1, 2.2);
    /* the inner wall behind the plaza */
    wall(g, -40, -6, 12, -30, 2); wall(g, 6, 40, 12, -30, 2);

    /* ---- rides over the walls ---- */
    /* Ferris wheel: two rims, spokes, an A-frame, and gondolas that stay level as it turns */
    const fw = new T.Group(); fw.position.set(19, 16, -30); fw.rotation.y = -.35; fw.userData.dyn = true; g.add(fw);
    const wheel = new T.Group(); fw.add(wheel);
    const RW = 13;
    [-1, 1].forEach(sd => { add(wheel, new T.TorusGeometry(RW, .2, 8, 64), MAT.steel, 0, 0, sd * .9, false);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const sp = add(wheel, new T.CylinderGeometry(.07, .07, RW, 6), MAT.steel, Math.cos(a) * RW / 2, Math.sin(a) * RW / 2, sd * .9, false); sp.rotation.z = a - Math.PI / 2; } });
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; add(wheel, new T.SphereGeometry(.16, 6, 4), MAT.lamp, Math.cos(a) * (RW + .3), Math.sin(a) * (RW + .3), 1.0, false); }
    add(fw, new T.CylinderGeometry(.8, .8, 2.6, 16), MAT.steel, 0, 0, 0, false).rotation.x = Math.PI / 2;
    [-1, 1].forEach(sd => [-1, 1].forEach(fz => { const leg = add(fw, new T.CylinderGeometry(.3, .4, 17.5, 8), MAT.steel, sd * 4.6, -8.2, fz * 2.2); leg.rotation.z = sd * .28; leg.rotation.x = -fz * .12; }));
    const gcols = [0xe24e6f, 0xf2c94c, 0x3cc8b8, 0x8c7bff, 0xf28a3a, 0x5fb8ff];
    /* 16 gondolas drawn as three instanced batches (body, roof, hanger), moved together each frame */
    const gBody = new T.InstancedMesh(new T.CylinderGeometry(.85, .85, 1.2, 16), new T.MeshStandardMaterial({roughness: .45, metalness: .2}), 16);
    const gRoof = new T.InstancedMesh(new T.ConeGeometry(1, .6, 16), MAT.white, 16), gRod = new T.InstancedMesh(new T.CylinderGeometry(.05, .05, 1, 6), MAT.steel, 16);
    const gc = new T.Color(); for (let i = 0; i < 16; i++) if (gBody.setColorAt) gBody.setColorAt(i, gc.set(gcols[i % 6]));
    [gBody, gRoof, gRod].forEach(m => fw.add(m));
    const gm = new T.Matrix4();
    anim.push(t => { const a0 = t * .12; wheel.rotation.z = a0;
      for (let i = 0; i < 16; i++) { const a = a0 + i / 16 * Math.PI * 2, x = Math.cos(a) * RW, y = Math.sin(a) * RW;
        gm.makeTranslation(x, y - 1.5, 0); gBody.setMatrixAt(i, gm); gm.makeTranslation(x, y - .6, 0); gRoof.setMatrixAt(i, gm); gm.makeTranslation(x, y - .4, 0); gRod.setMatrixAt(i, gm); }
      gBody.instanceMatrix.needsUpdate = gRoof.instanceMatrix.needsUpdate = gRod.instanceMatrix.needsUpdate = true; });
    mergeLocal(wheel); mergeLocal(fw);

    /* roller coaster: a closed steel track with a lift hill, a drop and a vertical loop; a three-car train */
    const C = new T.Group(); C.position.set(-44, 0, -46); C.rotation.y = .3; g.add(C);
    const pts = [[-18,2,6],[-10,2,6],[-3,14,6],[1,15,5],[6,4,3],[10,2,1],[14,2.5,0],[18.5,5,.3],[20,9.5,.7],[18,14,1.1],[14,15.8,1.5],[10,14,1.9],[8.4,9.5,2.3],[10.5,5,2.7],[15,2.6,3],[22,2.5,3.2],[28,3.5,0],[28,5,-8],[20,8,-12],[8,10,-12],[-6,4,-12],[-16,2.5,-8],[-21,2,0]]
      .map(([x, y, z]) => new T.Vector3(x, y, z));
    const curve = new T.CatmullRomCurve3(pts, true, 'centripetal');
    add(C, new T.TubeGeometry(curve, 400, .28, 8, true), MAT.track, 0, 0, 0, false);
    add(C, new T.TubeGeometry(curve, 400, .12, 6, true), MAT.steel, 0, -.55, 0, false);
    for (let u = 0; u < 1; u += .012) { const p = curve.getPointAt(u); if (p.y < 2.2) continue;
      add(C, new T.CylinderGeometry(.09, .12, p.y - .6, 6), MAT.steel, p.x, (p.y - .6) / 2, p.z, false); }
    const cars = [0, 1, 2].map(i => { const m = add(C, new T.BoxGeometry(1, .8, 1.7), new T.MeshStandardMaterial({color: [0xf2c94c, 0x3cc8b8, 0x8c7bff][i], roughness: .4, metalness: .3}), 0, 0, 0, false); return m; });
    cars.forEach(m => m.userData.dyn = true);
    const tmp = new T.Vector3();
    anim.push(t => { cars.forEach((m, i) => { const u = ((t * .045) - i * .012 + 10) % 1; const p = curve.getPointAt(u); m.position.copy(p).y += .7; tmp.copy(curve.getTangentAt(u)).add(p); tmp.y += .7; m.lookAt(tmp); }); });

    /* drop tower */
    const dt = new T.Group(); dt.position.set(-20, 0, -64); g.add(dt);
    add(dt, new T.CylinderGeometry(1, 1.2, 46, 16), MAT.tower, 0, 23, 0);
    add(dt, new T.CylinderGeometry(2.2, 1.4, 2, 16), MAT.white, 0, 47, 0);
    add(dt, new T.SphereGeometry(.6, 10, 8), MAT.gold, 0, 48.6, 0);
    const ringCar = add(dt, new T.TorusGeometry(2.3, .45, 10, 28), new T.MeshStandardMaterial({color: 0xf2c94c, roughness: .4, metalness: .3}), 0, 6, 0, false); ringCar.rotation.x = Math.PI / 2; ringCar.userData.dyn = true;
    anim.push(t => { const c = (t % 9) / 9; ringCar.position.y = c < .75 ? 4 + c / .75 * 38 : 42 - Math.pow((c - .75) / .25, 2) * 38; });

    /* hot-air balloons and clouds in the sky; distant hills */
    const balloon = (x, y, z, c1, c2) => { const b = new T.Group(); b.position.set(x, y, z); b.userData.dyn = true; g.add(b);
      const env = add(b, new T.SphereGeometry(4, 20, 16), new T.MeshStandardMaterial({map: stripes(c1, c2, 12), roughness: .7}), 0, 0, 0, false); env.scale.y = 1.18;
      add(b, new T.BoxGeometry(1.4, 1.1, 1.4), MAT.wood, 0, -6.4, 0, false);
      anim.push(t => { b.position.y = y + Math.sin(t * .4 + x) * 1.2; }); };
    balloon(-48, 46, -95, '#f2c94c', '#e24e6f'); balloon(44, 54, -120, '#8fe0c4', '#ffffff'); balloon(-5, 62, -150, '#c7b8ff', '#ff8fb3');
    clouds(g, si);
    const hillMat = new T.MeshStandardMaterial({color: P.snow ? 0xe8eef5 : si === 2 ? 0xc8a25a : 0x7fb36a, roughness: 1});
    [[-120, -200, 60], [40, -230, 80], [170, -190, 55]].forEach(([x, z, r]) => { const h = add(g, new T.SphereGeometry(r, 24, 12), hillMat, x, -r * .55, z, false); h.scale.y = .55; });

    /* falling petals, leaves or snow */
    if (P.part) {
      const n = P.part.n, pos = new Float32Array(n * 3), r = seeded(77);
      for (let i = 0; i < n; i++) { pos[i*3] = (r() - .5) * 40; pos[i*3+1] = r() * 30; pos[i*3+2] = (r() - .5) * 40; }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const pts2 = new T.Points(geo, new T.PointsMaterial({color: P.part.color, size: P.part.size, map: dotTex(), transparent: true, depthWrite: false, sizeAttenuation: true}));
      g.add(pts2); partsObj = pts2;
      anim.push((t, d) => { const a = geo.attributes.position; for (let i = 0; i < n; i++) { let y = a.getY(i) - d * P.part.fall; if (y < 0) y = 30; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * d * .4); } a.needsUpdate = true; });
    }
    /* shadows are drawn once: nothing that moves casts one */
    mergeStatic(scene);
    R.shadowMap.needsUpdate = true;
  }

  /* ---------- camera framing: the gate fills the gate button's area; the rest of the castle fills the screen ---------- */
  const FOV = 36, GH = 26, LOOK_Y = 11.5, CAM_Y = 5.2;
  /* how much of the castle front must fit across the gate area: on narrow screens the gate towers may run off the edges */
  const gw = (W, H) => W / H < .8 ? 22 : W / H < 1.2 ? 25 : 28;
  function framing(){
    const sec = document.getElementById('gate'), btn = document.getElementById('gateBtn');
    const S = sec.getBoundingClientRect(), B = btn.getBoundingClientRect();
    const W = Math.max(1, Math.round(S.width)), H = Math.max(1, Math.round(S.height));
    const tv = Math.tan(FOV / 2 * Math.PI / 180), th = tv * W / H;
    const bw = Math.max(120, B.width), bh = Math.max(120, B.height);
    const d = Math.max(gw(W, H) * W / (2 * th * bw * .98), GH * H / (2 * tv * bh * .97));
    const cy = B.top - S.top + bh / 2, cx = B.left - S.left + bw / 2;
    return {W, H, d, oy: H / 2 - cy, ox: W / 2 - cx, S, B};
  }
  function place(f, k = 0){
    /* k: 0 = standing at the ticket gate, 1 = through the arch and into the park */
    const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const z = f.d + 1.6 + (-3 - f.d - 1.6) * e, y = CAM_Y + (3.4 - CAM_Y) * e;
    cam.position.set(0, y, z);
    cam.lookAt(0, LOOK_Y + (15 - LOOK_Y) * e, -46 * e);
    /* the view widens as you pass through the arch, so the park opens up around you (more on narrow screens) */
    const wide = f.W / f.H < 1 ? 64 : 52;
    cam.fov = FOV + (wide - FOV) * Math.max(0, (e - .45) / .55);
    cam.setViewOffset(f.W, f.H, f.ox * (1 - e), f.oy * (1 - e), f.W, f.H);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  /* lay the HTML title over the 3D sign */
  const v3 = () => new T.Vector3();
  function placeTitle(f){
    const el = document.getElementById('gateSign'); if (!el) return;
    const toPx = v => { v.project(cam); return [(v.x + 1) / 2 * f.W, (1 - v.y) / 2 * f.H]; };
    const [lx, ly] = toPx(v3().set(-4.2, 10.4, 2.05)), [rx] = toPx(v3().set(4.2, 10.4, 2.05)), [, ty] = toPx(v3().set(0, 11.5, 2.05)), [, by] = toPx(v3().set(0, 9.3, 2.05));
    const ox = f.B.left - f.S.left, oy = f.B.top - f.S.top;
    Object.assign(el.style, {left: (lx - ox) + 'px', top: (ty - oy) + 'px', width: (rx - lx) + 'px', height: (by - ty) + 'px', fontSize: ((rx - lx) / 7.4) + 'px'});
  }

  /* adapt to the device: if frames come slowly, step down (lower resolution, then no shadows); if it is still
     too slow, use the illustrated castle instead */
  let level = 0, slow = [], winT = 0, settleUntil = 0;
  function adapt(dtMs, now){
    if (window.G3D_NOADAPT || walk) return;
    if (now < settleUntil) { slow = []; winT = now; return; }
    slow.push(dtMs);
    if (now - winT < 1500 || slow.length < 5) return;
    const med = slow.sort((a, b) => a - b)[slow.length >> 1]; slow = []; winT = now;
    if (med < 40) return;
    level++; settleUntil = now + 800;
    if (level === 1) { R.setPixelRatio(1); resize(); }
    else if (level === 2) { R.setPixelRatio(.75); R.shadowMap.enabled = false; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); resize(); }
    else { console.info('3D entrance too slow on this device; using the illustrated castle.'); failed = true; stop(); disable(); }
  }
  function render(now){
    if (!running) return;
    raf = requestAnimationFrame(render);
    const t = now / 1000, d = Math.min(.05, last ? t - last : .016);
    if (last) adapt((t - last) * 1000, now);
    last = t;
    anim.forEach(a => a(t, d));
    if (walk) { const k = Math.min(1, (now - walk.t0) / walk.ms); place(frame, k); if (k >= 1) walk.done = true; }
    if (partsObj) partsObj.position.set(cam.position.x, 0, cam.position.z - 22);
    placeTitle(frame);
    R.render(scene, cam);
  }
  /* for checking the walk-through one step at a time */
  function peek(k){ if (!ok) return; place(frame, k); if (partsObj) partsObj.position.set(cam.position.x, 0, cam.position.z - 28); placeTitle(frame); R.render(scene, cam); }
  function resize(){
    if (!ok || !holder) return;
    frame = framing();
    R.setSize(frame.W, frame.H, false);
    cam.aspect = frame.W / frame.H;
    place(frame, walk ? Math.min(1, (performance.now() - walk.t0) / walk.ms) : 0);
  }
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resize, 100); });

  function init(){
    if (ok) return true;
    if (!supported()) return false;
    try {
      const sec = document.getElementById('gate');
      holder = document.createElement('div'); holder.id = 'gate3d'; holder.setAttribute('aria-hidden', 'true');
      sec.insertBefore(holder, sec.firstChild);
      R = new T.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
      R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
      R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; R.shadowMap.autoUpdate = false;
      maxAniso = Math.min(8, R.capabilities.getMaxAnisotropy());
      holder.appendChild(R.domElement);
      R.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; stop(); disable(); });
      cam = new T.PerspectiveCamera(FOV, 1, .5, 900);
      ok = true;
      sec.classList.add('g3d');
      return true;
    } catch(e) { console.warn('3D entrance unavailable; using the illustrated castle.', e); failed = true; disable(); return false; }
  }
  function disable(){
    ok = false;
    const sec = document.getElementById('gate'); if (sec) sec.classList.remove('g3d');
    if (holder) holder.remove();
    if (typeof Castle !== 'undefined') Castle.draw();
  }
  function disposeScene(){ if (!scene) return; scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { Object.values(m).forEach(v => v && v.isTexture && v.dispose()); m.dispose(); }); }); scene = null; }
  function start(){
    if (!init()) return false;
    const si = typeof Seasons !== 'undefined' && Seasons.current >= 0 ? Seasons.current : 0;
    if (si !== season || !scene) { disposeScene(); season = si; try { build(si); } catch(e) { console.warn('3D entrance failed to build; using the illustrated castle.', e); failed = true; disable(); return false; } }
    walk = null;
    resize();
    if (!running && !document.hidden) { running = true; last = 0; settleUntil = performance.now() + 1200; raf = requestAnimationFrame(render); }
    return true;
  }
  function stop(){ running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (ok && current === 'gate') start(); });
  /* walk through the gate: the camera moves down the plaza, through the arch and into the park */
  function enter(ms = 1700){ if (!ok) return 0; walk = {t0: performance.now(), ms}; return ms; }
  return {start, stop, enter, peek, get active(){ return ok; }, get info(){ return R && {calls: R.info.render.calls, tris: R.info.render.triangles, geos: R.info.memory.geometries, tex: R.info.memory.textures}; }};
})();
