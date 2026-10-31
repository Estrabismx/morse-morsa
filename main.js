/* ==========================================================
   Morse Morsa — traductor, juegos y claves de sustitución
   ========================================================== */

'use strict';

/* ---------- Utilidades ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('morsa:' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('morsa:' + key, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ }
  },
};

function copyText(text, btn) {
  const done = (ok) => {
    const prev = btn.textContent;
    btn.textContent = ok ? '¡Copiado!' : 'No se pudo copiar';
    setTimeout(() => { btn.textContent = prev; }, 1200);
  };
  if (!text) { done(false); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    done(ok);
  }
}

/* ---------- Datos morse (español latino) ---------- */
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', 'Ñ': '--.--', O: '---',
  P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--',
  X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  CH: '----', 'Á': '.--.-', 'É': '..-..', 'Ó': '---.', 'Ü': '..--.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '¿': '..-.-', '!': '-.-.--', '¡': '--...-',
  ':': '---...', ';': '-.-.-.', "'": '.----.', '"': '.-..-.', '(': '-.--.', ')': '-.--.-',
  '=': '-...-', '+': '.-.-.', '-': '-....-', '/': '-..-.', '@': '.--.-.', '&': '.-...',
};
const REVERSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const LETTERS = [...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'];
const NUMBERS = [...'0123456789'];
const SIGNS = ['.', ',', '?', '¿', '!', '¡', ':', ';', '(', ')', '=', '+', '-', '/', '@', 'CH', 'Á', 'É', 'Ó', 'Ü'];
const POOLS = { letras: LETTERS, numeros: NUMBERS, signos: SIGNS, todo: [...LETTERS, ...NUMBERS, ...SIGNS] };

const PALABRAS = ['SOL', 'MAR', 'LUZ', 'PAN', 'RIO', 'OLA', 'PAZ', 'SOS', 'OSO', 'LUNA', 'CASA', 'FARO', 'NIDO',
  'ROCA', 'MAPA', 'FUEGO', 'CAMPO', 'MONTE', 'NIÑO', 'RADIO', 'ARBOL', 'NUBE', 'TREN', 'VELA', 'PERRO', 'GATO',
  'MORSA', 'PUNTO', 'RAYA', 'SEÑAL'];
const FRASES = ['HOLA MUNDO', 'SIEMPRE LISTOS', 'BUEN CAMINO', 'TODO BIEN', 'NOS VEMOS', 'VEN PRONTO',
  'MENSAJE RECIBIDO', 'LUZ VERDE', 'CAMBIO Y FUERA', 'FELIZ DIA', 'LA MORSA NADA', 'SOS EN EL MAR'];
const PALABRAS_CORTAS = ['SOL', 'MAR', 'LUZ', 'PAN', 'RIO', 'OLA', 'PAZ', 'SOS', 'OSO', 'SI', 'NO', 'UNO', 'DOS', 'MES', 'RED', 'TE'];

const pretty = (code) => code.replace(/\./g, '·').replace(/-/g, '—');
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normAnswer = (s) => stripAccents(s.toUpperCase().replace(/Ñ/g, '\u0001')).replace(/\u0001/g, 'Ñ').replace(/\s+/g, ' ').trim();

/** Convierte texto a una lista de elementos {label, code} o {space:true}. */
function textToItems(text, useCH = false) {
  const items = [];
  let unknown = 0;
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  words.forEach((word) => {
    const chars = [...word];
    const wordItems = [];
    for (let i = 0; i < chars.length; i++) {
      let c = chars[i];
      if (useCH && c === 'C' && chars[i + 1] === 'H') {
        wordItems.push({ label: 'CH', code: MORSE.CH });
        i++;
        continue;
      }
      let code = MORSE[c];
      if (!code) {
        const base = stripAccents(c);
        if (MORSE[base]) { c = base; code = MORSE[base]; }
      }
      if (code) wordItems.push({ label: c, code });
      else unknown++;
    }
    if (wordItems.length) {
      if (items.length) items.push({ space: true });
      items.push(...wordItems);
    }
  });
  return { items, unknown };
}

/** Unifica los caracteres de punto y raya, incluidos los que los teclados autocorrigen (… — –). */
const normMorse = (s) => s.replace(/…/g, '...').replace(/[•·∙●]/g, '.').replace(/[−—–_‒]/g, '-');

/** true si el texto solo contiene puntos, rayas y separadores. */
const looksLikeMorse = (s) => /[.\-·•∙●−—–_‒…]/.test(s) && /^[\s.\-·•∙●−—–_‒…/|]+$/.test(s);

/** Convierte morse a lista de elementos. Acepta · • — – _ y separa palabras con / | o doble espacio. */
function morseToItems(str) {
  const clean = normMorse(str).trim();
  const items = [];
  let unknown = 0;
  if (!clean) return { items, unknown };
  clean.split(/\s*[/|]\s*|\s{2,}/).forEach((word) => {
    const codes = word.trim().split(/\s+/).filter(Boolean);
    if (!codes.length) return;
    if (items.length) items.push({ space: true });
    codes.forEach((code) => {
      const label = /^[.-]+$/.test(code) ? REVERSE[code] : undefined;
      if (!label) unknown++;
      items.push({ label: label || '#', code });
    });
  });
  return { items, unknown };
}

const itemsToMorse = (items) => items.map((it) => (it.space ? '/' : it.code)).join(' ');
const itemsToText = (items) => items.map((it) => (it.space ? ' ' : it.label)).join('');

/* ---------- Ajustes de reproducción ---------- */
const settings = Object.assign({ luz: true, sonido: true, full: false, wpm: 12, freq: 600, vol: 60 }, store.get('settings', {}));

function initSettings() {
  const bind = (id, key, outId) => {
    const el = $('#' + id);
    if (el.type === 'checkbox') el.checked = settings[key];
    else el.value = settings[key];
    if (outId) $('#' + outId).textContent = settings[key];
    el.addEventListener('input', () => {
      settings[key] = el.type === 'checkbox' ? el.checked : Number(el.value);
      if (outId) $('#' + outId).textContent = settings[key];
      store.set('settings', settings);
      if (settings.luz || settings.sonido) $('#console-warning').hidden = true;
    });
  };
  bind('opt-luz', 'luz');
  bind('opt-sonido', 'sonido');
  bind('opt-full', 'full');
  bind('opt-wpm', 'wpm', 'out-wpm');
  bind('opt-freq', 'freq', 'out-freq');
  bind('opt-vol', 'vol', 'out-vol');
}

const hasOutput = () => settings.luz || settings.sonido;

/* ---------- Reproductor de luz y sonido ---------- */
const Player = {
  ctx: null,
  osc: null,
  gain: null,
  key: null,
  timers: [],
  resolve: null,

  audio() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  setLight(on) {
    $$('.lamp').forEach((l) => l.classList.toggle('on', on));
    $('#flash-overlay').classList.toggle('on', on && settings.full);
  },

  stop() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.osc) {
      try {
        this.gain.gain.cancelScheduledValues(0);
        this.gain.gain.value = 0;
        this.osc.stop();
      } catch (e) { /* ya detenido */ }
      this.osc = null;
    }
    this.setLight(false);
    if (this.resolve) { const r = this.resolve; this.resolve = null; r(false); }
  },

  /**
   * Reproduce una lista de elementos morse con la luz y/o sonido activados.
   * Devuelve una promesa que se resuelve en true si terminó, false si se interrumpió.
   */
  play(items, { onMark, quiet } = {}) {
    this.stop();
    if (!hasOutput()) {
      if (!quiet) $('#console-warning').hidden = false;
      return Promise.resolve(false);
    }
    const u = 1200 / settings.wpm;
    const tones = [];
    const marks = [];
    let t = 0;
    let end = 0;
    items.forEach((it, i) => {
      marks.push({ t, i });
      if (it.space) { t += 4 * u; return; }
      [...it.code].forEach((sym, j) => {
        const d = sym === '.' ? u : 3 * u;
        tones.push({ start: t, dur: d });
        t += d;
        end = t;
        if (j < it.code.length - 1) t += u;
      });
      t += 3 * u;
    });

    const lead = 60;
    if (settings.sonido) {
      const ctx = this.audio();
      if (ctx) {
        const vol = (settings.vol / 100) * 0.5;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = settings.freq;
        gain.gain.value = 0;
        osc.connect(gain).connect(ctx.destination);
        const base = ctx.currentTime + lead / 1000;
        tones.forEach(({ start, dur }) => {
          const s = base + start / 1000;
          const e = s + dur / 1000;
          gain.gain.setValueAtTime(0, s);
          gain.gain.linearRampToValueAtTime(vol, s + 0.005);
          gain.gain.setValueAtTime(vol, e - 0.005);
          gain.gain.linearRampToValueAtTime(0, e);
        });
        osc.start(base);
        osc.stop(base + end / 1000 + 0.1);
        this.osc = osc;
        this.gain = gain;
      }
    }
    if (settings.luz) {
      tones.forEach(({ start, dur }) => {
        this.timers.push(setTimeout(() => this.setLight(true), lead + start));
        this.timers.push(setTimeout(() => this.setLight(false), lead + start + dur));
      });
    }
    if (onMark) marks.forEach(({ t: mt, i }) => this.timers.push(setTimeout(() => onMark(i), lead + mt)));

    return new Promise((resolve) => {
      this.resolve = resolve;
      this.timers.push(setTimeout(() => {
        this.timers = [];
        this.osc = null;
        this.setLight(false);
        this.resolve = null;
        resolve(true);
      }, lead + end + 80));
    });
  },

  /* Tono continuo para el manipulador del telegrafista */
  toneOn() {
    const ctx = this.audio();
    if (!ctx || this.key) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = settings.freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime((settings.vol / 100) * 0.5, ctx.currentTime + 0.005);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    this.key = { osc, gain };
  },
  toneOff() {
    if (!this.key || !this.ctx) return;
    const { osc, gain } = this.key;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.008);
    osc.stop(now + 0.02);
    this.key = null;
  },
};

