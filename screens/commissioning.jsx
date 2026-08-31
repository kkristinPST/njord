// commissioning.jsx — Analytics · Commissioning tab.
// Rebuild of the legacy "Trial Period" screen: during commissioning the operator logs a manual
// water-quality round each day, the readings are checked against the design basis and shared with
// Pure Salmon Technology. Two ways in, because the two jobs are different:
//   • the LOG TABLE is a spreadsheet — click any cell, type, Tab/Enter to move on (the operators
//     come from Excel and want that flexibility for corrections and spot readings);
//   • "Log water quality" is the legacy Data Registration dialog — the whole round, every
//     parameter × sample point in one pass, plus observations.
// Every reading is also trendable: each sample-point column and each parameter in the day record
// carries a send-to-trend button.

const CM_KEY = "nj_commissioning_v1";
const CM_TODAY = new Date(2026, 2, 4);            // app reference "now" (04/03/2026)
const CM_ELAPSED = 91;                            // commissioning day number of CM_TODAY
const CM_LENGTH = 120;                            // planned commissioning length, days
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
const CM_PARAMS = [
  { id: "co2", label: "CO₂", unit: "mg/L", dec: 2, base: 7.4, spread: 2.6, band: { max: 15 }, fill: .8, locs: CM_TANKS },
  { id: "tgp", label: "TGP", unit: "%", dec: 1, base: 99.6, spread: 2.4, band: { min: 95, max: 103 }, fill: .5, locs: CM_TANKS },
  { id: "o2", label: "O₂", unit: "mg/L", dec: 1, base: 9.1, spread: 1.3, band: { min: 7, max: 12 }, fill: .85, locs: CM_TANKS },
  { id: "ph", label: "pH", unit: "", dec: 1, base: 7.1, spread: .34, band: { min: 6.8, max: 7.6 }, fill: .6, locs: CM_TANKS },
  { id: "sal", label: "Salinity", unit: "ppt", dec: 1, base: 13.9, spread: .9, band: { min: 12, max: 16 }, fill: .45, locs: CM_TANKS },
  { id: "temp", label: "Temperature", unit: "°C", dec: 1, base: 13.7, spread: .7, band: { min: 12, max: 15 }, fill: .55, locs: CM_TANKS },
  { id: "tan", label: "TAN", unit: "mg/L", dec: 2, base: 1.15, spread: .7, band: { max: 2 }, fill: .7, locs: CM_FILT },
  { id: "no2", label: "NO₂-N", unit: "mg/L", dec: 2, base: .18, spread: .16, band: { max: .5 }, fill: .7, locs: CM_FILT },
  { id: "no3", label: "NO₃-N", unit: "mg/L", dec: 0, base: 62, spread: 22, band: { max: 100 }, fill: .55, locs: CM_FILT },
  { id: "alk", label: "Alkalinity", unit: "mg CaCO₃/L", dec: 0, base: 112, spread: 26, band: { min: 80, max: 150 }, fill: .5, locs: CM_FILT },
  { id: "tss", label: "TSS", unit: "mg/L", dec: 1, base: 15, spread: 7, band: { max: 25 }, fill: .4, locs: ["inlet", "filtrate", "grab"] },
];
const cmParam = (id) => CM_PARAMS.find((p) => p.id === id) || CM_PARAMS[0];

