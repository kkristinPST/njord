// ras-dock.jsx — RAS side dock: a left icon rail switching 3 modes:
//   ▸ Parameters (monitor)   — general process parameters, 4 tabs (editable via njEditParam)
//   ▸ Alarm limits (clock)    — per-sensor measured value + High/Low(/Low-Low) editable limits, 3 tabs
//   ▸ Trends (line-chart)     — quick-look multi-series charts with checkbox legends, 3 tabs
// Mounted by RASScreen (ras.jsx) in the right column of .ras-layout.

/* ───────────── Parameters mode ───────────── */
const RAS_PARAM_TABS = ["Filter", "MBBR & CO₂", "Pump Sump", "Lye Dosing"];
const RAS_PARAM_TAGS = { "Filter": "DPT1-FIL0", "MBBR & CO₂": "DPT1-AEB0", "Pump Sump": "DPT1-SMP0", "Lye Dosing": "DPT1-DNA0" };
const RAS_PARAMS = {
  "Filter": [
    { h: "Filter · FIL", icon: "monitor" },
    { l: "Level before filter", v: 59, unit: "cm" },
    { h: "FIL1 · Fine-mesh filter" },
    { l: "Start backwash level", v: 60, unit: "cm", edit: true, min: 40, max: 80, step: 1, tag: "DPT1-FIL1" },
    { l: "Max pause between filter backwash", v: 3, unit: "min", edit: true, min: 1, max: 30, step: 1, tag: "DPT1-FIL1" },
    { l: "Time since last filter backwash", v: -39, unit: "sec" },
    { l: "Fine filter backwash time · last period", v: 20.1, unit: "%", trend: true, tag: "DPT1-FIL1" },
    { l: "Fine filter backwash alarm limit · last period", v: 0, unit: "%", edit: true, min: 0, max: 100, step: 1, tag: "DPT1-FIL1" },
    { h: "FIL2 · Coarse-mesh filter" },
    { l: "Start backwash level", v: 62, unit: "cm", edit: true, min: 40, max: 80, step: 1, tag: "DPT1-FIL2" },
    { l: "Max pause between filter backwash", v: 4, unit: "min", edit: true, min: 1, max: 30, step: 1, tag: "DPT1-FIL2" },
    { l: "Time since last filter backwash", v: 222, unit: "sec" },
    { l: "Coarse filter backwash time · last period", v: 15.9, unit: "%", trend: true, tag: "DPT1-FIL2" },
    { l: "Coarse filter backwash alarm limit · last period", v: 0, unit: "%", edit: true, min: 0, max: 100, step: 1, tag: "DPT1-FIL2" },
    { h: "General" },
    { l: "Backwash duration / filter", v: 45, unit: "sec", edit: true, min: 10, max: 120, step: 5 },
    { l: "Filter activity", v: 45, unit: "Hz", edit: true, min: 20, max: 60, step: 1 },
    { l: "Filter operating mode", v: "Backwashing", edit: true, options: ["Backwashing", "Continuous", "Off"] },
  ],
  "MBBR & CO₂": [
    { h: "MBBR · AEB0", icon: "monitor" },
    { l: "Blower activity", v: 42, unit: "Hz", edit: true, min: 20, max: 60, step: 1, tag: "DPT1-AEB0" },
    { h: "CO₂-stripper · STR0", icon: "monitor" },
    { l: "CO₂-fan activity", v: 49, unit: "Hz", edit: true, min: 20, max: 60, step: 1, tag: "DPT1-STR0" },
  ],
  "Lye Dosing": [
    { h: "Lye Dosing · DNA0", icon: "monitor" },
    { l: "Average pH", v: 7.42, unit: "pH", trend: true },
    { l: "Run extra dose when pH below", v: 7.3, unit: "pH", edit: true, min: 6.5, max: 7.5, step: 0.1, tag: "DPT1-DNA0" },
    { l: "Run base dose when pH below", v: 7.4, unit: "pH", edit: true, min: 6.5, max: 7.5, step: 0.1, tag: "DPT1-DNA0" },
    { l: "Dosing rate adjustment", mode: "Auto" },
    { l: "Base dose", v: 0.58, unit: "l/h", edit: true, min: 0, max: 5, step: 0.02, tag: "DPT1-DNA0" },
    { l: "Dosing pump runtime", v: 0, unit: "%" },
    { l: "Low runtime · decrease dosing", v: 0, unit: "%", edit: true, min: 0, max: 100, step: 1, tag: "DPT1-DNA0" },
    { l: "High runtime · increase dosing", v: 0, unit: "%", edit: true, min: 0, max: 100, step: 1, tag: "DPT1-DNA0" },
    { l: "Adjustment step · dosing amount", v: 0.02, unit: "l/h", edit: true, min: 0, max: 1, step: 0.01, tag: "DPT1-DNA0" },
  ],
};

