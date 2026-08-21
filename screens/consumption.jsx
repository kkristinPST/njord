// consumption.jsx — Consumption Overview: one facility-wide sheet for the inputs a customer buys
// (feed, lye, oxygen, make-up water, electricity). Absolute totals only; no invented targets, no cost.
//
// HONESTY RULE for this screen: a period total needs a COUNTER, not a flow reading. Every row
// therefore states HOW its figure was obtained (`method`) and, where a second independent source
// exists, carries a `cross`-check figure with the variance. Figures derived by integrating a flow
// are marked `est` and rendered with a ≈ — they drift and they miss tanker deliveries.

const CONS_INPUTS = [
  { key: "feed", label: "Feed", unit: "kg", icon: "utensils", day: 980, color: "#5F7A2E",
    method: "Counted · screw calibration", methodLong: "Dosed weight from feedscrew calibration (g/rot × rotations), summed over all stations.",
    tag: "FED10-SCR1…3", cross: { label: "Silo weight loss", pct: 1.033 }, route: null, routeLabel: null },
  { key: "lye", label: "Lye · NaOH", unit: "L", icon: "flask-conical", day: 268, color: "#B0563F", est: true,
    method: "Integrated flow · dosing pumps", methodLong: "Dosing-pump rate integrated over time. No totalizer tag exists; deliveries are not seen.",
    tag: "CHM0-DNA1/2-PU*", cross: { label: "Tank level draw", pct: 1.086 } },
  { key: "o2", label: "Oxygen", unit: "kg", icon: "droplet", day: 1020, color: "#1F8FA8", est: true,
    method: "Integrated flow · O₂ meters", methodLong: "Cone flow meters integrated over time. Gas-phase measurement, no counter.",
    tag: "DOX0-FT*", cross: { label: "LOX tank stock draw", pct: 1.041 } },
  { key: "water", label: "Make-up water", unit: "m³", icon: "waves", day: 1574, color: "#3D6FB4",
    method: "Totalizer · plant flow meter", methodLong: "Read straight off the plant intake flow totalizer.",
    tag: "WIN0-FT-PLANT", cross: null },
  { key: "power", label: "Electricity", unit: "kWh", icon: "zap", day: 3671, color: "#1F3A5F",
    method: "Totalizer · energy meters", methodLong: "Sum of the department energy meters.",
    tag: "ENE0-EM*", cross: null, route: "energy", routeLabel: "Energy Consumption" },
];

// Month to date and "so far today" are deliberate: a customer comparing months must not read a
// part-month against a whole one without being told.
const CONS_PERIODS = [
  { id: "today", label: "Today", bars: 15, step: "h", foot: "so far today · to 14:00" },
  { id: "week", label: "Last 7 days", bars: 7, step: "d", foot: "7 complete days" },
  { id: "month", label: "Month to date", bars: 13, step: "d", foot: "13 of 31 days · June 2026" },
];

// deterministic bars; the row total is the SUM of what is charted, so sheet and chart can never disagree
function consBars(input, period, offset) {
  const per = period.step === "h" ? input.day / 24 : input.day;
  const seed = input.key.charCodeAt(0) + (offset || 0) * 7;
  const out = [];
  for (let i = 0; i < period.bars; i++) {
    const w = Math.sin(i * 0.9 + seed) * 0.11 + Math.cos(i * 0.41 + seed * 0.7) * 0.07;
    // feeding follows the light regime — no night dosing on the hourly view
    const night = period.step === "h" && i < 6 ? (input.key === "feed" ? 0.05 : 0.72) : 1;
    out.push({
      label: period.step === "h" ? String(i).padStart(2, "0") : String(i + 1),
      v: Math.max(0, per * (1 + w) * night),
    });
  }
  return out;
}
const consSum = (bars) => bars.reduce((s, b) => s + b.v, 0);
function consFmt(v, unit) {
  const d = unit === "m³" || unit === "L" ? 0 : 0;
  return Math.round(v).toLocaleString(undefined, { maximumFractionDigits: d });
}

function ConsSpark({ bars, color }) {
  const max = Math.max(...bars.map((b) => b.v), 1);
  const bw = 100 / bars.length;
  return (
    <svg className="cons-spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b, i) => {
        const h = Math.max(1, (b.v / max) * 24);
        return <rect key={i} x={i * bw + bw * 0.18} y={26 - h} width={bw * 0.64} height={h} fill={color} opacity=".55" />;
      })}
    </svg>
  );
}

