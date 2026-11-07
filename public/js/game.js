'use strict';
/* ---------- icons ---------- */
const SPEAKER = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="${INK}"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const BACK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 4 12l6 6" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12h9a5 5 0 0 1 0 10h-2" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
const ARROW = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" fill="#a9acdc"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#a9acdc" stroke-width="2.5" fill="none"/></svg>`;
const BOOK = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="5" width="28" height="31" rx="5" fill="#ffc4b0"/><rect x="6" y="5" width="7" height="31" rx="3" fill="#f26b3a"/><circle cx="24" cy="18" r="7" fill="#fff6e6"/><circle cx="21.5" cy="17" r="1.3" fill="${INK}"/><circle cx="26.5" cy="17" r="1.3" fill="${INK}"/><path d="M21.5 20.5 Q24 22.5 26.5 20.5" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M16 30h14" stroke="#fff6e6" stroke-width="2.5" stroke-linecap="round"/></svg>`;

const HOME = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 28V13h4v3h3v-6h8v6h3v-3h4v15Z" fill="#b3a8ff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M11 10 16 3l5 7Z" fill="#ff6fa3" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M13 28v-6a3 3 0 0 1 6 0v6" fill="#7a5440" stroke="${INK}" stroke-width="2"/></svg>`;

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const SCREENS = ['gate','select','map','lesson','reward','book'];
let current = 'gate', beforeBook = 'map';
function show(name){
  current = name;
  SCREENS.forEach(s => $(s).hidden = s !== name);
  $('bookBtn').hidden = !['map','reward'].includes(name);
  $('me').hidden = !['map','lesson'].includes(name);
  $('adult').hidden = name === 'gate' || name === 'lesson';
  $('homeBtn').hidden = !['map','select','book'].includes(name);
  $(name).scrollTop = 0; updateHud(); syncSeason();
  /* the entrance: the real 3D castle where WebGL works, the illustrated one otherwise */
  if (name === 'gate') { if (!Gate3D.start()) Castle.draw(); } else Gate3D.stop();
  pauseStages();
}
function guide(npc, text, html){
  return `<div class="guide">${npcHTML(npc)}<div class="bubble paperish"><div class="line">${html || rb(text)}</div><button class="say" data-say="${text}" aria-label="再聽一次">${SPEAKER}</button></div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); });
function setLine(scope, text, html){ const b = scope.querySelector('.bubble'); b.querySelector('.line').innerHTML = html || rb(text); b.querySelector('.say').dataset.say = text; speak(text); }
function updateHud(){
  $('countNum').textContent = S.stickers.length;
  if (!S.hero) return;
  const n = S.stickers.length, st = stageOf(n), cur = STAGES[st], nx = STAGES[st+1];
  $('meArt').innerHTML = heroHTML(S.hero, st);
  const p = nx ? (n - cur.min) / (nx.min - cur.min) * 100 : 100;
  $('me').style.setProperty('--p', p.toFixed(1) + '%');
  $('me').setAttribute('aria-label', `${heroOf().name}, ${cur.name}`);
}
$('bookIcon').innerHTML = BOOK;
function bumpCount(){ $('countNum').textContent = S.stickers.length; const c = $('bookBtn'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
function flySticker(from, emoji){
  if (reduced || $('bookBtn').hidden) { bumpCount(); return; }
  const a = from.getBoundingClientRect(), b = $('bookBtn').getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fly stk'; el.textContent = emoji;
  const x0 = a.left + a.width/2 - 22, y0 = a.top + a.height/2 - 22;
  el.style.left = x0 + 'px'; el.style.top = y0 + 'px'; document.body.append(el);
  const dx = b.left + 10 - x0, dy = b.top - 2 - y0;
  el.animate([{transform:'translate(0,0) scale(1.2) rotate(0)'},{transform:`translate(${dx*.4}px,${dy*.4-70}px) scale(1.3) rotate(-20deg)`},{transform:`translate(${dx}px,${dy}px) scale(.5) rotate(10deg)`}],{duration:950,easing:'cubic-bezier(.5,0,.4,1)'}).onfinish = () => { el.remove(); bumpCount(); };
}
/* a small speech bubble shows what a character says, so a tap always shows something even if the voice is silent */
let sayTimer = 0;
function caption(text, anchor){
  let c = $('caption'); if (!c) { c = document.createElement('div'); c.id = 'caption'; c.className = 'caption paperish'; document.body.append(c); }
  c.innerHTML = rb(text); c.hidden = false; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  const r = anchor.getBoundingClientRect(); c.style.left = Math.max(12, r.left) + 'px'; c.style.bottom = (innerHeight - r.top + 10) + 'px';
  clearTimeout(sayTimer); sayTimer = setTimeout(() => { c.hidden = true; }, Math.max(2600, String(text).length * 380));
}
$('me').addEventListener('click', () => { const m = $('me'); m.classList.remove('hop'); void m.offsetWidth; m.classList.add('hop'); const t = LINES.iam(heroOf().name); caption(t, m); speak(t); });
/* back to the gate from the map, hero select or sticker book */
$('homeBtn').innerHTML = HOME;
$('homeBtn').addEventListener('click', () => { tone(660,0,.12,'triangle'); show('gate'); speak(LINES.gate); });
$('bookBtn').addEventListener('click', () => { beforeBook = current; renderBook(); });
const shuffle = a => { a = [...a]; for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- season: the scene follows the stop being played, or the child's next stop ---------- */
function progressSeason(){ const nx = LEVELS.findIndex((_, i) => !S.done.includes(i)); return nx < 0 ? 3 : seasonOf(nx); }
function syncSeason(){ Seasons.set(current === 'lesson' && L ? seasonOf(L.li) : progressSeason()); }

/* ---------- gate ---------- */
init3D();
mountGate($('gateBtn'));
$('gateSign').innerHTML = rb('四季樂園');
$('gateGuide').outerHTML = guide('owl', LINES.gate);
/* bake the lit parts of the gate that never move (arch, towers, sign, bushes) into cached pictures, so the
   moving wheel, lights, flags and balloons never force the lighting filter to run again (see world.js) */
(function bakeGate(){
  const svg = document.querySelector('#gateBtn svg'); if (!svg) return;
  const defs = [...svg.querySelectorAll('defs > linearGradient, defs > radialGradient, defs > filter')].map(n => n.outerHTML).join('');
  svg.querySelectorAll('g[filter="url(#gink)"]').forEach(g => {
    let bb; try { bb = g.getBBox(); } catch(e) { return; }
    if (!bb.width) return;
    const box = [bb.x - 10, bb.y - 10, bb.width + 20, bb.height + 22].map(Math.round);
    const url = bakeURL(`<defs>${defs}</defs>${g.outerHTML}`, box);
    const swap = () => { if (!g.isConnected) return; const im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      im.setAttribute('href', url); ['x','y','width','height'].forEach((k, i) => im.setAttribute(k, box[i])); g.replaceWith(im); };
    const pre = new Image(); pre.src = url;
    (pre.decode ? pre.decode() : Promise.resolve()).then(swap, () => {});
  });
})();
/* chase lights: step the colour phase three times a second while the gate is on screen, fast while it opens */
(function chase(){
  const b = document.querySelector('#gateBtn .bulbs'); let p = 0;
  (function tick(){ if (current === 'gate' && !reduced) { p = (p + 1) % 3; b && b.setAttribute('data-p', p); }
    setTimeout(tick, $('gateBtn').classList.contains('open') ? 90 : 330); })();
})();
/* entering = walking through the gate: the whole castle scene (walls, towers, gatehouse and the view inside)
   moves toward the viewer as one, centred on the road through the archway, so no part slides on its own */
function walkThrough(){
  if (reduced) return;
  const P = Castle.archPoint(); if (!P) return;
  const sec = $('gate'), S0 = sec.getBoundingClientRect(), B = $('gateBtn').getBoundingClientRect();
  $('castleBg').style.transformOrigin = `${P.x}px ${P.y}px`;
  $('gateBtn').style.transformOrigin = `${P.x - (B.left - S0.left)}px ${P.y - (B.top - S0.top)}px`;
  void sec.offsetWidth;
  sec.classList.add('entering');
}
let opening = false;
$('gateBtn').addEventListener('click', () => {
  if (opening) return; opening = true; whoosh(); primeSpeech(() => speak(LINES.gate));
  let fadeAt;
  if (Gate3D.active) { const ms = reduced ? 0 : Gate3D.enter(1700); $('gate').classList.add('entering3d'); fadeAt = Math.max(0, ms - 350); }
  else { fadeAt = Math.max(openGate($('gateBtn')), reduced ? 0 : 750); walkThrough(); }
  setTimeout(() => { $('whiteout').style.opacity = 1; }, reduced ? 0 : fadeAt);
  setTimeout(() => {
    $('gateBtn').classList.remove('open'); $('gate').classList.remove('entering', 'entering3d'); opening = false;
    if (S.hero) renderMap(); else renderSelect();
    $('whiteout').style.opacity = 0;
  }, reduced ? 200 : fadeAt + 600);
});

/* ---------- select ---------- */
function renderSelect(){
  let pick = null;
  const el = $('select');
  el.innerHTML = guide('owl', LINES.select) +
    `<button class="stage3d" id="selStage" hidden aria-label="讓好朋友跳一下"></button>
     <div class="heroes">${HEROES.map(h => `<button class="hero-card" data-h="${h.id}" aria-label="${h.name}">${heroHTML(h.id)}<span class="nm">${rb(h.name)}</span></button>`).join('')}</div>
     <button class="big-btn" id="goBtn" hidden>${rb(LINES.go)}</button>`;
  el.querySelectorAll('.hero-card').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('.hero-card').forEach(x => x.classList.toggle('on', x === b));
    pick = b.dataset.h; tone(659,0,.2,'triangle');
    const st = $('selStage'); st.hidden = false; mountStage(st, pick, 0);
    speak(LINES.iam(HEROES.find(h => h.id === pick).name));
    $('goBtn').hidden = false;
    st.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'nearest'});
  }));
  $('selStage').addEventListener('click', () => { cheerStage(); if (pick) speak(LINES.iam(HEROES.find(h => h.id === pick).name)); });
  $('goBtn').addEventListener('click', () => { S.hero = pick; save(); chime(); renderMap(); });
  show('select'); speak(LINES.select);
}

/* ---------- map: the world board ---------- */
const stageNo = i => `${seasonOf(i)+1}-${i%3+1}`;
const atPt = k => k < 0 ? START_PT : NODE_PT[k];          /* where the hero stands: -1 = the start pad */
function renderMap(){
  const el = $('map');
  const nextIdx = LEVELS.findIndex((_, i) => !S.done.includes(i));
  const goal = nextIdx < 0 ? LEVELS.length - 1 : nextIdx;
  if (typeof S.mapAt !== 'number' || S.mapAt >= LEVELS.length || (S.mapAt >= 0 && !isOpen(S.mapAt))) S.mapAt = -1;
  const faces = lv => lv.kind === 'sym' ? `<span class="syms">${lv.syms.slice(0,2)}<br>${lv.syms.slice(2)}</span>`
                    : lv.kind === 'tone' ? `<span class="big">ˊˇˋ</span>` : `<span class="big">字</span>`;
  el.innerHTML = `<div class="map-guide">${guide('owl', LINES.map)}</div>
    <div class="world" id="world" style="aspect-ratio:${MAP_W}/${MAP_H}">${WorldArt.html()}
      ${SEASONS.map((se, z) => `<button class="zone-sign${isOpen(z*3) ? '' : ' later'}" style="${pct([z % 2 ? 122 : 278, zoneBot(z) - 26])};--sc:${se.c}" data-say="${se.place}" aria-label="${se.place}"><span class="stk">${se.e}</span>${rb(se.place)}</button>`).join('')}
      ${LEVELS.map((lv, i) => { const open = isOpen(i), done = S.done.includes(i);
        return `<button class="lv ${done ? 'done' : open ? 'open' : 'locked'}${i === goal && open && !done ? ' goal' : ''}" data-i="${i}" style="${pct(NODE_PT[i])}" aria-label="${stageNo(i)} ${lv.sec} ${lv.syms || ''}${open ? '' : ' locked'}">
          <span class="orb" style="--c:${lv.c}">${faces(lv)}${done ? '<span class="badge">★</span>' : ''}${open ? '' : `<span class="lock">${LOCK}</span>`}</span>
          <span class="stage-no">${stageNo(i)}</span></button>`; }).join('')}
      <button class="summit" style="${pct(SUMMIT_PT)}" data-say="${LINES.teaser}" aria-label="還沒開放：更多世界"><div class="row4">${[['筆','var(--leaf)'],['字','var(--peach)'],['書','var(--lilac)'],['山','var(--sky)']].map(([c,col]) => `<span class="orb" style="--c:${col}"><span class="big">${c}</span></span>`).join('')}</div><span class="lock">${LOCK}</span></button>
      <button class="walker" id="walker" aria-label="${heroOf().name}">${heroHTML(S.hero, stageOf(S.stickers.length))}</button>
    </div>`;
  el.querySelectorAll('.lv').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    if (walking) return;
    if (!isOpen(i)) { thud(); setLine(el, LINES.locked); return; }
    tone(784,0,.12,'triangle');
    walkTo(i, () => startLevel(i));
  }));
  $('walker').addEventListener('click', () => { hopWalker(); speak(LINES.iam(heroOf().name)); });
  show('map');
  placeWalker(atPt(S.mapAt));
  /* the board scrolls so the hero is in view, then walks on to the newly opened stop */
  requestAnimationFrame(() => {
    const w = $('walker'); if (w) el.scrollTop = Math.max(0, w.offsetTop + $('world').offsetTop - el.clientHeight*.55);
    const si = progressSeason();
    if (S.hero && si > (S.seasonSeen || 0)) { S.seasonSeen = si; save(); chime(); setLine(el, LINES.season(SEASONS[si].name)); }
    else speak(LINES.map);
    if (S.mapAt < goal) setTimeout(() => walkTo(goal, null, true), reduced ? 0 : 700);
  });
}
let walking = false;
function placeWalker([x, y], flip){
  const w = $('walker'); if (!w) return;
  w.style.left = (x/MAP_W*100) + '%'; w.style.top = (y/MAP_H*100) + '%';
  if (flip !== undefined) w.classList.toggle('flip', flip);
}
function hopWalker(){ const w = $('walker'); if (!w) return; w.classList.remove('hop'); void w.offsetWidth; w.classList.add('hop'); }
/* walk along the road one segment at a time; segment k joins stop k-1 (or the start pad) to stop k */
function walkTo(target, done, follow){
  const from = S.mapAt;
  const finish = () => { walking = false; S.mapAt = target; save(); $('walker') && $('walker').classList.remove('walking'); if (done) setTimeout(done, reduced ? 0 : 220); };
  if (from === target || reduced) { placeWalker(atPt(target)); finish(); return; }
  const dir = target > from ? 1 : -1, segs = [];
  for (let k = dir > 0 ? from + 1 : from; dir > 0 ? k <= target : k > target; k += dir) segs.push(k);
  walking = true; $('walker').classList.add('walking');
  const map = $('map');
  (function nextSeg(n){
    if (n >= segs.length || !$('walker')) { finish(); return; }
    const path = document.querySelector(`#walkSegs path[data-k="${segs[n]}"]`), len = path.getTotalLength(), t0 = performance.now(), dur = 520 + len*1.4;
    (function frame(now){
      if (!$('walker')) return;
      const u = Math.min(1, (now - t0)/dur), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      const p = path.getPointAtLength((dir > 0 ? e : 1 - e) * len), q = path.getPointAtLength(Math.min(len, Math.max(0, (dir > 0 ? e + .02 : 1 - e - .02) * len)));
      placeWalker([p.x, p.y], q.x < p.x - .01);
      if (follow) { const w = $('walker'); map.scrollTop += ((w.offsetTop + $('world').offsetTop - map.clientHeight*.55) - map.scrollTop) * .08; }
      if (u < 1) requestAnimationFrame(frame); else { tone(880 + n*40, 0, .1, 'triangle', .07); nextSeg(n + 1); }
    })(t0);
  })(0);
}

