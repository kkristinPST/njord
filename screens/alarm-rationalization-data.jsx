// alarm-rationalization-data.jsx — deterministic synthetic alarm master record (~2600 rows).
// Generated once at load; the rationalization screen renders only the current page, so a
// large register stays responsive. Everything is seeded so the data is stable across reloads.

// ---- seeded PRNG (mulberry32) ----
function ratnRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ratnPick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---- enums (shared with the UI) ----
const RATN_PRIOS = [
  ["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low"], ["diagnostic", "Diagnostic"],
];
const RATN_CLASSES = ["Process", "Fish welfare", "Equipment protection", "Environmental", "Safety", "Quality"];
const RATN_RESP = ["Immediate", "< 5 min", "< 15 min", "< 30 min", "< 1 hour", "< 4 hours"];
// Alarm Groups (parity with old Rationalize dialog "Alarm Groups" selector)
const RATN_GROUPS = ["Ungrouped", "Water intake", "Oxygen system", "Biofilter / MBBR", "Feeding", "Pump station", "CO₂ / degassing", "Sludge", "Safety"];
// Justification prompts (parity with old dialog "Justification" field, required to rationalize)
const RATN_JUSTIFY = [
  "Priority set from consequence severity and available response time per ISA-18.2 §7.",
  "Consequence affects fish welfare within one shift: escalated accordingly.",
  "Equipment-protection alarm with redundant standby; medium priority sufficient.",
  "Diagnostic only; no direct operator action, kept out of primary annunciation.",
  "Reviewed against master alarm philosophy; limits and delays confirmed with process owner.",
];
const RATN_STATUS = {
  "not-configured": { label: "Not configured", glyph: "N", dot: "var(--slate-400)", bg: "var(--slate-100)", text: "var(--slate-600)" },
  "rationalized":   { label: "Rationalized",   glyph: "R", dot: "var(--success)",  bg: "var(--success-bg)",  text: "var(--success-text)" },
  "re-evaluate":    { label: "Re-evaluate",    glyph: "E", dot: "var(--warning)",  bg: "var(--warning-bg)",  text: "var(--warning-text)" },
};
const RATN_STATUS_ORDER = ["not-configured", "rationalized", "re-evaluate"];

// ---- system / sensor templates ----
const RATN_DEPTS = ["DPT1", "DPT2", "DPT3", "DPT4"];
const RATN_SYS = [
  { area: "Pump Sump", code: "SMP", arch: [
    { t: "LT", root: "Level in pump sump", unit: "cm", lo: 20, hi: 320 },
    { t: "QT", root: "pH in pump sump", unit: "pH", lo: 6.2, hi: 7.8 },
    { t: "TT", root: "Temperature pump sump", unit: "°C", lo: 8, hi: 16 },
    { t: "PU", root: "Lift pump", equip: true },
  ]},
  { area: "CO₂-stripper", code: "STR", arch: [
    { t: "PT", root: "Vacuum in CO₂ stripping", unit: "mbar", lo: -60, hi: -10 },
    { t: "LT", root: "Level CO₂ stripper", unit: "cm", lo: 30, hi: 160 },
    { t: "AV", root: "CO₂-fan drive", equip: true },
  ]},
  { area: "Fish Tank", code: "FT0", arch: [
    { t: "QT", root: "Oxygen saturation fish tank", unit: "%", lo: 80, hi: 120 },
    { t: "LT", root: "Water level fish tank", unit: "cm", lo: 120, hi: 260 },
    { t: "TT", root: "Temperature fish tank", unit: "°C", lo: 10, hi: 15 },
  ]},
  { area: "MBBR Biofilter", code: "AEB", arch: [
    { t: "QT", root: "pH biofilter", unit: "pH", lo: 6.5, hi: 7.5 },
    { t: "LT", root: "Level MBBR", unit: "cm", lo: 200, hi: 380 },
    { t: "BL", root: "Aeration blower", equip: true },
  ]},
  { area: "Drum Filter", code: "FIL", arch: [
    { t: "LT", root: "Differential level drum filter", unit: "cm", lo: 5, hi: 40 },
    { t: "AV", root: "Drum filter motor", equip: true },
  ]},
  { area: "Oxygenation", code: "DOX", arch: [
    { t: "PT", root: "Pressure oxygen cone", unit: "bar", lo: 0.4, hi: 1.6 },
    { t: "FT", root: "Oxygen flow", unit: "m³/h", lo: 2, hi: 24 },
    { t: "QT", root: "Oxygen saturation outlet", unit: "%", lo: 90, hi: 140 },
  ]},
  { area: "Lye Dosing", code: "DNA", arch: [
    { t: "LT", root: "Level lye tank", unit: "%", lo: 10, hi: 95 },
    { t: "FT", root: "Lye dosing flow", unit: "l/h", lo: 0, hi: 60 },
    { t: "PU", root: "Lye pump", equip: true },
  ]},
  { area: "Feeding", code: "FTA", arch: [
    { t: "TB", root: "Feed screw", equip: true },
    { t: "WT", root: "Feed silo weight", unit: "kg", lo: 50, hi: 1800 },
  ]},
  { area: "Vacuum Degasser", code: "STR2", arch: [
    { t: "LT", root: "Level vacuum degasser", unit: "cm", lo: 20, hi: 140 },
    { t: "PT", root: "Vacuum degasser pressure", unit: "mbar", lo: -80, hi: -20 },
  ]},
  { area: "Sludge Treatment", code: "SLU", arch: [
    { t: "LT", root: "Level sludge tank", unit: "%", lo: 5, hi: 95 },
    { t: "FT", root: "Sludge flow", unit: "m³/h", lo: 0, hi: 12 },
    { t: "GR", root: "Grinder pump", equip: true },
  ]},
];

