// water-treatment.jsx — faithful Building 1 Water Treatment process mimic, rebuilt from the
// legacy SCADA capture in the NJORD DS language. Mirrors the RAS mimic approach:
//   • equipment (pumps / valves / exchanger / chiller / filter skid / UV) → click for popup
//   • every value readout shows an ALWAYS-ON trend icon to the right (RD from ras-mimic.jsx)
//   • consistent status coloring — green body = running/open, dark body = stopped/closed
//     (SymPump / SymValve reused so a pump and a valve read identically)
// Reuses globals from ras-mimic.jsx: SymPump, SymValve, RD, Tag2, ModeChip, Eq, Flag.

/* ───────────── water-treatment-specific symbols ───────────── */
// counter-flow heat exchanger — square with an internal X
function WtHeatExchanger({ x, y, s = 58 }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={s} height={s} rx="5" fill="var(--sc-node)" stroke="var(--sc-edge)" strokeWidth="1.6" />
      <path d={`M${x + 6},${y + 6} L${x + s - 6},${y + s - 6} M${x + s - 6},${y + 6} L${x + 6},${y + s - 6}`} stroke="var(--sc-edge)" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}
// inlet UV reactor — horizontal tube with three lamp dots
function WtUvReactor({ x, y, w = 120, h = 40, value, unit }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="7" fill="var(--sc-fill-lite)" stroke="var(--sc-line)" strokeWidth="1.5" />
      <rect x={x + 8} y={y + h - 11} width={w - 16} height={5} rx="2.5" fill="var(--sc-fill-lite)" />
      {[0.26, 0.5, 0.74].map((f, i) => (
        <circle key={i} cx={x + w * f} cy={y + 14} r="4.6" fill="var(--sc-node)" stroke="var(--sc-line)" strokeWidth="1.4" />
      ))}
    </g>
  );
}
// vertical pressure filter vessel (one of the two in the filter skid)
function WtFilterVessel({ cx, top, w = 40, h = 150 }) {
  const x = cx - w / 2, r = w / 2;
  return (
    <g aria-hidden="true">
      <path d={`M${x},${top + r} a${r},${r} 0 0 1 ${w},0 V${top + h - r} a${r},${r} 0 0 1 ${-w},0 Z`} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      <rect x={x + 5} y={top + h * 0.34} width={w - 10} height={h * 0.6} rx="3" fill="var(--sc-water)" opacity="0.5" />
    </g>
  );
}
// chiller / heat-pump cabinet — dark enclosure with a compressor glyph
function WtChiller({ x, y, w = 132, h = 84, onClick }) {
  return (
    <Eq onClick={onClick} title={onClick ? "Chiller / heat pump" : undefined}>
      <rect className="wtm-chbox" x={x} y={y} width={w} height={h} rx="8" />
      <circle cx={x + 30} cy={y + h / 2 + 6} r="15" fill="var(--sc-edge)" stroke="var(--sc-line)" strokeWidth="1.4" />
      <path d={`M${x + 30},${y + h / 2 - 9} V${y + h / 2 + 21} M${x + 18},${y + h / 2 + 6} h24`} stroke="var(--sc-line)" strokeWidth="2.4" strokeLinecap="round" />
      <text className="wtm-chttl" x={x + 54} y={y + 30} >Chiller /</text>
      <text className="wtm-chttl" x={x + 54} y={y + 46} >heat pump</text>
    </Eq>
  );
}
// plain process box (heat pump / fish barrier destination block)
function WtBlock({ x, y, w, h, label, onClick }) {
  return (
    <Eq onClick={onClick} title={onClick ? label : undefined}>
      <rect className="rasm-box" x={x} y={y} width={w} height={h} rx="8" />
      <text className="wtm-blk" x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle">{label}</text>
    </Eq>
  );
}

