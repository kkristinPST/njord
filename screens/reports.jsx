// reports.jsx — Reporting: key-figures report tables (Reports sidebar item)

// ---- deterministic daily series over a date window ----
function repDates(n) {
  const out = [];
  const start = new Date(2026, 1, 6); // 06 Feb 2026
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    out.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
  }
  return out;
}
const N = 20;
const DATES = repDates(N);

// growth model: biomass + avg weight rise, population gently declines
const SERIES = DATES.map((t, i) => {
  const biomass = Math.round(44 + i * i * 0.42 + i * 5.6);
  const avgW = +(0.27 + i * 0.052).toFixed(2);
  const pop = 150734 - i * 58 - (i % 3) * 12;
  const density = +(0.8 + i * 0.13).toFixed(1);
  const dead = 30 + (i % 5) * 22 + (i % 2) * 14;
  const feeding = +(2.2 + i * 0.12).toFixed(1);
  const temp = +(12.1 + (i % 4) * 0.15).toFixed(1);
  const ph = +(7.2 + (i % 3) * 0.05).toFixed(2);
  const co2 = +(9.4 + (i % 5) * 0.6).toFixed(1);
  const makeup = 52 + (i % 4);
  const vol = 52 + (i % 3);
  return { t, biomass, avgW, pop, density, dead, feeding, temp, ph, co2, makeup, vol };
});

// ---- report definitions: columns + accessor + numeric format ----
const fmt = {
  int: (v) => v.toLocaleString(),
  f1: (v) => v.toFixed(1),
  f2: (v) => v.toFixed(2),
};
const REPORTS = {
  "Fish Calculation": {
    sub: "Daily biomass, density & population calculation",
    cols: [
      { h: "Biomass (kg)", k: "biomass", f: fmt.int },
      { h: "Density (kg/m³)", k: "density", f: fmt.f1 },
      { h: "Avg. weight (g)", k: "avgW", f: fmt.f2 },
      { h: "Population", k: "pop", f: fmt.int },
      { h: "Dead Fish", k: "dead", f: fmt.int },
      { h: "Volume (m³)", k: "vol", f: fmt.int },
    ],
  },
  "Feed Report": {
    sub: "Daily feed delivered per tank",
    cols: [
      { h: "Biomass (kg)", k: "biomass", f: fmt.int },
      { h: "Avg. weight (g)", k: "avgW", f: fmt.f2 },
      { h: "Population", k: "pop", f: fmt.int },
      { h: "Feeding (kg)", k: "feeding", f: fmt.f1 },
    ],
  },
  "Fish Summary": {
    sub: "Combined biology summary across the department",
    cols: [
      { h: "Biomass (kg)", k: "biomass", f: fmt.int },
      { h: "Density (kg/m³)", k: "density", f: fmt.f1 },
      { h: "Avg. weight (g)", k: "avgW", f: fmt.f2 },
      { h: "Population", k: "pop", f: fmt.int },
      { h: "Dead Fish", k: "dead", f: fmt.int },
    ],
  },
  "Key Numbers": {
    sub: "Daily water chemistry & operational key figures",
    cols: [
      { h: "Temperature (°C)", k: "temp", f: fmt.f1 },
      { h: "pH", k: "ph", f: fmt.f2 },
      { h: "CO₂ (mg/l)", k: "co2", f: fmt.f1 },
      { h: "Make-up Water (m³)", k: "makeup", f: fmt.int },
      { h: "Daily feeding (kg)", k: "feeding", f: fmt.f1 },
      { h: "Population", k: "pop", f: fmt.int },
      { h: "Biomass (kg)", k: "biomass", f: fmt.int },
    ],
  },
};

function calcStats(cols, rows) {
  const src = rows || SERIES;
  const stat = (fn) => cols.map((c) => {
    const vals = src.map((r) => r[c.k]);
    return c.f(fn(vals));
  });
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  return {
    Sum: stat((a) => sum(a)),
    Average: stat((a) => sum(a) / a.length),
    Minimum: stat((a) => Math.min(...a)),
    Maximum: stat((a) => Math.max(...a)),
  };
}

