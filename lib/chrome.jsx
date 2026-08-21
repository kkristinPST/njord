// chrome.jsx — NJORD shared primitives + app shell

// Severity scale (ISA-18.2 / EEMUA 191). Salience descends with priority so the most
// important alarm reads first: CRITICAL red (loudest, solid badge) > HIGH amber > MEDIUM
// blue (informational, its own hue — NOT the brand cyan) > LOW / DIAGNOSTIC neutral grays.
// Color is always paired with a text label or glyph elsewhere, never color-only (ISA-101).
const SEV = {
  critical: { dot: "var(--sev-crit)", bg: "var(--critical-bg)", text: "var(--critical-text)", label: "CRITICAL" },
  high:     { dot: "var(--sev-high)", bg: "var(--warning-bg)",  text: "var(--warning-text)",  label: "HIGH" },
  medium:   { dot: "var(--sev-med)",  bg: "var(--medium-bg)",   text: "var(--medium-text)",   label: "MEDIUM" },
  low:      { dot: "var(--sev-low)",  bg: "var(--info-bg)",     text: "var(--info-text)",     label: "LOW" },
  diagnostic:{ dot: "var(--sev-diag)", bg: "var(--slate-100)",  text: "var(--slate-600)",     label: "DIAGNOSTIC" },
  ok:       { dot: "var(--sev-ok)",   bg: "var(--success-bg)",  text: "var(--success-text)",  label: "OK" },
};

function Dot({ level, size = 9 }) {
  const c = (SEV[level] || SEV.low).dot;
  return <span className="statusdot" style={{ background: c, width: size, height: size }} />;
}

// The most important priority gets the loudest, highest-contrast treatment: CRITICAL is a
// solid deep-red fill with white text (AA), so it stands out above softly-tinted lower tiers.
function Badge({ level, children, soft = true }) {
  const s = SEV[level] || SEV.low;
  if (level === "critical") {
    return <span className="badge badge-solid" style={{ background: "var(--critical-solid)", color: "#fff" }}>{children || s.label}</span>;
  }
  return <span className="badge" style={{ background: s.bg, color: s.text }}>{children || s.label}</span>;
}

// A checkbox and its label are ONE control: spread this on the wrapper that holds a
// presentational <Check /> plus its text, so clicking/tapping either toggles (and Space/Enter
// works). The <Check /> inside must NOT get its own onClick — it stops propagation.
function njCheckable(onToggle, opts) {
  const o = opts || {};
  const fire = (e) => { e.preventDefault(); onToggle(e); };
  return {
    role: "checkbox", "aria-checked": o.indeterminate ? "mixed" : !!o.on, "aria-label": o.label,
    tabIndex: 0, onClick: fire,
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") fire(e); },
  };
}

function Check({ on, onClick, indeterminate }) {
  return (
    <span className={"cbx" + (on ? " on" : "") + (indeterminate ? " ind" : "") + (onClick ? " cbx-btn" : "")}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
      role={onClick ? "checkbox" : undefined} aria-checked={indeterminate ? "mixed" : !!on} tabIndex={onClick ? 0 : undefined}>
      {indeterminate ? <Icon name="minus" size={11} strokeWidth={3} /> : (on && <Icon name="check" size={11} strokeWidth={3} />)}
    </span>
  );
}

function KpiCard({ label, value, unit, delta, deltaDir, icon, onClick }) {
  // delta text is 12px — use the AA-safe -text ramp, not the loud status hues
  const dc = deltaDir === "down" ? "var(--critical-text)" : deltaDir === "flat" ? "var(--fg-muted)" : "var(--success-text)";
  return (
    <div className={"kpi" + (onClick ? " kpi-link" : "")} onClick={onClick} role={onClick ? "button" : undefined} {...(onClick ? njActivate(onClick) : null)}>
      <div className="kpi-top">
        <span className="eyebrow">{label}</span>
        <Icon name={onClick ? "arrow-up-right" : icon} size={17} color="var(--slate-400)" />
      </div>
      <div className="kpi-val">
        <span className="metric">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {delta && <div className="kpi-delta" style={{ color: dc }}>{delta}</div>}
    </div>
  );
}

function Card({ title, icon, action, children, style, bodyStyle, headRight }) {
  return (
    <div className="card" style={style}>
      {(title || headRight) && (
        <div className="card-head">
          <div className="card-head-l">
            {icon && <Icon name={icon} size={17} color="var(--slate-600)" />}
            {title && <span className="card-title">{title}</span>}
          </div>
          {headRight || (action && <button className="linkbtn">{action} <Icon name="arrow-up-right" size={14} /></button>)}
        </div>
      )}
      <div className="card-body" style={bodyStyle}>{children}</div>
    </div>
  );
}