/* ---------- lessons ---------- */
let L = null;
function startLevel(li){
  const lv = LEVELS[li], steps = [];
  if (lv.kind === 'sym') {
    const g = [...lv.syms];
    const pool = LEVELS.slice(0, li+1).filter(l => l.kind === 'sym').flatMap(l => [...l.syms]);
    g.forEach(s => steps.push({k:'meet', s}));
    shuffle(g).forEach(s => steps.push({k:'hear', s, opts: shuffle([s, ...shuffle(pool.filter(x => x !== s)).slice(0, 2)])}));
    steps.push({k:'trace', s: g[Math.floor(Math.random()*g.length)]});
  } else if (lv.kind === 'tone') {
    steps.push({k:'tmeet'}); shuffle(TONES).forEach(t => steps.push({k:'thear', t}));
  } else {
    shuffle(WORDS.slice(0,5)).forEach(t => steps.push({k:'word', t, opts: shuffle([t, ...shuffle(WORDS.filter(w => w !== t)).slice(0,2)])}));
  }
  L = {li, lv, steps, i:0, startStage: stageOf(S.stickers.length)};
  const el = $('lesson');
  el.innerHTML = `<div class="topbar"><button class="back" id="lessonBack" aria-label="${LINES.back}">${BACK}</button><div class="track" id="dots" aria-hidden="true"></div><span class="stage-chip">${stageNo(li)}</span></div>` +
    guide('deer', '…') + `<div id="stage" style="display:contents"></div>`;
  $('lessonBack').addEventListener('click', () => { try { speechSynthesis.cancel(); } catch(e) {} renderMap(); });
  show('lesson');
  renderStep();
}
/* progress track: the hero runs along it toward the goal flag, one pip per step */
const FLAG = `<svg viewBox="0 0 24 30" aria-hidden="true"><line x1="5" y1="2" x2="5" y2="29" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M6 3 L22 8 L6 14Z" fill="#ff6f8f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;
function renderDots(){
  const n = L.steps.length, at = i => n > 1 ? i/(n-1)*100 : 100, p = at(L.i);
  $('dots').innerHTML = `<span class="track-fill" style="width:${p}%"></span>${L.steps.map((_, i) => `<i class="${i < L.i ? 'done' : i === L.i ? 'now' : ''}" style="left:${at(i)}%"></i>`).join('')}
    <span class="track-goal">${FLAG}</span><span class="track-hero" style="left:${p}%">${heroHTML(S.hero, stageOf(S.stickers.length))}</span>`;
}
function next(){ L.i++; if (L.i >= L.steps.length) finish(); else renderStep(); }
function renderStep(){
  renderDots();
  const step = L.steps[L.i];
  ({meet:stepMeet, hear:stepHear, trace:stepTrace, tmeet:stepToneMeet, thear:stepToneHear, word:stepWord})[step.k](step);
}
function pickRound(stage, el, step, correct, onRight, replay){
  let misses = 0, done = false;
  stage.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
    if (done) return;
    if (b.dataset.v === correct) { done = true; b.classList.add('right'); chime(); onRight(b); setLine(el, yay()); setTimeout(next, 1700); }
    else {
      misses++; b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble'); thud();
      setLine(el, LINES.again); setTimeout(replay, 1500);
      if (misses >= 2) stage.querySelector(`.choice[data-v="${correct}"]`).classList.add('hint');
    }
  }));
}
/* meet a symbol: its sound, its animal friend */
function stepMeet(step){
  const el = $('lesson'), stage = $('stage'), y = SYMS[step.s];
  const say = `${sayOf(y)}，${y.w}的${sayOf(y)}`;
  setLine(el, say, `${rb('這是')}${y.s}，${rbw(y.w, y.z)}${rb('的')}${y.s}！`);
  stage.innerHTML = `<div class="card paperish"><button class="bigsym" data-say="${sayOf(y)}" aria-label="Hear ${y.s}">${y.s}</button>
      <button class="ani" data-say="${y.w}" aria-label="Hear ${y.w}"><span class="stk">${y.e}</span><span class="w">${rbw(y.w, y.z)}</span></button></div>
    <button class="next" id="nextBtn" aria-label="下一個">${ARROW}</button>`;
  $('nextBtn').addEventListener('click', () => { tone(784,0,.15,'triangle'); next(); });
}
/* hear a sound, tap the symbol */
function stepHear(step){
  const el = $('lesson'), stage = $('stage'), y = SYMS[step.s];
  setLine(el, LINES.hear);
  stage.innerHTML = `<div class="card paperish" id="prompt"><button class="say huge" data-say="${sayOf(y)}" aria-label="聽聲音">${SPEAKER}</button></div>
    <div class="choices">${step.opts.map(o => `<button class="choice sym" data-v="${o}" aria-label="${o}">${o}</button>`).join('')}</div>`;
  setTimeout(() => speak(sayOf(y)), 1700);
  pickRound(stage, el, step, step.s, () => { $('prompt').innerHTML = `<div class="reveal"><span class="stk">${y.e}</span><span class="w" style="font-size:72px">${y.s}</span></div>`; }, () => speak(sayOf(y)));
}
/* the four tones, Taiwan style: first tone carries no mark */
function stepToneMeet(){
  const el = $('lesson'), stage = $('stage'); const heard = new Set();
  setLine(el, LINES.tmeet);
  stage.innerHTML = `<div class="card paperish"><div class="tones">${TONES.map(t => `<button class="tone-b" data-c="${t.c}"><span class="z">${zhu(t.z, 'big')}</span><span class="c">${t.c}</span></button>`).join('')}</div></div>
    <button class="next" id="nextBtn" aria-label="下一個" hidden>${ARROW}</button>`;
  stage.querySelectorAll('.tone-b').forEach(b => b.addEventListener('click', () => {
    speak(b.dataset.c); b.classList.add('heard'); heard.add(b.dataset.c);
    if (heard.size === 4) $('nextBtn').hidden = false;
  }));
  $('nextBtn').addEventListener('click', next);
}
function stepToneHear(step){
  const el = $('lesson'), stage = $('stage');
  setLine(el, LINES.thear);
  stage.innerHTML = `<div class="card paperish" id="prompt"><button class="say huge" data-say="${step.t.c}" aria-label="聽聽看">${SPEAKER}</button></div>
    <div class="choices two">${shuffle(TONES).map(o => `<button class="choice tone" data-v="${o.c}" aria-label="${o.n}">${zhu(o.z, 'big')}</button>`).join('')}</div>`;
  setTimeout(() => speak(step.t.c), 1500);
  pickRound(stage, el, step, step.t.c, () => { $('prompt').innerHTML = `<div class="reveal"><span class="w">${rb(step.t.c)}</span></div>`; }, () => speak(step.t.c));
}
/* read the zhuyin, tap the picture */
function stepWord(step){
  const el = $('lesson'), stage = $('stage');
  setLine(el, LINES.word);
  stage.innerHTML = `<div class="card paperish" id="prompt"><span class="zy">${zyOf(step.t.w)}</span><button class="say" data-say="${step.t.w}" aria-label="聽這個詞">${SPEAKER}</button></div>
    <div class="choices">${step.opts.map(o => `<button class="choice pic" data-v="${o.w}" aria-label="${o.w}">${o.e}</button>`).join('')}</div>`;
  setTimeout(() => speak(step.t.w), 1500);
  pickRound(stage, el, step, step.t.w, () => { $('prompt').innerHTML = `<div class="reveal"><span class="w">${rb(step.t.w)}</span></div>`; }, () => speak(step.t.w));
}
/* trace the symbol on a 田字格 practice grid; checked by how much of the letter the child's ink covers */
function stepTrace(step){
  const el = $('lesson'), stage = $('stage'), sym = step.s;
  setLine(el, LINES.trace(sym));
  stage.innerHTML = `<div class="pad"><canvas id="padCv" aria-label="Trace ${sym}"></canvas><button class="erase" id="erase">${rb(LINES.erase)}</button></div>`;
  const cv = $('padCv'), cx = cv.getContext('2d');
  const size = Math.max(230, Math.min(320, el.clientWidth - 52)), dpr = Math.min(devicePixelRatio||1, 2);
  cv.width = size*dpr; cv.height = size*dpr; cv.style.width = size+'px'; cv.style.height = size+'px';
  cx.setTransform(dpr*size/280, 0, 0, dpr*size/280, 0, 0);
  const FONT = s => `700 ${s}px "LXGW WenKai TC","Noto Sans TC",sans-serif`;
  let strokes = [], cur = null, finished = false;
  const N = 96, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c.getContext('2d'); };
  function glyph(ctx, sz, fill, grow){ ctx.font = FONT(sz*.72); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fill; ctx.fillText(sym, sz/2, sz/2+sz*.02);
    if (grow) { ctx.strokeStyle = fill; ctx.lineWidth = grow; ctx.lineJoin = 'round'; ctx.strokeText(sym, sz/2, sz/2+sz*.02); } }
  function draw(){
    cx.clearRect(0,0,280,280);
    cx.strokeStyle = '#e56b6b'; cx.lineWidth = 2.5; cx.setLineDash([]); cx.strokeRect(6,6,268,268);
    cx.setLineDash([8,8]); cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(140,6); cx.lineTo(140,274); cx.moveTo(6,140); cx.lineTo(274,140); cx.stroke(); cx.setLineDash([]);
    glyph(cx, 280, finished ? '#2b2452' : 'rgba(43,36,82,.14)');
    if (!finished) { cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#f26b3a'; cx.lineWidth = 16;
      [...strokes, cur].filter(Boolean).forEach(s => { cx.beginPath(); cx.moveTo(...s[0]); s.forEach(p => cx.lineTo(...p)); if (s.length === 1) cx.lineTo(s[0][0]+.1, s[0][1]); cx.stroke(); }); }
  }
  /* finished only when every part of the letter is covered: high overall coverage, and no uncovered piece
     of the letter bigger than a small gap (so a missing or half-drawn stroke always counts as unfinished) */
  function check(){
    const G = mk(), A = mk(), U = mk();
    glyph(G, N, '#000'); glyph(A, N, '#000', N*.09);
    U.lineCap = 'round'; U.lineJoin = 'round'; U.strokeStyle = '#000'; U.lineWidth = N*.075; const k = N/280;
    strokes.forEach(s => { U.beginPath(); U.moveTo(s[0][0]*k, s[0][1]*k); s.forEach(p => U.lineTo(p[0]*k, p[1]*k)); if (s.length === 1) U.lineTo(s[0][0]*k + .1, s[0][1]*k); U.stroke(); });
    const g = G.getImageData(0,0,N,N).data, a = A.getImageData(0,0,N,N).data, u = U.getImageData(0,0,N,N).data;
    let gl = 0, cov = 0, ink = 0, out = 0;
    const miss = new Uint8Array(N*N);
    for (let i = 0; i < N*N; i++) {
      const gi = g[i*4+3] > 100, ui = u[i*4+3] > 60;
      if (gi) { gl++; if (ui) cov++; else miss[i] = 1; }
      if (ui) { ink++; if (a[i*4+3] < 60) out++; }
    }
    let gap = 0;  /* largest connected uncovered piece of the letter, in pixels */
    const seen = new Uint8Array(N*N), q = [];
    for (let i = 0; i < N*N; i++) {
      if (!miss[i] || seen[i]) continue;
      let n = 0; q.length = 0; q.push(i); seen[i] = 1;
      while (q.length) { const c = q.pop(); n++; const x = c % N, y = (c / N) | 0;
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy, j = ny*N + nx;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N && miss[j] && !seen[j]) { seen[j] = 1; q.push(j); } }); }
      gap = Math.max(gap, n);
    }
    return {cov: gl ? cov/gl : 0, out: ink ? out/ink : 1, gap: gl ? gap/gl : 1};
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*280, (e.clientY-r.top)/r.height*280]; };
  let pending = 0;  /* a short pause after lifting the finger, so the next stroke can still begin */
  cv.addEventListener('pointerdown', e => { if (finished) return; clearTimeout(pending); cur = [pos(e)]; try { cv.setPointerCapture(e.pointerId); } catch(_) {} e.preventDefault(); draw(); });
  cv.addEventListener('pointermove', e => { if (cur) { cur.push(pos(e)); draw(); } });
  const end = () => {
    if (!cur) return; strokes.push(cur); cur = null; draw();
    const r = check();
    if (r.cov >= .85 && r.gap <= .06 && r.out <= .4) {
      clearTimeout(pending);
      pending = setTimeout(() => { if (cur || finished) return; finished = true; draw(); chime(); setLine(el, yay()); setTimeout(next, 1600); }, 900);
    } else if (r.out > .55 && strokes.length > 2) { thud(); setLine(el, LINES.again); strokes = []; draw(); }
    else tone(660 + Math.min(strokes.length, 8)*40, 0, .12, 'triangle', .08);
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  $('erase').addEventListener('click', () => { clearTimeout(pending); strokes = []; cur = null; draw(); });
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load(FONT(100), sym).then(draw).catch(() => {});
}

/* ---------- reward: stickers ---------- */
function finish(){
  const lv = L.lv;
  let award = [];
  if (lv.kind === 'sym') award = [...lv.syms];
  else award = TREATS.filter(t => !S.stickers.includes(t.id)).slice(0, lv.treats).map(t => t.id);
  const fresh = award.filter(id => !S.stickers.includes(id));
  fresh.forEach(id => S.stickers.push(id));
  if (!S.done.includes(L.li)) S.done.push(L.li);
  S.lessons++; save();
  const n = S.stickers.length, st = stageOf(n), grew = st > L.startStage, cur = STAGES[st], nx = STAGES[st+1], h = heroOf();
  const pct = nx ? (n - cur.min) / (nx.min - cur.min) * 100 : 100;
  const shown = award.length ? award : [];
  const el = $('reward');
  el.innerHTML = `${grew ? guide('owl', LINES.grow(h.name)) : ''}
    <div class="clear"><span class="rays" aria-hidden="true"></span><span class="stage-chip">${stageNo(L.li)}</span><h2 class="clear-title">${rb(LINES.clear)}</h2><div class="clear-stars" aria-hidden="true"><b>★</b><b>★</b><b>★</b></div></div>
    <p class="reward-title">${rb(fresh.length ? LINES.gotNew : LINES.review)}</p>
    <div class="gets">${shown.map((id, i) => { const k = stickerOf(id); return `<div class="get" style="animation-delay:${.25 + i*.22}s" data-id="${id}">${SYMS[id] ? `<span class="s">${id}</span>` : ''}<span class="stk">${k.e}</span><span class="w">${rbw(k.w, k.z)}</span></div>`; }).join('')}</div>
    <button class="stage3d" id="rwStage" aria-label="Make ${h.name} jump"></button>
    <div class="grow"><div class="info"><div class="st">${rb(h.name)} · ${rb(cur.name)}</div>
      <div class="bar"><b id="barFill" style="width:0%"></b></div><div class="barnum">${nx ? `${n} / ${nx.min}` : `${n} / ${TOTAL}`}</div></div></div>
    <div class="row"><button class="big-btn" id="toMap">${rb(LINES.back)}</button><button class="soft-btn" id="again">${rb(LINES.replay)}</button></div>`;
  $('toMap').addEventListener('click', renderMap);
  $('again').addEventListener('click', () => startLevel(L.li));
  show('reward');
  $('countNum').textContent = n - fresh.length;
  mountStage($('rwStage'), h.id, st);
  $('rwStage').addEventListener('click', () => { cheerStage(); speak(LINES.iam(h.name)); });
  [...el.querySelectorAll('.get')].forEach((g, i) => setTimeout(() => {
    peel(); if (fresh.includes(g.dataset.id)) flySticker(g, stickerOf(g.dataset.id).e);
  }, 450 + i*260));
  setTimeout(() => { const b = $('barFill'); if (b) b.style.width = pct.toFixed(1) + '%'; cheerStage(); }, 700 + shown.length*260);
  speak(LINES.clear + (grew ? LINES.grow(h.name) : fresh.length ? LINES.gotNew : LINES.review));
}

/* ---------- sticker book: a real book ----------
   Built like a real hard-cover book: every leaf of paper is hinged at the spine and has a front and a back.
   The Sakura-pink cover is the first leaf, so it swings open on its hinge and stays open as the left board.
   Leaves turn by the arrows, the folded page corners, the arrow keys, or by dragging the page with a finger or
   mouse: the page follows the finger and, when let go, finishes the turn or falls back like paper.
   Wide screens show the open spread; phones keep the whole open book on the desk and glide between its left and
   right page, with a strip of the facing page still in sight. */
const Book = {s: 0, side: 'R', n: 0, spread: true, pw: 300, busy: false, cam: 0, hinted: false};
function bookPages(){
  const have = id => S.stickers.includes(id), h = heroOf(), n = S.stickers.length, st = stageOf(n);
  const slot = (id, kind) => { const k = stickerOf(id), tilt = ((id.charCodeAt(id.length - 1) * 37) % 9) - 4;
    if (!have(id)) return `<div class="bk-slot miss" aria-label="還沒拿到">${kind === 'sym' ? `<span class="bk-ghost">${id}</span>` : '<span class="bk-ghost q">?</span>'}</div>`;
    const say = kind === 'sym' ? `${sayOf(k)}，${k.w}` : k.w;
    return `<button class="bk-slot have" data-say="${say}" aria-label="${kind === 'sym' ? id + ' ' : ''}${k.w}" style="--tilt:${tilt}deg">${kind === 'sym' ? `<span class="bk-sym">${id}</span>` : ''}<span class="stk">${k.e}</span><span class="bk-word">${rbw(k.w, k.z)}</span></button>`; };
  const pages = [];
  /* title page */
  pages.push(`<div class="bk-title"><div class="bk-plate">${rb(LINES.book)}</div><div class="bk-hero">${heroHTML(S.hero, st)}</div>
    <div class="bk-name">${rb(h.name)} · ${rb(STAGES[st].name)}</div>
    <div class="bk-meter"><b style="width:${Math.round(n / TOTAL * 100)}%"></b></div><div class="bk-count">${n} / ${TOTAL}</div></div>`);
  /* one page per lesson */
  LEVELS.forEach((lv, li) => { if (lv.kind !== 'sym') return;
    const syms = [...lv.syms], got = syms.filter(have).length, se = SEASONS[seasonOf(li)];
    pages.push(`<div class="bk-head" style="--tab:${se.c}"><span class="stage-chip">${stageNo(li)}</span><span class="bk-sec">${rb(lv.sec)}</span><span class="bk-n">${got} / ${syms.length}</span></div>
      <div class="bk-grid n${syms.length}">${syms.map(sy => slot(sy, 'sym')).join('')}</div>`); });
  /* Taiwan treats */
  pages.push(`<div class="bk-head" style="--tab:#e8813a"><span class="bk-sec">${rb(LINES.treats)}</span><span class="bk-n">${TREATS.filter(t => have(t.id)).length} / ${TREATS.length}</span></div>
    <div class="bk-grid n8">${TREATS.map(t => slot(t.id, 'treat')).join('')}</div>`);
  return pages;
}
function bookSize(){
  /* short landscape screens: arrows beside the book and the back button in the corner, so the book can use the full height */
  const short = innerHeight < 560 && innerWidth > innerHeight;
  const W = innerWidth - 64 - (short ? 2 * 84 : 0), H = short ? innerHeight - 24 - 34 : innerHeight - 76 - 64 - 76 - 30;
  let pw = Math.min(W / 2, H * .74, 440);
  Book.spread = (innerWidth >= 700 || short) && pw >= (short ? 150 : 270);
  if (!Book.spread) pw = Math.min(innerWidth - 64, H * .74, 470);   /* one page in view, the facing page peeking at each side */
  Book.pw = Math.max(140, Math.floor(pw));
  const el = $('book'); el.style.setProperty('--pw', Book.pw + 'px'); el.style.setProperty('--ph', Math.floor(Book.pw / .74) + 'px');
  el.classList.toggle('spread', Book.spread); el.classList.toggle('short', short);
}
const PETALS = `<span class="bk-petal" style="--x:18%;--y:22%;--r:10deg"></span><span class="bk-petal" style="--x:72%;--y:14%;--r:-30deg;--s:.7"></span><span class="bk-petal" style="--x:80%;--y:78%;--r:40deg"></span><span class="bk-petal" style="--x:26%;--y:84%;--r:-12deg;--s:.8"></span>`;
const pageFace = (pages, k, side) => k >= 0 && k < pages.length
  ? `<div class="bk-page ${side}"><div class="bk-paper">${pages[k]}</div><span class="bk-folio">${k + 1}</span><button class="bk-corner" data-turn="${side === 'right' ? 1 : -1}" aria-label="${side === 'right' ? '下一頁' : '上一頁'}"></button></div>`
  : `<div class="bk-page ${side} blank"></div>`;
/* the leaves: 0 is the cover; then each paper leaf carries two pages */
function leafHTML(pages){
  const L = [`<div class="bk-leaf cover" data-k="0"><div class="bk-face f"><div class="bk-cover-front">${PETALS}<div class="bk-cover-frame"><div class="bk-cover-title">${rb(LINES.book)}</div>
      <div class="bk-cover-badge"><span class="stk">🌸</span></div><div class="bk-cover-sub">${rb('注音動物')} · ${rb('台灣點心')}</div></div></div></div>
    <div class="bk-face b"><div class="bk-inside"><div class="bk-endpaper"></div></div></div></div>`];
  for (let j = 0; j < pages.length; j += 2)
    L.push(`<div class="bk-leaf" data-k="${L.length}"><div class="bk-face f">${pageFace(pages, j, 'right')}</div><div class="bk-face b">${pageFace(pages, j + 1, 'left')}</div></div>`);
  return L.join('');
}
const leafEl = k => document.querySelector(`#bkBook .bk-leaf[data-k="${k}"]`);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
/* where the view rests: the middle of the open spread, the closed cover, or (phones) the left or right page */
function camFor(s, side){ const pw = Book.pw;
  if (Book.spread) return s === 0 ? 1.5 * pw : pw;
  return s === 0 || side === 'R' ? 1.5 * pw : .5 * pw; }
