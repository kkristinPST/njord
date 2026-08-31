// fish-tank-dock.jsx — per-tank parameter dock for the Fish Tank screen.
// Same shell as the process-screen dock (RasDock): a left icon rail switching
// Parameters / Alarm limits / Trends, with a tank switcher in the header.
// Reuses shared primitives: ParamList (scada.jsx), LimitBlock + DockTrendChart
// (ras-dock.jsx), njEditParam + ConfirmDialog (dialogs.jsx).
// Loaded AFTER ras-dock.jsx so LimitBlock / DockTrendChart are in scope.

/* ── a state row whose value is a click-to-toggle chip (activate / pause) ── */
function DockToggleRow({ label, on, onLabel, offLabel, onConfirm, tank }) {
  const target = !on;
  const click = () => openDialog(<ConfirmDialog
    title={target ? "Activate " + label.toLowerCase() + "?" : "Deactivate " + label.toLowerCase() + "?"}
    message={target
      ? "Return Tank " + tank.n + " to normal automatic operation."
      : "Deactivating suspends automatic regulation on Tank " + tank.n + ". Dosing and feeding will stop."}
    detail={tank.tag}
    confirmLabel={target ? "Activate" : "Deactivate"}
    tone={target ? "primary" : "danger"}
    onConfirm={() => onConfirm(target)} />);
  return (
    <div className="param-row">
      <span className="pl">{label}</span>
      <button className={"ftd-toggle " + (on ? "on" : "off")} onClick={click}>
        <Dot level={on ? "ok" : "high"} size={7} /> {on ? onLabel : offLabel}
      </button>
    </div>
  );
}