// ---- report scope: building / department / tank ----
// Reports is a facility-wide register (the top bar carries no scope dropdowns), so the scope
// of a report is a FILTER on the table, exactly like the legacy Reports > DPT > report > Tank
// tree — flattened into two selects instead of four nav levels.
function repDepts() {
  const out = [];
  FACILITY.forEach((b) => b.depts.forEach((d) => {
    if (d.systems.some((s) => s.label === "Fish Tank")) out.push({ b, d });
  }));
  return out;
}
function repTankCount(dept) { return { "Grow-out": 6, "Start-Feeding": 6 }[dept && dept.sub] || 4; }
function repSeed(bId, dId, tank) {
  const s = bId + "|" + dId + "|" + tank;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
}
// Same growth model, scaled per scope so a tank's report is its own — switching the filter
// visibly changes the figures instead of re-labelling one dataset.
function repSeriesFor(bId, dId, tank) {
  if (bId == null) return SERIES;
  const h = repSeed(bId, dId, tank);
  const k = 0.86 + (h % 41) / 41 * 0.42;          // biomass / weight scale
  const pop0 = 128000 + (h % 73) * 640;
  const t0 = 11.6 + (h % 17) * 0.09;
  return DATES.map((t, i) => {
    const biomass = Math.round((44 + i * i * 0.42 + i * 5.6) * k);
    const avgW = +((0.27 + i * 0.052) * k).toFixed(2);
    const pop = pop0 - i * 58 - (i % 3) * 12;
    const density = +((0.8 + i * 0.13) * k).toFixed(1);
    const dead = Math.round((30 + (i % 5) * 22 + (i % 2) * 14) * k);
    const feeding = +((2.2 + i * 0.12) * k).toFixed(1);
    const temp = +(t0 + (i % 4) * 0.15).toFixed(1);
    const ph = +(7.15 + (h % 7) * 0.01 + (i % 3) * 0.05).toFixed(2);
    const co2 = +(8.9 + (h % 11) * 0.09 + (i % 5) * 0.6).toFixed(1);
    const makeup = Math.round((52 + (i % 4)) * k);
    const vol = 52 + (i % 3);
    return { t, biomass, avgW, pop, density, dead, feeding, temp, ph, co2, makeup, vol };
  });
}
function repScopeLabel(sc) {
  if (!sc) return "Building 1 · DPT1 · Tank 1";
  const b = FACILITY.find((x) => x.id === sc.b);
  const d = b && b.depts.find((x) => x.id === sc.d);
  if (!b || !d) return "";
  return b.name + " · " + d.name + (sc.tank ? " · Tank " + sc.tank : " · all tanks");
}

function ReportTable({ report, showCalc, rows }) {
  const def = REPORTS[report];
  const src = rows || SERIES;
  const stats = calcStats(def.cols, src);
  return (
    <table className="tbl rep-tbl">
      <thead>
        <tr>
          <th>Date</th>
          {def.cols.map((c) => <th key={c.k} className="num" style={{ textAlign: "right" }}>{c.h}</th>)}
        </tr>
      </thead>
      <tbody>
        {src.map((r) => (
          <tr key={r.t}>
            <td className="lbl td-strong">{r.t}</td>
            {def.cols.map((c) => <td key={c.k} className="num" style={{ textAlign: "right" }}>{c.f(r[c.k])}</td>)}
          </tr>
        ))}
        {showCalc && (
          <React.Fragment>
            <tr className="calc-head"><td>Calculations</td>{def.cols.map((c) => <td key={c.k} className="num" style={{ textAlign: "right" }}>{c.h}</td>)}</tr>
            {["Sum", "Average", "Minimum", "Maximum"].map((label) => (
              <tr className="calc" key={label}>
                <td className="lbl">{label}</td>
                {stats[label].map((v, i) => <td key={i} className="num" style={{ textAlign: "right" }}>{v}</td>)}
              </tr>
            ))}
          </React.Fragment>
        )}
      </tbody>
    </table>
  );
}

