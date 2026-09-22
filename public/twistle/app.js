(function () {
  'use strict';

  // ---- Mobile viewport height fix (don't trust raw 100vh) ----
  function setVh() {
    document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  }
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);

  const socket = io('/twistle');
  const $ = (id) => document.getElementById(id);

  // ---- Deterministic colored-initial avatar chip (same convention used
  // platform-wide: Blindle, Findle, CROSSDLE, Flagle, TRAVLE) — shown for
  // a viewer's TikTok profile photo, or as a fallback when there isn't one. ----
  function escapeHtmlAttr(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const AVATAR_PALETTE = ['#e0699c', '#4fa0c4', '#6faa5c', '#e0a934', '#9c6fd1', '#e0724a', '#3aa6a6', '#c4577a'];
  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  function avatarColorFor(name) { return AVATAR_PALETTE[hashString(name || '?') % AVATAR_PALETTE.length]; }
  function avatarInitial(name) { const c = String(name || '').trim(); return c ? c[0].toUpperCase() : '?'; }
  function avatarChipHtml(name, avatarUrl, sizePx) {
    sizePx = sizePx || 20;
    const initial = escapeHtmlAttr(avatarInitial(name));
    const color = avatarColorFor(name);
    const title = escapeHtmlAttr(name || 'Unknown viewer');
    if (avatarUrl) {
      return `<span class="avatarChip" style="width:${sizePx}px;height:${sizePx}px;" title="${title}">` +
        `<img class="avatarChipImg" alt="" referrerpolicy="no-referrer" src="${escapeHtmlAttr(avatarUrl)}" ` +
        `onerror="this.parentElement.classList.add('avatarChipFallback');this.parentElement.style.background='${color}';this.replaceWith('${initial}')" /></span>`;
    }
    return `<span class="avatarChip avatarChipFallback" style="width:${sizePx}px;height:${sizePx}px;background:${color};" title="${title}">${initial}</span>`;
  }

  // ---- The symbol set --------------------------------------------------
  // ids must match SYMBOL_INFO in gameEngine.js. Each symbol is drawn once as an
  // SVG <symbol> (see buildSymbolSprite) and every board cell just points at it.
  // Look: chunky "plush toy" - thick extruded base, dark contour, glossy gradient
  // body lit from the top-left, tinted shading, a shine, a ground shadow and a face.
  const INK = '#3a1d4d';
  const SHADOW_TINT = '#2a0d4a';

  const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const A = hex2rgb(a), B = hex2rgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const fx = (n) => Math.round(n * 100) / 100;

  /** Closed polygon with rounded corners (quadratic curves). */
  function roundPoly(pts, r) {
    const n = pts.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
      const k = Math.min(r, l1 / 2, l2 / 2);
      const a = [p1[0] + (v1[0] / l1) * k, p1[1] + (v1[1] / l1) * k];
      const b = [p1[0] + (v2[0] / l2) * k, p1[1] + (v2[1] / l2) * k];
      d += `${i ? 'L' : 'M'}${fx(a[0])} ${fx(a[1])}Q${fx(p1[0])} ${fx(p1[1])} ${fx(b[0])} ${fx(b[1])}`;
    }
    return d + 'Z';
  }

  /** Rotate the points of an absolute M/C/Z path around (cx, cy). */
  function rotatePath(cmds, deg, cx, cy) {
    const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
    const rot = ([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
    return cmds.map(([op, ...pts]) => op + pts.map((p) => rot(p).map(fx).join(' ')).join(' ')).join('') + 'Z';
  }

  /** A face: blush, eyes, mouth. eyes: 'dot' | 'happy' | 'sleep'. */
  function face(cx, cy, o = {}) {
    const gap = o.gap ?? 13;
    const rx = o.rx ?? 2.8, ry = o.ry ?? 3.6;
    const x1 = cx - gap / 2, x2 = cx + gap / 2;
    const eyeKind = o.eyes || 'dot';
    const eye = (x) => {
      if (eyeKind === 'happy') return `<path d="M${fx(x - 3.2)} ${fx(cy + 1.6)}Q${fx(x)} ${fx(cy - 4)} ${fx(x + 3.2)} ${fx(cy + 1.6)}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
      if (eyeKind === 'sleep') return `<path d="M${fx(x - 3.2)} ${fx(cy - 1)}Q${fx(x)} ${fx(cy + 3.6)} ${fx(x + 3.2)} ${fx(cy - 1)}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
      return `<ellipse cx="${fx(x)}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${fx(x + 0.95)}" cy="${fx(cy - 1.35)}" r="1.15" fill="#fff"/><circle cx="${fx(x - 0.9)}" cy="${fx(cy + 1.5)}" r=".55" fill="#fff" opacity=".85"/>`;
    };
    const my = cy + (o.mouthDy ?? 6.6);
    let mouth;
    if (o.mouth === 'open') {
      mouth = `<path d="M${fx(cx - 3.4)} ${fx(my - 0.6)}Q${cx} ${fx(my + 6.4)} ${fx(cx + 3.4)} ${fx(my - 0.6)}Z" fill="${INK}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><ellipse cx="${cx}" cy="${fx(my + 2.4)}" rx="1.9" ry="1.2" fill="#ff7f9d"/>`;
    } else if (o.mouth === 'o') {
      mouth = `<ellipse cx="${cx}" cy="${fx(my + 0.8)}" rx="1.9" ry="2.3" fill="${INK}"/>`;
    } else if (o.mouth === 'cat') {
      mouth = `<path d="M${fx(cx - 4.4)} ${fx(my)}Q${fx(cx - 2.2)} ${fx(my + 3.2)} ${cx} ${fx(my)}Q${fx(cx + 2.2)} ${fx(my + 3.2)} ${fx(cx + 4.4)} ${fx(my)}" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      mouth = `<path d="M${fx(cx - 3)} ${fx(my)}Q${cx} ${fx(my + 3.8)} ${fx(cx + 3)} ${fx(my)}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    const bx = gap / 2 + (o.blushDx ?? 6.6), by = cy + (o.blushDy ?? 4.4);
    const bc = o.blush || '#ff6f9c';
    const blush = `<ellipse cx="${fx(cx - bx)}" cy="${fx(by)}" rx="3.4" ry="2.1" fill="${bc}" opacity=".62"/><ellipse cx="${fx(cx + bx)}" cy="${fx(by)}" rx="3.4" ry="2.1" fill="${bc}" opacity=".62"/>`;
    const inner = blush + eye(x1) + eye(x2) + mouth;
    return o.rotate ? `<g transform="rotate(${o.rotate} ${cx} ${cy})">${inner}</g>` : inner;
  }

  const shine = (x, y, rx, ry, rot, dot) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity=".78"/>` +
    (dot ? `<circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2] || 1.5}" fill="#fff" opacity=".9"/>` : '');

  // --- silhouettes ---
  const HEART = 'M32 54C10 40 5 28 5 19.5C5 11.5 11 6 18.5 6C24 6 29 9 32 14C35 9 40 6 45.5 6C53 6 59 11.5 59 19.5C59 28 54 40 32 54Z';
  const DROP = 'M32 5C44 21 54 32 54 42.5A22 22 0 0 1 10 42.5C10 32 20 21 32 5Z';
  const MOON = 'M56 34.1A24 24 0 1 1 29.9 8A18.7 18.7 0 0 0 56 34.1Z';
  const STAR = roundPoly(
    Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 13.5 : 26.5;
      return [32 + Math.cos(a) * r, 34.5 + Math.sin(a) * r];
    }), 4.6);
  const GEM = roundPoly([[19, 9], [45, 9], [58, 24], [32, 56], [6, 24]], 4);
  const LEAF = [['M', [32, 32]], ['C', [24, 26], [17, 20], [17, 13]], ['C', [17, 8], [21, 5], [25, 5]], ['C', [28, 5], [31, 7], [32, 10]], ['C', [33, 7], [36, 5], [39, 5]], ['C', [43, 5], [47, 8], [47, 13]], ['C', [47, 20], [40, 26], [32, 32]]];
  const CLOVER = [0, 90, 180, 270].map((a) => rotatePath(LEAF, a, 32, 32));
  const EAR_L = roundPoly([[8, 28], [10, 6], [29, 17]], 3.4);
  const EAR_R = roundPoly([[56, 28], [54, 6], [35, 17]], 3.4);
  const DONUT_RING = 'M32 4A26 26 0 1 1 31.99 4ZM32 23.5A6.5 6.5 0 1 0 32.01 23.5Z';
  const ICING = (() => {
    const cx = 32, cy = 30, pts = [];
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2, r = 22.2 + 1.7 * Math.sin(a * 8);
      pts.push(`${fx(cx + Math.cos(a) * r)} ${fx(cy + Math.sin(a) * r)}`);
    }
    return 'M' + pts.join('L') + 'ZM32 20.5A9.5 9.5 0 1 0 32.01 20.5Z';
  })();

  const MUSH_CAP = 'M5.5 33C5.5 17 17.5 6 32 6C46.5 6 58.5 17 58.5 33C58.5 35.2 56.8 36.5 54.8 36.5H9.2C7.2 36.5 5.5 35.2 5.5 33Z';
  const GHOST = roundPoly([
    ...Array.from({ length: 19 }, (_, i) => { const t = Math.PI + (i * Math.PI) / 18; return [32 + Math.cos(t) * 22, 28 + Math.sin(t) * 22]; }),
    [54, 52], [43, 45], [32, 52], [21, 45], [10, 52],
  ], 4.4);

  // hue/tone/shape live in the engine (contrast rules); color/art live here.
  const SYMBOLS = {
    heart: {
      color: '#ff3f6c', shadow: 25,
      shape: (a) => `<path d="${HEART}" ${a}/>`,
      hl: shine(17.5, 15.5, 6.2, 3.4, -35, [27, 11.5, 1.6]),
      face: face(32, 27, { gap: 17, mouth: 'open', blush: '#ffa9c0', mouthDy: 6 }),
    },
    star: {
      color: '#ffc419', shadow: 22,
      shape: (a) => `<path d="${STAR}" ${a}/>`,
      hl: shine(27.5, 18.5, 2.7, 6.4, 24, [33, 13.2, 1.4]),
      face: face(32, 35, { gap: 12, eyes: 'happy', mouthDy: 6.4, blush: '#ff8f6b' }),
    },
    moon: {
      color: '#8f6bff', shadow: 20,
      shape: (a) => `<path d="${MOON}" ${a}/>`,
      hl: shine(15.5, 27, 2.8, 6.2, 28, [21.5, 18.5, 1.5]),
      face: face(27, 40, { gap: 12.5, eyes: 'sleep', rotate: -12, mouthDy: 6.2, blushDx: 6.4, blushDy: 4, blush: '#ff8fc0' }),
    },
    drop: {
      color: '#2f8bff', shadow: 20,
      shape: (a) => `<path d="${DROP}" ${a}/>`,
      hl: shine(21.5, 38, 3.4, 8, 18, [27, 24.5, 1.7]),
      face: face(32, 43, { gap: 13, mouth: 'o', mouthDy: 6.2, blush: '#ff8fc0' }),
    },
    clover: {
      color: '#2fcf6d', shadow: 24,
      shape: (a) => CLOVER.map((d) => `<path d="${d}" ${a}/>`).join(''),
      decor: `<path d="M32 13V20M32 44V51M13 32H20M44 32H51" fill="none" stroke="${SHADOW_TINT}" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/>`,
      hl: shine(20, 17, 4.6, 2.6, -32, [27, 11.5, 1.4]),
      face: face(32, 31, { gap: 11, mouthDy: 5.8, blush: '#ffb0a8', blushDx: 6.2 }),
    },
    cat: {
      color: '#ff8a2b', shadow: 24,
      shape: (a) => `<path d="${EAR_L}" ${a}/><path d="${EAR_R}" ${a}/><ellipse cx="32" cy="36" rx="24" ry="18.5" ${a}/>`,
      decor:
        `<path d="${roundPoly([[13, 24], [14.4, 12.5], [24, 18.5]], 1.8)}" fill="#ffb3c6"/>` +
        `<path d="${roundPoly([[51, 24], [49.6, 12.5], [40, 18.5]], 1.8)}" fill="#ffb3c6"/>`,
      hl: shine(19, 26.5, 6, 2.9, -18, [28.5, 23.5, 1.4]),
      face:
        face(32, 35.5, { gap: 20, mouth: 'cat', mouthDy: 8.4, blush: '#ff6f8f', blushDx: 5.6, blushDy: 3.6 }) +
        `<path d="M29.6 41.2Q32 39.6 34.4 41.2Q32 44 29.6 41.2Z" fill="#ff6f8f"/>`,
    },
    gem: {
      color: '#17d4cf', shadow: 24,
      shape: (a) => `<path d="${GEM}" ${a}/>`,
      decor:
        `<path d="M22.5 11.4H41.5L45 21.6H19Z" fill="#fff" opacity=".24"/>` +
        `<path d="M32 56L58 24H45L32 40Z" fill="#0b3d7a" opacity=".13"/>` +
        `<path d="M8 24H56M19.5 10.5L24.5 24M44.5 10.5L39.5 24" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/>`,
      hl: shine(14.5, 20.5, 1.9, 4.2, 42, null),
      face: face(32, 32.5, { gap: 13, mouthDy: 6.2, blush: '#ff8fc0', blushDx: 5.4 }),
    },
    donut: {
      color: '#ff5fb5', shadow: 24, base: '#f0b167',
      shape: (a) => `<path d="${DONUT_RING}" fill-rule="evenodd" clip-rule="evenodd" ${a}/>`,
      icing: true,
      decor:
        `<path d="${ICING}" fill="url(#ic-donut)" fill-rule="evenodd"/>` +
        `<path d="${ICING}" fill="url(#sh)" fill-rule="evenodd" opacity=".7"/>` +
        [[19, 24, 40, '#fff6a8'], [26, 13.5, -25, '#7ee8ff'], [40.5, 13, 30, '#fff'], [47.5, 22.5, -60, '#b6ff9a'], [15.5, 33.5, 70, '#fff'], [49, 36, 20, '#fff6a8']]
          .map(([x, y, r, c]) => `<rect x="${x - 2.7}" y="${y - 1}" width="5.4" height="2.1" rx="1.05" transform="rotate(${r} ${x} ${y})" fill="${c}"/>`).join(''),
      hl: shine(15, 21, 2.4, 5.6, 38, [20.5, 12.5, 1.4]),
      face: face(32, 45.4, { gap: 11, rx: 2.2, ry: 2.9, mouthDy: 4.6, blushDx: 6, blushDy: 3, blush: '#ff2f9a' }),
    },
    cloud: {
      color: '#eef1ff', shadow: 25, base: '#f4f6ff', deep: '#5a55b8',
      shape: (a) => `<circle cx="21" cy="37" r="12" ${a}/><circle cx="34" cy="28" r="16" ${a}/><circle cx="47" cy="37" r="12" ${a}/><rect x="13" y="36" width="42" height="17" rx="8.5" ${a}/>`,
      hl: shine(27, 19.5, 6.4, 3.2, -28, [37, 15.8, 1.5]),
      face: face(34, 39, { gap: 14, mouth: 'o', mouthDy: 5.4, blush: '#ff8fb8', blushDx: 6.4 }),
    },
  };

  Object.assign(SYMBOLS, {
    frog: {
      color: '#6bd83c', shadow: 24, deep: '#1f6a3a',
      shape: (a) => `<ellipse cx="32" cy="37" rx="25.5" ry="17" ${a}/><circle cx="19.5" cy="20" r="10.5" ${a}/><circle cx="44.5" cy="20" r="10.5" ${a}/>`,
      decor:
        `<ellipse cx="32" cy="45.5" rx="14.5" ry="7.5" fill="#fff" opacity=".2"/>` +
        [19.5, 44.5].map((x) => `<circle cx="${x}" cy="20" r="7.2" fill="#fff" stroke="#b9e3a3" stroke-width=".9"/><circle cx="${x + 0.9}" cy="21" r="4.1" fill="${INK}"/><circle cx="${x + 2.3}" cy="19.4" r="1.5" fill="#fff"/><circle cx="${x - 0.6}" cy="22.6" r=".7" fill="#fff" opacity=".85"/>`).join(''),
      hl: shine(11, 36, 2.3, 5, 14, [13.5, 29, 1.3]),
      face:
        `<ellipse cx="14.5" cy="42" rx="3.6" ry="2.2" fill="#ff5f86" opacity=".8"/><ellipse cx="49.5" cy="42" rx="3.6" ry="2.2" fill="#ff5f86" opacity=".8"/>` +
        `<circle cx="29.6" cy="34.2" r=".95" fill="${INK}"/><circle cx="34.4" cy="34.2" r=".95" fill="${INK}"/>` +
        `<path d="M23 40Q32 47.5 41 40" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
    },
    mushroom: {
      color: '#ff4b3e', shadow: 22, base: '#fff4de', deep: '#e0905f', shadeOp: 0.42, icing: true,
      shape: (a) => `<path d="${MUSH_CAP}" ${a}/><rect x="19" y="33" width="26" height="22" rx="10" ${a}/>`,
      decor:
        `<path d="M20 36.5H44Q32 44 20 36.5Z" fill="${SHADOW_TINT}" opacity=".24"/>` +
        `<path d="${MUSH_CAP}" fill="url(#ic-mushroom)" stroke="#8e1d3a" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="${MUSH_CAP}" fill="url(#sh)" opacity=".9"/>` +
        [[18.5, 22, 4.6], [33, 13.5, 3.6], [46, 22.5, 5], [31, 27, 2.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".96"/>`).join(''),
      hl: shine(15, 15.5, 5.4, 2.5, -40, [25, 10.5, 1.4]),
      face: face(32, 46, { gap: 10.5, rx: 2.2, ry: 2.9, mouthDy: 4.6, blushDx: 3.6, blushDy: 3, blush: '#ff8f9c' }),
    },
    ghost: {
      color: '#dc5ef2', shadow: 23,
      shape: (a) => `<path d="${GHOST}" ${a}/>`,
      hl: shine(20, 17, 5.8, 2.8, -36, [29.5, 11, 1.5]),
      face: face(32, 28, { gap: 14, mouth: 'o', mouthDy: 6.8, blush: '#ff7ac8', blushDx: 6.4 }),
    },
    // Safety net: if the server ever sends a symbol this page has no art for,
    // show this instead of nothing at all.
    _fallback: {
      color: '#9aa3ff', shadow: 22,
      shape: (a) => `<circle cx="32" cy="32" r="23" ${a}/>`,
      hl: shine(20, 20, 6, 3, -35, [29, 13, 1.5]),
      face: face(32, 32, { gap: 13, mouth: 'o', mouthDy: 6 }),
    },
  });

  function buildSymbolSprite() {
    const defs = `
      <linearGradient id="sh" gradientUnits="userSpaceOnUse" x1="0" y1="26" x2="0" y2="58">
        <stop offset="0" stop-color="${SHADOW_TINT}" stop-opacity="0"/><stop offset="1" stop-color="${SHADOW_TINT}" stop-opacity=".34"/>
      </linearGradient>
      <radialGradient id="gs"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    const grad = (id, base, deep) => `
      <radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="20" cy="15" r="56">
        <stop offset="0" stop-color="${mix(base, '#ffffff', 0.58)}"/>
        <stop offset=".42" stop-color="${base}"/>
        <stop offset="1" stop-color="${mix(base, deep || SHADOW_TINT, 0.42)}"/>
      </radialGradient>`;
    const symbols = Object.entries(SYMBOLS).map(([id, s]) => {
      const base = s.base || s.color;
      const rim = mix(base, s.deep || SHADOW_TINT, 0.5);
      const deep = mix(base, s.deep || SHADOW_TINT, 0.68);
      const extra = s.icing ? grad('ic-' + id, s.color) : '';
      return `<symbol id="sym-${id}" viewBox="0 0 64 64" overflow="visible">
        ${grad('gb-' + id, base, s.deep)}${extra}<clipPath id="cp-${id}">${s.shape('')}</clipPath>
        <ellipse cx="32" cy="58.6" rx="${s.shadow}" ry="3.7" fill="url(#gs)"/>
        <g transform="translate(0 3.3)">${s.shape(`fill="${deep}" stroke="${deep}" stroke-width="2.6" stroke-linejoin="round"`)}</g>
        ${s.shape(`fill="${rim}" stroke="${rim}" stroke-width="2.6" stroke-linejoin="round"`)}
        <g clip-path="url(#cp-${id})"><rect width="64" height="64" fill="url(#gb-${id})"/><rect width="64" height="64" fill="url(#sh)" opacity="${s.shadeOp ?? 1}"/></g>
        ${s.decor || ''}${s.hl}${s.face}
      </symbol>`;
    }).join('');
    document.body.insertAdjacentHTML('afterbegin',
      `<svg id="symbolSprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${defs}</defs>${symbols}</svg>`);
  }
  buildSymbolSprite();

  const warnedSymbols = new Set();
  function symbolSvg(id) {
    if (!id) return '';
    if (!SYMBOLS[id]) {
      if (!warnedSymbols.has(id)) { warnedSymbols.add(id); console.warn('[Twistle] No artwork for symbol "' + id + '" - showing a placeholder. Is this page out of date?'); }
      id = '_fallback';
    }
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#sym-${id}"/></svg>`;
  }

  const CONCEPT_TEXT = { correct: 'Right spot', misplaced: 'Wrong spot', absent: 'Not in your guess' };
  const REASON_TEXT = {
    revealed: 'The host revealed the answer.',
    skipped: 'Round skipped.',
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Element refs ----
  const statusDot = $('statusDot');
  const statusText = $('statusText');
  const gridEl = $('grid');
  const guessBadge = $('guessBadge');
  const resultEl = $('result');
  const confettiWrap = $('confettiWrap');

  let lastState = null;

  // ---- Connection status ----
  let hasEnvSignKey = false;
  socket.on('server:config', (cfg) => {
    hasEnvSignKey = Boolean(cfg.hasEnvSignKey);
    if (cfg.defaultUsername && !$('tiktokUsername').value) $('tiktokUsername').value = cfg.defaultUsername;
    const missing = (cfg.symbols || []).filter((id) => !SYMBOLS[id]);
    if (missing.length) console.warn('[Twistle] This page has no artwork for: ' + missing.join(', ') + ' - it is out of date. Replace public/twistle/app.js with the newest version.');
    maybeAutoConnect();
  });

  // ---- One-time login: the platform-wide saved TikTok username (see
  // /shared/session.js). Connecting once on any game pre-fills and
  // auto-connects the rest — no re-typing when switching games mid-stream.
  // Auto-connect only fires once per page load, and only when a signing
  // key is already available on the server (EULERSTREAM_API_KEY on
  // Render) since there's nowhere to silently pull a per-host API key
  // from otherwise. ----
  let autoConnectTried = false;
  function maybeAutoConnect() {
    if (autoConnectTried) return;
    if (!window.PlatformSession) return;
    const saved = window.PlatformSession.getUsername();
    if (!saved) return;
    if (!$('tiktokUsername').value) $('tiktokUsername').value = saved;
    if ($('tiktokUsername').value.trim().toLowerCase() !== saved.trim().toLowerCase()) return;
    if (!hasEnvSignKey) return; // no key to auto-connect with — host still connects manually from Host Controls
    autoConnectTried = true;
    socket.emit('host:connectTikTok', { username: saved, signApiKey: '' });
  }
  if (window.PlatformSession) {
    window.PlatformSession.onChange((name) => {
      if (name && !$('tiktokUsername').value) $('tiktokUsername').value = name;
    });
  }
  socket.on('tiktok:status', (payload) => {
    const st = ['connected', 'connecting', 'error'].includes(payload.state) ? payload.state : '';
    statusDot.className = 'status-dot ' + (payload.state === 'connected' ? 'connected' : payload.state === 'connecting' ? 'connecting' : '');
    statusText.textContent = payload.state.charAt(0).toUpperCase() + payload.state.slice(1);
    const box = $('connStatus');
    box.className = 'conn-status ' + st;
    box.textContent = payload.message || (payload.state === 'disconnected' ? 'Not connected.' : payload.state);
  });
  socket.on('testMode:status', (enabled) => { $('testModeToggle').checked = enabled; });

  // ---------------------------------------------------------------------
  // Board
  // ---------------------------------------------------------------------
  function scrollToLatest() {
    const m = document.querySelector('main');
    requestAnimationFrame(() => m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' }));
  }
  // ---- Adaptive layout: pick tile size + arrangement from the word length and the width we have ----
  // Smallest tile (px) we accept for the letters-beside-symbols layout. Wide windows demand bigger tiles
  // (a wide capture gets shrunk onto viewers' phones); narrow phones settle for 26px.
  const sideMin = (W) => Math.min(44, Math.max(26, W * 0.055));
  const STACK_MIN = 30;  // smallest tile (px) before a stacked line is wrapped onto another line
  const CELL_CAP = 72;   // biggest tile (px) so short words don't look oversized
  const SIDE_GAP = 16;   // space between the letters and the symbols in the side layout
  const px = (n) => Math.floor(n * 10) / 10;

  /** Fit `n` equal cells on as few lines as possible while keeping each at least STACK_MIN wide. */
  function fitLine(n, W, cap, gap) {
    let lines = 1, cols = n, cell;
    for (;;) {
      cols = Math.ceil(n / lines);
      cell = (W - (cols - 1) * gap) / cols;
      if (cell >= STACK_MIN || cols <= 3 || lines >= 8) break;
      lines++;
    }
    return { cell: px(Math.max(14, Math.min(cap, cell))), cols };
  }

  function computeLayout(n, W) {
    let gap = 4;
    let side = (W - SIDE_GAP - (2 * n - 2) * gap) / (2 * n);
    if (side >= sideMin(W)) {
      if (side >= 44) { gap = 6; side = (W - SIDE_GAP - (2 * n - 2) * gap) / (2 * n); }
      const cell = px(Math.min(CELL_CAP, side));
      return { mode: 'side', cell, cols: n, gap, width: Math.ceil(2 * n * cell + (2 * n - 2) * gap + SIDE_GAP) };
    }
    let f = fitLine(n, W, 56, gap);
    if (f.cell >= 44) { gap = 6; f = fitLine(n, W, 56, gap); }
    return { mode: 'stack', cell: f.cell, cols: f.cols, gap, width: Math.ceil(f.cols * f.cell + (f.cols - 1) * gap) };
  }

  let layoutN = 5;
  function applyLayout(n) {
    if (n) layoutN = n;
    const W = gridEl.clientWidth;
    if (W < 120) return; // page not laid out yet (or hidden)
    const L = computeLayout(layoutN, W);
    gridEl.style.setProperty('--cell', L.cell + 'px');
    gridEl.style.setProperty('--cols', L.cols);
    gridEl.style.setProperty('--gap', L.gap + 'px');
    gridEl.classList.toggle('mode-side', L.mode === 'side');
    gridEl.classList.toggle('mode-stack', L.mode === 'stack');
    $('board').style.setProperty('--content-w', L.width + 'px');
    // The revealed answer gets its own comfortable size (and wraps for very long words).
    const A = fitLine(layoutN, W, 60, 5);
    const at = $('answerTiles');
    at.style.setProperty('--cell', A.cell + 'px');
    at.style.setProperty('--cols', A.cols);
  }
  if (window.ResizeObserver) new ResizeObserver(() => applyLayout()).observe(gridEl);
  window.addEventListener('resize', () => applyLayout());

  let lastGridSig = '';
  let lastGridRound = null;
  let lastRowCount = 0;

  function stateColors(state, legend) {
    if (state === 'absent') return { border: '#2b2e5c', bg: '#0b0c1e' };
    const sym = legend && SYMBOLS[legend[state]];
    const c = sym ? sym.color : (state === 'correct' ? '#ff4d4d' : '#3b82ff');
    return { border: c, bg: c + '33' };
  }

  function renderGrid(state) {
    const rows = state.rows || [];
    const sig = [state.roundNumber, state.status, rows.map((r) => r.word + (r.states ? '*' : '')).join(',')].join('|');
    if (sig === lastGridSig) return;
    lastGridSig = sig;

    // Only animate rows that appeared since the last render of this same round.
    const firstRender = lastGridRound === null;
    const sameRound = lastGridRound === state.roundNumber;
    const prevCount = sameRound ? lastRowCount : rows.length;
    lastGridRound = state.roundNumber;
    lastRowCount = rows.length;

    if (!rows.length) { gridEl.innerHTML = ''; return; }

    let html = '';
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const n = row.word.length;
      const step = Math.min(90, Math.floor(1400 / n)); // keep the flip quick even for 20 letters
      const isNew = r >= prevCount;
      let tiles = '';
      let syms = '';
      for (let i = 0; i < n; i++) {
        const ch = escapeHtml(row.word[i]);
        let cls = 'tile filled';
        let style = `--i:${i};`;
        if (row.states) {
          const col = stateColors(row.states[i], state.legend);
          cls += ' flip';
          style += `--d:${i * step}ms;--to-border:${col.border};--to-bg:${col.bg};`;
        }
        tiles += `<div class="${cls}" style="${style}">${ch}</div>`;
        syms += `<div class="sym" style="--i:${i}">${symbolSvg(row.symbols[i])}</div>`;
      }
      html += `<div class="grow${isNew ? ' new' : ''}"><div class="lets">${tiles}</div><div class="syms">${syms}</div></div>`;
    }
    gridEl.innerHTML = html;
    if (rows.length > prevCount || (firstRender && rows.length)) scrollToLatest();
  }

  function renderTried(state) {
    const used = new Set();
    for (const r of state.rows || []) for (const ch of r.word) used.add(ch);
    $('tried').innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => `<span class="${used.has(ch) ? 'on' : ''}">${ch}</span>`).join('');
  }

  function renderHint(state) {
    const hint = $('hintLine');
    if (state.status === 'idle') {
      hint.innerHTML = 'Tap ⚙️ → Game → <strong>Start Game</strong> to begin. New here? Tap <strong>?</strong> for the rules.';
      return;
    }
    if (state.status === 'reveal') { hint.innerHTML = ''; return; }
    const n = state.wordLength;
    hint.innerHTML = (state.rows || []).length === 0
      ? `Type a <strong>${n}-letter word</strong> in chat — a valid one goes straight onto the board. Type the <strong>secret word</strong> to win!`
      : `Keep guessing! Any fresh <strong>${n}-letter word</strong> lands on the board. Type the <strong>secret word</strong> to win!`;
  }

  let confettiRound = null;
  function renderResult(state) {
    const revealed = state.status === 'reveal';
    resultEl.hidden = !revealed;
    if (!revealed) { confettiWrap.innerHTML = ''; return; }

    $('answerTiles').innerHTML = (state.answer || '').split('').map((ch) => `<div class="tile">${escapeHtml(ch)}</div>`).join('');
    const yes = $('resultWinner');
    const no = $('resultNoWinner');
    if (state.winner) {
      yes.hidden = false; no.hidden = true;
      const pts = state.winner.points ? ` <span class="pts">+${state.winner.points} pts</span>` : '';
      yes.innerHTML = '🎉 ' + avatarChipHtml(state.winner.name, state.winner.avatarUrl, 22) + escapeHtml(state.winner.name) + ' solved it!' + pts;
    } else {
      yes.hidden = true; no.hidden = false;
      no.textContent = REASON_TEXT[state.reason] || 'Round over.';
    }
    $('legend').innerHTML = ['correct', 'misplaced', 'absent'].map((c) =>
      `<span class="chip">${state.legend ? symbolSvg(state.legend[c]) : ''}${CONCEPT_TEXT[c]}</span>`
    ).join('');

    if (state.winner && confettiRound !== state.roundNumber) burstConfetti();
    if (confettiRound !== state.roundNumber) scrollToLatest();
    confettiRound = state.roundNumber;
  }

  const CONFETTI = ['🎉', '✨', '🎊', '⭐', '💫'];
  function burstConfetti() {
    confettiWrap.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const span = document.createElement('span');
      span.textContent = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
      span.style.left = Math.random() * 100 + '%';
      span.style.animationDelay = (Math.random() * 0.4) + 's';
      span.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
      span.style.fontSize = (14 + Math.random() * 14) + 'px';
      confettiWrap.appendChild(span);
    }
  }

  function renderGuessBadge(state) {
    const active = state.status === 'active';
    guessBadge.hidden = !active;
    if (!active) return;
    const n = (state.rows || []).length;
    guessBadge.querySelector('span').textContent = n === 1 ? '1 guess so far' : n + ' guesses so far';
  }

  // ---------------------------------------------------------------------
  // Leaderboard: a top ticker (always visible) + a full drawer reachable
  // from the 🏆 header button. Landing a fresh valid guess earns a small
  // point, solving the round earns a bigger bonus (scaled by word length
  // and how quickly it was solved) — see twistle-engine.js.
  // ---------------------------------------------------------------------
  function medalFor(rank) {
    if (rank === 0) return '<span class="medal">🥇</span>';
    if (rank === 1) return '<span class="medal">🥈</span>';
    if (rank === 2) return '<span class="medal">🥉</span>';
    return `<span class="medal">${rank + 1}.</span>`;
  }

  let lastTickerSignature = null;
  function renderTicker(list) {
    const wrap = $('tickerWrap');
    const track = $('tickerTrack');
    if (!wrap || !track) return;
    if (!list || !list.length) {
      track.style.animation = 'none';
      track.innerHTML = '<span class="ticker-empty">Guess a word or solve the round to top the leaderboard!</span>';
      lastTickerSignature = null;
      return;
    }
    const signature = JSON.stringify(list);
    if (signature === lastTickerSignature) return; // don't restart the scroll animation needlessly
    lastTickerSignature = signature;
    const itemsHtml = list.map((row, i) =>
      `<span class="ticker-item">${medalFor(i)}${avatarChipHtml(row.name, row.avatarUrl, 16)}${escapeHtml(row.name)} <span class="tscore">${row.score}</span></span>`
    ).join('');
    track.innerHTML = itemsHtml + itemsHtml; // duplicated once so the 0% -> -50% loop is seamless
    const approxWidth = list.length * 150;
    track.style.animation = 'none';
    // eslint-disable-next-line no-unused-expressions
    track.offsetHeight; // force reflow so the animation restarts cleanly
    track.style.animation = `tickerScroll ${Math.max(9, approxWidth / 40)}s linear infinite`;
  }

  function renderLeaderboardDrawer(list) {
    const el = $('leaderboardBody');
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="empty-hint">No scores yet — guess a word to get on the board!</div>';
      return;
    }
    el.innerHTML = list.map((row, i) =>
      `<div class="leader-row"><span class="leader-rank">${i + 1}</span>${avatarChipHtml(row.name, row.avatarUrl, 26)}<span class="leader-name">${escapeHtml(row.name)}</span>` +
      `<span class="leader-wins">${row.wins ? row.wins + ' win' + (row.wins === 1 ? '' : 's') : ''}</span>` +
      `<span class="leader-score">${row.score} pts</span></div>`
    ).join('');
  }

  function renderLeaderboard(state) {
    const list = state.leaderboard || [];
    renderTicker(list);
    renderLeaderboardDrawer(list);
  }

  function renderState(state) {
    if (!state) return;
    lastState = state;

    const cfg = state.config || { mode: 'fixed', fixed: state.wordLength || 5, min: 4, max: 8 };
    const lengthText = state.status === 'idle'
      ? (cfg.mode === 'fixed' || cfg.min === cfg.max ? `${cfg.mode === 'fixed' ? cfg.fixed : cfg.min} letters` : `random ${cfg.min}–${cfg.max} letters`)
      : `${state.wordLength} letters`;
    if (state.status === 'idle') {
      $('roundLabel').textContent = 'TWISTLE';
      $('roundSub').textContent = 'waiting to start · ' + lengthText;
    } else {
      $('roundLabel').textContent = 'Round #' + state.roundNumber;
      $('roundSub').textContent = '· ' + lengthText;
    }
    if (state.wordBankSize) $('wordBankNote').textContent = 'Word bank: ' + state.wordBankSize + ' secret words (4–20 letters). Custom words are added on top and kept on the server.';
    syncLengthControls(state.config, state.lengthCounts);

    applyLayout(state.wordLength || (state.rows && state.rows[0] && state.rows[0].word.length) || (cfg.mode === 'fixed' ? cfg.fixed : 5));
    renderGrid(state);
    renderTried(state);
    renderHint(state);
    renderResult(state);
    renderGuessBadge(state);
    renderLeaderboard(state);
  }
  socket.on('game:state', renderState);

  // ---------------------------------------------------------------------
  // Shared platform celebration — a floating card on top of TWISTLE's own
  // in-board reveal (tile flip + confetti above), same pattern Flagle and
  // TRAVLE use. Fires once per round end: who solved it (or that nobody
  // did) and how many points, followed by the current top scorer.
  // ---------------------------------------------------------------------
  let lastCelebratedRound = null;
  socket.on('round:ended', (payload) => {
    if (!payload || !window.Celebration) return;
    if (lastCelebratedRound === lastState?.roundNumber) return;
    lastCelebratedRound = lastState?.roundNumber;
    const rows = payload.winner
      ? [
          { primary: payload.winner.name, avatarUrl: payload.winner.avatarUrl || null },
          { primary: payload.answer, primaryLarge: true, secondary: payload.winner.points ? `+${payload.winner.points} pts` : '', secondaryLarge: true },
        ]
      : [
          { primary: 'No one solved it this round' },
          { primary: payload.answer, primaryLarge: true },
        ];
    window.Celebration.showCard({
      emoji: payload.winner ? '🌀' : '⏭️',
      title: payload.winner ? 'Round Winner!' : 'Round Result',
      rows,
      durationMs: 4000,
    }).then(() => {
      const top = (payload.leaderboard || [])[0];
      if (!top || !window.Celebration) return;
      window.Celebration.showCard({
        emoji: '🏆',
        title: 'Top Scorer',
        rows: [{ primary: top.name, avatarUrl: top.avatarUrl || null, primaryLarge: true, secondary: `${top.score} pt${top.score === 1 ? '' : 's'}` }],
        durationMs: 3500,
      });
    });
  });

  // ---------------------------------------------------------------------
  // "!penguin" / "!fish" — shared, purely-decorative easter egg (see
  // /shared/penguin-fun.js). The server only ever relays the matched
  // trigger word itself, never chat/guess text, so this never conflicts
  // with Twistle's "chat is never displayed or stored" design.
  // ---------------------------------------------------------------------
  socket.on('fun:trigger', (which) => {
    if (window.PenguinFun) window.PenguinFun.handleChatText(which);
  });

  // ---------------------------------------------------------------------
  // Sheets (rules + host controls) and tabs
  // ---------------------------------------------------------------------
  const sheetBackdrop = $('sheetBackdrop');
  const sheets = [$('rulesSheet'), $('sheet'), $('leaderboardSheet')];
  function closeSheets() {
    sheets.forEach((s) => s.classList.remove('open'));
    sheetBackdrop.classList.remove('open');
  }
  function openSheet(el) {
    closeSheets();
    el.classList.add('open');
    sheetBackdrop.classList.add('open');
  }
  $('settingsBtn').addEventListener('click', () => openSheet($('sheet')));
  $('rulesBtn').addEventListener('click', () => openSheet($('rulesSheet')));
  $('leaderboardBtn').addEventListener('click', () => openSheet($('leaderboardSheet')));
  sheetBackdrop.addEventListener('click', closeSheets);
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector('.tab-content[data-tab="' + btn.dataset.tab + '"]').classList.add('active');
    });
  });

  // The worked example from the rules (secret SHAKE, guess THICK)
  (function buildRules() {
    const guess = 'THICK';
    const secret = 'SHAKE';
    const syms = ['cloud', 'clover', 'cloud', 'heart', 'cloud'];
    $('rulesDemo').innerHTML =
      `<div class="grid mode-side">` +
      `<div class="grow"><div class="lets">${guess.split('').map((ch) => `<div class="tile filled">${ch}</div>`).join('')}</div>` +
      `<div class="syms">${syms.map((sy) => `<div class="sym">${symbolSvg(sy)}</div>`).join('')}</div></div>` +
      `<div class="grow"><div class="cap">the secret word, hidden in the real game</div>` +
      `<div class="syms">${secret.split('').map((ch) => `<div class="sl">${ch}</div>`).join('')}</div></div>` +
      `</div>`;
    $('rulesKey').innerHTML = ['Right spot: that letter is in your guess, in the same position', 'Wrong spot: that letter is in your guess, but somewhere else', 'Not in your guess: that letter (or a spare copy of it) isn\'t in your guess']
      .map((t) => `<div><span class="q">?</span><span>${t}</span></div>`).join('');
  })();

  // ---------------------------------------------------------------------
  // Host actions (no auth needed)
  // ---------------------------------------------------------------------
  $('connectBtn').addEventListener('click', () => {
    const username = $('tiktokUsername').value;
    autoConnectTried = true; // a manual attempt means don't also fire the automatic one
    if (window.PlatformSession && username.trim()) window.PlatformSession.setUsername(username);
    socket.emit('host:connectTikTok', { username, signApiKey: $('signApiKey').value });
  });
  $('disconnectBtn').addEventListener('click', () => socket.emit('host:disconnectTikTok'));
  $('startGameBtn').addEventListener('click', () => socket.emit('host:startGame'));
  $('stopGameBtn').addEventListener('click', () => socket.emit('host:stopGame'));
  $('revealAnswerBtn').addEventListener('click', () => socket.emit('host:revealAnswer'));
  $('skipRoundBtn').addEventListener('click', () => socket.emit('host:skipRound'));

  $('sendHostMsgBtn').addEventListener('click', () => {
    const text = $('hostMsgText').value;
    if (!text.trim()) return;
    socket.emit('host:sendMessage', { name: $('hostMsgName').value, text });
    $('hostMsgText').value = '';
  });
  $('hostMsgText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('sendHostMsgBtn').click();
  });

  $('addWordBtn').addEventListener('click', () => {
    socket.emit('host:addWord', { answer: $('newAnswer').value }, (res) => {
      const err = $('addWordError');
      if (res && res.ok) {
        err.style.color = 'var(--mint)';
        err.textContent = 'Added! It can now come up as a secret word.';
        $('newAnswer').value = '';
      } else {
        err.style.color = 'var(--danger)';
        err.textContent = (res && res.error) || 'Something went wrong.';
      }
    });
  });

  // ---- Word length (fixed, or a random range) ----
  const lenSelects = { fixed: $('lenFixed'), min: $('lenMin'), max: $('lenMax') };
  for (let n = 4; n <= 20; n++) Object.values(lenSelects).forEach((sel) => sel.add(new Option(n + ' letters', n)));
  let lenConfig = { mode: 'fixed', fixed: 5, min: 4, max: 8 };
  let lenCounts = {};

  function paintLengthControls() {
    document.querySelectorAll('#lenMode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === lenConfig.mode));
    $('lenFixedBox').hidden = lenConfig.mode !== 'fixed';
    $('lenRangeBox').hidden = lenConfig.mode !== 'random';
    lenSelects.fixed.value = lenConfig.fixed;
    lenSelects.min.value = lenConfig.min;
    lenSelects.max.value = lenConfig.max;
    // Word counts are shown in the Fixed dropdown only (the range dropdowns are narrower).
    [...lenSelects.fixed.options].forEach((o) => { o.textContent = o.value + ' letters' + (lenCounts[o.value] ? ' · ' + lenCounts[o.value] + ' words' : ''); });
    const words = (n) => (lenCounts[n] ? ` (${lenCounts[n]} words in the bank)` : '');
    $('lenSummary').textContent = lenConfig.mode === 'fixed'
      ? `Every round: a ${lenConfig.fixed}-letter word${words(lenConfig.fixed)}.`
      : lenConfig.min === lenConfig.max
        ? `Every round: a ${lenConfig.min}-letter word${words(lenConfig.min)}.`
        : `Each round picks a random length from ${lenConfig.min} to ${lenConfig.max} letters.`;
  }
  let lenSig = '';
  function syncLengthControls(cfg, counts) {
    // Game state arrives with every guess; only repaint when the setting really changed so an open dropdown isn't disturbed.
    const sig = JSON.stringify([cfg, counts]);
    if (sig === lenSig) return;
    lenSig = sig;
    if (counts) lenCounts = counts;
    if (cfg) lenConfig = { mode: cfg.mode, fixed: cfg.fixed, min: cfg.min, max: cfg.max };
    paintLengthControls();
  }
  function sendLength(patch) {
    lenConfig = { ...lenConfig, ...patch };
    if (lenConfig.min > lenConfig.max) {           // keep the range the right way round
      if ('min' in patch) lenConfig.max = lenConfig.min; else lenConfig.min = lenConfig.max;
    }
    paintLengthControls();
    socket.emit('host:setLength', lenConfig);
  }
  document.querySelectorAll('#lenMode button').forEach((b) => b.addEventListener('click', () => sendLength({ mode: b.dataset.mode })));
  lenSelects.fixed.addEventListener('change', () => sendLength({ fixed: Number(lenSelects.fixed.value) }));
  lenSelects.min.addEventListener('change', () => sendLength({ min: Number(lenSelects.min.value) }));
  lenSelects.max.addEventListener('change', () => sendLength({ max: Number(lenSelects.max.value) }));
  paintLengthControls();

  $('testModeToggle').addEventListener('change', (e) => socket.emit('host:testMode', e.target.checked));

  $('resetLeaderboardBtn').addEventListener('click', () => {
    if (confirm('Reset the TWISTLE leaderboard? This clears everyone\'s points.')) {
      socket.emit('host:resetLeaderboard');
    }
  });
})();