// Pump Sump is a 2-column editable grid (Level sump · Pressure SP)
const PUMPSUMP = {
  title: "Pump Sump · SMP0",
  cols: [{ l: "Level sump", u: "cm", step: 1, min: 0, max: 500 }, { l: "Pressure SP", u: "mVs", step: 0.05, min: 0, max: 4 }],
  rows: [
    { l: "Value", a: 298, b: 2.40 },
    { l: "Threshold 6", a: 399, b: 2.70 },
    { l: "Threshold 5", a: 390, b: 2.70 },
    { l: "Threshold 4", a: 300, b: 2.40 },
    { l: "Threshold 3", a: 250, b: 2.30 },
    { l: "Threshold 2", a: 180, b: 1.60 },
    { l: "Threshold 1", a: 120, b: 1.40 },
  ],
};
function PumpSumpTable() {
  const [ov, setOv] = React.useState({});
  const dec = (x, s) => (s < 1 ? x.toFixed(2) : String(x));
  const cell = (ri, ci) => {
    const r = PUMPSUMP.rows[ri], c = PUMPSUMP.cols[ci];
    const key = ri + "-" + ci;
    const base = ci === 0 ? r.a : r.b;
    const val = ov[key] != null ? ov[key] : base;
    return (
      <button className="pv box pv-edit pst-cell" key={ci} title="Edit value"
        onClick={() => njEditParam({ tag: "DPT1-SMP0", label: r.l + " · " + c.l, value: val, unit: c.u, min: c.min, max: c.max, step: c.step, group: PUMPSUMP.title,
          onApply: (nv) => setOv((p) => Object.assign({}, p, { [key]: nv })) })}>
        {dec(val, c.step)}<span className="pst-u"> {c.u}</span><Icon name="pencil" size={11} />
      </button>
    );
  };
  return (
    <div className="pst-wrap">
      <div className="param-group-h"><Icon name="monitor" size={13} /> {PUMPSUMP.title}</div>
      <table className="pst">
        <thead><tr><th></th>{PUMPSUMP.cols.map((c) => <th key={c.l}>{c.l}</th>)}</tr></thead>
        <tbody>
          {PUMPSUMP.rows.map((r, ri) => (
            <tr key={ri}><td className="pst-rl">{r.l}</td>{PUMPSUMP.cols.map((_, ci) => <td key={ci}>{cell(ri, ci)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Alarm limits mode ───────────── */
const RAS_LIMIT_TABS = ["Filter", "MBBR", "Pump Sump"];
const RAS_LIMITS = {
  "Filter": { title: "Drum filter limits", blocks: [
    { name: "Level before filter", tag: "DPT1-FIL0-LT1", meas: "55", u: "cm", hi: 78, lo: 15 },
  ] },
  "MBBR": { title: "MBBR limits", blocks: [
    { name: "Level in bioreactor", tag: "DPT1-AEB0-LT1", meas: "253", u: "cm", hi: 295, lo: 210 },
    { name: "Blower cabinet temperature 1", tag: "DPT1-AEB0-BM1-TT1", meas: "16.3", u: "°C", hi: 40, lo: 0 },
    { name: "Blower cabinet temperature 2", tag: "DPT1-AEB0-BM2-TT1", meas: "21.0", u: "°C", hi: 40, lo: 0 },
  ] },
  "Pump Sump": { title: "Pump sump limits", blocks: [
    { name: "CO₂ in pump sump", tag: "DPT1-SMP0-QT1", meas: "3", u: "mg/l", hi: 12, lo: 0 },
    { name: "O₂ in pump sump", tag: "DPT1-SMP0-QT2", meas: "87.9", u: "%", hi: 130, lo: 80 },
    { name: "pH 1 in pump sump", tag: "DPT1-SMP0-QT3", meas: "7.5", u: "pH", hi: 7.8, lo: 7.0, step: 0.1 },
    { name: "pH 2 in pump sump", tag: "DPT1-SMP0-QT4", meas: "7.3", u: "pH", hi: 7.8, lo: 6.8, step: 0.1 },
    { name: "Level in pump sump", tag: "DPT1-SMP0-LT1", meas: "297", u: "cm", hi: 315, lo: 285, lolo: 120 },
    { name: "Temperature pump sump", tag: "DPT1-SMP0-TT1", meas: "11.6", u: "°C", hi: 13.0, lo: 9.0, step: 0.1 },
    { name: "Pressure to fish tank", tag: "DPT1-SMP-PT1", meas: "2.4", u: "mVs", hi: 0.0, lo: 1.0, step: 0.1 },
  ] },
};
function LimitRow({ label, kind, value, unit, step, tag, name, onApply }) {
  const dec = step && step < 1 ? 1 : 0;
  return (
    <div className="lim-edit-row">
      <span className="lim-edit-l">{label}</span>
      <button className="pv box pv-edit" title="Edit limit"
        onClick={() => njEditParam({ tag, label: name + " · " + label, value, unit, step: step || 1, min: -50, max: 1000, group: kind,
          onApply })}>
        {value.toFixed(dec)}<span className="pst-u"> {unit}</span><Icon name="pencil" size={11} />
      </button>
    </div>
  );
}
function LimitBlock({ b }) {
  const [hi, setHi] = React.useState(b.hi);
  const [lo, setLo] = React.useState(b.lo);
  const [lolo, setLolo] = React.useState(b.lolo);
  return (
    <div className="lim-block">
      <div className="lim-block-h">
        <span className="lim-block-name">{b.name}</span>
        <span className="tag">{b.tag}</span>
      </div>
      <div className="lim-meas-row"><span className="lim-edit-l">Measured value</span><span className="pv">{b.meas} {b.u}</span></div>
      <LimitRow label="High alarm" name={b.name} kind="alarm limit" value={hi} unit={b.u} step={b.step} tag={b.tag} onApply={setHi} />
      <LimitRow label="Low alarm" name={b.name} kind="alarm limit" value={lo} unit={b.u} step={b.step} tag={b.tag} onApply={setLo} />
      {b.lolo != null && <LimitRow label="Low-Low alarm" name={b.name} kind="alarm limit" value={lolo} unit={b.u} step={b.step} tag={b.tag} onApply={setLolo} />}
    </div>
  );
}

/* ───────────── Trends mode ───────────── */
const TR = (i) => ["#2A4DD0", "#00AEEE", "#00C483", "#FBA100", "#F26A1B", "#C026D3", "#0EA5A0", "#7C3AED"][i % 8];
const RAS_TREND_TABS = ["RAS", "Tank", "Lye"];
const RAS_TRENDS = {
  "RAS": [
    { title: "Level Pump Sump & MBBR", min: 0, max: 500, series: [
      { name: "Level pump sump", unit: "cm", base: 191, amp: 16, seed: 5.1 },
      { name: "Level MBBR", unit: "cm", base: 253, amp: 6, seed: 2.3 },
    ] },
    { title: "Level Filter", min: 0, max: 100, series: [{ name: "Level filter", unit: "cm", base: 25, amp: 10, seed: 1.4 }] },
  ],
  "Tank": [
    { title: "Oxygen", min: 70, max: 120, series: Array.from({ length: 6 }, (_, i) => ({ name: "Oxygen tank " + (i + 1), unit: "%", base: i % 2 ? 102 : 90, amp: i % 2 ? 1.4 : 4, seed: 1 + i * 0.7 })) },
    { title: "Level", min: 100, max: 300, series: Array.from({ length: 6 }, (_, i) => ({ name: "Level tank " + (i + 1), unit: "cm", base: 202 + (i % 2) * 6, amp: 4, seed: 2 + i * 0.5 })) },
  ],
  "Lye": [
    { title: "Dosing", min: 0, max: 10, series: [
      { name: "Lye pump 1", unit: "l/h", base: 0.4, amp: 0.5, seed: 3.1 },
      { name: "Lye pump 2", unit: "l/h", base: 0.2, amp: 0.4, seed: 4.6 },
    ] },
    { title: "pH", min: 5, max: 9, series: [
      { name: "pH-sensor 1", unit: "pH", base: 7.4, amp: 0.18, seed: 1.9 },
      { name: "pH-sensor 2", unit: "pH", base: 7.35, amp: 0.2, seed: 2.7 },
      { name: "Lye pump", unit: "pH", base: 7.42, amp: 0.16, seed: 3.4 },
    ] },
  ],
};
function DockTrendChart({ chart }) {
  const [vis, setVis] = React.useState(() => chart.series.map(() => true));
  const W = 560, H = 210, padL = 40, padR = 14, padT = 12, padB = 12;
  const min = chart.min, max = chart.max, n = 60;
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const ticks = [max, min + (max - min) * 0.75, min + (max - min) * 0.5, min + (max - min) * 0.25, min];
  const vlines = [0.25, 0.5, 0.75];
  return (
    <div className="dtc">
      <div className="dtc-title">{chart.title}</div>
      <svg className="dtc-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.title}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--slate-200)" strokeWidth="1" strokeDasharray={i === ticks.length - 1 || i === 0 ? "0" : "4 4"} />
            <text className="tc-ylbl" x={padL - 7} y={y(t) + 3} textAnchor="end">{Number.isInteger(t) ? t : t.toFixed(0)}</text>
          </g>
        ))}
        {vlines.map((p, i) => <line key={"v" + i} x1={padL + p * (W - padL - padR)} y1={padT} x2={padL + p * (W - padL - padR)} y2={H - padB} stroke="var(--slate-200)" strokeWidth="1" strokeDasharray="4 4" />)}
        {chart.series.map((s, si) => {
          if (!vis[si]) return null;
          const data = genTrend(s.seed, s.base, s.amp, n);
          const d = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          return <path key={si} d={d} fill="none" stroke={TR(si)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
        })}
      </svg>
      <div className="dtc-legend">
        {chart.series.map((s, si) => (
          <button key={si} className={"dtc-leg" + (vis[si] ? "" : " off")} onClick={() => setVis((p) => p.map((x, i) => (i === si ? !x : x)))}>
            <span className="dtc-chk" style={{ background: vis[si] ? TR(si) : "transparent", borderColor: TR(si) }}>{vis[si] && <Icon name="check" size={11} color="#fff" />}</span>
            {s.name} <span className="dtc-u">({s.unit})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function DockTrends({ tab }) {
  const [day, setDay] = React.useState(0);
  const charts = RAS_TRENDS[tab];
  const d = new Date(2026, 1, 24 + day, 0, 0);
  const label = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  return (
    <div className="dock-trends">
      <div className="dtc-date">
        <button className="dtc-nav" onClick={() => setDay((x) => x - 1)} aria-label="Previous day"><Icon name="chevron-left" size={16} /></button>
        <span className="dtc-date-lbl data">{label}</span>
        <button className="dtc-nav" onClick={() => setDay((x) => x + 1)} aria-label="Next day"><Icon name="chevron-right" size={16} /></button>
      </div>
      {charts.map((c, i) => <DockTrendChart key={tab + i} chart={c} />)}
    </div>
  );
}

/* ───────────── Dock shell ───────────── */
const DOCK_MODES = [
  { id: "params", icon: "monitor",     title: "Parameters",  tabs: RAS_PARAM_TABS },
  { id: "limits", icon: "alarm-clock", title: "Alarm limits", tabs: RAS_LIMIT_TABS },
  { id: "trends", icon: "line-chart",  title: "Trends",       tabs: RAS_TREND_TABS },
];
function RasDock() {
  const [mode, setMode] = React.useState("params");
  const [tabByMode, setTabByMode] = React.useState({ params: "Filter", limits: "Filter", trends: "RAS" });
  const m = DOCK_MODES.find((x) => x.id === mode);
  const tab = tabByMode[mode];
  const setTab = (t) => setTabByMode((p) => Object.assign({}, p, { [mode]: t }));
  return (
    <div className="card dock">
      <div className="dock-rail">
        {DOCK_MODES.map((x) => (
          <button key={x.id} className={"dock-rail-btn" + (x.id === mode ? " active" : "")} title={x.title} onClick={() => setMode(x.id)}>
            <Icon name={x.icon} size={18} />
          </button>
        ))}
      </div>
      <div className="dock-main">
        <div className="card-head dock-head">
          <div className="card-head-l"><Icon name={m.icon} size={17} color="var(--slate-600)" /><span className="card-title">{m.title}</span></div>
        </div>
        <div className="dock-tabs">
          <div className="segmented param-seg">
            {m.tabs.map((t) => <button key={t} className={"seg" + (t === tab ? " active" : "")} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>
        <div className="dock-body">
          {mode === "params" && (tab === "Pump Sump" ? <PumpSumpTable /> : <ParamList rows={RAS_PARAMS[tab]} tag={RAS_PARAM_TAGS[tab]} key={tab} />)}
          {mode === "limits" && (
            <div className="lim-list">
              <div className="param-group-h"><Icon name="alarm-clock" size={13} /> {RAS_LIMITS[tab].title}</div>
              {RAS_LIMITS[tab].blocks.map((b, i) => <LimitBlock key={tab + i} b={b} />)}
            </div>
          )}
          {mode === "trends" && <DockTrends tab={tab} key={tab} />}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RasDock });