// ---- Sidebar ----
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

// tiny external store so TopBar + Sidebar share the selected context without prop threading
const ctxStore = {
  state: { b: "b1", d: "b1-d1" },
  subs: new Set(),
  set(p) { ctxStore.state = { ...ctxStore.state, ...p }; ctxStore.subs.forEach((f) => f()); },
  subscribe(f) { ctxStore.subs.add(f); return () => ctxStore.subs.delete(f); },
  snapshot() { return ctxStore.state; },
};
function useCtx() {
  const s = React.useSyncExternalStore(ctxStore.subscribe, ctxStore.snapshot);
  const building = FACILITY.find((b) => b.id === s.b) || FACILITY[0];
  const dept = building.depts.find((d) => d.id === s.d) || building.depts[0];
  return { building, dept };
}
function setCtx(b, d) { ctxStore.set({ b, d }); }
// A department may not offer the system the operator is looking at. Both entry paths need the
// same behaviour — re-scoping while on the screen (njPickContext) and opening the screen while
// already scoped elsewhere (the screen's own guard) — so the fallback lives here.
function njDeptSystemFallback(dept, missing) {
  const first = (dept.systems[0] || {}).label;
  if (!first) return null;
  window.__njNavSub = first;
  if (window.__njDeptTab) window.__njDeptTab(first);
  if (window.__njNavigate) window.__njNavigate("navigation");
  if (window.njToast) window.njToast(dept.name + " has no " + missing + " · showing " + first);
  return first;
}
function njDeptHasSystem(dept, re) { return dept.systems.some((s) => re.test(s.label)); }
// Switch building/department context. The newly-picked department may not offer the system
// the operator is currently looking at — Navigation sub-routes fall back to its first system,
// and the top-level Fish Feeding route falls back to Navigation (Building 3 · Common, for
// instance, has no feeding line at all, so staying on Feeding would show a lie).
function njPickContext(b, d) {
  setCtx(b, d);
  const bld = FACILITY.find((x) => x.id === b);
  const dpt = bld && bld.depts.find((x) => x.id === d);
  if (!dpt) return;
  const labels = dpt.systems.map((s) => s.label);
  if (window.__njRoute === "feeding" && !njDeptHasSystem(dpt, /feeding/i)) { njDeptSystemFallback(dpt, "feeding line"); return; }
  if (window.__njDeptTab && window.__njNavSub != null) {
    if (!labels.includes(window.__njNavSub)) {
      const first = labels.find((l) => !/feeding/i.test(l)) || labels[0];
      window.__njNavSub = first;
      window.__njDeptTab(first);
    }
  }
}

// ---- Theme store (Light / Dark / Legacy) — persisted, applied to <html data-theme> ----
const THEME_KEY = "nj_theme_v1";
const themeStore = {
  v: (() => { try { return localStorage.getItem(THEME_KEY) || "light"; } catch (e) { return "light"; } })(),
  subs: new Set(),
  set(t) {
    themeStore.v = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    document.documentElement.setAttribute("data-theme", t);
    themeStore.subs.forEach((f) => f());
  },
  subscribe(f) { themeStore.subs.add(f); return () => themeStore.subs.delete(f); },
  snapshot() { return themeStore.v; },
};
// apply current theme immediately (covers re-render / first paint)
document.documentElement.setAttribute("data-theme", themeStore.v);
function useTheme() { return React.useSyncExternalStore(themeStore.subscribe, themeStore.snapshot); }
function njSetTheme(t) { themeStore.set(t); }

