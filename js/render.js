// Draws one countdown "stage": background animation, words, and the timer.
// Used by both the editor preview and the full-screen display, so what you
// see in the editor is what shows on the screen.

import { FONTS, splitTime, weeklyTarget } from './config.js';
import { SceneRunner, hexToRgb } from './scenes.js';

const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

// ---------------------------------------------------------------- clock
// Works out the target time and how much is left. For "duration" timers it
// also keeps track of start / pause.
export class Clock {
  constructor() { this.reset(); }
  reset() { this.startedAt = null; this.pausedLeft = null; this.cfgKey = ''; }
  sync(time, autoStart) {
    const key = time.mode + '|' + time.dur;
    if (key !== this.cfgKey) {
      this.cfgKey = key;
      this.startedAt = null;
      this.pausedLeft = time.dur * 1000;
      if (time.mode === 'duration' && autoStart) this.play();
    }
  }
  get running() { return this.startedAt !== null; }
  play() {
    if (this.running) return;
    this.base = this.pausedLeft ?? 0;
    this.startedAt = Date.now();
  }
  pause() {
    if (!this.running) return;
    this.pausedLeft = Math.max(0, this.base - (Date.now() - this.startedAt));
    this.startedAt = null;
  }
  restart(time, run) {
    this.startedAt = null;
    this.pausedLeft = time.dur * 1000;
    if (run) this.play();
  }
  remaining(time, now = Date.now()) {
    if (time.mode === 'date') return time.at - now;
    if (time.mode === 'weekly') return weeklyTarget(time, now) - now;
    if (this.running) return this.base - (now - this.startedAt);
    return this.pausedLeft ?? time.dur * 1000;
  }
}