/* ───────────── pipe network (gray hairlines, status carries color) ───────────── */
// fluid-tagged pipe network (NJ_FLUIDS): raw = intake / make-up water, proc = treated water
// to the departments, drain = booster discharge to the fish barrier, glycol = heat-control loop.
const WTM_PIPES = [
  // intake → filter skid
  { k: "raw", d: "M138,430 H300" },
  { k: "raw", d: "M321,430 H360 V360 H392" },
  // filter skid → UV → after-filter → heat exchanger
  { k: "raw", d: "M436,175 V152 H500" },
  { k: "raw", d: "M620,152 H690 V300 H699" },
  // heat exchanger → drain booster pump → fish barrier
  { k: "drain", d: "M757,300 H869" },
  { k: "drain", d: "M911,300 H963" },
  // heat exchanger top → make-up manifold → DPT1 / DPT2 valves
  { k: "proc", d: "M728,271 V100 H1140 V345" },
  { k: "proc", d: "M1140,210 H1188" }, { k: "proc", d: "M1140,345 H1188" },
  { k: "proc", d: "M1262,210 H1300" }, { k: "proc", d: "M1262,345 H1300" },
  // chiller stub
  { k: "glycol", d: "M1126,388 V345" },
  // bottom heat-control loop
  { k: "glycol", d: "M115,585 H224" }, { k: "glycol", d: "M276,585 H392" },
  { k: "glycol", d: "M115,700 H224" }, { k: "glycol", d: "M276,700 H620" },
  { k: "glycol", d: "M115,805 H224" }, { k: "glycol", d: "M276,805 H620" },
  // right-edge outputs
  { k: "glycol", d: "M1233,700 H1300" }, { k: "glycol", d: "M1233,805 H1300" },
  // heat pump ↔ loop (schematic)
  { k: "glycol", d: "M1015,705 V675" },
];