// ---- Sidebar collapse store — persisted; shared across every AppShell instance ----
const COLLAPSE_KEY = "nj_sidebar_collapsed_v1";
// Tri-state: "auto" (follow viewport — rail below the narrow breakpoint), or an
// explicit user choice. Resizing across the breakpoint returns to "auto", so the
// sidebar reflows with the layout instead of fighting it.
const NARROW_MQ = typeof matchMedia === "function" ? matchMedia("(max-width: 1080px)") : null;
const collapseStore = {
  // "1" = always rail, "e" = always expanded, anything else (incl. the legacy "0") = auto
  pref: (() => { try { const s = localStorage.getItem(COLLAPSE_KEY); return s === "1" ? true : s === "e" ? false : "auto"; } catch (e) { return "auto"; } })(),
  narrow: !!(NARROW_MQ && NARROW_MQ.matches),
  get v() { return collapseStore.pref === "auto" ? collapseStore.narrow : collapseStore.pref; },
  subs: new Set(),
  emit() { collapseStore.subs.forEach((f) => f()); },
  set(c) {
    collapseStore.pref = !!c;
    try { localStorage.setItem(COLLAPSE_KEY, c ? "1" : "e"); } catch (e) {}
    collapseStore.emit();
  },
  toggle() { collapseStore.set(!collapseStore.v); },
  subscribe(f) { collapseStore.subs.add(f); return () => collapseStore.subs.delete(f); },
  snapshot() { return collapseStore.v; },
};
if (NARROW_MQ) {
  const onNarrow = (e) => {
    collapseStore.narrow = e.matches;
    collapseStore.pref = "auto";
    try { localStorage.setItem(COLLAPSE_KEY, "auto"); } catch (err) {}
    collapseStore.emit();
  };
  if (NARROW_MQ.addEventListener) NARROW_MQ.addEventListener("change", onNarrow);
  else NARROW_MQ.addListener(onNarrow);
}
function useCollapsed() { return React.useSyncExternalStore(collapseStore.subscribe, collapseStore.snapshot); }

// ---- Table density (comfortable / compact) — persisted, applied as a body class ----
const DENSITY_KEY = "nj_density_compact_v1";
const densityStore = {
  v: (() => { try { return localStorage.getItem(DENSITY_KEY) === "1"; } catch (e) { return false; } })(),
  subs: new Set(),
  apply() { try { document.body.classList.toggle("nj-compact", densityStore.v); } catch (e) {} },
  set(c) { densityStore.v = !!c; try { localStorage.setItem(DENSITY_KEY, c ? "1" : "0"); } catch (e) {} densityStore.apply(); densityStore.subs.forEach((f) => f()); },
  toggle() { densityStore.set(!densityStore.v); },
  subscribe(f) { densityStore.subs.add(f); return () => densityStore.subs.delete(f); },
  snapshot() { return densityStore.v; },
};
densityStore.apply();
function useDensity() { return React.useSyncExternalStore(densityStore.subscribe, densityStore.snapshot); }

// ---- Text size (normal / large / extra large) — persisted, applied as a body class ----
// Implemented as a scale on the working area (content, dialogs, drawers) rather than as a
// per-selector font-size sweep: the layout reflows at the new size, so nothing can overlap.
const TEXTSIZE_KEY = "nj_textsize_v1";
const TEXT_SIZES = ["normal", "large", "xlarge"];
const textSizeStore = {
  v: (() => { try { const v = localStorage.getItem(TEXTSIZE_KEY); return TEXT_SIZES.indexOf(v) >= 0 ? v : "normal"; } catch (e) { return "normal"; } })(),
  subs: new Set(),
  apply() { try { const b = document.body; b.classList.toggle("nj-text-lg", textSizeStore.v === "large"); b.classList.toggle("nj-text-xl", textSizeStore.v === "xlarge"); } catch (e) {} },
  set(v) {
    textSizeStore.v = TEXT_SIZES.indexOf(v) >= 0 ? v : "normal";
    try { localStorage.setItem(TEXTSIZE_KEY, textSizeStore.v); } catch (e) {}
    textSizeStore.apply(); textSizeStore.subs.forEach((f) => f());
  },
  subscribe(f) { textSizeStore.subs.add(f); return () => textSizeStore.subs.delete(f); },
  snapshot() { return textSizeStore.v; },
};
textSizeStore.apply();
function useTextSize() { return React.useSyncExternalStore(textSizeStore.subscribe, textSizeStore.snapshot); }
Object.assign(window, { textSizeStore, useTextSize, TEXT_SIZES });

