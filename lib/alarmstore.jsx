
// alarmstore.jsx — single source of truth for the alarm lifecycle (ISA-18.2 / IEC 62682).
// One configured register. Each alarm carries a process+ack STATE and a DEACTIVATION mode:
//   state: "unack"    – active, operator has NOT acknowledged (needs attention)
//          "ack"      – active, acknowledged
//          "returned" – process returned to normal (RTN), still listed until cleared
//          "normal"   – not in alarm
//   supp:  "none"     – annunciated normally (alarm is ACTIVE)
//          "blocked"  – Deactivated · Blocked: the alarm has been turned off so it will not
//                       annunciate. Set by an operator (restorable, optional auto-reactivate
//                       timer) or by automation logic (auto:true → read-only, "logic-controlled").
//          "oos"      – Deactivated · Out of service: removed for maintenance under a work order
//                       (administrative control). No timeout; returned manually via MOC.
//   since: hours the alarm has been standing — alarms standing > 24h are "stale" (EEMUA 191 / ISA-18.2)
//
// "Deactivated" = blocked + oos. An alarm is ACTIVE (annunciated, counts toward operator load)
// only when supp==="none" and state!=="normal". Every count in the app derives from this one
// array via alarmCounts() so the numbers everywhere always agree.

// Each alarm carries a `meas` linkage to the process variable that triggered it (ISA-18.2 §5:
// every alarm derives from a measurement). Analog alarms carry the trend descriptor + the
// threshold that was crossed: meas = { tag, name, unit, base, amp, group, thr:{ value, kind } }
// where kind ∈ hihi|hi|lo|lolo. Discrete alarms (comm/drive faults, PLC faults, level switches,
// signal errors) have NO analog process value — meas = null; they surface as event markers only.
const ALARM_REGISTER_SEED = [
  // ---- CRITICAL (active) ----
  { id: "AL01", t: "04/03/2026 12:59:58", since: 0.05, area: "DPT1 Pump Sump",            tag: "DPT1-SMP0-QT4", alarm: "pH 2 in pump sump High-high alarm",        level: "critical",   state: "unack", supp: "none", meas: { tag: "DPT1-SMP0-QT4", name: "pH 2 in pump sump", unit: "pH", base: 7.05, amp: 0.22, group: "Pump Sump", thr: { value: 7.40, kind: "hihi" } } },
  { id: "AL02", t: "04/03/2026 12:41:09", since: 0.35, area: "DPT2 Oxygen to Fish Tank 8", tag: "DPT2-DOX2-PT1", alarm: "Pressure signal error",                   level: "critical",   state: "unack", supp: "none", meas: null },
  // ---- HIGH (active) ----
  { id: "AL03", t: "04/03/2026 12:55:17", since: 0.10, area: "DPT2 CO₂-stripper",          tag: "DPT2-STR1-PT1", alarm: "Vacuum in CO₂ stripping High alarm",      level: "high",       state: "ack",   supp: "none", meas: { tag: "DPT2-STR1-PT1", name: "Vacuum in CO₂ stripper", unit: "mbar", base: -46, amp: 3.4, group: "CO₂ Stripper", thr: { value: -34, kind: "hi" } } },
  { id: "AL04", t: "04/03/2026 12:50:42", since: 0.50, area: "DPT1 CO₂-stripper",          tag: "DPT1-STR0-AV2", alarm: "CO₂-fan 2 Communication error with drive", level: "high",       state: "unack", supp: "none", meas: null },
  { id: "AL05", t: "04/03/2026 12:48:30", since: 0.25, area: "DPT2 Pump Sump",             tag: "DPT2-SMP0-LT1", alarm: "Level in pump sump Low alarm",            level: "high",       state: "unack", supp: "none", meas: { tag: "DPT2-SMP0-LT1", name: "Level in pump sump", unit: "cm", base: 188, amp: 5.5, group: "Pump Sump", thr: { value: 168, kind: "lo" } } },
  { id: "AL06", t: "03/03/2026 09:18:11", since: 27.7, area: "DPT1 Lye",                   tag: "DPT1-DNA0-PU1", alarm: "Lye pump 1 Missing operation feedback",   level: "high",       state: "unack", supp: "none", meas: null },
  { id: "AL07", t: "04/03/2026 12:39:57", since: 0.40, area: "DPT1 Lye",                   tag: "DPT1-DNA0-PU2", alarm: "Lye pump 2 Feil fra pumpe",               level: "high",       state: "ack",   supp: "none", meas: null },
  { id: "AL08", t: "04/03/2026 12:36:22", since: 0.60, area: "DPT1 Pump Sump",            tag: "DPT1-SMP0-PU1", alarm: "Lift pump 1 High temperatur",             level: "high",       state: "unack", supp: "none", meas: { tag: "DPT1-SMP0-PU1", name: "Lift pump 1 winding temp", unit: "°C", base: 58, amp: 4.5, group: "Pump Sump", thr: { value: 75, kind: "hi" } } },
  { id: "AL09", t: "04/03/2026 12:28:05", since: 0.90, area: "DPT1 Fish Tank 2",          tag: "DPT1-FTA2-TB1", alarm: "Feed screw fault",                        level: "high",       state: "unack", supp: "none", meas: null },
  { id: "AL10", t: "04/03/2026 12:14:19", since: 1.20, area: "DPT1 Pump Sump",            tag: "—",             alarm: "High pH-difference between measures",     level: "high",       state: "returned", supp: "none", meas: { tag: "DPT1-SMP0-QD1", name: "pH difference (measure 1↔2)", unit: "pH", base: 0.16, amp: 0.05, group: "Pump Sump", thr: { value: 0.40, kind: "hi" } } },
  // ---- MEDIUM (active) ----
  { id: "AL11", t: "04/03/2026 11:58:03", since: 1.05, area: "Fish transport General",    tag: "OTL1-FHA0-LS1", alarm: "Water on floor in fish transport sump",   level: "medium",     state: "unack", supp: "none", meas: null },
  { id: "AL12", t: "04/03/2026 11:41:27", since: 1.35, area: "Building 2 Dead Fish",      tag: "DFS0-FHA0-GR1", alarm: "Grinder pump soft starter fault",         level: "medium",     state: "ack",   supp: "none", meas: null },
  { id: "AL13", t: "04/03/2026 11:33:48", since: 1.60, area: "DPT1 Fish Tank 2",          tag: "DPT1-FTA2-TB1", alarm: "Feed screw missing calibration data",     level: "medium",     state: "unack", supp: "none", meas: null },
  { id: "AL14", t: "04/03/2026 11:20:12", since: 1.90, area: "DPT2 Drum filter",          tag: "DPT2-FIL0-QT1", alarm: "Outlet turbidity High alarm",             level: "medium",     state: "returned", supp: "none", meas: { tag: "DPT2-FIL0-QT1", name: "Outlet turbidity", unit: "NTU", base: 0.45, amp: 0.12, group: "Water Treatment", thr: { value: 1.0, kind: "hi" } } },
  // ---- LOW (active) ----
  { id: "AL15", t: "03/03/2026 06:02:30", since: 30.9, area: "DPT1 Drum filter",          tag: "DPT1-FIL0-PT1", alarm: "Filter differential pressure High",       level: "low",        state: "unack", supp: "none", meas: { tag: "DPT1-FIL0-PT1", name: "Drum filter ΔP", unit: "bar", base: 0.032, amp: 0.009, group: "RAS", thr: { value: 0.060, kind: "hi" } } },
  { id: "AL16", t: "04/03/2026 10:31:02", since: 2.20, area: "DPT2 UV plant",             tag: "DPT2-UVA0-RT1", alarm: "UV lamp 3 runtime exceeded",              level: "low",        state: "ack",   supp: "none", meas: { tag: "DPT2-UVA0-RT1", name: "UV lamp 3 runtime", unit: "h", base: 8760, amp: 30, group: "Water Treatment", thr: { value: 9000, kind: "hi" } } },
  // ---- DIAGNOSTIC (active) ----
  { id: "AL17", t: "04/03/2026 09:47:55", since: 4.30, area: "DPT1 Tavlerom",             tag: "—",             alarm: "PLC fault signal from rack 0 – Slot 2: Digital inputs", level: "diagnostic", state: "unack", supp: "none", meas: null },
  { id: "AL18", t: "04/03/2026 09:12:18", since: 5.00, area: "DPT2 Tavlerom",             tag: "—",             alarm: "PLC fault signal from PLC rack 0 – Slot 0: CPU",        level: "diagnostic", state: "ack",   supp: "none", meas: null },
  // ---- NORMAL (configured, not in alarm) — show in All Alarms register ----
  { id: "AL19", t: "—",                   area: "DPT4 Returnvannskum",       tag: "OTL2-FHA2-LT1", alarm: "Level High-high alarm",                   level: "critical",   state: "normal", supp: "none", meas: { tag: "OTL2-FHA2-LT1", name: "Return sump level", unit: "cm", base: 122, amp: 9, group: "Other", thr: { value: 180, kind: "hihi" } } },
  { id: "AL20", t: "—",                   area: "DPT1 Pump Sump",            tag: "DPT1-SMP0-QT4", alarm: "pH 2 in pump sump Low-low alarm",         level: "critical",   state: "normal", supp: "none", meas: { tag: "DPT1-SMP0-QT4", name: "pH 2 in pump sump", unit: "pH", base: 6.95, amp: 0.22, group: "Pump Sump", thr: { value: 6.20, kind: "lolo" } } },
  { id: "AL21", t: "—",                   area: "DPT2 Biofilter A",          tag: "DPT2-MBR0-QT2", alarm: "TAN High alarm",                          level: "high",       state: "normal", supp: "none", meas: { tag: "DPT2-MBR0-QT2", name: "TAN (biofilter A)", unit: "mg/L", base: 0.62, amp: 0.14, group: "RAS", thr: { value: 1.50, kind: "hi" } } },
  // ---- DEACTIVATED · BLOCKED (operator turned the alarm off; optional auto-reactivate timer) ----
  { id: "AL22", t: "04/03/2026 08:05:40", since: 5.0, area: "DPT1 Fish Tank 5",   tag: "DPT1-FTA5-TB1", alarm: "Feed screw fault",            level: "high",   state: "unack", supp: "blocked", auto: false, blockedBy: "E. Sørensen", blockReason: "Nuisance, drive under investigation", blockMins: 60, blockedAt: "04/03/2026 12:48", meas: null },
  { id: "AL24", t: "04/03/2026 07:40:11", since: 6.1, area: "DPT2 UV plant",      tag: "DPT2-UVA0-FT1", alarm: "Flow through UV Low alarm",   level: "medium", state: "unack", supp: "blocked", auto: false, blockedBy: "K. Almeida",  blockReason: "Known transient during backwash",       blockMins: 0,  blockedAt: "04/03/2026 12:55", meas: { tag: "DPT2-UVA0-FT1", name: "Flow through UV", unit: "L/s", base: 82, amp: 5, group: "Water Treatment", thr: { value: 60, kind: "lo" } } },
  // ---- DEACTIVATED · BLOCKED by automation logic (read-only, no operator timer) ----
  { id: "AL25", t: "—",                   area: "DPT1 Drum filter",     tag: "DPT1-FIL0-LS2", alarm: "Backwash tank Low level",     level: "low",    state: "normal", supp: "blocked", auto: true,  blockedBy: "System", blockReason: "Blocked while drum filter in BACKWASH state", blockMins: 0, blockedAt: "—", meas: { tag: "DPT1-FIL0-LS2", name: "Backwash tank level", unit: "cm", base: 42, amp: 5, group: "RAS", thr: { value: 20, kind: "lo" } } },
  // ---- DEACTIVATED · OUT OF SERVICE (maintenance, administrative — work order) ----
  { id: "AL23", t: "—",                   area: "DPT2 Pump Sump",       tag: "DPT2-SMP0-FT1", alarm: "Flow sensor signal error",    level: "low",    state: "unack", supp: "oos",     oosBy: "M. Haugen",      oosReason: "Sensor swap, work order WO-4471",        oosAt: "03/03/2026 22:40", meas: null },
];

