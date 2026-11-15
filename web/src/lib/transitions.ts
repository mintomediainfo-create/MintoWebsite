// The two big switch animations from the design:
//  - zapTheme: light strings shoot out of the theme button; where they land, the new colour spreads inside that section only.
//  - boardSwitch: two boards close over the page, the Minto mark pops, the language changes behind them, the boards open again.
// Both are plain DOM work (no React re-renders while they run) so they stay smooth.

const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const LOGO = '/minto-symbol.png';

let langBusy = false;
export function boardSwitch(dark: boolean, commit: () => void) {
  if (langBusy) return;
  if (reduced() || !document.body.animate) { commit(); return; }
  langBusy = true;
  const ov = document.createElement('div');
  ov.setAttribute('aria-hidden', 'true');
  ov.style.cssText = 'position:fixed;inset:0;z-index:140;pointer-events:auto;overflow:hidden';
  const top = document.createElement('div');
  top.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:50.5%;background:#F68B1F;transform:translateX(100%);will-change:transform;box-shadow:0 0 60px rgba(0,0,0,.25)';
  const bot = document.createElement('div');
  bot.style.cssText = 'position:absolute;left:0;bottom:0;width:100%;height:50%;background:' + (dark ? '#0B4A94' : '#FFFFFF') + ';transform:translateX(-100%);will-change:transform;box-shadow:0 0 60px rgba(0,0,0,.25)';
  const badge = document.createElement('div');
  badge.style.cssText = 'position:absolute;left:50%;top:50%;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;background:#ffffff;border:6px solid ' + (dark ? '#F68B1F' : '#0B4A94') + ';box-shadow:0 18px 50px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;transform:scale(0) rotate(-120deg);box-sizing:border-box';
  const img = document.createElement('img');
  img.src = LOGO; img.alt = '';
  img.style.cssText = 'width:64px;height:68px;object-fit:contain;display:block';
  badge.appendChild(img);
  ov.append(top, bot, badge);
  document.body.appendChild(ov);
  const IN = 'cubic-bezier(.75,0,.2,1)', OUT = 'cubic-bezier(.7,0,.25,1)';
  top.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 560, easing: IN, fill: 'forwards' });
  bot.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], { duration: 560, easing: IN, fill: 'forwards' });
  badge.animate([{ transform: 'scale(0) rotate(-120deg)' }, { transform: 'scale(1.12) rotate(8deg)', offset: 0.7 }, { transform: 'scale(1) rotate(0deg)' }], { duration: 460, delay: 500, easing: 'ease-out', fill: 'forwards' });

  // remember where the reader is (the section at the top of the screen and how far into it) so the page does not jump
  const root = document.querySelector('.mm-theme');
  let anchor: Element | null = null, frac = 0, offTop = 0;
  if (root) {
    for (const ch of Array.from(root.children)) {
      const r = ch.getBoundingClientRect();
      if (r.height > 0 && r.bottom > 1) { anchor = ch; offTop = r.top; frac = r.top < 0 ? -r.top / r.height : 0; break; }
    }
  }
  const html = document.documentElement, oldSB = html.style.scrollBehavior;
  const restore = () => {
    if (!anchor || !anchor.isConnected) return;
    const r = anchor.getBoundingClientRect();
    const want = frac > 0 ? -frac * r.height : offTop;
    const d = r.top - want;
    if (Math.abs(d) > 1) window.scrollTo({ top: (window.scrollY || 0) + d, left: 0, behavior: 'instant' as ScrollBehavior });
  };
  setTimeout(() => {
    html.style.scrollBehavior = 'auto';
    commit();
    [0, 60, 160, 320, 560].forEach((ms) => setTimeout(restore, ms));
    if (document.fonts?.ready) document.fonts.ready.then(() => { restore(); setTimeout(restore, 80); });
  }, 640);
  setTimeout(() => { restore(); html.style.scrollBehavior = oldSB; }, 1900);
  setTimeout(() => {
    badge.animate([{ transform: 'scale(1) rotate(0deg)' }, { transform: 'scale(0) rotate(120deg)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
  }, 1180);
  setTimeout(() => {
    top.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], { duration: 560, easing: OUT, fill: 'forwards' });
    bot.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 560, easing: OUT, fill: 'forwards' });
  }, 1360);
  setTimeout(() => { ov.remove(); langBusy = false; }, 1980);
}