const ANALOG_COND = [
  { sfx: "High alarm", dir: "hi", base: "medium" },
  { sfx: "High-high alarm", dir: "hi", base: "critical" },
  { sfx: "Low alarm", dir: "lo", base: "medium" },
  { sfx: "Low-low alarm", dir: "lo", base: "critical" },
  { sfx: "Sensor signal error", dir: "err", base: "low" },
];
const EQUIP_COND = [
  { sfx: "Motor fault", dir: "eq", base: "high" },
  { sfx: "High temperature", dir: "eq", base: "high" },
  { sfx: "Missing operation feedback", dir: "eq", base: "medium" },
  { sfx: "Communication error with drive", dir: "eq", base: "high" },
  { sfx: "Soft starter fault", dir: "eq", base: "high" },
];

const CONSEQ = {
  hi: ["Risk of overflow / spill to floor drain", "Process value exceeds safe operating window", "Water quality drifts out of spec for fish", "Downstream tanks over-pressurised"],
  lo: ["Loss of level, pump cavitation / dry-run risk", "Insufficient buffering, water-quality excursion", "Reduced flow starves downstream process", "Oxygen falls below welfare threshold"],
  err: ["Loss of monitoring, condition runs unmonitored", "Control loop reverts to manual / fail-safe", "Reading unreliable; risk of bad control action"],
  eq: ["Loss of redundancy, duty/standby unavailable", "Process flow interrupted", "Equipment damage if not addressed", "Treatment stage offline"],
};
const CAUSE = {
  hi: ["Upstream disturbance / inflow surge", "Outlet valve restricted", "Setpoint too tight", "Sensor drift / fouling"],
  lo: ["Blocked strainer or suction line", "Pump worn / blocked impeller", "Leak downstream", "Sensor drift / fouling"],
  err: ["Sensor fouling or cable fault", "Loose wiring / signal noise", "Transmitter failure", "Calibration overdue"],
  eq: ["Drive comms dropout", "Bearing wear / overload", "Power dip", "Local isolation left open", "Soft-starter thermal trip"],
};
const RESPONSE = {
  hi: ["Verify locally, throttle inflow, dispatch operator", "Acknowledge and monitor trend; adjust setpoint", "Open standby drain path; log work order"],
  lo: ["Start standby pump; check strainer", "Clean strainer if blocked; verify level", "Increase make-up flow; verify reading"],
  err: ["Verify reading against local gauge; flag for calibration", "Switch loop to manual; raise maintenance ticket", "Inspect transmitter and wiring"],
  eq: ["Start standby unit; raise work order", "Inspect drive and reset comms", "Lock out and inspect; switch to standby", "Reset soft starter after cool-down"],
};
const RATN_OPERATORS = ["E. Sørensen", "M. Haugen", "A. Lind", "T. Berg", "K. Iversen", "System"];

function ratnSetpoint(a, dir, rng) {
  if (a.equip) return { val: null, unit: "" };
  const span = a.hi - a.lo;
  let v;
  if (dir === "hi") v = a.lo + span * (0.72 + rng() * 0.22);
  else if (dir === "lo") v = a.lo + span * (0.06 + rng() * 0.22);
  else v = a.lo + span * (0.4 + rng() * 0.2);
  const dec = (Math.abs(a.hi) < 10 || a.unit === "pH" || a.unit === "bar") ? 1 : 0;
  return { val: Number(v.toFixed(dec)), unit: a.unit, dec, span };
}

