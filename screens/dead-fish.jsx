// dead-fish.jsx — Building 2 · Support systems · Dead Fish (DFS0-FHA0), rebuilt from the legacy
// SCADA capture in the NJORD DS language. Vacuum collection: three dead-fish transport lines +
// flushing water feed a vacuum cyclone; the cyclone is emptied into the grinder tank, dosed with
// acid, and ground down. Same interaction model as the other process screens:
//   • equipment (valves / pumps / vacuum pump / grinder) → click for its popup
//   • every value readout carries a trend icon that sends the parameter to Trends
// Reuses globals: SymPump, SymFan, SymValve, RD, Tag2, ModeChip, Eq, SymTrend (ras-mimic.jsx),
// SlFlag + SlTank (sludge-treatment.jsx), ParamTabs (scada.jsx), openEquipment / njBuildEquip,
// ConfirmDialog + njToast. Loaded after pump-sump.jsx.

/* ───────────── dead-fish symbols ───────────── */
// vacuum cyclone: thick-walled vessel, cylindrical shoulder tapering to a flanged outlet
function DfCyclone({ x, y, w, h }) {
  const cx = x + w / 2, shoulder = y + h * 0.5, neck = 44, wall = 11;
  const body = (o) => `M${x + o},${y + 16 + o} Q${x + o},${y + o} ${x + 18},${y + o} H${x + w - 18} Q${x + w - o},${y + o} ${x + w - o},${y + 16 + o}`
    + ` V${shoulder} L${cx + neck / 2 - o},${y + h - o} H${cx - neck / 2 + o} L${x + o},${shoulder} Z`;
  return (
    <g aria-hidden="true">
      <path d={body(0)} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={body(wall)} fill="var(--sc-fill-lite)" stroke="var(--sc-edge)" strokeWidth="1.1" strokeLinejoin="round" />
      {/* level gauge column + fill */}
      <rect x={cx - 8} y={y + 26} width="16" height={h * 0.52} rx="2" fill="#fff" stroke="var(--sc-line)" strokeWidth="1" />
      <rect x={cx - 7} y={y + h * 0.52 - 22} width="14" height="47" fill="var(--sc-line)" opacity="0.75" />
      <path d={`M${cx - 6},${y + h * 0.36} l11,7 l-11,7 Z`} fill="var(--ink)" />
      {/* cone level switches */}
      <circle cx={cx} cy={y + h * 0.72} r="6" fill="var(--sc-line)" stroke="var(--sc-edge)" strokeWidth="1" />
      <circle cx={cx} cy={y + h * 0.85} r="6" fill="var(--sc-line)" stroke="var(--sc-edge)" strokeWidth="1" />
    </g>
  );
}
// grinder tank: open-top basin with a partial fill (SlTank's band sits too high for this vessel)
function DfBasin({ x, y, w, h, fill = 0.45 }) {
  const wall = 3;
  return (
    <g aria-hidden="true">
      <rect x={x + wall} y={y + h * (1 - fill)} width={w - wall * 2} height={h * fill - wall} fill="var(--sc-line)" opacity="0.5" />
      <path d={`M${x},${y} V${y + h} H${x + w} V${y}`} fill="none" stroke="var(--sc-edge)" strokeWidth={wall} strokeLinejoin="round" />
    </g>
  );
}
// acid IBC tote on its pallet
function DfTote({ x, y, w, h }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h - 14} rx="3" fill="#fff" stroke="var(--sc-edge)" strokeWidth="1.6" />
      {[0.25, 0.5, 0.75].map((f, i) => <path key={"v" + i} d={`M${x + w * f},${y} V${y + h - 14}`} stroke="var(--sc-line)" strokeWidth="1" />)}
      {[0.25, 0.5, 0.75].map((f, i) => <path key={"h" + i} d={`M${x},${y + (h - 14) * f} H${x + w}`} stroke="var(--sc-line)" strokeWidth="1" />)}
      <rect x={x + w * 0.28} y={y + 10} width={w * 0.44} height={(h - 14) * 0.42} fill="var(--sc-fill-lite)" />
      <path d={`M${x - 4},${y + h - 14} H${x + w + 4} V${y + h} H${x - 4} Z`} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    </g>
  );
}
// valve + tag + mode chip in one call (the mimic has seven of them)
function DfValve({ cx, cy, tag, desc, open, mode = "A", lx, ly, anchor = "middle" }) {
  const name = desc.join(" ");
  return (
    <g>
      <Eq title={name} onClick={() => openEquipment(njBuildEquip(tag, name, "valve", {
        running: open, canStartStop: true, primary: { l: "Position", v: open ? "Open" : "Closed", u: "" },
        readouts: [{ l: "Position", v: open ? "Open" : "Closed", u: "" }],
      }))}>
        <SymValve cx={cx} cy={cy} s={0.86} running={open} />
      </Eq>
      <ModeChip x={cx + 13} y={cy - 8} mode={mode} />
      <Tag2 x={lx} y={ly} anchor={anchor} tag={tag} desc={desc} />
    </g>
  );
}

