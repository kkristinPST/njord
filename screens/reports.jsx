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
  // every column the catalog can name must exist here too — mobile renders reports against
  // this base series, so a missing key is a crash, not a blank cell
  const o2 = +(93.4 + (i % 5) * 0.5).toFixed(1);
  const nh4 = +(0.18 + (i % 4) * 0.02).toFixed(2);
  const no2 = +(0.05 + (i % 5) * 0.01).toFixed(2);
  const turb = +(0.28 + (i % 6) * 0.04).toFixed(2);
  const alk = 86 + (i % 7);
  const kwh = Math.round(1180 + (i % 6) * 46 + i * 3);
  const water = 410 + (i % 5) * 12;
  const o2use = Math.round(96 + i * 1.4);
  const runh = +(21.4 + (i % 4) * 0.4).toFixed(1);
  const alarms = 3 + (i % 7);
  const sludge = +(1.8 + (i % 5) * 0.22).toFixed(1);
  return { t, biomass, avgW, pop, density, dead, feeding, temp, ph, co2, makeup, vol, o2, nh4, no2, turb, alk, kwh, water, o2use, runh, alarms, sludge };
});

// ---- report definitions: columns + accessor + numeric format ----
const fmt = {
  int: (v) => Math.round(v).toLocaleString("nb-NO"), // rounds so an Average of a whole-number column stays whole
  f1: (v) => v.toFixed(1),
  f2: (v) => v.toFixed(2),
};
// One column definition per data key. A report is a NAME + SCOPE LEVEL + a list of keys —
// which is why 500 customer reports stay manageable: they are combinations of the same
// measured columns, not 500 hand-built screens.
const COL = {
  biomass: { h: "Biomass (kg)", k: "biomass", f: fmt.int },
  density: { h: "Density (kg/m³)", k: "density", f: fmt.f1 },
  avgW: { h: "Avg. weight (g)", k: "avgW", f: fmt.f2 },
  pop: { h: "Population", k: "pop", f: fmt.int },
  dead: { h: "Dead Fish", k: "dead", f: fmt.int },
  vol: { h: "Volume (m³)", k: "vol", f: fmt.int },
  feeding: { h: "Feeding (kg)", k: "feeding", f: fmt.f1 },
  temp: { h: "Temperature (°C)", k: "temp", f: fmt.f1 },
  ph: { h: "pH", k: "ph", f: fmt.f2 },
  co2: { h: "CO₂ (mg/l)", k: "co2", f: fmt.f1 },
  makeup: { h: "Make-up Water (m³)", k: "makeup", f: fmt.int },
  o2: { h: "O₂ sat. (%)", k: "o2", f: fmt.f1 },
  nh4: { h: "TAN (mg/l)", k: "nh4", f: fmt.f2 },
  no2: { h: "NO₂-N (mg/l)", k: "no2", f: fmt.f2 },
  turb: { h: "Turbidity (NTU)", k: "turb", f: fmt.f2 },
  alk: { h: "Alkalinity (mg/l)", k: "alk", f: fmt.int },
  kwh: { h: "Energy (kWh)", k: "kwh", f: fmt.int },
  water: { h: "Water intake (m³)", k: "water", f: fmt.int },
  o2use: { h: "O₂ used (kg)", k: "o2use", f: fmt.int },
  runh: { h: "Run hours (h)", k: "runh", f: fmt.f1 },
  alarms: { h: "Alarms", k: "alarms", f: fmt.int },
  sludge: { h: "Sludge (m³)", k: "sludge", f: fmt.f1 },
};
const cs = (s) => s.split(" ").map((k) => COL[k]);

