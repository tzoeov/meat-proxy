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
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();
    drawWindow(ctx, x0, y0, w, h, weather, t);
    ctx.restore();
  }

  function drawWindow(ctx, x0, y0, w, h, weather, t) {
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

  const INK = '#140c0c';
  const STILL = 1000;
  const REDUCE = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const C = {
    ink: '#1f1614', paper: '#efe5d4', sheet: '#fffdf8', cream: '#f3eadb', wall: '#e7dccb', wallLn: '#dfd3c0',
    meat: '#c23e52', meatDk: '#8e2536', meatXd: '#6e1f2c', meatHi: '#e06a78', lab: '#1fa3b4', labDk: '#0e5a64', labHi: '#e8f8fa',
    scr: '#1d2a26', glow: '#6fe3ef', desk: '#7a5c3e', deskDk: '#5e4630', deskHi: '#a8865e', deskMd: '#8a6a4a', steel: '#6f7c86',
    frost: '#dbe8ec', coal: '#2a2c30', coal2: '#24262a', silver: '#b9bec6', fat: '#f3ead9', bone: '#fbf7ea', boneSh: '#d8ccb6',
    grey: '#8a7f70', tan: '#c9bba0', plant: '#5d8a4a', plantHi: '#6fa05a', pot: '#6b5a44', drone: '#1c1d20', red: '#e04040',
    lamp: '#f0c070', night: '#1b2026', good: '#2f7a4d', warn: '#a8701c', gold: '#c9a24a', glass: '#4a443c'
  };

  /* ---------- pixel kit: rects, lines, discs, stepped gradients, a 3×5 font ---------- */
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    '.': '000000000000010', '-': '000000111000000', ':': '000010000010000', '/': '001001010100100', "'": '010010000000000', '’': '010010000000000',
    '!': '010010010000010', '?': '110001010000010', '#': '101111101111101', '$': '011110010011110', '·': '000000010000000', ',': '000000000010100',
    '&': '010101010101011', ' ': '000000000000000'
  };
  const normText = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  function textW(s, sc) { const n = [...normText(s)].length; return n ? (n * 4 - 1) * (sc || 1) : 0; }
  function drawText(P, s, x, y, c, sc) {
    const k = sc || 1;
    let cx = x;
    for (const ch of normText(s)) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 5; r++) for (let i = 0; i < 3; i++) if (g[r * 3 + i] === '1') P(cx + i * k, y + r * k, k, k, c);
      cx += 4 * k;
    }
  }
  function hash(n) {
    let h = (n | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function kit(ctx) {
    ctx.imageSmoothingEnabled = false;
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const px = (x, y, c) => P(x, y, 1, 1, c);
    const line = (x0, y0, x1, y1, c) => {
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (let n = 0; n < 2000; n++) {
        px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    };
    const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); P(cx - w, cy + y, w * 2 + 1, 1, c); } };
    const ring = (cx, cy, r, c) => {
      for (let a = 0; a < 360; a += 2) { const rad = a * Math.PI / 180; px(cx + Math.round(Math.cos(rad) * r), cy + Math.round(Math.sin(rad) * r), c); }
    };
    const bands = (x, y, w, h, c0, c1, n) => {
      for (let i = 0; i < n; i++) {
        const y0 = y + Math.floor((h * i) / n), y1 = y + Math.floor((h * (i + 1)) / n);
        P(x, y0, w, y1 - y0, mix(c0, c1, n > 1 ? i / (n - 1) : 0));
      }
    };
    const dither = (x, y, w, h, c, phase) => { for (let j = 0; j < h; j++) for (let i = (j + (phase || 0)) & 1; i < w; i += 2) px(x + i, y + j, c); };
    const sparse = (x, y, w, h, c, seed, every) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (hash(seed + i * 131 + j * 977) < 1 / every) px(x + i, y + j, c); };
    const text = (s, x, y, c, sc) => drawText(P, s, x, y, c, sc || 1);
    return { ctx, P, px, line, disc, ring, bands, dither, sparse, text };
  }

  /* ---------- sizing and the one shared animation loop ---------- */
  function fit(canvas, h, s) {
    const box = canvas.parentElement;
    const cw = box && box.clientWidth ? box.clientWidth : canvas.width * s;
    const w = Math.max(48, Math.ceil(cw / s));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    canvas.style.width = `${w * s}px`;
    canvas.style.height = `${h * s}px`;
  }
  // A fixed-size picture at the largest integer scale (up to max) that fits its container's width.
  function fitFixed(canvas, w, h, max, maxH) {
    const box = canvas.parentElement;
    const cw = box && box.clientWidth ? box.clientWidth - 6 : w * max;
    const s = Math.max(1, Math.min(max, Math.floor(cw / w), maxH ? Math.floor(maxH / h) : max));
    canvas.style.width = `${w * s}px`;
    canvas.style.height = `${h * s}px`;
  }
  // Every live canvas repaints when it comes into view (so hidden panes get sized when shown); only visible, moving ones animate.
  const REG = new Map();
  let liveRaf = 0;
  let resizeTimer = 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : STILL);
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const e = REG.get(en.target);
      if (!e) return;
      e.active = en.isIntersecting;
      if (e.active) { e.paint(e.still ? STILL : now()); e.last = now(); kick(); }
    });
  }) : null;
  function forget(cv) { REG.delete(cv); if (io) io.unobserve(cv); }
  function kick() { if (!liveRaf && typeof requestAnimationFrame !== 'undefined') liveRaf = requestAnimationFrame(tick); }
  function tick(ts) {
    liveRaf = 0;
    let moving = false;
    REG.forEach((e, cv) => {
      if (!cv.isConnected) { forget(cv); return; }
      if (!e.active || e.still) return;
      moving = true;
      if (ts - e.last >= e.every) { e.last = ts; e.paint(ts); }
    });
    if (moving) kick();
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => REG.forEach((e, cv) => { if (!cv.isConnected) forget(cv); else if (e.active) e.paint(e.still ? STILL : now()); }), 120);
    });
  }
  // Paints now, then repaints only what moves, at a low frame rate, while the canvas is in view. Reduced motion: still frames only.
  // opts: { h, s } fills the container's width at scale s; { fixed: [w, h], max } keeps the size and picks the scale.
  function live(canvas, draw, opts) {
    REG.forEach((e, cv) => { if (!cv.isConnected) forget(cv); });
    const o = opts || {};
    const paint = (t) => {
      if (o.h) fit(canvas, o.h, o.s || 1);
      else if (o.fixed) fitFixed(canvas, o.fixed[0], o.fixed[1], o.max || 3, o.maxH);
      draw(t);
    };
    const still = REDUCE.matches || !!o.still;
    paint(still ? STILL : now());
    const prev = REG.get(canvas);
    REG.set(canvas, { paint, still, every: o.every || 110, last: now(), active: io ? !!(prev && prev.active) : true });
    if (io) io.observe(canvas);
    kick();
  }

  /* ---------- the mascot: a T-bone in sunglasses ---------- */
  const STEAK = (() => {
    const W = 40, H = 27;
    const inE = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    const inside = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const X = x + 0.5, Y = y + 0.5;
      if (inE(X, Y, 26.5, 28.5, 4.5, 4.2)) return false;
      return inE(X, Y, 15, 14, 15, 12.6) || inE(X, Y, 30.5, 12.5, 9.2, 8.6) || inE(X, Y, 24, 6, 7, 5.5);
    };
    const depth = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        let d = 0;
        if (inside(x, y)) { d = 1; while (d < 6 && [[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, d], [-d, d], [d, -d]].every(([a, b]) => inside(x + a, y + b))) d += 1; }
        row.push(d);
      }
      depth.push(row);
    }
    return { W, H, depth };
  })();
  const isBone = (x, y) => (y >= 1 && y <= 3 && x >= 18 && x <= 30) || (x >= 23 && x <= 25 && y >= 3 && y <= 21);
  function steakBody(P, plain) {
    const { W, H, depth } = STEAK;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : depth[y][x]);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = depth[y][x];
        if (!d) continue;
        let c = C.meat;
        const fatZone = x <= 19 && (y <= 13 || x <= 5) && !(x > 14 && y > 9);
        if (d === 1) c = C.meatXd;
        else if (fatZone && d === 2) c = C.fat;
        else if (fatZone && d === 3) c = '#e6d6bd';
        else if (!at(x, y + 2) || !at(x + 2, y)) c = C.meatDk;
        else if (d === 2 && y < 12) c = C.meatHi;
        P(x, y, 1, 1, c);
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isBone(x, y) || depth[y][x] < 1) continue;
        if (depth[y][x] === 1 && y > 3) continue;
        P(x, y, 1, 1, x === 25 || (y === 3 && x > 25) ? C.boneSh : C.bone);
      }
    }
    for (let y = 4; y <= 21; y++) { if (depth[y][22] > 1) P(22, y, 1, 1, C.meatDk); if (depth[y][26] > 1) P(26, y, 1, 1, C.meatDk); }
    const marb = plain ? [[6, 19, 4], [12, 22, 4], [29, 8, 4], [31, 16, 4], [28, 20, 3], [15, 6, 3], [8, 14, 3]] : [[5, 20, 4], [12, 22, 4], [29, 8, 4], [31, 16, 4], [28, 20, 3]];
    marb.forEach(([x, y, w]) => { P(x, y, w, 1, '#f0d4cc'); P(x + 1, y - 1, Math.max(1, w - 2), 1, '#e9a3ad'); });
  }
  function steakShades(P, y) {
    P(3, y, 2, 1, INK); P(19, y, 2, 1, INK);
    P(5, y, 6, 3, INK); P(13, y, 6, 3, INK); P(11, y, 2, 1, INK);
    P(6, y, 2, 1, '#5a5a6a'); P(14, y, 2, 1, '#5a5a6a');
  }
  function steakEye(P, x, y, look) { P(x, y - 1, 3, 1, INK); P(x, y, 3, 2, '#ffffff'); P(x + look, y, 1, 2, INK); }
  function steakId(P) {
    P(9, 21, 1, 2, C.labDk); P(10, 23, 1, 2, C.labDk); P(11, 25, 1, 2, C.labDk);
    P(19, 21, 1, 2, C.labDk); P(18, 23, 1, 2, C.labDk); P(17, 25, 1, 2, C.labDk);
    P(13, 27, 3, 2, C.lab);
    P(10, 28, 9, 7, C.bone); P(10, 28, 9, 2, C.meat); P(10, 34, 9, 1, C.boneSh);
    P(12, 31, 5, 1, C.grey); P(12, 33, 3, 1, C.grey);
  }
  // Draws the mascot with its top-left at (0,0) of the painter: 40×35 with the ID card.
  function steakSprite(P, mood, t) {
    steakBody(P);
    switch (mood) {
      case 'peek':
        steakEye(P, 6, 8, 2); steakEye(P, 14, 8, 2);
        P(6, 6, 3, 1, C.meatXd); P(14, 6, 3, 1, C.meatXd);
        steakShades(P, 11);
        P(10, 17, 4, 1, INK);
        break;
      case 'off':
        steakShades(P, 3);
        steakEye(P, 6, 9, 1); steakEye(P, 14, 9, 1);
        P(9, 16, 6, 1, INK); P(8, 15, 1, 1, INK); P(15, 15, 1, 1, INK);
        break;
      case 'sweat':
        steakShades(P, 9);
        P(2, 4, 1, 1, '#bfe8f4'); P(1, 5, 3, 2, '#7cc4e4'); P(2, 7, 1, 1, '#7cc4e4'); P(1, 5, 1, 1, '#ffffff');
        P(9, 16, 2, 1, INK); P(11, 17, 2, 1, INK); P(13, 16, 2, 1, INK);
        break;
      default: {
        steakShades(P, 9);
        const smirk = t !== undefined && Math.floor(t / 1400) % 6 === 0;
        P(9, 16, 6, 1, INK);
        if (smirk) P(15, 15, 1, 1, INK);
      }
    }
    steakId(P);
  }
  function scaledPainter(ctx, ox, oy, s) {
    return (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x * s, oy + y * s, w * s, h * s); };
  }
  function offsetPainter(P, ox, oy) { return (x, y, w, h, c) => P(ox + x, oy + y, w, h, c); }

  // The mascot at integer scale s, centred on (cx, cy) of the sprite body.
  function steak(ctx, cx, cy, s, t, mood) {
    const k = Math.max(1, Math.round(s));
    steakSprite(scaledPainter(ctx, Math.round(cx - 20 * k), Math.round(cy - 14 * k), k), mood || 'shades', t);
  }

  // The mascot as a badge for a 96×80 canvas. Moods: shades, peek, off, sweat.
  function steakBadge(canvas, mood) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = Math.max(1, Math.floor(Math.min(canvas.width / 48, canvas.height / 40)));
    const ox = Math.round((canvas.width - 40 * s) / 2), oy = Math.round((canvas.height - 35 * s) / 2);
    steakSprite(scaledPainter(ctx, ox, oy, s), mood || 'shades', STILL);
  }

  // A 13×8 die-cut sticker of the mascot.
  function steakSticker(P, x, y) {
    const rows = ['..wwwwwwwww..', '.wwoooooooww.', 'wwoffffbmmoww', 'wofSSSSSbmmow', 'wofmmmmmbmmow', 'wwommmmmmmoww', '.wwoooooooww.', '..wwwwwwwww..'];
    const col = { w: '#fffdf8', o: C.meatXd, f: C.fat, m: C.meat, S: INK, b: C.bone };
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (col[ch]) P(x + i, y + j, 1, 1, col[ch]); }));
  }

  /* ---------- small shared props ---------- */
  const EYE = ['...ooooo...', '.oo.hcc.oo.', 'o..ccdcc..o', '.oo.ccc.oo.', '...ooooo...'];
  function eyeMark(P, x, y, ink) {
    const col = { o: ink || C.ink, c: C.lab, d: C.labDk, h: C.labHi };
    EYE.forEach((r, j) => [...r].forEach((ch, i) => { if (col[ch]) P(x + i, y + j, 1, 1, col[ch]); }));
  }
  function drone(k, x, y, t, i, body) {
    const { P } = k;
    const c = body || C.drone;
    P(x, y, 5, 2, c); P(x - 3, y - 1, 3, 1, c); P(x + 5, y - 1, 3, 1, c); P(x + 2, y + 2, 1, 1, c);
    if (Math.floor(t / 380 + (i || 0) * 0.7) % 2) P(x + 2, y, 1, 1, C.red);
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const lit = (x, y, level) => BAYER[((y & 3) << 2) | (x & 3)] < level * 16;
  // A beam of light as ordered dither: dense at the source, thinning towards the floor and the edges.
  function cone(k, ax, ay, by, spread, c, strength) {
    const s0 = strength === undefined ? 0.5 : strength;
    for (let y = ay; y < by; y++) {
      const f = (y - ay) / Math.max(1, by - ay);
      const hw = Math.floor((y - ay) * spread);
      for (let x = ax - hw; x <= ax + hw; x++) {
        const e = hw ? Math.abs(x - ax) / (hw + 1) : 0;
        if (lit(x, y, s0 * (1 - f * 0.6) * (1 - e * e * 0.85))) k.px(x, y, c);
      }
    }
  }
  function pool(k, cx, cy, rx, ry, c, level) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d <= 1 && lit(cx + x, cy + y, level * (1 - d * 0.7))) k.px(cx + x, cy + y, c);
    }
  }
  function rain(k, x0, y0, W, H, t, c, n) {
    const step = Math.floor(t / 40);
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i * 37 + step * 2) % W), y = y0 + ((i * 23 + step * 5) % H);
      k.P(x, y, 1, 2, c); k.px(x - 1, y + 2, c);
    }
  }
  function figure(k, x, y, o) {
    const { P } = k;
    const body = o.body || C.coal;
    P(x + 1, y, 3, 3, o.skin || '#c89a78');
    if (o.cap) { P(x, y - 2, 5, 2, C.coal2); P(x, y - 1, 5, 1, C.lab); }
    else if (o.hair) P(x + 1, y - 1, 3, 1, o.hair);
    P(x, y + 3, 5, 6, body); P(x - 1, y + 4, 1, 4, body); P(x + 5, y + 4, 1, 4, body);
    if (o.band) P(x - 1, y + 5, 1, 1, C.lab);
    if (o.legs !== 0) { P(x + 1, y + 9, 1, 5, o.legCol || C.coal2); P(x + 3, y + 9, 1, 5, o.legCol || C.coal2); }
  }
  function headBack(k, x, y, hair, band) {
    k.P(x - 2, y + 4, 8, 4, C.coal); k.P(x, y, 4, 4, hair); k.P(x - 1, y + 1, 1, 2, hair); k.P(x + 4, y + 1, 1, 2, hair);
    if (band) { k.P(x - 1, y - 1, 6, 1, C.coal2); k.P(x - 1, y, 6, 1, C.lab); }
  }
  function miniChuck(k, x, y, face, dark) {
    const { P } = k;
    P(x, y, 9, 7, dark ? '#8f8778' : '#d9cfbd'); P(x + 1, y + 1, 7, 4, C.scr);
    if (face !== false) { P(x + 2, y + 2, 1, 1, C.glow); P(x + 6, y + 2, 1, 1, C.glow); P(x + 3, y + 4, 3, 1, C.glow); }
    P(x + 3, y + 7, 3, 2, dark ? '#6f6858' : '#a89e8c');
  }
  function plantPot(k, x, y) {
    const { P } = k;
    P(x + 2, y + 9, 7, 6, C.pot); P(x + 2, y + 9, 7, 1, '#7d6a52');
    P(x, y + 3, 11, 7, C.plant); P(x + 2, y, 7, 4, C.plant); P(x + 3, y - 2, 2, 3, C.plantHi); P(x + 7, y + 1, 2, 3, C.plantHi); P(x + 1, y + 4, 2, 2, C.plantHi);
  }
  // A drifting fog bank: ordered dither, thickest in the middle of the band.
  function fogDither(k, y, h, W, t, c, level) {
    const shift = Math.floor(t / 420);
    for (let j = 0; j < h; j++) {
      const m = 1 - Math.abs((2 * (j + 0.5)) / h - 1) ** 2;
      for (let x = 0; x < W; x++) {
        const wave = 0.75 + 0.25 * Math.sin((x + shift) / 9 + y);
        if (lit(x + shift, y + j, (level || 0.5) * m * wave)) k.px(x, y + j, c);
      }
    }
  }
  function weatherSky(weather) {
    return { clear: ['#8fb7cf', '#e4d8bc'], fog: ['#c9cdcf', '#e6e3dc'], storm: ['#4a535c', '#6d7378'], dusk: ['#a9bccb', '#e8eef0'], night: ['#1b2026', '#3a3456'] }[weather] || ['#8fb7cf', '#e4d8bc'];
  }
  // A small view through an office window: sky, a strip of skyline, weather.
  function miniView(k, x, y, w, h, weather, t, seed) {
    const { ctx, P } = k;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const night = weather === 'night';
    const sky = weatherSky(weather);
    k.bands(x, y, w, h, sky[0], sky[1], 4);
    const far = night ? '#2a2c30' : weather === 'fog' ? '#b4b6b2' : weather === 'storm' ? '#3d444b' : '#a9a497';
    for (let i = 0; i < w; i += 4) {
      const bh = 3 + Math.floor(hash(seed * 97 + i) * (h * 0.55));
      P(x + i, y + h - bh, 4, bh, far);
      if (night) for (let wy = y + h - bh + 1; wy < y + h - 1; wy += 2) if (hash(i * 13 + wy + seed) < 0.3) P(x + i + 1, wy, 1, 1, C.lamp);
    }
    if (weather === 'fog') { k.dither(x, y + h - 7, w, 4, '#e6e3dc', 0); P(x, y + h - 3, w, 3, '#d6d6d1'); }
    if (night || weather === 'storm') rain(k, x, y, w, h, t, night ? '#5a6672' : '#a7b3ba', Math.round(w / 3));
    const dx = x + ((Math.floor(t / 140) + seed * 17) % (w + 12)) - 6;
    drone(k, dx, y + 3 + (seed % 3), t, seed);
    ctx.restore();
  }

  /* ---------- the title screen ---------- */
  // Full-screen behind the menu, or (phone held upright, the canvas laid out in flow) a band whose box the CSS sizes.
  function fitTitle(canvas) {
    const box = canvas.parentElement;
    if (!box || !box.clientWidth || !box.clientHeight) return;
    const band = getComputedStyle(canvas).position === 'static';
    if (band) { canvas.style.width = ''; canvas.style.height = ''; }
    const cw = band ? canvas.clientWidth : box.clientWidth, ch = band ? canvas.clientHeight : box.clientHeight;
    if (!cw || !ch) return;
    const s = Math.max(3, Math.round(Math.min(cw / 240, ch / 135)));
    const w = band ? Math.floor(cw / s) : Math.ceil(cw / s), h = band ? Math.floor(ch / s) : Math.ceil(ch / s);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    if (band) return;
    canvas.style.width = `${w * s}px`;
    canvas.style.height = `${h * s}px`;
  }
  function title(canvas, t) {
    if (canvas.dataset && canvas.dataset.fit) fitTitle(canvas);
    const ctx = canvas.getContext('2d');
    const k = kit(ctx);
    const { P } = k;
    const W = canvas.width, H = canvas.height;
    const portrait = W < 170;
    P(0, 0, W, H, '#f3eadb');
    for (let x = W % 12; x < W; x += 12) P(x, 0, 1, H, '#e9ddc8');
    for (let y = H % 12; y < H; y += 12) P(0, y, W, 1, '#e9ddc8');
    const band = portrait && H < 110;
    const deskY = band ? H - 12 : H - 22;
    const ss = !portrait && H >= 110 ? 2 : 1;
    const ww = band ? W - 60 : portrait ? W - 24 : Math.min(150, Math.round(W * 0.44));
    const wx = band ? 8 : portrait ? 12 : W - ww - Math.round(W * 0.06);
    const sy = deskY - 25 * ss;
    const sill = band ? deskY - 7 : sy - 8;
    const wh = band ? sill - 7 : Math.max(30, Math.min(portrait ? 72 : 96, sill - 10));
    const wy = sill - wh;
    P(wx - 3, wy - 3, ww + 6, wh + 6, C.glass);
    windowView(ctx, wx, wy, ww, wh, 'fog', t);
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    const gy = wy + wh - 10;
    const walkX = wx + (Math.floor(t / 90) % (ww + 24)) - 12;
    const stride = Math.floor(t / 260) % 2;
    figure(k, walkX, gy - 13, { cap: true, band: true, legs: 0 });
    P(walkX + 1 + stride, gy - 4, 1, 4, C.coal2); P(walkX + 3 - stride, gy - 4, 1, 4, C.coal2);
    ctx.fillStyle = 'rgba(230,230,226,0.55)'; ctx.fillRect(wx, gy - 16, ww, 16);
    const drx = wx + Math.round(ww * 0.55) + Math.round(Math.sin(t / 1800) * (ww * 0.2));
    ctx.fillStyle = 'rgba(111,227,239,0.16)';
    for (let i = 0; i < wh - 18; i++) { const sp = Math.floor(i / 3); ctx.fillRect(drx - sp + 2, wy + 18 + i, 2 + sp * 2, 1); }
    P(drx - 4, wy + 15, 13, 3, C.drone); P(drx - 7, wy + 13, 4, 1, C.drone); P(drx + 9, wy + 13, 4, 1, C.drone); P(drx + 2, wy + 18, 2, 2, C.drone);
    if (Math.floor(t / 400) % 2) P(drx + 3, wy + 16, 1, 1, C.red);
    ctx.restore();
    P(wx + Math.floor(ww / 2) - 1, wy, 2, wh, C.glass);
    P(wx - 5, sill + 3, ww + 10, 3, '#8a7f70'); P(wx - 5, sill + 3, ww + 10, 1, '#a89e8c');
    P(0, deskY, W, 22, C.deskMd); P(0, deskY, W, 2, C.deskHi); P(0, deskY + 6, W, 1, C.desk);
    for (let x = 3; x < W; x += 17) P(x, deskY + 9 + (x % 3), 9, 1, C.desk);
    const sx = band ? W - 46 : portrait ? W - 48 : Math.max(4, wx + Math.round(ww * 0.42) - 20 * ss);
    P(sx + 5 * ss, sy + 27 * ss, 30 * ss, ss, C.deskDk);
    steakSprite(scaledPainter(ctx, sx, sy, ss), 'shades', t);
    const cx = portrait ? 6 : Math.min(W - 32, sx + 40 * ss + 4);
    if (!band && (!portrait || W > 120)) {
      P(cx - 2, deskY + 5, 32, 1, C.deskDk);
      chuck(ctx, cx, deskY - 20, Math.floor(t / 3000) % 3 === 0 ? 'smug' : 'happy', t);
    }
    const px0 = band ? 0 : portrait ? W - 70 : sx - 24;
    if (px0 > 4) {
      P(px0, deskY + 3, 18, 4, C.deskDk); P(px0, deskY + 1, 17, 3, C.sheet); P(px0 + 2, deskY + 2, 11, 1, C.tan);
      P(px0 + 4, deskY - 4, 6, 2, C.meat); P(px0 + 5, deskY - 7, 4, 3, '#3a2a22'); P(px0 + 6, deskY - 9, 2, 2, '#5a4a3a');
    }
  }

  /* ---------- story scene banners ---------- */
  function officeRoom(k, W, H, t, weather, eve) {
    const { P } = k;
    P(0, 0, W, H, eve ? '#5e544c' : C.wall);
    for (let x = 0; x < W; x += 8) P(x, 4, 1, 22, eve ? '#574e47' : C.wallLn);
    P(0, 0, W, 4, eve ? '#3f3833' : '#cfc3ae');
    for (let x = 8; x < W; x += 34) P(x, 1, 18, 2, eve ? (hash(x) < 0.3 ? '#f6e7c4' : '#6e655d') : C.bone);
    for (let x = 6, i = 0; x < W - 12; x += 58, i++) {
      P(x - 2, 6, 44, 20, eve ? '#2e2925' : C.glass);
      miniView(k, x, 8, 40, 16, eve ? 'night' : weather, t, i + 1);
      P(x + 19, 8, 2, 16, eve ? '#2e2925' : C.glass);
      P(x - 3, 26, 46, 2, eve ? '#4a423c' : '#8a7f70');
      const qx = x + 46;
      if (qx + 9 < W) {
        P(qx, 9, 9, 12, eve ? '#bdb2a0' : C.cream); P(qx, 9, 9, 2, C.lab);
        P(qx + 2, 13, 5, 3, C.lab); P(qx + 3, 14, 3, 1, C.labDk); P(qx + 4, 14, 1, 1, C.labHi);
        P(qx + 1, 18, 7, 1, eve ? '#5e544c' : C.ink);
      }
    }
    P(0, 30, W, H - 30, eve ? '#3d434a' : '#7d8790');
    k.sparse(0, 31, W, H - 31, eve ? '#363c42' : '#737d86', 7, 3);
    for (let x = 4, i = 0; x < W; x += 44, i++) {
      P(x, 23, 36, 8, eve ? '#56606a' : '#a7b0b5'); P(x, 23, 36, 1, eve ? '#6a747e' : '#c8d0d4'); P(x + 35, 23, 1, 8, eve ? '#47505a' : '#8f989d');
      P(x - 2, 31, 40, 2, eve ? C.deskDk : C.deskMd); P(x - 2, 33, 40, 1, eve ? '#3e2e20' : C.deskDk);
      P(x, 34, 1, 5, eve ? '#3e2e20' : C.deskDk); P(x + 35, 34, 1, 5, eve ? '#3e2e20' : C.deskDk);
      miniChuck(k, x + 22, 22, true, eve);
      if (eve) { P(x + 23, 23, 7, 4, '#24403c'); P(x + 24, 24, 1, 1, C.glow); P(x + 28, 24, 1, 1, C.glow); P(x + 25, 26, 3, 1, C.glow); }
      P(x + 6, 34, 9, 4, eve ? C.coal : '#3f4a5a'); P(x + 7, 33, 7, 1, eve ? C.coal2 : '#34404e'); P(x + 10, 38, 1, 3, C.coal2);
      if (eve && i % 3 !== 2) {
        P(x + 1, 31, 16, 2, '#8a6a44'); P(x + 3, 31, 12, 1, '#b08a52');
        P(x + 2, 30, 4, 1, C.ink); P(x + 3, 25, 1, 5, C.ink); P(x + 3, 24, 7, 2, C.ink); P(x + 5, 26, 4, 1, C.lamp);
        cone(k, x + 7, 27, 31, 1.2, '#c9a678', 0.35);
      }
    }
    P(0, H - 5, W, 5, C.deskMd); P(0, H - 5, W, 1, C.deskHi);
    P(14, H - 8, 16, 4, C.sheet); P(16, H - 7, 10, 1, C.tan); P(18, H - 9, 15, 4, '#efe6d6'); P(20, H - 8, 9, 1, C.tan);
    P(38, H - 7, 6, 3, C.meat); P(39, H - 9, 4, 2, '#3a2a22');
  }
  function placeTower(k, W, H, t) {
    const { P } = k;
    k.bands(0, 0, W, 34, '#d9d4c8', '#c9c2b4', 4);
    P(0, 0, W, 5, '#b8c8cf'); for (let x = 0; x < W; x += 10) P(x, 0, 1, 5, '#9fb3bc'); P(0, 5, W, 1, '#8a96a0');
    const cx = Math.floor(W / 2);
    for (let x = (cx % 48) - 24; x < W; x += 48) {
      if (Math.abs(x - cx) < 30) continue;
      P(x, 6, 6, 28, '#e3ddd0'); P(x + 5, 6, 1, 28, '#b9b2a4'); P(x - 1, 6, 8, 2, '#cfc6b4');
    }
    [-1, 1].forEach((sd) => {
      const bx = cx + sd * 40 - 6;
      P(bx, 6, 12, 22, C.lab); P(bx, 6, 12, 1, C.labHi); P(bx + 11, 6, 1, 22, C.labDk);
      for (let i = 0; i < 6; i++) { P(bx + i, 28 + Math.floor(i / 2), 1, 1, C.lab); P(bx + 11 - i, 28 + Math.floor(i / 2), 1, 1, C.lab); }
      eyeMark(P, bx + 1, 12, C.labHi);
    });
    P(cx - 16, 7, 32, 17, '#d9cfbd'); P(cx - 15, 8, 30, 14, C.scr);
    const blink = Math.floor(t / 160) % 31 === 0;
    if (blink) { P(cx - 8, 13, 4, 1, C.glow); P(cx + 4, 13, 4, 1, C.glow); }
    else { P(cx - 8, 12, 1, 1, C.glow); P(cx - 7, 11, 2, 1, C.glow); P(cx - 5, 12, 1, 1, C.glow); P(cx + 4, 12, 1, 1, C.glow); P(cx + 5, 11, 2, 1, C.glow); P(cx + 7, 12, 1, 1, C.glow); }
    P(cx - 6, 16, 1, 1, C.glow); P(cx - 5, 17, 10, 1, C.glow); P(cx + 5, 16, 1, 1, C.glow);
    k.text('HALCYON', cx - 13, 26, C.labDk);
    P(0, 34, W, H - 34, C.coal2);
    for (let x = 0; x < W; x += 2) if (hash(x * 3) < 0.5) P(x, 35 + (x % 3), 1, 1, '#33363c');
    [-1, 1].forEach((sd) => { const bx = cx + sd * 40 - 6; k.dither(bx, 36, 12, 6, C.labDk, 0); });
    P(cx - 15, 37, 30, 5, '#2e3a3c');
    P(cx - 22, 31, 44, 6, C.coal); P(cx - 22, 31, 44, 1, '#4a4f55'); P(cx - 22, 34, 44, 1, C.lab);
    for (let x = 6; x < W; x += 13) { if (Math.abs(x - cx) < 30) continue; P(x, 33, 2, 5, '#8a929c'); P(x, 32, 2, 1, Math.floor(t / 500 + x) % 4 ? C.lab : C.good); P(x + 2, 35, 7, 1, '#6f7c86'); }
    figure(k, cx - 34, 21, { cap: true, band: true });
    figure(k, cx + 30, 21, { cap: true, band: true, skin: '#a8765a' });
    plantPot(k, 4, 22); plantPot(k, W - 15, 22);
  }
  function placeHearing(k, W, H, t) {
    const { P } = k;
    P(0, 0, W, H, '#2b2420');
    for (let x = 0; x < W; x += 12) { P(x, 0, 1, 30, '#33291f'); P(x + 6, 4, 1, 22, '#241e1a'); }
    P(0, 3, W, 1, '#4a3a2c');
    const cx = Math.floor(W / 2);
    eyeMark(P, cx - 5, 4, C.silver);
    const bw = Math.min(W - 20, 150), bx = cx - Math.floor(bw / 2);
    const seats = Math.max(3, Math.min(5, Math.floor(bw / 28)));
    for (let i = 0; i < seats; i++) {
      const fx = bx + Math.round(((i + 0.5) * bw) / seats) - 2;
      figure(k, fx, 14, { cap: true, legs: 0, skin: ['#c89a78', '#a8765a', '#e0b896', '#8a5a40', '#d8a888'][i % 5] });
      P(fx + 6, 19, 1, 3, C.silver); P(fx + 5, 18, 2, 1, C.silver);
    }
    P(bx - 4, 22, bw + 8, 10, C.deskDk); P(bx - 4, 22, bw + 8, 2, C.desk);
    for (let x = bx; x < bx + bw; x += 10) P(x, 25, 1, 7, '#4a3828');
    for (let i = 0; i < seats; i++) { const fx = bx + Math.round(((i + 0.5) * bw) / seats) - 4; P(fx, 26, 9, 3, C.fat); P(fx + 1, 27, 7, 1, C.grey); }
    P(0, 32, W, H - 32, '#1f1a17');
    cone(k, cx, 0, H, 0.42, '#6b5a48', 0.35);
    for (let y = 38; y < H; y++) { const hw = 10 + (y - 38); P(cx - hw, y, hw * 2, 1, y % 2 ? '#4a3e34' : '#54463a'); }
    P(cx - 4, 33, 8, 1, '#7a5c3e'); P(cx - 4, 34, 1, 6, C.deskHi); P(cx + 3, 34, 1, 6, C.deskHi); P(cx - 4, 36, 8, 2, C.deskHi); P(cx - 3, 38, 1, 4, C.deskMd); P(cx + 2, 38, 1, 4, C.deskMd);
    P(cx - 5, 30, 10, 3, C.deskHi); P(cx - 5, 30, 10, 1, '#c9a678');
  }
  function bookshelf(k, x, y, w, h, seed) {
    const { P } = k;
    P(x, y, w, h, '#2a1e18'); P(x, y, 2, h, C.deskDk); P(x + w - 2, y, 2, h, C.deskDk);
    const spines = ['#6e1f2c', '#0e5a64', '#6b4a2b', '#3f6e3a', '#2f557f', '#c9bba0', '#9a6b22', '#5a3d7a', '#8e2536'];
    for (let sy = y + 1; sy < y + h - 2; sy += 10) {
      P(x, sy + 9, w, 1, C.deskDk);
      let bx = x + 2, n = 0;
      while (bx < x + w - 3) {
        const bw = 2 + Math.floor(hash(seed + bx * 7 + sy) * 2), bh = 5 + Math.floor(hash(seed + bx * 3 + sy * 5) * 4);
        if (hash(seed + bx + sy * 11) < 0.12) { bx += 3; continue; }
        const c = mix(spines[(seed + n * 5 + sy) % spines.length], '#2a1e18', 0.25);
        P(bx, sy + 9 - bh, bw, bh, c); P(bx, sy + 9 - bh + 1, bw, 1, mix(c, '#efe5d4', 0.3));
        bx += bw; n += 1;
      }
    }
  }
  function placeReaders(k, W, H, t) {
    const { P } = k;
    P(0, 0, W, H, '#3a2a22');
    for (let x = 0; x < W; x += 6) P(x, 0, 1, H, '#33251e');
    const cx = Math.floor(W / 2);
    for (let x = 0; x < W; x += 52) if (Math.abs(x + 20 - cx) > 34) bookshelf(k, x + 2, 2, 40, 34, x);
    P(cx - 11, 3, 23, 9, '#a8865e'); P(cx - 11, 3, 23, 1, '#c4a06a'); k.text('READ', cx - 7, 5, C.meatXd);
    P(cx, 0, 1, 14, C.ink); P(cx - 3, 14, 7, 2, C.ink); P(cx - 4, 16, 9, 1, C.gold);
    const flick = Math.floor(t / 90) % 37 === 0;
    P(cx - 1, 17, 3, 1, flick ? '#c9a24a' : C.lamp);
    cone(k, cx, 17, 31, 1.15, flick ? '#6b4a2b' : '#a8865e', 0.55);
    P(0, 36, W, H - 36, '#2a1e18'); for (let x = 0; x < W; x += 9) P(x, 36, 1, H - 36, '#241a14');
    P(cx - 30, 31, 60, 3, C.deskHi); P(cx - 30, 31, 60, 1, '#c4a06a'); P(cx - 30, 34, 60, 1, C.deskDk);
    P(cx - 27, 35, 2, 9, C.deskDk); P(cx + 25, 35, 2, 9, C.deskDk);
    for (let i = 0; i < 6; i++) { P(cx - 9 + (i % 2), 30 - i * 2, 16, 2, i % 2 ? C.paper : C.sheet); P(cx - 9 + (i % 2), 31 - i * 2, 16, 1, C.tan); }
    P(cx - 2, 19, 1, 12, C.meat); P(cx - 9, 25, 17, 1, C.meat);
    P(cx + 13, 27, 5, 4, C.sheet); P(cx + 18, 28, 1, 2, C.sheet); P(cx + 14, 28, 3, 1, C.meat);
    headBack(k, cx - 26, 22, '#2a1e18'); headBack(k, cx + 22, 22, '#4a3020');
    P(cx - 29, 26, 8, 6, '#3a3d42'); P(cx + 19, 26, 8, 6, '#4a2e2a');
  }
  function placeStreet(k, W, H, t, weather) {
    const { P } = k;
    k.bands(0, 0, W, 30, '#1b2026', '#3a3456', 4);
    const tx = Math.floor(W * 0.72);
    P(tx, 2, 7, 26, '#2a2c30'); P(tx + 6, 2, 1, 26, '#23252a'); P(tx + 2, 0, 3, 2, '#2a2c30');
    P(tx + 1, 4, 5, 1, C.lab); if (Math.floor(t / 600) % 2) P(tx + 3, 0, 1, 1, C.red);
    for (let wy = 7; wy < 26; wy += 3) P(tx + 2, wy, 3, 1, '#2f4a52');
    for (let x = 0, i = 0; x < W; x += 34, i++) {
      const bh = 12 + Math.floor(hash(i * 31) * 8), by = 34 - bh;
      const fac = i % 2 ? '#3e2a28' : '#33302e';
      P(x, by, 34, bh, fac);
      for (let s = 0; s < 34; s += 8) { for (let r = 0; r < 4; r++) P(x + s + r, by - r - 1, 1, r + 1, fac); P(x + s + 4, by - 4, 1, 4, '#262422'); }
      for (let wx = x + 3; wx < x + 31; wx += 5) for (let wy = by + 3; wy < 31; wy += 5) P(wx, wy, 3, 2, hash(wx * 17 + wy) < 0.28 ? C.lamp : '#252326');
      if (i % 3 === 1) { P(x + 6, by - 9, 16, 6, C.lab); P(x + 7, by - 8, 14, 4, C.labDk); eyeMark(P, x + 8, by - 8, C.labHi); P(x + 9, by - 3, 1, 3, C.coal); P(x + 19, by - 3, 1, 3, C.coal); }
    }
    P(0, 34, W, 2, '#4a4f55'); P(0, 36, W, H - 36, '#22252a');
    for (let x = 6; x < W; x += 16) P(x, 40, 7, 1, '#5a5f66');
    for (let x = 20; x < W; x += 64) {
      P(x, 18, 1, 16, '#4a4f55'); P(x - 2, 17, 5, 2, '#4a4f55'); P(x - 1, 19, 3, 1, C.lamp);
      pool(k, x, 20, 3, 2, '#8a7350', 0.7); pool(k, x, 35, 13, 2, '#8a7350', 0.7);
      for (let y = 37; y < H; y += 2) P(x - 1 + (y % 3), y, 2, 1, '#6b5a40');
    }
    const sx = Math.floor(W * 0.38);
    P(sx, 24, 1, 10, C.silver); P(sx - 3, 21, 7, 5, C.cream); k.text('22', sx - 3, 21, C.meatDk);
    for (let i = 0; i < 3; i++) {
      const dx = ((Math.floor(t / (90 + i * 30)) + i * 61) % (W + 30)) - 15;
      const dy = 5 + i * 4;
      cone(k, dx + 2, dy + 3, 36, 0.3, '#2f6670', 0.35);
      drone(k, dx, dy, t, i);
    }
    if (weather === 'storm') rain(k, 0, 0, W, H, t, '#5a6672', Math.round(W / 3));
  }
  function placeRooftop(k, W, H, t) {
    const { P } = k;
    k.bands(0, 0, W, 24, '#3a3456', '#e09a6a', 6);
    for (let x = 0; x < W; x++) { const hh = 3 + Math.round(2 * Math.sin(x / 19) + 1.5 * Math.sin(x / 7 + 1)); P(x, 22 - hh, 1, hh, '#5a4a66'); }
    P(0, 22, W, 10, '#3d4a5e');
    for (let i = 0; i < W / 3; i++) { const x = Math.floor(hash(i * 7) * W), y = 23 + Math.floor(hash(i * 13) * 8); P(x + (Math.floor(t / 500 + i) % 2), y, 3, 1, i % 4 ? '#5a6a80' : '#e09a6a'); }
    const bx = Math.floor(W * 0.55);
    P(bx, 22, Math.floor(W * 0.45), 1, '#2a2c30');
    [0.12, 0.32].forEach((f) => { const px0 = bx + Math.floor(W * f); P(px0, 12, 2, 10, '#2a2c30'); P(px0 - 1, 15, 4, 1, '#2a2c30'); });
    for (let x = bx; x < W; x++) { const rel = ((x - bx) % Math.floor(W * 0.2)) / Math.floor(W * 0.2); P(x, 13 + Math.round(8 * (rel - 0.5) ** 2 * 4 * 0.9), 1, 1, '#2a2c30'); }
    for (let i = 0; i < 4; i++) {
      const dx = ((Math.floor(t / (110 + i * 25)) + i * 47) % (W + 30)) - 15, dy = 4 + i * 4;
      drone(k, dx, dy, t, i);
      if (i === 1) { k.line(dx + 1, dy + 2, dx - 1, dy + 6, '#2a2c30'); k.line(dx + 4, dy + 2, dx + 6, dy + 6, '#2a2c30'); P(dx - 2, dy + 6, 10, 3, C.meatDk); P(dx - 2, dy + 5, 2, 2, C.meatDk); P(dx + 6, dy + 5, 2, 2, C.meatDk); }
      if (i === 3) { k.line(dx + 2, dy + 2, dx + 2, dy + 5, '#2a2c30'); P(dx, dy + 5, 5, 4, C.deskHi); P(dx, dy + 5, 5, 1, C.fat); }
    }
    P(6, 8, 14, 12, '#2a2c30'); P(5, 7, 16, 2, '#33302e'); P(10, 4, 6, 4, '#2a2c30');
    for (let i = 0; i < 4; i++) P(7 + i * 4, 20, 1, 12, '#2a2c30');
    k.line(7, 20, 19, 31, '#2a2c30'); k.line(19, 20, 7, 31, '#2a2c30');
    P(0, 32, W, H - 32, '#8a8f86'); P(0, 32, W, 2, '#a7aca3'); P(0, 34, W, 1, '#6f746c');
    for (let x = 0; x < W; x += 12) P(x, 35, 1, H - 35, '#7d8279');
    P(W - 30, 26, 4, 6, '#5a5f66'); P(W - 31, 25, 6, 1, '#6f746c'); P(W - 18, 28, 8, 4, '#6f746c');
  }
  function placeAuditorium(k, W, H, t) {
    const { P } = k;
    P(0, 0, W, H, '#16191e');
    const cx = Math.floor(W / 2);
    P(0, 26, W, 5, '#3a2a22'); P(0, 26, W, 1, '#5e4630');
    P(cx - 31, 2, 62, 22, '#2a2c30'); P(cx - 30, 3, 60, 20, C.scr);
    const blink = Math.floor(t / 160) % 29 === 0;
    const E = (x, y) => { if (blink) P(x, y + 2, 6, 2, C.glow); else { P(x, y + 2, 2, 2, C.glow); P(x + 2, y, 2, 2, C.glow); P(x + 4, y + 2, 2, 2, C.glow); } };
    E(cx - 14, 7); E(cx + 8, 7);
    P(cx - 10, 16, 2, 2, C.glow); P(cx - 8, 18, 16, 2, C.glow); P(cx + 8, 16, 2, 2, C.glow);
    [-1, 1].forEach((sd) => { for (let n = 0; n < 3; n++) { const bx = cx + sd * (44 + n * 30) - 5; if (bx < -10 || bx > W) continue; P(bx, 0, 10, 20, n ? C.labDk : C.lab); eyeMark(P, bx - 1, 7, n ? C.lab : C.labHi); } });
    cone(k, 6, 0, 26, 0.5, '#4a4436', 0.18); cone(k, W - 7, 0, 26, 0.5, '#4a4436', 0.18);
    P(cx - 44, 21, 7, 5, C.deskDk); P(cx - 44, 21, 7, 1, C.deskHi);
    figure(k, cx - 43, 13, { cap: true, legs: 0 }); P(cx - 41, 21, 2, 1, C.silver);
    for (let row = 0; row < 3; row++) {
      for (let x = (row % 2) * 4 - 2; x < W; x += 9) {
        const hy = 31 + row * 5;
        const hair = ['#2a1e18', '#3a2a22', '#2a2c30', '#4a3020', '#1f1614'][Math.floor(hash(x * 5 + row) * 5)];
        headBack(k, x, hy, hair, hash(x + row * 3) < 0.35);
        if (hash(x * 11 + row) < 0.08 && Math.floor(t / 700 + x) % 3) P(x + 5, hy + 4, 1, 1, C.glow);
      }
    }
  }
  const PLACES = {
    office_am: (k, W, H, t, o) => officeRoom(k, W, H, t, o.weather || 'clear', false),
    office_eve: (k, W, H, t) => officeRoom(k, W, H, t, 'night', true),
    tower: placeTower,
    hearing: placeHearing,
    readers: placeReaders,
    street: (k, W, H, t, o) => placeStreet(k, W, H, t, o.weather),
    rooftop: placeRooftop,
    auditorium: placeAuditorium
  };
  function place(canvas, where, t, opts) {
    const o = opts || {};
    if (where === 'skyline') { skyline(canvas, o.day || 1, o.weather, t); return; }
    const k = kit(canvas.getContext('2d'));
    (PLACES[where] || PLACES.office_am)(k, canvas.width, canvas.height, t || STILL, o);
  }

  /* ---------- the Dogpatch skyline, one card per shift ---------- */
  const TOWER_H = [10, 13, 16, 19, 22, 24, 26, 27, 28, 29];
  function skyline(canvas, day, weather, t) {
    const k = kit(canvas.getContext('2d'));
    const { P } = k;
    const W = canvas.width, H = canvas.height;
    const tt = t || STILL;
    const d = Math.max(1, Math.min(10, Math.round(day) || 1));
    const wx = d >= 10 ? 'cold' : weather || 'clear';
    const sky = { clear: ['#8fb7cf', '#e4d8bc'], fog: ['#c9cdcf', '#e6e3dc'], storm: ['#4a535c', '#6d7378'], dusk: ['#9aa3ab', '#d9d6cf'], cold: ['#a9c4d6', '#eef3f4'] }[wx] || ['#8fb7cf', '#e4d8bc'];
    const amt = { clear: 0.18, fog: 0.5, storm: 0.25, dusk: 0.3, cold: 0.06 }[wx] || 0.18;
    const far = (c, f) => mix(c, sky[1], Math.min(0.92, amt * (f === undefined ? 1 : f)));
    const farP = (f) => (x, y, w, h, c) => P(x, y, w, h, far(c, f));
    k.bands(0, 0, W, H, sky[0], sky[1], 8);
    if (wx === 'clear' || wx === 'cold') { const sc = wx === 'cold' ? '#ffffff' : '#fbf1d6', sx = Math.floor(W * 0.64); P(sx, 4, 5, 5, sc); P(sx - 1, 5, 7, 3, sc); }
    const hz = H - 14;
    for (let x = 0; x < W; x++) { const hh = 4 + Math.round(2 * Math.sin(x / 23) + 1.5 * Math.sin(x / 9 + 1)); P(x, hz - hh, 1, hh, far('#7d8a74', 1.7)); }
    for (let x = 0, i = 0; x < W * 0.34; x += 5, i++) { const bh = 2 + Math.floor(hash(i * 7 + 1) * 6); P(x, hz - bh, 4, bh, far('#8a8f96', 1.5)); }
    P(0, hz, W, 4, far('#4f7a8c', 1.1));
    for (let x = 3; x < W; x += 9) P(x + (Math.floor(tt / 800) % 3), hz + 1 + (x % 2), 3, 1, far('#8fb7cf', 1));
    [0.8, 0.9].forEach((f, i) => {
      const cx = Math.floor(W * f);
      const rust = far('#a8322d', 0.8);
      P(cx, hz - 15, 2, 17, rust); P(cx + 8, hz - 15, 2, 17, rust); P(cx, hz - 8, 10, 1, rust);
      P(cx - 3, hz - 17, 20 - i * 3, 2, rust); P(cx + 3, hz - 21, 4, 4, far('#5a5f66', 0.8));
      k.line(cx + 5, hz - 21, cx + 16 - i * 3, hz - 17, rust);
    });
    const tx = Math.floor(W * 0.42), th = TOWER_H[d - 1], ty = hz + 2 - th;
    const tw = 11;
    const body = far('#8a96a0', 0.55);
    P(tx, ty, tw, H - ty, body); P(tx + tw - 2, ty, 2, H - ty, far('#6f7c86', 0.55)); P(tx, ty, 1, H - ty, far('#a7b0b5', 0.55));
    for (let wy = ty + 3; wy < H; wy += 3) P(tx + 2, wy, tw - 5, 1, far(d >= 8 ? C.glow : '#c8d0d4', 0.55));
    if (d <= 2) {
      const sc = far('#5a5f66', 0.6);
      for (let wy = ty; wy < ty + 9; wy += 3) { k.line(tx - 1, wy, tx + tw, wy + 3, sc); P(tx - 1, wy, tw + 2, 1, sc); }
      const crane = far(C.gold, 0.5);
      P(tx + 5, ty - 12, 1, 12, crane); P(tx - 7, ty - 12, 22, 1, crane); P(tx + 13, ty - 11, 1, 5, far('#5a5f66', 0.6)); P(tx - 6, ty - 11, 3, 2, far('#5a5f66', 0.6));
    } else {
      P(tx - 1, ty - 3, tw + 2, 3, far(C.coal, 0.5)); P(tx + 2, ty - 6, tw - 4, 3, far(C.coal, 0.5)); P(tx + 5, ty - 9, 1, 3, far(C.coal, 0.5));
    }
    if (d >= 4) P(tx - 1, ty - 1, tw + 2, 1, far(C.lab, 0.4));
    if (d >= 5) { P(tx - 1, ty + 1, tw + 2, 6, far(C.coal2, 0.4)); eyeMark(farP(0.4), tx, ty + 1, C.labHi); }
    if (d >= 7) { P(tx - 1, ty + 8, 1, H - ty - 8, far(C.lab, 0.4)); P(tx + tw, ty + 8, 1, H - ty - 8, far(C.lab, 0.4)); }
    if (d >= 9) { if (Math.floor(tt / 700) % 2) P(tx + 5, ty - 10, 1, 1, C.red); cone(k, tx + 5, 0, ty - 9, 0, far(C.glow, 0.3), 0.7); for (let y = 0; y < ty - 9; y++) if (lit(tx + 5, y, 0.6)) P(tx + 5, y, 1, 1, far(C.glow, 0.3)); }
    if (wx === 'fog') fogDither(k, hz - 10, 13, W, tt, '#eceae4', 0.7);
    const signs = d >= 10 ? 4 : d >= 8 ? 3 : d >= 6 ? 2 : d >= 3 ? 1 : 0;
    const signAt = [3, 1, 6, 4];
    const near = far('#7a6e60', 0.25), near2 = far('#8a7f70', 0.25), dark = far('#4a443c', 0.25);
    for (let x = -6, i = 0; x < W; x += 24, i++) {
      const bh = 7 + Math.floor(hash(i * 17 + 3) * 6);
      const by = H - bh;
      const fac = i % 2 ? near : near2;
      P(x, by, 22, bh, fac);
      for (let s2 = 0; s2 < 22; s2 += 5) for (let r = 0; r < 3; r++) P(x + s2 + r, by - 1 - r, 1, r + 1, fac);
      for (let s2 = 0; s2 < 22; s2 += 5) P(x + s2 + 3, by - 3, 1, 3, dark);
      for (let wx2 = x + 2; wx2 < x + 20; wx2 += 4) P(wx2, by + 3, 2, 2, wx === 'storm' || wx === 'dusk' ? far(C.lamp, 0.3) : dark);
      if (d >= 7 && i % 3 === 2) { P(x + 9, by + 1, 3, Math.min(7, bh - 2), far(C.lab, 0.25)); P(x + 10, by + 3, 1, 1, far(C.labHi, 0.25)); }
      const si = signAt.indexOf(i % 8);
      if (si >= 0 && si < signs && by > 10) {
        P(x + 5, by - 10, 13, 7, far(C.coal2, 0.25)); P(x + 6, by - 9, 11, 5, far(C.lab, 0.25)); eyeMark(farP(0.25), x + 6, by - 9, far(C.coal2, 0.25));
        P(x + 7, by - 3, 1, 3, dark); P(x + 15, by - 3, 1, 3, dark);
      }
    }
    const wtx = Math.floor(W * 0.16);
    P(wtx, H - 22, 9, 7, dark); P(wtx - 1, H - 23, 11, 1, dark); P(wtx + 3, H - 25, 3, 2, dark);
    for (let i = 0; i < 3; i++) P(wtx + i * 4, H - 15, 1, 6, dark);
    const nd = 1 + Math.floor(d * 1.3);
    for (let i = 0; i < nd; i++) {
      const formation = d >= 8 && i >= nd - 5;
      const sp = formation ? 120 : 70 + (i % 4) * 25;
      const base = formation ? Math.floor(tt / sp) % (W + 60) - 30 + (i - (nd - 5)) * 9 : (Math.floor(tt / sp) + Math.floor(hash(i * 41) * W)) % (W + 16) - 8;
      const dy = formation ? 4 + Math.abs(i - (nd - 3)) * 2 : 3 + Math.floor(hash(i * 13 + 5) * Math.max(4, hz - 12));
      drone(k, base, dy, tt, i, far(C.drone, 0.4));
    }
    if (wx === 'fog') P(0, H - 1, W, 1, '#d6d6d1');
    if (wx === 'storm') rain(k, 0, 0, W, H, tt, '#a7b3ba', Math.round(W / 2));
    if (wx === 'cold') for (let i = 0; i < 8; i++) P(Math.floor(hash(i * 3) * W), Math.floor(hash(i * 7) * (hz - 10)) + 2, 1, 1, '#ffffff');
  }

  /* ---------- ending vignettes (160×72) ---------- */
  function endReaders(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, '#3a2a22');
    for (let x = 0; x < 160; x += 6) P(x, 0, 1, 72, '#33251e');
    bookshelf(k, 2, 2, 42, 52, 11); bookshelf(k, 116, 2, 42, 52, 29);
    P(50, 4, 23, 9, '#a8865e'); P(50, 4, 23, 1, '#c4a06a'); P(50, 12, 23, 1, C.deskDk); k.text('READ', 54, 6, C.meatXd);
    P(80, 0, 1, 14, C.ink); P(76, 14, 9, 3, C.ink); P(75, 17, 11, 1, C.gold);
    const flick = Math.floor(t / 90) % 41 === 0;
    P(78, 18, 5, 1, flick ? C.gold : C.lamp);
    cone(k, 80, 18, 45, 1.35, flick ? '#6b4a2b' : '#a8865e', 0.6);
    P(0, 56, 160, 16, '#2a1e18'); for (let x = 0; x < 160; x += 9) P(x, 56, 1, 16, '#241a14');
    P(34, 44, 92, 4, C.deskHi); P(34, 44, 92, 1, '#c4a06a'); P(34, 48, 92, 3, C.deskDk); P(38, 51, 3, 21, C.deskDk); P(119, 51, 3, 21, C.deskDk);
    pool(k, 80, 46, 30, 2, '#c4a06a', 0.6);
    for (let i = 0; i < 10; i++) { const ox = 66 + (i % 3 === 1 ? 1 : 0) - (i % 4 === 3 ? 1 : 0); P(ox, 42 - i * 2, 28, 2, i % 2 ? C.paper : C.sheet); P(ox, 43 - i * 2, 28, 1, C.tan); }
    P(80, 24, 1, 20, C.meat); P(66, 33, 28, 1, C.meat); P(79, 22, 3, 2, C.meat);
    for (let i = 0; i < 3; i++) { P(44 + i * 5, 41 - i, 14, 3, i % 2 ? '#e6d6bd' : C.sheet); P(46 + i * 5, 42 - i, 8, 1, C.tan); }
    P(104, 36, 8, 8, C.sheet); P(112, 38, 2, 4, C.sheet); P(104, 36, 8, 1, '#ffffff'); P(105, 39, 6, 1, C.meat); P(107, 32, 1, 3, '#d8ccb6');
    P(16, 40, 14, 16, '#3a3d42'); headBack(k, 20, 33, '#2a1e18'); P(29, 37, 1, 6, '#6b4a2b');
    P(130, 40, 14, 16, '#4a2e2a'); headBack(k, 134, 33, '#4a3020'); P(130, 37, 1, 6, '#6b4a2b');
  }
  function endWalkedOut(k, t) {
    const { P } = k;
    k.bands(0, 0, 160, 54, '#c9cdcf', '#e6e3dc', 6);
    for (let i = 0; i < 9; i++) { const bh = 10 + Math.floor(hash(i * 9) * 18); P(i * 18, 50 - bh, 14, bh, '#c3c6c4'); }
    P(0, 50, 160, 22, '#a3a7a2'); for (let x = 4; x < 160; x += 18) P(x, 62, 9, 1, '#d6d6d1');
    fogDither(k, 10, 22, 160, t, '#eceae4', 0.6);
    cone(k, 70, 6, 30, 0.6, '#b8dfe4', 0.4);
    drone(k, 68, 4, t, 0);
    const bx = 28;
    P(bx, 28, 86, 26, C.coal); P(bx, 28, 86, 2, '#3a3d42'); P(bx + 2, 30, 1, 22, '#3a3d42');
    for (let i = 0; i < 9; i++) {
      const wx = bx + 22 + i * 7;
      P(wx, 32, 6, 8, '#9fb0b8'); P(wx, 32, 6, 1, '#c8d6dc');
      if (hash(i * 5) < 0.7) { P(wx + 2, 35, 3, 3, '#3a3d42'); P(wx + 1, 38, 5, 2, '#3a3d42'); }
    }
    P(bx + 3, 32, 15, 13, '#9fb0b8'); P(bx + 3, 32, 15, 1, '#c8d6dc'); P(bx + 3, 31, 15, 1, C.coal2);
    P(bx + 3, 23, 23, 7, '#141416'); P(bx + 3, 23, 23, 1, '#3a3d42'); k.text('RELOC', bx + 5, 24, C.glow);
    P(bx, 44, 86, 2, C.lab); P(bx, 46, 86, 1, C.labDk);
    P(bx + 2, 48, 3, 2, C.lamp); P(bx, 49, 2, 2, '#a8322d');
    for (let y = 49; y < 56; y++) for (let x = bx - 2 - (y - 49) * 3; x < bx; x += 2) k.px(x, y, '#efe3c0');
    [bx + 14, bx + 70].forEach((wx) => { k.disc(wx, 54, 4, '#141416'); P(wx - 1, 53, 3, 3, C.silver); });
    P(bx + 76, 36, 6, 16, '#7d8790'); P(bx + 77, 37, 4, 14, '#9fb0b8');
    const fx = 132 - (Math.floor(t / 600) % 2);
    figure(k, fx, 40, { hair: '#3b2a1e', body: '#3f4a5a', skin: '#c89a78' });
    P(fx - 6, 48, 6, 5, C.deskHi); P(fx - 6, 48, 6, 1, '#c4a06a'); P(fx - 4, 47, 2, 1, C.deskDk);
    fogDither(k, 58, 14, 160, t + 4000, '#e6e3dc', 0.4);
  }
  function endParachute(k, t) {
    const { P } = k;
    k.bands(0, 0, 160, 46, '#3a3456', '#e09a6a', 7);
    for (let x = 0; x < 160; x++) { const hh = 4 + Math.round(2 * Math.sin(x / 17) + Math.sin(x / 5)); P(x, 36 - hh, 1, hh, '#5a4a66'); }
    P(0, 36, 160, 10, '#4a5a70'); for (let i = 0; i < 24; i++) P(Math.floor(hash(i) * 160), 37 + (i % 8), 4, 1, '#e09a6a');
    for (let i = 0; i < 7; i++) { const bh = 8 + Math.floor(hash(i * 3) * 14); P(4 + i * 22, 36 - bh, 8, bh, '#3a3446'); }
    const px0 = 118 + Math.round(Math.sin(t / 900) * 3), py = 6 + (Math.floor(t / 1500) % 2);
    P(px0, py, 13, 2, C.sheet); P(px0 + 1, py - 1, 11, 1, C.sheet); P(px0 + 3, py - 2, 7, 1, C.sheet); P(px0 + 6, py, 1, 2, C.tan);
    k.line(px0, py + 2, px0 + 5, py + 8, '#5a4a66'); k.line(px0 + 12, py + 2, px0 + 7, py + 8, '#5a4a66');
    P(px0 + 4, py + 8, 5, 4, C.gold); P(px0 + 4, py + 8, 5, 1, '#e8c27a');
    P(0, 0, 160, 3, C.coal); P(70, 0, 20, 46, C.coal2); P(72, 0, 2, 46, '#3a3d42');
    for (let x = 0; x < 160; x += 35) if (x < 66 || x > 92) P(x, 0, 2, 46, C.coal);
    P(0, 46, 160, 26, '#3a2a22');
    P(62, 16, 36, 32, C.meatXd); P(60, 18, 40, 30, C.meatXd); P(64, 14, 32, 2, C.meatXd);
    P(63, 17, 34, 29, '#5a1a24'); P(64, 16, 32, 1, '#8e3a48');
    for (let y = 20; y < 44; y += 6) for (let x = 67 + ((y / 6) % 2) * 3; x < 95; x += 6) { P(x, y, 1, 1, '#3e1018'); P(x, y - 1, 1, 1, '#7a2a38'); }
    P(54, 30, 7, 18, C.meatXd); P(99, 30, 7, 18, C.meatXd); P(54, 30, 7, 2, '#8e3a48'); P(99, 30, 7, 2, '#8e3a48');
    P(0, 48, 160, 24, C.deskDk); P(0, 48, 160, 2, C.deskMd); P(0, 50, 160, 1, '#4a3828');
    for (let x = 0; x < 160; x += 23) P(x, 52 + (x % 4), 14, 1, '#4f3a28');
    P(57, 52, 46, 20, '#4a3828');
    P(58, 50, 44, 18, C.paper); P(58, 50, 44, 1, C.sheet); P(101, 50, 1, 18, C.tan); P(58, 67, 44, 1, C.tan);
    k.line(58, 50, 80, 62, C.tan); k.line(101, 50, 80, 62, C.tan);
    for (let i = 0; i < 5; i++) P(62 + i * 7, 48 - (i % 2), 6, 2, '#3f6e3a');
    k.disc(80, 61, 3, C.meat); P(79, 60, 2, 1, C.meatHi); P(80, 61, 1, 1, C.meatXd);
    P(112, 56, 22, 2, '#1f1614'); P(110, 55, 3, 3, C.gold);
    P(20, 54, 16, 6, C.sheet); P(22, 55, 10, 1, C.tan); P(22, 57, 8, 1, C.tan);
  }
  function ribeye(P, x, y) {
    const rows = ['....oooooooo....', '..oofffmmmmmoo..', '.offmmmwmmmmmmo.', 'offmmmmmmmwwmmmo', 'ofmmwwmmmmmmmmmo', 'ofmmmmmmmwmmmmdo', 'ofmmmmmwwmmmmmdo', '.ommmmmmmmmmmdo.', '..oommmmmmmddo..', '....oooooooo....'];
    const col = { o: C.meatXd, f: C.fat, m: C.meat, w: '#f0d4cc', d: C.meatDk };
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (col[ch]) P(x + i, y + j, 1, 1, col[ch]); }));
  }
  function endDryAged(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, '#cfdde2');
    for (let x = 0; x < 160; x += 10) P(x, 0, 1, 50, '#bccdd3');
    for (let y = 0; y < 50; y += 8) P(0, y, 160, 1, '#bccdd3');
    P(0, 0, 160, 4, C.labDk); P(0, 4, 160, 1, C.lab);
    cone(k, 80, 5, 50, 0.7, '#eef6f8', 0.35);
    P(0, 50, 160, 22, '#8a96a0'); P(0, 50, 160, 1, '#a7b0b5'); for (let x = 0; x < 160; x += 16) P(x, 51, 1, 21, '#7f8a94');
    P(58, 46, 44, 6, C.sheet); P(54, 52, 52, 4, C.paper); P(54, 52, 52, 1, C.sheet); P(58, 56, 44, 16, '#d8ccb6'); P(58, 56, 2, 16, '#e6dccb'); P(100, 56, 2, 16, '#b9ad98');
    P(60, 42, 40, 4, C.sheet); P(62, 46, 36, 1, C.tan);
    ribeye(P, 72, 33);
    for (let y = 0; y < 30; y++) {
      const hw = Math.round(24 * Math.sqrt(Math.max(0, 1 - ((29 - y) / 30) ** 2)));
      P(80 - hw, 14 + y, 1, 1, '#9fb7c0'); P(80 + hw, 14 + y, 1, 1, '#8aa4ae');
    }
    P(76, 11, 9, 3, '#9fb7c0'); P(78, 9, 5, 2, '#b9cfd6');
    for (let i = 0; i < 9; i++) P(64 + i, 22 - Math.floor(i / 2) + 4, 1, 2, '#ffffff');
    P(62, 34, 1, 8, '#e8f8fa');
    P(108, 36, 30, 20, C.sheet); P(108, 36, 30, 6, C.meat); k.text('TIER 1', 110, 37, C.sheet);
    for (let i = 0; i < 12; i++) P(110 + i * 2, 49, 1, (i % 3) + 3, C.ink);
    eyeMark(P, 125, 43, C.ink);
    P(108, 56, 30, 1, '#7f8a94'); P(137, 36, 1, 20, C.tan);
    P(18, 46, 22, 5, C.gold); P(18, 46, 22, 1, '#e8c27a'); P(20, 51, 2, 21, '#a88a3a'); P(36, 51, 2, 21, '#a88a3a');
    k.line(28, 46, 48, 56, C.meat); k.line(48, 56, 56, 52, C.meat);
  }
  function endInformer(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, '#7d8790');
    for (let x = 0; x < 160; x += 20) P(x, 0, 1, 50, '#737d86');
    P(20, 4, 120, 40, '#4a4f55'); P(22, 6, 116, 36, '#20242c');
    for (let i = 0; i < 4; i++) k.line(30 + i * 30, 41, 50 + i * 30, 7, '#2c3440');
    k.line(32, 41, 52, 7, '#3a4450');
    P(70, 19, 9, 9, '#3a4450'); P(66, 28, 17, 14, '#3a4450'); P(64, 30, 2, 12, '#3a4450'); P(83, 30, 2, 12, '#3a4450'); P(64, 33, 2, 2, C.labDk); P(71, 18, 7, 1, '#4a5662');
    P(110, 30, 26, 3, '#2c3440'); P(118, 33, 2, 9, '#2c3440');
    if (Math.floor(t / 700) % 3 === 0) P(127, 10, 1, 1, C.red);
    P(98, 22, 1, 1, '#3a4450'); P(102, 22, 1, 1, '#3a4450');
    P(0, 48, 160, 24, C.steel); P(0, 48, 160, 2, '#8a96a0'); P(0, 50, 160, 1, '#5a6670');
    P(40, 54, 34, 14, '#3a2a22'); P(40, 54, 34, 1, '#4d3a2e'); P(57, 54, 1, 14, '#2a1e18');
    for (let y = 0; y < 10; y++) { const hw = y < 6 ? 6 : 6 - (y - 5); P(66 - hw, 56 + y, hw * 2, 1, C.silver); }
    P(61, 56, 10, 1, '#d8dde3');
    eyeMark(P, 60, 58, C.coal);
    P(44, 57, 10, 1, C.tan); P(44, 59, 8, 1, C.tan); P(44, 61, 9, 1, C.tan); P(44, 64, 6, 2, C.meat);
    P(92, 56, 26, 8, C.coal2); P(94, 53, 22, 4, C.coal2); P(94, 56, 22, 2, C.lab); P(90, 63, 30, 2, '#141416');
    P(103, 54, 4, 2, C.lab); P(104, 54, 1, 1, C.labHi);
    P(128, 52, 7, 9, C.sheet); P(135, 54, 2, 4, C.sheet); P(129, 53, 5, 1, '#6b4a2b');
  }
  function endScapegoat(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, '#1b1715');
    for (let x = 0; x < 160; x += 14) P(x, 0, 1, 34, '#241e1a');
    eyeMark(P, 75, 3, C.silver);
    for (let i = 0; i < 5; i++) {
      const fx = 22 + i * 27;
      figure(k, fx, 13, { cap: true, legs: 0, skin: ['#c89a78', '#a8765a', '#e0b896', '#8a5a40', '#d8a888'][i] });
      P(fx + 6, 18, 1, 3, C.silver);
    }
    P(10, 21, 140, 12, C.deskDk); P(10, 21, 140, 2, C.desk); for (let x = 14; x < 150; x += 12) P(x, 24, 1, 9, '#4a3828');
    for (let i = 0; i < 5; i++) { P(20 + i * 27, 25, 10, 3, C.fat); P(21 + i * 27, 26, 8, 1, C.grey); }
    P(0, 33, 160, 39, '#171311');
    cone(k, 80, 0, 72, 0.32, '#6b5a48', 0.38);
    for (let y = 58; y < 72; y++) { const hw = 14 + Math.floor((y - 58) * 1.4); P(80 - hw, y, hw * 2, 1, y % 2 ? '#5a4a3c' : '#665444'); }
    P(73, 47, 14, 2, C.deskHi); P(73, 47, 14, 1, '#c9a678');
    P(74, 38, 2, 10, C.deskMd); P(84, 38, 2, 10, C.deskMd); P(74, 38, 12, 2, C.deskHi); P(74, 42, 12, 1, C.deskMd);
    P(74, 49, 2, 12, C.deskMd); P(84, 49, 2, 12, C.deskMd); P(76, 49, 1, 9, C.deskDk); P(83, 49, 1, 9, C.deskDk);
    P(76, 61, 10, 1, '#3a2e24');
    P(96, 66, 9, 3, C.sheet); P(97, 67, 6, 1, C.meat);
  }
  function endFrontPage(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, C.coal);
    for (let i = 0; i < 3; i++) { const ry = 3 + i * 7; P(0, ry, 34, 5, '#4a4f55'); P(0, ry, 34, 1, '#8a929c'); P(0, ry + 4, 34, 1, '#2a2c30'); for (let x = (Math.floor(t / 80) + i * 3) % 6; x < 34; x += 6) P(x, ry + 2, 2, 1, '#6f7c86'); }
    for (let y = 26; y < 72; y += 6) P(4, y, 22, 5, mix(C.paper, C.coal, 0.35));
    for (let y = 26; y < 72; y += 6) P(4, y + 2, 22, 1, C.meatDk);
    P(30, 4, 6, 64, '#3a3d42');
    P(38, 6, 112, 64, '#9a8f80');
    P(36, 4, 112, 64, C.paper);
    k.text('THE LEDGER', 53, 7, C.ink, 2);
    P(39, 18, 106, 1, C.ink); P(39, 20, 106, 1, C.ink);
    k.text('NO. 1 · PRINTED ON PAPER', 39, 22, C.grey);
    k.text('HUMAN IN THE LOOP', 39, 30, C.meatDk);
    P(39, 36, 106, 1, C.tan);
    P(39, 39, 40, 26, '#cfc5b4');
    for (let y = 40; y < 64; y++) for (let x = 40; x < 78; x++) if (((x + y) & 1) === 0) P(x, y, 1, 1, '#b9ad98');
    P(46, 43, 26, 16, C.ink); P(48, 45, 22, 11, '#3a3a3a');
    P(52, 48, 2, 2, C.paper); P(63, 48, 2, 2, C.paper); P(54, 52, 10, 1, C.paper); P(53, 51, 1, 1, C.paper); P(64, 51, 1, 1, C.paper);
    P(56, 59, 6, 3, C.ink);
    for (let c = 0; c < 2; c++) for (let y = 40; y < 66; y += 2) P(83 + c * 32, y, (y * 7 + c * 5) % 9 === 0 ? 18 : 28, 1, C.grey);
    P(36, 4, 112, 1, C.sheet);
  }
  function endHeadOfAi(k, t) {
    const { P } = k;
    k.bands(0, 0, 160, 48, '#8fb7cf', '#e4d8bc', 6);
    for (let x = 0; x < 160; x++) { const hh = 4 + Math.round(2 * Math.sin(x / 21) + 1.5 * Math.sin(x / 8)); P(x, 30 - hh, 1, hh, '#9aa69a'); }
    P(0, 30, 160, 12, '#4f7a8c'); for (let i = 0; i < 20; i++) P(Math.floor(hash(i * 3) * 160), 31 + (i % 10), 4, 1, '#8fb7cf');
    P(84, 28, 76, 1, '#6f7c86'); [100, 136].forEach((x) => { P(x, 14, 2, 15, '#6f7c86'); P(x - 1, 18, 4, 1, '#6f7c86'); });
    for (let x = 84; x < 160; x++) { const rel = ((x - 82) % 36) / 36; P(x, 15 + Math.round((rel - 0.5) ** 2 * 4 * 12), 1, 1, '#6f7c86'); }
    for (let i = 0; i < 9; i++) {
      const dx = ((Math.floor(t / (90 + (i % 3) * 30)) + i * 23) % 180) - 10, dy = 3 + (i % 4) * 5;
      drone(k, dx, dy, t, i);
    }
    for (let x = 0; x < 160; x += 40) P(x, 0, 3, 48, C.coal2);
    P(0, 0, 160, 3, C.coal2); P(0, 44, 160, 4, C.coal2);
    P(0, 48, 160, 24, '#24262a');
    for (let x = 0; x < 160; x += 40) for (let y = 50; y < 72; y += 2) if (((x + y) & 3) === 0) P(x + 8, y, 22, 1, '#3a4450');
    P(140, 4, 14, 40, C.lab); P(140, 4, 14, 1, C.labHi); P(153, 4, 1, 40, C.labDk); eyeMark(P, 141, 14, C.labHi);
    P(28, 52, 70, 4, C.paper); P(28, 52, 70, 1, C.sheet); P(30, 56, 66, 2, '#cfc5b4'); P(34, 58, 4, 14, C.silver); P(88, 58, 4, 14, C.silver);
    P(52, 30, 20, 22, C.sheet); P(52, 30, 20, 2, '#ffffff'); P(71, 32, 1, 20, '#d8ccb6'); P(50, 40, 3, 10, C.paper); P(71, 40, 3, 10, C.paper);
    P(30, 46, 42, 6, C.coal); P(30, 46, 42, 1, '#4a4f55'); k.text('STEWARD', 30 + Math.floor((42 - textW('STEWARD')) / 2), 47, C.glow);
    P(76, 48, 20, 4, C.coal2); P(78, 45, 16, 4, C.coal2); P(78, 48, 16, 1, C.lab); P(85, 46, 3, 2, C.lab); P(86, 46, 1, 1, C.labHi);
  }
  function endReplaced(k, t) {
    const { ctx, P } = k;
    P(0, 0, 160, 72, C.wall);
    for (let x = 0; x < 160; x += 8) P(x, 0, 1, 48, C.wallLn);
    P(10, 6, 40, 28, C.glass); miniView(k, 12, 8, 36, 24, 'dusk', t, 3); P(29, 8, 2, 24, C.glass); P(8, 34, 44, 2, '#8a7f70');
    k.disc(128, 14, 9, C.sheet); k.ring(128, 14, 9, C.ink); P(128, 6, 1, 1, C.ink); P(136, 14, 1, 1, C.ink); P(128, 22, 1, 1, C.ink); P(120, 14, 1, 1, C.ink);
    P(128, 7, 1, 7, C.ink); P(128, 14, 5, 1, C.ink);
    P(0, 48, 160, 24, C.deskMd); P(0, 48, 160, 2, C.deskHi); P(0, 50, 160, 1, C.deskDk);
    chuck(ctx, 96, 26, 'smug', t);
    P(124, 34, 4, 4, C.silver); P(125, 35, 2, 2, C.lab);
    const sw = Math.floor(t / 160) % 12;
    const hx = 104 - sw, hy = 54 + (sw % 3 === 0 ? 1 : 0);
    k.line(126, 36, 132, 44, C.silver); k.line(127, 36, 133, 44, '#8a929c'); P(131, 43, 4, 4, C.lab); P(132, 44, 2, 2, C.labDk);
    k.line(132, 46, hx + 4, hy - 4, C.silver); k.line(133, 46, hx + 5, hy - 4, '#8a929c');
    P(hx + 2, hy - 6, 4, 4, '#8a929c'); P(hx + 3, hy - 5, 2, 2, C.lab);
    k.line(hx + 3, hy - 2, hx, hy + 1, C.ink);
    P(66, 52, 46, 14, C.sheet); P(66, 52, 46, 1, '#ffffff'); P(66, 65, 46, 1, C.tan); P(70, 55, 30, 1, C.tan); P(70, 57, 24, 1, C.tan);
    P(70, 62, 34, 1, C.tan);
    for (let i = 0; i < 12 - sw; i++) P(101 - i * 2 - 1, 60 + (i % 3 === 1 ? -1 : i % 3 === 2 ? 1 : 0), 2, 1, C.labDk);
    for (let i = 0; i < 4; i++) P(62 + i, 50 - i * 2, 46, 2, i % 2 ? C.paper : C.sheet);
    P(10, 36, 22, 4, C.coal); P(12, 30, 18, 7, C.coal); P(10, 40, 3, 10, C.coal2); P(29, 40, 3, 10, C.coal2); P(19, 50, 3, 10, '#3a3a3a');
    P(10, 40, 22, 2, C.coal2);
    P(30, 31, 3, 9, C.coal2); P(30, 33, 3, 3, C.lab); P(31, 34, 1, 1, C.labDk);
    P(40, 52, 14, 8, '#c4bba8'); k.text('5:00', 41, 54, C.meatDk);
  }
  function endSlowHand(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, '#d8ccb6');
    for (let x = 0; x < 160; x += 8) P(x, 0, 1, 54, '#cfc3ab');
    const cx = 122, cy = 22;
    k.disc(cx, cy, 15, C.ink); k.disc(cx, cy, 13, C.sheet);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P(cx + Math.round(Math.sin(a) * 11), cy - Math.round(Math.cos(a) * 11), 1, 1, C.ink); }
    const hourA = ((4 + 58 / 60) / 12) * Math.PI * 2, minA = (58 / 60) * Math.PI * 2;
    k.line(cx, cy, cx + Math.round(Math.sin(hourA) * 6), cy - Math.round(Math.cos(hourA) * 6), C.ink);
    k.line(cx, cy, cx + Math.round(Math.sin(minA) * 10), cy - Math.round(Math.cos(minA) * 10), C.ink);
    const sec = Math.floor(t / 1500) % 60, secA = (sec / 60) * Math.PI * 2;
    k.line(cx, cy, cx + Math.round(Math.sin(secA) * 11), cy - Math.round(Math.cos(secA) * 11), C.meat);
    P(cx, cy, 1, 1, C.meat);
    P(0, 54, 160, 18, C.deskMd); P(0, 54, 160, 2, C.deskHi); P(0, 56, 160, 1, C.deskDk);
    const manila = mix(C.gold, C.paper, 0.45), manilaDk = mix(C.gold, C.deskMd, 0.25);
    for (let i = 0; i < 17; i++) {
      const off = Math.round(Math.sin(i * 1.7) * 2);
      const y = 53 - i * 3;
      P(24 + off, y, 50, 3, manila); P(24 + off, y + 2, 50, 1, manilaDk); P(24 + off + (i % 3) * 14 + 4, y - 1, 10, 1, manila);
      if (i % 2 === 0) P(64 + off, y, 6, 2, C.meat);
    }
    P(27, 4, 44, 3, manila);
    P(30, 6, 33, 9, mix(C.meat, C.paper, 0.15)); P(31, 7, 31, 7, manila); k.text('WITHHELD', 31, 8, C.meat);
    P(96, 46, 30, 8, C.coal); P(98, 46, 26, 1, '#3a3d42'); P(96, 52, 30, 2, '#141416'); k.text('OUT', 105, 48, C.silver);
    P(136, 44, 9, 10, C.sheet); P(145, 46, 2, 5, C.sheet); P(137, 45, 7, 1, '#5a4a3a');
    P(4, 40, 14, 14, C.deskDk); P(6, 42, 10, 10, C.ink); P(8, 44, 2, 1, C.glow);
  }
  function endDismissed(k, t) {
    const { P } = k;
    P(0, 0, 160, 72, '#cfc3ae');
    for (let x = 0; x < 160; x += 8) P(x, 0, 1, 50, '#c5b9a3');
    P(102, 6, 48, 30, C.glass); miniView(k, 104, 8, 44, 26, 'storm', t, 5); P(125, 8, 2, 26, C.glass); P(100, 36, 52, 2, '#8a7f70');
    P(14, 8, 22, 16, C.sheet); P(14, 8, 22, 4, C.meat); k.text('LOW', 16, 13, C.meatDk); P(16, 19, 16, 1, C.grey); P(16, 21, 12, 1, C.grey);
    P(0, 50, 160, 22, C.deskMd); P(0, 50, 160, 2, C.deskHi); P(0, 52, 160, 1, C.deskDk);
    P(118, 30, 28, 22, '#d9cfbd'); P(120, 32, 24, 15, '#141a18'); P(122, 33, 6, 1, '#2a3632'); P(127, 52, 10, 3, '#a89e8c'); P(122, 55, 20, 2, '#a89e8c');
    P(52, 32, 56, 4, '#8a6a3e');
    plantPot(k, 56, 16);
    P(70, 22, 3, 12, C.ink); P(70, 22, 12, 9, C.sheet); P(72, 24, 8, 5, C.lab);
    P(86, 24, 9, 10, C.sheet); P(95, 26, 2, 5, C.sheet); P(87, 25, 7, 1, C.meat);
    P(98, 26, 4, 10, C.paper); P(98, 26, 4, 1, C.tan);
    P(50, 34, 60, 30, '#c4a06a'); P(50, 34, 60, 2, '#d8b884'); P(50, 62, 60, 2, '#a8865e'); P(108, 36, 2, 26, '#a8865e');
    P(46, 30, 8, 6, '#b8915e'); P(106, 30, 8, 6, '#b8915e');
    P(76, 34, 8, 30, '#d8c8a0');
    steakSticker(P, 56, 48);
    P(20, 58, 24, 3, C.coal); P(28, 57, 6, 5, C.coal2); P(29, 58, 4, 3, C.lab); P(30, 59, 2, 1, C.labDk);
    P(52, 64, 56, 2, C.deskDk);
  }
  const ENDINGS = { readers: endReaders, walked_out: endWalkedOut, parachute: endParachute, dry_aged: endDryAged, informer: endInformer, scapegoat: endScapegoat, front_page: endFrontPage, head_of_ai: endHeadOfAi, replaced: endReplaced, slow_hand: endSlowHand, dismissed: endDismissed };
  function ending(canvas, id, t) {
    if (canvas.width !== 160) canvas.width = 160;
    if (canvas.height !== 72) canvas.height = 72;
    const k = kit(canvas.getContext('2d'));
    k.P(0, 0, 160, 72, C.paper);
    (ENDINGS[id] || ENDINGS.replaced)(k, t || STILL);
  }

  /* ---------- the countersignature desk, before any paper lands ---------- */
  const RACK = ['green', 'violet', 'brown', 'blue', 'black', 'teal', 'red', 'ochre', 'pink'];
  function desk(canvas, o) {
    const opt = o || {};
    if (canvas.width !== 144) canvas.width = 144;
    if (canvas.height !== 64) canvas.height = 64;
    const k = kit(canvas.getContext('2d'));
    const { ctx, P } = k;
    const t = opt.t || STILL;
    ctx.clearRect(0, 0, 144, 64);
    const sh = C.deskDk;
    const inks = (typeof SEAL_COLORS !== 'undefined' && SEAL_COLORS) || {};
    P(48, 30, 64, 4, sh); P(46, 22, 64, 8, C.deskDk);
    P(44, 20, 64, 3, C.deskHi); P(44, 20, 64, 1, '#c4a06a'); P(44, 23, 64, 2, C.deskMd);
    RACK.forEach((name, i) => {
      const x = 47 + i * 7;
      const ink = inks[name] || C.ink;
      P(x + 1, 8, 3, 3, C.deskMd); P(x + 1, 8, 3, 1, C.deskHi);
      P(x + 2, 11, 1, 6, C.deskDk);
      P(x, 17, 5, 3, C.coal); P(x, 19, 5, 1, ink); P(x, 17, 5, 1, '#3a3d42');
      P(x + 1, 25, 3, 2, ink);
    });
    const left = Math.max(0, Math.min(5, opt.left === undefined ? 5 : opt.left));
    P(6, 40, 38, 3, sh);
    P(4, 26, 36, 15, '#3a3d42'); P(4, 26, 36, 1, '#5a5f66'); P(6, 28, 32, 11, '#2a2c30');
    for (let i = 0; i < left * 2; i++) { const y = 37 - i * 2; P(7 + (i % 2), y, 30, 2, i % 2 ? C.paper : C.sheet); P(7 + (i % 2), y + 1, 30, 1, C.tan); }
    P(4, 36, 36, 5, '#4a4f55'); P(4, 36, 36, 1, '#6f7c86');
    k.text('IN', 7, 37, C.silver);
    steakSticker(P, 26, 33);
    P(50, 44, 26, 2, sh);
    P(48, 37, 26, 8, '#3a3d42'); P(48, 37, 26, 1, '#6f7c86'); P(50, 39, 22, 5, C.ink); P(51, 40, 6, 1, '#2a2226');
    P(48, 32, 26, 5, '#4a4f55'); P(48, 32, 26, 1, '#6f7c86');
    P(116, 46, 18, 3, sh);
    P(114, 33, 14, 14, C.sheet); P(114, 33, 14, 2, '#ffffff'); P(115, 35, 12, 3, '#3a2a22'); P(116, 35, 4, 1, '#5a4a3a'); P(127, 36, 4, 7, C.sheet); P(128, 37, 2, 5, C.deskMd); P(126, 33, 1, 14, '#e6dccb');
    P(117, 40, 8, 3, C.meat); P(119, 41, 4, 1, C.sheet);
    const st = Math.floor(t / 300);
    for (let i = 0; i < 2; i++) { const sx = 118 + i * 5 + ((st + i) % 2); const sy = 27 - ((st + i * 2) % 3); P(sx, sy, 1, 2, '#e6dccb'); P(sx + 1, sy - 2, 1, 2, '#e6dccb'); }
    const name = (opt.name || 'Countersigner').slice(0, 18);
    const nw = Math.max(36, textW(name) + 10);
    const nx = Math.min(144 - nw - 2, Math.max(78, 102 - Math.floor(nw / 2)));
    P(nx + 2, 60, nw, 3, sh);
    P(nx, 52, nw, 9, C.coal); P(nx, 52, nw, 1, '#4a4f55'); P(nx + 2, 54, nw - 4, 5, C.gold); P(nx + 2, 54, nw - 4, 1, '#e8c27a');
    k.text(name, nx + Math.floor((nw - textW(name)) / 2), 54, C.ink);
    P(8, 54, 16, 6, sh); P(6, 50, 18, 5, C.sheet); P(8, 51, 12, 1, C.tan); P(8, 53, 9, 1, C.tan);
    P(26, 58, 18, 2, sh); P(24, 56, 18, 2, C.ink); P(24, 56, 4, 2, C.gold); P(41, 56, 1, 2, C.labHi);
  }

  /* ---------- the decision stamp ---------- */
  const STAMP_INK = { ok: '#2f7a4d', no: '#a8701c', det: '#c23e52', esc: '#6f7c86' };
  // The stamp is laid out in s×s ink blocks, then turned a few degrees by nearest-neighbour sampling, so the tilt is
  // a staircase of whole canvas pixels (shown 1:1) and every stroke stays solid. Strokes are s thick and steps are 1.
  // Given the paper's colour ([r, g, b]), the stamp knocks the text under it back to a faint ghost, so the ink reads.
  const STAMP_TILT = -0.055;
  const STAMP_KNOCKOUT = 222;
  function stamp(kind, label, s, paper) {
    const k = s || 3;
    const words = String(label).toUpperCase();
    const lines = words.length > 13 && words.includes(' ') ? words.split(' ') : [words];
    const tw = Math.max(...lines.map((l) => textW(l)));
    const w = tw + 10, h = lines.length * 7 + 7;
    const W = w * k, H = h * k;
    const mask = new Uint8Array(W * H);
    const block = (bx, by, bw, bh) => {
      for (let y = by * k; y < (by + bh) * k; y++) mask.fill(1, y * W + bx * k, y * W + (bx + bw) * k);
    };
    const seed = words.length * 97;
    const worn = (bx, by) => hash(seed + bx * 31 + by * 113) < 0.035;
    const ring = (inset) => {
      for (let bx = inset; bx < w - inset; bx++) [inset, h - 1 - inset].forEach((by) => { if (!worn(bx, by)) block(bx, by, 1, 1); });
      for (let by = inset + 1; by < h - 1 - inset; by++) [inset, w - 1 - inset].forEach((bx) => { if (!worn(bx, by)) block(bx, by, 1, 1); });
    };
    ring(0); ring(2);
    lines.forEach((l, li) => drawText(block, l, Math.floor((w - textW(l)) / 2), 4 + li * 7, null, 1));
    const cos = Math.cos(STAMP_TILT), sin = Math.sin(STAMP_TILT);
    const Wd = Math.ceil(W * Math.abs(cos) + H * Math.abs(sin)) + 2;
    const Hd = Math.ceil(W * Math.abs(sin) + H * Math.abs(cos)) + 2;
    const cv = document.createElement('canvas');
    cv.width = Wd; cv.height = Hd;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(Wd, Hd);
    const [r, g, b] = hexToRgb(STAMP_INK[kind] || STAMP_INK.det);
    for (let y = 0; y < Hd; y++) {
      for (let x = 0; x < Wd; x++) {
        const dx = x + 0.5 - Wd / 2, dy = y + 0.5 - Hd / 2;
        const sx = Math.floor(cos * dx + sin * dy + W / 2), sy = Math.floor(-sin * dx + cos * dy + H / 2);
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const i = (y * Wd + x) * 4;
        if (mask[sy * W + sx]) { img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255; }
        else if (paper) { img.data[i] = paper[0]; img.data[i + 1] = paper[1]; img.data[i + 2] = paper[2]; img.data[i + 3] = STAMP_KNOCKOUT; }
      }
    }
    ctx.putImageData(img, 0, 0);
    cv.className = 'px stamp-ink';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.width = `${Wd}px`;
    cv.style.height = `${Hd}px`;
    return cv;
  }

  /* ---------- stamp-register seal icons (inline SVG) ---------- */
  const SEAL_GLYPHS = {
    '◆': ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'],
    '⚖': ['....x....', '.xxxxxxx.', '.x..x..x.', 'x.x.x.x.x', 'x.x.x.x.x', 'xxx.x.xxx', '....x....', '....x....', '..xxxxx..'],
    '✚': ['...xxx...', '...xxx...', '...xxx...', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', '...xxx...', '...xxx...', '...xxx...'],
    '✎': ['.......xx', '......xxx', '.....x.x.', '....xxx..', '...xxx...', '..xxx....', '.x.x.....', 'xx.......', 'x........'],
    '⚙': ['...x.x...', '.x.xxx.x.', '..xxxxx..', 'xxx...xxx', '.xx...xx.', 'xxx...xxx', '..xxxxx..', '.x.xxx.x.', '...x.x...'],
    '◉': ['..xxxxx..', '.x.....x.', 'x..xxx..x', 'x.xxxxx.x', 'x.xxxxx.x', 'x.xxxxx.x', 'x..xxx..x', '.x.....x.', '..xxxxx..'],
    '♥': ['.........', '.xx...xx.', 'xxxx.xxxx', 'xxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'],
    '▲': ['.........', '....x....', '...xxx...', '...xxx...', '..xxxxx..', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.........'],
    '⌂': ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxx.xxx.', '.xxx.xxx.', '.xxx.xxx.', '.xxx.xxx.'],
    '★': ['....x....', '....x....', '...xxx...', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '..xx.xx..', '.xx...xx.', '.x.....x.'],
    '●': ['.........', '...xxx...', '..xxxxx..', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '..xxxxx..', '...xxx...', '.........'],
    '■': ['.........', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.........']
  };
  const RING15 = (() => {
    const pts = [];
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) { const r = Math.hypot(x - 7, y - 7); if (r > 6.2 && r <= 7.3) pts.push([x, y]); }
    return pts;
  })();
  function runs(cells) {
    const rows = {};
    cells.forEach(([x, y]) => { (rows[y] = rows[y] || []).push(x); });
    let d = '';
    Object.keys(rows).forEach((y) => {
      const xs = rows[y].sort((a, b) => a - b);
      for (let i = 0; i < xs.length; i++) {
        let j = i;
        while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j += 1;
        d += `M${xs[i]} ${y}h${j - i + 1}v1h-${j - i + 1}z`;
        i = j;
      }
    });
    return d;
  }
  function sealIcon(glyph, color, label) {
    const g = SEAL_GLYPHS[glyph];
    const cells = [];
    if (g) g.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'x') cells.push([3 + i, 3 + j]); }));
    const a11y = label ? `role="img" aria-label="${String(label).replace(/[&<>"]/g, '')}"` : 'aria-hidden="true"';
    return `<svg class="sealpx" viewBox="0 0 15 15" shape-rendering="crispEdges" ${a11y}><circle cx="7.5" cy="7.5" r="7" fill="#fffdf8"/><path fill="${color}" d="${runs(RING15)}${runs(cells)}"/>${g ? '' : `<text x="7.5" y="11" font-size="8" text-anchor="middle" fill="${color}">${glyph}</text>`}</svg>`;
  }

  /* ---------- the desk calendar: one wire-bound month page, Sunday first, today inked in red ---------- */
  // o: { title: 'NOVEMBER 2031', weeks: six rows of seven day numbers (0 = blank), today: day of month or 0 }.
  const CAL = { cw: 11, ch: 9, m: 4, top: 28 };
  const CAL_W = CAL.m * 2 + CAL.cw * 7, CAL_H = CAL.top + CAL.ch * 6 + 3;
  // How far down a calendar page week row r ends, as a share of the page's height.
  const calendarRowEnd = (r) => (CAL.top + CAL.ch * (r + 1)) / CAL_H;
  function calendar(canvas, o) {
    canvas.width = CAL_W; canvas.height = CAL_H;
    live(canvas, () => {
      const { ctx, P, text } = kit(canvas.getContext('2d'));
      ctx.clearRect(0, 0, CAL_W, CAL_H);
      P(2, 4, CAL_W - 2, CAL_H - 4, C.boneSh);
      P(0, 2, CAL_W - 2, CAL_H - 3, C.ink);
      P(1, 3, CAL_W - 4, CAL_H - 5, C.sheet);
      P(1, 4, CAL_W - 4, 12, C.meat); P(1, 15, CAL_W - 4, 1, C.meatDk);
      for (let x = 8; x < CAL_W - 6; x += 12) { P(x - 1, 4, 4, 2, C.meatXd); P(x, 0, 2, 6, C.steel); P(x, 0, 1, 5, C.silver); }
      text(o.title, Math.floor((CAL_W - 2 - textW(o.title)) / 2), 8, C.sheet);
      [...'SMTWTFS'].forEach((d, i) => text(d, CAL.m + i * CAL.cw + 3, 19, i === 0 || i === 6 ? C.meatDk : '#6b5a50'));
      P(CAL.m - 1, 26, CAL.cw * 7, 1, C.tan);
      o.weeks.forEach((week, r) => {
        const y = CAL.top + r * CAL.ch;
        if (r < 5) P(CAL.m - 1, y + CAL.ch - 1, CAL.cw * 7, 1, '#f1e9da');
        week.forEach((d, i) => {
          if (!d) return;
          const x = CAL.m + i * CAL.cw, n = String(d);
          if (d === o.today) P(x, y + 1, CAL.cw - 2, 7, C.meat);
          text(n, x + Math.floor((CAL.cw - 2 - textW(n)) / 2), y + 2, d === o.today ? C.sheet : i === 0 || i === 6 ? '#8a7f70' : C.ink);
        });
      });
    }, { fixed: [CAL_W, CAL_H], max: o.max || 4, maxH: o.maxH, still: true });
  }

  return { scene, photo, bust, title, chuckPortrait, steak, steakBadge, shade, mix, live, place, skyline, ending, desk, stamp, sealIcon, calendar, calendarRowEnd, endings: Object.keys(ENDINGS), places: Object.keys(PLACES) };
})();
