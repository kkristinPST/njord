// systems-a.jsx — Batch 2 SCADA system screens: Pump Sump, Energy Plant
// Each = process mimic (shared scada primitives) + tabbed parameter panel.
// (Water Treatment moved to its own faithful mimic: screens/water-treatment.jsx)

/* ───────────────────────── PUMP SUMP (Building 2 · DPT3) ───────────────────────── */
function PumpSumpMimic() {
  const pipes = [
    "M97,83 H116",
    "M97,123 H116",
    "M97,263 H116",
    "M97,303 H116",
    "M246,131 H300",                 // sump → lift pumps
    { d: "M370,166 V200", arrow: false }, // lift pumps → oxygenation
    "M440,235 H460 V309 H560",       // oxygenation → fish tanks (clears the analysis cabinet)
    { d: "M181,320 V347 H405", arrow: false }, // sump → sorting pump
    "M435,347 H560",                 // sorting pump → sorting port
  ];
  return (
    <svg className="ras-mimic" viewBox="0 0 760 400" role="img" aria-label="Pump sump process mimic">
      <FlowPipes paths={pipes} mid="psArrow" />
      <Port x={10} y={70} label="Drain exch." w={76} />
      <Port x={10} y={110} label="Top exch." w={76} />
      <Port x={10} y={250} label="MBBR" w={76} />
      <Port x={10} y={290} label="Lye" w={76} />
      <Port x={560} y={296} label="Fish Tanks" w={84} />
      <Port x={560} y={336} label="Sorting" w={84} />
      <MNode x={116} y={80} w={130} h={240} title="Pump Sump" sub="DPT3-SMP0" value="258" unit="cm" emphasis onClick={() => openEquipment(njBuildEquip("DPT3-SMP0", "Pump Sump", "vessel", { canStartStop: false, primary: { l: "Level", v: "258", u: "cm" }, trend: { label: "Level", base: 254, amp: 12, seed: 6.2, unit: "cm", hi: 399, lo: 180 } }))} />
      <MNode x={300} y={96} w={140} h={70} title="Lift pumps ×5" sub="DPT3-SMP0-PU1…5" value="41" unit="Hz" onClick={() => openEquipment("DPT1-SMP0-PU1")} />
      <MNode x={300} y={200} w={140} h={70} title="Oxygenation" sub="O₂ cones ×2" value="99.0" unit="%" accent="var(--success-text)" onClick={() => openEquipment("DPT1-DOX0")} />
      <MPump x={420} y={347} label="Sorting" onClick={() => openEquipment(njBuildEquip("DPT3-FHA0-PU1", "Sorting water pump", "pump", { primary: { l: "Speed", v: "0", u: "Hz" }, running: false, readouts: [{ l: "Speed", v: "0", u: "Hz" }, { l: "Sorting water pressure", v: "1.3", u: "bar" }], setpoints: [{ key: "p", l: "Sorting water pressure setpoint", v: 1.5, u: "bar", step: 0.1, min: 0, max: 4 }] }))} />
      <SensorBox x={480} y={70} w={266} title="Analysis cabinet" sub="DPT3-SMP0 · QT/PT"
        rows={[
          { l: "Total pressure", v: "2.0", u: "bar" },
          { l: "O₂ saturation", v: "99.0", u: "%", accent: "var(--success-text)" },
          { l: "CO₂", v: "2", u: "mg/l" },
          { l: "pH 1", v: "7.4", u: "pH" },
          { l: "pH 2", v: "7.4", u: "pH" },
          { l: "Temperature in sump", v: "13.8", u: "°C" },
        ]} />
    </svg>
  );
}
const PS_TABS = ["Filter", "MBBR & CO₂", "Pump sump", "Oxygen", "Sludge"];
const PS_PARAMS = {
  "Filter": [
    { h: "Filtering" },
    { l: "Backwash pressure", v: "5.3 bar" },
    { l: "Backwash pressure setpoint", v: "7.0 bar", box: true },
    { l: "Inlet channel level", v: "72 cm" },
    { l: "Backwash start threshold", v: "70 cm", box: true },
    { l: "Filter 2 start threshold", v: "78 cm", box: true },
    { l: "Filter 2 stop threshold", v: "75 cm", box: true },
    { l: "Max backwash interval", v: "10 min", box: true },
    { l: "Backwash duration", v: "30 sec", box: true },
    { l: "Rotation speed", v: "50 Hz" },
  ],
  "MBBR & CO₂": [
    { h: "Bioreactor" },
    { l: "Blower activity", v: "45 Hz", box: true },
    { l: "Backwash pause time", v: "0 min", box: true },
    { l: "MBBR screen backwash time", v: "120 sec", box: true },
    { l: "Valve switch interval, MBBR 1", v: "10 min", box: true },
    { l: "Priority valve activity, MBBR 1", v: "100 %" },
    { l: "Valve switch interval, MBBR 2", v: "5 min", box: true },
    { l: "Priority valve activity, MBBR 2", v: "100 %" },
    { h: "CO₂ fans" },
    { l: "CO₂ fan power setpoint", v: "9.0 kW", box: true },
  ],
  "Pump sump": [
    { h: "Lift pumps" },
    { l: "Level in pump sump", v: "253 cm" },
    { l: "Level setpoint", v: "230 cm", box: true },
    { l: "Tank pressure", v: "6.02 mVs" },
    { l: "Pressure setpoint", v: "6.00 mVs", box: true },
    { h: "Sorting water" },
    { l: "Sorting water pressure", v: "1.3 bar" },
    { l: "Sorting water pressure setpoint", v: "1.5 bar", box: true },
  ],
  "Oxygen": [
    { h: "Oxygen cones" },
    { l: "Oxygen cone pressure", v: "2.0 bar" },
    { l: "Pressure setpoint adjustment", mode: "Auto" },
    { l: "Oxygen cone pressure setpoint", v: "2.0 bar", box: true },
    { l: "Max valve opening to tank", v: "33.4 %" },
    { l: "Max desired valve opening to tank", v: "75 %", box: true },
    { l: "Min desired valve opening to tank", v: "15 %", box: true },
    { l: "Valve opening limit hysteresis", v: "2.0 %", box: true },
    { l: "Change in pressure setpoint over time", v: "0.10 bar/h", box: true },
  ],
  "Sludge": [
    { h: "Sludge pumps" },
    { l: "Sludge pump start threshold", v: "60 cm", box: true },
    { l: "Sludge pump stop threshold", v: "20 cm", box: true },
    { l: "Sludge level", v: "31 cm" },
    { l: "Sludge pump speed", v: "34 Hz" },
  ],
};
function PumpSumpScreen() {
  return (
    <SystemShell title="Pump Sump" active="Pump Sump" statusLevel="critical"
      metaIcon="arrow-down-to-line" metaLabel="Recirculation sump · live"
      mimicIcon="arrow-down-to-line" mimicTitle="Pump Sump · DPT3-SMP0" mimicCaption="Sump → lift pumps → oxygenation → tanks"
      mimic={<PumpSumpMimic />}
      legend={<FlowLegend fluids={["proc"]} />}
      param={<ParamTabs tabs={PS_TABS} params={PS_PARAMS} title="Pump Sump · parameters" />} />
  );
}

/* ─────────── heat-pump card (shared: also used by heat-pumps.jsx) ─────────── */
function HpCard({ name, status, rows }) {
  return (
    <div className="card hpc">
      <div className="hpc-head">
        <span className="hpc-name">{name}</span>
        <Dot level={status} size={9} />
      </div>
      {rows.map((r, i) => (
        <div className="param-row" key={i}>
          <span className="pl">{r[0]}</span>
          <span className="pv">{r[1]}</span>
        </div>
      ))}
    </div>
  );
}
// EnergyPlantScreen moved to screens/energy-plant-mimic.jsx (faithful glycol heat-pump
// mimic, RAS-mimic style). HpCard stays here (shared with heat-pumps.jsx).

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Pump Sump": PumpSumpScreen,
});
Object.assign(window, { PumpSumpScreen, HpCard });
