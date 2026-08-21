// ras-dpt2-mimic.jsx — DPT2 RAS process mimic (Sørebøhallen · DPT2 · RAS).
// Follows the DPT2 P&ID: fish-tank inlet → 2 backwash filters → MBBR bioreactor (2 blowers) →
// CO₂ stripper (2 fans) → pump sump (2 lift pumps + sensor stack) → SIX oxygenation pumps
// (kar 7–12), each through a dose valve into an O₂ cone → fish tanks; lye dosing loop on the left.
// Reuses the RAS symbol set exported by ras-mimic.jsx (SymPump/SymFan/SymMotor/SymValve/SymCone/
// RD/Tag2/Eq/Flag/SumpBasin/StripperColumn/Bioreactor/GreenMark/ModeChip/SymTrend). window.Dpt2RasMimic.

function d2Eq(tag, name, kind, extra) { return () => openEquipment(njBuildEquip(tag, name, kind, extra)); }

// the six oxygenation columns (pump → dose valve → O₂ cone), one per fish-tank kar
const D2_OX = [
  { cx: 600,  n: 1, kar: 7,  hz: 41, bar: 1.9, open: true },
  { cx: 830,  n: 2, kar: 8,  hz: 41, bar: 1.8, open: false },
  { cx: 1060, n: 3, kar: 9,  hz: 36, bar: 1.5, open: true },
  { cx: 1290, n: 4, kar: 10, hz: 25, bar: 0.8, open: false },
  { cx: 1520, n: 5, kar: 11, hz: 26, bar: 1.0, open: true },
  { cx: 1750, n: 6, kar: 12, hz: 29, bar: 1.1, open: false },
];

function D2OxCol({ cx, n, kar, hz, bar, open }) {
  const tag = "DPT2-DOX" + n;
  return (
    <g>
      <Tag2 x={cx} y={612} tag={tag + "-PU1"} desc={["Oksygeneringspumpe", "kar " + kar]} />
      <RD x={cx - 33} y={648} w={66} value={String(hz)} unit="Hz" tag={tag + "-PU1"} name={"Oxygenation pump kar " + kar + " speed"} group="Oxygenation" />
      <Eq title={"Oxygenation pump kar " + kar} onClick={d2Eq(tag + "-PU1", "Oksygeneringspumpe kar " + kar, "pump", { primary: { l: "Speed", v: String(hz), u: "Hz" },
        readouts: [{ l: "Speed", v: String(hz), u: "Hz", tag: tag + "-PU1" }], setpoints: [{ key: "s", l: "Speed setpoint", v: hz, u: "Hz", step: 0.5, min: 0, max: 60 }],
        trend: { label: "Pump speed", base: hz, amp: 3, seed: n + 0.5, unit: "Hz", hi: 60 } })}>
        <SymPump cx={cx} cy={704} running />
      </Eq>
      <ModeChip x={cx + 22} y={696} mode="A" />
      <SymTrend cx={cx - 40} cy={704} tag={tag + "-PU1"} name={"Oxygenation pump kar " + kar} group="Oxygenation" running />
      <Eq title={"Dose valve kar " + kar} onClick={d2Eq(tag + "-SV1", "Doseventil kar " + kar, "valve", { primary: { l: "Opening", v: open ? "100" : "0", u: "%" }, readouts: [{ l: "Valve opening", v: open ? "100" : "0", u: "%", tag: tag + "-SV1" }] })}>
        <SymValve cx={cx} cy={856} running={open} />
      </Eq>
      <ModeChip x={cx + 20} y={848} mode="A" />
      <Eq title={"O₂ cone kar " + kar} onClick={d2Eq(tag + "-PT1", "Oksygenkjegle kar " + kar, "vessel", { primary: { l: "Cone pressure", v: bar.toFixed(1), u: "bar" }, canStartStop: false, noMode: true,
        trend: { label: "Cone pressure", base: bar, amp: 0.15, seed: n + 1.2, unit: "bar", hi: 6 },
        limits: [{ l: "Cone pressure · DOX" + n + "-PT1", v: "3.0", u: "bar", hi: 3, lo: 0, step: 0.1 }] })}>
        <SymCone cx={cx} cy={956} s={0.72} />
      </Eq>
      <RD x={cx - 33} y={1000} w={66} value={bar.toFixed(1)} unit="bar" tag={tag + "-PT1"} name={"Cone pressure kar " + kar} group="Oxygenation" />
      <Tag2 x={cx} y={1046} tag={tag + "-PT1"} desc={["Trykk i oksygenkjegle " + kar]} />
    </g>
  );
}