/* ---------- Manipulador (tecla telegráfica) ---------- */
/**
 * Mide cuánto se mantiene presionada una tecla: corta = punto, larga = raya.
 * Avisa con onLetter tras una pausa de 3 tiempos y con onWord tras 7 tiempos.
 * Mientras se presiona, suena el tono y/o se enciende la luz según el panel.
 */
function createKeyer({ key, unit, onSymbol, onLetter, onWord, enabled = () => true }) {
  let down = false;
  let t0 = 0;
  let letterTimer;
  let wordTimer;
  const off = () => {
    key.classList.remove('down');
    Player.toneOff();
    Player.setLight(false);
  };
  const keyer = {
    press() {
      if (down || !enabled()) return;
      down = true;
      clearTimeout(letterTimer);
      clearTimeout(wordTimer);
      t0 = performance.now();
      key.classList.add('down');
      if (settings.sonido) Player.toneOn();
      if (settings.luz) Player.setLight(true);
    },
    release() {
      if (!down) return;
      down = false;
      const d = performance.now() - t0;
      off();
      const u = unit();
      onSymbol(d < 2 * u ? '.' : '-');
      letterTimer = setTimeout(onLetter, 3 * u);
      wordTimer = setTimeout(onWord, 7 * u);
    },
    cancel() {
      clearTimeout(letterTimer);
      clearTimeout(wordTimer);
      if (down) { down = false; off(); }
    },
  };
  key.addEventListener('pointerdown', (e) => { e.preventDefault(); key.setPointerCapture(e.pointerId); keyer.press(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => key.addEventListener(ev, () => keyer.release()));
  key.addEventListener('contextmenu', (e) => e.preventDefault());
  return keyer;
}

/* ---------- Pestañas ---------- */
function initTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      Player.stop();
      Games.close();
      $$('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      $$('.view').forEach((v) => v.classList.toggle('active', v.id === tab.dataset.tab));
    });
  });
}

/* ---------- Traductor ---------- */
const MENSAJE_INICIAL = 'Hola avanzada Sin Nombre del GGSSA';
const MENSAJE_SECRETO = 'Saluden a Ramon de mi parte';

