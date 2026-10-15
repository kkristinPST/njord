// commissioning.jsx — Analytics · Trial period tab (file and storage keys keep the old name).
// During a department's trial period the operator logs a water-quality round each day, the
// readings are checked against the design basis and shared with Pure Salmon Technology.
// Each value is taken one of three ways (CM_VIA): a SENSOR reads by itself and is shown, never
// typed; a PROBE is a hand-held reading on the spot; LAB is a sample carried away for analysis.
// Two ways in, because the two jobs are different:
//   • the LOG TABLE is a spreadsheet — click any manual cell, type, Tab/Enter to move on;
//   • "Log water quality" is the whole round in one pass, and the place where a site adds its own
//     sampling points and parameters (staged with the round, saved with it).
// The period length is set internally (CM_LENGTH); it is not customer facing.
const CM_KEY = "nj_commissioning_v1";
const CM_TODAY = new Date(2026, 2, 4);            // app reference "now" (04/03/2026)
const CM_ELAPSED = 91;                            // trial-period day number of CM_TODAY
const CM_LENGTH = 120;                            // trial period length, days — set internally, not by the customer
const CM_USER = "E. Sørensen";

const CM_LOCS = [
  { id: "t1", label: "Tank 1" }, { id: "t2", label: "Tank 2" },
  { id: "t3", label: "Tank 3" }, { id: "t4", label: "Tank 4" },
  { id: "inlet", label: "Inlet channel" },
  { id: "filtrate", label: "Filtrate", full: "Filtrate hydrotech filter" },
  { id: "grab", label: "Grab sample" },
  // the legacy sheet's reference point: where the handheld instrument reads, so a manual value can
  // be checked against the installed sensor. Kept as a sample point, not a plant tag.
  { id: "bucket", label: "Instrument bucket" },
];
const cmLoc = (id) => CM_LOCS.find((l) => l.id === id) || { id, label: id };
const CM_TANKS = ["t1", "t2", "t3", "t4", "inlet", "grab", "bucket"];
const CM_FILT = ["filtrate", "grab", "bucket"];
// design basis = what the plant was sold to hold. A value outside it is the whole point of the screen.
const CM_VIA = { sensor: "Sensor", probe: "Probe", lab: "Lab" };
// O₂ and temperature are sensors in the tanks, but a hand-held probe everywhere else
const CM_PROBE_PTS = { inlet: "probe", grab: "probe", bucket: "probe" };
const CM_PARAMS = [
  { id: "co2", label: "CO₂", unit: "mg/L", dec: 2, base: 7.4, spread: 2.6, band: { max: 15 }, fill: .8, method: "probe", locs: CM_TANKS },
  { id: "tgp", label: "TGP", unit: "%", dec: 1, base: 99.6, spread: 2.4, band: { min: 95, max: 103 }, fill: .5, method: "probe", locs: CM_TANKS },
  { id: "o2", label: "O₂", unit: "mg/L", dec: 1, base: 9.1, spread: 1.3, band: { min: 7, max: 12 }, fill: .85, method: "sensor", via: CM_PROBE_PTS, locs: CM_TANKS },
  { id: "ph", label: "pH", unit: "", dec: 1, base: 7.1, spread: .34, band: { min: 6.8, max: 7.6 }, fill: .6, method: "probe", locs: CM_TANKS },
  { id: "sal", label: "Salinity", unit: "ppt", dec: 1, base: 13.9, spread: .9, band: { min: 12, max: 16 }, fill: .45, method: "probe", locs: CM_TANKS },
  { id: "temp", label: "Temperature", unit: "°C", dec: 1, base: 13.7, spread: .7, band: { min: 12, max: 15 }, fill: .55, method: "sensor", via: CM_PROBE_PTS, locs: CM_TANKS },
  { id: "tan", label: "TAN", unit: "mg/L", dec: 2, base: 1.15, spread: .7, band: { max: 2 }, fill: .7, method: "lab", locs: CM_FILT },
  { id: "no2", label: "NO₂-N", unit: "mg/L", dec: 2, base: .18, spread: .16, band: { max: .5 }, fill: .7, method: "lab", locs: CM_FILT },
  { id: "no3", label: "NO₃-N", unit: "mg/L", dec: 0, base: 62, spread: 22, band: { max: 100 }, fill: .55, method: "lab", locs: CM_FILT },
  { id: "alk", label: "Alkalinity", unit: "mg CaCO₃/L", dec: 0, base: 112, spread: 26, band: { min: 80, max: 150 }, fill: .5, method: "lab", locs: CM_FILT },
  { id: "tss", label: "TSS", unit: "mg/L", dec: 1, base: 15, spread: 7, band: { max: 25 }, fill: .4, method: "lab", locs: ["inlet", "filtrate", "grab"] },
];
// own arrays per parameter: adding a sampling point to CO₂ must not add it to every CM_TANKS user
CM_PARAMS.forEach((p) => { p.locs = p.locs.slice(); p.via = { ...(p.via || {}) }; });
const CM_ALL = "__all";
const cmVia = (p, l) => (p.via && p.via[l]) || p.method || "probe";
// Sampling points and parameters the site adds itself (Log water quality). Facility-wide
// definitions merged into CM_LOCS / CM_PARAMS in place, so the sheet, the chart, the formula
// names and the export all see them. No sensor here: a sensor reading comes in as a plant tag.
const CM_DEFKEY = "nj_cm_defs_v1";
const cmDefs = {
  read() { try { const d = JSON.parse(localStorage.getItem(CM_DEFKEY) || "null"); if (d) return { locs: d.locs || [], pts: d.pts || {}, params: d.params || [] }; } catch (e) {} return { locs: [], pts: {}, params: [] }; },
  applyTo(d) {
    d.locs.forEach((l) => { if (!CM_LOCS.some((x) => x.id === l.id)) CM_LOCS.push(l); });
    d.params.forEach((p) => { if (!CM_PARAMS.some((x) => x.id === p.id)) CM_PARAMS.push({ ...p, locs: p.locs.slice(), via: { ...(p.via || {}) } }); });
    Object.keys(d.pts).forEach((pid) => { const p = CM_PARAMS.find((x) => x.id === pid); if (!p) return; d.pts[pid].forEach((x) => { if (!p.locs.includes(x.loc)) { p.locs.push(x.loc); p.via[x.loc] = x.via; } }); });
  },
  add(ch) {
    const d = cmDefs.read();
    d.locs = d.locs.concat(ch.locs); d.params = d.params.concat(ch.params);
    Object.keys(ch.pts).forEach((pid) => { d.pts[pid] = (d.pts[pid] || []).concat(ch.pts[pid]); });
    try { localStorage.setItem(CM_DEFKEY, JSON.stringify(d)); } catch (e) {}
    cmDefs.applyTo(d);
    Object.keys(CM_CALC_CACHE).forEach((k) => delete CM_CALC_CACHE[k]);   // a formula may now resolve
  },
};
cmDefs.applyTo(cmDefs.read());
const cmParam = (id) => CM_PARAMS.find((p) => p.id === id) || CM_PARAMS[0];

// Read straight off the plant — never typed. The legacy sheet ended with a fixed block of ~20 of
// these; here the operator chooses which ones ride along with the manual round, because which tag
// is worth seeing next to a hand-held reading depends on what is being trialled that week.
const CM_AUTO = [
  { id: "ph1", label: "pH sensor 1", grp: "Pump Sump", unit: "", dec: 2, tag: "SMP0-QT01", base: 7.7, amp: .2 },
  { id: "ph2", label: "pH sensor 2", grp: "Pump Sump", unit: "", dec: 2, tag: "SMP0-QT02", base: 7.75, amp: .2 },
  { id: "temp", label: "Temperature", grp: "Pump Sump", unit: "°C", dec: 2, tag: "SMP0-TT01", base: 26.4, amp: 4.2 },
  { id: "lye", label: "Lye dosing pump", grp: "Pump Sump", unit: "Hz", dec: 0, tag: "LYE0-PU01", base: 0, amp: .4 },
  { id: "hcl", label: "HCl dosing pump", grp: "Pump Sump", unit: "Hz", dec: 0, tag: "HCL0-PU01", base: 0, amp: .4 },
  { id: "mkvalve", label: "Control valve make-up water", grp: "Pump Sump", unit: "%", dec: 2, tag: "SMP0-CV01", base: .22, amp: .02 },
  { id: "level", label: "Level", grp: "Pump Sump", unit: "cm", dec: 2, tag: "SMP0-LT01", base: 0, amp: .06 },
  { id: "levelen", label: "Level energy side", grp: "Pump Sump", unit: "cm", dec: 2, tag: "SMP0-LT02", base: 0, amp: .09 },
  { id: "degpress", label: "Pressure degasser top", grp: "CO₂ degasser", unit: "bar", dec: 2, tag: "CO20-PT01", base: .99, amp: .2 },
  { id: "degfan", label: "Degasser fan", grp: "CO₂ degasser", unit: "Hz", dec: 0, tag: "CO20-JK01", base: 0, amp: .4 },
  { id: "deglvl", label: "Calculated level", grp: "CO₂ degasser", unit: "cm", dec: 0, tag: "CO20-LT01", base: 78, amp: 8 },
  { id: "dp1", label: "Distribution pump 1", grp: "Energy", unit: "Hz", dec: 0, tag: "ENE0-PU01", base: 0, amp: .4 },
  { id: "dp2", label: "Distribution pump 2", grp: "Energy", unit: "Hz", dec: 0, tag: "ENE0-PU02", base: 0, amp: .4 },
  { id: "dppress", label: "Pressure after distribution pumps", grp: "Energy", unit: "bar", dec: 2, tag: "ENE0-PT01", base: 0, amp: .02 },
  { id: "uvdose", label: "Hatchery UV dose", grp: "UV plant", unit: "mJ/cm²", dec: 0, tag: "UVP0-QT01", base: 0, amp: .4 },
  { id: "hflow", label: "Distribution flow", grp: "Hatchery", unit: "m³/h", dec: 2, tag: "HAT0-FT01", base: .14, amp: .1 },
  { id: "htray", label: "Temperature hatching trays", grp: "Hatchery", unit: "°C", dec: 2, tag: "HAT0-TT01", base: 26.3, amp: 4.9 },
  { id: "hcab", label: "Pressure hatchery cabinet", grp: "Hatchery", unit: "bar", dec: 2, tag: "HAT0-PT01", base: 0, amp: .02 },
  { id: "ho2", label: "Oxygen hatching trays", grp: "Hatchery", unit: "%", dec: 2, tag: "HAT0-QT01", base: 86.7, amp: 8.4 },
  { id: "hph3", label: "pH sensor 3 hatching trays", grp: "Hatchery", unit: "", dec: 2, tag: "HAT0-QT02", base: 7.58, amp: .18 },
];
const CM_TAGKEY = "nj_cm_tags_v1";
const CM_TAGS_DEFAULT = ["ph1", "ph2", "temp", "level"];

/* ── calculated columns ──────────────────────────────────────────────────────────────────────
   The second half of the user-defined-columns ticket: a column the operator DEFINES rather than
   picks. It is an expression over the sheet's own values — `ph.bucket - tag.ph1` is the whole
   reason the instrument bucket exists (hand reading vs installed sensor), and `co2.t1 - co2.inlet`
   is the CO₂ rise across a tank. Names are `<parameter>.<sample point>` or `tag.<plant tag>`.
   Evaluated by a small parser rather than `Function` — an operator's typo must fail with a
   readable message, never execute. Missing readings propagate as null, so a half-filled round
   shows "—" instead of a wrong number. */