/* ── Parameters mode: Control / Fish / Feeding tabs ── */
function FtdControl({ tank }) {
  const [active, setActive] = React.useState(tank.active);
  const oxRows = [
    { h: "Oxygen dosing" },
    { l: "O₂ setpoint", v: tank.o2sp, unit: "%", edit: true, min: 80, max: 110, step: 0.5, tag: tank.tag + "-QT1", trend: true },
    { h: "Emergency oxygenation" },
    { l: "Emergency O₂ opening limit", v: tank.emgLimit, unit: "%", edit: true, min: 70, max: 100, step: 1, tag: tank.tag },
    { l: "Hysteresis before close", v: tank.hyst, unit: "%", edit: true, min: 0, max: 10, step: 0.1, tag: tank.tag },
    { l: "Open today", v: tank.openToday.toFixed(2), unit: "%" },
    { l: "Open yesterday", v: tank.openYest.toFixed(2), unit: "%" },
  ];
  return (
    <React.Fragment>
      <div className="param-group-h"><Icon name="power" size={14} /> Tank status</div>
      <DockToggleRow label="Fish tank" on={active} onLabel="Active" offLabel="Deactivated" tank={tank}
        onConfirm={(v) => { setActive(v); njToast("Tank " + tank.n + (v ? " activated." : " deactivated."), "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver")); }} />
      <ParamList rows={oxRows} tag={tank.tag} key={"ox" + tank.n} />
    </React.Fragment>
  );
}
function FtdFish({ tank }) {
  const dataRows = [
    { h: "Fish data" },
    { l: "Biomass", v: tank.biomass, unit: "kg" },
    { l: "Density", v: tank.density.toFixed(2), unit: "kg/m³" },
    { l: "Population", v: tank.population.toLocaleString("nb-NO"), unit: "" },
    { l: "Volume", v: tank.volume, unit: "m³" },
    { l: "Average weight", v: tank.avgWt, unit: "g", edit: true, min: 0, max: 8000, step: 0.1, tag: tank.tag, trend: true },
  ];
  const moveRows = [
    { h: "Fish movement · today" },
    { l: "Dead fish", v: 0, unit: "", edit: true, min: 0, max: 100000, step: 1, tag: tank.tag },
    { l: "Fish extracted", v: 0, unit: "", edit: true, min: 0, max: 100000, step: 1, tag: tank.tag },
    { l: "Fish inserted", v: 0, unit: "", edit: true, min: 0, max: 100000, step: 1, tag: tank.tag },
  ];
  const resetTank = () => openDialog(<ConfirmDialog
    title={"Reset Tank " + tank.n + "?"}
    message="Clears the fish register for this tank (population, biomass and movement counters set to zero). Use when re-stocking."
    detail={tank.tag} confirmLabel="Reset tank" tone="danger"
    onConfirm={() => njToast("Tank " + tank.n + " register reset.", "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"))} />);
  return (
    <React.Fragment>
      <ParamList rows={dataRows} tag={tank.tag} key={"fd" + tank.n} />
      <ParamList rows={moveRows} tag={tank.tag} key={"fm" + tank.n} />
      <div className="ftd-note"><Icon name="info" size={14} /> Register counts as they occur; totals roll into the daily maneuver log.</div>
      <div className="ftd-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => window.njOpenDeadfishRegistration && window.njOpenDeadfishRegistration(tank)}><Icon name="clipboard-list" size={14} /> Register mortality</button>
        <button className="btn btn-secondary btn-sm" onClick={resetTank}><Icon name="rotate-ccw" size={14} /> Reset tank</button>
      </div>
    </React.Fragment>
  );
}
function FtdFeeding({ tank }) {
  const [paused, setPaused] = React.useState(tank.paused);
  const [boost, setBoost] = React.useState(1);
  const rows = [
    { l: "Activity factor", v: tank.activity, unit: "%", edit: true, min: 0, max: 100, step: 1, tag: tank.tag },
    { l: "Today's target", v: tank.feedTarget, unit: "kg/d" },
  ];
  // feed data — the legacy panel's cycle / day / yesterday split, automatic vs hand feed
  const f = (x) => x.toFixed(1);
  const feedRows = [
    { h: "Feed data" },
    { l: "Feed current cycle", v: f(tank.feedTarget * 0.33), unit: "kg" },
    { l: "Hand feed current cycle", v: f(tank.feedTarget * 0.02), unit: "kg" },
    { l: "Feed current day", v: f(tank.feedTarget * 0.37), unit: "kg" },
    { l: "Hand feed current day", v: f(tank.feedTarget * 0.02), unit: "kg" },
    { l: "Feed yesterday", v: f(tank.feedTarget * 0.89), unit: "kg" },
    { l: "Hand feed yesterday", v: "0.0", unit: "kg" },
  ];
  const maneuver = (msg) => njToast(msg, "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"));
  const startBoost = () => openDialog(<ConfirmDialog
    title={"Boost feed on Tank " + tank.n + "?"}
    message={"Runs the feed screw at boosted rate for " + boost + " minute" + (boost === 1 ? "" : "s") + ", then returns to the automatic schedule."}
    detail={tank.tag + " · activity factor " + tank.activity + " %"}
    confirmLabel="Start boost"
    onConfirm={() => maneuver("Feed boost started on Tank " + tank.n + " · " + boost + " min.")} />);
  const handFeed = () => njEditParam({
    tag: tank.tag, label: "Hand feed · Tank " + tank.n, value: 0, unit: "kg", min: 0, max: 50, step: 0.1,
    group: "Feeding",
    onApply: (v) => maneuver("Hand feed registered on Tank " + tank.n + " · " + v + " kg."),
  });
  return (
    <React.Fragment>
      <div className="param-group-h"><Icon name="utensils" size={14} /> Feeding</div>
      <DockToggleRow label="Feeding" on={!paused} onLabel="Feeding" offLabel="Paused" tank={tank}
        onConfirm={(v) => { setPaused(!v); njToast("Feeding " + (v ? "resumed" : "paused") + " on Tank " + tank.n + "."); }} />
      <ParamList rows={rows} tag={tank.tag} key={"fe" + tank.n} />
      <div className="param-row">
        <span className="pl">Feed screw 1</span>
        <span className="param-row-r"><span className={"tstat-chip " + (tank.screw === "Running" ? "on" : "idle")}><Dot level={tank.screw === "Running" ? "ok" : "low"} size={6} /> {tank.screw}</span></span>
      </div>
      <div className="param-row">
        <span className="pl">Boost feed</span>
        <span className="param-row-r ftd-boost">
          <span className="select ftd-boostsel">
            <select value={boost} onChange={(e) => setBoost(Number(e.target.value))} aria-label="Boost feed duration">
              {[1, 2, 5, 10, 15].map((n) => <option key={n} value={n}>{n} min</option>)}
            </select>
          </span>
          <button className="btn btn-secondary btn-sm" onClick={startBoost} disabled={paused}><Icon name="zap" size={14} /> Start</button>
        </span>
      </div>
      <div className="param-row">
        <span className="pl">Hand feed</span>
        <span className="param-row-r"><button className="btn btn-secondary btn-sm" onClick={handFeed}><Icon name="plus" size={14} /> Register</button></span>
      </div>
      <ParamList rows={feedRows} tag={tank.tag} key={"fdt" + tank.n} />
      <div className="ftd-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => window.__njNavigate && window.__njNavigate("feeding")}><Icon name="utensils" size={14} /> Open Fish Feeding</button>
      </div>
    </React.Fragment>
  );
}

