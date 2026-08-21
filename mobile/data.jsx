// data.jsx — NJORD mobile prototype data layer. Reuses the desktop data model, terminology
// and severity system so the mobile app stays consistent with the control-room build.
// Everything is exported on window (Babel scripts share global scope but not lexical scope).

// ---- severity (ISA-101 / ISA-18.2, mirrors lib/chrome.jsx SEV) ----
// `dot` is the indicator hue (dots, rails, chart marks — never under text).
// `chip`/`chipInk` is the SOLID fill + ink pair for a filled severity badge: an indicator hue is
// tuned for a mark on white, not as a text background (white on --critical is only 3.7:1), so the
// filled ribbon/tab badges read from chip/chipInk, which clear AA at 9px. Mirrors desktop --sev-*-ink.
const MSEV = {
  critical:   { dot: "#F53E39", solid: "#D8302B", chip: "#D8302B", chipInk: "#FFFFFF", bg: "var(--critical-bg)", text: "var(--critical-text)", label: "CRITICAL", rank: 0 },
  high:       { dot: "#FBA100", solid: "#FBA100", chip: "#FBA100", chipInk: "#0F182B", bg: "var(--warning-bg)",  text: "var(--warning-text)",  label: "HIGH",     rank: 1 },
  medium:     { dot: "#2563EB", solid: "#2563EB", chip: "#2563EB", chipInk: "#FFFFFF", bg: "var(--medium-bg)",   text: "var(--medium-text)",   label: "MEDIUM",   rank: 2 },
  low:        { dot: "#6B7686", solid: "#6B7686", chip: "#5C646F", chipInk: "#FFFFFF", bg: "var(--info-bg)",     text: "var(--info-text)",     label: "LOW",      rank: 3 },
  diagnostic: { dot: "#90A1B9", solid: "#90A1B9", chip: "#62748E", chipInk: "#FFFFFF", bg: "var(--info-bg)",     text: "var(--info-text)",     label: "DIAG",     rank: 4 },
  ok:         { dot: "#00C483", solid: "#00C483", chip: "#00734C", chipInk: "#FFFFFF", bg: "var(--success-bg)",  text: "var(--success-text)",  label: "OK",       rank: 9 },
};