const CM_CALCKEY = "nj_cm_calc_v1";
const CM_CALC_DEFAULT = [
  { id: "dev_ph", label: "pH sensor deviation", unit: "", dec: 2, expr: "ph.bucket - tag.ph1" },
  { id: "co2_rise", label: "CO₂ rise over tank", unit: "mg/L", dec: 2, expr: "co2.t1 - co2.inlet" },
];
const cmNums = (a) => a.filter((v) => v != null && !isNaN(v));
const CM_CALC_FNS = {
  avg: (a) => { const n = cmNums(a); return n.length ? n.reduce((x, y) => x + y, 0) / n.length : null; },
  sum: (a) => { const n = cmNums(a); return n.length ? n.reduce((x, y) => x + y, 0) : null; },
  min: (a) => { const n = cmNums(a); return n.length ? Math.min.apply(null, n) : null; },
  max: (a) => { const n = cmNums(a); return n.length ? Math.max.apply(null, n) : null; },
  abs: (a) => (a[0] == null ? null : Math.abs(a[0])),
};
function cmResolveName(name) {
  const parts = name.split(".");
  if (parts[0] === "tag") { const a = CM_AUTO.find((x) => x.id === parts[1]); return a ? { kind: "tag", a } : null; }
  if (parts.length !== 2) return null;
  const p = CM_PARAMS.find((x) => x.id === parts[0]);
  if (!p || !p.locs.includes(parts[1])) return null;
  return { kind: "val", p, loc: parts[1] };
}
// every name the operator can reference, for the editor's insert list
function cmTokens() {
  const out = [];
  CM_PARAMS.forEach((p) => p.locs.forEach((l) => out.push({ name: `${p.id}.${l}`, label: `${p.label} · ${cmLoc(l).label}`, unit: p.unit, grp: "Manual readings" })));
  CM_AUTO.forEach((a) => out.push({ name: `tag.${a.id}`, label: `${a.grp} · ${a.label}`, unit: a.unit, grp: "Plant tags" }));
  return out;
}
function cmCompile(src) {
  const s = String(src == null ? "" : src); let i = 0; const names = [];
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const err = (m) => { throw new Error(m); };
  function parseExpr() {
    let v = parseTerm();
    for (;;) { ws(); const c = s[i];
      if (c === "+" || c === "-") { i++; const r = parseTerm(), a = v, op = c; v = (rw, sd) => { const x = a(rw, sd), y = r(rw, sd); return x == null || y == null ? null : (op === "+" ? x + y : x - y); }; }
      else return v; }
  }
  function parseTerm() {
    let v = parseUnary();
    for (;;) { ws(); const c = s[i];
      if (c === "*" || c === "/") { i++; const r = parseUnary(), a = v, op = c; v = (rw, sd) => { const x = a(rw, sd), y = r(rw, sd); if (x == null || y == null) return null; return op === "*" ? x * y : (y === 0 ? null : x / y); }; }
      else return v; }
  }
  function parseUnary() {
    ws();
    if (s[i] === "-") { i++; const r = parseUnary(); return (rw, sd) => { const x = r(rw, sd); return x == null ? null : -x; }; }
    if (s[i] === "+") { i++; return parseUnary(); }
    return parseAtom();
  }
  function parseAtom() {
    ws();
    if (i >= s.length) err("The expression is incomplete.");
    if (s[i] === "(") { i++; const v = parseExpr(); ws(); if (s[i] !== ")") err("Missing a closing bracket."); i++; return v; }
    let m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (m) { i += m[0].length; const n = parseFloat(m[0]); return () => n; }
    m = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*/.exec(s.slice(i));
    if (!m) err(`“${s[i]}” can't be used here.`);
    const name = m[0]; i += name.length; ws();
    if (s[i] === "(") {
      const fn = CM_CALC_FNS[name.toLowerCase()];
      if (!fn) err(`“${name}” isn't a function. Available: avg, sum, min, max, abs.`);
      i++; const args = []; ws();
      if (s[i] !== ")") { for (;;) { args.push(parseExpr()); ws(); if (s[i] === ",") { i++; continue; } break; } }
      ws(); if (s[i] !== ")") err("Missing a closing bracket."); i++;
      return (rw, sd) => fn(args.map((a) => a(rw, sd)));
    }
    const ref = cmResolveName(name);
    if (!ref) err(`“${name}” isn't a value on this sheet.`);
    names.push(name);
    if (ref.kind === "tag") return (rw, sd) => (rw.ghost ? null : cmAutoVal(ref.a, rw.day, sd));
    return (rw) => { const o = rw.vals[ref.p.id]; const v = o ? o[ref.loc] : null; return v == null ? null : v; };
  }
  const fn = parseExpr(); ws();
  if (i < s.length) err(`Unexpected “${s.slice(i, i + 10)}”.`);
  if (!names.length) err("Reference at least one value from the sheet.");
  return { fn, names };
}
const CM_CALC_CACHE = {};
function cmCalcFn(expr) {
  if (!(expr in CM_CALC_CACHE)) { try { CM_CALC_CACHE[expr] = cmCompile(expr).fn; } catch (e) { CM_CALC_CACHE[expr] = null; } }
  return CM_CALC_CACHE[expr];
}
function cmCalcVal(c, row, seed) {
  const f = cmCalcFn(c.expr); if (!f) return null;
  try { const v = f(row, seed); return v == null || !isFinite(v) ? null : v; } catch (e) { return null; }
}

function cmAutoVal(a, day, seed) { const k = (Math.sin((day * 11 + (seed % 89)) / 6.5) + 1) / 2; return +(a.base + k * a.amp).toFixed(a.dec); }
function cmBandLabel(p) {
  const b = p.band;
  if (b.min != null && b.max != null) return `${b.min}–${b.max}${p.unit ? " " + p.unit : ""}`;
  if (b.max != null) return `≤ ${b.max}${p.unit ? " " + p.unit : ""}`;
  if (b.min == null) return "not set";
  return `≥ ${b.min}${p.unit ? " " + p.unit : ""}`;
}
function cmOut(p, v) {
  if (v == null || isNaN(v)) return null;
  if (p.band.max != null && v > p.band.max) return "high";
  if (p.band.min != null && v < p.band.min) return "low";
  return null;
}

