// Small helpers for building form controls without innerHTML.

let uid = 0;
const nid = (p) => `${p}-${++uid}`;

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

export function group(title, hint, ...kids) {
  return h('div', { class: 'group' }, title ? h('h3', { text: title }) : null, hint ? h('p', { class: 'hint', text: hint }) : null, ...kids);
}

export function row(label, control, id) {
  return h('div', { class: 'row' }, h('label', { for: id, text: label }), control);
}

export function rangeRow(label, { min, max, step = 1, get, set, fmt = (v) => v }) {
  const id = nid('r');
  const out = h('output', { for: id, text: fmt(get()) });
  const input = h('input', { type: 'range', id, min, max, step, value: get() });
  input.addEventListener('input', () => { const v = Number(input.value); out.textContent = fmt(v); set(v, false); });
  input.addEventListener('change', () => set(Number(input.value), true));
  return row(label, h('div', { class: 'range' }, input, out), id);
}

export function colorRow(label, { get, set }) {
  const id = nid('c');
  const pick = h('input', { type: 'color', id, value: get(), 'aria-label': label + ' color' });
  const hex = h('input', { class: 'input hex', type: 'text', value: get(), maxlength: 7, spellcheck: 'false', 'aria-label': label + ' color code' });
  pick.addEventListener('input', () => { hex.value = pick.value; set(pick.value, false); });
  pick.addEventListener('change', () => set(pick.value, true));
  hex.addEventListener('change', () => {
    let v = hex.value.trim();
    if (/^[0-9a-f]{6}$/i.test(v)) v = '#' + v;
    if (/^#[0-9a-f]{6}$/i.test(v)) { pick.value = v.toLowerCase(); hex.value = v.toLowerCase(); set(v.toLowerCase(), true); } else hex.value = pick.value;
  });
  return row(label, h('div', { class: 'color' }, pick, hex), id);
}

export function selectRow(label, { options, get, set }) {
  const id = nid('s');
  const sel = h('select', { class: 'input', id });
  for (const o of options) {
    if (o.group) {
      const og = h('optgroup', { label: o.group });
      o.items.forEach((x) => og.append(h('option', { value: x.value, text: x.label })));
      sel.append(og);
    } else sel.append(h('option', { value: o.value, text: o.label }));
  }
  sel.value = String(get());
  sel.addEventListener('change', () => set(sel.value, true));
  return row(label, sel, id);
}

export function seg(label, { options, get, set, full = false }) {
  const wrap = h('div', { class: 'seg' + (full ? ' full' : ''), role: 'radiogroup', 'aria-label': label });
  const btns = options.map((o) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(get() === o.value), text: o.label, title: o.title });
    b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', 'true');
      set(o.value, true);
    });
    b.addEventListener('keydown', (e) => {
      const i = btns.indexOf(b);
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -9;
      if (n >= 0 && n < btns.length) { btns[n].focus(); btns[n].click(); e.preventDefault(); }
    });
    return b;
  });
  wrap.append(...btns);
  return wrap;
}

export function segRow(label, opts) {
  const s = seg(label, opts);
  return h('div', { class: 'row' }, h('span', { class: 'lab', text: label }), s);
}

export function switchRow(label, { get, set }) {
  const input = h('input', { type: 'checkbox', role: 'switch' });
  input.checked = !!get();
  input.addEventListener('change', () => set(input.checked, true));
  return h('label', { class: 'switch' }, h('span', { text: label }), input);
}

export function textRow(label, { get, set, max = 240, multiline = false, placeholder = '' }) {
  const id = nid('t');
  const input = multiline
    ? h('textarea', { class: 'input', id, maxlength: max, rows: 2, placeholder })
    : h('input', { class: 'input', id, type: 'text', maxlength: max, placeholder });
  input.value = get();
  input.addEventListener('input', () => set(input.value, false));
  input.addEventListener('change', () => set(input.value, true));
  return h('div', { class: 'row stack' }, h('label', { for: id, text: label }), input);
}

// WCAG contrast ratio of two hex colors.
export function contrast(a, b) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