// Read straight off the plant — never typed. The legacy sheet ended with a fixed block of ~20 of
// these; here the operator chooses which ones ride along with the manual round, because which tag
// is worth seeing next to a hand-held reading depends on what is being commissioned that week.
const CM_AUTO = [
  { id: "ph1", label: "pH sensor 1", grp: "Pump sump", unit: "", dec: 2, tag: "SMP0-QT01", base: 7.7, amp: .2 },
  { id: "ph2", label: "pH sensor 2", grp: "Pump sump", unit: "", dec: 2, tag: "SMP0-QT02", base: 7.75, amp: .2 },
  { id: "temp", label: "Temperature", grp: "Pump sump", unit: "°C", dec: 2, tag: "SMP0-TT01", base: 26.4, amp: 4.2 },
  { id: "lye", label: "Lye dosing pump", grp: "Pump sump", unit: "Hz", dec: 0, tag: "LYE0-PU01", base: 0, amp: .4 },
  { id: "hcl", label: "HCl dosing pump", grp: "Pump sump", unit: "Hz", dec: 0, tag: "HCL0-PU01", base: 0, amp: .4 },
  { id: "mkvalve", label: "Control valve make-up water", grp: "Pump sump", unit: "%", dec: 2, tag: "SMP0-CV01", base: .22, amp: .02 },
  { id: "level", label: "Level", grp: "Pump sump", unit: "cm", dec: 2, tag: "SMP0-LT01", base: 0, amp: .06 },
  { id: "levelen", label: "Level energy side", grp: "Pump sump", unit: "cm", dec: 2, tag: "SMP0-LT02", base: 0, amp: .09 },
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

const CM_LENKEY = "nj_cm_length_v1";
const cmStore = {
  edits: null, subs: new Set(), cache: {}, rev: 0, len: null,
  load() {
    if (cmStore.edits) return;
    try { cmStore.edits = JSON.parse(localStorage.getItem(CM_KEY) || "{}"); } catch (e) { cmStore.edits = {}; }
    let n = NaN; try { n = parseInt(localStorage.getItem(CM_LENKEY), 10); } catch (e) {}
    cmStore.len = !isNaN(n) && n >= CM_ELAPSED ? n : CM_LENGTH;
  },
  persist() { try { localStorage.setItem(CM_KEY, JSON.stringify(cmStore.edits)); } catch (e) {} cmStore.rev++; cmStore.subs.forEach((f) => f()); },
  subscribe(f) { cmStore.subs.add(f); return () => cmStore.subs.delete(f); },
  snap() { cmStore.load(); return cmStore.rev; },
  // planned commissioning length. A trial period routinely runs long — the operator extends it
  // here rather than logging rounds against a period that says it already ended.
  length() { cmStore.load(); return cmStore.len || CM_LENGTH; },
  setLength(n) { cmStore.load(); cmStore.len = n; try { localStorage.setItem(CM_LENKEY, String(n)); } catch (e) {} cmStore.persist(); },
  rows(deptId) {
    cmStore.load();
    if (!cmStore.cache[deptId]) cmStore.cache[deptId] = cmGenerate(deptId);
    const patch = cmStore.edits[deptId] || {};
    const merged = cmStore.cache[deptId].map((r) => (patch[r.date] ? { ...r, ...patch[r.date] } : r));
    Object.keys(patch).forEach((k) => { if (!merged.some((r) => r.date === k)) merged.push(patch[k]); });
    return merged.sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  row(deptId, date) { return cmStore.rows(deptId).find((r) => r.date === date); },
  save(deptId, entry) {
    cmStore.load();
    cmStore.edits = { ...cmStore.edits, [deptId]: { ...(cmStore.edits[deptId] || {}), [entry.date]: entry } };
    cmStore.persist();
  },
  // single-cell write from the spreadsheet grid; creates the day if it doesn't exist yet
  setValue(deptId, date, pid, loc, value) {
    const base = cmStore.row(deptId, date) || { date, day: cmDayOf(date), time: "—", by: CM_USER, note: "", vals: {} };
    const vals = { ...base.vals, [pid]: { ...(base.vals[pid] || {}) } };
    if (value == null) delete vals[pid][loc]; else vals[pid][loc] = value;
    if (!Object.keys(vals[pid]).length) delete vals[pid];
    cmStore.save(deptId, { ...base, vals });
  },
  setField(deptId, date, field, value) {
    const base = cmStore.row(deptId, date) || { date, day: cmDayOf(date), time: "—", by: CM_USER, note: "", vals: {} };
    cmStore.save(deptId, { ...base, [field]: value });
  },
};
function useCommissioning() { return React.useSyncExternalStore(cmStore.subscribe, cmStore.snap); }

/* ── departments in commissioning (those that own a Fish Tank) ── */
function cmDepts() { const out = []; FACILITY.forEach((b) => b.depts.forEach((d) => { if (d.systems.some((s) => s.label === "Fish Tank")) out.push({ b, d }); })); return out; }

/* ── trend linkage: a manual sample point is a pen like any other ── */
function cmTrend(deptId, deptLabel, p, locId, value) {
  const l = cmLoc(locId);
  njSendToTrend(`CM-${deptId}-${p.id}-${locId}`.toUpperCase(), {
    name: `${p.label} · ${l.label}`, unit: p.unit, value: value == null ? p.base : value,
    group: "Commissioning · " + deptLabel, tag: `${deptId.toUpperCase()}-${p.id.toUpperCase()}-${locId.toUpperCase()}`,
  });
}

/* ── log / edit a whole round (the legacy Data Registration dialog) ── */
function CmLogDialog({ deptId, deptLabel, entry }) {
  const editing = !!entry;
  const [date, setDate] = React.useState(entry ? entry.date : CM_TODAY_KEY);
  const [time, setTime] = React.useState(entry && entry.time !== "—" ? entry.time : "08:00");
  const [note, setNote] = React.useState(entry ? entry.note : "");
  const [vals, setVals] = React.useState(() => JSON.parse(JSON.stringify(entry ? entry.vals : {})));
  const set = (pid, loc, raw) => setVals((v) => {
    const next = { ...v, [pid]: { ...(v[pid] || {}) } };
    if (raw === "") delete next[pid][loc]; else next[pid][loc] = raw;
    if (!Object.keys(next[pid]).length) delete next[pid];
    return next;
  });
  const count = Object.values(vals).reduce((n, o) => n + Object.keys(o).length, 0);
  const valid = date && (count > 0 || note.trim());
  const save = () => {
    const clean = {};
    Object.keys(vals).forEach((k) => {
      const o = {}; Object.keys(vals[k]).forEach((l) => { const n = parseFloat(vals[k][l]); if (!isNaN(n)) o[l] = n; });
      if (Object.keys(o).length) clean[k] = o;
    });
    cmStore.save(deptId, { date, day: cmDayOf(date), time, by: CM_USER, note: note.trim(), vals: clean });
    njToast(`${editing ? "Round updated" : "Round logged"} · ${cmFmt(date)} ${time} · ${deptLabel}`, "clipboard-check");
    closeDialog();
  };
  return (
    <Dialog width={720}>
      <DlgHeader icon={editing ? "pencil" : "clipboard-list"} name={editing ? "Edit round · " + cmFmt(date) : "Log water quality"} tag={deptLabel} onClose={closeDialog} />
      <div className="dlg-body cm-form">
        <div className="cm-form-top">
          <label className="de-field"><span className="de-field-l">Date</span><input className="de-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={editing} /></label>
          <label className="de-field"><span className="de-field-l">Time of manual sample</span><input className="de-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <div className="de-field"><span className="de-field-l">Commissioning day</span><div className="cm-form-day data">{cmDayOf(date) > 0 ? "Day " + cmDayOf(date) : "—"}</div></div>
        </div>
        <div className="cm-form-sect">
          <span className="eyebrow">Water quality input</span>
          <span className="cm-form-hint">{count} of {CM_PARAMS.reduce((n, p) => n + p.locs.length, 0)} sample points filled · leave a field empty if it wasn't sampled</span>
        </div>
        <div className="cm-reg">
          {CM_PARAMS.map((p) => (
            <div className="cm-reg-p" key={p.id}>
              <div className="cm-reg-h">
                <span className="cm-reg-name">{p.label}</span>
                {p.unit && <span className="cm-reg-unit data">{p.unit}</span>}
                <span className="cm-reg-basis">design basis {cmBandLabel(p)}</span>
              </div>
              <div className="cm-reg-grid">
                {p.locs.map((lid) => {
                  const raw = (vals[p.id] || {})[lid];
                  const oor = cmOut(p, parseFloat(raw));
                  return (
                    <label className="cm-inp" key={lid}>
                      <span className="cm-inp-l">{cmLoc(lid).label}</span>
                      <span className={"cm-inp-w" + (oor ? " oor" : "")}>
                        <input className="de-input data" inputMode="decimal" placeholder="—" value={raw == null ? "" : raw} onChange={(e) => set(p.id, lid, e.target.value)} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <label className="de-field"><span className="de-field-l">Comment and observations</span>
          <textarea className="de-input cm-note-in" rows={3} placeholder="Anything the numbers don't say — dosing changes, suspected mis-reading, sampling conditions…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="dlg-foot">
        <span className="cm-foot-meta data">{count} value{count === 1 ? "" : "s"}</span>
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
                      <td key={l.id} className={"cm-td-v data" + (oor ? " cm-oor" : "")}>
                        {v == null ? <span className="cm-none">—</span> : v.toFixed(p.dec)}
                        <TrendBtn className="cm-trendbtn" id={`CM-${deptId}-${p.id}-${l.id}`.toUpperCase()} name={`${p.label} · ${l.label}`} unit={p.unit} value={v == null ? p.base : v} group={"Commissioning · " + deptLabel} title={`Send ${p.label} ${l.label} to trends`} />
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
        <button className="btn btn-primary" onClick={() => { closeDialog(); openDialog(<CmLogDialog deptId={deptId} deptLabel={deptLabel} entry={row} />); }}><Icon name="pencil" size={16} /> Edit round</button>
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
      <Icon name="pencil" size={12} />
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
        <p className="cm-tagpick-hint">These are read automatically and cannot be typed into. Pick the ones worth seeing beside the manual readings — the rest stay available in Trends.</p>
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
function CmCalcDialog({ cols, sample, seed, onApply }) {
  const [list, setList] = React.useState(cols);
  const [form, setForm] = React.useState(null);
  const [q, setQ] = React.useState("");
  const err = form ? (() => { try { cmCompile(form.expr); return null; } catch (e) { return e.message; } })() : null;
  const preview = form && !err && sample ? cmCalcVal(form, sample, seed) : null;
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
          <p className="cm-tagpick-hint">A calculated column derives a figure from values already on the sheet — a hand reading against its installed sensor, a rise across a tank. It is written for every round that has the values it needs, and is never typed into.</p>
          <div className="cm-calc-list">
            {list.map((c) => (
              <div className="cm-calc-row" key={c.id}>
                <div className="cm-calc-id">
                  <span className="cm-calc-l">{c.label}{c.unit ? <span className="cm-unit"> {c.unit}</span> : null}</span>
                  <span className="cm-calc-expr data">{c.expr}</span>
                </div>
                <span className="cm-calc-now data">{(() => { const v = sample ? cmCalcVal(c, sample, seed) : null; return v == null ? "—" : v.toFixed(c.dec); })()}</span>
                <button className="cm-openbtn" title="Edit column" aria-label={"Edit " + c.label} onClick={() => setForm({ ...c })}><Icon name="pencil" size={14} /></button>
                <button className="cm-openbtn" title="Delete column" aria-label={"Delete " + c.label} onClick={() => setList((l) => l.filter((x) => x.id !== c.id))}><Icon name="trash-2" size={14} /></button>
              </div>
            ))}
            {!list.length && <p className="cm-none">No calculated columns yet.</p>}
          </div>
          <button className="btn btn-secondary cm-calc-new" onClick={() => setForm({ ...blank })}><Icon name="plus" size={16} /> New column</button>
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
            <textarea className={"de-input data cm-calc-in" + (err ? " cm-calc-bad" : "")} rows={2} value={form.expr} spellCheck={false}
              onChange={(e) => setForm({ ...form, expr: e.target.value })} placeholder="ph.bucket - tag.ph1" />
          </label>
          <div className="cm-calc-status">
            {err
              ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> {err}</span>
              : <span className="cm-calc-ok"><Icon name="check" size={14} /> Valid{sample ? <> · on {cmFmt(sample.date)} this reads <span className="data">{preview == null ? "—" : preview.toFixed(Number(form.dec))}</span> {form.unit}</> : null}</span>}
            <span className="cm-calc-fns data">avg( ) sum( ) min( ) max( ) abs( ) + − × ÷ ( )</span>
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

/* ── the planned period, and a row for a day that isn't in the sheet ── */
function CmPeriodDialog({ length }) {
  const [v, setV] = React.useState(String(length));
  const n = parseInt(v, 10);
  const ok = !isNaN(n) && n >= CM_ELAPSED && n <= 400 && n !== length;
  return (
    <Dialog width={480}>
      <DlgHeader icon="calendar-range" name="Commissioning period" onClose={closeDialog} />
      <div className="dlg-body">
        <p className="cm-tagpick-hint">Day {CM_ELAPSED} of the trial period has been logged. Extending the period keeps coverage honest — it does not remove any round.</p>
        <label className="de-field"><span className="de-field-l">Planned length, days</span>
          <input className="de-input data" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} />
        </label>
        <p className="cm-calc-status">{isNaN(n) || n < CM_ELAPSED ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Cannot be shorter than the {CM_ELAPSED} days already elapsed.</span>
          : <span className="cm-calc-ok"><Icon name="check" size={14} /> Ends {cmFmt(cmKeyOf(cmDateOf(n)))} · {n - CM_ELAPSED} day{n - CM_ELAPSED === 1 ? "" : "s"} remaining</span>}</p>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!ok} onClick={() => { cmStore.setLength(n); njToast(`Commissioning period set to ${n} days · ends ${cmFmt(cmKeyOf(cmDateOf(n)))}`, "calendar-range"); closeDialog(); }}><Icon name="check" size={16} /> Save period</button>
      </div>
    </Dialog>
  );
}

function CmAddRowDialog({ deptId, deptLabel, length, onAdded }) {
  const taken = new Set(cmStore.rows(deptId).map((r) => r.date));
  const first = (() => {
    for (let d = CM_ELAPSED; d >= 1; d--) { const k = cmKeyOf(cmDateOf(d)); if (!taken.has(k)) return k; }
    return cmKeyOf(cmDateOf(Math.min(length, CM_ELAPSED + 1)));
  })();
  const [date, setDate] = React.useState(first);
  const day = date ? cmDayOf(date) : NaN;
  const dup = taken.has(date);
  const ok = !!date && day >= 1 && day <= length && !dup;
  const missed = [];
  for (let d = CM_ELAPSED; d >= 1 && missed.length < 6; d--) { const k = cmKeyOf(cmDateOf(d)); if (!taken.has(k)) missed.push({ k, d }); }
  return (
    <Dialog width={520}>
      <DlgHeader icon="calendar-plus" name="Add a row" tag={deptLabel} onClose={closeDialog} />
      <div className="dlg-body">
        <p className="cm-tagpick-hint">Adds an empty round to the sheet so a missed day can be back-filled, or tomorrow's round prepared. Values are typed into the grid afterwards.</p>
        <label className="de-field"><span className="de-field-l">Date</span>
          <input className="de-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <p className="cm-calc-status">
          {dup ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> {cmFmt(date)} is already on the sheet.</span>
            : !date || isNaN(day) ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Pick a date.</span>
            : day < 1 ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Before the trial period started.</span>
            : day > length ? <span className="cm-calc-err"><Icon name="alert-triangle" size={14} /> Past the planned period — extend it first.</span>
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
        <button className="btn btn-primary" disabled={!ok} onClick={() => { cmStore.setField(deptId, date, "by", CM_USER); onAdded(date); njToast(`Row added · ${cmFmt(date)} · day ${day}`, "calendar-plus"); closeDialog(); }}><Icon name="plus" size={16} /> Add row</button>
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

function CmChart({ p, rows, hidden, onToggle, onOpen }) {
  const [ref, w] = cmUseWidth();
  const data = rows.filter((r) => !r.ghost).slice().sort((a, b) => a.day - b.day);
  const pts = {};
  p.locs.forEach((l) => { pts[l] = data.map((r) => ({ day: r.day, date: r.date, v: (r.vals[p.id] || {})[l] })).filter((o) => o.v != null); });
  const shown = p.locs.filter((l) => !hidden.has(l) && pts[l].length);
  const total = shown.reduce((n, l) => n + pts[l].length, 0);
  const W = Math.max(600, w || 960), H = 240, L = 58, R = 20, T = 18, B = 32;
  const vals = shown.reduce((a, l) => a.concat(pts[l].map((o) => o.v)), []);
  if (p.band.min != null) vals.push(p.band.min);
  if (p.band.max != null) vals.push(p.band.max);
  let lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 1;
  if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * .12; lo -= pad; hi += pad;
  const days = data.map((r) => r.day);
  const d0 = days.length ? Math.min.apply(null, days) : 0, d1 = days.length ? Math.max.apply(null, days) : 1;
  const X = (d) => L + (d1 === d0 ? (W - L - R) / 2 : ((d - d0) / (d1 - d0)) * (W - L - R));
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, .25, .5, .75, 1].map((f) => lo + f * (hi - lo));
  const step = Math.max(1, Math.ceil(data.length / 7));
  const xlabs = data.filter((r, i) => i % step === 0 || i === data.length - 1);
  const bandTop = p.band.max != null ? Y(Math.min(hi, p.band.max)) : T;
  const bandBot = p.band.min != null ? Y(Math.max(lo, p.band.min)) : H - B;
  const color = (l) => TREND_PALETTE[p.locs.indexOf(l) % TREND_PALETTE.length];
  const segs = (l) => {          // break the line where a day wasn't sampled
    const out = []; let cur = [];
    const byDay = {}; pts[l].forEach((o) => { byDay[o.day] = o; });
    data.forEach((r) => { const o = byDay[r.day]; if (o) cur.push(o); else if (cur.length) { out.push(cur); cur = []; } });
    if (cur.length) out.push(cur);
    return out;
  };
  return (
    <div className="card cm-chartcard">
      <div className="cm-chart-head">
        <div className="cm-chart-id">
          <span className="eyebrow">Trial period trend</span>
          <div className="cm-chart-t">{p.label}{p.unit ? <span className="cm-unit"> {p.unit}</span> : null}<span className="cm-chart-basis">design basis {cmBandLabel(p)}</span></div>
        </div>
        <div className="cm-legend">
          {p.locs.map((l) => (
            <button key={l} className={"cm-lg" + (hidden.has(l) ? " off" : "")} aria-pressed={!hidden.has(l)} onClick={() => onToggle(l)}
              title={pts[l].length + " reading" + (pts[l].length === 1 ? "" : "s") + " in range"}>
              <span className="cm-lg-sw" style={{ background: color(l) }} />{cmLoc(l).label}
            </button>
          ))}
        </div>
      </div>
      <div className="cm-chart" ref={ref}>
        {total < 2
          ? <p className="cm-chart-empty">{data.length ? "No " + p.label + " readings on the visible rounds — pick a wider range or another parameter." : "No rounds in this range to plot."}</p>
          : (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${p.label} at each sample point over the visible commissioning period`}>
              {(p.band.min != null || p.band.max != null) && <rect className="cmc-band" x={L} y={bandTop} width={W - L - R} height={Math.max(0, bandBot - bandTop)} />}
              {ticks.map((t, i) => (
                <g key={i}>
                  <line className="cmc-grid" x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} />
                  <text className="cmc-lbl" x={L - 8} y={Y(t) + 3.5} textAnchor="end">{t.toFixed(p.dec)}</text>
                </g>
              ))}
              {p.band.max != null && p.band.max < hi && <line className="cmc-limit" x1={L} x2={W - R} y1={Y(p.band.max)} y2={Y(p.band.max)} />}
              {p.band.min != null && p.band.min > lo && <line className="cmc-limit" x1={L} x2={W - R} y1={Y(p.band.min)} y2={Y(p.band.min)} />}
              {xlabs.map((r) => <text key={r.date} className="cmc-lbl" x={X(r.day)} y={H - 10} textAnchor="middle">{cmFmt(r.date).slice(0, 5)}</text>)}
              {shown.map((l) => (
                <g key={l}>
                  {segs(l).map((seg, i) => (
                    seg.length > 1
                      ? <polyline key={i} className="cmc-line" stroke={color(l)} points={seg.map((o) => `${X(o.day)},${Y(o.v)}`).join(" ")} />
                      : <circle key={i} cx={X(seg[0].day)} cy={Y(seg[0].v)} r={2.6} fill={color(l)} />
                  ))}
                  {pts[l].map((o) => {
                    const oor = cmOut(p, o.v);
                    if (!oor) return <circle key={o.date} className="cmc-pt" cx={X(o.day)} cy={Y(o.v)} r={2.4} fill={color(l)}><title>{`${cmFmt(o.date)} · ${cmLoc(l).label} · ${o.v.toFixed(p.dec)} ${p.unit}`}</title></circle>;
                    return (
                      <g key={o.date} className="cmc-oorg" role="button" aria-label={`${p.label} ${cmLoc(l).label} ${o.v.toFixed(p.dec)} ${p.unit} on ${cmFmt(o.date)} is outside the design basis — open the round`} {...njActivate(() => onOpen(o.date))} onClick={() => onOpen(o.date)}>
                        <circle className="cmc-oor" cx={X(o.day)} cy={Y(o.v)} r={4.2} />
                        <title>{`${cmFmt(o.date)} · ${cmLoc(l).label} · ${o.v.toFixed(p.dec)} ${p.unit} — outside design basis`}</title>
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
          )}
      </div>
      <p className="cm-chart-foot">Shaded band is the design basis. A ringed point is outside it — open it to see the round.</p>
    </div>
  );
}

function CommissioningScreen({ tab, onTab }) {
  useCommissioning();
  const opts = cmDepts();
  const [deptId, setDeptId] = React.useState(() => (opts[0] ? opts[0].d.id : ""));
  const [pid, setPid] = React.useState("co2");
  const [range, setRange] = React.useState(30);
  const [edit, setEdit] = React.useState(null);              // {date, col}  col = locId | "note"
  const [flash, setFlash] = React.useState(() => new Set());
  const [tagSel, setTagSel] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(CM_TAGKEY) || "null"); if (Array.isArray(s)) return s; } catch (e) {}
    return CM_TAGS_DEFAULT;
  });
  const [showTags, setShowTags] = React.useState(false);
  const applyTags = (ids) => { setTagSel(ids); setShowTags(ids.length > 0); try { localStorage.setItem(CM_TAGKEY, JSON.stringify(ids)); } catch (e) {} };
  const autoCols = showTags ? CM_AUTO.filter((a) => tagSel.includes(a.id)) : [];
  const [calcCols, setCalcCols] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(CM_CALCKEY) || "null"); if (Array.isArray(s)) return s; } catch (e) {}
    return CM_CALC_DEFAULT;
  });
  const [showCalc, setShowCalc] = React.useState(false);
  const applyCalc = (list) => { setCalcCols(list); setShowCalc(list.length > 0); try { localStorage.setItem(CM_CALCKEY, JSON.stringify(list)); } catch (e) {} };
  const calcOn = showCalc ? calcCols : [];
  const [hiddenLocs, setHiddenLocs] = React.useState(() => new Set());
  const toggleLoc = (l) => setHiddenLocs((s) => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; });
  const length = cmStore.length();
  const [wrapRef, wrapW] = cmUseWidth();
  const scope = opts.find((o) => o.d.id === deptId) || opts[0];
  const deptLabel = scope ? `${scope.b.name} · ${scope.d.name}` : "—";
  const p = cmParam(pid);
  const all = scope ? cmStore.rows(scope.d.id) : [];
  const inRange = range === 0 ? all : all.filter((r) => r.day > CM_ELAPSED - range);
  // today is always a row, even before anything is logged — so the grid can be typed into directly
  const rows = inRange.some((r) => r.date === CM_TODAY_KEY)
    ? inRange
    : [{ date: CM_TODAY_KEY, day: CM_ELAPSED, time: "—", by: "", note: "", vals: {}, ghost: true }, ...inRange];

  const cols = [...p.locs, "note"];
  // fixed columns: date 150 · day 72 · sampled 88 · open 44. The rest is split so a
  // two-column parameter widens its value columns instead of leaving a vast comment column.
  const extraCols = autoCols.length + calcOn.length;
  const CM_FIXED = 354, CM_VMIN = 104, CM_VMAX = 220, CM_NOTEMIN = 260, CM_NOTEMAX = 560;
  const avail = Math.max(0, wrapW - CM_FIXED);
  const valW = wrapW ? Math.min(CM_VMAX, Math.max(CM_VMIN, Math.round((avail - CM_NOTEMAX) / Math.max(p.locs.length, 1)))) : CM_VMIN;
  const noteW = wrapW ? Math.min(CM_NOTEMAX, Math.max(CM_NOTEMIN, avail - valW * p.locs.length)) : CM_NOTEMIN;
  const fillW = extraCols ? 0 : Math.max(0, avail - valW * p.locs.length - noteW);   // leftover, so the comment keeps a readable measure
  const deptSeed = cmHash(deptId);
  const move = (dx, dy) => {
    if (!edit) return setEdit(null);
    if (dx === 0 && dy === 0) return setEdit(null);
    let ci = cols.indexOf(edit.col), ri = rows.findIndex((r) => r.date === edit.date);
    ci += dx; ri += dy;
    if (ci < 0) { ci = cols.length - 1; ri -= 1; }
    if (ci > cols.length - 1) { ci = 0; ri += 1; }
    if (ri < 0 || ri > rows.length - 1) return setEdit(null);
    setEdit({ date: rows[ri].date, col: cols[ci] });
  };
  const commit = (date, col, v) => {
    if (v === undefined) return;                             // unparseable — leave as it was
    const row = cmStore.row(deptId, date);
    const prev = col === "note" ? ((row && row.note) || "") : (row && row.vals[p.id] ? row.vals[p.id][col] : null);
    const next = col === "note" ? String(v).trim() : v;
    if ((prev == null ? null : prev) === (next === "" ? null : next)) return;   // nothing changed — no write, no highlight
    if (col === "note") cmStore.setField(deptId, date, "note", next);
    else cmStore.setValue(deptId, date, p.id, col, next);
    setFlash((s) => new Set(s).add(date));
    setTimeout(() => setFlash((s) => { const n = new Set(s); n.delete(date); return n; }), 3400);
  };

  const logged = all.length;
  const oorCount = all.reduce((n, r) => n + CM_PARAMS.reduce((m, q) => m + Object.values(r.vals[q.id] || {}).filter((v) => cmOut(q, v)).length, 0), 0);
  const last = all[0];
  const pct = Math.round((logged / CM_ELAPSED) * 100);

  return (
    <AppShell active="analytics" title="Analytics" crumbs={["Commissioning"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Daily manual water-quality rounds for a department in commissioning, checked against the design basis and shared with Pure Salmon Technology.</p>
          </div>
          <div className="pagehead-right">{window.AnalyticsTabs && <window.AnalyticsTabs active={tab} onChange={onTab} />}</div>
        </div>
      </div>

      <div className="card cm-status">
        <div className="cm-stat">
          <span className="eyebrow">Commissioning day</span>
          <div className="cm-stat-v data">{CM_ELAPSED}<span className="cm-stat-u">of {length}</span></div>
          <div className="cm-meter"><span style={{ width: Math.min(100, (CM_ELAPSED / length) * 100) + "%" }} /></div>
          <div className="cm-stat-sub">Started {cmFmt(cmKeyOf(cmDateOf(1)))} · ends {cmFmt(cmKeyOf(cmDateOf(length)))}
            <button className="cm-stat-act" onClick={() => openDialog(<CmPeriodDialog length={length} />)}>Extend</button>
          </div>
        </div>
        <div className="cm-stat">
          <span className="eyebrow">Rounds logged</span>
          <div className="cm-stat-v data">{logged}<span className="cm-stat-u">of {CM_ELAPSED} days</span></div>
          <div className="cm-meter"><span style={{ width: pct + "%" }} /></div>
          <div className="cm-stat-sub">{CM_ELAPSED - logged} day{CM_ELAPSED - logged === 1 ? "" : "s"} missed · {pct}% coverage</div>
        </div>
        <div className="cm-stat">
          <span className="eyebrow">Outside design basis</span>
          <div className={"cm-stat-v data" + (oorCount ? " cm-oor" : "")}>{oorCount}<span className="cm-stat-u">readings</span></div>
          <div className="cm-stat-sub">Across all parameters and sample points</div>
        </div>
        <div className="cm-stat">
          <span className="eyebrow">Last round</span>
          <div className="cm-stat-v cm-stat-v-sm data">{last ? cmFmt(last.date) : "—"}<span className="cm-stat-u">{last ? last.time : ""}</span></div>
          <div className="cm-stat-sub">{last ? "Logged by " + last.by : "No rounds logged yet"}</div>
        </div>
      </div>

      <CmChart p={p} rows={rows} hidden={hiddenLocs} onToggle={toggleLoc}
        onOpen={(d) => openDialog(<CmDayDialog deptId={deptId} deptLabel={deptLabel} date={d} />)} />

      <div className="card">
        <div className="rep-toolbar">
          <div className="rep-field">
            <span className="rep-lbl">Department</span>
            <select className="nj-select" value={deptId} onChange={(e) => { setDeptId(e.target.value); setEdit(null); }} aria-label="Department">
              {FACILITY.map((b) => { const ds = opts.filter((o) => o.b.id === b.id); if (!ds.length) return null; return <optgroup key={b.id} label={b.name}>{ds.map((o) => <option key={o.d.id} value={o.d.id}>{o.d.name} · {o.d.sub}</option>)}</optgroup>; })}
            </select>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Parameter</span>
            <select className="nj-select" value={pid} onChange={(e) => { setPid(e.target.value); setEdit(null); }} aria-label="Parameter">
              {CM_PARAMS.map((x) => <option key={x.id} value={x.id}>{x.label}{x.unit ? " (" + x.unit + ")" : ""}</option>)}
            </select>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Range</span>
            <select className="nj-select" value={range} onChange={(e) => { setRange(Number(e.target.value)); setEdit(null); }} aria-label="Range">
              <option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>Whole period</option>
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => openDialog(<CmAddRowDialog deptId={deptId} deptLabel={deptLabel} length={length} onAdded={(d) => { if (cmDayOf(d) <= CM_ELAPSED - range && range !== 0) setRange(0); setFlash((s) => new Set(s).add(d)); setEdit({ date: d, col: p.locs[0] }); }} />)}><Icon name="calendar-plus" size={16} /> Add row</button>
            <ExportMenu describe={(fmt) => "Download started: commissioning log · " + deptLabel + " will save as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
            <button className="btn btn-primary" onClick={() => openDialog(<CmLogDialog deptId={deptId} deptLabel={deptLabel} />)}><Icon name="plus" size={16} /> Log water quality</button>
          </div>
        </div>

        <div className="cm-gridhint">
          <Icon name="table-2" size={14} color="var(--slate-400)" />
          <span>Click any cell to edit it. <strong>Tab</strong> moves across, <strong>Enter</strong> down, <strong>Esc</strong> cancels. Use <strong>Log water quality</strong> for a full round, or open a day to see every parameter.</span>
          <span className="mb-groups">
            <button className={"mb-gchip" + (showTags ? " on" : "")} aria-pressed={showTags} disabled={!tagSel.length}
              onClick={() => { setShowTags((v) => !v); setEdit(null); }}>Plant tags{tagSel.length ? " · " + tagSel.length : ""}</button>
            <button className="mb-gchip" onClick={() => openDialog(<CmTagsDialog sel={tagSel} onApply={applyTags} />)}><Icon name="sliders-horizontal" size={12} /> Choose…</button>
            <span className="cm-chipdiv" />
            <button className={"mb-gchip" + (showCalc ? " on" : "")} aria-pressed={showCalc} disabled={!calcCols.length}
              onClick={() => { setShowCalc((v) => !v); setEdit(null); }}>Calculated{calcCols.length ? " · " + calcCols.length : ""}</button>
            <button className="mb-gchip" onClick={() => openDialog(<CmCalcDialog cols={calcCols} sample={all[0]} seed={deptSeed} onApply={applyCalc} />)}><Icon name="function-square" size={12} /> Define…</button>
          </span>
        </div>

        <div className="cm-tblwrap" ref={wrapRef}>
          <table className="tbl cm-tbl cm-log">
            <colgroup>
              <col style={{ width: 150 }} /><col style={{ width: 72 }} /><col style={{ width: 88 }} />
              {p.locs.map((lid) => <col key={lid} style={{ width: valW }} />)}
              <col style={{ width: noteW }} />{fillW > 0 && <col style={{ width: fillW }} />}
              {autoCols.map((a) => <col key={a.id} style={{ width: 132 }} />)}
              {calcOn.map((c) => <col key={c.id} style={{ width: 138 }} />)}
              <col style={{ width: 44 }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} className="cm-th-d">Date</th>
                <th rowSpan={2} className="cm-th-n">Day</th>
                <th rowSpan={2} className="cm-th-n">Sampled</th>
                <th colSpan={p.locs.length} className="cm-th-grp"><span className="nocaps">{p.label}{p.unit ? " · " + p.unit : ""}</span> <span className="cm-th-basis nocaps">design basis {cmBandLabel(p)}</span></th>
                <th rowSpan={2} className="cm-th-note">Comment and observations</th>
                {fillW > 0 && <th rowSpan={2} className="cm-th-fill" />}
                {autoCols.length > 0 && <th colSpan={autoCols.length} className="cm-th-grp">From plant tags <span className="cm-th-basis nocaps">read-only</span></th>}
                {calcOn.length > 0 && <th colSpan={calcOn.length} className="cm-th-grp">Calculated <span className="cm-th-basis nocaps">derived from this sheet</span></th>}
                <th rowSpan={2} className="cm-th-open" aria-label="Open round" />
              </tr>
              <tr>
                {p.locs.map((lid) => (
                  <th key={lid} className="cm-th-v" title={cmLoc(lid).full || cmLoc(lid).label}>
                    <span className="cm-th-vin">{cmLoc(lid).label}
                      <TrendBtn className="cm-trendbtn" id={`CM-${deptId}-${p.id}-${lid}`.toUpperCase()} name={`${p.label} · ${cmLoc(lid).label}`} unit={p.unit} value={p.base} group={"Commissioning · " + deptLabel} title={`Send ${p.label} ${cmLoc(lid).label} to trends`} />
                    </span>
                  </th>
                ))}
                {autoCols.map((a) => (
                  <th key={a.id} className="cm-th-v" title={a.grp + " · " + a.label + (a.unit ? " · " + a.unit : "") + " — " + a.tag}>
                    <span className="cm-th-vin"><span className="nocaps">{a.label}{a.unit ? " · " + a.unit : ""}</span>
                      <TrendBtn className="cm-trendbtn" id={a.tag} name={a.grp + " · " + a.label} unit={a.unit} value={a.base} group={"Commissioning · " + deptLabel} title={"Send " + a.label + " to trends"} />
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
                const pv = r.vals[p.id] || {};
                return (
                  <tr key={r.date} className={"cm-row" + (r.ghost ? " cm-ghost" : "") + (r.date === CM_TODAY_KEY ? " cm-today" : "") + (flash.has(r.date) ? " row-just-edited" : "")}>
                    <td className="cm-td-d data"><span className="cm-td-din">{cmFmt(r.date)}{r.date === CM_TODAY_KEY && <span className="cm-todaytag">Today</span>}</span></td>
                    <td className="cm-td-n data">{r.day}</td>
                    <td className="cm-td-n data">{r.time}</td>
                    {p.locs.map((lid) => {
                      const v = pv[lid];
                      return (
                        <td key={lid} className="cm-td-v cm-td-edit">
                          <CmCell value={v} dec={p.dec} oor={cmOut(p, v)} label={`${p.label} ${cmLoc(lid).label} on ${cmFmt(r.date)}`}
                            editing={!!edit && edit.date === r.date && edit.col === lid}
                            onStart={() => setEdit({ date: r.date, col: lid })}
                            onCommit={(val) => commit(r.date, lid, val)} onNav={move} />
                        </td>
                      );
                    })}
                    <td className="cm-td-note cm-td-edit">
                      <CmCell text value={r.note} label={`Comment on ${cmFmt(r.date)}`}
                        editing={!!edit && edit.date === r.date && edit.col === "note"}
                        onStart={() => setEdit({ date: r.date, col: "note" })}
                        onCommit={(val) => commit(r.date, "note", val)} onNav={move} />
                    </td>
                    {fillW > 0 && <td className="cm-td-fill" />}
                    {autoCols.map((a) => <td key={a.id} className="cm-td-auto data">{r.ghost ? <span className="cm-cellempty">—</span> : cmAutoVal(a, r.day, deptSeed).toFixed(a.dec)}</td>)}
                    {calcOn.map((c) => { const v = cmCalcVal(c, r, deptSeed); return <td key={c.id} className="cm-td-auto cm-td-calc data">{v == null ? <span className="cm-cellempty">—</span> : v.toFixed(c.dec)}</td>; })}
                    <td className="cm-td-open">
                      <button className="cm-openbtn" title="Edit round" aria-label={`Edit the round for ${cmFmt(r.date)}`}
                        onClick={() => openDialog(<CmLogDialog deptId={deptId} deptLabel={deptLabel} entry={cmStore.row(deptId, r.date) || r} />)}>
                        <Icon name="pencil" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={p.locs.length + 5 + extraCols} className="cm-cellempty">No rounds logged in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { CommissioningScreen, cmStore, CmCell, cmFmt, cmKeyOf, cmDateOf, cmDayOf, cmHash, cmRng, CM_TODAY, CM_USER, CM_TODAY_KEY });