function setCam(c){ Book.cam = c; const b = $('bkBook'); if (b) b.style.transform = `translateX(${-c}px)`; }
/* put one leaf at an angle (0 = lying on the right, -180 = lying on the left), with light, shade and cast shadow */
function poseLeaf(k, a, moving){
  const el = leafEl(k); if (!el) return;
  const pw = Book.pw, rad = -a * Math.PI / 180, lift = Math.sin(rad), c = Math.cos(rad);
  el.style.transform = `perspective(${Math.round(pw * 4.5)}px) rotateY(${a}deg)`;
  el.classList.toggle('flip', a < -90);
  el.style.zIndex = moving ? 100 : (a < -90 ? k + 1 : 2 * Book.n - k);
  el.classList.toggle('moving', !!moving);
  el.style.setProperty('--k', moving ? (lift * .9).toFixed(3) : 0);
  if (moving) {
    const cr = $('bkCastR'), cl = $('bkCastL');
    cr.style.opacity = c > 0 ? (lift * .85).toFixed(3) : 0; cr.style.width = Math.max(0, pw * c + pw * .14 * lift) + 'px';
    cl.style.opacity = c < 0 ? (lift * .85).toFixed(3) : 0; cl.style.width = Math.max(0, -pw * c + pw * .14 * lift) + 'px';
  }
}
function settleBook(){
  for (let k = 0; k < Book.n; k++) poseLeaf(k, k < Book.s ? -180 : 0, false);
  $('bkCastR').style.opacity = 0; $('bkCastL').style.opacity = 0;
  const b = $('book'); const left = Math.max(0, Book.s - 1), right = Book.n - 1 - left;
  b.style.setProperty('--el', left * 1.4 + 'px'); b.style.setProperty('--er', right * 1.4 + 'px');
  $('bkBook').classList.toggle('closed', Book.s === 0);
  setCam(camFor(Book.s, Book.side));
  bookNav();
}
function bookNav(){
  const s = Book.s, n = Book.n, sp = Book.spread;
  const total = sp ? n - 1 : 2 * n - 3;
  const cur = s === 0 ? -1 : sp ? s - 1 : s === 1 ? 0 : 2 * (s - 2) + 1 + (Book.side === 'R' ? 1 : 0);
  $('bkDots').innerHTML = Array.from({length: total}, (_, k) => `<i class="${k === cur ? 'on' : ''}"></i>`).join('');
  $('bkPrev').disabled = s === 0;
  $('bkNext').disabled = s >= n;
}
/* run one turn: a leaf from angle a0 to a1 while the view glides from c0 to c1 */
function runTurn(k, a0, a1, c0, c1, dur, ease, done){
  Book.busy = true;
  const t0 = performance.now();
  const step = now => {
    const t = reduced ? 1 : Math.min(1, (now - t0) / dur), p = ease(t);
    if (k !== null) poseLeaf(k, a0 + (a1 - a0) * p, t < 1);
    setCam(c0 + (c1 - c0) * p);
    if (t < 1) requestAnimationFrame(step); else { Book.busy = false; done && done(); }
  };
  requestAnimationFrame(step);
}
/* what "next" and "previous" mean here: a leaf turn, or (phones) a glide to the facing page */
function bookMove(dir){
  const s = Book.s, n = Book.n, sp = Book.spread, side = Book.side;
  if (dir > 0) {
    if (s >= n) return null;
    if (!sp && s > 0 && side === 'L') return s === n ? null : {pan: true, s, side: 'R'};
    return {k: s, a0: 0, a1: -180, s: s + 1, side: sp || s === 0 ? 'R' : 'L'};
  }
  if (s === 0) return null;
  if (!sp && side === 'R' && s > 1) return {pan: true, s, side: 'L'};
  return {k: s - 1, a0: -180, a1: 0, s: s - 1, side: 'R'};
}
function turnPage(dir){
  if (Book.busy) return;
  const m = bookMove(dir); if (!m) { thud(); return; }
  const c0 = Book.cam, c1 = camFor(m.s, m.side);
  const fin = () => { Book.s = m.s; Book.side = m.side; settleBook(); };
  if (m.pan) { runTurn(null, 0, 0, c0, c1, 520, easeIO, fin); return; }
  pageFlip();
  runTurn(m.k, m.a0, m.a1, c0, c1, m.k === 0 ? 1300 : 1050, easeIO, fin);
}
/* drag a page with a finger or the mouse */
function bindBookDrag(stage){
  let d = null;
  const span = () => Book.spread ? 2 * Book.pw : Math.min(innerWidth * .8, 2 * Book.pw);
  stage.addEventListener('pointerdown', e => {
    if (Book.busy || e.button > 0 || e.target.closest('.bk-corner')) return;
    d = {x0: e.clientX, y0: e.clientY, id: e.pointerId, m: null, hist: [[performance.now(), e.clientX]], cam0: Book.cam};
  });
  stage.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    d.hist.push([performance.now(), e.clientX]); if (d.hist.length > 6) d.hist.shift();
    if (!d.m) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { d = null; return; }
      const m = bookMove(dx < 0 ? 1 : -1); if (!m) { d = null; return; }
      d.m = m; d.dir = dx < 0 ? 1 : -1; d.c1 = camFor(m.s, m.side);
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      if (!m.pan) { Book.busy = true; leafEl(m.k).classList.add('moving'); }
    }
    e.preventDefault();
    const m = d.m;
    if (m.pan) { setCam(Math.max(.4 * Book.pw, Math.min(1.6 * Book.pw, d.cam0 - dx))); return; }
    const p = Math.max(0, Math.min(1, d.dir * -dx / span()));
    d.p = p;
    /* the page edge follows the finger across the spread */
    const a = -Math.acos(1 - 2 * p) * 180 / Math.PI;
    poseLeaf(m.k, d.dir > 0 ? a : -180 - a, true);
    setCam(d.cam0 + (d.c1 - d.cam0) * p);
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const g = d; d = null; if (!g.m) return;
    const h = g.hist, dt = Math.max(1, h[h.length - 1][0] - h[0][0]), v = (h[h.length - 1][1] - h[0][1]) / dt;   /* px per ms */
    const fling = -v * g.dir;   /* > 0 means moving in the turn direction */
    stage.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, {capture: true, once: true});
    setTimeout(() => stage.dispatchEvent(new Event('click')), 0);   /* clear the click guard if no click follows */
    const m = g.m;
    if (m.pan) {
      const moved = (g.cam0 - Book.cam) * -g.dir, go = moved > 50 || fling > .3;
      runTurn(null, 0, 0, Book.cam, go ? g.c1 : g.cam0, 360, easeOut, () => { if (go) { Book.s = m.s; Book.side = m.side; } settleBook(); });
      return;
    }
    const p = g.p || 0, go = fling > .35 || (p > .45 && fling > -.35);
    const a = -Math.acos(1 - 2 * p) * 180 / Math.PI, aNow = g.dir > 0 ? a : -180 - a;
    const rest = go ? 1 - p : p, cNow = Book.cam;
    if (go) pageFlip();
    runTurn(m.k, aNow, go ? m.a1 : m.a0, cNow, go ? g.c1 : g.cam0, 260 + 700 * rest, easeOut,
      () => { if (go) { Book.s = m.s; Book.side = m.side; } settleBook(); });
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
}
function bindStickers(scope){ scope.querySelectorAll('.bk-slot.have').forEach(sl => sl.addEventListener('click', () => { sl.classList.remove('wig'); void sl.offsetWidth; sl.classList.add('wig'); peel(); }));
  scope.querySelectorAll('.bk-corner').forEach(c => c.addEventListener('click', e => { e.stopPropagation(); turnPage(+c.dataset.turn); })); }
