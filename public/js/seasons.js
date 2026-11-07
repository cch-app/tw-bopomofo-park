'use strict';
/* ---------- four seasons: the daytime scene behind every screen and the decorations on the moon gate ----------
   Season 0 spring garden (stops 1–3), 1 summer beach (4–6), 2 autumn forest (7–9), 3 winter snow (10–12).
   Performance: the scenery is painted once per season (and on resize) straight into the #sky canvas and never
   redrawn per frame. Only the falling petals, bubbles, leaves and snowflakes animate, on a separate light canvas
   at 1x resolution. A season change fades out a snapshot of the old scene with a CSS transition. */
const Seasons = (function(){
  const cv = document.getElementById('sky'), sc = cv.getContext('2d');
  const fx = document.createElement('canvas'); fx.id = 'skyfx'; fx.setAttribute('aria-hidden', 'true'); cv.after(fx);
  const cx = fx.getContext('2d');
  let W = 0, H = 0, dpr = 1, cur = -1, parts = [], running = false;
  const rnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---- shared painting helpers ---- */
  function sky(g, top, mid, bot){ const gr = g.createLinearGradient(0,0,0,H); gr.addColorStop(0,top); gr.addColorStop(.6,mid); gr.addColorStop(1,bot); g.fillStyle = gr; g.fillRect(0,0,W,H); }
  function sun(g, x, y, r, col, rays){
    const gl = g.createRadialGradient(x,y,r*.6,x,y,r*3); gl.addColorStop(0,'rgba(255,248,200,.7)'); gl.addColorStop(1,'rgba(255,248,200,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x,y,r*3,0,7); g.fill();
    if (rays) { g.strokeStyle = col; g.lineWidth = r*.16; g.lineCap = 'round';
      for (let i = 0; i < 10; i++) { const a = i/10*Math.PI*2; g.beginPath(); g.moveTo(x+Math.cos(a)*r*1.3, y+Math.sin(a)*r*1.3); g.lineTo(x+Math.cos(a)*r*1.65, y+Math.sin(a)*r*1.65); g.stroke(); } }
    g.fillStyle = col; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
  }
  /* a lit sphere: flat colour, then a highlight from the upper left and a soft shade on the lower right */
  function ball(g, x, y, r, c){ g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    const h = g.createRadialGradient(x - r*.38, y - r*.42, r*.05, x, y, r*1.05);
    h.addColorStop(0, 'rgba(255,255,255,.75)'); h.addColorStop(.38, 'rgba(255,255,255,0)'); h.addColorStop(.78, 'rgba(43,36,82,0)'); h.addColorStop(1, 'rgba(43,36,82,.22)');
    g.fillStyle = h; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function cloud(g, x, y, s, a=.95){ g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath();
    [[0,0,1],[1,-.35,1.15],[2.1,0,.95],[1,.25,1]].forEach(([dx,dy,r]) => { g.moveTo(x+dx*s*28+r*s*24, y+dy*s*28); g.arc(x+dx*s*28, y+dy*s*28, r*s*24, 0, 7); }); g.fill();
    const sh = g.createLinearGradient(0, y - s*30, 0, y + s*28); sh.addColorStop(0,'rgba(255,255,255,0)'); sh.addColorStop(.55,'rgba(255,255,255,0)'); sh.addColorStop(1,'rgba(150,170,210,.35)');
    g.fillStyle = sh; g.beginPath(); [[0,0,1],[1,-.35,1.15],[2.1,0,.95],[1,.25,1]].forEach(([dx,dy,r]) => { g.moveTo(x+dx*s*28+r*s*24, y+dy*s*28); g.arc(x+dx*s*28, y+dy*s*28, r*s*24, 0, 7); }); g.fill(); }
  /* a rolling hill whose top edge sits near y0 */
  function hill(g, y0, amp, waves, phase, col){ g.fillStyle = col; g.beginPath(); g.moveTo(0,H);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 + Math.sin(x/W*Math.PI*waves + phase)*amp); g.lineTo(W,H); g.closePath(); g.fill(); }
  const hillY = (x, y0, amp, waves, phase) => y0 + Math.sin(x/W*Math.PI*waves + phase)*amp;
  const U = () => Math.min(W, H) / 100;  /* scale unit so scenery reads the same on phone and desktop */
  /* a hill with light from above: a vertical gradient instead of a flat fill */
  function hillGrad(g, y0, amp, waves, phase, top, bot){ const gr = g.createLinearGradient(0, y0 - amp, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); hill(g, y0, amp, waves, phase, gr); }
  /* a cherry tree: a short dark trunk splitting into wide, spreading limbs; each twig carries a cloud of
     blossom painted as hundreds of tiny flowers in three tones (shade, body, sunlit), with dark twigs showing
     through and fallen petals on the grass. far < 1 paints a small, hazy tree on a distant hill. */
  function sakura(g, r, x, y, h, far = 1, lean = 0){
    const u = U(), tips = [], haze = far < 1;
    const barkA = haze ? '#8a7470' : '#3b2a27', barkB = haze ? '#9a8480' : '#57403a';
    if (!haze) { g.fillStyle = 'rgba(50,90,40,.2)'; g.beginPath(); g.ellipse(x + lean*h*.08, y + u*.4, h*.62, h*.07, 0, 0, 7); g.fill(); }
    const limb = (x0, y0, len, ang, w, d) => {
      const x1 = x0 + Math.cos(ang)*len, y1 = y0 + Math.sin(ang)*len;
      const mx = (x0 + x1)/2 + (r() - .5)*len*.3, my = (y0 + y1)/2 + (r() - .5)*len*.3;
      g.strokeStyle = d > 3 ? barkA : barkB; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
      if (!haze && w > u*.9) { g.strokeStyle = 'rgba(255,235,225,.13)'; g.lineWidth = w*.3; g.beginPath(); g.moveTo(x0 - w*.22, y0); g.quadraticCurveTo(mx - w*.22, my, x1 - w*.22, y1); g.stroke(); }
      if (d <= 3) tips.push([(x0 + x1)/2, (y0 + y1)/2, len*.75]);
      if (d === 0) { tips.push([x1, y1, len]); return; }
      const n = d >= 4 ? 2 + (r() < .5 ? 1 : 0) : 2;
      for (let i = 0; i < n; i++) {
        let a = ang + (i - (n - 1)/2)*(.5 + r()*.35) + (r() - .5)*.25;
        a = a*.85 + (-Math.PI/2)*.15 - (d < 3 ? 0 : 0);             /* twigs keep reaching up and out */
        limb(x1, y1, len*(.68 + r()*.14), a, w*.64, d - 1);
      }
    };
    const depth = haze ? 3 : 5, trunk = h*.3, w0 = h*(haze ? .05 : .075);
    const tx = x + lean*h*.04, ty = y - trunk;
    g.strokeStyle = barkA; g.lineWidth = w0; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y + w0*.2); g.quadraticCurveTo(x + lean*h*.05, y - trunk*.5, tx, ty); g.stroke();
    if (!haze) { g.strokeStyle = 'rgba(255,235,225,.12)'; g.lineWidth = w0*.28; g.beginPath(); g.moveTo(x - w0*.25, y); g.quadraticCurveTo(x + lean*h*.05 - w0*.25, y - trunk*.5, tx - w0*.25, ty); g.stroke();
      g.strokeStyle = 'rgba(20,10,10,.25)'; g.lineWidth = Math.max(1, u*.18);       /* the horizontal bands of cherry bark */
      for (let k = 1; k < 6; k++) { const yy = y - trunk*k/6, xx = x + (tx - x)*k/6; g.beginPath(); g.moveTo(xx - w0*.42, yy); g.lineTo(xx + w0*.42, yy + u*.2); g.stroke(); } }
    const limbs = 3 + (r() < .5 ? 1 : 0);
    for (let i = 0; i < limbs; i++) limb(tx, ty, h*(.3 + r()*.06), -Math.PI/2 + (i - (limbs - 1)/2)*.62 + lean*.12 + (r() - .5)*.15, w0*.68, depth);
    /* blossom: shade underneath, then the pink body, then light on the upper side of each cloud */
    const dot = (cx0, cy0, rr, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(cx0, cy0, rr, 0, 7); g.fill(); };
    const fl = haze ? u*.32 : Math.max(u*.38, h*.009);
    const scatter = (pass) => { for (const [px, py, len] of tips) {
      const R = Math.max(fl*4, len*(haze ? 1.2 : 1.05)), n = Math.round(R*R/(fl*fl) * (pass === 2 ? .25 : pass === 0 ? .5 : .8) * (haze ? .6 : 1));
      for (let k = 0; k < n; k++) { const a = r()*Math.PI*2, d = Math.sqrt(r())*R, ox = Math.cos(a)*d, oy = Math.sin(a)*d*.78;
        if (pass === 0) dot(px + ox + R*.08, py + oy + R*.16, fl*(1 + r()*.6), ['#d98aa6','#e29bb4','#cf8aa3'][k % 3], haze ? .5 : .85);
        else if (pass === 1) dot(px + ox, py + oy, fl*(.8 + r()*.6), haze ? ['#f2cdd8','#f4d6df'][k % 2] : ['#f7c3d3','#fad1de','#f4b5c9','#fbdbe5'][k % 4], haze ? .7 : .9);
        else if (oy < R*.15 && ox < R*.3) dot(px + ox - R*.06, py + oy - R*.1, fl*(.6 + r()*.5), ['#fff4f7','#ffe6ee'][k % 2], .9);
      } } g.globalAlpha = 1; };
    /* a soft base so the crown reads as one mass, with gaps where the sky shows */
    g.globalAlpha = haze ? .45 : .55; g.fillStyle = haze ? '#ecc3cf' : '#eeb2c5';
    for (const [px, py, len] of tips) { if (r() < .55) { g.beginPath(); g.arc(px, py, len*.7, 0, 7); g.fill(); } } g.globalAlpha = 1;
    scatter(0); scatter(1);
    if (!haze) { /* a few dark twigs show through the blossom */
      g.strokeStyle = 'rgba(59,42,39,.55)'; g.lineWidth = Math.max(1, u*.25);
      for (let k = 0; k < tips.length; k += 3) { const [px, py, len] = tips[k]; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - .5)*len*1.4, py + (r() - .7)*len); g.stroke(); } }
    scatter(2);
    if (!haze) { /* fallen petals on the grass under the tree */
      for (let k = 0; k < 140; k++) { const a = r()*Math.PI*2, d = Math.sqrt(r()); const px = x + lean*h*.06 + Math.cos(a)*d*h*.62, py = y + u*.3 + Math.sin(a)*d*h*.07;
        g.fillStyle = ['#fbd3df','#f6bccd','#fff0f4'][k % 3]; g.beginPath(); g.ellipse(px, py, u*.42, u*.24, r()*3, 0, 7); g.fill(); } }
  }
  /* the near meadow: blades of grass and small real-looking flowers, smaller towards the back */
  function meadow(g, r, top){ const u = U();
    const items = [];
    for (let i = 0, n = Math.round(W*(H - top)/220); i < n; i++) items.push({k: 'g', x: r()*W, y: top + r()*(H - top)});
    for (let i = 0, n = Math.round(W/16); i < n; i++) items.push({k: ['daisy','dande','violet','pinkf','daisy','clover'][i % 6], x: r()*W, y: top + u*2 + r()*(H - top - u*2)});
    items.sort((a, b) => a.y - b.y);
    for (const it of items) { const s = .55 + (it.y - top)/(H - top)*.8, x = it.x, y = it.y;
      if (it.k === 'g') { g.strokeStyle = ['#6aa94f','#7fbd60','#5d9a45','#8fcb6f'][Math.floor(r()*4)]; g.lineWidth = Math.max(1, u*.22*s); g.lineCap = 'round';
        for (let b = 0; b < 3; b++) { const bx = x + (b - 1)*u*.5*s, len = u*(1.6 + r()*1.6)*s, bend = (r() - .5)*u*1.2*s;
          g.beginPath(); g.moveTo(bx, y); g.quadraticCurveTo(bx + bend*.3, y - len*.6, bx + bend, y - len); g.stroke(); } continue; }
      /* stem and two leaves */
      const sh = u*(2.2 + r()*1.4)*s, fx = x + (r() - .5)*u*.6*s, fy = y - sh;
      g.strokeStyle = '#5f9c48'; g.lineWidth = Math.max(1, u*.22*s); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x, y - sh*.5, fx, fy); g.stroke();
      g.fillStyle = '#6fae55'; [-1, 1].forEach(d => { g.beginPath(); g.ellipse(x + d*u*.7*s, y - sh*.25, u*.9*s, u*.3*s, d*.5, 0, 7); g.fill(); });
      const P = (n, len, wid, col, rot0 = 0) => { g.fillStyle = col; for (let k = 0; k < n; k++) { const a = rot0 + k/n*Math.PI*2; g.save(); g.translate(fx, fy); g.rotate(a); g.beginPath(); g.ellipse(len*.55, 0, len*.55, wid, 0, 0, 7); g.fill(); g.restore(); } };
      if (it.k === 'daisy') { P(12, u*1.25*s, u*.26*s, '#fdfdf8'); P(12, u*1.25*s, u*.12*s, 'rgba(220,210,230,.5)', .26);
        const c = g.createRadialGradient(fx - u*.15*s, fy - u*.15*s, 0, fx, fy, u*.5*s); c.addColorStop(0, '#ffe36a'); c.addColorStop(1, '#e8a91c'); g.fillStyle = c; g.beginPath(); g.arc(fx, fy, u*.45*s, 0, 7); g.fill(); }
      else if (it.k === 'dande') { g.strokeStyle = '#f5c518'; g.lineWidth = Math.max(1, u*.16*s);
        for (let k = 0; k < 22; k++) { const a = k/22*Math.PI*2, l = u*(.7 + (k % 3)*.18)*s; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a)*l, fy + Math.sin(a)*l*.8); g.stroke(); }
        g.fillStyle = '#f0a90e'; g.beginPath(); g.arc(fx, fy, u*.32*s, 0, 7); g.fill(); }
      else if (it.k === 'violet') { P(5, u*.95*s, u*.42*s, '#7d5ac9', -Math.PI/2); P(3, u*.7*s, u*.3*s, '#9b7ee0', Math.PI/2);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(fx, fy, u*.18*s, 0, 7); g.fill(); g.fillStyle = '#f5c518'; g.beginPath(); g.arc(fx, fy + u*.12*s, u*.12*s, 0, 7); g.fill(); }
      else if (it.k === 'pinkf') { P(5, u*1*s, u*.45*s, '#f39bb8', -Math.PI/2); P(5, u*.6*s, u*.25*s, '#fbd2df', -Math.PI/2);
        g.fillStyle = '#d65b86'; g.beginPath(); g.arc(fx, fy, u*.2*s, 0, 7); g.fill(); }
      else { [-1, 0, 1].forEach(d => { g.fillStyle = '#6fb758'; g.beginPath(); g.arc(fx + d*u*.55*s, fy + (d ? u*.25*s : -u*.35*s), u*.48*s, 0, 7); g.fill(); });
        g.fillStyle = '#f7f2f6'; g.beginPath(); g.arc(fx + u*.2*s, fy - u*1.2*s, u*.55*s, 0, 7); g.fill(); g.fillStyle = 'rgba(230,170,200,.6)'; g.beginPath(); g.arc(fx + u*.3*s, fy - u*1.05*s, u*.3*s, 0, 7); g.fill(); }
    }
  }

  const SCENES = [
    /* spring garden: soft spring sky, a far hillside of blossom, two big Somei-Yoshino-style cherry trees and a
       meadow of grass with daisies, dandelions, violets and fallen petals */
    function spring(g, r){ const u = U();
      sky(g, '#8fcdf5', '#d3ecfb', '#fbeef2'); sun(g, W*.86, H*.1, u*6.5, '#fff6c4');
      cloud(g, W*.1, H*.12, u*.5); cloud(g, W*.55, H*.07, u*.38, .85);
      /* far hills in haze, sprinkled with small blossoming trees */
      const farY = H*.74;
      hillGrad(g, farY, H*.03, 1.6, 2.1, '#cfe6c4', '#b9dcae');
      for (let i = 0, n = Math.max(6, Math.round(W/60)); i < n; i++) { const x = (i + r()*.8) / n * W, y = hillY(x, farY, H*.03, 1.6, 2.1) + u*1.5;
        sakura(g, r, x, y, u*(4.5 + r()*2.5), .55); }
      g.fillStyle = 'rgba(251,238,242,.35)'; g.fillRect(0, farY - H*.08, W, H*.2);
      /* the meadow */
      hillGrad(g, H*.8, H*.025, 2.2, .4, '#b5e09a', '#93cd78');
      /* the two big trees stand on the meadow at the edges, crowns spreading over the scene */
      const big = Math.min(H*.36, W*.42, u*44);
      [[.06, .8, 1], [.94, .79, -1]].forEach(([fx, fy, lean]) => { const x = W*fx, y = hillY(x, H*fy, H*.025, 2.2, .4) + u*2;
        sakura(g, r, x, y, big, 1, lean); });
      hillGrad(g, H*.88, H*.02, 3, 1.3, '#9bd47f', '#6fb158');
      meadow(g, r, H*.85);
    },
    /* summer beach: bright sun, sea with a sailboat, sand with a palm tree and starfish */
    function summer(g, r){ const u = U();
      sky(g, '#62c1ff', '#b8e6ff', '#e6f7ff'); sun(g, W*.82, H*.11, u*7, '#ffd84a', true);
      cloud(g, W*.08, H*.16, u*.42); cloud(g, W*.42, H*.08, u*.34, .85);
      const sea = g.createLinearGradient(0,H*.72,0,H*.9); sea.addColorStop(0,'#2fa6dc'); sea.addColorStop(1,'#8ad8f2');
      g.fillStyle = sea; g.fillRect(0, H*.72, W, H*.2);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = u*.5; g.lineCap = 'round';
      for (let i = 0; i < Math.round(W/60); i++) { const x = r()*W, y = H*.74 + r()*H*.1; g.beginPath(); g.arc(x, y, u*2.2, Math.PI*1.15, Math.PI*1.85); g.stroke(); }
      const bx = W*.66, by = H*.745; g.fillStyle = '#e65b4a'; g.beginPath(); g.moveTo(bx-u*6,by); g.lineTo(bx+u*6,by); g.lineTo(bx+u*4,by+u*2.5); g.lineTo(bx-u*4,by+u*2.5); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx,by-u*.5); g.lineTo(bx,by-u*11); g.lineTo(bx+u*5.5,by-u*.8); g.fill();
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(bx-u*.5,by-u*.5); g.lineTo(bx-u*.5,by-u*8); g.lineTo(bx-u*4.5,by-u*.8); g.fill();
      hill(g, H*.87, H*.015, 2, 2.2, '#f7dd9f'); hill(g, H*.93, H*.01, 3, .5, '#f2cf86');
      const px = W*.09, py = H*.88; g.strokeStyle = '#a2723f'; g.lineWidth = u*2; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px+u*4, py-u*10, px+u*2, py-u*19); g.stroke();
      g.fillStyle = '#3fae5a'; [-.4,.3,1,1.7,2.5].forEach(a => { g.beginPath(); g.ellipse(px+u*2+Math.cos(a-Math.PI/2+1.2)*u*6, py-u*19+Math.sin(a+Math.PI)*u*2, u*7.5, u*2.2, a-.9, 0, 7); g.fill(); });
      [[.3,.95,'#ff8a5c'],[.78,.94,'#ffb347'],[.55,.97,'#ff9fb0']].forEach(([fx,fy,c]) => { const x = W*fx, y = H*fy; g.fillStyle = c; g.beginPath();
        for (let k = 0; k < 10; k++) { const a = k/10*Math.PI*2 - Math.PI/2, rr = (k%2 ? .9 : 2.4)*u; g.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); } g.fill(); });
    },
    /* autumn forest: warm sky, orange, red and yellow trees, little red mushrooms */
    function autumn(g, r){ const u = U();
      sky(g, '#ffd29c', '#ffe9c9', '#fff4e3'); sun(g, W*.84, H*.13, u*6, '#ffc35c');
      cloud(g, W*.12, H*.1, u*.42, .8);
      hill(g, H*.78, H*.03, 2, 1, '#f2c47e');
      const tree = (x, y, s, c) => { g.fillStyle = '#8a5a3c'; g.fillRect(x-u*s, y-u*10*s, u*2*s, u*11*s);
        [[0,-14,7],[-5,-10,5.5],[5,-10,5.5],[0,-19,5]].forEach(([dx,dy,rr]) => { ball(g, x+dx*u*s, y+dy*u*s, rr*u*s, c); }); };
      const cols = ['#f59a3c','#e8613c','#f7c948','#e88a2f'];
      for (let i = 0; i < Math.max(4, Math.round(W/150)); i++) { const x = (i+.5)/Math.max(4, Math.round(W/150))*W + (r()-.5)*40; tree(x, hillY(x, H*.78, H*.03, 2, 1)+2, .8+r()*.3, cols[i%4]); }
      hill(g, H*.87, H*.02, 3, 2.4, '#e3a35e');
      [[.2,.92],[.7,.94],[.86,.91]].forEach(([fx,fy]) => { const x = W*fx, y = H*fy;
        g.fillStyle = '#fff3df'; g.fillRect(x-u*.9, y-u*2.5, u*1.8, u*3);
        g.fillStyle = '#e04b3c'; g.beginPath(); g.arc(x, y-u*2.4, u*2.6, Math.PI, 0); g.fill();
        g.fillStyle = '#fff'; [[-1.2,-3.4],[.9,-3.8],[0,-4.4]].forEach(([dx,dy]) => { g.beginPath(); g.arc(x+dx*u, y+dy*u, u*.45, 0, 7); g.fill(); }); });
    },
    /* winter snow: pale sky, snowy hills, pine trees with snow caps, a snowman */
    function winter(g, r){ const u = U();
      sky(g, '#b3d6f2', '#dcecfa', '#f3f9ff'); sun(g, W*.85, H*.12, u*5.5, '#fff8e0');
      cloud(g, W*.1, H*.12, u*.45); cloud(g, W*.5, H*.07, u*.36, .9);
      hill(g, H*.79, H*.03, 2.4, .2, '#e6f0f9');
      const pine = (x, y, s) => { g.fillStyle = '#7a5440'; g.fillRect(x-u*s, y-u*3*s, u*2*s, u*3.5*s);
        [[0,7],[5,6],[10,4.8]].forEach(([dy,w]) => { const b = y-u*(3+dy)*s;
          g.fillStyle = '#3f8a6a'; g.beginPath(); g.moveTo(x-w*u*s, b); g.lineTo(x+w*u*s, b); g.lineTo(x, b-u*7*s); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x-w*u*s*.45, b-u*3.8*s); g.lineTo(x+w*u*s*.45, b-u*3.8*s); g.lineTo(x, b-u*7*s); g.fill(); }); };
      for (let i = 0; i < Math.max(4, Math.round(W/140)); i++) { const x = (i+.3+r()*.4)/Math.max(4, Math.round(W/140))*W; pine(x, hillY(x, H*.79, H*.03, 2.4, .2)+2, .75+r()*.3); }
      hill(g, H*.88, H*.02, 3, 1.6, '#ffffff');
      g.strokeStyle = '#d3e3f1'; g.lineWidth = u*.6; g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = hillY(x, H*.88, H*.02, 3, 1.6); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      const sx = W*.84, sy = H*.93; g.fillStyle = '#fff'; g.strokeStyle = '#cfe0ef'; g.lineWidth = u*.4;
      [[0,0,4.2],[0,-6,3]].forEach(([dx,dy,rr]) => { ball(g, sx+dx*u, sy+dy*u, rr*u, '#fff'); g.beginPath(); g.arc(sx+dx*u, sy+dy*u, rr*u, 0, 7); g.stroke(); });
      g.fillStyle = INK; [[-1,-6.6],[1,-6.6],[0,-1],[0,1.4]].forEach(([dx,dy]) => { g.beginPath(); g.arc(sx+dx*u, sy+dy*u, u*.42, 0, 7); g.fill(); });
      g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(sx, sy-u*5.6); g.lineTo(sx+u*2.6, sy-u*5.2); g.lineTo(sx, sy-u*4.8); g.fill();
      g.fillStyle = '#e65b6b'; g.fillRect(sx-u*3, sy-u*3.9, u*6, u*1.3);
    }
  ];

  /* ---- moving particles: petals, bubbles, leaves, snow ---- */
  /* pre-drawn cherry petals in three tints, so each falling petal is a single drawImage */
  const PETAL = [['#fff8fa','#f6b4c8'], ['#fff3f6','#f2a3bb'], ['#ffffff','#f9cbd8']].map(([base, tip]) => {
    const c = document.createElement('canvas'); c.width = 28; c.height = 36; const g = c.getContext('2d'), s = 16; g.translate(14, 18);
    g.beginPath(); g.moveTo(0, s*1.02); g.bezierCurveTo(-s*.95, s*.35, -s*.85, -s*.7, -s*.25, -s*.98); g.quadraticCurveTo(-s*.1, -s*1.02, 0, -s*.74);
    g.quadraticCurveTo(s*.1, -s*1.02, s*.25, -s*.98); g.bezierCurveTo(s*.85, -s*.7, s*.95, s*.35, 0, s*1.02); g.closePath();
    const gr = g.createLinearGradient(0, s, 0, -s); gr.addColorStop(0, base); gr.addColorStop(.55, base); gr.addColorStop(1, tip); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(214,120,150,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(0, s*.9); g.quadraticCurveTo(1, 0, 0, -s*.6); g.stroke();
    return c; });
  function makeParts(si){
    const n = Math.round(Math.min(46, Math.max(16, W*H/26000)));
    return Array.from({length:n}, () => ({x:Math.random()*W, y:Math.random()*H, s:Math.random()*.6+.6, v:Math.random()*.4+.25, p:Math.random()*6, rot:Math.random()*6, c:Math.floor(Math.random()*3)}));
  }
  function drawPart(si, q, t){
    const u = U(), x = q.x + Math.sin(t/1600 + q.p)*u*2.2, y = q.y;
    if (si === 0) { /* a real cherry petal: notched tip, paler at the base, tumbling as it falls (its width follows the turn) */
      const sp = PETAL[q.c], ph = u*1.7*q.s, pw = ph*sp.width/sp.height, turn = Math.cos(t/(520 + q.p*90) + q.p);
      cx.save(); cx.translate(x, y); cx.rotate(q.rot + Math.sin(t/1700 + q.p)*1.2); cx.scale(Math.max(.12, Math.abs(turn)), 1);
      cx.globalAlpha = .75 + .25*Math.abs(turn); cx.drawImage(sp, -pw/2, -ph/2, pw, ph); cx.restore(); cx.globalAlpha = 1; }
    else if (si === 1) { cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = Math.max(1, u*.25); cx.fillStyle = 'rgba(255,255,255,.18)';
      cx.beginPath(); cx.arc(x, y, u*1.6*q.s, 0, 7); cx.fill(); cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,.9)'; cx.beginPath(); cx.arc(x-u*.6*q.s, y-u*.6*q.s, u*.35*q.s, 0, 7); cx.fill(); }
    else if (si === 2) { cx.save(); cx.translate(x,y); cx.rotate(q.rot + Math.sin(t/900+q.p)*.8); cx.fillStyle = ['#f08a2c','#e5553a','#f2bb38'][q.c];
      const s = u*1.7*q.s; cx.beginPath(); cx.moveTo(0,-s); cx.quadraticCurveTo(s*.9,0,0,s); cx.quadraticCurveTo(-s*.9,0,0,-s); cx.fill();
      cx.strokeStyle = 'rgba(120,60,20,.5)'; cx.lineWidth = Math.max(1, u*.18); cx.beginPath(); cx.moveTo(0,-s*.8); cx.lineTo(0,s*1.25); cx.stroke(); cx.restore(); }
    else { cx.fillStyle = 'rgba(255,255,255,.95)'; cx.beginPath(); cx.arc(x, y, u*.75*q.s, 0, 7); cx.fill(); }
  }
  function step(si, q){
    if (si === 1) { q.y -= q.v*.8; if (q.y < -20) { q.y = H*.9; q.x = Math.random()*W; } }
    else { q.y += q.v*(si === 3 ? .9 : 1.1); q.x += si === 0 ? .25 : si === 2 ? .15 : 0;
      if (q.y > H+20) { q.y = -20; q.x = Math.random()*W; } if (q.x > W+20) q.x = -20; }
  }

  function paint(si){ sc.setTransform(dpr,0,0,dpr,0,0); SCENES[si](sc, rnd(17 + si*31)); }
  function frame(t){
    cx.clearRect(0, 0, W, H);
    for (const q of parts) { if (!reduced) step(cur, q); drawPart(cur, q, reduced ? 0 : t); }
    if (!reduced && !document.hidden) requestAnimationFrame(frame); else running = false;
  }
  function kick(){ if (!running) { running = true; requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && cur >= 0) kick(); });
  function size(){ dpr = Math.min(devicePixelRatio||1, 2); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); fx.width = W; fx.height = H;
    if (cur >= 0) { paint(cur); parts = makeParts(cur); kick(); } }
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(size, 120); }); size();

  /* ---- park gate: the arched doorway looks out on the season; decorations hang inside the arch ---- */
  /* ---- the view through the gate: a peek inside the park, like looking down the main street from the ticket gate ----
     Gate units: the archway spans x 98–242, top of the arch y 150, floor y 362. Horizon at y 262. */
  const PV = (function(){
    const K = '#2b2452', ST = `stroke="${K}" stroke-width="1.6" stroke-linejoin="round"`;
    const GROUND = ['#a8dd8a', '#f7dd9f', '#e3a35e', '#ffffff'], FAR = ['#c3eaa7', '#f2cf86', '#f0be7a', '#eaf2fa'];
    /* the roller coaster on the horizon, with a little car that runs along it */
    const track = 'M178 262 C186 244 192 236 199 246 C205 255 209 228 219 226 C229 224 232 242 238 250 L244 258';
    const coaster = `<path d="${track}" fill="none" stroke="${K}" stroke-width="4"/><path d="${track}" fill="none" stroke="#ff6f8f" stroke-width="2.2"/>
      <g stroke="${K}" stroke-width="1.2">${[[186,250],[192,240],[199,246],[208,236],[219,226],[229,232],[238,250]].map(([x,y]) => `<line x1="${x}" y1="${y+2}" x2="${x}" y2="262"/>`).join('')}</g>
      <g><rect x="-4" y="-3" width="8" height="5" rx="2" fill="#ffd84d" stroke="${K}" stroke-width="1.2"/><animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto" path="${track}"/></g>`;
    /* a little castle at the far end of the road */
    const keep = snow => `<g ${ST}>
      <rect x="156" y="244" width="7" height="18" fill="#9b8cff"/><rect x="177" y="244" width="7" height="18" fill="#9b8cff"/><rect x="162" y="238" width="16" height="24" fill="#b3a8ff"/>
      <path d="M159.5 236 L154 245 H165Z M180.5 236 L175 245 H186Z" fill="#ff6fa3"/><path d="M170 222 L160 239 H180Z" fill="#ff6fa3"/>
      <path d="M167 262 V255 A3 3 0 0 1 173 255 V262Z" fill="#7a5440"/></g>
      ${snow ? `<path d="M170 222 L166.5 228 L170 227 L173.5 228Z M159.5 236 L157.5 239.5 L161.5 239.5Z M180.5 236 L178.5 239.5 L182.5 239.5Z" fill="#fff"/>` : ''}
      <line x1="170" y1="222" x2="170" y2="215" stroke="${K}" stroke-width="1.2"/><path d="M170.5 215 L177 217.5 L170.5 220Z" fill="#3ccfc0" stroke="${K}" stroke-width="1"/>`;
    /* each season's landmark, small and far away on the left */
    const LAND = [
      `<g ${ST}><path d="M115 262 L117 244 H123 L125 262Z" fill="#fff4e0"/><path d="M116 244 L120 238 L124 244Z" fill="#e65b6b"/></g><g stroke="${K}" stroke-width="1.4"><line x1="120" y1="241" x2="120" y2="228"/><line x1="120" y1="241" x2="133" y2="241"/><line x1="120" y1="241" x2="120" y2="254"/><line x1="120" y1="241" x2="107" y2="241"/><animateTransform attributeName="transform" type="rotate" from="0 120 241" to="360 120 241" dur="6s" repeatCount="indefinite"/></g>`,
      `<rect x="98" y="250" width="70" height="12" fill="#2fa6dc"/><g ${ST}><path d="M115 262 L117 236 H123 L125 262Z" fill="#fff"/><path d="M116.5 244 H123.5 V248 H116.5Z" fill="#e65b6b"/><rect x="115" y="231" width="10" height="6" fill="#ffe9a8"/><path d="M114 231 L120 225 L126 231Z" fill="#e65b6b"/></g><path d="M126 233 L150 228 L150 238Z" fill="#fff6c8" opacity=".7"><animate attributeName="opacity" values=".7;.1;.7" dur="2.4s" repeatCount="indefinite"/></path>`,
      `<g ${ST}><rect x="110" y="250" width="20" height="12" fill="#fff4e0"/><path d="M107 251 L120 241 L133 251Z" fill="#c9553a"/><rect x="117" y="255" width="5" height="7" fill="#9b6b4f"/></g><circle cx="128" cy="236" r="2.5" fill="#fff" opacity=".8"/><circle cx="130" cy="230" r="3" fill="#fff" opacity=".6"/>`,
      `<g ${ST}><path d="M108 262 A13 13 0 0 1 134 262Z" fill="#fff"/><path d="M117 262 A4 5 0 0 1 125 262Z" fill="#5b6b8a"/></g>`
    ];
    /* big trees framing the near edges of the view */
    const NEAR = [
      (x, y, r) => `<g ${ST}><rect x="${x-3}" y="${y}" width="6" height="${362-y}" fill="#9b6b4f"/><circle cx="${x}" cy="${y}" r="${r}" fill="#ffc2d6"/><circle cx="${x - r*.45}" cy="${y + r*.35}" r="${r*.6}" fill="#ffb3cc"/><circle cx="${x + r*.4}" cy="${y + r*.4}" r="${r*.55}" fill="#ffd0e0"/></g>`,
      (x, y, r) => `<g ${ST}><path d="M${x} 362 Q${x + 6} ${y + 20} ${x + 2} ${y}" fill="none" stroke="#a2723f" stroke-width="5"/>${[-150,-100,-50,-10,30].map(a => `<ellipse cx="${x+2}" cy="${y}" rx="${r}" ry="${r*.28}" fill="#3fae5a" transform="rotate(${a} ${x+2} ${y}) translate(${r*.8} 0)"/>`).join('')}</g>`,
      (x, y, r) => `<g ${ST}><rect x="${x-3}" y="${y}" width="6" height="${362-y}" fill="#8a5a3c"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f59a3c"/><circle cx="${x - r*.45}" cy="${y + r*.35}" r="${r*.6}" fill="#e8613c"/><circle cx="${x + r*.4}" cy="${y + r*.4}" r="${r*.55}" fill="#f7c948"/></g>`,
      (x, y, r) => `<g ${ST}><rect x="${x-3}" y="${y + r*1.6}" width="6" height="${362 - y - r*1.6}" fill="#7a5440"/>${[0, .55, 1.05].map(d => `<path d="M${x - r*(1 - d*.25)} ${y + r*(.75 + d*.8)} H${x + r*(1 - d*.25)} L${x} ${y + d*r*.7 - r*.6}Z" fill="#3f8a6a"/>`).join('')}<path d="M${x - r*.35} ${y - r*.15} L${x} ${y - r*.6} L${x + r*.35} ${y - r*.15}Z" fill="#fff"/></g>`
    ];
    const DOTS = [
      [[132,300,'#ff8fb3'],[206,292,'#ffd84d'],[140,330,'#fff'],[214,320,'#c7a6ff'],[124,346,'#ffd84d'],[222,340,'#ff8fb3']],
      [[136,312,'#ff8a5c'],[208,330,'#ff9fb0']],
      [[134,300,'#f08a2c'],[212,296,'#e5553a'],[128,336,'#f2bb38'],[216,344,'#f08a2c']],
      [[136,300,'#ffffff'],[208,316,'#ffffff']]
    ];
    return si => {
      const grnd = `<path d="M98 262 Q130 254 160 260 T242 258 V362 H98Z" fill="${FAR[si]}"/><path d="M98 280 Q140 270 170 276 T242 274 V362 H98Z" fill="${GROUND[si]}"/>`;
      const path = `<path d="M124 362 L164 262 H176 L216 362Z" fill="#f6dea6" stroke="${K}" stroke-width="1.6"/><path d="M170 266 V360" stroke="#e8c98c" stroke-width="2.5" stroke-dasharray="5 7"/>`;
      /* the first stop, waiting on the road: a glowing orb on a stepping pad */
      const orb = `<ellipse cx="170" cy="312" rx="16" ry="5" fill="${['#8ccf6c','#e6c27a','#d98a43','#c9dcef'][si]}" stroke="${K}" stroke-width="1.5"/>
        <circle cx="170" cy="300" r="10" fill="#8fe0c4" stroke="${K}" stroke-width="1.6"/><circle cx="166.5" cy="296.5" r="3.2" fill="#fff" opacity=".8"/>
        <circle cx="170" cy="300" r="10" fill="none" stroke="#fff" stroke-width="2" opacity=".7"><animate attributeName="r" values="10;16;10" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0;.7" dur="2.2s" repeatCount="indefinite"/></circle>`;
      const lamps = [132, 208].map(x => `<g ${ST}><rect x="${x-1.2}" y="318" width="2.4" height="${362-318}" fill="#5b5480"/><circle cx="${x}" cy="316" r="4.5" fill="#fff6c8"/></g>`).join('');
      const dots = DOTS[si].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}" stroke="${K}" stroke-width=".9"/>`).join('');
      return grnd + coaster + LAND[si] + keep(si === 3) + path + dots + orb + lamps + NEAR[si](104, 270, 20) + NEAR[si](236, 284, 18);
    };
  })();
  const GATE = [
    {portal:['#fffaf0','#ffe3ee','#ffc2d6','#9fd8ff'], ground:'#a8dd8a', deco:`<line x1="20" y1="-30" x2="20" y2="4" stroke="#9b6b4f" stroke-width="2"/>${[[20,14,9,'#ffb8cf'],[11,22,7,'#ffcfe0'],[29,22,7,'#ffcfe0'],[20,29,8,'#ff9fbf'],[14,36,5,'#ffcfe0'],[26,36,5,'#ffb8cf']].map(([x,y,r,c])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('')}<circle cx="20" cy="22" r="3" fill="#ffd84d"/>`,
      view:PV(0),
      top:`${[[50,150],[290,150],[96,150],[244,150],[124,128],[216,128]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i<2?9:7}" fill="${i%2?'#ffcfe0':'#ffb3cc'}"/><circle cx="${x}" cy="${y}" r="2.6" fill="#ffd84d"/>`).join('')}`},
    {portal:['#fffdf0','#fff1b8','#8ad8f2','#2fa6dc'], ground:'#f2cf86', deco:`<line x1="20" y1="-30" x2="20" y2="2" stroke="#c9b48a" stroke-width="2"/><path d="M6 20 Q6 2 20 2 Q34 2 34 20 Z" fill="#bfe8ff" stroke="#6cc3ea" stroke-width="2"/><circle cx="16" cy="11" r="3" fill="#ff8fb3"/><circle cx="25" cy="13" r="2.5" fill="#ffd84d"/><line x1="20" y1="20" x2="20" y2="30" stroke="#6cc3ea" stroke-width="1.5"/><rect x="13" y="30" width="14" height="22" rx="2" fill="#ff8a5c"/>`,
      view:PV(1),
      top:`<g transform="translate(52 344)"><circle r="13" fill="#fff"/><path d="M0 -13A13 13 0 0 1 13 0L0 0Z" fill="#ff6f8f"/><path d="M0 13A13 13 0 0 1 -13 0L0 0Z" fill="#2fa6dc"/><path d="M-13 0A13 13 0 0 1 0 -13L0 0Z" fill="#ffd84d"/><circle r="13" fill="none" stroke="#e8e2ff" stroke-width="1.5"/></g>`},
    {portal:['#fffaf0','#ffe2b5','#f5a24a','#e8613c'], ground:'#e3a35e', deco:`<line x1="20" y1="-30" x2="20" y2="8" stroke="#8a5a3c" stroke-width="2"/>${[[20,16],[12,30],[28,30]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8.5" fill="#f58b2c"/><path d="M${x-4} ${y-8} h8 l-4 3z" fill="#5e9e4a"/>`).join('')}<path d="M20 4 L11 9 M20 4 L29 9" stroke="#8a5a3c" stroke-width="1.5"/>`,
      view:PV(2),
      top:`${[[80,196,'#f08a2c'],[100,150,'#e5553a'],[240,150,'#f2bb38'],[260,196,'#e5553a'],[44,152,'#f2bb38'],[296,152,'#f08a2c']].map(([x,y,c])=>`<path d="M${x} ${y-8} Q${x+8} ${y} ${x} ${y+8} Q${x-8} ${y} ${x} ${y-8}Z" fill="${c}" transform="rotate(35 ${x} ${y})"/>`).join('')}`},
    {portal:['#ffffff','#eaf4fd','#bcdcf2','#7fb2dc'], ground:'#ffffff', deco:`<line x1="20" y1="-30" x2="20" y2="4" stroke="#9fb6cc" stroke-width="2"/><g stroke="#6cb2e6" stroke-width="3" stroke-linecap="round" transform="translate(20 22)">${[0,60,120].map(a=>`<line x1="0" y1="-14" x2="0" y2="14" transform="rotate(${a})"/>`).join('')}</g><circle cx="20" cy="22" r="4" fill="#fff" stroke="#6cb2e6" stroke-width="2"/>`,
      view:PV(3),
      top:`<path d="M83 182A96 96 0 0 1 257 182" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" transform="translate(0 -4)"/>${[50,290].map(x=>`<path d="M${x} 74 L${x-12} 96 Q${x-6} 92 ${x} 98 Q${x+6} 92 ${x+12} 96Z" fill="#ffffff"/>`).join('')}`}
  ];
  function dressGate(si){
    const G = GATE[si], stops = document.querySelectorAll('#portalG stop');
    G.portal.forEach((c, i) => stops[i] && stops[i].setAttribute('stop-color', c));
    const set = (id, html) => { const n = document.getElementById(id); if (n) n.innerHTML = html; };
    set('deco', G.deco); set('gateView', G.view); set('gateTop', G.top);
    const gr = document.getElementById('gateGround'); if (gr) gr.setAttribute('fill', G.ground);
  }

  return {
    get current(){ return cur; },
    set(si){
      document.body.dataset.season = si;
      if (si === cur) return;
      if (cur >= 0 && !reduced) {
        const old = document.createElement('canvas'); old.className = 'sky-old'; old.width = cv.width; old.height = cv.height;
        old.getContext('2d').drawImage(cv, 0, 0); cv.after(old);
        requestAnimationFrame(() => requestAnimationFrame(() => { old.style.opacity = 0; }));
        setTimeout(() => old.remove(), 1300);
      }
      cur = si; paint(si); parts = makeParts(si); dressGate(si); kick();
    }
  };
})();