const Translator = {
  dir: 'es2m',
  items: [],

  init() {
    this.input = $('#tr-input');
    this.output = $('#tr-output');
    this.input.value = MENSAJE_INICIAL;
    this.input.addEventListener('focus', () => this.clearInitial());
    this.initSecret();
    this.initKeyer();
    this.input.addEventListener('input', () => {
      // Si se escribe morse estando en modo español, se cambia de dirección automáticamente.
      if (this.dir === 'es2m' && looksLikeMorse(this.input.value)) {
        this.dir = 'm2es';
        this.applyDir();
        $('#tr-hint').textContent = 'Detecté código morse: cambié a Morse → Español.';
        return;
      }
      this.update();
    });
    $('#opt-ch').addEventListener('change', () => this.update());
    $('#btn-swap').addEventListener('click', () => this.swap());
    $('#btn-play').addEventListener('click', () => this.play());
    $('#btn-stop').addEventListener('click', () => { Player.stop(); this.renderTicker(); });
    $('#btn-copy').addEventListener('click', (e) => copyText(this.output.value, e.currentTarget));
    $('#btn-clear').addEventListener('click', () => { this.input.value = ''; this.update(); this.input.focus(); });
    $$('#morse-pad [data-ins]').forEach((b) => b.addEventListener('click', () => {
      this.clearInitial();
      insertAtCursor(this.input, b.dataset.ins);
      this.update();
    }));
    this.applyDir();
  },

  applyDir() {
    const es = this.dir === 'es2m';
    $('#lbl-from').textContent = es ? 'Español' : 'Morse';
    $('#lbl-to').textContent = es ? 'Morse' : 'Español';
    $('#tr-input-label').textContent = es ? 'Texto en español' : 'Código morse';
    $('#tr-output-label').textContent = es ? 'Código morse' : 'Texto en español';
    this.input.placeholder = es ? 'Escribe tu mensaje… ej: Hola, ¿cómo estás?' : 'Ej: .... --- .-.. .- / -- ..- -. -.. ---';
    $('#morse-pad').hidden = es;
    $('#ch-option').hidden = !es;
    this.update();
  },

  swap() {
    Player.stop();
    const out = this.output.value;
    this.dir = this.dir === 'es2m' ? 'm2es' : 'es2m';
    this.input.value = out;
    this.applyDir();
  },

  update() {
    const val = this.input.value;
    const res = this.dir === 'es2m' ? textToItems(val, $('#opt-ch').checked) : morseToItems(val);
    this.items = res.items;
    this.output.value = this.dir === 'es2m' ? itemsToMorse(res.items) : itemsToText(res.items);
    const hint = $('#tr-hint');
    if (res.unknown) {
      hint.textContent = this.dir === 'es2m'
        ? `Se omitieron ${res.unknown} carácter(es) sin equivalente en morse.`
        : `${res.unknown} código(s) no reconocido(s), marcados con «#».`;
    } else {
      hint.textContent = 'Letras separadas por espacio y palabras por « / ».';
    }
    this.renderTicker();
  },

  /* El mensaje inicial solo se muestra hasta que se empieza a usar la caja de texto. */
  pristine: true,
  clearInitial() {
    if (!this.pristine) return;
    this.pristine = false;
    Player.stop();
    this.input.value = '';
    this.update();
  },

  /* Dictado con manipulador: escribe el morse en la entrada y lo traduce al momento. */
  initKeyer() {
    const wpm = $('#tr-wpm');
    wpm.addEventListener('input', () => { $('#tr-wpm-out').textContent = wpm.value; });
    let inLetter = false;
    const write = (fn) => {
      this.input.value = fn(this.input.value);
      this.input.scrollTop = this.input.scrollHeight;
      this.update();
    };
    createKeyer({
      key: $('#tr-key'),
      unit: () => 1200 / Number(wpm.value),
      onSymbol: (s) => {
        this.clearInitial();
        if (this.dir === 'es2m') {
          // Se pasa a Morse → Español conservando lo escrito, ya convertido a morse.
          this.swap();
          inLetter = false;
        }
        write((v) => ((!inLetter && v && !/\s$/.test(v)) ? v + ' ' : v) + s);
        inLetter = true;
      },
      onLetter: () => {
        inLetter = false;
        write((v) => (v && !/\s$/.test(v) ? v + ' ' : v));
      },
      onWord: () => write((v) => (v.trim() && !/\/\s*$/.test(v) ? v.trimEnd() + ' / ' : v)),
    });
  },

  /* Mensaje secreto: tocar 3 veces seguidas la lámpara del traductor. */
  initSecret() {
    let taps = 0;
    let tapTimer;
    $('#tr-lamp').addEventListener('click', () => {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { taps = 0; }, 700);
      if (taps < 3) return;
      taps = 0;
      this.playSecret();
    });
  },

  async playSecret() {
    const msg = $('#secret-msg');
    const items = textToItems(MENSAJE_SECRETO).items;
    clearTimeout(this.secretTimer);
    msg.textContent = `«${MENSAJE_SECRETO}»`;
    msg.hidden = false;
    this.renderTicker(-1, items);
    await Player.play(items, { onMark: (i) => this.renderTicker(i, items) });
    this.renderTicker();
    this.secretTimer = setTimeout(() => { msg.hidden = true; }, 4000);
  },

  renderTicker(now = -1, items = this.items) {
    const ticker = $('#ticker');
    ticker.innerHTML = '';
    items.forEach((it, i) => {
      const span = document.createElement('span');
      if (it.space) {
        span.className = 'tk-space';
      } else {
        span.className = 'tk' + (i === now ? ' now' : i < now ? ' done' : '');
        const b = document.createElement('b');
        b.textContent = it.label;
        const s = document.createElement('small');
        s.textContent = pretty(it.code);
        span.append(b, s);
      }
      ticker.appendChild(span);
    });
  },

  async play() {
    if (!this.items.length) return;
    await Player.play(this.items, { onMark: (i) => this.renderTicker(i) });
    this.renderTicker();
  },
};

function insertAtCursor(input, ins) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  if (ins === 'back') {
    const cut = start === end ? Math.max(0, start - 1) : start;
    input.value = input.value.slice(0, cut) + input.value.slice(end);
    input.selectionStart = input.selectionEnd = cut;
  } else {
    input.value = input.value.slice(0, start) + ins + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start + ins.length;
  }
  input.focus();
}

/* ---------- Alfabeto ---------- */
function initAlphabet() {
  const fill = (id, keys) => {
    const grid = $('#' + id);
    keys.forEach((k) => {
      const card = document.createElement('button');
      card.className = 'alpha-card';
      card.innerHTML = '<b></b><span></span>';
      card.querySelector('b').textContent = k;
      card.querySelector('span').textContent = pretty(MORSE[k]);
      card.setAttribute('aria-label', `${k}: ${MORSE[k]}`);
      card.addEventListener('click', async () => {
        $$('.alpha-card.playing').forEach((c) => c.classList.remove('playing'));
        card.classList.add('playing');
        await Player.play([{ label: k, code: MORSE[k] }]);
        card.classList.remove('playing');
      });
      grid.appendChild(card);
    });
  };
  fill('grid-letras', LETTERS);
  fill('grid-numeros', NUMBERS);
  fill('grid-signos', SIGNS);
}

/* ==========================================================
   Juegos
   ========================================================== */
const Games = {
  current: null,
  registry: {},

  init() {
    $$('.game-card').forEach((c) => c.addEventListener('click', () => this.open(c.dataset.game)));
    $$('.btn-back').forEach((b) => b.addEventListener('click', () => this.close()));
    Object.values(this.registry).forEach((g) => g.init && g.init());
    this.renderBests();
  },

  open(name) {
    this.current = name;
    $('#games-menu').hidden = true;
    $$('.game').forEach((g) => { g.hidden = g.id !== 'game-' + name; });
    setStage(name, 'setup');
    const game = this.registry[name];
    if (game.onOpen) game.onOpen();
  },

  close() {
    if (this.current && this.registry[this.current].cleanup) this.registry[this.current].cleanup();
    Player.stop();
    this.current = null;
    $$('.game').forEach((g) => { g.hidden = true; });
    $('#games-menu').hidden = false;
    this.renderBests();
  },

  renderBests() {
    const b = store.get('bests', {});
    const txt = {
      quiz: b.quiz != null ? `Récord: ${b.quiz} pts` : '',
      escucha: b.escucha != null ? `Récord: ${b.escucha} pts` : '',
      telegrafista: b.telegrafista != null ? `Récord: ${b.telegrafista} palabras seguidas` : '',
      contrarreloj: b.contrarreloj != null ? `Récord: ${b.contrarreloj} aciertos` : '',
      memoria: b.memoria ? Object.entries(b.memoria).map(([p, m]) => `${p}p: ${m} mov.`).join(' · ') : '',
    };
    $$('.gc-best').forEach((el) => { el.textContent = txt[el.dataset.best] || ''; });
  },

  /** Guarda un récord si es mejor. Devuelve true si es nuevo récord. */
  saveBest(key, value, lowerIsBetter = false) {
    const b = store.get('bests', {});
    const prev = b[key];
    const better = prev == null || (lowerIsBetter ? value < prev : value > prev);
    if (better) { b[key] = value; store.set('bests', b); }
    return better;
  },
};

