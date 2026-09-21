// dept-overview.jsx — "Department Overview": a whole department as ONE simplified process
// diagram. It is rendered by the Dashboard's Tank Vitals card (TvSheet in tank-vitals.jsx),
// which opens it as a drawer when an operator clicks a department's name in the rail.
//
// The legacy system gives each department an Oversikt page: not a stack of full P&IDs, but one
// sheet where every process is reduced to a single representative symbol, and multiplicity is
// carried by a row of run-state dots (one drum filter drawn, three dots under it) instead of
// three drawn filters. Drill-down stays where it belongs: click a stage and you land on that
// system's real mimic, in that department's context.
//
// It is NOT a department tab. As a tab it took first position but nothing routed to it, so
// every arrival landed on the second tab; and the Site Plan had no node for it, because an
// Overview is not a system and has no status of its own. Building 3 · DPT2 owns a hand-drawn
// combined mimic (screens/overview.jsx, window.OvMimic) and the drawer renders THAT for it.
//
// The TANK band is not drawn here: the department's tanks are the rail the drawer hangs off,
// so there is exactly one tank presentation in the product. This file owns no card and no
// department picker — the rail is the picker.
//
// Data: tanks come from njVitalTanks (the Dashboard rail's source) and status from the FACILITY
// model (the Site Plan's source). Unit counts and stage readouts for departments that carry no
// instrumented fixture are derived deterministically from the department id — the same
// convention njVitalTanks already uses outside DPT1. Never read an instrumented fixture
// (TANK_PANELS, FF_TANKS) for a department that does not own it.

function doSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
function doRand(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

// system label → how it is drawn on the overview sheet: glyph, how many units it stands for,
// and the one reading that matters at overview level.
const DO_KIND = {
  "Fish Tank":         { glyph: "tank",   units: 0, rd: { unit: "cm", lo: 188, hi: 208 }, name: "Fish tanks" },
  "Feeding":           { glyph: "hopper", units: 0, rd: { unit: "kg/h", lo: 18, hi: 52 }, name: "Feeding" },
  "HyFlow Feeding":    { glyph: "hopper", units: 2, rd: { unit: "kg/h", lo: 12, hi: 38 }, name: "HyFlow feeding" },
  "RAS":               { glyph: "bio",    units: 2, rd: { unit: "mg/L", lo: 0.3, hi: 0.9, dec: 2 }, name: "Biofilter" },
  "MBBR":              { glyph: "bio",    units: 2, rd: { unit: "mg/L", lo: 0.3, hi: 0.9, dec: 2 }, name: "Bioreactor" },
  "Pump Sump":         { glyph: "sump",   units: 3, rd: { unit: "cm", lo: 168, hi: 208 }, name: "Pump sump" },
  "Water Treatment":   { glyph: "drum",   units: 3, rd: { unit: "NTU", lo: 0.2, hi: 0.9, dec: 2 }, name: "Water treatment" },
  "Energy Plant":      { glyph: "hx",     units: 2, rd: { unit: "°C", lo: 10.4, hi: 13.6, dec: 1 }, name: "Energy plant" },
  "Sludge Treatment":  { glyph: "cone",   units: 2, rd: { unit: "m³/h", lo: 1.2, hi: 4.8, dec: 1 }, name: "Sludge" },
  "Lye Dosing":        { glyph: "dose",   units: 2, rd: { unit: "pH", lo: 6.9, hi: 7.5, dec: 2 }, name: "Lye dosing" },
  "Seawater Exchange": { glyph: "hx",     units: 2, rd: { unit: "bar", lo: 1.6, hi: 3.2, dec: 2 }, name: "Seawater" },
  "Dead Fish":         { glyph: "cone",   units: 2, rd: { unit: "bar", lo: 0.3, hi: 0.8, dec: 2 }, name: "Dead fish" },
  "Sorting":           { glyph: "drum",   units: 2, rd: null, name: "Sorting" },
  "Fish Barrier":      { glyph: "drum",   units: 2, rd: null, name: "Fish barrier" },
  "Hatchery":          { glyph: "tank",   units: 4, rd: { unit: "°C", lo: 7.6, hi: 9.4, dec: 1 }, name: "Hatchery" },
  "Technical":         { glyph: "hx",     units: 3, rd: { unit: "kW", lo: 34, hi: 96 }, name: "Technical" },
  "HMI":               { glyph: "panel",  units: 2, rd: null, name: "HMI" },
};
// the order water actually travels, so the sheet reads left to right as a loop
const DO_ORDER = ["Energy Plant", "Seawater Exchange", "Water Treatment", "Fish Tank", "Feeding", "HyFlow Feeding",
  "Hatchery", "Sorting", "Fish Barrier", "Sludge Treatment", "Dead Fish", "RAS", "MBBR", "Lye Dosing", "Pump Sump", "Technical", "HMI"];
const doRank = (l) => { const i = DO_ORDER.indexOf(l); return i < 0 ? DO_ORDER.length : i; };

// Tag prefix. ALWAYS building-qualified: two departments are named DPT1 (Building 1 and
// Building 3) and two are named DPT2, so a name-keyed code emits the SAME tag for physically
// different instruments — Building 1's loop flow silently became Building 3's pen. Derive from
// the department id, which is unique by construction. Never key a tag on a department name.
function doDeptCode(dept) { return dept.id.replace(/-/g, "").toUpperCase(); }

// ── glyphs: one symbol stands for the whole stage ──
function DoTankGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <rect x={cx - 46} y={cy - 34} width="92" height="68" rx="6" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    <rect x={cx - 41} y={cy - 6} width="82" height="35" rx="4" fill="var(--sc-water)" opacity=".5" />
  </g>);
}
function DoHopperGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <path d={`M${cx - 38},${cy - 34} H${cx + 38} L${cx + 12},${cy + 18} H${cx - 12} Z`} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    <rect x={cx - 14} y={cy + 18} width="28" height="16" rx="3" fill="var(--sc-stop)" stroke="var(--sc-edge)" strokeWidth="1.2" />
  </g>);
}
function DoDrumGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <rect x={cx - 46} y={cy - 32} width="92" height="64" rx="6" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    <circle cx={cx} cy={cy} r="21" fill="none" stroke="var(--sc-edge)" strokeWidth="1.6" />
    <path d={`M${cx - 21},${cy} H${cx + 21} M${cx},${cy - 21} V${cy + 21}`} stroke="var(--sc-edge)" strokeWidth="1.2" />
  </g>);
}
function DoHxGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <rect x={cx - 36} y={cy - 34} width="72" height="68" rx="5" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    <path d={`M${cx - 36},${cy - 34} L${cx + 36},${cy + 34} M${cx + 36},${cy - 34} L${cx - 36},${cy + 34}`} stroke="var(--sc-edge)" strokeWidth="1.4" />
  </g>);
}
function DoConeGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <path d={`M${cx - 30},${cy - 32} H${cx + 30} L${cx},${cy + 32} Z`} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
  </g>);
}
function DoDoseGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <rect x={cx - 26} y={cy - 34} width="52" height="50" rx="5" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    <rect x={cx - 22} y={cy - 8} width="44" height="20" rx="3" fill="var(--sc-water)" opacity=".5" />
    <path d={`M${cx},${cy + 16} V${cy + 30}`} stroke="var(--sc-edge)" strokeWidth="1.4" />
  </g>);
}
function DoPanelGlyph({ cx, cy }) {
  return (<g aria-hidden="true">
    <rect x={cx - 34} y={cy - 28} width="68" height="56" rx="5" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
    <rect x={cx - 24} y={cy - 18} width="48" height="26" rx="3" fill="var(--sc-stop)" stroke="var(--sc-edge)" strokeWidth="1" />
  </g>);
}
const DO_GLYPH = { tank: DoTankGlyph, hopper: DoHopperGlyph, drum: DoDrumGlyph, hx: DoHxGlyph, cone: DoConeGlyph, dose: DoDoseGlyph, bio: null, sump: null, panel: DoPanelGlyph };
// half-width of each glyph, so a pipe lands ON the symbol instead of stopping short of a
// narrow one (the sludge cone is 30 wide, the bioreactor 48)
const DO_HALF = { tank: 46, hopper: 38, drum: 46, hx: 36, cone: 30, dose: 26, bio: 48, sump: 48, panel: 34 };

// run-state dots: ONE symbol is drawn, the dots say how many units it stands for and which
// of them are running. GREY is a unit taken out of service on purpose; AMBER is a unit that is
// in service and NOT running, which is the only one of the three states worth walking over to.
function DoUnits({ cx, y, units }) {
  const n = units.length, gap = 16, x0 = cx - ((n - 1) * gap) / 2;
  return (
    <g aria-hidden="true">
      {units.map((u, i) => (
        <circle key={i} cx={x0 + i * gap} cy={y} r="5.5"
          fill={u.run ? "var(--success-solid)" : u.duty ? "var(--warning-mid)" : "var(--sc-stop)"}
          stroke="var(--sc-edge)" strokeWidth="1" />
      ))}
    </g>
  );
}

