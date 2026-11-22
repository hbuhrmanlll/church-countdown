// The editor: preview on the left, settings on the right.
import {
  FONTS, SCENE_LIST, PALETTES, LIMITS, WEEKDAYS, APP_VERSION,
  defaultText, sanitize, encodeConfig, localTimeZone, weeklyTarget,
} from './config.js';
import { Stage, Clock, unlockAudio, playChime } from './render.js';
import { renderStill, hexToRgb } from './scenes.js';
import { TEMPLATES } from './templates.js';
import { h, group, rangeRow, colorRow, selectRow, seg, segRow, switchRow, textRow, row, contrast } from './ui.js';

const DRAFT_KEY = 'kairos.draft.v1';
const $ = (id) => document.getElementById(id);

const fontOptions = [
  { group: 'Clean', items: ['outfit', 'montserrat', 'spacegrotesk'].map((k) => ({ value: k, label: FONTS[k].name })) },
  { group: 'Tall and bold', items: ['oswald', 'bebas'].map((k) => ({ value: k, label: FONTS[k].name })) },
  { group: 'Classic', items: ['fraunces', 'playfair', 'cormorant', 'dmserif'].map((k) => ({ value: k, label: FONTS[k].name })) },
  { group: 'Handwritten', items: [{ value: 'greatvibes', label: FONTS.greatvibes.name }] },
];
const weightName = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };
const weightOptions = (font) => FONTS[font].weights.map((w) => ({ value: String(w), label: weightName[w] || String(w) }));

function assignDeep(target, src) {
  for (const k of Object.keys(target)) if (!(k in src)) delete target[k];
  for (const [k, v] of Object.entries(src)) {
    const cur = target[k];
    if (Array.isArray(v)) {
      const arr = Array.isArray(cur) ? cur : [];
      arr.length = v.length;
      v.forEach((item, i) => {
        if (item && typeof item === 'object' && arr[i] && typeof arr[i] === 'object') assignDeep(arr[i], item);
        else arr[i] = item;
      });
      target[k] = arr;
    } else if (v && typeof v === 'object') {
      if (cur && typeof cur === 'object' && !Array.isArray(cur)) assignDeep(cur, v); else target[k] = v;
    } else target[k] = v;
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw || raw.length > LIMITS.maxJson) return null;
    return sanitize(JSON.parse(raw));
  } catch { return null; }
}

export class Editor {
  constructor(cfg) {
    this.cfg = cfg;
    this.sel = 'timer';
    this.tab = 'start';
    this.history = [JSON.stringify(cfg)];
    this.hIndex = 0;
    this.clock = new Clock();
    this.phase = 'live';
    this.stage = new Stage($('editStage'), { editable: true });
    this.stage.root.classList.add('editable');
    this.stage.onEnd = () => { if (this.cfg.end.chime) playChime(this.cfg.end.volume / 100); };
    this.stage.setConfig(cfg);
    this.stage.start();
    this.clock.sync(cfg.time, false);
    this.bindChrome();
    this.bindDrag();
    this.renderPane();
    this.markSelection();
    this.updatePreviewBar();
    this.tick = setInterval(() => this.stage.update(this.clock.remaining(this.cfg.time)), 100);
    this.stage.update(this.clock.remaining(this.cfg.time), true);
  }

  // ---------------------------------------------------------------- state
  // `final` = the change is finished (mouse let go, field left), so it goes in undo history.
  commit(final = true, rerender = false) {
    // Clean the values but keep the same objects, so open controls stay linked.
    assignDeep(this.cfg, sanitize(this.cfg));
    this.stage.setConfig(this.cfg);
    this.clock.sync(this.cfg.time, false);
    this.markSelection();
    this.updatePreviewBar();
    if (final) this.pushHistory();
    this.saveDraft();
    if (rerender) this.renderPane();
  }

  pushHistory() {
    const snap = JSON.stringify(this.cfg);
    if (snap === this.history[this.hIndex]) return;
    this.history = this.history.slice(0, this.hIndex + 1);
    this.history.push(snap);
    if (this.history.length > 80) this.history.shift();
    this.hIndex = this.history.length - 1;
    this.updateUndo();
  }

