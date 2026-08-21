// trends.jsx — Trends/Analytics: parameter catalog, pen store, send-to-trend wiring,
// and the multi-series trend chart. Loaded after dialogs.jsx (uses window.genTrend).
//
// A "pen" is one plotted parameter: { id, name, tag, unit, base, amp, color, group, hidden }.
// njSendToTrend(idOrTag, meta?) adds a pen + navigates to Analytics. Any element carrying
// data-trend (+ optional data-trend-name/unit/val/group) becomes a clickable send-to-trends hit
// via a single delegated listener — see below.

// curated categorical pen palette (reads as data series, not status)
const TREND_PALETTE = ["#00AEEE", "#7C5CFC", "#00C483", "#E0529C", "#0E7490", "#F2A900", "#EF6C4D", "#5C646F"];

// the signed-in operator (owner attribution for Trend Groups)
const NJ_CURRENT_USER = "E. Sørensen";

// well-known parameters across the facility — tag is the canonical id
const TREND_CATALOG = [
  // Fish Tank
  { tag: "DPT1-FT0-OT1",  name: "O₂ saturation",      unit: "%",    base: 93.1,  amp: 2.6,  group: "Fish Tank" },
  { tag: "DPT1-FT0-LT1",  name: "Water level",        unit: "cm",   base: 176,   amp: 6,    group: "Fish Tank" },
  { tag: "DPT1-FT0-TT1",  name: "Temperature",        unit: "°C",   base: 12.5,  amp: 0.5,  group: "Fish Tank" },
  // Pump Sump
  { tag: "DPT1-SMP0-PH1", name: "pH 1",               unit: "pH",   base: 6.9,   amp: 0.18, group: "Pump Sump" },
  { tag: "DPT1-SMP0-PH2", name: "pH 2",               unit: "pH",   base: 6.7,   amp: 0.18, group: "Pump Sump" },
  { tag: "DPT1-SMP0-QT1", name: "CO₂ in sump",        unit: "mg/L", base: 6.8,   amp: 1.1,  group: "Pump Sump" },
  { tag: "DPT1-SMP0-OT1", name: "O₂ saturation",      unit: "%",    base: 95.2,  amp: 2.2,  group: "Pump Sump" },
  { tag: "DPT1-SMP0-LT1", name: "Sump level",         unit: "cm",   base: 191,   amp: 7,    group: "Pump Sump" },
  { tag: "DPT1-SMP0-PT1", name: "Total pressure",     unit: "bar",  base: 2.0,   amp: 0.12, group: "Pump Sump" },
  // RAS / biofilter / drum filter
  { tag: "DPT1-AEB0-BL1", name: "Biofilter blower",   unit: "Hz",   base: 42,    amp: 4,    group: "RAS" },
  { tag: "DPT1-FIL0-DP1", name: "Drum filter ΔP",     unit: "bar",  base: 0.03,  amp: 0.012,group: "RAS" },
  { tag: "DPT1-FIL0-LT1", name: "Level before filter",unit: "cm",   base: 59,    amp: 4,    group: "RAS" },
  // CO₂ stripper / oxygenation
  { tag: "DPT1-STR0-FAN", name: "CO₂ fan activity",   unit: "Hz",   base: 49,    amp: 5,    group: "CO₂ Stripper" },
  { tag: "DPT1-STR0-PT1", name: "Stripping vacuum",   unit: "mbar", base: -44.4, amp: 4,    group: "CO₂ Stripper" },
  { tag: "DPT1-DOX0-OT1", name: "Cone O₂ saturation", unit: "%",    base: 87.9,  amp: 3,    group: "Oxygenation" },
  { tag: "DPT1-DOX0-PT1", name: "Cone pressure",      unit: "bar",  base: 2.0,   amp: 0.1,  group: "Oxygenation" },
  // Water treatment
  { tag: "WT0-FT1",       name: "Intake flow",        unit: "L/s",  base: 91.6,  amp: 6,    group: "Water Treatment" },
  { tag: "WT0-TT1",       name: "Intake water temp",  unit: "°C",   base: 6.2,   amp: 0.4,  group: "Water Treatment" },
  { tag: "WT0-FT2",       name: "Make-up flow",       unit: "L/s",  base: 4.0,   amp: 0.6,  group: "Water Treatment" },
  // Energy + feeding
  { tag: "DPT1-EP0-PWR",  name: "Power · DPT1",       unit: "kW",   base: 53.9,  amp: 8,    group: "Energy" },
  { tag: "DPT1-FEED-RATE",name: "Feed rate",          unit: "kg/h", base: 40.9,  amp: 5,    group: "Feeding" },
];
const TREND_BY_TAG = {};
TREND_CATALOG.forEach((c) => { TREND_BY_TAG[c.tag] = c; });

// deterministic hash → seed
function trendSeed(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return (h % 100) / 13;
}
// points-per-range
const TREND_RANGES = { "1h": 60, "6h": 72, "24h": 96, "7d": 84 };
const RANGE_HOURS = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 };
// sampling intervals for the explicit date-range picker
const INTERVALS = [
  { k: "1h", label: "1 hour", ms: 3600000 },
  { k: "6h", label: "6 hours", ms: 6 * 3600000 },
  { k: "12h", label: "12 hours", ms: 12 * 3600000 },
  { k: "1d", label: "1 day", ms: 24 * 3600000 },
  { k: "1w", label: "1 week", ms: 7 * 24 * 3600000 },
  { k: "1mo", label: "1 month", ms: 30 * 24 * 3600000 },
];
const INTERVAL_MS = INTERVALS.reduce((o, i) => { o[i.k] = i.ms; return o; }, {});
// focus-window presets (minutes each side of the alarm timestamp)
const FOCUS_WINDOWS = [15, 30, 60, 180];
function fmtClock(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return p(d.getHours()) + ":" + p(d.getMinutes()); }
function fmtDayClock(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
function fmtFullTs(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()); }
function njNow() { return window.NJ_NOW || Date.now(); }
// absolute timestamp axis label, granularity chosen from the visible span
function fmtAxis(ts, span) {
  const d = new Date(ts); const p = (n) => String(n).padStart(2, "0");
  if (span <= 26 * 3600000) return p(d.getHours()) + ":" + p(d.getMinutes());
  if (span <= 8 * 24 * 3600000) return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2);
}
function njDownloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function trendXLabels(range) {
  return ({
    "1h": ["−60m", "−40m", "−20m", "now"],
    "6h": ["−6h", "−4h", "−2h", "now"],
    "24h": ["−24h", "−16h", "−8h", "now"],
    "7d": ["−7d", "−5d", "−3d", "now"],
  })[range] || ["", "", "", "now"];
}
// build a deterministic series for a pen at a given range
function trendSeries(pen, range) {
  const n = TREND_RANGES[range] || 72;
  const gen = window.genTrend || ((seed, base, amp, m) => { const o = []; for (let i = 0; i < m; i++) o.push(base + Math.sin(i / m * 6.28 + seed) * amp * 0.5); return o; });
  return gen(trendSeed(pen.tag + range), pen.base, pen.amp, n);
}