/* ── dock shell ── */
const FTD_PARAM_TABS = ["Control", "Fish", "Feeding"];
const FTD_MODES = [
  { id: "params", icon: "sliders-horizontal", title: "Parameters", tabs: FTD_PARAM_TABS },
  { id: "limits", icon: "alarm-clock", title: "Alarm limits", tabs: null },
  { id: "trends", icon: "line-chart", title: "Trends", tabs: null },
];
function FishTankDock({ tank, tanks, onSwitch }) {
  const [mode, setMode] = React.useState("params");
  const [tabByMode, setTabByMode] = React.useState({ params: "Control" });
  const m = FTD_MODES.find((x) => x.id === mode);
  const tab = tabByMode[mode] || (m.tabs && m.tabs[0]);
  const setTab = (t) => setTabByMode((p) => Object.assign({}, p, { [mode]: t }));

  const limitBlocks = [
    { name: "O₂ in tank", tag: tank.tag + "-QT1", meas: tank.o2.toFixed(1), u: "%", hi: 120, lo: 77, lolo: 73, step: 0.5 },
    { name: "Water level", tag: tank.tag + "-LT1", meas: String(tank.level), u: "cm", hi: 215, lo: 185, lolo: 150 },
  ];
  const trendCharts = [
    { title: "Oxygen", min: 70, max: 130, series: [{ name: "O₂ tank " + tank.n, unit: "%", base: tank.o2, amp: 4, seed: tank.n + 0.5 }] },
    { title: "Level", min: 150, max: 250, series: [{ name: "Level tank " + tank.n, unit: "cm", base: tank.level, amp: 6, seed: tank.n + 1.2 }] },
  ];

  return (
    <div className="card dock">
      <div className="dock-rail">
        {FTD_MODES.map((x) => (
          <button key={x.id} className={"dock-rail-btn" + (x.id === mode ? " active" : "")} title={x.title} onClick={() => setMode(x.id)}>
            <Icon name={x.icon} size={20} />
          </button>
        ))}
      </div>
      <div className="dock-main">
        <div className="card-head dock-head ftd-head">
          <div className="card-head-l"><Icon name={m.icon} size={16} color="var(--slate-600)" /><span className="card-title">{m.title}</span></div>
          <div className="ftd-tanksw">
            {tanks.map((t) => (
              <button key={t.n} className={"ftd-tank" + (t.n === tank.n ? " active" : "")} title={"Tank " + t.n} onClick={() => onSwitch(t.n)}>{t.n}</button>
            ))}
          </div>
        </div>

        {m.tabs && (
          <div className="dock-tabs">
            <div className="segmented param-seg">
              {m.tabs.map((t) => <button key={t} className={"seg" + (t === tab ? " active" : "")} onClick={() => setTab(t)}>{t}</button>)}
            </div>
          </div>
        )}

        <div className="dock-body">
          {mode === "params" && tab === "Control" && <FtdControl tank={tank} key={"c" + tank.n} />}
          {mode === "params" && tab === "Fish" && <FtdFish tank={tank} key={"f" + tank.n} />}
          {mode === "params" && tab === "Feeding" && <FtdFeeding tank={tank} key={"fe" + tank.n} />}
          {mode === "limits" && (
            <div className="lim-list">
              <div className="param-group-h"><Icon name="alarm-clock" size={14} /> Tank {tank.n} limits</div>
              {limitBlocks.map((b, i) => <LimitBlock key={tank.n + "-" + i} b={b} />)}
            </div>
          )}
          {mode === "trends" && (
            <div className="dock-trends">
              {trendCharts.map((c, i) => <DockTrendChart key={tank.n + "-" + i} chart={c} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FishTankDock });