// ---- alarm register (curated from lib/alarmstore.jsx ALARM_REGISTER_SEED + rationalization) ----
// state: unack | ack | returned ; response = ISA-18.2 required operator response time
const M_ALARMS = [
  { id: "AL01", level: "critical", state: "unack", min: 2,   area: "DPT1 · Pump Sump", bld: "Building 1", tag: "DPT1-SMP0-QT4", alarm: "pH 2 in pump sump High-high", val: "7.62", unit: "pH", thr: "> 7.40 HH",
    cons: "Low pH entering the RAS loop stresses fish and can mobilise metals from pipework. Water intake is blocked until pH is restored.", resp: "Immediate",
    act: "Verify pH probe 2 against a grab sample; check lye dosing hasn't overshot.", meas: { base: 7.05, amp: 0.22, kind: "hihi", thr: 7.40 } },
  { id: "AL02", level: "critical", state: "unack", min: 21,  area: "DPT2 · O₂ to Fish Tank 8", bld: "Building 2", tag: "DPT2-DOX2-PT1", alarm: "Pressure signal error", val: "—", unit: "", thr: "Signal fault",
    cons: "O₂ pressure to Fish Tank 8 is measured blind, dosing control may over- or under-supply oxygen.", resp: "Immediate",
    act: "Cross-check the redundant O₂ line transmitter and inspect wiring at DPT2-DOX2.", meas: null },
  { id: "AL04", level: "high", state: "unack", min: 30,  area: "DPT1 · CO₂-stripper", bld: "Building 1", tag: "DPT1-STR0-AV2", alarm: "CO₂-fan 2 comms error with drive", val: "—", unit: "", thr: "Comms fault",
    cons: "One CO₂ fan is lost; stripping capacity is halved. If fan 1 also fails, CO₂ climbs quickly toward the fish-welfare limit.", resp: "< 5 min",
    act: "Read the VSD fault code and confirm the network link; fan 1 carries the load meanwhile.", meas: null },
  { id: "AL05", level: "high", state: "unack", min: 15,  area: "DPT2 · Pump Sump", bld: "Building 2", tag: "DPT2-SMP0-LT1", alarm: "Level in pump sump Low", val: "163", unit: "cm", thr: "< 168 L",
    cons: "Low sump level risks lift-pump cavitation and loss of circulation to the tanks.", resp: "< 5 min",
    act: "Confirm the make-up water valve is open before restarting the lift pumps.", meas: { base: 188, amp: 5.5, kind: "lo", thr: 168 } },
  { id: "AL06", level: "high", state: "unack", min: 1662, area: "DPT1 · Lye", bld: "Building 1", tag: "DPT1-DNA0-PU1", alarm: "Lye pump 1 missing operation feedback", val: "—", unit: "", thr: "No feedback",
    cons: "No pH correction from lye pump 1; department pH may drift low if pump 2 cannot keep up.", resp: "< 5 min",
    act: "Check the motor breaker and feedback contact; dose from pump 2 if needed.", meas: null },
  { id: "AL08", level: "high", state: "unack", min: 36,  area: "DPT1 · Pump Sump", bld: "Building 1", tag: "DPT1-SMP0-PU1", alarm: "Lift pump 1 high temperature", val: "78.4", unit: "°C", thr: "> 75 H",
    cons: "Lift pump 1 is overheating and may trip, interrupting water circulation to the tanks.", resp: "< 5 min",
    act: "Inspect the strainer for blockage and confirm cooling flow before continued running.", meas: { base: 58, amp: 4.5, kind: "hi", thr: 75 } },
  { id: "AL09", level: "high", state: "unack", min: 54,  area: "DPT1 · Fish Tank 2", bld: "Building 1", tag: "DPT1-FTA2-TB1", alarm: "Feed screw fault", val: "—", unit: "", thr: "Drive trip",
    cons: "Feeding to Fish Tank 2 is interrupted; prolonged stoppage affects growth and welfare.", resp: "< 5 min",
    act: "Clear any pellet jam and reset the drive.", meas: null },
  { id: "AL11", level: "medium", state: "unack", min: 63, area: "Fish transport", bld: "Facility", tag: "OTL1-FHA0-LS1", alarm: "Water on floor in fish transport sump", val: "Wet", unit: "", thr: "Switch",
    cons: "Possible leak in the fish-transport area; risk of slip and equipment water ingress.", resp: "< 30 min",
    act: "Inspect the sump and floor; mop and trace the source.", meas: null },
  { id: "AL13", level: "medium", state: "unack", min: 87, area: "DPT1 · Fish Tank 2", bld: "Building 1", tag: "DPT1-FTA2-TB1", alarm: "Feed screw missing calibration data", val: "—", unit: "", thr: "Config",
    cons: "The feed screw cannot dose automatically until it is recalibrated.", resp: "< 30 min",
    act: "Run the feed-screw calibration routine.", meas: null },
  { id: "AL15", level: "low", state: "unack", min: 1854, area: "DPT1 · Drum filter", bld: "Building 1", tag: "DPT1-FIL0-PT1", alarm: "Filter differential pressure High", val: "0.063", unit: "bar", thr: "> 0.060 H",
    cons: "Rising drum-filter differential pressure reduces filtration; a backwash is due but not urgent.", resp: "< 4 hours",
    act: "Schedule a backwash cycle.", meas: { base: 0.032, amp: 0.009, kind: "hi", thr: 0.060 } },
  { id: "AL16", level: "low", state: "ack", min: 132, area: "DPT2 · UV plant", bld: "Building 2", tag: "DPT2-UVA0-RT1", alarm: "UV lamp 3 runtime exceeded", val: "9042", unit: "h", thr: "> 9000 H",
    cons: "UV lamp 3 is past its rated life; disinfection dose may fall over time.", resp: "< 4 hours",
    act: "Plan a lamp replacement work order.", meas: { base: 8760, amp: 30, kind: "hi", thr: 9000 } },
  { id: "AL17", level: "diagnostic", state: "unack", min: 258, area: "DPT1 · Tavlerom", bld: "Building 1", tag: "—", alarm: "PLC fault, rack 0 Slot 2: Digital inputs", val: "—", unit: "", thr: "Diag",
    cons: "A diagnostic fault is logged on the PLC I/O; no direct process impact yet.", resp: "< 4 hours",
    act: "Note for controls engineering; monitor for related I/O faults.", meas: null },
];