// ── time-based sampling (so alarm markers align to the wall clock) ──
// deterministic wandering value of a pen at an absolute time
function penNoise(pen, tMs) {
  const k = tMs / 60000; const s = trendSeed(pen.tag || pen.name || "");
  return pen.amp * (0.42 * Math.sin(k * 0.021 + s) + 0.26 * Math.sin(k * 0.053 + s * 1.7)
    + 0.16 * Math.sin(k * 0.17 + s * 2.3) + 0.10 * Math.sin(k * 0.61 + s * 3.1));
}
function penValueAt(pen, tMs) { return pen.base + penNoise(pen, tMs); }
// value when this pen is the trigger of a focused alarm: drifts from the safe side
// and crosses the threshold exactly at the alarm timestamp (logistic ramp).
function eventValueAt(pen, tMs, ev) {
  const safe = pen.base, thr = ev.thr;
  const scale = Math.max(ev.windowMs / 5, 30000);
  const s = 1 / (1 + Math.exp(-(tMs - ev.centerTs) / scale)); // 0 before → 0.5 at center → 1 after
  const end = 2 * thr - safe; // symmetric so the line is exactly at thr at the center
  return safe + (end - safe) * s + penNoise(pen, tMs) * 0.45;
}
// build a { xMin, xMax, n, mode, ... } view from the store state
function viewFromStore(store) {
  if (store.centerTs) {
    const w = (store.windowMin || 30) * 60000;
    return { mode: "focus", xMin: store.centerTs - w, xMax: store.centerTs + w, n: 121,
      centerTs: store.centerTs, windowMin: store.windowMin || 30, focusEvent: store.focusEvent };
  }
  const h = RANGE_HOURS[store.range] || 6;
  // explicit date range (Start / End / Interval) takes precedence over the quick preset
  if (store.customRange && store.startTs != null && store.endTs != null) {
    let xMin = store.startTs, xMx = store.endTs;
    if (xMx <= xMin) xMx = xMin + 3600000;
    if (store.dynamic) { const span = xMx - xMin; xMx = njNow(); xMin = xMx - span; }
    const ivMs = INTERVAL_MS[store.interval] || 3600000;
    const n = Math.max(2, Math.min(500, Math.round((xMx - xMin) / ivMs) + 1));
    return { mode: "range", xMin, xMax: xMx, n, range: store.range, custom: true };
  }
  const off = store.rangeOffset || 0;
  const xMax = njNow() - off;
  return { mode: "range", xMin: xMax - h * 3600000, xMax, n: TREND_RANGES[store.range] || 72, range: store.range, offset: off };
}
// sample one pen across a view → [{ t, v }]
function seriesForView(pen, view) {
  const n = view.n, span = view.xMax - view.xMin;
  const ev = (view.focusEvent && view.focusEvent.penId === pen.id)
    ? { centerTs: view.focusEvent.centerTs, thr: view.focusEvent.thr, windowMs: span / 2 } : null;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = view.xMin + (i / (n - 1)) * span;
    pts.push({ t, v: ev ? eventValueAt(pen, t, ev) : penValueAt(pen, t) });
  }
  return pts;
}
// alarm markers visible on the plotted pens within a view.
// Strict 1:1 — an analog alarm marks ONLY the pen whose tag is its measured value.
// Discrete alarms (no measured value) surface as context markers on same-equipment pens.
function markersForView(pens, view) {
  const rows = (window.alarmHub && window.alarmHub.rows) || [];
  const vis = pens.filter((p) => !p.hidden);
  const out = [];
  const seen = new Set();
  rows.forEach((a) => {
    const ts = window.alarmTs(a);
    if (ts == null || ts < view.xMin || ts > view.xMax) return;
    const mtag = window.alarmMeasTag(a);
    let host = null, discrete = false;
    if (mtag) host = vis.find((p) => p.tag === mtag);
    if (!host && !mtag) { const eq = window.alarmEquip(a.tag); host = eq && vis.find((p) => window.alarmEquip(p.tag) === eq); discrete = true; }
    if (!host || seen.has(a.id)) return;
    seen.add(a.id);
    out.push({ id: a.id, ts, level: a.level, penId: host.id, penColor: host.color, discrete, alarm: a });
  });
  return out.sort((x, y) => x.ts - y.ts);
}

// ── pen store (persisted) ──
const TREND_LS = "nj_trend_pens_v1";
function loadPens() {
  try { const r = JSON.parse(localStorage.getItem(TREND_LS)); if (Array.isArray(r) && r.length) return r; } catch (e) {}
  // sensible defaults so the workspace isn't empty on first visit
  return ["DPT1-FT0-OT1", "DPT1-SMP0-PH1"].map((t, i) => makePen(TREND_BY_TAG[t], i));
}
function makePen(cat, colorIdx) {
  return { id: cat.tag, tag: cat.tag, name: cat.name, unit: cat.unit, base: cat.base, amp: cat.amp,
           group: cat.group, color: TREND_PALETTE[colorIdx % TREND_PALETTE.length], hidden: false };
}
const trendStore = {
  pens: loadPens(),
  range: "6h",
  rangeOffset: 0,      // ms back from now for the quick-range window (prev/next paging)
  interval: "6h",
  dynamic: true,
  customRange: false,
  startTs: null,
  endTs: null,
  focus: null,
  centerTs: null,       // when set → chart is in focus mode, centered on this timestamp
  windowMin: 30,        // ± minutes around centerTs
  showMarkers: true,    // render alarm markers on the timeline
  axisMode: (function () { try { return localStorage.getItem("nj_trend_axis_v1") === "separate" ? "separate" : "focus"; } catch (e) { return "focus"; } })(),
  focusEvent: null,     // { alarmId, penId, centerTs, thr, kind, level } — chart overlay for the investigated alarm
  focusAlarm: null,     // the full alarm object being investigated (may be a lite/historical row)
  eventTimeline: null,  // alarm object when investigating a DISCRETE alarm (no analog value)
  subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.persist(); this.subs.forEach((f) => f()); },
  persist() { try { localStorage.setItem(TREND_LS, JSON.stringify(this.pens)); } catch (e) {} },
  nextColor() {
    const used = new Set(this.pens.map((p) => p.color));
    return TREND_PALETTE.find((c) => !used.has(c)) || TREND_PALETTE[this.pens.length % TREND_PALETTE.length];
  },
  // ── undo stack for signal-set changes (session-only, 12 steps)
  hist: [],
  snap(label) {
    this.hist = this.hist.slice(-11).concat({ label, pens: this.pens.map((p) => ({ ...p })), focus: this.focus, axisSel: (this.axisSel || []).slice() });
  },
  undo() {
    const s = this.hist.pop(); if (!s) return null;
    this.pens = s.pens; this.focus = s.focus; this.axisSel = s.axisSel;
    try { localStorage.setItem("nj_trend_axissel_v1", JSON.stringify(this.axisSel)); } catch (e) {}
    this.emit();
    return s.label;
  },
  add(pen) {
    if (this.pens.some((p) => p.id === pen.id)) { this.focus = pen.id; this.emit(); return; }
    this.snap("add " + (pen.name || pen.tag));
    this.pens = [...this.pens, { ...pen, color: pen.color || this.nextColor() }];
    this.focus = pen.id;
    this.emit();
  },
  remove(id) { this.snap("remove signal"); this.pens = this.pens.filter((p) => p.id !== id); if (this.focus === id) this.focus = null; this.emit(); },
  // replace the entire working pen set (used when a saved Trend Group is loaded).
  // Colors are reassigned deterministically from the palette so the set reads cleanly.
  setPens(pens) {
    this.snap("load signal set");
    const seen = new Set();
    this.pens = (pens || [])
      .filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
      .map((p, i) => ({ ...p, color: TREND_PALETTE[i % TREND_PALETTE.length], hidden: !!p.hidden }));
    this.focus = null;
    this.clearFocus(); // emits
  },
  toggle(id) { this.snap("show/hide signal"); this.pens = this.pens.map((p) => p.id === id ? { ...p, hidden: !p.hidden } : p); this.emit(); },
  setFocus(id) { this.focus = this.focus === id ? null : id; this.emit(); },
  // explicit per-signal axis picks (separate-axis mode). Empty = automatic (focused pen first).
  axisSel: (() => { try { return JSON.parse(localStorage.getItem("nj_trend_axissel_v1")) || []; } catch (e) { return []; } })(),
  // `on` + `shownIds` come from what the picker RENDERED, so the first click always
  // acts on the visible state (axisSel may still be empty = automatic selection).
  toggleAxisPen(id, max, on, shownIds) {
    this.snap("axis change");
    const base = (shownIds && shownIds.length ? shownIds : this.axisSel).slice();
    let next = on ? base.filter((x) => x !== id) : (base.includes(id) ? base : base.concat(id));
    if (max && next.length > max) next = next.slice(next.length - max);
    this.axisSel = next;
    try { localStorage.setItem("nj_trend_axissel_v1", JSON.stringify(next)); } catch (e) {}
    this.emit();
  },
  setRange(r) { this.range = r; this.rangeOffset = 0; this.customRange = false; this.centerTs = null; this.focusEvent = null; this.eventTimeline = null; this.emit(); },
  prevWindow() { const h = RANGE_HOURS[this.range] || 6; this.rangeOffset = (this.rangeOffset || 0) + h * 3600000; this.emit(); },
  nextWindow() { const h = RANGE_HOURS[this.range] || 6; this.rangeOffset = Math.max(0, (this.rangeOffset || 0) - h * 3600000); this.emit(); },
  setInterval(iv) { this.interval = iv; this.emit(); },
  setDynamic(b) { this.dynamic = b; this.emit(); },
  setCustomRange(startTs, endTs, interval, dynamic) {
    this.startTs = startTs; this.endTs = endTs;
    if (interval) this.interval = interval;
    if (dynamic != null) this.dynamic = dynamic;
    this.customRange = true; this.centerTs = null; this.focusEvent = null; this.eventTimeline = null; this.emit();
  },
  toggleMarkers() { this.showMarkers = !this.showMarkers; this.emit(); },
  setAxisMode(m) { this.axisMode = m; try { localStorage.setItem("nj_trend_axis_v1", m); } catch (e) {} this.emit(); },
  setWindowMin(m) { this.windowMin = m; this.emit(); },
  // center the timeline on an alarm event (analog: also carries the crossed threshold)
  centerOn(alarm) {
    const ts = window.alarmTs(alarm); if (ts == null) return;
    this.centerTs = ts;
    this.focusAlarm = alarm;
    if (window.alarmIsAnalog(alarm)) {
      this.focus = alarm.meas.tag;
      // ensure the alarm's measured pen is visible (un-hide if the operator toggled it off)
      this.pens = this.pens.map((p) => p.id === alarm.meas.tag ? { ...p, hidden: false } : p);
      this.focusEvent = { alarmId: alarm.id, penId: alarm.meas.tag, centerTs: ts,
        thr: alarm.meas.thr.value, kind: alarm.meas.thr.kind, level: alarm.level };
      this.eventTimeline = null;
    } else {
      this.focusEvent = null;
      this.eventTimeline = alarm;
    }
    this.showMarkers = true;
    this.emit();
  },
  clearFocus() { this.centerTs = null; this.focusEvent = null; this.eventTimeline = null; this.focusAlarm = null; this.emit(); },
  clear() { this.snap("clear signals"); this.pens = []; this.focus = null; this.clearFocus(); },
};
function useTrends() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => trendStore.sub(force), []);
  return trendStore;
}

