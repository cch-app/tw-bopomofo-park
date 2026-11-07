'use strict';
/* ---------- the entrance castle: a full-screen facade built around the park gate ----------
   Drawn for the exact screen size (viewBox = CSS pixels, so nothing stretches), measured from where the gate
   button sits: the wall's battlements line up just below the gate's own towers, the outer towers stand at
   the screen edges (cut slightly off, so the castle feels bigger than the screen), extra turrets fill wide
   screens, and the courtyard floor with a path to the gate fills the space below.
   Like the world map it is baked once into a picture (see bakeURL in world.js), so the moving gate parts on
   top never make the browser redo its 3D lighting. Redrawn on resize and when the season changes. */
const Castle = (function(){
  const INKC = '#2b2452';
  const cache = {};
  let lastKey = '', timer = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f = n => Math.round(n * 10) / 10;

  /* one tower: body, a battlement crown, a striped cone with a flag; windows and an optional hanging banner */
  function tower(x, w, top, base, s, opt){
    const cx = x + w/2, coneH = w * (opt.cone || .95), crownH = 14*s, merl = Math.max(3, Math.round(w / (16*s)));
    let o = `<g filter="url(#wink)">`;
    o += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(base - top)}" fill="url(#ctg)"/>`;
    o += `<rect x="${f(x + w*.12)}" y="${f(top + 10*s)}" width="${f(w*.12)}" height="${f(base - top - 20*s)}" rx="${f(w*.06)}" fill="#fff" opacity=".22"/>`;
    /* brick hints */
    for (let r = 0; r < 6; r++) { const yy = top + (base - top) * (.22 + r*.12); if (yy > base - 12*s) break;
      o += `<rect x="${f(x + w*(r % 2 ? .52 : .3))}" y="${f(yy)}" width="${f(w*.2)}" height="${f(5*s)}" rx="2" fill="#fff" opacity=".18"/>`; }
    /* windows */
    const wins = opt.windows || 2;
    for (let i = 0; i < wins; i++) { const wy = top + (base - top) * (.18 + i * .26), ww = Math.min(22*s, w*.26), wh = ww * 1.5;
      if (wy + wh > base - 30*s) break;
      o += `<path d="M${f(cx - ww/2)} ${f(wy + wh)} V${f(wy + ww/2)} A${f(ww/2)} ${f(ww/2)} 0 0 1 ${f(cx + ww/2)} ${f(wy + ww/2)} V${f(wy + wh)}Z" fill="url(#cwin)" stroke="${INKC}" stroke-width="2.5"/>`; }
    /* crown with merlons */
    o += `<rect x="${f(x - 5*s)}" y="${f(top - 2*s)}" width="${f(w + 10*s)}" height="${f(crownH)}" rx="${f(3*s)}" fill="#7d85f4"/>`;
    const step = (w + 10*s) / (merl*2 - 1);
    for (let i = 0; i < merl; i++) o += `<rect x="${f(x - 5*s + i*step*2)}" y="${f(top - 12*s)}" width="${f(step)}" height="${f(12*s)}" rx="${f(2*s)}" fill="#7d85f4"/>`;
    /* cone */
    const tipY = top - 12*s - coneH, bl = x - 9*s, br = x + w + 9*s, by = top - 12*s;
    o += `<path d="M${f(cx)} ${f(tipY)} L${f(bl)} ${f(by)} L${f(br)} ${f(by)}Z" fill="#ff6fa3"/>`;
    for (let k = 0; k < 6; k += 2) { const a = bl + (br - bl) * k/6, b = bl + (br - bl) * (k+1)/6;
      o += `<path d="M${f(cx)} ${f(tipY)} L${f(a)} ${f(by)} L${f(b)} ${f(by)}Z" fill="#fff"/>`; }
    if (opt.snow) o += `<path d="M${f(cx)} ${f(tipY)} L${f(cx - coneH*.2)} ${f(tipY + coneH*.34)} Q${f(cx - coneH*.1)} ${f(tipY + coneH*.28)} ${f(cx)} ${f(tipY + coneH*.36)} Q${f(cx + coneH*.1)} ${f(tipY + coneH*.28)} ${f(cx + coneH*.2)} ${f(tipY + coneH*.34)}Z" fill="#fff"/>`;
    o += `<ellipse cx="${f(cx)}" cy="${f(by)}" rx="${f((br - bl)/2)}" ry="${f(5*s)}" fill="#ffd466"/>`;
    o += `</g>`;
    /* flag (outlined by hand, outside the lit group) */
    const fy = tipY - 26*s;
    o += `<line x1="${f(cx)}" y1="${f(tipY)}" x2="${f(cx)}" y2="${f(fy)}" stroke="${INKC}" stroke-width="${f(3*s)}" stroke-linecap="round"/>`;
    o += `<path d="M${f(cx + 1)} ${f(fy + 1)} Q${f(cx + 12*s)} ${f(fy - 2*s)} ${f(cx + 26*s)} ${f(fy + 4*s)} Q${f(cx + 12*s)} ${f(fy + 9*s)} ${f(cx + 1)} ${f(fy + 13*s)}Z" fill="${opt.flag || '#3ccfc0'}" stroke="${INKC}" stroke-width="2"/>`;
    o += `<circle cx="${f(cx)}" cy="${f(fy)}" r="${f(4*s)}" fill="#ffd466" stroke="${INKC}" stroke-width="2"/>`;
    /* long banner hanging from the crown */
    if (opt.banner) { const bw = w * .42, bx = cx - bw/2, b0 = top + 14*s, b1 = b0 + Math.min(w * 1.15, (base - top) * .5);
      o += `<g filter="url(#wink)"><path d="M${f(bx)} ${f(b0)} H${f(bx + bw)} V${f(b1)} L${f(cx)} ${f(b1 - bw*.35)} L${f(bx)} ${f(b1)}Z" fill="#ff6fa3"/>
        <path d="M${f(bx + bw*.14)} ${f(b0)} V${f(b1 - bw*.12)}" stroke="#ffd466" stroke-width="${f(3*s)}"/><path d="M${f(bx + bw*.86)} ${f(b0)} V${f(b1 - bw*.12)}" stroke="#ffd466" stroke-width="${f(3*s)}"/>
        ${star(cx, b0 + (b1 - b0) * .38, bw * .28)}</g>`; }
    return o;
  }
  const star = (x, y, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i * Math.PI/5, rr = i % 2 ? r*.45 : r; d += `${i ? 'L' : 'M'}${f(x + Math.cos(a)*rr)} ${f(y + Math.sin(a)*rr)}`; }
    return `<path d="${d}Z" fill="#ffd84d" stroke="${INKC}" stroke-width="2" stroke-linejoin="round"/>`; };

  /* seasonal trim along the top of a stretch of wall */
  function trim(season, x0, x1, y, s){
    if (x1 - x0 < 30*s) return '';
    const n = Math.max(2, Math.floor((x1 - x0) / (26*s)));
    let o = '';
    if (season === 0) { /* spring: a green vine with blossoms */
      let d = `M${f(x0)} ${f(y + 8*s)}`; for (let i = 1; i <= n; i++) { const xx = x0 + (x1 - x0) * i/n; d += ` Q${f(xx - (x1 - x0)/n/2)} ${f(y + 20*s)} ${f(xx)} ${f(y + 8*s)}`; }
      o += `<path d="${d}" fill="none" stroke="#4fae5a" stroke-width="${f(4*s)}" stroke-linecap="round"/>`;
      for (let i = 0; i <= n; i++) { const xx = x0 + (x1 - x0) * i/n;
        o += `<circle cx="${f(xx)}" cy="${f(y + 8*s)}" r="${f(6*s)}" fill="${i % 2 ? '#ffcfe0' : '#ff9fbf'}"/><circle cx="${f(xx)}" cy="${f(y + 8*s)}" r="${f(2.2*s)}" fill="#ffd84d"/>`; }
    } else if (season === 1) { /* summer: bunting */
      const cols = ['#ffd84d','#3ccfc0','#ff6fa3','#8c7bff','#ff9a4d','#5fb8ff'];
      o += `<path d="M${f(x0)} ${f(y + 4*s)} Q${f((x0 + x1)/2)} ${f(y + 18*s)} ${f(x1)} ${f(y + 4*s)}" fill="none" stroke="${INKC}" stroke-width="2"/>`;
      for (let i = 1; i < n; i++) { const t = i/n, xx = x0 + (x1 - x0) * t, yy = y + 4*s + 4 * t * (1 - t) * 14*s * .5 * 2;
        o += `<path d="M${f(xx - 7*s)} ${f(yy)} L${f(xx + 7*s)} ${f(yy)} L${f(xx)} ${f(yy + 14*s)}Z" fill="${cols[i % 6]}"/>`; }
    } else if (season === 2) { /* autumn: a garland of leaves */
      const cols = ['#f08a2c','#e5553a','#f2bb38'];
      for (let i = 0; i <= n; i++) { const xx = x0 + (x1 - x0) * i/n, yy = y + 8*s + Math.sin(i * 1.3) * 3*s;
        o += `<path d="M${f(xx)} ${f(yy - 8*s)} Q${f(xx + 8*s)} ${f(yy)} ${f(xx)} ${f(yy + 8*s)} Q${f(xx - 8*s)} ${f(yy)} ${f(xx)} ${f(yy - 8*s)}Z" fill="${cols[i % 3]}" transform="rotate(${(i * 47) % 90 - 45} ${f(xx)} ${f(yy)})"/>`; }
    }
    return o ? `<g filter="url(#wink)">${o}</g>` : '';
  }

  function svg(W, H, g, season, t){
    const k = g.w / 340, s = clamp(k * 1.1, .75, 1.5);
    const gy = g.y + 362*k, yW = g.y + 196*k;
    const tw = clamp(W * .17, 70, 150);
    const coneH = tw * .95;
    /* the great towers rise almost to the top of the screen, so their spires frame the whole view */
    let yT = Math.max(8 + 30*s + coneH + 12*s, Math.min(yW - 50*s, t.bottom + coneH * .6));
    const gl = g.x + 30*k, gr = g.x + 310*k;          /* where the gate's own towers stand */
    const winter = season === 3;
    let o = `<defs>${CLAY}
      <linearGradient id="ctg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a99dff"/><stop offset=".55" stop-color="#7f86f6"/><stop offset="1" stop-color="#5d6fe0"/></linearGradient>
      <linearGradient id="cwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f5ff"/><stop offset="1" stop-color="#e2dbf3"/></linearGradient>
      <radialGradient id="cwin"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffc861"/></radialGradient>
      <pattern id="cbrick" width="${f(44*s)}" height="${f(24*s)}" patternUnits="userSpaceOnUse"><path d="M0 ${f(12*s)}H${f(44*s)} M0 ${f(24*s)}H${f(44*s)} M${f(22*s)} 0V${f(12*s)} M0 ${f(12*s)}V${f(24*s)}" stroke="#d6cdee" stroke-width="2" fill="none"/></pattern>
      <pattern id="ccob" width="${f(38*s)}" height="${f(20*s)}" patternUnits="userSpaceOnUse"><ellipse cx="${f(10*s)}" cy="${f(6*s)}" rx="${f(8*s)}" ry="${f(4*s)}" fill="#fff" opacity=".55"/><ellipse cx="${f(29*s)}" cy="${f(16*s)}" rx="${f(8*s)}" ry="${f(4*s)}" fill="#fff" opacity=".55"/></pattern>
    </defs>`;

    /* rides inside the park, peeking over the walls: drawn first, so the walls, keep and towers hide most of them */
    const yB0 = Math.min(yW - 40*s, t.bottom + Math.max(24*s, (yW - t.bottom) * .32));
    {
      const top = 14*s;
      /* roller coaster with a loop, on the left */
      const cx = W * .24, r = clamp(W * .09, 34, 90) * Math.max(.9, s*.8), cy = Math.max(top + r + 6, yB0 - r * 1.15);
      const hillY = cy - r * .35, x0 = cx - r * 2.6, x1 = cx + r * 2.8;
      const tr = `M${f(x0)} ${f(yB0)} C${f(x0 + r*.6)} ${f(hillY - r*.6)} ${f(cx - r*1.3)} ${f(hillY - r*.6)} ${f(cx - r*.9)} ${f(cy + r)} `
        + `A${f(r)} ${f(r)} 0 1 1 ${f(cx + .01)} ${f(cy + r)} C${f(cx + r*1.2)} ${f(cy + r)} ${f(cx + r*1.6)} ${f(hillY - r*.2)} ${f(cx + r*2)} ${f(hillY)} S${f(x1 - r*.3)} ${f(yB0)} ${f(x1)} ${f(yB0)}`;
      let sup = ''; for (let x = x0 + r*.5; x < x1; x += r*.55) sup += `<line x1="${f(x)}" y1="${f(yB0 + 4)}" x2="${f(x)}" y2="${f(Math.max(top, hillY - r*.1))}"/>`;
      o += `<g filter="url(#wink)"><g stroke="#c9c2f2" stroke-width="${f(3*s)}">${sup}</g>
        <path d="${tr}" fill="none" stroke="${INKC}" stroke-width="${f(8*s)}" stroke-linecap="round"/><path d="${tr}" fill="none" stroke="#ff6f8f" stroke-width="${f(4.5*s)}" stroke-linecap="round"/>
        <path d="${tr}" fill="none" stroke="#fff" stroke-width="${f(1.4*s)}" stroke-dasharray="${f(3*s)} ${f(6*s)}"/>
        ${[0,1,2].map(i => `<rect x="${f(cx + r*1.35 + i*15*s)}" y="${f(hillY + r*.02 - 9*s - i*2*s)}" width="${f(13*s)}" height="${f(9*s)}" rx="${f(3*s)}" fill="${['#ffd84d','#3ccfc0','#8c7bff'][i]}" transform="rotate(${-14 + i*4} ${f(cx + r*1.35 + i*15*s)} ${f(hillY)})"/>`).join('')}</g>`;
      /* drop tower on the right */
      const dx = W * .77, dw = 12*s, dTop = top + 18*s;
      o += `<g filter="url(#wink)"><rect x="${f(dx - dw/2)}" y="${f(dTop)}" width="${f(dw)}" height="${f(yB0 - dTop + 4)}" fill="#7d85f4"/>
        ${Array.from({length: 7}, (_, i) => `<rect x="${f(dx - dw/2)}" y="${f(dTop + 14*s + i*(yB0 - dTop)/7)}" width="${f(dw)}" height="${f(4*s)}" fill="#fff" opacity=".55"/>`).join('')}
        <rect x="${f(dx - dw*1.3)}" y="${f(dTop - 10*s)}" width="${f(dw*2.6)}" height="${f(12*s)}" rx="${f(4*s)}" fill="#ff6fa3"/>
        <rect x="${f(dx - dw*2)}" y="${f(dTop + (yB0 - dTop) * .3)}" width="${f(dw*4)}" height="${f(14*s)}" rx="${f(5*s)}" fill="#ffd84d"/>
        ${star(dx, dTop - 18*s, 8*s)}</g>`;
      /* hot-air balloons drifting above everything */
      const balloon = (bx, by, br, c1, c2) => `<g filter="url(#wink)"><path d="M${f(bx - br)} ${f(by)} A${f(br)} ${f(br*1.1)} 0 1 1 ${f(bx + br)} ${f(by)} Q${f(bx + br*.7)} ${f(by + br*.9)} ${f(bx + br*.3)} ${f(by + br*1.25)} H${f(bx - br*.3)} Q${f(bx - br*.7)} ${f(by + br*.9)} ${f(bx - br)} ${f(by)}Z" fill="${c1}"/>
        <path d="M${f(bx)} ${f(by - br*1.1)} Q${f(bx - br*.45)} ${f(by)} ${f(bx - br*.18)} ${f(by + br*1.25)} H${f(bx + br*.18)} Q${f(bx + br*.45)} ${f(by)} ${f(bx)} ${f(by - br*1.1)}Z" fill="${c2}"/>
        <rect x="${f(bx - br*.28)}" y="${f(by + br*1.5)}" width="${f(br*.56)}" height="${f(br*.42)}" rx="${f(br*.08)}" fill="#c98a4a"/>
        <path d="M${f(bx - br*.3)} ${f(by + br*1.25)} L${f(bx - br*.26)} ${f(by + br*1.5)} M${f(bx + br*.3)} ${f(by + br*1.25)} L${f(bx + br*.26)} ${f(by + br*1.5)}" stroke="${INKC}" stroke-width="1.5"/></g>`;
      o += balloon(W * .1, top + 46*s, 15*s, '#ffd84d', '#ff9a4d') + balloon(W * .62, top + 26*s, 12*s, '#8fe0c4', '#ffffff') + (W > 700 ? balloon(W * .9, top + 60*s, 13*s, '#c7b8ff', '#ff8fb3') : '');
    }
    /* the back tier: a higher inner wall and a tall central keep behind the gate, so the castle fills the upper
       screen too. Paler and bluer, as if further away. The title banner hangs on the keep. */
    const yB = yB0;
    if (yW - yB > 30*s) {
      const mb = 13*s; let mb2 = '';
      for (let x = -mb/2; x < W + mb; x += mb*2) mb2 += `<rect x="${f(x)}" y="${f(yB - mb)}" width="${f(mb)}" height="${f(mb + 2)}" rx="${f(2*s)}"/>`;
      o += `<g filter="url(#wink)"><g fill="#e6e0f8"><rect x="-10" y="${f(yB)}" width="${W + 20}" height="${f(yW - yB + 2)}"/>${mb2}</g>
        <rect x="-10" y="${f(yB)}" width="${W + 20}" height="${f(yW - yB)}" fill="url(#cbrick)" opacity=".6"/></g>`;
      if (winter) { let caps = ''; for (let x = -mb/2; x < W + mb; x += mb*2) caps += `<path d="M${f(x - 1)} ${f(yB - mb + 3*s)} Q${f(x + mb/2)} ${f(yB - mb - 5*s)} ${f(x + mb + 1)} ${f(yB - mb + 3*s)}Z"/>`;
        o += `<g filter="url(#wink)" fill="#fff">${caps}</g>`; }
      /* small windows along the back wall */
      const sw = 10*s, sh = 16*s, wy = yB + (yW - yB) * .35;
      if (wy + sh < yW - 18*s) for (let x = W * .08; x < W; x += 54*s) {
        if (Math.abs(x - W/2) < g.w * .42) continue;
        o += `<path d="M${f(x - sw/2)} ${f(wy + sh)} V${f(wy + sw/2)} A${f(sw/2)} ${f(sw/2)} 0 0 1 ${f(x + sw/2)} ${f(wy + sw/2)} V${f(wy + sh)}Z" fill="url(#cwin)" stroke="${INKC}" stroke-width="2"/>`; }
      /* slim back towers on wider screens */
      if (W > 640) for (const fx of [.27, .73]) { const bw = clamp(W * .045, 40, 66), bx = W * fx - bw/2;
        if (Math.abs(W * fx - W/2) < g.w * .5 + bw) continue;
        o += tower(bx, bw, Math.max(8 + 26*s + bw*.95 + 12*s, yB - 70*s), yW, s * .85, {windows:2, snow:winter, flag:'#ffd84d'}); }
    }
    /* the keep: a broad tower straight behind the gate */
    const kw = clamp(g.w * .54, 130, 320), kTop = Math.max(t.bottom - 14*s, 8 + 26*s + kw * .62 + 12*s);
    if (yW - kTop > 60*s) o += tower(W/2 - kw/2, kw, kTop, yW + 2, s, {windows:0, snow:winter, flag:'#ff6fa3', cone:.62});

    /* the wall with battlements, edge to edge */
    const m = 16*s;
    let merlons = '';
    for (let x = -m/2; x < W + m; x += m*2) merlons += `<rect x="${f(x)}" y="${f(yW - m)}" width="${f(m)}" height="${f(m + 2)}" rx="${f(2*s)}"/>`;
    o += `<g filter="url(#wink)"><g fill="url(#cwall)"><rect x="-10" y="${f(yW)}" width="${W + 20}" height="${f(gy - yW + 4)}"/>${merlons}</g>
      <rect x="-10" y="${f(yW)}" width="${W + 20}" height="${f(gy - yW)}" fill="url(#cbrick)"/>
      <rect x="-10" y="${f(gy - 16*s)}" width="${W + 20}" height="${f(16*s)}" fill="#2b2452" opacity=".07"/></g>`;
    if (winter) { let caps = ''; for (let x = -m/2; x < W + m; x += m*2) caps += `<path d="M${f(x - 1)} ${f(yW - m + 3*s)} Q${f(x + m/2)} ${f(yW - m - 6*s)} ${f(x + m + 1)} ${f(yW - m + 3*s)}Z"/>`;
      o += `<g filter="url(#wink)" fill="#fff">${caps}<path d="M-10 ${f(yW + 2)} Q${f(W/4)} ${f(yW + 10*s)} ${f(W/2)} ${f(yW + 2)} T${W + 10} ${f(yW + 2)} V${f(yW - 2)} H-10Z"/></g>`; }

    /* windows along the wall, between the outer towers and the gate */
    const winRow = (a, b) => { let r = ''; const ww = 18*s, wh = 28*s, wy = yW + (gy - yW) * .3; if (wy + wh > gy - 22*s) return '';
      const n = Math.floor((b - a) / (ww * 3.2)); for (let i = 0; i < n; i++) { const cx = a + (b - a) * (i + .5) / n;
        r += `<path d="M${f(cx - ww/2)} ${f(wy + wh)} V${f(wy + ww/2)} A${f(ww/2)} ${f(ww/2)} 0 0 1 ${f(cx + ww/2)} ${f(wy + ww/2)} V${f(wy + wh)}Z" fill="url(#cwin)" stroke="${INKC}" stroke-width="2.5"/><path d="M${f(cx)} ${f(wy + 4*s)} V${f(wy + wh)} M${f(cx - ww/2)} ${f(wy + wh*.55)} H${f(cx + ww/2)}" stroke="#e8a83a" stroke-width="2"/>`; }
      return r; };
    /* turrets on wide screens, between each outer tower and the gate */
    const sides = [[tw * .88, gl], [gr, W - tw * .88]];
    let turrets = '', wins = '';
    for (const [a, b] of sides) {
      const gap = b - a;
      if (gap > 230*s) { const w2 = clamp(gap * .22, 56, 96), cx = (a + b) / 2;
        turrets += tower(cx - w2/2, w2, yW - 34*s, gy, s, {windows:2, snow:winter, flag: a < W/2 ? '#ffd84d' : '#5fb8ff'});
        wins += winRow(a, cx - w2/2 - 6*s) + winRow(cx + w2/2 + 6*s, b);
      } else wins += winRow(a, b);
    }
    o += wins;
    /* seasonal trim along the battlements (wall stretches only) */
    o += trim(season, tw * .9, gl - 4, yW, s) + trim(season, gr + 4, W - tw * .9, yW, s);
    o += turrets;
    /* the two great towers at the screen edges */
    o += tower(-tw * .12, tw, yT, gy, s, {windows:3, banner:true, snow:winter, flag:'#3ccfc0'});
    o += tower(W - tw * .88, tw, yT, gy, s, {windows:3, banner:true, snow:winter, flag:'#ff9a4d'});

    /* courtyard: cobbled stone floor and a sandy path that widens toward the viewer */
    const pl0 = g.x + 104*k, pr0 = g.x + 236*k, spread = Math.max(W * .3, (pr0 - pl0));
    o += `<g filter="url(#wink)"><rect x="-10" y="${f(gy)}" width="${W + 20}" height="${f(H - gy + 10)}" fill="${winter ? '#f3f7fc' : '#ece5f6'}"/>
      <rect x="-10" y="${f(gy)}" width="${W + 20}" height="${f(H - gy + 10)}" fill="url(#ccob)"/>
      <path d="M${f(pl0)} ${f(gy)} L${f(pr0)} ${f(gy)} L${f(W/2 + spread)} ${f(H + 10)} L${f(W/2 - spread)} ${f(H + 10)}Z" fill="#f6dea6"/>
      <path d="M${f(pl0 + 6*s)} ${f(gy + 4)} L${f(W/2 - spread + 12*s)} ${f(H + 10)} M${f(pr0 - 6*s)} ${f(gy + 4)} L${f(W/2 + spread - 12*s)} ${f(H + 10)}" stroke="#e8c98c" stroke-width="${f(4*s)}" stroke-dasharray="${f(6*s)} ${f(10*s)}"/></g>`;
    /* round bushes at the foot of the great towers */
    const bush = (x) => `<g filter="url(#wink)"><circle cx="${f(x)}" cy="${f(gy - 4*s)}" r="${f(18*s)}" fill="${winter ? '#e8f1fa' : '#5fbf6a'}"/><circle cx="${f(x + 20*s)}" cy="${f(gy)}" r="${f(13*s)}" fill="${winter ? '#ffffff' : '#6cc97a'}"/>
      ${season === 0 ? `<circle cx="${f(x - 6*s)}" cy="${f(gy - 12*s)}" r="${f(3.5*s)}" fill="#ff8fb3"/><circle cx="${f(x + 8*s)}" cy="${f(gy - 8*s)}" r="${f(3.5*s)}" fill="#ffd84d"/>` : ''}
      ${season === 2 ? `<circle cx="${f(x - 6*s)}" cy="${f(gy - 12*s)}" r="${f(3.5*s)}" fill="#f08a2c"/><circle cx="${f(x + 8*s)}" cy="${f(gy - 8*s)}" r="${f(3.5*s)}" fill="#e5553a"/>` : ''}</g>`;
    o += bush(tw * .95) + bush(W - tw * .95 - 20*s);
    return o;
  }

  function draw(){
    const sec = document.getElementById('gate'), btn = document.getElementById('gateBtn'), box = document.getElementById('castleBg');
    if (!sec || !btn || !box || sec.hidden || sec.classList.contains('g3d')) return;
    const R = sec.getBoundingClientRect(), B = (btn.querySelector('svg') || btn).getBoundingClientRect();
    if (!R.width || !B.width) return;
    const W = Math.round(R.width), H = Math.round(R.height);
    /* the gate drawing is scaled to fit its box and sits on the box's bottom edge (xMidYMax meet) */
    const k = Math.min(B.width / 340, B.height / 380), gw = 340 * k;
    const g = {x: B.left - R.left + (B.width - gw) / 2, y: B.bottom - R.top - 380 * k, w: gw};
    /* the title now lives on the gate's sign: lay it over the sign (sign spans x 72–268, y 86–144 in gate units) */
    const sign = document.getElementById('gateSign'), Bb = btn.getBoundingClientRect();
    if (sign) { const ox = g.x + R.left - Bb.left, oy = g.y + R.top - Bb.top;
      Object.assign(sign.style, {left: (ox + 72*k) + 'px', top: (oy + 86*k) + 'px', width: (196*k) + 'px', height: (58*k) + 'px', fontSize: (25*k) + 'px'}); }
    const t = {top: 0, bottom: 10};
    const season = typeof Seasons !== 'undefined' && Seasons.current >= 0 ? Seasons.current : 0;
    const key = [W, H, Math.round(g.x), Math.round(g.y), Math.round(g.w), Math.round(t.bottom), season].join(':');
    if (key === lastKey) return;
    lastKey = key;
    if (!cache[key]) cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${svg(W, H, g, season, t)}</svg>`);
    const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = cache[key];
    /* copy the picture into a canvas once: when entering, the zoom then just scales this bitmap instead of making
       the browser redraw the lit SVG at five times its size (which shows up as blank frames on phones) */
    const swap = () => { if (lastKey !== key) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), cv = document.createElement('canvas');
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      try { cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); box.replaceChildren(cv); }
      catch(e) { box.replaceChildren(im); } };
    (im.decode ? im.decode() : Promise.resolve()).then(swap, swap);
  }
  /* redraw after layout settles: on resize, rotation, font load and season change */
  const soon = (ms = 120) => { clearTimeout(timer); timer = setTimeout(() => requestAnimationFrame(draw), ms); };
  addEventListener('resize', () => soon());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => soon(0));
  /* the point the viewer walks toward when entering: where the road meets the horizon in the archway */
  function archPoint(){
    const sec = document.getElementById('gate'), btn = document.getElementById('gateBtn');
    if (!sec || !btn) return null;
    const R = sec.getBoundingClientRect(), B = (btn.querySelector('svg') || btn).getBoundingClientRect();
    const k = Math.min(B.width / 340, B.height / 380); if (!k) return null;
    return {x: B.left - R.left + (B.width - 340*k) / 2 + 170*k, y: B.bottom - R.top - 380*k + 270*k};
  }
  return {draw: () => soon(0), archPoint};
})();
