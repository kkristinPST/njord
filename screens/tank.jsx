// tank.jsx — Fish Tank screen: one consolidated data card per tank.
// Primary readouts (O₂, level, valve, feeding, key fish figures) live on the card.
// Secondary/editable detail (oxygen dosing, emergency O₂, fish data + movement,
// feeding parameters, alarm limits, trends) lives in a per-tank Parameters drawer
// (window.FishTankDock) — mirroring the process-screen dock (RasDock).
// Clicking the O₂ or Level value opens the standard equipment popup (openEquipment),
// exactly like a process sensor. Every editable value routes through njEditParam.

// O₂ status is derived from the tank's CONFIGURED limits — the O₂ dosing setpoint and the
// emergency-O₂ opening limit, both editable parameters in the tank dock. There is no
// "welfare band" in the system, so none is implied here.
function o2Limits(t) {
  const d = (window.TANK_PANELS || [])[0] || { o2sp: 90, emgLimit: 82, hyst: 2.5 };
  return { sp: (t && t.o2sp) || d.o2sp, emg: (t && t.emgLimit) || d.emgLimit, hyst: (t && t.hyst) || d.hyst || 0 };
}
function o2Status(o2, t) {
  const L = o2Limits(t);
  if (o2 < L.emg) return "critical";
  if (o2 < L.sp - L.hyst) return "high";
  return "ok";
}
function o2Color(o2, t) {
  const st = o2Status(o2, t);
  return st === "critical" ? "var(--critical-text)" : st === "high" ? "var(--warning-text)" : "var(--success-text)";
}

// ── sensor equipment specs (opened from the card's O₂ / Level readouts) ──
function tankO2Equip(t) {
  const st = o2Status(t.o2, t);
  return {
    tag: t.tag + "-QT1", name: "O₂ in Tank " + t.n, kind: "sensor", status: st,
    noMode: true, canStartStop: false, runLabel: "Measuring",
    primary: { l: "O₂ saturation", v: t.o2.toFixed(1), u: "%" },
    readouts: [
      { l: "O₂ saturation", v: t.o2.toFixed(1), u: "%", accent: o2Color(t.o2, t), tag: t.tag + "-QT1" },
      { l: "Dosing setpoint", v: t.o2sp.toFixed(1), u: "%" },
      { l: "Emergency O₂ open today", v: t.openToday.toFixed(2), u: "%" },
    ],
    trend: { label: "O₂ saturation", base: t.o2, amp: 4, seed: t.n + 0.5, unit: "%", color: "var(--success)", hi: 120, lo: 77 },
    limits: [{ l: "O₂ saturation · QT1", v: t.o2.toFixed(1), u: "%", hi: 120, lo: 77, step: 0.5 }],
  };
}
function tankLevelEquip(t) {
  return {
    tag: t.tag + "-LT1", name: "Level in Tank " + t.n, kind: "sensor", status: "ok",
    noMode: true, canStartStop: false, runLabel: "Measuring",
    primary: { l: "Water level", v: String(t.level), u: "cm" },
    readouts: [{ l: "Water level", v: String(t.level), u: "cm", tag: t.tag + "-LT1" }],
    trend: { label: "Water level", base: t.level, amp: 6, seed: t.n + 1.2, unit: "cm", hi: 215, lo: 185 },
    limits: [{ l: "Water level · LT1", v: String(t.level), u: "cm", hi: 215, lo: 185, step: 1 }],
  };
}

// ── a clickable hero readout that opens the equipment popup (+ send-to-trends icon) ──
function ReadoutBtn({ label, value, unit, accent, tag, name, spec }) {
  return (
    <div className="ro ro-hero ro-click" role="button" tabIndex={0}
      title={"Open " + name}
      onClick={() => openEquipment(spec)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEquipment(spec); } }}>
      <span className="ro-lbl">{label}</span>
      <span className="data ro-val" style={accent ? { color: accent } : null}>{value} <span className="u">{unit}</span></span>
      <span className="ro-trendwrap" onClick={(e) => e.stopPropagation()}>
        <TrendBtn id={tag} tag={tag} name={label} unit={unit} value={value} group={"Fish Tank " + name} />
      </span>
      <Icon name="arrow-up-right" size={13} color="var(--slate-300)" className="ro-open" />
    </div>
  );
}

// mass formatter — tonnes at scale, kg below 1 t (keeps small smolt readable)
function fmtMass(kg) {
  if (kg >= 1000) return (kg / 1000).toFixed(kg >= 10000 ? 0 : 1) + " t";
  return Math.round(kg) + " kg";
}

