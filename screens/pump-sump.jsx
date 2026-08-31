// pump-sump.jsx — faithful Building 2 · DPT3 Pump Sump process mimic, rebuilt from the legacy
// SCADA capture in the NJORD DS language. Same approach as RAS / Water Treatment / Sludge:
//   • equipment (pumps / cones / valves) → click for popup
//   • every value readout shows an ALWAYS-ON trend icon to its right (RD from ras-mimic.jsx)
//   • consistent status coloring — green body = running, dark = stopped (pumps + valves)
// Reuses globals: SymPump, SymValve, SymCone, RD, Tag2, ModeChip, Eq (ras-mimic.jsx) + SlFlag,
// SlTank (sludge-treatment.jsx). Loaded AFTER systems-a.jsx so it overrides the old Pump Sump.

/* ───────────── pump-sump-specific helpers ───────────── */
// colored alarm/forced status square with an X glyph (analysis cabinet)
function PsStatusMark({ x, y, level }) {
  const c = level === "critical" ? "#F53E39" : "var(--warning)";
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width="17" height="17" rx="3" fill={c} />
      <path d={`M${x + 5},${y + 5} L${x + 12},${y + 12} M${x + 12},${y + 5} L${x + 5},${y + 12}`} stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}
// oxygenation pump column: kW + Hz readouts stacked above, pump, mode, label below
function PsOxyPump({ cx, n, kw, hz, running }) {
  const open = () => openEquipment(njBuildEquip("DPT3-DOX0-PU" + n, "Oxygenation pump " + n, "pump",
    { primary: { l: "Power", v: kw, u: "kW" }, running, readouts: [{ l: "Power", v: kw, u: "kW", tag: "DPT3-DOX0-PU" + n }, { l: "Speed", v: hz, u: "Hz" }] }));
  return (
    <g>
      <RD x={cx - 30} y={290} w={60} value={kw} unit="kW" tag={"DPT3-DOX0-PU" + n + "-PWR"} name={"Oxygenation pump " + n + " power"} group="Oxygenation" accent={running ? "var(--success-text)" : undefined} />
      <RD x={cx - 30} y={314} w={60} value={hz} unit="Hz" tag={"DPT3-DOX0-PU" + n} name={"Oxygenation pump " + n + " speed"} group="Oxygenation" />
      <Eq title={"Oxygenation pump " + n} onClick={open}><SymPump cx={cx} cy={358} running={running} /></Eq>
      <ModeChip x={cx - 40} y={350} mode="A" />
      <SymTrend cx={cx + 30} cy={358} tag={"DPT3-DOX0-PU" + n} name={"Oxygenation pump " + n} group="Oxygenation" running={running} />
      <Tag2 x={cx} y={398} tag={"DPT3-DOX0-PU" + n} desc={["Oxygenation", "pump " + n]} />
    </g>
  );
}
// oxygen cone unit: a pair of dose valves above the cone + label
function PsCone({ cx, cy, n }) {
  return (
    <g>
      <SymValve cx={cx - 13} cy={cy - 54} s={0.78} running={true} />
      <SymValve cx={cx + 13} cy={cy - 54} s={0.78} running={true} />
      <Eq title={"O₂ cone " + n} onClick={() => openEquipment(njBuildEquip("DPT3-DOX0-CN" + n, "O₂ cone " + n, "vessel", { canStartStop: false, primary: { l: "Pressure", v: "2.0", u: "bar" }, readouts: [{ l: "Cone pressure", v: "2.0", u: "bar", tag: "DPT3-DOX0-PT1" }] }))}>
        <SymCone cx={cx} cy={cy} s={0.92} />
      </Eq>
      <text className="slm-cap" x={cx} y={cy + 38} textAnchor="middle">{"Cone " + n}</text>
    </g>
  );
}
// lift pump row: label left, Hz above, green inlet valve + pump, mode chip
function PsLiftPump({ cy, n, hz, running }) {
  return (
    <g>
      <Tag2 x={1004} y={cy - 18} anchor="end" tag={"DPT3-SMP0-PU" + n} desc={["Lift pump " + n]} />
      <RD x={1046} y={cy - 36} w={58} value={hz} unit="Hz" tag={"DPT3-SMP0-PU" + n} name={"Lift pump " + n + " speed"} group="Lift Pumps" accent={running ? "var(--success-text)" : undefined} />
      <SymValve cx={1058} cy={cy} s={0.74} running={running} />
      <Eq title={"Lift pump " + n} onClick={() => openEquipment("DPT3-SMP0-PU" + n)}><SymPump cx={1095} cy={cy} running={running} /></Eq>
      <ModeChip x={1010} y={cy - 8} mode="A" />
      <SymTrend cx={1132} cy={cy} tag={"DPT3-SMP0-PU" + n} name={"Lift pump " + n} group="Lift Pumps" running={running} />
    </g>
  );
}

