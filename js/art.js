'use strict';

const Art = (() => {
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  function painter(ctx, ox, oy, dim) {
    return (x, y, w, h, col) => {
      ctx.fillStyle = dim ? mixCss(col, dim) : col;
      ctx.fillRect(ox + x, oy + y, w, h);
    };
  }
  function mixCss(col, dim) {
    if (col[0] === '#') return mix(col, '#1b2026', dim);
    const m = col.match(/\d+/g).map(Number);
    return `rgb(${m.slice(0, 3).map((v) => Math.round(v + (27 - v) * dim)).join(',')})`;
  }

  const FACE = {
    round: { l: 14, r: 33, t: 12, b: 35, cut: 3 },
    oval: { l: 15, r: 32, t: 11, b: 36, cut: 3 },
    long: { l: 16, r: 31, t: 10, b: 37, cut: 2 },
    square: { l: 14, r: 33, t: 12, b: 36, cut: 1 }
  };

  function faceRows(F) {
    const rows = [];
    for (let y = F.t; y <= F.b; y++) {
      let inset = 0;
      const dt = y - F.t, db = F.b - y;
      if (dt < F.cut) inset = F.cut - dt;
      if (db < F.cut + 1) inset = Math.max(inset, F.cut + 1 - db);
      if (db < 2 && F.cut > 1) inset += 1;
      rows.push([y, F.l + inset, F.r - inset]);
    }
    return rows;
  }

  function drawClothes(p, L, F) {
    const base = L.clothes === 'regime' ? (L.clothesColor || '#2a2c30') : L.clothes === 'leather' ? '#3a2a22' : L.clothes === 'priest' ? '#1c1c1f' : L.clothes === 'fisher' ? (L.clothesColor || '#4a6a7a') : L.clothes === 'overalls' ? '#2f4f7a' : (L.clothesColor || '#3f4a5a');
    const dark = shade(base, -0.35), light = shade(base, 0.18);
    for (let y = 42; y < 56; y++) {
      const spread = y < 46 ? 10 - (y - 42) * 1.5 : 4 - Math.min(3, (y - 46) * 0.4);
      const l = Math.round(Math.max(1, spread)), r = 47 - l;
      p(l, y, r - l + 1, 1, base);
      p(l, y, 2, 1, dark);
      p(r - 1, y, 2, 1, dark);
    }
    p(12, 43, 2, 2, light); p(34, 43, 2, 2, light);
    const skin = SKIN_TONES[L.skin];
    switch (L.clothes) {
      case 'suit': {
        p(20, 42, 8, 3, '#e8e4da'); p(21, 45, 6, 2, '#e8e4da'); p(22, 47, 4, 1, '#e8e4da');
        p(23, 43, 2, 9, '#7a2a2a'); p(23, 43, 2, 1, '#9a3a3a');
        for (let i = 0; i < 6; i++) { p(19 - Math.floor(i / 2), 43 + i, 1, 1, dark); p(28 + Math.floor(i / 2), 43 + i, 1, 1, dark); }
        p(24, 52, 1, 1, dark); p(24, 54, 1, 1, dark);
        break;
      }
      case 'shirt': case 'blouse': {
        p(19, 42, 3, 2, light); p(26, 42, 3, 2, light);
        p(23, 44, 1, 12, dark);
        [46, 49, 52].forEach((y) => p(24, y, 1, 1, '#e8e4da'));
        p(21, 42, 6, 1, skin);
        break;
      }
      case 'sweater': {
        p(19, 42, 10, 2, dark);
        for (let y = 45; y < 56; y += 2) for (let x = 6; x < 42; x += 3) p(x, y, 1, 1, dark);
        break;
      }
      case 'fisher': {
        p(18, 41, 12, 3, light); p(18, 43, 12, 1, dark);
        for (let x = 8; x < 40; x += 5) for (let y = 45; y < 56; y += 2) { p(x, y, 1, 1, light); p(x + 1, y + 1, 1, 1, dark); }
        break;
      }
      case 'leather': {
        p(17, 42, 4, 4, '#4d3a2e'); p(27, 42, 4, 4, '#4d3a2e');
        p(23, 44, 1, 12, '#9a8a7a');
        p(10, 47, 2, 1, '#5d4a3e'); p(36, 47, 2, 1, '#5d4a3e'); p(15, 50, 1, 5, '#2a1e18');
        p(21, 42, 6, 2, '#d8d0c0');
        break;
      }
      case 'tshirt': {
        p(20, 42, 8, 2, skin); p(20, 44, 8, 1, dark);
        break;
      }
      case 'coat': {
        p(15, 40, 5, 6, light); p(28, 40, 5, 6, light);
        p(20, 42, 8, 3, skin === SKIN_TONES[0] ? '#e8e4da' : '#e8e4da');
        p(23, 45, 2, 11, dark); [47, 51, 55].forEach((y) => { p(20, y, 1, 1, '#c9b48a'); p(27, y, 1, 1, '#c9b48a'); });
        break;
      }
      case 'tracksuit': {
        p(23, 43, 1, 13, '#d8d8d0');
        for (let y = 44; y < 56; y++) { p(8 - Math.min(3, Math.floor((y - 44) / 3)), y, 1, 1, '#e8e4da'); p(39 + Math.min(3, Math.floor((y - 44) / 3)), y, 1, 1, '#e8e4da'); }
        p(20, 42, 8, 1, '#e8e4da');
        break;
      }
      case 'floral': {
        const fl = ['#e8b84a', '#d86a5a', '#e8e4da'];
        for (let y = 44; y < 56; y += 3) for (let x = 6 + (y % 2) * 2; x < 42; x += 4) p(x, y, 1, 1, fl[(x + y) % 3]);
        p(20, 42, 3, 3, light); p(25, 42, 3, 3, light); p(22, 42, 4, 2, skin);
        break;
      }
      case 'dress': {
        p(19, 42, 10, 3, skin); p(20, 45, 8, 1, skin); p(18, 42, 1, 4, dark); p(29, 42, 1, 4, dark);
        break;
      }
      case 'priest': {
        p(22, 42, 4, 2, '#f0eee8');
        break;
      }
      case 'overalls': {
        p(18, 42, 12, 4, '#8a3a32');
        p(16, 42, 3, 14, '#284468'); p(29, 42, 3, 14, '#284468');
        p(17, 47, 1, 1, '#d8c86a'); p(30, 47, 1, 1, '#d8c86a');
        break;
      }
      case 'uniform': case 'military': {
        p(20, 42, 8, 2, shade(base, 0.3)); p(22, 44, 4, 3, '#e8e4da'); p(23, 44, 2, 8, '#2a2a2a');
        p(6, 44, 6, 2, '#c9a24a'); p(36, 44, 6, 2, '#c9a24a');
        p(18, 44, 2, 2, '#a8322d'); p(28, 44, 2, 2, '#a8322d');
        [48, 51, 54].forEach((y) => { p(20, y, 1, 1, '#c9a24a'); p(27, y, 1, 1, '#c9a24a'); });
        if (L.clothes === 'military') { p(12, 49, 4, 3, '#a8322d'); p(12, 49, 4, 1, '#c9a24a'); }
        break;
      }
      case 'regime': {
        const silver = '#b9bec6', cyan = '#1fa3b4', strap = '#141416';
        p(17, 39, 14, 5, shade(base, -0.2)); p(17, 39, 14, 1, shade(base, 0.15));
        p(18, 41, 2, 2, silver); p(28, 41, 2, 2, silver);
        p(4, 44, 8, 2, silver); p(36, 44, 8, 2, silver); p(4, 46, 8, 1, shade(silver, -0.3)); p(36, 46, 8, 1, shade(silver, -0.3));
        for (let i = 0; i < 12; i++) p(33 - i * 2, 45 + i, 2, 1, strap);
        [47, 50, 53].forEach((y) => { p(21, y, 1, 1, silver); p(26, y, 1, 1, silver); });
        p(1, 49, 7, 4, cyan); p(3, 50, 3, 2, '#0e5a64'); p(4, 50, 1, 1, '#e8f8fa'); p(1, 49, 7, 1, shade(cyan, 0.3));
        p(29, 46, 4, 4, cyan); p(30, 47, 2, 2, '#0e5a64'); p(30, 47, 1, 1, '#e8f8fa');
        break;
      }
      default: break;
    }
  }

  function drawHairBack(p, L, F, hc) {
    const dk = shade(hc, -0.3);
    if (['long', 'perm', 'ponytail'].includes(L.hair)) {
      const ext = L.hair === 'perm' ? 4 : 2;
      p(F.l - ext, F.t + 2, 3 + ext - 1, F.b - F.t + (L.hair === 'long' ? 10 : 2), hc);
      p(F.r - 1, F.t + 2, 3 + ext - 1, F.b - F.t + (L.hair === 'long' ? 10 : 2), hc);
      p(F.l - ext, F.b, 2, 8, dk);
    }
    if (L.hair === 'bob') {
      p(F.l - 2, F.t + 2, 4, F.b - F.t - 4, hc); p(F.r - 1, F.t + 2, 4, F.b - F.t - 4, hc);
    }
    if (L.hair === 'scarf') {
      const sc = L.clothesColor ? shade(L.clothesColor, 0.25) : '#7a5a6a';
      p(F.l - 3, F.t - 3, F.r - F.l + 7, F.b - F.t + 4, sc);
    }
  }

  function drawHairFront(p, L, F, hc) {
    const dk = shade(hc, -0.3), lt = shade(hc, 0.25);
    const w = F.r - F.l + 1;
    switch (L.hair) {
      case 'short': case 'parted': case 'slick':
        p(F.l - 1, F.t - 2, w + 2, 4, hc); p(F.l - 1, F.t + 2, 2, 7, hc); p(F.r, F.t + 2, 2, 7, hc);
        p(F.l + 1, F.t - 3, w - 2, 1, hc);
        if (L.hair === 'parted') p(F.l + 6, F.t - 2, 1, 3, dk);
        if (L.hair === 'slick') { p(F.l + 3, F.t - 2, 6, 1, lt); p(F.l + 4, F.t - 1, 4, 1, lt); }
        break;
      case 'curly': case 'perm': {
        const ext = L.hair === 'perm' ? 3 : 1;
        p(F.l - ext - 1, F.t - 4, w + 2 * ext + 2, 6, hc); p(F.l - ext - 1, F.t + 2, 3, 9, hc); p(F.r + ext - 1, F.t + 2, 3, 9, hc);
        for (let x = F.l - ext - 1; x < F.r + ext + 2; x += 2) { p(x, F.t - 5, 1, 1, hc); p(x, F.t - 2 + ((x / 2) % 2), 1, 1, dk); }
        for (let y = F.t; y < F.t + 10; y += 2) { p(F.l - ext, y, 1, 1, lt); p(F.r + ext, y, 1, 1, lt); }
        break;
      }
      case 'balding':
        p(F.l - 1, F.t + 3, 3, 8, hc); p(F.r - 1, F.t + 3, 3, 8, hc);
        p(F.l + 6, F.t - 1, 3, 1, hc);
        break;
      case 'bald':
        break;
      case 'long': case 'bob': case 'ponytail':
        p(F.l - 1, F.t - 2, w + 2, 4, hc); p(F.l + 1, F.t - 3, w - 2, 1, hc);
        p(F.l - 1, F.t + 2, 2, 4, hc); p(F.r, F.t + 2, 2, 4, hc);
        p(F.l + 2, F.t + 1, 5, 2, hc); p(F.l + 4, F.t - 2, 6, 1, lt);
        if (L.hair === 'ponytail') { p(F.r + 1, F.t + 3, 3, 3, hc); p(F.r + 2, F.t + 6, 3, 10, hc); }
        break;
      case 'bun':
        p(F.l - 1, F.t - 2, w + 2, 4, hc); p(F.l + 1, F.t - 3, w - 2, 1, hc);
        p(F.l - 1, F.t + 2, 2, 5, hc); p(F.r, F.t + 2, 2, 5, hc);
        p(22, F.t - 8, 6, 5, hc); p(23, F.t - 9, 4, 1, hc); p(23, F.t - 7, 2, 1, lt);
        break;
      case 'scarf': {
        const sc = L.clothesColor ? shade(L.clothesColor, 0.25) : '#7a5a6a';
        const sd = L.clothesColor ? shade(L.clothesColor, -0.1) : '#5a3a4a';
        p(F.l - 2, F.t - 4, w + 4, 6, sc); p(F.l - 3, F.t + 2, 4, F.b - F.t - 1, sc); p(F.r, F.t + 2, 4, F.b - F.t - 1, sc);
        for (let x = F.l; x < F.r; x += 3) p(x, F.t - 3, 1, 1, sd);
        p(21, F.b + 1, 6, 3, sd);
        break;
      }
      default: break;
    }
  }

  function drawHat(p, L, F) {
    const hc = '#2c2a28';
    switch (L.hat) {
      case 'cap':
        p(F.l - 1, F.t - 5, F.r - F.l + 3, 5, '#2d4f6b'); p(F.l - 3, F.t - 1, F.r - F.l + 5, 2, '#24405a'); p(23, F.t - 4, 3, 2, '#e8e4da');
        break;
      case 'flatcap':
        p(F.l - 2, F.t - 4, F.r - F.l + 5, 4, '#5a5048'); p(F.l - 3, F.t - 1, F.r - F.l + 6, 2, '#4a4038');
        for (let x = F.l; x < F.r; x += 2) p(x, F.t - 3, 1, 1, '#6a6058');
        break;
      case 'fedora':
        p(F.l, F.t - 7, F.r - F.l + 1, 6, hc); p(F.l - 4, F.t - 1, F.r - F.l + 9, 2, hc); p(F.l, F.t - 3, F.r - F.l + 1, 1, '#7a2a2a');
        break;
      case 'peaked':
        p(F.l - 2, F.t - 7, F.r - F.l + 5, 6, '#3d4a3a'); p(F.l - 1, F.t - 1, F.r - F.l + 3, 1, '#1e1e1e'); p(F.l - 2, F.t, F.r - F.l + 5, 2, '#141414');
        p(22, F.t - 5, 4, 3, '#c9a24a'); p(23, F.t - 4, 2, 1, '#a8322d');
        break;
      case 'regimecap':
        p(F.l - 2, F.t - 7, F.r - F.l + 5, 6, '#24262a'); p(F.l - 2, F.t - 7, F.r - F.l + 5, 1, '#3a3d42');
        p(F.l - 1, F.t - 2, F.r - F.l + 3, 1, '#b9bec6'); p(F.l - 2, F.t - 1, F.r - F.l + 5, 2, '#0c0c0e');
        p(22, F.t - 6, 4, 4, '#1fa3b4'); p(23, F.t - 5, 2, 2, '#0e5a64'); p(23, F.t - 5, 1, 1, '#e8f8fa');
        break;
      case 'sunhat':
        p(F.l - 6, F.t - 1, F.r - F.l + 13, 2, '#d8c48a'); p(F.l, F.t - 6, F.r - F.l + 1, 5, '#d8c48a'); p(F.l, F.t - 2, F.r - F.l + 1, 1, '#a8322d');
        break;
      default: break;
    }
  }

  function drawFace(p, L, F, t) {
    const skin = SKIN_TONES[L.skin];
    const sd = shade(skin, -0.16), sd2 = shade(skin, -0.32), hl = shade(skin, 0.12);
    const hc = HAIR_COLORS[L.hairColor] || '#2a2420';
    const rows = faceRows(F);
    rows.forEach(([y, l, r]) => { p(l, y, r - l + 1, 1, skin); p(r - 1, y, 2, 1, sd); });
    p(F.l + 2, F.t + 3, 2, 6, hl);
    const ey = F.t + Math.round((F.b - F.t) * 0.42);
    p(F.l - 2, ey - 1, 2, 5, sd); p(F.r + 1, ey - 1, 2, 5, sd);
    if (L.earrings) { p(F.l - 2, ey + 5, 1, 2, '#d8b84a'); p(F.r + 2, ey + 5, 1, 2, '#d8b84a'); }
    const lx = 19, rx = 27;
    const blink = t && (Math.floor(t / 180) % 23 === 0);
    const iris = EYE_COLORS[L.eyes] || '#3a2a1a';
    if (blink) {
      p(lx, ey + 1, 3, 1, sd2); p(rx, ey + 1, 3, 1, sd2);
    } else {
      p(lx, ey, 3, 2, '#f2efe6'); p(rx, ey, 3, 2, '#f2efe6');
      p(lx + 1, ey, 2, 2, iris); p(rx, ey, 2, 2, iris);
      p(lx + 1, ey, 1, 1, '#0f0f10'); p(rx + 1, ey, 1, 1, '#0f0f10');
    }
    const bc = L.hair === 'bald' ? sd2 : shade(hc, -0.1);
    const e = L.expression;
    if (e === 'angry') { p(lx, ey - 3, 2, 1, bc); p(lx + 2, ey - 2, 1, 1, bc); p(rx + 1, ey - 3, 2, 1, bc); p(rx, ey - 2, 1, 1, bc); }
    else if (e === 'sad' || e === 'nervous') { p(lx, ey - 2, 2, 1, bc); p(lx + 2, ey - 3, 1, 1, bc); p(rx + 1, ey - 2, 2, 1, bc); p(rx, ey - 3, 1, 1, bc); }
    else { p(lx, ey - 2, 3, 1, bc); p(rx, ey - 2, 3, 1, bc); }
    if (e === 'tired') { p(lx, ey + 2, 3, 1, sd); p(rx, ey + 2, 3, 1, sd); }
    p(24, ey + 1, 1, 4, sd); p(23, ey + 5, 3, 1, sd2);
    if (L.age > 52) {
      p(F.l + 1, ey + 1, 1, 1, sd); p(F.r - 1, ey + 1, 1, 1, sd); p(21, F.t + 3, 6, 1, sd);
      p(20, ey + 6, 1, 3, sd); p(28, ey + 6, 1, 3, sd);
    }
    const my = ey + 8;
    const lip = shade(skin, -0.42);
    switch (e) {
      case 'smile': p(21, my - 1, 1, 1, lip); p(22, my, 5, 1, lip); p(27, my - 1, 1, 1, lip); p(23, my + 1, 3, 1, sd); break;
      case 'angry': p(21, my + 1, 1, 1, lip); p(22, my, 5, 1, lip); p(27, my + 1, 1, 1, lip); break;
      case 'sad': p(22, my + 1, 1, 1, lip); p(23, my, 3, 1, lip); p(26, my + 1, 1, 1, lip); break;
      case 'nervous': p(21, my, 2, 1, lip); p(23, my + 1, 2, 1, lip); p(25, my, 2, 1, lip); break;
      case 'tired': p(22, my, 4, 1, lip); break;
      default: p(22, my, 5, 1, lip);
    }
    if (L.mole) p(F.r - 4, my - 2, 1, 1, '#4a3020');
    if (L.scar) { for (let i = 0; i < 6; i++) p(F.l + 2 + i, ey + 2 + i, 1, 1, '#d89a8a'); }
    const fhc = L.hairColor === 'white' || L.hairColor === 'grey' ? HAIR_COLORS[L.hairColor] : shade(hc, 0.05);
    switch (L.facial) {
      case 'mustache': p(20, my - 2, 9, 2, fhc); p(19, my - 1, 1, 2, fhc); p(29, my - 1, 1, 2, fhc); break;
      case 'beard':
        rows.filter(([y]) => y >= my - 3).forEach(([y, l, r]) => p(l, y, r - l + 1, 1, fhc));
        p(F.l, ey + 3, 2, my - ey - 3, fhc); p(F.r - 1, ey + 3, 2, my - ey - 3, fhc);
        p(22, my, 5, 1, lip); p(21, F.b + 1, 7, 2, fhc);
        break;
      case 'stubble':
        rows.filter(([y]) => y >= my - 2).forEach(([y, l, r]) => { for (let x = l + ((y) % 2); x <= r; x += 2) p(x, y, 1, 1, sd2); });
        p(22, my, 5, 1, lip);
        break;
      case 'goatee': p(22, my + 2, 5, 3, fhc); p(20, my - 2, 9, 1, fhc); break;
      default: break;
    }
    if (L.glasses === 'round' || L.glasses === 'square') {
      const gc = '#2a2622';
      const box = (x) => { p(x - 1, ey - 1, 5, 1, gc); p(x - 1, ey + 2, 5, 1, gc); p(x - 1, ey - 1, 1, 4, gc); p(x + 3, ey - 1, 1, 4, gc); };
      box(lx); box(rx); p(23, ey, 2, 1, gc); p(F.l - 1, ey, 1, 1, gc); p(F.r + 1, ey, 1, 1, gc);
      if (L.glasses === 'round') { p(lx - 1, ey - 1, 1, 1, skin); p(lx + 3, ey + 2, 1, 1, skin); p(rx - 1, ey - 1, 1, 1, skin); p(rx + 3, ey + 2, 1, 1, skin); }
    } else if (L.glasses === 'sun') {
      p(lx - 1, ey - 1, 5, 4, '#141414'); p(rx - 1, ey - 1, 5, 4, '#141414'); p(23, ey, 2, 1, '#141414');
      p(lx, ey, 1, 1, '#4a4a5a'); p(rx, ey, 1, 1, '#4a4a5a');
    }
    if (e === 'nervous' && t !== undefined && Math.floor(t / 900) % 3 !== 0) { p(F.r - 2, F.t + 4, 1, 2, '#bfe0f0'); p(F.r - 2, F.t + 6, 1, 1, '#8fc0e0'); }
  }

  function bust(ctx, ox, oy, L, opts) {
    if (!L) return;
    const o = opts || {};
    const p = painter(ctx, ox, oy, o.dim || 0);
    const F = FACE[L.faceShape] || FACE.oval;
    const hc = HAIR_COLORS[L.hairColor] || '#2a2420';
    drawHairBack(p, L, F, hc);
    drawClothes(p, L, F);
    const skin = SKIN_TONES[L.skin];
    p(20, F.b - 2, 8, 44 - F.b + 2, shade(skin, -0.12));
    p(20, F.b, 8, 2, shade(skin, -0.25));
    drawFace(p, L, F, o.t);
    drawHairFront(p, L, F, hc);
    drawHat(p, L, F);
  }

  function kid(ctx, ox, oy, k, look, dim) {
    const p = painter(ctx, ox, oy, dim || 0);
    const skin = SKIN_TONES[look.skin];
    const hc = HAIR_COLORS[look.hairColor === 'grey' || look.hairColor === 'white' ? 'brown' : look.hairColor] || '#3b2a1e';
    const shirt = ['#c9563a', '#3a7aa8', '#d8b84a', '#5a8a4a'][(k.name.length + k.age) % 4];
    for (let y = 22; y < 32; y++) { const l = y < 25 ? 5 : 2; p(l, y, 26 - 2 * l, 1, shirt); }
    p(11, 19, 6, 4, shade(skin, -0.12));
    for (let y = 6; y < 21; y++) { const inset = y < 8 ? 2 : y > 18 ? 1 : 0; p(7 + inset, y, 14 - 2 * inset, 1, skin); }
    p(10, 12, 2, 2, '#2a1e18'); p(16, 12, 2, 2, '#2a1e18');
    p(12, 17, 4, 1, shade(skin, -0.4));
    p(6, 3, 16, 5, hc); p(6, 8, 2, 4, hc); p(20, 8, 2, 4, hc);
    if (k.sex === 'F') { p(4, 8, 3, 9, hc); p(21, 8, 3, 9, hc); p(4, 8, 2, 2, '#d86a5a'); }
  }

  function windowView(ctx, x0, y0, w, h, weather, t) {
    const P = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, ww, hh); };
    const pal = { clear: ['#8fb7cf', '#e4d8bc'], fog: ['#c9cdcf', '#e6e3dc'], storm: ['#4a535c', '#6d7378'], dusk: ['#3a3456', '#e09a6a'] }[weather] || ['#8fb7cf', '#e4d8bc'];
    for (let y = 0; y < h; y++) { ctx.fillStyle = mix(pal[0], pal[1], y / h); ctx.fillRect(x0, y0 + y, w, 1); }
    const dim = weather === 'storm' ? 0.35 : weather === 'dusk' ? 0.45 : weather === 'fog' ? -0.2 : 0;
    const C = (c) => (dim > 0 ? mix(c, '#20242c', dim) : dim < 0 ? mix(c, '#d8dadb', -dim * 2.5) : c);
    P(0, h - 10, w, 10, C('#8a8f86'));
    P(0, h - 13, Math.round(w * 0.4), 3, C('#7d8a74'));
    const bx = 2;
    P(bx, h - 18, w - 4, 1, C('#5a5f66'));
    for (let k = 0; k < 3; k++) { const tx = bx + 6 + k * 15; P(tx, h - 26, 2, 16, C('#5a5f66')); for (let i = 0; i < 7; i++) P(tx - 6 + i, h - 25 + i, 1, 1, C('#7a7f86')); for (let i = 0; i < 7; i++) P(tx + 2 + i, h - 19 - i + 6, 1, 1, C('#7a7f86')); }
    const towers = [[w - 30, 18], [w - 24, 12], [w - 19, 24], [w - 13, 15], [w - 8, 20]];
    towers.forEach(([x, th], i) => { P(x, h - 10 - th, 5, th, C(['#b9b2a4', '#a9a497', '#c3bba9', '#9f9a8f', '#b4ad9c'][i])); for (let wy = h - 8 - th; wy < h - 12; wy += 3) P(x + 1, wy, 1, 1, weather === 'dusk' ? '#f0c070' : C('#d8d4c8')); });
    const px = w - 22; P(px, h - 10 - 30, 1, 2, C('#a9a497')); for (let i = 0; i < 28; i++) { const half = Math.floor(i / 7); P(px - half, h - 38 + i, 1 + half * 2, 1, C('#c8c0b0')); }
    if (weather === 'fog' || weather === 'clear') {
      ctx.fillStyle = weather === 'fog' ? 'rgba(236,236,232,0.75)' : 'rgba(250,246,236,0.5)';
      const fx = (Math.floor(t / 260) % (w + 40)) - 40;
      for (let b = 0; b < (weather === 'fog' ? 4 : 1); b++) ctx.fillRect(x0 + ((fx + b * 23) % (w + 40)) - 10, y0 + h - 14 - b * 6, 34, 3);
      if (weather === 'fog') { ctx.fillStyle = 'rgba(230,230,226,0.45)'; ctx.fillRect(x0, y0 + h - 22, w, 8); }
    }
    if (weather === 'storm') {
      ctx.fillStyle = 'rgba(210,222,230,0.55)';
      for (let i = 0; i < 26; i++) { const rx = (i * 37 + Math.floor(t / 18) * 2) % w; const ry = (i * 23 + Math.floor(t / 18) * 5) % h; ctx.fillRect(x0 + rx, y0 + ry, 1, 3); }
    }
    const bbx = w - 34, bby = h - 40;
    P(bbx, bby, 12, 7, C('#1fa3b4')); P(bbx + 4, bby + 2, 4, 3, C('#0e5a64')); P(bbx + 5, bby + 3, 2, 1, C('#e8f8fa')); P(bbx + 5, bby + 7, 1, 4, C('#4a4f55'));
    for (let dr = 0; dr < 3; dr++) {
      const dx = (Math.floor(t / (110 + dr * 40)) + dr * 21) % (w + 10) - 5;
      const dy = 4 + dr * 5 + Math.round(Math.sin(t / 700 + dr * 2) * 1.5);
      ctx.fillStyle = '#1c1d20'; ctx.fillRect(x0 + dx, y0 + dy, 4, 2); ctx.fillRect(x0 + dx - 3, y0 + dy - 1, 3, 1); ctx.fillRect(x0 + dx + 4, y0 + dy - 1, 3, 1); ctx.fillRect(x0 + dx - 1, y0 + dy - 1, 1, 1); ctx.fillRect(x0 + dx + 4, y0 + dy, 1, 1);
      if (Math.floor(t / 300 + dr) % 2) { ctx.fillStyle = '#e04040'; ctx.fillRect(x0 + dx + 1, y0 + dy + 1, 1, 1); }
    }
    for (let g = 0; g < 2 && weather !== 'storm'; g++) {
      const gx = (Math.floor(t / (70 + g * 30)) + g * 30) % (w + 10) - 5;
      const gy = 6 + g * 6 + Math.round(Math.sin(t / 500 + g) * 1.5);
      const flap = Math.floor(t / 220 + g) % 2;
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(x0 + gx, y0 + gy + flap, 2, 1); ctx.fillRect(x0 + gx + 2, y0 + gy + 1, 1, 1); ctx.fillRect(x0 + gx + 3, y0 + gy + flap, 2, 1);
    }
  }

  function chuck(ctx, x, y, mood, t) {
    const P = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    P(0, 0, 28, 22, '#d9cfbd'); P(0, 0, 28, 1, '#ece4d4'); P(27, 0, 1, 22, '#a89e8c'); P(0, 21, 28, 1, '#a89e8c');
    P(2, 2, 24, 16, '#1d2a26');
    const glow = '#6fe3ef';
    const blink = Math.floor(t / 160) % 31 === 0;
    const m = mood || 'happy';
    if (blink) { P(7, 8, 4, 1, glow); P(17, 8, 4, 1, glow); }
    else if (m === 'alert') { P(7, 6, 4, 4, glow); P(17, 6, 4, 4, glow); P(8, 7, 2, 2, '#1d2a26'); P(18, 7, 2, 2, '#1d2a26'); }
    else if (m === 'smug') { P(7, 8, 4, 1, glow); P(17, 7, 4, 1, glow); }
    else { P(7, 7, 1, 1, glow); P(8, 6, 2, 1, glow); P(10, 7, 1, 1, glow); P(17, 7, 1, 1, glow); P(18, 6, 2, 1, glow); P(20, 7, 1, 1, glow); }
    if (m === 'alert') P(12, 13, 4, 2, glow);
    else { P(9, 12, 1, 1, glow); P(10, 13, 8, 1, glow); P(18, 12, 1, 1, glow); }
    if ((Math.floor(t / 400) % 2) === 0) P(23, 15, 1, 1, '#c23e52');
    P(12, 19, 4, 2, '#1fa3b4'); P(13, 19, 2, 1, '#e8f8fa');
    P(10, 22, 8, 2, '#b8ae9c'); P(6, 24, 16, 2, '#a89e8c');
  }

  function scene(canvas, opts) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.imageSmoothingEnabled = false;
    const t = opts.t || 0;
    const weather = opts.weather || 'clear';
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    P(0, 0, W, 62, '#e7dccb');
    for (let x = 0; x < W; x += 8) P(x, 0, 1, 62, '#dfd3c0');
    P(0, 0, W, 3, '#cfc3ae');
    const flick = weather === 'storm' && Math.floor(t / 90) % 41 === 0;
    P(30, 3, 30, 2, flick ? '#9a9a90' : '#fbf7ea'); P(70, 3, 30, 2, '#fbf7ea');
    P(6, 8, 52, 36, '#4a443c');
    windowView(ctx, 8, 10, 48, 32, weather, t);
    P(31, 10, 2, 32, '#4a443c'); P(8, 25, 48, 1, '#5a544a');
    P(6, 44, 52, 2, '#8a7f70');
    P(86, 10, 34, 52, '#a7b0b5'); P(86, 10, 34, 1, '#c8d0d4'); P(119, 10, 1, 52, '#7f878c');
    for (let y = 14; y < 60; y += 6) P(88, y, 30, 1, '#98a1a6');
    P(112, 30, 3, 8, '#5f676c');
    P(92, 14, 14, 7, '#1fa3b4'); P(93, 15, 12, 1, '#e8f8fa'); P(93, 17, 8, 1, '#e8f8fa'); P(93, 19, 10, 1, '#e8f8fa');
    ctx.fillStyle = 'rgba(235,245,250,0.6)';
    for (let i = 0; i < 9; i++) ctx.fillRect(87 + ((i * 13) % 31), 58 - (i % 3) * 2, 2, 1);
    P(64, 12, 16, 20, '#f3eadb'); P(64, 12, 16, 2, '#1fa3b4'); P(68, 16, 8, 7, '#1fa3b4'); P(70, 18, 4, 3, '#0e5a64'); P(71, 19, 2, 1, '#e8f8fa'); P(66, 25, 12, 1, '#2b2b2b'); P(67, 27, 10, 1, '#8a7f70');
    P(0, 62, W, H - 62, '#7d8790');
    for (let x = 0; x < W; x += 4) for (let y = 64; y < H; y += 4) P(x + ((y / 4) % 2) * 2, y, 1, 1, '#737d86');
    P(70, 50, 8, 12, '#6b5a44'); P(68, 40, 12, 11, '#5d8a4a'); P(71, 38, 6, 3, '#6fa05a'); P(73, 36, 2, 3, '#6fa05a');
    const people = opts.people || [];
    const bob = Math.floor(t / 700) % 2;
    people.forEach((pp) => bust(ctx, pp.x, H - 70 + (pp.main ? bob : 0) + (pp.dy || 0), pp.look, { t, dim: pp.dim }));
    const cy = H - 14;
    P(0, cy, W, 14, '#8a6a4a'); P(0, cy, W, 2, '#a8865e'); P(0, cy + 2, W, 1, '#5e4630');
    P(8, cy + 4, 16, 8, '#f6efe2'); P(10, cy + 6, 12, 1, '#c9bba0'); P(10, cy + 8, 9, 1, '#c9bba0'); P(11, cy + 3, 16, 8, '#efe6d6'); P(13, cy + 5, 11, 1, '#c9bba0');
    P(34, cy + 5, 7, 5, '#c23e52'); P(35, cy + 3, 5, 2, '#3a2a22'); P(36, cy + 1, 3, 2, '#5a4a3a');
    chuck(ctx, W - 32, cy - 22, opts.chuckMood, t);
    P(W - 34, cy + 6, 12, 3, '#3a3a3a'); P(W - 33, cy + 6, 10, 1, '#5a5a5a');
  }

  function chuckPortrait(canvas, mood, t) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#e7dccb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    chuck(ctx, Math.round((canvas.width - 28) / 2), Math.round((canvas.height - 26) / 2), mood || 'happy', t || 1);
  }

  function photo(canvas, look, bg, opts) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg || '#c9c2ae';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bust(ctx, Math.round((canvas.width - 48) / 2), canvas.height - 56, Object.assign({}, look, { hat: opts && opts.keepHat ? look.hat : 'none' }), {});
  }

  function steak(ctx, cx, cy, s, t) {
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(w * s), Math.ceil(h * s)); };
    const rows = [[-9, 9], [-13, 13], [-15, 15], [-16, 16], [-17, 16], [-17, 17], [-17, 17], [-16, 17], [-16, 16], [-15, 16], [-14, 15], [-12, 14], [-10, 12], [-7, 9]];
    rows.forEach(([a, b], i) => { P(a - 1, i - 7, b - a + 2, 1, '#6e1f2c'); });
    rows.forEach(([a, b], i) => { P(a, i - 7, b - a, 1, '#c23e52'); P(a, i - 7, 2, 1, '#e06a78'); });
    P(-17, -7, 34, 1, '#6e1f2c');
    [[-11, -3, 9], [-4, 1, 12], [3, -4, 7], [-8, 4, 6], [6, 3, 6]].forEach(([x, y, w]) => { P(x, y, w, 1, '#f5e3dc'); P(x + 1, y + 1, Math.max(1, w - 3), 1, '#f0d4cc'); });
    P(9, -5, 5, 9, '#f3ead9'); P(9, -5, 5, 1, '#fffaf0'); P(10, 4, 3, 1, '#d8ccb6');
    P(-9, -2, 6, 3, '#140c0c'); P(1, -2, 6, 3, '#140c0c'); P(-3, -2, 4, 1, '#140c0c'); P(-8, -2, 2, 1, '#5a5a6a'); P(2, -2, 2, 1, '#5a5a6a');
    const smile = Math.floor(t / 1200) % 5 === 0;
    P(-4, 3, 6, 1, '#140c0c'); if (smile) { P(-5, 2, 1, 1, '#140c0c'); P(2, 2, 1, 1, '#140c0c'); }
    for (let i = 0; i < 14; i++) { P(-6 + Math.round(i * 0.4), -8 - i, 1, 1, '#1fa3b4'); P(5 - Math.round(i * 0.4), -8 - i, 1, 1, '#1fa3b4'); }
    P(-5, 8, 10, 7, '#fbf7ea'); P(-5, 8, 10, 2, '#c23e52'); P(-3, 11, 6, 1, '#8a7f70'); P(-3, 13, 4, 1, '#8a7f70'); P(-1, 6, 2, 2, '#1fa3b4');
  }

  function title(canvas, t) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#f3eadb'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e9ddc8';
    for (let x = 0; x < W; x += 12) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 12) ctx.fillRect(0, y, W, 1);
    windowView(ctx, Math.round(W * 0.52), 10, Math.round(W * 0.42), 60, 'fog', t);
    ctx.fillStyle = '#4a443c';
    ctx.fillRect(Math.round(W * 0.52) - 2, 8, Math.round(W * 0.42) + 4, 2); ctx.fillRect(Math.round(W * 0.52) - 2, 70, Math.round(W * 0.42) + 4, 3);
    ctx.fillRect(Math.round(W * 0.52) - 2, 8, 2, 64); ctx.fillRect(Math.round(W * 0.94), 8, 2, 64);
    ctx.fillStyle = '#8a6a4a'; ctx.fillRect(0, H - 22, W, 22); ctx.fillStyle = '#a8865e'; ctx.fillRect(0, H - 22, W, 2);
    const bob = Math.round(Math.sin(t / 600) * 1.5);
    const drx = Math.round(W * 0.73) + Math.round(Math.sin(t / 1800) * 18);
    ctx.fillStyle = 'rgba(111,227,239,0.16)';
    for (let i = 0; i < 40; i++) { const sp = Math.floor(i / 3); ctx.fillRect(drx - sp, 30 + i, 2 + sp * 2, 1); }
    ctx.fillStyle = '#1c1d20'; ctx.fillRect(drx - 6, 26, 14, 3); ctx.fillRect(drx - 9, 24, 4, 1); ctx.fillRect(drx + 7, 24, 4, 1); ctx.fillRect(drx, 29, 2, 2);
    if (Math.floor(t / 400) % 2) { ctx.fillStyle = '#e04040'; ctx.fillRect(drx + 1, 25, 1, 1); }
    steak(ctx, Math.round(W * 0.73), H - 52 + bob, 1.6, t);
    chuck(ctx, Math.round(W * 0.88) - 6, H - 46, Math.floor(t / 3000) % 3 === 0 ? 'smug' : 'happy', t);
    ctx.fillStyle = '#c9bba0'; ctx.fillRect(Math.round(W * 0.58), H - 18, 20, 3); ctx.fillStyle = '#c23e52'; ctx.fillRect(Math.round(W * 0.6), H - 20, 6, 2);
  }

  return { scene, photo, bust, title, chuckPortrait, steak, shade, mix };
})();