function buildRatnRow(idx, dept, sys, a, cond, inst) {
  const rng = ratnRng(idx * 2654435761 + 17);
  const unitN = inst;                                   // system instance number (SMP0, SMP1…)
  const sensorN = 1 + (idx % 3);                        // sensor index
  const tag = `${dept}-${sys.code}${unitN}-${a.t}${sensorN}`;
  const areaFull = `${dept} ${sys.area}`;
  const alarm = [a.root, a.equip ? "" : (unitN ? String(unitN) : ""), cond.sfx].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  // priority: base ± occasional jitter
  let prio = cond.base;
  const j = rng();
  if (cond.base === "medium" && j > 0.78) prio = "high";
  if (cond.base === "medium" && j < 0.12) prio = "low";
  if (cond.base === "low" && j < 0.25) prio = "diagnostic";
  if (cond.base === "high" && j > 0.9) prio = "critical";

  const sp = ratnSetpoint(a, cond.dir, rng);
  const deadband = a.equip ? null : Number((sp.span * (0.02 + rng() * 0.03)).toFixed(sp.dec));
  const onDelay = ratnPick(rng, [0, 0, 1, 2, 3, 5, 10]);
  const offDelay = ratnPick(rng, [0, 0, 2, 3, 5, 5, 10, 15]);
  // equipment (physical device the alarm sits on) — parity with old dialog "Equipment"
  const equipment = a.equip ? `${a.root} ${unitN + 1}` : `${sys.area} ${a.t}${sensorN}`;
  // shelving allowed by default for lower-priority nuisance alarms; off for critical/safety
  const allowShelving = (prio === "critical") ? false : (prio === "low" || prio === "diagnostic") ? rng() > 0.1 : rng() > 0.5;
  // reset acknowledge after N minutes (0 = never) — parity with old dialog "Reset Ack After"
  const resetAck = ratnPick(rng, [0, 0, 0, 0, 15, 30, 60]);

  const respByPrio = { critical: "Immediate", high: rng() > 0.5 ? "< 5 min" : "< 15 min", medium: rng() > 0.5 ? "< 30 min" : "< 1 hour", low: "< 4 hours", diagnostic: "< 4 hours" };

  // workflow status — weighted so there is visible work remaining
  const sroll = rng();
  const status = sroll < 0.46 ? "not-configured" : sroll < 0.86 ? "rationalized" : "re-evaluate";
  const configured = status !== "not-configured";

  const modBy = configured ? ratnPick(rng, RATN_OPERATORS) : null;
  const mm = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][Math.floor(rng() * 6)];
  const dd = String(1 + Math.floor(rng() * 27)).padStart(2, "0");
  const modAt = configured ? `${dd} ${mm} 2026` : null;
  // ch. 13: Critical and High are reviewed yearly. reviewedAt is the date the rationalization was
  // last REASONED about, which is not the date a field was last touched — a third of the
  // high-consequence register is deliberately seeded overdue, because that is the real picture.
  const rr = rng();
  const revYear = rr < 0.34 ? 2025 : 2026;
  const revMonth = revYear === 2025 ? ["Jan", "Feb", "Mar", "Apr", "May"][Math.floor(rng() * 5)] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][Math.floor(rng() * 6)];
  const reviewedAt = configured ? `${dd} ${revMonth} ${revYear}` : null;

  return {
    id: tag + "·" + idx,
    tag, alarm, area: areaFull, dept, system: sys.area, sensorType: a.t,
    priority: prio,
    cls: configured ? ratnPick(rng, RATN_CLASSES) : "",
    equipment,
    setpoint: sp.val, unit: sp.unit,
    deadband, onDelay, offDelay,
    groups: configured ? ratnPick(rng, RATN_GROUPS) : "",
    allowShelving,
    resetAck,
    consequence: configured ? ratnPick(rng, CONSEQ[cond.dir]) : "",
    cause: configured ? ratnPick(rng, CAUSE[cond.dir]) : "",
    response: configured ? ratnPick(rng, RESPONSE[cond.dir]) : "",
    comment: configured ? ratnPick(rng, RESPONSE[cond.dir]) : "",
    responseTime: configured ? respByPrio[prio] : "",
    justification: status === "rationalized" ? ratnPick(rng, RATN_JUSTIFY) : "",
    status,
    modifiedBy: modBy, modifiedAt: modAt,
    reviewedAt,
  };
}

const RATN_TARGET = 2600;
const RATN_DATA = (function () {
  const rows = [];
  let i = 0;
  for (let inst = 0; inst < 8 && rows.length < RATN_TARGET; inst++) {
    for (const dept of RATN_DEPTS) {
      for (const sys of RATN_SYS) {
        for (const a of sys.arch) {
          const conds = a.equip ? EQUIP_COND : ANALOG_COND;
          for (const cond of conds) {
            rows.push(buildRatnRow(i++, dept, sys, a, cond, inst));
            if (rows.length >= RATN_TARGET) break;
          }
          if (rows.length >= RATN_TARGET) break;
        }
        if (rows.length >= RATN_TARGET) break;
      }
      if (rows.length >= RATN_TARGET) break;
    }
  }
  return rows;
})();

Object.assign(window, { RATN_DATA, RATN_PRIOS, RATN_CLASSES, RATN_RESP, RATN_GROUPS, RATN_JUSTIFY, RATN_STATUS, RATN_STATUS_ORDER });