// Fixed "now" reference for the seeded register (latest event + a couple of minutes).
const NJ_NOW = (function () { const d = new Date(2026, 2, 4, 13, 2, 0); return d.getTime(); })();
// Parse a register timestamp "DD/MM/YYYY HH:MM:SS" (or "—") into epoch ms, else null.
function alarmTs(a) {
  const s = typeof a === "string" ? a : (a && a.t);
  if (!s || s === "—") return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)).getTime();
}
function alarmIsAnalog(a) { return !!(a && a.meas && a.meas.tag); }
function alarmMeasTag(a) { return alarmIsAnalog(a) ? a.meas.tag : null; }
// equipment key = first two tag segments (e.g. DPT1-SMP0) — groups sibling signals
function alarmEquip(tag) { if (!tag || tag === "—") return null; const p = tag.split("-"); return p.length >= 2 ? p[0] + "-" + p[1] : p[0]; }
// short threshold-band label for a crossed limit
const THR_LABEL = { hihi: "HH", hi: "H", lo: "L", lolo: "LL" };

// optional auto-reactivate presets for a Blocked alarm (minutes; 0 = until reactivated)
const BLOCK_DURATIONS = [
  { label: "Until reactivated", mins: 0 },
  { label: "1 hour", mins: 60 },
  { label: "4 hours", mins: 240 },
  { label: "8 hours", mins: 480 },
  { label: "Shift (12 h)", mins: 720 },
];
const BLOCK_REASONS = [
  "Nuisance: under investigation",
  "Instrument fault: work order raised",
  "Planned maintenance / CIP",
  "Commissioning / testing",
];
// backward-compat aliases
const SHELF_DURATIONS = BLOCK_DURATIONS;
const SHELF_REASONS = BLOCK_REASONS;

