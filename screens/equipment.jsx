// equipment.jsx — equipment popup (Live / Trend / Alarm limits) + RAS-* equipment registry.
// Open from any mimic node via openEquipment(tag).

const EQ_KIND = {
  pump:       { icon: "fan",        word: "Pump" },
  blower:     { icon: "wind",       word: "Blower" },
  drumfilter: { icon: "filter",     word: "Drum filter" },
  cone:       { icon: "droplets",   word: "Oxygenation" },
  valve:      { icon: "git-commit-horizontal", word: "Control valve" },
  vessel:     { icon: "layers",     word: "Vessel" },
  sensor:     { icon: "gauge",      word: "Instrument" },
};

function EqModeToggle({ mode, onChange }) {
  return (
    <div className="segmented eq-mode">
      {["Auto", "Manual"].map((m) => (
        <button key={m} className={"seg" + (m === mode ? " active" : "")} onClick={() => onChange(m)}>
          {m === "Auto" && <Icon name="zap" size={12} />} {m}
        </button>
      ))}
    </div>
  );
}

function EquipmentDialog({ equip }) {
  const [tab, setTab] = React.useState("Overview");
  const [mode, setMode] = React.useState(equip.mode || "Auto");
  const [running, setRunning] = React.useState(equip.running !== false);
  const [sp, setSp] = React.useState(() => {
    const o = {}; (equip.setpoints || []).forEach((s) => { o[s.key] = s.v; }); return o;
  });
  const [lim, setLim] = React.useState(() => {
    const o = {}; (equip.limits || []).forEach((l, i) => { o["hi" + i] = l.hi; o["lo" + i] = l.lo; }); return o;
  });
  const kind = EQ_KIND[equip.kind] || EQ_KIND.sensor;
  const tabDefs = [{ id: "Overview", icon: "monitor" }];
  if (equip.trend) tabDefs.push({ id: "Trend", icon: "activity" });
  tabDefs.push({ id: "Alarms", icon: "bell" }, { id: "Log", icon: "history" }, { id: "Notes", icon: "sticky-note" }, { id: "Admin", icon: "shield" });

  const requestMode = (m) => {
    if (m === mode) return;
    openDialog(<ConfirmDialog
      title={"Switch to " + m + " mode?"}
      message={m === "Manual"
        ? "Manual mode hands control of " + equip.name + " to the operator. Automatic regulation will be suspended."
        : "Automatic mode returns " + equip.name + " to setpoint-driven regulation."}
      detail={equip.tag}
      confirmLabel={"Set " + m}
      tone={m === "Manual" ? "danger" : "primary"}
      onConfirm={() => setMode(m)} />);
  };
  const requestStartStop = () => {
    const stopping = running;
    openDialog(<ConfirmDialog
      title={(stopping ? "Stop " : "Start ") + equip.name + "?"}
      message={stopping
        ? "This stops " + (kind.word || "the unit").toLowerCase() + " " + equip.tag + ". Downstream flow will be affected."
        : "This starts " + equip.tag + " at the current setpoint."}
      confirmLabel={stopping ? "Stop unit" : "Start unit"}
      tone={stopping ? "danger" : "primary"}
      onConfirm={() => setRunning((r) => !r)} />);
  };
  const adjust = (s) => {
    openDialog(<SetpointDialog
      title="Adjust setpoint" tag={equip.tag} label={s.l}
      value={sp[s.key]} current={s.v} unit={s.u} step={s.step || 1} min={s.min} max={s.max}
      onApply={(v) => setSp((prev) => ({ ...prev, [s.key]: v }))} />);
  };
  const editLimit = (l, i, which) => {
    const key = which + i;
    openDialog(<SetpointDialog
      title={which === "hi" ? "High alarm limit" : "Low alarm limit"} tag={equip.tag} label={l.l}
      value={lim[key]} current={which === "hi" ? l.hi : l.lo} unit={l.u} step={l.step || 1}
      onApply={(v) => setLim((prev) => ({ ...prev, [key]: v }))} />);
  };

  const dec = (x) => (Math.abs(x) >= 100 || x % 1 === 0 ? x.toFixed(0) : x.toFixed(1));
  return (
    <Dialog width={628}>
      <DlgHeader icon={kind.icon} name={equip.name} tag={equip.tag} status={equip.status} onClose={closeDialog} />

      {/* control strip */}
      <div className="eq-control">
        <div className="eq-control-l">
          <span className={"eq-run" + (running ? " on" : "")}>
            <Dot level={running ? "ok" : "low"} size={8} /> {running ? (equip.runLabel || "In operation") : "Stopped"}
          </span>
          {equip.primary && <span className="eq-primary data">{equip.primary.v}<span className="u"> {equip.primary.u}</span></span>}
        </div>
        {!(equip.noMode && equip.canStartStop === false) && (
          <div className="eq-control-r">
            {!equip.noMode && <EqModeToggle mode={mode} onChange={requestMode} />}
            {equip.canStartStop !== false && (
              <button className={"btn " + (running ? "btn-danger" : "btn-primary")} onClick={requestStartStop}>
                <Icon name={running ? "square" : "play"} size={14} /> {running ? "Stop" : "Start"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="eq-tabs">
        <div className="segmented eq-tabstrip">
          {tabDefs.map((t) => <button key={t.id} className={"seg" + (t.id === tab ? " active" : "")} onClick={() => setTab(t.id)}><Icon name={t.icon} size={14} /> {t.id}</button>)}
        </div>
      </div>

      <div className="dlg-body eq-body">
        {tab === "Overview" && (
          <React.Fragment>
            {equip.readouts && (
              <div className="eq-readouts">
                {equip.readouts.map((r, i) => (
                  <div className="eq-ro" key={i}>
                    <span className="eq-ro-lbl">{r.l}</span>
                    <span className="data eq-ro-val" style={r.accent ? { color: r.accent } : null}>{r.v}<span className="u"> {r.u}</span></span>
                    <TrendBtn id={r.tag || ((equip.tag || "EQ") + "-" + i)} tag={r.tag} name={r.l} unit={r.u} value={r.v} group={equip.name || equip.tag} />
                  </div>
                ))}
              </div>
            )}
            {equip.setpoints && equip.setpoints.length > 0 && (
              <div className="eq-section">
                <div className="eq-section-h">Setpoints</div>
                {equip.setpoints.map((s, i) => {
                  const changed = sp[s.key] !== s.v;
                  return (
                    <div className="eq-sp-row" key={i}>
                      <span className="eq-sp-l">{s.l}</span>
                      <span className="eq-sp-r">
                        <span className={"data eq-sp-v" + (changed ? " changed" : "")}>{dec(sp[s.key])}<span className="u"> {s.u}</span></span>
                        <button className="btn btn-ghost btn-sm" onClick={() => adjust(s)}><Icon name="pencil" size={14} /> Adjust</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <EqOverviewExtras equip={equip} />
          </React.Fragment>
        )}

        {tab === "Trend" && (
          <div className="eq-trend">
            <div className="eq-trend-head">
              <span className="eyebrow">{equip.trend.label || (equip.primary && equip.primary.l) || "Signal"} · last 6h</span>
              <span className="eq-trend-now data">{equip.primary ? equip.primary.v + " " + equip.primary.u : ""}</span>
            </div>
            <TrendChart
              data={genTrend(equip.trend.seed || 1, equip.trend.base, equip.trend.amp)}
              unit={equip.trend.unit} color={equip.trend.color || "var(--primary)"}
              hi={equip.trend.hi} lo={equip.trend.lo} />
            <div className="eq-trend-legend">
              {equip.trend.hi != null && <span className="ci"><span className="dash warn" /> High alarm {equip.trend.hi} {equip.trend.unit}</span>}
              {equip.trend.lo != null && <span className="ci"><span className="dash crit" /> Low alarm {equip.trend.lo} {equip.trend.unit}</span>}
            </div>
          </div>
        )}

        {tab === "Alarms" && (
          <React.Fragment>
            <EqAlarmsTab equip={equip} />
            {equip.limits && equip.limits.length > 0 && (
              <div className="eqx-tab">
                <div className="eqx-h eqx-h2"><Icon name="sliders-horizontal" size={14} /> Alarm limits</div>
                <div className="eq-limits">
                  {equip.limits.map((l, i) => (
                    <div className="eq-lim-row" key={i}>
                      <div className="eq-lim-id">
                        <span className="eq-lim-l">{l.l}</span>
                        <span className="data eq-lim-meas">{l.v}<span className="u"> {l.u}</span></span>
                      </div>
                      <div className="eq-lim-chips">
                        <button className="lim-chip hi" onClick={() => editLimit(l, i, "hi")}>
                          <span className="lim-chip-k">HI</span><span className="data">{dec(lim["hi" + i])}</span><Icon name="pencil" size={12} />
                        </button>
                        <button className="lim-chip lo" onClick={() => editLimit(l, i, "lo")}>
                          <span className="lim-chip-k">LO</span><span className="data">{dec(lim["lo" + i])}</span><Icon name="pencil" size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </React.Fragment>
        )}
        {tab === "Log" && <EqLogTab equip={equip} />}
        {tab === "Notes" && <EqNotesTab equip={equip} />}
        {tab === "Admin" && <EqAdminTab equip={equip} />}
      </div>

      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="user" size={14} /> Last change · E. Sørensen · 13:48</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}

/* ── RAS-* equipment registry ── */
const EQUIP = {
  "DPT1-FIL0": {
    tag: "DPT1-FIL0", name: "Drum Filter", kind: "drumfilter", status: "high",
    mode: "Auto", running: true, runLabel: "Backwashing",
    primary: { l: "Level before filter", v: "59", u: "cm" },
    readouts: [
      { l: "Level before filter", v: "59", u: "cm" },
      { l: "Differential ΔP", v: "0.03", u: "bar" },
      { l: "Rotation speed", v: "45", u: "Hz" },
      { l: "Backwash · last period", v: "20.1", u: "%" },
    ],
    setpoints: [
      { key: "bwlevel", l: "Start backwash level", v: 60, u: "cm", step: 1, min: 40, max: 80 },
      { key: "bwdur", l: "Backwash duration / filter", v: 45, u: "sec", step: 5, min: 10, max: 120 },
      { key: "maxpause", l: "Max pause between backwash", v: 3, u: "min", step: 1, min: 1, max: 30 },
    ],
    trend: { label: "Level before filter", base: 56, amp: 9, seed: 1.2, unit: "cm", hi: 70, lo: 25 },
    limits: [
      { l: "Level before filter · LT1", v: "59", u: "cm", hi: 70, lo: 25, step: 1 },
      { l: "Differential pressure · PT1", v: "0.03", u: "bar", hi: 0.5, lo: 0, step: 0.05 },
    ],
  },
  "DPT1-AEB0-BL1": {
    tag: "DPT1-AEB0-BL1", name: "MBBR Blower 1", kind: "blower", status: "ok",
    mode: "Auto", running: true,
    primary: { l: "Blower activity", v: "42", u: "Hz" },
    readouts: [
      { l: "Blower activity", v: "42", u: "Hz" },
      { l: "Level in bioreactor", v: "253", u: "cm" },
      { l: "Cabinet temp 1", v: "16.3", u: "°C" },
      { l: "Cabinet temp 2", v: "21.0", u: "°C" },
    ],
    setpoints: [
      { key: "freq", l: "Blower frequency", v: 42, u: "Hz", step: 1, min: 20, max: 60 },
      { key: "level", l: "Bioreactor level setpoint", v: 250, u: "cm", step: 5, min: 200, max: 300 },
    ],
    trend: { label: "Blower activity", base: 42, amp: 6, seed: 2.4, unit: "Hz", hi: 58 },
    limits: [
      { l: "Cabinet temp 1 · TT1", v: "16.3", u: "°C", hi: 45, lo: 5, step: 1 },
      { l: "Cabinet temp 2 · TT2", v: "21.0", u: "°C", hi: 45, lo: 5, step: 1 },
    ],
  },
  "DPT1-STR0-FAN": {
    tag: "DPT1-STR0-FAN", name: "CO₂ Stripper Fan", kind: "blower", status: "ok",
    mode: "Auto", running: true,
    primary: { l: "CO₂ fan activity", v: "49", u: "Hz" },
    readouts: [
      { l: "CO₂ fan activity", v: "49", u: "Hz" },
      { l: "Vacuum in stripping", v: "−44.4", u: "mbar" },
    ],
    setpoints: [
      { key: "fan", l: "CO₂ fan activity", v: 49, u: "Hz", step: 1, min: 20, max: 60 },
      { key: "vac", l: "Vacuum setpoint", v: -45, u: "mbar", step: 1, min: -80, max: 0 },
    ],
    trend: { label: "Vacuum in stripping", base: -44, amp: 5, seed: 3.7, unit: "mbar", lo: -70 },
  },
  "DPT1-DOX0": {
    tag: "DPT1-DOX0", name: "Oxygenation Cone", kind: "cone", status: "ok",
    mode: "Auto", running: true, canStartStop: false,
    primary: { l: "O₂ saturation", v: "87.9", u: "%" },
    readouts: [
      { l: "O₂ saturation", v: "87.9", u: "%", accent: "var(--success-text)" },
      { l: "Cone pressure", v: "2.0", u: "bar" },
      { l: "Valve opening to tank", v: "33.4", u: "%" },
      { l: "O₂ supply pressure", v: "4.8", u: "bar" },
    ],
    setpoints: [
      { key: "o2", l: "O₂ saturation setpoint", v: 90, u: "%", step: 0.5, min: 80, max: 110 },
      { key: "cone", l: "Cone pressure setpoint", v: 2.0, u: "bar", step: 0.1, min: 0, max: 4 },
      { key: "valvemax", l: "Max valve opening to tank", v: 75, u: "%", step: 1, min: 10, max: 100 },
    ],
    trend: { label: "O₂ saturation", base: 88, amp: 4, seed: 1.9, unit: "%", color: "var(--success)", hi: 105, lo: 80 },
    limits: [
      { l: "O₂ saturation · QT1", v: "87.9", u: "%", hi: 105, lo: 80, step: 0.5 },
      { l: "Cone pressure · PT1", v: "2.0", u: "bar", hi: 3.5, lo: 0.5, step: 0.1 },
    ],
  },
  "DPT1-SMP0-PU1": {
    tag: "DPT1-SMP0-PU1", name: "Lift Pump 1", kind: "pump", status: "ok",
    mode: "Auto", running: true,
    primary: { l: "Speed", v: "41", u: "Hz" },
    readouts: [
      { l: "Speed", v: "41", u: "Hz" },
      { l: "Current", v: "186.0", u: "A" },
      { l: "Power", v: "31.0", u: "kW" },
      { l: "Tank pressure", v: "6.02", u: "mVs" },
    ],
    setpoints: [
      { key: "press", l: "Pressure setpoint", v: 6.0, u: "mVs", step: 0.1, min: 4, max: 8 },
      { key: "minhz", l: "Min speed", v: 30, u: "Hz", step: 1, min: 20, max: 50 },
      { key: "maxhz", l: "Max speed", v: 50, u: "Hz", step: 1, min: 30, max: 60 },
    ],
    trend: { label: "Tank pressure", base: 6.0, amp: 0.4, seed: 4.5, unit: "mVs", hi: 7, lo: 4.5 },
    limits: [
      { l: "Tank pressure · PT1", v: "6.02", u: "mVs", hi: 7.0, lo: 4.5, step: 0.1 },
      { l: "Motor current · IT1", v: "186.0", u: "A", hi: 240, lo: 0, step: 5 },
    ],
  },
};

// fallback spec for any node without a full registry entry
function njBuildEquip(tag, name, kind, extra) {
  return Object.assign({
    tag, name: name || tag, kind: kind || "sensor", status: "ok",
    mode: "Auto", running: true, canStartStop: kind === "pump" || kind === "blower",
  }, extra || {});
}
function openEquipment(tagOrSpec) {
  const spec = typeof tagOrSpec === "string"
    ? (EQUIP[tagOrSpec] || njBuildEquip(tagOrSpec))
    : tagOrSpec;
  openDialog(<EquipmentDialog equip={spec} />);
}

Object.assign(window, { EquipmentDialog, EQUIP, openEquipment, njBuildEquip });