function renderBook(){
  const el = $('book'), pages = bookPages();
  Book.s = 0; Book.side = 'R'; Book.busy = false; Book.n = 1 + Math.ceil(pages.length / 2);
  el.innerHTML = `<div class="topbar"><button class="back" id="bookBack" aria-label="${LINES.back}">${BACK}</button><h2 class="reward-title" style="flex:1;font-size:30px">${rb(LINES.book)}</h2><div style="width:56px"></div></div>
    <div class="bk-stage" id="bkStage"><div class="bk-book closed" id="bkBook" role="group" aria-label="${LINES.book}">
      <div class="bk-board" aria-hidden="true"></div>
      <div class="bk-edge l" aria-hidden="true"></div><div class="bk-edge r" aria-hidden="true"></div>
      <div class="bk-base"><div class="bk-endpaper"></div></div>
      <span class="bk-ribbon" aria-hidden="true"></span>
      <div class="bk-cast l" id="bkCastL"></div><div class="bk-cast r" id="bkCastR"></div>
      ${leafHTML(pages)}
    </div></div>
    <div class="bk-nav"><button class="bk-arrow" id="bkPrev" aria-label="上一頁">‹</button><div class="bk-dots" id="bkDots"></div><button class="bk-arrow" id="bkNext" aria-label="下一頁">›</button></div>`;
  $('bookBack').addEventListener('click', () => beforeBook === 'reward' ? show('reward') : renderMap());
  $('bkPrev').addEventListener('click', () => turnPage(-1));
  $('bkNext').addEventListener('click', () => turnPage(1));
  bindStickers($('bkBook')); bindBookDrag($('bkStage'));
  bookSize(); settleBook();
  show('book'); speak(LINES.book);
  /* the cover swings open on its hinge and comes to rest as the left board; the first time, the next page lifts a little to show it can be turned */
  setTimeout(() => { if (current !== 'book' || Book.s !== 0 || Book.busy) return;
    pageFlip();
    runTurn(0, 0, -180, Book.cam, camFor(1, 'R'), 1300, easeIO, () => { Book.s = 1; Book.side = 'R'; settleBook();
      if (Book.hinted || reduced) return; Book.hinted = true;
      setTimeout(() => { if (Book.s !== 1 || Book.busy) return;
        runTurn(1, 0, -24, Book.cam, Book.cam, 420, easeIO, () => runTurn(1, -24, 0, Book.cam, Book.cam, 520, easeOut, settleBook)); }, 350); }); }, reduced ? 0 : 500);
}
addEventListener('resize', () => { if (current === 'book' && !Book.busy) { const was = Book.spread; bookSize();
  if (was !== Book.spread && !Book.spread && Book.s > 1) Book.side = 'L';
  settleBook(); } });
