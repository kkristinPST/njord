// overview.jsx — DPT2 department-combined process Overview (Building 3 → DPT2 → Overview).
// Rebuilt in the RAS process-mimic language (faithful P&ID): the `.rasm` svg + `.rasm-pipe`
// connectors, the RAS symbol set (SymPump / SymFan / SymCone / RD readouts / ModeChip /
// SymTrend / Tag2 / Flag / SumpBasin), the gridded `.rasm-body` card, the run/stop legend and
// the fullscreen SCADA view — matching RAS, Water Treatment, Lye Dosing, etc. Reached via the
// NavigationView registry (DeptTabs "Overview"). Symbols come from ras-mimic.jsx (on window).

function ovEq(tag, name, kind, extra) { return () => openEquipment(njBuildEquip(tag, name, kind, extra)); }

// generic process vessel drawn in the RAS vessel language (sc-* tokens), proportional fill
function OvVessel({ x, y, w, h, fill = 0.55 }) {
  const wh = Math.max(0, (h - 12) * fill);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="8" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      <rect x={x + 5} y={y + h - 6 - wh} width={w - 10} height={wh} rx="5" fill="var(--sc-water)" opacity="0.5" />
    </g>
  );
}

// pump / fan cluster in the RAS layout: value readout above, mode chip + trend icon, tag below
function OvPump({ cx, cy, tag, name, group, value, unit = "Hz", running, mode = "A", fan, onClick }) {
  return (
    <g>
      <Eq title={name} onClick={onClick}>{fan ? <SymFan cx={cx} cy={cy} running={running} /> : <SymPump cx={cx} cy={cy} running={running} />}</Eq>
      <ModeChip x={cx - 40} y={cy - 8} mode={mode} />
      <SymTrend cx={cx + 30} cy={cy} tag={tag} name={name} group={group} running={running} />
      <RD x={cx - 33} y={cy - 50} w={66} value={value} unit={unit} tag={tag} name={name + " speed"} group={group} />
      <Tag2 x={cx} y={cy + 37} tag={tag} desc={[name]} />
    </g>
  );
}

// per-cell vertical bar-gauge cluster (Oxygen saturation / tank level)
function OvGauge({ x, y, title, items, max, dec = 1 }) {
  const bw = 15, gap = 12, barH = 92, top = y + 24, bot = top + barH;
  return (
    <g>
      <text className="ov-g-title" x={x} y={y}>{title}</text>
      {items.map((v, i) => {
        const bx = x + i * (bw + gap), cx = bx + bw / 2;
        const frac = Math.max(0.05, Math.min(1, v / max));
        const fh = frac * barH, fy = bot - fh;
        return (
          <g key={i}>
            <text className="ov-g-idx" x={cx} y={y + 16} textAnchor="middle">{i + 1}</text>
            <rect x={bx} y={top} width={bw} height={barH} rx="4" fill="var(--slate-100)" stroke="var(--slate-200)" strokeWidth="1" />
            <rect x={bx} y={fy} width={bw} height={fh} rx="4" fill="var(--primary)" opacity="0.82" />
            <text className="ov-g-val" x={cx} y={bot + 16} textAnchor="middle">{v.toFixed(dec)}</text>
          </g>
        );
      })}
    </g>
  );
}

// fluid-tagged pipe network (NJ_FLUIDS)
const OV_PIPES = [
  { k: "o2",    d: "M136,95 H700 V250" },        // O₂ tank inlet → cone top
  { k: "raw",   d: "M136,320 H300" },            // raw water · EP → degasser
  { k: "proc",  d: "M360,450 V492" },            // degasser → oxygenation pump
  { k: "proc",  d: "M420,450 V470 H540 V492" },  // degasser → main pump
  { k: "proc",  d: "M360,532 V560 H690 V376" },  // oxygenation pump → cone bottom
  { k: "proc",  d: "M540,532 V548 H720 V376" },  // main pump → cone
  { k: "proc",  d: "M760,312 H820" },            // cone → header sensors
  { k: "proc",  d: "M960,300 H1090" },           // header → fish tank
  { k: "proc",  d: "M1230,392 V530 H520 V566" }, // fish tank → sump (pre-filter)
  { k: "proc",  d: "M580,626 H630" },            // sump pre → drum filter
  { k: "proc",  d: "M740,626 H790" },            // drum filter → sump (post-filter)
  { k: "drain", d: "M900,626 H978" },            // sump post → drain pump
  { k: "drain", d: "M1042,626 H1180" },          // drain pump → drain HX
  { k: "drain", d: "M850,686 V750 H978", idle: true }, // sump post → slaughterhouse pump (idle)
  { k: "drain", d: "M820,686 V689 H1180" },      // sump post → fish barrier (gravity)
];

