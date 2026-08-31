// heat-pumps.jsx — facility utility ("Other"): all plant heat pumps on one screen.
// Reuses the shared HpCard (name / status / rows) + .hp-grid styling from the Energy
// Plant mimic so the two stay visually identical. Cross-facility; reached from Site Plan.

const HP_UNITS = [
  { name: "Heat pump DPT3", scope: "Building 2", status: "ok", rows: [
    ["Operating mode", "Cooling"], ["Runtime", "18 061 h"],
    ["Water in / out evaporator", "6.9 / 6.9 °C"], ["Water in / out condenser", "11.2 / 11.1 °C"],
    ["Compressor frequency", "30 Hz"],
  ]},
  { name: "Heat pump DPT4", scope: "Building 2", status: "ok", rows: [
    ["Operating mode", "Cooling"], ["Runtime", "14 528 h"],
    ["Water in / out evaporator", "7.0 / 6.8 °C"], ["Water in / out condenser", "12.1 / 12.0 °C"],
    ["Compressor frequency", "0 Hz"],
  ]},
  { name: "Heat pump Building 1", scope: "Building 1", status: "low", rows: [
    ["Operating mode", "Stopped"], ["Runtime", "0 h"],
    ["Water in / out evaporator", "5.1 / 5.1 °C"], ["Water in / out condenser", "11.7 / 11.7 °C"],
    ["Compressor frequency", "12.2 Hz"],
  ]},
];

function HeatPumpsScreen() {
  const running = HP_UNITS.filter((u) => u.status === "ok").length;
  return (
    <AppShell active="navigation" title="Heat Pumps" crumbs={["Facility utilities"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{HP_UNITS.length} units · {running} running · facility utility, outside the building hierarchy</p>
          </div>
          <div className="pagehead-right">
            <button className="btn btn-secondary" title="Back to the site plan" onClick={() => window.__njGoPlan && window.__njGoPlan()}><Icon name="map" size={16} /> Site Plan</button>
          </div>
        </div>
      </div>

      <div className="hp-grid hp-grid-facility">
        {HP_UNITS.map((u) => <HpCard key={u.name} name={u.name} status={u.status} rows={u.rows} />)}
      </div>
    </AppShell>
  );
}

window.HeatPumpsScreen = HeatPumpsScreen;
// shared with the mobile app so both surfaces list the same units
window.HP_UNITS = HP_UNITS;
