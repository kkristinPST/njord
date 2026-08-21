// start.jsx — Facility Dashboard. Operations-first landing page: KPIs, a live active-alarm
// feed (each area links straight to its process screen), a compact per-building health rollup,
// and recent maneuvers. The full clickable facility navigator lives on the Navigation page.

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, diagnostic: 4 };

function dashAgo(h) {
  if (h == null) return "—";
  if (h < 1) return Math.max(1, Math.round(h * 60)) + "m";
  return Math.round(h) + "h";
}

// FACILITY status (ok/warning/critical) → severity level for dots/rails
function facSev(s) { return s === "critical" ? "critical" : s === "warning" ? "high" : "ok"; }
function deptWorst(dept) {
  let w = "ok";
  dept.systems.forEach((s) => { const v = facSev(s.status); if (v === "critical") w = "critical"; else if (v === "high" && w !== "critical") w = "high"; });
  return w;
}
function bldWorst(b) {
  let w = "ok";
  b.depts.forEach((d) => { const v = deptWorst(d); if (v === "critical") w = "critical"; else if (v === "high" && w !== "critical") w = "high"; });
  return w;
}

// ---- active-alarm feed row (whole row → Active list; area → process screen) ----
function DashAlarmRow({ a }) {
  const sev = SEV[a.level] || SEV.ok;
  return (
    <div className="dash-al" onClick={() => window.__njGoAlarms && window.__njGoAlarms("Active", null)} role="button"
      {...njActivate(() => window.__njGoAlarms && window.__njGoAlarms("Active", null))}
      title="Open in Active Alarms">
      <span className="dash-al-rail" style={{ background: sev.dot }} />
      <div className="dash-al-main">
        <div className="dash-al-top">
          <span className="dash-al-lvl" data-lvl={a.level}>{a.level}</span>
          <AreaLink area={a.area} strong />
          {isStale(a) && <span className="dash-al-stale" title={`Standing ${Math.round(a.since)}h`}><Icon name="clock" size={10} /> stale</span>}
          <span className="dash-al-time data">{dashAgo(a.since)}</span>
        </div>
        <div className="dash-al-txt">{a.alarm} <span className="tag">· {a.tag}</span></div>
      </div>
      <button className="dash-al-inv" title="Investigate: open the trend at this alarm"
        onClick={(e) => { e.stopPropagation(); njInvestigateAlarm(a); }}><Icon name="line-chart" size={14} /></button>
      <StateTag state={a.state} />
    </div>
  );
}

// ---- compact per-building health rollup (status only — not the full navigator) ----
function DashBuilding({ b }) {
  const worst = bldWorst(b);
  const sys = b.depts.reduce((n, d) => n + d.systems.length, 0);
  const openBld = () => { setCtx(b.id, b.depts[0].id); window.__njGoPlan ? window.__njGoPlan() : window.__njNavigate && window.__njNavigate("navigation"); };
  return (
    <div className="dash-bld" onClick={openBld}
      role="button" {...njActivate(openBld)} title={"Open " + b.name + " on the site plan"}>
      <div className="dash-bld-top">
        <span className="dash-bld-name"><Icon name="building-2" size={15} color="var(--slate-500)" /> {b.name}</span>
        <span className="dash-bld-st" data-st={worst}><Dot level={worst} size={7} /> {worst === "ok" ? "Nominal" : worst === "high" ? "Warning" : "Critical"}</span>
      </div>
      <div className="dash-bld-depts">
        {b.depts.map((d) => (
          <span key={d.id} className="dash-dept"><Dot level={deptWorst(d)} size={6} /> {d.name}</span>
        ))}
        <span className="dash-bld-n data">{sys} systems</span>
      </div>
    </div>
  );
}