/* ───────────── pipe network (gray hairlines) ───────────── */
// fluid-tagged pipe network (NJ_FLUIDS): returns/process water, oxygen gas to the cones.
const PSM_PIPES = [
  // left inputs → sump (returns from the loops)
  { k: "proc", d: "M126,475 H330" }, { k: "proc", d: "M126,542 H330" },
  { k: "proc", d: "M104,622 H330" }, { k: "proc", d: "M104,695 H330" },
  // sump → oxygenation pumps (riser + manifold)
  { k: "proc", d: "M500,485 V388 H425" }, { k: "proc", d: "M425,388 H663" },
  { k: "proc", d: "M425,336 V388" }, { k: "proc", d: "M548,336 V388" }, { k: "proc", d: "M663,336 V388" },
  // oxy pumps → cone feed
  { k: "proc", d: "M425,290 V250 H1240" }, { k: "proc", d: "M548,290 V250" }, { k: "proc", d: "M663,290 V250" },
  // oxygen supply bus → cones
  { k: "o2", d: "M805,205 V250" },
  { k: "o2", d: "M1240,250 V255" },
  { k: "proc", d: "M1210,255 H1320" },
  // header downpipe into sump
  { k: "proc", d: "M613,525 V618" },
  // sump → lift-pump draw manifold
  { k: "proc", d: "M660,540 H1020" }, { k: "proc", d: "M1020,470 V765" },
  { k: "proc", d: "M1020,470 H1044" }, { k: "proc", d: "M1020,540 H1044" }, { k: "proc", d: "M1020,610 H1044" },
  { k: "proc", d: "M1020,680 H1044" }, { k: "proc", d: "M1020,750 H1044" },
  // lift pumps → fish-tanks bus
  { k: "proc", d: "M1122,470 H1162" }, { k: "proc", d: "M1122,540 H1162" }, { k: "proc", d: "M1122,610 H1162" },
  { k: "proc", d: "M1122,680 H1162" }, { k: "proc", d: "M1122,750 H1162" },
  { k: "proc", d: "M1162,470 V750" }, { k: "proc", d: "M1162,610 H1320" },
  // sump → analysis pump
  { k: "proc", d: "M660,505 H768" },
  // sump → sorting water pump → sorting
  { k: "proc", d: "M540,790 V835 H1044" }, { k: "proc", d: "M1122,835 H1320" },
];