// ---------------------------------------------------------------- digit width
const widthCache = new Map();
function digitWidthEm(fontKey, weight) {
  const k = fontKey + weight;
  if (widthCache.has(k)) return widthCache.get(k);
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${weight} 100px ${FONTS[fontKey].css}`;
  let max = 0;
  for (let i = 0; i < 10; i++) max = Math.max(max, c.measureText(String(i)).width);
  const em = max / 100 || 0.6;
  if (document.fonts && document.fonts.status === 'loaded') widthCache.set(k, em);
  return em;
}

// ---------------------------------------------------------------- chime
let audioCtx = null;
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx.state === 'running';
  } catch { return false; }
}
export function audioReady() { return !!audioCtx && audioCtx.state === 'running'; }

// A soft, original bell tone made from a few sine waves.
export function playChime(volume = 0.6) {
  if (!unlockAudio()) return;
  const ctx = audioCtx;
  const now = ctx.currentTime + 0.02;
  const out = ctx.createGain();
  out.gain.value = Math.max(0, Math.min(1, volume)) * 0.5;
  out.connect(ctx.destination);
  const notes = [0, 0.55, 1.1];
  const fundamentals = [523.25, 659.25, 783.99];
  notes.forEach((offset, i) => {
    [1, 2.0, 3.01, 4.2].forEach((mult, j) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = fundamentals[i] * mult;
      const peak = [0.6, 0.25, 0.12, 0.06][j];
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.exponentialRampToValueAtTime(peak, now + offset + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 2.8 - j * 0.5);
      o.connect(g); g.connect(out);
      o.start(now + offset);
      o.stop(now + offset + 3);
    });
  });
}

// ---------------------------------------------------------------- stage
export class Stage {
  constructor(root, { editable = false } = {}) {
    this.root = root;
    this.editable = editable;
    root.classList.add('stage');
    this.canvas = el('canvas', 'stage-bg');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.dim = el('div', 'stage-dim');
    this.vignette = el('div', 'stage-vignette');
    this.layers = el('div', 'stage-layers');
    this.flash = el('div', 'stage-flash');
    root.append(this.canvas, this.dim, this.vignette, this.flash, this.layers);
    this.scene = new SceneRunner(this.canvas);
    this.textEls = new Map();
    this.timerEl = el('div', 'layer timer');
    this.timerEl.dataset.id = 'timer';
    this.timerEl.setAttribute('role', 'timer');
    this.layers.append(this.timerEl);
    this.timerKey = '';
    this.digits = [];
    this.phase = 'before';
    this.force = null; // 'before' | 'after' | null
    this.lastShown = null;
    this.onEnd = null;
    this.ro = new ResizeObserver(() => { this.measure(); this.fitTimer(); });
    this.ro.observe(root);
    this.measure();
  }

  measure() {
    const r = this.root.getBoundingClientRect();
    this.root.style.setProperty('--sh', (r.height / 100) + 'px');
    this.root.style.setProperty('--sw', r.width + 'px');
  }

  start() { this.scene.start(); }
  stop() { this.scene.stop(); }

  setConfig(cfg) {
    this.cfg = cfg;
    this.scene.set(cfg.bg);
    this.dim.style.background = `rgba(0,0,0,${cfg.bg.dim / 100})`;
    this.renderTexts();
    this.styleTimer();
    this.timerKey = ''; // force rebuild
    if (this.lastLeft !== undefined) this.update(this.lastLeft, true);
  }

  renderTexts() {
    const keep = new Set();
    for (const t of this.cfg.texts) {
      keep.add(t.id);
      let e = this.textEls.get(t.id);
      if (!e) {
        e = el('div', 'layer text');
        e.dataset.id = t.id;
        this.layers.insertBefore(e, this.timerEl);
        this.textEls.set(t.id, e);
      }
      if (e.textContent !== t.text) e.textContent = t.text || (this.editable ? ' ' : '');
      const s = e.style;
      s.left = t.x + '%';
      s.top = t.y + '%';
      s.fontFamily = FONTS[t.font].css;
      s.fontWeight = t.weight;
      s.fontSize = `calc(var(--sh) * ${t.size})`;
      s.color = t.color;
      s.textAlign = t.align;
      s.fontStyle = t.italic ? 'italic' : 'normal';
      s.letterSpacing = (t.spacing / 100) + 'em';
      s.textTransform = t.upper ? 'uppercase' : 'none';
      s.opacity = t.opacity / 100;
      s.textShadow = t.shadow ? '0 0.04em 0.3em rgba(0,0,0,.55), 0 0 0.05em rgba(0,0,0,.35)' : 'none';
      s.transform = t.align === 'left' ? 'translate(0,-50%)' : t.align === 'right' ? 'translate(-100%,-50%)' : 'translate(-50%,-50%)';
      e.dataset.show = t.show;
      e.classList.toggle('empty', !t.text);
    }
    for (const [id, e] of this.textEls) if (!keep.has(id)) { e.remove(); this.textEls.delete(id); }
    this.applyPhase();
  }

  styleTimer() {
    const tm = this.cfg.timer;
    const s = this.timerEl.style;
    s.left = tm.x + '%';
    s.top = tm.y + '%';
    s.fontFamily = FONTS[tm.font].css;
    s.fontWeight = tm.weight;
    s.fontSize = `calc(var(--sh) * ${tm.size})`;
    s.color = tm.color;
    const [r, g, b] = hexToRgb(tm.color);
    const glow = tm.glow / 100;
    this.timerEl.style.transform = '';
    s.textShadow = glow > 0
      ? `0 0 ${0.08 + glow * 0.25}em rgba(${r},${g},${b},${0.15 + glow * 0.45}), 0 0.03em 0.12em rgba(0,0,0,.45)`
      : '0 0.03em 0.12em rgba(0,0,0,.45)';
    const [tr, tg, tb] = hexToRgb(tm.tile);
    s.setProperty('--tile-bg', `rgba(${tr},${tg},${tb},0.10)`);
    s.setProperty('--tile-line', `rgba(${tr},${tg},${tb},0.22)`);
    s.setProperty('--dw', digitWidthEm(tm.font, tm.weight) + 'em');
    this.timerEl.dataset.style = tm.style;
    this.timerEl.classList.toggle('no-labels', !tm.labels);
  }

  unitsFor(p) {
    const u = this.cfg.timer.units;
    if (u === 'dhms') return ['d', 'h', 'm', 's'];
    if (u === 'hms') return ['h', 'm', 's'];
    if (u === 'ms') return ['m', 's'];
    if (p.d > 0) return ['d', 'h', 'm', 's'];
    if (p.h > 0) return ['h', 'm', 's'];
    return ['m', 's'];
  }

  valuesFor(p, units) {
    const out = {};
    let rest = p.total;
    for (const u of units) {
      const size = { d: 86400, h: 3600, m: 60, s: 1 }[u];
      out[u] = Math.floor(rest / size);
      rest -= out[u] * size;
    }
    return out;
  }

  buildTimer(units) {
    const tm = this.cfg.timer;
    this.timerEl.textContent = '';
    this.digits = [];
    this.groups = {};
    units.forEach((u, i) => {
      if (i > 0 && tm.style === 'clock' && units[i - 1] !== 'd') {
        const sep = el('span', 'sep');
        sep.textContent = ':';
        this.timerEl.append(sep);
      }
      const g = el('span', u === 'd' && tm.style === 'clock' ? 'grp days' : 'grp');
      const num = el('span', 'num');
      const lbl = el('span', 'lbl');
      lbl.textContent = tm.lbl[u];
      g.append(num, lbl);
      this.timerEl.append(g);
      this.groups[u] = { num, cells: [] };
    });
  }

  setDigits(u, str, animate) {
    const grp = this.groups[u];
    while (grp.cells.length < str.length) {
      const c = el('span', 'dg');
      grp.num.prepend(c);
      grp.cells.unshift(c);
    }
    while (grp.cells.length > str.length) grp.cells.shift().remove();
    const motion = this.cfg.timer.motion;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (let i = 0; i < str.length; i++) {
      const c = grp.cells[i];
      if (c.textContent === str[i]) continue;
      const old = c.textContent;
      c.textContent = str[i];
      if (animate && this.inFinal && !reduced && c.animate) { this.finaleDigit(c, old, i); continue; }
      if (!animate || motion === 'none' || reduced || !c.animate) continue;
      const frames = motion === 'fade'
        ? [{ opacity: 0.15 }, { opacity: 1 }]
        : motion === 'slide'
          ? [{ transform: 'translateY(-0.28em)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]
          : [{ transform: 'translateY(0.3em) scale(.96)', opacity: 0, filter: 'blur(0.04em)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }];
      c.animate(frames, { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  // Final minute: the old digit leaves the screen and the new one arrives.
  finaleDigit(c, old, i) {
    const kind = this.cfg.timer.finale;
    const ghost = el('span', 'dg-ghost');
    ghost.textContent = old;
    c.append(ghost);
    const dir = i % 2 ? 1 : -1;
    const opt = { duration: 650, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' };
    let out, inn;
    if (kind === 'fly') {
      out = [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dir * 0.6}em,-2.6em) rotate(${dir * 25}deg)`, opacity: 0 }];
      inn = [{ transform: 'translateY(2.4em) scale(.7)', opacity: 0 }, { transform: 'translateY(-0.08em) scale(1.05)', opacity: 1, offset: 0.75 }, { transform: 'none', opacity: 1 }];
    } else if (kind === 'zoom') {
      out = [{ transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'scale(3.2)', opacity: 0, filter: 'blur(0.05em)' }];
      inn = [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }];
    } else {
      out = [{ transform: 'perspective(4em) rotateX(0)', opacity: 1 }, { transform: 'perspective(4em) rotateX(90deg)', opacity: 0 }];
      inn = [{ transform: 'perspective(4em) rotateX(-90deg)', opacity: 0 }, { transform: 'perspective(4em) rotateX(0)', opacity: 1 }];
    }
    const a = ghost.animate(out, opt);
    a.onfinish = () => ghost.remove();
    setTimeout(() => ghost.remove(), 900);
    c.animate(inn, { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  // The last 10 seconds take over the screen with one giant number.
  showBig(n) {
    if (!this.big) {
      this.big = el('div', 'big-count');
      this.big.setAttribute('aria-hidden', 'true');
      this.layers.append(this.big);
    }
    const tm = this.cfg.timer;
    const b = this.big;
    b.style.fontFamily = FONTS[tm.font].css;
    b.style.fontWeight = tm.weight;
    b.style.color = tm.color;
    b.style.textShadow = this.timerEl.style.textShadow;
    if (b.textContent === String(n)) return;
    b.textContent = String(n);
    if (b.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      b.animate([
        { transform: 'translate(-50%,-50%) scale(1.9)', opacity: 0, filter: 'blur(0.03em)' },
        { transform: 'translate(-50%,-50%) scale(0.96)', opacity: 1, filter: 'blur(0)', offset: 0.35 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.8 },
        { transform: 'translate(-50%,-50%) scale(1.04)', opacity: 0.9 },
      ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  // Called often. `left` is milliseconds remaining.
  update(left, structural = false) {
    if (!this.cfg) return;
    this.lastLeft = left;
    const phase = this.force || (left <= 0 ? 'after' : 'before');
    // The background builds up over the final minute.
    const urg = this.cfg.bg.build && !this.force && left > 0 && left < 60000 ? (1 - left / 60000) ** 2 : 0;
    if (Math.abs(urg - (this.urg || 0)) > 0.004 || (urg === 0 && this.urg)) { this.urg = urg; this.scene.setUrgency(urg); }
    const shownLeft = this.force === 'after' ? 0 : this.force === 'before' && left <= 0 ? this.previewLeft() : left;
    const p = splitTime(shownLeft);
    if (phase !== this.phase) {
      const was = this.phase;
      this.phase = phase;
      this.applyPhase();
      if (was === 'before' && phase === 'after' && !this.force) {
        if (this.cfg.bg.build) this.zeroFlash();
        if (this.onEnd) this.onEnd();
      }
    }
    this.inFinal = phase === 'before' && p.total > 0 && p.total <= 60 && this.cfg.timer.finale !== 'none';
    const big = this.cfg.timer.big10 && this.cfg.timer.show && phase === 'before' && p.total > 0 && p.total <= 10;
    if (big !== !!this.bigOn) { this.bigOn = big; this.root.classList.toggle('final10', big); if (!big && this.big) this.big.textContent = ''; }
    if (big) this.showBig(p.total);
    if (p.total === this.lastShown && !structural && this.timerKey) return;
    this.lastShown = p.total;
    const units = this.unitsFor(p);
    const key = units.join('') + this.cfg.timer.style + this.cfg.timer.font + JSON.stringify(this.cfg.timer.lbl);
    const rebuilt = key !== this.timerKey;
    if (rebuilt) { this.timerKey = key; this.buildTimer(units); }
    const vals = this.valuesFor(p, units);
    const clock = this.cfg.timer.style === 'clock';
    units.forEach((u, i) => {
      const v = vals[u];
      const str = clock && i === 0 ? String(v) : String(v).padStart(2, '0');
      this.setDigits(u, str, !rebuilt);
    });
    this.fitTimer();
    // gentle pulse during the last 10 seconds
    if (this.cfg.timer.pulse && phase === 'before' && p.total <= 10 && p.total > 0 && this.timerEl.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.timerEl.animate([{ scale: '1' }, { scale: '1.045' }, { scale: '1' }], { duration: 600, easing: 'ease-out' });
    }
    this.timerEl.setAttribute('aria-label', `${p.d ? p.d + ' days ' : ''}${p.h} hours ${p.m} minutes ${p.s} seconds left`);
  }

  // A soft burst of light at zero. One slow fade, never a strobe.
  zeroFlash() {
    if (!this.flash.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.flash.style.background = `radial-gradient(circle at 50% 50%, #ffffff 0%, ${this.cfg.bg.c2} 35%, transparent 75%)`;
    this.flash.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0 }], { duration: 1800, easing: 'ease-out' });
    this.scene.setUrgency(0);
  }

  // Shrink the numbers if they would run off the sides of the screen.
  fitTimer() {
    if (!this.cfg) return;
    const W = this.root.clientWidth;
    const natural = this.timerEl.offsetWidth;
    if (!W || !natural) return;
    // Keep a safe margin on both sides, measured from where the numbers are centered.
    const x = Math.min(100, Math.max(0, Number(this.cfg.timer.x) || 50)) / 100;
    const half = Math.max(W * 0.1, Math.min(x, 1 - x) * W) * 0.9;
    const k = Math.min(1, (2 * half) / natural);
    this.timerEl.style.transform = k < 1 ? `translate(-50%, -50%) scale(${k.toFixed(4)})` : '';
  }

  previewLeft() { return (4 * 60 + 59) * 1000; }

  applyPhase() {
    const ph = this.phase;
    for (const e of this.textEls.values()) {
      const show = e.dataset.show;
      e.classList.toggle('hidden', !(show === 'always' || show === ph));
    }
    const tm = this.cfg ? this.cfg.timer : null;
    const hideTimer = !tm || !tm.show || (ph === 'after' && tm.hideAtEnd);
    this.timerEl.classList.toggle('hidden', hideTimer);
    this.root.dataset.phase = ph;
  }
}
