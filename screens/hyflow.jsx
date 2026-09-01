// hyflow.jsx — HyFlow™ subsurface feeding (Building 2 · Support systems · FED10).
// Waterborne feed transport: pellets travel to the tanks IN WATER, not air. Built from the
// legacy "FED10 · HyFlow Undervannsfôring" capture in the NJORD DS language.
// Tank numbering follows THIS facility (Tank 1–3, tags FED01/02/03) rather than the capture's
// Kar 13/14/15; the station keeps its FED10 tag.
// Reuses globals: SymPump, SymValve, RD, Tag2, ModeChip, Eq, SymTrend (ras-mimic.jsx),
// SlFlag (sludge-treatment.jsx), ParamTabs (scada.jsx), openEquipment / njBuildEquip,
// ConfirmDialog + njToast.

/* ───────────── station + per-tank data (single source for mimic, cards and params) ───────────── */
const HF_STATION = { tag: "FED10", hz: "35", bar: "0.82", flow: "34.7" };
const HF_LINES = [
  { n: 1, tag: "FED01", kg: "85.5", fill: 0.72, cm: "30", rv: "61", bar: "0.17", run: true, flush: 340,
    screws: [
      { id: "SC1", running: true, rate: "38.4", pellet: "6", today: "412", feed: "Nutra Olympic 6 mm", cal: "118" },
    ] },
  { n: 2, tag: "FED02", kg: "27.0", fill: 0.23, cm: "32", rv: "68", bar: "0.17", run: true, flush: 118,
    screws: [
      { id: "SC1", running: true, rate: "21.0", pellet: "9", today: "268", feed: "Spirit Supreme 9 mm", cal: "142" },
      { id: "SC2", running: true, rate: "21.0", pellet: "9", today: "264", feed: "Spirit Supreme 9 mm", cal: "139" },
    ] },
  { n: 3, tag: "FED03", kg: "39.0", fill: 0.33, cm: "29", rv: "53", bar: "0.18", run: false, flush: 22,
    screws: [
      { id: "SC1", running: false, rate: "0.0", pellet: "4", today: "96", feed: "Nutra Olympic 4 mm", cal: "96" },
    ] },
];
const hfFlush = (m) => m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m + " min";