document.addEventListener('keydown', e => { if (current !== 'book' || !$('panel').hidden) return; if (e.key === 'ArrowRight') turnPage(1); if (e.key === 'ArrowLeft') turnPage(-1); });

/* ---------- grown-ups ---------- */
/* the grown-ups button opens the panel on a single tap */
$('adult').addEventListener('click', () => { tone(660,0,.1,'triangle'); openPanel(); });
/* the settings panel, for parents (Traditional Chinese: the game is made for families in Taiwan) */
const STATUS_ZH = [[/recorded voice \(Web Audio\): playing/, '內建錄音：播放中'], [/recorded voice: playing/, '內建錄音：播放中'], [/recorded voice: ended/, '內建錄音：播完'],
  [/recorded voice: sent/, '內建錄音：準備播放'], [/waiting for the recorded voice to load/, '等待錄音載入'], [/audio element refused.*/, '改用另一種方式播放錄音'],
  [/recorded voice failed.*/, '錄音無法播放，改用裝置語音'], [/device voice did not start.*/, '裝置語音沒有出聲，改播錄音'], [/device voice error.*/, '裝置語音出錯，改播錄音'],
  [/no device voice.*/, '沒有裝置語音，改播錄音'], [/^speaking$/, '裝置語音：說話中'], [/^ended without starting$/, '裝置語音：沒有出聲'], [/^ended$/, '裝置語音：說完'],
  [/^sent$/, '裝置語音：準備說話'], [/^no-start.*/, '裝置語音：沒有開始，再試一次'], [/^error: (.*)/, '裝置語音錯誤（$1）']];