// ---- Alarm "area" → process screen resolver ----
// Maps a free-text alarm area (e.g. "DPT2 Pump Sump") to a building+dept+system so an
// operator handling an alarm can jump straight to where the problem physically is.
// Returns { b, d, sub } or null when no related process screen exists (PLC rooms, sumps
// with no mimic, etc.) — callers render those areas as plain, non-linked text.
function njResolveArea(area) {
  if (!area) return null;
  const a = area.toLowerCase();
  const d4 = /dpt4/.test(a);
  const P = (b, d, sub) => ({ b, d, sub });
  if (/pump\s*sump/.test(a)) return P("b2", d4 ? "b2-d4" : "b2-d3", "Pump Sump");
  if (/drum\s*filter|turbidity|\buv\b|backwash|water treatment/.test(a)) return P("b2", "b2-sup", "Water Treatment");
  if (/co₂|co2|stripper|degasser/.test(a)) return P("b3", "b3-d2", "Overview");
  if (/biofilter|mbbr|\btan\b/.test(a)) return P("b2", d4 ? "b2-d4" : "b2-d3", "MBBR");
  if (/oxygen|fish\s*tank|feed\s*screw|feed\s*count/.test(a)) return P("b1", "b1-d1", "Fish Tank");
  if (/energy\s*plant/.test(a)) return P("b2", d4 ? "b2-d4" : "b2-d3", "Energy Plant");
  if (/sorting/.test(a)) return P("b1", "b1-sup", "Sorting");
  if (/sludge/.test(a)) return P("b1", "b1-sup", "Sludge Treatment");
  if (/hatchery/.test(a)) return P("b3", "b3-d1", "Hatchery");
  if (/lye/.test(a)) return P("b2", "b2-sup", "Lye Dosing");
  if (/dead\s*fish|grinder/.test(a)) return P("b2", "b2-sup", "Dead Fish");
  if (/technical/.test(a)) return P("b3", "b3-com", "Technical");
  return null;
}
// Navigate to an explicit building + department + system.
//
// The __njNavSub assignment below is what makes this work from anywhere. __njDeptTab is only
// registered while NavigationView is mounted, so from the Dashboard it is always null; the
// fallback to __njNavigate("navigation") then lands on whatever sub-tab was last open, NOT the
// one the caller asked for. Setting __njNavSub first fixes that, because NavigationView seeds
// its state from __njNavSub on mount. Always route through here (or njGoArea / njDeptNav /
// __njGoPlan, which all delegate to the same pattern) rather than calling __njNavigate
// ("navigation") directly.
function njGoSystem(b, d, sub) {
  setCtx(b, d);
  if (/^(feeding|fish feeding)$/i.test(sub)) { if (window.__njNavigate) window.__njNavigate("feeding"); return true; }
  window.__njNavSub = sub;
  if (window.__njDeptTab) window.__njDeptTab(sub);
  else if (window.__njNavigate) window.__njNavigate("navigation");
  return true;
}
// navigate to an area's process screen; returns false if unresolvable
function njGoArea(area) {
  const r = njResolveArea(area);
  if (!r) return false;
  return njGoSystem(r.b, r.d, r.sub);
}
// inline area cell: a link when a related process screen exists, plain text otherwise
function AreaLink({ area, strong }) {
  if (!njResolveArea(area)) return <span className={strong ? "td-strong" : undefined}>{area}</span>;
  return (
    <button className="area-link" title={"Open process screen · " + area}
      onClick={(e) => { e.stopPropagation(); njGoArea(area); }}>
      <span className="area-link-txt">{area}</span>
      <Icon name="arrow-up-right" size={13} />
    </button>
  );
}

// ---- system state: the single source is the FACILITY model (drives the site plan). Screens
// read the SAME status so the two representations always correspond. ----
// normalize FACILITY status (ok / warning / critical) to the SEV scale (ok / high / critical)
function njSev(status) { return status === "critical" ? "critical" : status === "warning" ? "high" : "ok"; }
// look up a system's status by building id + dept id + system label
function njSystemStatus(buildingId, deptId, label) {
  const b = FACILITY.find((x) => x.id === buildingId); if (!b) return "ok";
  const d = b.depts.find((x) => x.id === deptId); if (!d) return "ok";
  const s = d.systems.find((x) => x.label === label); return s ? (s.status || "ok") : "ok";
}
// NOTE: the per-system alarm banner (SystemStatusBar + njSystemAlarms/njSystemAlarmsByRoute) was
// REMOVED — the platform can't summarize which alarms are active per equipment/system without an
// expensive startup aggregation that would slow the screens down. Do not reintroduce it.