/* ───────────── mimic symbols ───────────── */
// feed hopper above the line: tapered bin with a green level fill + weight readout
function HfHopper({ cx, y, fill, kg, tag, n }) {
  const w = 92, h = 84, x = cx - w / 2, neck = 26;
  const fh = Math.max(4, (h - 18) * fill);
  return (
    <g>
      <Eq title={"Feed hopper · Tank " + n} onClick={() => openEquipment(njBuildEquip(tag + "-WT1", "Feed hopper · Tank " + n, "vessel",
        { canStartStop: false, noMode: true, primary: { l: "Weight", v: kg, u: "kg" },
          readouts: [{ l: "Hopper weight", v: kg, u: "kg", tag: tag + "-WT1" }, { l: "Level in feed hopper", v: "30", u: "cm", tag: tag + "-LT1" }] }))}>
        <path className="hf-hop" d={`M${x},${y} H${x + w} V${y + h - 26} L${cx + neck / 2},${y + h} H${cx - neck / 2} L${x},${y + h - 26} Z`} />
        <path className="hf-hopfill" d={`M${x + 4},${y + h - 22 - fh} H${x + w - 4} V${y + h - 26} L${cx + neck / 2 - 3},${y + h - 3} H${cx - neck / 2 + 3} L${x + 4},${y + h - 26} Z`} />
      </Eq>
      <RD x={cx - 34} y={y - 28} w={68} value={kg} unit="kg" tag={tag + "-WT1"} name={"Feed hopper weight · Tank " + n} group="HyFlow" />
    </g>
  );
}
// one tank line: shutoff → hopper → level → regulating valve → feed valve → pressure → bypass
function HfLine({ L, y }) {
  const open = (t) => () => openEquipment(t);
  const eq = (suffix, name, kind, extra) => njBuildEquip(L.tag + "-" + suffix, name + " · Tank " + L.n, kind, extra);
  const valve = (suffix, name, running) => open(eq(suffix, name, "valve",
    { primary: { l: "State", v: running ? "Open" : "Closed", u: "" }, running,
      readouts: [{ l: "Line pressure", v: L.bar, u: "bar", tag: L.tag + "-PT1" }] }));
  return (
    <g>
      <text className="hf-lnttl" x={618} y={y - 96}>{"Tank " + L.n + " · " + L.tag}</text>
      <Eq title={"Shutoff valve · Tank " + L.n} onClick={valve("SV1", "HyFlow shutoff valve", L.run)}>
        <SymValve cx={676} cy={y} s={0.82} running={L.run} />
      </Eq>
      <Tag2 x={676} y={y + 34} tag={L.tag + "-SV1"} desc={["Shutoff"]} />
      <HfHopper cx={806} y={y - 86} fill={L.fill} kg={L.kg} tag={L.tag} n={L.n} />
      <RD x={862} y={y - 44} w={62} value={L.cm} unit="cm" tag={L.tag + "-LT1"} name={"Level in feed hopper · Tank " + L.n} group="HyFlow" />
      <Tag2 x={893} y={y - 52} tag={L.tag + "-LT1"} desc={["Hopper level"]} />
      <Eq title={"Regulating valve · Tank " + L.n} onClick={open(eq("RV1", "HyFlow regulating valve", "valve",
        { primary: { l: "Opening", v: L.rv, u: "%" }, running: L.run,
          readouts: [{ l: "Valve opening", v: L.rv, u: "%", tag: L.tag + "-RV1" }],
          setpoints: [{ key: "o", l: "Valve opening setpoint", v: Number(L.rv), u: "%", step: 1, min: 0, max: 100 }] }))}>
        <SymValve cx={966} cy={y} s={0.9} running={L.run} />
      </Eq>
      <RD x={936} y={y - 44} w={60} value={L.rv} unit="%" tag={L.tag + "-RV1"} name={"Regulating valve · Tank " + L.n} group="HyFlow" />
      <Tag2 x={966} y={y + 34} tag={L.tag + "-RV1"} desc={["Regulating"]} />
      <Eq title={"Feed valve · Tank " + L.n} onClick={valve("SV2", "HyFlow feed valve", L.run)}>
        <SymValve cx={1074} cy={y} s={0.82} running={L.run} />
      </Eq>
      <Tag2 x={1074} y={y + 34} tag={L.tag + "-SV2"} desc={["Feed valve"]} />
      <RD x={1122} y={y - 40} w={68} value={L.bar} unit="bar" tag={L.tag + "-PT1"} name={"Line pressure · Tank " + L.n} group="HyFlow" />
      <Eq title={"Bypass valve · Tank " + L.n} onClick={valve("SV3", "HyFlow bypass valve", !L.run)}>
        <SymValve cx={1188} cy={y + 52} s={0.78} running={!L.run} />
      </Eq>
      <Tag2 x={1188} y={y + 86} tag={L.tag + "-SV3"} desc={["Bypass"]} />
      <SlFlag x={1290} y={y - 17} w={122} label={"To Tank " + L.n} />
    </g>
  );
}
const HF_Y = [232, 452, 672];
const HFM_PIPES = [
  { k: "proc", d: "M150,120 H222" },                       // water inlet → pump
  { k: "proc", d: "M278,120 H352" },                       // pump → pressure
  { k: "feed", d: "M352,120 H618" },                       // dosing joins: feed-in-water header
  { k: "feed", d: "M618,120 V672" },                       // vertical header
  { k: "feed", d: "M618,232 H1290" }, { k: "feed", d: "M618,452 H1290" }, { k: "feed", d: "M618,672 H1290" },
  { k: "feed", d: "M1188,232 V284 H530 V172" },            // bypass returns → suction bus
  { k: "feed", d: "M1188,452 V504 H530" },
  { k: "feed", d: "M1188,672 V724 H530" },
  { k: "proc", d: "M530,172 V140 H222" },
];
function HyFlowMimic() {
  return (
    <svg className="rasm" viewBox="0 0 1456 820" role="img" aria-label="HyFlow subsurface feeding process mimic" preserveAspectRatio="xMidYMid meet">
      {HFM_PIPES.map((q, i) => <path key={"p" + i} d={q.d} className={"rasm-pipe fl-" + q.k} />)}

      {/* ───── supply side ───── */}
      <SlFlag x={22} y={103} w={128} label="Water to HyFlow" />
      <RD x={220} y={62} w={60} value={HF_STATION.hz} unit="Hz" tag="FED10-PU1" name="Wet-feeding pump speed" group="HyFlow" accent="var(--success-text)" />
      <Eq title="Wet-feeding pump" onClick={() => openEquipment(njBuildEquip("FED10-PU1", "Wet-feeding pump", "pump",
        { primary: { l: "Speed", v: HF_STATION.hz, u: "Hz" }, running: true,
          readouts: [{ l: "Speed", v: HF_STATION.hz, u: "Hz", tag: "FED10-PU1" }, { l: "Pump pressure", v: HF_STATION.bar, u: "bar", tag: "FED10-PT1" }, { l: "Transport flow", v: HF_STATION.flow, u: "m³/h", tag: "FED10-FT1" }],
          setpoints: [{ key: "p", l: "Feeding pressure setpoint", v: 11.5, u: "bar", step: 0.1, min: 0, max: 16 }] }))}>
        <SymPump cx={250} cy={120} running={true} />
      </Eq>
      <ModeChip x={206} y={112} mode="A" />
      <SymTrend cx={292} cy={120} tag="FED10-PU1" name="Wet-feeding pump" group="HyFlow" running={true} />
      <Tag2 x={250} y={162} tag="FED10-PU1" desc={["Wet-feeding pump"]} />
      <RD x={360} y={78} w={72} value={HF_STATION.bar} unit="bar" tag="FED10-PT1" name="Pressure from HyFlow pump" group="HyFlow" />
      <Tag2 x={396} y={70} tag="FED10-PT1" desc={["Pump pressure"]} />
      <RD x={452} y={78} w={84} value={HF_STATION.flow} unit="m³/h" tag="FED10-FT1" name="HyFlow transport flow" group="HyFlow" />
      <Tag2 x={494} y={70} tag="FED10-FT1" desc={["Transport flow"]} />
      <text className="hf-note" x={618} y={186}>Feed transport header · 2–12 mm pellets · fixed multi-depth outlets</text>

      {HF_LINES.map((L, i) => <HfLine key={L.n} L={L} y={HF_Y[i]} />)}
    </svg>
  );
}

