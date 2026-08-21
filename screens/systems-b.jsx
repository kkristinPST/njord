// systems-b.jsx — Batch 2 SCADA system screens: Sorting, Hatchery
// (Sludge Treatment moved to its own faithful mimic: screens/sludge-treatment.jsx)

/* ───────────────────────── SORTING (Building 1) ───────────────────────── */
function SortingMimic() {
  const open = (t) => () => openEquipment(t);
  const pumpEq = (tag, name) => njBuildEquip(tag, name, "pump", {
    primary: { l: "Speed", v: "0", u: "Hz" }, running: false,
    readouts: [{ l: "Speed", v: "0", u: "Hz", tag }],
  });
  const ROWS = [
    { cy: 120, inlet: "Fish Tank DPT1", outlet: "RAS DPT1", tag: "DPT1-FTA0-PU1", name: "Drain pump DPT1", mode: "A" },
    { cy: 310, inlet: "Fish Tank DPT2", outlet: "RAS DPT2", tag: "DPT2-FTA0-PU1", name: "Drain pump DPT2", mode: "A" },
    { cy: 500, inlet: "RAS DPT2", outlet: "Sorting", tag: "DPT2-FHA0-PU1", name: "Sorting water pump", mode: "M" },
  ];
  return (
    <svg className="rasm" viewBox="0 0 1200 610" role="img" aria-label="Sorting process mimic" preserveAspectRatio="xMidYMid meet">
      {ROWS.map((r) => <path key={"p" + r.tag} d={`M184,${r.cy} H1000`} className="rasm-pipe fl-proc" />)}

      {ROWS.map((r) => (
        <React.Fragment key={r.tag}>
          <SlFlag x={20} y={r.cy - 17} w={150} label={r.inlet} />
          <SlFlag x={1000} y={r.cy - 17} w={120} label={r.outlet} />
          <RD x={468} y={r.cy - 58} w={58} value="0" unit="Hz" tag={r.tag} name={r.name + " speed"} group="Sorting" />
          <Eq title={r.name} onClick={open(pumpEq(r.tag, r.name))}><SymPump cx={500} cy={r.cy} running={false} /></Eq>
          <ModeChip x={448} y={r.cy - 9} mode={r.mode} />
          <SymTrend cx={532} cy={r.cy} tag={r.tag} name={r.name} group="Sorting" running={false} />
          <Tag2 x={500} y={r.cy + 66} tag={r.tag} desc={[r.name]} />
        </React.Fragment>
      ))}

      {/* sorting water pressure */}
      <Tag2 x={800} y={452} tag="DPT2-FHA0-PT1" desc={["Sorting water pressure"]} />
      <RD x={768} y={470} w={64} value="0.3" unit="bar" tag="DPT2-FHA0-PT1" name="Sorting water pressure" group="Sorting" />
    </svg>
  );
}
const SO_TABS = ["Start Feeding", "Growth", "Sorting water"];
const SO_PARAMS = {
  "Start Feeding": [
    { l: "Tank selection", v: "None selected" },
    { l: "Level in tank", v: "3200 cm" },
    { l: "Level setpoint", v: "0 cm", box: true },
    { l: "Max speed", v: "45.0 Hz", box: true },
    { l: "Start draining", v: "Off" },
  ],
  "Growth": [
    { l: "Tank selection", v: "Fish Tank 10" },
    { l: "Level in tank", v: "21 cm" },
    { l: "Level setpoint", v: "50 cm", box: true },
    { l: "Max speed", v: "35.0 Hz", box: true },
    { l: "Start draining", v: "Off" },
  ],
  "Sorting water": [
    { l: "Sorting water pressure", v: "0.3 bar" },
    { l: "Sorting water pressure setpoint", v: "2.0 bar", box: true },
    { l: "Start vaccination delivery pump", v: "Off" },
  ],
};
function SortingScreen() {
  return (
    <SystemShell title="Sorting" active="Sorting" statusLevel="ok"
      metaIcon="filter" metaLabel="Grading + drain · live"
      mimicIcon="filter" mimicTitle="Sorting · DPT-FHA0 · Building 1"
      mimicCaption="Click equipment for controls · tap a value's trend icon to send it to Trends"
      mimic={<SortingMimic />}
      legend={<ScadaLegend fluids={["proc"]} />}
      param={<ParamTabs tabs={SO_TABS} params={SO_PARAMS} title="Sorting · parameters" />} />
  );
}