// Interactive breadcrumb scope: the Building and Department crumbs are dropdowns, so the
// operator can re-scope to any building/department right from the top bar of any scoped screen.
function BreadcrumbScope() {
  const { building, dept } = useCtx();
  const [open, setOpen] = React.useState(null); // "b" | "d" | null
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener("pointerdown", f, true);
    return () => document.removeEventListener("pointerdown", f, true);
  }, [open]);
  const pick = (b, d) => { njPickContext(b, d); setOpen(null); };
  const caret = <Icon name="chevron-down" size={13} color="var(--slate-400)" />;
  return (
    <span className="tb-scope" ref={ref}>
      <span className="crumb-pick-wrap">
        <button className={"crumb-pick" + (open === "b" ? " on" : "")} onClick={() => setOpen((o) => (o === "b" ? null : "b"))} title="Switch building">
          <span className="crumb-pick-lbl">{building.name}</span> {caret}
        </button>
        {open === "b" && (
          <div className="ctx-menu crumb-menu" onPointerDown={(e) => e.stopPropagation()}>
            {FACILITY.map((b) => (
              <button key={b.id} className={"ctx-dept" + (b.id === building.id ? " active" : "")} onClick={() => pick(b.id, b.depts[0].id)}>
                <span>{b.name}</span>
                <span className="meta">{b.depts.length} departments</span>
              </button>
            ))}
          </div>
        )}
      </span>
      <span className="tb-sep"><Icon name="chevron-right" size={15} color="var(--slate-300)" /></span>
      <span className="crumb-pick-wrap">
        <button className={"crumb-pick" + (open === "d" ? " on" : "")} onClick={() => setOpen((o) => (o === "d" ? null : "d"))} title="Switch department">
          <span className="crumb-pick-lbl">{dept.name}</span> {caret}
        </button>
        {open === "d" && (
          <div className="ctx-menu crumb-menu" onPointerDown={(e) => e.stopPropagation()}>
            <div className="ctx-bld">{building.name}</div>
            {building.depts.map((d) => (
              <button key={d.id} className={"ctx-dept" + (d.id === dept.id ? " active" : "")} onClick={() => pick(building.id, d.id)}>
                <span>{d.name}</span>
                <span className="meta">{d.sub} · {d.systems.length} systems</span>
              </button>
            ))}
          </div>
        )}
      </span>
    </span>
  );
}

const NAV = [
  { id: "start",      label: "Dashboard",        icon: "home" },
  { id: "navigation", label: "Site Plan",        icon: "map" },
  { id: "alarms",     label: "Alarms",           icon: "bell-ring" },
  { id: "maneuver",   label: "Maneuver History", icon: "history" },
  { id: "reports",    label: "Reports",          icon: "file-text" },
  { id: "feeding",    label: "Fish Feeding",     icon: "utensils" },
  { id: "biology",    label: "Fish Biology",     icon: "fish" },
  { id: "analytics",  label: "Analytics",         icon: "line-chart" },
  { id: "settings",   label: "Settings",         icon: "settings" },
];

