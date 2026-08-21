// sludge-treatment.jsx — faithful Building 1 Sludge Treatment process mimic, rebuilt from the
// legacy SCADA capture in the NJORD DS language. Same approach as RAS / Water Treatment:
//   • equipment (intake pump) → click for popup
//   • every value readout shows an ALWAYS-ON trend icon to its right (RD from ras-mimic.jsx)
//   • consistent status coloring — green pump body = running, dark = stopped
// Reuses globals from ras-mimic.jsx: SymPump, RD, Tag2, ModeChip, Eq.

/* ───────────── sludge-treatment symbols ───────────── */
// wide directional flow tag (handles the long edge labels: "Drain water DPT1" etc.)
function SlFlag({ x, y, w = 110, label, dir = "r" }) {
  const h = 34, tip = 14;
  const d = dir === "r"
    ? `M${x},${y} H${x + w} L${x + w + tip},${y + h / 2} L${x + w},${y + h} H${x} Z`
    : `M${x + w},${y} H${x + tip} L${x},${y + h / 2} L${x + tip},${y + h} H${x + w} Z`;
  return (
    <g aria-hidden="true">
      <path d={d} fill="var(--slate-50)" stroke="var(--slate-400)" strokeWidth="1.4" strokeLinejoin="round" />
      <text className="rasm-flag" x={x + w / 2 + (dir === "r" ? -4 : 4)} y={y + h / 2 + 4} textAnchor="middle">{label}</text>
    </g>
  );
}
// open-top basin / tank with a water fill band near the top (sludge drain sump + fish-barrier sumps)
function SlTank({ x, y, w, h, fill = "var(--sc-line)" }) {
  const wall = 3;
  return (
    <g aria-hidden="true">
      {/* water */}
      <rect x={x + wall} y={y + h * 0.18} width={w - wall * 2} height={h * 0.82 - wall} fill={fill} opacity="0.55" />
      {/* U-shape walls (open top) */}
      <path d={`M${x},${y} V${y + h} H${x + w} V${y}`} fill="none" stroke="var(--sc-edge)" strokeWidth={wall} strokeLinejoin="round" />
    </g>
  );
}

/* ───────────── pipe network (gray hairlines) ───────────── */
// fluid-tagged pipe network (NJ_FLUIDS): sludge = thickened solids to the sludge building,
// drain = drain-water returns and discharge.
const SLM_PIPES = [
  // RAS returns → sludge drain sump (top)
  { k: "sludge", d: "M116,41 H300 V100" },
  { k: "sludge", d: "M116,90 H270 V100" },
  // intake pump discharge → sludge building (long run, right)
  { k: "sludge", d: "M375,176 V89 H1300" },
  // drain water returns → fish barrier
  { k: "drain", d: "M148,297 H800 V330 H664 V345" },
  { k: "drain", d: "M148,349 H558" },
  // fish barrier outlet → drain water out
  { k: "drain", d: "M627,437 V481 H1300" },
];