// ---- floating report viewer window (like the Trends window: movable, resizable, ----
// ---- stays open while you navigate other pages; opened by "Open in report viewer") ----
const RWIN_LS = "nj_reportwin_v1";
function rwinLoad() { try { const r = JSON.parse(localStorage.getItem(RWIN_LS)); if (r && typeof r === "object") return r; } catch (e) {} return {}; }
const reportWin = {
  open: false, min: false, report: "Fish Calculation", scope: null, pos: null, size: { w: 860, h: 620 }, subs: new Set(),
  init() { const s = rwinLoad(); if (s.pos) this.pos = s.pos; if (s.size) this.size = s.size; },
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); },
  persist() { try { localStorage.setItem(RWIN_LS, JSON.stringify({ pos: this.pos, size: this.size })); } catch (e) {} },
  show(report, scope) { if (report) this.report = report; if (scope) this.scope = scope; this.open = true; this.min = false; this.emit(); },
  close() { this.open = false; this.emit(); },
  toggleMin() { this.min = !this.min; this.emit(); },
};
reportWin.init();
function useReportWin() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => reportWin.sub(f), []); return reportWin; }
function openReportViewer(report, scope) { reportWin.show(report, scope); }

function rwinClampPos(p, size) {
  const W = window.innerWidth || 1280, H = window.innerHeight || 800;
  return { x: Math.min(Math.max(p.x, 8), W - 220), y: Math.min(Math.max(p.y, 8), H - 56) };
}
function rwinDefaultPos(size) {
  const W = window.innerWidth || 1280;
  return { x: Math.max(20, Math.round((W - size.w) / 2)), y: 82 };
}

function ReportSheet({ report, scope }) {
  const def = REPORTS[report];
  const rows = scope ? repSeriesFor(scope.b, scope.d, scope.tank) : SERIES;
  const bld = scope && FACILITY.find((x) => x.id === scope.b);
  const dpt = bld && bld.depts.find((x) => x.id === scope.d);
  return (
    <div className="rv-sheet" id="rv-print-sheet">
      <div className="rv-sheet-head">
        <div>
          <div className="rv-eyebrow">KEY-FIGURES REPORT</div>
          <div className="rv-title">{report}</div>
          <div className="rv-sub">{def.sub}</div>
        </div>
        <div className="rv-brand">
          <div className="rv-brand-name">NJORD</div>
          <div className="rv-brand-sub">Osland · Pure Salmon Technology</div>
        </div>
      </div>
      <div className="rv-meta">
        <div className="rv-meta-i"><span className="rv-meta-l">Facility</span><span className="rv-meta-v">Osland · {bld ? bld.name : "Building 1"}</span></div>
        <div className="rv-meta-i"><span className="rv-meta-l">Scope</span><span className="rv-meta-v">{dpt ? dpt.name + (scope.tank ? " · Tank " + scope.tank : " · all tanks") : "DPT1 · Tank 1"}</span></div>
        <div className="rv-meta-i"><span className="rv-meta-l">Period</span><span className="rv-meta-v data">06 Feb – 06 Mar 2026</span></div>
        <div className="rv-meta-i"><span className="rv-meta-l">Generated</span><span className="rv-meta-v data">06 Mar 2026 · 14:22</span></div>
        <div className="rv-meta-i"><span className="rv-meta-l">Prepared by</span><span className="rv-meta-v">E. Sørensen</span></div>
      </div>
      <div className="rv-tbl-wrap">
        <ReportTable report={report} showCalc={true} rows={rows} />
      </div>
      <div className="rv-foot-note">{N} days · Generated by NJORD Reporting · per facility key-figures template.</div>
    </div>
  );
}

