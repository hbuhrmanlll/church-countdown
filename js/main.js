// Starts the app: picks editor or display from the link, and wires shared bits.
import { APP_VERSION, decodeConfig, encodeConfig } from './config.js';
import { Stage, Clock, unlockAudio, audioReady, playChime } from './render.js';
import { Editor, loadDraft } from './editor.js';
import { TEMPLATES } from './templates.js';

const $ = (id) => document.getElementById(id);
let editor = null;
let display = null;

// ---------------------------------------------------------------- toast
let toastT;
function toast(text, action, onAction) {
  const t = $('toast');
  $('toastText').textContent = text;
  const btn = $('toastAction');
  btn.hidden = !action;
  if (action) { btn.textContent = action; btn.onclick = () => { t.hidden = true; onAction(); }; }
  t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, action ? 6000 : 3200);
}
window.addEventListener('kairos:toast', (e) => toast(e.detail.text, e.detail.action, e.detail.onAction));

// ---------------------------------------------------------------- about / updates
function setupAbout() {
  $('verText').textContent = APP_VERSION;
  $('yearText').textContent = String(new Date().getFullYear());
  $('aboutBtn').onclick = () => { $('updateLine').textContent = ''; $('aboutDlg').showModal(); };
  $('updateBtn').onclick = async () => {
    const line = $('updateLine');
    line.textContent = 'Checking…';
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error();
      const v = await r.json();
      const latest = typeof v.version === 'string' && /^\d+\.\d+\.\d+$/.test(v.version) ? v.version : null;
      if (!latest) throw new Error();
      const newer = latest.split('.').map(Number).some((n, i, a) => {
        const cur = APP_VERSION.split('.').map(Number);
        for (let j = 0; j < 3; j++) { if (a[j] !== cur[j]) return a[j] > cur[j]; }
        return false;
      });
      if (newer) {
        line.textContent = '';
        line.append(`Version ${latest} is ready. `);
        const b = document.createElement('button');
        b.className = 'btn small primary';
        b.type = 'button';
        b.textContent = 'Update';
        b.onclick = () => location.reload();
        line.append(b);
      } else line.textContent = 'You have the newest version.';
    } catch {
      line.textContent = "Couldn't check right now. Check your internet and try again.";
    }
  };
}

// ---------------------------------------------------------------- splash
function splash() {
  let seen = false;
  try { seen = sessionStorage.getItem('kairos.splash') === '1'; sessionStorage.setItem('kairos.splash', '1'); } catch { /* ignore */ }
  if (seen) return;
  const s = $('splash');
  s.hidden = false;
  const hide = () => { s.classList.add('out'); setTimeout(() => { s.hidden = true; }, 450); };
  s.onclick = hide;
  setTimeout(hide, 1300);
}

// ---------------------------------------------------------------- display mode
class Display {
  constructor(cfg) {
    this.cfg = cfg;
    this.root = $('display');
    this.clock = new Clock();
    this.stage = new Stage($('showStage'));
    this.stage.onEnd = () => { if (cfg.end.chime) playChime(cfg.end.volume / 100); };
    this.stage.setConfig(cfg);
    this.stage.start();
    const isDur = cfg.time.mode === 'duration';
    this.clock.sync(cfg.time, isDur && cfg.time.start === 'open');
    document.title = cfg.title || 'Countdown';
    this.ui();
    this.loop = setInterval(() => this.stage.update(this.clock.remaining(cfg.time)), 100);
    this.stage.update(this.clock.remaining(cfg.time), true);
    this.wake();
    document.addEventListener('visibilitychange', this.onVis = () => { if (document.visibilityState === 'visible') this.wake(); });
  }

  async wake() {
    try { if ('wakeLock' in navigator) this.lock = await navigator.wakeLock.request('screen'); } catch { /* not allowed: fine */ }
  }