function setStage(game, stage) {
  const panel = $('#game-' + game);
  $$('[data-stage]', panel).forEach((el) => { el.hidden = el.dataset.stage !== stage; });
}

function showEnd(game, html, onRetry) {
  const end = $(`#game-${game} .game-end`);
  end.innerHTML = html + '<div class="actions"><button class="btn btn-primary" data-act="retry">Jugar de nuevo</button><button class="btn" data-act="setup">Cambiar opciones</button></div>';
  end.querySelector('[data-act="retry"]').addEventListener('click', onRetry);
  end.querySelector('[data-act="setup"]').addEventListener('click', () => setStage(game, 'setup'));
  setStage(game, 'end');
}

function setFeedback(el, text, ok) {
  el.textContent = text;
  el.className = 'feedback' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/* Construye botones de opción múltiple */
function renderOptions(container, options, correct, labelFn, onAnswer) {
  container.innerHTML = '';
  options.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.textContent = labelFn(opt);
    b.addEventListener('click', () => {
      $$('.option', container).forEach((o) => { o.disabled = true; });
      const ok = opt === correct;
      b.classList.add(ok ? 'correct' : 'wrong');
      if (!ok) {
        const right = $$('.option', container)[options.indexOf(correct)];
        if (right) right.classList.add('correct');
      }
      onAnswer(ok);
    });
    container.appendChild(b);
  });
}

/* ---------- Quiz ---------- */
Games.registry.quiz = {
  total: 10,
  init() {
    $('#quiz-start').addEventListener('click', () => this.start());
    $('#quiz-listen').addEventListener('click', () => {
      if (this.q) Player.play([{ label: this.q.answer, code: MORSE[this.q.answer] }]);
    });
  },
  start() {
    this.dirMode = $('#quiz-dir').value;
    this.pool = POOLS[$('#quiz-pool').value];
    this.n = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    setStage('quiz', 'play');
    this.next();
  },
  next() {
    if (this.n >= this.total) { this.end(); return; }
    this.n++;
    const answer = pick(this.pool);
    const dir = this.dirMode === 'mix' ? pick(['m2l', 'l2m']) : this.dirMode;
    const options = shuffle([answer, ...sample(this.pool.filter((x) => x !== answer), 3)]);
    this.q = { answer, dir };
    $('#quiz-n').textContent = this.n;
    $('#quiz-score').textContent = this.score;
    $('#quiz-streak').textContent = this.streak;
    $('#quiz-prompt').textContent = dir === 'm2l' ? pretty(MORSE[answer]) : answer;
    $('#quiz-listen').hidden = dir !== 'm2l';
    setFeedback($('#quiz-feedback'), dir === 'm2l' ? '¿Qué carácter es?' : '¿Cuál es su código?');
    renderOptions($('#quiz-options'), options, answer,
      (o) => (dir === 'm2l' ? o : pretty(MORSE[o])),
      (ok) => this.answer(ok));
  },
  answer(ok) {
    const { answer } = this.q;
    if (ok) {
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      const pts = 10 + Math.min(this.streak - 1, 5) * 2;
      this.score += pts;
      setFeedback($('#quiz-feedback'), `¡Correcto! +${pts}${this.streak > 1 ? ` (racha x${this.streak})` : ''}`, true);
    } else {
      this.streak = 0;
      setFeedback($('#quiz-feedback'), `Era ${answer} = ${pretty(MORSE[answer])}`, false);
    }
    $('#quiz-score').textContent = this.score;
    $('#quiz-streak').textContent = this.streak;
    this.timer = setTimeout(() => this.next(), ok ? 1000 : 1800);
  },
  end() {
    const rec = Games.saveBest('quiz', this.score);
    showEnd('quiz', `<p>Puntaje final</p><p class="big-score">${this.score}</p><p>Mejor racha: ${this.maxStreak} 🔥</p>${rec ? '<p class="feedback ok">¡Nuevo récord!</p>' : ''}`, () => this.start());
  },
  cleanup() { clearTimeout(this.timer); this.q = null; },
};

/* ---------- Escucha y escribe ---------- */
Games.registry.escucha = {
  total: 10,
  init() {
    $('#esc-start').addEventListener('click', () => this.start());
    $('#esc-repeat').addEventListener('click', () => this.playTarget());
    $('#esc-hint').addEventListener('click', () => {
      if (this.locked) return;
      this.hinted = true;
      $('#esc-hintcode').textContent = itemsToMorse(this.items).split(' ').map((c) => (c === '/' ? '/' : pretty(c))).join('  ');
    });
    $('#esc-skip').addEventListener('click', () => { if (!this.locked) this.reveal(false, 'Saltada.'); });
    $('#esc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.locked) return;
      const val = normAnswer($('#esc-input').value);
      if (!val) return;
      if (val === normAnswer(this.target)) this.reveal(true);
      else this.reveal(false, 'No era eso.');
    });
  },
  start() {
    this.level = $('#esc-level').value;
    this.n = 0;
    this.score = 0;
    setStage('escucha', 'play');
    this.next();
  },
  next() {
    if (this.n >= this.total) { this.end(); return; }
    this.n++;
    const list = this.level === 'letras' ? LETTERS : this.level === 'palabras' ? PALABRAS : FRASES;
    let t;
    do { t = pick(list); } while (t === this.target && list.length > 1);
    this.target = t;
    this.items = textToItems(t).items;
    this.hinted = false;
    this.locked = false;
    $('#esc-n').textContent = this.n;
    $('#esc-score').textContent = this.score;
    $('#esc-hintcode').textContent = '¿Qué dice el mensaje?';
    $('#esc-input').value = '';
    $('#esc-input').disabled = false;
    $('#esc-input').focus();
    setFeedback($('#esc-feedback'), '');
    this.playTarget();
  },
  playTarget() { Player.play(this.items); },
  reveal(ok, msg) {
    this.locked = true;
    Player.stop();
    $('#esc-input').disabled = true;
    if (ok) {
      const pts = this.hinted ? 5 : 10;
      this.score += pts;
      setFeedback($('#esc-feedback'), `¡Correcto! +${pts}`, true);
    } else {
      setFeedback($('#esc-feedback'), `${msg} Era «${this.target}»: ${itemsToMorse(this.items)}`, false);
    }
    $('#esc-score').textContent = this.score;
    this.timer = setTimeout(() => this.next(), ok ? 1300 : 2800);
  },
  end() {
    const rec = Games.saveBest('escucha', this.score);
    showEnd('escucha', `<p>Puntaje final</p><p class="big-score">${this.score}</p><p>de ${this.total * 10} posibles</p>${rec ? '<p class="feedback ok">¡Nuevo récord!</p>' : ''}`, () => this.start());
  },
  cleanup() { clearTimeout(this.timer); },
};