// ---- the report catalog ----
// level: "tank" | "dept" | "facility" — declared by the report, ENFORCED by the toolbar, so a
// department report can never be asked for a single tank. Categories are a flat filter, not a
// folder tree: at this size search beats hierarchy.
const REP_CATALOG = [
  ...[["Fish Calculation", "tank", "Daily biomass, density & population calculation", "biomass density avgW pop dead vol", "biomass density smb"],
  ["Fish Summary", "dept", "Combined biology summary across the department", "biomass density avgW pop dead", "biology summary"],
  ["Growth & SGR", "tank", "Specific growth rate against the production plan", "avgW biomass pop density", "growth sgr plan"],
  ["Mortality Log", "tank", "Daily mortality with running population balance", "dead pop biomass", "mortality dead"],
  ["Mortality Summary", "dept", "Department mortality, total and per tank", "dead pop biomass", "mortality summary"],
  ["Stocking Density", "tank", "Density against the licensed maximum", "density biomass vol pop", "density licence"],
  ["Biomass Forecast", "dept", "Projected standing biomass over the window", "biomass avgW pop", "forecast plan"],
  ["Grading Result", "tank", "Size distribution and CV after grading", "avgW pop biomass", "grading cv size"],
  ["Harvest Register", "facility", "Harvested batches, weight and count", "biomass pop avgW", "harvest slaughter"],
  ["Fish Movement Log", "dept", "Transfers in and out, per tank", "pop biomass dead", "movement transfer"],
  ["Population Balance", "facility", "Facility-wide population reconciliation", "pop dead biomass", "population balance"]].map((r) => ({ cat: "Production", name: r[0], level: r[1], sub: r[2], cols: cs(r[3]), tags: r[4] })),
  ...[["Feed Report", "tank", "Daily feed delivered per tank", "biomass avgW pop feeding", "feed daily"],
  ["Feed Consumption", "dept", "Feed delivered across the department", "feeding biomass pop", "feed consumption"],
  ["Feed Conversion (FCR)", "tank", "Biological and economic feed conversion", "feeding biomass avgW", "fcr conversion"],
  ["Feed Waste Estimate", "tank", "Uneaten pellets estimated from the pellet sensor", "feeding biomass", "waste pellet"],
  ["Silo Stock Balance", "facility", "Feed received, dosed and remaining per silo", "feeding", "silo stock"],
  ["Feeding Hours", "dept", "Active feeding time per feeding day", "feeding runh", "hours feeder"],
  ["Appetite Index", "tank", "Delivered feed against the appetite curve", "feeding biomass avgW", "appetite curve"]].map((r) => ({ cat: "Feed", name: r[0], level: r[1], sub: r[2], cols: cs(r[3]), tags: r[4] })),
  ...[["Key Numbers", "tank", "Daily water chemistry & operational key figures", "temp ph co2 makeup feeding pop biomass", "key figures chemistry"],
  ["Water Chemistry Daily", "dept", "Full chemistry round for every tank", "temp ph co2 o2 nh4 no2", "chemistry water"],
  ["Oxygen Log", "tank", "Dissolved oxygen saturation and consumption", "o2 o2use temp", "oxygen o2"],
  ["CO₂ Log", "tank", "Carbon dioxide against the degassing setpoint", "co2 temp ph", "co2 degasser"],
  ["pH & Alkalinity", "tank", "pH with alkalinity and lye dosing", "ph alk co2", "ph lye alkalinity"],
  ["Temperature Log", "tank", "Tank temperature over the window", "temp", "temperature"],
  ["Nitrogen Compounds", "dept", "TAN, nitrite and biofilter conversion", "nh4 no2 temp ph", "tan nitrite mbbr"],
  ["Turbidity & Solids", "dept", "Turbidity with drum filter and sludge output", "turb sludge water", "turbidity solids drum"],
  ["Water Quality Summary", "facility", "Facility chemistry roll-up for the period", "temp ph co2 o2 nh4", "summary chemistry"]].map((r) => ({ cat: "Water quality", name: r[0], level: r[1], sub: r[2], cols: cs(r[3]), tags: r[4] })),
  ...[["Energy Consumption", "facility", "Facility energy use per day", "kwh runh", "energy kwh power"],
  ["Energy per Department", "dept", "Department energy split by main consumer", "kwh runh", "energy department"],
  ["O₂ Consumption", "dept", "Oxygen delivered against biomass", "o2use biomass o2", "oxygen consumption"],
  ["Water Intake", "facility", "New water intake and make-up volume", "water makeup", "intake water"],
  ["Sludge Production", "dept", "Sludge volume and dry matter", "sludge turb water", "sludge waste"],
  ["Heat Pump Performance", "facility", "Heat pump output, COP and run hours", "kwh temp runh", "heat pump cop"]].map((r) => ({ cat: "Utilities & energy", name: r[0], level: r[1], sub: r[2], cols: cs(r[3]), tags: r[4] })),
  ...[["Equipment Run Hours", "facility", "Run hours per equipment for the period", "runh kwh", "run hours equipment"],
  ["Pump Performance", "dept", "Pump duty, flow and specific energy", "runh kwh water", "pump flow"],
  ["Alarm Summary", "facility", "Alarm count per day and priority", "alarms", "alarms isa"],
  ["Filter Backwash Log", "dept", "Drum filter backwash cycles and water use", "turb water runh", "backwash filter"],
  ["Maintenance Due", "facility", "Equipment approaching its service interval", "runh", "maintenance service"]].map((r) => ({ cat: "Equipment", name: r[0], level: r[1], sub: r[2], cols: cs(r[3]), tags: r[4] })),
  ...[["Welfare Register", "dept", "Scored welfare indicators per registration", "dead pop biomass", "welfare scoring"],
  ["Mortality Report (authority)", "facility", "Monthly mortality in the authority's format", "dead pop biomass", "authority mattilsynet"],
  ["Medicine & Treatment Log", "dept", "Treatments given, dose and withdrawal period", "biomass pop temp", "medicine treatment"],
  ["Discharge Report", "facility", "Discharge volume and load against the permit", "water sludge nh4", "discharge permit"],
  ["Escape Prevention (NS 9416)", "facility", "Barrier checks and fish-tight verification", "alarms runh", "ns9416 escape barrier"],
  ["Biosecurity Log", "dept", "Zone entries, disinfection and screening", "alarms", "biosecurity hygiene"]].map((r) => ({ cat: "Regulatory", name: r[0], level: r[1], sub: r[2], cols: cs(r[3]), tags: r[4] })),
];
const REP_CATS = [...new Set(REP_CATALOG.map((r) => r.cat))];
const REP_LEVELS = { tank: { lbl: "Tank", icon: "container" }, dept: { lbl: "Department", icon: "layers" }, facility: { lbl: "Facility", icon: "building-2" } };
// name → definition. Mobile reads this, so the shape stays {sub, cols}.
const REPORTS = {};
REP_CATALOG.forEach((r) => { REPORTS[r.name] = r; });