// operator comment (rationalization note) surfaced on the alarm when it activates — keyed by alarm id
const ALARM_COMMENTS = {
  AL01: "Blocks water intake until cleared. Verify pH probe 2 against a grab sample; check lye dosing hasn't overshot.",
  AL02: "Sensor fault, reading not trustworthy. Cross-check the redundant O₂ line transmitter and inspect wiring at DPT2-DOX2.",
  AL04: "CO₂-fan 2 lost drive comms. Read the VSD fault code and confirm the network link; fan 1 carries the load meanwhile.",
  AL05: "Low sump level risks pump cavitation. Confirm the make-up water valve is open before restarting the lift pumps.",
  AL06: "No run feedback from lye pump 1. Check the motor breaker and feedback contact; dose from pump 2 if needed.",
  AL08: "Lift pump 1 running hot. Inspect the strainer for blockage and confirm cooling flow before continued running.",
  AL09: "Feed screw tripped, feeding paused for this tank. Clear any pellet jam and reset the drive.",
  AL13: "Feed screw needs recalibration before automatic feeding can resume.",
  AL15: "Drum-filter ΔP is rising, schedule a backwash cycle. Not urgent.",
};

// Rationalized master record surfaced at alarm time (ISA-18.2 §7): the CONSEQUENCE of the
// condition and the required operator RESPONSE-TIME target. Corrective action reuses the
// operator comment above. Per-alarm consequence where known; generic fallback by priority.
const ALARM_CONSEQUENCE = {
  AL01: "Low pH entering the RAS loop stresses fish and can mobilise metals from pipework. Water intake is blocked until pH is restored.",
  AL02: "O₂ pressure to Fish Tank 8 is measured blind, dosing control may over- or under-supply oxygen.",
  AL03: "Reduced CO₂ stripping lets dissolved CO₂ rise and pH fall across the department.",
  AL04: "One CO₂ fan is lost; stripping capacity is halved. If fan 1 also fails, CO₂ climbs quickly toward the fish-welfare limit.",
  AL05: "Low sump level risks lift-pump cavitation and loss of circulation to the tanks.",
  AL06: "No pH correction from lye pump 1; department pH may drift low if pump 2 cannot keep up.",
  AL08: "Lift pump 1 is overheating and may trip, interrupting water circulation to the tanks.",
  AL09: "Feeding to Fish Tank 2 is interrupted; prolonged stoppage affects growth and welfare.",
  AL13: "The feed screw cannot dose automatically until it is recalibrated.",
  AL15: "Rising drum-filter differential pressure reduces filtration; a backwash is due but not urgent.",
};
const ALARM_RESPONSE_TIME = { critical: "Immediate", high: "< 5 min", medium: "< 30 min", low: "< 4 hours", diagnostic: "< 4 hours" };
const ALARM_CONSEQ_GENERIC = {
  critical: "Immediate risk to fish welfare or the process if not addressed.",
  high: "Process upset likely within the shift if left uncorrected.",
  medium: "Degraded performance, correct when able.",
  low: "Minor or maintenance-level condition.",
  diagnostic: "Instrument / system diagnostic, no direct process impact.",
};
function alarmRationale(row) {
  if (!row) return null;
  return {
    consequence: ALARM_CONSEQUENCE[row.id] || ALARM_CONSEQ_GENERIC[row.level] || "",
    action: row.comment || "Investigate the condition and confirm the affected equipment before acknowledging.",
    responseTime: ALARM_RESPONSE_TIME[row.level] || "—",
  };
}