/* ---------- Telegrafista ---------- */
Games.registry.telegrafista = {
  code: '',
  text: '',
  init() {
    this.keyer = createKeyer({
      key: $('#tg-key'),
      unit: () => 1200 / Number($('#tg-wpm').value),
      enabled: () => !this.locked,
      onSymbol: (s) => { this.code += s; this.render(); },
      onLetter: () => this.commitLetter(),
      onWord: () => this.addSpace(),
    });

    const active = (e) => Games.current === 'telegrafista' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || !active(e)) return;
      e.preventDefault();
      if (!e.repeat) this.keyer.press();
    });
    document.addEventListener('keyup', (e) => {
      if (e.code !== 'Space' || !active(e)) return;
      e.preventDefault();
      this.keyer.release();
    });

    $('#tg-wpm').addEventListener('input', (e) => { $('#tg-wpm-out').textContent = e.target.value; });
    $('#tg-mode').addEventListener('change', () => this.reset());
    $('#tg-space').addEventListener('click', () => { this.commitLetter(); this.addSpace(); });
    $('#tg-back').addEventListener('click', () => {
      if (this.code) this.code = '';
      else this.text = [...this.text.trimEnd()].slice(0, -1).join('');
      this.render();
    });
    $('#tg-clear').addEventListener('click', () => { this.code = ''; this.text = ''; this.render(); });
    $('#tg-skip').addEventListener('click', () => { this.streak = 0; this.newWord(); });
  },
  onOpen() { this.reset(); },
  reset() {
    this.cleanup();
    this.code = '';
    this.text = '';
    this.done = 0;
    this.streak = 0;
    const reto = $('#tg-mode').value === 'reto';
    $('#tg-target').hidden = !reto;
    $('#tg-skip').hidden = !reto;
    if (reto) this.newWord();
    this.render();
  },
  newWord() {
    let w;
    do { w = pick(PALABRAS); } while (w === this.word);
    this.word = w;
    this.code = '';
    this.text = '';
    $('#tg-word').textContent = w;
    $('#tg-done').textContent = this.done;
    this.render();
  },
  commitLetter() {
    if (!this.code) return;
    this.text += REVERSE[this.code] || '#';
    this.code = '';
    this.render();
    this.check();
  },
  addSpace() {
    if (this.text && !this.text.endsWith(' ') && $('#tg-mode').value === 'libre') {
      this.text += ' ';
      this.render();
    }
  },
  check() {
    if ($('#tg-mode').value !== 'reto') return;
    if (this.text.replace(/\s+/g, '') === this.word) {
      this.done++;
      this.streak++;
      Games.saveBest('telegrafista', this.streak);
      $('#tg-done').textContent = this.done;
      $('#tg-text').classList.add('success');
      this.locked = true;
      this.timer = setTimeout(() => {
        $('#tg-text').classList.remove('success');
        this.locked = false;
        this.newWord();
      }, 1100);
    }
  },
  render() {
    $('#tg-current').textContent = this.code ? pretty(this.code) : ' ';
    $('#tg-text').textContent = this.text;
  },
  cleanup() {
    this.keyer.cancel();
    clearTimeout(this.timer);
    this.locked = false;
    $('#tg-text').classList.remove('success');
  },
};

/* ---------- Contrarreloj ---------- */
Games.registry.contrarreloj = {
  duration: 60,
  init() {
    $('#cr-start').addEventListener('click', () => this.start());
    const input = $('#cr-input');
    input.addEventListener('input', () => this.onInput());
    $('#cr-form').addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
    $$('#cr-pad [data-ins]').forEach((b) => b.addEventListener('click', () => { insertAtCursor(input, b.dataset.ins); this.onInput(); }));
  },
  start() {
    this.mode = $('#cr-mode').value;
    this.score = 0;
    this.errors = 0;
    this.current = null;
    setStage('contrarreloj', 'play');
    $('#cr-pad').hidden = this.mode !== 'l2m';
    const input = $('#cr-input');
    input.placeholder = this.mode === 'm2l' ? 'Letra' : '· y —';
    input.maxLength = this.mode === 'm2l' ? 1 : 8;
    input.disabled = false;
    this.endAt = performance.now() + this.duration * 1000;
    this.next();
    this.tick();
    input.focus();
  },
  tick() {
    const left = Math.max(0, this.endAt - performance.now());
    $('#cr-time').textContent = Math.ceil(left / 1000);
    $('#cr-bar').style.transform = `scaleX(${left / (this.duration * 1000)})`;
    if (left <= 0) { this.end(); return; }
    this.raf = requestAnimationFrame(() => this.tick());
  },
  next() {
    let c;
    do { c = pick(LETTERS); } while (c === this.current);
    this.current = c;
    $('#cr-prompt').textContent = this.mode === 'm2l' ? pretty(MORSE[c]) : c;
    $('#cr-input').value = '';
    $('#cr-score').textContent = this.score;
    $('#cr-errors').textContent = this.errors;
  },
  value() {
    const v = $('#cr-input').value;
    return this.mode === 'm2l' ? normAnswer(v) : normMorse(v).replace(/\s/g, '');
  },
  target() { return this.mode === 'm2l' ? this.current : MORSE[this.current]; },
  onInput() {
    const v = this.value();
    if (!v) return;
    if (v === this.target()) { this.score++; this.next(); return; }
    if (this.mode === 'm2l') this.fail();
  },
  submit() {
    const v = this.value();
    if (!v) return;
    if (v === this.target()) { this.score++; this.next(); } else this.fail();
  },
  fail() {
    this.errors++;
    $('#cr-errors').textContent = this.errors;
    shake($('#cr-input'));
    $('#cr-input').value = '';
  },
  end() {
    cancelAnimationFrame(this.raf);
    $('#cr-input').disabled = true;
    const rec = Games.saveBest('contrarreloj', this.score);
    showEnd('contrarreloj', `<p>Aciertos en ${this.duration} s</p><p class="big-score">${this.score}</p><p>Errores: ${this.errors}</p>${rec ? '<p class="feedback ok">¡Nuevo récord!</p>' : ''}`, () => this.start());
  },
  cleanup() { cancelAnimationFrame(this.raf); },
};