// ---- pinned reports + recents (per operator, per device) ----
function repLS(k, dflt) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : dflt; } catch (e) { return dflt; } }
const REP_PIN_DEFAULT = ["Fish Calculation", "Feed Report", "Fish Summary", "Key Numbers"];
const repPins = {
  pins: repLS("nj_rep_pins_v1", REP_PIN_DEFAULT).filter((n) => REPORTS[n]),
  recent: repLS("nj_rep_recent_v1", []).filter((n) => REPORTS[n]),
  subs: new Set(),
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
  emit() { this.subs.forEach((f) => f()); },
  save() { try { localStorage.setItem("nj_rep_pins_v1", JSON.stringify(this.pins)); localStorage.setItem("nj_rep_recent_v1", JSON.stringify(this.recent)); } catch (e) {} this.emit(); },
  has(n) { return this.pins.includes(n); },
  toggle(n) { this.pins = this.has(n) ? this.pins.filter((x) => x !== n) : [...this.pins, n]; this.save(); },
  touch(n) { this.recent = [n, ...this.recent.filter((x) => x !== n)].slice(0, 8); this.save(); },
};
function useRepPins() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => repPins.sub(f), []); return repPins; }

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
// departments + tanks come from the shared register (lib/facility.jsx) — tank numbers are
// facility-wide and non-contiguous, so never rebuild them from a count here. Resolved lazily:
// the mobile app loads this file BEFORE lib/facility.jsx.
function repDepts() { return njTankDepts(); }
function repTankCount(dept) { return njTankCount(dept); }
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
    const o2 = +(93.4 + (h % 9) * 0.4 + (i % 5) * 0.5).toFixed(1);
    const nh4 = +(0.18 + (h % 13) * 0.006 + (i % 4) * 0.02).toFixed(2);
    const no2 = +(0.05 + (h % 11) * 0.004 + (i % 5) * 0.01).toFixed(2);
    const turb = +(0.28 + (i % 6) * 0.04).toFixed(2);
    const alk = Math.round(86 + (h % 15) + (i % 7));
    const kwh = Math.round((1180 + (i % 6) * 46 + i * 3) * k);
    const water = Math.round((410 + (i % 5) * 12) * k);
    const o2use = Math.round((96 + i * 1.4) * k);
    const runh = +(21.4 + (i % 4) * 0.4).toFixed(1);
    const alarms = 3 + (i % 7) + (h % 4);
    const sludge = +(1.8 + (i % 5) * 0.22).toFixed(1);
    return { t, biomass, avgW, pop, density, dead, feeding, temp, ph, co2, makeup, vol, o2, nh4, no2, turb, alk, kwh, water, o2use, runh, alarms, sludge };
  });
}
function repScopeLabel(sc) {
  if (!sc) return "Building 1 · DPT1 · Tank 1";
  if (sc.lvl === "facility") return "Whole facility";
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
          {!win.min && <button className="twin-ic" title="Print / Save PDF" onClick={doPrint}><Icon name="printer" size={16} /></button>}
          <button className="twin-ic" title={win.min ? "Expand" : "Minimize"} onClick={() => win.toggleMin()}><Icon name={win.min ? "chevron-up" : "minus"} size={16} /></button>
          <button className="twin-ic" title="Close" onClick={() => win.close()}><Icon name="x" size={16} /></button>
        </div>
      </header>
      {!win.min && (
        <div className="rwin-body">
          <div className="rwin-toolbar">
            <span className="rwin-scope"><Icon name="calendar" size={14} color="var(--slate-400)" /> 06 Feb – 06 Mar 2026 · {repScopeLabel(win.scope)}</span>
            <div className="rwin-toolbar-r">
              <button className="btn btn-secondary btn-sm" onClick={doPrint}><Icon name="printer" size={14} /> Print / Save PDF</button>
              <ExportMenu describe={(f) => "Download started: " + report + " report will save as " + (f === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
            </div>
          </div>
          <div className="rwin-scroll">
            <ReportSheet report={report} scope={win.scope} />
          </div>
          <div className="rwin-resize" onPointerDown={startResize} title="Resize"><Icon name="move-diagonal-2" size={14} /></div>
        </div>
      )}
    </div>
  );
}
Object.assign(window, { ReportWindow, openReportViewer, reportWin });

// ---- Browse reports: one search over the whole catalog, grouped by category ----
// The legacy product reached a report through Reports › DPT › report › Tank — four nav levels,
// no search, and the report's own name buried under its scope. Here the catalog is a flat,
// searchable register and the scope is a filter, so it reads the same at 4 reports or 500.
function ReportBrowser({ current, onOpen }) {
  const pins = useRepPins();
  const [q, setQ] = React.useState("");
  const [lvl, setLvl] = React.useState("all");
  const [open, setOpen] = React.useState(() => new Set());
  const term = q.trim().toLowerCase();
  const hit = (r) => (lvl === "all" || r.level === lvl) &&
    (!term || r.name.toLowerCase().includes(term) || r.cat.toLowerCase().includes(term) || r.sub.toLowerCase().includes(term) || r.tags.includes(term));
  const shown = REP_CATS.map((c) => ({ cat: c, items: REP_CATALOG.filter((r) => r.cat === c && hit(r)) })).filter((g) => g.items.length);
  const nMatch = shown.reduce((a, g) => a + g.items.length, 0);
  const isOpen = (c) => (term || lvl !== "all" ? true : !open.has(c));
  const toggleOpen = (c) => setOpen((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  const pick = (name) => { onOpen(name); closeDialog(); };
  const recents = pins.recent.filter((n) => n !== current).slice(0, 5);
  const Row = ({ r }) => (
    <div className={"rb-row" + (r.name === current ? " on" : "")}>
      <button className="rb-row-main" onClick={() => pick(r.name)}>
        <Icon name="file-text" size={15} color="var(--slate-400)" />
        <span className="rb-row-txt">
          <span className="rb-row-name">{r.name}</span>
          <span className="rb-row-sub">{r.sub}</span>
        </span>
        <span className={"rb-lvl lvl-" + r.level}><Icon name={REP_LEVELS[r.level].icon} size={11} /> {REP_LEVELS[r.level].lbl}</span>
        {r.name === current && <span className="rb-open-chip">open</span>}
      </button>
      <button className={"rb-pin" + (pins.has(r.name) ? " on" : "")} onClick={() => pins.toggle(r.name)}
        aria-pressed={pins.has(r.name)} title={pins.has(r.name) ? "Unpin " + r.name + " from the report tabs" : "Pin " + r.name + " to the report tabs"}>
        <Icon name="star" size={15} />
      </button>
    </div>
  );
  return (
    <Dialog width={760}>
      <DlgHeader icon="folder-search" name="Browse reports" tag={REP_CATALOG.length + " in catalog"} onClose={closeDialog} />
      <div className="tsp-bar">
        <div className="field" style={{ flex: 1 }}>
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input autoFocus placeholder="Search report name, category or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="segmented rb-lvlseg">
          {[["all", "All"], ["facility", "Facility"], ["dept", "Department"], ["tank", "Tank"]].map(([v, l]) => (
            <button key={v} className={"seg" + (lvl === v ? " active" : "")} onClick={() => setLvl(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="rb-list">
        {!term && lvl === "all" && recents.length > 0 && (
          <div className="rb-group">
            <div className="rb-cat rb-cat-static"><Icon name="history" size={13} color="var(--slate-500)" /><span className="rb-cat-lbl">Recently opened</span></div>
            {recents.map((n) => <Row key={"rec-" + n} r={REPORTS[n]} />)}
          </div>
        )}
        {shown.length === 0 && <NjEmpty size="compact" icon="search-x" title="No report matches this search" body="Try the subject — oxygen, feed, mortality — or clear the scope filter." />}
        {shown.map((g) => (
          <div className="rb-group" key={g.cat}>
            <button className="rb-cat" onClick={() => toggleOpen(g.cat)} aria-expanded={isOpen(g.cat)}>
              <Icon name={isOpen(g.cat) ? "chevron-down" : "chevron-right"} size={14} />
              <span className="rb-cat-lbl">{g.cat}</span>
              <span className="rb-cat-n data">{g.items.length}</span>
            </button>
            {isOpen(g.cat) && g.items.map((r) => <Row key={r.name} r={r} />)}
          </div>
        ))}
      </div>
      <div className="dlg-foot tsp-foot">
        <span className="small">{term || lvl !== "all" ? nMatch + " of " + REP_CATALOG.length + " reports" : REP_CATALOG.length + " reports · " + pins.pins.length + " pinned"}</span>
        <div className="tsp-foot-r">
          <span className="small rb-hint"><Icon name="star" size={13} /> Star a report to keep it as a tab</span>
          <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
        </div>
      </div>
    </Dialog>
  );
}
function openReportBrowser(current, onOpen) { openDialog(<ReportBrowser current={current} onOpen={onOpen} />); }

function ReportsScreen() {
  const pins = useRepPins();
  const [report, setReport] = React.useState(() => repPins.pins[0] || "Fish Calculation");
  const [showCalc, setShowCalc] = React.useState(true);
  const ctx = useCtx();
  const opts = repDepts();
  const first = opts.find((o) => o.d.id === ctx.dept.id) || opts[0];
  const [scope, setScope] = React.useState({ b: first.b.id, d: first.d.id, tank: 1 });
  const bld = FACILITY.find((x) => x.id === scope.b) || FACILITY[0];
  const dpt = bld.depts.find((x) => x.id === scope.d) || bld.depts[0];
  const tankList = njDeptTanks(dpt.id);
  const tanks = tankList.length;
  const def = REPORTS[report];
  const level = def.level;
  // The report declares its scope level; the toolbar enforces it. A department report can never
  // be asked for one tank, a facility report is not scoped at all.
  const deptWide = level !== "tank";
  const facilityWide = level === "facility";
  const eff = facilityWide
    ? { b: "ALL", d: "ALL", tank: 0, lvl: level }
    : { b: scope.b, d: scope.d, tank: deptWide ? 0 : (tankList.some((t) => t.n === scope.tank) ? scope.tank : (tankList[0] || { n: 0 }).n), lvl: level };
  const rows = React.useMemo(() => repSeriesFor(eff.b, eff.d, eff.tank), [eff.b, eff.d, eff.tank]);
  const loadingReport = useNjLoading([report, eff.b, eff.d, eff.tank]);
  React.useEffect(() => { repPins.touch(report); }, [report]);
  const pickDept = (id) => {
    const o = opts.find((x) => x.d.id === id);
    if (o) { const L = njDeptTanks(o.d.id); setScope({ b: o.b.id, d: o.d.id, tank: (L[0] || { n: 0 }).n }); }
  };
  // The tab strip is the operator's pinned set, not the catalog. An unpinned report opens as a
  // leading temporary tab so it is visible without being kept.
  const tabs = pins.pins.slice(0, 7);
  const temp = !pins.has(report);
  const overflow = pins.pins.length - tabs.length;
  return (
    <AppShell active="reports" title="Reports" crumbs={[report]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{def.sub} · {repScopeLabel(eff)}</p>
          </div>
          <div className="pagehead-right rep-tabs">
            <div className="segmented">
              {temp && <button className="seg active rep-seg-temp" title="Not pinned — star it to keep it here">{report}</button>}
              {tabs.map((t) => <button key={t} className={"seg" + (t === report ? " active" : "")} onClick={() => setReport(t)}>{t}</button>)}
            </div>
            <button className={"btn btn-secondary btn-sm rep-pinbtn" + (pins.has(report) ? " on" : "")} onClick={() => pins.toggle(report)}
              aria-pressed={pins.has(report)} title={pins.has(report) ? "Unpin " + report + " from the tabs" : "Pin " + report + " to the tabs"}>
              <Icon name="star" size={15} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => openReportBrowser(report, setReport)}>
              <Icon name="folder-search" size={15} /> Browse{overflow > 0 ? " +" + overflow : ""}
              <span className="rep-browse-n data">{REP_CATALOG.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="rep-toolbar">
          <div className="rep-field">
            <span className="rep-lbl">Department</span>
            <select className="nj-select" value={facilityWide ? "" : scope.d} disabled={facilityWide}
              title={facilityWide ? def.name + " covers the whole facility" : undefined}
              onChange={(e) => pickDept(e.target.value)} aria-label="Department">
              {facilityWide
                ? <option value="">All departments · whole facility</option>
                : FACILITY.map((b) => {
                  const ds = opts.filter((o) => o.b.id === b.id);
                  if (!ds.length) return null;
                  return <optgroup key={b.id} label={b.name}>{ds.map((o) => <option key={o.d.id} value={o.d.id}>{o.d.name} · {o.d.sub}</option>)}</optgroup>;
                })}
            </select>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Tank</span>
            <select className="nj-select" value={eff.tank} disabled={deptWide}
              title={deptWide ? def.name + " combines every tank in scope" : undefined}
              onChange={(e) => setScope((s) => ({ ...s, tank: Number(e.target.value) }))} aria-label="Tank">
              {deptWide
                ? <option value={0}>{facilityWide ? "All tanks · facility" : "All tanks · " + dpt.name}</option>
                : tankList.map((t) => <option key={t.n} value={t.n}>{dpt.name} · {t.name}</option>)}
            </select>
          </div>
          <div className="rep-sep" />
          <div className="rep-field">
            <span className="rep-lbl">Start date</span>
            <span className="dateinput">06-02-2026 <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">End date</span>
            <span className="dateinput">06-03-2026 <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <ExportMenu describe={(fmt) => "Download started: " + report + " · " + repScopeLabel(eff) + " will save as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
            <button className="btn btn-primary" onClick={() => openReportViewer(report, eff)}><Icon name="file-text" size={16} /> Open in report viewer</button>
          </div>
        </div>

        {loadingReport
          ? <div style={{ padding: "8px 20px 20px" }}><NjSkeleton variant="table" rows={8} cols={6} note={"Building " + report + " · " + repScopeLabel(eff) + "…"} /></div>
          : <ReportTable report={report} showCalc={showCalc} rows={rows} />}

        <div className="rep-calc-row" onClick={() => setShowCalc((s) => !s)}>
          <Icon name={showCalc ? "chevron-up" : "chevron-down"} size={16} color="var(--slate-500)" />
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
Object.assign(window, { REPORTS, REP_CATALOG, REP_CATS, REP_LEVELS, repPins, openReportBrowser, REP_SERIES: SERIES, REP_DATES: DATES, repCalcStats: calcStats });