function ConsCard({ input, period, selected, onSelect }) {
  const bars = React.useMemo(() => consBars(input, period, 0), [input.key, period.id]);
  const prev = React.useMemo(() => consBars(input, period, 1), [input.key, period.id]);
  const total = consSum(bars), prevTotal = consSum(prev);
  const dPct = ((total - prevTotal) / prevTotal) * 100;
  return (
    <button className={"card cons-card" + (selected ? " sel" : "")} onClick={() => onSelect(input.key)}
      aria-pressed={selected} title={"Chart " + input.label + " over the selected period"}>
      <div className="cons-card-head">
        <Icon name={input.icon} size={15} color="var(--slate-500)" />
        <span className="cons-card-l">{input.label}</span>
        {input.est && <span className="cons-est" title="Derived by integrating a flow reading — not a counter">EST.</span>}
      </div>
      <div className="cons-card-v">
        <span className="data cons-v">{input.est ? "≈" : ""}{consFmt(total, input.unit)}</span>
        <span className="u">{input.unit}</span>
      </div>
      <div className="cons-card-foot">
        <span className="cons-delta" data-dir={dPct >= 0 ? "up" : "down"}>{dPct >= 0 ? "+" : "−"}{Math.abs(dPct).toFixed(1)} %</span>
        <span className="caption">vs previous</span>
      </div>
      <ConsSpark bars={bars} color={input.color} />
    </button>
  );
}