// ── design-capacity utilization: biomass vs the max planned for this tank ──
function TankCapacity({ t }) {
  const max = t.maxBiomass || 0;
  const pct = max > 0 ? (t.biomass / max) * 100 : 0;
  const over = pct > 100;
  return (
    <div className="tank-cap">
      <div className="tank-cap-head">
        <span className="tstat-l">Planned capacity</span>
        <span className="data tank-cap-pct" style={over ? { color: "var(--warning-text)" } : null}>{pct.toFixed(0)}<span className="u"> %</span></span>
      </div>
      <div className="tank-cap-bar">
        <span className={"tank-cap-fill" + (over ? " over" : "")} style={{ width: Math.min(100, pct) + "%" }} />
      </div>
      <div className="tank-cap-sub">{fmtMass(t.biomass)} of {fmtMass(max)} planned max</div>
      {over && (
        <div className="tank-cap-note"><Icon name="info" size={12} /> Over planned capacity: may add O₂ &amp; MBBR load.</div>
      )}
    </div>
  );
}

// ── one small labelled stat (control valve / emergency O₂ / feeding) ──
function TankStat({ label, children }) {
  return (
    <div className="tstat">
      <span className="tstat-l">{label}</span>
      <span className="tstat-v">{children}</span>
    </div>
  );
}

function TankPanel({ t, onParams }) {
  const o2col = o2Color(t.o2);
  return (
    <div className="card tank-panel">
      <div className="tank-head">
        <div className="tank-id">
          <span className="tank-title">Tank {t.n}</span>
          <span className="tag tank-tag">{t.tag}</span>
        </div>
        <span className={"tank-state " + (t.active ? "on" : "off")}>
          <Dot level={t.active ? "ok" : "high"} size={7} /> {t.active ? "Active" : "Deactivated"}
        </span>
      </div>

      <div className="tank-readouts">
        <ReadoutBtn label="O₂ SAT" value={t.o2.toFixed(1)} unit="%" accent={o2col} name={"O₂ in Tank " + t.n} tag={t.tag + "-QT1"} spec={tankO2Equip(t)} />
        <ReadoutBtn label="LEVEL" value={t.level} unit="cm" name={"Level in Tank " + t.n} tag={t.tag + "-LT1"} spec={tankLevelEquip(t)} />
      </div>

      <div className="tank-stats">
        <TankStat label="Control valve">
          <span className="data tstat-num">{t.ctrl}<span className="u"> %</span></span>
          <span className="tstat-bar"><span className="tstat-fill" style={{ width: t.ctrl + "%" }} /></span>
        </TankStat>
        <TankStat label="Emergency O₂">
          <span className={"tstat-chip " + (t.emgO2 ? "open" : "closed")}>{t.emgO2 ? "Open" : "Closed"}</span>
        </TankStat>
        <TankStat label="Feeding">
          <span className={"tstat-chip " + (t.feeding ? "on" : "idle")}><Dot level={t.feeding ? "ok" : "low"} size={6} /> {t.feeding ? "On" : "Idle"}</span>
        </TankStat>
      </div>

      <div className="tank-fish">
        <div className="tfish"><span className="tfish-l">Biomass</span><span className="data tfish-v">{t.biomass}<span className="u"> kg</span></span></div>
        <div className="tfish"><span className="tfish-l">Avg weight</span><span className="data tfish-v">{t.avgWt.toFixed(1)}<span className="u"> g</span></span></div>
        <div className="tfish"><span className="tfish-l">Population</span><span className="data tfish-v">{t.population.toLocaleString()}</span></div>
      </div>

      <TankCapacity t={t} />

      <button className="btn btn-secondary tank-params-btn" onClick={() => onParams(t.n)}>
        <Icon name="sliders-horizontal" size={15} /> Parameters
      </button>
    </div>
  );
}

