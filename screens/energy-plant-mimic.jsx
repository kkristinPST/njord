// energy-plant-mimic.jsx — faithful Energy Plant (Building 3 · DPT1) process mimic,
// rebuilt in the RAS-mimic P&ID style from the legacy SCADA capture. Glycol heat-pump
// plant: raw-water intake + expansion vessel → three plate heat exchangers (two top-
// exchanger glycol loops + one raw/effluent) → glycol circulation to the Refra heat
// pump → brine loop (Brinesløyfe). Reuses the shared ras-mimic symbols (window.*):
// SymPump / SymValve / RD / Tag2 / Eq / Flag / ModeChip. Loaded AFTER ras-mimic.jsx.

// plate heat exchanger — beige body with crossing-flow "X" cells
function PlateHX({ x, y, w, h, cells = 1 }) {
  const ch = h / cells;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="3" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      {Array.from({ length: cells }).map((_, i) => {
        const cy = y + i * ch;
        return (
          <g key={i}>
            {i > 0 && <line x1={x} y1={cy} x2={x + w} y2={cy} stroke="var(--sc-edge)" strokeWidth="1.2" />}
            <line x1={x + 8} y1={cy + 8} x2={x + w - 8} y2={cy + ch - 8} stroke="var(--sc-edge)" strokeWidth="1.6" />
            <line x1={x + 8} y1={cy + ch - 8} x2={x + w - 8} y2={cy + 8} stroke="var(--sc-edge)" strokeWidth="1.6" />
          </g>
        );
      })}
    </g>
  );
}
// vertical expansion / degasser vessel (cylinder with a domed top + inlet nozzle)
function ExpVessel({ x, y, w = 78, h = 112 }) {
  const r = w / 2;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y + r * 0.4} width={w} height={h - r * 0.9} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      <ellipse cx={x + r} cy={y + r * 0.4} rx={r} ry={r * 0.4} fill="var(--sc-fill-lite)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      <path d={`M${x},${y + h - r * 0.5} a${r},${r * 0.55} 0 0 0 ${w},0`} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      <line x1={x + r} y1={y - 16} x2={x + r} y2={y + r * 0.4} stroke="var(--sc-line)" strokeWidth="2" />
      <rect x={x + r - 9} y={y - 24} width="18" height="10" rx="2" fill="var(--sc-node)" stroke="var(--sc-edge)" strokeWidth="1.2" />
    </g>
  );
}

// pipe network — each segment tagged by fluid for subtle colour coding:
//   w = raw / process water · d = effluent (drain) · g = glycol top-exchanger loop
//   b = glycol brine loop (Brinesløyfe)
const EPM_PIPES = [
  // raw-water intake → pump → expansion vessel → top distribution trunk
  { k: "w", d: "M191,150 H345" },              // Råvann flag → pump
  { k: "w", d: "M385,150 H735 V118" },         // pump → up into vessel bottom
  { k: "w", d: "M735,44 V55 H1745" },          // vessel top → top trunk → Startføring
  { k: "w", d: "M1700,55 V112 H1745" },        // → Spylevann branch
  { k: "w", d: "M1560,55 V120" },              // → Refra top feed
  { k: "w", d: "M206,206 H300" },              // Spedevann (make-up) → HX1
  { k: "w", d: "M206,646 H300" },              // Spedevann (make-up) → HX3
  // effluent (drain)
  { k: "d", d: "M405,206 H445" },              // HX1 → Avløp
  { k: "d", d: "M201,322 H300" },              // Avløpsvann → HX1
  { k: "d", d: "M405,646 H445" },              // HX3 → Avløp
  { k: "d", d: "M201,757 H300" },              // Avløpsvann → HX3
  // glycol SUPPLY (exchangers → shunt valves → circulation pump → heat pump)
  { k: "g", d: "M206,395 H300" },              // Toppveksler tur → HX2
  { k: "g", d: "M405,400 H628" },              // HX2 → shunt valve ENS1
  { k: "g", d: "M645,383 V360" },              // ENS1 3-way stem
  { k: "g", d: "M662,400 H905" },              // ENS1 → circulation pump
  { k: "g", d: "M985,400 H1380 V280 H1455" },  // circ pump → Refra (supply)
  { k: "g", d: "M206,817 H300" },              // Toppveksler tur → HX3
  { k: "g", d: "M405,817 H628" },              // HX3 → shunt valve ENS2
  { k: "g", d: "M645,800 V777" },              // ENS2 3-way stem
  { k: "g", d: "M662,817 H795 V400" },         // ENS2 → riser to supply trunk
  // glycol RETURN (heat pump → return trunk → back to exchangers)
  { k: "g", d: "M1455,305 H1400 V520 H430" },  // Refra → return trunk (left)
  { k: "g", d: "M430,520 V545 H405" },         // return → HX2 retur
  { k: "g", d: "M480,520 V945 H405" },         // return → HX3 retur
  { k: "g", d: "M206,565 H300" },              // Toppveksler retur ← HX2
  { k: "g", d: "M206,945 H300" },              // Toppveksler retur ← HX3
  // brine loop (Refra ↔ circulation pump ↔ shunt valve ↔ Brinesløyfe)
  { k: "b", d: "M1560,315 V820" },             // Refra → Brinesløyfe (supply riser)
  { k: "b", d: "M1645,315 V413" },             // Refra → brine pump
  { k: "b", d: "M1645,477 V620 H1668" },       // brine pump → shunt valve
  { k: "b", d: "M1685,636 V740 H1660 V820" },  // shunt valve → Brinesløyfe (return)
];
// junction dots where two runs meet
const EPM_JOINTS = [
  { k: "g", x: 795, y: 400 }, { k: "g", x: 480, y: 520 }, { k: "g", x: 430, y: 520 },
];

