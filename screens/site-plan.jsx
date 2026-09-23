// site-plan.jsx — Navigation page = top-down facility site plan.
// Buildings are footprints on a plot; departments are zones inside; systems are
// nodes. Clicking a system deep-links into its mimic (NavigationView sub-router).

// status normalize: FACILITY uses ok / warning / critical. The seed value in the fixture is
// only a fallback — njSystemStatus overrides it from the live alarm store wherever the
// department/system can be resolved. One source of truth for "is this thing in alarm".
// Rail severities, worst first. `medium` is its own rail: folding it into amber claimed "high"
// about a medium alarm, and --medium is blue in this system.
const PLAN_RANK = ["critical", "high", "medium", "low", "ok"];
function planSev(s) { return s === "critical" ? "critical" : s === "warning" ? "high" : s === "medium" ? "medium" : s === "low" ? "low" : "ok"; }
function planLive(dId, s) { return window.njLiveSystemStatus ? window.njLiveSystemStatus(dId, s.label, s.status) : s.status; }
function planWorse(a, b) { return PLAN_RANK.indexOf(a) < PLAN_RANK.indexOf(b) ? a : b; }
function planLabel(sev) { return sev === "ok" ? "Nominal" : sev === "high" ? "Warning" : sev === "medium" ? "Medium" : sev === "low" ? "Low" : "Critical"; }
function planWorst(systems, dId) {
  let w = "ok";
  for (const s of systems) w = planWorse(planSev(dId ? planLive(dId, s) : s.status), w);
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

function PlanNode({ bId, dId, label, icon, status, hi }) {
  // status comes from the ALARM STORE, not from the fixture: a hard-coded "ok" on a system
  // carrying an unacknowledged critical is the worst thing this screen can print.
  const sev = planSev(window.njLiveSystemStatus ? window.njLiveSystemStatus(dId, label, status) : status);
  const hits = window.njSystemAlarms ? window.njSystemAlarms(dId, label) : [];
  // No inline count on the node. A number beside a severity rail cannot avoid being read as
  // "n of THAT severity", and any other reading contradicts the rail it sits next to. The rail
  // carries the state, the tooltip carries the breakdown.
  const byLevel = ["critical", "high", "medium", "low"].map((l) => [l, hits.filter((a) => a.level === l).length]).filter((x) => x[1]);
  return (
    <button className={"pnode" + (hi && sev !== hi ? " pnode-dim" : "")} data-st={sev} onClick={() => njPlanOpen(bId, dId, label)}
      title={hits.length ? label + " · " + hits.length + " standing: " + byLevel.map((x) => x[1] + " " + x[0]).join(", ") : "Open " + label}>
      <Icon name={icon} size={14} color="var(--slate-500)" />
      <span className="pnode-l">{label}</span>
      <span className="pnode-go"><Icon name="chevron-right" size={14} /></span>
      <Dot level={sev} size={9} />
    </button>
  );
}

// A department can carry 20+ systems. The zone shows the first PLAN_CAP and folds the rest —
// but ANY system in alarm is always visible, whatever its position: the plan exists to surface
// them, so a fold that could hide one would be worse than no fold at all.
const PLAN_CAP = 5;
const PLAN_EXP_LS = "nj_plan_expand_v1";
function planExpLoad() { try { const v = JSON.parse(localStorage.getItem(PLAN_EXP_LS)); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } }
function planExpSave(m) { try { localStorage.setItem(PLAN_EXP_LS, JSON.stringify(m)); } catch (e) {} }

function DeptZone({ bId, dept, hi }) {
  const worst = planWorst(dept.systems, dept.id);
  const all = dept.systems;
  const [open, setOpen] = React.useState(() => !!planExpLoad()[dept.id]);
  const toggle = () => setOpen((o) => { const n = !o; const m = planExpLoad(); if (n) m[dept.id] = 1; else delete m[dept.id]; planExpSave(m); return n; });
  const alerting = all.filter((s) => planSev(planLive(dept.id, s)) !== "ok");
  // a status filter must never leave a matching system inside a fold — same rule as the alarm
  // exemption below: the plan exists to surface these
  const forceOpen = !!hi && all.some((s) => planSev(planLive(dept.id, s)) === hi);
  // fold as soon as anything would be cut — "Show 1 more" is still worth the row
  const foldable = all.length > PLAN_CAP;
  const shown = !foldable || open || forceOpen ? all
    : (() => {
      const keep = new Set(alerting); // every alarm stays, even past the cap
      for (const s of all) { if (keep.size >= PLAN_CAP) break; keep.add(s); }
      return all.filter((s) => keep.has(s));
    })();
  const hidden = all.length - shown.length;
  return (
    <div className="zone" data-worst={worst}>
      <div className="zone-head">
        <span className="zone-id">{dept.name}</span>
        <span className="zone-sub">{dept.sub}</span>
        <span className="zone-count">{all.length}</span>
      </div>
      <div className="zone-grid">
        {shown.map((s, i) => (
          <PlanNode key={i} bId={bId} dId={dept.id} label={s.label} icon={s.icon} status={s.status} hi={hi} />
        ))}
      </div>
      {foldable && (
        <button className="zone-more" onClick={toggle} aria-expanded={open || forceOpen}>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={14} />
          {open ? "Show fewer" : "Show " + hidden + " more"}
          {!open && <span className="zone-more-note">all nominal</span>}
          {open && <span className="zone-more-note">{all.length} systems</span>}
        </button>
      )}
    </div>
  );
}

// "Other" group — facility-wide utilities that don't belong to any building/department.
// Clicking a node opens its top-level route (not a dept sub-route).
function njOtherOpen(route) {
  window.__njNavSub = "plan"; // keep Navigation's sub-router parked on the plan
  if (window.__njNavigate) window.__njNavigate(route);
}
function OtherFootprint({ hi }) {
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
              <button key={i} className={"pnode" + (hi && planSev(u.status) !== hi ? " pnode-dim" : "")} data-st={planSev(u.status)} onClick={() => njOtherOpen(u.route)} title={"Open " + u.label}>
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

function BuildingFootprint({ building, hi }) {
  const worst = building.depts.reduce((w, d) => planWorse(planWorst(d.systems, d.id), w), "ok");
  const allSys = building.depts.reduce((a, d) => a.concat(d.systems), []);
  return (
    <section className="bfoot" data-worst={worst}>
      <header className="bfoot-head">
        <div className="bfoot-id">
          <Icon name="building-2" size={16} color="var(--slate-500)" />
          <span>{building.name}</span>
        </div>
        <div className="bfoot-meta">
          {/* "CRITICAL 11 systems" read as "11 critical systems". They are two unrelated facts —
              the building's worst status, and how many systems it holds — so they get the same
              vertical rule the top bar uses between its own unrelated counts. */}
          <span className="bfoot-st" data-st={worst}>
            <Dot level={worst} size={7} /> {planLabel(worst)}
          </span>
          <span className="bfoot-div" aria-hidden="true" />
          <span className="bfoot-n">{allSys.length} systems</span>
        </div>
      </header>
      <div className="bfoot-rule"></div>
      <div className="bfoot-body">
        {building.depts.map((d) => <DeptZone key={d.id} bId={building.id} dept={d} hi={hi} />)}
      </div>
    </section>
  );
}

function FacilitySitePlan() {
  const hub = window.useAlarmHub ? window.useAlarmHub() : null;
  const totals = React.useMemo(() => {
    let depts = 0, systems = 0, warn = 0, crit = 0, med = 0, low = 0;
    const tally = (s, dId) => { const v = planSev(planLive(dId, s)); if (v === "critical") crit += 1; else if (v === "high") warn += 1; else if (v === "medium") med += 1; else if (v === "low") low += 1; };
    FACILITY.forEach((b) => b.depts.forEach((d) => {
      depts += 1; systems += d.systems.length;
      d.systems.forEach((s) => tally(s, d.id));
    }));
    // the Other group renders in the plan and the status filter dims it too, so it has to be in
    // the tally — counting buildings only claimed 34 systems while 37 nodes rendered, and the
    // chips lit 34. A count that does not match what its own filter affects is the defect this
    // row was rewritten to remove. (It is not a department, so `depts` is unchanged.)
    systems += FACILITY_OTHER.length;
    FACILITY_OTHER.forEach((u) => tally(u, null));
    return { depts, systems, warn, crit, med, low };
  }, [hub && hub.rows]);
  const facilityWorst = totals.crit ? "critical" : totals.warn ? "high" : "ok";
  // This row used to be half legend, half tally: "Nominal" carried no number while Warning and
  // Critical did, so it read as a colour key that happened to have counts — and nothing was
  // clickable, though anyone seeing "CRITICAL 1" tries to click it. All three now carry their
  // count AND filter the plan (matching systems stay, the rest dim; folds holding a match open).
  const [hi, setHi] = React.useState(null);
  // Medium and Low get their own chips because they now get their own rails — a legend that
  // stops at Warning cannot explain a blue rail, and rolling them into Warning is the amber
  // misuse this pass removed. They appear only when the facility actually has one.
  const sevCounts = { ok: totals.systems - totals.warn - totals.crit - totals.med - totals.low, high: totals.warn, critical: totals.crit, medium: totals.med, low: totals.low };
  const SEV_CHIPS = [["ok", "Nominal"], ["low", "Low"], ["medium", "Medium"], ["high", "Warning"], ["critical", "Critical"]].filter(([l]) => l === "ok" || l === "high" || l === "critical" || sevCounts[l] > 0);

  return (
    <AppShell active="navigation" title="Site Plan" crumbs={["Facility layout"]} statusLevel={facilityWorst} scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">
              Land-based RAS facility · {FACILITY.length} buildings · {totals.depts} departments · <span className="data">{totals.systems}</span> systems. Select any system to open its controls.
            </p>
          </div>
          <div className="plan-legend" role="group" aria-label="Filter the plan by system status">
            {SEV_CHIPS.map(([lvl, label]) => (
              <button key={lvl} className={"pl-item" + (hi === lvl ? " on" : "")} aria-pressed={hi === lvl}
                disabled={!sevCounts[lvl]}
                onClick={() => setHi((v) => (v === lvl ? null : lvl))}
                title={sevCounts[lvl] ? (hi === lvl ? "Show all systems again" : "Dim everything except the " + sevCounts[lvl] + " " + label.toLowerCase() + " system" + (sevCounts[lvl] === 1 ? "" : "s")) : "No " + label.toLowerCase() + " systems"}>
                <Dot level={lvl} size={8} /> {label} <span className="data">{sevCounts[lvl]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="siteplan">
        {FACILITY.map((b) => <BuildingFootprint key={b.id} building={b} hi={hi} />)}
        <OtherFootprint hi={hi} />
      </div>
    </AppShell>
  );
}

Object.assign(window, { FacilitySitePlan, njPlanOpen, planSev, planWorst, njOtherOpen });