/* ───────────── pipe network (fluid-tagged, NJ_FLUIDS) ───────────── */
// sludge = dead-fish transport + collected fish, raw = flushing water, gas = vacuum + vent,
// drain = spent flush water to wastewater, chem = acid dosing.
const DFM_PIPES = [
  // flushing water → cyclone top
  { k: "raw", d: "M146,197 H636 V330" },
  // dead-fish transport lines → cyclone shell
  { k: "sludge", d: "M206,389 H570" },
  { k: "sludge", d: "M146,469 H570" },
  // vent line (air in) + vacuum line to the vacuum pump
  { k: "gas", d: "M598,330 V252" },
  { k: "gas", d: "M740,330 V225 H1118" },
  // cyclone flush-water drain: taken off the cone flank, clear of the outdoor-tanks inlet above it
  { k: "drain", d: "M736,545 H1240" },
  // cyclone outlet → grinder tank
  { k: "sludge", d: "M680,610 V740" },
  // acid dosing: tote → acid pump → grinder tank
  { k: "chem", d: "M1320,790 V700 H860 V752" },
];

function DeadFishMimic() {
  return (
    <svg className="rasm" viewBox="0 0 1456 940" role="img" aria-label="Dead fish collection process mimic" preserveAspectRatio="xMidYMid meet">
      {DFM_PIPES.map((q, i) => <path key={"p" + i} d={q.d} className={"rasm-pipe fl-" + q.k} />)}

      {/* ───── inlets ───── */}
      <SlFlag x={8} y={180} w={124} label="Flushing water" />
      <SlFlag x={8} y={372} w={184} label="DPT3 / DPT4 / Vaccination" />
      <SlFlag x={8} y={452} w={124} label="Outdoor tanks" />
      <DfValve cx={300} cy={197} tag="DFS0-FHA0-PV7" desc={["Cyclone flush valve"]} open={false} mode="M" lx={300} ly={148} />
      <DfValve cx={300} cy={389} tag="DFS0-FHA0-PV1" desc={["Shutoff valve building"]} open={true} lx={300} ly={332} />
      <DfValve cx={300} cy={469} tag="DFS0-FHA0-PV2" desc={["Shutoff valve outdoor section"]} open={false} mode="M" lx={300} ly={508} />

      {/* ───── vacuum line ───── */}
      <path d="M592,252 l6,11 l6,-11 Z" fill="var(--sc-edge)" />
      <DfValve cx={598} cy={290} tag="DFS0-FHA0-PV4" desc={["Vent valve"]} open={false} lx={560} ly={272} anchor="end" />
      <DfValve cx={740} cy={282} tag="DFS0-FHA0-PV3" desc={["Vacuum pump", "shutoff valve"]} open={true} lx={800} ly={258} anchor="start" />
      <Eq title="Vacuum pump" onClick={() => openEquipment(njBuildEquip("DFS0-FHA0-JK1", "Vacuum pump", "blower", {
        running: true, primary: { l: "Vacuum in cyclone", v: "-482", u: "mbar" },
        readouts: [{ l: "Vacuum in cyclone", v: "-482", u: "mbar", tag: "DFS0-FHA0-PT1" }, { l: "Run-on time", v: "600", u: "s" }],
      }))}>
        <SymFan cx={1010} cy={225} running={true} />
      </Eq>
      <ModeChip x={1032} y={217} mode="A" />
      <SymTrend cx={1070} cy={225} tag="DFS0-FHA0-JK1" name="Vacuum pump" group="Dead Fish" running={true} />
      <Tag2 x={1010} y={168} tag="DFS0-FHA0-JK1" desc={["Vacuum pump"]} />
      <path d="M1118,219 l22,6 l-22,6 Z" fill="var(--sc-edge)" />

      {/* ───── cyclone ───── */}
      <Eq title="Vacuum cyclone" onClick={() => openEquipment(njBuildEquip("DFS0-CYC0", "Vacuum cyclone", "vessel", {
        canStartStop: false, noMode: true, primary: { l: "Vacuum in cyclone", v: "-482", u: "mbar" },
        readouts: [
          { l: "Vacuum in cyclone", v: "-482", u: "mbar", tag: "DFS0-FHA0-PT1" },
          { l: "Time since last emptying", v: "35:08", u: "mm:ss" },
          { l: "Emptyings since grinding", v: "3", u: "of 6" },
          { l: "Emptying interval", v: "120", u: "min" },
        ],
      }))}>
        <DfCyclone x={570} y={330} w={220} h={280} />
      </Eq>
      <Tag2 x={830} y={352} anchor="start" tag="DFS0-FHA0-PT1" desc={["Vacuum in cyclone"]} />
      <RD x={830} y={372} w={78} value="-482" unit="mbar" tag="DFS0-FHA0-PT1" name="Vacuum in cyclone" group="Dead Fish" />

      {/* ───── flush-water drain ───── */}
      <DfValve cx={930} cy={545} tag="DFS0-FHA0-PV6" desc={["Cyclone flush water", "drain valve"]} open={false} lx={930} ly={579} />
      <SlFlag x={1240} y={528} w={130} label="Wastewater" />

      {/* ───── cyclone emptying → grinder tank ───── */}
      <DfValve cx={680} cy={672} tag="DFS0-FHA0-PV5" desc={["Cyclone emptying valve"]} open={false} lx={620} ly={655} anchor="end" />
      <Eq title="Grinder tank" onClick={() => openEquipment(njBuildEquip("DFS0-FHA0-TK1", "Grinder tank", "vessel", {
        canStartStop: false, noMode: true, primary: { l: "Emptyings since grinding", v: "3", u: "" },
        readouts: [{ l: "Emptyings since grinding", v: "3", u: "of 6" }, { l: "Time since last grinding", v: "317", u: "min" }],
      }))}>
        <DfBasin x={480} y={740} w={420} h={150} />
      </Eq>
      <Eq title="Grinder pump" onClick={() => openEquipment(njBuildEquip("DFS0-FHA0-GR1", "Grinder pump", "pump", {
        running: false, primary: { l: "Run time", v: "0", u: "s" },
        readouts: [{ l: "Actual grinder run time", v: "0", u: "s" }, { l: "Grinding time", v: "3600", u: "s" }],
      }))}>
        <SymPump cx={680} cy={848} running={false} />
      </Eq>
      <ModeChip x={628} y={840} mode="A" />
      <SymTrend cx={718} cy={848} tag="DFS0-FHA0-GR1" name="Grinder pump" group="Dead Fish" running={false} />
      <Tag2 x={680} y={908} tag="DFS0-FHA0-GR1" desc={["Grinder pump"]} />

      <Tag2 x={930} y={784} anchor="start" tag="DFS0-FHA0-CN1" desc={["Emptyings since grinding"]} />
      <RD x={930} y={800} w={72} value="3" unit="of 6" tag="DFS0-FHA0-CN1" name="Cyclone emptyings since grinding" group="Dead Fish" />
      <Tag2 x={930} y={856} anchor="start" tag="DFS0-FHA0-GR1-IDLE" desc={["Time since grinding"]} />
      <RD x={930} y={872} w={72} value="317" unit="min" tag="DFS0-FHA0-GR1-IDLE" name="Time since last grinding" group="Dead Fish" />

      {/* ───── acid dosing ───── */}
      <Eq title="Acid pump" onClick={() => openEquipment(njBuildEquip("DFS0-FHA0-PU2", "Acid pump", "pump", {
        running: true, primary: { l: "Pump output", v: "100", u: "%" },
        readouts: [{ l: "Pump output", v: "100", u: "%", tag: "DFS0-FHA0-PU2" }, { l: "Desired batch volume", v: "1.0", u: "L" }, { l: "Remaining fill time", v: "2:23", u: "mm:ss" }],
      }))}>
        <SymPump cx={1120} cy={700} running={true} />
      </Eq>
      <ModeChip x={1078} y={692} mode="M" />
      <Tag2 x={1120} y={645} tag="DFS0-FHA0-PU2" desc={["Acid pump"]} />
      <RD x={1160} y={688} w={64} value="100" unit="%" tag="DFS0-FHA0-PU2" name="Acid pump output" group="Dead Fish" accent="var(--success-text)" />
      <DfTote x={1250} y={790} w={140} h={114} />
      <text className="slm-cap" x={1320} y={926} textAnchor="middle">Acid IBC · 1.0 L batch</text>
    </svg>
  );
}

