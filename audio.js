/* Audio: SFX suara karakter + synthesizer WebAudio & musik latar. */
const Sfx = (() => {
  'use strict';
  let ctx = null, master = null, sfxBus = null, voiceBus = null, musicBus = null;
  let muted = false, musicOn = false, timer = null, nextNoteTime = 0, stepIdx = 0;
  let currentMode = 1;

  // Pemetaan mode & level hasil merge ke file audio:
  // Mode 1:
  //   m1_2: Level 1 + Level 1 -> Level 2 (Orang Kurus bertemu Orang Kurus -> Orang Ke-2)
  //   m1_3: Level 2 + Level 2 -> Level 3 (Orang Ke-2 bertemu Orang Ke-2 -> Sawit)
  //   m1_4: Level 3 + Level 3 -> Level 4 (Sawit bertemu Sawit -> Orang Berjas bawa sawit, SnapTik 7662747012235889938)
  //   m1_5: Level 4 + Level 4 -> Level 5 (Orang Berjas bertemu Orang Berjas -> Makanan MBG, SnapTik 7643377554887331093)
  // Mode 2:
  //   m2_2: Level 1 + Level 1 -> Level 2 (Pak Jas Biru bertemu Pak Jas Biru -> Pak Kemeja Putih, SnapTik 7153243234121174298)
  //   m2_3: Level 2 + Level 2 -> Level 3 (Pak Kemeja Putih bertemu Pak Kemeja Putih -> Pak Rambut Acak, SnapTik 7440518047376379191)
  //   m2_4: Level 3 + Level 3 -> Level 4 (Pak Rambut Acak bertemu Pak Rambut Acak -> Ibu Baju Merah, SnapTik 7299897033614167302)
  //   m2_5: Level 4 + Level 4 -> Level 5 (Ibu Baju Merah bertemu Ibu Baju Merah -> Ibu Kebaya Merah, SnapTik 7299897033614167302)
  const VOICE_FILES = {
    m1_2: 'assets/merge_lvl1.wav',
    m1_3: 'assets/merge_lvl2.wav',
    m1_4: 'assets/merge_lvl3_hutang.wav',
    m1_5: 'assets/merge_lvl4_mbg.wav',
    m2_2: 'assets/m2_merge1.wav',
    m2_3: 'assets/m2_merge2.wav',
    m2_4: 'assets/m2_merge3.wav',
    m2_5: 'assets/m2_merge3.wav',
  };
  const voiceBuffers = {};
  const voiceElements = {};
  let activeSource = null;
  let activeElement = null;
  let duckTimer = null;

  // Preload HTMLAudioElement saat dibuka langsung via file:// (di mana fetch diblokir CORS)
  if (!/^https?:$/.test(location.protocol)) {
    Object.keys(VOICE_FILES).forEach((k) => {
      try {
        const a = new Audio(VOICE_FILES[k]);
        a.preload = 'auto';
        voiceElements[k] = a;
      } catch (e) { /* abaikan di lingkungan tanpa Audio */ }
    });
  }

  // Skala pentatonik C mayor
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1568.0];

  function loadVoiceBuffers() {
    if (!ctx || !/^https?:$/.test(location.protocol)) return;
    Object.keys(VOICE_FILES).forEach((k) => {
      if (voiceBuffers[k]) return;
      fetch(VOICE_FILES[k])
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => { voiceBuffers[k] = decoded; })
        .catch(() => { /* gunakan fallback HTMLAudioElement */ });
    });
  }

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      loadVoiceBuffers();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.0; voiceBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    loadVoiceBuffers();
    if (musicOn) startScheduler();
  }

  function setMode(m) {
    currentMode = m === 2 ? 2 : 1;
  }

  function tone(freq, { type = 'sine', dur = 0.15, vol = 0.3, delay = 0, slideTo = null, bus = null } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(bus || sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function duckMusic(seconds) {
    if (!ctx || !musicBus) return;
    clearTimeout(duckTimer);
    musicBus.gain.setTargetAtTime(0.03, ctx.currentTime, 0.03);
    duckTimer = setTimeout(() => {
      if (ctx && musicBus) musicBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.15);
    }, Math.max(200, seconds * 1000));
  }

  function stopVoice() {
    clearTimeout(duckTimer);
    if (activeSource) {
      try { activeSource.onended = null; activeSource.stop(); } catch (e) { /* abaikan */ }
      activeSource = null;
    }
    if (activeElement) {
      try { activeElement.pause(); activeElement.currentTime = 0; } catch (e) { /* abaikan */ }
      activeElement = null;
    }
    if (ctx && musicBus) musicBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.08);
  }

  function playVoice(level) {
    const key = 'm' + currentMode + '_' + String(level);
    if (!VOICE_FILES[key]) return false;
    init();
    stopVoice();

    // Gunakan WebAudio bila buffer sudah siap
    if (ctx && voiceBuffers[key]) {
      const buf = voiceBuffers[key];
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src._level = Number(level);
      src._key = key;
      src.connect(voiceBus);
      activeSource = src;
      duckMusic(buf.duration);
      src.onended = () => {
        if (activeSource === src) {
          activeSource = null;
          if (ctx && musicBus) musicBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.12);
        }
      };
      src.start(0);
      return true;
    }

    // Fallback HTMLAudioElement (mis. dibuka langsung dari file:// atau saat buffer belum selesai dimuat)
    if (!voiceElements[key]) {
      try { voiceElements[key] = new Audio(VOICE_FILES[key]); } catch (e) { /* abaikan */ }
    }
    const el = voiceElements[key];
    if (el) {
      try {
        el.currentTime = 0;
        el.muted = muted;
        el.volume = 1.0;
        el._level = Number(level);
        el._key = key;
        activeElement = el;
        const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 12;
        duckMusic(dur);
        el.onended = () => {
          if (activeElement === el) {
            activeElement = null;
            if (ctx && musicBus) musicBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.12);
          }
        };
        const p = el.play();
        if (p && p.catch) p.catch(() => { /* abaikan */ });
        return true;
      } catch (e) { /* abaikan */ }
    }
    return false;
  }

  function setMuted(m) {
    muted = !!m;
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    Object.keys(voiceElements).forEach((k) => {
      if (voiceElements[k]) voiceElements[k].muted = muted;
    });
  }

  /* ---------- Musik latar ---------- */
  const TEMPO = 104;                         // bpm
  const STEP = 60 / TEMPO / 2;               // durasi satu not 1/8
  const MELODY = [
    5, -1, 7, 8, 7, -1, 5, -1,
    4, -1, 5, 7, 5, -1, 3, -1,
    5, -1, 7, 9, 8, 7, 5, -1,
    7, 5, 4, -1, 3, -1, -1, -1,
  ];
  const BASS = [0, 0, 3, 4];

  function scheduleNotes() {
    if (!ctx) return;
    while (nextNoteTime < ctx.currentTime + 0.35) {
      const i = stepIdx % MELODY.length;
      const n = MELODY[i];
      const delay = Math.max(0, nextNoteTime - ctx.currentTime);
      if (n >= 0) tone(SCALE[n], { type: 'triangle', dur: STEP * 1.6, vol: 0.55, delay, bus: musicBus });
      if (i % 4 === 0) {
        const bar = Math.floor(i / 8) % BASS.length;
        tone(SCALE[BASS[bar]] / 2, { type: 'sine', dur: STEP * 3, vol: 0.7, delay, bus: musicBus });
      }
      nextNoteTime += STEP;
      stepIdx++;
    }
  }

  function startScheduler() {
    if (timer || !ctx) return;
    nextNoteTime = ctx.currentTime + 0.1;
    timer = setInterval(scheduleNotes, 100);
  }

  function musicStart() {
    musicOn = true;
    if (ctx) startScheduler();
  }
  function musicStop() {
    musicOn = false;
    if (timer) { clearInterval(timer); timer = null; }
    stopVoice();
  }

  /* ---------- SFX ---------- */
  function drop() { tone(220, { type: 'sine', dur: 0.14, vol: 0.5, slideTo: 90 }); }
  function click() { tone(660, { type: 'square', dur: 0.05, vol: 0.12 }); }
  function merge(level) {
    // Jika level hasil merge memiliki klip suara, putar klip suara tersebut
    if (playVoice(level)) return;
    // Selain itu, gunakan nada naik sesuai level hasil merge (6)
    const base = Math.min(level, 7) + 1;
    tone(SCALE[base], { type: 'triangle', dur: 0.16, vol: 0.45 });
    tone(SCALE[base + 2], { type: 'triangle', dur: 0.22, vol: 0.4, delay: 0.07 });
    if (level >= 5) tone(SCALE[base + 4], { type: 'sine', dur: 0.35, vol: 0.4, delay: 0.14 });
  }
  function combo(n) {
    const k = Math.min(n, 5);
    for (let i = 0; i < 3; i++) {
      tone(SCALE[4 + k + i], { type: 'square', dur: 0.09, vol: 0.18, delay: i * 0.06 });
    }
  }
  function gameOver() {
    stopVoice();
    [392, 330, 262, 196].forEach((f, i) => tone(f, { type: 'sawtooth', dur: 0.3, vol: 0.25, delay: i * 0.18, slideTo: f * 0.9 }));
  }
  function win() {
    stopVoice();
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(f, { type: 'triangle', dur: 0.28, vol: 0.45, delay: i * 0.11 }));
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  return {
    init, setMode, getMode: () => currentMode,
    setMuted, isMuted: () => muted,
    musicStart, musicStop, stopVoice,
    drop, click, merge, combo, gameOver, win,
    getActiveVoiceLevel: () => {
      if (activeSource && activeSource._level) return activeSource._level;
      if (activeElement && activeElement._level) return activeElement._level;
      return null;
    },
    getActiveVoiceKey: () => {
      if (activeSource && activeSource._key) return activeSource._key;
      if (activeElement && activeElement._key) return activeElement._key;
      return null;
    },
  };
})();
