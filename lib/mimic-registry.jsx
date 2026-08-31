// mimic-registry.jsx — system label → the process mimic that draws it.
// ONE registry, read by the desktop process screens' fullscreen SCADA view and by the mobile
// Process view (Process View.html in an iframe). Values are component NAMES, resolved off
// window at render time, so this file can load before the screen files that define them.
const NJ_MIMICS = {
  "RAS": "RasMimic",
  "MBBR": "RasMimic",
  "Overview": "OvMimic",
  "Pump Sump": "PumpSumpMimic2",
  "Water Treatment": "WaterTreatmentMimic",
  "Sludge Treatment": "SludgeMimic",
  "Energy Plant": "EnergyPlantMimic",
  "Lye Dosing": "LyeMimic",
  "Seawater Exchange": "SweMimic",
  "Fish Barrier": "FbMimic",
  "Sorting": "SortingMimic",
  "Hatchery": "HatcheryMimic",
  "HyFlow Feeding": "HyFlowMimic",
  "Dead Fish": "DeadFishMimic",
  "Technical": "CommonTechMimic",
};
function njMimicFor(label) { const n = NJ_MIMICS[label]; return n ? window[n] : null; }
function njHasMimic(label) { return !!NJ_MIMICS[label]; }
Object.assign(window, { NJ_MIMICS, njMimicFor, njHasMimic });
