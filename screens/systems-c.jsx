// systems-c.jsx — three previously-placeholder Navigation systems (Building 2 · Support systems),
// rebuilt as faithful P&ID process mimics that REUSE the RAS symbol set + styling
// (SymPump / SymValve / RD readouts / ModeChip / SymTrend / Tag2 / Flag / SumpBasin, the
// `rasm` svg + `rasm-pipe` connectors, the gridded `rasm-body` card, the run/stop legend and
// the fullscreen SCADA view) — but each follows its OWN process. Symbols come from
// screens/ras-mimic.jsx (loaded first, exported on window); ScadaZoom from lib/scada.jsx.
// Each screen self-registers into window.__njSystemScreens under its FACILITY label.

function scEq(tag, name, kind, extra) { return () => openEquipment(njBuildEquip(tag, name, kind, extra)); }

/* ───────── local vessels (drawn in the RAS vessel language: sc-* tokens) ───────── */
// vertical storage tank with proportional water fill
function ScTank({ x, y, w, h, fill = 0.6 }) {
  const wh = Math.max(0, (h - 12) * fill);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="8" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      <rect x={x + 6} y={y + h - 6 - wh} width={w - 12} height={wh} rx="3" fill="var(--sc-water)" opacity="0.55" />
      <line x1={x} y1={y + h - 6 - wh} x2={x + w} y2={y + h - 6 - wh} stroke="var(--sc-line)" strokeWidth="1.2" strokeDasharray="4 4" />
    </g>
  );
}
// shell-and-tube heat exchanger — shell with tube-bundle hatch + end nozzles
function ScHX({ x, y, w, h }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="12" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      <rect x={x + 10} y={y + 14} width={w - 20} height={h - 28} rx="4" fill="var(--sc-node)" stroke="var(--sc-line)" strokeWidth="1" />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={x + 14} y1={y + 24 + i * ((h - 48) / 5)} x2={x + w - 14} y2={y + 24 + i * ((h - 48) / 5)} stroke="var(--sc-line)" strokeWidth="1.3" />
      ))}
    </g>
  );
}
// small digital float / level-switch indicator (label + status dot)
function ScSwitch({ x, y, label, level = "ok", anchor = "start" }) {
  const dot = (SEV[level] || SEV.ok).dot;
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r="9" fill="var(--sc-node)" stroke="var(--slate-300)" strokeWidth="1.4" />
      <circle cx={x} cy={y} r="4.5" fill={dot} />
      <text className="rasm-desc" x={anchor === "end" ? x - 16 : x + 16} y={y + 4} textAnchor={anchor}>{label}</text>
    </g>
  );
}

/* ───────── shared pump block (matches RAS lye/pump-sump layout exactly) ───────── */
function ScPump({ cx, cy, tag, name, group, value, unit = "Hz", running, mode = "A", green, onClick }) {
  const modeX = green ? cx - 74 : cx - 40;
  return (
    <g>
      <Eq title={name} onClick={onClick}><SymPump cx={cx} cy={cy} running={running} /></Eq>
      {green && <GreenMark x={cx - 46} y={cy - 8} />}
      <ModeChip x={modeX} y={cy - 8} mode={mode} />
      <SymTrend cx={cx + 30} cy={cy} tag={tag} name={name} group={group} running={running} />
      <RD x={cx - 32} y={cy - 50} w={64} value={value} unit={unit} tag={tag} name={name + " " + (unit === "l/h" ? "rate" : "speed")} group={group} />
      <Tag2 x={cx} y={cy + 37} tag={tag} desc={[name]} />
    </g>
  );
}

