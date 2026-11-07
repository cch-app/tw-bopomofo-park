'use strict';
/* ---------- state ---------- */
const HEROES = [
  {id:'doudou', name:'豆豆'}, {id:'bobo', name:'波波'}, {id:'xiaoju', name:'小橘'},
  {id:'paopao', name:'泡泡'}, {id:'xingxing', name:'星星'}
];
const STAGES = [{min:0,name:'小寶寶'},{min:8,name:'小探險家'},{min:20,name:'勇敢探險家'},{min:37,name:'注音小博士'}];
const KEY = 'little-lantern-land-v2';  /* storage key kept from the old name so saved progress carries over */
const fresh = () => ({hero:null, stickers:[], done:[], sound:true, lessons:0, seasonSeen:0, mapAt:-1, symMode:'auto', voiceName:'', deviceVoice:false, voiceMode:'auto', rate:.85});
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); S = Object.assign(fresh(), o); if (!o.voiceMode && o.deviceVoice) S.voiceMode = 'device'; } } catch(e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };
const stageOf = n => STAGES.reduce((s, st, i) => n >= st.min ? i : s, 0);
const heroOf = () => HEROES.find(h => h.id === S.hero) || HEROES[0];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isOpen = i => i === 0 || S.done.includes(i - 1);

