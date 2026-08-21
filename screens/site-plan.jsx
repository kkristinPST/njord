// site-plan.jsx — Navigation page = top-down facility site plan.
// Buildings are footprints on a plot; departments are zones inside; systems are
// nodes. Clicking a system deep-links into its mimic (NavigationView sub-router).

// status normalize: FACILITY uses ok / warning / critical
function planSev(s) { return s === "critical" ? "critical" : s === "warning" ? "high" : "ok"; }
function planWorst(systems) {
  let w = "ok";
  for (const s of systems) { const n = planSev(s.status); if (n === "critical") return "critical"; if (n === "high") w = "high"; }
  return w;
}

// open a system from the plan. NavigationView is mounted while the plan shows,
// so switch its sub-route in place via __njDeptTab; feeding-type → Feeding screen.
function njPlanOpen(bId, dId, label) {
  setCtx(bId, dId);
  if (label === "Feeding" || label === "Fish Feeding") {
    if (window.__njNavigate) window.__njNavigate("feeding");
    return;
  }
  window.__njNavSub = label;
  if (window.__njDeptTab) window.__njDeptTab(label);
  else if (window.__njNavigate) window.__njNavigate("navigation");
}

function PlanNode({ bId, dId, label, icon, status }) {
  const sev = planSev(status);
  return (
    <button className="pnode" data-st={sev} onClick={() => njPlanOpen(bId, dId, label)} title={"Open " + label}>
      <Icon name={icon} size={14} color="var(--slate-500)" />
      <span className="pnode-l">{label}</span>
      <span className="pnode-go"><Icon name="chevron-right" size={14} /></span>
      <Dot level={sev} size={9} />
    </button>
  );
}

function DeptZone({ bId, dept }) {
  const worst = planWorst(dept.systems);
  return (
    <div className="zone" data-worst={worst}>
      <div className="zone-head">
        <span className="zone-id">{dept.name}</span>
        <span className="zone-sub">{dept.sub}</span>
        <span className="zone-count">{dept.systems.length}</span>
      </div>
      <div className="zone-grid">
        {dept.systems.map((s, i) => (
          <PlanNode key={i} bId={bId} dId={dept.id} label={s.label} icon={s.icon} status={s.status} />
        ))}
      </div>
    </div>
  );
}

// "Other" group — facility-wide utilities that don't belong to any building/department.
// Clicking a node opens its top-level route (not a dept sub-route).
function njOtherOpen(route) {
  window.__njNavSub = "plan"; // keep Navigation's sub-router parked on the plan
  if (window.__njNavigate) window.__njNavigate(route);
}
function OtherFootprint() {
  return (
    <section className="bfoot bfoot-other" data-worst="ok">
      <header className="bfoot-head">
        <div className="bfoot-id">
          <Icon name="layout-grid" size={16} color="var(--slate-500)" />
          <span>Other</span>
        </div>
        <div className="bfoot-meta">
          <span className="bfoot-n">Facility utilities</span>
        </div>
      </header>
      <div className="bfoot-rule"></div>
      <div className="bfoot-body">
        <div className="zone" data-worst="ok">
          <div className="zone-head">
            <span className="zone-id">Utilities</span>
            <span className="zone-sub">Facility-wide</span>
            <span className="zone-count">{FACILITY_OTHER.length}</span>
          </div>
          <div className="zone-grid">
            {FACILITY_OTHER.map((u, i) => (
              <button key={i} className="pnode" data-st={planSev(u.status)} onClick={() => njOtherOpen(u.route)} title={"Open " + u.label}>
                <Icon name={u.icon} size={14} color="var(--slate-500)" />
                <span className="pnode-l">{u.label}</span>
                <span className="pnode-go"><Icon name="chevron-right" size={14} /></span>
                <Dot level={planSev(u.status)} size={9} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildingFootprint({ building }) {
  const allSys = building.depts.reduce((a, d) => a.concat(d.systems), []);
  const worst = planWorst(allSys);
  return (
    <section className="bfoot" data-worst={worst}>
      <header className="bfoot-head">
        <div className="bfoot-id">
          <Icon name="building-2" size={16} color="var(--slate-500)" />
          <span>{building.name}</span>
        </div>
        <div className="bfoot-meta">
          <span className="bfoot-st" data-st={worst}>
            <Dot level={worst} size={7} /> {worst === "ok" ? "Nominal" : worst === "high" ? "Warning" : "Critical"}
          </span>
          <span className="bfoot-n">{allSys.length} systems</span>
        </div>
      </header>
      <div className="bfoot-rule"></div>
      <div className="bfoot-body">
        {building.depts.map((d) => <DeptZone key={d.id} bId={building.id} dept={d} />)}
      </div>
    </section>
  );
}

function FacilitySitePlan() {
  const totals = React.useMemo(() => {
    let depts = 0, systems = 0, warn = 0, crit = 0;
    FACILITY.forEach((b) => b.depts.forEach((d) => {
      depts += 1; systems += d.systems.length;
      d.systems.forEach((s) => { const v = planSev(s.status); if (v === "critical") crit += 1; else if (v === "high") warn += 1; });
    }));
    return { depts, systems, warn, crit };
  }, []);
  const facilityWorst = totals.crit ? "critical" : totals.warn ? "high" : "ok";

  return (
    <AppShell active="navigation" title="Site Plan" crumbs={["Facility layout"]} statusLevel={facilityWorst} scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">
              Land-based RAS facility · {FACILITY.length} buildings · {totals.depts} departments · <span className="data">{totals.systems}</span> systems. Select any system to open its controls.
            </p>
          </div>
          <div className="plan-legend">
            <span className="pl-item"><Dot level="ok" size={8} /> Nominal</span>
            <span className="pl-item"><Dot level="high" size={8} /> Warning <span className="data">{totals.warn}</span></span>
            <span className="pl-item"><Dot level="critical" size={8} /> Critical <span className="data">{totals.crit}</span></span>
          </div>
        </div>
      </div>

      <div className="siteplan">
        {FACILITY.map((b) => <BuildingFootprint key={b.id} building={b} />)}
        <OtherFootprint />
      </div>
    </AppShell>
  );
}

Object.assign(window, { FacilitySitePlan, njPlanOpen, planSev, planWorst, njOtherOpen });