  undo() { if (this.hIndex > 0) { this.hIndex--; this.restore(); } }
  redo() { if (this.hIndex < this.history.length - 1) { this.hIndex++; this.restore(); } }
  restore() {
    this.cfg = sanitize(JSON.parse(this.history[this.hIndex]));
    if (this.sel !== 'timer' && !this.cfg.texts.some((t) => t.id === this.sel)) this.sel = 'timer';
    this.stage.setConfig(this.cfg);
    this.clock.sync(this.cfg.time, false);
    this.saveDraft();
    this.renderPane();
    this.markSelection();
    this.updatePreviewBar();
    this.updateUndo();
  }
  updateUndo() {
    $('undoBtn').disabled = this.hIndex <= 0;
    $('redoBtn').disabled = this.hIndex >= this.history.length - 1;
  }

  saveDraft() {
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(this.cfg)); } catch { /* private mode: fine */ }
    }, 300);
  }

  // ---------------------------------------------------------------- chrome
  bindChrome() {
    $('undoBtn').onclick = () => this.undo();
    $('redoBtn').onclick = () => this.redo();
    $('copyBtn').onclick = () => this.copyLink('show');
    $('presentBtn').onclick = async () => { location.hash = 'show=' + await encodeConfig(this.cfg); };
    document.querySelectorAll('.tabs [role="tab"]').forEach((b) => {
      b.onclick = () => this.setTab(b.id.replace('tab-', ''));
      b.onkeydown = (e) => {
        const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
        const i = tabs.indexOf(b);
        const n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : -1;
        if (n >= 0) { tabs[n].focus(); tabs[n].click(); e.preventDefault(); }
      };
    });
    const segBtns = [...document.querySelectorAll('#phaseSeg button')];
    segBtns.forEach((b) => {
      b.onclick = () => {
        segBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        this.phase = b.dataset.v;
        this.stage.force = this.phase === 'live' ? null : this.phase;
        this.stage.update(this.clock.remaining(this.cfg.time), true);
        if (this.phase === 'after' && this.sel === 'timer' && this.cfg.timer.hideAtEnd) this.flashHint('The numbers hide at zero. You can change that in Numbers.');
      };
    });
    $('prevPlay').onclick = () => {
      unlockAudio();
      if (this.clock.running) this.clock.pause(); else {
        if (this.clock.remaining(this.cfg.time) <= 0) this.clock.restart(this.cfg.time, false);
        this.clock.play();
      }
      this.updatePreviewBar();
    };
    $('prevReset').onclick = () => { this.clock.restart(this.cfg.time, false); this.updatePreviewBar(); };

    document.addEventListener('keydown', (e) => {
      if (document.getElementById('editor').hidden) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); this.redo(); }
      else if (document.activeElement === this.stage.root && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const obj = this.selObj();
        if (e.key === 'ArrowLeft') obj.x -= step;
        if (e.key === 'ArrowRight') obj.x += step;
        if (e.key === 'ArrowUp') obj.y -= step;
        if (e.key === 'ArrowDown') obj.y += step;
        this.commit(true, false);
        this.syncPositionInputs();
      } else if (document.activeElement === this.stage.root && (e.key === 'Delete' || e.key === 'Backspace') && this.sel !== 'timer') {
        e.preventDefault();
        this.removeText(this.sel);
      }
    });
    document.addEventListener('pointerdown', () => unlockAudio(), { once: true });
  }

  setTab(name) {
    this.tab = name;
    if (name === 'words' && this.sel === 'timer' && this.cfg.texts.length) { this.sel = this.cfg.texts[0].id; this.markSelection(); }
    document.querySelectorAll('.tabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.id === 'tab-' + name)));
    document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.id !== 'pane-' + name; });
    this.renderPane();
    document.querySelector('.panes').scrollTop = 0;
  }

  selObj() { return this.sel === 'timer' ? this.cfg.timer : this.cfg.texts.find((t) => t.id === this.sel) || this.cfg.timer; }

  select(id, openTab = true) {
    this.sel = id;
    this.markSelection();
    if (openTab) {
      const want = id === 'timer' ? 'timer' : 'words';
      if (this.tab !== want) this.setTab(want); else this.renderPane();
    }
  }

  markSelection() {
    this.stage.root.querySelectorAll('.layer').forEach((e) => e.classList.toggle('sel', e.dataset.id === this.sel));
  }

  updatePreviewBar() {
    const t = this.cfg.time;
    const note = $('previewNote');
    const fmtTime = (ms, opts) => new Intl.DateTimeFormat(undefined, { ...opts }).format(new Date(ms));
    if (t.mode === 'date') {
      note.textContent = 'Counting to ' + fmtTime(t.at, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + '.';
    } else if (t.mode === 'weekly') {
      const next = weeklyTarget(t);
      note.textContent = `Every ${WEEKDAYS[t.wd]}. Next one: ${new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: t.tz, timeZoneName: 'short' }).format(new Date(next))}.`;
    } else {
      const mm = Math.floor(t.dur / 60), ss = t.dur % 60;
      note.textContent = `A ${mm}:${String(ss).padStart(2, '0')} timer. ${t.start === 'click' ? 'On the big screen it waits for you to press Start.' : 'On the big screen it starts as soon as it opens.'}`;
    }
    $('durControls').hidden = t.mode !== 'duration';
    $('prevPlay').textContent = this.clock.running ? 'Pause' : 'Start';
  }

  flashHint(text) { window.dispatchEvent(new CustomEvent('kairos:toast', { detail: { text } })); }

  async copyLink(kind) {
    const code = await encodeConfig(this.cfg);
    const url = location.origin + location.pathname + '#' + kind + '=' + code;
    try {
      await navigator.clipboard.writeText(url);
      this.flashHint(kind === 'show' ? 'Link copied. Anyone who opens it sees your countdown.' : 'Edit link copied.');
    } catch {
      this.setTab('share');
      this.flashHint('Copy the link from the box below.');
    }
    return url;
  }

  // ---------------------------------------------------------------- drag on preview
  bindDrag() {
    const root = this.stage.root;
    const gv = document.querySelector('.guide.v'), gh = document.querySelector('.guide.h');
    let drag = null;
    root.addEventListener('pointerdown', (e) => {
      const layer = e.target.closest('.layer');
      if (!layer || layer.classList.contains('hidden')) return;
      e.preventDefault();
      const id = layer.dataset.id;
      this.select(id);
      const rect = root.getBoundingClientRect();
      const obj = this.selObj();
      drag = { id, rect, sx: e.clientX, sy: e.clientY, ox: obj.x, oy: obj.y, moved: false, el: layer };
      layer.setPointerCapture(e.pointerId);
      layer.classList.add('dragging');
    });
    root.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.sx) / drag.rect.width * 100;
      const dy = (e.clientY - drag.sy) / drag.rect.height * 100;
      if (!drag.moved && Math.hypot(dx, dy) < 0.4) return;
      drag.moved = true;
      const obj = this.selObj();
      let x = drag.ox + dx, y = drag.oy + dy;
      const snapX = obj.align === 'left' || obj.align === 'right' ? false : Math.abs(x - 50) < 1.6;
      const snapY = Math.abs(y - 50) < 1.6;
      if (snapX) x = 50;
      if (snapY) y = 50;
      gv.classList.toggle('on', snapX);
      gh.classList.toggle('on', snapY);
      obj.x = Math.round(Math.max(-5, Math.min(105, x)) * 10) / 10;
      obj.y = Math.round(Math.max(-5, Math.min(105, y)) * 10) / 10;
      this.commit(false, false);
      this.syncPositionInputs();
    });
    const end = () => {
      if (!drag) return;
      drag.el.classList.remove('dragging');
      if (drag.moved) this.commit(true, false);
      gv.classList.remove('on'); gh.classList.remove('on');
      drag = null;
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('dblclick', (e) => {
      const layer = e.target.closest('.layer.text');
      if (!layer) return;
      this.select(layer.dataset.id);
      setTimeout(() => document.querySelector('#pane-words textarea')?.focus(), 30);
    });
  }

  syncPositionInputs() {
    const pane = document.querySelector('.pane:not([hidden])');
    const obj = this.selObj();
    pane?.querySelectorAll('[data-pos]').forEach((input) => {
      const v = obj[input.dataset.pos];
      input.value = v;
      const out = input.parentElement.querySelector('output');
      if (out) out.textContent = Math.round(v) + '%';
    });
  }

  // ---------------------------------------------------------------- panes
  renderPane() {
    const pane = $('pane-' + this.tab);
    pane.textContent = '';
    const fn = { start: this.paneStart, time: this.paneTime, words: this.paneWords, timer: this.paneTimer, bg: this.paneBg, share: this.paneShare }[this.tab];
    fn.call(this, pane);
  }

  positionRows(obj) {
    const r1 = rangeRow('Left / right', { min: -5, max: 105, step: 0.5, get: () => obj.x, set: (v, f) => { obj.x = v; this.commit(f); }, fmt: (v) => Math.round(v) + '%' });
    const r2 = rangeRow('Up / down', { min: -5, max: 105, step: 0.5, get: () => obj.y, set: (v, f) => { obj.y = v; this.commit(f); }, fmt: (v) => Math.round(v) + '%' });
    r1.querySelector('input').dataset.pos = 'x';
    r2.querySelector('input').dataset.pos = 'y';
    const center = h('button', { class: 'btn small ghost', type: 'button', text: 'Center left to right', onclick: () => { obj.x = 50; if (obj.align) obj.align = 'center'; this.commit(true, true); } });
    return [r1, r2, h('div', { class: 'btn-row' }, center)];
  }

  readability(color) {
    const bg = this.cfg.bg;
    const dimmed = hexToRgb(bg.base).map((c) => Math.round(c * (1 - bg.dim / 100)));
    const baseHex = '#' + dimmed.map((c) => c.toString(16).padStart(2, '0')).join('');
    const brightest = [bg.c1, bg.c2, bg.c3].map((c) => hexToRgb(c).map((v, i) => Math.round(dimmed[i] + (v - dimmed[i]) * 0.35 * (bg.amount / 100) * (1 - bg.dim / 100))))
      .map((rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join(''));
    const worst = Math.min(contrast(color, baseHex), ...brightest.map((b) => contrast(color, b)));
    return worst < 3 ? h('p', { class: 'warn', text: 'This color may be hard to read from the back of the room. Try a lighter color, or darken the background.' }) : null;
  }

  paneStart(pane) {
    const cards = h('div', { class: 'cards' });
    for (const tpl of TEMPLATES) {
      const pv = tpl.build();
      const cv = h('canvas', { width: 192, height: 108, 'aria-hidden': 'true' });
      const card = h('button', { class: 'card', type: 'button', 'aria-label': 'Start from ' + tpl.name },
        h('span', { class: 'thumb' }, cv, h('span', { class: 'tt', text: pv.texts[0]?.text || '12:00' })),
        h('span', { class: 'meta' }, h('b', { text: tpl.name })));
      card.onclick = () => {
        const prev = this.cfg;
        this.cfg = pv;
        this.sel = 'timer';
        this.clock.reset();
        this.commit(true, true);
        this.flashHintUndo(`Started from “${tpl.name}”.`, prev);
      };
      cards.append(card);
      requestAnimationFrame(() => renderStill(cv, pv.bg, 5));
    }
    pane.append(
      group('Pick a starting point', 'Everything can be changed after you pick one. Your work saves on this device as you go.', cards),
      group('How it works', null, h('ol', { class: 'steps' },
        h('li', { text: 'Set the time in Time.' }),
        h('li', { text: 'Change or add words in Words. Drag anything on the preview to move it.' }),
        h('li', { text: 'Pick an animation and colors in Background.' }),
        h('li', { text: 'Press Copy link and share it. Open it on the church screen and press F for full screen.' }),
      )),
    );
  }

  flashHintUndo(text, prevCfg) {
    window.dispatchEvent(new CustomEvent('kairos:toast', {
      detail: { text, action: 'Undo', onAction: () => { this.cfg = prevCfg; this.commit(true, true); } },
    }));
  }

  paneTime(pane) {
    const t = this.cfg.time;
    const mode = seg('Kind of countdown', {
      full: true,
      options: [{ value: 'weekly', label: 'Every week' }, { value: 'date', label: 'One date' }, { value: 'duration', label: 'Set length' }],
      get: () => t.mode,
      set: (v) => { t.mode = v; this.clock.reset(); this.commit(true, true); },
    });
    pane.append(group('What are you counting down to?', null, mode));

    if (t.mode === 'date') {
      const toLocal = (ms) => { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
      const input = h('input', { class: 'input', type: 'datetime-local', id: 'dtAt', value: toLocal(t.at) });
      input.addEventListener('change', () => {
        const ms = new Date(input.value).getTime();
        if (Number.isFinite(ms)) { t.at = ms; this.commit(true); }
      });
      const past = t.at < Date.now();
      pane.append(group('Date and time', 'Use your own time. People in other time zones will still see the right amount of time left.',
        row('Counts down to', input, 'dtAt'),
        past ? h('p', { class: 'warn', text: 'That time has already passed, so the countdown shows the zero screen.' }) : null));
    }

    if (t.mode === 'weekly') {
      const zones = (() => {
        let list = [];
        try { list = Intl.supportedValuesOf('timeZone'); } catch { list = []; }
        const common = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
        const set = new Set([t.tz, localTimeZone(), ...common]);
        return [
          { group: 'Common', items: [...set].map((z) => ({ value: z, label: z.replace(/_/g, ' ') })) },
          ...(list.length ? [{ group: 'All', items: list.filter((z) => !set.has(z)).map((z) => ({ value: z, label: z.replace(/_/g, ' ') })) }] : []),
        ];
      })();
      const timeInput = h('input', { class: 'input', type: 'time', id: 'wkTime', value: t.tm, step: 60 });
      timeInput.addEventListener('change', () => { if (/^\d\d:\d\d$/.test(timeInput.value)) { t.tm = timeInput.value; this.commit(true); } });
      pane.append(group('Every week', 'Great for Sunday services or youth night. It resets for next week by itself.',
        selectRow('Day', { options: WEEKDAYS.map((d, i) => ({ value: String(i), label: d })), get: () => t.wd, set: (v) => { t.wd = Number(v); this.commit(true); } }),
        row('Time', timeInput, 'wkTime'),
        selectRow('Time zone', { options: zones, get: () => t.tz, set: (v) => { t.tz = v; this.commit(true); } }),
        rangeRow('Show zero screen for', { min: 0, max: 240, step: 5, get: () => t.hold, set: (v, f) => { t.hold = v; this.commit(f); }, fmt: (v) => v + 'm' }),
        h('p', { class: 'hint', text: 'After it hits zero, the zero screen stays up for this many minutes. Then it starts counting to next week.' }),
      ));
    }

    if (t.mode === 'duration') {
      const mm = h('input', { class: 'input', type: 'number', min: 0, max: 5999, id: 'durM', value: Math.floor(t.dur / 60), inputmode: 'numeric' });
      const ss = h('input', { class: 'input', type: 'number', min: 0, max: 59, id: 'durS', value: t.dur % 60, inputmode: 'numeric' });
      const upd = () => {
        const v = Math.max(1, Math.min(359999, (parseInt(mm.value, 10) || 0) * 60 + Math.min(59, parseInt(ss.value, 10) || 0)));
        t.dur = v; this.clock.reset(); this.commit(true);
      };
      mm.addEventListener('change', upd); ss.addEventListener('change', upd);
      const quick = h('div', { class: 'btn-row' }, ...[1, 3, 5, 10, 15, 30].map((m) => h('button', {
        class: 'btn small', type: 'button', text: m + ' min',
        onclick: () => { t.dur = m * 60; this.clock.reset(); this.commit(true, true); },
      })));
      pane.append(group('Set length', 'Counts down a set amount of time, like a 10 minute break or a 3 minute prayer time.',
        h('div', { class: 'pair' }, h('div', { class: 'row stack' }, h('label', { for: 'durM', text: 'Minutes' }), mm), h('div', { class: 'row stack' }, h('label', { for: 'durS', text: 'Seconds' }), ss)),
        quick,
        segRow('Starts', { options: [{ value: 'click', label: 'When I press Start' }, { value: 'open', label: 'Right away' }], get: () => t.start, set: (v) => { t.start = v; this.commit(true); } }),
      ));
    }

    const e = this.cfg.end;
    pane.append(group('At zero', 'Words set to "At zero" in Words show up here. Use the "At zero" button under the preview to see it.',
      switchRow('Hide the numbers at zero', { get: () => this.cfg.timer.hideAtEnd, set: (v) => { this.cfg.timer.hideAtEnd = v; this.commit(true); } }),
      switchRow('Play a soft chime at zero', { get: () => e.chime, set: (v) => { e.chime = v; this.commit(true, true); } }),
      e.chime ? rangeRow('Chime volume', { min: 0, max: 100, step: 5, get: () => e.volume, set: (v, f) => { e.volume = v; this.commit(f); }, fmt: (v) => v + '%' }) : null,
      e.chime ? h('div', { class: 'btn-row' }, h('button', { class: 'btn small', type: 'button', text: 'Play chime', onclick: () => playChime(e.volume / 100) })) : null,
      e.chime ? h('p', { class: 'hint', text: 'Browsers only allow sound after someone clicks the page once. On the big screen, click anywhere once after it opens.' }) : null,
    ));

    pane.append(group('Page name', 'Shows in the browser tab.', textRow('Name', { max: LIMITS.maxTitleLen, get: () => this.cfg.title, set: (v, f) => { this.cfg.title = v; this.commit(f); } })));
  }

  paneWords(pane) {
    const list = h('div', { class: 'layer-list' });
    const whenLabel = { always: 'Always', before: 'While counting', after: 'At zero' };
    for (const t of this.cfg.texts) {
      list.append(h('button', {
        class: 'layer-item', type: 'button', 'aria-current': String(this.sel === t.id),
        onclick: () => this.select(t.id),
      }, h('span', { class: 'nm', text: t.text || '(empty)' }), h('span', { class: 'when', text: whenLabel[t.show] })));
    }
    const add = h('button', {
      class: 'btn small', type: 'button', text: '+ Add words', disabled: this.cfg.texts.length >= LIMITS.maxTexts,
      onclick: () => {
        const n = defaultText({ text: 'New words', y: 20 + (this.cfg.texts.length % 5) * 14, show: this.phase === 'after' ? 'after' : 'before' });
        this.cfg.texts.push(n);
        this.sel = n.id;
        this.commit(true, true);
        setTimeout(() => { const ta = document.querySelector('#pane-words textarea'); ta?.focus(); ta?.select(); }, 30);
      },
    });
    pane.append(group('Your words', 'Click words in the list or on the preview to change them. Drag on the preview to move them.',
      this.cfg.texts.length ? list : h('div', { class: 'empty-state', text: 'No words yet, so only the numbers show. Add words any time.' }),
      h('div', { class: 'btn-row' }, add)));

    const t = this.cfg.texts.find((x) => x.id === this.sel);
    if (!t) {
      if (this.cfg.texts.length) pane.append(h('p', { class: 'hint', text: 'Pick words above to change them.' }));
      return;
    }
    pane.append(group('Edit these words', null,
      textRow('Words', { multiline: true, max: LIMITS.maxTextLen, get: () => t.text, set: (v, f) => { t.text = v; this.commit(f); if (f) this.renderPane(); } }),
      segRow('Show', {
        options: [{ value: 'before', label: 'While counting' }, { value: 'after', label: 'At zero' }, { value: 'always', label: 'Always' }],
        get: () => t.show, set: (v) => { t.show = v; this.commit(true, true); },
      }),
    ));
    pane.append(group('Look', null,
      selectRow('Font', { options: fontOptions, get: () => t.font, set: (v) => { t.font = v; this.commit(true, true); } }),
      selectRow('Thickness', { options: weightOptions(t.font), get: () => t.weight, set: (v) => { t.weight = Number(v); this.commit(true); } }),
      rangeRow('Size', { min: 1, max: 40, step: 0.5, get: () => t.size, set: (v, f) => { t.size = v; this.commit(f); } }),
      colorRow('Color', { get: () => t.color, set: (v, f) => { t.color = v; this.commit(f, f); } }),
      this.readability(t.color),
      segRow('Line up', { options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], get: () => t.align, set: (v) => { t.align = v; this.commit(true); } }),
      rangeRow('Letter spacing', { min: -5, max: 40, step: 1, get: () => t.spacing, set: (v, f) => { t.spacing = v; this.commit(f); } }),
      rangeRow('See-through', { min: 10, max: 100, step: 5, get: () => t.opacity, set: (v, f) => { t.opacity = v; this.commit(f); }, fmt: (v) => v + '%' }),
      switchRow('Italic', { get: () => t.italic, set: (v) => { t.italic = v; this.commit(true); } }),
      switchRow('All capital letters', { get: () => t.upper, set: (v) => { t.upper = v; this.commit(true); } }),
      switchRow('Soft shadow (easier to read)', { get: () => t.shadow, set: (v) => { t.shadow = v; this.commit(true); } }),
    ));
    pane.append(group('Position', 'Or drag it on the preview. With the preview selected, arrow keys nudge it.', ...this.positionRows(t)));
    pane.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', type: 'button', text: 'Duplicate', disabled: this.cfg.texts.length >= LIMITS.maxTexts, onclick: () => {
        const c = { ...t, id: undefined };
        const n = defaultText({ ...c, y: Math.min(100, t.y + 10) });
        this.cfg.texts.push(n); this.sel = n.id; this.commit(true, true);
      } }),
      h('button', { class: 'btn small ghost danger', type: 'button', text: 'Remove', onclick: () => this.removeText(t.id) }),
    ));
  }

  removeText(id) {
    const prev = JSON.parse(JSON.stringify(this.cfg));
    const t = this.cfg.texts.find((x) => x.id === id);
    this.cfg.texts = this.cfg.texts.filter((x) => x.id !== id);
    this.sel = this.cfg.texts[0]?.id || 'timer';
    this.commit(true, true);
    this.flashHintUndo(`Removed “${(t?.text || '').slice(0, 30)}”.`, sanitize(prev));
  }

  paneTimer(pane) {
    const tm = this.cfg.timer;
    pane.append(group('Numbers', null,
      switchRow('Show the numbers', { get: () => tm.show, set: (v) => { tm.show = v; this.commit(true, true); } }),
    ));
    if (!tm.show) { pane.append(h('p', { class: 'hint', text: 'The numbers are hidden. Only your words and background will show.' })); return; }
    pane.append(group('Style', null,
      seg('Style', {
        full: true,
        options: [{ value: 'clock', label: '4:59' }, { value: 'labels', label: 'With labels' }, { value: 'tiles', label: 'Tiles' }],
        get: () => tm.style,
        set: (v) => { tm.style = v; if (v !== 'clock') tm.labels = true; this.commit(true, true); },
      }),
      selectRow('Show', {
        options: [
          { value: 'auto', label: 'Only what is needed' },
          { value: 'dhms', label: 'Days, hours, minutes, seconds' },
          { value: 'hms', label: 'Hours, minutes, seconds' },
          { value: 'ms', label: 'Minutes and seconds' },
        ],
        get: () => tm.units, set: (v) => { tm.units = v; this.commit(true); },
      }),
      switchRow('Labels under the numbers', { get: () => tm.labels, set: (v) => { tm.labels = v; this.commit(true, true); } }),
      tm.labels ? h('div', { class: 'pair' },
        textRow('Days', { max: LIMITS.maxLabelLen, get: () => tm.lbl.d, set: (v, f) => { tm.lbl.d = v; this.commit(f); } }),
        textRow('Hours', { max: LIMITS.maxLabelLen, get: () => tm.lbl.h, set: (v, f) => { tm.lbl.h = v; this.commit(f); } }),
        textRow('Minutes', { max: LIMITS.maxLabelLen, get: () => tm.lbl.m, set: (v, f) => { tm.lbl.m = v; this.commit(f); } }),
        textRow('Seconds', { max: LIMITS.maxLabelLen, get: () => tm.lbl.s, set: (v, f) => { tm.lbl.s = v; this.commit(f); } }),
      ) : null,
      selectRow('When numbers change', {
        options: [{ value: 'slide', label: 'Slide down' }, { value: 'rise', label: 'Rise up' }, { value: 'fade', label: 'Fade' }, { value: 'none', label: 'No motion' }],
        get: () => tm.motion, set: (v) => { tm.motion = v; this.commit(true); },
      }),
      switchRow('Gentle pulse in the last 10 seconds', { get: () => tm.pulse, set: (v) => { tm.pulse = v; this.commit(true); } }),
    ));
    pane.append(group('Look', null,
      selectRow('Font', { options: fontOptions, get: () => tm.font, set: (v) => { tm.font = v; this.commit(true, true); } }),
      selectRow('Thickness', { options: weightOptions(tm.font), get: () => tm.weight, set: (v) => { tm.weight = Number(v); this.commit(true); } }),
      rangeRow('Size', { min: 4, max: 60, step: 0.5, get: () => tm.size, set: (v, f) => { tm.size = v; this.commit(f); } }),
      colorRow('Color', { get: () => tm.color, set: (v, f) => { tm.color = v; this.commit(f, f); } }),
      this.readability(tm.color),
      rangeRow('Glow', { min: 0, max: 100, step: 5, get: () => tm.glow, set: (v, f) => { tm.glow = v; this.commit(f); }, fmt: (v) => v + '%' }),
      tm.style === 'tiles' ? colorRow('Tile color', { get: () => tm.tile, set: (v, f) => { tm.tile = v; this.commit(f); } }) : null,
    ));
    pane.append(group('Position', 'Or drag the numbers on the preview.', ...this.positionRows(tm)));
  }

  paneBg(pane) {
    const bg = this.cfg.bg;
    const cards = h('div', { class: 'cards' });
    const epicCards = h('div', { class: 'cards' });
    for (const s of SCENE_LIST) {
      const cv = h('canvas', { width: 192, height: 108, 'aria-hidden': 'true' });
      const card = h('button', { class: 'card', type: 'button', 'aria-pressed': String(bg.scene === s.id), 'aria-label': `${s.name}, ${s.feel}` },
        h('span', { class: 'thumb' }, cv),
        h('span', { class: 'meta' }, h('b', { text: s.name }), h('small', { text: s.feel })));
      card.onclick = () => { bg.scene = s.id; this.commit(true, true); };
      (s.feel === 'Epic' ? epicCards : cards).append(card);
      requestAnimationFrame(() => renderStill(cv, { ...bg, scene: s.id }, 5));
    }
    pane.append(
      group('Epic', 'Big and bold. Made to grab the room and look great on a livestream.', epicCards),
      group('Calm and classic', 'Softer motion that sits quietly behind your words.', cards),
    );

    const sw = h('div', { class: 'swatches' });
    for (const p of PALETTES) {
      const b = h('button', {
        class: 'swatch', type: 'button', 'aria-pressed': String(bg.palette === p.id), 'aria-label': p.name + ' colors',
        style: { background: `conic-gradient(from 200deg, ${p.c1}, ${p.c2}, ${p.c3}, ${p.c1})`, boxShadow: `inset 0 0 0 9px ${p.base}` },
        onclick: () => { Object.assign(bg, { palette: p.id, base: p.base, c1: p.c1, c2: p.c2, c3: p.c3 }); this.commit(true, true); },
      });
      sw.append(h('div', { class: 'swatch-wrap' }, b, h('span', { text: p.name })));
    }
    const custom = (k, label) => colorRow(label, { get: () => bg[k], set: (v, f) => { bg[k] = v; bg.palette = 'custom'; this.commit(f, f); } });
    pane.append(group('Colors', 'Pick a set, or choose your own below.', sw,
      custom('base', 'Background'), custom('c1', 'Color 1'), custom('c2', 'Color 2'), custom('c3', 'Color 3')));

    pane.append(group('Feel', null,
      rangeRow('Speed', { min: 0.2, max: 3, step: 0.1, get: () => bg.speed, set: (v, f) => { bg.speed = v; this.commit(f); }, fmt: (v) => v.toFixed(1) + 'x' }),
      rangeRow('Amount', { min: 0, max: 100, step: 5, get: () => bg.amount, set: (v, f) => { bg.amount = v; this.commit(f, f); }, fmt: (v) => v + '%' }),
      rangeRow('Darken', { min: 0, max: 85, step: 5, get: () => bg.dim, set: (v, f) => { bg.dim = v; this.commit(f, f); }, fmt: (v) => v + '%' }),
      h('p', { class: 'hint', text: 'Darken makes words easier to read on bright projectors and livestreams.' }),
      switchRow('Build up to zero', { get: () => bg.build, set: (v) => { bg.build = v; this.commit(true); } }),
      h('p', { class: 'hint', text: 'In the last minute the animation speeds up and brightens, then a soft burst of light fills the screen at zero.' }),
    ));
  }

  async paneShare(pane) {
    const box = h('input', { class: 'input', type: 'text', readonly: true, 'aria-label': 'Countdown link', value: 'Making your link…' });
    const editBox = h('input', { class: 'input', type: 'text', readonly: true, 'aria-label': 'Edit link', value: '' });
    pane.append(
      group('Share your countdown', 'This link holds all of your settings. Anyone who opens it sees the countdown, and it keeps working as long as this site is up.',
        h('div', { class: 'linkbox' }, box, h('button', { class: 'btn primary small', type: 'button', text: 'Copy', onclick: () => this.copyLink('show') })),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn small', type: 'button', text: 'Open it now', onclick: async () => { location.hash = 'show=' + await encodeConfig(this.cfg); } }),
        )),
      group('Save a copy you can edit later', 'Bookmark this link, or keep it in your notes. It opens this editor with everything set up.',
        h('div', { class: 'linkbox' }, editBox, h('button', { class: 'btn small', type: 'button', text: 'Copy', onclick: () => this.copyLink('edit') }))),
      group('On the church screen', null, h('ol', { class: 'steps' },
        h('li', { text: 'Open the link in Chrome, Edge, Safari, or Firefox.' }),
        h('li', { text: 'Press F (or the Full screen button) to fill the screen.' }),
        h('li', { text: 'Move the mouse to see the buttons again. Press Esc to leave full screen.' }),
        h('li', { text: 'For "Set length" timers, press the space bar to start or pause and R to restart.' }),
      )),
      group('Good to know', null, h('ul', { class: 'steps' },
        h('li', { text: 'Changing the countdown makes a new link. Old links keep showing the old version.' }),
        h('li', { text: 'Nothing is uploaded. The settings ride inside the link itself.' }),
      )),
    );
    const code = await encodeConfig(this.cfg);
    const base = location.origin + location.pathname;
    box.value = base + '#show=' + code;
    editBox.value = base + '#edit=' + code;
    box.onfocus = () => box.select();
    editBox.onfocus = () => editBox.select();
  }
}

export { APP_VERSION };