// resolve an id/tag/meta to a pen object
function resolveTrendPen(idOrTag, meta) {
  const cat = TREND_BY_TAG[idOrTag];
  if (cat) return makePen(cat, trendStore.pens.length);
  // ad-hoc: build from supplied meta (data-trend-* attrs or {name,unit,value,group})
  meta = meta || {};
  const val = parseFloat(meta.value);
  const base = isFinite(val) ? val : 50;
  const amp = Math.max(Math.abs(base) * 0.06, 0.4);
  const name = meta.name || idOrTag;
  return { id: idOrTag, tag: meta.tag || idOrTag, name, unit: meta.unit || "", base, amp,
           group: meta.group || "Ad-hoc", color: trendStore.nextColor(), hidden: false };
}
// public: add a parameter to the trend register and surface a subtle, dismissible
// toast. It does NOT open the Trends window — operators send as many parameters as
// they like (one toast each), then open the floating Trends window explicitly from
// the top-bar "Trends" button (or the toast's "Trends" link).
function njSendToTrend(idOrTag, meta) {
  const pen = resolveTrendPen(idOrTag, meta);
  const fresh = !trendStore.pens.some((p) => p.id === pen.id);
  trendStore.add(pen);
  njTrendToast(trendStore.pens.find((p) => p.id === pen.id) || pen, fresh);
}

// build a pen from an alarm's measured-value linkage
function alarmMeasPen(alarm) {
  const m = alarm.meas;
  return { id: m.tag, tag: m.tag, name: m.name, unit: m.unit, base: m.base, amp: m.amp,
    group: m.group || "Alarm", color: trendStore.nextColor(), hidden: false };
}
// resolve any alarm-like row to its analog meas — falling back to the register when a
// lite row (e.g. a Historical event) carries only a tag.
function resolveAlarmMeas(alarm) {
  if (window.alarmIsAnalog(alarm)) return alarm;
  const rows = (window.alarmHub && window.alarmHub.rows) || [];
  const match = rows.find((r) => r.tag && r.tag === alarm.tag && window.alarmIsAnalog(r));
  if (match) return Object.assign({}, alarm, { meas: match.meas });
  return alarm; // discrete
}

// ── FROM AN ALARM → the trend, centered on the event (the core investigation entry) ──
function njInvestigateAlarm(alarm) {
  const a = resolveAlarmMeas(alarm);
  if (window.alarmIsAnalog(a)) {
    if (!trendStore.pens.some((p) => p.id === a.meas.tag)) trendStore.add(alarmMeasPen(a));
  }
  trendStore.centerOn(a);
  if (window.__njNavigate) window.__njNavigate("analytics");
}

// ── FROM A TREND MARKER (or a status banner) → the alarm's row in the list (highlighted) ──
// Holds an array of ids so a single alarm or a whole group can be highlighted at once.
const alarmHighlight = { ids: [], subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  setMany(ids) { this.ids = ids || []; this.subs.forEach((f) => f()); this._t && clearTimeout(this._t); this._t = setTimeout(() => { this.ids = []; this.subs.forEach((f) => f()); }, 6000); },
  set(id) { this.setMany(id ? [id] : []); } };
function useAlarmHighlight() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => alarmHighlight.sub(force), []);
  return alarmHighlight.ids;
}
function njGoAlarm(alarm) {
  const active = window.isActiveAlarm && window.isActiveAlarm(alarm);
  const tab = active ? "Active" : (alarm.supp === "blocked" || alarm.supp === "oos") ? "Deactivated" : "All Alarms";
  alarmHighlight.setMany([alarm.id]);
  if (window.__njGoAlarms) window.__njGoAlarms(tab, null);
}
// highlight several alarm rows at once (used by the system status banner's "View in alarms").
function njGoAlarmRows(alarms) {
  const list = (alarms || []).filter(Boolean);
  if (!list.length) { if (window.__njGoAlarms) window.__njGoAlarms("Active", null); return; }
  const anyActive = list.some((a) => window.isActiveAlarm && window.isActiveAlarm(a));
  const anyDeact = list.some((a) => a.supp === "blocked" || a.supp === "oos");
  const tab = anyActive ? "Active" : anyDeact ? "Deactivated" : "All Alarms";
  alarmHighlight.setMany(list.map((a) => a.id));
  if (window.__njGoAlarms) window.__njGoAlarms(tab, null);
}

