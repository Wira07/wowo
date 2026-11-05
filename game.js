/* Merge KOPDES Merah Putih — game.js
 * Canvas 2D + Matter.js. Mendukung 2 Mode Permainan (Game 1 & Game 2). */
(() => {
  'use strict';

  const { Engine, Composite, Bodies, Body, Events } = Matter;

  /* =====================================================================
   * Konfigurasi
   * ===================================================================== */
  // score = poin saat merge menghasilkan level tersebut. `fit` = skala gambar thd collider.
  const LEVELS_BY_MODE = {
    1: [
      { id: 1, name: 'Orang Kurus',  img: 'assets/lvl1.png', radius: 28,  score: 0,   bubble: '#cfe3f7', fit: 1.10 },
      { id: 2, name: 'Orang Ke-2',   img: 'assets/lvl2.png', radius: 38,  score: 10,  bubble: '#bcd4f0', fit: 1.10 },
      { id: 3, name: 'Sawit',        img: 'assets/lvl3.png', radius: 50,  score: 25,  bubble: '#ffd9a8', fit: 1.14 },
      { id: 4, name: 'Orang Berjas', img: 'assets/lvl4.png', radius: 64,  score: 50,  bubble: '#d3d6de', fit: 1.10 },
      { id: 5, name: 'Makanan',      img: 'assets/lvl5.png', radius: 80,  score: 100, bubble: '#ffe8a8', fit: 1.10 },
      { id: 6, name: 'Logo Kopdes',  img: 'assets/lvl6.png', radius: 100, score: 250, bubble: '#ffffff', fit: 1.04 },
    ],
    2: [
      { id: 1, name: 'Pak Jas Biru',     img: 'assets/m2_lvl1.png', radius: 28,  score: 0,   bubble: '#d2e4fa', fit: 1.12 },
      { id: 2, name: 'Pak Kemeja Putih', img: 'assets/m2_lvl2.png', radius: 38,  score: 10,  bubble: '#e4f0fb', fit: 1.14 },
      { id: 3, name: 'Pak Rambut Acak',  img: 'assets/m2_lvl3.png', radius: 50,  score: 25,  bubble: '#cfd9ec', fit: 1.12 },
      { id: 4, name: 'Ibu Baju Merah',   img: 'assets/m2_lvl4.png', radius: 64,  score: 50,  bubble: '#fbd6d8', fit: 1.12 },
      { id: 5, name: 'Ibu Kebaya Merah', img: 'assets/m2_lvl5.png', radius: 80,  score: 100, bubble: '#ffe0e2', fit: 1.12 },
      { id: 6, name: 'Logo Kopdes',      img: 'assets/lvl6.png',    radius: 100, score: 250, bubble: '#ffffff', fit: 1.04 },
    ],
  };

  let gameMode = 1;
  let LEVELS = LEVELS_BY_MODE[1];
  const MAX_LEVEL = 6;
  const LOGO_PAIR_BONUS = 1000;
  const COMBO_WINDOW = 1.0;                 // detik
  const COMBO_MULT = [1, 1.5, 2, 3];        // merge ke-1, ke-2, ke-3, ke-4+ dalam rantai
  const SPAWN_LV1_CHANCE = 0.7;             // sisanya Level 2 (Mode 1)
  const GUARANTEED_LV1 = 3;                 // 3 item pertama selalu Level 1 (Mode 1)
  const OVER_SECONDS = 2.0;
  const REST_SPEED = 1.0;                   // px/step; di bawah ini dianggap "diam"
  const DROP_COOLDOWN = 0.45;

  const W = 480, H = 720;
  const WALL = 20;                          // tebal dinding visual
  const LEFT = WALL, RIGHT = W - WALL;      // sisi dalam wadah
  const FLOOR_Y = 690;                      // permukaan lantai
  const LINE_Y = 150;                       // garis batas
  const DROP_Y = 82;                        // posisi pelepas

  const STEP_MS = 1000 / 60;

  const RED = '#D7000F';

  /* =====================================================================
   * Util: penyimpanan lokal, DOM
   * ===================================================================== */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat: abaikan */ } },
  };
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('id-ID');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const el = {
    score: $('score'), best: $('best'), nextImg: $('nextImg'), evo: $('evo'),
    btnPause: $('btnPause'), btnMute: $('btnMute'), hint: $('hint'), toast: $('toast'),
    menu: $('menu'), how: $('how'), pause: $('pause'), over: $('over'), win: $('win'),
  };
  const canvas = $('game');
  const ctx = canvas.getContext('2d');

  const ICON = {
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v2.2l2.5 2.5V12zM19 12a7 7 0 0 1-.9 3.4l1.5 1.5A9 9 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1a7 7 0 0 1 5 6.7zM4.3 3L3 4.3 7.7 9H3v6h4l5 4v-6.7l4.3 4.3c-.7.5-1.4.9-2.3 1.2v2.1a9 9 0 0 0 3.6-1.8l2.1 2.1 1.3-1.3L4.3 3zM12 5L9.9 7.1 12 9.2V5z"/></svg>',
  };

  /* =====================================================================
   * Aset gambar
   * ===================================================================== */
  Object.keys(LEVELS_BY_MODE).forEach((m) => {
    LEVELS_BY_MODE[m].forEach((L) => {
      L.image = new Image();
      L.image.src = L.img;
    });
  });

  /* =====================================================================
   * State
   * ===================================================================== */
  let state = 'menu';            // menu | playing | paused | celebrating | gameover
  let score = 0;
  let best = store.get('kopdes_best', 0);
  let top = store.get('kopdes_top', []);          // [{s, d}]
  let maxLevel = 1;               // level tertinggi pada sesi ini
  let won = false;                // logo sudah pernah terbentuk pada sesi ini
  let spawnIndex = 0;
  let held = null;                // { level, born }
  let nextLevel = 1;
  let dropCd = 0;
  let aimX = W / 2;
  let simTime = 0;                // detik simulasi
  let lastMergeT = -99;
  let comboCount = 0;
  let dangerTime = 0;
  let dropCount = 0;
  let mergeCount = 0;
  let shake = 0;
  let winDelay = 0;
  let overDelay = 0;
  let afterHowto = null;
  let tutorialSeen = store.get('kopdes_tutorial', false);
  let hintDone = store.get('kopdes_hint', false);
  const keys = { left: false, right: false };

  let items = [];                 // body aktif
  const mergeQueue = [];
  const particles = [];
  const texts = [];
  const rings = [];
  let nowSec = 0;

  /* =====================================================================
   * Pilihan Mode (Game 1 vs Game 2)
   * ===================================================================== */
  function selectMode(m) {
    gameMode = m === 2 ? 2 : 1;
    LEVELS = LEVELS_BY_MODE[gameMode];
    Sfx.setMode(gameMode);
    store.set('kopdes_mode', gameMode);

    const b1 = $('btnMode1'), b2 = $('btnMode2');
    if (b1 && b2) {
      b1.classList.toggle('active', gameMode === 1);
      b2.classList.toggle('active', gameMode === 2);
      b1.setAttribute('aria-checked', String(gameMode === 1));
      b2.setAttribute('aria-checked', String(gameMode === 2));
    }
    const playBtn = $('btnPlay');
    if (playBtn) playBtn.textContent = 'MAIN GAME ' + gameMode;

    buildEvo();
    buildHow();
    if (el.nextImg) el.nextImg.src = LEVELS[0].img;
  }

  /* =====================================================================
   * Fisika
   * ===================================================================== */
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8, enableSleeping: false });
  engine.gravity.y = 1.25;

  (function buildWalls() {
    const opt = { isStatic: true, friction: 0.4, restitution: 0.05, label: 'wall' };
    const t = 200;
    const walls = [
      Bodies.rectangle(W / 2, FLOOR_Y + t / 2, W + 2 * t, t, opt),
      Bodies.rectangle(LEFT - t / 2, H / 2 - 400, t, H + 1200, opt),
      Bodies.rectangle(RIGHT + t / 2, H / 2 - 400, t, H + 1200, opt),
    ];
    Composite.add(engine.world, walls);
  })();

  function makeBody(level, x, y) {
    const L = LEVELS[level - 1];
    const b = Bodies.circle(x, y, L.radius, {
      restitution: 0.12, friction: 0.35, frictionStatic: 0.5, frictionAir: 0.003,
      density: 0.0012, label: 'item',
    }, 40);
    b.level = level;
    b.r = L.radius;
    b.hadContact = false;
    b.merged = false;
    b.popAt = -99;
    b.born = simTime;
    return b;
  }

  function addItem(level, x, y, pop) {
    const b = makeBody(level, x, y);
    if (pop) b.popAt = nowSec;
    Composite.add(engine.world, b);
    items.push(b);
    noteLevel(level);
    return b;
  }

  function removeItem(b) {
    Composite.remove(engine.world, b);
    const i = items.indexOf(b);
    if (i >= 0) items.splice(i, 1);
  }

  function onPairs(pairs) {
    for (const p of pairs) {
      const a = p.bodyA, b = p.bodyB;
      const ia = a.label === 'item', ib = b.label === 'item';
      if (ia) a.hadContact = true;
      if (ib) b.hadContact = true;
      if (ia && ib && a.level === b.level && !a.merged && !b.merged) mergeQueue.push([a, b]);
    }
  }
  Events.on(engine, 'collisionStart', (e) => onPairs(e.pairs));
  Events.on(engine, 'collisionActive', (e) => onPairs(e.pairs));

  /* =====================================================================
   * Gameplay
   * ===================================================================== */
  function rollLevel() {
    const i = spawnIndex++;
    if (gameMode === 2) {
      // Di Game 2:
      // 4 item pertama adalah Level 1 (Pak Jas Biru) agar 2 pasang bisa langsung menyatu -> Level 2 -> Level 3,
      // diikuti 2 item Level 4 (Ibu Baju Merah) agar bisa langsung menyatu -> Level 5 (Ibu Kebaya Merah).
      if (i < 4) return 1;
      if (i === 4 || i === 5) return 4;
      const r = Math.random();
      if (r < 0.55) return 1;
      if (r < 0.75) return 2;
      return 4;
    }
    if (i < GUARANTEED_LV1) return 1;
    return Math.random() < SPAWN_LV1_CHANCE ? 1 : 2;
  }

  function noteLevel(level) {
    if (level > maxLevel) {
      maxLevel = level;
    }
    updateEvo(level);
  }

  function spawnHeld() {
    held = { level: nextLevel, born: nowSec };
    noteLevel(held.level);
    nextLevel = rollLevel();
    el.nextImg.src = LEVELS[nextLevel - 1].img;
    aimX = clampAim(aimX);
  }

  function clampAim(x) {
    const r = held ? LEVELS[held.level - 1].radius : 28;
    return clamp(x, LEFT + r + 1, RIGHT - r - 1);
  }

  function drop() {
    if (state !== 'playing' || !held || dropCd > 0) return;
    Sfx.init();
    const x = clampAim(aimX);
    const b = addItem(held.level, x, DROP_Y, false);
    Body.setVelocity(b, { x: 0, y: 1.5 });
    held = null;
    dropCd = DROP_COOLDOWN;
    dropCount++;
    Sfx.drop();
    if (!hintDone && dropCount >= 3) { hintDone = true; store.set('kopdes_hint', true); setHint(''); }
  }

  function processMerges() {
    while (mergeQueue.length) {
      const [a, b] = mergeQueue.shift();
      if (a.merged || b.merged) continue;
      if (items.indexOf(a) < 0 || items.indexOf(b) < 0) continue;
      a.merged = b.merged = true;
      const mx = (a.position.x + b.position.x) / 2;
      const my = (a.position.y + b.position.y) / 2;
      const vx = (a.velocity.x + b.velocity.x) / 4;
      const vy = (a.velocity.y + b.velocity.y) / 4;
      const level = a.level;
      removeItem(a); removeItem(b);

      // combo
      if (simTime - lastMergeT <= COMBO_WINDOW) comboCount++; else comboCount = 1;
      lastMergeT = simTime;
      const mult = COMBO_MULT[Math.min(comboCount, COMBO_MULT.length) - 1];
      mergeCount++;

      if (level >= MAX_LEVEL) {
        // dua logo bertemu -> hilang + bonus besar
        const pts = Math.round(LOGO_PAIR_BONUS * mult);
        addScore(pts);
        fxBurst(mx, my, 40, true);
        fxRing(mx, my, 160, '#ffd54a');
        fxText(mx, my - 20, '+' + fmt(pts), 34, '#ffd54a');
        shake = Math.max(shake, 14);
        Sfx.win();
      } else {
        const nl = level + 1;
        const pts = Math.round(LEVELS[nl - 1].score * mult);
        const nb = addItem(nl, mx, my, true);
        nb.hadContact = true;
        Body.setVelocity(nb, { x: vx, y: vy });
        addScore(pts);
        const r = LEVELS[nl - 1].radius;
        fxBurst(mx, my, 8 + nl * 3, nl >= 6);
        fxRing(mx, my, r * 1.5, nl >= 5 ? '#ffd54a' : '#ffffff');
        fxText(mx, my - r * 0.4, '+' + fmt(pts), 20 + nl * 2, '#ffffff');
        if (nl >= 5) shake = Math.max(shake, nl === 6 ? 12 : 6);
        Sfx.merge(nl);
        if (nl === MAX_LEVEL && !won) {
          won = true;
          state = 'celebrating';
          winDelay = 0.9;
          fxBurst(mx, my, 70, true);
          fxRing(mx, my, 220, '#ffd54a');
          setTimeout(() => Sfx.win(), 120);
        }
      }
      if (comboCount >= 2) {
        const m = COMBO_MULT[Math.min(comboCount, COMBO_MULT.length) - 1];
        fxText(mx, my - 56, 'KOMBO ×' + m, 22, '#ffd54a');
        Sfx.combo(comboCount);
      }
      if (!hintDone && mergeCount === 1) { hintDone = true; store.set('kopdes_hint', true); setHint(''); }
    }
  }

  function addScore(p) {
    score += p;
    el.score.textContent = fmt(score);
    el.score.classList.remove('bump'); void el.score.offsetWidth; el.score.classList.add('bump');
    if (score > best) { best = score; el.best.textContent = fmt(best); }
  }

  function checkGameOver() {
    let over = false;
    for (const b of items) {
      if (!b.hadContact) continue;
      if (b.position.y - b.r >= LINE_Y) continue;
      const sp = Math.hypot(b.velocity.x, b.velocity.y);
      if (sp < REST_SPEED) { over = true; break; }
    }
    if (over) dangerTime += STEP_MS / 1000; else dangerTime = 0;
    if (dangerTime > OVER_SECONDS) endGame();
  }

  function stepSim() {
    Engine.update(engine, STEP_MS);
    simTime += STEP_MS / 1000;
    processMerges();
    if (state === 'playing') checkGameOver();
  }

  function endGame() {
    state = 'gameover';
    overDelay = 0.9;
    held = null;
    Sfx.musicStop();
    Sfx.gameOver();
    const isRecord = score > 0 && score >= best && score > store.get('kopdes_best', 0);
    if (score > store.get('kopdes_best', 0)) store.set('kopdes_best', score);
    best = Math.max(best, score);
    if (score > 0) {
      top.push({ s: score, d: new Date().toISOString().slice(0, 10), id: Date.now() });
      top.sort((a, b) => b.s - a.s);
      top = top.slice(0, 5);
      store.set('kopdes_top', top);
    }
    endGame.record = isRecord;
  }

  function showGameOver() {
    $('ovScore').textContent = fmt(score);
    $('ovBest').textContent = fmt(best);
    $('ovRecord').hidden = !endGame.record;
    const L = LEVELS[maxLevel - 1];
    $('ovLvlImg').src = L.img;
    $('ovLvlName').textContent = L.name;
    const ol = $('ovBoard');
    ol.innerHTML = '';
    if (!top.length) ol.innerHTML = '<li>Belum ada skor</li>';
    let marked = false;
    top.forEach((t) => {
      const li = document.createElement('li');
      li.innerHTML = fmt(t.s) + '<span class="d">' + t.d + '</span>';
      if (!marked && t.s === score) { li.className = 'me'; marked = true; }
      ol.appendChild(li);
    });
    showOverlay(el.over);
  }

  function resetGame() {
    items.slice().forEach(removeItem);
    mergeQueue.length = 0;
    particles.length = 0; texts.length = 0; rings.length = 0;
    score = 0; maxLevel = 1; won = false;
    spawnIndex = 0; simTime = 0; lastMergeT = -99; comboCount = 0;
    dangerTime = 0; dropCount = 0; mergeCount = 0; shake = 0; dropCd = 0;
    held = null;
    el.score.textContent = '0';
    el.best.textContent = fmt(best);
    buildEvo();
    nextLevel = rollLevel();   // item pertama selalu Level 1
    spawnHeld();
    updateEvo(1);
  }

  /* =====================================================================
   * Alur layar
   * ===================================================================== */
  function showOverlay(o) { o.classList.add('show'); }
  function hideOverlay(o) { o.classList.remove('show'); }
  function hideAll() { [el.menu, el.how, el.pause, el.over, el.win].forEach(hideOverlay); }

  function startGame() {
    Sfx.init();
    Sfx.setMode(gameMode);
    hideAll();
    resetGame();
    state = 'playing';
    setPauseIcon();
    Sfx.musicStart();
    if (!hintDone) setHint('Geser lalu lepas untuk menjatuhkan'); else setHint('');
  }

  function toMenu() {
    state = 'menu';
    Sfx.musicStop();
    hideAll();
    $('menuBest').textContent = fmt(best);
    showOverlay(el.menu);
  }

  function onPlayPressed() {
    Sfx.init(); Sfx.click();
    if (!tutorialSeen) { afterHowto = startGame; openHow(true); } else startGame();
  }

  function openHow(first) {
    buildHow();
    $('btnHowOk').textContent = first ? 'Mengerti, Main!' : 'Tutup';
    showOverlay(el.how);
  }

  function closeHow() {
    Sfx.click();
    tutorialSeen = true; store.set('kopdes_tutorial', true);
    hideOverlay(el.how);
    const cb = afterHowto; afterHowto = null;
    if (cb) cb();
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    setPauseIcon();
    showOverlay(el.pause);
    Sfx.musicStop();
  }
  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    hideOverlay(el.pause);
    setPauseIcon();
    Sfx.musicStart();
  }
  function setPauseIcon() { el.btnPause.innerHTML = state === 'paused' ? ICON.play : ICON.pause; }

  function setMuted(m) {
    Sfx.setMuted(m);
    store.set('kopdes_muted', !!m);
    el.btnMute.innerHTML = m ? ICON.muted : ICON.sound;
    el.btnMute.setAttribute('aria-pressed', String(!!m));
    $('btnMenuMute').textContent = 'Suara: ' + (m ? 'Mati' : 'Hidup');
  }

  function setHint(t) {
    el.hint.textContent = t;
    el.hint.classList.toggle('show', !!t);
  }

  let toastTimer = 0;
  function toast(t) {
    el.toast.textContent = t;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
  }

  async function shareScore() {
    const L = LEVELS[maxLevel - 1];
    const text = 'Skorku ' + fmt(score) + ' di game Merge KOPDES Merah Putih (Game ' + gameMode + ')! Level tertinggi: ' + L.name + '. Bisa kalahkan aku?';
    const url = location.href.split('?')[0].split('#')[0];
    if (navigator.share) {
      try { await navigator.share({ title: 'Merge KOPDES Merah Putih', text, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text + ' ' + url); toast('Teks skor disalin!'); }
    catch (e) { toast(text); }
  }

  /* =====================================================================
   * Panel evolusi & tutorial
   * ===================================================================== */
  const reached = new Set();
  function buildEvo() {
    reached.clear();
    el.evo.innerHTML = '';
    LEVELS.forEach((L, i) => {
      if (i) { const a = document.createElement('span'); a.className = 'evo-arrow'; a.textContent = '›'; el.evo.appendChild(a); }
      const d = document.createElement('div');
      d.className = 'evo-item locked'; d.dataset.l = L.id; d.title = L.name;
      d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'Level ' + L.id + ': ' + L.name + ' (terkunci)');
      d.innerHTML = '<img alt="" src="' + L.img + '">';
      el.evo.appendChild(d);
    });
  }
  function updateEvo(level) {
    if (!level || reached.has(level)) return;
    reached.add(level);
    const d = el.evo.querySelector('[data-l="' + level + '"]');
    if (!d) return;
    d.classList.remove('locked');
    d.setAttribute('aria-label', 'Level ' + level + ': ' + LEVELS[level - 1].name);
    d.classList.add('unlock');
    setTimeout(() => d.classList.remove('unlock'), 700);
  }

  function buildHow() {
    const chain = $('howChain');
    chain.innerHTML = LEVELS.map((L, i) => (i ? '<span>›</span>' : '') + '<img alt="' + L.name + '" title="' + L.name + '" src="' + L.img + '">').join('');
    $('howDemo').innerHTML =
      '<img alt="" src="' + LEVELS[0].img + '"><span>+</span><img alt="" src="' + LEVELS[0].img + '"><span>=</span><img alt="" src="' + LEVELS[1].img + '">';
  }

  /* =====================================================================
   * Efek
   * ===================================================================== */
  const PALETTE = ['#D7000F', '#ffffff', '#ff5a64', '#ffd54a', '#f8b4b8'];

  function fxBurst(x, y, n, confetti) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(1.5, confetti ? 9 : 5.5);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (confetti ? 3 : 1.5),
        life: rand(0.5, confetti ? 1.4 : 0.8), max: 1, size: rand(3, confetti ? 8 : 5),
        color: PALETTE[(Math.random() * PALETTE.length) | 0], rect: !!confetti, rot: rand(0, 6.28), vr: rand(-8, 8),
      });
    }
    if (particles.length > 400) particles.splice(0, particles.length - 400);
  }
  function fxRing(x, y, r, color) { rings.push({ x, y, r, t: 0, color }); }
  function fxText(x, y, text, size, color) { texts.push({ x, y, text, size, color, t: 0 }); }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 14 * dt; p.x += p.vx * dt * 60 * 0.5; p.y += p.vy * dt * 60 * 0.5; p.rot += p.vr * dt;
    }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt / 0.45; if (rings[i].t >= 1) rings.splice(i, 1); }
    for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt / 0.9; if (texts[i].t >= 1) texts.splice(i, 1); }
    shake *= Math.pow(0.001, dt);
    if (shake < 0.2) shake = 0;
  }

  /* =====================================================================
   * Render
   * ===================================================================== */
  let sx = 1;
  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.round(r.width * dpr);
    if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round(w * H / W); }
    sx = canvas.width / W;
  }
  window.addEventListener('resize', resizeCanvas);
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas);

  function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function drawItem(level, x, y, scale, tilt, alpha) {
    const L = LEVELS[level - 1], r = L.radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    // gelembung (sesuai collider)
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, L.bubble);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = level === MAX_LEVEL ? 4 : 3;
    ctx.strokeStyle = level === MAX_LEVEL ? RED : 'rgba(255,255,255,.95)';
    ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(120,0,10,.25)';
    ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2); ctx.stroke();
    // sprite
    const img = L.image;
    if (img.complete && img.naturalWidth) {
      const ar = img.naturalWidth / img.naturalHeight;
      const diag = 2 * r * L.fit;
      const h = diag / Math.sqrt(1 + ar * ar), w = h * ar;
      ctx.rotate(tilt);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = RED; ctx.font = 'bold ' + r + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(level), 0, 0);
    }
    ctx.restore();
  }

  function strokedText(text, x, y, size, color) {
    ctx.font = '800 ' + size + 'px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 5); ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(100,0,8,.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function drawBackground() {
    ctx.fillStyle = '#fff5f3'; ctx.fillRect(0, 0, W, H);
    const zg = ctx.createLinearGradient(0, 0, 0, LINE_Y);
    zg.addColorStop(0, '#ffe3e1'); zg.addColorStop(1, '#fff0ee');
    ctx.fillStyle = zg; ctx.fillRect(LEFT, 0, RIGHT - LEFT, LINE_Y);
    ctx.strokeStyle = 'rgba(215,0,15,.05)'; ctx.lineWidth = 2;
    for (let y = LINE_Y + 30; y < FLOOR_Y; y += 60) { ctx.beginPath(); ctx.moveTo(LEFT, y); ctx.lineTo(RIGHT, y); ctx.stroke(); }
    const wg = ctx.createLinearGradient(0, 0, WALL, 0);
    wg.addColorStop(0, '#9b000a'); wg.addColorStop(1, '#e2101d');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, WALL, H);
    const wg2 = ctx.createLinearGradient(RIGHT, 0, W, 0);
    wg2.addColorStop(0, '#e2101d'); wg2.addColorStop(1, '#9b000a');
    ctx.fillStyle = wg2; ctx.fillRect(RIGHT, 0, WALL, H);
    const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
    fg.addColorStop(0, '#e2101d'); fg.addColorStop(1, '#9b000a');
    ctx.fillStyle = fg; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, FLOOR_Y, W, 3);
  }

  function drawLine() {
    const danger = dangerTime > 0;
    const pulse = danger ? 0.5 + 0.5 * Math.sin(nowSec * 14) : 0;
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = danger ? 4 : 3;
    ctx.strokeStyle = danger ? 'rgba(215,0,15,' + (0.5 + 0.5 * pulse) + ')' : 'rgba(215,0,15,.55)';
    ctx.beginPath(); ctx.moveTo(LEFT, LINE_Y); ctx.lineTo(RIGHT, LINE_Y); ctx.stroke();
    ctx.restore();
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(215,0,15,.8)';
    ctx.fillText('BATAS', LEFT + 8, LINE_Y - 4);
    if (danger) {
      ctx.textAlign = 'right';
      ctx.fillStyle = RED;
      ctx.font = '800 16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('BAHAYA! ' + Math.max(0, OVER_SECONDS - dangerTime).toFixed(1) + ' dtk', RIGHT - 8, LINE_Y - 4);
    }
  }

  function render() {
    ctx.setTransform(sx, 0, 0, sx, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawBackground();
    drawLine();

    // item yang akan dijatuhkan + garis bantu
    if (held && (state === 'playing' || state === 'paused')) {
      const L = LEVELS[held.level - 1];
      const x = clampAim(aimX);
      const t = clamp((nowSec - held.born) / 0.25, 0, 1);
      ctx.save();
      ctx.setLineDash([4, 9]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(215,0,15,.3)';
      ctx.beginPath(); ctx.moveTo(x, DROP_Y + L.radius); ctx.lineTo(x, FLOOR_Y); ctx.stroke();
      ctx.restore();
      drawItem(held.level, x, DROP_Y, 0.4 + 0.6 * easeOutBack(t), 0, 1);
    }

    for (const b of items) {
      let s = 1;
      const t = (nowSec - b.popAt) / 0.4;
      if (t >= 0 && t < 1) s = 0.55 + 0.45 * easeOutBack(t);
      drawItem(b.level, b.position.x, b.position.y, s, Math.sin(b.angle) * 0.22, 1);
    }

    for (const r of rings) {
      ctx.save();
      ctx.globalAlpha = 1 - r.t; ctx.strokeStyle = r.color; ctx.lineWidth = 6 * (1 - r.t) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * r.t), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.rect) { ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); ctx.strokeStyle = 'rgba(120,0,10,.4)'; ctx.lineWidth = 1; ctx.strokeRect(-p.size, -p.size / 2, p.size * 2, p.size); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    for (const tx of texts) {
      ctx.save();
      ctx.globalAlpha = tx.t < 0.7 ? 1 : 1 - (tx.t - 0.7) / 0.3;
      strokedText(tx.text, clamp(tx.x, 60, W - 60), tx.y - tx.t * 60, tx.size, tx.color);
      ctx.restore();
    }
    ctx.restore();
  }

  /* =====================================================================
   * Loop
   * ===================================================================== */
  let lastT = 0, acc = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    nowSec = t / 1000;
    const dt = Math.min(100, t - lastT) / 1000; lastT = t;

    if (state === 'playing') {
      acc += dt * 1000;
      let n = 0;
      while (acc >= STEP_MS && n < 5) { stepSim(); acc -= STEP_MS; n++; if (state !== 'playing') break; }
      if (n === 5) acc = 0;
      // gerak keyboard
      if (keys.left) aimX -= 320 * dt;
      if (keys.right) aimX += 320 * dt;
      if (held) aimX = clampAim(aimX);
      if (dropCd > 0) { dropCd -= dt; if (dropCd <= 0 && !held) spawnHeld(); }
    } else if (state === 'celebrating') {
      winDelay -= dt;
      if (winDelay <= 0) { state = 'celebrating-shown'; showWin(); }
    } else if (state === 'gameover') {
      overDelay -= dt;
      if (overDelay <= 0) { overDelay = 1e9; showGameOver(); }
    }
    if (state !== 'paused') updateFx(dt);
    render();
  }

  /* =====================================================================
   * Selebrasi (confetti merah-putih)
   * ===================================================================== */
  const confetti = { cv: $('confetti'), pieces: [], running: false };
  function showWin() {
    showOverlay(el.win);
    Sfx.musicStop();
    startConfetti();
  }
  function startConfetti() {
    const cv = confetti.cv, c = cv.getContext('2d');
    const w = cv.width = innerWidth, h = cv.height = innerHeight;
    confetti.pieces = [];
    for (let i = 0; i < 160; i++) {
      confetti.pieces.push({
        x: rand(0, w), y: rand(-h, 0), s: rand(6, 12), vy: rand(1.5, 4.5), vx: rand(-1, 1),
        rot: rand(0, 6.28), vr: rand(-0.15, 0.15), color: i % 2 ? '#D7000F' : '#ffffff', w: rand(0.4, 1),
      });
    }
    confetti.running = true;
    (function loop() {
      if (!confetti.running) return;
      c.clearRect(0, 0, w, h);
      for (const p of confetti.pieces) {
        p.y += p.vy; p.x += p.vx + Math.sin(p.y / 40); p.rot += p.vr;
        if (p.y > h + 20) { p.y = -20; p.x = rand(0, w); }
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, p.w);
        c.fillStyle = p.color; c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        c.strokeStyle = 'rgba(120,0,10,.5)'; c.lineWidth = 1; c.strokeRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        c.restore();
      }
      requestAnimationFrame(loop);
    })();
  }
  function continueAfterWin() {
    Sfx.click();
    confetti.running = false;
    hideOverlay(el.win);
    state = 'playing';
    Sfx.musicStart();
  }

  /* =====================================================================
   * Input
   * ===================================================================== */
  function pointerX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * W;
  }
  canvas.addEventListener('pointerdown', (e) => {
    Sfx.init();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
    aimX = pointerX(e);
  });
  canvas.addEventListener('pointermove', (e) => { aimX = pointerX(e); });
  canvas.addEventListener('pointerup', (e) => { aimX = pointerX(e); drop(); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame();
      return;
    }
    if (e.key === 'm' || e.key === 'M') { setMuted(!Sfx.isMuted()); return; }
    if (state !== 'playing') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
    else if ((e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); drop(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

  /* tombol */
  $('btnMode1').onclick = () => { Sfx.init(); Sfx.click(); selectMode(1); };
  $('btnMode2').onclick = () => { Sfx.init(); Sfx.click(); selectMode(2); };
  $('btnPlay').onclick = onPlayPressed;
  $('btnHow').onclick = () => { Sfx.init(); Sfx.click(); afterHowto = null; openHow(false); };
  $('btnHowOk').onclick = closeHow;
  $('btnMenuMute').onclick = () => { Sfx.init(); setMuted(!Sfx.isMuted()); Sfx.click(); };
  el.btnMute.onclick = () => { Sfx.init(); setMuted(!Sfx.isMuted()); Sfx.click(); };
  el.btnPause.onclick = () => { Sfx.click(); if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); };
  $('btnResume').onclick = () => { Sfx.click(); resumeGame(); };
  $('btnRestart').onclick = () => { Sfx.click(); startGame(); };
  $('btnPauseMenu').onclick = () => { Sfx.click(); toMenu(); };
  $('btnAgain').onclick = () => { Sfx.click(); startGame(); };
  $('btnShare').onclick = shareScore;
  $('btnOverMenu').onclick = () => { Sfx.click(); toMenu(); };
  $('btnContinue').onclick = continueAfterWin;

  /* =====================================================================
   * Init
   * ===================================================================== */
  function init() {
    setMuted(store.get('kopdes_muted', false));
    el.best.textContent = fmt(best);
    $('menuBest').textContent = fmt(best);
    selectMode(store.get('kopdes_mode', 1));
    setPauseIcon();
    resizeCanvas();
    requestAnimationFrame(frame);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* PWA opsional */ });
    }
  }
  init();

  // Hook untuk pengujian otomatis (hanya aktif dengan ?debug)
  if (/[?&]debug\b/.test(location.search)) {
    window.__game = {
      get LEVELS() { return LEVELS; },
      LEVELS_BY_MODE, LINE_Y, FLOOR_Y, LEFT, RIGHT, DROP_Y, engine,
      get mode() { return gameMode; },
      get state() { return state; }, get score() { return score; }, get best() { return best; },
      get items() { return items; }, get held() { return held; }, get next() { return nextLevel; },
      get dangerTime() { return dangerTime; }, get won() { return won; }, get maxLevel() { return maxLevel; },
      selectMode, start: startGame, drop,
      setAim(x) { aimX = x; },
      add(level, x, y) { return addItem(level, x, y, false); },
      step(n) { for (let i = 0; i < (n || 1); i++) stepSim(); },
      clear() { items.slice().forEach(removeItem); },
      pause: pauseGame, resume: resumeGame,
    };
  }
})();