const alarmHub = {
  rows: ALARM_REGISTER_SEED.map((a) => ({ ...a, comment: a.comment || ALARM_COMMENTS[a.id] || "", blockExp: a.supp === "blocked" && a.blockMins ? Date.now() + a.blockMins * 60000 : null })),
  _subs: new Set(),
  sub(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
  emit() { this._subs.forEach((f) => f()); },
};

// auto-reactivate: when a Blocked alarm's optional timer expires, it returns to the active list.
setInterval(() => {
  const now = Date.now();
  let changed = false;
  alarmHub.rows.forEach((a) => {
    if (a.supp === "blocked" && a.blockExp && now >= a.blockExp) {
      a.supp = "none"; a.blockExp = null; changed = true;
    }
  });
  if (changed) alarmHub.emit();
}, 5000);

function useAlarmHub() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => alarmHub.sub(force), []);
  return alarmHub;
}

function isActiveAlarm(a) { return a.supp === "none" && a.state !== "normal"; }
function isStale(a) { return isActiveAlarm(a) && a.since >= 24; }
function isDeactivated(a) { return a.supp === "blocked" || a.supp === "oos"; }

function alarmCounts() {
  const c = { critical: 0, high: 0, medium: 0, low: 0, diagnostic: 0, total: 0, unack: 0, ack: 0, returned: 0,
    blocked: 0, oos: 0, deactivated: 0, suppressed: 0, stale: 0 };
  alarmHub.rows.forEach((a) => {
    if (a.supp === "blocked") { c.blocked++; c.deactivated++; return; }
    if (a.supp === "oos") { c.oos++; c.deactivated++; return; }
    if (a.state === "normal") return;
    c[a.level]++; c.total++; c[a.state]++;
    if (a.since >= 24) c.stale++;
  });
  c.suppressed = c.deactivated; // legacy alias
  return c;
}