/* ---------- Memoria ---------- */
Games.registry.memoria = {
  init() { $('#mem-start').addEventListener('click', () => this.start()); },
  start() {
    this.cleanup();
    this.pairs = Number($('#mem-pairs').value);
    this.moves = 0;
    this.found = 0;
    this.open = [];
    this.lock = false;
    this.t0 = null;
    const letters = sample(LETTERS, this.pairs);
    const cards = shuffle(letters.flatMap((l) => [{ l, type: 'letter' }, { l, type: 'code' }]));
    const grid = $('#mem-grid');
    grid.innerHTML = '';
    cards.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'mem-card ' + c.type;
      b.dataset.l = c.l;
      b.textContent = c.type === 'letter' ? c.l : pretty(MORSE[c.l]);
      b.setAttribute('aria-label', 'Carta oculta');
      b.addEventListener('click', () => this.flip(b));
      grid.appendChild(b);
    });
    this.updateBar();
    setStage('memoria', 'play');
    this.clock = setInterval(() => this.updateBar(), 500);
  },
  flip(card) {
    if (this.lock || card.classList.contains('up') || card.classList.contains('done')) return;
    if (!this.t0) this.t0 = performance.now();
    card.classList.add('up');
    card.setAttribute('aria-label', card.textContent);
    this.open.push(card);
    if (this.open.length < 2) return;
    this.moves++;
    const [a, b] = this.open;
    this.open = [];
    if (a.dataset.l === b.dataset.l && a.classList.contains('letter') !== b.classList.contains('letter')) {
      [a, b].forEach((c) => { c.classList.remove('up'); c.classList.add('done'); });
      this.found++;
      Player.play([{ label: a.dataset.l, code: MORSE[a.dataset.l] }], { quiet: true });
      if (this.found === this.pairs) setTimeout(() => this.end(), 600);
    } else {
      this.lock = true;
      [a, b].forEach((c) => c.classList.add('miss'));
      this.timer = setTimeout(() => {
        [a, b].forEach((c) => { c.classList.remove('up', 'miss'); c.setAttribute('aria-label', 'Carta oculta'); });
        this.lock = false;
      }, 900);
    }
    this.updateBar();
  },
  seconds() { return this.t0 ? Math.floor((performance.now() - this.t0) / 1000) : 0; },
  updateBar() {
    $('#mem-moves').textContent = this.moves;
    $('#mem-found').textContent = `${this.found}/${this.pairs}`;
    $('#mem-time').textContent = this.seconds();
  },
  end() {
    clearInterval(this.clock);
    const secs = this.seconds();
    const bests = store.get('bests', {});
    const mem = bests.memoria || {};
    const rec = mem[this.pairs] == null || this.moves < mem[this.pairs];
    if (rec) { mem[this.pairs] = this.moves; bests.memoria = mem; store.set('bests', bests); }
    showEnd('memoria', `<p>¡Completaste ${this.pairs} parejas!</p><p class="big-score">${this.moves} mov.</p><p>Tiempo: ${secs} s</p>${rec ? '<p class="feedback ok">¡Nuevo récord!</p>' : ''}`, () => this.start());
  },
  cleanup() { clearInterval(this.clock); clearTimeout(this.timer); },
};

/* ---------- Torneo ---------- */
Games.registry.torneo = {
  init() {
    $('#tor-count').addEventListener('change', () => this.renderNames());
    $('#tor-start').addEventListener('click', () => this.start());
    $('#tor-go').addEventListener('click', () => this.ask());
    this.renderNames();
  },
  renderNames() {
    const wrap = $('#tor-names');
    const prev = $$('input', wrap).map((i) => i.value);
    const n = Number($('#tor-count').value);
    wrap.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 20;
      input.placeholder = `Jugador ${i + 1}`;
      input.value = prev[i] || '';
      input.setAttribute('aria-label', `Nombre del jugador ${i + 1}`);
      wrap.appendChild(input);
    }
  },
  start() {
    const types = $$('.tor-types input:checked').map((i) => i.value);
    if (!types.length) { alert('Elige al menos un tipo de pregunta.'); return; }
    this.types = types;
    this.seconds = Number($('#tor-time').value);
    const lives = Number($('#tor-lives').value);
    this.players = $$('#tor-names input').map((inp, i) => ({
      name: inp.value.trim() || `Jugador ${i + 1}`, lives, out: false, correct: 0, outOrder: null,
    }));
    this.turn = 0;
    this.round = 1;
    this.outCount = 0;
    setStage('torneo', 'play');
    this.showReady();
  },
  alive() { return this.players.filter((p) => !p.out); },
  renderPlayers() {
    const wrap = $('#tor-players');
    wrap.innerHTML = '';
    this.players.forEach((p, i) => {
      const chip = document.createElement('span');
      chip.className = 'tor-chip' + (p.out ? ' out' : '') + (i === this.turn && !p.out ? ' turn' : '');
      chip.textContent = `${p.name} ${p.out ? '✖' : '❤'.repeat(p.lives)}`;
      wrap.appendChild(chip);
    });
  },
  showReady() {
    this.renderPlayers();
    $('#tor-round').textContent = this.round;
    $('#tor-turn-name').textContent = this.players[this.turn].name;
    $('#tor-ready').hidden = false;
    $('#tor-question').hidden = true;
    $('#tor-go').focus();
  },
  /* La dificultad crece con la ronda */
  makeQuestion() {
    let type = pick(this.types);
    if (type === 'listen' && !hasOutput()) type = 'm2l';
    let pool = LETTERS;
    if (this.round >= 3) pool = [...LETTERS, ...NUMBERS];
    if (this.round >= 5) pool = POOLS.todo;
    const useWord = type !== 'l2m' && this.round >= 5 && Math.random() < 0.5;
    const list = useWord ? PALABRAS_CORTAS : pool;
    const answer = pick(list);
    const options = shuffle([answer, ...sample(list.filter((x) => x !== answer), 3)]);
    const items = useWord ? textToItems(answer).items : [{ label: answer, code: MORSE[answer] }];
    return { type, answer, options, items };
  },
  async ask() {
    const q = this.makeQuestion();
    this.q = q;
    this.answered = false;
    $('#tor-ready').hidden = true;
    $('#tor-question').hidden = false;
    setFeedback($('#tor-feedback'), '');
    const prompt = $('#tor-prompt');
    const codeLabel = (o) => (MORSE[o] ? pretty(MORSE[o]) : textToItems(o).items.map((it) => pretty(it.code)).join('  '));
    if (q.type === 'l2m') prompt.textContent = q.answer;
    else if (q.type === 'm2l') prompt.textContent = codeLabel(q.answer);
    else prompt.textContent = '🎧 Atento…';

    renderOptions($('#tor-options'), q.options, q.answer,
      (o) => (q.type === 'l2m' ? pretty(MORSE[o]) : o),
      (ok) => this.resolve(ok, ok ? '¡Correcto!' : 'Incorrecto.'));

    const bar = $('#tor-bar');
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(1)';
    if (q.type === 'listen') {
      $$('#tor-options .option').forEach((o) => { o.disabled = true; });
      const finished = await Player.play(q.items, { quiet: true });
      if (!finished || this.q !== q) return;
      prompt.textContent = '¿Qué fue?';
      $$('#tor-options .option').forEach((o) => { o.disabled = false; });
    }
    void bar.offsetWidth;
    bar.style.transition = `transform ${this.seconds}s linear`;
    bar.style.transform = 'scaleX(0)';
    this.timer = setTimeout(() => {
      $$('#tor-options .option').forEach((o) => { o.disabled = true; });
      this.resolve(false, '¡Se acabó el tiempo!');
    }, this.seconds * 1000);
  },
  resolve(ok, msg) {
    if (this.answered) return;
    this.answered = true;
    clearTimeout(this.timer);
    const bar = $('#tor-bar');
    bar.style.transform = getComputedStyle(bar).transform;
    bar.style.transition = 'none';
    const p = this.players[this.turn];
    const q = this.q;
    if (ok) {
      p.correct++;
      setFeedback($('#tor-feedback'), `${msg} ${p.name} sigue en juego.`, true);
    } else {
      p.lives--;
      const ans = q.type === 'l2m' ? `${q.answer} = ${pretty(MORSE[q.answer])}` : q.answer;
      let txt = `${msg} Era: ${ans}.`;
      if (p.lives <= 0) {
        p.out = true;
        p.outOrder = ++this.outCount;
        txt += ` ${p.name} queda eliminado/a.`;
      } else {
        txt += ` A ${p.name} le quedan ${p.lives} vida(s).`;
      }
      setFeedback($('#tor-feedback'), txt, false);
    }
    this.renderPlayers();
    this.timer = setTimeout(() => this.nextTurn(), 2200);
  },
  nextTurn() {
    if (this.alive().length <= 1) { this.end(); return; }
    let i = this.turn;
    do {
      i = (i + 1) % this.players.length;
      if (i === 0) this.round++;
    } while (this.players[i].out);
    this.turn = i;
    this.showReady();
  },
  end() {
    const ranked = [...this.players].sort((a, b) => {
      if (a.out !== b.out) return a.out ? 1 : -1;
      return (b.outOrder || 0) - (a.outOrder || 0);
    });
    const end = $('#game-torneo .game-end');
    end.innerHTML = '';
    const title = document.createElement('p');
    title.textContent = '🏆 ¡Tenemos ganador/a!';
    const big = document.createElement('p');
    big.className = 'big-score';
    big.textContent = ranked[0].name;
    const ol = document.createElement('ol');
    ol.className = 'ranking';
    ranked.forEach((p, i) => {
      const li = document.createElement('li');
      const a = document.createElement('span');
      a.textContent = `${i + 1}. ${p.name}`;
      const b = document.createElement('span');
      b.textContent = `${p.correct} aciertos`;
      li.append(a, b);
      ol.appendChild(li);
    });
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = '<button class="btn btn-primary">Revancha</button><button class="btn">Configurar</button>';
    const [again, conf] = $$('button', actions);
    again.addEventListener('click', () => this.start());
    conf.addEventListener('click', () => setStage('torneo', 'setup'));
    end.append(title, big, ol, actions);
    setStage('torneo', 'end');
  },
  cleanup() { clearTimeout(this.timer); this.q = null; },
};