// ---- tanks (from screens/tank.jsx TANK_PANELS, extended with temp/CO₂/pH/TAN for mobile detail) ----
const M_TANKS = [
  { n: 1, name: "Fish Tank 1", tag: "DPT1-FTA1", dept: "DPT1 · Post-Smolt", bld: "Building 1", active: true, emgO2: false, feeding: true,
    o2: 89.6, level: 199, temp: 12.4, co2: 11.2, ph: 7.08, tan: 0.58, ctrl: 26, biomass: 338, density: 6.24, population: 148778, avgWt: 2.3, maxBiomass: 560, feedTarget: 9.6, fedToday: 7.1 },
  { n: 2, name: "Fish Tank 2", tag: "DPT1-FTA2", dept: "DPT1 · Post-Smolt", bld: "Building 1", active: true, emgO2: true, feeding: false,
    o2: 80.7, level: 204, temp: 12.6, co2: 14.9, ph: 6.96, tan: 0.71, ctrl: 47, biomass: 361, density: 6.68, population: 151020, avgWt: 2.4, maxBiomass: 350, feedTarget: 10.2, fedToday: 6.4 },
  { n: 3, name: "Fish Tank 3", tag: "DPT1-FTA3", dept: "DPT1 · Post-Smolt", bld: "Building 1", active: true, emgO2: false, feeding: true,
    o2: 82.9, level: 207, temp: 12.5, co2: 12.8, ph: 7.02, tan: 0.63, ctrl: 42, biomass: 349, density: 6.46, population: 149640, avgWt: 2.3, maxBiomass: 560, feedTarget: 9.8, fedToday: 7.4 },
  { n: 4, name: "Fish Tank 4", tag: "DPT1-FTA4", dept: "DPT1 · Post-Smolt", bld: "Building 1", active: false, emgO2: false, feeding: false,
    o2: 88.3, level: 204, temp: 12.3, co2: 9.1, ph: 7.10, tan: 0.30, ctrl: 24, biomass: 0, density: 0, population: 0, avgWt: 0, maxBiomass: 560, feedTarget: 0, fedToday: 0 },
];
// O₂ status from the configured limits (dosing setpoint / emergency-O₂ opening limit) —
// mirrors desktop tank.jsx. No welfare band exists in the system.
const M_O2_SP = 90, M_O2_EMG = 82, M_O2_HYST = 2.5;
function mO2Status(o2) { if (o2 < M_O2_EMG) return "critical"; if (o2 < M_O2_SP - M_O2_HYST) return "high"; return "ok"; }
// generic band checker for a vital → status
function mVital(kind, v) {
  if (kind === "o2") return mO2Status(v);
  if (kind === "temp") return v > 14 || v < 10 ? "high" : "ok";
  if (kind === "co2") return v > 15 ? "critical" : v > 13 ? "high" : "ok";
  if (kind === "ph") return v < 6.7 || v > 7.6 ? "high" : "ok";
  if (kind === "tan") return v > 1.0 ? "high" : v > 0.8 ? "medium" : "ok";
  return "ok";
}