/* ── deterministic seed data ── */
function cmHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h >>> 0; }
function cmRng(seed) { let x = seed >>> 0 || 1; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
function cmDateOf(day) { const d = new Date(CM_TODAY); d.setDate(d.getDate() - (CM_ELAPSED - day)); return d; }
const cmKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const cmFmt = (key) => { const [y, m, d] = key.split("-"); return `${d}/${m}/${y}`; };
const cmDayOf = (key) => { const [y, m, d] = key.split("-").map(Number); return CM_ELAPSED - Math.round((CM_TODAY - new Date(y, m - 1, d)) / 864e5); };
const CM_TODAY_KEY = cmKeyOf(CM_TODAY);

function cmGenerate(deptId) {
  const rnd = cmRng(cmHash(deptId));
  const rows = [];
  for (let day = 1; day <= CM_ELAPSED; day++) {
    const date = cmDateOf(day);
    if (day < CM_ELAPSED - 1 && rnd() < .07) continue;             // a missed round
    const vals = {};
    CM_PARAMS.forEach((p) => {
      const drift = Math.sin((day + cmHash(deptId + p.id) % 40) / 14) * p.spread * .45;
      const pv = {};
      p.locs.forEach((lid) => {
        if (cmVia(p, lid) === "sensor") return;                   // read by the sensor, see cmWithSensors
        if (rnd() > p.fill) return;
        const off = (lid === "inlet" ? -.42 : lid === "grab" ? -.2 : 0) * p.spread;
        const v = p.base + drift + off + (rnd() - .5) * p.spread * (rnd() < .06 ? 2.6 : 1);
        pv[lid] = +Math.max(0, v).toFixed(p.dec);
      });
      if (Object.keys(pv).length) vals[p.id] = pv;
    });
    const hh = 8 + Math.floor(rnd() * 9), mm = Math.floor(rnd() * 60);
    const note = rnd() < .62
      ? `pH ${(7 + rnd() * .3).toFixed(1)} · Salinity ${(13.5 + rnd()).toFixed(1)} ppt · CU ${(35 + rnd() * 14).toFixed(1)} · FAU ${Math.round(17 + rnd() * 8)}`
      : "";
    rows.push({ date: cmKeyOf(date), day, time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, by: rnd() < .3 ? "M. Ødegård" : CM_USER, note, vals });
  }
  return rows.reverse();                                           // newest first
}

// a sensor reads every day whether or not a round was logged; deterministic per point
function cmSensorVal(deptId, p, l, day) {
  const h = cmHash(deptId + p.id + l);
  const drift = Math.sin((day + h % 40) / 14) * p.spread * .45;
  const noise = (cmRng((h ^ Math.imul(day, 2654435761)) >>> 0)() - .5) * p.spread * .5;
  return +Math.max(0, p.base + drift + noise).toFixed(p.dec);
}
function cmWithSensors(deptId, r) {
  let vals = null;
  CM_PARAMS.forEach((p) => p.locs.forEach((l) => {
    if (cmVia(p, l) !== "sensor") return;
    if (!vals) vals = { ...r.vals };
    vals[p.id] = { ...(vals[p.id] || {}), [l]: cmSensorVal(deptId, p, l, r.day) };
  }));
  return vals ? { ...r, vals } : r;
}
// the batch in the department, from the batch register; stored on a round when it is saved
function cmBatchOf(deptId) { const b = (window.FACILITY_BATCHES || []).find((x) => x.deptId === deptId); return b ? b.id : "—"; }
const cmStore = {
  edits: null, subs: new Set(), cache: {}, rev: 0,
  load() {
    if (cmStore.edits) return;
    try { cmStore.edits = JSON.parse(localStorage.getItem(CM_KEY) || "{}"); } catch (e) { cmStore.edits = {}; }
  },
  persist() { try { localStorage.setItem(CM_KEY, JSON.stringify(cmStore.edits)); } catch (e) {} cmStore.rev++; cmStore.subs.forEach((f) => f()); },
  subscribe(f) { cmStore.subs.add(f); return () => cmStore.subs.delete(f); },
  snap() { cmStore.load(); return cmStore.rev; },
  // trial period length is set internally; the customer never extends it
  length() { return CM_LENGTH; },
  rows(deptId) {
    cmStore.load();
    if (!cmStore.cache[deptId]) cmStore.cache[deptId] = cmGenerate(deptId);
    const patch = cmStore.edits[deptId] || {};
    const merged = cmStore.cache[deptId].map((r) => (patch[r.date] ? { ...r, ...patch[r.date] } : r));
    Object.keys(patch).forEach((k) => { if (!merged.some((r) => r.date === k)) merged.push(patch[k]); });
    return merged.map((r) => cmWithSensors(deptId, r)).sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  row(deptId, date) { return cmStore.rows(deptId).find((r) => r.date === date); },
  save(deptId, entry) {
    cmStore.load();
    cmStore.edits = { ...cmStore.edits, [deptId]: { ...(cmStore.edits[deptId] || {}), [entry.date]: entry } };
    cmStore.persist();
  },
  // single-cell write from the spreadsheet grid; creates the day if it doesn't exist yet
  setValue(deptId, date, pid, loc, value) {
    const base = cmStore.row(deptId, date) || { date, day: cmDayOf(date), time: "—", by: CM_USER, note: "", vals: {}, batch: cmBatchOf(deptId) };
    const vals = { ...base.vals, [pid]: { ...(base.vals[pid] || {}) } };
    if (value == null) delete vals[pid][loc]; else vals[pid][loc] = value;
    if (!Object.keys(vals[pid]).length) delete vals[pid];
    cmStore.save(deptId, { ...base, vals });
  },
  setField(deptId, date, field, value) {
    const base = cmStore.row(deptId, date) || { date, day: cmDayOf(date), time: "—", by: CM_USER, note: "", vals: {}, batch: cmBatchOf(deptId) };
    cmStore.save(deptId, { ...base, [field]: value });
  },
};
function useCommissioning() { return React.useSyncExternalStore(cmStore.subscribe, cmStore.snap); }

/* ── departments in a trial period (those that own a Fish Tank) ── */
function cmDepts() { const out = []; FACILITY.forEach((b) => b.depts.forEach((d) => { if (d.systems.some((s) => s.label === "Fish Tank")) out.push({ b, d }); })); return out; }

/* ── trend linkage: a manual sample point is a pen like any other ── */
function cmTrend(deptId, deptLabel, p, locId, value) {
  const l = cmLoc(locId);
  njSendToTrend(`CM-${deptId}-${p.id}-${locId}`.toUpperCase(), {
    name: `${p.label} · ${l.label}`, unit: p.unit, value: value == null ? p.base : value,
    group: "Trial Period · " + deptLabel, tag: `${deptId.toUpperCase()}-${p.id.toUpperCase()}-${locId.toUpperCase()}`,
  });
}

/* ── log / edit a whole round ──
   Sensor points are shown, never typed. A new sampling point or parameter is STAGED here and
   saved with the round, so Cancel adds nothing to the sheet. */
const cmNewId = (pre) => pre + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
function CmViaSeg({ value, onChange }) {
  return (
    <div className="de-viewseg" role="group" aria-label="Measured by">
      {["probe", "lab"].map((k) => <button type="button" key={k} className={"de-viewbtn" + (value === k ? " on" : "")} aria-pressed={value === k} onClick={() => onChange(k)}>{CM_VIA[k]}</button>)}
    </div>
  );
}
function CmAddPoint({ p, locs, onAdd, onCancel }) {
  const free = locs.filter((l) => !p.locs.includes(l.id));
  const [pick, setPick] = React.useState(free[0] ? free[0].id : "__new");
  const [name, setName] = React.useState("");
  const [via, setVia] = React.useState(p.method === "lab" ? "lab" : "probe");
  const isNew = pick === "__new";
  const clash = isNew && name.trim() && locs.some((l) => (l.full || l.label).toLowerCase() === name.trim().toLowerCase() || l.label.toLowerCase() === name.trim().toLowerCase());
  const ok = isNew ? !!name.trim() && !clash : !!pick;
  return (
    <div className="cm-addf">
      <label className="de-field"><span className="de-field-l">Sampling point</span>
        <select className="nj-select" value={pick} onChange={(e) => setPick(e.target.value)}>
          {free.map((l) => <option key={l.id} value={l.id}>{l.full || l.label}</option>)}
          <option value="__new">New sampling point…</option>
        </select>
      </label>
      {isNew && <label className="de-field"><span className="de-field-l">Name</span><input className="de-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Tank 5 outlet" /></label>}
      <div className="de-field"><span className="de-field-l">Measured by</span><CmViaSeg value={via} onChange={setVia} /></div>
      <div className="cm-addf-act">
        {clash && <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Already a sampling point. Pick it from the list.</span>}
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!ok} onClick={() => onAdd(isNew ? { id: cmNewId("loc_"), label: name.trim() } : null, isNew ? null : pick, via)}><Icon name="plus" size={14} /> Add point</button>
      </div>
    </div>
  );
}
function CmAddParam({ locs, taken, onAdd, onCancel }) {
  const [f, setF] = React.useState({ label: "", unit: "", dec: 1, min: "", max: "", via: "lab", locs: [] });
  const [newLocs, setNewLocs] = React.useState([]);          // sampling points created for this parameter
  const [ptName, setPtName] = React.useState(null);          // null = closed
  const allLocs = locs.concat(newLocs);
  const ptClash = ptName != null && ptName.trim() && allLocs.some((l) => [l.label, l.full || ""].some((x) => x.toLowerCase() === ptName.trim().toLowerCase()));
  const addPt = () => { const l = { id: cmNewId("loc_"), label: ptName.trim() }; setNewLocs((a) => [...a, l]); setF((x) => ({ ...x, locs: [...x.locs, l.id] })); setPtName(null); };
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v) => { const t = String(v).trim().replace(",", "."); return t === "" ? null : parseFloat(t); };
  const mn = num(f.min), mx = num(f.max);
  const err = !f.label.trim() ? null
    : taken.some((t) => t.toLowerCase() === f.label.trim().toLowerCase()) ? "A parameter with this name is already on the sheet."
    : (mn != null && isNaN(mn)) || (mx != null && isNaN(mx)) ? "Design basis must be a number."
    : mn != null && mx != null && mn >= mx ? "Minimum must be below maximum."
    : !f.locs.length ? "Pick at least one sampling point." : null;
  const ok = !!f.label.trim() && !err;
  const toggle = (id) => set("locs", f.locs.includes(id) ? f.locs.filter((x) => x !== id) : [...f.locs, id]);
  const add = () => onAdd({
    id: cmNewId("p_"), label: f.label.trim(), unit: f.unit.trim(), dec: Number(f.dec),
    base: mn != null && mx != null ? (mn + mx) / 2 : (mx != null ? mx : mn != null ? mn : 0), spread: 1,
    band: { min: mn, max: mx }, fill: 0, method: f.via, via: {}, locs: allLocs.filter((l) => f.locs.includes(l.id)).map((l) => l.id), custom: true,
  }, newLocs.filter((l) => f.locs.includes(l.id)));
  return (
    <div className="cm-reg-p cm-addparam">
      <div className="cm-reg-h"><span className="cm-reg-name">New parameter</span></div>
      <div className="cm-addp-grid">
        <label className="de-field"><span className="de-field-l">Name</span><input className="de-input" autoFocus value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Phosphate" /></label>
        <label className="de-field"><span className="de-field-l">Unit</span><input className="de-input" value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="mg/L" /></label>
        <label className="de-field"><span className="de-field-l">Decimals</span>
          <select className="nj-select" value={f.dec} onChange={(e) => set("dec", Number(e.target.value))}>{[0, 1, 2, 3].map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </label>
        <label className="de-field"><span className="de-field-l">Basis min</span><input className="de-input data" inputMode="decimal" value={f.min} onChange={(e) => set("min", e.target.value)} placeholder="—" /></label>
        <label className="de-field"><span className="de-field-l">Basis max</span><input className="de-input data" inputMode="decimal" value={f.max} onChange={(e) => set("max", e.target.value)} placeholder="—" /></label>
        <div className="de-field"><span className="de-field-l">Measured by</span><CmViaSeg value={f.via} onChange={(v) => set("via", v)} /></div>
      </div>
      <div className="de-field"><span className="de-field-l">Sampling points</span>
        <div className="cm-tokrow">
          {allLocs.map((l) => <button type="button" key={l.id} className={"cm-tok" + (f.locs.includes(l.id) ? " on" : "")} aria-pressed={f.locs.includes(l.id)} onClick={() => toggle(l.id)}><span className="cm-tok-l">{l.label}</span></button>)}
          {ptName == null
            ? <button type="button" className="cm-tok cm-tok-new" onClick={() => setPtName("")}><Icon name="plus" size={12} /><span className="cm-tok-l">New sampling point</span></button>
            : <span className="cm-newpt">
                <input className="de-input" autoFocus value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder="Tank 5 outlet" aria-label="New sampling point name"
                  onKeyDown={(e) => { if (e.key === "Enter" && ptName.trim() && !ptClash) { e.preventDefault(); addPt(); } else if (e.key === "Escape") { e.stopPropagation(); setPtName(null); } }} />
                <button type="button" className="btn btn-secondary btn-sm" disabled={!ptName.trim() || ptClash} onClick={addPt}>Add</button>
                <button type="button" className="icon-btn" aria-label="Cancel new sampling point" title="Cancel" onClick={() => setPtName(null)}><Icon name="x" size={14} /></button>
              </span>}
        </div>
        {ptClash && <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Already a sampling point. Pick it above.</span>}
      </div>
      <div className="cm-addp-foot">
        {err ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> {err}</span>
          : <span className="cm-form-hint">Leave the design basis empty if it isn't set. A sensor value is added as a plant tag, not here.</span>}
        <div className="cm-addp-btns">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ok} onClick={add}><Icon name="plus" size={14} /> Add parameter</button>
        </div>
      </div>
    </div>
  );
}
function CmLogDialog({ depts, deptId: dept0, entry }) {
  const editing = !!entry;
  const [deptId, setDeptId] = React.useState(dept0);
  const dl = depts.find((o) => o.id === deptId) || depts[0];
  const [date, setDate] = React.useState(entry ? entry.date : CM_TODAY_KEY);
  const [time, setTime] = React.useState(entry && entry.time !== "—" ? entry.time : "08:00");
  const [note, setNote] = React.useState(entry ? entry.note : "");
  const [vals, setVals] = React.useState(() => JSON.parse(JSON.stringify(entry ? entry.vals : {})));
  const [stage, setStage] = React.useState({ locs: [], pts: {}, params: [] });
  const [adding, setAdding] = React.useState(null);           // param id with an open point form, or "__param"
  const locs = CM_LOCS.concat(stage.locs);
  const locOf = (id) => locs.find((l) => l.id === id) || { id, label: id };
  const params = CM_PARAMS.map((p) => {
    const add = stage.pts[p.id]; if (!add) return p;
    const via = { ...p.via }; add.forEach((x) => { via[x.loc] = x.via; });
    return { ...p, locs: p.locs.concat(add.map((x) => x.loc)), via };
  });
  const allParams = stage.params.concat(params);              // what the site just added, on top
  const addPoint = (pid, newLoc, locId, via) => {
    const loc = newLoc ? newLoc.id : locId;
    setStage((s) => {
      const nl = newLoc ? [...s.locs, newLoc] : s.locs;
      if (s.params.some((q) => q.id === pid)) return { ...s, locs: nl, params: s.params.map((q) => (q.id === pid ? { ...q, locs: [...q.locs, loc], via: { ...q.via, [loc]: via } } : q)) };
      return { ...s, locs: nl, pts: { ...s.pts, [pid]: [...(s.pts[pid] || []), { loc, via }] } };
    });
    setAdding(null);
  };
  const set = (pid, loc, raw) => setVals((v) => {
    const next = { ...v, [pid]: { ...(v[pid] || {}) } };
    if (raw === "") delete next[pid][loc]; else next[pid][loc] = raw;
    if (!Object.keys(next[pid]).length) delete next[pid];
    return next;
  });
  const isManual = (pid, l) => { const p = allParams.find((x) => x.id === pid); return p && cmVia(p, l) !== "sensor"; };
  const count = Object.keys(vals).reduce((n, k) => n + Object.keys(vals[k]).filter((l) => isManual(k, l) && vals[k][l] !== "").length, 0);
  const manual = allParams.reduce((n, p) => n + p.locs.filter((l) => cmVia(p, l) !== "sensor").length, 0);
  const staged = stage.locs.length + stage.params.length + Object.values(stage.pts).reduce((n, a) => n + a.length, 0);
  const valid = date && (count > 0 || note.trim() || staged > 0);
  const batch = (entry && entry.batch) || cmBatchOf(deptId);
  const save = () => {
    if (staged) cmDefs.add(stage);
    const clean = {};
    Object.keys(vals).forEach((k) => {
      const o = {}; Object.keys(vals[k]).forEach((l) => { if (!isManual(k, l)) return; const n = parseFloat(String(vals[k][l]).replace(",", ".")); if (!isNaN(n)) o[l] = n; });
      if (Object.keys(o).length) clean[k] = o;
    });
    cmStore.save(deptId, { date, day: cmDayOf(date), time, by: CM_USER, note: note.trim(), vals: clean, batch });
    njToast(`${editing ? "Round updated" : "Round logged"} · ${cmFmt(date)} ${time} · ${dl.label}${staged ? " · " + staged + " added to the sheet" : ""}`, "clipboard-check");
    closeDialog();
  };
  return (
    <Dialog width={760}>
      <DlgHeader icon={editing ? "pencil" : "clipboard-list"} name={editing ? "Edit round · " + cmFmt(date) : "Log water quality"} tag={dl.label} onClose={closeDialog} />
      <div className="dlg-body cm-form">
        <div className="cm-form-top">
          {depts.length > 1 && !editing
            ? <label className="de-field"><span className="de-field-l">Department</span>
                <select className="nj-select" value={deptId} onChange={(e) => setDeptId(e.target.value)}>{depts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
              </label>
            : null}
          <label className="de-field"><span className="de-field-l">Date</span><input className="de-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={editing} /></label>
          <label className="de-field"><span className="de-field-l">Time of manual sample</span><input className="de-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <div className="de-field"><span className="de-field-l">Trial day</span><div className="cm-form-day data">{cmDayOf(date) > 0 ? "Day " + cmDayOf(date) : "—"}</div></div>
          <div className="de-field"><span className="de-field-l">Batch</span><div className="cm-form-day data">{batch}</div></div>
        </div>
        <div className="cm-form-sect">
          <span className="eyebrow">Water quality input</span>
          <span className="cm-form-hint">{count} of {manual} manual points filled · sensor points read themselves · leave a field empty if it wasn't sampled</span>
        </div>
        <div className="cm-reg">
          {adding === "__param"
            ? <CmAddParam locs={locs} taken={allParams.map((q) => q.label)} onAdd={(q, nl) => { setStage((s) => ({ ...s, locs: [...s.locs, ...nl], params: [q, ...s.params] })); setAdding(null); }} onCancel={() => setAdding(null)} />
            : <button type="button" className="btn btn-secondary cm-addparam-btn" onClick={() => setAdding("__param")}><Icon name="plus" size={16} /> Add parameter</button>}
          {allParams.map((p) => (
            <div className="cm-reg-p" key={p.id}>
              <div className="cm-reg-h">
                <span className="cm-reg-name">{p.label}</span>
                {p.unit && <span className="cm-reg-unit data">{p.unit}</span>}
                {stage.params.includes(p) && <span className="cm-newtag">New</span>}
                <span className="cm-reg-basis">design basis {cmBandLabel(p)}</span>
              </div>
              <div className="cm-reg-grid">
                {p.locs.map((lid) => {
                  const via = cmVia(p, lid);
                  if (via === "sensor") {
                    const v = entry && !entry.ghost ? (entry.vals[p.id] || {})[lid] : null;
                    return (
                      <div className="cm-inp" key={lid}>
                        <span className="cm-inp-l">{locOf(lid).label} · Sensor</span>
                        <span className="cm-inp-ro data" title="Read automatically from the sensor">{v == null ? "Auto" : v.toFixed(p.dec)}</span>
                      </div>
                    );
                  }
                  const raw = (vals[p.id] || {})[lid];
                  const oor = cmOut(p, parseFloat(raw));
                  return (
                    <label className="cm-inp" key={lid}>
                      <span className="cm-inp-l">{locOf(lid).label} · {CM_VIA[via]}</span>
                      <span className={"cm-inp-w" + (oor ? " oor" : "")}>
                        <input className="de-input data" inputMode="decimal" placeholder="—" value={raw == null ? "" : raw} onChange={(e) => set(p.id, lid, e.target.value)} />
                      </span>
                    </label>
                  );
                })}
                {adding !== p.id && <button type="button" className="cm-addpt" onClick={() => setAdding(p.id)}><Icon name="plus" size={14} /> Sampling point</button>}
              </div>
              {adding === p.id && <CmAddPoint p={p} locs={locs} onAdd={(nl, id, via) => addPoint(p.id, nl, id, via)} onCancel={() => setAdding(null)} />}
            </div>
          ))}
        </div>
        <label className="de-field"><span className="de-field-l">Comment and observations</span>
          <textarea className="de-input cm-note-in" rows={3} placeholder="Anything the numbers don't say: dosing changes, suspected mis-reading, sampling conditions…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="dlg-foot">
        <span className="cm-foot-meta data">{count} value{count === 1 ? "" : "s"}{staged ? " · " + staged + " added to the sheet on save" : ""}</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> {editing ? "Save" : "Log round"}</button>
      </div>
    </Dialog>
  );
}

/* ── the full round for one day ── */
function CmDayDialog({ deptId, deptLabel, date }) {
  useCommissioning();
  const row = cmStore.row(deptId, date);
  if (!row) return <Dialog width={520}><DlgHeader name="Round" onClose={closeDialog} /><div className="dlg-body">This round no longer exists.</div></Dialog>;
  return (
    <Dialog width={840} className="dlg-tall">
      <DlgHeader icon="clipboard-list" name={"Round · " + cmFmt(row.date)} tag={"Day " + row.day} onClose={closeDialog} />
      <div className="dlg-body cm-day">
        <div className="cm-day-meta">
          <span><span className="eyebrow">Department</span> {deptLabel}</span>
          <span><span className="eyebrow">Sampled</span> <span className="data">{row.time}</span></span>
          <span><span className="eyebrow">Logged by</span> {row.by}</span>
          <span><span className="eyebrow">Batch</span> <span className="data">{row.batch || cmBatchOf(deptId)}</span></span>
        </div>
        <div className="cm-day-scroll">
        <table className="tbl cm-tbl cm-daytbl">
          <thead><tr><th className="cm-th-p">Parameter</th>{CM_LOCS.map((l) => <th key={l.id} className="cm-th-v" title={l.full || l.label}>{l.label}</th>)}</tr></thead>
          <tbody>
            {CM_PARAMS.map((p) => {
              const pv = row.vals[p.id] || {};
              return (
                <tr key={p.id}>
                  <td className="cm-td-p">{p.label}{p.unit && <span className="cm-unit"> {p.unit}</span>}<span className="cm-td-basis">{cmBandLabel(p)}</span></td>
                  {CM_LOCS.map((l) => {
                    if (!p.locs.includes(l.id)) return <td key={l.id} className="cm-td-v cm-na" />;
                    const v = pv[l.id], oor = cmOut(p, v);
                    return (
                      <td key={l.id} className={"cm-td-v data" + (oor ? " cm-oor" : "") + (cmVia(p, l.id) === "sensor" ? " cm-td-sensor" : "")} title={CM_VIA[cmVia(p, l.id)]}>
                        {v == null ? <span className="cm-none">—</span> : v.toFixed(p.dec)}
                        <TrendBtn className="cm-trendbtn" id={`CM-${deptId}-${p.id}-${l.id}`.toUpperCase()} name={`${p.label} · ${l.label}`} unit={p.unit} value={v == null ? p.base : v} group={"Trial Period · " + deptLabel} title={`Send ${p.label} ${l.label} to trends`} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="cm-day-note">
          <span className="eyebrow">Comment and observations</span>
          <p>{row.note || <span className="cm-none">No comment recorded for this round.</span>}</p>
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
        <button className="btn btn-primary" onClick={() => { closeDialog(); openDialog(<CmLogDialog depts={[{ id: deptId, label: deptLabel }]} deptId={deptId} entry={row} />); }}><Icon name="pencil" size={16} /> Edit round</button>
      </div>
    </Dialog>
  );
}

/* ── spreadsheet cell: click (or type) to edit, Tab/Enter to move on ── */
function CmCell({ value, dec, oor, editing, text, onStart, onCommit, onNav, label }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  const commit = (raw) => {
    if (text) return onCommit(raw);
    const t = String(raw).trim().replace(",", ".");
    if (t === "") return onCommit(null);
    const n = parseFloat(t);
    onCommit(isNaN(n) ? undefined : n);          // undefined = reject, keep old value
  };
  if (editing) {
    return (
      <input ref={inputRef} className={"cm-cell-inp" + (text ? " cm-cell-inp-t" : " data")} defaultValue={text ? (value || "") : (value == null ? "" : value)}
        inputMode={text ? undefined : "decimal"} aria-label={label}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onNav(0, 0); }
          else if (e.key === "Enter") { e.preventDefault(); commit(e.target.value); onNav(0, e.shiftKey ? -1 : 1); }
          else if (e.key === "Tab") { e.preventDefault(); commit(e.target.value); onNav(e.shiftKey ? -1 : 1, 0); }
        }} />
    );
  }
  return (
    <button type="button" className={"cm-cellbtn" + (text ? " cm-cellbtn-t" : "") + (oor ? " cm-oor" : "")} onClick={onStart} aria-label={label} title="Click to edit"
      onKeyDown={(e) => { if (e.key.length === 1 && /[\d.,\-a-zA-Z]/.test(e.key)) onStart(); }}>
      <span className="cm-cellv">
        {text
          ? (value ? <span className="cm-celltext">{value}</span> : <span className="cm-cellempty">—</span>)
          : (value == null ? <span className="cm-cellempty">—</span> : Number(value).toFixed(dec))}
        {oor && <Icon name={oor === "high" ? "arrow-up" : "arrow-down"} size={12} />}
      </span>
    </button>
  );
}

/* ── which plant tags ride along with the manual round (user-configurable) ── */
function CmTagsDialog({ sel, onApply }) {
  const [pick, setPick] = React.useState(() => new Set(sel));
  const [q, setQ] = React.useState("");
  const grps = [];
  CM_AUTO.forEach((a) => { const g = grps.find((x) => x.name === a.grp); (g || grps[grps.push({ name: a.grp, items: [] }) - 1]).items.push(a); });
  const match = (a) => !q.trim() || (a.label + " " + a.grp + " " + a.tag).toLowerCase().includes(q.trim().toLowerCase());
  const toggle = (id) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Dialog width={640}>
      <DlgHeader icon="columns-3" name="Plant tag columns" tag={pick.size + " selected"} onClose={closeDialog} />
      <div className="dlg-body cm-tagpick">
        <p className="cm-tagpick-hint">These are read automatically and cannot be typed into. Pick the ones worth seeing beside the manual readings. The rest stay available in Trends.</p>
        <input className="de-input" placeholder="Search tags…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plant tags" />
        <div className="cm-tagpick-list">
          {grps.map((g) => { const items = g.items.filter(match); if (!items.length) return null; return (
            <div className="cm-tagpick-grp" key={g.name}>
              <span className="eyebrow">{g.name}</span>
              {items.map((a) => (
                <label className="cm-tagpick-row" key={a.id}>
                  <input type="checkbox" checked={pick.has(a.id)} onChange={() => toggle(a.id)} />
                  <span className="cm-tagpick-l">{a.label}{a.unit ? <span className="cm-unit"> {a.unit}</span> : null}</span>
                  <span className="cm-tagpick-t data">{a.tag}</span>
                </label>
              ))}
            </div>
          ); })}
        </div>
      </div>
      <div className="dlg-foot">
        <span className="cm-foot-meta data">{pick.size} of {CM_AUTO.length}</span>
        <button className="btn btn-secondary" onClick={() => setPick(new Set(CM_TAGS_DEFAULT))}>Reset</button>
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { onApply(CM_AUTO.filter((a) => pick.has(a.id)).map((a) => a.id)); closeDialog(); }}><Icon name="check" size={16} /> Apply</button>
      </div>
    </Dialog>
  );
}

/* ── define a calculated column ── */
function CmCalcDialog({ cols, samples, onApply }) {
  // newest round where the formula has every value it needs — the newest round alone is often half-filled
  const firstHit = (c) => { for (const r of samples || []) { const v = cmCalcVal(c, r, cmHash(r.dept || "")); if (v != null) return { r, v }; } return null; };
  const [list, setList] = React.useState(cols);
  const [form, setForm] = React.useState(null);
  const [q, setQ] = React.useState("");
  const err = form ? (() => { try { cmCompile(form.expr); return null; } catch (e) { return e.message; } })() : null;
  // a half-typed formula is not an error yet: show it once the field is left, or when editing a saved column
  const [touched, setTouched] = React.useState(false);
  const showErr = !!err && touched && !!form && !!form.expr.trim();
  const openForm = (f) => { setTouched(!!f.id); setForm(f); };
  const hit = form && !err ? firstHit(form) : null;
  const toks = cmTokens().filter((t) => !q.trim() || (t.name + " " + t.label).toLowerCase().includes(q.trim().toLowerCase()));
  const grps = [];
  toks.forEach((t) => { const g = grps.find((x) => x.name === t.grp); (g || grps[grps.push({ name: t.grp, items: [] }) - 1]).items.push(t); });
  const blank = { id: "", label: "", unit: "", dec: 2, expr: "" };
  const saveForm = () => {
    const c = { ...form, id: form.id || "c" + Date.now().toString(36), label: form.label.trim() || "Calculated", dec: Number(form.dec) };
    setList((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c]));
    setForm(null);
  };
  return (
    <Dialog width={680}>
      <DlgHeader icon="function-square" name={form ? (form.id ? "Edit calculated column" : "New calculated column") : "Calculated columns"} tag={form ? undefined : list.length + " defined"} onClose={closeDialog} />
      {!form && (
        <div className="dlg-body cm-calcbody">
          <p className="cm-tagpick-hint">A calculated column derives a figure from values already on the sheet: a hand reading against its installed sensor, a rise across a tank. It is written for every round that has the values it needs, and is never typed into.</p>
          <div className="cm-calc-list">
            {list.map((c) => (
              <div className="cm-calc-row" key={c.id}>
                <div className="cm-calc-id">
                  <span className="cm-calc-l">{c.label}{c.unit ? <span className="cm-unit"> {c.unit}</span> : null}</span>
                  <span className="cm-calc-expr data">{c.expr}</span>
                </div>
                <span className="cm-calc-now data">{(() => { const h = firstHit(c); return h ? h.v.toFixed(c.dec) : "—"; })()}</span>
                <button className="cm-openbtn" title="Edit column" aria-label={"Edit " + c.label} onClick={() => openForm({ ...c })}><Icon name="pencil" size={14} /></button>
                <button className="cm-openbtn" title="Delete column" aria-label={"Delete " + c.label} onClick={() => setList((l) => l.filter((x) => x.id !== c.id))}><Icon name="trash-2" size={14} /></button>
              </div>
            ))}
            {!list.length && <p className="cm-none">No calculated columns yet.</p>}
          </div>
          <button className="btn btn-secondary cm-calc-new" onClick={() => openForm({ ...blank })}><Icon name="plus" size={16} /> New column</button>
        </div>
      )}
      {form && (
        <div className="dlg-body cm-calcbody">
          <div className="cm-calc-form">
            <label className="de-field cm-calc-f-l"><span className="de-field-l">Column name</span><input className="de-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="pH sensor deviation" /></label>
            <label className="de-field"><span className="de-field-l">Unit</span><input className="de-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="mg/L" /></label>
            <label className="de-field"><span className="de-field-l">Decimals</span>
              <select className="nj-select" value={form.dec} onChange={(e) => setForm({ ...form, dec: Number(e.target.value) })}>{[0, 1, 2, 3].map((d) => <option key={d} value={d}>{d}</option>)}</select>
            </label>
          </div>
          <label className="de-field"><span className="de-field-l">Expression</span>
            <textarea className={"de-input data cm-calc-in" + (showErr ? " cm-calc-bad" : "")} rows={1} value={form.expr} spellCheck={false}
              onBlur={() => setTouched(true)} onChange={(e) => setForm({ ...form, expr: e.target.value })} placeholder="ph.bucket - tag.ph1" />
          </label>
          <div className="cm-calc-status">
            {!form.expr.trim() ? <span className="cm-form-hint">Type a formula, or insert a value from the list below.</span>
              : showErr ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> {err}</span>
              : err ? <span className="cm-form-hint">Checked when you leave the field.</span>
              : <span className="cm-calc-ok"><Icon name="check" size={14} /><span>Valid{hit ? <React.Fragment>{" · "}{cmFmt(hit.r.date)} reads <span className="data">{hit.v.toFixed(Number(form.dec))}{form.unit ? " " + form.unit : ""}</span></React.Fragment> : " · no round has all these values yet"}</span></span>}
            <span className="cm-calc-fns data">avg sum min max abs · + − × ÷ ( )</span>
          </div>
          <div className="cm-calc-sect"><span className="eyebrow">Insert a value</span><input className="de-input cm-calc-search" placeholder="Search parameters and tags…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search values" /></div>
          <div className="cm-calc-tokens">
            {grps.map((g) => (
              <div className="cm-tokgrp" key={g.name}>
                <span className="eyebrow">{g.name}</span>
                <div className="cm-tokrow">
                  {g.items.map((t) => (
                    <button key={t.name} className="cm-tok" title={t.label + (t.unit ? " · " + t.unit : "")}
                      onClick={() => setForm((f) => ({ ...f, expr: (f.expr + (/[\s(]$|^$/.test(f.expr) ? "" : " ") + t.name).trim() }))}>
                      <span className="cm-tok-n data">{t.name}</span><span className="cm-tok-l">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="dlg-foot">
        {form
          ? <React.Fragment>
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Back</button>
              <button className="btn btn-primary" disabled={!!err || !form.expr.trim()} onClick={saveForm}><Icon name="check" size={16} /> Save</button>
            </React.Fragment>
          : <React.Fragment>
              <span className="cm-foot-meta data">{list.length} column{list.length === 1 ? "" : "s"}</span>
              <button className="btn btn-secondary" onClick={() => setList(CM_CALC_DEFAULT)}>Reset</button>
              <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { onApply(list); closeDialog(); }}><Icon name="check" size={16} /> Apply</button>
            </React.Fragment>}
      </div>
    </Dialog>
  );
}

/* ── a row for a day that isn't in the sheet ── */
function CmAddRowDialog({ depts, deptId: dept0, length, onAdded }) {
  const [deptId, setDeptId] = React.useState(dept0);
  const dl = depts.find((o) => o.id === deptId) || depts[0];
  const taken = new Set(cmStore.rows(deptId).map((r) => r.date));
  const firstFree = (t) => {
    for (let d = CM_ELAPSED; d >= 1; d--) { const k = cmKeyOf(cmDateOf(d)); if (!t.has(k)) return k; }
    return cmKeyOf(cmDateOf(Math.min(length, CM_ELAPSED + 1)));
  };
  const [date, setDate] = React.useState(() => firstFree(taken));
  const day = date ? cmDayOf(date) : NaN;
  const dup = taken.has(date);
  const ok = !!date && day >= 1 && day <= length && !dup;
  const missed = [];
  for (let d = CM_ELAPSED; d >= 1 && missed.length < 6; d--) { const k = cmKeyOf(cmDateOf(d)); if (!taken.has(k)) missed.push({ k, d }); }
  return (
    <Dialog width={520}>
      <DlgHeader icon="calendar-plus" name="Add a row" tag={dl.label} onClose={closeDialog} />
      <div className="dlg-body">
        <p className="cm-tagpick-hint">Adds an empty round to the sheet so a missed day can be back-filled, or tomorrow's round prepared. Values are typed into the grid afterwards.</p>
        <div className="cm-addrow-f">
          {depts.length > 1 && (
            <label className="de-field"><span className="de-field-l">Department</span>
              <select className="nj-select" value={deptId} onChange={(e) => { const id = e.target.value; setDeptId(id); setDate(firstFree(new Set(cmStore.rows(id).map((r) => r.date)))); }}>{depts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            </label>
          )}
          <label className="de-field"><span className="de-field-l">Date</span>
            <input className="de-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <p className="cm-calc-status">
          {dup ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> <span>{cmFmt(date)} is already on the sheet.</span></span>
            : !date || isNaN(day) ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Pick a date.</span>
            : day < 1 ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Before the trial period started.</span>
            : day > length ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> After the trial period ends.</span>
            : <span className="cm-calc-ok"><Icon name="check" size={14} /> Day {day} of {length}{day > CM_ELAPSED ? " · not yet reached" : ""}</span>}
        </p>
        {missed.length > 0 && (
          <div className="cm-calc-sect"><span className="eyebrow">Missed days</span>
            <div className="cm-tokrow">{missed.map((m) => <button key={m.k} className={"cm-tok cm-tok-d" + (m.k === date ? " on" : "")} onClick={() => setDate(m.k)}><span className="cm-tok-n data">{cmFmt(m.k)}</span><span className="cm-tok-l">Day {m.d}</span></button>)}</div>
          </div>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!ok} onClick={() => { cmStore.setField(deptId, date, "by", CM_USER); onAdded(deptId, date); njToast(`Row added · ${cmFmt(date)} · day ${day} · ${dl.label}`, "calendar-plus"); closeDialog(); }}><Icon name="plus" size={16} /> Add row</button>
      </div>
    </Dialog>
  );
}

/* ── the sheet, plotted: one parameter, every sample point, against the design basis ── */
function cmUseWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => { const n = el.offsetWidth - 2; setW((prev) => (Math.abs(prev - n) > 8 ? n : prev)); };
    const ro = new ResizeObserver(read); ro.observe(el); read();
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function CmChart({ p, rows, depts, hidden, onToggle, onOpen, flat }) {
  const [ref, w] = cmUseWidth();
  const multi = depts.length > 1;
  const [pt, setPt] = React.useState(p.locs[0]);
  const ptId = p.locs.includes(pt) ? pt : p.locs[0];
  const data = rows.filter((r) => !r.ghost);
  const udays = Array.from(new Set(data.map((r) => r.day))).sort((a, b) => a - b);
  const d0 = udays.length ? udays[0] : 0, d1 = udays.length ? udays[udays.length - 1] : 0;
  const has = new Set(data.map((r) => r.dept + "|" + r.day));
  // one department: a series per sampling point. Several: a series per department at ONE point,
  // because departments only compare like for like.
  const series = (multi
    ? depts.map((o, i) => ({ key: o.id, label: o.short, full: o.label + " · " + cmLoc(ptId).label, dept: o.id, loc: ptId, ci: i }))
    : p.locs.map((l, i) => ({ key: l, label: cmLoc(l).label, full: cmLoc(l).full || cmLoc(l).label, dept: depts[0] && depts[0].id, loc: l, ci: i }))
  ).map((s) => {
    const via = cmVia(p, s.loc);
    let pts = [];
    if (udays.length && via === "sensor") { for (let d = d0; d <= d1; d++) pts.push({ day: d, date: cmKeyOf(cmDateOf(d)), v: cmSensorVal(s.dept, p, s.loc, d) }); }
    else if (udays.length) pts = data.filter((r) => r.dept === s.dept).sort((a, b) => a.day - b.day).map((r) => ({ day: r.day, date: r.date, v: (r.vals[p.id] || {})[s.loc] })).filter((o) => o.v != null);
    return { ...s, via, pts, color: TREND_PALETTE[s.ci % TREND_PALETTE.length] };
  });
  const shown = series.filter((s) => !hidden.has(s.key) && s.pts.length);
  const total = shown.reduce((n, s) => n + s.pts.length, 0);
  const W = Math.max(600, w || 960), H = 240, L = 58, R = 20, T = 18, B = 32;
  const vals = shown.reduce((a, s) => a.concat(s.pts.map((o) => o.v)), []);
  if (p.band.min != null) vals.push(p.band.min);
  if (p.band.max != null) vals.push(p.band.max);
  let lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 1;
  if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * .12; lo -= pad; hi += pad;
  const X = (d) => L + (d1 === d0 ? (W - L - R) / 2 : ((d - d0) / (d1 - d0)) * (W - L - R));
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, .25, .5, .75, 1].map((f) => lo + f * (hi - lo));
  const step = Math.max(1, Math.ceil(udays.length / 7));
  const xlabs = udays.filter((d, i) => i % step === 0 || i === udays.length - 1);
  const bandTop = p.band.max != null ? Y(Math.min(hi, p.band.max)) : T;
  const bandBot = p.band.min != null ? Y(Math.max(lo, p.band.min)) : H - B;
  const line = (pts) => pts.map((o) => `${X(o.day)},${Y(o.v)}`).join(" ");
  const tip = (s, o, extra) => `${cmFmt(o.date)} · ${s.full} · ${CM_VIA[s.via]} · ${o.v.toFixed(p.dec)} ${p.unit}${extra || ""}`;
  return (
    <div className={flat ? "cm-chartsec" : "card cm-chartcard"}>
      <div className="cm-chart-head">
        <div className="cm-chart-id">
          <span className="eyebrow">Trial period trend</span>
          <div className="cm-chart-t">{p.label}{p.unit ? <span className="cm-unit"> {p.unit}</span> : null}<span className="cm-chart-basis">design basis {cmBandLabel(p)}</span></div>
        </div>
        <div className="cm-legend">
          {multi && (
            <select className="nj-select cm-ptsel" value={ptId} onChange={(e) => setPt(e.target.value)} aria-label={"Sampling point for " + p.label}>
              {p.locs.map((l) => <option key={l} value={l}>{cmLoc(l).label} · {CM_VIA[cmVia(p, l)]}</option>)}
            </select>
          )}
          {series.map((s) => (
            <button key={s.key} className={"cm-lg" + (hidden.has(s.key) ? " off" : "")} aria-pressed={!hidden.has(s.key)} onClick={() => onToggle(s.key)}
              title={s.full + " · " + CM_VIA[s.via] + " · " + s.pts.length + " reading" + (s.pts.length === 1 ? "" : "s") + " in range"}>
              <span className={"cm-lg-sw" + (s.via === "sensor" ? " sensor" : "")} style={{ background: s.color }} />{s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cm-chart" ref={ref}>
        {total < 2
          ? <p className="cm-chart-empty">{data.length ? "No " + p.label + " readings on the visible rounds. Pick a wider range or another parameter." : "No rounds in this range to plot."}</p>
          : (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${p.label} over the visible trial period${multi ? " by department at " + cmLoc(ptId).label : " at each sampling point"}`}>
              {(p.band.min != null || p.band.max != null) && <rect className="cmc-band" x={L} y={bandTop} width={W - L - R} height={Math.max(0, bandBot - bandTop)} />}
              {ticks.map((t, i) => (
                <g key={i}>
                  <line className="cmc-grid" x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} />
                  <text className="cmc-lbl" x={L - 8} y={Y(t) + 3.5} textAnchor="end">{t.toFixed(p.dec)}</text>
                </g>
              ))}
              {p.band.max != null && p.band.max < hi && <line className="cmc-limit" x1={L} x2={W - R} y1={Y(p.band.max)} y2={Y(p.band.max)} />}
              {p.band.min != null && p.band.min > lo && <line className="cmc-limit" x1={L} x2={W - R} y1={Y(p.band.min)} y2={Y(p.band.min)} />}
              {xlabs.map((d) => <text key={d} className="cmc-lbl" x={X(d)} y={H - 10} textAnchor="middle">{cmFmt(cmKeyOf(cmDateOf(d))).slice(0, 5)}</text>)}
              {shown.map((s) => (
                <g key={s.key}>
                  {/* sensor: a continuous solid line, it reads on days without a round too.
                      probe / lab: a dot per reading on a dotted connector, the Trends convention for manual pens */}
                  {s.via === "sensor"
                    ? <polyline className="cmc-line" stroke={s.color} points={line(s.pts)} />
                    : <React.Fragment>
                        {s.pts.length > 1 && <polyline className="cmc-line cmc-man" stroke={s.color} points={line(s.pts)} />}
                        {s.pts.map((o) => (cmOut(p, o.v) ? null : <circle key={o.date} className="cmc-pt" cx={X(o.day)} cy={Y(o.v)} r={3.2} fill={s.color}><title>{tip(s, o)}</title></circle>))}
                      </React.Fragment>}
                  {s.pts.map((o) => {
                    if (!cmOut(p, o.v)) return null;
                    const round = has.has(s.dept + "|" + o.day);
                    const open = () => onOpen(s.dept, o.date);
                    return (
                      <g key={"o" + o.date} className={round ? "cmc-oorg" : undefined} {...(round ? { role: "button", "aria-label": tip(s, o, " · outside the design basis · open the round"), ...njActivate(open), onClick: open } : {})}>
                        <circle className="cmc-oor" cx={X(o.day)} cy={Y(o.v)} r={4.2} />
                        <title>{tip(s, o, " · outside design basis" + (round ? "" : " · no round logged this day"))}</title>
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
          )}
      </div>
      <div className="cm-chart-foot">
        <span className="cm-key"><svg width="18" height="8" aria-hidden="true"><line x1="1" x2="17" y1="4" y2="4" stroke="currentColor" strokeWidth="2" /></svg>Sensor, read automatically</span>
        <span className="cm-key"><svg width="18" height="8" aria-hidden="true"><line x1="1" x2="17" y1="4" y2="4" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 3" /><circle cx="9" cy="4" r="2.6" fill="currentColor" /></svg>Probe or lab, sampled by hand</span>
        <span>Shaded band is the design basis. A ringed point is outside it; open it to see the round.</span>
      </div>
    </div>
  );
}

/* small multiples: one plot per parameter, folded so "all parameters" does not open sixteen
   charts deep. Every parameter has its own design basis, so they cannot share an axis. */
function CmCharts({ params, rows, depts, hidden, onToggle, onOpen, flat }) {
  const CAP = 3;
  const [open, setOpen] = React.useState(false);
  const shown = open ? params : params.slice(0, CAP);
  const more = params.length - shown.length;
  return (
    <React.Fragment>
      {shown.map((q) => <CmChart key={q.id} p={q} rows={rows} depts={depts} hidden={hidden} onToggle={onToggle} onOpen={onOpen} flat={flat} />)}
      {(more > 0 || open) && params.length > CAP && (
        <button className="tv-more cm-morecharts" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={14} />
          {open ? "Show fewer plots" : "Show " + more + " more parameter" + (more === 1 ? "" : "s")}
        </button>
      )}
    </React.Fragment>
  );
}

/* department picker: one, several or all — the chart then compares them like for like */
function CmDeptPick({ opts, sel, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", f); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", f); document.removeEventListener("keydown", k); };
  }, [open]);
  const ids = opts.map((o) => o.d.id);
  const all = sel.length === ids.length;
  const one = opts.find((o) => o.d.id === sel[0]);
  const summary = all && ids.length > 1 ? "All departments (" + ids.length + ")" : sel.length === 1 && one ? one.b.name + " · " + one.d.name : sel.length + " departments";
  const toggle = (id) => { const n = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]; if (n.length) onChange(ids.filter((x) => n.includes(x))); };
  return (
    <div className="cm-dpick" ref={ref}>
      <button type="button" className="nj-select cm-dpick-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{summary}</button>
      {open && (
        <div className="cm-dpick-pop" data-pop-guard="">
          <label className="cm-tagpick-row"><input type="checkbox" checked={all} onChange={() => onChange(all ? [ids[0]] : ids)} /><span className="cm-tagpick-l">All departments</span></label>
          {FACILITY.map((b) => {
            const ds = opts.filter((o) => o.b.id === b.id); if (!ds.length) return null;
            return (
              <div className="cm-tagpick-grp" key={b.id}>
                <span className="eyebrow">{b.name}</span>
                {ds.map((o) => (
                  <label className="cm-tagpick-row" key={o.d.id}>
                    <input type="checkbox" checked={sel.includes(o.d.id)} onChange={() => toggle(o.d.id)} disabled={sel.length === 1 && sel[0] === o.d.id} />
                    <span className="cm-tagpick-l">{o.d.name}</span><span className="cm-tagpick-t">{o.d.sub}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* one sheet row. Memoised: a click edits ONE cell, and re-rendering every row of a five-department
   sheet blocked the page for ~1 s. Callbacks come through a stable api object. */
const cmRowSig = (r) => r.date + "|" + r.dept + "|" + r.time + "|" + r.note + "|" + r.batch + "|" + !!r.ghost + "|" + JSON.stringify(r.vals);
const CmRow = React.memo(function CmRow({ r, k, editCol, flash, valCols, multi, dLab, autoCols, calcOn, fillW, api }) {
  const seed = cmHash(r.dept);
  return (
    <tr className={"cm-row" + (r.ghost ? " cm-ghost" : "") + (r.date === CM_TODAY_KEY ? " cm-today" : "") + (flash ? " row-just-edited" : "")}>
      <td className="cm-td-d data"><span className="cm-td-din">{cmFmt(r.date)}{r.date === CM_TODAY_KEY && <span className="cm-todaytag">Today</span>}</span></td>
      {multi && <td className="cm-td-dept" title={dLab}>{dLab}</td>}
      <td className="cm-td-b data">{r.batch || cmBatchOf(r.dept)}</td>
      <td className="cm-td-n data">{r.day}</td>
      <td className="cm-td-n data">{r.time}</td>
      {valCols.map(({ q, l, col, sensor }) => {
        const v = (r.vals[q.id] || {})[l];
        if (sensor) return <td key={col} className={"cm-td-v cm-td-auto data" + (cmOut(q, v) ? " cm-oor" : "")} title="Read automatically from the sensor">{v == null ? <span className="cm-cellempty">—</span> : v.toFixed(q.dec)}</td>;
        return (
          <td key={col} className="cm-td-v cm-td-edit">
            <CmCell value={v} dec={q.dec} oor={cmOut(q, v)} label={`${q.label} ${cmLoc(l).label} on ${cmFmt(r.date)}${multi ? ", " + dLab : ""}`}
              editing={editCol === col} onStart={() => api.start(k, col)} onCommit={(val) => api.commit(r, col, val)} onNav={api.move} />
          </td>
        );
      })}
      <td className="cm-td-note cm-td-edit">
        <CmCell text value={r.note} label={`Comment on ${cmFmt(r.date)}`}
          editing={editCol === "note"} onStart={() => api.start(k, "note")} onCommit={(val) => api.commit(r, "note", val)} onNav={api.move} />
      </td>
      {fillW > 0 && <td className="cm-td-fill" />}
      {autoCols.map((a) => <td key={a.id} className="cm-td-auto data">{r.ghost ? <span className="cm-cellempty">—</span> : cmAutoVal(a, r.day, seed).toFixed(a.dec)}</td>)}
      {calcOn.map((c) => { const v = cmCalcVal(c, r, seed); return <td key={c.id} className="cm-td-auto cm-td-calc data">{v == null ? <span className="cm-cellempty">—</span> : v.toFixed(c.dec)}</td>; })}
      <td className="cm-td-open">
        <button className="cm-openbtn" title="Edit round" aria-label={`Edit the round for ${cmFmt(r.date)}`} onClick={() => api.open(r)}><Icon name="pencil" size={16} /></button>
      </td>
    </tr>
  );
}, (a, b) => a.k === b.k && a.editCol === b.editCol && a.flash === b.flash && a.valCols === b.valCols && a.multi === b.multi && a.dLab === b.dLab
  && a.autoCols === b.autoCols && a.calcOn === b.calcOn && a.fillW === b.fillW && a.api === b.api && (a.r === b.r || cmRowSig(a.r) === cmRowSig(b.r)));

const CM_SELKEY = "nj_cm_depts_v1";
function CommissioningScreen({ tab, onTab }) {
  if (njNoSite()) return <NjNoSitePage active="analytics" title="Analytics" crumbs={["Trial Period"]} head={<window.AnalyticsTabs active={tab} onChange={onTab} />} icon="clipboard-check" what="No departments in a trial period" body="Daily water-quality rounds start here once a department enters its trial period." />;
  const rev = useCommissioning();
  const opts = cmDepts();
  const [sel, setSel] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(CM_SELKEY) || "null"); if (Array.isArray(s)) { const v = s.filter((id) => opts.some((o) => o.d.id === id)); if (v.length) return v; } } catch (e) {}
    return opts[0] ? [opts[0].d.id] : [];
  });
  React.useEffect(() => { try { localStorage.setItem(CM_SELKEY, JSON.stringify(sel)); } catch (e) {} }, [sel]);
  const depts = sel.map((id) => opts.find((o) => o.d.id === id)).filter(Boolean).map((o) => ({ id: o.d.id, label: o.b.name + " · " + o.d.name, short: o.d.name }));
  const multi = depts.length > 1;
  const deptLabel = multi ? depts.length + " departments" : depts[0] ? depts[0].label : "—";
  const dLabel = (id) => { const o = depts.find((x) => x.id === id); return o ? o.label : id; };
  const [pid, setPid] = React.useState(CM_ALL);
  const [range, setRange] = React.useState(30);
  // Table | Chart: same data, two views (the Data entry List | Table pattern). Remembered.
  const [view, setView] = React.useState(() => { try { return localStorage.getItem("nj_cm_view_v1") === "chart" ? "chart" : "table"; } catch (e) { return "table"; } });
  React.useEffect(() => { try { localStorage.setItem("nj_cm_view_v1", view); } catch (e) {} }, [view]);
  const [edit, setEdit] = React.useState(null);              // {key: "<dept>|<date>", col}  col = "<paramId>|<locId>" | "note"
  const [flash, setFlash] = React.useState(() => new Set());
  const [tagSel, setTagSel] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(CM_TAGKEY) || "null"); if (Array.isArray(s)) return s; } catch (e) {}
    return CM_TAGS_DEFAULT;
  });
  const [showTags, setShowTags] = React.useState(false);
  const applyTags = (ids) => { setTagSel(ids); setShowTags(ids.length > 0); try { localStorage.setItem(CM_TAGKEY, JSON.stringify(ids)); } catch (e) {} };
  const autoCols = React.useMemo(() => (showTags ? CM_AUTO.filter((a) => tagSel.includes(a.id)) : []), [showTags, tagSel]);
  const [calcCols, setCalcCols] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(CM_CALCKEY) || "null"); if (Array.isArray(s)) return s; } catch (e) {}
    return CM_CALC_DEFAULT;
  });
  const [showCalc, setShowCalc] = React.useState(false);
  const applyCalc = (list) => { setCalcCols(list); setShowCalc(list.length > 0); try { localStorage.setItem(CM_CALCKEY, JSON.stringify(list)); } catch (e) {} };
  const calcOn = React.useMemo(() => (showCalc ? calcCols : []), [showCalc, calcCols]);
  const [hiddenLocs, setHiddenLocs] = React.useState(() => new Set());
  const toggleLoc = (l) => setHiddenLocs((s) => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; });
  const length = cmStore.length();
  const [wrapRef, wrapW] = cmUseWidth();
  const p = cmParam(pid);
  // "All parameters" is the default: the legacy sheet IS every parameter × every sampling point.
  const allParams = pid === CM_ALL;
  const shownParams = allParams ? CM_PARAMS : [p];
  // rev: a saved round may have added a sampling point or parameter (CM_PARAMS is merged in place)
  const valCols = React.useMemo(() => shownParams.reduce((a, q) => a.concat(q.locs.map((l) => ({ q, l, col: q.id + "|" + l, sensor: cmVia(q, l) === "sensor" }))), []), [pid, rev, CM_PARAMS.length]);
  const nVal = valCols.length;
  const dIdx = (id) => sel.indexOf(id);
  const byDate = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : dIdx(a.dept) - dIdx(b.dept));
  const all = depts.reduce((a, o) => a.concat(cmStore.rows(o.id).map((r) => ({ ...r, dept: o.id }))), []).sort(byDate);
  const inRange = range === 0 ? all : all.filter((r) => r.day > CM_ELAPSED - range);
  // today is always a row per department, even before anything is logged — so the grid can be typed into
  const ghosts = depts.filter((o) => !inRange.some((r) => r.dept === o.id && r.date === CM_TODAY_KEY))
    .map((o) => ({ date: CM_TODAY_KEY, day: CM_ELAPSED, time: "—", by: "", note: "", vals: {}, ghost: true, dept: o.id }));
  const allRows = ghosts.concat(inRange).sort(byDate);
  // paged (Fit to screen by default): the header and the horizontal scrollbar stay in view while a
  // row is scanned across, and only one page of editable cells is ever rendered
  const fitN = useFitRows(wrapRef, view === "table", [wrapW, showTags, showCalc, pid, sel.join(","), allRows.length > 0]);
  const pg = usePaged(allRows, "fit", { key: "nj_cm_rows_v1", fit: fitN });
  React.useEffect(() => { pg.setPage(1); }, [sel.join(","), pid, range]);
  const [gotoKey, setGotoKey] = React.useState(null);
  React.useEffect(() => { if (!gotoKey) return; const i = allRows.findIndex((r) => r.dept + "|" + r.date === gotoKey); if (i >= 0) pg.setPage(Math.floor(i / pg.per) + 1); setGotoKey(null); }, [gotoKey, allRows.length]);
  const rows = pg.rows;
  const rk = (r) => r.dept + "|" + r.date;
  // sensor columns are read-only, so keyboard navigation skips them
  const navCols = valCols.filter((c) => !c.sensor).map((c) => c.col).concat("note");
  // fixed columns: date 150 · department 170 (several) · batch 140 · day 72 · sampled 88 · open 44
  const extraCols = autoCols.length + calcOn.length;
  const CM_FIXED = 494 + (multi ? 170 : 0), CM_VMIN = 104, CM_VMAX = 220, CM_NOTEMIN = 260, CM_NOTEMAX = 560;
  const avail = Math.max(0, wrapW - CM_FIXED);
  const valW = wrapW ? Math.min(CM_VMAX, Math.max(CM_VMIN, Math.round((avail - CM_NOTEMAX) / Math.max(nVal, 1)))) : CM_VMIN;
  const noteW = wrapW ? Math.min(CM_NOTEMAX, Math.max(CM_NOTEMIN, avail - valW * nVal)) : CM_NOTEMIN;
  const fillW = extraCols ? 0 : Math.max(0, avail - valW * nVal - noteW);
  const move = (dx, dy) => {
    if (!edit || (dx === 0 && dy === 0)) return setEdit(null);
    let ci = navCols.indexOf(edit.col), ri = rows.findIndex((r) => rk(r) === edit.key);
    ci += dx; ri += dy;
    if (ci < 0) { ci = navCols.length - 1; ri -= 1; }
    if (ci > navCols.length - 1) { ci = 0; ri += 1; }
    if (ri < 0 || ri > rows.length - 1) return setEdit(null);
    setEdit({ key: rk(rows[ri]), col: navCols[ci] });
  };
  const commit = (r, col, v) => {
    if (v === undefined) return;                             // unparseable — leave as it was
    const row = cmStore.row(r.dept, r.date);
    const [qid, lid] = col === "note" ? [null, null] : col.split("|");
    const prev = col === "note" ? ((row && row.note) || "") : (row && row.vals[qid] ? row.vals[qid][lid] : null);
    const next = col === "note" ? String(v).trim() : v;
    if ((prev == null ? null : prev) === (next === "" ? null : next)) return;   // nothing changed — no write, no highlight
    if (col === "note") cmStore.setField(r.dept, r.date, "note", next);
    else cmStore.setValue(r.dept, r.date, qid, lid, next);
    const k = rk(r);
    setFlash((s) => new Set(s).add(k));
    setTimeout(() => setFlash((s) => { const n = new Set(s); n.delete(k); return n; }), 3400);
  };

  const apiRef = React.useRef(null);
  apiRef.current = { move, commit, start: (k, col) => setEdit({ key: k, col }),
    open: (r) => { const row = cmStore.row(r.dept, r.date); openDialog(<CmLogDialog depts={depts} deptId={r.dept} entry={row || r} />); } };
  const api = React.useMemo(() => ({
    move: (dx, dy) => apiRef.current.move(dx, dy), commit: (r, c, v) => apiRef.current.commit(r, c, v),
    start: (k, c) => apiRef.current.start(k, c), open: (r) => apiRef.current.open(r),
  }), []);

  const logged = all.length, due = CM_ELAPSED * Math.max(1, depts.length);
  const oorCount = all.reduce((n, r) => n + CM_PARAMS.reduce((m, q) => m + Object.values(r.vals[q.id] || {}).filter((v) => cmOut(q, v)).length, 0), 0);
  const last = all[0];
  const pct = Math.round((logged / due) * 100);

  return (
    <AppShell active="analytics" title="Analytics" crumbs={["Trial Period"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Daily water-quality rounds for departments in their trial period: sensor, probe and lab readings checked against the design basis and shared with Pure Salmon Technology.</p>
          </div>
          <div className="pagehead-right">{window.AnalyticsTabs && <window.AnalyticsTabs active={tab} onChange={onTab} />}</div>
        </div>
      </div>

      <div className="card cm-status">
        <div className="cm-stat">
          <span className="eyebrow">Trial day</span>
          <div className="cm-stat-v data">{CM_ELAPSED}<span className="cm-stat-u">of {length}</span></div>
          <div className="cm-meter"><span style={{ width: Math.min(100, (CM_ELAPSED / length) * 100) + "%" }} /></div>
          <div className="cm-stat-sub">Started {cmFmt(cmKeyOf(cmDateOf(1)))} · ends {cmFmt(cmKeyOf(cmDateOf(length)))}</div>
        </div>
        <div className="cm-stat">
          <span className="eyebrow">Rounds logged</span>
          <div className="cm-stat-v data">{logged}<span className="cm-stat-u">{multi ? "of " + due + " due" : "of " + CM_ELAPSED + " days"}</span></div>
          <div className="cm-meter"><span style={{ width: pct + "%" }} /></div>
          <div className="cm-stat-sub">{due - logged} {multi ? "missed across " + depts.length + " departments" : "day" + (due - logged === 1 ? "" : "s") + " missed"} · {pct}% coverage</div>
        </div>
        <div className="cm-stat">
          <span className="eyebrow">Outside design basis</span>
          <div className={"cm-stat-v data" + (oorCount ? " cm-oor" : "")}>{oorCount}<span className="cm-stat-u">readings</span></div>
          <div className="cm-stat-sub">Across all parameters and sampling points</div>
        </div>
        <div className="cm-stat">
          <span className="eyebrow">Last round</span>
          <div className="cm-stat-v cm-stat-v-sm data">{last ? cmFmt(last.date) : "—"}<span className="cm-stat-u">{last ? last.time : ""}</span></div>
          <div className="cm-stat-sub">{last ? "Logged by " + last.by + (multi ? " · " + dLabel(last.dept) : "") : "No rounds logged yet"}</div>
        </div>
      </div>

      <div className="card">
        <div className="rep-toolbar">
          <div className="rep-field">
            <span className="rep-lbl">Departments</span>
            <CmDeptPick opts={opts} sel={sel} onChange={(v) => { setSel(v); setEdit(null); }} />
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Parameter</span>
            <select className="nj-select" value={pid} onChange={(e) => { setPid(e.target.value); setEdit(null); }} aria-label="Parameter">
              <option value={CM_ALL}>All parameters ({CM_PARAMS.length})</option>
              {CM_PARAMS.map((x) => <option key={x.id} value={x.id}>{x.label}{x.unit ? " (" + x.unit + ")" : ""}</option>)}
            </select>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Range</span>
            <select className="nj-select" value={range} onChange={(e) => { setRange(Number(e.target.value)); setEdit(null); }} aria-label="Range">
              <option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>Whole period</option>
            </select>
          </div>
          <div className="de-viewseg" role="group" aria-label="View" style={{ alignSelf: "flex-end" }}>
              {[{ k: "table", icon: "table-2", label: "Table" }, { k: "chart", icon: "line-chart", label: "Chart" }].map((v) => (
                <button key={v.k} className={"de-viewbtn" + (view === v.k ? " on" : "")} aria-pressed={view === v.k}
                  title={v.k === "table" ? "Log and check rounds" : "Each parameter over time against its design basis"}
                  onClick={() => { setView(v.k); setEdit(null); }}><Icon name={v.icon} size={14} /> {v.label}</button>
              ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" disabled={!depts.length} onClick={() => openDialog(<CmAddRowDialog depts={depts} deptId={depts[0].id} length={length} onAdded={(dept, d) => { if (cmDayOf(d) <= CM_ELAPSED - range && range !== 0) setRange(0); setFlash((s) => new Set(s).add(dept + "|" + d)); setGotoKey(dept + "|" + d); setEdit({ key: dept + "|" + d, col: navCols[0] }); }} />)}><Icon name="calendar-plus" size={16} /> Add row</button>
            <ExportMenu describe={(fmt) => "Download started: trial period log · " + deptLabel + " will save as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
            <button className="btn btn-primary" disabled={!depts.length} onClick={() => openDialog(<CmLogDialog depts={depts} deptId={depts[0].id} />)}><Icon name="plus" size={16} /> Log water quality</button>
          </div>
        </div>

        <div className="cm-gridhint" style={view === "table" ? undefined : { display: "none" }}>
          <Icon name="table-2" size={14} color="var(--slate-400)" />
          <span>Click any cell to edit it. <strong>Tab</strong> moves across, <strong>Enter</strong> down, <strong>Esc</strong> cancels. Shaded columns are read automatically. Use <strong>Log water quality</strong> for a full round or to add a sampling point or parameter.</span>
          <span className="mb-groups">
            <button className={"mb-gchip" + (showTags ? " on" : "")} aria-pressed={showTags} disabled={!tagSel.length}
              onClick={() => { setShowTags((v) => !v); setEdit(null); }}>Plant tags{tagSel.length ? " · " + tagSel.length : ""}</button>
            <button className="mb-gchip" onClick={() => openDialog(<CmTagsDialog sel={tagSel} onApply={applyTags} />)}><Icon name="sliders-horizontal" size={12} /> Choose…</button>
            <span className="cm-chipdiv" />
            <button className={"mb-gchip" + (showCalc ? " on" : "")} aria-pressed={showCalc} disabled={!calcCols.length}
              onClick={() => { setShowCalc((v) => !v); setEdit(null); }}>Calculated{calcCols.length ? " · " + calcCols.length : ""}</button>
            <button className="mb-gchip" onClick={() => openDialog(<CmCalcDialog cols={calcCols} samples={all.slice(0, 120)} onApply={applyCalc} />)}><Icon name="function-square" size={12} /> Define…</button>
          </span>
        </div>

        <div className="cm-tblwrap" ref={wrapRef} style={view === "table" ? undefined : { display: "none" }}>
          <table className="tbl cm-tbl cm-log">
            <colgroup>
              <col style={{ width: 150 }} />{multi && <col style={{ width: 170 }} />}<col style={{ width: 140 }} /><col style={{ width: 72 }} /><col style={{ width: 88 }} />
              {valCols.map((c) => <col key={c.col} style={{ width: valW }} />)}
              <col style={{ width: noteW }} />{fillW > 0 && <col style={{ width: fillW }} />}
              {autoCols.map((a) => <col key={a.id} style={{ width: 132 }} />)}
              {calcOn.map((c) => <col key={c.id} style={{ width: 138 }} />)}
              <col style={{ width: 44 }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} className="cm-th-d">Date</th>
                {multi && <th rowSpan={2} className="cm-th-dept">Department</th>}
                <th rowSpan={2} className="cm-th-b">Batch</th>
                <th rowSpan={2} className="cm-th-n">Day</th>
                <th rowSpan={2} className="cm-th-n">Sampled</th>
                {shownParams.map((q) => (
                  <th key={q.id} colSpan={q.locs.length} className="cm-th-grp"><span className="nocaps">{q.label}{q.unit ? " · " + q.unit : ""}</span> <span className="cm-th-basis nocaps">design basis {cmBandLabel(q)}</span></th>
                ))}
                <th rowSpan={2} className="cm-th-note">Comment and observations</th>
                {fillW > 0 && <th rowSpan={2} className="cm-th-fill" />}
                {autoCols.length > 0 && <th colSpan={autoCols.length} className="cm-th-grp">From plant tags <span className="cm-th-basis nocaps">read-only</span></th>}
                {calcOn.length > 0 && <th colSpan={calcOn.length} className="cm-th-grp">Calculated <span className="cm-th-basis nocaps">derived from this sheet</span></th>}
                <th rowSpan={2} className="cm-th-open" aria-label="Open round" />
              </tr>
              <tr>
                {valCols.map(({ q, l, col, sensor }) => (
                  <th key={col} className="cm-th-v" title={q.label + " · " + (cmLoc(l).full || cmLoc(l).label) + " · " + CM_VIA[cmVia(q, l)]}>
                    <span className="cm-th-vin">{cmLoc(l).label}
                      {!multi && <TrendBtn className="cm-trendbtn" id={`CM-${depts[0].id}-${q.id}-${l}`.toUpperCase()} name={`${q.label} · ${cmLoc(l).label}`} unit={q.unit} value={q.base} group={"Trial Period · " + deptLabel} title={`Send ${q.label} ${cmLoc(l).label} to trends`} />}
                    </span>
                    <span className={"mb-tag" + (sensor ? " cm-via-s" : "")}>{CM_VIA[cmVia(q, l)]}</span>
                  </th>
                ))}
                {autoCols.map((a) => (
                  <th key={a.id} className="cm-th-v" title={a.grp + " · " + a.label + (a.unit ? " · " + a.unit : "") + " · " + a.tag}>
                    <span className="cm-th-vin"><span className="nocaps">{a.label}{a.unit ? " · " + a.unit : ""}</span>
                      <TrendBtn className="cm-trendbtn" id={a.tag} name={a.grp + " · " + a.label} unit={a.unit} value={a.base} group={"Trial Period · " + deptLabel} title={"Send " + a.label + " to trends"} />
                    </span>
                    <span className="mb-tag data">{a.tag}</span>
                  </th>
                ))}
                {calcOn.map((c) => (
                  <th key={c.id} className="cm-th-v" title={c.label + (c.unit ? " · " + c.unit : "") + " = " + c.expr}>
                    <span className="cm-th-vin"><span className="nocaps">{c.label}{c.unit ? " · " + c.unit : ""}</span></span>
                    <span className="mb-tag data cm-fx">{c.expr}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const k = rk(r);
                return <CmRow key={k} r={r} k={k} editCol={edit && edit.key === k ? edit.col : null} flash={flash.has(k)} valCols={valCols} multi={multi}
                  dLab={multi ? dLabel(r.dept) : ""} autoCols={autoCols} calcOn={calcOn} fillW={fillW} api={api} />;
              })}
              {rows.length === 0 && <tr><td colSpan={nVal + 6 + (multi ? 1 : 0) + extraCols} className="cm-cellempty">No rounds logged in this range.</td></tr>}
            </tbody>
          </table>
        </div>
        {view === "table" && <PageFoot pg={pg} noun="rounds" options={NJ_FIT_ROWS} />}
        {view === "chart" && (
          <div className="cm-chartview">
            <CmCharts flat params={shownParams} rows={allRows} depts={depts} hidden={hiddenLocs} onToggle={toggleLoc}
              onOpen={(dept, d) => openDialog(<CmDayDialog deptId={dept} deptLabel={dLabel(dept)} date={d} />)} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

Object.assign(window, { CommissioningScreen, cmStore, CmCell, cmFmt, cmKeyOf, cmDateOf, cmDayOf, cmHash, cmRng, CM_TODAY, CM_USER, CM_TODAY_KEY });
