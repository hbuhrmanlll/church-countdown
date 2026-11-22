// Settings model: defaults, safe cleanup of untrusted input, and link encoding.
// Everything that comes from a link is treated as untrusted and rebuilt from
// known-good values. Nothing from a link is ever inserted as HTML.

export const APP_VERSION = '1.1.0';

export const FONTS = {
  outfit: { name: 'Outfit', css: "'Outfit', system-ui, sans-serif", weights: [300, 400, 500, 600, 700, 800] },
  montserrat: { name: 'Montserrat', css: "'Montserrat', system-ui, sans-serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  spacegrotesk: { name: 'Space Grotesk', css: "'Space Grotesk', system-ui, sans-serif", weights: [300, 400, 500, 600, 700] },
  oswald: { name: 'Oswald', css: "'Oswald', 'Arial Narrow', sans-serif", weights: [300, 400, 500, 600, 700] },
  bebas: { name: 'Bebas Neue', css: "'Bebas Neue', 'Arial Narrow', sans-serif", weights: [400] },
  fraunces: { name: 'Fraunces', css: "'Fraunces', Georgia, serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  playfair: { name: 'Playfair Display', css: "'Playfair Display', Georgia, serif", weights: [400, 700] },
  cormorant: { name: 'Cormorant Garamond', css: "'Cormorant Garamond', Georgia, serif", weights: [500, 700] },
  dmserif: { name: 'DM Serif Display', css: "'DM Serif Display', Georgia, serif", weights: [400] },
  greatvibes: { name: 'Great Vibes', css: "'Great Vibes', cursive", weights: [400] },
};

export const SCENE_LIST = [
  { id: 'glow', name: 'Soft glow', feel: 'Subtle' },
  { id: 'candles', name: 'Candlelight', feel: 'Subtle' },
  { id: 'snow', name: 'Snowfall', feel: 'Subtle' },
  { id: 'waters', name: 'Still waters', feel: 'Gentle' },
  { id: 'rays', name: 'Morning light', feel: 'Gentle' },
  { id: 'aurora', name: 'Northern lights', feel: 'Medium' },
  { id: 'embers', name: 'Rising embers', feel: 'Medium' },
  { id: 'nightsky', name: 'Night sky', feel: 'Medium' },
  { id: 'glass', name: 'Stained glass', feel: 'Bold' },
  { id: 'halo', name: 'Halo rings', feel: 'Bold' },
  { id: 'lightspeed', name: 'Lightspeed', feel: 'Epic' },
  { id: 'arena', name: 'Arena lights', feel: 'Epic' },
  { id: 'glory', name: 'Glory rays', feel: 'Epic' },
  { id: 'clouds', name: 'Glory clouds', feel: 'Epic' },
  { id: 'tunnel', name: 'Light tunnel', feel: 'Epic' },
  { id: 'heartbeat', name: 'Heartbeat', feel: 'Epic' },
  { id: 'galaxy', name: 'Galaxy', feel: 'Epic' },
  { id: 'fireworks', name: 'Fireworks', feel: 'Epic' },
  { id: 'none', name: 'No animation', feel: 'Still' },
];

export const PALETTES = [
  { id: 'midnight', name: 'Midnight', base: '#0b1026', c1: '#5b34a6', c2: '#f5c451', c3: '#3a7bd5' },
  { id: 'sunrise', name: 'Sunrise', base: '#1b0f1f', c1: '#ff7a59', c2: '#ffd27a', c3: '#b04a8c' },
  { id: 'advent', name: 'Advent', base: '#140b24', c1: '#7b3fbf', c2: '#f2a7c8', c3: '#e8c77d' },
  { id: 'christmas', name: 'Christmas', base: '#06140f', c1: '#1f7a4d', c2: '#d9363e', c3: '#f2cc6b' },
  { id: 'easter', name: 'Easter dawn', base: '#1d1a2e', c1: '#f6d1a5', c2: '#c9b6f2', c3: '#fff4d6' },
  { id: 'ocean', name: 'Ocean', base: '#03141f', c1: '#0f8ea8', c2: '#6fe3d6', c3: '#2a4fb8' },
  { id: 'ember', name: 'Fire', base: '#120604', c1: '#e2531f', c2: '#ffb03a', c3: '#8a1c12' },
  { id: 'forest', name: 'Forest', base: '#08130b', c1: '#3f8f4f', c2: '#c7e27a', c3: '#1d5c56' },
  { id: 'neon', name: 'Neon', base: '#07051a', c1: '#7a3cff', c2: '#22e1ff', c3: '#ff2fb4' },
  { id: 'royal', name: 'Royal', base: '#050a24', c1: '#2b55ff', c2: '#ffd36b', c3: '#8fb1ff' },
  { id: 'mono', name: 'Silver', base: '#0d0f12', c1: '#5d6673', c2: '#e9edf2', c3: '#9aa4b1' },
];

export const LIMITS = {
  maxTexts: 12,
  maxTextLen: 240,
  maxLabelLen: 24,
  maxTitleLen: 80,
  maxHash: 12000,
  maxJson: 40000,
};

const ENUMS = {
  mode: ['date', 'weekly', 'duration'],
  start: ['open', 'click'],
  style: ['clock', 'labels', 'tiles'],
  units: ['auto', 'dhms', 'hms', 'ms'],
  motion: ['none', 'fade', 'slide', 'rise'],
  align: ['left', 'center', 'right'],
  show: ['always', 'before', 'after'],
  scene: SCENE_LIST.map((s) => s.id),
  fonts: Object.keys(FONTS),
};

let idCounter = 0;
export const newId = () => 't' + Date.now().toString(36) + (idCounter++).toString(36);

export function nextSundayAt(hour = 10, minute = 30) {
  const d = new Date();
  d.setSeconds(0, 0);
  const add = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + add);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 7);
  return d.getTime();
}

