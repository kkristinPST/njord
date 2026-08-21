// systems.jsx — mobile process-system screen. This is the native counterpart of a DESKTOP
// process mimic (`__njSystemScreens`): the same system list, the same equipment tags and the
// same live readouts, but a mimic is a wall-sized diagram and does not survive a 393px screen.
// So mobile gives the operator what the mimic gives them on a phone: system status, the
// process values in flow order, the equipment in the loop (tap → the equipment screen they
// already know), active alarms scoped to the system, and the maneuvers that can be run.
// Fish Tank keeps its own dedicated screen — this covers every other system in the tree.

// Per-system definition. `flow` is the process order the desktop mimic draws left-to-right,
// so a reading list here matches what an operator sees on the wall.
const M_SYSTEMS = {
  "RAS": { icon: "git-merge", sub: "Recirculation loop", flow: [
    { l: "Drum filter ΔP", v: "0.063", u: "bar", kind: "raw" },
    { l: "Turbidity out", v: "0.45", u: "NTU", kind: "raw" },
    { l: "Biofilter TAN", v: "0.63", u: "mg/L", kind: "tan" },
    { l: "CO₂ after stripper", v: "11.4", u: "mg/L", kind: "co2" },
    { l: "Loop flow", v: "1240", u: "L/s", kind: "raw" },
    { l: "Temperature", v: "12.5", u: "°C", kind: "temp" },
  ], equip: ["DPT1-FIL0", "DPT1-STR0-AV1", "DPT1-STR0-AV2", "DPT1-DOX0"],
  maneuvers: [["Trigger backwash", "Runs one drum-filter backwash cycle."], ["Start CO₂ fan 2", "Brings the standby stripper fan online."]] },

  "Pump Sump": { icon: "git-merge", sub: "Lift pumps & sump level", flow: [
    { l: "Sump level", v: "1.82", u: "m", kind: "raw" },
    { l: "Lift pump 1", v: "78", u: "%", kind: "raw" },
    { l: "Lift pump 2", v: "64", u: "%", kind: "raw" },
    { l: "Discharge flow", v: "1240", u: "L/s", kind: "raw" },
    { l: "pH", v: "6.96", u: "", kind: "ph" },
    { l: "Header pressure", v: "1.42", u: "bar", kind: "raw" },
  ], equip: ["DPT1-SMP0-PU1", "DPT1-SMP0-PU2"],
  maneuvers: [["Start standby pump", "Brings lift pump 2 to duty."], ["Reset sump alarms", "Clears latched level faults after inspection."]] },

  "MBBR": { icon: "layers", sub: "Moving-bed biofilter", flow: [
    { l: "TAN in", v: "0.71", u: "mg/L", kind: "tan" },
    { l: "TAN out", v: "0.38", u: "mg/L", kind: "tan" },
    { l: "Nitrite", v: "0.09", u: "mg/L", kind: "raw" },
    { l: "Aeration", v: "68", u: "%", kind: "raw" },
    { l: "Bed temperature", v: "12.6", u: "°C", kind: "temp" },
    { l: "Media fill", v: "58", u: "%", kind: "raw" },
  ], equip: ["DPT1-STR0-AV1", "DPT1-DOX0"],
  maneuvers: [["Increase aeration", "Raises blower output one step."]] },

  "Feeding": { icon: "utensils", sub: "Feed distribution", flow: [
    { l: "Feed rate", v: "40.9", u: "kg/h", kind: "raw" },
    { l: "Fed today", v: "7.1", u: "t", kind: "raw" },
    { l: "Target today", v: "9.6", u: "t", kind: "raw" },
    { l: "Line pressure", v: "0.82", u: "bar", kind: "raw" },
    { l: "Blower speed", v: "62", u: "%", kind: "raw" },
  ], equip: [], route: "feeding",
  maneuvers: [["Manual flush", "Clears the feed line after a blockage."]] },

  "Lye Dosing": { icon: "flask-conical", sub: "pH correction", flow: [
    { l: "pH measured", v: "6.96", u: "", kind: "ph" },
    { l: "pH setpoint", v: "7.10", u: "", kind: "raw" },
    { l: "Dosing rate", v: "18", u: "%", kind: "raw" },
    { l: "Tank level", v: "64", u: "%", kind: "raw" },
  ], equip: [],
  maneuvers: [["Prime dosing pump", "Runs the pump for 30 s to clear air."]] },

  "Water Treatment": { icon: "droplets", sub: "Intake & disinfection", flow: [
    { l: "Intake flow", v: "980", u: "L/s", kind: "raw" },
    { l: "Turbidity", v: "0.40", u: "NTU", kind: "raw" },
    { l: "Temperature", v: "11.8", u: "°C", kind: "temp" },
    { l: "Filter ΔP", v: "0.048", u: "bar", kind: "raw" },
  ], equip: ["DPT1-FIL0"],
  maneuvers: [["Backwash intake filter", "One cycle on the duty filter."]] },

  "UV Plant": { icon: "sun", sub: "UV disinfection", flow: [
    { l: "UV dose", v: "42", u: "mJ/cm²", kind: "raw" },
    { l: "Transmittance", v: "91", u: "%", kind: "raw" },
    { l: "Lamp 3 runtime", v: "9042", u: "h", kind: "raw" },
    { l: "Flow", v: "860", u: "L/s", kind: "raw" },
  ], equip: [],
  maneuvers: [["Lamp test", "Cycles each lamp and reports output."]] },

  "Fish Barrier": { icon: "shield", sub: "Escape prevention", flow: [
    { l: "Barrier state", v: "Closed", u: "", kind: "raw" },
    { l: "Differential level", v: "0.12", u: "m", kind: "raw" },
    { l: "Last inspection", v: "28 Jan", u: "", kind: "raw" },
  ], equip: [],
  maneuvers: [["Log inspection", "Records a barrier check against your name."]] },

  "Hatchery": { icon: "egg", sub: "Incubation", flow: [
    { l: "Water temperature", v: "8.4", u: "°C", kind: "temp" },
    { l: "O₂ saturation", v: "96.2", u: "%", kind: "o2" },
    { l: "Flow per tray", v: "12", u: "L/min", kind: "raw" },
    { l: "Degree-days", v: "412", u: "°d", kind: "raw" },
  ], equip: [],
  maneuvers: [["Log egg count", "Registers a batch count."]] },

  "Energy Plant": { icon: "zap", sub: "Power & heat", flow: [
    { l: "Total power", v: "297.4", u: "kW", kind: "raw" },
    { l: "Heat recovery", v: "112", u: "kW", kind: "raw" },
    { l: "Today", v: "3,092", u: "kWh", kind: "raw" },
  ], equip: [], route: "energy",
  maneuvers: [] },

  "Technical": { icon: "wrench", sub: "Shared technical services", flow: [
    { l: "Compressed air", v: "6.8", u: "bar", kind: "raw" },
    { l: "Instrument air dew pt", v: "−32", u: "°C", kind: "raw" },
    { l: "Backup genset", v: "Standby", u: "", kind: "raw" },
  ], equip: [],
  maneuvers: [["Test genset", "Runs the weekly no-load test."]] },

  "Overview": { icon: "workflow", sub: "Department process overview", flow: [
    { l: "Loop flow", v: "1180", u: "L/s", kind: "raw" },
    { l: "O₂ header", v: "220", u: "%", kind: "raw" },
    { l: "CO₂ after degasser", v: "9.8", u: "mg/L", kind: "co2" },
    { l: "Drain flow", v: "96", u: "L/s", kind: "raw" },
  ], equip: ["DPT1-DOX0"],
  maneuvers: [] },
};

