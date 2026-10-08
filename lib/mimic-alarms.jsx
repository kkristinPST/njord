// mimic-alarms.jsx — EQUIPMENT ALARM STATE ON THE DRAWING.
//
// `--sc-abnormal` has been defined in the tokens since the design system was written and was
// used on exactly zero elements: the colour existed, the state never reached the symbol. So a
// screen could carry five standing alarms on equipment it draws — pH 2 in the pump sump
// critical and unacknowledged among them — and mark none of them. An operator clicking through
// from the alarm list landed on the right screen and then had to find the tag by reading
// labels, which is the "hold the tag in your head" problem the redesign exists to remove.
//
// The rule, per ISA-101: normal stays neutral, and abnormal is the ONLY saturated state on the
// diagram. That is why this is drawn as an outline plus a badge rather than by recolouring the
// symbol — a filled red pump would read as "running red" and the fill already means run/stop.

const MA_RANK = { critical: 4, high: 3, medium: 2, low: 1, diagnostic: 0 };

// The worst STANDING alarm on a tag. Deactivated alarms are deliberately excluded: a blocked
// alarm is not an abnormal condition the operator is being told about, and drawing it on the
// mimic would re-create the noise that blocking was used to remove.
function njTagAlarm(tag) {
  if (!tag || tag === "—" || !window.alarmHub) return null;
  let best = null;
  window.alarmHub.rows.forEach((a) => {
    if (a.tag !== tag || !window.isActiveAlarm(a)) return;
    if (!best) { best = a; return; }
    const r = (MA_RANK[a.level] || 0) - (MA_RANK[best.level] || 0);
    if (r > 0 || (r === 0 && a.state === "unack" && best.state !== "unack")) best = a;
  });
  return best;
}
// A tag whose alarm is BLOCKED or OUT OF SERVICE, when it has no standing alarm. The mimic must not
// draw a suppressed tag exactly like a healthy one: "nothing is wrong" and "we stopped listening"
// are different claims. It gets a quiet neutral mark (dashed outline + ban / wrench icon), never an
// alarm colour, so the noise blocking removed does not come back. Active alarm > suppression > none.
function njTagSupp(tag) {
  if (!tag || tag === "—" || !window.alarmHub || njTagAlarm(tag)) return null;
  let s = null;
  window.alarmHub.rows.forEach((a) => { if (a.tag === tag && (a.supp === "oos" || (a.supp === "blocked" && !s))) s = a.supp; });
  return s;
}
// neutral suppression mark, same anchor as the alarm badge. Icon, not letter: the register's OOS
// glyph is "M", which would sit directly under a Manual "M" mode chip in the same column.
function SuppMark({ at, supp }) {
  if (!at || !supp) return null;
  return (
    <g className={"rasm-sup " + supp} pointerEvents="none" transform={`translate(${at[0]},${at[1]})`}>
      <rect className="rasm-sup-box" x="-8" y="-8" width="16" height="16" rx="3" />
      <g className="rasm-sup-ic" transform="translate(-5.5,-5.5) scale(0.46)">
        {supp === "oos"
          ? <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          : <React.Fragment><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" /></React.Fragment>}
      </g>
    </g>
  );
}
function njSuppTitle(s) { return s === "oos" ? "Alarm out of service" : s === "blocked" ? "Alarm blocked" : ""; }
// Three tones on the mimic: crit (red triangle), high (amber circle), and "warn lo" for medium /
// low (yellow diamond). "lo" is ADDITIVE to "warn" so every existing .warn rule still applies and
// only the colour + shape are overridden. Shape repeats priority for colour-blind operators.
function njAlarmTone(a) { return !a ? "warn" : a.level === "critical" ? "crit" : a.level === "high" ? "warn" : "warn lo"; }
// ── equipment out of service (PLC) ── NOT the alarm's out-of-service: this is the MACHINE locked
// out for maintenance, reported per equipment by the PLC. Drawn as: symbol ghosted (it cannot run)
// and the mode chip replaced by a lock — Auto/Manual means nothing while the unit is locked out, so
// the chip slot is the honest place and no mimic geometry moves. Alarm badges still draw on top.
// NJ_EQ_STATE stands in for the PLC feed; keys are equipment tags.
window.NJ_EQ_STATE = window.NJ_EQ_STATE || { "DPT1-SMP0-PU2": "oos" };
function njEqOos(tag) { return !!(tag && window.NJ_EQ_STATE && window.NJ_EQ_STATE[tag] === "oos"); }

// ── site-plan roll-up ──
// The Site Plan read a hard-coded `status` on every system in FACILITY, so DPT1 RAS showed
// NOMINAL while carrying five standing alarms including an unacknowledged critical. A status
// field that does not come from the alarm store is a status field that will be wrong.
// Alarm `area` strings are "DPT1 Pump Sump", "DPT1 Lye", "DPT1 CO₂-stripper", "DPT1 Fish Tank 2"
// — a department name plus a place. This maps the place to the SYSTEM that draws it.
// THE TAG IS THE TRUTH, the area string is prose. "DPT2 Oxygen to Fish Tank 8" names the
// destination tank, but its tag DPT2-DOX2-PT1 is oxygenation equipment drawn on the RAS
// mimic — so the plan called it Fish Tank while the drawing marked it on RAS. Equipment codes
// are structured and are what the mimics already key on; resolve from them FIRST and fall
// back to the prose only when there is no tag.
const MA_EQ = {
  FTA: "Fish Tank", TB: "Feeding", DOX: "RAS", STR: "RAS", FIL: "RAS", DNA: "RAS", UVA: "RAS",
  SMP: "Pump Sump", MBR: "MBBR", FHA: "Dead Fish", OTL: "Water Treatment",
};
function njTagSystem(tag) {
  const m = /^[A-Z0-9]+-([A-Z]+)\d*-/i.exec(String(tag || ""));
  if (!m) return null;
  // FHA (fish handling) is also used by the fish-transport line (OTL1-FHA0-…), which no mimic
  // draws. Only the DFS0 plant IS the Dead Fish screen — attributing transport alarms to it lit
  // the Dead Fish node medium with nothing on the screen to show for it.
  if (m[1].toUpperCase() === "FHA" && !/^DFS/i.test(String(tag))) return null;
  return MA_EQ[m[1].toUpperCase()] || null;
}
const MA_SYS = [
  [/fish\s*tank|tank\s*\d/i, "Fish Tank"],
  [/feed|fôr/i, "Feeding"],
  [/pump\s*sump|lye|co₂|co2|strip|drum|filter|oxygen|biofilter|degas|ras/i, "RAS"],
  [/mbbr|moving\s*bed/i, "MBBR"],
  [/energy|heat|el\b/i, "Energy Plant"],
  [/water\s*treat/i, "Water Treatment"],
  [/hatch/i, "Hatchery"],
];
// Which SYSTEM NODE draws a given place, given the systems that department actually owns.
// DPT3/DPT4 draw Pump Sump as its own node; DPT1/DPT2 fold it into RAS. One function, used
// both to attribute an alarm and to disambiguate which department it belongs to.
function njPlaceSystem(place, owned, tag) {
  let sys = njTagSystem(tag);
  if (!sys) {
    const hit = MA_SYS.find(([re]) => re.test(place));
    sys = hit ? hit[1] : null;
  }
  if (sys === "Pump Sump") return owned.has("Pump Sump") ? "Pump Sump" : (owned.has("RAS") ? "RAS" : owned.has("MBBR") ? "MBBR" : null);
  if (sys && !owned.has(sys)) sys = owned.has("RAS") ? "RAS" : owned.has("MBBR") ? "MBBR" : null;
  return sys;
}
// DEPARTMENT NAMES ARE NOT UNIQUE — two are called DPT1 and two DPT2. Matching an alarm area's
// leading token against `dept.name` counted "DPT2 Oxygen to Fish Tank 8" in BOTH Building 1
// and Building 3. The fix is NOT njResolveArea: that routes a maneuver-log entry to a screen,
// matching the place keyword alone and hard-coding a building, so it never reads the DPTn
// token at all ("DPT1 Pump Sump" → b2-d3). Resolve the prefix here, then break the two-way
// collision with data already on the department: the candidate that OWNS a system able to
// draw this place. b3-d1 has only Hatchery + Energy Plant, so "DPT1 Pump Sump" can only be
// b1-d1; b3-d2 has no RAS, so "DPT1 CO₂-stripper" is Building 1. Still ambiguous → none.
function njAreaDept(area, tag) {
  const tk = /(?:fish\s*)?tank\s*(\d+)/i.exec(area || "");
  if (tk) {
    const n = +tk[1];
    const hit = Object.keys(FACILITY_TANKS).find((k) => (FACILITY_TANKS[k] || []).includes(n));
    if (hit) return hit;
  }
  const first = String(area || "").split(/\s+/)[0].toUpperCase();
  const depts = (typeof FACILITY !== "undefined" ? FACILITY : []).flatMap((b) => b.depts);
  const named = depts.filter((d) => d.name.toUpperCase() === first);
  const place = String(area || "").replace(/^\S+\s*/, "");
  // No DPTn token at all ("Building 2 Dead Fish", "Fish transport General"): the tag still
  // knows what kind of machine it is, so attribute to the one department that owns a node
  // able to draw it. Dropping these left three active alarms claimed by no node at all.
  if (!named.length) {
    const sys = njTagSystem(tag);
    if (!sys) return null;
    const able = depts.filter((d) => d.systems.some((s) => s.label === sys));
    return able.length === 1 ? able[0].id : null;
  }
  if (named.length === 1) return named[0].id;
  // pass the TAG through: disambiguating on prose alone left "DPT2 UV plant" matching neither
  // candidate, so a real low alarm was attributed to no department
  const able = named.filter((d) => njPlaceSystem(place, new Set(d.systems.map((s) => s.label)), tag));
  return able.length === 1 ? able[0].id : null;
}
function njSystemAlarms(deptId, label) {
  if (!window.alarmHub) return [];
  const dept = (typeof FACILITY !== "undefined" ? FACILITY : []).flatMap((b) => b.depts).find((d) => d.id === deptId);
  if (!dept) return [];
  const owned = new Set(dept.systems.map((s) => s.label));
  return window.alarmHub.rows.filter((a) => {
    if (!window.isActiveAlarm(a) || !a.area) return false;
    if (njAreaDept(a.area, a.tag) !== deptId) return false;
    return njPlaceSystem(a.area.replace(/^\S+\s*/, ""), owned, a.tag) === label;
  });
}
// NAME: `njLiveSystemStatus`, never `njSystemStatus` — chrome.jsx already owns that name with a
// DIFFERENT signature, (buildingId, deptId, label), reading the fixture. It loads later, so it
// won its own name back and every plan node silently resolved to "ok": the whole Site Plan went
// green while an unacknowledged critical stood in the ribbon above it.
// Worst standing level, as a LEVEL — not folded into warning/critical. Collapsing medium into
// the amber rail told the operator "high" about a medium turbidity alarm that had already
// returned to normal. --medium is blue in this system; amber means high.
function njLiveSystemStatus(deptId, label, seed) {
  const hits = njSystemAlarms(deptId, label);
  if (hits.some((a) => a.level === "critical")) return "critical";
  if (hits.some((a) => a.level === "high")) return "warning";
  if (hits.some((a) => a.level === "medium")) return "medium";
  if (hits.length) return "low";
  return seed === "critical" || seed === "warning" ? "ok" : seed || "ok";
}
function njAlarmTitle(a) {
  if (!a) return "";
  const st = a.state === "unack" ? "unacknowledged" : a.state === "returned" ? "returned to normal, not acknowledged" : "acknowledged";
  return a.alarm + " · " + a.level.toUpperCase() + " · " + st;
}
// Any mimic that wants live marking subscribes once; the alarm hub already re-renders the rest
// of the app the same way.
function useMimicAlarms() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => (window.alarmHub ? window.alarmHub.sub(f) : undefined), []); return null; }

