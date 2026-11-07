'use strict';
/* ---------- 3D stage: a Spline scene when one is set in spline/scenes.js, the built-in three.js model otherwise ---------- */
const SPL = window.LL_SPLINE || {characters:{}};
const absUrl = p => new URL(p, document.baseURI).href;
const slotOf = kind => (SPL.characters || {})[kind] || {};
const GEAR = ['Scarf', 'Backpack', 'Crown'];

const GUIDES = ['owl', 'deer'];
/* pictures: a Spline poster if one is set, else the pre-rendered picture of the built-in model */
function posterFor(kind, st){
  const p = slotOf(kind).poster;
  if (p) return Array.isArray(p) ? p[Math.min(st, p.length - 1)] : p;
  return `cast/portraits/${kind}-${GUIDES.includes(kind) ? 0 : Math.min(st, 3)}.png`;
}
function heroHTML(kind, st=0, cls=''){
  return `<img class="${cls}" src="${posterFor(kind, st)}" alt="" data-fallback="${kind}:${st}">`;
}
const npcHTML = kind => heroHTML(kind, 0, 'npc');
/* a poster that fails to load swaps itself for the built-in picture */
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;
  const [kind, st] = img.dataset.fallback.split(':');
  img.outerHTML = svgHero(kind).replace('<svg', `<svg class="${img.className}"`);
}, true);

const Spl = {mod:null, apps:{}, failed:new Set(), token:0, liveKind:null, liveBox:null};
function splineModule(){
  if (!Spl.mod) Spl.mod = import(absUrl(SPL.runtime || 'spline/runtime/runtime.standalone.webgl.js'));
  return Spl.mod;
}
/* one Spline app per role ("hero" for the big stage, "gate" for the entrance), each on its own canvas */
async function splineApp(role){
  if (Spl.apps[role]) return Spl.apps[role];
  const {Application} = await splineModule();
  const canvas = document.createElement('canvas');
  canvas.className = 'spline-cv';
  const app = new Application(canvas, {wasmPath: absUrl(SPL.wasmPath || 'spline/runtime'), renderMode:'auto'});
  return Spl.apps[role] = {app, canvas, scene:null};
}
async function loadInto(role, box, scene){
  const s = await splineApp(role);
  s.canvas.classList.remove('on');
  box.append(s.canvas);
  if (s.scene !== scene) { await s.app.load(absUrl(scene)); s.scene = scene; }
  s.app.play();
  return s;
}
function credit(box){
  if (box.parentElement && !box.parentElement.querySelector(':scope > .spline-credit')) box.insertAdjacentHTML('afterend', '<p class="spline-credit">Made with Spline</p>');
}
function applyGear(app, st){
  try { app.setVariable('stage', st); } catch(e) {}
  GEAR.forEach((name, i) => { try { const o = app.findObjectByName(name); if (o) o.visible = st >= i + 1; } catch(e) {} });
}

/* big animated character on the select and reward screens */
async function mountStage(box, kind, st){
  const token = ++Spl.token;
  Spl.liveKind = null; Spl.liveBox = box;
  box.classList.remove('live');
  box.innerHTML = heroHTML(kind, st, 'stage-poster');
  threeMount(box, kind, st);
  const scene = slotOf(kind).scene;
  if (!scene || Spl.failed.has(kind)) return;
  try {
    const s = await loadInto('hero', box, scene);
    if (token !== Spl.token || !box.isConnected) return;
    applyGear(s.app, st);
    if (R3.liveCanvas && R3.liveCanvas.parentElement === box) R3.liveCanvas.remove();
    s.canvas.classList.add('on'); box.classList.add('live');
    Spl.liveKind = kind;
    credit(box);
  } catch(e) {
    Spl.failed.add(kind);
    console.warn(`Spline scene for ${kind} did not load; using the built-in model.`, e);
  }
}
function cheerStage(){
  const s = Spl.apps.hero;
  if (Spl.liveKind && s && s.canvas.isConnected) { try { s.app.emitEvent('mouseDown', 'Hero'); } catch(e) {} }
  else threeCheer();
}
/* stop Spline rendering for anything no longer on screen */
function pauseStages(){
  Object.values(Spl.apps).forEach(s => { if (!s.canvas.isConnected || s.canvas.offsetParent === null) { try { s.app.stop(); } catch(e) {} } });
}

/* the moon gate: a Spline scene replaces the drawn gate once it has loaded */
const Gate = {spline:false};
async function mountGate(btn){
  const scene = SPL.gate && SPL.gate.scene;
  if (!scene) return;
  try {
    const s = await loadInto('gate', btn, scene);
    btn.classList.add('has-spline');
    s.canvas.classList.add('on');
    Gate.spline = true;
    credit(btn);
  } catch(e) { console.warn('Spline gate scene did not load; using the drawn gate.', e); }
}
/* returns how long the opening animation needs before the screen changes */
function openGate(btn){
  if (Gate.spline) { try { Spl.apps.gate.app.emitEvent('mouseDown', 'Gate'); } catch(e) {} return SPL.gate.openMs || 900; }
  btn.classList.add('open');
  return 650;
}
const splineInUse = () => Object.values(SPL.characters || {}).some(c => c && (c.scene || c.poster)) || !!(SPL.gate && SPL.gate.scene);
