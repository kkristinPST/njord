// mortality-causes.jsx — the cause-of-death tree, shared by the desktop registration dialog
// (screens/fish-biology.jsx) and the mobile registration sheet. ONE list for both surfaces:
// a cause an operator can pick in the field must exist in the control room's report.
// "Destruction / culling" covers fish the farm unalives deliberately — it is not mortality by
// the same route as disease, but it must be registerable and reportable.
const DF_CAUSE_TREE = [
  { cause: "Mechanical damage", subs: ["Handling injury", "Pump or grader damage", "Screen abrasion", "Transport damage"] },
  { cause: "Runt / poor growth", subs: ["Non-feeder", "Emaciation", "Failed smoltification"] },
  { cause: "Maturation", subs: ["Early maturation", "Grilse"] },
  { cause: "Wound / ulcer", subs: ["Skin ulcer", "Winter ulcer", "Fin rot", "Snout wound"] },
  { cause: "Gill health", subs: ["Gill inflammation", "Amoebic gill disease", "Particle irritation"] },
  { cause: "Deformity", subs: ["Spinal deformity", "Jaw deformity", "Cataract"] },
  { cause: "Handling / grading", subs: ["Grading", "Vaccination", "Crowding", "Tank transfer"] },
  { cause: "CMS / cardiac", subs: ["CMS", "HSMI", "Cardiac rupture"] },
  { cause: "Infectious", subs: ["Bacterial · Yersinia", "Bacterial · Flavobacterium", "Fungal · Saprolegnia", "Viral · IPN", "Parasitic"] },
  { cause: "Environmental", subs: ["Low oxygen", "High CO₂", "Temperature shock", "Ammonia / nitrite", "Gas supersaturation"] },
  { cause: "Destruction / culling", subs: ["Welfare culling", "Veterinary order", "Disease control", "Deformity", "Runt / non-marketable", "Surplus stock"] },
  { cause: "Unknown", subs: [] },
];
function dfCauseLabel(r) { return r.cause ? (r.sub ? r.cause + " · " + r.sub : r.cause) : ""; }
Object.assign(window, { DF_CAUSE_TREE, dfCauseLabel });