const statusZh = s => { for (const [re, t] of STATUS_ZH) if (re.test(s)) return s.replace(re, t); return s; };
function openPanel(){
  const p = $('panel'); if ($('caption')) $('caption').hidden = true;
  const lvDone = S.done.length, syms = S.stickers.filter(id => SYMS[id]).join(' ');
  const tws = zhVoices().filter(isTW), mode = S.voiceMode || 'auto', esc = t => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const opt = (v, cur, label) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${label}</option>`;
  p.innerHTML = `<div class="sheet" role="dialog" aria-label="設定" lang="zh-Hant-TW">
    <h2>設定</h2>
    <p>給爸爸媽媽：遊戲進度只存在這台裝置上。</p>
    <div class="stat">完成關卡：<b>${lvDone} / ${LEVELS.length}</b><br>貼紙：<b>${S.stickers.length} / ${TOTAL}</b><br>學會的注音：<b>${syms || '還沒有'}</b></div>
    <h3>聲音與語音</h3>
    <p>只用臺灣口音：有臺灣華語語音的裝置會用它來說話；注音符號和沒有臺灣語音的裝置，用內建錄音（依教育部讀音）。</p>
    <button id="pSound" aria-pressed="${S.sound}">聲音和語音：${S.sound ? '開' : '關'}</button>
    <label class="field" for="pMode2">語音來源<select id="pMode2">
      ${opt('auto', mode, '自動（優先用臺灣華語語音）')}${opt('rec', mode, '一律用內建錄音')}${opt('device', mode, '一律用這台裝置的臺灣華語語音')}</select></label>
    <label class="field" for="pVoice">臺灣華語語音${tws.length ? `<select id="pVoice">${opt('', S.voiceName, '自動挑選')}${tws.map(v => opt(esc(v.name), esc(S.voiceName || ''), esc(v.name))).join('')}</select>` : '<span>這台裝置沒有臺灣華語語音，會使用內建錄音。</span>'}</label>
    <label class="field" for="pRate">語速<select id="pRate">${[.7, .8, .85, .9, 1].map(v => opt(v, S.rate || .85, v + '×')).join('')}</select></label>
    <label class="field" for="pMode">注音符號怎麼唸（只影響裝置語音）<select id="pMode">${opt('auto', S.symMode || 'auto', '自動')}${opt('symbol', S.symMode, '直接唸注音（ㄅ）')}${opt('char', S.symMode, '唸同音字（玻）')}</select></label>
    <div class="row"><button id="pTest">▶ ㄅ ㄆ ㄇ ㄈ ㄉ ㄊ ㄋ ㄌ</button><button id="pTest2">▶ 你好，我是貓頭鷹</button></div>
    <div class="stat" id="pLog"></div>
    <h3>進度</h3>
    <button id="pReset" class="warn">重新開始</button>
    <div class="confirm" id="pConfirm" hidden><p>要清除這台裝置上的角色和所有貼紙嗎？</p><button id="pYes" class="warn">清除進度</button><button id="pNo">保留進度</button></div>
    ${splineInUse() ? '<p>3D 場景：<a href="https://spline.design" target="_blank" rel="noopener">Made with Spline</a></p>' : ''}
    <button id="pClose" class="primary">回到遊戲</button></div>`;
  p.hidden = false;
  $('pSound').addEventListener('click', () => { S.sound = !S.sound; save(); openPanel(); });
  $('pMode2').addEventListener('change', e => { S.voiceMode = e.target.value; devFails = 0; save(); openPanel(); });
  if ($('pVoice')) $('pVoice').addEventListener('change', e => { S.voiceName = e.target.value; save(); pickVoice(); openPanel(); });
  $('pRate').addEventListener('change', e => { S.rate = +e.target.value; save(); });
  $('pMode').addEventListener('change', e => { S.symMode = e.target.value; save(); });
  const showLog = () => { const l = $('pLog'); if (!l) return;
    const route = !S.sound ? '已關閉' : (mode === 'rec' || !twReady()) && mode !== 'device' ? '內建錄音' : '裝置的臺灣華語語音（注音用內建錄音）';
    l.innerHTML = '<b>語音紀錄</b><br>' + (speechLog.length ? speechLog.map(e => `${esc(e.text.slice(0, 16))} → ${statusZh(e.status)}`).join('<br>') : '還沒有說過話。')
      + `<br>現在使用：${route}<br>裝置語音：${voice ? esc(voice.name) + '（' + voice.lang + '）' + (isTW(voice) ? '・臺灣' : '・不是臺灣口音') : '沒有中文語音'}`; };
  const test = text => { const was = S.sound; S.sound = true; speak(text); S.sound = was; [300, 1200, 2600].forEach(ms => setTimeout(showLog, ms)); };
  $('pTest').addEventListener('click', () => test(['ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄊ','ㄋ','ㄌ'].map(c => sayOf(SYMS[c])).join('，')));
  $('pTest2').addEventListener('click', () => test('你好，我是貓頭鷹'));
  showLog();
  $('pReset').addEventListener('click', () => { $('pConfirm').hidden = false; });
  $('pNo').addEventListener('click', () => { $('pConfirm').hidden = true; });
  $('pYes').addEventListener('click', () => { S = fresh(); save(); p.hidden = true; show('gate'); });
  $('pClose').addEventListener('click', () => { p.hidden = true; });
}

/* the recorded voice is loaded after the page is up: it is the biggest file */
(function loadVoice(){ const sc = document.createElement('script'); sc.src = 'js/voice.js'; sc.async = true;
  sc.onload = voiceLoaded; sc.onerror = () => { voiceReady = true; pendingLine = null; }; document.body.append(sc); })();
show('gate');
/* build and decode the world board in the background so the map opens without a blank moment */
(window.requestIdleCallback || (f => setTimeout(f, 600)))(() => { try { WorldArt.board(); } catch(e) {} });
