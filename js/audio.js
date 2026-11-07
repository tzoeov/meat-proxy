'use strict';

const Sound = (() => {
  let ctx = null, master, musicBus, ambBus, sfxBus, noiseBuf;
  let vol = { master: 0.8, music: 0.5, ambience: 0.6, sfx: 0.8 };
  let track = 'off', weather = 'clear';
  let musicTimer = null, ambTimer = null, nextNoteTime = 0, step = 0;
  let waveGain = null, rainGain = null;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (err) {
      console.warn('Audio unavailable', err);
      return false;
    }
    master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    applyVolumes();
    startAmbience();
    return true;
  }

  function applyVolumes() {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(vol.master, now, 0.05);
    musicBus.gain.setTargetAtTime(vol.music * 0.5, now, 0.05);
    ambBus.gain.setTargetAtTime(vol.ambience * 0.7, now, 0.05);
    sfxBus.gain.setTargetAtTime(vol.sfx * 0.8, now, 0.05);
  }

  function noiseSrc(loop) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = !!loop;
    return s;
  }

  function startAmbience() {
    const waves = noiseSrc(true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    waveGain = ctx.createGain(); waveGain.gain.value = 0.35;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.22;
    lfo.connect(lfoG); lfoG.connect(waveGain.gain);
    waves.connect(lp); lp.connect(waveGain); waveGain.connect(ambBus);
    waves.start(); lfo.start();
    const rain = noiseSrc(true);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    rain.connect(hp); hp.connect(rainGain); rainGain.connect(ambBus);
    rain.start();
    scheduleAmbient();
  }

  function scheduleAmbient() {
    clearTimeout(ambTimer);
    ambTimer = setTimeout(() => {
      if (!ctx) return;
      if (weather !== 'storm' && Math.random() < 0.7) gull();
      if (Math.random() < 0.18) horn();
      scheduleAmbient();
    }, 5000 + Math.random() * 9000);
  }

  function gull() {
    const t0 = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.28;
      const o = ctx.createOscillator(); o.type = 'sine';
      const g = ctx.createGain(); g.gain.value = 0;
      o.frequency.setValueAtTime(1900 + Math.random() * 300, t);
      o.frequency.exponentialRampToValueAtTime(1100, t + 0.22);
      g.gain.linearRampToValueAtTime(0.025, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(ambBus); o.start(t); o.stop(t + 0.3);
    }
  }

  function horn() {
    const t = ctx.currentTime;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.09, t + 0.4);
    g.gain.setValueAtTime(0.09, t + 2.1);
    g.gain.linearRampToValueAtTime(0, t + 2.9);
    [73.4, 110].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start(t); o.stop(t + 3);
    });
    lp.connect(g); g.connect(ambBus);
  }

  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PROGS = {
    menu: { bpm: 72, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], mel: [72, 71, 69, 67, 69, 71, 72, 76, 74, 72, 71, 72] },
    booth: { bpm: 92, chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]], mel: [62, 64, 65, 67, 69, 67, 65, 64, 62, 0, 69, 71, 72, 71, 69, 0] },
    tense: { bpm: 100, chords: [[50, 53, 56], [51, 54, 57], [50, 53, 56], [49, 52, 55]], mel: [62, 0, 63, 0, 62, 0, 61, 0] }
  };

  function pluck(freq, t, dur, gain, type) {
    const o = ctx.createOscillator(); o.type = type || 'triangle'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function reed(freq, t, dur, gain) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.08);
    g.gain.setValueAtTime(gain, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300;
    [0, 4].forEach((det) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = 3;
      vib.connect(vg); vg.connect(o.detune);
      o.connect(f); o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
    });
    f.connect(g); g.connect(musicBus);
  }

  function musicTick() {
    if (!ctx || track === 'off') return;
    const P = PROGS[track];
    const spb = 60 / P.bpm / 2;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % P.chords.length;
      const chord = P.chords[bar];
      const s = step % 8;
      if (s === 0) { pluck(NOTE(chord[0] - 12), nextNoteTime, spb * 7, 0.12, 'sine'); }
      if (s === 4) pluck(NOTE(chord[0] - 5), nextNoteTime, spb * 3, 0.06, 'sine');
      const arp = [0, 1, 2, chord.length - 1, 2, 1, 0, 2][s];
      pluck(NOTE(chord[arp] + 12), nextNoteTime, spb * 1.6, track === 'tense' ? 0.035 : 0.05);
      if (s % 2 === 0) {
        const mi = Math.floor(step / 2) % P.mel.length;
        const m = P.mel[mi];
        if (m && (track !== 'booth' || Math.floor(step / 64) % 2 === 1)) reed(NOTE(m), nextNoteTime, spb * 1.9, 0.022);
      }
      nextNoteTime += spb;
      step++;
    }
  }

  function setTrack(name) {
    if (!ensure()) return;
    if (track === name) return;
    track = name;
    clearInterval(musicTimer);
    if (name === 'off') return;
    step = 0;
    nextNoteTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(musicTick, 90);
  }

  function setWeather(w) {
    weather = w;
    if (!ctx) return;
    rainGain.gain.setTargetAtTime(w === 'storm' ? 0.28 : 0, ctx.currentTime, 0.8);
    waveGain.gain.setTargetAtTime(w === 'storm' ? 0.6 : 0.35, ctx.currentTime, 0.8);
  }

  function env(node, t, a, peak, d) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  const sfx = {
    stamp() {
      const t = ctx.currentTime;
      const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const g = ctx.createGain(); env(g, t, 0.003, 0.9, 0.12);
      n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.2);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      const og = ctx.createGain(); env(og, t, 0.003, 0.6, 0.14);
      o.connect(og); og.connect(sfxBus); o.start(t); o.stop(t + 0.2);
    },
    paper() {
      const t = ctx.currentTime;
      const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.8;
      const g = ctx.createGain(); env(g, t, 0.02, 0.25, 0.16);
      n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t, Math.random()); n.stop(t + 0.22);
    },
    click() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1200;
      const g = ctx.createGain(); env(g, t, 0.002, 0.05, 0.03);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.05);
    },
    type() {
      const t = ctx.currentTime;
      const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      const g = ctx.createGain(); env(g, t, 0.001, 0.18, 0.025);
      n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t, Math.random()); n.stop(t + 0.04);
    },
    alarm() {
      const t = ctx.currentTime;
      [0, 0.3, 0.6].forEach((dt, i) => {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = i % 2 ? 520 : 660;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
        const g = ctx.createGain(); env(g, t + dt, 0.01, 0.12, 0.26);
        o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t + dt); o.stop(t + dt + 0.3);
      });
    },
    coin() {
      const t = ctx.currentTime;
      [1320, 1760].forEach((fr, i) => {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
        const g = ctx.createGain(); env(g, t + i * 0.07, 0.003, 0.12, 0.25);
        o.connect(g); g.connect(sfxBus); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.3);
      });
    },
    buzz() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ctx.createGain(); env(g, t, 0.01, 0.12, 0.35);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.4);
    },
    bell() {
      const t = ctx.currentTime;
      [880, 1318].forEach((fr) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
        const g = ctx.createGain(); env(g, t, 0.005, 0.08, 1.1);
        o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 1.2);
      });
    },
    step() {
      const t = ctx.currentTime;
      const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = ctx.createGain(); env(g, t, 0.005, 0.3, 0.08);
      n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t, Math.random()); n.stop(t + 0.1);
    }
  };

  function play(name) {
    if (!ctx || !sfx[name]) return;
    if (ctx.state === 'suspended') ctx.resume();
    sfx[name]();
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setVolumes(v) {
    vol = Object.assign(vol, v);
    applyVolumes();
  }

  return { unlock, play, setTrack, setWeather, setVolumes };
})();