function _apply(ids, fn) {
  const set = new Set([].concat(ids));
  alarmHub.rows.forEach((a) => { if (set.has(a.id)) fn(a); });
  alarmHub.emit();
}

// Acknowledge. Returns the ids that ACTUALLY changed, so the caller can offer Undo — a bulk
// acknowledge is a mass-silence, and the one action in this register that must be reversible.
function ackAlarms(ids) {
  const done = [];
  _apply(ids, (a) => { if (a.supp === "none" && a.state === "unack") { a.state = "ack"; done.push(a.id); } });
  return done;
}
// Undo an acknowledge. Only touches rows still in `ack`, so a condition that has since returned
// to normal or been blocked is never dragged back to unacknowledged.
function unackAlarms(ids) { _apply(ids, (a) => { if (a.supp === "none" && a.state === "ack") a.state = "unack"; }); }

// Block an alarm (Deactivated · Blocked). Optional mins>0 sets an auto-reactivate timer.
function blockAlarms(ids, reason, mins) {
  const m = mins || 0;
  _apply(ids, (a) => {
    a.supp = "blocked"; a.auto = false; a.blockedBy = "E. Sørensen";
    a.blockReason = reason || BLOCK_REASONS[0]; a.blockMins = m;
    a.blockedAt = "04/03/2026 13:02"; a.blockExp = m > 0 ? Date.now() + m * 60000 : null;
  });
}
// Reactivate a Blocked alarm (operator-blocked only; logic-controlled blocks are read-only).
function reactivateAlarms(ids) { _apply(ids, (a) => { if (a.supp === "blocked" && !a.auto) { a.supp = "none"; a.blockExp = null; } }); }
// Take out of service for maintenance (Deactivated · Out of service).
function outOfServiceAlarms(ids, reason) { _apply(ids, (a) => { a.supp = "oos"; a.oosBy = "E. Sørensen"; a.oosReason = reason || "Maintenance"; a.oosAt = "04/03/2026 13:02"; }); }
// Return any operator-deactivated alarm (blocked or oos) back to service.
function restoreAlarms(ids) { _apply(ids, (a) => { if ((a.supp === "blocked" && !a.auto) || a.supp === "oos") { a.supp = "none"; a.blockExp = null; } }); }
// backward-compat aliases (old shelving API → blocking)
function shelveAlarms(ids, reason, mins) { blockAlarms(ids, reason, mins); }
function unshelveAlarms(ids) { reactivateAlarms(ids); }
function disableAlarms(ids) { outOfServiceAlarms(ids); }
function enableAlarms(ids) { restoreAlarms(ids); }