function WaterTreatmentMimic() {
  const open = (t) => () => openEquipment(t);
  const eq = (tag, name, kind, extra) => () => openEquipment(njBuildEquip(tag, name, kind, extra));
  return (
    <svg className="rasm" viewBox="0 0 1456 884" role="img" aria-label="Water treatment process mimic" preserveAspectRatio="xMidYMid meet">
      {WTM_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      {/* ───── summary readouts (top-left) ───── */}
      <Tag2 x={40} y={24} anchor="start" desc={["Total flow: plant"]} />
      <RD x={40} y={44} w={86} value="65.6" unit="m³/h" tag="WIN0-FT-PLANT" name="Total flow: plant" group="Water Treatment" />
      <Tag2 x={40} y={94} anchor="start" desc={["Total flow: Building 1"]} />
      <RD x={40} y={114} w={86} value="14.0" unit="m³/h" tag="WIN0-FT-B1" name="Total flow Building 1" group="Water Treatment" />
      <Tag2 x={40} y={164} anchor="start" desc={["Total flow: Building 2"]} />
      <RD x={40} y={184} w={86} value="51.6" unit="m³/h" tag="WIN0-FT-B2" name="Total flow Building 2" group="Water Treatment" />

      <Tag2 x={224} y={26} anchor="start" tag="UTE0-TT1" desc={["Outdoor temperature"]} />
      <RD x={224} y={47} w={78} value="15.0" unit="°C" tag="UTE0-TT1" name="Outdoor temperature" group="Water Treatment" />
      <Tag2 x={224} y={110} anchor="start" tag="HTL0-JK1" desc={["Compressor air pressure"]} />
      <RD x={224} y={131} w={78} value="5.2" unit="bar" tag="HTL0-JK1" name="Compressor air pressure" group="Water Treatment" />
      <Tag2 x={224} y={194} anchor="start" tag="DPT1-WIN0-TT1" desc={["Intake water temperature"]} />
      <RD x={224} y={215} w={78} value="6.2" unit="°C" tag="DPT1-WIN0-TT1" name="Intake water temperature" group="Water Treatment" />

      {/* ───── intake ───── */}
      <Flag x={42} y={413} label="Intake water" dir="r" />
      <RD x={270} y={380} value="0" unit="Hz" tag="WIN0-PBS0-PU1" name="Intake pump speed" group="Water Treatment" />
      <Eq title="Intake pump to plant" onClick={open("WIN0-PBS0-PU1")}><SymPump cx={300} cy={430} running={false} /></Eq>
      <ModeChip x={260} y={422} mode="M" />
      <SymTrend cx={330} cy={430} tag="WIN0-PBS0-PU1" name="Intake pump to plant" group="Water Treatment" running={false} />
      <Tag2 x={300} y={466} tag="WIN0-PBS0-PU1" desc={["Intake pump to plant"]} />

      {/* ───── filter skid ───── */}
      <Tag2 x={420} y={96} tag="DPT0-WIN0-PT3" desc={["Differential pressure", "across skid"]} />
      <RD x={390} y={130} value="0.03" unit="bar" tag="DPT0-WIN0-PT3" name="Differential pressure across filter skid" group="Filter Skid" />

      <Tag2 x={300} y={284} tag="DPT0-WIN0-PT1" desc={["Pressure before", "filter skid"]} />
      <RD x={270} y={320} value="1.8" unit="bar" tag="DPT0-WIN0-PT1" name="Pressure before filter skid" group="Filter Skid" />

      <Eq title="Filter skid" onClick={open(njBuildEquip("WIN0-FIL0", "Filter skid", "drumfilter", { primary: { l: "ΔP", v: "0.03", u: "bar" }, readouts: [{ l: "Differential pressure", v: "0.03", u: "bar", tag: "DPT0-WIN0-PT3" }] }))}>
        <rect className="wtm-skid" x={388} y={175} width={96} height={216} rx="8" />
        <WtFilterVessel cx={414} top={192} h={182} />
        <WtFilterVessel cx={460} top={192} h={182} />
      </Eq>
      <Tag2 x={436} y={406} tag="WIN0-FIL0" desc={["Filter skid"]} />

      {/* ───── inlet UV ───── */}
      <Tag2 x={560} y={86} tag="WIN0-UV1" desc={["Inlet UV", "Stopped by warning"]} />
      <Eq title="Inlet UV reactor" onClick={open(njBuildEquip("WIN0-UV1", "Inlet UV reactor", "drumfilter", { primary: { l: "Dose", v: "0.0", u: "mj/cm²" }, readouts: [{ l: "UV dose", v: "0.0", u: "mj/cm²", tag: "WIN0-UV1-QT1" }] }))}>
        <WtUvReactor x={500} y={130} />
      </Eq>
      <RD x={530} y={178} w={84} value="0.0" unit="mj/cm²" tag="WIN0-UV1-QT1" name="Inlet UV dose" group="Filter Skid" />

      {/* ───── heat exchanger ───── */}
      <Eq title="Heat exchanger" onClick={open(njBuildEquip("WIN0-HEX0", "Heat exchanger", "drumfilter", { primary: { l: "Temp out", v: "7.2", u: "°C" }, readouts: [{ l: "Make-up water temp after exchanger", v: "7.2", u: "°C", tag: "DPT1-WIN0-TT2" }] }))}>
        <WtHeatExchanger x={699} y={271} />
      </Eq>
      <Tag2 x={728} y={348} tag="WIN0-HEX0" desc={["Heat exchanger"]} />

      <Tag2 x={620} y={208} tag="DPT0-WIN0-PT2" desc={["Pressure after", "filter skid"]} />
      <RD x={590} y={238} value="1.8" unit="bar" tag="DPT0-WIN0-PT2" name="Pressure after filter skid" group="Filter Skid" />

      <Tag2 x={790} y={186} tag="DPT1-WIN0-TT2" desc={["Make-up water temp", "after exchanger"]} />
      <RD x={760} y={222} value="7.2" unit="°C" tag="DPT1-WIN0-TT2" name="Make-up water temp after exchanger" group="Heat Control" />

      {/* ───── drain booster pump → fish barrier ───── */}
      <RD x={788} y={268} value="0" unit="Hz" tag="DPT0-ENS0-PU1" name="Drain water booster pump speed" group="Heat Control" />
      <Eq title="Drain water booster pump" onClick={open("DPT0-ENS0-PU1")}><SymPump cx={890} cy={314} running={false} /></Eq>
      <ModeChip x={850} y={306} mode="M" />
      <SymTrend cx={920} cy={314} tag="DPT0-ENS0-PU1" name="Drain water booster pump" group="Heat Control" running={false} />
      <Tag2 x={890} y={350} tag="DPT0-ENS0-PU1" desc={["Drain water booster pump"]} />
      <Flag x={963} y={297} label="Fish Barrier" dir="r" />

      {/* ───── make-up water DPT1 ───── */}
      <Tag2 x={1076} y={120} tag="DPT1-ENS0-FT3" desc={["Make-up water", "flow: start feeding"]} />
      <RD x={1044} y={166} w={66} value="4.6" unit="m³/h" tag="DPT1-ENS0-FT3" name="Make-up water flow: start feeding" group="Heat Control" />
      <Tag2 x={1245} y={120} tag="DPT1-ENS0-RV1" desc={["Make-up water valve", "start feeding"]} />
      <RD x={1213} y={166} w={58} value="23" unit="%" tag="DPT1-ENS0-RV1" name="Make-up water valve: start feeding" group="Heat Control" />
      <Eq title="Make-up valve DPT1" onClick={open(njBuildEquip("DPT1-ENS0-RV1", "Make-up water valve: start feeding", "valve", { primary: { l: "Opening", v: "23", u: "%" }, readouts: [{ l: "Valve opening", v: "23", u: "%", tag: "DPT1-ENS0-RV1" }] }))}>
        <SymValve cx={1205} cy={210} running={true} /><SymValve cx={1240} cy={210} running={true} />
      </Eq>
      <ModeChip x={1257} y={202} mode="M" />
      <Flag x={1300} y={193} label="Make-up DPT1" dir="r" />

      {/* ───── make-up water DPT2 ───── */}
      <Tag2 x={1076} y={255} tag="DPT2-ENS0-FT3" desc={["Make-up water", "flow: growth"]} />
      <RD x={1044} y={301} w={66} value="9.4" unit="m³/h" tag="DPT2-ENS0-FT3" name="Make-up water flow: growth" group="Heat Control" />
      <Tag2 x={1245} y={255} tag="DPT2-ENS0-RV1" desc={["Make-up water valve", "growth"]} />
      <RD x={1213} y={301} w={58} value="32" unit="%" tag="DPT2-ENS0-RV1" name="Make-up water valve: growth" group="Heat Control" />
      <Eq title="Make-up valve DPT2" onClick={open(njBuildEquip("DPT2-ENS0-RV1", "Make-up water valve: growth", "valve", { primary: { l: "Opening", v: "32", u: "%" }, readouts: [{ l: "Valve opening", v: "32", u: "%", tag: "DPT2-ENS0-RV1" }] }))}>
        <SymValve cx={1205} cy={345} running={true} /><SymValve cx={1240} cy={345} running={true} />
      </Eq>
      <ModeChip x={1257} y={337} mode="M" />
      <Flag x={1300} y={328} label="Make-up DPT2" dir="r" />

      {/* ───── chiller / heat pump ───── */}
      <WtChiller x={1060} y={388} onClick={open(njBuildEquip("DPT2-ENS1", "Chiller / heat pump", "drumfilter", { primary: { l: "Glycol temp", v: "7.5", u: "°C" }, readouts: [{ l: "Glycol temperature, chiller", v: "7.5", u: "°C", tag: "DPT2-ENS1-TT3" }] }))} />
      <Tag2 x={1278} y={452} tag="DPT2-ENS1-TT3" desc={["Glycol temperature", "chiller"]} />
      <RD x={1248} y={488} w={58} value="7.5" unit="°C" tag="DPT2-ENS1-TT3" name="Glycol temperature: chiller" group="Heat Control" />

      <Eq title="Chiller shunt valve" onClick={open(njBuildEquip("DPT2-ENS1-MV1", "Chiller shunt valve", "valve", { primary: { l: "Opening", v: "0", u: "%" }, readouts: [{ l: "Valve opening", v: "0", u: "%", tag: "DPT2-ENS1-MV1" }] }))}>
        <SymValve cx={1120} cy={525} running={true} />
      </Eq>
      <RD x={1042} y={513} w={50} value="0" unit="%" tag="DPT2-ENS1-MV1" name="Chiller shunt valve opening" group="Heat Control" />
      <Tag2 x={1120} y={560} tag="DPT2-ENS1-MV1" desc={["Chiller shunt valve"]} />

      <Tag2 x={1300} y={538} tag="DPT2-ENS1-TT4" desc={["Process water temp", "after chiller"]} />
      <RD x={1270} y={574} w={58} value="7.8" unit="°C" tag="DPT2-ENS1-TT4" name="Process water temperature after chiller" group="Heat Control" />

      {/* mid temps (between chiller and bottom loop) */}
      <Tag2 x={830} y={548} tag="DPT2-ENS1-TT2" desc={["Process water temp", "supply: chiller"]} />
      <RD x={800} y={584} w={58} value="9.2" unit="°C" tag="DPT2-ENS1-TT2" name="Process water temperature supply: chiller" group="Heat Control" />
      <Tag2 x={980} y={548} tag="DPT2-ENS1-TT1" desc={["Glycol temperature", "chiller return"]} />
      <RD x={950} y={584} w={58} value="8.6" unit="°C" tag="DPT2-ENS1-TT1" name="Glycol temperature: chiller return" group="Heat Control" />

      {/* ───── bottom heat-control loop ───── */}
      <Flag x={28} y={568} label="RAS DPT2" dir="r" />
      <Flag x={28} y={683} label="RAS DPT2" dir="r" />
      <Flag x={28} y={788} label="RAS DPT1" dir="r" />

      {/* row A: drain pump (growth, stopped) */}
      <RD x={140} y={573} value="0" unit="Hz" tag="DPT2-ENS0-PU2" name="Drain pump speed: growth" group="Heat Control" />
      <Eq title="Drain pump: growth" onClick={open("DPT2-ENS0-PU2")}><SymPump cx={250} cy={585} running={false} /></Eq>
      <ModeChip x={210} y={577} mode="M" />
      <SymTrend cx={280} cy={585} tag="DPT2-ENS0-PU2" name="Drain pump: growth" group="Heat Control" running={false} />
      <Tag2 x={250} y={621} tag="DPT2-ENS0-PU2" desc={["Drain pump: growth"]} />
      <Tag2 x={455} y={545} tag="DPT2-ENS0-FT2" desc={["Drain water flow to", "exchanger: growth"]} />
      <RD x={425} y={581} w={66} value="0.0" unit="m³/h" tag="DPT2-ENS0-FT2" name="Drain water flow to exchanger: growth" group="Heat Control" />

      {/* row B: circulation pump (growth, running) */}
      <RD x={140} y={688} value="60" unit="Hz" tag="DPT2-ENS0-PU1" name="Energy circ pump speed: growth" group="Heat Control" accent="var(--success-text)" />
      <Eq title="Energy system circulation pump: growth" onClick={open("DPT2-ENS0-PU1")}><SymPump cx={250} cy={700} running={true} /></Eq>
      <ModeChip x={210} y={692} mode="M" />
      <SymTrend cx={280} cy={700} tag="DPT2-ENS0-PU1" name="Energy system circ pump: growth" group="Heat Control" running={true} />
      <Tag2 x={250} y={736} tag="DPT2-ENS0-PU1" desc={["Energy system circ", "pump: growth"]} />
      <Tag2 x={455} y={660} tag="DPT2-ENS0-FT1" desc={["Circulated flow to", "heat pump: growth"]} />
      <RD x={425} y={696} w={66} value="16.8" unit="m³/h" tag="DPT2-ENS0-FT1" name="Circulated flow to heat pump: growth" group="Heat Control" />
      <Tag2 x={662} y={660} tag="DPT2-SMP0-TT1" desc={["Temperature", "pump sump"]} />
      <RD x={632} y={696} w={58} value="11.6" unit="°C" tag="DPT2-SMP0-TT1" name="Temperature pump sump: DPT2" group="Heat Control" />
      <Tag2 x={1205} y={660} tag="DPT2-ENS0-TT1" desc={["Temperature to growth", "after heat pump"]} />
      <RD x={1175} y={696} w={58} value="15.2" unit="°C" tag="DPT2-ENS0-TT1" name="Temperature to growth after heat pump" group="Heat Control" />
      <Flag x={1300} y={683} label="RAS DPT2" dir="r" />

      {/* row C: circulation pump (start feeding, running) */}
      <RD x={140} y={793} value="50" unit="Hz" tag="DPT1-ENS0-PU1" name="Energy circ pump speed: start feeding" group="Heat Control" accent="var(--success-text)" />
      <Eq title="Energy system circulation pump: start feeding" onClick={open("DPT1-ENS0-PU1")}><SymPump cx={250} cy={805} running={true} /></Eq>
      <ModeChip x={210} y={797} mode="M" />
      <SymTrend cx={280} cy={805} tag="DPT1-ENS0-PU1" name="Energy system circ pump: start feeding" group="Heat Control" running={true} />
      <Tag2 x={250} y={841} tag="DPT1-ENS0-PU1" desc={["Energy system circ", "pump: start feeding"]} />
      <Tag2 x={455} y={765} tag="DPT1-ENS0-FT1" desc={["Circulated flow to", "heat pump: start feeding"]} />
      <RD x={425} y={801} w={66} value="17.5" unit="m³/h" tag="DPT1-ENS0-FT1" name="Circulated flow to heat pump: start feeding" group="Heat Control" />
      <Tag2 x={662} y={765} tag="DPT1-SMP0-TT1" desc={["Temperature", "pump sump"]} />
      <RD x={632} y={801} w={58} value="12.2" unit="°C" tag="DPT1-SMP0-TT1" name="Temperature pump sump: DPT1" group="Heat Control" />
      <Tag2 x={1205} y={765} tag="DPT1-ENS0-TT1" desc={["Temperature to", "start feeding"]} />
      <RD x={1175} y={801} w={58} value="14.8" unit="°C" tag="DPT1-ENS0-TT1" name="Temperature to start feeding" group="Heat Control" />
      <Flag x={1300} y={788} label="RAS DPT1" dir="r" />

      {/* heat pump */}
      <WtBlock x={940} y={708} w={150} h={96} label="Heat pump" onClick={open(njBuildEquip("DPT0-ENS0-HP1", "Heat pump", "drumfilter", { primary: { l: "Temp to growth", v: "15.2", u: "°C" }, readouts: [{ l: "Temperature to growth after heat pump", v: "15.2", u: "°C", tag: "DPT2-ENS0-TT1" }] }))} />
    </svg>
  );
}

/* ───────────── parameter dock content (reused in the drawer) ───────────── */
const WT_TABS = ["General", "Heat control RAS", "Make-up water"];
const WT_PARAMS = {
  "General": [
    { h: "Intake pressure booster · WIN0-PBS0" },
    { l: "Intake water pressure after exchanger", v: "0.3 bar" },
    { l: "Intake water pressure setpoint", v: "2.5 bar", edit: true, min: 0, max: 6, step: 0.1, trend: true, trendTag: "WIN0-PBS0-PT1" },
    { l: "Intake pump start hysteresis", v: "0.40 bar", edit: true, min: 0, max: 2, step: 0.05 },
    { h: "Filter skid · WIN0-FIL0" },
    { l: "Differential pressure across filter skid", v: "0.03 bar", trend: true, trendTag: "DPT0-WIN0-PT3" },
    { l: "Backwash trigger ΔP setpoint", v: "0.45 bar", edit: true, min: 0.1, max: 1, step: 0.01 },
    { h: "Inlet UV · WIN0-UV1" },
    { l: "UV dose", v: "0.0 mj/cm²", trend: true, trendTag: "WIN0-UV1-QT1" },
    { l: "UV intensity setpoint", v: "85 %", edit: true, min: 0, max: 100, step: 1 },
  ],
  "Heat control RAS": [
    { h: "Heating water" },
    { l: "Circulated flow to heat pump, Start feeding", v: "17.5 m³/h", trend: true, trendTag: "DPT1-ENS0-FT1" },
    { l: "Flow setpoint over top exchanger, Start feeding", v: "25.0 m³/h", edit: true, min: 0, max: 50, step: 0.5 },
    { l: "Circulated flow to heat pump, Growth", v: "16.8 m³/h", trend: true, trendTag: "DPT2-ENS0-FT1" },
    { l: "Flow setpoint over top exchanger, Growth", v: "22.0 m³/h", edit: true, min: 0, max: 50, step: 0.5 },
    { h: "Chiller · DPT2-ENS1" },
    { l: "Chiller mode", mode: "Cooling" },
    { l: "Chiller setpoint", v: "12.0 °C", edit: true, min: 4, max: 20, step: 0.5 },
    { l: "Max shunt valve opening", v: "90.0 %", edit: true, min: 0, max: 100, step: 1 },
    { l: "Process water temp after chiller", v: "7.8 °C", trend: true, trendTag: "DPT2-ENS1-TT4" },
  ],
  "Make-up water": [
    { h: "Make-up DPT1, Start feeding" },
    { l: "Make-up water flow", v: "4.6 m³/h", trend: true, trendTag: "DPT1-ENS0-FT3" },
    { l: "Water exchange setpoint", v: "2.0 m³/h", edit: true, min: 0, max: 10, step: 0.1 },
    { l: "Make-up valve opening", v: "23 %", trend: true, trendTag: "DPT1-ENS0-RV1" },
    { h: "Make-up DPT2, Growth" },
    { l: "Make-up water flow", v: "9.4 m³/h", trend: true, trendTag: "DPT2-ENS0-FT3" },
    { l: "Water exchange setpoint", v: "5.0 m³/h", edit: true, min: 0, max: 10, step: 0.1 },
    { l: "Make-up valve opening", v: "32 %", trend: true, trendTag: "DPT2-ENS0-RV1" },
    { l: "Max water exchange adjustment", v: "0.0 m³/h", edit: true, min: 0, max: 5, step: 0.1 },
  ],
};

function WaterTreatmentScreen() {
  const [dock, setDock] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title="Water Treatment" statusLevel="ok">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Intake · heat control · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active="Water Treatment" /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={16} /> Parameters</button>
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={16} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={16} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="droplets" size={16} color="var(--slate-600)" /><span className="card-title">Water Treatment · WIN0 · Plant intake</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><WaterTreatmentMimic /></div>
        <div className="ras-legend">
          <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running / open</span>
          <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Stopped / closed</span>
          <span className="ci"><span className="rasm-leg-chip">A</span> Auto</span>
          <span className="ci"><span className="rasm-leg-chip man">M</span> Manual</span>
          <span className="ras-leg-div" aria-hidden="true" />
          <FluidLegend of={["raw", "proc", "drain", "glycol"]} />
          <span className="ci" style={{ marginLeft: "auto", color: "var(--slate-500)" }}><Icon name="line-chart" size={14} /> Tap a value's trend icon → send to Trends</span>
        </div>
      </div>

      {dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={20} /></button>
        <ParamTabs dock tabs={WT_TABS} params={WT_PARAMS} title="Water Treatment · parameters" />
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="droplets" size={16} /> Water Treatment · WIN0 · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><ScadaZoom><WaterTreatmentMimic /></ScadaZoom></div>
        </div>
      )}
    </AppShell>
  );
}

window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Water Treatment": WaterTreatmentScreen,
});
Object.assign(window, { WaterTreatmentMimic, WaterTreatmentScreen });