const MANEUVERS = [
  { t: "04 Mar 2026 · 13:52", area: "DPT1 Fish Tank 2", sig: "O₂ saturation setpoint", from: "92.0 %", to: "94.0 %", type: "setpoint", op: "E. Sørensen" },
  { t: "04 Mar 2026 · 13:48", area: "DPT1 Fish Tank 2", sig: "Control valve mode", from: "Auto", to: "Manual", type: "mode", op: "E. Sørensen" },
  { t: "04 Mar 2026 · 13:42", area: "DPT2 MBBR", sig: "Biofilter recirculation pump", from: "Stopped", to: "Running", type: "state", op: "System" },
  { t: "04 Mar 2026 · 13:30", area: "DPT1 Drum filter", sig: "Backwash interval", from: "18 min", to: "12 min", type: "setpoint", op: "M. Haugen" },
  { t: "04 Mar 2026 · 13:23", area: "DPT2 CO₂-stripper", sig: "Stripper fan 2 override", from: "Auto 60 %", to: "Manual 85 %", type: "override", op: "M. Haugen" },
  { t: "04 Mar 2026 · 13:05", area: "DPT1 Fish Tank 3", sig: "Water level setpoint", from: "204 cm", to: "210 cm", type: "setpoint", op: "E. Sørensen" },
];