function ConsChart({ input, period }) {
  const bars = React.useMemo(() => consBars(input, period, 0), [input.key, period.id]);
  const W = 1000, H = 250, padL = 62, padR = 16, padT = 14, padB = 28;
  const max = Math.max(...bars.map((b) => b.v), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.ceil(max / (mag / 2)) * (mag / 2);
  const bw = (W - padL - padR) / bars.length;
  const barW = Math.min(48, bw * 0.6);
  const y = (v) => padT + (1 - v / niceMax) * (H - padT - padB);
  const ticks = [0, 0.5, 1].map((f) => niceMax * f);
  return (
    <svg className="cons-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={input.label + " consumption per " + (period.step === "h" ? "hour" : "day") + ", " + period.label}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--slate-100)" strokeWidth="1" />
          <text className="cons-ylbl" x={padL - 8} y={y(t) + 3} textAnchor="end">{consFmt(t, input.unit)}</text>
        </g>
      ))}
      {bars.map((b, i) => {
        const cx = padL + i * bw + bw / 2;
        return (
          <g key={i}>
            <title>{b.label} · {consFmt(b.v, input.unit)} {input.unit}</title>
            <rect x={cx - barW / 2} y={y(b.v)} width={barW} height={Math.max(1, y(0) - y(b.v))} fill={input.color} />
            <text className="cons-xlbl" x={cx} y={H - 9} textAnchor="middle">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ConsumptionScreen() {
  const [pid, setPid] = React.useState("week");
  const [sel, setSel] = React.useState("feed");
  const period = CONS_PERIODS.find((p) => p.id === pid);
  const selInput = CONS_INPUTS.find((i) => i.key === sel);

  const rows = CONS_INPUTS.map((i) => {
    const total = consSum(consBars(i, period, 0));
    const cross = i.cross ? total * i.cross.pct : null;
    const varPct = cross == null ? null : ((cross - total) / total) * 100;
    return { i, total, cross, varPct, flag: varPct != null && Math.abs(varPct) >= 5 };
  });
  const flagged = rows.filter((r) => r.flag).length;

  return (
    <AppShell active="navigation" title="Consumption Overview" crumbs={["Facility utilities"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Feed, lye, oxygen, water and power for the whole facility · one sheet, absolute totals</p>
          </div>
          <div className="pagehead-right">
            <div className="segmented">
              {CONS_PERIODS.map((p) => (
                <button key={p.id} className={"seg" + (p.id === pid ? " active" : "")} onClick={() => setPid(p.id)}>{p.label}</button>
              ))}
            </div>
            <button className="btn btn-secondary" title="Export this sheet as a spreadsheet"
              onClick={() => njToast("Consumption sheet exported · " + period.label, "download")}><Icon name="download" size={15} /> Export</button>
          </div>
        </div>
      </div>

      <div className="cons-cards">
        {CONS_INPUTS.map((i) => <ConsCard key={i.key} input={i} period={period} selected={i.key === sel} onSelect={setSel} />)}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l">
            <Icon name={selInput.icon} size={17} color="var(--slate-600)" />
            <span className="card-title">{selInput.label} per {period.step === "h" ? "hour" : "day"}</span>
          </div>
          <span className="caption">{selInput.unit} · {period.foot}</span>
        </div>
        <div className="card-body">
          <ConsChart input={selInput} period={period} />
          <p className="cons-note"><Icon name="info" size={13} color="var(--slate-400)" /> {selInput.methodLong}
            {selInput.route && <button className="linkbtn cons-route" onClick={() => window.__njNavigate && window.__njNavigate(selInput.route)}>{selInput.routeLabel} <Icon name="arrow-up-right" size={13} /></button>}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="table-2" size={17} color="var(--slate-600)" /><span className="card-title">Sheet</span></div>
          <span className="caption">{period.label} · {period.foot}</span>
        </div>
        <table className="tbl cons-tbl">
          <thead>
            <tr>
              <th>Input</th>
              <th className="num">Consumed</th>
              <th>Unit</th>
              <th>How it was measured</th>
              <th>Cross-check</th>
              <th className="num">Variance</th>
              <th>Tag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ i, total, cross, varPct, flag }) => (
              <tr key={i.key} className={i.key === sel ? "row-hl" : ""}>
                <td className="lbl">
                  <button className="cons-rowbtn" onClick={() => setSel(i.key)} title={"Chart " + i.label}>
                    <span className="cons-swatch" style={{ background: i.color }} />
                    <span className="td-strong">{i.label}</span>
                  </button>
                </td>
                <td className="num td-strong data">{i.est ? "≈" : ""}{consFmt(total, i.unit)}</td>
                <td className="cons-unit">{i.unit}</td>
                <td>
                  <span className={"cons-src" + (i.est ? " est" : "")} title={i.methodLong}>{i.method}</span>
                </td>
                <td>{cross == null
                  ? <span className="cons-none">Single source</span>
                  : <span className="cons-cross"><span className="data">{consFmt(cross, i.unit)}</span> <span className="cons-crossl">{i.cross.label}</span></span>}</td>
                <td className="num">{varPct == null ? <span className="cons-none">—</span>
                  : <span className={"cons-var" + (flag ? " flag" : "")} title={flag ? "The two sources disagree by more than 5 % — the integrated figure is the one to distrust" : "Sources agree within 5 %"}>
                    {varPct >= 0 ? "+" : "−"}{Math.abs(varPct).toFixed(1)} %</span>}</td>
                <td><span className="tag">{i.tag}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tbl-foot cons-foot">
          <span className="caption">
            {flagged
              ? flagged + (flagged > 1 ? " rows measured by integrating a flow disagree with their" : " row measured by integrating a flow disagrees with its") + " stock count by more than 5 % · install a totalizer to close the gap"
              : "All rows reconcile with their second source within 5 %"}
          </span>
          <span className="caption">Totals are the sum of the charted period — no extrapolation</span>
        </div>
      </div>
    </AppShell>
  );
}

// Dashboard card — the glance version; the sheet above is the full answer.
function DashConsumption() {
  const period = CONS_PERIODS[1];
  return (
    <div className="card dash-consumption">
      <div className="card-head">
        <div className="card-head-l"><Icon name="package" size={17} color="var(--slate-600)" /><span className="card-title">Consumption</span>
          <span className="caption cons-dash-per">Last 7 days</span></div>
        <button className="linkbtn" onClick={() => window.__njNavigate && window.__njNavigate("consumption")}>Full sheet <Icon name="arrow-up-right" size={13} /></button>
      </div>
      <div className="cons-dash-row">
        {CONS_INPUTS.map((i) => {
          const bars = consBars(i, period, 0);
          const total = consSum(bars);
          const prev = consSum(consBars(i, period, 1));
          const dPct = ((total - prev) / prev) * 100;
          return (
            <button key={i.key} className="cons-dash-cell" onClick={() => window.__njNavigate && window.__njNavigate("consumption")}
              title={i.label + " · " + i.method}>
              <span className="cons-dash-l"><Icon name={i.icon} size={13} color="var(--slate-400)" /> {i.label}</span>
              <span className="cons-dash-v"><span className="data">{i.est ? "≈" : ""}{consFmt(total, i.unit)}</span><span className="u"> {i.unit}</span></span>
              <span className="cons-dash-d" data-dir={dPct >= 0 ? "up" : "down"}>{dPct >= 0 ? "+" : "−"}{Math.abs(dPct).toFixed(1)} %</span>
              <ConsSpark bars={bars} color={i.color} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ConsumptionScreen, DashConsumption, CONS_INPUTS, CONS_PERIODS, consBars, consSum });