function Sidebar({ active }) {
  // No scope label here: the rail holds only facility-wide routes, and the removed context
  // picker is what it used to belong to. Scope lives in the top bar, on scoped screens only.
  const collapsed = useCollapsed();
  const compact = useDensity();
  useAlarmHub();
  const ac = alarmCounts();
  const [uMenu, setUMenu] = React.useState(false);
  const uRef = React.useRef(null);
  React.useEffect(() => {
    if (!uMenu) return;
    const onDoc = (e) => { if (uRef.current && !uRef.current.contains(e.target)) setUMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setUMenu(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [uMenu]);
  const signOut = () => openDialog(<ConfirmDialog title="Sign out" message="Sign out of NJORD?" detail="Any unsaved changes in open dialogs will be lost. Active alarms keep annunciating for the next operator." confirmLabel="Sign out" tone="danger" onConfirm={() => njToast("Signed out: returning to login.")} />);
  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sb-logo">
        {!collapsed && <img className="sb-wordmark" src={(window.__resources && window.__resources.njWordmark) || "assets/njord-wordmark.png"} alt="NJORD" />}
        {!collapsed && (
          <button className="sb-collapse" onClick={() => collapseStore.toggle()} title="Collapse sidebar" aria-label="Collapse sidebar">
            <Icon name="chevrons-left" size={18} color="var(--slate-400)" />
          </button>
        )}
        {collapsed && (
          <button className="sb-logo-mark" onClick={() => collapseStore.toggle()} title="Expand sidebar" aria-label="Expand sidebar">
            <img className="sb-mark" src={(window.__resources && window.__resources.njMark) || "assets/njord-mark.svg"} alt="NJORD" />
          </button>
        )}
      </div>
      <nav className="sb-nav">
        {NAV.map((n) => {
          const isActive = active === n.id;
          const badge = n.id === "alarms" ? (ac.unack || null) : n.badge;
          return (
            <button key={n.id} className={"sb-item" + (isActive ? " active" : "")} title={collapsed ? n.label : undefined}
              onClick={() => { if (n.id === "navigation" && window.__njGoPlan) { window.__njGoPlan(); } else if (window.__njNavigate) { window.__njNavigate(n.id); } }}>
              <span className="sb-item-l">
                <Icon name={n.icon} size={18} />
                {!collapsed && <span className="sb-label">{n.label}</span>}
              </span>
              {!collapsed && (
                <span className="sb-item-r">
                  {badge && <span className="sb-badge">{badge}</span>}
                  {n.caret && <Icon name="chevron-right" size={14} color="var(--slate-400)" />}
                </span>
              )}
              {collapsed && badge && <span className="sb-badge-mini" />}
            </button>
          );
        })}
      </nav>
      <div className="sb-user-wrap" ref={uRef}>
        {uMenu && (
          <div className="sb-user-menu" role="menu">
            <div className="sb-um-head"><span className="sb-avatar sb-avatar-sm">ES</span><div><div className="sb-user-name">E. Sørensen</div><div className="sb-user-role">Shift Supervisor · on shift</div></div></div>
            <button className="sb-um-item" role="menuitem" onClick={() => { setUMenu(false); if (window.openProfile) window.openProfile(); }}><Icon name="user" size={16} /> Profile & account</button>
            <button className="sb-um-item" role="menuitem" onClick={() => { setUMenu(false); if (window.openPreferences) window.openPreferences(); }}><Icon name="sliders-horizontal" size={16} /> Preferences</button>
            <button className="sb-um-item" role="menuitem" aria-pressed={compact} onClick={() => densityStore.toggle()}><Icon name="rows-3" size={16} /> Compact density <span className={"sb-um-tog" + (compact ? " on" : "")}>{compact ? "On" : "Off"}</span></button>
            <button className="sb-um-item" role="menuitem" onClick={() => { setUMenu(false); if (window.openHelp) window.openHelp(); }}><Icon name="help-circle" size={16} /> Help & manuals</button>
            <div className="sb-um-div" />
            <button className="sb-um-item sb-um-danger" role="menuitem" onClick={() => { setUMenu(false); signOut(); }}><Icon name="log-out" size={16} /> Sign out</button>
          </div>
        )}
        <button className={"sb-user" + (uMenu ? " open" : "")} onClick={() => setUMenu((v) => !v)} title="Account" aria-haspopup="menu" aria-expanded={uMenu}>
          <span className="sb-avatar">ES</span>
          {!collapsed && (
            <div className="sb-user-id">
              <div className="sb-user-name">E. Sørensen</div>
              <div className="sb-user-role">Shift Supervisor</div>
            </div>
          )}
          {!collapsed && <Icon name="chevron-up" size={15} color="var(--slate-400)" className="sb-user-caret" />}
        </button>
      </div>
    </aside>
  );
}

// ---- TopBar ----
// Deep-link into the Alarms screen at a given tab + optional priority filter.
// Works whether or not AlarmsView is already mounted (uses a pending hand-off read on mount).
window.__njGoAlarms = function (tab, filter) {
  window.__njAlarmPending = { tab: tab || "All Alarms", filter: filter || null };
  if (window.__njAlarmTab) window.__njAlarmTab(tab || "All Alarms", filter || null);
  if (window.__njNavigate) window.__njNavigate("alarms");
};

function TopBar({ title, crumbs = [], statusLevel = "ok", scope = "dept" }) {
  useAlarmHub();
  const ac = alarmCounts();
  const sep = <span className="tb-sep"><Icon name="chevron-right" size={15} color="var(--slate-300)" /></span>;
  return (
    <div className="topbar">
      <div className="topbar-l">
        <span className="tb-status" style={{ background: (SEV[statusLevel] || SEV.ok).dot }} />
        {scope !== "facility" && (
          <React.Fragment>
            <BreadcrumbScope />
            {sep}
          </React.Fragment>
        )}
        {/* the top bar carries the page title: it is the ONLY page title in the app
            (screens no longer render an in-page h1), so it is the document heading. */}
        <h1 className="tb-title">{title}</h1>
        {crumbs.length > 0 && sep}
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={"tb-crumb" + (i === crumbs.length - 1 ? " cur" : "")}>{c}</span>
            {i < crumbs.length - 1 && sep}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-r">
        <NjClock />
        <button className="tb-search" title="Search (⌘K)" onClick={() => window.__njOpenCommandPalette && window.__njOpenCommandPalette()}>
          <Icon name="search" size={15} color="var(--slate-500)" />
          <span className="tb-search-lbl">Search</span>
          <span className="tb-search-kbd">⌘K</span>
        </button>
        <button className="tb-pill" title={`View ${ac.critical} active critical alarms`} onClick={() => window.__njGoAlarms("Active", "critical")} style={{ background: "var(--critical-solid)", color: "#fff" }}>
          <span className="d" style={{ background: "#fff" }} /> {ac.critical}
        </button>
        <button className="tb-pill" title={`View ${ac.high} active high alarms`} onClick={() => window.__njGoAlarms("Active", "high")} style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
          <span className="d" style={{ background: "var(--warning)" }} /> {ac.high}
        </button>
        <button className="tb-bell" title={`View all alarms · ${ac.unack} unacknowledged`} onClick={() => window.__njGoAlarms("All Alarms")}>
          <Icon name="bell" size={19} />
          {ac.unack > 0 && <span className="tb-bell-badge">{ac.unack}</span>}
        </button>
        <button className="tb-icnbtn" title="Notes" onClick={() => window.openNotes && window.openNotes()}><Icon name="notebook-pen" size={19} /></button>
        <button className="tb-icnbtn" title="Maneuver history" onClick={() => window.__njNavigate && window.__njNavigate("maneuver")}><Icon name="history" size={19} /></button>
        <button className="tb-icnbtn" title="Help" onClick={() => window.openHelp && window.openHelp()}><Icon name="help-circle" size={19} /></button>
      </div>
    </div>
  );
}

// ---- Persistent alarm annunciator ribbon (ISA-18.2) ----
// Always present beneath the top bar on every screen. Surfaces the single highest-priority
// UNACKNOWLEDGED active alarm with inline Acknowledge + go-to, and a count of the rest.
// Collapses to a calm hairline when nothing is unacknowledged.
const ANN_SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, diagnostic: 4 };
function annAge(h) { if (h == null) return "—"; if (h < 1) return Math.max(1, Math.round(h * 60)) + "m"; return Math.round(h) + "h"; }
function AlarmAnnunciator() {
  const hub = useAlarmHub();
  const unacked = hub.rows
    .filter((a) => a.supp === "none" && a.state === "unack")
    .sort((x, y) => (ANN_SEV_ORDER[x.level] - ANN_SEV_ORDER[y.level]) || ((x.since || 0) - (y.since || 0)));
  if (unacked.length === 0) {
    return (
      <div className="annun annun-clear" role="status" aria-live="polite">
        <Icon name="check-circle-2" size={15} color="var(--success)" />
        <span className="annun-clear-t">All active alarms acknowledged</span>
      </div>
    );
  }
  const top = unacked[0];
  const rest = unacked.length - 1;
  const sev = SEV[top.level] || SEV.ok;
  const goTo = () => { if (window.njGoAlarm) window.njGoAlarm(top); else window.__njGoAlarms && window.__njGoAlarms("Active", null); };
  return (
    <div className={"annun annun-" + top.level} role="alert" aria-live="assertive" data-lvl={top.level}>
      <span className="annun-sev" style={{ background: sev.dot }}>{(SEV[top.level] || {}).label || top.level}</span>
      <button className="annun-main" onClick={goTo} title="Open this alarm in the list">
        <span className="annun-txt">{top.alarm}</span>
        <span className="annun-meta">
          <span className="tag">{top.tag}</span>
          {top.area && <span className="annun-area">{top.area}</span>}
          <span className="annun-age data">{annAge(top.since)}{isStale(top) ? " · stale" : ""}</span>
        </span>
      </button>
      <div className="annun-actions">
        <button className="annun-ack" onClick={() => ackAlarms(top.id)} title="Acknowledge this alarm"><Icon name="check" size={15} /> Acknowledge</button>
        <button className="annun-more" onClick={() => window.__njGoAlarms && window.__njGoAlarms("Active", null)} title="View all active alarms">
          {rest > 0 ? "+" + rest + " more unacknowledged" : "View active"} <Icon name="arrow-up-right" size={13} />
        </button>
      </div>
    </div>
  );
}

// ---- live facility clock (ticks forward from the seeded NJ_NOW reference) ----
function njFmtTs(ts) {
  const d = new Date(ts); const p = (n) => String(n).padStart(2, "0");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return p(d.getDate()) + " " + mon + " " + d.getFullYear() + " · " + p(d.getHours()) + ":" + p(d.getMinutes());
}
const NJ_CLOCK_T0 = Date.now();
function njClockNow() { return (window.NJ_NOW || NJ_CLOCK_T0) + (Date.now() - NJ_CLOCK_T0); }
function NjClock() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { const id = setInterval(force, 15000); return () => clearInterval(id); }, []);
  return <span className="tb-clock data" title="Facility time">{njFmtTs(njClockNow())}</span>;
}