  ui() {
    const cfg = this.cfg;
    const isDur = cfg.time.mode === 'duration';
    $('playBtn').hidden = !isDur;
    $('restartBtn').hidden = !isDur;
    $('soundBtn').hidden = !cfg.end.chime || audioReady();
    $('showStart').hidden = !(isDur && !this.clock.running);
    this.refreshPlay();

    $('fsBtn').onclick = () => this.toggleFs();
    $('playBtn').onclick = () => this.togglePlay();
    $('restartBtn').onclick = () => this.restart();
    $('showStartBtn').onclick = () => this.togglePlay();
    $('soundBtn').onclick = () => { unlockAudio(); setTimeout(() => { $('soundBtn').hidden = audioReady(); if (audioReady()) toast('Sound is on.'); }, 100); };
    encodeConfig(cfg).then((code) => { $('editCopy').href = '#edit=' + code; });

    this.keys = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'f') { e.preventDefault(); this.toggleFs(); }
      else if (isDur && (k === ' ' || k === 'k')) { e.preventDefault(); this.togglePlay(); }
      else if (isDur && k === 'r') { e.preventDefault(); this.restart(); }
      this.poke();
    };
    document.addEventListener('keydown', this.keys);
    this.root.onpointermove = () => this.poke();
    this.root.onpointerdown = () => { unlockAudio(); $('soundBtn').hidden = !cfg.end.chime || audioReady(); this.poke(); };
    this.root.ondblclick = (e) => { if (!e.target.closest('.btn')) this.toggleFs(); };
    this.poke();
    if (!document.fullscreenElement) setTimeout(() => toast('Press F for full screen'), 900);
  }

  poke() {
    this.root.classList.remove('idle');
    clearTimeout(this.idleT);
    this.idleT = setTimeout(() => this.root.classList.add('idle'), (matchMedia('(pointer: coarse)').matches ? 6000 : 2500));
  }

  refreshPlay() {
    $('playBtn').firstChild.textContent = this.clock.running ? 'Pause ' : 'Start ';
  }

  togglePlay() {
    unlockAudio();
    if (this.clock.running) this.clock.pause();
    else {
      if (this.clock.remaining(this.cfg.time) <= 0) this.clock.restart(this.cfg.time, false);
      this.clock.play();
    }
    $('showStart').hidden = true;
    this.refreshPlay();
    this.stage.update(this.clock.remaining(this.cfg.time), true);
  }

  restart() {
    this.clock.restart(this.cfg.time, false);
    $('showStart').hidden = false;
    this.refreshPlay();
    this.stage.update(this.clock.remaining(this.cfg.time), true);
  }

  toggleFs() {
    const d = document;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else {
        const el = d.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) Promise.resolve(req.call(el)).catch(() => toast("This browser won't go full screen here. Try the browser's own full screen (F11)."));
        else toast("This browser doesn't support full screen here. On iPhone, add it to your home screen.");
      }
    } catch { /* ignore */ }
  }

  destroy() {
    clearInterval(this.loop);
    clearTimeout(this.idleT);
    this.stage.stop();
    document.removeEventListener('keydown', this.keys);
    document.removeEventListener('visibilitychange', this.onVis);
    try { this.lock?.release(); } catch { /* ignore */ }
    $('showStage').replaceChildren();
    $('showStage').className = '';
  }
}

// ---------------------------------------------------------------- routing
async function route() {
  const hash = location.hash.slice(1);
  const m = /^(show|edit)=(.+)$/.exec(hash);
  $('errorView').hidden = true;

  if (m && m[1] === 'show') {
    try {
      const cfg = await decodeConfig(m[2]);
      if (editor) { $('editor').hidden = true; editor.stage.stop(); }
      if (display) display.destroy();
      $('display').hidden = false;
      display = new Display(cfg);
    } catch (err) {
      showError(err);
    }
    return;
  }

  // editor
  if (display) { display.destroy(); display = null; $('display').hidden = true; }
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  let cfg = null;
  if (m && m[1] === 'edit') {
    try { cfg = await decodeConfig(m[2]); } catch (err) { showError(err); return; }
    history.replaceState(null, '', location.pathname);
  }
  $('editor').hidden = false;
  document.title = 'Kairos Countdown';
  if (!editor) {
    splash();
    const draft = cfg ? null : loadDraft();
    editor = new Editor(cfg || draft || TEMPLATES[0].build());
    if (!cfg && !draft) editor.startWizard();
    if (cfg) toast('Opened a copy you can edit.');
  } else {
    editor.stage.start();
    if (cfg) { editor.cfg = cfg; editor.clock.reset(); editor.commit(true, true); toast('Opened a copy you can edit.'); }
  }
}

function showError(err) {
  $('editor').hidden = true;
  $('display').hidden = true;
  $('errorView').hidden = false;
  const msg = err && /browser/.test(err.message) ? err.message : 'The link may be cut off or changed. Ask for the link again, or make your own countdown.';
  $('errorText').textContent = msg;
}

setupAbout();
window.addEventListener('hashchange', route);
// Wait for fonts so digit widths measure right, but never block more than a moment.
const fontsLoaded = document.fonts ? Promise.all([...document.fonts].map((f) => f.load().catch(() => null))) : Promise.resolve();
Promise.race([fontsLoaded, new Promise((r) => setTimeout(r, 1500))]).then(route);
