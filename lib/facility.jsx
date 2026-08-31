// facility.jsx — the facility model, shared by the desktop app and the mobile app.
// Building → Department → System, single source of truth. Mobile derives M_FACILITY from this;
// never fork a second copy — the two surfaces drifted (23 vs 34 systems) when it lived in chrome.jsx.

// ---- Facility model: Building → Department → System (single source of truth) ----
const FACILITY = [
  { id: "b1", name: "Building 1", depts: [
    { id: "b1-d1", name: "DPT1", sub: "Post-Smolt", systems: [
      { label: "Fish Tank", icon: "waves", status: "ok" },
      { label: "RAS", icon: "git-merge", status: "ok" },
      { label: "Feeding", icon: "utensils", status: "warning" },
    ]},
    { id: "b1-d2", name: "DPT2", sub: "Post-Smolt", systems: [
      { label: "Fish Tank", icon: "waves", status: "ok" },
      { label: "RAS", icon: "git-merge", status: "ok" },
      { label: "Feeding", icon: "utensils", status: "ok" },
    ]},
    { id: "b1-sup", name: "Support systems", sub: "Shared", systems: [
      { label: "Hatchery", icon: "egg", status: "ok" },
      { label: "HMI", icon: "monitor", status: "ok" },
      { label: "Sorting", icon: "filter", status: "ok" },
      { label: "Water Treatment", icon: "droplets", status: "ok" },
      { label: "Sludge Treatment", icon: "recycle", status: "ok" },
    ]},
  ]},
  { id: "b2", name: "Building 2", depts: [
    { id: "b2-d3", name: "DPT3", sub: "Grow-out", systems: [
      { label: "Fish Tank", icon: "waves", status: "ok" },
      { label: "MBBR", icon: "layers", status: "ok" },
      { label: "Pump Sump", icon: "arrow-down-to-line", status: "critical" },
      { label: "Energy Plant", icon: "zap", status: "ok" },
      { label: "Feeding", icon: "utensils", status: "ok" },
    ]},
    { id: "b2-d4", name: "DPT4", sub: "Grow-out", systems: [
      { label: "Fish Tank", icon: "waves", status: "ok" },
      { label: "MBBR", icon: "layers", status: "ok" },
      { label: "Pump Sump", icon: "arrow-down-to-line", status: "ok" },
      { label: "Energy Plant", icon: "zap", status: "ok" },
      { label: "Feeding", icon: "utensils", status: "ok" },
    ]},
    { id: "b2-sup", name: "Support systems", sub: "Shared", systems: [
      { label: "Water Treatment", icon: "droplets", status: "ok" },
      { label: "Fish Barrier", icon: "shield", status: "ok" },
      { label: "Lye Dosing", icon: "flask-conical", status: "warning" },
      { label: "Dead Fish", icon: "skull", status: "ok" },
      { label: "Seawater Exchange", icon: "waves", status: "ok" },
      { label: "HyFlow Feeding", icon: "utensils", status: "ok" },
    ]},
  ]},
  { id: "b3", name: "Building 3", depts: [
    { id: "b3-d1", name: "DPT1", sub: "Hatchery", systems: [
      { label: "Hatchery", icon: "egg", status: "ok" },
      { label: "Energy Plant", icon: "zap", status: "ok" },
    ]},
    { id: "b3-d2", name: "DPT2", sub: "Start-Feeding", systems: [
      { label: "Fish Tank", icon: "waves", status: "ok" },
      { label: "Overview", icon: "workflow", status: "ok" },
      { label: "Energy Plant", icon: "zap", status: "ok" },
      { label: "Feeding", icon: "utensils", status: "ok" },
    ]},
    { id: "b3-com", name: "Common", sub: "Shared", systems: [
      { label: "Technical", icon: "wrench", status: "ok" },
    ]},
  ]},
];

// ---- Facility utilities ("Other"): cross-facility, not scoped to a building/department ----
// Reached from the Site Plan "Other" group; each opens a top-level route (not a dept sub-route).
const FACILITY_OTHER = [
  { label: "Consumption Overview", icon: "package", route: "consumption", status: "ok" },
  { label: "Energy Consumption", icon: "bar-chart-3", route: "energy", status: "ok" },
  { label: "Heat Pumps", icon: "thermometer-snowflake", route: "heatpumps", status: "ok" },
];

// ---- Active batches: the stock currently in the facility ----
// ONE list. Desktop WF_BATCHES (screens/fish-welfare.jsx) and both mobile registration sheets
// read it, so a batch the phone can register against is a batch the register knows about.
const FACILITY_BATCHES = [
  { id: "21-2-11-0-26-26", deptId: "b1-d1", dept: "DPT1", stage: "Post-Smolt", pop: "448k", status: "ok" },
  { id: "21-2-21-0-26-26", deptId: "b1-d2", dept: "DPT2", stage: "Post-Smolt", pop: "302k", status: "ok" },
  { id: "21-2-31-0-26-25", deptId: "b2-d3", dept: "DPT3", stage: "Grow-out", pop: "188k", status: "warning" },
  { id: "21-2-41-0-26-25", deptId: "b2-d4", dept: "DPT4", stage: "Grow-out", pop: "210k", status: "ok" },
];
// Departments that own fish tanks, and how many tanks each has — the ONE derivation both
// surfaces use to scope a registration (screens/reports.jsx reuses it as repDepts/repTankCount).
function njTankDepts() {
  const out = [];
  FACILITY.forEach((b) => b.depts.forEach((d) => { if (d.systems.some((s) => s.label === "Fish Tank")) out.push({ b, d }); }));
  return out;
}
// ---- Tank register ----
// Tank NUMBERS are facility-wide and non-contiguous: a department owns the tanks it owns, and
// a tank keeps its number for life. Deriving them from a count (Array.from({length:n})) made
// every tank above the count unpickable — DPT2's Tank 6, DPT3's Tank 9, DPT4's Tank 15 all
// exist in the register and in the welfare fixtures. **Never infer a tank list from a count.**
const FACILITY_TANKS = {
  "b1-d1": [1, 2, 3, 4],
  "b1-d2": [5, 6, 7, 8],
  "b2-d3": [9, 10, 11, 12, 13, 14],
  "b2-d4": [15, 16, 17, 18, 19, 20],
  "b3-d2": [21, 22, 23, 24, 25, 26],
};
function njTankCount(dept) { const t = FACILITY_TANKS[dept && dept.id]; return t ? t.length : 0; }
function njDeptTanks(deptId) {
  const hit = njTankDepts().find((x) => x.d.id === deptId);
  if (!hit) return [];
  return (FACILITY_TANKS[deptId] || []).map((n) => ({
    n, name: "Fish Tank " + n, tag: hit.d.name + "-FTA" + n,
    deptId: hit.d.id, dept: hit.d.name + " · " + hit.d.sub, bld: hit.b.name,
  }));
}
// every tank in the facility, in register order
function njAllTanks() { return njTankDepts().flatMap((x) => njDeptTanks(x.d.id)); }
Object.assign(window, { FACILITY, FACILITY_OTHER, FACILITY_BATCHES, FACILITY_TANKS, njTankDepts, njTankCount, njDeptTanks, njAllTanks });