// The mark itself: a ring around the symbol's own bounding box plus a corner badge. Measured
// from the rendered children rather than passed in, so no call site has to know the geometry
// of the glyph it wraps — a pump, a fan and a valve are all different shapes.
// SHAPE carries priority — TRIANGLE = critical, circle = high and below. The triangle is the
// universal danger shape, so it belongs to the loudest state, not the second-loudest.
// The badge sits in the MODE-CHIP COLUMN, directly under the chip, which moves up to make
// room. Every other side is authored on — RD box above, Tag2 below, trend affordance right —
// and the body is only OUTLINED now, so a badge inside the glyph would sit on its detail.
function AbnormalRing({ at, tone, unack, level }) {
  if (!at) return null;
  const crit = level === "critical", lo = level === "medium" || level === "low";
  return (
    <g className={"rasm-abn " + tone + (unack ? " unack" : "")} pointerEvents="none" transform={`translate(${at[0]},${at[1]})`}>
      {crit
        ? <path className="rasm-abn-dot" d="M0 -8.8 L9 6.6 L-9 6.6 Z" strokeLinejoin="round" />
        : lo ? <path className="rasm-abn-dot" d="M0 -9 L9 0 L0 9 L-9 0 Z" strokeLinejoin="round" />
        : <circle className="rasm-abn-dot" r="8" />}
      <text className="rasm-abn-g" y={crit ? 5.6 : 3.8} textAnchor="middle">!</text>
    </g>
  );
}

Object.assign(window, { njEqOos, njTagSupp, SuppMark, njSuppTitle, njTagAlarm, njAlarmTone, njAlarmTitle, useMimicAlarms, AbnormalRing, njSystemAlarms, njLiveSystemStatus, njAreaDept, njPlaceSystem, njTagSystem });