/* ───────────── parameter dock content (mirrors the legacy right-hand panel groups) ───────────── */
const DF_TABS = ["Vacuum system", "Acid pump", "Grinder"];
const DF_PARAMS = {
  "Vacuum system": [
    { h: "Vacuum plant · DFS0-FHA0" },
    { l: "Vacuum system", mode: "In operation" },
    { l: "Vacuum in cyclone", v: "-482 mbar", trend: true, trendTag: "DFS0-FHA0-PT1" },
    { l: "Vacuum pump start limit", v: "-400 mbar", edit: true, min: -900, max: 0, step: 10 },
    { l: "Vacuum pump stop limit", v: "-500 mbar", edit: true, min: -900, max: 0, step: 10 },
    { l: "Vacuum pump run-on time", v: "600 sec", edit: true, min: 0, max: 1800, step: 10 },
    { l: "Actual vacuum pump run-on time", v: "600 sec" },
    { h: "Cyclone emptying · DFS0-CYC0" },
    { l: "Actual time emptying valve open", v: "0 sec" },
    { l: "Max cyclone emptying time", v: "10 sec", edit: true, min: 0, max: 120, step: 1 },
    { l: "Time since last emptying", v: "35:08 mm:ss" },
    { l: "Interval between cyclone emptying", v: "120 min", edit: true, min: 0, max: 720, step: 5 },
    { l: "Emptying pressure increase", v: "200 mbar", edit: true, min: 0, max: 1000, step: 10 },
    { l: "Emptying pressure increase time", v: "5 sec", edit: true, min: 0, max: 120, step: 1 },
  ],
  "Acid pump": [
    { h: "Acid pump · DFS0-FHA0-PU2" },
    { l: "Pump output (potentiometer pump)", v: "100 %", edit: true, min: 0, max: 100, step: 1 },
    { l: "Remaining fill time", v: "2 min 23 sec" },
    { l: "Desired acid batch volume", v: "1.0 L", edit: true, min: 0, max: 10, step: 0.1 },
    { l: "Start acid batch filling", v: "Off", edit: true, options: ["Off", "On"] },
  ],
  "Grinder": [
    { h: "Dead-fish grinder · DFS0-FHA0-GR1" },
    { l: "Cyclone emptyings since last grinding", v: "3", trend: true, trendTag: "DFS0-FHA0-CN1" },
    { l: "Cyclone emptyings before grinder starts", v: "6", edit: true, min: 1, max: 30, step: 1 },
    { l: "Time since last grinding", v: "317 min", trend: true, trendTag: "DFS0-FHA0-GR1-IDLE" },
    { l: "Max pause between grindings", v: "480 min", edit: true, min: 0, max: 1440, step: 10 },
    { l: "Actual grinder run time", v: "0 sec" },
    { l: "Grinding time", v: "3600 sec", edit: true, min: 0, max: 7200, step: 60 },
  ],
};