// ---- facility model (from lib/chrome.jsx FACILITY) ----
const M_FACILITY = [
  { id: "b1", name: "Building 1", depts: [
    { id: "b1-d1", name: "DPT1", sub: "Post-Smolt", systems: [ { label: "Fish Tank", icon: "waves", status: "critical" }, { label: "RAS", icon: "git-merge", status: "ok" }, { label: "Feeding", icon: "utensils", status: "high" } ] },
    { id: "b1-d2", name: "DPT2", sub: "Post-Smolt", systems: [ { label: "Fish Tank", icon: "waves", status: "ok" }, { label: "RAS", icon: "git-merge", status: "high" }, { label: "Feeding", icon: "utensils", status: "ok" } ] },
    { id: "b1-sup", name: "Support", sub: "Shared", systems: [ { label: "Hatchery", icon: "egg", status: "ok" }, { label: "Lye Dosing", icon: "flask-conical", status: "high" } ] },
  ]},
  { id: "b2", name: "Building 2", depts: [
    { id: "b2-d3", name: "DPT3", sub: "Grow-out", systems: [ { label: "Fish Tank", icon: "waves", status: "ok" }, { label: "MBBR", icon: "layers", status: "ok" }, { label: "Feeding", icon: "utensils", status: "ok" } ] },
    { id: "b2-d4", name: "DPT4", sub: "Grow-out", systems: [ { label: "Fish Tank", icon: "waves", status: "ok" }, { label: "Pump Sump", icon: "git-merge", status: "high" }, { label: "Feeding", icon: "utensils", status: "ok" } ] },
    { id: "b2-sup", name: "Support", sub: "Shared", systems: [ { label: "Water Treatment", icon: "droplets", status: "ok" }, { label: "UV Plant", icon: "sun", status: "low" }, { label: "Fish Barrier", icon: "shield", status: "ok" } ] },
  ]},
  { id: "b3", name: "Building 3", depts: [
    { id: "b3-d1", name: "DPT1", sub: "Hatchery", systems: [ { label: "Hatchery", icon: "egg", status: "ok" }, { label: "Energy Plant", icon: "zap", status: "ok" } ] },
    { id: "b3-d2", name: "DPT2", sub: "Start-Feeding", systems: [ { label: "Fish Tank", icon: "waves", status: "ok" }, { label: "Overview", icon: "workflow", status: "ok" }, { label: "Feeding", icon: "utensils", status: "ok" } ] },
    { id: "b3-com", name: "Common", sub: "Shared", systems: [ { label: "Technical", icon: "wrench", status: "ok" } ] },
  ]},
];
// flat, searchable navigation index derived from the facility tree — no hand-authored
// icons/structure: label + breadcrumb path + status all come from M_FACILITY.
const M_NAV_INDEX = M_FACILITY.flatMap((b) =>
  b.depts.flatMap((d) =>
    d.systems.map((s) => ({
      label: s.label,
      path: b.name + " · " + d.name + (d.sub ? " " + d.sub : ""),
      status: mFacSev(s.status),
      bld: b.id, dept: d.id,
    }))));
function mFacSev(s) { return s === "critical" ? "critical" : s === "warning" || s === "high" ? "high" : s === "low" ? "low" : "ok"; }
function mDeptWorst(d) { let w = "ok"; d.systems.forEach((s) => { const v = mFacSev(s.status); if (v === "critical") w = "critical"; else if (v === "high" && w !== "critical") w = "high"; }); return w; }
function mBldWorst(b) { let w = "ok"; b.depts.forEach((d) => { const v = mDeptWorst(d); if (v === "critical") w = "critical"; else if (v === "high" && w !== "critical") w = "high"; }); return w; }

