// Starting points. All wording is original or a short, common phrase.
import { defaultConfig, defaultText, sanitize, PALETTES } from './config.js';

const pal = (id) => {
  const p = PALETTES.find((x) => x.id === id);
  return { palette: id, base: p.base, c1: p.c1, c2: p.c2, c3: p.c3 };
};

function make(over) {
  const d = defaultConfig();
  const c = {
    ...d,
    ...over,
    time: { ...d.time, ...(over.time || {}) },
    timer: { ...d.timer, ...(over.timer || {}), lbl: { ...d.timer.lbl, ...((over.timer || {}).lbl || {}) } },
    bg: { ...d.bg, ...(over.bg || {}) },
    end: { ...d.end, ...(over.end || {}) },
    texts: (over.texts || d.texts).map((t) => defaultText(t)),
  };
  return sanitize(c);
}

export const TEMPLATES = [
  {
    id: 'sunday', name: 'Sunday morning', scene: 'aurora', palette: 'midnight',
    build: () => make({
      title: 'Sunday service',
      bg: { scene: 'aurora', ...pal('midnight'), amount: 60, dim: 10 },
      texts: [
        { text: 'Service begins in', y: 31, size: 5.5, weight: 400, spacing: 3 },
        { text: 'Welcome home', y: 50, size: 13, font: 'fraunces', weight: 500, show: 'after' },
      ],
      timer: { style: 'clock', y: 55, size: 24, labels: false, glow: 35 },
    }),
  },
  {
    id: 'lightspeed', name: 'Lightspeed', scene: 'lightspeed', palette: 'royal',
    build: () => make({
      title: 'Service starts soon',
      bg: { scene: 'lightspeed', ...pal('royal'), amount: 70, dim: 15, speed: 1 },
      texts: [
        { text: 'Service starts in', y: 29, size: 6, font: 'outfit', weight: 600, spacing: 10, upper: true },
        { text: "Let's worship", y: 50, size: 16, font: 'bebas', weight: 400, spacing: 4, upper: true, show: 'after' },
      ],
      timer: { style: 'clock', y: 55, size: 30, font: 'bebas', weight: 400, labels: false, glow: 60, motion: 'rise' },
    }),
  },
  {
    id: 'arena', name: 'Arena', scene: 'arena', palette: 'neon',
    build: () => make({
      title: 'Worship night',
      bg: { scene: 'arena', ...pal('neon'), amount: 70, dim: 10 },
      texts: [
        { text: 'Worship night', y: 23, size: 13, font: 'oswald', weight: 700, spacing: 3, upper: true },
        { text: 'Starts in', y: 36, size: 4.6, font: 'outfit', weight: 600, spacing: 12, upper: true, color: '#22e1ff' },
        { text: 'Here we go', y: 50, size: 18, font: 'oswald', weight: 700, spacing: 3, upper: true, show: 'after' },
      ],
      timer: { style: 'tiles', y: 62, size: 20, font: 'oswald', weight: 600, labels: true, glow: 45, motion: 'rise', tile: '#7a3cff' },
    }),
  },
  {
    id: 'glory', name: 'Glory', scene: 'glory', palette: 'easter',
    build: () => make({
      title: 'Sunday celebration',
      bg: { scene: 'glory', ...pal('royal'), amount: 60, dim: 25, speed: 1 },
      texts: [
        { text: 'Sunday celebration', y: 27, size: 9.5, font: 'cormorant', weight: 700, color: '#ffe7a8' },
        { text: 'begins in', y: 38, size: 4.8, font: 'outfit', weight: 500, spacing: 8, upper: true },
        { text: 'Welcome home', y: 50, size: 15, font: 'cormorant', weight: 700, color: '#ffe7a8', show: 'after' },
      ],
      timer: { style: 'clock', y: 58, size: 25, font: 'outfit', weight: 700, labels: false, glow: 55 },
    }),
  },
  {
    id: 'heartbeat', name: 'Heartbeat', scene: 'heartbeat', palette: 'neon',
    build: () => make({
      title: 'Youth',
      time: { mode: 'weekly', wd: 3, tm: '19:00' },
      bg: { scene: 'heartbeat', ...pal('neon'), amount: 65, dim: 0 },
      texts: [
        { text: 'Youth', y: 20, size: 20, font: 'bebas', weight: 400, spacing: 8, upper: true },
        { text: "Let's go!", y: 45, size: 22, font: 'bebas', weight: 400, spacing: 6, upper: true, show: 'after' },
      ],
      timer: { style: 'clock', y: 45, size: 26, font: 'bebas', weight: 400, labels: false, glow: 70, color: '#ffffff', motion: 'rise' },
    }),
  },
  {
    id: 'newyear', name: "New Year's Eve", scene: 'fireworks', palette: 'midnight',
    build: () => {
      const y = new Date().getFullYear();
      let at = new Date(y + 1, 0, 1, 0, 0, 0).getTime();
      return make({
        title: "New Year's Eve",
        time: { mode: 'date', at },
        bg: { scene: 'fireworks', ...pal('midnight'), amount: 60, dim: 0 },
        texts: [
          { text: String(y + 1), y: 24, size: 16, font: 'fraunces', weight: 800, color: '#f5c451' },
          { text: 'Happy New Year!', y: 48, size: 14, font: 'fraunces', weight: 700, show: 'after' },
          { text: 'A new year of grace', y: 62, size: 5, font: 'outfit', weight: 500, spacing: 4, show: 'after' },
        ],
        timer: { style: 'labels', y: 58, size: 18, font: 'outfit', weight: 700, labels: true, glow: 40, hideAtEnd: true },
      });
    },
  },
  {
    id: 'galaxy', name: 'Beyond', scene: 'galaxy', palette: 'advent',
    build: () => make({
      title: 'Beyond',
      bg: { scene: 'galaxy', ...pal('advent'), amount: 65, dim: 10 },
      texts: [
        { text: 'Our service begins in', y: 24, size: 5.5, font: 'spacegrotesk', weight: 500, spacing: 6, upper: true },
        { text: 'Welcome', y: 50, size: 16, font: 'spacegrotesk', weight: 700, show: 'after' },
      ],
      timer: { style: 'clock', y: 76, size: 18, font: 'spacegrotesk', weight: 600, labels: false, glow: 45 },
    }),
  },
  {
    id: 'numbers', name: 'Numbers only', scene: 'glow', palette: 'midnight',
    build: () => make({
      title: 'Countdown',
      bg: { scene: 'glow', ...pal('midnight'), amount: 55, dim: 0 },
      texts: [],
      timer: { style: 'clock', y: 50, size: 36, labels: false, glow: 25, weight: 500, hideAtEnd: false },
    }),
  },
  {
    id: 'youth', name: 'Youth night', scene: 'halo', palette: 'sunrise',
    build: () => make({
      title: 'Youth night',
      time: { mode: 'weekly', wd: 3, tm: '19:00' },
      bg: { scene: 'halo', ...pal('sunrise'), amount: 70, dim: 15, speed: 1.2 },
      texts: [
        { text: 'Youth night', y: 22, size: 15, font: 'bebas', weight: 400, spacing: 6, upper: true },
        { text: 'Starts in', y: 36, size: 4.5, font: 'outfit', weight: 500, spacing: 8 },
        { text: "Let's go!", y: 50, size: 20, font: 'bebas', weight: 400, spacing: 4, show: 'after' },
      ],
      timer: { style: 'tiles', y: 62, size: 18, font: 'bebas', weight: 400, labels: true, glow: 20, motion: 'rise' },
    }),
  },
  {
    id: 'christmas', name: 'Christmas Eve', scene: 'snow', palette: 'christmas',
    build: () => {
      const y = new Date().getFullYear();
      let at = new Date(y, 11, 24, 18, 0, 0).getTime();
      if (at < Date.now()) at = new Date(y + 1, 11, 24, 18, 0, 0).getTime();
      return make({
        title: 'Christmas Eve service',
        time: { mode: 'date', at },
        bg: { scene: 'snow', ...pal('christmas'), amount: 55, dim: 5 },
        texts: [
          { text: 'Christmas Eve', y: 24, size: 13, font: 'playfair', weight: 400, italic: true, color: '#f2cc6b' },
          { text: 'Candlelight service begins in', y: 38, size: 4.2, weight: 400, spacing: 2 },
          { text: 'Merry Christmas', y: 50, size: 14, font: 'playfair', weight: 400, italic: true, color: '#f2cc6b', show: 'after' },
        ],
        timer: { style: 'labels', y: 60, size: 17, font: 'playfair', weight: 400, labels: true, glow: 30, units: 'auto' },
      });
    },
  },
  {
    id: 'easter', name: 'Easter sunrise', scene: 'rays', palette: 'easter',
    build: () => make({
      title: 'Easter Sunday',
      bg: { scene: 'rays', ...pal('easter'), amount: 65, dim: 12 },
      texts: [
        { text: 'Easter Sunday', y: 27, size: 11, font: 'cormorant', weight: 700, color: '#fff4d6' },
        { text: 'Celebration begins in', y: 39, size: 4.4, weight: 400, spacing: 3 },
        { text: 'He is risen', y: 50, size: 15, font: 'cormorant', weight: 700, color: '#fff4d6', show: 'after' },
      ],
      timer: { style: 'clock', y: 58, size: 22, font: 'cormorant', weight: 500, labels: false, color: '#ffffff', glow: 45 },
    }),
  },
  {
    id: 'glass', name: 'Stained glass', scene: 'glass', palette: 'advent',
    build: () => make({
      title: 'Worship',
      bg: { scene: 'glass', ...pal('advent'), amount: 45, dim: 35 },
      texts: [
        { text: 'Worship begins in', y: 30, size: 6, font: 'fraunces', weight: 500 },
        { text: 'Let us worship', y: 50, size: 12, font: 'fraunces', weight: 600, show: 'after' },
      ],
      timer: { style: 'tiles', y: 56, size: 20, font: 'fraunces', weight: 600, labels: true, tile: '#000000', glow: 10 },
    }),
  },
  {
    id: 'quiet', name: 'Quiet moment', scene: 'waters', palette: 'ocean',
    build: () => make({
      title: 'Be still',
      bg: { scene: 'waters', ...pal('ocean'), amount: 55, dim: 5, speed: 0.7 },
      texts: [
        { text: 'Be still', y: 34, size: 14, font: 'cormorant', weight: 500, italic: true },
        { text: 'We begin together soon', y: 50, size: 9, font: 'cormorant', weight: 500, italic: true, show: 'after' },
      ],
      timer: { style: 'clock', y: 54, size: 10, font: 'outfit', weight: 300, labels: false, glow: 15, motion: 'fade' },
    }),
  },
  {
    id: 'break', name: 'Break timer', scene: 'nightsky', palette: 'midnight',
    build: () => make({
      title: 'Break',
      time: { mode: 'duration', dur: 600, start: 'click' },
      bg: { scene: 'nightsky', ...pal('midnight'), amount: 60, dim: 0 },
      texts: [
        { text: "We'll be back in", y: 30, size: 6, weight: 400 },
        { text: 'Welcome back', y: 50, size: 12, font: 'fraunces', weight: 500, show: 'after' },
      ],
      timer: { style: 'clock', y: 55, size: 26, labels: false, glow: 30 },
      end: { chime: true },
    }),
  },
  {
    id: 'fire', name: 'Spirit and fire', scene: 'embers', palette: 'ember',
    build: () => make({
      title: 'Night of worship',
      bg: { scene: 'embers', ...pal('ember'), amount: 65, dim: 8 },
      texts: [
        { text: 'Night of worship', y: 27, size: 10, font: 'oswald', weight: 600, spacing: 2, upper: true },
        { text: 'Doors open in', y: 39, size: 4.4, font: 'oswald', weight: 400, spacing: 6 },
        { text: 'Come on in', y: 50, size: 14, font: 'oswald', weight: 600, upper: true, show: 'after' },
      ],
      timer: { style: 'labels', y: 58, size: 19, font: 'oswald', weight: 500, labels: true, glow: 40, color: '#ffe2b8' },
    }),
  },
  {
    id: 'simple', name: 'Simple and clean', scene: 'none', palette: 'mono',
    build: () => make({
      title: 'Countdown',
      bg: { scene: 'none', ...pal('mono'), amount: 40, dim: 0 },
      texts: [
        { text: 'Starting soon', y: 34, size: 6, font: 'spacegrotesk', weight: 500 },
        { text: "We're starting", y: 50, size: 10, font: 'spacegrotesk', weight: 600, show: 'after' },
      ],
      timer: { style: 'labels', y: 56, size: 20, font: 'spacegrotesk', weight: 600, labels: true, glow: 0, motion: 'fade' },
    }),
  },
];