function PumpSumpMimic2() {
  const open = (t) => () => openEquipment(t);
  return (
    <svg className="rasm" viewBox="0 0 1456 900" role="img" aria-label="Pump sump process mimic" preserveAspectRatio="xMidYMid meet">
      {PSM_PIPES.map((q, i) => <path key={"p" + i} d={q.d} className={"rasm-pipe fl-" + q.k} />)}

      {/* ───── oxygen supply + cones ───── */}
      <SlFlag x={695} y={188} w={110} label="Oxygen" />
      <PsCone cx={1185} cy={255} n={1} />
      <PsCone cx={1110} cy={292} n={2} />
      <PsCone cx={1035} cy={329} n={3} />
      <PsCone cx={960} cy={366} n={4} />
      <PsCone cx={885} cy={403} n={5} />
      <SlFlag x={1320} y={232} w={110} label="Fish Tanks" />

      {/* ───── oxygenation pumps ───── */}
      <Tag2 x={548} y={244} tag="DPT3-DOX0-PT1" desc={["Oxygen cone pressure"]} />
      <RD x={518} y={262} w={60} value="2.0" unit="bar" tag="DPT3-DOX0-PT1" name="Oxygen cone pressure" group="Oxygenation" />
      <PsOxyPump cx={425} n={1} kw="0.0" hz="0" running={false} />
      <PsOxyPump cx={548} n={2} kw="17.4" hz="39" running={true} />
      <PsOxyPump cx={663} n={3} kw="0.0" hz="0" running={false} />

      {/* ───── left inputs ───── */}
      <SlFlag x={8} y={458} w={118} label="Drain exchanger" />
      <SlFlag x={8} y={525} w={118} label="Top exchanger" />
      <SlFlag x={8} y={605} w={96} label="MBBR" />
      <SlFlag x={8} y={678} w={96} label="Lye" />

      {/* ───── analysis cabinet (sensor cluster) ───── */}
      <PsStatusMark x={455} y={437} level="critical" />
      <RD x={481} y={435} w={70} value="2" unit="mg/l" tag="DPT3-SMP0-QT1" name="CO₂ in pump sump" group="Analysis" />
      <PsStatusMark x={455} y={461} level="warning" />
      <RD x={481} y={459} w={70} value="99.0" unit="%" tag="DPT3-SMP0-QT2" name="O₂ saturation in pump sump" group="Analysis" accent="var(--success-text)" />
      <PsStatusMark x={455} y={485} level="warning" />
      <RD x={481} y={483} w={70} value="7.4" unit="pH" tag="DPT3-SMP0-QT3" name="pH 1 in pump sump" group="Analysis" />
      <PsStatusMark x={455} y={509} level="warning" />
      <RD x={481} y={507} w={70} value="7.4" unit="pH" tag="DPT3-SMP0-QT4" name="pH 2 in pump sump" group="Analysis" />

      {/* header / degasser box + analysis pump */}
      <rect className="wtm-skid" x={590} y={455} width={46} height={70} rx="6" />
      <Eq title="Analysis pump" onClick={open("DPT3-SMP0-PU6")}><SymPump cx={790} cy={440} running={true} /></Eq>
      <ModeChip x={750} y={432} mode="A" />
      <SymTrend cx={820} cy={440} tag="DPT3-SMP0-PU6" name="Analysis pump" group="Pump Sump" running={true} />
      <Tag2 x={790} y={480} tag="DPT3-SMP0-PU6" desc={["Analysis pump"]} />

      {/* ───── pump sump (tank) ───── */}
      <Eq title="Pump sump" onClick={open(njBuildEquip("DPT3-SMP0-LT1", "Pump sump", "vessel", { canStartStop: false, primary: { l: "Level", v: "259", u: "cm" }, readouts: [{ l: "Level in pump sump", v: "259", u: "cm", tag: "DPT3-SMP0-LT1" }] }))}>
        <SlTank x={330} y={485} w={330} h={305} />
      </Eq>
      {/* level gauge inside */}
      <rect x={624} y={620} width={14} height={160} rx="2" fill="var(--sc-fill-lite)" stroke="var(--sc-line)" strokeWidth="1" />
      <path d="M626,652 l10,6 l-10,6 Z" fill="var(--ink)" />

      <Tag2 x={716} y={585} tag="DPT3-SMP0-LT1" desc={["Level in pump sump"]} />
      <RD x={672} y={608} w={72} value="259" unit="cm" tag="DPT3-SMP0-LT1" name="Level in pump sump" group="Pump Sump" />

      {/* sump internal pumps */}
      <RD x={348} y={720} w={58} value="42" unit="Hz" tag="DPT3-ENS0-PU1" name="Top exchanger pump speed" group="Pump Sump" accent="var(--success-text)" />
      <Eq title="Top exchanger pump" onClick={open("DPT3-ENS0-PU1")}><SymPump cx={378} cy={755} running={true} /></Eq>
      <ModeChip x={338} y={747} mode="A" />
      <SymTrend cx={408} cy={755} tag="DPT3-ENS0-PU1" name="Top exchanger pump" group="Pump Sump" running={true} />
      <Tag2 x={372} y={797} tag="DPT3-ENS0-PU1" desc={["Top exchanger pump"]} />

      <RD x={434} y={720} w={58} value="0" unit="Hz" tag="DPT3-ENS0-PU3" name="Drain pump speed" group="Pump Sump" />
      <Eq title="Drain pump" onClick={open("DPT3-ENS0-PU3")}><SymPump cx={464} cy={755} running={false} /></Eq>
      <ModeChip x={424} y={747} mode="M" />
      <SymTrend cx={494} cy={755} tag="DPT3-ENS0-PU3" name="Drain pump" group="Pump Sump" running={false} />
      <Tag2 x={476} y={797} tag="DPT3-ENS0-PU3" desc={["Drain pump"]} />

      {/* ───── lift pumps ───── */}
      <PsLiftPump cy={470} n={1} hz="41" running={true} />
      <PsLiftPump cy={540} n={2} hz="41" running={true} />
      <PsLiftPump cy={610} n={3} hz="0" running={false} />
      <PsLiftPump cy={680} n={4} hz="41" running={true} />
      <PsLiftPump cy={750} n={5} hz="41" running={true} />
      <SlFlag x={1320} y={602} w={110} label="Fish Tanks" />

      {/* tank pressure + temperature */}
      <Tag2 x={1238} y={452} anchor="start" tag="DPT3-SMP0-PT1" desc={["Tank pressure"]} />
      <RD x={1238} y={472} w={64} value="6.0" unit="mVs" tag="DPT3-SMP0-PT1" name="Tank pressure" group="Pump Sump" />
      <Tag2 x={1238} y={528} anchor="start" tag="DPT3-SMP0-TT1" desc={["Temperature in", "pump sump"]} />
      <RD x={1238} y={562} w={64} value="12.6" unit="°C" tag="DPT3-SMP0-TT1" name="Temperature in pump sump" group="Pump Sump" />

      {/* ───── sorting water pump ───── */}
      <RD x={1046} y={800} w={58} value="35" unit="Hz" tag="DPT3-FHA0-PU1" name="Sorting water pump speed" group="Sorting" accent="var(--success-text)" />
      <SymValve cx={1058} cy={835} s={0.74} running={true} />
      <Eq title="Sorting water pump" onClick={open(njBuildEquip("DPT3-FHA0-PU1", "Sorting water pump", "pump", { primary: { l: "Speed", v: "35", u: "Hz" }, running: true, readouts: [{ l: "Speed", v: "35", u: "Hz", tag: "DPT3-FHA0-PU1" }, { l: "Sorting water pressure", v: "1.3", u: "bar", tag: "DPT3-FHA0-PT1" }] }))}>
        <SymPump cx={1095} cy={835} running={true} />
      </Eq>
      <ModeChip x={1010} y={827} mode="M" />
      <SymTrend cx={1132} cy={835} tag="DPT3-FHA0-PU1" name="Sorting water pump" group="Pump Sump" running={true} />
      <Tag2 x={1095} y={875} tag="DPT3-FHA0-PU1" desc={["Sorting water pump"]} />
      <Tag2 x={1238} y={778} anchor="start" tag="DPT3-FHA0-PT1" desc={["Sorting water pressure"]} />
      <RD x={1238} y={798} w={64} value="1.3" unit="bar" tag="DPT3-FHA0-PT1" name="Sorting water pressure" group="Sorting" />
      <SlFlag x={1320} y={818} w={110} label="Sorting" />
    </svg>
  );
}