/* ───────────────────────── HATCHERY (Building 1) ───────────────────────── */
// Faithful P&ID rebuilt in the RAS-mimic style (shared symbols from ras-mimic.jsx).
// Two symmetric vacuum-degasser / incubation loops (ENS1 top, ENS2 bottom) feeding a
// shared bank of 4 incubation cabinets. Reuses the exact SymPump / SymValve / SymMotor /
// RD / Tag2 / Eq / Flag / SumpBasin / StripperColumn / ModeChip / GreenMark primitives.

// solid directional check valve (▶) — sits beside the emergency bowtie valve
function HxCheck({ cx, cy, s = 1 }) {
  return <path d={`M${cx - 9 * s},${cy - 9 * s} L${cx + 9 * s},${cy} L${cx - 9 * s},${cy + 9 * s} Z`} fill="#2b3647" />;
}
// small rotameter / flow sight glass with a red float — on the flush-water inlet
function HxRota({ cx, cy }) {
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={16} fill="var(--sc-fill-lite)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      <circle cx={cx} cy={cy} r={4.5} fill="var(--critical)" />
    </g>
  );
}
// UV-filter body — horizontal lamp chamber with an inline W/m² readout
function HxUv({ x, y, tag, name, value, mode }) {
  return (
    <g>
      <Eq title={name} onClick={() => openEquipment(njBuildEquip(tag, name, "sensor", { primary: { l: "Irradiance", v: value, u: "W/m²" }, readouts: [{ l: "UV irradiance", v: value, u: "W/m²", tag }] }))}>
        <rect className="rasm-box" x={x} y={y} width={128} height={54} rx="6" />
        <line x1={x + 10} y1={y + 12} x2={x + 118} y2={y + 12} stroke="var(--sc-line)" strokeWidth="2" />
        <line x1={x + 10} y1={y + 42} x2={x + 118} y2={y + 42} stroke="var(--sc-line)" strokeWidth="2" />
      </Eq>
      <RD x={x + 20} y={y + 15} w={88} value={value} unit="W/m²" tag={tag} name={name} group="Hatchery" />
      <ModeChip x={x + 130} y={y + 37} mode={mode} />
    </g>
  );
}
// incubation cabinet rack — stacked trays with a central spine (the egg cabinets)
function HxCabinet({ x, y, w, h }) {
  const rows = 9, ih = h - 16, gap = ih / rows;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="4" fill="var(--sc-node)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      <rect x={x + 6} y={y + 8} width={w - 12} height={ih} fill="var(--sc-vessel)" stroke="var(--sc-line)" strokeWidth="1" />
      {Array.from({ length: rows }).map((_, i) => (
        <line key={i} x1={x + 6} y1={y + 8 + i * gap} x2={x + w - 6} y2={y + 8 + i * gap} stroke="var(--sc-line)" strokeWidth="1.3" />
      ))}
      <line x1={x + w / 2} y1={y + 8} x2={x + w / 2} y2={y + 8 + ih} stroke="var(--sc-edge)" strokeWidth="3" />
    </g>
  );
}