function EnergyPlantMimic() {
  const open = (t) => () => openEquipment(t);
  const pumpEq = (tag, name, hz) => open(njBuildEquip(tag, name, "pump", { primary: { l: "Speed", v: hz, u: "Hz" }, readouts: [{ l: "Pump speed", v: hz, u: "Hz", tag }] }));
  const valveEq = (tag, name, pct) => open(njBuildEquip(tag, name, "valve", { primary: { l: "Opening", v: pct, u: "%" }, readouts: [{ l: "Valve opening", v: pct, u: "%", tag }] }));
  return (
    <svg className="rasm" viewBox="0 0 1980 1000" role="img" aria-label="Energy plant glycol heat-pump process mimic" preserveAspectRatio="xMidYMid meet">
      {EPM_PIPES.map((p, i) => <path key={"ep" + i} d={p.d} className={"rasm-pipe epm-pipe epm-" + p.k} />)}
      {EPM_JOINTS.map((j, i) => <circle key={"ej" + i} cx={j.x} cy={j.y} r={4.2} className={"epm-joint epm-" + j.k} />)}

      {/* ───── raw-water intake ───── */}
      <Flag x={95} y={133} label="Råvann" dir="r" />
      <Eq title="Raw water pump · WIN0-PBS0-PU1" onClick={pumpEq("WIN0-PBS0-PU1", "Raw water pump", "31")}><SymPump cx={345} cy={150} running={true} /></Eq>
      <ModeChip x={298} y={142} mode="A" />
      <SymTrend cx={378} cy={150} tag="WIN0-PBS0-PU1" name="Raw water pump" group="Energy Plant" running={true} />
      <RD x={307} y={100} value="31" unit="Hz" tag="WIN0-PBS0-PU1" name="Raw water pump speed" group="Energy Plant" />
      <Tag2 x={345} y={64} tag="WIN0-PBS0-PU1" desc={["Råvannspumpe"]} />

      <RD x={463} y={38} w={92} value="9.2" unit="°C" tag="WIN0-PBS0-TT1" name="Raw water temperature" group="Energy Plant" />
      <Tag2 x={509} y={6} tag="WIN0-PBS0-TT1" desc={["Råvanns temperatur"]} />
      <RD x={463} y={112} w={92} value="2.42" unit="bar" tag="WIN0-PBS0-PT1" name="Raw water pressure" group="Energy Plant" />
      <Tag2 x={509} y={80} tag="WIN0-PBS0-PT1" desc={["Råvanns trykk"]} />

      <ExpVessel x={696} y={26} />
      <Flag x={1745} y={40} label="Startføring" dir="r" />
      <Flag x={1745} y={92} label="Spylevann" dir="r" />

      {/* ───── plate heat exchangers ───── */}
      <PlateHX x={300} y={180} w={105} h={150} />
      <Flag x={110} y={189} label="Spedevann" dir="r" />
      <Flag x={445} y={189} label="Avløp" dir="r" />
      <Flag x={105} y={305} label="Avløpsvann" dir="r" />

      <PlateHX x={300} y={365} w={105} h={205} />
      <Flag x={110} y={378} label="Toppveksler tur" dir="r" />
      <RD x={140} y={430} w={76} value="14.4" unit="°C" tag="DPT1-SMP1-TT1" name="Temperature pump sump" group="Energy Plant" />
      <Tag2 x={178} y={459} tag="DPT1-SMP1-TT1" desc={["Temperatur sensor", "pumpesump"]} />
      <Flag x={110} y={548} label="Toppveksler retur" dir="r" />

      <PlateHX x={300} y={620} w={105} h={340} cells={2} />
      <Flag x={110} y={629} label="Spedevann" dir="r" />
      <Flag x={445} y={629} label="Avløp" dir="r" />
      <Flag x={105} y={740} label="Avløpsvann" dir="r" />
      <Flag x={110} y={800} label="Toppveksler tur" dir="r" />
      <RD x={140} y={852} w={76} value="9.8" unit="°C" tag="DPT1-SMP2-TT1" name="Temperature pump sump" group="Energy Plant" />
      <Tag2 x={178} y={881} tag="DPT1-SMP2-TT1" desc={["Temperatur sensor", "pumpesump"]} />
      <Flag x={110} y={928} label="Toppveksler retur" dir="r" />

      {/* ───── top-exchanger shunt valves ───── */}
      <Eq title="Shunt valve top exchanger · DPT1-ENS1-RV1" onClick={valveEq("DPT1-ENS1-RV1", "Shunt valve top exchanger", "100.4")}><SymValve cx={645} cy={400} running={true} /></Eq>
      <ModeChip x={664} y={392} mode="A" />
      <RD x={612} y={353} w={66} value="100.4" unit="%" tag="DPT1-ENS1-RV1" name="Shunt valve top exchanger" group="Energy Plant" />
      <Tag2 x={560} y={432} tag="DPT1-ENS1-RV1" desc={["Shunt ventil toppveksler"]} anchor="start" />

      <Eq title="Shunt valve top exchanger · DPT1-ENS2-RV1" onClick={valveEq("DPT1-ENS2-RV1", "Shunt valve top exchanger", "0.2")}><SymValve cx={645} cy={817} running={true} /></Eq>
      <ModeChip x={664} y={809} mode="A" />
      <RD x={612} y={770} w={66} value="0.2" unit="%" tag="DPT1-ENS2-RV1" name="Shunt valve top exchanger" group="Energy Plant" />
      <Tag2 x={560} y={847} tag="DPT1-ENS2-RV1" desc={["Shunt ventil toppveksler"]} anchor="start" />

      {/* ───── glycol circulation ───── */}
      <Eq title="Circulation pump glycol · DPT1-ENS0-PU1" onClick={pumpEq("DPT1-ENS0-PU1", "Circulation pump glycol heat pump", "50")}><SymPump cx={945} cy={400} running={true} /></Eq>
      <ModeChip x={898} y={392} mode="A" />
      <SymTrend cx={978} cy={400} tag="DPT1-ENS0-PU1" name="Circulation pump glycol heat pump" group="Energy Plant" running={true} />
      <RD x={912} y={353} value="50" unit="Hz" tag="DPT1-ENS0-PU1" name="Circulation pump speed" group="Energy Plant" />
      <Tag2 x={945} y={300} tag="DPT1-ENS0-PU1" desc={["Sirkulasjonspumpe", "glykol varmepumpe"]} />

      <RD x={1108} y={352} w={100} value="1.29" unit="bar" tag="DPT1-ENS0-PT2" name="Pressure glycol top exchanger" group="Energy Plant" />
      <Tag2 x={1158} y={302} tag="DPT1-ENS0-PT2" desc={["Trykk sensor glykol", "toppveksler"]} />
      <RD x={1330} y={352} w={90} value="5.2" unit="°C" tag="DPT1-ENS0-TT4" name="Temp glycol top exchanger return" group="Energy Plant" />
      <Tag2 x={1375} y={302} tag="DPT1-ENS0-TT4" desc={["Temperatur sensor", "glykol toppveksler retur"]} />
      <RD x={1290} y={500} w={90} value="5.2" unit="°C" tag="DPT1-ENS0-TT3" name="Temp glycol top exchanger supply" group="Energy Plant" />
      <Tag2 x={1335} y={447} tag="DPT1-ENS0-TT3" desc={["Temperatur sensor", "glykol toppveksler tur"]} />

      {/* ───── Refra heat pump ───── */}
      <Eq title="Refra heat pump · DPT1-ENS0" onClick={open("DPT1-ENS0")}>
        <rect className="rasm-box" x={1455} y={120} width={235} height={195} rx="6" />
      </Eq>
      <SymPump cx={1590} cy={172} running={true} />
      <ModeChip x={1614} y={164} mode="A" />
      <text className="rasm-flag" x={1572} y={250} textAnchor="middle" style={{ fontWeight: 700, fontSize: "18px" }}>Refra Varmpeumpe</text>
      <circle cx={1632} cy={288} r={8} fill="var(--slate-400)" stroke="var(--sc-edge)" strokeWidth="1.2" />

      {/* ───── brine loop ───── */}
      <RD x={1690} y={345} w={96} value="2.14" unit="bar" tag="DPT1-ENS0-PT1" name="Pressure glycol brine loop" group="Energy Plant" />
      <Tag2 x={1738} y={300} tag="DPT1-ENS0-PT1" desc={["Trykk sensor glykol", "brinesløyfe"]} anchor="start" />

      <RD x={1615} y={393} value="30" unit="Hz" tag="DPT1-ENS0-PU2" name="Brine circulation pump speed" group="Energy Plant" />
      <Eq title="Circulation pump glycol brine loop · DPT1-ENS0-PU2" onClick={pumpEq("DPT1-ENS0-PU2", "Circulation pump glycol brine loop", "30")}><SymPump cx={1645} cy={445} running={true} /></Eq>
      <ModeChip x={1598} y={437} mode="A" />
      <SymTrend cx={1678} cy={445} tag="DPT1-ENS0-PU2" name="Circulation pump glycol brine loop" group="Energy Plant" running={true} />
      <Tag2 x={1704} y={435} tag="DPT1-ENS0-PU2" desc={["Sirkulasjonspumpe", "glykol brinesløyfe"]} anchor="start" />

      <RD x={1690} y={520} w={90} value="13.9" unit="°C" tag="DPT1-ENS0-TT2" name="Temp glycol brine loop return" group="Energy Plant" />
      <Tag2 x={1738} y={475} tag="DPT1-ENS0-TT2" desc={["Temperatur sensor", "glykol brinesløyfe retur"]} anchor="start" />
      <RD x={1470} y={500} w={90} value="14.0" unit="°C" tag="DPT1-ENS0-TT1" name="Temp glycol brine loop supply" group="Energy Plant" />
      <Tag2 x={1515} y={455} tag="DPT1-ENS0-TT1" desc={["Temperatur sensor", "glykol brinesløyfe tur"]} />

      <Eq title="Shunt valve brine loop · DPT1-ENS0-RV1" onClick={valveEq("DPT1-ENS0-RV1", "Shunt valve brine loop", "5.2")}><SymValve cx={1685} cy={620} running={true} /></Eq>
      <ModeChip x={1704} y={612} mode="A" />
      <RD x={1620} y={580} w={60} value="5.2" unit="%" tag="DPT1-ENS0-RV1" name="Shunt valve brine loop" group="Energy Plant" />
      <Tag2 x={1748} y={617} tag="DPT1-ENS0-RV1" desc={["Shunt ventil brine sløyfe"]} anchor="start" />

      <Eq title="Brine loop · Brinesløyfe" onClick={open("DPT1-ENS0")}>
        <rect className="rasm-box" x={1548} y={800} width={168} height={72} rx="6" />
      </Eq>
      <text className="rasm-flag" x={1632} y={841} textAnchor="middle" style={{ fontWeight: 700, fontSize: "18px" }}>Brinesløyfe</text>
    </svg>
  );
}