function Dpt2RasMimic() {
  const open = (t) => () => openEquipment(t);
  const colStubs = D2_OX.map((c) => [
    `M${c.cx},672 V678`,        // header → pump top
    `M${c.cx},732 V838`,        // pump → dose valve
    `M${c.cx},874 V930`,        // valve → cone
    `M${c.cx},972 V1012`,       // cone → collector
    `M${c.cx},814 V838`,        // O₂ header → valve
  ]).flat();
  return (
    <svg className="rasm" viewBox="0 0 2000 1100" role="img" aria-label="DPT2 RAS process mimic" preserveAspectRatio="xMidYMid meet">
      {/* pipes */}
      {[
        // filter / backwash
        { k: "proc",  d: "M118,455 H290" },
        { k: "drain", d: "M118,340 V630" }, { k: "drain", d: "M118,340 H150" }, { k: "drain", d: "M118,630 H150" },
        { k: "drain", d: "M150,340 H290" }, { k: "drain", d: "M150,630 H290" },
        { k: "proc",  d: "M354,330 H420 V500 H930" },   // drum filter 1 → bioreactor
        { k: "proc",  d: "M354,620 H420" },             // drum filter 2 → join
        // blowers → bioreactor (process air)
        { k: "gas",   d: "M988,311 V410" }, { k: "gas", d: "M1153,311 V410" },
        // bioreactor → stripper
        { k: "proc",  d: "M1270,500 H1300" },
        // fans → stripper (off-gas)
        { k: "gas",   d: "M1310,320 V430" }, { k: "gas", d: "M1430,320 V430" },
        // stripper → pump sump
        { k: "proc",  d: "M1460,500 H1500" },
        // pump sump → fish tanks (top right)
        { k: "proc",  d: "M1620,470 V300 H1860" },
        // pump sump → oxygenation feed header (down + across the six columns)
        { k: "proc",  d: "M1560,590 V672" }, { k: "proc", d: "M600,672 H1750" },
        // O₂ supply header across valves
        { k: "o2",    d: "M600,814 H1836" },
        // cone collector → fish tanks (bottom right)
        { k: "proc",  d: "M600,1012 H1800 V965" },
        // lye dosing loop → bioreactor
        { k: "chem",  d: "M60,818 H330" }, { k: "chem", d: "M330,838 H420 V520" }, { k: "chem", d: "M330,1000 H400 V838" },
      ].concat(colStubs.map((d) => ({ k: "proc", d }))).map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      {/* ───── FILTER / BACKWASH ───── */}
      <Flag x={40} y={438} label="Fiskekar" dir="r" />
      <Tag2 x={150} y={258} tag="DPT2-FIL0-PU1" desc={["Spylepumpe filter 1"]} />
      <RD x={117} y={288} value="0" unit="Hz" tag="DPT2-FIL0-PU1" name="Backwash pump filter 1 speed" group="Filter" />
      <Eq title="Spylepumpe filter 1" onClick={d2Eq("DPT2-FIL0-PU1", "Spylepumpe filter 1", "pump", { primary: { l: "Speed", v: "0", u: "Hz" }, status: "low", readouts: [{ l: "Speed", v: "0", u: "Hz", tag: "DPT2-FIL0-PU1" }] })}><SymPump cx={150} cy={340} running={false} /></Eq>
      <ModeChip x={172} y={332} mode="A" />

      <Tag2 x={150} y={706} tag="DPT2-FIL0-PU2" desc={["Spylepumpe filter 2"]} />
      <RD x={117} y={648} value="0" unit="Hz" tag="DPT2-FIL0-PU2" name="Backwash pump filter 2 speed" group="Filter" />
      <Eq title="Spylepumpe filter 2" onClick={d2Eq("DPT2-FIL0-PU2", "Spylepumpe filter 2", "pump", { primary: { l: "Speed", v: "0", u: "Hz" }, status: "low", readouts: [{ l: "Speed", v: "0", u: "Hz", tag: "DPT2-FIL0-PU2" }] })}><SymPump cx={150} cy={630} running={false} /></Eq>
      <ModeChip x={172} y={622} mode="A" />

      <Tag2 x={322} y={258} tag="DPT2-FIL1-FE1" desc={["Trommelfilter 1"]} />
      <RD x={289} y={288} value="0" unit="Hz" tag="DPT2-FIL1-FE1" name="Drum filter 1 speed" group="Filter" />
      <Eq title="Trommelfilter 1" onClick={open("DPT2-FIL0")}>
        <rect className="rasm-box" x={290} y={302} width={64} height={58} rx="6" />
        <SymMotor cx={322} cy={331} s={0.7} running={false} />
      </Eq>
      <ModeChip x={360} y={322} mode="A" />

      <Tag2 x={322} y={548} tag="DPT2-FIL2-FE1" desc={["Trommelfilter 2"]} />
      <RD x={289} y={578} value="0" unit="Hz" tag="DPT2-FIL2-FE1" name="Drum filter 2 speed" group="Filter" />
      <Eq title="Trommelfilter 2" onClick={open("DPT2-FIL0")}>
        <rect className="rasm-box" x={290} y={592} width={64} height={58} rx="6" />
        <SymMotor cx={322} cy={621} s={0.7} running={false} />
      </Eq>
      <ModeChip x={360} y={612} mode="A" />

      <RD x={210} y={455} w={66} value="59" unit="cm" tag="DPT2-FIL0-LT1" name="Level before filter" group="Filter" />
      <Tag2 x={243} y={498} tag="DPT2-FIL0-LT1" desc={["Nivå før filter"]} />

      {/* ───── LYE DOSING ───── */}
      <Flag x={40} y={801} label="Lut" dir="r" />
      <Tag2 x={330} y={776} tag="DPT2-DNA0-PU1" desc={["Lutpumpe 1"]} />
      <RD x={297} y={732} w={64} value="4.4" unit="l/h" tag="DPT2-DNA0-PU1" name="Lye pump 1 rate" group="Lye Dosing" />
      <Eq title="Lutpumpe 1" onClick={d2Eq("DPT2-DNA0-PU1", "Lutpumpe 1", "pump", { primary: { l: "Rate", v: "4.4", u: "l/h" }, readouts: [{ l: "Dosing rate", v: "4.4", u: "l/h", tag: "DPT2-DNA0-PU1" }], setpoints: [{ key: "r", l: "Dosing rate setpoint", v: 4.4, u: "l/h", step: 0.1, min: 0, max: 60 }], trend: { label: "Dosing rate", base: 4.4, amp: 0.5, seed: 2.1, unit: "l/h", hi: 60 } })}><SymPump cx={330} cy={838} running /></Eq>
      <GreenMark x={284} y={830} /><ModeChip x={356} y={830} mode="M" />

      <Tag2 x={330} y={942} tag="DPT2-DNA0-PU2" desc={["Lutpumpe 2"]} />
      <RD x={297} y={974} w={64} value="0.0" unit="l/h" tag="DPT2-DNA0-PU2" name="Lye pump 2 rate" group="Lye Dosing" />
      <Eq title="Lutpumpe 2" onClick={d2Eq("DPT2-DNA0-PU2", "Lutpumpe 2", "pump", { primary: { l: "Rate", v: "0.0", u: "l/h" }, status: "low", readouts: [{ l: "Dosing rate", v: "0.0", u: "l/h", tag: "DPT2-DNA0-PU2" }] })}><SymPump cx={330} cy={1000} running={false} /></Eq>
      <GreenMark x={284} y={992} /><ModeChip x={356} y={992} mode="M" />

      {/* ───── MBBR / BIOREACTOR ───── */}
      <Tag2 x={988} y={150} tag="DPT2-AEB0-BM1-TT1" desc={["Kabinett-temperatur", "blåsemaskin 1"]} />
      <RD x={955} y={188} w={66} value="24.8" unit="°C" tag="DPT2-AEB0-BM1-TT1" name="Blower cabinet temp 1" group="MBBR" />
      <Eq title="Blåsemaskin 1 MBBR" onClick={open("DPT2-AEB0-BL1")}>
        <rect className="rasm-cab" x={955} y={224} width={66} height={86} rx="5" />
        <SymFan cx={988} cy={284} s={0.82} running />
      </Eq>
      <RD x={962} y={228} w={52} h={24} value="45" unit="Hz" tag="DPT2-AEB0-BM1" name="Blower 1 MBBR speed" group="MBBR" />
      <ModeChip x={1023} y={264} mode="A" />
      <SymTrend cx={1033} cy={284} tag="DPT2-AEB0-BM1" name="Blower 1 MBBR" group="MBBR" running />
      <Tag2 x={988} y={330} tag="DPT2-AEB0-BM1" desc={["Blåsemaskin 1 MBBR"]} />

      <Tag2 x={1153} y={150} tag="DPT2-AEB0-BM2-TT1" desc={["Kabinett-temperatur", "blåsemaskin 2"]} />
      <RD x={1120} y={188} w={66} value="19.9" unit="°C" tag="DPT2-AEB0-BM2-TT1" name="Blower cabinet temp 2" group="MBBR" />
      <Eq title="Blåsemaskin 2 MBBR" onClick={open("DPT2-AEB0-BL1")}>
        <rect className="rasm-cab" x={1120} y={224} width={66} height={86} rx="5" />
        <SymFan cx={1153} cy={284} s={0.82} running={false} />
      </Eq>
      <RD x={1127} y={228} w={52} h={24} value="0" unit="Hz" tag="DPT2-AEB0-BM2" name="Blower 2 MBBR speed" group="MBBR" />
      <ModeChip x={1188} y={264} mode="A" />
      <SymTrend cx={1198} cy={284} tag="DPT2-AEB0-BM2" name="Blower 2 MBBR" group="MBBR" running={false} />
      <Tag2 x={1153} y={330} tag="DPT2-AEB0-BM2" desc={["Blåsemaskin 2 MBBR"]} />

      <Eq title="Bioreaktor (MBBR)" onClick={open("DPT2-AEB0-BL1")}><Bioreactor x={930} y={410} w={340} h={180} /></Eq>
      <RD x={1017} y={448} w={66} value="261" unit="cm" tag="DPT2-AEB0-LT1" name="Level in bioreactor" group="MBBR" />
      <Tag2 x={1050} y={438} tag="DPT2-AEB0-LT1" desc={["Nivå i bioreaktor"]} />

      {/* ───── CO₂ STRIPPER ───── */}
      <Tag2 x={1310} y={210} tag="DPT2-STR0-AV1" desc={["CO2-vifte 1"]} />
      <RD x={1277} y={248} value="50" unit="Hz" tag="DPT2-STR0-AV1" name="CO₂-fan 1 speed" group="CO₂ Stripper" />
      <Eq title="CO2-vifte 1" onClick={open("DPT2-STR0-FAN")}><SymFan cx={1310} cy={296} running /></Eq>
      <ModeChip x={1332} y={288} mode="A" />
      <SymTrend cx={1280} cy={296} tag="DPT2-STR0-AV1" name="CO₂-fan 1" group="CO₂ Stripper" running />

      <Tag2 x={1430} y={210} tag="DPT2-STR0-AV2" desc={["CO2-vifte 2"]} />
      <RD x={1397} y={248} value="50" unit="Hz" tag="DPT2-STR0-AV2" name="CO₂-fan 2 speed" group="CO₂ Stripper" />
      <Eq title="CO2-vifte 2" onClick={open("DPT2-STR0-FAN")}><SymFan cx={1430} cy={296} running /></Eq>
      <ModeChip x={1452} y={288} mode="A" />
      <SymTrend cx={1400} cy={296} tag="DPT2-STR0-AV2" name="CO₂-fan 2" group="CO₂ Stripper" running />

      <Eq title="CO₂-avdrivning" onClick={open("DPT2-STR0-FAN")}><StripperColumn x={1300} y={430} w={160} h={110} /></Eq>
      <RD x={1300} y={356} w={86} value="−24.6" unit="mbar" tag="DPT2-STR1-PT1" name="Vacuum in CO₂ stripping" group="CO₂ Stripper" />
      <Tag2 x={1380} y={400} tag="DPT2-STR1-PT1" desc={["Undertrykk i CO2-avdrivning"]} />

      {/* ───── PUMP SUMP ───── */}
      <RD x={1500} y={255} w={72} value="2.4" unit="mVs" tag="DPT2-SMP-PT1" name="Trykk til fiskekar" group="Pump Sump" />
      <Tag2 x={1536} y={245} tag="DPT2-SMP-PT1" desc={["Trykk til fiskekar"]} />
      <RD x={1640} y={255} w={66} value="11.6" unit="°C" tag="DPT2-SMP0-TT1" name="Temperatur pumpesump" group="Pump Sump" />
      <Tag2 x={1673} y={245} tag="DPT2-SMP0-TT1" desc={["Temperatur pumpesump"]} />

      <Eq title="Pumpesump" onClick={open("DPT2-SMP0")}><SumpBasin x={1500} y={470} w={250} h={120} /></Eq>

      <RD x={1522} y={512} value="0" unit="Hz" tag="DPT2-SMP0-PU1" name="Lift pump 1 speed" group="Pump Sump" />
      <Eq title="Løftepumpe 1" onClick={d2Eq("DPT2-SMP0-PU1", "Løftepumpe 1", "pump", { primary: { l: "Speed", v: "0", u: "Hz" }, status: "low", readouts: [{ l: "Speed", v: "0", u: "Hz", tag: "DPT2-SMP0-PU1" }] })}><SymPump cx={1555} cy={548} running={false} /></Eq>
      <ModeChip x={1577} y={540} mode="A" />
      <Tag2 x={1555} y={588} tag="DPT2-SMP0-PU1" desc={["Løftepumpe 1"]} />

      <RD x={1637} y={512} value="36" unit="Hz" tag="DPT2-SMP0-PU2" name="Lift pump 2 speed" group="Pump Sump" />
      <Eq title="Løftepumpe 2" onClick={d2Eq("DPT2-SMP0-PU2", "Løftepumpe 2", "pump", { primary: { l: "Speed", v: "36", u: "Hz" }, readouts: [{ l: "Speed", v: "36", u: "Hz", tag: "DPT2-SMP0-PU2" }], setpoints: [{ key: "s", l: "Speed setpoint", v: 36, u: "Hz", step: 0.5, min: 0, max: 60 }], trend: { label: "Pump speed", base: 36, amp: 4, seed: 1.7, unit: "Hz", hi: 60 } })}><SymPump cx={1670} cy={548} running /></Eq>
      <ModeChip x={1692} y={540} mode="A" />
      <SymTrend cx={1640} cy={548} tag="DPT2-SMP0-PU2" name="Løftepumpe 2" group="Pump Sump" running />
      <Tag2 x={1670} y={588} tag="DPT2-SMP0-PU2" desc={["Løftepumpe 2"]} />

      {/* sensor stack (right of sump) */}
      {[
        { v: "5", u: "mg/l", tag: "DPT2-SMP0-QT1", d: "CO₂ in pump sump" },
        { v: "97.0", u: "%", tag: "DPT2-SMP0-OT1", d: "O₂ in pump sump", accent: "var(--success-text)" },
        { v: "7.4", u: "pH", tag: "DPT2-SMP0-QT3", d: "pH 1 in pump sump" },
        { v: "7.4", u: "pH", tag: "DPT2-SMP0-QT4", d: "pH 2 in pump sump" },
        { v: "302", u: "cm", tag: "DPT2-SMP0-LT1", d: "Level in pump sump" },
      ].map((s, i) => {
        const y = 408 + i * 34;
        return (
          <g key={i}>
            <GreenMark x={1770} y={y} />
            <RD x={1794} y={y - 4} w={72} value={s.v} unit={s.u} tag={s.tag} name={s.d} group="Pump Sump" accent={s.accent} />
          </g>
        );
      })}

      {/* ───── outlets ───── */}
      <Flag x={1866} y={272} label="Fiskekar" dir="r" />
      <Flag x={1840} y={780} label="Oksygen" dir="l" />
      <Flag x={1866} y={947} label="Fiskekar" dir="r" />

      {/* ───── OXYGENATION (kar 7–12) ───── */}
      {D2_OX.map((c) => <D2OxCol key={c.n} {...c} />)}
    </svg>
  );
}

window.Dpt2RasMimic = Dpt2RasMimic;