// ---- equipment (per-tank + department; from EQUIP registry patterns) ----
const M_EQUIP = [
  { tag: "DPT1-SMP0-PU1", name: "Lift pump 1", kind: "pump", status: "high", running: true, mode: "Auto", vals: [ ["Speed", "78", "%"], ["Winding temp", "78.4", "°C"], ["Flow", "1240", "L/s"], ["Runtime", "8420", "h"] ], maint: "Bearing greased · 12 Feb 2026" },
  { tag: "DPT1-SMP0-PU2", name: "Lift pump 2", kind: "pump", status: "ok", running: true, mode: "Auto", vals: [ ["Speed", "64", "%"], ["Winding temp", "54.1", "°C"], ["Flow", "1180", "L/s"], ["Runtime", "7960", "h"] ], maint: "Bearing greased · 12 Feb 2026" },
  { tag: "DPT1-FIL0", name: "Drum filter", kind: "drumfilter", status: "low", running: true, mode: "Auto", vals: [ ["ΔP", "0.063", "bar"], ["Turbidity out", "0.45", "NTU"], ["Backwash", "12", "min"], ["Rotation", "On", ""] ], maint: "Screen panels inspected · 28 Jan 2026" },
  { tag: "DPT1-STR0-AV1", name: "CO₂ fan 1", kind: "fan", status: "ok", running: true, mode: "Auto", vals: [ ["Speed", "72", "%"], ["Vacuum", "-46", "mbar"], ["Runtime", "5210", "h"] ], maint: "Filter changed · 03 Feb 2026" },
  { tag: "DPT1-STR0-AV2", name: "CO₂ fan 2", kind: "fan", status: "high", running: false, mode: "Auto", vals: [ ["Speed", "0", "%"], ["Vacuum", "—", "mbar"], ["Runtime", "5180", "h"] ], maint: "Filter changed · 03 Feb 2026" },
  { tag: "DPT1-DOX0", name: "O₂ cone", kind: "cone", status: "ok", running: true, mode: "Auto", vals: [ ["O₂ dose", "42", "%"], ["Inlet O₂", "220", "%"], ["Pressure", "1.4", "bar"] ], maint: "Serviced · 20 Jan 2026" },
];

// ---- deterministic trend series for a tag: crosses threshold at the alarm moment if provided ----
function mSeries(seed, n, base, amp, alarm) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pts = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    let v = base + Math.sin(f * Math.PI * 3 + (seed.length % 5)) * amp * 0.6 + (rnd() - 0.5) * amp * 0.5;
    if (alarm) { // ramp toward threshold near the end
      const ramp = 1 / (1 + Math.exp(-(f - 0.82) * 16));
      const dir = (alarm.kind === "lo" || alarm.kind === "lolo") ? -1 : 1;
      v = base + dir * Math.abs(alarm.thr - base) * ramp * 1.15 + (rnd() - 0.5) * amp * 0.4;
    }
    pts.push(v);
  }
  return pts;
}

// ---- notifications (derived: alarms + maneuvers + welfare) ----
const M_NOTIFS = [
  { id: "N1", kind: "alarm", level: "critical", title: "pH 2 in pump sump High-high", sub: "DPT1 · Pump Sump · DPT1-SMP0-QT4", min: 2, alarmId: "AL01", unread: true },
  { id: "N2", kind: "alarm", level: "critical", title: "Pressure signal error", sub: "DPT2 · O₂ to Fish Tank 8", min: 21, alarmId: "AL02", unread: true },
  { id: "N3", kind: "welfare", level: "high", title: "Tank 2 O₂ below emergency limit", sub: "O₂ sat 80.7 % · limit 82 %", min: 24, tankN: 2, unread: true },
  { id: "N4", kind: "alarm", level: "high", title: "Lift pump 1 high temperature", sub: "DPT1 · Pump Sump · 78.4 °C", min: 36, alarmId: "AL08", unread: false },
  { id: "N5", kind: "maint", level: "low", title: "UV lamp 3 replacement due", sub: "DPT2 · UV plant · runtime 9042 h", min: 132, unread: false },
  { id: "N6", kind: "maneuver", level: "ok", title: "O₂ setpoint changed to 94.0 %", sub: "DPT1 · Fish Tank 2 · by E. Sørensen", min: 70, unread: false },
];

// ---- recent maneuvers (from start.jsx MANEUVERS) ----
// No maneuver TYPE: the platform can't classify a change as setpoint/state/override, so the
// only split we keep is the one it can derive — operator vs automatic (op === "System") —
// plus the operator's own comment, captured at edit time. Mirrors desktop maneuver.jsx.
const M_MANEUVERS = [
  { t: "13:52", area: "DPT1 · Fish Tank 2", sig: "O₂ saturation setpoint", from: "92.0 %", to: "94.0 %", op: "E. Sørensen", cm: "Raised ahead of grading, tank was tracking low all morning." },
  { t: "13:48", area: "DPT1 · Fish Tank 2", sig: "Control valve mode", from: "Auto", to: "Manual", op: "E. Sørensen", cm: "Manual while the O₂ probe is cross-checked." },
  { t: "13:42", area: "DPT2 · MBBR", sig: "Biofilter recirc pump", from: "Stopped", to: "Running", op: "System", cm: "" },
  { t: "13:30", area: "DPT1 · Drum filter", sig: "Backwash interval", from: "18 min", to: "12 min", op: "M. Haugen", cm: "Screen loading up faster since the feed increase." },
  { t: "13:23", area: "DPT2 · CO₂-stripper", sig: "Stripper fan 2 override", from: "Auto 60 %", to: "Manual 85 %", op: "M. Haugen", cm: "" },
];