/* ───────────── screen ───────────── */
function DeadFishScreen() {
  const [dock, setDock] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  const maneuver = (msg) => njToast(msg, "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"));
  const emptyCyclone = () => openDialog(<ConfirmDialog
    title="Empty the vacuum cyclone?"
    message="Opens the emptying valve and drops the collected dead fish into the grinder tank. Vacuum collection pauses until the cyclone is sealed again."
    detail="DFS0-FHA0-PV5 · max emptying time 10 sec · time since last emptying 35:08 mm:ss"
    confirmLabel="Start emptying"
    onConfirm={() => maneuver("Cyclone emptying started")} />);
  const startGrinding = () => openDialog(<ConfirmDialog
    title="Start the dead-fish grinder?"
    message="Doses acid and runs the grinder pump for the configured grinding time. Normally started automatically after six cyclone emptyings."
    detail="DFS0-FHA0-GR1 · grinding time 3600 sec · 3 of 6 emptyings since last grinding"
    confirmLabel="Start grinding"
    onConfirm={() => maneuver("Dead-fish grinding started")} />);
  return (
    <AppShell active="navigation" title="Dead Fish" systemLabel="Dead Fish">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Vacuum collection · grinding · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Dead Fish" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className="btn btn-secondary" onClick={emptyCyclone}><Icon name="arrow-down-to-line" size={15} /> Empty cyclone</button>
        <button className="btn btn-secondary" onClick={startGrinding}><Icon name="cog" size={15} /> Start grinding</button>
        <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={15} /> Parameters</button>
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={15} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={15} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="skull" size={17} color="var(--slate-600)" /><span className="card-title">Dead Fish · DFS0-FHA0 · Building 2</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><DeadFishMimic /></div>
        <ScadaLegend fluids={["sludge", "raw", "gas", "drain", "chem"]} />
      </div>

      {dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={18} /></button>
        <ParamTabs dock tabs={DF_TABS} params={DF_PARAMS} title="Dead Fish · parameters" />
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="skull" size={16} /> Dead Fish · DFS0-FHA0 · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><DeadFishMimic /></div>
        </div>
      )}
    </AppShell>
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Dead Fish": DeadFishScreen,
});
Object.assign(window, { DeadFishMimic, DeadFishScreen });