// ── one stage on the chain ──
function DoStage({ st, cx, cy, onOpen }) {
  const G = DO_GLYPH[st.glyph];
  const half = DO_HALF[st.glyph];
  return (
    <g>
      <Eq title={"Open " + st.label} onClick={onOpen}>
        {st.glyph === "bio" ? <Bioreactor x={cx - 48} y={cy - 36} w={96} h={72} />
          : st.glyph === "sump" ? <SumpBasin x={cx - 48} y={cy - 34} w={96} h={70} />
          : G ? <G cx={cx} cy={cy} /> : null}
      </Eq>
      {st.rd && <RD x={cx - 33} y={cy - 84} w={66} value={st.rd.value} unit={st.rd.unit} tag={st.tag} name={st.name + " " + st.rd.unit} group={st.label}
        accent={st.rd.off ? "var(--warning-text)" : undefined} />}
      {st.rd && st.rd.sp != null && <text className={"do-sp" + (st.rd.off ? " off" : "")} x={st.mode === "M" ? cx - 6 : cx} y={cy - 46} textAnchor={st.mode === "M" ? "end" : "middle"}>SP {st.rd.sp}</text>}
      {/* anything not in Auto is the first thing a shift lead scans for. It shares the line
          under the readout with the setpoint — beside the glyph it landed on the process pipe. */}
      {st.mode === "M" && <ModeChip x={st.rd ? cx + 6 : cx - 13} y={cy - 58} mode="M" />}
      <DoUnits cx={cx} y={cy + 56} units={st.units} />
      <Tag2 x={cx} y={cy + 84} tag={st.tag} desc={[st.name]} />
      {st.sub && <text className="do-sub" x={cx} y={cy + 118} textAnchor="middle">{st.sub}</text>}
      {st.status !== "ok" && <circle cx={cx + half + 12} cy={cy - 42} r="6" fill={st.status === "critical" ? "var(--critical-solid)" : "var(--warning-mid)"} stroke="var(--sc-edge)" strokeWidth="1" />}
    </g>
  );
}

// the department's most recent entry in the operator/setpoint audit trail. Read from the SAME
// MVR_LOG the Maneuver History screen shows, resolved through njResolveArea so a department
// name that repeats across buildings cannot claim another building's action.
function doLastAction(building, dept) {
  const log = window.MVR_LOG || [];
  for (const e of log) {
    const r = window.njResolveArea && window.njResolveArea(e.area);
    if (r && r.b === building.id && r.d === dept.id) return e;
  }
  return null;
}

// open a stage in ITS OWN department: the Dashboard card can show a department that is not the
// current context, so the context moves with the click (same contract as the Site Plan's nodes).
function doOpenStage(building, dept, label) {
  setCtx(building.id, dept.id);
  if (label === "Feeding" || label === "Fish Feeding") { if (window.__njNavigate) window.__njNavigate("feeding"); return; }
  window.__njNavSub = label;
  if (window.__njDeptTab) window.__njDeptTab(label);
  else if (window.__njNavigate) window.__njNavigate("navigation");
}