const EP_TABS2 = ["Heat pump", "Energy plant", "Raw water"];
const EP_PARAMS2 = {
  // Varmepumpe — heat-pump control (DPT1-ENS0)
  "Heat pump": [
    { h: "Heat pump · DPT1-ENS0" },
    { l: "Pressure setpoint glycol pump, exchanger loop", v: "2.60 bar", tag: "DPT1-ENS0-PT2", edit: true },
    { l: "Glycol pump speed, with heat pump", v: "40.0 Hz", tag: "DPT1-ENS0-PU1", edit: true },
    { l: "Glycol pump speed, without heat pump", v: "30.0 Hz", tag: "DPT1-ENS0-PU1", edit: true },
    { l: "Heat pump mode", v: "Cooling", mode: "Cooling" },
    { l: "Temp setpoint glycol brine loop (cooling)", v: "18.0 °C", tag: "DPT1-ENS0-TT1", edit: true },
    { l: "Shunt valve opening (heating)", v: "100.0 %", tag: "DPT1-ENS0-RV1", edit: true },
    { h: "Controllers" },
    { l: "ENS0-PU1 · controller gain", v: "10", edit: true },
    { l: "ENS0-PU1 · integral time", v: "4.0 s", edit: true },
    { l: "ENS0-RV1 · controller gain", v: "3", edit: true },
    { l: "ENS0-RV1 · integral time", v: "90.0 s", edit: true },
  ],
  // Energianlegg — the two top-exchanger lines (ENS1, ENS2)
  "Energy plant": [
    { h: "Line 1 · DPT1-ENS1" },
    { l: "Top-exchanger pump speed", v: "30.0 Hz", tag: "DPT1-ENS1-PU2", edit: true },
    { l: "Level sensor pump sump", v: "0.0 cm", tag: "DPT1-SMP1-LT1", trend: true },
    { l: "Desired level in pump sump", v: "48.0 cm", edit: true },
    { l: "Temperature sensor pump sump", v: "14.5 °C", tag: "DPT1-SMP1-TT1", trend: true },
    { l: "Desired temperature in hatchery", v: "10.0 °C", edit: true },
    { l: "ENS1-PU2 · controller gain", v: "9.5", edit: true },
    { l: "ENS1-PU2 · integral time", v: "15.0 s", edit: true },
    { l: "ENS1-RV1 · controller gain", v: "2.0", edit: true },
    { l: "ENS1-RV1 · integral time", v: "1500.0 s", edit: true },
    { h: "Line 2 · DPT1-ENS2" },
    { l: "Top-exchanger pump speed", v: "30.0 Hz", tag: "DPT1-ENS2-PU2", edit: true },
    { l: "Level sensor pump sump", v: "47.9 cm", tag: "DPT1-SMP2-LT1", trend: true },
    { l: "Desired level in pump sump", v: "48.0 cm", edit: true },
    { l: "Temperature sensor pump sump", v: "10.1 °C", tag: "DPT1-SMP2-TT1", trend: true },
    { l: "Desired temperature in hatchery", v: "10.0 °C", edit: true },
    { l: "ENS2-PU2 · controller gain", v: "9.5", edit: true },
    { l: "ENS2-PU2 · integral time", v: "15.0 s", edit: true },
    { l: "ENS2-RV1 · controller gain", v: "2.0", edit: true },
    { l: "ENS2-RV1 · integral time", v: "1500.0 s", edit: true },
  ],
  // Råvann — raw-water intake (WIN0-PBS0)
  "Raw water": [
    { h: "Raw-water intake · WIN0-PBS0" },
    { l: "Raw water pressure", v: "2.91 bar", tag: "WIN0-PBS0-PT1", trend: true },
    { l: "Vacuum-vent valve opening", v: "86.3 %", tag: "WIN0-PBS0-AV1", trend: true },
    { l: "Raw water pressure setpoint", v: "3.00 bar", edit: true },
    { h: "Vent-valve curve" },
    { l: "Valve opening at high pressure", v: "85 %", edit: true },
    { l: "Valve opening at low pressure", v: "50 %", edit: true },
    { l: "Low-pressure breakpoint", v: "2.00 bar", edit: true },
    { h: "Pump control" },
    { l: "Start hysteresis, raw-water pump", v: "0.40 bar", edit: true },
    { l: "PBS0-PU1 · controller gain", v: "7.0", edit: true },
    { l: "PBS0-PU1 · integral time", v: "15.0 s", edit: true },
  ],
};

function EnergyPlantScreen() {
  return (
    <SystemShell title="Energy Plant" active="Energy Plant" statusLevel="ok"
      metaIcon="zap" metaLabel="Glycol heat pump · live"
      mimicIcon="zap" mimicTitle="Energy Plant · DPT1-ENS0" mimicCaption="Click equipment for controls · tap a value's trend icon to send it to Trends"
      mimic={<EnergyPlantMimic />}
      legend={<div className="ras-legend">
        <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running</span>
        <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Stopped</span>
        <span className="ci"><span className="rasm-leg-chip">A</span> Auto</span>
        <span className="ci"><span className="rasm-leg-chip man">M</span> Manual</span>
        <span className="ras-leg-div" aria-hidden="true" />
        <FluidLegend of={["raw", "drain", "glycol", "brine"]} />
      </div>}
      param={<ParamTabs tabs={EP_TABS2} params={EP_PARAMS2} title="Energy Plant · parameters" />} />
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, { "Energy Plant": EnergyPlantScreen });
Object.assign(window, { EnergyPlantMimic, EnergyPlantScreen });