// ---- welfare registrations (FISHWELL operational welfare indicators, ordinal 0–3) ----
// Mirrors desktop fish-welfare.jsx: indicators are scored per fish and reported as a
// DISTRIBUTION. There is deliberately no composite "welfare score" — averaging ordinal
// indicator scores is improper and hides the one bad finding the record exists to surface.
const M_WF_IND = ["General condition", "Emaciation", "Gill status", "Scale loss", "Fin damage", "Eye condition"];
const M_WF_REGS = [
  { id: "WR1", batch: "Batch A", dept: "DPT1", tank: "Fish Tank 2", period: "Week 10", by: "T. Lund", done: 20, of: 20, state: "complete" },
  { id: "WR2", batch: "Batch C", dept: "DPT3", tank: "Fish Tank 9", period: "Week 10", by: "T. Lund", done: 7, of: 20, state: "ongoing" },
  { id: "WR3", batch: "Batch B", dept: "DPT2", tank: "Fish Tank 6", period: "Week 09", by: "K. Berg", done: 20, of: 20, state: "complete" },
];
// deterministic 0–3 counts per indicator for the most recent completed registration
function mWfCounts(ind) {
  let h = 0; for (let i = 0; i < ind.length; i++) h = (h * 31 + ind.charCodeAt(i)) % 997;
  const c3 = h % 2, c2 = 1 + (h % 3), c1 = 3 + (h % 5);
  return [20 - c1 - c2 - c3, c1, c2, c3];
}

// ---- notes ----
const M_NOTES = [
  { id: "NT1", tank: "T-101", by: "E. Sørensen", at: "08:14", text: "Welfare sampling T-101, no abnormal behaviour, appetite good.", tag: "Welfare" },
  { id: "NT2", tank: "DPT1 Drum filter", by: "M. Haugen", at: "Yesterday", text: "Screen panel 3 showing early wear, flagged for next PM window.", tag: "Maintenance" },
  { id: "NT3", tank: "DPT1 Pump Sump", by: "K. Almeida", at: "2 days ago", text: "pH probe 2 drift observed after CIP; recalibrated against grab sample.", tag: "Process" },
];

function mAgo(min) { if (min == null) return "—"; if (min < 60) return min + "m"; if (min < 1440) return Math.round(min / 60) + "h"; return Math.round(min / 1440) + "d"; }

// ---- deactivation (ISA-18.2: blocked / out-of-service) — mirrors desktop alarm store ----
// Every alarm carries supp: "none" | "blocked" | "oos". Blocked can auto-reactivate.
M_ALARMS.forEach((a) => { if (!a.supp) a.supp = "none"; });
function mIsActive(a) { return a.state !== "returned" && a.supp === "none"; }
function mBlock(ids, reason, mins) {
  const exp = mins > 0 ? Date.now() + mins * 60000 : null;
  ids.forEach((id) => { const a = M_ALARMS.find((x) => x.id === id); if (a) { a.supp = "blocked"; a.blockReason = reason; a.blockBy = "E. Sørensen"; a.blockMins = mins || 0; a.blockExp = exp; } });
  window.navStore && window.navStore._bump();
}
function mOos(ids, reason) {
  ids.forEach((id) => { const a = M_ALARMS.find((x) => x.id === id); if (a) { a.supp = "oos"; a.oosReason = reason; a.oosBy = "E. Sørensen"; } });
  window.navStore && window.navStore._bump();
}
function mRestore(ids) {
  ids.forEach((id) => { const a = M_ALARMS.find((x) => x.id === id); if (a) { a.supp = "none"; a.blockExp = null; } });
  window.navStore && window.navStore._bump();
}
function mBlockLeft(a) {
  if (a.supp !== "blocked" || !a.blockExp) return null;
  const ms = a.blockExp - Date.now(); if (ms <= 0) return "expiring…";
  const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + "m";
}
// auto-reactivate expired timed blocks (5s sweep, matches desktop)
setInterval(() => {
  let ch = false; M_ALARMS.forEach((a) => { if (a.supp === "blocked" && a.blockExp && Date.now() >= a.blockExp) { a.supp = "none"; a.blockExp = null; ch = true; } });
  if (ch && window.navStore) window.navStore._bump();
}, 5000);

