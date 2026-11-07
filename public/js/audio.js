'use strict';
/* ---------- sound + Taiwan Mandarin voice ---------- */
let AC = null;
function ac(){ if(!S.sound) return null; try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); return AC; }catch(e){ return null; } }
function tone(f, t, d, type='sine', v=.16){ const a=ac(); if(!a) return; const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.value=f; const s=a.currentTime+t; g.gain.setValueAtTime(0,s); g.gain.linearRampToValueAtTime(v,s+.02); g.gain.exponentialRampToValueAtTime(.001,s+d); o.connect(g).connect(a.destination); o.start(s); o.stop(s+d+.05); }
const chime = () => [523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,i*.08,.5,'triangle'));
const thud  = () => { tone(330,0,.25,'sine',.12); tone(262,.12,.3,'sine',.1); };
const whoosh= () => [392,440,523,587,659,784,880,1047,1175,1319].forEach((f,i)=>tone(f,i*.06,.6,'sine',.09));
/* a soft paper swish for turning a page */
function pageFlip(){ const a = ac(); if (!a) return; try {
  const n = Math.floor(a.sampleRate * .35), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * t), 2) * (1 - t * .5); }
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = .7; g.gain.value = .22;
  src.connect(f).connect(g).connect(a.destination); src.start(); } catch(e) {} }
const peel  = () => { tone(1568,0,.08,'square',.04); tone(1046,.05,.25,'triangle',.12); };
const TW_NAMES = /mei-?jia|hsiao ?chen|hsiao ?yu|hanhan|yating|zhiwei|yunjhe|taiwan|臺灣|台灣/i;
let voice = null;
const zhVoices = () => { try { return speechSynthesis.getVoices().filter(v => /^(zh|cmn)/i.test(v.lang) || TW_NAMES.test(v.name)); } catch(e) { return []; } };
const isTW = v => !!v && (/zh[-_]TW|cmn[-_]TW|zh[-_]Hant[-_]TW/i.test(v.lang) || TW_NAMES.test(v.name));
/* Taiwan voices only: a Mainland voice gives the wrong accent and reads several symbols differently, so it is
   never picked automatically. A grown-up can still choose any Chinese voice in the panel. */
function pickVoice(){ try{
  const vs = zhVoices();
  const chosen = S.voiceName && vs.find(v => v.name === S.voiceName);
  const score = v => (TW_NAMES.test(v.name)?2:0) + (/natural|neural|online|premium|enhanced/i.test(v.name)?1:0) + (/female|mei|hsiao|hanhan|yating/i.test(v.name)?1:0);
  /* a Taiwan voice if there is one; otherwise any Chinese voice, because an unset voice can leave the browser on one
     that cannot read Chinese at all, which is silent */
  voice = chosen || vs.filter(isTW).sort((a,b) => score(b)-score(a))[0] || vs.filter(v => !/HK|yue|Cantonese/i.test(v.lang + v.name)).sort((a,b) => score(b)-score(a))[0] || null;
}catch(e){} }
const isTwVoice = () => isTW(voice);
try{ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }catch(e){}
/* Some voices (Android's Taiwan voice in particular) say nothing for a zhuyin symbol on its own. symSilent is set
   when that is detected (see primeSpeech and speak), and from then on the sound-alike character is used instead. */
let symSilent = false, primed = false;
/* what to say for a zhuyin symbol: a recorded clip if there is one; the symbol itself for Taiwan voices that can
   read it (ㄅ = bo); otherwise the sound-alike character. Grown-ups can override in the panel. */
function sayOf(y){
  if (AUDIO[y.s]) return y.s;
  if (S.symMode === 'char') return y.snd;
  if (symSilent) return y.snd;
  if (S.symMode === 'symbol') return y.s;
  return isTwVoice() ? y.s : y.snd;
}
/* alternative text for the same thing, used if the voice turns out to be silent for symbols */
const altOf = text => { let t = text; for (const k in SYMS) if (t.includes(k)) t = t.split(k).join(SYMS[k].snd); return t === text ? null : t; };