// ── generic feedback toast (for stub actions: export, report, save…) ──
function njToast(message, linkLabel, onLink) {
  let host = document.getElementById("nj-toast-host");
  if (!host) {
    host = document.createElement("div"); host.id = "nj-toast-host"; host.className = "nj-toast-host";
    // permanently-mounted polite live region, so a screen reader announces the toast that is
    // inserted into it. A region created at the same moment as its content is not announced.
    host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const el = document.createElement("div"); el.className = "nj-toast";
  const txt = document.createElement("div"); txt.className = "nj-toast-txt"; txt.textContent = message;
  el.appendChild(txt);
  if (linkLabel) {
    const link = document.createElement("button"); link.className = "nj-toast-link"; link.type = "button"; link.textContent = linkLabel;
    txt.appendChild(document.createTextNode(" ")); txt.appendChild(link);
    link.addEventListener("click", () => { close(); if (onLink) onLink(); });
  }
  const x = document.createElement("button"); x.className = "nj-toast-x"; x.type = "button"; x.setAttribute("aria-label", "Dismiss");
  x.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  el.appendChild(x); host.appendChild(el);
  // an actionable toast holds longer — Undo has to survive the moment of "wait, no" (mobile uses 6s)
  let t = setTimeout(close, linkLabel ? 6000 : 4200);
  function close() { clearTimeout(t); el.classList.add("out"); setTimeout(() => el.remove(), 260); }
  x.addEventListener("click", close);
  el.addEventListener("mouseenter", () => clearTimeout(t));
  el.addEventListener("mouseleave", () => { t = setTimeout(close, 1800); });
}

// ── reusable Export button with a CSV / Excel format picker ──
// describe(fmt) -> toast message string; fmt is "csv" or "xlsx".
const EXP_FORMATS = [
  { k: "csv", label: "CSV (.csv)", sub: "Comma-separated values", icon: "file-text" },
  { k: "xlsx", label: "Excel (.xlsx)", sub: "Microsoft Excel workbook", icon: "sheet" },
];
function ExportMenu({ label = "Export", icon = "download", primary, describe, disabled, btnClass, align = "right" }) {
  const [open, setOpen] = React.useState(false);
  const cls = btnClass || ("btn " + (primary ? "btn-primary" : "btn-secondary"));
  const pick = (fmt) => {
    setOpen(false);
    const msg = describe ? describe(fmt) : `Export started: the file will download as ${fmt === "csv" ? "CSV (.csv)" : "Excel (.xlsx)"}.`;
    njToast(msg);
  };
  return (
    <div className="exp-menu">
      <button className={cls} disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Icon name={icon} size={btnClass ? 14 : 15} /> {label} <Icon name="chevron-down" size={13} />
      </button>
      {open && (
        <React.Fragment>
          <div className="exp-scrim" onClick={() => setOpen(false)} />
          <div className={"exp-pop" + (align === "left" ? " exp-left" : "")} role="menu">
            <div className="exp-pop-h">Download as</div>
            {EXP_FORMATS.map((f) => (
              <button key={f.k} className="exp-item" role="menuitem" onClick={() => pick(f.k)}>
                <Icon name={f.icon} size={16} color="var(--slate-500)" />
                <span className="exp-item-t">{f.label}<span className="exp-item-s">{f.sub}</span></span>
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
Object.assign(window, { ExportMenu });

// ── subtle "sent to Trends" toast (vanilla DOM, auto-dismiss, opens the Trends window, close button) ──
// ── subtle "sent to Trends" toast — coalesces when several signals are sent in quick
// succession (shows a running count) instead of stacking a wall of toasts ──
let _njTrendToast = null;
function njTrendToast(pen, fresh) {
  let host = document.getElementById("nj-toast-host");
  if (!host) { host = document.createElement("div"); host.id = "nj-toast-host"; host.className = "nj-toast-host"; document.body.appendChild(host); }

  // coalesce into the live trend toast if one is still on screen
  if (_njTrendToast && _njTrendToast.el.isConnected && !_njTrendToast.el.classList.contains("out")) {
    const s = _njTrendToast;
    s.count += 1;
    s.dot.style.background = pen.color;
    s.strong.textContent = pen.name;
    s.tail.textContent = ` + ${s.count - 1} more sent to Trends `;
    s.arm();
    return;
  }

  const el = document.createElement("div");
  el.className = "nj-toast";
  const dot = document.createElement("span"); dot.className = "nj-toast-dot"; dot.style.background = pen.color;
  const txt = document.createElement("div"); txt.className = "nj-toast-txt";
  const strong = document.createElement("b"); strong.textContent = pen.name;
  const tail = document.createTextNode(fresh === false ? " already in Trends " : " sent to Trends ");
  const link = document.createElement("button"); link.className = "nj-toast-link"; link.type = "button"; link.textContent = "Open Trends";
  txt.appendChild(strong); txt.appendChild(tail); txt.appendChild(link);
  const x = document.createElement("button"); x.className = "nj-toast-x"; x.type = "button"; x.setAttribute("aria-label", "Dismiss");
  x.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  el.appendChild(dot); el.appendChild(txt); el.appendChild(x);
  host.appendChild(el);

  const state = { el, dot, strong, tail: null, count: 1, timer: null };
  // tail here is a text node; expose a settable wrapper for coalescing
  state.tail = { set textContent(v) { tail.textContent = v; } };
  function close() { clearTimeout(state.timer); el.classList.add("out"); setTimeout(() => el.remove(), 260); if (_njTrendToast === state) _njTrendToast = null; }
  state.arm = () => { clearTimeout(state.timer); state.timer = setTimeout(close, 4200); };
  state.arm();
  x.addEventListener("click", close);
  link.addEventListener("click", () => { close(); if (window.openTrendWindow) window.openTrendWindow(); else if (window.__njNavigate) window.__njNavigate("analytics"); });
  el.addEventListener("mouseenter", () => clearTimeout(state.timer));
  el.addEventListener("mouseleave", () => { state.timer = setTimeout(close, 1800); });
  _njTrendToast = state;
}

// ── explicit "send to trends" affordance — a small icon button placed next to a readout ──
// It reflects register state: once the parameter is in Trends the button reads "on" and a
// second click takes it back out again (so repeat clicks can never stack duplicates).
function TrendBtn({ id, name, unit, value, group, tag, title, className }) {
  useTrends();
  const penId = (TREND_BY_TAG[id] && TREND_BY_TAG[id].tag) || id;
  const on = trendStore.pens.some((p) => p.id === penId);
  return (
    <button type="button" className={"trend-btn" + (on ? " on" : "") + (className ? " " + className : "")}
      aria-pressed={on}
      title={on ? (name || "Value") + " is in Trends — click to remove" : (title || ("Send " + (name || "value") + " to Trends"))}
      onClick={(e) => { e.stopPropagation(); e.preventDefault();
        if (on) { trendStore.remove(penId); njToast((name || "Parameter") + " removed from Trends", "line-chart"); }
        else njSendToTrend(id, { name, unit, value, group, tag }); }}>
      <Icon name="line-chart" size={14} />
    </button>
  );
}

// interpolate a sampled series [{t,v}] at time t
function valAt(pts, t) {
  if (!pts.length) return 0;
  if (t <= pts[0].t) return pts[0].v;
  if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].v;
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i].t) { const a = pts[i - 1], b = pts[i]; const f = (t - a.t) / (b.t - a.t || 1); return a.v + (b.v - a.v) * f; }
  }
  return pts[pts.length - 1].v;
}

// ── time-based multi-series trend chart with alarm markers, threshold + center overlays.
// series = [{ pen, pts:[{t,v}] }]; view = viewFromStore(...); markers = markersForView(...)
function MultiTrendChart({ series, view, focus, markers = [], showMarkers = true, axisMode = "focus", height = 360, onOpenAlarm, onCenterAlarm }) {
  const [selId, setSelId] = React.useState(null);
  const [hoverT, setHoverT] = React.useState(null);
  const [moreAx, setMoreAx] = React.useState(false);
  const SEVm = window.SEV || {};
  const vis = series.filter((s) => !s.pen.hidden && s.pts.length);
  const sepAxes = axisMode === "separate" && vis.length > 1;
  const AXW = 54, AXMAX = 5;
  const W = 980, H = height, padR = 18, padT = sepAxes ? 42 : 30, padB = 30;
  const span = view.xMax - view.xMin || 1;
  const x = (t) => padL + ((t - view.xMin) / span) * (W - padL - padR);
  const norm = (pts) => { let mn = Math.min(...pts.map((p) => p.v)), mx = Math.max(...pts.map((p) => p.v)); if (mn === mx) { mn -= 1; mx += 1; } const pad = (mx - mn) * 0.16; return { mn: mn - pad, mx: mx + pad }; };
  const yOf = (v, mn, mx) => padT + (1 - (v - mn) / (mx - mn)) * (H - padT - padB);
  const fpen = vis.find((s) => s.pen.id === focus) || vis[0];
  // Gutters are capped — beyond AXMAX the plot area would be eaten by axis furniture.
  // The focused pen always keeps its axis; the rest still plot on their own normalised scale.
  let axisPens = [];
  if (sepAxes) {
    const picked = (trendStore.axisSel || []).filter((id) => vis.some((s) => s.pen.id === id));
    if (picked.length) axisPens = vis.filter((s) => picked.includes(s.pen.id)).slice(0, AXMAX);
    else {
      axisPens = vis.slice(0, AXMAX);
      if (fpen && !axisPens.includes(fpen)) axisPens = [fpen].concat(vis.filter((s) => s !== fpen).slice(0, AXMAX - 1));
    }
  }
  const axisHidden = sepAxes ? vis.length - axisPens.length : 0;
  const padL = axisPens.length ? 22 + axisPens.length * AXW : 56;
  const fr = fpen ? norm(fpen.pts) : { mn: 0, mx: 1 };
  const decOf = (r) => (Math.abs(r.mx) < 5 ? 2 : Math.abs(r.mx) < 50 ? 1 : 0);
  const TICKF = [0, 0.25, 0.5, 0.75, 1];
  const rngOf = {}; vis.forEach((s) => { rngOf[s.pen.id] = norm(s.pts); });
  const yticks = fpen ? TICKF.map((f) => fr.mn + f * (fr.mx - fr.mn)) : [];
  const dec = fpen ? decOf(fr) : 0;
  const ev = view.focusEvent;
  const now = njNow();
  const showNow = now >= view.xMin && now <= view.xMax + 1000 && Math.abs(now - (view.centerTs || -1)) > span * 0.02;

  // x ticks
  let ticks;
  if (view.mode === "focus") ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ x: padL + f * (W - padL - padR), label: fmtClock(view.xMin + f * span) }));
  else { const N = 5; ticks = Array.from({ length: N }, (_, i) => { const f = i / (N - 1); return { x: padL + f * (W - padL - padR), label: fmtAxis(view.xMin + f * span, span) }; }); }

  const sel = markers.find((m) => m.id === selId);
  const thrY = ev && fpen && fpen.pen.id === ev.penId ? yOf(ev.thr, fr.mn, fr.mx) : null;

  // crosshair readout — value of every visible pen at the hovered instant
  const ptFromEvent = (e) => {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(m.inverse());
  };
  const onMove = (e) => {
    const p = ptFromEvent(e); if (!p) return;
    const f = (p.x - padL) / (W - padL - padR);
    setHoverT(view.xMin + Math.min(1, Math.max(0, f)) * span);
  };
  let cross = null;
  if (hoverT != null && !sel && vis.length) {
    // Rows are capped to what fits the plot height — the focused pen always makes the cut.
    const maxRows = Math.max(3, Math.floor((H - padT - padB - 44) / 19));
    let shown = vis.slice(0, maxRows);
    if (fpen && !shown.includes(fpen)) shown = [fpen].concat(vis.filter((s) => s !== fpen).slice(0, maxRows - 1));
    const more = vis.length - shown.length;
    const rows = shown.map((s) => {
      const r = rngOf[s.pen.id], v = valAt(s.pts, hoverT);
      return { pen: s.pen, v: v + 0, y: yOf(v, r.mn, r.mx), dec: decOf(r) };
    });
    const bw = 268, bh = 32 + rows.length * 19 + (more > 0 ? 21 : 0) + 6;
    const cx = x(hoverT);
    const right = cx < (padL + W - padR) / 2;
    const bx = right ? Math.min(cx + 16, W - padR - bw) : Math.max(padL + 4, cx - 16 - bw);
    cross = { rows, more, dots: vis.map((s) => { const r = rngOf[s.pen.id]; return { id: s.pen.id, color: s.pen.color, y: yOf(valAt(s.pts, hoverT), r.mn, r.mx) }; }), bw, bh, cx, bx, by: Math.max(6, Math.min(padT + 6, H - padB - bh)) };
  }

  // tooltip geometry
  let tip = null;
  if (sel) {
    const sev = SEVm[sel.level] || SEVm.low || { dot: "#5C646F", bg: "#EEF1F4", text: "#5C646F", label: sel.level };
    const bw = 306, bh = 112, mx = x(sel.ts);
    const bx = Math.max(padL + 2, Math.min(mx - bw / 2, W - padR - bw));
    const centered = view.centerTs && Math.abs(view.centerTs - sel.ts) < 1000;
    tip = { sev, bw, bh, bx, by: padT + 8, centered };
  }

  return (
    <svg className="mtrend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart" preserveAspectRatio="xMidYMid meet" onClick={() => setSelId(null)}>
      {/* horizontal gridlines — 5 evenly spaced, shared by every pen's own scale */}
      {yticks.map((t, i) => (
        <line key={"y" + i} x1={padL} y1={yOf(t, fr.mn, fr.mx)} x2={W - padR} y2={yOf(t, fr.mn, fr.mx)} stroke="var(--slate-100)" strokeWidth="1" />
      ))}

      {/* Y scales — one gutter per pen in separate-axis mode, else the focused pen only */}
      {axisPens.length ? axisPens.map((s, i) => {
        const r = rngOf[s.pen.id], d = decOf(r), gr = 22 + (i + 1) * AXW;
        const dim = fpen && s.pen.id !== fpen.pen.id;
        return (
          <g key={"ax" + s.pen.id} opacity={dim ? 0.85 : 1}>
            <title>{s.pen.name + " — " + s.pen.unit}</title>
            <line x1={gr - 4} y1={padT} x2={gr - 4} y2={H - padB} stroke={s.pen.color} strokeWidth={dim ? 1.5 : 2.5} />
            <rect x={gr - 9} y={padT - 13} width="11" height={dim ? 2.5 : 3.5} rx="1.5" fill={s.pen.color} />
            {TICKF.map((f, k) => (
              <text key={k} className="mt-ylbl mt-ylbl-sep" x={gr - 12} y={yOf(r.mn + f * (r.mx - r.mn), r.mn, r.mx) + 3} textAnchor="end">{(r.mn + f * (r.mx - r.mn)).toFixed(d)}</text>
            ))}
            <text className="mt-yaxname" x={gr - 12} y={padT - 21} textAnchor="end">{s.pen.unit}</text>
          </g>
        );
      }) : (
        <g>
          {yticks.map((t, i) => (
            <text key={"yl" + i} className="mt-ylbl" x={padL - 9} y={yOf(t, fr.mn, fr.mx) + 3} textAnchor="end" fill={fpen ? fpen.pen.color : "var(--slate-400)"}>{t.toFixed(dec)}</text>
          ))}
          {fpen && <text className="mt-yunit" x={padL - 9} y={padT - 6} textAnchor="end" fill={fpen.pen.color}>{fpen.pen.unit}</text>}
        </g>
      )}

      {sepAxes && vis.length > 1 && (() => {
        const open = moreAx;
        const rowH = 22, bw = 258, bh = 30 + vis.length * rowH + 22, bx = 8, by = Math.max(6, H - padB - 6 - bh);
        const full = axisPens.length >= AXMAX;
        const shownIds = axisPens.map((s) => s.pen.id);
        return (
          <g onMouseLeave={() => setMoreAx(false)}>
            <g onMouseEnter={() => setMoreAx(true)} onClick={() => setMoreAx(!open)} role="button" aria-expanded={open}
              aria-label="Choose which signals get their own axis" {...njActivate(() => setMoreAx(!open))}>
              <rect x={4} y={H - padB + 2} width={padL - 10} height="16" rx="4" fill="transparent" />
              <text className={"mt-yaxmore" + (open ? " on" : "")} x={padL - 12} y={H - padB + 14} textAnchor="end">axes {axisPens.length}/{vis.length}</text>
            </g>
            {open && (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx="8" className="mt-tipbox" />
                <text className="mt-tiphead" x={bx + 12} y={by + 19}>SIGNALS WITH THEIR OWN AXIS</text>
                {vis.map((s, i) => {
                  const on = axisPens.includes(s), ry = by + 28 + i * rowH;
                  const flip = () => trendStore.toggleAxisPen(s.pen.id, AXMAX, on, shownIds);
                  return (
                    <g key={s.pen.id} className={"mt-axrow" + (on ? " on" : "")} role="button" aria-pressed={on}
                      aria-label={(on ? "Remove axis for " : "Give an axis to ") + s.pen.name} onClick={flip} {...njActivate(flip)}>
                      <rect x={bx + 6} y={ry} width={bw - 12} height={rowH - 2} rx="5" className="mt-axrow-bg" />
                      <rect x={bx + 13} y={ry + rowH / 2 - 3} width="10" height="3" rx="1.5" fill={s.pen.color} opacity={on ? 1 : 0.45} />
                      <text className="mt-tiprow" x={bx + 30} y={ry + rowH / 2 + 4}>{s.pen.name}</text>
                      <text className="mt-tipunit" x={bx + bw - 30} y={ry + rowH / 2 + 4} textAnchor="end">{s.pen.unit}</text>
                      {on
                        ? <path d={"M" + (bw + bx - 22) + " " + (ry + rowH / 2) + "l3 3 5.5-6.5"} className="mt-axcheck" />
                        : <circle cx={bx + bw - 18} cy={ry + rowH / 2} r="4.5" className="mt-axdot" />}
                    </g>
                  );
                })}
                <text className="mt-tipnote" x={bx + 12} y={by + bh - 9}>{full ? "Max " + AXMAX + " axes — a new pick replaces the oldest" : "Signals without an axis still plot, on a fitted scale"}</text>
              </g>
            )}
          </g>
        );
      })()}

      {/* vertical time gridlines */}
      {ticks.map((t, i) => (
        <line key={"vx" + i} x1={t.x} y1={padT} x2={t.x} y2={H - padB} stroke="var(--slate-100)" strokeWidth="1" strokeDasharray={i === 0 || i === ticks.length - 1 ? "0" : "2 5"} />
      ))}

      {/* threshold line (focused analog event) */}
      {thrY != null && (
        <g>
          <line x1={padL} y1={thrY} x2={W - padR} y2={thrY} stroke="var(--critical)" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.85" />
          <rect x={W - padR - 66} y={thrY - 17} width="66" height="15" rx="3" fill="var(--critical)" />
          <text x={W - padR - 33} y={thrY - 6} textAnchor="middle" className="mt-thr">{(window.THR_LABEL[ev.kind] || "LIM") + " " + ev.thr}</text>
        </g>
      )}

      {/* now line + label */}
      {showNow && (() => {
        const nx = Math.min(W - padR - 20, Math.max(padL + 20, x(now)));
        return (
          <g>
            <line x1={x(now)} y1={padT - 4} x2={x(now)} y2={H - padB} stroke="var(--primary)" strokeWidth="1.25" strokeDasharray="3 3" opacity="0.75" />
            <rect x={nx - 20} y={padT - 15} width="40" height="15" rx="7.5" fill="var(--primary)" />
            <text x={nx} y={padT - 4} textAnchor="middle" className="mt-nowpill">NOW</text>
          </g>
        );
      })()}

      {/* center line (the alarm moment) */}
      {view.centerTs && view.centerTs > view.xMin && view.centerTs < view.xMax && (
        <g>
          <line x1={x(view.centerTs)} y1={padT - 4} x2={x(view.centerTs)} y2={H - padB} stroke="var(--critical)" strokeWidth="1.4" opacity="0.55" />
        </g>
      )}

      {/* pens */}
      {vis.map((s) => {
        const { mn, mx } = norm(s.pts);
        const isFocus = fpen && s.pen.id === fpen.pen.id;
        const d = s.pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${yOf(p.v, mn, mx).toFixed(1)}`).join(" ");
        const last = s.pts[s.pts.length - 1];
        return (
          <g key={s.pen.id} opacity={fpen && !isFocus ? 0.66 : 1}>
            <path d={d} fill="none" stroke={s.pen.color} strokeWidth={isFocus ? 2.6 : 1.7} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(last.t)} cy={yOf(last.v, mn, mx)} r="3.2" fill={s.pen.color} />
          </g>
        );
      })}

      {/* hover capture → crosshair readout (below the markers so their hit areas still win) */}
      <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="transparent"
        onMouseMove={onMove} onMouseLeave={() => setHoverT(null)} style={{ cursor: "crosshair" }} />

      {/* alarm markers */}
      {showMarkers && markers.map((m) => {
        const mx = x(m.ts);
        const sev = SEVm[m.level] || { dot: "#5C646F" };
        const sEntry = vis.find((s) => s.pen.id === m.penId);
        const active = m.id === selId;
        const dotY = !m.discrete && sEntry ? yOf(valAt(sEntry.pts, m.ts), norm(sEntry.pts).mn, norm(sEntry.pts).mx) : null;
        return (
          <g key={m.id} className="mt-marker" onClick={(e) => { e.stopPropagation(); setSelId(active ? null : m.id); }} style={{ cursor: "pointer" }}>
            <line x1={mx} y1={padT} x2={mx} y2={H - padB} stroke={m.discrete ? "var(--slate-400)" : sev.dot} strokeWidth={active ? 1.6 : 1} strokeDasharray={m.discrete ? "2 3" : "4 4"} opacity={active ? 0.9 : 0.5} />
            {/* top flag */}
            <g transform={`translate(${mx},${padT - 4})`}>
              {m.discrete ? (
                <g>
                  <path d="M0 -14 L11 -3 L0 8 L-11 -3 Z" fill="#fff" stroke="var(--slate-500)" strokeWidth={active ? 1.8 : 1.3} />
                  <path d="M1.5 -8 L-3 -1 L0 -1 L-1.5 5 L3.5 -2 L0.5 -2 Z" fill="var(--slate-500)" />
                </g>
              ) : (
                <path d="M0 -15 L12 -6 L12 6 L0 -1 Z M0 -15 L0 10" fill={sev.dot} stroke="#fff" strokeWidth="1" strokeLinejoin="round" transform="translate(0.5,0)" />
              )}
            </g>
            {dotY != null && <circle cx={mx} cy={dotY} r={active ? 5 : 4} fill={sev.dot} stroke="#fff" strokeWidth="1.6" />}
            <rect x={mx - 9} y={padT} width="18" height={H - padT - padB} fill="transparent" />
          </g>
        );
      })}

      {/* X labels */}
      {ticks.map((t, i) => (
        <text key={"x" + i} className="mt-xlbl" x={t.x} y={H - 9} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>{t.label}</text>
      ))}

      {/* crosshair — every pen's value at the hovered instant */}
      {cross && (
        <g className="mt-cross" pointerEvents="none">
          <line x1={cross.cx} y1={padT} x2={cross.cx} y2={H - padB} stroke="var(--slate-500)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          {cross.dots.map((r) => <circle key={r.id} cx={cross.cx} cy={r.y} r="3.4" fill={r.color} stroke="var(--surface, #fff)" strokeWidth="1.5" />)}
          <rect x={cross.bx} y={cross.by} width={cross.bw} height={cross.bh} rx="9" fill="var(--surface, #fff)" stroke="var(--slate-300)" strokeWidth="1" />
          <text x={cross.bx + 14} y={cross.by + 21} className="mt-cross-ts">{fmtDayClock(hoverT)}</text>
          {cross.rows.map((r, i) => {
            const ry = cross.by + 32 + i * 19 + 10;
            const nm = r.pen.name.length > 24 ? r.pen.name.slice(0, 23) + "\u2026" : r.pen.name;
            return (
              <g key={r.pen.id}>
                <circle cx={cross.bx + 18} cy={ry - 4} r="3.6" fill={r.pen.color} />
                <text x={cross.bx + 28} y={ry} className="mt-cross-nm">{nm}</text>
                <text x={cross.bx + cross.bw - 14} y={ry} textAnchor="end" className="mt-cross-val">{r.v.toFixed(r.dec).replace(/^-(0(?:\.0+)?)$/, "$1")}<tspan className="mt-cross-unit"> {r.pen.unit}</tspan></text>
              </g>
            );
          })}
          {cross.more > 0 && <text x={cross.bx + 28} y={cross.by + 32 + cross.rows.length * 19 + 21} className="mt-cross-more">+{cross.more} more signals</text>}
        </g>
      )}

      {/* in-SVG marker detail popover */}
      {tip && (
        <g className="mt-tip" onClick={(e) => e.stopPropagation()}>
          <rect x={tip.bx} y={tip.by} width={tip.bw} height={tip.bh} rx="9" fill="#fff" stroke="var(--slate-300)" strokeWidth="1" />
          <rect x={tip.bx} y={tip.by} width="4" height={tip.bh} rx="2" fill={sel.discrete ? "var(--slate-400)" : tip.sev.dot} />
          {/* severity + time */}
          <rect x={tip.bx + 16} y={tip.by + 14} width={sel.discrete ? 74 : 62} height="16" rx="3" fill={sel.discrete ? "var(--slate-100)" : tip.sev.bg} />
          <text x={tip.bx + 16 + (sel.discrete ? 37 : 31)} y={tip.by + 26} textAnchor="middle" className="mt-tip-badge" fill={sel.discrete ? "var(--slate-600)" : tip.sev.text}>{sel.discrete ? "DISCRETE" : (tip.sev.label || sel.level).toUpperCase()}</text>
          <text x={tip.bx + tip.bw - 16} y={tip.by + 26} textAnchor="end" className="mt-tip-time">{fmtDayClock(sel.ts)}</text>
          {/* description */}
          <text x={tip.bx + 16} y={tip.by + 48} className="mt-tip-desc">{sel.alarm.alarm.length > 42 ? sel.alarm.alarm.slice(0, 41) + "…" : sel.alarm.alarm}</text>
          {/* tag + note */}
          <text x={tip.bx + 16} y={tip.by + 66} className="mt-tip-tag">{sel.alarm.tag}{sel.discrete ? "  ·  no associated process value" : ("  ·  " + (window.THR_LABEL[sel.alarm.meas.thr.kind] || "") + " " + sel.alarm.meas.thr.value + " " + sel.alarm.meas.unit)}</text>
          {/* actions */}
          <g className="mt-tip-btn" onClick={(e) => { e.stopPropagation(); setSelId(null); onOpenAlarm && onOpenAlarm(sel.alarm); }} style={{ cursor: "pointer" }}>
            <rect x={tip.bx + 16} y={tip.by + tip.bh - 30} width="116" height="21" rx="5" fill="var(--ink)" />
            <text x={tip.bx + 74} y={tip.by + tip.bh - 15} textAnchor="middle" className="mt-tip-act" fill="#fff">Open alarm →</text>
          </g>
          {!tip.centered && onCenterAlarm && (
            <g className="mt-tip-btn" onClick={(e) => { e.stopPropagation(); onCenterAlarm(sel.alarm); }} style={{ cursor: "pointer" }}>
              <rect x={tip.bx + 138} y={tip.by + tip.bh - 30} width="96" height="21" rx="5" fill="#fff" stroke="var(--slate-300)" />
              <text x={tip.bx + 186} y={tip.by + tip.bh - 15} textAnchor="middle" className="mt-tip-act" fill="var(--slate-700)">Center here</text>
            </g>
          )}
          <g className="mt-tip-btn" onClick={(e) => { e.stopPropagation(); setSelId(null); }} style={{ cursor: "pointer" }}>
            <text x={tip.bx + tip.bw - 14} y={tip.by + tip.bh - 14} textAnchor="end" className="mt-tip-close">✕</text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TREND GROUPS — saved collections of parameters analysed together.
// Persisted to localStorage. Each group: { id, name, visibility, owner, pens[], updated }.
// visibility ∈ "private" (creator only) | "shared" (whole facility). pens are minimal
// defs { tag, name, unit, base, amp, group } so catalog params re-resolve to fresh data
// on load. Designed to grow (default range / display settings / multi-window) later.
// ═══════════════════════════════════════════════════════════════════════════
const TREND_GROUPS_LS = "nj_trend_groups_v1";
function penDef(p) { return { tag: p.tag, name: p.name, unit: p.unit, base: p.base, amp: p.amp, group: p.group }; }
function tgStamp() {
  const d = new Date(njNow());
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return String(d.getDate()).padStart(2, "0") + " " + mo + " " + d.getFullYear();
}
function tgSeedPens(tags) { return tags.map((t) => (TREND_BY_TAG[t] ? penDef(TREND_BY_TAG[t]) : null)).filter(Boolean); }
function seedTrendGroups() {
  return [
    { id: "tg-seed-1", name: "Pump Sump, O₂ · pH · CO₂", visibility: "shared", owner: NJ_CURRENT_USER,
      pens: tgSeedPens(["DPT1-SMP0-OT1", "DPT1-SMP0-PH1", "DPT1-SMP0-PH2", "DPT1-SMP0-QT1"]), updated: "26 Feb 2026" },
    { id: "tg-seed-2", name: "Fish Tank health", visibility: "shared", owner: "M. Haugen",
      pens: tgSeedPens(["DPT1-FT0-OT1", "DPT1-FT0-LT1", "DPT1-FT0-TT1"]), updated: "01 Mar 2026" },
    { id: "tg-seed-3", name: "CO₂ stripping & oxygenation", visibility: "shared", owner: "A. Lind",
      pens: tgSeedPens(["DPT1-STR0-FAN", "DPT1-STR0-PT1", "DPT1-DOX0-OT1", "DPT1-DOX0-PT1"]), updated: "28 Feb 2026" },
    { id: "tg-seed-4", name: "My morning check", visibility: "private", owner: NJ_CURRENT_USER,
      pens: tgSeedPens(["DPT1-FT0-OT1", "DPT1-SMP0-PH1", "DPT1-EP0-PWR"]), updated: "03 Mar 2026" },
  ];
}
function loadTrendGroups() {
  try { const r = JSON.parse(localStorage.getItem(TREND_GROUPS_LS)); if (Array.isArray(r)) return r; } catch (e) {}
  return seedTrendGroups();
}
const trendGroupStore = {
  groups: loadTrendGroups(),
  subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { try { localStorage.setItem(TREND_GROUPS_LS, JSON.stringify(this.groups)); } catch (e) {} this.subs.forEach((f) => f()); },
  create({ name, visibility, pens }) {
    const grp = { id: "tg-" + Date.now(), name: (name || "Untitled group").trim(), visibility: visibility || "private",
      owner: NJ_CURRENT_USER, pens: (pens || []).map(penDef), updated: tgStamp() };
    this.groups = [grp, ...this.groups]; this.emit(); return grp;
  },
  update(id, patch) {
    this.groups = this.groups.map((g) => g.id === id
      ? { ...g, name: patch.name != null ? patch.name.trim() : g.name, visibility: patch.visibility || g.visibility,
          pens: patch.pens ? patch.pens.map(penDef) : g.pens, updated: tgStamp() }
      : g);
    this.emit();
  },
  remove(id) { this.groups = this.groups.filter((g) => g.id !== id); this.emit(); },
  duplicate(id) {
    const s = this.groups.find((g) => g.id === id); if (!s) return null;
    const grp = { id: "tg-" + Date.now(), name: s.name + " (copy)", visibility: "private", owner: NJ_CURRENT_USER,
      pens: s.pens.map(penDef), updated: tgStamp() };
    this.groups = [grp, ...this.groups]; this.emit(); return grp;
  },
};
function useTrendGroups() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => trendGroupStore.sub(force), []);
  return trendGroupStore;
}
function trendGroupIsOwner(g) { return g && g.owner === NJ_CURRENT_USER; }
// resolve a group's stored defs → live pens (catalog params get fresh catalog data)
function groupToPens(group) {
  return (group.pens || []).map((p) => {
    const cat = TREND_BY_TAG[p.tag];
    const d = cat || p;
    return { id: d.tag, tag: d.tag, name: d.name, unit: d.unit, base: d.base, amp: d.amp, group: d.group || "Ad-hoc", hidden: false };
  });
}
// load a group into the working trend view (replaces the current pens) and navigate to Trends
function njLoadTrendGroup(group) {
  if (!group) return;
  trendStore.setPens(groupToPens(group));
  if (window.__njNavigate) window.__njNavigate("analytics");
  const n = (group.pens || []).length;
  njToast(`Loaded “${group.name}” · ${n} parameter${n !== 1 ? "s" : ""} on the chart.`);
}

// ── custom date + time picker (replaces the native datetime-local; NJORD-styled) ──
const NJDT_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function NjDateTime({ value, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const d = new Date(value);
  const [ym, setYm] = React.useState({ y: d.getFullYear(), m: d.getMonth() });
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  React.useEffect(() => { if (open) { const nd = new Date(value); setYm({ y: nd.getFullYear(), m: nd.getMonth() }); } }, [open]);
  const p = (n) => String(n).padStart(2, "0");
  const label = p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  const commit = (patch) => {
    const nd = new Date(value);
    if (patch.date != null) nd.setFullYear(patch.y, patch.m, patch.date);
    if (patch.h != null) nd.setHours(patch.h);
    if (patch.min != null) nd.setMinutes(patch.min);
    nd.setSeconds(0, 0);
    onChange(nd.getTime());
  };
  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => { const n = i - startDow + 1; const cd = new Date(ym.y, ym.m, n); return { cd, inMonth: n >= 1 && n <= dim }; });
  const today = new Date(njNow());
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const bump = (dm) => { let m = ym.m + dm, y = ym.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setYm({ y, m }); };
  const hh = d.getHours(), mm = d.getMinutes();
  return (
    <div className="njdt" ref={ref}>
      <button type="button" className="njdt-field" disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <span className="njdt-val data">{label}</span>
        <Icon name="calendar" size={15} color="var(--slate-400)" />
      </button>
      {open && (
        <div className="njdt-pop">
          <div className="njdt-nav">
            <button type="button" className="njdt-navbtn" onClick={() => bump(-1)}><Icon name="chevron-left" size={16} /></button>
            <span className="njdt-title">{NJDT_MONTHS[ym.m]} {ym.y}</span>
            <button type="button" className="njdt-navbtn" onClick={() => bump(1)}><Icon name="chevron-right" size={16} /></button>
          </div>
          <div className="njdt-dow">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((x) => <span key={x}>{x}</span>)}</div>
          <div className="njdt-grid">
            {cells.map((c, i) => (
              <button key={i} type="button"
                className={"njdt-day" + (c.inMonth ? "" : " out") + (same(c.cd, d) ? " sel" : "") + (same(c.cd, today) ? " today" : "")}
                onClick={() => { setYm({ y: c.cd.getFullYear(), m: c.cd.getMonth() }); commit({ y: c.cd.getFullYear(), m: c.cd.getMonth(), date: c.cd.getDate() }); }}>
                {c.cd.getDate()}
              </button>
            ))}
          </div>
          <div className="njdt-time">
            <span className="njdt-time-l"><Icon name="clock" size={13} color="var(--slate-400)" /> Time</span>
            <div className="njdt-clock">
              <div className="njdt-spin">
                <button type="button" onClick={() => commit({ h: (hh + 1) % 24 })}><Icon name="chevron-up" size={14} /></button>
                <span className="data njdt-num">{p(hh)}</span>
                <button type="button" onClick={() => commit({ h: (hh + 23) % 24 })}><Icon name="chevron-down" size={14} /></button>
              </div>
              <span className="njdt-colon">:</span>
              <div className="njdt-spin">
                <button type="button" onClick={() => commit({ min: (mm + 1) % 60 })}><Icon name="chevron-up" size={14} /></button>
                <span className="data njdt-num">{p(mm)}</span>
                <button type="button" onClick={() => commit({ min: (mm + 59) % 60 })}><Icon name="chevron-down" size={14} /></button>
              </div>
            </div>
          </div>
          <div className="njdt-foot">
            <button type="button" className="njdt-link" onClick={() => { const t = new Date(njNow()); setYm({ y: t.getFullYear(), m: t.getMonth() }); commit({ y: t.getFullYear(), m: t.getMonth(), date: t.getDate(), h: t.getHours(), min: t.getMinutes() }); }}>Now</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── standalone trend-data export (pens + date range + interval → CSV / Excel), no chart needed ──
function TrendExportDialog() {
  const cur = trendStore.pens;
  const allPens = React.useMemo(() => {
    const seen = {}; const out = [];
    cur.forEach((p) => { seen[p.tag] = 1; out.push({ tag: p.tag, name: p.name, unit: p.unit, base: p.base, amp: p.amp, group: p.group }); });
    TREND_CATALOG.forEach((c) => { if (!seen[c.tag]) { seen[c.tag] = 1; out.push(c); } });
    return out;
  }, []);
  const toInput = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); };
  const now = njNow();
  const [sel, setSel] = React.useState(() => new Set(cur.length ? cur.map((p) => p.tag) : []));
  const [start, setStart] = React.useState(toInput(now - 7 * 24 * 3600000));
  const [end, setEnd] = React.useState(toInput(now));
  const [iv, setIv] = React.useState("1h");
  const [fmt, setFmt] = React.useState("xls");
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const shown = allPens.filter((p) => !ql || (p.name + " " + p.tag + " " + (p.group || "")).toLowerCase().includes(ql));
  const toggle = (tag) => setSel((s) => { const n = new Set(s); n.has(tag) ? n.delete(tag) : n.add(tag); return n; });
  const sMs = new Date(start).getTime(), eMs = new Date(end).getTime();
  const span = eMs - sMs;
  const ivMs = INTERVAL_MS[iv] || 3600000;
  const rowCount = span > 0 ? Math.floor(span / ivMs) + 1 : 0;
  const CAP = 200000;
  const cells = rowCount * sel.size;
  const tooMany = cells > CAP;
  const canExport = sel.size > 0 && span > 0 && !tooMany;
  const selPens = allPens.filter((p) => sel.has(p.tag));

  const doExport = () => {
    if (!canExport) return;
    const ts = []; for (let t = sMs; t <= eMs; t += ivMs) ts.push(t);
    const cols = selPens.map((p) => p.name + (p.unit ? " (" + p.unit + ")" : ""));
    let content, mime, ext;
    if (fmt === "csv") {
      const esc = (s) => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      const lines = ["Timestamp," + cols.map(esc).join(",")];
      ts.forEach((t) => { lines.push(fmtFullTs(t) + "," + selPens.map((p) => penValueAt(p, t).toFixed(2)).join(",")); });
      content = lines.join("\n"); mime = "text/csv;charset=utf-8"; ext = "csv";
    } else {
      const th = "<tr><th>Timestamp</th>" + cols.map((c) => "<th>" + c + "</th>").join("") + "</tr>";
      const rows = ts.map((t) => "<tr><td>" + fmtFullTs(t) + "</td>" + selPens.map((p) => "<td>" + penValueAt(p, t).toFixed(2) + "</td>").join("") + "</tr>").join("");
      content = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>th{background:#0F182B;color:#fff;text-align:left}td,th{border:1px solid #E0E5EB;padding:4px 8px;font-family:Calibri,Arial}</style></head><body><table>' + th + rows + "</table></body></html>";
      mime = "application/vnd.ms-excel"; ext = "xls";
    }
    njDownloadFile("njord-trends-" + start.slice(0, 10) + "_" + end.slice(0, 10) + "." + ext, mime, content);
    closeDialog();
    njToast("Exported " + ts.length.toLocaleString() + " rows × " + selPens.length + " signal" + (selPens.length !== 1 ? "s" : "") + " to " + (fmt === "csv" ? "CSV." : "Excel."));
  };

  return (
    <Dialog width={620}>
      <DlgHeader icon="download" name="Export trend data" onClose={closeDialog} />
      <div className="dlg-body tex-body">
        <p className="tex-intro">Export raw sampled values for any parameters over a date range, no need to load them on the chart first. Long ranges (up to a year) are supported; raise the interval to keep the file manageable.</p>

        <div className="tex-grid">
          <div className="an-rb-field"><span className="an-rb-l">Start date</span>
            <NjDateTime value={new Date(start).getTime()} onChange={(ms) => setStart(toInput(ms))} /></div>
          <div className="an-rb-field"><span className="an-rb-l">End date</span>
            <NjDateTime value={new Date(end).getTime()} onChange={(ms) => setEnd(toInput(ms))} /></div>
          <div className="an-rb-field"><span className="an-rb-l">Interval</span>
            <select className="nj-select" value={iv} onChange={(e) => setIv(e.target.value)}>
              {INTERVALS.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
            </select></div>
          <div className="an-rb-field"><span className="an-rb-l">Format</span>
            <div className="segmented tex-fmt">
              <button className={"seg" + (fmt === "xls" ? " active" : "")} onClick={() => setFmt("xls")}>Excel</button>
              <button className={"seg" + (fmt === "csv" ? " active" : "")} onClick={() => setFmt("csv")}>CSV</button>
            </div></div>
        </div>

        <div className="tex-penhead">
          <span className="an-rb-l">Parameters <span className="tex-count">{sel.size} selected</span></span>
          <div className="tex-penhead-r">
            <button className="linkbtn" onClick={() => setSel(new Set(allPens.map((p) => p.tag)))}>Select all</button>
            <button className="linkbtn" onClick={() => setSel(new Set())}>Clear</button>
          </div>
        </div>
        <div className="tex-search">
          <Icon name="search" size={14} color="var(--slate-400)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parameters…" />
        </div>
        <div className="tex-penlist">
          {shown.map((p) => (
            <button key={p.tag} className={"tex-pen" + (sel.has(p.tag) ? " on" : "")} onClick={() => toggle(p.tag)}>
              <Check on={sel.has(p.tag)} />
              <span className="tex-pen-name">{p.name}</span>
              <span className="tag">{p.tag}</span>
              <span className="tex-pen-grp">{p.group}</span>
            </button>
          ))}
          {!shown.length && <div className="tex-empty">No parameters match “{q}”.</div>}
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className={"tex-meta" + (tooMany ? " warn" : "")}>
          {sel.size === 0 ? "Select at least one parameter"
            : span <= 0 ? "End date must be after start date"
            : tooMany ? "≈ " + cells.toLocaleString() + " cells: raise the interval to export"
            : "≈ " + rowCount.toLocaleString() + " rows × " + sel.size + " signal" + (sel.size !== 1 ? "s" : "")}
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={!canExport} onClick={doExport}><Icon name="download" size={15} /> Export</button>
        </div>
      </div>
    </Dialog>
  );
}
function openTrendExport() { openDialog(<TrendExportDialog />); }

Object.assign(window, {
  TREND_CATALOG, TREND_BY_TAG, TREND_PALETTE, TREND_RANGES, RANGE_HOURS, FOCUS_WINDOWS, INTERVALS, INTERVAL_MS,
  trendStore, useTrends, trendSeries, njSendToTrend, njTrendToast, njToast, resolveTrendPen, MultiTrendChart, TrendBtn,
  seriesForView, viewFromStore, markersForView, penValueAt, fmtClock, fmtDayClock, fmtFullTs, fmtAxis, njDownloadFile,
  TrendExportDialog, openTrendExport, NjDateTime,
  alarmMeasPen, resolveAlarmMeas, njInvestigateAlarm, njGoAlarm, njGoAlarmRows, useAlarmHighlight, alarmHighlight,
  NJ_CURRENT_USER, trendGroupStore, useTrendGroups, groupToPens, njLoadTrendGroup, penDef, trendGroupIsOwner,
});
