// shapedle-symbols.js
// SHAPEDLE's symbol artwork. The server only sends a SLOT number (0-25) per letter position; this
// file turns a slot into a picture for whichever pack the host picked, so the look can be changed
// at any moment (even mid-round) without touching the round itself.
//
// Packs (every pack has 26 symbols, so a word with any number of distinct letters always works):
//   cute     - hand-drawn kawaii shapes with little faces (13 shapes x 2 colors)
//   plush    - TWISTLE's 12 plush toys (+ cute shapes for the rest)
//   classic  - flat colored shapes like the original SHAPE-O game
//   animals / sweets / nature - emoji packs
//
// Usage: ShapedleSymbols.html(packId, slot)  -> markup for one symbol (fills its box)
//        ShapedleSymbols.PACKS               -> [{ id, name, hint }] for the host's picker
(function (global) {
  'use strict';

  const fx = (n) => Math.round(n * 100) / 100;

  // ---- shapes (64 x 64 box) -------------------------------------------------------------
  function starPts(cx, cy, ro, ri) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? ro : ri;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([fx(cx + r * Math.cos(a)), fx(cy + r * Math.sin(a))]);
    }
    return pts;
  }
  function hexPts(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      pts.push([fx(cx + r * Math.cos(a)), fx(cy + r * Math.sin(a))]);
    }
    return pts;
  }
  const poly = (pts) => pts.map((p) => p.join(',')).join(' ');

  // Each shape: kind 'poly' (rounded polygon), 'path' (smooth path) or 'multi' (union of circles).
  // face = [x, y] where the little face sits (null = no face).
  const SHAPES = [
    { id: 'circle',   kind: 'multi', circles: [[32, 33, 22]], face: [32, 35] },
    { id: 'square',   kind: 'path',  d: 'M20 11H44Q53 11 53 20V44Q53 53 44 53H20Q11 53 11 44V20Q11 11 20 11Z', face: [32, 34] },
    { id: 'star',     kind: 'poly',  pts: starPts(32, 34, 25, 12), face: [32, 37] },
    { id: 'heart',    kind: 'path',  d: 'M32 54C10 38 6 27 6 20C6 12 12 8 19 8C25 8 30 12 32 17C34 12 39 8 45 8C52 8 58 12 58 20C58 27 54 38 32 54Z', face: [32, 28] },
    { id: 'triangle', kind: 'poly',  pts: [[32, 12], [54, 51], [10, 51]], face: [32, 40] },
    { id: 'diamond',  kind: 'poly',  pts: [[32, 7], [55, 32], [32, 57], [9, 32]], face: [32, 33] },
    { id: 'hexagon',  kind: 'poly',  pts: hexPts(32, 33, 23), face: [32, 34] },
    { id: 'drop',     kind: 'path',  d: 'M32 6C32 6 12 28 12 41C12 52 21 58 32 58C43 58 52 52 52 41C52 28 32 6 32 6Z', face: [32, 43] },
    { id: 'moon',     kind: 'path',  d: 'M41 8C25 10 12 22 12 36C12 50 24 58 38 56C46 55 52 51 56 46C42 48 32 40 32 30C32 22 35 14 41 8Z', face: [25, 38] },
    { id: 'cloud',    kind: 'multi', circles: [[20, 38, 12], [33, 28, 15], [46, 38, 11], [32, 41, 12]], face: [32, 38] },
    { id: 'flower',   kind: 'multi', circles: [[32, 16, 11], [48, 28, 11], [42, 47, 11], [22, 47, 11], [16, 28, 11], [32, 34, 13]], face: [32, 35] },
    { id: 'bolt',     kind: 'poly',  pts: [[37, 6], [14, 36], [28, 36], [24, 58], [50, 26], [35, 26]], face: [31, 38] },
    { id: 'house',    kind: 'poly',  pts: [[32, 8], [57, 30], [57, 55], [7, 55], [7, 30]], face: [32, 41] }
  ];

  // [fill, outline]
  const PALETTE = [
    ['#FF7EB6', '#B8336F'], // pink
    ['#6EC1FF', '#2A6DAA'], // sky
    ['#FFD54A', '#B8860B'], // sunny
    ['#5EDC9A', '#1F8A55'], // mint
    ['#B28DFF', '#6A3FC0'], // grape
    ['#FFA24D', '#B8560E'], // orange
    ['#FF6B6B', '#A82A2A'], // coral
    ['#3FD0D4', '#13808A'], // teal
    ['#B9E64F', '#6E8E12'], // lime
    ['#E4A0FF', '#9A38C4']  // orchid
  ];
  // flat, saturated colors in the spirit of the original game
  const FLAT = ['#87CEEB', '#7B3FA0', '#1F78C1', '#E31A1C', '#B2DF8A', '#FF8FB8', '#FFB347', '#2CA02C', '#E6C229', '#17BECF'];

  const INK = '#3a1d4d';

  function faceSvg(x, y, big) {
    const s = big ? 1 : 0.9;
    const gap = 7 * s;
    return (
      `<ellipse cx="${fx(x - gap)}" cy="${y}" rx="${fx(1.9 * s)}" ry="${fx(2.5 * s)}" fill="${INK}"/>` +
      `<ellipse cx="${fx(x + gap)}" cy="${y}" rx="${fx(1.9 * s)}" ry="${fx(2.5 * s)}" fill="${INK}"/>` +
      `<circle cx="${fx(x - gap - 1.2)}" cy="${fx(y - 1)}" r="0.7" fill="#fff"/><circle cx="${fx(x + gap - 1.2)}" cy="${fx(y - 1)}" r="0.7" fill="#fff"/>` +
      `<path d="M${fx(x - 3)} ${fx(y + 4.6)}Q${x} ${fx(y + 8)} ${fx(x + 3)} ${fx(y + 4.6)}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<ellipse cx="${fx(x - gap - 3.4)}" cy="${fx(y + 4.2)}" rx="3" ry="1.9" fill="#ff5a8a" opacity=".45"/>` +
      `<ellipse cx="${fx(x + gap + 3.4)}" cy="${fx(y + 4.2)}" rx="3" ry="1.9" fill="#ff5a8a" opacity=".45"/>`
    );
  }

  /** One shape as a full <svg>. style 'cute' = outline + shine + face, 'flat' = plain filled shape. */
  function shapeSvg(shape, fill, line, style) {
    const cute = style === 'cute';
    let body = '';
    if (shape.kind === 'poly') {
      const pts = poly(shape.pts);
      if (cute) {
        body =
          `<polygon points="${pts}" fill="${line}" stroke="${line}" stroke-width="11" stroke-linejoin="round"/>` +
          `<polygon points="${pts}" fill="${fill}" stroke="${fill}" stroke-width="6" stroke-linejoin="round"/>`;
      } else {
        body = `<polygon points="${pts}" fill="${fill}" stroke="${fill}" stroke-width="5" stroke-linejoin="round"/>`;
      }
    } else if (shape.kind === 'path') {
      body = cute
        ? `<path d="${shape.d}" fill="${fill}" stroke="${line}" stroke-width="3.6" stroke-linejoin="round"/>`
        : `<path d="${shape.d}" fill="${fill}"/>`;
    } else {
      if (cute) body += shape.circles.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r + 2.2}" fill="${line}"/>`).join('');
      body += shape.circles.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`).join('');
    }
    let extra = '';
    if (cute) {
      extra += `<ellipse cx="22" cy="19" rx="6" ry="3.2" fill="#fff" opacity=".5" transform="rotate(-28 22 19)"/>`;
      if (shape.face) extra += faceSvg(shape.face[0], shape.face[1], true);
    }
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${body}${extra}</svg>`;
  }

  // 26 distinct (shape, color) combinations: slot i and slot i+13 share a shape but never a color.
  function cuteSlot(i) {
    const shape = SHAPES[i % 13];
    const c = PALETTE[(i * 3 + Math.floor(i / 13) * 5) % PALETTE.length];
    return shapeSvg(shape, c[0], c[1], 'cute');
  }
  function classicSlot(i) {
    const shape = SHAPES[(i * 5) % 13];
    const fill = FLAT[(i * 7 + Math.floor(i / 13) * 3) % FLAT.length];
    return shapeSvg(shape, fill, null, 'flat');
  }

  // ---- plush (TWISTLE) -----------------------------------------------------------------
  let spriteReady = false;
  function plushSlot(i) {
    const T = global.TwistleSymbols;
    if (T && T.ids && i < T.ids.length) {
      if (!spriteReady) { try { T.buildSprite(); } catch (e) { /* already built */ } spriteReady = true; }
      return T.svg(T.ids[i]);
    }
    return cuteSlot(i); // the plush set has 12 toys; the rest of the slots borrow the cute shapes
  }

  // ---- emoji packs (26 each) -----------------------------------------------------------
  const EMOJI = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐤', '🦄', '🐝', '🦋', '🐌', '🐞', '🐢', '🐙', '🐳'],
    sweets: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥕', '🌽', '🍄', '🍞', '🧀', '🍔', '🍕', '🍩', '🍪', '🍰', '🍫', '🍬', '🍭', '🍦', '🧁'],
    nature: ['⭐', '🌙', '☀️', '🌈', '☁️', '❄️', '🔥', '💧', '🌸', '🌻', '🌷', '🍀', '🌵', '🌴', '🍁', '🌍', '🪐', '🚀', '🛸', '☄️', '🌊', '⚡', '🎈', '🎁', '🔔', '🎵']
  };
  const emojiSlot = (pack) => (i) => `<span class="symEmoji">${EMOJI[pack][i % 26]}</span>`;

  const PACKS = [
    { id: 'cute', name: 'Cute Faces', hint: 'Kawaii shapes with little faces', slot: cuteSlot },
    { id: 'plush', name: 'Plush Toys', hint: "TWISTLE's squishy toys", slot: plushSlot },
    { id: 'classic', name: 'Classic Shapes', hint: 'Flat shapes, like the original SHAPE-O', slot: classicSlot },
    { id: 'animals', name: 'Animals', hint: 'Cute animal friends', slot: emojiSlot('animals') },
    { id: 'sweets', name: 'Sweets & Fruit', hint: 'Yummy treats', slot: emojiSlot('sweets') },
    { id: 'nature', name: 'Sky & Garden', hint: 'Stars, flowers and rainbows', slot: emojiSlot('nature') }
  ];
  const BY_ID = {};
  PACKS.forEach((p) => { BY_ID[p.id] = p; });

  function html(packId, slot) {
    const pack = BY_ID[packId] || BY_ID.cute;
    const i = ((Number(slot) % 26) + 26) % 26;
    return pack.slot(i);
  }

  global.ShapedleSymbols = {
    PACKS: PACKS.map((p) => ({ id: p.id, name: p.name, hint: p.hint })),
    html
  };
})(window);