const TANK_PANELS = [
  { n: 1, tag: "DPT1-FTA1", ctrl: 26, o2: 89.6, level: 199, feeding: true, active: true, emgO2: false,
    biomass: 338, density: 6.24, population: 148778, volume: 54, avgWt: 2.3, maxBiomass: 560,
    o2sp: 90, emgLimit: 82, hyst: 2.5, openToday: 0.0, openYest: 0.04, feedTarget: 9.6, activity: 75, paused: false, screw: "Running" },
  { n: 2, tag: "DPT1-FTA2", ctrl: 47, o2: 80.7, level: 204, feeding: true, active: true, emgO2: true,
    biomass: 361, density: 6.68, population: 151020, volume: 54, avgWt: 2.4, maxBiomass: 350,
    o2sp: 90, emgLimit: 82, hyst: 2.5, openToday: 0.62, openYest: 0.18, feedTarget: 10.2, activity: 80, paused: false, screw: "Running" },
  { n: 3, tag: "DPT1-FTA3", ctrl: 42, o2: 82.9, level: 207, feeding: true, active: true, emgO2: false,
    biomass: 349, density: 6.46, population: 149640, volume: 54, avgWt: 2.3, maxBiomass: 560,
    o2sp: 90, emgLimit: 82, hyst: 2.5, openToday: 0.11, openYest: 0.05, feedTarget: 9.8, activity: 78, paused: false, screw: "Running" },
  { n: 4, tag: "DPT1-FTA4", ctrl: 24, o2: 88.3, level: 204, feeding: false, active: false, emgO2: false,
    biomass: 0, density: 0, population: 0, volume: 54, avgWt: 0, maxBiomass: 560,
    o2sp: 90, emgLimit: 82, hyst: 2.5, openToday: 0.0, openYest: 0.0, feedTarget: 0, activity: 0, paused: true, screw: "Stopped" },
];

function PumpStat({ tag, label, value, unit, glyph, alarm }) {
  return (
    <div className="pump-stat">
      <span className={"pump-glyph" + (alarm ? " alarm" : "")}><Icon name={glyph} size={22} /></span>
      <div className="pump-meta">
        <span className="tag">{tag}</span>
        <span className="caption">{label}</span>
        <span className="data pump-big">{value} <span className="u">{unit}</span></span>
      </div>
    </div>
  );
}

function TankScreen() {
  const [dockTank, setDockTank] = React.useState(null);
  const tank = TANK_PANELS.find((t) => t.n === dockTank);
  const Dock = window.FishTankDock;
  React.useEffect(() => {
    if (dockTank == null) return;
    const onKey = (e) => { if (e.key === "Escape") setDockTank(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockTank]);
  return (
    <AppShell active="navigation" title="Fish Tank" statusLevel="critical">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">RAS-A · 4 tanks</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Fish Tank" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={15} /> Trends</button>
      </div>

      <div className="tank-stack">
        <div className="card">
          <div className="card-head">
            <div className="card-head-l"><Icon name="gauge" size={17} color="var(--slate-600)" /><span className="card-title">Tank Vitals</span>
              <span className="caption">All tanks on one scale · O₂ saturation, water level, pump sump</span></div>
          </div>
          <div className="card-body tv-body">
            {/* scoped to the same source as the cards below (TANK_PANELS = DPT1) so the rail and
                the cards can never disagree; the dashboard card is the one that re-scopes. */}
            {window.TankVitalsRail ? <TankVitalsRail buildingId="b1" deptId="b1-d1" onOpen={(t) => setDockTank(t.n)} /> : null}
          </div>
        </div>
        <div className="tank-row">
          {TANK_PANELS.map((t) => <TankPanel key={t.n} t={t} onParams={setDockTank} />)}
        </div>

        <div className="card pump-card">
          <div className="pump-head">
            <span className="eyebrow">Pump Sump · Fish Tank</span>
            <span className="tag" style={{ color: "var(--slate-400)" }}>DPT1-SMP0</span>
          </div>
          <div className="pump-strip">
            <PumpStat tag="DPT1-SMP0-LT1" label="Level in pump sump" value="193" unit="cm" glyph="waves" />
            <div className="pump-vdiv" />
            <PumpStat tag="DPT1-FTA0-PU1" label="Drain pump: stopped" value="0" unit="Hz" glyph="fan" alarm />
            <div className="pump-vdiv" />
            <PumpStat tag="DPT1-FTA0-FT1" label="Drain flow" value="0" unit="L/s" glyph="activity" />
            <div className="pump-vdiv" />
            <PumpStat tag="DPT1-FTA0-PT1" label="Sump pressure" value="0.4" unit="bar" glyph="gauge" />
          </div>
        </div>
      </div>

      {/* per-tank parameter drawer: same dock pattern as process screens */}
      {dockTank != null && <div className="dock-drawer-scrim" onClick={() => setDockTank(null)} />}
      <div className={"dock-drawer" + (dockTank != null ? " open" : "")} aria-hidden={dockTank == null}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDockTank(null)}><Icon name="x" size={18} /></button>
        {tank && Dock && <Dock tank={tank} tanks={TANK_PANELS} onSwitch={setDockTank} />}
      </div>
    </AppShell>
  );
}

window.TankScreen = TankScreen;
Object.assign(window, { o2Status, o2Color, o2Limits, tankO2Equip, tankLevelEquip, TANK_PANELS, fmtMass });