export function localTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

export function defaultText(over = {}) {
  return {
    id: newId(),
    text: 'Your words here',
    x: 50, y: 30,
    size: 7,
    font: 'outfit',
    weight: 500,
    color: '#ffffff',
    align: 'center',
    italic: false,
    spacing: 0,
    shadow: true,
    upper: false,
    opacity: 100,
    show: 'before',
    ...over,
  };
}

export function defaultConfig() {
  return {
    v: 1,
    title: 'Service starts soon',
    time: {
      mode: 'weekly',
      at: nextSundayAt(10, 30),
      wd: 0,
      tm: '10:30',
      tz: localTimeZone(),
      hold: 90,
      dur: 300,
      start: 'open',
    },
    timer: {
      show: true,
      x: 50, y: 54,
      size: 24,
      font: 'outfit',
      weight: 600,
      color: '#ffffff',
      style: 'clock',
      units: 'auto',
      labels: true,
      lbl: { d: 'Days', h: 'Hours', m: 'Minutes', s: 'Seconds' },
      motion: 'slide',
      glow: 35,
      tile: '#ffffff',
      hideAtEnd: true,
      pulse: true,
    },
    texts: [
      defaultText({ text: 'Service begins in', y: 30, size: 5.5, weight: 400, spacing: 4, upper: false }),
      defaultText({ text: 'Welcome home', y: 50, size: 12, font: 'fraunces', weight: 500, show: 'after' }),
    ],
    bg: {
      scene: 'aurora',
      palette: 'midnight',
      base: '#0b1026', c1: '#5b34a6', c2: '#f5c451', c3: '#3a7bd5',
      speed: 1,
      amount: 60,
      dim: 10,
      build: true,
    },
    end: { chime: false, volume: 60 },
  };
}

// ---------- cleanup of untrusted input ----------
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const num = (v, d, min, max) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return d;
  return Math.min(max, Math.max(min, n));
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const color = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : d);
// Strip control characters (except new lines) and cap length.
const str = (v, d, max) => {
  if (typeof v !== 'string') return d;
  return v.replace(/[\u0000-\u0009\u000B-\u001F\u007F‪-‮⁦-⁩]/g, '').slice(0, max);
};
const time = (v, d) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const tz = (v, d) => {
  if (typeof v !== 'string' || v.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(v)) return d;
  try { new Intl.DateTimeFormat('en-US', { timeZone: v }); return v; } catch { return d; }
};
const fontWeight = (font, w) => {
  const list = FONTS[font].weights;
  const n = num(w, 400, 100, 900);
  return list.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), list[0]);
};

