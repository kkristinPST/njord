// alarm-log.jsx — the alarm & event log (activations, returns, acknowledgements), shared by the
// desktop Historical tab (screens/alarms.jsx) and the mobile alarm log. ONE log: "what happened
// overnight" must read the same in the control room and on the phone.
const HIST = [
  { t: "04/03/2026 12:59:58", area: "DPT2 Pump Sump", tag: "DPT2-SMP0-LT1", alarm: "Level in pump sump Low alarm", event: "Activated", level: "high", user: "—" },
  { t: "04/03/2026 12:55:17", area: "DPT2 CO₂-stripper", tag: "DPT2-STR1-PT1", alarm: "Vacuum in CO₂ stripping High alarm", event: "Activated", level: "high", user: "E. Sørensen" },
  { t: "04/03/2026 12:41:05", area: "DPT2 Pump Sump", tag: "DPT2-SMP0-LT1", alarm: "Level in pump sump Low alarm", event: "Acknowledged", level: "high", user: "E. Sørensen" },
  { t: "04/03/2026 12:12:33", area: "DPT2 CO₂-stripper", tag: "DPT2-STR1-PT1", alarm: "Vacuum in CO₂ stripping High alarm", event: "Acknowledged", level: "high", user: "S. King" },
  { t: "04/03/2026 11:24:02", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Acknowledged", level: "critical", user: "T. Lund" },
  { t: "04/03/2026 11:22:46", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High alarm", event: "Returned", level: "high", user: "—" },
  { t: "04/03/2026 11:22:46", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Returned", level: "critical", user: "—" },
  { t: "04/03/2026 11:22:26", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Activated", level: "critical", user: "—" },
  { t: "04/03/2026 11:22:25", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High alarm", event: "Activated", level: "high", user: "—" },
  { t: "04/03/2026 11:22:12", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Returned", level: "critical", user: "—" },
  { t: "04/03/2026 11:22:12", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High alarm", event: "Returned", level: "high", user: "—" },
  { t: "04/03/2026 11:21:30", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High alarm", event: "Activated", level: "high", user: "—" },
  { t: "04/03/2026 11:21:30", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Activated", level: "critical", user: "—" },
  { t: "04/03/2026 11:21:23", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Returned", level: "critical", user: "—" },
  { t: "04/03/2026 11:21:23", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High alarm", event: "Returned", level: "high", user: "—" },
  { t: "04/03/2026 11:20:53", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High-high", event: "Activated", level: "critical", user: "—" },
  { t: "04/03/2026 11:20:53", area: "Building 3 Hatchery Vacuum degasser", tag: "DPT1-STR2-LT1", alarm: "Level sensor vacuum degasser 2 High alarm", event: "Activated", level: "high", user: "—" },
];

// shared text matcher for alarm tables (tag / area / description / time)
function alarmMatch(r, q) {
  if (!q || !q.trim()) return true;
  const s = q.trim().toLowerCase();
  return [r.tag, r.area, r.alarm, r.t].filter(Boolean).join(" ").toLowerCase().includes(s);
}

// day key ("04/03/2026") from a log timestamp, for grouping and date filters
function njLogDay(r) { return (r.t || "").slice(0, 10); }
function njLogDays() { return [...new Set(HIST.map(njLogDay))]; }
Object.assign(window, { HIST, njLogDay, njLogDays, alarmMatch });