function mCounts() {
  const active = M_ALARMS.filter(mIsActive);
  const deact = M_ALARMS.filter((a) => a.supp !== "none");
  return {
    total: active.length,
    critical: active.filter((a) => a.level === "critical").length,
    high: active.filter((a) => a.level === "high").length,
    unack: active.filter((a) => a.state === "unack").length,
    stale: active.filter((a) => a.min > 1440).length,
    blocked: deact.filter((a) => a.supp === "blocked").length,
    oos: deact.filter((a) => a.supp === "oos").length,
    deactivated: deact.length,
  };
}

// ---- notes (working store, persisted; notes are untyped — optional equipment link) ----
const M_NOTES_LS = "njm_notes_v1";
const M_NOTES_SEED = [
  { id: "NT1", equip: "Fish Tank 1", tag: "DPT1-FTA1", by: "E. Sørensen", at: "08:14", text: "Welfare sampling T-101, no abnormal behaviour, appetite good.", archived: false },
  { id: "NT2", equip: "Drum filter", tag: "DPT1-FIL0", by: "M. Haugen", at: "Yesterday", text: "Screen panel 3 showing early wear, flagged for next PM window.", archived: false },
  { id: "NT3", equip: "", tag: "", by: "K. Berg", at: "Yesterday", text: "New feed pallet arriving Wednesday AM, clear space in the feed room.", archived: false },
];
function mNotesLoad() { try { const r = JSON.parse(localStorage.getItem(M_NOTES_LS)); if (Array.isArray(r)) return r; } catch (e) {} return M_NOTES_SEED.slice(); }
const mNotesStore = {
  rows: mNotesLoad(), subs: new Set(),
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
  snap() { return this.rows; },
  emit() { try { localStorage.setItem(M_NOTES_LS, JSON.stringify(this.rows)); } catch (e) {} this.subs.forEach((f) => f()); },
  add(note) { this.rows = [Object.assign({ id: "NT" + Date.now(), by: "E. Sørensen", at: "Just now", archived: false }, note)].concat(this.rows); this.emit(); },
  setArchived(id, v) { this.rows = this.rows.map((n) => (n.id === id ? Object.assign({}, n, { archived: v }) : n)); this.emit(); },
};
function useMNotes() { return React.useSyncExternalStore(mNotesStore.sub.bind(mNotesStore), mNotesStore.snap.bind(mNotesStore)); }

// ---- notification read-state (mutates M_NOTIFS + bumps nav for re-render) ----
function mNotifUnread() { return M_NOTIFS.filter((n) => n.unread).length; }
function mMarkNotifRead(id) { const n = M_NOTIFS.find((x) => x.id === id); if (n && n.unread) { n.unread = false; window.navStore && window.navStore._bump(); } }
function mMarkAllNotifsRead() { let c = 0; M_NOTIFS.forEach((n) => { if (n.unread) { n.unread = false; c++; } }); window.navStore && window.navStore._bump(); return c; }

Object.assign(window, { MSEV, M_ALARMS, M_TANKS, mO2Status, mVital, M_FACILITY, M_NAV_INDEX, mFacSev, mDeptWorst, mBldWorst,
  M_EQUIP, mSeries, M_NOTIFS, M_MANEUVERS, M_NOTES, mAgo, mCounts,
  M_WF_IND, M_WF_REGS, mWfCounts,
  mIsActive, mBlock, mOos, mRestore, mBlockLeft,
  mNotesStore, useMNotes, mNotifUnread, mMarkNotifRead, mMarkAllNotifsRead });
