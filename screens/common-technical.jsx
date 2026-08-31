// common-technical.jsx — building-level shared infrastructure mimic (raw-water intake →
// CO₂ degasser → energy-plant/backwash feeds, plus the fish-barrier drain sump) + param panel.

function CommonTechMimic() {
  const open = (t) => () => openEquipment(t);
  return (
    <svg className="rasm" viewBox="0 0 1456 700" role="img" aria-label="Common technical process mimic" preserveAspectRatio="xMidYMid meet">
      {[
        { k: "raw",   d: "M170,170 H1180" },      // raw water → pump → degasser → output bus
        { k: "raw",   d: "M980,170 V96 H1180" },  // → energy plant · hatchery
        { k: "raw",   d: "M980,170 V250 H1180" }, // → energy plant · feeding
        { k: "drain", d: "M186,520 H520" },       // drain hatchery → sump
        { k: "drain", d: "M186,586 H360 V520" },  // drain feeding → sump
        { k: "drain", d: "M700,540 H1180" },      // sump → drain
      ].map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      <Flag x={20} y={153} label="Raw water" />
      <Flag x={1180} y={79} label="Energy plant · hatchery" />
      <Flag x={1180} y={153} label="Backwash water" />
      <Flag x={1180} y={233} label="Energy plant · feeding" />
      <Flag x={20} y={503} label="Drain · hatchery" />
      <Flag x={20} y={569} label="Drain · feeding" />
      <Flag x={1180} y={523} label="Drain" />

      {/* raw water pump */}
      <RD x={272} y={112} w={58} value="27" unit="Hz" tag="WIN0-PBS0-PU1" name="Raw water pump speed" group="Common Technical" />
      <Eq title="Raw Water Pump" onClick={open(njBuildEquip("WIN0-PBS0-PU1", "Raw Water Pump", "pump", { primary: { l: "Speed", v: "27", u: "Hz" }, running: true, readouts: [{ l: "Speed", v: "27", u: "Hz", tag: "WIN0-PBS0-PU1" }, { l: "Raw water pressure", v: "2.43", u: "bar", tag: "WIN0-PBS0-PT1" }, { l: "Raw water temperature", v: "5.3", u: "°C", tag: "WIN0-PBS0-TT1" }], setpoints: [{ key: "p", l: "Raw water pressure setpoint", v: 2.43, u: "bar", step: 0.05, min: 0, max: 5 }, { key: "h", l: "Pump start hysteresis", v: 0.4, u: "bar", step: 0.05, min: 0, max: 2 }], trend: { label: "Raw water pressure", base: 2.43, amp: 0.25, seed: 2.2, unit: "bar", hi: 3.5 } }))}>
        <SymPump cx={304} cy={170} running={true} />
      </Eq>
      <ModeChip x={262} y={162} mode="A" />
      <SymTrend cx={336} cy={170} tag="WIN0-PBS0-PU1" name="Raw water pump" group="Common Technical" running={true} />
      <Tag2 x={304} y={242} tag="WIN0-PBS0-PU1" desc={["Raw water pump"]} />

      {/* CO₂ degasser */}
      <Eq title="CO₂ Degasser" onClick={open(njBuildEquip("WIN0-PBS0", "CO₂ Degasser", "drumfilter", { canStartStop: false, primary: { l: "Degasser valve", v: "79.9", u: "%" }, readouts: [{ l: "Raw water pressure", v: "2.43", u: "bar", tag: "WIN0-PBS0-PT1" }, { l: "Raw water temperature", v: "5.3", u: "°C", tag: "WIN0-PBS0-TT1" }, { l: "CO₂ degasser valve", v: "79.9", u: "%" }] }))}>
        <StripperColumn x={600} y={70} w={130} h={200} />
      </Eq>
      <text className="slm-cap slm-cap-strong" x={665} y={300} textAnchor="middle">CO₂ Degasser · WIN0-PBS0</text>
      <Tag2 x={860} y={92} tag="WIN0-PBS0-PT1" desc={["Raw water pressure"]} />
      <RD x={828} y={110} w={70} value="2.43" unit="bar" tag="WIN0-PBS0-PT1" name="Raw water pressure" group="Common Technical" />
      <Tag2 x={470} y={92} tag="WIN0-PBS0-TT1" desc={["Raw water temperature"]} />
      <RD x={438} y={110} w={64} value="5.3" unit="°C" tag="WIN0-PBS0-TT1" name="Raw water temperature" group="Common Technical" />

      {/* fish barrier sump */}
      <Eq title="Fish Barrier Sump" onClick={open(njBuildEquip("WIN0-EFL0-LT1", "Fish Barrier Sump", "vessel", { canStartStop: false, primary: { l: "Level", v: "9.1", u: "cm" }, readouts: [{ l: "Fish barrier sump level", v: "9.1", u: "cm", tag: "WIN0-EFL0-LT1" }], trend: { label: "Sump level", base: 12, amp: 6, seed: 3.3, unit: "cm", hi: 90, lo: 0 }, limits: [{ l: "Fish barrier sump level · LT1", v: "9.2", u: "cm", hi: 90, lo: 0, step: 1 }] }))}>
        <SlTank x={520} y={440} w={180} h={130} />
      </Eq>
      <text className="slm-cap slm-cap-strong" x={610} y={604} textAnchor="middle">Fish Barrier Sump · WIN0-EFL0</text>
      <Tag2 x={860} y={452} tag="WIN0-EFL0-LT1" desc={["Fish barrier sump level"]} />
      <RD x={828} y={470} w={64} value="9.1" unit="cm" tag="WIN0-EFL0-LT1" name="Fish barrier sump level" group="Common Technical" />
    </svg>
  );
}

const CT_TABS = ["Raw water", "WIN"];
const CT_PARAMS = {
  "Raw water": [
    { h: "Raw water control" },
    { l: "Raw water pressure", v: "2.43 bar" },
    { l: "CO₂ degasser valve", v: "79.9 %" },
    { l: "Raw water pressure setpoint", v: "2.43 bar", box: true },
    { l: "Raw water pump start hysteresis", v: "0.40 bar", box: true },
    { h: "Raw water pump · WIN0-PBS0-PU1" },
    { l: "Mode", mode: "Auto" },
    { l: "Controller gain", v: "7.0", box: true },
    { l: "Integral time for controller", v: "15.0 sec", box: true },
  ],
  "WIN": [
    { h: "Intake water, Raw water pressure · WIN0-PBS0-PT1" },
    { l: "Measured value", v: "2.43 bar" },
    { l: "High-High alarm", v: "3.50 bar", box: true },
    { l: "High alarm", v: "3.50 bar", box: true },
    { l: "Low alarm", v: "0.00 bar", box: true },
    { l: "Low-Low alarm", v: "0.00 bar", box: true },
    { h: "Intake water, Raw water temperature · WIN0-PBS0-TT1" },
    { l: "Measured value", v: "5.3 °C" },
    { l: "High alarm", v: "12.0 °C", box: true },
    { l: "Low alarm", v: "2.0 °C", box: true },
    { h: "Fish barrier, Sump level · WIN0-EFL0-LT1" },
    { l: "Measured value", v: "9.2 cm" },
    { l: "High-High alarm", v: "90.0 cm", box: true },
    { l: "High alarm", v: "75.0 cm", box: true },
    { l: "Low alarm", v: "0.0 cm", box: true },
  ],
};

function CommonTechnicalScreen() {
  const { building } = useCtx();
  return (
    <SystemShell title="Technical" active="Technical" statusLevel="ok"
      metaIcon="git-merge" metaLabel={building.name + " · shared infrastructure · live"}
      mimicIcon="git-merge" mimicTitle="Common Technical · WIN0"
      mimicCaption="Click equipment for controls · tap a value's trend icon to send it to Trends"
      mimic={<CommonTechMimic />}
      legend={<ScadaLegend fluids={["raw", "drain"]} />}
      param={<ParamTabs tabs={CT_TABS} params={CT_PARAMS} title="Common Technical · parameters" />} />
  );
}

window.CommonTechnicalScreen = CommonTechnicalScreen;
window.__njSystemScreens = Object.assign(window.__njSystemScreens || {}, {
  "Technical": CommonTechnicalScreen,
});

Object.assign(window, { CommonTechMimic });
