// ras.jsx — RAS Navigation screen shell + department sub-tabs + the Navigation sub-router.
// The faithful process mimic now lives in screens/ras-mimic.jsx (window.RasMimic).
// The 3-mode parameter dock lives in screens/ras-dock.jsx (window.RasDock).

// ── department sub-tabs (shared by the system mimic screens) ──
// Feeding-type systems route to the dedicated top-level Feeding screen; everything
// else becomes a Navigation sub-route resolved by the system-screen registry.
function njDeptNav(tab) {
  if (tab === "Feeding" || tab === "Fish Feeding") { if (window.__njNavigate) window.__njNavigate("feeding"); return; }
  window.__njNavSub = tab;
  if (window.__njDeptTab) window.__njDeptTab(tab);
  else if (window.__njNavigate) window.__njNavigate("navigation");
}
// derive the sub-tabs from the active department's systems (single source of truth);
// production departments also get a Fish Summary tab.
function njDeptTabLabels(dept) {
  const labels = dept.systems.map((s) => s.label);
  if (labels.includes("Fish Tank") && !labels.includes("Fish Summary")) labels.push("Fish Summary");
  return labels;
}
// Building/department scope is owned by the top-bar BreadcrumbScope (the only scope control).
// The in-page "Viewing Building/DPT" strip that used to sit here was a second, duplicated
// navigator — removed. Do not reintroduce it: the tab strip is for systems within the
// department, the top bar for the department itself.
// A department can own 20+ systems (Building 2 · Support systems has 22), so the strip shows
// the first DEPT_TAB_CAP — always including the active one — and folds the rest into a menu.
const DEPT_TAB_CAP = 6;
function DeptTabs({ active }) {
  const { dept } = useCtx();
  const tabs = njDeptTabLabels(dept);
  const [menu, setMenu] = React.useState(false);
  const [alignRight, setAlignRight] = React.useState(true);
  const wrap = React.useRef(null);
  const btn = React.useRef(null);
  // the strip wraps on narrow content, which puts this button at the LEFT edge — a fixed
  // right:0 anchor then hangs the menu off-screen. Pick the side that has room, at open time.
  const openMenu = () => {
    const r = btn.current && btn.current.getBoundingClientRect();
    if (r) setAlignRight(r.left + 214 > window.innerWidth - 12);
    setMenu((m) => !m);
  };
  React.useEffect(() => {
    if (!menu) return;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setMenu(false); };
    const esc = (e) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [menu]);
  const folded = tabs.length > DEPT_TAB_CAP + 1;
  let head = tabs, rest = [];
  if (folded) {
    head = tabs.slice(0, DEPT_TAB_CAP);
    rest = tabs.slice(DEPT_TAB_CAP);
    if (rest.includes(active)) { head = head.slice(0, DEPT_TAB_CAP - 1).concat(active); rest = tabs.filter((t) => !head.includes(t)); }
  }
  return (
    <div className="deptnav">
      <div className="segmented-wrap" ref={wrap}>
        <div className="segmented">
          {head.map((t) => <button key={t} className={"seg" + (t === active ? " active" : "")} onClick={() => njDeptNav(t)}>{t}</button>)}
        </div>
        {folded && (
          <div className="dtab-more-wrap">
            <button ref={btn} className="btn btn-secondary btn-sm" aria-expanded={menu} onClick={openMenu}
              title={"All " + tabs.length + " systems in " + dept.name}>
              <Icon name="chevron-down" size={14} /> {rest.length} more
            </button>
            {menu && (
              <div className="dtab-menu" role="menu" style={alignRight ? { right: 0 } : { left: 0, right: "auto" }}>
                {rest.map((t) => (
                  <button key={t} className="dtab-menu-item" role="menuitem" onClick={() => { setMenu(false); njDeptNav(t); }}>{t}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SVG mimic primitives removed — the faithful mimic is now screens/ras-mimic.jsx.

// ── parameter dock ──
// The 3-mode side dock (Parameters / Alarm limits / Trends) lives in screens/ras-dock.jsx
// as window.RasDock (loaded after this file). On this screen it opens as a right drawer.

function RASScreen({ active = "RAS" }) {
  const { dept } = useCtx();
  const isD2 = /-d2$/.test(dept.id) || dept.name === "DPT2";
  const Mimic = (isD2 && window.Dpt2RasMimic) ? window.Dpt2RasMimic : RasMimic;
  const dptName = dept.name || "DPT1";
  const [dock, setDock] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title={active} statusLevel="ok">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{active === "MBBR" ? "Bioreactor & recirculation loop · live" : "Recirculation loop · live"}</p>
          </div>
          <div className="pagehead-right"><DeptTabs active={active} /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={16} /> Parameters</button>
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={16} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={16} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name="git-merge" size={16} color="var(--slate-600)" /><span className="card-title">RAS Process · {dptName}</span></div>
          <span className="caption">Click equipment for controls · tap a value's trend icon to send it to Trends</span>
        </div>
        <div className="card-body rasm-body"><Mimic /></div>
        <ScadaLegend fluids={["proc","drain","o2","gas","chem"]} />
      </div>

      {/* parameter dock: slide-in drawer */}
      {dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
        <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={20} /></button>
        <RasDock />
      </div>

      {/* full-screen SCADA view */}
      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name="git-merge" size={16} /> RAS Process · {dptName} · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><ScadaZoom><Mimic /></ScadaZoom></div>
        </div>
      )}
    </AppShell>
  );
}

// FishSummaryView is defined in screens/fish-summary.jsx (loaded after this file).

// ── placeholder for systems not yet redesigned (keeps the Dept tabs + shell) ──
function SystemComingSoon({ label }) {
  return (
    <AppShell active="navigation" title={label} statusLevel="ok">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Process view not yet available for this system</p>
          </div>
          <div className="pagehead-right"><DeptTabs active={label} /></div>
        </div>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "72px 24px", textAlign: "center" }}>
        <span style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--slate-100)", color: "var(--slate-400)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="git-merge" size={24} />
        </span>
        <div className="body-strong">{label} is queued for redesign</div>
        <p className="body" style={{ maxWidth: 360, margin: 0 }}>This system view will follow in the next Navigation batch.</p>
      </div>
    </AppShell>
  );
}

// ── Navigation sub-router: department systems share the Dept tabs ──
// System screens register themselves on window.__njSystemScreens (label -> component).
function NavigationView() {
  const [sub, setSub] = React.useState(window.__njNavSub || "plan");
  React.useEffect(() => {
    window.__njDeptTab = setSub;
    setSub(window.__njNavSub || "plan");
    return () => { window.__njDeptTab = null; };
  }, []);
  if (sub === "plan") return <FacilitySitePlan />;
  if (sub === "Fish Tank") return <TankScreen />;
  if (sub === "RAS" || sub === "MBBR") return <RASScreen active={sub} />;
  if (sub === "Fish Summary") return <FishSummaryView />;
  const reg = window.__njSystemScreens || {};
  const Screen = reg[sub];
  return Screen ? <Screen /> : <SystemComingSoon label={sub} />;
}

Object.assign(window, { RASScreen, NavigationView, DeptTabs, njDeptNav, SystemComingSoon });

// Reset the Navigation route to the facility site plan (orientation view).
// Works whether or not NavigationView is currently mounted.
window.__njGoPlan = function () {
  window.__njNavSub = "plan";
  if (window.__njDeptTab) window.__njDeptTab("plan");
  else if (window.__njNavigate) window.__njNavigate("navigation");
};