function cleanText(t, fallback) {
  const d = defaultText({ id: fallback });
  if (!isObj(t)) return null;
  const font = oneOf(t.font, ENUMS.fonts, d.font);
  return {
    id: typeof t.id === 'string' && /^[a-z0-9]{1,24}$/i.test(t.id) ? t.id : fallback,
    text: str(t.text, '', LIMITS.maxTextLen),
    x: num(t.x, d.x, -10, 110),
    y: num(t.y, d.y, -10, 110),
    size: num(t.size, d.size, 1, 60),
    font,
    weight: fontWeight(font, t.weight),
    color: color(t.color, d.color),
    align: oneOf(t.align, ENUMS.align, d.align),
    italic: bool(t.italic, false),
    spacing: num(t.spacing, 0, -5, 40),
    shadow: bool(t.shadow, true),
    upper: bool(t.upper, false),
    opacity: num(t.opacity, 100, 10, 100),
    show: oneOf(t.show, ENUMS.show, 'always'),
  };
}

export function sanitize(input) {
  const d = defaultConfig();
  const c = isObj(input) ? input : {};
  const t = isObj(c.time) ? c.time : {};
  const tm = isObj(c.timer) ? c.timer : {};
  const lbl = isObj(tm.lbl) ? tm.lbl : {};
  const bg = isObj(c.bg) ? c.bg : {};
  const end = isObj(c.end) ? c.end : {};
  const timerFont = oneOf(tm.font, ENUMS.fonts, d.timer.font);

  const texts = Array.isArray(c.texts)
    ? c.texts.slice(0, LIMITS.maxTexts).map((x, i) => cleanText(x, 'x' + i)).filter(Boolean)
    : d.texts;
  // keep ids unique
  const seen = new Set();
  texts.forEach((x, i) => { if (seen.has(x.id)) x.id = 'x' + i + 'u'; seen.add(x.id); });

  return {
    v: 1,
    title: str(c.title, d.title, LIMITS.maxTitleLen),
    time: {
      mode: oneOf(t.mode, ENUMS.mode, d.time.mode),
      at: num(t.at, d.time.at, 0, 8.64e15),
      wd: Math.round(num(t.wd, d.time.wd, 0, 6)),
      tm: time(t.tm, d.time.tm),
      tz: tz(t.tz, d.time.tz),
      hold: Math.round(num(t.hold, d.time.hold, 0, 1440)),
      dur: Math.round(num(t.dur, d.time.dur, 1, 359999)),
      start: oneOf(t.start, ENUMS.start, d.time.start),
    },
    timer: {
      show: bool(tm.show, true),
      x: num(tm.x, d.timer.x, -10, 110),
      y: num(tm.y, d.timer.y, -10, 110),
      size: num(tm.size, d.timer.size, 2, 70),
      font: timerFont,
      weight: fontWeight(timerFont, tm.weight),
      color: color(tm.color, d.timer.color),
      style: oneOf(tm.style, ENUMS.style, d.timer.style),
      units: oneOf(tm.units, ENUMS.units, d.timer.units),
      labels: bool(tm.labels, true),
      lbl: {
        d: str(lbl.d, d.timer.lbl.d, LIMITS.maxLabelLen),
        h: str(lbl.h, d.timer.lbl.h, LIMITS.maxLabelLen),
        m: str(lbl.m, d.timer.lbl.m, LIMITS.maxLabelLen),
        s: str(lbl.s, d.timer.lbl.s, LIMITS.maxLabelLen),
      },
      motion: oneOf(tm.motion, ENUMS.motion, d.timer.motion),
      glow: num(tm.glow, d.timer.glow, 0, 100),
      tile: color(tm.tile, d.timer.tile),
      hideAtEnd: bool(tm.hideAtEnd, true),
      pulse: bool(tm.pulse, true),
    },
    texts,
    bg: {
      scene: oneOf(bg.scene, ENUMS.scene, d.bg.scene),
      palette: typeof bg.palette === 'string' && /^[a-z]{1,16}$/.test(bg.palette) ? bg.palette : 'custom',
      base: color(bg.base, d.bg.base),
      c1: color(bg.c1, d.bg.c1),
      c2: color(bg.c2, d.bg.c2),
      c3: color(bg.c3, d.bg.c3),
      speed: num(bg.speed, 1, 0.2, 3),
      amount: num(bg.amount, 60, 0, 100),
      dim: num(bg.dim, 10, 0, 85),
      build: bool(bg.build, true),
    },
    end: {
      chime: bool(end.chime, false),
      volume: num(end.volume, 60, 0, 100),
    },
  };
}