/* ───────────────────────── LYE DOSING ───────────────────────── */
// Lye inlet → lye tank → 4 metering pumps (2 skids × 2) → DPT3 / DPT4 pump sumps.
const LYE_PIPES = [
  { k: "chem", d: "M136,400 H250" },   // inlet → tank
  { k: "chem", d: "M420,400 H560" },   // tank outlet → manifold spine
  { k: "chem", d: "M560,180 V660" },   // manifold spine
  { k: "chem", d: "M560,180 H1180" },  // skid 1 pump 1 → DPT3 sump
  { k: "chem", d: "M560,340 H1180" },  // skid 1 pump 2 → DPT3 sump
  { k: "chem", d: "M560,500 H1180" },  // skid 2 pump 1 → DPT4 sump
  { k: "chem", d: "M560,660 H1180" },  // skid 2 pump 2 → DPT4 sump
];
function LyeMimic() {
  return (
    <svg className="rasm" viewBox="0 0 1500 760" role="img" aria-label="Lye dosing process mimic" preserveAspectRatio="xMidYMid meet">
      {LYE_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      <Flag x={40} y={383} label="Lye" dir="r" />

      {/* lye tank */}
      <Eq title="Lye tank" onClick={scEq("CHM0-DNA0-LT1", "Lye Tank", "vessel", { primary: { l: "Level", v: "65.8", u: "%" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Volume", v: "9.6", u: "m³" }, { l: "Level", v: "118", u: "cm", tag: "CHM0-DNA0-LT1" }, { l: "Level", v: "65.8", u: "%" }],
        trend: { label: "Lye tank level", base: 66, amp: 8, seed: 1.6, unit: "%", hi: 95, lo: 10 },
        limits: [{ l: "Lye tank level · DNA0-LT1", v: "95.0", u: "%", hi: 95, lo: 10, step: 1 }] })}>
        <ScTank x={250} y={280} w={170} h={240} fill={0.658} />
      </Eq>
      <RD x={302} y={388} w={66} value="65.8" unit="%" tag="CHM0-DNA0-LT1" name="Lye tank level" group="Lye Dosing" />
      <Tag2 x={335} y={548} tag="CHM0-DNA0-LT1" desc={["Lye tank"]} />
      <ScSwitch x={444} y={300} label="High level · tank" />
      <ScSwitch x={444} y={500} label="High level · bund" />

      {/* lye-room temperature */}
      <Tag2 x={620} y={120} tag="CHM0-DNA0-TT1" desc={["Lye room temperature"]} />
      <RD x={587} y={132} w={66} value="13.9" unit="°C" tag="CHM0-DNA0-TT1" name="Lye room temperature" group="Lye Dosing" />

      {/* metering pumps → pump sumps */}
      <ScPump cx={880} cy={180} tag="CHM0-DNA1-PU1" name="Dosing pump 1-1" group="Lye Dosing" value="0.0" unit="l/h" running={false} mode="M" green
        onClick={scEq("CHM0-DNA1-PU1", "Dosing Pump 1-1 · lye", "pump", { primary: { l: "Rate", v: "0.0", u: "l/h" }, status: "low",
          readouts: [{ l: "Dosing rate", v: "0.0", u: "l/h", tag: "CHM0-DNA1-PU1" }], setpoints: [{ key: "r", l: "Dosing rate setpoint", v: 0, u: "l/h", step: 0.1, min: 0, max: 60 }] })} />
      <ScPump cx={880} cy={340} tag="CHM0-DNA1-PU2" name="Dosing pump 1-2" group="Lye Dosing" value="6.2" unit="l/h" running mode="M" green
        onClick={scEq("CHM0-DNA1-PU2", "Dosing Pump 1-2 · lye", "pump", { primary: { l: "Rate", v: "6.2", u: "l/h" },
          readouts: [{ l: "Dosing rate", v: "6.2", u: "l/h", tag: "CHM0-DNA1-PU2" }], setpoints: [{ key: "r", l: "Dosing rate setpoint", v: 6.2, u: "l/h", step: 0.1, min: 0, max: 60 }],
          trend: { label: "Dosing rate", base: 6.2, amp: 0.8, seed: 2.1, unit: "l/h", hi: 60 } })} />
      <ScPump cx={880} cy={500} tag="CHM0-DNA2-PU1" name="Dosing pump 2-1" group="Lye Dosing" value="5.6" unit="l/h" running mode="M" green
        onClick={scEq("CHM0-DNA2-PU1", "Dosing Pump 2-1 · lye", "pump", { primary: { l: "Rate", v: "5.6", u: "l/h" },
          readouts: [{ l: "Dosing rate", v: "5.6", u: "l/h", tag: "CHM0-DNA2-PU1" }], setpoints: [{ key: "r", l: "Dosing rate setpoint", v: 5.6, u: "l/h", step: 0.1, min: 0, max: 60 }],
          trend: { label: "Dosing rate", base: 5.6, amp: 0.7, seed: 3.3, unit: "l/h", hi: 60 } })} />
      <ScPump cx={880} cy={660} tag="CHM0-DNA2-PU2" name="Dosing pump 2-2" group="Lye Dosing" value="0.0" unit="l/h" running={false} mode="M" green
        onClick={scEq("CHM0-DNA2-PU2", "Dosing Pump 2-2 · lye", "pump", { primary: { l: "Rate", v: "0.0", u: "l/h" }, status: "low",
          readouts: [{ l: "Dosing rate", v: "0.0", u: "l/h", tag: "CHM0-DNA2-PU2" }], setpoints: [{ key: "r", l: "Dosing rate setpoint", v: 0, u: "l/h", step: 0.1, min: 0, max: 60 }] })} />

      <Flag x={1180} y={163} label="DPT3 pump sump" dir="r" />
      <Flag x={1180} y={323} label="DPT3 pump sump" dir="r" />
      <Flag x={1180} y={483} label="DPT4 pump sump" dir="r" />
      <Flag x={1180} y={643} label="DPT4 pump sump" dir="r" />

      <ScSwitch x={575} y={710} label="Liquid in lye dosing cabinet" level="ok" />
    </svg>
  );
}

/* ─────────────────────── SEAWATER EXCHANGE ─────────────────────── */
// Seawater in → seawater pump → heat exchanger → back to sea; glycol circuit off the
// exchanger → glycol pump → heat pumps DPT3 / DPT4, glycol return to the exchanger.
const SWE_PIPES = [
  { k: "brine",  d: "M136,300 H460" },             // seawater supply → exchanger (through pump)
  { k: "brine",  d: "M460,440 H136" },             // seawater return → sea
  { k: "glycol", d: "M600,300 H1200" },            // glycol supply → glycol pump → split
  { k: "glycol", d: "M1200,300 V240 H1320" },      // → heat pump DPT3
  { k: "glycol", d: "M1200,300 V360 H1320" },      // → heat pump DPT4
  { k: "glycol", d: "M1320,540 H1180 V440 H600" }, // glycol return DPT3 → exchanger
  { k: "glycol", d: "M1320,600 H1180" },           // glycol return DPT4 → merge
];
function SweMimic() {
  return (
    <svg className="rasm" viewBox="0 0 1500 720" role="img" aria-label="Seawater exchange process mimic" preserveAspectRatio="xMidYMid meet">
      {SWE_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      <Flag x={40} y={283} label="Seawater" dir="r" />
      <Flag x={40} y={423} label="Seawater" dir="l" />

      {/* seawater pump */}
      <ScPump cx={280} cy={300} tag="DPT0-ENS0-PU1" name="Seawater pump" group="Seawater Exchange" value="45" unit="Hz" running
        onClick={scEq("DPT0-ENS0-PU1", "Seawater Pump · exchange to heat-pump cooling circuit", "pump", { primary: { l: "Speed", v: "45", u: "Hz" },
          readouts: [{ l: "Speed", v: "45", u: "Hz", tag: "DPT0-ENS0-PU1" }, { l: "Pressure before exch.", v: "0.9", u: "bar", tag: "DPT0-ENS0-PT1" }],
          setpoints: [{ key: "s", l: "Speed setpoint", v: 45, u: "Hz", step: 0.5, min: 0, max: 60 }],
          trend: { label: "Pump speed", base: 45, amp: 4, seed: 1.2, unit: "Hz", hi: 60 } })} />

      {/* seawater-side pressure sensors */}
      <Tag2 x={400} y={196} tag="DPT0-ENS0-PT1" desc={["Pressure before exchanger"]} />
      <RD x={367} y={210} w={66} value="0.9" unit="bar" tag="DPT0-ENS0-PT1" name="Seawater pressure before exchanger" group="Seawater Exchange" />
      <Tag2 x={400} y={512} tag="DPT0-ENS0-PT2" desc={["Pressure after exchanger"]} />
      <RD x={367} y={470} w={66} value="0.0" unit="bar" tag="DPT0-ENS0-PT2" name="Seawater pressure after exchanger" group="Seawater Exchange" />

      {/* heat exchanger */}
      <Eq title="Seawater / glycol heat exchanger" onClick={scEq("DPT0-ENS0-HX1", "Seawater / Glycol Heat Exchanger", "vessel", { primary: { l: "Glycol out", v: "2.5", u: "bar" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Seawater in", v: "0.9", u: "bar", tag: "DPT0-ENS0-PT1" }, { l: "Seawater out", v: "0.0", u: "bar", tag: "DPT0-ENS0-PT2" }, { l: "Glycol circuit", v: "2.5", u: "bar", tag: "DPT0-ENS0-PT3" }] })}>
        <ScHX x={460} y={280} w={140} h={180} />
      </Eq>
      <Tag2 x={530} y={478} tag="DPT0-ENS0" desc={["Heat exchanger"]} />

      {/* glycol circuit pressure */}
      <Tag2 x={720} y={196} tag="DPT0-ENS0-PT3" desc={["Glycol circuit pressure"]} />
      <RD x={687} y={210} w={66} value="2.5" unit="bar" tag="DPT0-ENS0-PT3" name="Glycol circuit pressure" group="Seawater Exchange" />

      {/* glycol pump */}
      <ScPump cx={960} cy={300} tag="DPT0-ENS0-PU2" name="Glycol pump" group="Seawater Exchange" value="43" unit="Hz" running
        onClick={scEq("DPT0-ENS0-PU2", "Glycol Pump · cooling circuit to heat pump", "pump", { primary: { l: "Speed", v: "43", u: "Hz" },
          readouts: [{ l: "Speed", v: "43", u: "Hz", tag: "DPT0-ENS0-PU2" }, { l: "Glycol circuit pressure", v: "2.5", u: "bar", tag: "DPT0-ENS0-PT3" }],
          setpoints: [{ key: "s", l: "Speed setpoint", v: 43, u: "Hz", step: 0.5, min: 0, max: 60 }],
          trend: { label: "Pump speed", base: 43, amp: 3, seed: 2.6, unit: "Hz", hi: 60 } })} />

      <Flag x={1320} y={223} label="Heat pump DPT3" dir="r" />
      <Flag x={1320} y={343} label="Heat pump DPT4" dir="r" />
      <Flag x={1320} y={523} label="Heat pump DPT3" dir="l" />
      <Flag x={1320} y={583} label="Heat pump DPT4" dir="l" />
    </svg>
  );
}

/* ───────────────────────── FISH BARRIER ───────────────────────── */
// Fish-tank / wastewater / sorting-water inlets → fish-barrier sump → discharge valves → sea.
// Return-water sumps DPT3 / DPT4 lift back into the barrier sump loop / RAS.
const FB_PIPES = [
  { k: "proc",  d: "M136,170 H1180" },     // fish tank → delivery room (top pass)
  { k: "drain", d: "M136,360 H640" },      // wastewater → barrier sump
  { k: "drain", d: "M136,480 H360 V520" }, // sorting water → return-sump area
  { k: "drain", d: "M950,170 V300" },      // delivery-room weir → barrier sump
  { k: "drain", d: "M760,500 V620" },      // barrier sump → discharge valves
  { k: "proc",  d: "M300,560 V500 H640" }, // return sump DPT3 → barrier sump
  { k: "proc",  d: "M540,560 V480 H640" }, // return sump DPT4 → barrier sump
  { k: "drain", d: "M880,400 H1180" },     // barrier sump → sea
  { k: "proc",  d: "M660,650 H1180" },     // discharge → DPT4 RAS
  { k: "proc",  d: "M760,700 H1180" },     // discharge → DPT3 RAS
];
function FbMimic() {
  return (
    <svg className="rasm" viewBox="0 0 1500 780" role="img" aria-label="Fish barrier process mimic" preserveAspectRatio="xMidYMid meet">
      {FB_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      <Flag x={40} y={153} label="Fish tank" dir="r" />
      <Flag x={40} y={343} label="Wastewater" dir="r" />
      <Flag x={40} y={463} label="Sorting water" dir="r" />

      {/* delivery-room weir tank */}
      <Eq title="Delivery room weir" onClick={scEq("OTL0-LEV0-LT1", "Delivery Room weir", "vessel", { primary: { l: "Overflow", v: "active" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Weir level", v: "48", u: "cm", tag: "OTL0-LEV0-LT1" }] })}>
        <ScTank x={880} y={110} w={140} h={120} fill={0.5} />
      </Eq>
      <Tag2 x={950} y={258} tag="OTL0-LEV0" desc={["Delivery room weir"]} />

      {/* main fish-barrier sump */}
      <Eq title="Fish barrier sump" onClick={scEq("OTL0-FHA0-LT1", "Fish Barrier Sump", "vessel", { primary: { l: "Level", v: "21", u: "cm" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Level", v: "21", u: "cm", tag: "OTL0-FHA0-LT1" }],
        trend: { label: "Barrier sump level", base: 21, amp: 6, seed: 1.9, unit: "cm", hi: 90, lo: 0 },
        limits: [{ l: "Barrier sump level · FHA0-LT1", v: "90.0", u: "cm", hi: 90, lo: 0, step: 1 }] })}>
        <SumpBasin x={640} y={300} w={240} h={200} />
      </Eq>
      <RD x={727} y={388} w={66} value="21" unit="cm" tag="OTL0-FHA0-LT1" name="Barrier sump level" group="Fish Barrier" />
      <Tag2 x={760} y={330} tag="OTL0-FHA0-LT1" desc={["Fish barrier sump"]} />

      {/* discharge valves → sea */}
      <Eq title="Discharge valve 1 → sea" onClick={scEq("OTL0-FHA0-SV1", "Discharge Valve 1 → sea", "valve", { primary: { l: "Opening", v: "100", u: "%" }, readouts: [{ l: "Valve opening", v: "100", u: "%", tag: "OTL0-FHA0-SV1" }] })}>
        <SymValve cx={700} cy={620} running />
      </Eq>
      <ModeChip x={716} y={612} mode="A" />
      <Eq title="Discharge valve 2 → sea" onClick={scEq("OTL0-FHA0-SV2", "Discharge Valve 2 → sea", "valve", { primary: { l: "Opening", v: "0", u: "%" }, status: "low", readouts: [{ l: "Valve opening", v: "0", u: "%", tag: "OTL0-FHA0-SV2" }] })}>
        <SymValve cx={820} cy={620} running={false} />
      </Eq>
      <ModeChip x={836} y={612} mode="A" />
      <Tag2 x={760} y={668} tag="OTL0-FHA0" desc={["Discharge valves → sea"]} />

      {/* return-water sumps + lift pumps */}
      <Eq title="Return-water sump DPT3" onClick={scEq("OTL2-FHA1-LT1", "Return-water sump DPT3", "vessel", { primary: { l: "Level", v: "140", u: "cm" }, canStartStop: false, noMode: true,
        readouts: [{ l: "Level", v: "140", u: "cm", tag: "OTL2-FHA1-LT1" }], trend: { label: "Return sump level", base: 140, amp: 12, seed: 1.4, unit: "cm", hi: 200, lo: 0 } })}>
        <SumpBasin x={230} y={500} w={140} h={120} />
      </Eq>
      <RD x={267} y={462} w={66} value="140" unit="cm" tag="OTL2-FHA1-LT1" name="Return sump DPT3 level" group="Fish Barrier" />
      <ScPump cx={300} cy={560} tag="OTL2-FHA1-PU1" name="Return pump DPT3" group="Fish Barrier" value="8" unit="Hz" running
        onClick={scEq("OTL2-FHA1-PU1", "Return-water Pump DPT3", "pump", { primary: { l: "Speed", v: "8", u: "Hz" },
          readouts: [{ l: "Speed", v: "8", u: "Hz", tag: "OTL2-FHA1-PU1" }], setpoints: [{ key: "s", l: "Speed setpoint", v: 8, u: "Hz", step: 0.5, min: 0, max: 60 }],
          trend: { label: "Pump speed", base: 8, amp: 2, seed: 2.2, unit: "Hz", hi: 60 } })} />

      <Eq title="Return-water sump DPT4" onClick={scEq("OTL2-FHA2-LT1", "Return-water sump DPT4", "vessel", { primary: { l: "Level", v: "187", u: "cm" }, canStartStop: false, noMode: true, status: "high",
        readouts: [{ l: "Level", v: "187", u: "cm", tag: "OTL2-FHA2-LT1" }], trend: { label: "Return sump level", base: 187, amp: 8, seed: 3.1, unit: "cm", hi: 200, lo: 0 } })}>
        <SumpBasin x={470} y={500} w={140} h={120} />
      </Eq>
      <RD x={507} y={462} w={66} value="187" unit="cm" tag="OTL2-FHA2-LT1" name="Return sump DPT4 level" group="Fish Barrier" accent="var(--warning-text)" />
      <ScPump cx={540} cy={560} tag="OTL2-FHA2-PU1" name="Return pump DPT4" group="Fish Barrier" value="0" unit="Hz" running={false}
        onClick={scEq("OTL2-FHA2-PU1", "Return-water Pump DPT4", "pump", { primary: { l: "Speed", v: "0", u: "Hz" }, status: "low",
          readouts: [{ l: "Speed", v: "0", u: "Hz", tag: "OTL2-FHA2-PU1" }], setpoints: [{ key: "s", l: "Speed setpoint", v: 0, u: "Hz", step: 0.5, min: 0, max: 60 }] })} />

      <Flag x={1180} y={153} label="Delivery room" dir="r" />
      <Flag x={1180} y={383} label="Sea" dir="r" />
      <Flag x={1180} y={633} label="DPT4 RAS" dir="r" />
      <Flag x={1180} y={683} label="DPT3 RAS" dir="r" />
    </svg>
  );
}

/* ── legend (matches the RAS mimic legend) ── */
function ScLegend({ fluids }) {
  return (
    <div className="ras-legend">
      <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running</span>
      <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Stopped</span>
      <span className="ci"><span className="rasm-leg-chip">A</span> Auto</span>
      <span className="ci"><span className="rasm-leg-chip man">M</span> Manual</span>
      {fluids && <span className="ras-leg-div" aria-hidden="true" />}
      <FluidLegend of={fluids} />
      <span className="ci" style={{ marginLeft: "auto", color: "var(--slate-500)" }}><Icon name="line-chart" size={13} /> Tap a value's trend icon → send to Trends</span>
    </div>
  );
}

/* ── screen wrapper (matches the RAS screen: gridded mimic card + legend + fullscreen SCADA) ── */
function ScSystemScreen({ label, icon, metaLabel, mimicTitle, Mimic, fluids }) {
  const { building, dept } = useCtx();
  const status = njSystemStatus(building.id, dept.id, label);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title={label} statusLevel={njSev(status)}>
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{building.name} · {metaLabel} · live</p>
          </div>
          <div className="pagehead-right"><DeptTabs active={label} /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={15} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={15} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name={icon} size={17} color="var(--slate-600)" /><span className="card-title">{mimicTitle} · {building.name}</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><Mimic /></div>
        <ScLegend fluids={fluids} />
      </div>

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name={icon} size={16} /> {mimicTitle} · {building.name} · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><ScadaZoom><Mimic /></ScadaZoom></div>
        </div>
      )}
    </AppShell>
  );
}

function LyeDosingScreen() { return <ScSystemScreen label="Lye Dosing" icon="flask-conical" metaLabel="pH correction · lye dosing" mimicTitle="Lye Dosing" Mimic={LyeMimic} fluids={["chem"]} />; }
function SeawaterExchangeScreen() { return <ScSystemScreen label="Seawater Exchange" icon="waves" metaLabel="seawater / glycol heat exchange" mimicTitle="Seawater Exchange" Mimic={SweMimic} fluids={["brine", "glycol"]} />; }
function FishBarrierScreen() { return <ScSystemScreen label="Fish Barrier" icon="shield" metaLabel="escape barrier · return water" mimicTitle="Fish Barrier" Mimic={FbMimic} fluids={["proc", "drain"]} />; }

Object.assign(window, { LyeDosingScreen, SeawaterExchangeScreen, FishBarrierScreen });
window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Lye Dosing": LyeDosingScreen,
  "Seawater Exchange": SeawaterExchangeScreen,
  "Fish Barrier": FishBarrierScreen,
});