// ms left on a Blocked alarm's optional auto-reactivate timer (0 if none/indefinite)
function blockRemaining(a) {
  if (a.supp !== "blocked" || !a.blockExp) return 0;
  return Math.max(0, a.blockExp - Date.now());
}
const shelfRemaining = blockRemaining; // alias
function fmtRemaining(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const ALARM_STATE_META = {
  unack:    { label: "Unacknowledged", short: "UNACK",    cls: "st-unack" },
  ack:      { label: "Acknowledged",   short: "ACK",      cls: "st-ack" },
  returned: { label: "Returned",       short: "RTN",      cls: "st-rtn" },
  normal:   { label: "Normal",         short: "NORMAL",   cls: "st-normal" },
};
// deactivation badge meta — each carries a distinct LETTER glyph so state is never color-only (ISA-18.2 / ISA-101)
const ALARM_SUPP_META = {
  blocked: { label: "Blocked",        short: "BLOCKED", glyph: "B", cls: "sup-blocked", icon: "ban" },
  oos:     { label: "Out of service", short: "OOS",     glyph: "M", cls: "sup-oos",     icon: "wrench" },
};

function StateTag({ state }) {
  const m = ALARM_STATE_META[state] || ALARM_STATE_META.normal;
  return <span className={"statetag " + m.cls}><span className="st-glyph" aria-hidden="true">{m.short.charAt(0)}</span>{m.short}</span>;
}
function SuppTag({ supp }) {
  const m = ALARM_SUPP_META[supp];
  if (!m) return null;
  return <span className={"statetag " + m.cls}><span className="st-glyph" aria-hidden="true">{m.glyph}</span>{m.short}</span>;
}

Object.assign(window, {
  NJ_NOW, alarmTs, alarmIsAnalog, alarmMeasTag, alarmEquip, THR_LABEL,
  alarmHub, useAlarmHub, isActiveAlarm, isStale, isDeactivated, alarmCounts,
  ackAlarms, unackAlarms, blockAlarms, reactivateAlarms, outOfServiceAlarms, restoreAlarms,
  shelveAlarms, unshelveAlarms, disableAlarms, enableAlarms,
  blockRemaining, shelfRemaining, fmtRemaining, BLOCK_DURATIONS, BLOCK_REASONS, SHELF_DURATIONS, SHELF_REASONS,
  ALARM_STATE_META, ALARM_SUPP_META, StateTag, SuppTag, alarmRationale,
});