function DeptOverviewMimic({ building, dept }) {
  const nTanks = dept.systems.some((s) => s.label === "Fish Tank") ? njVitalTanks(building.id, dept.id).length : 0;
  const stages = React.useMemo(() => {
    const r = doRand(doSeed(building.id + dept.id));
    return dept.systems
      .filter((s) => s.label !== "Overview")
      .slice()
      .sort((a, b) => doRank(a.label) - doRank(b.label))
      .map((s) => {
        const k = DO_KIND[s.label] || { glyph: "drum", units: 2, rd: null, name: s.label };
        const nUnits = k.units || Math.max(1, Math.min(6, nTanks || 2));
        // duty = the unit is in service. In service and not running is the amber case;
        // out of service and not running is grey and expected.
        const units = Array.from({ length: nUnits }, () => {
          const duty = r() > 0.12;
          return { duty, run: duty && r() > (s.status === "critical" ? 0.55 : 0.14) };
        });
        let rd = null;
        if (k.rd) {
          const mid = (k.rd.lo + k.rd.hi) / 2;
          const v = k.rd.lo + r() * (k.rd.hi - k.rd.lo);
          const sp = k.rd.dec != null ? mid.toFixed(k.rd.dec) : String(Math.round(mid / 2) * 2);
          const band = (k.rd.hi - k.rd.lo) * 0.3;
          rd = { value: k.rd.dec != null ? v.toFixed(k.rd.dec) : String(Math.round(v)), unit: k.rd.unit, sp, off: Math.abs(v - mid) > band };
        }
        const tag = doDeptCode(dept) + "-" + s.label.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() + "0";
        // feeding is the one stage where the day's progress against plan is the headline
        let sub = null;
        if (s.label === "Feeding" || s.label === "HyFlow Feeding") {
          const plan = 120 + Math.round(r() * 8) * 40;
          sub = Math.round(plan * (0.42 + r() * 0.5)) + " / " + plan + " kg today";
        }
        return { label: s.label, name: k.name, glyph: k.glyph, units, rd, sub, tag, status: s.status || "ok",
          mode: r() > 0.88 ? "M" : "A" };
      });
  }, [building.id, dept.id, nTanks]);
  const loop = React.useMemo(() => {
    const r = doRand(doSeed(dept.id + "loop"));
    return { flow: String(Math.round(400 + r() * 2200)), temp: (9.8 + r() * 4.2).toFixed(1) };
  }, [dept.id]);
  const lastAct = doLastAction(building, dept);

  // ── LAYOUT: the loop WRAPS onto rows; the viewBox must never outgrow its container ──
  // All mimic text is authored in viewBox units, so a viewBox wider than the card is scaled
  // down and every label shrinks with it: a 6-stage sheet at a fixed 1600 viewBox rendered its
  // tags at 4.85px in a 790px card. The fix is not a smaller font or a horizontal scroller —
  // it is to bound the WIDTH: measure the container, fit as many 260-unit stages per row as
  // it holds, and wrap the rest onto further rows, reading left-to-right like text.
  const wrapRef = React.useRef(null);
  const [cw, setCw] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setCw((p) => { const w = Math.round(el.clientWidth); return Math.abs(w - p) < 2 ? p : w; });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = stages.length;
  // 240 viewBox units per stage is the tightest the widest tag + description will sit without
  // touching its neighbour; it also lets a 790px dashboard card hold three stages per row.
  const perRow = Math.max(2, Math.min(n, Math.floor((cw || 760) / 240)));
  const rows = Math.ceil(n / perRow);
  const W = Math.max(520, perRow * 240);
  const rowH = 240, chainY = 106, H = chainY + (rows - 1) * rowH + 214;
  const x0 = 72, x1 = W - 72;
  const step = (x1 - x0) / perRow;
  const rowOf = (i) => Math.floor(i / perRow);
  const at = (i) => x0 + step * ((i % perRow) + 0.5);
  const yOf = (i) => chainY + rowOf(i) * rowH;
  const half = (i) => DO_HALF[stages[i].glyph] + 6;
  const retY = chainY + (rows - 1) * rowH + 150;
  const code = doDeptCode(dept);
  // spine: stage to stage, wrapping at the end of a row, then one return run back to the head.
  // A wrap is routed through the GUTTER between the two rows (below the tags it just passed,
  // above the next row's readouts) — run along the next row's centreline it passed straight
  // through that row's first glyphs and read as if they were part of it. Both the wrap and the
  // return drop OUTSIDE the end stages' flanks; through their centres they crossed the tags.
  const pipes = [];
  for (let i = 0; i < n - 1; i++) {
    const y = yOf(i), y2 = yOf(i + 1);
    if (y === y2) { pipes.push({ k: "proc", d: `M${at(i) + half(i)},${y} H${at(i + 1) - half(i + 1)}` }); continue; }
    const gy = y + 137, ex = at(i + 1) - half(i + 1);
    pipes.push({ k: "proc", d: `M${at(i) + half(i)},${y} H${W - 28} V${gy} H${ex - 30} V${y2} H${ex}` });
  }
  if (n > 1) {
    const L = n - 1;
    pipes.push({ k: "drain", d: `M${at(L) + half(L)},${yOf(L)} H${at(L) + 76} V${retY} H${14} V${chainY} H${at(0) - half(0)}` });
  }
  return (
    <div className="do-wrap" ref={wrapRef}>
      <svg className="rasm" style={{ maxWidth: W }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={dept.name + " department process overview"} preserveAspectRatio="xMidYMid meet">
        {pipes.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}
        {stages.map((s, i) => <DoStage key={s.label} st={s} cx={at(i)} cy={yOf(i)} onOpen={() => doOpenStage(building, dept, s.label)} />)}
        {/* the two numbers that describe the loop itself, on the runs they belong to */}
        {n > 1 && perRow > 1 && <RD x={(at(0) + at(1)) / 2 - 33} y={chainY - 46} w={66} value={loop.flow} unit="m³/h" tag={code + "-FT0"} name="Loop flow" group={dept.name} />}
        {n > 1 && <RD x={W / 2 - 33} y={retY - 13} w={66} value={loop.temp} unit="°C" tag={code + "-TT0"} name="Return temperature" group={dept.name} />}
        {lastAct && (
          <text className="do-foot" x={x0} y={H - 14}>
            LAST ACTION · {(lastAct.t.split("·")[1] || lastAct.t).trim()} · {lastAct.sig} {lastAct.from} → {lastAct.to} · {lastAct.op}
          </text>
        )}
      </svg>
    </div>
  );
}

Object.assign(window, { DeptOverviewMimic, doOpenStage });
