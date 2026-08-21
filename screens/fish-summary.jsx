// fish-summary.jsx — Navigation "Fish Summary" sub-tab: per-tank biology for the active department
// (population, avg weight, size CV, biomass, density, feed, FCR, SGR) + department KPIs + size distribution.

// O₂ status from the tank's configured limits (shared with tank.jsx — no welfare band)
function fsO2Status(o2, t) {
  if (window.o2Status) return window.o2Status(o2, t);
  if (o2 < 80) return "critical";
  if (o2 < 85) return "high";
  if (o2 > 105) return "high";
  return "ok";
}

// deterministic per-tank biology (aligned with feeding.jsx / reports.jsx scale: small post-smolt)
const FS_TANKS = [
  { n: 1, tag: "DPT1-FTA1", pop: 149041, avgW: 2.1, cv: 11.2, vol: 450, feed: 8.8, fcr: 0.90, sgr: 6.4, o2: 89.6 },
  { n: 2, tag: "DPT1-FTA2", pop: 206271, avgW: 3.6, cv: 9.4, vol: 450, feed: 20.4, fcr: 0.88, sgr: 5.1, o2: 80.7 },
  { n: 3, tag: "DPT1-FTA3", pop: 180429, avgW: 3.6, cv: 9.8, vol: 450, feed: 19.4, fcr: 0.89, sgr: 5.0, o2: 82.9 },
  { n: 4, tag: "DPT1-FTA4", pop: 156628, avgW: 2.1, cv: 12.0, vol: 450, feed: 9.3, fcr: 0.91, sgr: 6.3, o2: 88.3 },
  { n: 5, tag: "DPT1-FTA5", pop: 171204, avgW: 2.9, cv: 13.6, vol: 450, feed: 15.2, fcr: 0.93, sgr: 5.6, o2: 83.1 },
  { n: 6, tag: "DPT1-FTA6", pop: 168930, avgW: 3.2, cv: 10.1, vol: 450, feed: 17.6, fcr: 0.89, sgr: 5.3, o2: 90.2 },
  { n: 7, tag: "DPT1-FTA7", pop: 159870, avgW: 2.4, cv: 11.7, vol: 450, feed: 12.1, fcr: 0.90, sgr: 6.0, o2: 87.4 },
  { n: 8, tag: "DPT1-FTA8", pop: 198640, avgW: 3.8, cv: 8.9, vol: 450, feed: 22.0, fcr: 0.87, sgr: 4.9, o2: 86.6 },
];
function fsBiomass(t) { return t.pop * t.avgW / 1000; }          // kg
function fsDensity(t) { return fsBiomass(t) / t.vol; }            // kg/m³

// size-distribution histogram (department, deterministic bell over weight bins)
const FS_BINS = ["0–1", "1–2", "2–3", "3–4", "4–5", "5–6", "6+"];
const FS_DIST = [4, 13, 27, 31, 16, 7, 2]; // % of population per weight bin (g)

function FsKpiRow({ tanks }) {
  const totBio = tanks.reduce((s, t) => s + fsBiomass(t), 0);
  const totPop = tanks.reduce((s, t) => s + t.pop, 0);
  const avgW = totBio * 1000 / totPop;
  const avgDens = tanks.reduce((s, t) => s + fsDensity(t), 0) / tanks.length;
  return (
    <div className="kpi-row" style={{ marginBottom: 18 }}>
      <KpiCard label="Total Biomass" value={(totBio / 1000).toFixed(1)} unit="t" delta="+1.2 24h" deltaDir="up" icon="fish" />
      <KpiCard label="Population" value={totPop.toLocaleString()} delta="−312 24h" deltaDir="down" icon="hash" />
      <KpiCard label="Avg Weight" value={avgW.toFixed(2)} unit="g" delta="+0.06 24h" deltaDir="up" icon="scale" />
      <KpiCard label="Avg Density" value={avgDens.toFixed(2)} unit="kg/m³" delta="+0.04 24h" deltaDir="up" icon="layers" />
    </div>
  );
}