function mSystemStatus(label, deptId) {
  let st = "ok";
  M_FACILITY.forEach((b) => b.depts.forEach((d) => {
    if (deptId && d.id !== deptId) return;
    d.systems.forEach((s) => { if (s.label === label) { const v = mFacSev(s.status); if (v === "critical") st = "critical"; else if (v === "high" && st !== "critical") st = "high"; else if (v === "low" && st === "ok") st = "low"; } });
  }));
  return st;
}

function SystemScreen({ label, path, deptId }) {
  useNav();
  label = label || "System";
  const def = M_SYSTEMS[label];
  const status = mSystemStatus(label, deptId);
  const alarms = M_ALARMS.filter((a) => mIsActive(a) && (a.area || "").indexOf(label) >= 0);
  const equip = def ? def.equip.map((t) => M_EQUIP.find((e) => e.tag === t)).filter(Boolean) : [];
  if (!def) return (
    <React.Fragment>
      <MHeader back title={label} sub={path} />
      <div className="m-pad"><MEmpty label={"No mobile view for " + label + " yet"} /></div>
    </React.Fragment>
  );
  const run = (m) => mConfirm({
    title: m[0] + "?", body: m[1] + " The maneuver is logged against your name.",
    confirmLabel: m[0], onConfirm: () => mToast(m[0] + " · logged to maneuver history", "check"),
  });
  return (
    <React.Fragment>
      <MHeader back title={label} sub={path}
        right={<button className="m-icbtn" aria-label="Send system to trends" onClick={() => mToast(label + " parameters added to trends", "line-chart")}><MIcon name="line-chart" size={19} /></button>} />
      <PullScroll><div className="m-pad" style={{ paddingBottom: 96 }}>
        <div className="mc msys-hero" style={{ borderLeft: "4px solid " + MSEV[status].dot }}>
          <span className="m-lrow-ic"><MIcon name={def.icon} size={19} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="msys-hero-t">{def.sub}</div>
            <div className="m-inline" style={{ gap: 7, marginTop: 4 }}>
              <MDot level={status} size={8} />
              <span className="msys-hero-s" style={{ color: MSEV[status].text }}>{status === "ok" ? "Nominal" : status === "low" ? "Diagnostic" : status === "high" ? "Warning" : "Critical"}</span>
              {alarms.length > 0 && <span className="msys-hero-a">{alarms.length} alarm{alarms.length > 1 ? "s" : ""}</span>}
            </div>
          </div>
        </div>

        <div className="m-eyebrow">Process values · flow order</div>
        <div className="msys-reads">
          {def.flow.map((r, i) => {
            const num = parseFloat(String(r.v).replace(/[^\d.\-−]/g, "").replace("−", "-"));
            const lvl = r.kind === "raw" || isNaN(num) ? "ok" : mVital(r.kind, num);
            return (
              <div key={i} className="msys-read" {...mActivate(() => mPush("chart", { tag: label + " · " + r.l, title: r.l }), r.l + " " + r.v + " " + r.u + ", open trend")}>
                <span className="msys-read-l">{r.l}</span>
                <span className="msys-read-v data">{r.v}{r.u && <span className="msys-read-u"> {r.u}</span>}</span>
                {lvl !== "ok" && <MDot level={lvl} size={7} />}
              </div>
            );
          })}
        </div>

        {alarms.length > 0 && <React.Fragment>
          <div className="m-eyebrow">Active alarms</div>
          <div className="m-alist">{alarms.map((a) => <MAlarmRow key={a.id} a={a} compact />)}</div>
        </React.Fragment>}

        {equip.length > 0 && <React.Fragment>
          <div className="m-eyebrow">Equipment in the loop</div>
          <div className="m-list">{equip.map((e) => <EquipRow key={e.tag} e={e} />)}</div>
        </React.Fragment>}

        {def.route && <button className="m-btn m-btn-secondary" style={{ marginTop: 14 }} onClick={() => mPush(def.route, {})}>
          <MIcon name="arrow-right" size={16} /> Open {label} module</button>}

        {def.maneuvers.length > 0 && <React.Fragment>
          <div className="m-eyebrow">Maneuvers</div>
          <div className="m-list">{def.maneuvers.map((m) => (
            <button key={m[0]} className="m-lrow" onClick={() => run(m)}>
              <span className="m-lrow-ic"><MIcon name="sliders-horizontal" size={17} /></span>
              <div className="m-lrow-main"><div className="m-lrow-t">{m[0]}</div><div className="m-lrow-s" style={{ whiteSpace: "normal" }}>{m[1]}</div></div>
              <MIcon name="chevron-right" size={17} color="var(--slate-400)" />
            </button>
          ))}</div>
        </React.Fragment>}

        <div className="m-de-help" style={{ marginTop: 14 }}>The full process diagram for {label} is a control-room screen. Everything it controls is here.</div>
      </div></PullScroll>
    </React.Fragment>
  );
}

Object.assign(window, { M_SYSTEMS, SystemScreen, mSystemStatus });