/* ───────────── feedscrew block (the operator-facing dosing detail) ───────────── */
function HfScrewRow({ s, L, split }) {
  return (
    <div className="hf-screw">
      <div className="hf-screw-id">
        <Dot level={s.running ? "ok" : "diagnostic"} size={9} />
        <span className="hf-screw-tag">{L.tag + "-" + s.id}</span>
        <span className="hf-screw-state">{s.running ? "Running" : "Stopped"}</span>
        {split && <span className="hf-screw-split">{split}</span>}
      </div>
      <div className="hf-screw-vals">
        <div className="hf-sv"><span className="hf-sv-l">Dosing rate</span><span className="hf-sv-v">{s.rate}<i>kg/h</i></span></div>
        <div className="hf-sv"><span className="hf-sv-l">Pellet</span><span className="hf-sv-v">{s.pellet}<i>mm</i></span></div>
        <div className="hf-sv"><span className="hf-sv-l">Dosed today</span><span className="hf-sv-v">{s.today}<i>kg</i></span></div>
        <div className="hf-sv"><span className="hf-sv-l">Calibration</span><span className="hf-sv-v">{s.cal}<i>g/rot</i></span></div>
      </div>
      <div className="hf-screw-feed"><Icon name="package" size={14} color="var(--slate-500)" /> {s.feed}</div>
    </div>
  );
}
// Collapsed by default — same rule as the Fish Feeding cards: a 3-screw tank must not stand
// 300px taller than a 1-screw tank, or the tank-level values stop lining up across the grid.
function HfScrews({ L, multi, share, total }) {
  const [open, setOpen] = React.useState(false);
  const stopped = L.screws.filter((s) => !s.running).length;
  const one = L.screws[0];
  return (
    <div className={"hf-screws" + (open ? " open" : "")}>
      <button className="hf-screws-h" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        title={open ? "Hide the individual feedscrews" : "Show each feedscrew's dosing rate, pellet size and calibration"}>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
        <span>{L.screws.length + (multi ? " feedscrews" : " feedscrew")}</span>
        {stopped > 0 && <span className="hf-screws-run">{stopped} stopped</span>}
        <span className="hf-split">{multi
          ? "Dose split · " + share.join(" / ") + " %"
          : one.rate + " kg/h · " + one.pellet + " mm · " + one.cal + " g/rot"}</span>
      </button>
      {open && (
        <React.Fragment>
          {L.screws.map((s, i) => <HfScrewRow key={s.id} s={s} L={L} split={multi ? share[i] + " %" : null} />)}
          <div className="hf-screw-sum"><span>Total dosed today</span><span className="hf-sv-v">{String(total)}<i>kg</i></span></div>
        </React.Fragment>
      )}
    </div>
  );
}
function HfTankCard({ L }) {
  const [run, setRun] = React.useState(L.run);
  const [flushing, setFlushing] = React.useState(false);
  // HyFlow shows everything normal Feeding shows: the tank-level feeding record comes from the
  // SAME dataset + store as the Fish Feeding screen (never a HyFlow copy of it), and the screw
  // rows below stay HyFlow's own — they carry dosing rate / pellet / dosed today on top.
  window.useFeed();
  const ffView = window.useFfView();
  const ffT = (window.FF_TANKS || []).find((x) => x.n === L.n);
  const total = L.screws.reduce((a, s) => a + Number(s.today), 0);
  const multi = L.screws.length > 1;
  const share = multi ? L.screws.map((s) => Math.round(Number(s.today) / total * 100)) : null;
  const toggleRun = () => openDialog(<ConfirmDialog
    title={(run ? "Stop" : "Start") + " HyFlow feeding to Tank " + L.n + "?"}
    message={run
      ? "Stops dosing to this tank. The line is flushed before the feed valve closes."
      : "Starts dosing to this tank. Feed valve opens once the transport line is pressurised."}
    detail={L.tag + " · " + L.screws.length + (L.screws.length > 1 ? " feedscrews" : " feedscrew")}
    confirmLabel={run ? "Stop feeding" : "Start feeding"} tone={run ? "danger" : "primary"}
    onConfirm={() => { setRun(!run); njToast("Tank " + L.n + " HyFlow " + (run ? "stopped" : "started"), "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver")); }} />);
  const manualFlush = () => openDialog(<ConfirmDialog
    title={"Flush the HyFlow line to Tank " + L.n + "?"}
    message="Runs the flushing setpoint through the line to clear remaining pellets. Dosing pauses for the flush duration."
    detail={"Flush duration 300 sec · time since last flush " + hfFlush(L.flush)}
    confirmLabel="Start flush"
    onConfirm={() => { setFlushing(true); njToast("Manual flush started on Tank " + L.n, "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver")); }} />);
  return (
    <div className="card hf-card">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="utensils" size={16} color="var(--slate-600)" />
          <span className="card-title">{"Tank " + L.n}</span>
          <span className="hf-tag">{L.tag}</span>
          <span className="hf-badge">HyFlow</span>
        </div>
        <Badge level={flushing ? "medium" : run ? "ok" : "diagnostic"}>{flushing ? "FLUSHING" : run ? "FEEDING" : "STOPPED"}</Badge>
      </div>
      <div className="card-body hf-body">
        <div className="hf-hoprow">
          <div className="hf-sv"><span className="hf-sv-l">Hopper weight</span><span className="hf-sv-v">{L.kg}<i>kg</i></span></div>
          <div className="hf-sv"><span className="hf-sv-l">Hopper level</span><span className="hf-sv-v">{L.cm}<i>cm</i></span></div>
          <div className="hf-sv"><span className="hf-sv-l">Line pressure</span><span className="hf-sv-v">{L.bar}<i>bar</i></span></div>
          <div className="hf-sv"><span className="hf-sv-l">Since last flush</span><span className="hf-sv-v">{flushing ? "0" : String(L.flush)}<i>min</i></span></div>
        </div>
        <HfScrews L={L} multi={multi} share={share} total={total} />
        {ffT && (
          <div className="hf-feedblock">
            <div className="hf-fb-h"><span>Feeding record</span><span className="hf-fb-src">shared with Fish Feeding</span></div>
            <window.FfFeedBlock t={ffT} vis={ffView.vis} hyflow showScrews={false} />
          </div>
        )}
      </div>
      <div className="hf-actions">
        <button className={"btn " + (run ? "btn-secondary" : "btn-primary")} onClick={toggleRun}>
          <Icon name={run ? "square" : "play"} size={14} /> {run ? "Stop feeding" : "Start feeding"}
        </button>
        <button className="btn btn-secondary" onClick={manualFlush}><Icon name="waves" size={14} /> Manual flush</button>
      </div>
    </div>
  );
}