/* ==========================================================
   Claves de sustitución
   ========================================================== */
const ABC = [...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'];

/** Mayúsculas y sin tildes, conservando la Ñ. */
const normClave = (s) => stripAccents(s.toUpperCase().replace(/Ñ/g, '\u0001')).replace(/\u0001/g, 'Ñ');

const mapChars = (text, map) => [...normClave(text)].map((c) => map[c] ?? c).join('');

function swapMap(a, b) {
  const m = {};
  [...a].forEach((c, i) => { m[c] = b[i]; m[b[i]] = c; });
  return m;
}

/* Clave Gato: 9 casillas del gato (#), 3 letras por casilla; los puntos indican la posición. */
const GATO_CELLS = ['ABC', 'DEF', 'GHI', 'JKL', 'MNÑ', 'OPQ', 'RST', 'UVW', 'XYZ'];
function gatoGlyph(letter) {
  const cell = GATO_CELLS.findIndex((g) => g.includes(letter));
  if (cell < 0) return null;
  const r = Math.floor(cell / 3);
  const c = cell % 3;
  const pos = GATO_CELLS[cell].indexOf(letter);
  const lines = [];
  if (r > 0) lines.push('M4 4H36');
  if (r < 2) lines.push('M4 36H36');
  if (c > 0) lines.push('M4 4V36');
  if (c < 2) lines.push('M36 4V36');
  const dotsX = [[20], [14, 26], [11, 20, 29]][pos];
  const dots = dotsX.map((x) => `<circle cx="${x}" cy="20" r="2.6" fill="currentColor"/>`).join('');
  return `<svg class="glyph" viewBox="0 0 40 40" role="img" aria-label="${letter}"><path d="${lines.join(' ')}" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>${dots}</svg>`;
}

/* Clave China: el alfabeto en filas de 5; rayas verticales = fila, rayas horizontales = columna. */
const CHINA_ROWS = ['ABCDE', 'FGHIJ', 'KLMNÑ', 'OPQRS', 'TUVWX', 'YZ'];
function chinaGlyph(letter) {
  const r = CHINA_ROWS.findIndex((row) => row.includes(letter));
  if (r < 0) return null;
  const c = CHINA_ROWS[r].indexOf(letter);
  const spread = (n) => (n === 1 ? [20] : Array.from({ length: n }, (_, i) => 9 + (22 * i) / (n - 1)));
  const v = spread(r + 1).map((x) => `M${x.toFixed(1)} 5V35`);
  const h = spread(c + 1).map((y) => `M5 ${y.toFixed(1)}H35`);
  return `<svg class="glyph" viewBox="0 0 40 40" role="img" aria-label="${letter}"><path d="${[...v, ...h].join(' ')}" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;
}

const TELEFONO = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNÑO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };

const keyTable = (top, bottom) => `<table class="key-table"><tr>${[...top].map((c) => `<th>${c}</th>`).join('')}</tr><tr>${[...bottom].map((c) => `<td>${c}</td>`).join('')}</tr></table>`;

const CLAVES = [
  {
    id: 'murcielago',
    nombre: 'Clave Murciélago',
    desc: 'Las 10 letras de MURCIÉLAGO se reemplazan por los números del 0 al 9. Las demás letras quedan igual. Ej: HOLA → H967.',
    key: () => keyTable('MURCIELAGO', '0123456789'),
    encode: (t) => mapChars(t, Object.fromEntries([...'MURCIELAGO'].map((c, i) => [c, String(i)]))),
    decode: (t) => mapChars(t, Object.fromEntries([...'MURCIELAGO'].map((c, i) => [String(i), c]))),
  },
  {
    id: 'zenit',
    nombre: 'Clave Zenit Polar',
    desc: 'Se intercambian las letras de ZENIT con las de POLAR en la misma posición (Z↔P, E↔O, N↔L, I↔A, T↔R). Cifrar y descifrar es lo mismo. Ej: HOLA → HENI.',
    key: () => keyTable('ZENIT', 'POLAR'),
    encode: (t) => mapChars(t, swapMap('ZENIT', 'POLAR')),
    decode: (t) => mapChars(t, swapMap('ZENIT', 'POLAR')),
  },
  {
    id: 'numerica',
    nombre: 'Clave Numérica',
    desc: 'Cada letra se reemplaza por su posición en el alfabeto español de 27 letras (A=1 … N=14, Ñ=15 … Z=27). Letras separadas por guion y palabras por « / ». Ej: HOLA → 8-16-12-1.',
    key: () => `<div class="glyph-row">${ABC.map((c, i) => `<span class="glyph-item"><b>${c}</b>${i + 1}</span>`).join('')}</div>`,
    encode: (t) => normClave(t).split(/\s+/).filter(Boolean)
      .map((w) => [...w].map((c) => (ABC.includes(c) ? ABC.indexOf(c) + 1 : c)).join('-')).join(' / '),
    decode: (t) => t.split('/').map((w) => w.trim().split(/[\s,\-.]+/).filter(Boolean)
      .map((tok) => (/^\d+$/.test(tok) && ABC[Number(tok) - 1] ? ABC[Number(tok) - 1] : tok)).join('')).join(' '),
  },
  {
    id: 'telefono',
    nombre: 'Clave Teléfono',
    desc: 'Como al escribir en el teclado de un celular antiguo: se repite el número de la tecla tantas veces como la posición de la letra. Ej: B = 22, S = 7777. Letras separadas por espacio y palabras por « / ».',
    key: () => `<table class="key-table"><tr>${Object.keys(TELEFONO).map((k) => `<th>${k}</th>`).join('')}</tr><tr>${Object.values(TELEFONO).map((v) => `<td>${v}</td>`).join('')}</tr></table>`,
    encode: (t) => normClave(t).split(/\s+/).filter(Boolean).map((w) => [...w].map((c) => {
      const k = Object.keys(TELEFONO).find((d) => TELEFONO[d].includes(c));
      return k ? k.repeat(TELEFONO[k].indexOf(c) + 1) : c;
    }).join(' ')).join(' / '),
    decode: (t) => t.split('/').map((w) => w.trim().split(/\s+/).filter(Boolean).map((tok) => {
      const m = tok.match(/^([2-9])\1*$/);
      return m && TELEFONO[m[1]][tok.length - 1] ? TELEFONO[m[1]][tok.length - 1] : tok;
    }).join('')).join(' '),
  },
  {
    id: 'gato',
    nombre: 'Clave Gato',
    desc: 'Se dibuja un gato (#) y en cada una de sus 9 casillas se ponen 3 letras. Cada letra se escribe con la forma de su casilla y 1, 2 o 3 puntos según su posición dentro de ella.',
    glyph: gatoGlyph,
    key: () => {
      const cells = GATO_CELLS.map((g, i) => {
        const x = (i % 3) * 60 + 30;
        const y = Math.floor(i / 3) * 60 + 34;
        return `<text x="${x}" y="${y}" text-anchor="middle" font-size="15" fill="currentColor" font-family="IBM Plex Mono, monospace">${g}</text>`;
      }).join('');
      const board = `<svg class="gato-board" viewBox="0 0 180 180" role="img" aria-label="Tablero de la clave gato"><path d="M60 5V175 M120 5V175 M5 60H175 M5 120H175" stroke="currentColor" stroke-width="3"/>${cells}</svg>`;
      return board + glyphLegend(gatoGlyph);
    },
  },
  {
    id: 'china',
    nombre: 'Clave China',
    desc: 'El alfabeto se ordena en filas de 5 letras. Cada letra se dibuja con tantas rayas verticales como su fila y tantas horizontales como su columna, formando un símbolo parecido a un carácter chino.',
    glyph: chinaGlyph,
    key: () => `<table class="key-table"><tr><th>Fila \\ Col.</th>${[1, 2, 3, 4, 5].map((n) => `<th>${'—'.repeat(n)}</th>`).join('')}</tr>${CHINA_ROWS.map((row, r) => `<tr><th>${'|'.repeat(r + 1)}</th>${[...row.padEnd(5, ' ')].map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>${glyphLegend(chinaGlyph)}`,
  },
];

function glyphLegend(fn) {
  return `<div class="glyph-row" style="margin-top:1rem">${ABC.map((c) => `<span class="glyph-item">${fn(c)}<b>${c}</b></span>`).join('')}</div>`;
}

const Claves = {
  current: null,
  decoded: '',

  init() {
    const list = $('#claves-list');
    CLAVES.forEach((cl) => {
      const b = document.createElement('button');
      b.className = 'clave-btn';
      b.setAttribute('role', 'tab');
      b.dataset.id = cl.id;
      b.textContent = cl.nombre;
      b.addEventListener('click', () => this.select(cl.id));
      list.appendChild(b);
    });
    $('#clave-enc').addEventListener('click', () => this.run('encode'));
    $('#clave-dec').addEventListener('click', () => this.run('decode'));
    $('#clave-copy').addEventListener('click', (e) => copyText($('#clave-output').textContent.trim(), e.currentTarget));
    this.select(CLAVES[0].id);
  },

  select(id) {
    const cl = CLAVES.find((c) => c.id === id);
    this.current = cl;
    this.decoded = '';
    $$('.clave-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.id === id);
      b.setAttribute('aria-selected', b.dataset.id === id);
    });
    $('#clave-name').textContent = cl.nombre;
    $('#clave-desc').textContent = cl.desc;
    $('#clave-key').innerHTML = cl.key();
    $('#clave-output').innerHTML = '';
    $('#clave-dec').hidden = !!cl.glyph;
    $('#clave-keypad-wrap').hidden = !cl.glyph;
    if (cl.glyph) this.renderKeypad(cl);
  },

  run(mode) {
    const cl = this.current;
    const text = $('#clave-input').value;
    const out = $('#clave-output');
    if (cl.glyph) {
      out.innerHTML = '';
      [...normClave(text)].forEach((c) => {
        if (/\s/.test(c)) { out.insertAdjacentHTML('beforeend', '<span class="gap"></span>'); return; }
        const g = cl.glyph(c);
        if (g) out.insertAdjacentHTML('beforeend', g);
        else out.appendChild(document.createTextNode(c));
      });
      return;
    }
    out.textContent = cl[mode](text);
  },

  renderKeypad(cl) {
    const pad = $('#clave-keypad');
    pad.innerHTML = '';
    ABC.forEach((c) => {
      const b = document.createElement('button');
      b.innerHTML = cl.glyph(c);
      b.title = 'Símbolo';
      b.addEventListener('click', () => this.typeDecoded(c));
      pad.appendChild(b);
    });
    const extra = [['Espacio', ' '], ['⌫', 'back'], ['Limpiar', 'clear']];
    extra.forEach(([label, val]) => {
      const b = document.createElement('button');
      b.className = 'wide';
      b.textContent = label;
      b.addEventListener('click', () => this.typeDecoded(val));
      pad.appendChild(b);
    });
  },

  typeDecoded(val) {
    if (val === 'back') this.decoded = [...this.decoded].slice(0, -1).join('');
    else if (val === 'clear') this.decoded = '';
    else this.decoded += val;
    $('#clave-output').textContent = this.decoded ? `Descifrado: ${this.decoded}` : '';
  },
};

/* ---------- Sobre de contacto ---------- */
function initMailbox() {
  const btn = $('#mailbox-btn');
  const panel = $('#mailbox-panel');
  const toggle = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open);
  };
  btn.addEventListener('click', () => toggle(panel.hidden));
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('.mailbox')) toggle(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { toggle(false); btn.focus(); }
  });
}

/* ---------- Inicio ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMailbox();
  initSettings();
  initTabs();
  Translator.init();
  initAlphabet();
  Games.init();
  Claves.init();
});