/* ───────────── parameter dock content ───────────── */
const PS2_TABS = ["Lift pumps", "Oxygenation", "Sorting & analysis"];
const PS2_PARAMS = {
  "Lift pumps": [
    { h: "Pump sump · DPT3-SMP0" },
    { l: "Level in pump sump", v: "259 cm", trend: true, trendTag: "DPT3-SMP0-LT1" },
    { l: "Level setpoint", v: "230 cm", edit: true, min: 0, max: 400, step: 1 },
    { l: "Tank pressure", v: "6.0 mVs", trend: true, trendTag: "DPT3-SMP0-PT1" },
    { l: "Pressure setpoint", v: "6.0 mVs", edit: true, min: 0, max: 12, step: 0.1 },
    { l: "Temperature in pump sump", v: "12.6 °C", trend: true, trendTag: "DPT3-SMP0-TT1" },
    { h: "Lift pumps · DPT3-SMP0-PU1…5" },
    { l: "Running pumps", v: "4 / 5" },
    { l: "Common speed", v: "41 Hz", trend: true, trendTag: "DPT3-SMP0-PU1" },
    { l: "Min speed", v: "30 Hz", edit: true, min: 0, max: 50, step: 1 },
    { l: "Max speed", v: "50 Hz", edit: true, min: 0, max: 50, step: 1 },
  ],
  "Oxygenation": [
    { h: "Oxygen cones · DPT3-DOX0" },
    { l: "Oxygen cone pressure", v: "2.0 bar", trend: true, trendTag: "DPT3-DOX0-PT1" },
    { l: "Pressure setpoint adjustment", mode: "Auto" },
    { l: "Oxygen cone pressure setpoint", v: "2.0 bar", edit: true, min: 0, max: 5, step: 0.1 },
    { l: "Max valve opening to tank", v: "33.4 %" },
    { l: "Max desired valve opening", v: "75 %", edit: true, min: 0, max: 100, step: 1 },
    { l: "Min desired valve opening", v: "15 %", edit: true, min: 0, max: 100, step: 1 },
    { h: "Oxygenation pumps · DPT3-DOX0-PU1…3" },
    { l: "Running pumps", v: "1 / 3" },
    { l: "Pump 2 power", v: "17.4 kW", trend: true, trendTag: "DPT3-DOX0-PU2-PWR" },
  ],
  "Sorting & analysis": [
    { h: "Sorting water · DPT3-FHA0" },
    { l: "Sorting water pressure", v: "1.3 bar", trend: true, trendTag: "DPT3-FHA0-PT1" },
    { l: "Sorting water pressure setpoint", v: "1.5 bar", edit: true, min: 0, max: 4, step: 0.1 },
    { l: "Sorting water pump speed", v: "35 Hz", trend: true, trendTag: "DPT3-FHA0-PU1" },
    { h: "Analysis cabinet · DPT3-SMP0 · QT/PT" },
    { l: "CO₂", v: "2 mg/l", trend: true, trendTag: "DPT3-SMP0-QT1" },
    { l: "O₂ saturation", v: "99.0 %", trend: true, trendTag: "DPT3-SMP0-QT2" },
    { l: "pH 1", v: "7.4 pH", trend: true, trendTag: "DPT3-SMP0-QT3" },
    { l: "pH 2", v: "7.4 pH", trend: true, trendTag: "DPT3-SMP0-QT4" },
  ],
};

function PumpSumpScreen2() {
  const [dock, setDock] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title="Pump Sump" systemLabel="Pump Sump">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Recirculation sump · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Pump Sump" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={16} /> Parameters</button>
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={16} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={16} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="arrow-down-to-line" size={16} color="var(--slate-600)" /><span className="card-title">Pump Sump · DPT3-SMP0 · Building 2</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><PumpSumpMimic2 /></div>
        <ScadaLegend fluids={["proc","o2"]} />
      </div>

      {dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={20} /></button>
        <ParamTabs dock tabs={PS2_TABS} params={PS2_PARAMS} title="Pump Sump · parameters" />
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="arrow-down-to-line" size={16} /> Pump Sump · DPT3-SMP0 · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><PumpSumpMimic2 /></div>
        </div>
      )}
    </AppShell>
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Pump Sump": PumpSumpScreen2,
});
Object.assign(window, { PumpSumpMimic2, PumpSumpScreen2 });