// ---- App shell wrapper ----
// When `systemLabel` is given, the top-bar status dot is derived from the current facility
// context's FACILITY status — so a screen always corresponds to the site plan.
function AppShell({ active, title, crumbs, statusLevel, children, collapsed, scope, systemLabel }) {
  const { building, dept } = useCtx();
  let sev = statusLevel;
  if (systemLabel && building && dept) sev = njSev(njSystemStatus(building.id, dept.id, systemLabel));
  return (
    <div className="app">
      <Sidebar active={active} collapsed={collapsed} />
      <div className="main">
        <TopBar title={title} crumbs={crumbs} statusLevel={sev} scope={scope} />
        <AlarmAnnunciator />
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---- shared table pagination (one implementation for every long list) ----
   usePaged(rows) owns page + rows-per-page and clamps the page when the
   filtered set shrinks. <NjPager> renders the control; <RowsSelect> the
   rows-per-page picker; <PageFoot> the honest "Showing x–y of n" count. */
function usePaged(rows, initialPer) {
  const [per, setPer] = React.useState(initialPer || 25);
  const [page, setPage] = React.useState(1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  React.useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const p = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (p - 1) * per + 1;
  const to = Math.min(total, p * per);
  return { rows: rows.slice((p - 1) * per, p * per), page: p, setPage, per, setPer, total, totalPages, from, to };
}

function NjPager({ page, totalPages, onGo }) {
  if (totalPages <= 1) return null;
  const win = [];
  let a = Math.max(1, page - 2), b = Math.min(totalPages, a + 4);
  a = Math.max(1, b - 4);
  for (let n = a; n <= b; n++) win.push(n);
  return (
    <div className="pager">
      <button className="pg link" disabled={page === 1} onClick={() => onGo(1)}>First</button>
      <button className="pg" disabled={page === 1} onClick={() => onGo(page - 1)} aria-label="Previous page"><Icon name="chevron-left" size={14} /></button>
      {a > 1 && <span className="pg pg-ell">…</span>}
      {win.map((n) => <button key={n} className={"pg" + (n === page ? " active" : "")} onClick={() => onGo(n)} aria-current={n === page ? "page" : undefined}>{n}</button>)}
      {b < totalPages && <span className="pg pg-ell">…</span>}
      <button className="pg" disabled={page === totalPages} onClick={() => onGo(page + 1)} aria-label="Next page"><Icon name="chevron-right" size={14} /></button>
      <button className="pg link" disabled={page === totalPages} onClick={() => onGo(totalPages)}>Last</button>
    </div>
  );
}

function RowsSelect({ per, onPick, options }) {
  const opts = options || [25, 50, 100, 200];
  return (
    <span className="rows-select">Show
      <select className="select rows-select-input" value={per} onChange={(e) => onPick(Number(e.target.value))} aria-label="Rows per page">
        {opts.map((n) => <option key={n} value={n}>{n} rows</option>)}
      </select>
    </span>
  );
}

function PageFoot({ pg, noun, extra }) {
  return (
    <div className="tbl-foot">
      <RowsSelect per={pg.per} onPick={(n) => { pg.setPer(n); pg.setPage(1); }} />
      <span className="small">
        {pg.total === 0 ? "No " + noun : "Showing " + pg.from + "–" + pg.to + " of " + pg.total.toLocaleString() + " " + noun}
        {extra ? " · " + extra : ""}
      </span>
      <NjPager page={pg.page} totalPages={pg.totalPages} onGo={pg.setPage} />
    </div>
  );
}

// Keyboard activation for non-<button> elements that carry role="button" (SVG mimic
// groups, clickable cards/rows). Spreading this gives them tabIndex + Enter/Space, so a
// role="button" is never a mouse-only control (WCAG 2.1.1).
function njActivate(fn) {
  return {
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); e.stopPropagation(); fn(e); }
    },
  };
}

Object.assign(window, { njActivate, njCheckable, SEV, Dot, Badge, Check, KpiCard, Card, Sidebar, TopBar, AppShell, AlarmAnnunciator, NjClock, njFmtTs, njClockNow, NAV, FACILITY, FACILITY_OTHER, useCtx, setCtx, ctxStore, njPickContext, njDeptSystemFallback, njDeptHasSystem, njResolveArea, njGoArea, njGoSystem, AreaLink, njSev, njSystemStatus, themeStore, useTheme, njSetTheme, densityStore, useDensity, collapseStore, useCollapsed, usePaged, NjPager, RowsSelect, PageFoot });