let clip = null, liveUtterance = null, retry = 0;
/* ---- recorded voice: two playback routes ----
   Route 1 is an <audio> element (on iPhone and iPad it plays even with the silent switch on). Route 2 is Web Audio, the
   same engine as the chimes. A clip tries route 1 and, if the device refuses it, plays through route 2; a device that
   refused route 1 once uses route 2 first from then on. Neither route is ever switched off for good.
   Phones only allow sound that starts in a tap, so the first touch anywhere unlocks both routes. */
const player = (() => { try { const a = new Audio(); a.preload = 'auto'; a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', ''); return a; } catch(e) { return null; } })();
/* Keep the browser-unlock element separate from the voice player. Reusing
   player here lets the first real tap pause the silent unlock playback just
   before the requested clip starts, which can make the clip silently fail. */
const unlocker = (() => { try { const a = new Audio(); a.preload = 'auto'; a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', ''); return a; } catch(e) { return null; } })();
let playToken = 0, htmlRefused = false, webSrc = null, unlocks = 0, voiceReady = false, pendingLine = null;
const VOICE_WAIT_MS = 30000;
const SILENCE = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAACQAABCAARUVFRUVFRUVFRUVdXV1dXV1dXV1dXXR0dHR0dHR0dHR0i4uLi4uLi4uLi4uioqKioqKioqKiorq6urq6urq6urq60dHR0dHR0dHR0dHo6Ojo6Ojo6Ojo6P//////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQD8AAAAAAAAAQgDeb0IwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
/* the first touches unlock sound: resume Web Audio, play a silent clip on the <audio> element, and ask iPhones to
   treat this page as media playback (so the silent switch does not mute it) */
function unlockAudio(){
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch(e) {}
  const a = ac();
  if (a) { try { if (a.state !== 'running') a.resume(); const b = a.createBuffer(1, 1, 22050), src = a.createBufferSource(); src.buffer = b; src.connect(a.destination); src.start(0); } catch(e) {} }
  if (unlocker && unlocks < 2 && unlocker.paused) { unlocks++; try { unlocker.src = SILENCE; const p = unlocker.play(); if (p && p.catch) p.catch(() => {}); } catch(e) {} }
}
['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, {capture: true, passive: true}));
function unlockPlayer(){ unlockAudio(); }
/* Web Audio route: clips are decoded once and kept */
const decoded = {};
function b64buf(url){ const s = atob(url.slice(url.indexOf(',') + 1)), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
function decodeClip(key){
  if (!decoded[key]) decoded[key] = new Promise((res, rej) => { const a = ac(); if (!a) return rej(new Error('no Web Audio'));
    try { const p = a.decodeAudioData(b64buf(AUDIO[key]), res, rej); if (p && p.catch) p.catch(rej); } catch(e) { rej(e); } });
  return decoded[key];
}
function stopClips(){ try { if (player) player.pause(); } catch(e) {} try { if (webSrc) webSrc.stop(); } catch(e) {} webSrc = null; }
function playWeb(key, token){
  return decodeClip(key).then(buf => {
    if (token !== playToken) return;
    const a = ac(); if (a.state !== 'running') a.resume();
    const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination); src.start(0); webSrc = src;
    logSpeech(key, 'recorded voice (Web Audio): playing'); src.onended = () => { if (webSrc === src) webSrc = null; logSpeech(key, 'recorded voice: ended'); };
  });
}
function playHtml(key, token){
  return new Promise((res, rej) => {
    if (!player) return rej(new Error('no audio element'));
    try { player.src = AUDIO[key]; player.currentTime = 0; player.playbackRate = Math.max(.75, Math.min(1.2, (S.rate || .85) / .85)); } catch(e) {}
    player.onended = () => logSpeech(key, 'recorded voice: ended');
    let p; try { p = player.play(); } catch(e) { return rej(e); }
    if (p && p.then) p.then(() => { if (token === playToken) logSpeech(key, 'recorded voice: playing'); res(); }, rej); else res();
  });
}
function playClip(plain){
  const token = ++playToken;
  try { const ss = window.speechSynthesis; if (ss && (ss.speaking || ss.pending)) ss.cancel(); } catch(e) {}
  retry++;                                                    /* cancels any device-voice line still waiting to start */
  stopClips(); logSpeech(plain, 'recorded voice: sent');
  const viaWeb = () => playWeb(plain, token);
  const first = htmlRefused ? viaWeb() : playHtml(plain, token).catch(err => { htmlRefused = true; logSpeech(plain, 'audio element refused (' + (err && err.name || 'error') + '), using Web Audio'); return viaWeb(); });
  first.catch(err => { logSpeech(plain, 'recorded voice failed (' + (err && err.message || 'error') + '), using device voice');
    if (token === playToken) speakDevice(plain, false); });
  return true;
}
/* the recorded voice loads after the page is up; a line asked for before then waits for it (up to 8 s) */
function voiceLoaded(){
  voiceReady = true;
  if (pendingLine && performance.now() - pendingLine.t < VOICE_WAIT_MS) speak(pendingLine.text, true);
  pendingLine = null;
}
/* what the voice reported for the last few lines, shown in the grown-ups panel */
const speechLog = [];
const logSpeech = (text, status) => { const e = speechLog.find(x => x.text === text && x.open); if (e) { e.status = status; if (/ended|error|no-start/.test(status)) e.open = false; } else { speechLog.unshift({text, status, voice: voice ? voice.name : '(browser default)', open: true}); speechLog.length = Math.min(speechLog.length, 6); } };
/* Chrome, Edge, Android and the Claude desktop app drop a line spoken right after cancel(); Safari (iPhone, iPad, Mac)
   instead wants the line started at once, inside the tap */
const BLINK = /Chrome\/|Chromium|Electron|Android/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|iPhone|iPad/.test(navigator.userAgent);
function utter(text){
  const u = new SpeechSynthesisUtterance(text);
  if (!voice) pickVoice();
  u.lang = 'zh-TW'; if (voice) u.voice = voice; u.rate = S.rate || .85; u.pitch = 1.0;
  return u;
}
/* Speak a line. Robust against the browser quirks that made some speaker buttons silent:
   - Chrome and Android drop a line spoken right after cancel(), so wait a moment after cancelling;
   - Chrome can lose a line whose utterance object is garbage-collected, so keep a reference until it ends;
   - a line that never starts is tried once more;
   - a line made only of zhuyin that ends at once (the voice skipped it) is spoken again with sound-alike characters. */
/* Which voice says a line (same rule as the 臺灣華語 game: Taiwan accent only):
   - 'auto' (default): this device's Taiwan Mandarin voice (Mei-Jia, 國語（臺灣）, HsiaoChen …) for every line without
     zhuyin in it; lines with zhuyin symbols, and devices with no Taiwan voice, use the built-in recordings, whose
     symbols carry their Taiwan classroom names. If the device voice does not start, the recording plays instead.
   - 'rec': always the built-in recordings.  - 'device': always the device voice (recordings only as a fallback). */
const HAS_SYM = /[ㄅ-ㄩ]/;
let devFails = 0;
const twReady = () => { if (!voice) pickVoice(); return isTW(voice) && devFails < 2; };
function speak(text, fromTap = false){
  if (!S.sound || !text) return;
  const plain = String(text).replace(/[「」]/g, '');
  const mode = S.voiceMode || 'auto', clip = !!AUDIO[plain];
  const late = performance.now() > VOICE_WAIT_MS;     /* allow the local recording bundle time to finish after heavy scenes */
  if (mode === 'device' || (mode === 'auto' && twReady() && !HAS_SYM.test(plain))) { speakDevice(plain, true); return; }
  if (clip) { playClip(plain); return; }
  if (!voiceReady && !late) {
    /* Keep tap requests until the local recording bundle is ready. The tap has
       already unlocked Web Audio, so playClip can still start through that
       route when voiceLoaded() replays the request. */
    pendingLine = {text: plain, t: performance.now()}; logSpeech(plain, 'waiting for the recorded voice to load'); return;
  }
  speakDevice(plain, false);
}
/* the device voice; with clipBack, a line that fails or never starts is played from the recordings instead */
function speakDevice(text, clipBack){
  let plain = text;
  const toClip = why => { if (!clipBack || !AUDIO[text]) return false; devFails++; logSpeech(plain, why + ', using the recording'); try { window.speechSynthesis.cancel(); } catch(e) {} playClip(text); return true; };
  if (symSilent) plain = altOf(plain) || plain;
  let ss; try { ss = window.speechSynthesis; if (!ss) { toClip('no device voice'); return; } } catch(e) { toClip('no device voice'); return; }
  ++playToken; stopClips();                                     /* a recording still playing gives way */
  const id = ++retry, onlySym = /^[ㄅ-ㄩˊˇˋ˙，、 ]+$/.test(plain);
  const go = attempt => {
    if (id !== retry) return;                               /* a newer line replaced this one */
    let started = 0, ended = false;
    const t0 = performance.now(), u = utter(plain);
    u.onstart = () => { started = performance.now(); devFails = 0; logSpeech(plain, 'speaking'); };
    u.onend = () => { ended = true; logSpeech(plain, started ? 'ended' : 'ended without starting'); if (liveUtterance === u) liveUtterance = null;
      /* ended almost at once without saying the zhuyin: this voice cannot read symbols */
      if (onlySym && performance.now() - (started || t0) < 160 && !symSilent) { symSilent = true; const alt = altOf(plain); if (alt && id === retry) speak(alt); } };
    u.onerror = e => { ended = true; logSpeech(plain, 'error: ' + (e.error || 'unknown')); if (liveUtterance === u) liveUtterance = null;
      if (id === retry && !/interrupted|canceled/.test(e.error || '') && toClip('device voice error')) return;
      if (onlySym && !symSilent && !/interrupted|canceled/.test(e.error || '')) { symSilent = true; const alt = altOf(plain); if (alt && id === retry) speak(alt); } };
    liveUtterance = u;
    logSpeech(plain, 'sent');
    try { if (ss.paused) ss.resume(); ss.speak(u); } catch(e) { logSpeech(plain, 'error: ' + e.message); }
    setTimeout(() => { if (id === retry && !started && !ended && !ss.speaking && toClip('device voice did not start')) return;
    if (id === retry && !started && !ended && !ss.speaking) logSpeech(plain, 'no-start' + (attempt < 1 ? ', retrying' : ''));
    if (id === retry && !started && !ended && !ss.speaking && attempt < 1) { try { ss.cancel(); } catch(e) {} setTimeout(() => go(attempt + 1), 80); } }, 1300);
  };
  let busy = false; try { busy = ss.speaking || ss.pending; if (busy) ss.cancel(); } catch(e) {}
  if (busy && BLINK) setTimeout(() => go(0), 90); else go(0);
}
/* On the first tap (the gate), quietly check whether this voice can say a zhuyin symbol, then run next(). */
function primeSpeech(next){
  unlockPlayer();
  if (primed || !S.sound || AUDIO['ㄅ'] || S.symMode === 'char' || !isTwVoice()) { primed = true; next && next(); return; }
  primed = true;
  let ss; try { ss = window.speechSynthesis; } catch(e) {}
  if (!ss) { next && next(); return; }
  let done = false, started = 0; const t0 = performance.now();
  const finish = () => { if (done) return; done = true; next && next(); };
  const u = utter('ㄅ'); u.volume = .01;
  u.onstart = () => { started = performance.now(); };
  u.onend = () => { if (performance.now() - (started || t0) < 160) symSilent = true; finish(); };
  u.onerror = () => { symSilent = true; finish(); };
  liveUtterance = u;
  /* same rule as speak(): never speak straight after a cancel */
  let busy = false; try { busy = ss.speaking || ss.pending; if (busy) ss.cancel(); } catch(e) {}
  setTimeout(() => { try { ss.speak(u); } catch(e) { finish(); } }, busy ? 90 : 0);
  setTimeout(finish, 1500);
}