function StartScreen() {
  const hub = useAlarmHub();
  const ac = alarmCounts();
  const active = hub.rows.filter(isActiveAlarm)
    .sort((x, y) => (SEV_ORDER[x.level] - SEV_ORDER[y.level]) || (x.since - y.since));
  const feed = active.slice(0, 6);

  // ── exception-based process/fish metrics (worst-first, from real tank data) ──
  const tanks = window.TANK_PANELS || [];
  const o2s = window.o2Status;
  const activeTanks = tanks.filter((t) => t.active);
  const outBand = o2s ? activeTanks.filter((t) => o2s(t.o2, t) !== "ok") : [];
  const worstO2 = outBand.length ? outBand.reduce((m, t) => (t.o2 < m.o2 ? t : m)) : null;
  const overCap = activeTanks.filter((t) => t.maxBiomass && t.biomass > t.maxBiomass);
  const worstCap = overCap.length ? overCap.reduce((m, t) => (t.biomass / t.maxBiomass > m.biomass / m.maxBiomass ? t : m)) : null;
  const goFishTank = () => { setCtx("b1", "b1-d1"); if (window.__njDeptTab) window.__njDeptTab("Fish Tank"); else if (window.__njNavigate) window.__njNavigate("navigation"); };

  // ── facility water-chemistry vitals (worst-case, from real tank data + the alarm register) ──
  const o2MinTank = activeTanks.length ? activeTanks.reduce((m, t) => (t.o2 < m.o2 ? t : m)) : null;
  const measByName = (kw) => { const rows = window.alarmHub ? window.alarmHub.rows : []; const r = rows.find((x) => x.meas && new RegExp(kw, "i").test(x.meas.name)); return r ? r.meas : null; };
  const tan = measByName("TAN");
  const turb = measByName("turbid");
  const o2St = o2s && o2MinTank ? o2s(o2MinTank.o2, o2MinTank) : "ok";

  // ── notes: recent active notes + "new since last login" ──
  window.useNotes && window.useNotes();
  const notesStore = window.notesStore;
  const newNoteIds = notesStore ? notesStore.newIds() : [];
  const newNoteSet = new Set(newNoteIds);
  const recentNotes = notesStore ? notesStore.rows.filter((n) => !n.archived).slice(0, 2) : [];

  return (
    <AppShell active="start" title="Dashboard" crumbs={["Facility overview"]} statusLevel={ac.critical ? "critical" : ac.high ? "warning" : "ok"} scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Land-based RAS facility · 3 buildings · 9 departments · {window.njFmtTs ? window.njFmtTs(window.njClockNow()) : ""}</p>
          </div>
          <div className="pagehead-right">
            <button className="btn btn-secondary" onClick={() => window.__njNavigate && window.__njNavigate("maneuver")}><Icon name="history" size={15} /> Maneuver History</button>
            <button className="btn btn-primary" onClick={() => window.__njGoPlan ? window.__njGoPlan() : window.__njNavigate && window.__njNavigate("navigation")}><Icon name="map" size={15} /> Site Plan</button>
          </div>
        </div>
      </div>

      {/* Primary glance layer: live facility water-chemistry vitals (worst-case per tank/loop) */}
      <div className="kpi-eyebrow">Water chemistry · live</div>
      <div className="kpi-row kpi-vitals" style={{ marginBottom: 14 }}>
        <KpiCard label="Min O₂ Sat" value={o2MinTank ? o2MinTank.o2.toFixed(1) : "—"} unit="%"
          delta={o2MinTank ? `Tank ${o2MinTank.n} · emergency O₂ limit ${o2MinTank.emgLimit} %` : "no active tanks"}
          deltaDir={o2St === "ok" ? "up" : "down"} icon="droplet" onClick={goFishTank} />
        <KpiCard label="Tanks in Operation" value={String(activeTanks.length)} unit={"of " + tanks.length}
          delta={tanks.length - activeTanks.length ? (tanks.length - activeTanks.length) + " deactivated" : "all tanks active"}
          deltaDir="flat" icon="waves" onClick={goFishTank} />
        <KpiCard label="Max TAN" value={tan ? tan.base.toFixed(2) : "0.62"} unit="mg/L"
          delta={`Biofilter · alarm limit ${tan ? tan.thr.value.toFixed(2) : "1.50"} mg/L`}
          deltaDir="up" icon="flask-conical" onClick={() => { setCtx("b1", "b1-d1"); window.__njDeptTab ? window.__njDeptTab("RAS") : window.__njNavigate && window.__njNavigate("navigation"); }} />
        <KpiCard label="Max Turbidity" value={turb ? turb.base.toFixed(2) : "0.45"} unit="NTU"
          delta={`Drum filter out · alarm limit ${turb ? turb.thr.value.toFixed(1) : "1.0"} NTU`}
          deltaDir="up" icon="waves" onClick={() => { setCtx("b1", "b1-d1"); window.__njDeptTab ? window.__njDeptTab("Water Treatment") : window.__njNavigate && window.__njNavigate("navigation"); }} />
      </div>

      {/* Secondary: operational / administrative counts */}
      <div className="kpi-eyebrow">Operations</div>
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <KpiCard label="Active Alarms" value={String(ac.total)} delta={`${ac.critical} critical · ${ac.high} high`} deltaDir="down" icon="bell-ring" onClick={() => window.__njGoAlarms ? window.__njGoAlarms("Active", null) : window.__njNavigate && window.__njNavigate("alarms")} />
        <KpiCard label="Over Capacity" value={String(overCap.length)}
          delta={overCap.length ? `Tank ${worstCap.n} · ${Math.round(worstCap.biomass / worstCap.maxBiomass * 100)} % of max` : "all within limits"}
          deltaDir={overCap.length ? "down" : "up"} icon="gauge" onClick={goFishTank} />
        <KpiCard label="Mortality 7d" value="5.0" unit="k" delta="1.9 % of stock · ↓ vs prev week" deltaDir="up" icon="fish" onClick={() => window.__njNavigate && window.__njNavigate("biology")} />
        <KpiCard label="Deactivated" value={String(ac.deactivated)}
          delta={`${ac.blocked} blocked · ${ac.oos} out of service`}
          deltaDir={ac.deactivated ? "down" : "flat"} icon="bell-off" onClick={() => window.__njGoAlarms && window.__njGoAlarms("Deactivated", null)} />
      </div>

      <div className="start-grid">
        {/* primary: live active-alarm feed (spans the left, stretches to fill) */}
        <div className="card dash-alarms">
          <div className="card-head">
            <div className="card-head-l">
              <Icon name="bell-ring" size={17} color="var(--slate-600)" />
              <span className="card-title">Active Alarms</span>
              <span className="dash-al-count">{ac.total}</span>
            </div>
            <div className="dash-al-legend">
              <span className="dal-k"><Dot level="critical" size={7} /> <span className="data">{ac.critical}</span> critical</span>
              <span className="dal-k"><Dot level="high" size={7} /> <span className="data">{ac.high}</span> high</span>
              {ac.stale > 0 && <span className="dal-k dal-stale"><Icon name="clock" size={11} /> <span className="data">{ac.stale}</span> stale</span>}
            </div>
          </div>
          <div className="dash-al-list">
            {feed.length ? feed.map((a) => <DashAlarmRow key={a.id} a={a} />)
              : <div className="dash-empty"><Icon name="check-circle-2" size={22} color="var(--success)" /> No active alarms, all systems nominal.</div>}
          </div>
          <div className="tbl-foot" style={{ justifyContent: "space-between" }}>
            <span className="caption">Tip: click an area to jump to its process screen</span>
            <button className="linkbtn" onClick={() => window.__njGoAlarms && window.__njGoAlarms("Active", null)}>View all active <Icon name="arrow-up-right" size={14} /></button>
          </div>
        </div>

        {/* right top: facility rollup */}
        <div className="card dash-facility">
          <div className="card-head">
            <div className="card-head-l"><Icon name="map" size={17} color="var(--slate-600)" /><span className="card-title">Facility Status</span></div>
            <button className="linkbtn" onClick={() => window.__njGoPlan && window.__njGoPlan()}>Site Plan <Icon name="arrow-up-right" size={13} /></button>
          </div>
          <div className="dash-bld-list">
            {FACILITY.map((b) => <DashBuilding key={b.id} b={b} />)}
          </div>
        </div>

        {/* right bottom: notes */}
        <div className="card dash-notes">
          <div className="card-head">
            <div className="card-head-l"><Icon name="sticky-note" size={17} color="var(--slate-600)" /><span className="card-title">Notes</span>
              {newNoteIds.length > 0 && <span className="dash-al-count">{newNoteIds.length} new</span>}</div>
            <button className="linkbtn" onClick={() => window.openNotes && window.openNotes()}>All notes <Icon name="arrow-up-right" size={13} /></button>
          </div>
          <div className="dnote-list">
            {recentNotes.length ? recentNotes.map((n) => (
              <button key={n.id} className="dnote" onClick={() => window.openNotes && window.openNotes()} title="Open in Notes">
                {newNoteSet.has(n.id) && <div className="dnote-top"><span className="dnote-new">NEW</span></div>}
                {n.header && <div className="dnote-hd">{n.header}</div>}
                <div className="dnote-txt">{n.text}</div>
                <div className="dnote-meta">{n.tag ? <span className="tag">{n.tag}</span> : <span className="dnote-scope">{n.area}</span>}<span className="dnote-by">{n.by} · {n.ts}</span></div>
              </button>
            )) : <div className="dash-empty"><Icon name="check-circle-2" size={20} color="var(--slate-300)" /> No active notes.</div>}
          </div>
        </div>

        {/* full-width: comparative tank vitals (O₂ / level / pump sump) for one department */}
        {window.DashTankVitals ? <DashTankVitals /> : null}

        {/* full-width: input consumption glance → Consumption Overview */}
        {window.DashConsumption ? <DashConsumption /> : null}

        {/* full-width bottom: recent maneuvers (table, consistent with Maneuver History) */}
        <div className="card maneuver-panel dash-maneuver">
          <div className="card-head">
            <div className="card-head-l"><Icon name="history" size={17} color="var(--slate-600)" /><span className="card-title">Maneuver History</span></div>
            <button className="linkbtn" onClick={() => window.__njNavigate && window.__njNavigate("maneuver")}>View all <Icon name="arrow-up-right" size={13} /></button>
          </div>
          <table className="tbl dash-mvr-tbl">
            <thead>
              <tr><th>Date / Time</th><th>Area</th><th>Maneuver</th><th>Change</th><th>Operator</th></tr>
            </thead>
            <tbody>
              {MANEUVERS.map((m, i) => (
                <tr key={i} className={m.type === "override" ? "row-warn" : ""}>
                  <td><span className="data td-strong">{m.t}</span></td>
                  <td>{m.area}</td>
                  <td className="td-strong">{m.sig}</td>
                  <td><span className="mvr-arrow"><span className="mvr-chip">{m.from}</span><Icon name="arrow-right" size={12} color="var(--slate-400)" /><span className="mvr-chip strong">{m.to}</span></span></td>
                  <td>{m.op === "System"
                    ? <span className="evt returned"><Icon name="cpu" size={12} color="var(--slate-400)" /> System</span>
                    : <span className="small td-strong">{m.op}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

window.StartScreen = StartScreen;