function SludgeMimic() {
  const open = (t) => () => openEquipment(t);
  return (
    <svg className="rasm" viewBox="0 0 1456 540" role="img" aria-label="Sludge treatment process mimic" preserveAspectRatio="xMidYMid meet">
      {SLM_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      {/* ───── inlet / outlet flags ───── */}
      <SlFlag x={20} y={24} w={96} label="RAS DPT2" />
      <SlFlag x={20} y={73} w={96} label="RAS DPT1" />
      <SlFlag x={20} y={280} w={132} label="Drain water DPT1" />
      <SlFlag x={20} y={332} w={132} label="Drain water DPT2" />
      <SlFlag x={1300} y={72} w={132} label="Sludge building" />
      <SlFlag x={1300} y={464} w={120} label="Drain water" />

      {/* ───── sludge drain sump + intake pump ───── */}
      <Eq title="Sludge drain sump" onClick={open(njBuildEquip("WWT0-INN0-LT1", "Sludge drain sump", "vessel", { primary: { l: "Level", v: "42", u: "cm" }, readouts: [{ l: "Level in sludge drain sump", v: "42", u: "cm", tag: "WWT0-INN0-LT1" }] }))}>
        <SlTank x={235} y={100} w={160} h={148} />
      </Eq>
      <RD x={298} y={150} w={58} value="50" unit="Hz" tag="WWT0-INN0-PU1" name="Sludge intake pump speed" group="Sludge Treatment" />
      <Eq title="Sludge intake pump" onClick={open("WWT0-INN0-PU1")}><SymPump cx={330} cy={196} running={true} /></Eq>
      <ModeChip x={290} y={188} mode="A" />
      <SymTrend cx={360} cy={196} tag="WWT0-INN0-PU1" name="Sludge intake pump" group="Sludge Treatment" running={true} />
      <Tag2 x={330} y={268} tag="WWT0-INN0-PU1" desc={["Sludge intake pump"]} />

      <Tag2 x={168} y={150} tag="WWT0-INN0-LT1" desc={["Level in sludge", "drain sump"]} />
      <RD x={135} y={190} w={66} value="42" unit="cm" tag="WWT0-INN0-LT1" name="Level in sludge drain sump" group="Sludge Treatment" />

      {/* ───── fish barrier ───── */}
      <Eq title="Fish barrier sump RAS 2" onClick={open(njBuildEquip("DPT2-EFL0-LT1", "Fish barrier sump RAS 2", "vessel", { primary: { l: "Level", v: "12", u: "cm" }, readouts: [{ l: "Fish barrier sump level RAS 2", v: "12", u: "cm", tag: "DPT2-EFL0-LT1" }] }))}>
        <SlTank x={558} y={345} w={64} h={92} />
      </Eq>
      <Eq title="Fish barrier sump RAS 1" onClick={open(njBuildEquip("DPT1-EFL0-LT1", "Fish barrier sump RAS 1", "vessel", { primary: { l: "Level", v: "12", u: "cm" }, readouts: [{ l: "Fish barrier sump level RAS 1", v: "12", u: "cm", tag: "DPT1-EFL0-LT1" }] }))}>
        <SlTank x={632} y={345} w={64} h={92} />
      </Eq>
      {/* weir between the two sumps */}
      <path d="M622,345 V410 H632" fill="none" stroke="var(--sc-edge)" strokeWidth="3" strokeLinejoin="round" />

      <Tag2 x={478} y={372} tag="DPT2-EFL0-LT1" desc={["Fish barrier sump level", "RAS 2"]} />
      <RD x={445} y={414} w={64} value="12" unit="cm" tag="DPT2-EFL0-LT1" name="Fish barrier sump level RAS 2" group="Sludge Treatment" />
      <Tag2 x={822} y={372} tag="DPT1-EFL0-LT1" desc={["Fish barrier sump level", "RAS 1"]} />
      <RD x={756} y={414} w={64} value="12" unit="cm" tag="DPT1-EFL0-LT1" name="Fish barrier sump level RAS 1" group="Sludge Treatment" />

      <text className="slm-cap" x={590} y={454} textAnchor="middle">DPT2</text>
      <text className="slm-cap" x={664} y={454} textAnchor="middle">DPT1</text>
      <text className="slm-cap slm-cap-strong" x={627} y={502} textAnchor="middle">Fish Barrier</text>
    </svg>
  );
}

/* ───────────── parameter dock content ───────────── */
const SL_TABS = ["Intake pump", "Alarm sumps"];
const SL_PARAMS = {
  "Intake pump": [
    { h: "Speed control · WWT0-INN0-PU1" },
    { l: "Start threshold", v: "30 cm", edit: true, min: 0, max: 80, step: 1 },
    { l: "Stop threshold", v: "20 cm", edit: true, min: 0, max: 80, step: 1 },
    { l: "Min speed", v: "30 Hz", edit: true, min: 0, max: 50, step: 1 },
    { l: "Max speed", v: "50 Hz", edit: true, min: 0, max: 50, step: 1 },
    { l: "Level min → max", v: "20 → 40 cm" },
    { h: "Status, WWT0-INN0-PU1" },
    { l: "Mode", mode: "Auto" },
    { l: "Runstate", v: "In operation" },
    { l: "Speed", v: "50 Hz", trend: true, trendTag: "WWT0-INN0-PU1" },
    { l: "Current", v: "223.0 A" },
    { l: "Power", v: "36.0 kW" },
  ],
  "Alarm sumps": [
    { h: "Sludge drain sump · WWT0-INN0-LT1" },
    { l: "Measured value", v: "42 cm", trend: true, trendTag: "WWT0-INN0-LT1" },
    { l: "High alarm", v: "61 cm", edit: true, min: 0, max: 100, step: 1 },
    { l: "Low alarm", v: "15 cm", edit: true, min: 0, max: 100, step: 1 },
    { h: "Fish barrier sump RAS 1 · DPT1-EFL0-LT1" },
    { l: "Measured value", v: "12 cm", trend: true, trendTag: "DPT1-EFL0-LT1" },
    { l: "High alarm", v: "60 cm", edit: true, min: 0, max: 100, step: 1 },
    { l: "Low alarm", v: "0 cm", edit: true, min: 0, max: 100, step: 1 },
    { h: "Fish barrier sump RAS 2 · DPT2-EFL0-LT1" },
    { l: "Measured value", v: "12 cm", trend: true, trendTag: "DPT2-EFL0-LT1" },
    { l: "High alarm", v: "60 cm", edit: true, min: 0, max: 100, step: 1 },
    { l: "Low alarm", v: "0 cm", edit: true, min: 0, max: 100, step: 1 },
  ],
};

function SludgeTreatmentScreen() {
  const [dock, setDock] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title="Sludge Treatment" statusLevel="ok">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Sludge + fish barrier · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Sludge Treatment" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={15} /> Parameters</button>
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={15} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={15} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="recycle" size={17} color="var(--slate-600)" /><span className="card-title">Sludge Treatment · WWT0 · Building 1</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><SludgeMimic /></div>
        <div className="ras-legend">
          <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running</span>
          <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Stopped</span>
          <span className="ci"><span className="rasm-leg-chip">A</span> Auto</span>
          <span className="ci"><span className="rasm-leg-chip man">M</span> Manual</span>
          <span className="ras-leg-div" aria-hidden="true" />
          <FluidLegend of={["sludge","drain"]} />
          <span className="ci" style={{ marginLeft: "auto", color: "var(--slate-500)" }}><Icon name="line-chart" size={13} /> Tap a value's trend icon → send to Trends</span>
        </div>
      </div>

      {dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={18} /></button>
        <ParamTabs dock tabs={SL_TABS} params={SL_PARAMS} title="Sludge Treatment · parameters" />
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="recycle" size={16} /> Sludge Treatment · WWT0 · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><ScadaZoom><SludgeMimic /></ScadaZoom></div>
        </div>
      )}
    </AppShell>
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Sludge Treatment": SludgeTreatmentScreen,
});
Object.assign(window, { SludgeMimic, SludgeTreatmentScreen });