function OvMimic() {
  return (
    <svg className="rasm ov-mimic" viewBox="0 0 1500 820" role="img" aria-label="DPT2 process overview mimic" preserveAspectRatio="xMidYMid meet">
      {OV_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k + (p.idle ? " fl-idle" : "")} />)}

      {/* inlets */}
      <Flag x={40} y={78} label="O₂ tank" dir="r" />
      <Flag x={40} y={303} label="Raw water · EP" dir="r" />

      {/* raw-water degasser valve readout */}
      <RD x={200} y={303} w={62} value="81.3" unit="%" tag="DPT2-STR0-RV1" name="Degasser valve" group="Overview" />
      <Tag2 x={231} y={352} tag="DPT2-STR0-RV1" desc={["Degasser valve"]} />

      {/* CO₂ degasser + fan */}
      <Eq title="CO₂ Degasser" onClick={ovEq("DPT2-STR0-LT1", "CO₂ Degasser", "vessel", { primary: { l: "Level", v: "89.8", u: "cm" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Degasser level", v: "89.8", u: "cm", tag: "DPT2-STR0-LT1" }, { l: "Degasser valve", v: "81.3", u: "%", tag: "DPT2-STR0-RV1" }],
        trend: { label: "Degasser level", base: 90, amp: 6, seed: 2.2, unit: "cm", hi: 120, lo: 0 },
        limits: [{ l: "CO₂ degasser level · STR0-LT1", v: "120.0", u: "cm", hi: 120, lo: 0, step: 1 }] })}>
        <OvVessel x={300} y={240} w={170} h={210} fill={0.42} />
      </Eq>
      <RD x={352} y={330} w={66} value="89.8" unit="cm" tag="DPT2-STR0-LT1" name="Degasser level" group="Overview" />
      <Tag2 x={385} y={432} tag="DPT2-STR0" desc={["CO₂ degasser"]} />
      <OvPump cx={385} cy={200} tag="DPT2-STR0-AV1" name="Degasser fan" group="Overview" value="Run" unit="" running mode="A" fan
        onClick={ovEq("DPT2-STR0-AV1", "CO₂ Degasser Fan", "fan", { primary: { l: "Status", v: "Running" },
          readouts: [{ l: "Run command", v: "On" }, { l: "Degasser valve", v: "81.3", u: "%" }] })} />

      {/* pumps */}
      <OvPump cx={360} cy={512} tag="DPT2-DOX0-PU1" name="Oxygenation pump" group="Overview" value="42" unit="Hz" running mode="A"
        onClick={ovEq("DPT2-DOX0-PU1", "Oxygenation Pump", "pump", { primary: { l: "Speed", v: "42", u: "Hz" },
          readouts: [{ l: "Speed", v: "42", u: "Hz", tag: "DPT2-DOX0-PU1" }, { l: "O₂ cone pressure", v: "2.67", u: "bar", tag: "DPT2-DOX0-PT1" }],
          setpoints: [{ key: "s", l: "Cone pressure setpoint", v: 2.7, u: "bar", step: 0.05, min: 0, max: 6 }],
          trend: { label: "Pump speed", base: 42, amp: 5, seed: 1.4, unit: "Hz", hi: 60 } })} />
      <OvPump cx={540} cy={512} tag="DPT2-SMP0-PU1" name="Main pump" group="Overview" value="33" unit="Hz" running mode="A"
        onClick={ovEq("DPT2-SMP0-PU1", "Main Pump", "pump", { primary: { l: "Speed", v: "33", u: "Hz" },
          readouts: [{ l: "Speed", v: "33", u: "Hz", tag: "DPT2-SMP0-PU1" }, { l: "Header temperature", v: "11.6", u: "°C", tag: "DPT2-SMP0-TT1" }, { l: "Make-up water", v: "0.22", u: "bar", tag: "DPT2-SMP0-PT1" }],
          setpoints: [{ key: "f", l: "Flow setpoint", v: 33, u: "Hz", step: 0.5, min: 0, max: 60 }],
          trend: { label: "Pump speed", base: 33, amp: 4, seed: 3.1, unit: "Hz", hi: 60 } })} />

      {/* O₂ cone */}
      <Eq title="O₂ Cone" onClick={ovEq("DPT2-DOX0-PT1", "Oxygen Cone", "vessel", { primary: { l: "Cone pressure", v: "2.67", u: "bar" }, canStartStop: false, noMode: true,
        trend: { label: "Cone pressure", base: 2.67, amp: 0.3, seed: 2.0, unit: "bar", hi: 6 },
        limits: [{ l: "O₂ cone pressure · DOX0-PT1", v: "5.00", u: "bar", hi: 5, lo: 0, step: 0.1 }] })}>
        <SymCone cx={705} cy={312} s={1.5} />
      </Eq>
      <RD x={672} y={250} w={66} value="2.67" unit="bar" tag="DPT2-DOX0-PT1" name="O₂ cone pressure" group="Overview" />
      <Tag2 x={705} y={392} tag="DPT2-DOX0" desc={["O₂ cone"]} />

      {/* header sensors */}
      <RD x={820} y={252} w={66} value="11.6" unit="°C" tag="DPT2-SMP0-TT1" name="Header temperature" group="Overview" />
      <RD x={820} y={286} w={66} value="0.22" unit="bar" tag="DPT2-SMP0-PT1" name="Make-up water pressure" group="Overview" />
      <Tag2 x={853} y={330} tag="DPT2-SMP0" desc={["Header sensors"]} />

      {/* fish tank + per-cell gauges */}
      <Eq title="Fish Tank · DPT2" onClick={() => { setCtx("b3", "b3-d2"); window.__njNavSub = "Fish Tank"; if (window.__njDeptTab) window.__njDeptTab("Fish Tank"); }}>
        <OvVessel x={1090} y={150} w={280} h={242} fill={0.62} />
      </Eq>
      <OvGauge x={1108} y={186} title="OXYGEN · %sat" items={[90.4, 84.9, 81.6, 81.8]} max={110} dec={1} />
      <OvGauge x={1258} y={186} title="LEVEL · cm" items={[173, 170, 172, 176]} max={210} dec={0} />
      <Tag2 x={1230} y={410} tag="DPT2-FTA0" desc={["Fish tank · 4 cells"]} />

      {/* drain / filter train */}
      <RD x={366} y={612} w={62} value="11.5" unit="°C" tag="DPT2-SMP1-TT1" name="Drain temperature" group="Overview" />
      <Eq title="Sump · pre-filter" onClick={ovEq("DPT2-SMP1-LT1", "Sump · pre-filter", "vessel", { primary: { l: "Level", v: "52.8", u: "cm" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Level", v: "52.8", u: "cm", tag: "DPT2-SMP1-LT1" }], trend: { label: "Sump level", base: 53, amp: 8, seed: 1.1, unit: "cm", hi: 120, lo: 0 } })}>
        <SumpBasin x={440} y={566} w={140} h={120} />
      </Eq>
      <RD x={477} y={586} w={66} value="52.8" unit="cm" tag="DPT2-SMP1-LT1" name="Sump pre-filter level" group="Overview" />
      <Tag2 x={510} y={702} tag="DPT2-SMP1" desc={["Sump · pre-filter"]} />

      <Eq title="Drum Filter" onClick={ovEq("DPT2-FIL0", "Drum Filter", "drumfilter", { primary: { l: "Differential", v: "10", u: "cm" },
        readouts: [{ l: "Level before", v: "52.8", u: "cm" }, { l: "Level after", v: "42.4", u: "cm" }] })}>
        <OvVessel x={630} y={566} w={110} h={120} fill={0.5} />
      </Eq>
      <Tag2 x={685} y={702} tag="DPT2-FIL0" desc={["Drum filter"]} />

      <Eq title="Sump · post-filter" onClick={ovEq("DPT2-SMP2-LT1", "Sump · post-filter", "vessel", { primary: { l: "Level", v: "42.4", u: "cm" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Level", v: "42.4", u: "cm", tag: "DPT2-SMP2-LT1" }], trend: { label: "Sump level", base: 42, amp: 6, seed: 2.7, unit: "cm", hi: 120, lo: 0 } })}>
        <SumpBasin x={790} y={566} w={110} h={120} />
      </Eq>
      <RD x={812} y={586} w={66} value="42.4" unit="cm" tag="DPT2-SMP2-LT1" name="Sump post-filter level" group="Overview" />
      <Tag2 x={845} y={702} tag="DPT2-SMP2" desc={["Sump · post-filter"]} />

      <OvPump cx={1008} cy={626} tag="DPT2-ENS0-PU1" name="Drain pump" group="Overview" value="60" unit="Hz" running mode="A"
        onClick={ovEq("DPT2-ENS0-PU1", "Drain Pump", "pump", { primary: { l: "Speed", v: "60", u: "Hz" },
          readouts: [{ l: "Speed", v: "60", u: "Hz", tag: "DPT2-ENS0-PU1" }], setpoints: [{ key: "f", l: "Speed setpoint", v: 60, u: "Hz", step: 0.5, min: 0, max: 60 }],
          trend: { label: "Pump speed", base: 60, amp: 0, seed: 1, unit: "Hz", hi: 60 } })} />
      <OvPump cx={1008} cy={750} tag="DPT2-EFL0-PU1" name="Slaughterhouse pump" group="Overview" value="0" unit="Hz" running={false} mode="A"
        onClick={ovEq("DPT2-EFL0-PU1", "Slaughterhouse Pump", "pump", { primary: { l: "Speed", v: "0", u: "Hz" }, status: "low",
          readouts: [{ l: "Speed", v: "0", u: "Hz", tag: "DPT2-EFL0-PU1" }], setpoints: [{ key: "f", l: "Speed setpoint", v: 0, u: "Hz", step: 0.5, min: 0, max: 60 }] })} />

      {/* outlets */}
      <Flag x={1180} y={609} label="Drain HX" dir="r" />
      <Flag x={1180} y={672} label="Fish barrier" dir="r" />
      <Flag x={1180} y={735} label="Slaughterhouse" dir="r" />
    </svg>
  );
}

function OverviewScreen() {
  const { building, dept } = useCtx();
  const status = njSystemStatus(building.id, dept.id, "Overview");
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title="Overview" statusLevel={njSev(status)}>
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{building.name} · {dept.name} · process loop · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Overview" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={16} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={16} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="workflow" size={16} color="var(--slate-600)" /><span className="card-title">Process Overview · {dept.name} · {building.name}</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><OvMimic /></div>
        <div className="ras-legend">
          <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running</span>
          <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Stopped</span>
          <span className="ci"><span className="rasm-leg-chip">A</span> Auto</span>
          <span className="ci"><span className="rasm-leg-chip man">M</span> Manual</span>
          <span className="ras-leg-div" aria-hidden="true" />
          <FluidLegend of={["raw","proc","drain","o2"]} />
          <span className="ci" style={{ marginLeft: "auto", color: "var(--slate-500)" }}><Icon name="line-chart" size={14} /> Tap a value's trend icon → send to Trends</span>
        </div>
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="workflow" size={16} /> Process Overview · {dept.name} · {building.name} · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><ScadaZoom><OvMimic /></ScadaZoom></div>
        </div>
      )}
    </AppShell>
  );
}

window.OverviewScreen = OverviewScreen;
window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, { "Overview": OverviewScreen });

Object.assign(window, { OvMimic });