let zapping = false;
export function zapTheme(btn: HTMLElement | null, next: 'light' | 'dark', commit: () => void) {
  if (zapping) return;
  const root = document.querySelector('.mm-theme');
  if (!root || !btn || reduced()) { commit(); return; }
  zapping = true;
  const NS = 'http://www.w3.org/2000/svg';
  const vw = window.innerWidth, vh = window.innerHeight;
  const ox = window.scrollX || 0, oy = window.scrollY || 0;
  const br = btn.getBoundingClientRect();
  const sx = br.left + br.width / 2, sy = br.top + br.height / 2;
  const hero = document.getElementById('top');
  const bands = Array.from(root.children) as HTMLElement[];
  const skipBand = (b: HTMLElement) => b === hero || b.tagName === 'FOOTER' || b.classList.contains('mm-fab') || b.classList.contains('mm-fabs') || b.classList.contains('mm-skip') || b.classList.contains('mm-menu') || b.classList.contains('mm-totop') || b.getAttribute('aria-hidden') === 'true';
  const vis = (r: DOMRect) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const skip = (el: Element) => (hero && hero.contains(el)) || el.closest('.mm-menu') || el.closest('svg') || el.closest('footer');
  const bandOf = (el: Element | null) => { while (el && el.parentNode !== root) el = el.parentNode as Element; return el; };

  // impact points: the bigger blocks on screen
  type Pick = { r: DOMRect; a: number; el: Element; band?: Element | null };
  const small: Pick[] = [];
  const nodes: Element[] = [];
  for (const band0 of bands) {
    if (skipBand(band0)) continue;
    if (!vis(band0.getBoundingClientRect())) continue;
    let lvl: Element[] = [band0];
    for (let d = 0; d < 4; d++) {
      const nx: Element[] = [];
      for (const l of lvl) for (const c of Array.from(l.children)) { nx.push(c); nodes.push(c); }
      lvl = nx;
    }
  }
  for (const el of nodes) {
    if (skip(el)) continue;
    const r = el.getBoundingClientRect();
    const a = r.width * r.height;
    if (!vis(r) || r.width < 70 || r.height < 36 || a < 6000 || a > vw * vh * 0.33) continue;
    small.push({ r, a, el });
  }
  small.sort((p, q) => q.a - p.a);
  const picked: Pick[] = [];
  for (const c of small) {
    if (picked.length >= 8) break;
    if (!picked.some((k) => k.el.contains(c.el) || c.el.contains(k.el))) picked.push(c);
  }
  picked.forEach((t) => { t.band = bandOf(t.el); });

  // sections to aim at: the ones on screen plus the next few below
  const big: { r: DOMRect; band: HTMLElement }[] = [];
  for (const bel of bands) {
    if (skipBand(bel)) continue;
    const r = bel.getBoundingClientRect();
    if (r.height > 20 && r.bottom > 0 && r.top < vh * 1.9) big.push({ r, band: bel });
  }
  const pattern = [2, 3, 1, 2, 1];
  type Pt = { x: number; y: number; band: HTMLElement | null; delay?: number; d?: string; L?: number; seg?: number; dur?: number; hit?: number };
  const pts: Pt[] = [];
  big.slice(0, 5).forEach((t, bi) => {
    const r = t.r;
    let cnt = pattern[bi % pattern.length];
    if (r.height < 120) cnt = 1;
    const spots = picked.filter((pk) => pk.band === t.band);
    const x0 = Math.max(r.left, 24), x1 = Math.min(r.right, vw - 24);
    const y0 = Math.max(r.top + 30, 24);
    let y1 = Math.min(r.bottom - 20, r.top + Math.max(60, r.height) - 20);
    y1 = Math.max(y0 + 1, Math.min(y1, vh * 1.9));
    for (let k = 0; k < cnt; k++) {
      let px: number, py: number;
      if (spots[k]) { const sr = spots[k].r; px = sr.left + sr.width * (0.25 + Math.random() * 0.5); py = sr.top + sr.height * (0.3 + Math.random() * 0.4); }
      else { px = x0 + (x1 - x0) * ((k + 0.15 + Math.random() * 0.7) / cnt); py = y0 + (Math.min(y1, y0 + vh * 0.7) - y0) * (0.15 + Math.random() * 0.7); }
      pts.push({ x: px, y: py, band: t.band });
    }
  });
  if (!pts.length) {
    for (let f = 0; f < 6; f++) {
      const ang = Math.PI * (0.5 + f * 0.12);
      pts.push({ x: sx + Math.cos(ang) * vw * 0.6, y: Math.min(vh - 20, sy + Math.sin(ang) * vh * 0.8), band: null });
    }
  }
  pts.sort((p, q) => Math.hypot(p.x - sx, p.y - sy) - Math.hypot(q.x - sx, q.y - sy));
  pts.forEach((pt, i) => { pt.delay = i * 60 + Math.random() * 25; });
  const colors = ['#F68B1F', '#7CC0FF', '#FFFFFF', '#FFC27A', '#4D8FE0'];

  const meas = document.createElementNS(NS, 'svg');
  (meas as any).style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden';
  document.body.appendChild(meas);
  pts.forEach((pt, pi) => {
    const dx = pt.x - sx, dy = pt.y - sy, d = Math.sqrt(dx * dx + dy * dy) || 1;
    const bend = (pi % 2 ? 1 : -1) * (0.18 + Math.random() * 0.42) * d;
    const cx = sx + dx / 2 + (-dy / d) * bend, cy = sy + dy / 2 + (dx / d) * bend;
    pt.d = `M${sx} ${sy} Q${cx} ${cy} ${pt.x} ${pt.y}`;
    const tmp = document.createElementNS(NS, 'path'); tmp.setAttribute('d', pt.d); meas.appendChild(tmp);
    pt.L = tmp.getTotalLength();
    pt.seg = Math.max(90, pt.L * 0.32);
    pt.dur = 260 + pt.L * 0.32;
    pt.hit = pt.delay! + pt.dur * (pt.L / (pt.L + pt.seg));
  });
  meas.remove();

  // one spread per section, starting where the first string lands in it
  type Sp = { band: HTMLElement; pt: Pt; n?: number; ink?: HTMLElement; ring?: HTMLElement; dur?: number; end?: number };
  const spreads: Sp[] = [];
  pts.forEach((pt) => {
    if (!pt.band) return;
    const sp = spreads.find((s) => s.band === pt.band);
    if (!sp) spreads.push({ band: pt.band, pt });
    else if (pt.hit! < sp.pt.hit!) sp.pt = pt;
  });
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:70;pointer-events:none';
  spreads.forEach((sp, n) => { sp.n = n; });
  const PAL: Record<string, { bg: string; bg2: string }> = { light: { bg: '#FFFFFF', bg2: '#F1F5FA' }, dark: { bg: '#050B16', bg2: '#081325' } };
  const build = (sp: Sp) => {
    const r0 = sp.band.getBoundingClientRect();
    const x0 = Math.max(r0.left, 0), y0 = Math.max(r0.top, -260), x1 = Math.min(r0.right, vw), y1 = Math.min(r0.bottom, vh + 260);
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const sdx = (window.scrollX || 0) - ox, sdy = (window.scrollY || 0) - oy;
    const px = sp.pt.x - sdx, py = sp.pt.y - sdy;
    const lx = Math.max(0, Math.min(w, px - x0)), ly = Math.max(0, Math.min(h, py - y0));
    const R = Math.max(Math.hypot(lx, ly), Math.hypot(w - lx, ly), Math.hypot(lx, h - ly), Math.hypot(w - lx, h - ly)) + 8;
    const bgv = sp.band.getAttribute('data-bg') === 'bg2' ? 'bg2' : 'bg';
    const box = document.createElement('div');
    box.style.cssText = `position:absolute;overflow:hidden;left:${x0 + ox + sdx}px;top:${y0 + oy + sdy}px;width:${w}px;height:${h}px`;
    const ink = document.createElement('div');
    ink.style.cssText = `position:absolute;left:${lx - R}px;top:${ly - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;background:${PAL[next][bgv]};transform:scale(0);will-change:transform,opacity`;
    const col = colors[sp.n! % colors.length];
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${lx - R}px;top:${ly - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;border:3px solid ${col};box-shadow:0 0 16px ${col};transform:scale(0);will-change:transform,opacity`;
    box.append(ink, ring);
    host.appendChild(box);
    sp.ink = ink; sp.ring = ring;
    sp.dur = Math.max(380, Math.min(700, 280 + R * 0.4));
  };
  const layer = document.createElement('div');
  layer.style.cssText = `position:absolute;z-index:5;left:${ox}px;top:${oy}px;width:${vw}px;height:${vh}px;overflow:visible`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(vw)); svg.setAttribute('height', String(vh));
  (svg as any).style.cssText = 'position:absolute;inset:0;overflow:visible';
  layer.appendChild(svg);
  host.appendChild(layer);
  document.body.appendChild(host);

  const burst = (x: number, y: number, color: string) => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${x - 6}px;top:${y - 6}px;width:12px;height:12px;border-radius:50%;border:2px solid ${color};box-shadow:0 0 12px ${color}`;
    layer.appendChild(ring);
    ring.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(7)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    for (let s = 0; s < 9; s++) {
      const sp = document.createElement('div');
      const an = Math.random() * Math.PI * 2, len = 26 + Math.random() * 46, sz = 3 + Math.random() * 4;
      sp.style.cssText = `position:absolute;left:${x - sz / 2}px;top:${y - sz / 2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:${s % 2 ? '#FFFFFF' : color};box-shadow:0 0 8px ${color}`;
      layer.appendChild(sp);
      sp.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(an) * len}px,${Math.sin(an) * len}px) scale(.2)`, opacity: 0 }], { duration: 420 + Math.random() * 260, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' });
    }
  };
  const EASE = 'cubic-bezier(.3,0,.2,1)';
  burst(sx, sy, '#F68B1F');
  pts.forEach((pt, idx) => {
    const color = colors[idx % colors.length];
    [0, 1].forEach((n) => {
      const pth = document.createElementNS(NS, 'path');
      pth.setAttribute('d', pt.d!); pth.setAttribute('fill', 'none'); pth.setAttribute('stroke-linecap', 'round');
      pth.setAttribute('stroke', n ? '#FFFFFF' : color);
      pth.setAttribute('stroke-width', String(n ? 2 : 6 + (idx % 3) * 2));
      if (!n) pth.setAttribute('stroke-opacity', '0.55');
      pth.style.strokeDasharray = `${pt.seg} ${pt.L! + pt.seg! * 2}`;
      pth.style.strokeDashoffset = String(pt.seg);
      svg.appendChild(pth);
      pth.animate([{ strokeDashoffset: pt.seg }, { strokeDashoffset: -pt.L! }] as any, { duration: pt.dur, delay: pt.delay, easing: 'linear', fill: 'forwards' });
    });
    setTimeout(() => burst(pt.x, pt.y, color), pt.hit);
  });
  const flipped: HTMLElement[] = [];
  spreads.forEach((sp) => {
    setTimeout(() => {
      build(sp);
      sp.ink!.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: sp.dur, easing: EASE, fill: 'forwards' });
      sp.ring!.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: sp.dur, easing: EASE, fill: 'forwards' });
      setTimeout(() => {
        sp.band.classList.add('mm-' + next, 'mm-flip');
        flipped.push(sp.band);
        sp.ink!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
      }, sp.dur! + 10);
    }, Math.max(0, sp.pt.hit! - 10));
  });
  spreads.forEach((sp) => { sp.end = sp.pt.hit! + 980; });
  const lastBeam = Math.max(...pts.map((p) => p.delay! + p.dur!));
  const done = Math.max(lastBeam, ...spreads.map((sp) => sp.end!));
  setTimeout(() => {
    commit();
    setTimeout(() => {
      flipped.forEach((el) => el.classList.remove('mm-' + next, 'mm-flip'));
      host.remove();
      zapping = false;
    }, 80);
  }, done + 40);
}