// ---------- link encoding ----------
// Format: "1z" + base64url(deflate-raw(JSON))   or   "1j" + base64url(JSON)
const toB64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s) => {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad characters');
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
};

async function streamBytes(bytes, stream, cap) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > cap) { reader.cancel(); throw new Error('too large'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// Drop values equal to the defaults would save space, but we keep it simple and
// rely on compression. Ids are dropped since they are rebuilt on load.
function packable(cfg) {
  const c = JSON.parse(JSON.stringify(cfg));
  c.texts.forEach((t) => delete t.id);
  return c;
}

export async function encodeConfig(cfg) {
  const json = JSON.stringify(packable(cfg));
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') {
    try {
      const z = await streamBytes(raw, new CompressionStream('deflate-raw'), LIMITS.maxJson * 2);
      return '1z' + toB64url(z);
    } catch { /* fall through */ }
  }
  return '1j' + toB64url(raw);
}

export async function decodeConfig(code) {
  if (typeof code !== 'string' || code.length < 3 || code.length > LIMITS.maxHash) throw new Error('This link is not a countdown link.');
  const kind = code.slice(0, 2);
  const bytes = fromB64url(code.slice(2));
  let jsonBytes;
  if (kind === '1z') {
    if (typeof DecompressionStream !== 'function') throw new Error('This browser is too old to open this link. Try Chrome, Edge, Safari, or Firefox.');
    jsonBytes = await streamBytes(bytes, new DecompressionStream('deflate-raw'), LIMITS.maxJson);
  } else if (kind === '1j') {
    if (bytes.length > LIMITS.maxJson) throw new Error('too large');
    jsonBytes = bytes;
  } else {
    throw new Error('This link is not a countdown link.');
  }
  const obj = JSON.parse(new TextDecoder().decode(jsonBytes));
  const cfg = sanitize(obj);
  cfg.texts.forEach((t) => { t.id = newId(); });
  return cfg;
}

// ---------- time math ----------
// Offset (ms) of a time zone from UTC at a given instant.
function tzOffset(epoch, zone) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(epoch)).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - Math.floor(epoch / 1000) * 1000;
}

// Wall-clock parts in a zone -> epoch ms.
function zonedToEpoch(y, mo, d, h, mi, zone) {
  let guess = Date.UTC(y, mo, d, h, mi);
  for (let i = 0; i < 3; i++) {
    const off = tzOffset(guess, zone);
    const next = Date.UTC(y, mo, d, h, mi) - off;
    if (next === guess) break;
    guess = next;
  }
  return guess;
}

function zonedParts(epoch, zone) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(epoch)).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, mo: +p.month - 1, d: +p.day, wd };
}

// Next weekly occurrence. A just-passed occurrence stays "current" for `holdMin`
// minutes so the end screen can show, then it rolls to next week.
export function weeklyTarget(cfgTime, now = Date.now()) {
  const zone = cfgTime.tz || 'UTC';
  const [h, mi] = cfgTime.tm.split(':').map(Number);
  const holdMs = cfgTime.hold * 60000;
  const today = zonedParts(now, zone);
  for (let k = -7; k <= 7; k++) {
    // walk day by day using a noon anchor to dodge DST edges
    const anchor = Date.UTC(today.y, today.mo, today.d + k, 12);
    const dt = new Date(anchor);
    const y = dt.getUTCFullYear(), mo = dt.getUTCMonth(), d = dt.getUTCDate();
    const wd = dt.getUTCDay();
    if (wd !== cfgTime.wd) continue;
    const at = zonedToEpoch(y, mo, d, h, mi, zone);
    if (at + holdMs > now) return at;
  }
  return now + 7 * 864e5; // should not happen
}

export function splitTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    total,
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
