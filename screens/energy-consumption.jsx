// energy-consumption.jsx — facility-wide energy screen: per-department energy cards,
// stacked consumption chart with range selector, and a sensor table (current/min/max/avg).

// categorical series palette — cool/neutral so it never reads as status color
const EC_SERIES = [
  { key: "DPT1", label: "Consumption DPT1", color: "#00AEEE" },
  { key: "DPT2", label: "Consumption DPT2", color: "#3D6FB4" },
  { key: "DPT3", label: "Consumption DPT3", color: "#6FB1C9" },
  { key: "DPT4", label: "Consumption DPT4", color: "#9AA7B5" },
  { key: "INT",  label: "Intake Building 2", color: "#1F3A5F" },
];
const EC_BASE = { DPT1: 1240, DPT2: 2480, DPT3: 4310, DPT4: 4205, INT: 1760 };

// deterministic daily kW per series over n days
function ecData(n) {
  const days = [];
  const now = new Date(2026, 5, 1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const row = { label: (d.getDate()) + "/" + (d.getMonth() + 1) };
    EC_SERIES.forEach((s, si) => {
      const wob = Math.sin((i * 1.3) + si * 2.1) * 0.08 + Math.cos(i * 0.7 + si) * 0.05;
      row[s.key] = Math.round(EC_BASE[s.key] * (1 + wob));
    });
    days.push(row);
  }
  return days;
}

function EcDeptCard({ name, mode, power, today, yesterday, total }) {
  return (
    <div className="card ec-dept">
      <div className="ec-dept-head">
        <span className="ec-sigma">Σ</span>
        <span className="ec-dept-name">{name}</span>
        <span className="ec-dept-mode">{mode}</span>
      </div>
      <div className="ec-dept-rows">
        <div className="ec-row ec-row-hero"><span className="ec-l">Power</span><span className="data ec-v">{power}<span className="u"> kW/h</span></span></div>
        <div className="ec-row"><span className="ec-l">Energy today</span><span className="data ec-v">{today}<span className="u"> kW</span></span></div>
        <div className="ec-row"><span className="ec-l">Energy yesterday</span><span className="data ec-v">{yesterday}<span className="u"> kW</span></span></div>
        <div className="ec-row"><span className="ec-l">Total energy</span><span className="data ec-v">{total}<span className="u"> kW</span></span></div>
      </div>
    </div>
  );
}

function EcChart({ data, active }) {
  const W = 1000, H = 300, padL = 54, padR = 16, padT = 16, padB = 30;
  const cols = data.length;
  const totals = data.map((d) => EC_SERIES.reduce((s, ser) => s + (active[ser.key] ? d[ser.key] : 0), 0));
  const max = Math.max(...totals, 1);
  const niceMax = Math.ceil(max / 2000) * 2000;
  const bw = (W - padL - padR) / cols;
  const barW = Math.min(46, bw * 0.62);
  const y = (v) => padT + (1 - v / niceMax) * (H - padT - padB);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  return (
    <svg className="ec-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Energy consumption by department">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--slate-100)" strokeWidth="1" />
          <text className="ec-ylbl" x={padL - 8} y={y(t) + 3} textAnchor="end">{t.toLocaleString()}</text>
        </g>
      ))}
      {data.map((d, ci) => {
        const cx = padL + ci * bw + bw / 2;
        let acc = 0;
        return (
          <g key={ci}>
            {EC_SERIES.map((ser) => {
              if (!active[ser.key]) return null;
              const v = d[ser.key];
              const yTop = y(acc + v), yBot = y(acc);
              acc += v;
              return <rect key={ser.key} x={cx - barW / 2} y={yTop} width={barW} height={Math.max(0, yBot - yTop)} fill={ser.color} />;
            })}
            <text className="ec-xlbl" x={cx} y={H - 10} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function EnergyConsumptionScreen() {
  const [days, setDays] = React.useState(7);
  const [active, setActive] = React.useState({ DPT1: true, DPT2: true, DPT3: true, DPT4: true, INT: true });
  const data = React.useMemo(() => ecData(days), [days]);
  const toggle = (k) => setActive((a) => ({ ...a, [k]: !a[k] }));

  // sensor table stats across the window
  const stats = EC_SERIES.map((s) => {
    const vals = data.map((d) => d[s.key]);
    return {
      ...s,
      cur: vals[vals.length - 1],
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    };
  });

  return (
    <AppShell active="navigation" title="Energy Consumption" crumbs={["Facility utilities"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Facility-wide power draw by department · outside the building hierarchy</p>
          </div>
          <div className="pagehead-right">
            <button className="btn btn-secondary" title="Back to the site plan" onClick={() => window.__njGoPlan && window.__njGoPlan()}><Icon name="map" size={15} /> Site Plan</button>
          </div>
        </div>
      </div>

      <div className="ec-cards">
        <EcDeptCard name="DPT1: Start Feeding" mode="GROWTH" power="53.9" today="560.4" yesterday="1,246.9" total="2,528,476" />
        <EcDeptCard name="DPT2: Growth" mode="GROWTH" power="85.9" today="956.7" yesterday="2,220.1" total="7,923,047" />
        <EcDeptCard name="DPT3: Growth" mode="GROWTH" power="203.8" today="2,154.0" yesterday="4,788.0" total="9,023,381" />
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="bar-chart-3" size={17} color="var(--slate-600)" /><span className="card-title">Consumption</span></div>
          <div className="segmented ec-range">
            {[7, 14, 30].map((d) => <button key={d} className={"seg" + (d === days ? " active" : "")} onClick={() => setDays(d)}>Last {d} days</button>)}
          </div>
        </div>
        <div className="card-body">
          <EcChart data={data} active={active} />
          <div className="ec-legend">
            {EC_SERIES.map((s) => (
              <button key={s.key} className={"ec-leg" + (active[s.key] ? "" : " off")} onClick={() => toggle(s.key)}>
                <span className="ec-swatch" style={{ background: s.color }} />{s.label}
              </button>
            ))}
          </div>
          <div className="pagehead-right">
            <button className="btn btn-secondary" title="Back to the site plan" onClick={() => window.__njGoPlan && window.__njGoPlan()}><Icon name="map" size={15} /> Site Plan</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="activity" size={17} color="var(--slate-600)" /><span className="card-title">Sensors</span></div>
          <span className="caption">kW · {days}-day window</span>
        </div>
        <table className="tbl ec-tbl">
          <thead>
            <tr><th>Sensor name</th><th className="num">Current</th><th className="num">Minimum</th><th className="num">Maximum</th><th className="num">Average</th></tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.key} className={active[s.key] ? "" : "ec-tr-off"}>
                <td className="lbl">
                  <button className="ec-checkrow" onClick={() => toggle(s.key)}>
                    <span className={"ec-check" + (active[s.key] ? " on" : "")} style={active[s.key] ? { background: s.color, borderColor: s.color } : null}>
                      {active[s.key] && <Icon name="check" size={11} color="#fff" />}
                    </span>
                    <span className="ec-swatch" style={{ background: s.color }} />
                    <span className="td-strong">{s.label}</span>
                  </button>
                </td>
                <td className="num td-strong">{s.cur.toLocaleString()}</td>
                <td className="num">{s.min.toLocaleString()}</td>
                <td className="num">{s.max.toLocaleString()}</td>
                <td className="num">{s.avg.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

window.EnergyConsumptionScreen = EnergyConsumptionScreen;
// shared with the mobile app so both surfaces read one energy dataset
Object.assign(window, { EC_SERIES, EC_BASE, ecData });