/* ───────────── parameters drawer ───────────── */
const HF_TABS = ["Station", "Flushing", "Tank 1", "Tank 2", "Tank 3"];
const HF_PARAMS = {
  "Station": [
    { h: "Wet-feeding pump" },
    { l: "Feeding pressure setpoint", v: "11.50 bar", edit: true, min: 0, max: 16, step: 0.1 },
    { l: "Pump pressure", v: "0.82 bar", trend: true, trendTag: "FED10-PT1" },
    { l: "Pump speed", v: "35 Hz", trend: true, trendTag: "FED10-PU1" },
    { l: "Pressure control", mode: "Auto" },
    { h: "Transport" },
    { l: "Transport flow", v: "34.7 m³/h", trend: true, trendTag: "FED10-FT1" },
    { l: "Transport distance (installed)", v: "410 m" },
    { l: "Feeding depths (installed)", v: "2 · fixed" },
  ],
  "Flushing": [
    { h: "Flush cycle" },
    { l: "Flushing setpoint", v: "20 m³/h", edit: true, min: 0, max: 60, step: 1 },
    { l: "Line flush duration", v: "300 sec", edit: true, min: 30, max: 900, step: 10 },
    { l: "Time between flushes", v: "360 min", edit: true, min: 30, max: 1440, step: 10 },
    { h: "Per tank" },
    { l: "Tank 1, time since last flush", v: "5 h 40 min" },
    { l: "Tank 2, time since last flush", v: "1 h 58 min" },
    { l: "Tank 3, time since last flush", v: "22 min" },
  ],
};
HF_LINES.forEach((L) => {
  HF_PARAMS["Tank " + L.n] = [
    { h: "Line" },
    { l: "Run HyFlow", v: L.run ? "In operation" : "Stopped", edit: true, options: ["In operation", "Stopped"], tag: L.tag },
    { l: "Manual flush", v: "Off", edit: true, options: ["Off", "On"], tag: L.tag },
    { l: "Time since last flush", v: hfFlush(L.flush) },
    { l: "Line pressure", v: L.bar + " bar", trend: true, trendTag: L.tag + "-PT1" },
    { l: "Regulating valve opening", v: L.rv + " %", edit: true, min: 0, max: 100, step: 1, trend: true, trendTag: L.tag + "-RV1" },
    { h: "Feed hopper" },
    { l: "Hopper weight", v: L.kg + " kg", trend: true, trendTag: L.tag + "-WT1" },
    { l: "Level in feed hopper", v: L.cm + " cm", trend: true, trendTag: L.tag + "-LT1" },
    { h: "Feedscrews" },
  ].concat(L.screws.reduce((rows, s) => rows.concat([
    { l: s.id + " · dosing rate", v: s.rate + " kg/h", edit: true, min: 0, max: 120, step: 0.5, tag: L.tag + "-" + s.id },
    { l: s.id + " · pellet size", v: s.pellet + " mm", edit: true, min: 2, max: 12, step: 1, tag: L.tag + "-" + s.id },
    { l: s.id + " · calibration", v: s.cal + " g/rot", edit: true, min: 20, max: 300, step: 1, tag: L.tag + "-" + s.id },
    { l: s.id + " · dosed today", v: s.today + " kg" },
    { l: s.id + " · feed type", v: s.feed },
  ]), []));
});

/* ───────────── screen ───────────── */
function HyFlowScreen() {
  const [dock, setDock] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title="HyFlow Feeding" systemLabel="HyFlow Feeding">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Subsurface feeding · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="HyFlow Feeding" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={16} /> Parameters</button>
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={16} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={16} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="utensils" size={16} color="var(--slate-600)" /><span className="card-title">HyFlow Feeding · FED10 · Building 2</span></div>
          <span className="caption">Pellets transported in water · click equipment for controls</span>
        </div>
        <div className="card-body rasm-body"><HyFlowMimic /></div>
        <ScadaLegend fluids={["feed", "proc"]} />
      </div>

      <div className="hf-grid">
        {HF_LINES.map((L) => <HfTankCard key={L.n} L={L} />)}
      </div>

      {dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={20} /></button>
        <ParamTabs dock tabs={HF_TABS} params={HF_PARAMS} title="HyFlow · parameters" />
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="utensils" size={16} /> HyFlow Feeding · FED10 · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><HyFlowMimic /></div>
        </div>
      )}
    </AppShell>
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "HyFlow Feeding": HyFlowScreen,
});
Object.assign(window, { HyFlowScreen, HyFlowMimic });