function FsTable({ tanks }) {
  const totPop = tanks.reduce((s, t) => s + t.pop, 0);
  const totBio = tanks.reduce((s, t) => s + fsBiomass(t), 0);
  const totFeed = tanks.reduce((s, t) => s + t.feed, 0);
  const avgFcr = tanks.reduce((s, t) => s + t.fcr, 0) / tanks.length;
  const avgSgr = tanks.reduce((s, t) => s + t.sgr, 0) / tanks.length;
  const avgDens = tanks.reduce((s, t) => s + fsDensity(t), 0) / tanks.length;
  return (
    <table className="tbl fs-tbl">
      <thead>
        <tr>
          <th>Tank</th>
          <th className="num">Population</th>
          <th className="num">Avg wt (g)</th>
          <th className="num">Size CV</th>
          <th className="num">Biomass (kg)</th>
          <th className="num">Density (kg/m³)</th>
          <th className="num">Feed 24h (kg)</th>
          <th className="num">FCR</th>
          <th className="num">SGR (%/d)</th>
          <th className="num">O₂ sat</th>
        </tr>
      </thead>
      <tbody>
        {tanks.map((t) => {
          const st = fsO2Status(t.o2, t);
          const o2col = st === "critical" ? "var(--critical-text)" : st === "high" ? "var(--warning-text)" : "var(--slate-600)";
          return (
            <tr key={t.n}>
              <td className="lbl">
                <span className="fs-tank"><Dot level={st} size={8} /> <span className="td-strong">Tank {t.n}</span> <span className="tag fs-tag">{t.tag}</span></span>
              </td>
              <td className="num">{t.pop.toLocaleString()}</td>
              <td className="num">{t.avgW.toFixed(2)}</td>
              <td className="num">{t.cv.toFixed(1)} %</td>
              <td className="num td-strong">{Math.round(fsBiomass(t)).toLocaleString()}</td>
              <td className="num">{fsDensity(t).toFixed(2)}</td>
              <td className="num">{t.feed.toFixed(1)}</td>
              <td className="num">{t.fcr.toFixed(2)}</td>
              <td className="num">{t.sgr.toFixed(1)}</td>
              <td className="num" style={{ color: o2col, fontWeight: 700 }}>{t.o2.toFixed(1)} %</td>
            </tr>
          );
        })}
        <tr className="calc">
          <td className="lbl td-strong">Department</td>
          <td className="num td-strong">{totPop.toLocaleString()}</td>
          <td className="num">—</td>
          <td className="num">—</td>
          <td className="num td-strong">{Math.round(totBio).toLocaleString()}</td>
          <td className="num">{avgDens.toFixed(2)}</td>
          <td className="num td-strong">{totFeed.toFixed(1)}</td>
          <td className="num">{avgFcr.toFixed(2)}</td>
          <td className="num">{avgSgr.toFixed(1)}</td>
          <td className="num">—</td>
        </tr>
      </tbody>
    </table>
  );
}

function FsDistribution() {
  const max = Math.max(...FS_DIST);
  return (
    <div className="card fs-dist">
      <div className="card-head">
        <div className="card-head-l"><Icon name="bar-chart-3" size={17} color="var(--slate-600)" /><span className="card-title">Size Distribution</span></div>
        <span className="caption">by weight · g</span>
      </div>
      <div className="fs-dist-body">
        <div className="fs-bars">
          {FS_DIST.map((v, i) => (
            <div className="fs-bar-col" key={i}>
              <span className="fs-bar-val data">{v}%</span>
              <div className="fs-bar-track"><div className="fs-bar-fill" style={{ height: (v / max * 100) + "%" }} /></div>
              <span className="fs-bar-lbl">{FS_BINS[i]}</span>
            </div>
          ))}
        </div>
        <div className="fs-dist-foot">
          <div className="fs-stat"><span className="fs-stat-l">Median weight</span><span className="data fs-stat-v">3.1 <span className="u">g</span></span></div>
          <div className="fs-stat"><span className="fs-stat-l">Population CV</span><span className="data fs-stat-v">10.8 <span className="u">%</span></span></div>
          <div className="fs-stat"><span className="fs-stat-l">Grading readiness</span><span className="badge" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>HOLD</span></div>
        </div>
      </div>
    </div>
  );
}

function FishSummaryView() {
  const { dept } = useCtx();
  const totBio = FS_TANKS.reduce((s, t) => s + fsBiomass(t), 0);
  return (
    <AppShell active="navigation" title="Fish Summary" statusLevel="high">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{FS_TANKS.length} tanks · {(totBio / 1000).toFixed(1)} t biomass</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Fish Summary" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <ExportMenu label="Export" describe={(fmt) => "Export started: fish summary will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
        <button className="btn btn-secondary"><Icon name="file-text" size={15} /> Fish report</button>
      </div>

      <FsKpiRow tanks={FS_TANKS} />

      <div className="fs-stack">
        <div className="card">
          <div className="card-head">
            <div className="card-head-l"><Icon name="fish" size={17} color="var(--slate-600)" /><span className="card-title">Biology by Tank · {dept.name}</span></div>
            <span className="caption">live · 01 Jun, 13:53</span>
          </div>
          <div className="fs-tbl-scroll">
            <FsTable tanks={FS_TANKS} />
          </div>
        </div>
        <FsDistribution />
      </div>
    </AppShell>
  );
}

window.FishSummaryView = FishSummaryView;