function ReportWindow() {
  const win = useReportWin();
  const [pos, setPos] = React.useState(() => win.pos || rwinDefaultPos(win.size));
  const [size, setSize] = React.useState(() => win.size);
  const drag = React.useRef({});
  React.useEffect(() => { if (win.open) setPos((p) => rwinClampPos(win.pos || p, size)); }, [win.open]);
  // keep the window fully inside the viewport when it (or the browser) is resized
  const rwinSizeRef = React.useRef(size); rwinSizeRef.current = size;
  React.useEffect(() => {
    if (!win.open) return;
    const fit = () => {
      const W = window.innerWidth || 1280, H = window.innerHeight || 800;
      const s0 = rwinSizeRef.current;
      const w2 = Math.max(320, Math.min(s0.w, W - 16));
      const h2 = Math.max(300, Math.min(s0.h, H - 16));
      if (w2 !== s0.w || h2 !== s0.h) { rwinSizeRef.current = { w: w2, h: h2 }; setSize({ w: w2, h: h2 }); }
      setPos((p) => ({
        x: Math.min(Math.max(p.x, 8), Math.max(8, W - w2 - 8)),
        y: Math.min(Math.max(p.y, 8), Math.max(8, H - h2 - 8)),
      }));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [win.open]);
  if (!win.open) return null;
  const report = win.report;
  const doPrint = () => { document.body.classList.add("rv-printing"); window.print(); setTimeout(() => document.body.classList.remove("rv-printing"), 600); };

  const startDrag = (e) => {
    if (e.target.closest("button, .exp-menu, .rwin-resize")) return;
    e.preventDefault();
    drag.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y, last: pos };
    const mv = (ev) => { const c = rwinClampPos({ x: drag.current.px + (ev.clientX - drag.current.mx), y: drag.current.py + (ev.clientY - drag.current.my) }, size); drag.current.last = c; setPos(c); };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); reportWin.pos = drag.current.last; reportWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };
  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation();
    drag.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h, last: size };
    const mv = (ev) => {
      const w = Math.min(Math.max(drag.current.w + (ev.clientX - drag.current.mx), 480), (window.innerWidth || 1280) - pos.x - 12);
      const h = Math.min(Math.max(drag.current.h + (ev.clientY - drag.current.my), 340), (window.innerHeight || 800) - pos.y - 12);
      drag.current.last = { w, h }; setSize({ w, h });
    };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); reportWin.size = drag.current.last; reportWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };

  return (
    <div className={"rwin" + (win.min ? " min" : "")} style={{ left: pos.x, top: pos.y, width: size.w, height: win.min ? "auto" : size.h }} role="dialog" aria-label="Report viewer">
      <header className="rwin-bar" onPointerDown={startDrag}>
        <span className="rwin-title"><Icon name="file-text" size={16} /> {report} Report</span>
        <div className="rwin-bar-r">
          {!win.min && <button className="twin-ic" title="Print / Save PDF" onClick={doPrint}><Icon name="printer" size={15} /></button>}
          <button className="twin-ic" title={win.min ? "Expand" : "Minimize"} onClick={() => win.toggleMin()}><Icon name={win.min ? "chevron-up" : "minus"} size={16} /></button>
          <button className="twin-ic" title="Close" onClick={() => win.close()}><Icon name="x" size={16} /></button>
        </div>
      </header>
      {!win.min && (
        <div className="rwin-body">
          <div className="rwin-toolbar">
            <span className="rwin-scope"><Icon name="calendar" size={13} color="var(--slate-400)" /> 06 Feb – 06 Mar 2026 · {repScopeLabel(win.scope)}</span>
            <div className="rwin-toolbar-r">
              <button className="btn btn-secondary btn-sm" onClick={doPrint}><Icon name="printer" size={14} /> Print / Save PDF</button>
              <ExportMenu label="Download" describe={(f) => "Download started: " + report + " report will save as " + (f === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
            </div>
          </div>
          <div className="rwin-scroll">
            <ReportSheet report={report} scope={win.scope} />
          </div>
          <div className="rwin-resize" onPointerDown={startResize} title="Resize"><Icon name="move-diagonal-2" size={13} /></div>
        </div>
      )}
    </div>
  );
}
Object.assign(window, { ReportWindow, openReportViewer, reportWin });

function ReportsScreen() {
  const types = Object.keys(REPORTS);
  const [report, setReport] = React.useState("Fish Calculation");
  const [showCalc, setShowCalc] = React.useState(true);
  const ctx = useCtx();
  const opts = repDepts();
  const first = opts.find((o) => o.d.id === ctx.dept.id) || opts[0];
  const [scope, setScope] = React.useState({ b: first.b.id, d: first.d.id, tank: 1 });
  const bld = FACILITY.find((x) => x.id === scope.b) || FACILITY[0];
  const dpt = bld.depts.find((x) => x.id === scope.d) || bld.depts[0];
  const tanks = repTankCount(dpt);
  // Fish Summary combines the whole department, so a single tank is not a valid scope for it.
  const deptWide = report === "Fish Summary";
  const eff = { b: scope.b, d: scope.d, tank: deptWide ? 0 : Math.min(scope.tank, tanks) };
  const rows = React.useMemo(() => repSeriesFor(eff.b, eff.d, eff.tank), [eff.b, eff.d, eff.tank]);
  const pickDept = (id) => {
    const o = opts.find((x) => x.d.id === id);
    if (o) setScope({ b: o.b.id, d: o.d.id, tank: Math.min(scope.tank, repTankCount(o.d)) });
  };
  return (
    <AppShell active="reports" title="Reports" crumbs={[report]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{REPORTS[report].sub} · {repScopeLabel(eff)}</p>
          </div>
          <div className="pagehead-right">
            <div className="segmented">
              {types.map((t) => <button key={t} className={"seg" + (t === report ? " active" : "")} onClick={() => setReport(t)}>{t}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="rep-toolbar">
          <div className="rep-field">
            <span className="rep-lbl">Department</span>
            <select className="nj-select" value={scope.d} onChange={(e) => pickDept(e.target.value)} aria-label="Department">
              {FACILITY.map((b) => {
                const ds = opts.filter((o) => o.b.id === b.id);
                if (!ds.length) return null;
                return <optgroup key={b.id} label={b.name}>{ds.map((o) => <option key={o.d.id} value={o.d.id}>{o.d.name} · {o.d.sub}</option>)}</optgroup>;
              })}
            </select>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Tank</span>
            <select className="nj-select" value={eff.tank} disabled={deptWide} title={deptWide ? "Fish Summary combines every tank in the department" : undefined}
              onChange={(e) => setScope((s) => ({ ...s, tank: Number(e.target.value) }))} aria-label="Tank">
              {deptWide
                ? <option value={0}>All tanks · {dpt.name}</option>
                : Array.from({ length: tanks }, (_, i) => <option key={i + 1} value={i + 1}>{dpt.name} · Tank {i + 1}</option>)}
            </select>
          </div>
          <div className="rep-sep" />
          <div className="rep-field">
            <span className="rep-lbl">Start date</span>
            <span className="dateinput">06-02-2026 <Icon name="chevron-down" size={13} color="var(--slate-400)" /></span>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">End date</span>
            <span className="dateinput">06-03-2026 <Icon name="chevron-down" size={13} color="var(--slate-400)" /></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <ExportMenu label="Download data" icon="cloud-download" describe={(fmt) => "Download started: " + report + " · " + repScopeLabel(eff) + " will save as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
            <button className="btn btn-primary" onClick={() => openReportViewer(report, eff)}><Icon name="file-text" size={15} /> Open in report viewer</button>
          </div>
        </div>

        <ReportTable report={report} showCalc={showCalc} rows={rows} />

        <div className="rep-calc-row" onClick={() => setShowCalc((s) => !s)}>
          <Icon name={showCalc ? "chevron-up" : "chevron-down"} size={15} color="var(--slate-500)" />
          {showCalc ? "Hide calculation" : "Show calculation"}
        </div>
        <div className="tbl-foot">
          <span className="small">{N} days · {report} · {repScopeLabel(eff)} · 06 Feb – 06 Mar 2026</span>
        </div>
      </div>
    </AppShell>
  );
}

window.ReportsScreen = ReportsScreen;
// data exported so the mobile app renders the SAME report definitions (desktop is the source
// of truth for report content; mobile only re-lays it out).
Object.assign(window, { REPORTS, REP_SERIES: SERIES, REP_DATES: DATES, repCalcStats: calcStats });