// one degasser loop, offset vertically by `oy`. `c` = per-loop live values.
function HxLoop({ oy, c }) {
  const run = c.running, mode = run ? "A" : "M";
  const open = (t) => () => openEquipment(t);
  const Y = (r) => oy + r;
  const pipes = [
    { k: "raw",   d: `M136,${Y(37)} H585` },                    // Spedevann → emergency valve
    { k: "raw",   d: `M628,${Y(37)} H1214 V${Y(72)}` },         // valve → vacuum degasser top
    { k: "proc",  d: `M136,${Y(167)} H360` },                   // Toppveksler inlet → sump
    { k: "raw",   d: `M136,${Y(212)} H299` }, { k: "raw", d: `M331,${Y(212)} H360` }, // Spylevann → rotameter → sump
    { k: "proc",  d: `M550,${Y(210)} H655` },                   // sump → circulation pump
    { k: "proc",  d: `M690,${Y(189)} V${Y(95)} H882` },         // circ pump → riser → flowmeter
    { k: "proc",  d: `M958,${Y(95)} H1000` },                   // flowmeter → UV filter
    { k: "proc",  d: `M1128,${Y(95)} H1214 V${Y(72)}` },        // UV filter → degasser top
    { k: "proc",  d: `M1261,${Y(118)} H1320` },                  // degasser → cabinet feed
    { k: "proc",  d: `M550,${Y(255)} H655` }, { k: "proc", d: `M725,${Y(268)} H800` }, // sump → toppveksler pump → outlet
    { k: "drain", d: `M550,${Y(340)} H655` }, { k: "drain", d: `M725,${Y(352)} H800` }, // sump → avløpsveksler pump → outlet
  ];
  return (
    <g>
      {pipes.map((p, i) => <path key={"hp" + oy + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      {/* inlets */}
      <Flag x={40} y={Y(20)} label="Spedevann" dir="r" />
      <Flag x={40} y={Y(150)} label="Toppveksler" dir="r" />
      <Flag x={40} y={Y(195)} label="Spylevann" dir="r" />
      <HxRota cx={315} cy={Y(212)} />

      {/* emergency water valve */}
      <Eq title={`Emergency water valve · DPT1-ENS${c.n}-V1`} onClick={open(njBuildEquip(`DPT1-ENS${c.n}-V1`, "Emergency water valve", "valve", { primary: { l: "State", v: "Closed", u: "" } }))}>
        <SymValve cx={597} cy={Y(37)} running={false} />
      </Eq>
      <HxCheck cx={628} cy={Y(37)} />
      <ModeChip x={640} y={Y(29)} mode="M" />
      <Tag2 x={597} y={Y(2)} tag={`DPT1-ENS${c.n}-V1`} desc={["Nødvann ventil"]} />

      {/* pump sump + agitator */}
      <Eq title={`Pump sump · DPT1-SMP${c.n}`} onClick={open(`DPT1-SMP${c.n}`)}><SumpBasin x={360} y={Y(165)} w={190} h={95} /></Eq>
      <Eq title="Agitator" onClick={open(njBuildEquip(`DPT1-SMP${c.n}-AG1`, "Sump agitator", "motor"))}>
        <rect className="rasm-box" x={393} y={Y(150)} width={44} height={34} rx="4" />
        <SymMotor cx={415} cy={Y(167)} s={0.42} running={run} />
      </Eq>
      <RD x={456} y={Y(292)} w={70} value={c.smpLt} unit="cm" tag={`DPT1-SMP${c.n}-LT1`} name="Level pump sump" group="Hatchery" />
      <Tag2 x={491} y={Y(324)} tag={`DPT1-SMP${c.n}-LT1`} desc={["Nivå sensor", "pumpesump"]} />
      <RD x={456} y={Y(346)} w={70} value={c.smpTt} unit="°C" tag={`DPT1-SMP${c.n}-TT1`} name="Temperature pump sump" group="Hatchery" />

      {/* circulation pump */}
      <Eq title={`Circulation pump · DPT1-SMP${c.n}-PU1`} onClick={open(`DPT1-SMP${c.n}-PU1`)}><SymPump cx={690} cy={Y(210)} running={run} /></Eq>
      <ModeChip x={650} y={Y(202)} mode={mode} />
      <SymTrend cx={722} cy={Y(210)} tag={`DPT1-SMP${c.n}-PU1`} name="Circulation pump" group="Hatchery" running={run} />
      <RD x={657} y={Y(158)} value={c.circHz} unit="Hz" tag={`DPT1-SMP${c.n}-PU1`} name="Circulation pump speed" group="Hatchery" />
      <Tag2 x={690} y={Y(122)} tag={`DPT1-SMP${c.n}-PU1`} desc={["Sirkulasjon pumpe"]} />

      {/* flow meter */}
      <RD x={857} y={Y(83)} w={72} value={c.flow} unit="l/m" tag={`DPT1-SMP${c.n}-FT1`} name="Circulation flow" group="Hatchery" />
      <Tag2 x={893} y={Y(50)} tag={`DPT1-SMP${c.n}-FT1`} desc={["Flowmeter sirkulasjon"]} />

      {/* UV filter */}
      <HxUv x={1000} y={Y(68)} tag={`DPT1-DUV${c.n}-UV1`} name="UV-filter" value={c.uv} mode={mode} />
      <Tag2 x={1064} y={Y(50)} tag={`DPT1-DUV${c.n}-UV1`} desc={["UV-filter"]} />

      {/* vacuum degasser */}
      <Eq title={`Vacuum degasser · DPT1-STR${c.n}`} onClick={open(`DPT1-STR${c.n}`)}><StripperColumn x={1167} y={Y(72)} w={94} h={112} /></Eq>
      <RD x={1181} y={Y(196)} w={66} value={c.str} unit="cm" tag={`DPT1-STR${c.n}-LT1`} name="Level vacuum degasser" group="Hatchery" />
      <Tag2 x={1214} y={Y(228)} tag={`DPT1-STR${c.n}-LT1`} desc={["Nivå sensor", "vacuum lufter"]} />

      {/* heat-exchanger circulation pumps */}
      <Eq title={`Top exchanger pump · DPT1-ENS${c.n}-PU1`} onClick={open(`DPT1-ENS${c.n}-PU1`)}><SymPump cx={690} cy={Y(268)} running={run} s={1} /></Eq>
      <ModeChip x={650} y={Y(260)} mode={mode} />
      <SymTrend cx={722} cy={Y(268)} tag={`DPT1-ENS${c.n}-PU1`} name="Top exchanger pump" group="Hatchery" running={run} />
      <RD x={657} y={Y(226)} value={c.topHz} unit="Hz" tag={`DPT1-ENS${c.n}-PU1`} name="Top exchanger pump speed" group="Hatchery" />
      <Tag2 x={690} y={Y(292)} tag={`DPT1-ENS${c.n}-PU1`} desc={["Pumpe toppveksler"]} />
      <Flag x={800} y={Y(251)} label="Toppveksler" dir="r" />

      <Eq title={`Drain exchanger pump · DPT1-ENS${c.n}-PU2`} onClick={open(`DPT1-ENS${c.n}-PU2`)}><SymPump cx={690} cy={Y(352)} running={run} s={1} /></Eq>
      <ModeChip x={650} y={Y(344)} mode={mode} />
      <SymTrend cx={722} cy={Y(352)} tag={`DPT1-ENS${c.n}-PU2`} name="Drain exchanger pump" group="Hatchery" running={run} />
      <RD x={657} y={Y(378)} value={c.avlHz} unit="Hz" tag={`DPT1-ENS${c.n}-PU2`} name="Drain exchanger pump speed" group="Hatchery" />
      <Tag2 x={690} y={Y(418)} tag={`DPT1-ENS${c.n}-PU2`} desc={["Pumpe avløpsveksler"]} />
      <Flag x={800} y={Y(335)} label="Avløpsveksler" dir="r" />
    </g>
  );
}

function HatcheryMimic() {
  const loop1 = { n: 1, running: false, circHz: "0", flow: "0", uv: "0.1", str: "3.8", smpLt: "0.0", smpTt: "14.4", topHz: "0", avlHz: "0" };
  const loop2 = { n: 2, running: true, circHz: "30", flow: "126", uv: "34.3", str: "60.8", smpLt: "48.0", smpTt: "9.9", topHz: "30", avlHz: "26" };
  // shared cabinet bank + connecting bus (loop1 feeds top manifold, loop2 the bottom)
  const cabX = [1360, 1436, 1512, 1588], cabW = 64, cabY = 372, cabH = 216;
  const busPipes = [
    "M1320,158 H1340 V320", "M1340,320 H1652",             // loop1 degasser → top bus
    "M1320,628 H1340 V648", "M1340,648 H1652",             // loop2 degasser → bottom bus
  ];
  return (
    <svg className="rasm" viewBox="0 0 1700 980" role="img" aria-label="Hatchery vacuum-degasser process mimic" preserveAspectRatio="xMidYMid meet">
      <HxLoop oy={40} c={loop1} />
      <HxLoop oy={510} c={loop2} />

      {/* shared incubation cabinet bank */}
      {busPipes.map((d, i) => <path key={"bus" + i} d={d} className="rasm-pipe fl-proc" />)}
      {cabX.map((x, i) => (
        <g key={"cab" + i}>
          {/* top valve pair (from loop 1) */}
          <path d={`M${x + cabW / 2},320 V352`} className="rasm-pipe fl-proc" />
          <SymValve cx={x + cabW / 2 - 15} cy={340} s={0.72} running={false} />
          <SymValve cx={x + cabW / 2 + 15} cy={340} s={0.72} running={false} />
          <HxCabinet x={x} y={cabY} w={cabW} h={cabH} />
          {/* bottom valve pair (from loop 2) */}
          <path d={`M${x + cabW / 2},${cabY + cabH} V648`} className="rasm-pipe fl-proc" />
          <SymValve cx={x + cabW / 2 - 15} cy={628} s={0.72} running={false} />
          <SymValve cx={x + cabW / 2 + 15} cy={628} s={0.72} running={false} />
        </g>
      ))}
      <text className="rasm-flag" x={1474} y={300} textAnchor="middle" style={{ fontWeight: 700 }}>Incubation cabinets</text>
    </svg>
  );
}
const HX_TABS = ["Loop 1", "Loop 2"];
const HX_PARAMS = {
  "Loop 1": [
    { h: "Vacuum degasser · STR1" },
    { l: "Level vacuum degasser", v: "3.8 cm", tag: "DPT1-STR1-LT1", trend: true },
    { l: "High alarm", v: "60.0 cm", box: true }, { l: "Low alarm", v: "2.0 cm", box: true },
    { h: "Pump sump · SMP1" },
    { l: "Level pump sump", v: "0.0 cm", tag: "DPT1-SMP1-LT1", trend: true },
    { l: "Temperature", v: "14.4 °C", tag: "DPT1-SMP1-TT1", trend: true },
    { h: "Circulation" },
    { l: "Circulation pump speed", v: "0 Hz", tag: "DPT1-SMP1-PU1" },
    { l: "Flow", v: "0 l/m", tag: "DPT1-SMP1-FT1", trend: true },
    { l: "UV irradiance", v: "0.1 W/m²", tag: "DPT1-DUV1-UV1", trend: true },
  ],
  "Loop 2": [
    { h: "Vacuum degasser · STR2" },
    { l: "Level vacuum degasser", v: "60.8 cm", tag: "DPT1-STR2-LT1", trend: true },
    { l: "High alarm", v: "60.0 cm", box: true }, { l: "Low alarm", v: "2.0 cm", box: true },
    { h: "Pump sump · SMP2" },
    { l: "Level pump sump", v: "48.0 cm", tag: "DPT1-SMP2-LT1", trend: true },
    { l: "Temperature", v: "9.9 °C", tag: "DPT1-SMP2-TT1", trend: true },
    { h: "Circulation" },
    { l: "Circulation pump speed", v: "30 Hz", tag: "DPT1-SMP2-PU1" },
    { l: "Flow", v: "126 l/m", tag: "DPT1-SMP2-FT1", trend: true },
    { l: "UV irradiance", v: "34.3 W/m²", tag: "DPT1-DUV2-UV1", trend: true },
  ],
};
function HatcheryScreen() {
  return (
    <SystemShell title="Hatchery" active="Hatchery" statusLevel="ok"
      metaIcon="egg" metaLabel="Vacuum degasser loops · live"
      mimicIcon="egg" mimicTitle="Hatchery · DPT1" mimicCaption="Click equipment for controls · tap a value's trend icon to send it to Trends"
      mimic={<HatcheryMimic />}
      legend={<ScadaLegend fluids={["raw", "proc", "drain"]} />}
      param={<ParamTabs tabs={HX_TABS} params={HX_PARAMS} title="Hatchery · parameters" />} />
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Sorting": SortingScreen,
  "Hatchery": HatcheryScreen,
});
Object.assign(window, { SortingScreen, HatcheryScreen });
