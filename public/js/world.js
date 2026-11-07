'use strict';
/* ---------- world map: one illustrated board that climbs from the park gate (bottom) through the
   spring garden, summer beach, autumn forest and winter snow to a locked summit (top).
   All coordinates are in a 400-wide board; HTML buttons sit on top at percentage positions. ---------- */
const MAP_W = 400, ZONE = 420, MAP_TOP = 250, MAP_BOT = 150;
const MAP_H = MAP_TOP + ZONE*4 + MAP_BOT;
const zoneBot = z => MAP_H - MAP_BOT - z*ZONE;
const NODE_PT = LEVELS.map((_, i) => [i % 2 ? 288 : 112, MAP_H - MAP_BOT - 70 - i*140]);
const START_PT = [200, MAP_H - 64];
const SUMMIT_PT = [200, 120];
/* the road: P[0] is the start pad, P[k] is stop k-1; segment k runs from P[k] to P[k+1] and leads to stop k */
const ROAD_PTS = [START_PT, ...NODE_PT];
const segD = k => { const [x0,y0] = ROAD_PTS[k], [x1,y1] = ROAD_PTS[k+1], m = (y0+y1)/2; return `M${x0} ${y0}C${x0} ${m} ${x1} ${m} ${x1} ${y1}`; };
const pct = ([x, y]) => `left:${(x/MAP_W*100).toFixed(3)}%;top:${(y/MAP_H*100).toFixed(3)}%`;

/* Performance: SVG lighting filters are expensive and browsers re-run them whenever anything over or inside
   them repaints. So the lit scenery is "baked": each piece of SVG becomes a data-URL picture that the browser
   rasterises once and then just copies. Only small baked pictures (boats, crab, dolphin) and plain outlined parts
   (windmill blades, chimney smoke, lighthouse beam) move. */
const CLAY = `<filter id="wink" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="bl"/><feDiffuseLighting in="bl" surfaceScale="3.2" diffuseConstant="1.3" lighting-color="#ffffff" result="df"><feDistantLight azimuth="235" elevation="48"/></feDiffuseLighting><feSpecularLighting in="bl" surfaceScale="3.2" specularConstant=".8" specularExponent="20" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="48"/></feSpecularLighting><feComposite in="SourceGraphic" in2="df" operator="arithmetic" k1="1.05" result="lit"/><feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/><feComposite in="lit" in2="spi" operator="arithmetic" k2="1" k3=".5" result="sh"/><feComposite in="sh" in2="SourceAlpha" operator="in" result="body"/><feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/><feFlood flood-color="#2b2452"/><feComposite in2="d" operator="in" result="o"/><feOffset in="o" dy="2.8800000000000003" result="dr"/><feComponentTransfer in="dr" result="drop"><feFuncA type="linear" slope=".28"/></feComponentTransfer><feMerge><feMergeNode in="drop"/><feMergeNode in="o"/><feMergeNode in="body"/></feMerge></filter>`;
const bakeURL = (inner, [x, y, w, h]) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w*2}" height="${h*2}">${inner}</svg>`);
const WorldArt = (function(){
  const tree = (x, y, s, c, c2) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="4" rx="22" ry="6" fill="#000" opacity=".12"/><rect x="-4" y="-22" width="8" height="26" rx="3" fill="#8a5a3c"/><circle cx="0" cy="-38" r="22" fill="${c}"/><circle cx="-14" cy="-28" r="14" fill="${c}"/><circle cx="14" cy="-28" r="14" fill="${c2 || c}"/><circle cx="-7" cy="-45" r="7" fill="#fff" opacity=".35"/></g>`;
  /* a cherry tree on the map: dark spreading limbs and a crown made of many small blossom clusters in three tones */
  const blossom = (x, y, s) => { let q = Math.round(x*7 + y*13) | 0; const rr = () => (q = (q*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const limbs = [[-30,-34,-48,-40],[0,-44,6,-58],[28,-34,46,-42],[-14,-40,-28,-56],[16,-42,30,-56]];
    const bark = `<path d="M-5 4 Q-3 -12 -2 -24 L2 -24 Q4 -12 6 4Z" fill="#4a3530"/>` + limbs.map(([a,b,c,d]) => `<path d="M0 -22 Q${a*.4} ${b*.6} ${a} ${b} T${c} ${d}" stroke="#4a3530" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join('');
    const tips = limbs.flatMap(([a,b,c,d]) => [[a,b],[c,d]]);
    let shade = '', body = '', light = '';
    tips.forEach(([tx, ty]) => { for (let k = 0; k < 14; k++) { const ang = rr()*6.283, dd = Math.sqrt(rr())*15, cx = (tx + Math.cos(ang)*dd).toFixed(1), cy = (ty + Math.sin(ang)*dd*.8).toFixed(1);
      shade += `<circle cx="${(+cx + 2).toFixed(1)}" cy="${(+cy + 3).toFixed(1)}" r="${(3 + rr()*2).toFixed(1)}" fill="${k % 2 ? '#e2a0b7' : '#d993ab'}"/>`;
      body += `<circle cx="${cx}" cy="${cy}" r="${(2.6 + rr()*2).toFixed(1)}" fill="${['#f8c6d5','#fbd5e0','#f4b7ca'][k % 3]}"/>`;
      if (Math.sin(ang) < .1) light += `<circle cx="${(+cx - 1).toFixed(1)}" cy="${(+cy - 1.5).toFixed(1)}" r="${(1.4 + rr()*1.2).toFixed(1)}" fill="#fff3f7"/>`; } });
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="3" rx="40" ry="8" fill="#000" opacity=".1"/>${bark}<g opacity=".95">${shade}</g>${body}${light}</g>`; };
  const pine = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="4" rx="20" ry="5" fill="#7fa6c8" opacity=".25"/><rect x="-4" y="-10" width="8" height="14" fill="#7a5440"/>${[[0,22],[16,18],[30,13]].map(([dy,w]) => `<path d="M${-w} ${-10-dy} L${w} ${-10-dy} L0 ${-42-dy}Z" fill="#3f8a6a"/><path d="M${-w*.45} ${-26-dy} L${w*.45} ${-26-dy} L0 ${-42-dy}Z" fill="#fff"/>`).join('')}</g>`;
  const palm = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="3" rx="18" ry="5" fill="#000" opacity=".12"/><path d="M0 0 Q8 -26 4 -56" stroke="#a2723f" stroke-width="7" fill="none" stroke-linecap="round"/>${[-150,-110,-60,-20,20].map(a => `<ellipse cx="4" cy="-56" rx="22" ry="6" fill="#3fae5a" transform="rotate(${a} 4 -56) translate(18 0)"/>`).join('')}<circle cx="0" cy="-52" r="4" fill="#8a5a3c"/><circle cx="8" cy="-53" r="4" fill="#8a5a3c"/></g>`;
  /* a small flower with a stem and leaves: petals as ellipses with a paler inner half */
  const flower = (x, y, c) => `<g transform="translate(${x} ${y})"><path d="M0 12 Q1 6 0 0" stroke="#5f9c48" stroke-width="1.4" fill="none"/><ellipse cx="-2.6" cy="9" rx="2.6" ry="1" fill="#6fae55" transform="rotate(-25 -2.6 9)"/><ellipse cx="2.6" cy="8" rx="2.6" ry="1" fill="#6fae55" transform="rotate(25 2.6 8)"/>${[0,72,144,216,288].map(a => `<ellipse cx="${(Math.cos(a/57.3)*3).toFixed(1)}" cy="${(Math.sin(a/57.3)*3).toFixed(1)}" rx="3.2" ry="2" fill="${c}" transform="rotate(${a} ${(Math.cos(a/57.3)*3).toFixed(1)} ${(Math.sin(a/57.3)*3).toFixed(1)})"/>`).join('')}<circle r="1.9" fill="#f2b21c"/><circle r=".8" cx="-.5" cy="-.5" fill="#ffe680"/></g>`;
  const flowers = (x, y, n) => Array.from({length:n}, (_, i) => flower(x + (i%3)*14 - 14, y + Math.floor(i/3)*12 + (i%2)*4, ['#f59bb8','#ffd84d','#fbfbf6','#9b7ee0'][i%4])).join('');
  const mushroom = (x, y, s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-10" width="8" height="11" rx="3" fill="#fff3df"/><path d="M-12 -9 A12 11 0 0 1 12 -9Z" fill="#e04b3c"/><circle cx="-5" cy="-14" r="2" fill="#fff"/><circle cx="4" cy="-16" r="2.4" fill="#fff"/></g>`;
  const snowman = (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="16" ry="4" fill="#7fa6c8" opacity=".25"/><circle cy="-12" r="14" fill="#fff" stroke="#d3e3f1" stroke-width="2"/><circle cy="-34" r="10" fill="#fff" stroke="#d3e3f1" stroke-width="2"/><circle cx="-3.5" cy="-36" r="1.6" fill="${INK}"/><circle cx="3.5" cy="-36" r="1.6" fill="${INK}"/><path d="M0 -33 l8 2 l-8 2z" fill="#ff8a3d"/><rect x="-10" y="-27" width="20" height="5" rx="2" fill="#e65b6b"/></g>`;
  const boat = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-20 0 H20 L14 9 H-14Z" fill="#e65b4a"/><path d="M0 -2 V-36 L18 -3Z" fill="#fff"/><path d="M-2 -2 V-28 L-15 -3Z" fill="#ffe9a8"/></g>`;
  const wave = (x, y) => `<path d="M${x-12} ${y} q6 -6 12 0 t12 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
  const pond = (x, y, rx, ry, c='#7fd0f0') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" stroke="#ffffff" stroke-width="4" opacity=".95"/><ellipse cx="${x-rx*.3}" cy="${y-ry*.3}" rx="${rx*.3}" ry="${ry*.18}" fill="#fff" opacity=".45"/>`;
  const rock = (x, y, c='#c9c2b8') => `<path d="M${x-12} ${y} Q${x-10} ${y-14} ${x} ${y-14} Q${x+12} ${y-12} ${x+12} ${y}Z" fill="${c}"/>`;
  const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff"><circle cx="0" cy="0" r="20"/><circle cx="22" cy="-8" r="24"/><circle cx="46" cy="0" r="18"/><rect x="0" y="0" width="46" height="18"/></g>`;

  /* ground of each zone; its wavy top edge overlaps the zone above */
  const GROUND = ['#a7dd85', '#6cc7ee', '#f0be7a', '#f4f8fc'];
  const zoneShape = (z, fill) => { const top = zoneBot(z) - ZONE, bot = zoneBot(z) + (z === 0 ? MAP_BOT : 0);
    let d = `M0 ${bot} L0 ${top+10}`; for (let x = 0; x <= 400; x += 50) d += ` Q${x+25} ${top + (x/50 % 2 ? 22 : -14)} ${x+50} ${top+10}`;
    return `<path d="${d} L400 ${bot}Z" fill="${fill}"/>`; };
  /* free spots beside the road, relative to the zone's bottom edge */
  const at = (z, x, dy) => [x, zoneBot(z) + dy];

  /* landmarks: one or two per season, a few of them gently animated */
  const O = 'stroke="#2b2452" stroke-width="2.5" stroke-linejoin="round"';
  const windmill = (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="26" ry="6" fill="#000" opacity=".12"/><path d="M-16 0 L-10 -58 H10 L16 0Z" fill="#fff4e0" ${O}/><path d="M-13 -58 L0 -74 L13 -58Z" fill="#e65b6b" ${O}/><rect x="-6" y="-18" width="12" height="18" rx="5" fill="#9b6b4f" ${O}/><circle cx="0" cy="-38" r="5" fill="#9fd8ff" ${O}/>
    <g data-move="1"><g class="w-spin"><g ${O}>${[0,90,180,270].map(a => `<path d="M0 -62 L-5 -100 L5 -100Z" fill="#ffffff" transform="rotate(${a} 0 -62)"/>`).join('')}</g><circle cx="0" cy="-62" r="4" fill="#ffd466" ${O}/></g></g></g>`;
  const picnic = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-26 0 L-16 -16 H26 L16 0Z" fill="#ff8f8f" ${O}/><path d="M-21 -8 H21 M-6 -16 L-11 0 M8 -16 L3 0" stroke="#fff" stroke-width="2.5"/><rect x="-4" y="-24" width="16" height="10" rx="3" fill="#c98a4a" ${O}/><path d="M-2 -24 Q4 -32 10 -24" fill="none" ${O}/></g>`;
  const fence = (x, y, n=4) => `<g transform="translate(${x} ${y})" ${O}>${Array.from({length:n}, (_, i) => `<rect x="${i*14-2}" y="-20" width="7" height="22" rx="3" fill="#fff4e0"/>`).join('')}<rect x="-4" y="-14" width="${n*14}" height="5" rx="2" fill="#fff4e0"/></g>`;
  const bush = (x, y, c='#6cc25a') => `<g transform="translate(${x} ${y})" ${O}><path d="M-16 0 A9 9 0 0 1 -12 -14 A11 11 0 0 1 8 -16 A9 9 0 0 1 16 0Z" fill="${c}"/></g>`;
  const lighthouse = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-26 6 Q-20 -8 0 -8 Q22 -8 26 6Z" fill="#a7a19a" ${O}/><path d="M-11 -6 L-8 -66 H8 L11 -6Z" fill="#fff" ${O}/><path d="M-10 -26 H10 L9.5 -36 H-9.5Z M-8.6 -50 H8.6 L8.2 -60 H-8.2Z" fill="#e65b6b"/><rect x="-11" y="-80" width="22" height="16" rx="3" fill="#ffe9a8" ${O}/><path d="M-13 -80 L0 -94 L13 -80Z" fill="#e65b6b" ${O}/><path data-move="1" class="beam" d="M11 -72 L58 -86 L58 -58Z" fill="#fff6c8" opacity=".7"/></g>`;
  const umbrella = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-18" y="-6" width="30" height="10" rx="3" fill="#5fb8ff" ${O}/><line x1="0" y1="2" x2="0" y2="-40" stroke="#2b2452" stroke-width="2.5"/><path d="M-26 -36 Q0 -62 26 -36Z" fill="#ff6f8f" ${O}/><path d="M-9 -45 Q0 -60 0 -52 M9 -45 Q0 -60 0 -52" stroke="#fff" stroke-width="3" fill="none"/></g>`;
  const crab = (x, y) => `<g transform="translate(${x} ${y})"><g><ellipse cx="0" cy="-6" rx="12" ry="8" fill="#ff7a5c" ${O}/><path d="M-12 -8 Q-22 -16 -18 -22 M12 -8 Q22 -16 18 -22" fill="none" stroke="#2b2452" stroke-width="2.5"/><circle cx="-18" cy="-23" r="4" fill="#ff7a5c" ${O}/><circle cx="18" cy="-23" r="4" fill="#ff7a5c" ${O}/><circle cx="-4" cy="-10" r="1.8" fill="#2b2452"/><circle cx="4" cy="-10" r="1.8" fill="#2b2452"/></g></g>`;
  const dolphin = (x, y) => `<g transform="translate(${x} ${y})"><g><path d="M-22 4 Q-10 -26 18 -14 Q26 -10 24 -4 Q14 -10 4 -6 Q-8 -2 -14 10Z" fill="#6aa9e8" ${O}/><circle cx="14" cy="-12" r="1.8" fill="#2b2452"/></g>${'<path d="M-30 10 q8 -6 16 0 t16 0 t16 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>'}</g>`;
  const cottage = (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="32" ry="6" fill="#000" opacity=".12"/><rect x="-24" y="-34" width="48" height="34" rx="4" fill="#fff4e0" ${O}/><path d="M-32 -32 L0 -58 L32 -32Z" fill="#c9553a" ${O}/><rect x="12" y="-58" width="9" height="16" fill="#9b6b4f" ${O}/><rect x="-6" y="-20" width="12" height="20" rx="5" fill="#9b6b4f" ${O}/><rect x="-19" y="-26" width="10" height="10" rx="2" fill="#ffd466" ${O}/><rect x="9" y="-26" width="10" height="10" rx="2" fill="#ffd466" ${O}/>
    <g data-move="1"><g class="smoke" fill="#ffffff" opacity=".85"><circle cx="17" cy="-66" r="5"/><circle cx="21" cy="-76" r="6"/><circle cx="16" cy="-87" r="7"/></g></g></g>`;
  const pumpkin = (x, y, s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-9" rx="13" ry="10" fill="#f58b2c" ${O}/><path d="M-4 -18 Q-6 -9 -4 0 M4 -18 Q6 -9 4 0" fill="none" stroke="#c96a1c" stroke-width="2"/><path d="M0 -18 Q1 -24 4 -26" fill="none" stroke="#5e9e4a" stroke-width="3" stroke-linecap="round"/></g>`;
  const hay = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-18" y="-20" width="36" height="20" rx="6" fill="#f2cf6a" ${O}/><path d="M-12 -14 H12 M-12 -7 H12" stroke="#d9a83a" stroke-width="2"/></g>`;
  const igloo = (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="34" ry="6" fill="#7fa6c8" opacity=".25"/><path d="M-30 0 A30 30 0 0 1 30 0Z" fill="#ffffff" ${O}/><path d="M-24 -14 H24 M-29 -5 H29 M-12 -26 V-14 M10 -26 V-14 M-18 -14 V-5 M2 -14 V-5 M20 -14 V-5" stroke="#c9dcef" stroke-width="2"/><path d="M-10 0 A10 11 0 0 1 10 0Z" fill="#5b6b8a" ${O}/></g>`;
  const snowhouse = (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="32" ry="6" fill="#7fa6c8" opacity=".25"/><rect x="-24" y="-32" width="48" height="32" rx="4" fill="#ffd9a8" ${O}/><path d="M-32 -30 L0 -56 L32 -30Z" fill="#5f6f80" ${O}/><path d="M-30 -31 L0 -55 L30 -31 Q20 -26 12 -32 Q4 -26 -6 -32 Q-16 -26 -30 -31Z" fill="#fff"/><rect x="-6" y="-18" width="12" height="18" rx="5" fill="#9b6b4f" ${O}/><rect x="-19" y="-24" width="10" height="10" rx="2" fill="#ffe27a" ${O}/><rect x="9" y="-24" width="10" height="10" rx="2" fill="#ffe27a" ${O}/></g>`;
  const sled = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-20 -8 H16 L20 -14" fill="none" stroke="#2b2452" stroke-width="3" stroke-linecap="round"/><rect x="-16" y="-20" width="30" height="9" rx="3" fill="#e65b6b" ${O}/><path d="M-12 -11 V-8 M8 -11 V-8" stroke="#2b2452" stroke-width="2.5"/></g>`;
  /* little texture marks scattered over each zone's ground */
  function texture(z, r){ const top = zoneBot(z) - ZONE + 20, out = [];
    for (let i = 0; i < 46; i++) { const x = 10 + r()*380, y = top + r()*(ZONE - 30);
      if (z === 0) out.push(`<path d="M${x-4} ${y} l2 -6 l2 6 l2 -7 l2 7" fill="none" stroke="#7fc464" stroke-width="2" stroke-linecap="round"/>`);
      else if (z === 1) out.push(`<path d="M${x-6} ${y} q3 -3 6 0 t6 0" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".7"/>`);
      else if (z === 2) out.push(`<path d="M${x} ${y-4} q4 4 0 8 q-4 -4 0 -8Z" fill="${['#e88a2f','#d9552f','#e6b03a'][i%3]}" opacity=".75" transform="rotate(${Math.round(r()*180)} ${x} ${y})"/>`);
      else out.push(`<path d="M${x} ${y-3} V${y+3} M${x-3} ${y} H${x+3}" stroke="#a9c8e4" stroke-width="1.6" stroke-linecap="round"/>`); }
    return out.join(''); }
  const rand = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* a whole moving item (boat, crab, dolphin): lit once into its own small picture, then the picture moves */
  let MOVERS = [];
  const mover = (item, [x, y], cls, delay=0) => {
    const box = [x - 44, y - 64, 88, 84];
    MOVERS.push(`<g class="${cls}" style="animation-delay:${delay}s"><image href="${bakeURL(`<defs>${CLAY}</defs><g filter="url(#wink)">${item}</g>`, box)}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"/></g>`);
    return ''; };
  function zoneDeco(z){
    const p = (x, dy) => at(z, z % 2 ? 400 - x : x, dy);  /* zones 2 and 4 run mirrored */
    const raw = (x, dy) => at(z, x, dy);
    if (z === 0) return [
      blossom(...p(345,-92), 1.1), flowers(...p(360,-150), 6), pond(...p(52,-215), 34, 18), flowers(...p(60,-275), 5),
      blossom(...p(342,-370), 1), flowers(...p(372,-300), 3), tree(...p(40,-395), .8, '#7fcf6a', '#6cc25a'), flowers(...p(36,-120), 4), rock(...p(380,-235)),
      windmill(...p(255,-318)), picnic(...p(250,-92)), fence(...p(130,-232), 4), bush(...p(178,-245)), bush(...p(372,-195), '#7fcf6a')
    ];
    if (z === 1) {
      /* summer is a sand island along the road in a blue sea */
      const top = zoneBot(1) - ZONE;
      let island = ''; for (let k = 3; k <= 6; k++) island += `<path d="${segD(k)}" stroke="#f7dfa3" stroke-width="150" fill="none" stroke-linecap="round"/>`;
      let island2 = ''; for (let k = 3; k <= 6; k++) island2 += `<path d="${segD(k)}" stroke="#2b2452" stroke-width="158" fill="none" stroke-linecap="round"/><path d="${segD(k)}" stroke="#fff6dc" stroke-width="154" fill="none" stroke-linecap="round"/>`;
      return [`<clipPath id="zc1"><rect x="0" y="${top-20}" width="400" height="${ZONE+20}"/></clipPath><g clip-path="url(#zc1)">${island2}${island}</g>`,
        mover(boat(...p(338,-95)), p(338,-95), 'bob'), wave(...p(372,-40)), wave(...p(300,-150)), wave(...p(52,-200)), wave(...p(30,-260)), wave(...p(90,-240)),
        mover(boat(...p(345,-330)), p(345,-330), 'bob', -1.2), wave(...p(370,-390)), palm(...p(52,-40), .9), palm(...p(345,-205), .85), palm(...p(52,-395), .8),
        lighthouse(...raw(52,-312)), umbrella(...raw(222,-112)), mover(crab(...raw(160,-292)), raw(160,-292), 'scuttle'), mover(dolphin(...raw(345,-262)), raw(345,-262), 'leap'),
        `<g transform="translate(${p(182,-80).join(' ')})"><path d="M0 -9 L2.5 -3 L9 -3 L4 1 L6 8 L0 4 L-6 8 L-4 1 L-9 -3 L-2.5 -3Z" fill="#ff8a5c" ${O}/></g>`
      ];
    }
    if (z === 2) return [
      tree(...p(342,-92), 1.05, '#f59a3c', '#e88a2f'), mushroom(...p(372,-160)), mushroom(...p(352,-170), .8), tree(...p(48,-208), 1, '#e8613c', '#d9552f'),
      mushroom(...p(70,-270)), tree(...p(345,-372), 1, '#f7c948', '#efb93a'), tree(...p(375,-300), .7, '#e8613c'), tree(...p(36,-400), .7, '#f59a3c'),
      rock(...p(30,-110), '#d9a46a'), cottage(...p(258,-318)), pumpkin(...p(140,-232)), pumpkin(...p(165,-224), .8), pumpkin(...p(150,-212), .9), hay(...p(250,-92)), fence(...p(214,-60), 3)
    ];
    return [
      pine(...p(345,-88), 1.05), pine(...p(380,-165), .7), pond(...p(52,-215), 36, 18, '#cfeaf9'), pine(...p(66,-280), .75),
      pine(...p(342,-372), 1), snowman(...p(372,-290)), pine(...p(36,-398), .8), pine(...p(28,-110), .7),
      igloo(...p(255,-312)), snowhouse(...p(150,-228)), sled(...p(250,-90))
    ];
  }

  function svg(){
    const sky = `<linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9dcff"/><stop offset="1" stop-color="#eaf5ff"/></linearGradient>`;
    /* sticker outline: every scenery piece gets an ink edge, matching the buttons and the park gate */
    /* clay: soft 3D lighting (diffuse + specular from the upper left), an ink outline and a small drop shadow, shared by every scenery piece */
    const ink = CLAY;
    MOVERS = [];
    let out = `<defs>${sky}${ink}</defs>`;
    out += `<rect width="${MAP_W}" height="${MAP_H}" fill="url(#wsky)"/>`;
    /* summit: snowy peaks and drifting clouds above the winter zone */
    out += `<g filter="url(#wink)"><path d="M0 ${MAP_TOP+40} L70 ${MAP_TOP-90} L130 ${MAP_TOP-20} L210 ${MAP_TOP-150} L290 ${MAP_TOP-30} L340 ${MAP_TOP-100} L400 ${MAP_TOP-10} V${MAP_TOP+60} H0Z" fill="#c9dcf0"/></g>`;
    out += `<path d="M70 ${MAP_TOP-90} L54 ${MAP_TOP-62} L70 ${MAP_TOP-68} L86 ${MAP_TOP-60}Z M210 ${MAP_TOP-150} L188 ${MAP_TOP-112} L210 ${MAP_TOP-120} L232 ${MAP_TOP-110}Z M340 ${MAP_TOP-100} L326 ${MAP_TOP-76} L340 ${MAP_TOP-80} L354 ${MAP_TOP-74}Z" fill="#fff"/>`;
    out += `${cloud(20, 60, .9)}${cloud(300, 40, .8)}${cloud(150, 150, .7)}`;
    for (let z = 3; z >= 0; z--) out += zoneShape(z, GROUND[z]).replace('/>', ' stroke="#2b2452" stroke-width="3"/>');
    for (let z = 0; z < 4; z++) out += texture(z, rand(97 + z*13));
    for (let z = 0; z < 4; z++) out += zoneDeco(z).map(d => `<g filter="url(#wink)">${d}</g>`).join('');
    /* the road: a dark edge, the sandy road, then dashes; segments not yet unlocked stay as faint dotted tracks */
    let under = '', road = '', dots = '', faint = '';
    for (let k = 0; k < LEVELS.length; k++) {
      const d = segD(k);
      if (isOpen(k)) { under += `<path d="${d}"/>`; road += `<path d="${d}"/>`; dots += `<path d="${d}"/>`; }
      else faint += `<path d="${d}"/>`;
    }
    const last = NODE_PT[NODE_PT.length-1];
    faint += `<path d="M${last[0]} ${last[1]} C${last[0]} ${(last[1]+SUMMIT_PT[1])/2} ${SUMMIT_PT[0]} ${(last[1]+SUMMIT_PT[1])/2} ${SUMMIT_PT[0]} ${SUMMIT_PT[1]}"/>`;
    out += `<g fill="none" stroke-linecap="round"><g stroke="#ffffff" stroke-width="12" stroke-dasharray="2 18" opacity=".9">${faint}</g>
      <g stroke="#2b2452" stroke-width="34">${under}</g><g stroke="#f6dea6" stroke-width="27">${road}</g><g stroke="#e8c98c" stroke-width="5" stroke-dasharray="3 11">${dots}</g></g>`;
    /* start pad: keep the gate above the road so the road meets its entrance instead of painting over it */
    const [sx, sy] = START_PT;
    out += `<g filter="url(#wink)"><g transform="translate(${sx} ${sy+8})"><ellipse cx="0" cy="6" rx="60" ry="10" fill="#000" opacity=".1"/><path d="M-40 0 V-34 A40 40 0 0 1 40 -34 V0 H28 V-34 A28 28 0 0 0 -28 -34 V0Z" fill="#ffffff" stroke="#ffd466" stroke-width="3"/>
      <rect x="-52" y="-48" width="16" height="50" rx="5" fill="#7d85f4"/><rect x="36" y="-48" width="16" height="50" rx="5" fill="#7d85f4"/><path d="M-44 -76 L-56 -48 H-32Z M44 -76 L32 -48 H56Z" fill="#ff6fa3"/>
      <path d="M-50 -60 L-44 -76 L-47 -58Z M38 -58 L44 -76 L41 -60Z" fill="#fff" opacity=".85"/><circle cx="-44" cy="-36" r="4" fill="#ffd466"/><circle cx="44" cy="-36" r="4" fill="#ffd466"/>
      <rect x="-20" y="-84" width="40" height="18" rx="9" fill="#ff6fa3" stroke="#fff" stroke-width="2"/><path d="M0 -81 l3 6 h6 l-5 4 l2 6 l-6 -4 l-6 4 l2 -6 l-5 -4 h6z" fill="#ffd84d"/></g></g>`;
    /* a stepping pad under every stop */
    out += `<g filter="url(#wink)">` + NODE_PT.map(([x, y], i) => `<ellipse cx="${x}" cy="${y+36}" rx="48" ry="15" fill="#2b2452" opacity=".35"/><ellipse cx="${x}" cy="${y+30}" rx="48" ry="15" fill="${['#8ccf6c','#e6c27a','#d98a43','#c9dcef'][seasonOf(i)]}" stroke="#2b2452" stroke-width="3"/><ellipse cx="${x}" cy="${y+26}" rx="40" ry="9" fill="#ffffff" opacity=".35"/>`).join('') + `</g>`;
    /* lift the moving parts (data-move) out of the static picture, keeping their position */
    const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${out}</svg>`, 'image/svg+xml');
    const parts = [...doc.querySelectorAll('[data-move]')].map(n => {
      let html = n.outerHTML, a = n.parentElement;
      for (; a && a.tagName !== 'svg'; a = a.parentElement) if (a.getAttribute('transform')) html = `<g transform="${a.getAttribute('transform')}">${html}</g>`;
      n.remove(); return html; });
    const still = doc.documentElement.innerHTML;
    /* four tiles keep each picture a reasonable size for phones */
    const TILE = MAP_H / 4;
    const tiles = [0, 1, 2, 3].map(t => bakeURL(still, [0, t*TILE, MAP_W, TILE]));
    const overlay = `<svg class="world-anim" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none" aria-hidden="true">${MOVERS.join('')}${parts.join('')}
      <g id="walkSegs" fill="none" stroke="none">${LEVELS.map((_, k) => `<path data-k="${k}" d="${segD(k)}"/>`).join('')}</g></svg>`;
    return {tiles, overlay};
  }
  /* boards depend only on how many stops are open, so each one is built (and decoded) once */
  const cache = {};
  function board(){
    const key = LEVELS.filter((_, i) => isOpen(i)).length;
    if (!cache[key]) { cache[key] = svg(); cache[key].tiles.forEach(u => { const im = new Image(); im.src = u; im.decode && im.decode().catch(() => {}); }); }
    return cache[key];
  }
  function html(){
    const b = board();
    return b.tiles.map((u, t) => `<img class="world-tile" src="${u}" alt="" decoding="async" style="top:${t*25}%">`).join('') + b.overlay;
  }
  return {html, board};
})();
