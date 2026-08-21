// screens-core.jsx — Dashboard (3 concepts), Alarm Center (3 concepts), Alarm Detail.
// The variant switcher appears only on Dashboard + Alarms so the user can compare concepts.

// ---- alarm actions (mutate the register + re-render ribbon/tabbar via navStore) ----
function mAck(id) {
  const a = M_ALARMS.find((x) => x.id === id); if (!a || a.state === "ack") return;
  const undo = { label: "Undo", fn: () => { a.state = "unack"; navStore._bump(); mToast("Acknowledgement undone · " + a.tag, "undo-2"); } };
  if (offlineStore.enqueue()) { a.state = "ack"; navStore._bump(); mToast("Queued: will sync when back online", "cloud-off", undo); return; }
  a.state = "ack"; navStore._bump(); mToast("Acknowledged · " + a.tag, "check", undo);
}
// Bulk ack is the one action that can silence the whole annunciator in a single tap, so it is
// gated by a confirm that names the count, and the toast carries an Undo (ISA-18.2 discourages
// an un-reversible mass acknowledge).
function mAckAll() {
  const un = M_ALARMS.filter((a) => a.state === "unack" && a.supp === "none");
  if (!un.length) { mToast("Nothing to acknowledge", "check-check"); return; }
  mConfirm({
    title: "Acknowledge all " + un.length + " alarms?",
    body: "This accepts every standing unacknowledged alarm at once. Alarms that have not returned to normal stay active in the list.",
    confirmLabel: "Acknowledge " + un.length,
    onConfirm: () => {
      const ids = un.map((a) => a.id);
      un.forEach((a) => (a.state = "ack")); navStore._bump();
      mToast(un.length + " alarms acknowledged", "check-check", { label: "Undo", fn: () => {
        ids.forEach((id) => { const a = M_ALARMS.find((x) => x.id === id); if (a) a.state = "unack"; });
        navStore._bump(); mToast("Acknowledgement undone", "undo-2");
      } });
    },
  });
}

// ---- deactivate sheet (Block / Out-of-service, ISA-18.2) — real workflow, not a toast ----
function DeactivateSheet({ row }) {
  const [mode, setMode] = React.useState("blocked");
  const [reason, setReason] = React.useState("Maintenance");
  const [custom, setCustom] = React.useState("");
  const [timer, setTimer] = React.useState(0);
  const REASONS = mode === "blocked" ? ["Maintenance", "Known fault", "Nuisance", "Testing", "Other"] : ["Repair", "Awaiting part", "Calibration", "Decommissioned", "Other"];
  const TIMERS = [["No timer", 0], ["1 h", 60], ["4 h", 240], ["8 h", 480], ["24 h", 1440]];
  React.useEffect(() => { setReason(REASONS[0]); }, [mode]);
  const finalReason = reason === "Other" ? custom.trim() : reason;
  const valid = !!finalReason;
  const confirm = () => {
    if (mode === "blocked") { mBlock([row.id], finalReason, timer); mToast("Blocked · " + row.tag + (timer ? " · auto-reactivates in " + TIMERS.find((t) => t[1] === timer)[0] : ""), "ban"); }
    else { mOos([row.id], finalReason); mToast("Out of service · " + row.tag, "wrench"); }
    mCloseSheet();
  };
  const s = MSEV[row.level];
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-inline" style={{ gap: 9, marginBottom: 4 }}><MBadge level={row.level} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{row.alarm}</div><div className="tag" style={{ fontSize: 11 }}>{row.tag}</div></div></div>
        <div className="m-confirm-t" style={{ margin: "12px 0 8px" }}>Deactivate alarm</div>
        <div className="m-seg" style={{ marginBottom: 12 }}>
          <button className={mode === "blocked" ? "on" : ""} onClick={() => setMode("blocked")}>Block</button>
          <button className={mode === "oos" ? "on" : ""} onClick={() => setMode("oos")}>Out of service</button>
        </div>
        <div className="m-de-help">{mode === "blocked" ? "Stops this alarm annunciating. Restorable, or set a timer to auto-reactivate." : "Marks equipment out for maintenance; no timeout: restore manually when back in service."}</div>
        <div className="m-note-field-l" style={{ marginTop: 14 }}>Reason</div>
        <div className="m-chips" style={{ flexWrap: "wrap" }}>{REASONS.map((r) => <button key={r} className={"m-chip" + (reason === r ? " on" : "")} onClick={() => setReason(r)}>{r}</button>)}</div>
        {reason === "Other" && <input className="m-input" style={{ marginTop: 10 }} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Describe the reason…" autoFocus />}
        {mode === "blocked" && <React.Fragment>
          <div className="m-note-field-l" style={{ marginTop: 16 }}>Auto-reactivate</div>
          <div className="m-chips" style={{ flexWrap: "wrap" }}>{TIMERS.map((t) => <button key={t[1]} className={"m-chip" + (timer === t[1] ? " on" : "")} onClick={() => setTimer(t[1])}>{t[0]}</button>)}</div>
        </React.Fragment>}
        <div className="m-actions" style={{ marginTop: 18 }}>
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-danger" disabled={!valid} onClick={confirm}><MIcon name={mode === "blocked" ? "ban" : "wrench"} size={16} /> {mode === "blocked" ? "Block alarm" : "Set out of service"}</button>
        </div>
      </div>
    </div>
  );
}
function mDeactivateAlarm(row) { mSheet(<DeactivateSheet row={row} />); }

// ---- quick-actions sheet (long-press) ----
const qaStore = { row: null, subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.row; }, open(r) { this.row = r; this.subs.forEach((f) => f()); }, close() { this.row = null; this.subs.forEach((f) => f()); } };
function useQA() { return React.useSyncExternalStore(qaStore.sub.bind(qaStore), qaStore.snap.bind(qaStore)); }
function QuickActionsSheet() {
  const row = useQA(); const box = React.useRef(null);
  React.useEffect(() => { if (row && box.current) { const t = setTimeout(() => box.current && box.current.focus(), 40); return () => clearTimeout(t); } }, [row && row.id]);
  if (!row) return null;
  const s = MSEV[row.level];
  const act = (fn, msg, icon) => { fn && fn(); qaStore.close(); if (msg) mToast(msg, icon); };
  return (
    <div className="m-sheet-scrim" onClick={() => qaStore.close()} onKeyDown={mTrapTab}>
      <div className="m-sheet" ref={box} role="dialog" aria-modal="true" aria-label={"Quick actions — " + row.alarm} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-grip" />
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 2px 12px" }}>
          <MBadge level={row.level} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{row.alarm}</div><div className="tag" style={{ fontSize: 11 }}>{row.tag}</div></div>
        </div>
        <div className="m-list">
          {row.state === "unack" && <button className="m-lrow" onClick={() => act(() => mAck(row.id))}><span className="m-lrow-ic" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}><MIcon name="check" size={19} /></span><div className="m-lrow-main"><div className="m-lrow-t">Acknowledge</div><div className="m-lrow-s">Silence and accept this alarm</div></div></button>}
          <button className="m-lrow" onClick={() => { qaStore.close(); mPush("alarmDetail", { id: row.id }); }}><span className="m-lrow-ic"><MIcon name="panel-right-open" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Open details</div><div className="m-lrow-s">Rationalized response &amp; trail</div></div></button>
          <button className="m-lrow" onClick={() => { qaStore.close(); mPush("chart", { alarmId: row.id }); }}><span className="m-lrow-ic"><MIcon name="line-chart" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Investigate trend</div><div className="m-lrow-s">Open the trigger value at the event</div></div></button>
          <button className="m-lrow" onClick={() => { qaStore.close(); mDeactivateAlarm(row); }}><span className="m-lrow-ic"><MIcon name="ban" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Deactivate</div><div className="m-lrow-s">Block or set out of service, with reason</div></div></button>
        </div>
      </div>
    </div>
  );
}

// ---- swipeable alarm row (swipe right → acknowledge; long-press → quick actions; tap → detail) ----
function MAlarmRow({ a, compact }) {
  const [dx, setDx] = React.useState(0); const startX = React.useRef(null); const lp = React.useRef(null); const moved = React.useRef(false);
  const s = MSEV[a.level]; const stale = a.min > 1440;
  const begin = (x) => { startX.current = x; moved.current = false; lp.current = setTimeout(() => { navigator.vibrate && navigator.vibrate(8); qaStore.open(a); }, 480); };
  const move = (x) => { if (startX.current == null) return; const d = x - startX.current; if (Math.abs(d) > 6) { moved.current = true; clearTimeout(lp.current); } if (a.state === "unack" && d > 0) setDx(Math.min(d, 120)); };
  const end = () => { clearTimeout(lp.current); if (dx > 78 && a.state === "unack") { mAck(a.id); } setDx(0); startX.current = null; };
  return (
    <div className="m-arow-wrap">
      {a.state === "unack" && <div className="m-arow-swipe"><MIcon name="check" size={18} /> Acknowledge</div>}
      <div className="m-arow" style={{ transform: `translateX(${dx}px)`, transition: startX.current == null ? "transform .2s" : "none" }}
        onClick={() => { if (!moved.current) mPush("alarmDetail", { id: a.id }); }}
        {...mActivate(() => mPush("alarmDetail", { id: a.id }), a.level + " alarm, " + a.area + ", " + a.alarm)}
        onTouchStart={(e) => begin(e.touches[0].clientX)} onTouchMove={(e) => move(e.touches[0].clientX)} onTouchEnd={end}
        onMouseDown={(e) => begin(e.clientX)} onMouseMove={(e) => e.buttons && move(e.clientX)} onMouseUp={end} onMouseLeave={() => { if (startX.current != null) end(); }}
        onContextMenu={(e) => { e.preventDefault(); qaStore.open(a); }}>
        <span className="m-arow-rail" data-lvl={a.level} style={{ background: s.dot }} />
        <div className="m-arow-body">
          <div className="m-arow-top">
            <MBadge level={a.level} />
            <span className="m-arow-area">{a.area}</span>
            {stale && <span className="m-arow-stale"><MIcon name="clock" size={10} /> stale</span>}
            <span className="m-arow-time data">{mAgo(a.min)}</span>
          </div>
          <div className="m-arow-alarm">{a.alarm}</div>
          {!compact && <div className="m-arow-meta"><span className="tag">{a.tag}</span>{a.val !== "—" && <span className="m-arow-val">{a.val} {a.unit}</span>}<MStat state={a.state} /></div>}
        </div>
      </div>
    </div>
  );
}

// ================= DASHBOARD =================
function VitalTile({ tank, kind, label, value, unit, sub, onClick }) {
  const st = tank ? mVital(kind, value) : "ok"; const s = MSEV[st];
  return (
    <div className="m-vital" data-st={st} onClick={onClick} {...(onClick ? mActivate(onClick, label + " " + value + " " + unit) : null)}>
      <span className="m-vital-rail" style={{ background: st === "ok" ? "var(--slate-200)" : s.dot }} />
      <div className="m-vital-lbl"><MIcon name={kind === "o2" ? "droplet" : kind === "temp" ? "thermometer" : kind === "co2" ? "wind" : "flask-conical"} size={12} /> {label}</div>
      <div className="m-vital-val">{value}<span className="u">{unit}</span></div>
      <div className="m-vital-sub" data-st={st === "ok" ? undefined : st}>{sub}</div>
    </div>
  );
}
function facilityVitals() {
  const act = M_TANKS.filter((t) => t.active);
  const o2 = act.reduce((m, t) => (t.o2 < m.o2 ? t : m));
  const co2 = act.reduce((m, t) => (t.co2 > m.co2 ? t : m));
  const tan = act.reduce((m, t) => (t.tan > m.tan ? t : m));
  const emg = act.filter((t) => t.emgO2);
  return { o2, co2, tan, emg, act };
}
function DashHealthStrip() {
  const c = mCounts();
  return (
    <div className="m-health">
      <div className="m-health-cell" onClick={() => { mTab("alarms"); }} {...mActivate(() => mTab("alarms"), c.critical + " critical alarms, open alarm list")}><div className="m-health-n" style={{ color: "var(--critical-text)" }}>{c.critical}</div><div className="m-health-l">Critical</div></div>
      <div className="m-health-cell" onClick={() => { mTab("alarms"); }} {...mActivate(() => mTab("alarms"), c.high + " high alarms, open alarm list")}><div className="m-health-n" style={{ color: "var(--warning-text)" }}>{c.high}</div><div className="m-health-l">High</div></div>
      <div className="m-health-cell" onClick={() => { mTab("alarms"); }} {...mActivate(() => mTab("alarms"), c.unack + " unacknowledged alarms, open alarm list")}><div className="m-health-n">{c.unack}</div><div className="m-health-l">Unack</div></div>
      <div className="m-health-cell" onClick={() => mPush("tankList", {})} {...mActivate(() => mPush("tankList", {}), "Open tank list")}><div className="m-health-n" style={{ color: "var(--primary-text)" }}>{facilityVitals().act.length}</div><div className="m-health-l">Tanks</div></div>
    </div>
  );
}
function DashTanks() {
  return (
    <React.Fragment>
      <div className="m-eyebrow">Tanks needing attention <button type="button" className="lnk" onClick={() => mPush("tankList", {})}>All tanks <MIcon name="chevron-right" size={13} /></button></div>
      <div className="m-alist">
        {M_TANKS.filter((t) => t.active && mO2Status(t.o2) !== "ok").map((t) => <MiniTank key={t.n} t={t} />)}
      </div>
    </React.Fragment>
  );
}
function MiniTank({ t }) {
  const st = mO2Status(t.o2);
  return (
    <div className="m-tank" onClick={() => mPush("tank", { n: t.n })} {...mActivate(() => mPush("tank", { n: t.n }), "Open " + t.name)}>
      <div className="m-tank-head">
        <span className="m-tank-name"><MDot level={st} size={9} /> {t.name} {t.emgO2 && <MBadge level="high">EMG O₂ OPEN</MBadge>}</span>
        <MIcon name="chevron-right" size={18} color="var(--slate-400)" />
      </div>
      <div className="m-tank-vitals">
        <div className="m-tv"><div className="m-tv-l">O₂ sat</div><div className="m-tv-v" data-st={st}>{t.o2.toFixed(1)}<span className="u">%</span></div></div>
        <div className="m-tv"><div className="m-tv-l">Temp</div><div className="m-tv-v">{t.temp.toFixed(1)}<span className="u">°C</span></div></div>
        <div className="m-tv"><div className="m-tv-l">CO₂</div><div className="m-tv-v" data-st={mVital("co2", t.co2)}>{t.co2.toFixed(1)}</div></div>
        <div className="m-tv"><div className="m-tv-l">Biomass</div><div className="m-tv-v">{t.biomass}<span className="u">t</span></div></div>
      </div>
    </div>
  );
}

function DashboardScreen() {
  useNav();
  const fv = facilityVitals();
  return (
    <React.Fragment>
      <MHeader title="Dashboard" sub="Fjordheim RAS · 3 buildings · 9 depts"
        right={<React.Fragment>
          <button className="m-icbtn" aria-label="Search" onClick={() => mSearch(true)}><MIcon name="search" size={19} /></button>
          <button className="m-icbtn" aria-label="Toggle outdoor mode" onClick={() => hcStore.toggle()}><HCPill /></button>
        </React.Fragment>} />
      <PullScroll>
        <div className="m-pad"><DashA fv={fv} /></div>
      </PullScroll>
    </React.Fragment>
  );
}
function HCPill() { const hc = useHC(); return <MIcon name={hc ? "sun" : "sliders-horizontal"} size={19} />; }

// Concept A — vitals-first (water chemistry leads, then health, then tanks, then alarms)
function DashA({ fv }) {
  const feed = M_ALARMS.filter((a) => mIsActive(a)).sort((x, y) => MSEV[x.level].rank - MSEV[y.level].rank || x.min - y.min).slice(0, 3);
  return (
    <React.Fragment>
      <div className="m-eyebrow">Water chemistry · live</div>
      <div className="m-vitals">
        <VitalTile tank kind="o2" label="Min O₂ sat" value={fv.o2.o2.toFixed(1)} unit="%" sub={"Tank " + fv.o2.n + " · setpoint 90 % · emergency 82 %"} onClick={() => mPush("tank", { n: fv.o2.n })} />
        <VitalTile tank kind="co2" label="Max CO₂" value={fv.co2.co2.toFixed(1)} unit="mg/L" sub={"Tank " + fv.co2.n + " · alarm limit 15"} onClick={() => mPush("tank", { n: fv.co2.n })} />
        <VitalTile tank kind="tan" label="Max TAN" value={fv.tan.tan.toFixed(2)} unit="mg/L" sub="Biofilter · alarm limit 1.50" onClick={() => mPush("tank", { n: fv.tan.n })} />
        <VitalTile kind="o2" label="Emergency O₂" value={fv.emg.length} unit={fv.emg.length === 1 ? "tank" : "tanks"} sub={fv.emg.length ? "Tank " + fv.emg[0].n + " valve open" : "all valves closed"} onClick={() => mPush("tankList", {})} />
      </div>
      <div className="m-eyebrow">Facility health</div>
      <DashHealthStrip />
      <DashTanks />
      <div className="m-eyebrow">Active alarms <button type="button" className="lnk" onClick={() => mTab("alarms")}>View all <MIcon name="chevron-right" size={13} /></button></div>
      <div className="m-alist">{feed.map((a) => <MAlarmRow key={a.id} a={a} compact />)}</div>
      <div className="m-eyebrow">Shortcuts</div>
      <div className="m-list">
        <button className="m-lrow" onClick={() => { window.mActivity && window.mActivity("Maneuvers"); mTab("activity"); }}><span className="m-lrow-ic"><MIcon name="history" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Maneuver History</div><div className="m-lrow-s">Recent setpoint &amp; state changes</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
        <button className="m-lrow" onClick={() => { window.mActivity && window.mActivity("Notes"); mTab("activity"); }}><span className="m-lrow-ic"><MIcon name="sticky-note" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Notes</div><div className="m-lrow-s">Operator log · welfare &amp; maintenance</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
      </div>
    </React.Fragment>
  );
}
// ================= ALARM CENTER =================
const PRIOS = ["all", "critical", "high", "medium", "low", "diagnostic"];
function AlarmsScreen() {
  useNav(); const [seg, setSeg] = React.useState("Active"); const c = mCounts();
  return (
    <React.Fragment>
      <MHeader title="Alarms" sub={c.total + " active · " + c.unack + " unack"}
        right={<React.Fragment><button className="m-icbtn" aria-label="Search" onClick={() => mSearch(true)}><MIcon name="search" size={19} /></button><button className="m-icbtn" aria-label="Alarm statistics" onClick={() => mPush("stats", {})}><MIcon name="bar-chart-2" size={19} /></button><button className="m-icbtn" aria-label="Rationalization register" onClick={() => mPush("rationalization", {})} title="Rationalization"><MIcon name="clipboard-list" size={19} /></button><button className="m-icbtn" aria-label="Acknowledge all alarms" onClick={mAckAll}><MIcon name="check-check" size={19} /></button></React.Fragment>} />
      <div style={{ padding: "0 16px 10px" }}><div className="m-seg">
        <button className={seg === "Active" ? "on" : ""} onClick={() => setSeg("Active")}>Active <span className="data" style={{ opacity: .7 }}>{c.total}</span></button>
        <button className={seg === "Deactivated" ? "on" : ""} onClick={() => setSeg("Deactivated")}>Deactivated <span className="data" style={{ opacity: .7 }}>{c.deactivated}</span></button>
      </div></div>
      {seg === "Active" ? <AlarmsA /> : <DeactivatedList />}
    </React.Fragment>
  );
}
// filterable severity list + swipe-ack
function AlarmsA() {
  const [prio, setPrio] = React.useState("all");
  const rows = M_ALARMS.filter((a) => mIsActive(a) && (prio === "all" || a.level === prio)).sort((x, y) => MSEV[x.level].rank - MSEV[y.level].rank || x.min - y.min);
  const cnt = (p) => M_ALARMS.filter((a) => mIsActive(a) && (p === "all" || a.level === p)).length;
  return (
    <PullScroll>
      <div style={{ padding: "0 16px 8px" }}>
        <div className="m-chips">{PRIOS.map((p) => <button key={p} className={"m-chip" + (prio === p ? " on" : "")} onClick={() => setPrio(p)}>{p === "all" ? "All" : MSEV[p].label} <span className="m-chip-n">{cnt(p)}</span></button>)}</div>
      </div>
      <div className="m-pad m-alist">
        {rows.length ? rows.map((a) => <MAlarmRow key={a.id} a={a} />) : <MEmpty label="No alarms in this filter" />}
        <button className="m-lrow" style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 14 }} onClick={() => mPush("rationalization", {})}><span className="m-lrow-ic"><MIcon name="clipboard-list" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Rationalization register</div><div className="m-lrow-s">Priority, consequence &amp; response per alarm</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
      </div>
    </PullScroll>
  );
}
// Deactivated list — Blocked / Out-of-service groups with restore (mirrors desktop Deactivated tab)
function DeactivatedList() {
  useNav();
  const blocked = M_ALARMS.filter((a) => a.supp === "blocked").sort((x, y) => MSEV[x.level].rank - MSEV[y.level].rank);
  const oos = M_ALARMS.filter((a) => a.supp === "oos").sort((x, y) => MSEV[x.level].rank - MSEV[y.level].rank);
  const Row = ({ a }) => {
    const left = mBlockLeft(a);
    return (
      <div className="m-de-row">
        <div className="m-de-main">
          <div className="m-inline" style={{ gap: 7, marginBottom: 3 }}><MBadge level={a.level} /><span className={"m-de-tag " + a.supp}>{a.supp === "blocked" ? "BLOCKED" : "OUT OF SERVICE"}</span></div>
          <div className="m-de-alarm">{a.alarm}</div>
          <div className="m-de-sub"><span className="tag">{a.tag}</span> · {a.area}</div>
          <div className="m-de-reason">{a.supp === "blocked" ? a.blockReason : a.oosReason} · {a.supp === "blocked" ? a.blockBy : a.oosBy}{left ? " · auto-reactivates in " + left : ""}</div>
        </div>
        <button className="m-de-restore" onClick={() => { mRestore([a.id]); mToast("Restored · " + a.tag, "rotate-ccw"); }}><MIcon name="rotate-ccw" size={14} /> Restore</button>
      </div>
    );
  };
  return (
    <PullScroll><div className="m-pad">
      {!blocked.length && !oos.length && <MEmpty label="No deactivated alarms" ok />}
      {blocked.length > 0 && <React.Fragment><div className="m-eyebrow">Blocked <span className="m-chip-n">{blocked.length}</span></div><div className="m-de-group">{blocked.map((a) => <Row key={a.id} a={a} />)}</div></React.Fragment>}
      {oos.length > 0 && <React.Fragment><div className="m-eyebrow">Out of service <span className="m-chip-n">{oos.length}</span></div><div className="m-de-group">{oos.map((a) => <Row key={a.id} a={a} />)}</div></React.Fragment>}
    </div></PullScroll>
  );
}

function MEmpty({ label, ok }) { return <div className="m-empty"><div className="m-empty-ic"><MIcon name={ok ? "check-circle-2" : "inbox"} size={28} /></div><div className="m-empty-t">{label}</div><div className="m-empty-s">Pull down to refresh</div></div>; }

// ================= ALARM DETAIL =================
function AlarmDetailScreen({ id }) {
  useNav(); const a = M_ALARMS.find((x) => x.id === id); if (!a) return null;
  const s = MSEV[a.level]; const stale = a.min > 1440;
  const trail = [
    { t: mAgo(a.min) + " ago", s: a.alarm + " activated", hot: true },
    { t: mAgo(a.min + 3) + " ago", s: a.tag + " crossed " + a.thr },
    { t: mAgo(a.min + 40) + " ago", s: "Value trending toward limit" },
    { t: mAgo(a.min + 180) + " ago", s: "Last within normal band" },
  ];
  return (
    <React.Fragment>
      <MHeader back title="Alarm detail" sub={a.area} right={<button className="m-icbtn" aria-label="Investigate trend" onClick={() => mPush("chart", { alarmId: a.id })}><MIcon name="line-chart" size={19} /></button>} />
      <div className="m-body">
        <PullScroll><div className="m-pad">
          <div className="mc" style={{ borderColor: s.dot, borderLeftWidth: 4, padding: 16 }}>
            <div className="m-inline" style={{ gap: 8, marginBottom: 9 }}><MBadge level={a.level} /><MStat state={a.state} />{stale && <span className="m-arow-stale"><MIcon name="clock" size={11} /> stale · {mAgo(a.min)}</span>}</div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.3px", lineHeight: 1.25 }}>{a.alarm}</div>
            <div className="m-inline" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}><span className="tag">{a.tag}</span>{a.val !== "—" && <span className="m-arow-val">{a.val} {a.unit}</span>}<span style={{ fontSize: 11.5, color: "var(--slate-500)" }}>Trip {a.thr}</span></div>
          </div>
          <div className="m-eyebrow">Rationalized response <button type="button" className="lnk" onClick={() => mPush("rationalization", { focus: a.tag })}>Register <MIcon name="chevron-right" size={13} /></button></div>
          <div className="m-rat">
            <div className="m-rat-h">Required operator response <span className="m-rat-rt">{a.resp}</span></div>
            <div className="m-rat-block"><div className="m-rat-l">Consequence</div><p>{a.cons}</p></div>
            <div className="m-rat-block"><div className="m-rat-l">Corrective action</div><p>{a.act}</p></div>
          </div>
          <div className="m-eyebrow">Facts</div>
          <div className="m-facts">
            <div className="m-fact"><div className="m-fact-l">Priority</div><div className="m-fact-v">{s.label}</div></div>
            <div className="m-fact"><div className="m-fact-l">Standing</div><div className="m-fact-v">{mAgo(a.min)}</div></div>
            <div className="m-fact"><div className="m-fact-l">Building</div><div className="m-fact-v" style={{ fontSize: 13 }}>{a.bld}</div></div>
            <div className="m-fact"><div className="m-fact-l">Tag</div><div className="m-fact-v" style={{ fontSize: 12.5 }}>{a.tag}</div></div>
          </div>
          <div className="m-eyebrow">Event trail</div>
          <div className="mc mc-pad"><div className="m-trail">{trail.map((e, i) => <div key={i} className={"m-trail-item" + (e.hot ? " hot" : "")}><span className="m-trail-dot" /><div className="m-trail-t">{e.t}</div><div className="m-trail-s">{e.s}</div></div>)}</div></div>
        </div></PullScroll>
        <div className="m-footbar">
          <div className="m-actions" style={{ marginTop: 0 }}>
            <button className="m-btn m-btn-secondary" onClick={() => mPush("chart", { alarmId: a.id })}><MIcon name="line-chart" size={17} /> Investigate</button>
            <button className="m-btn m-btn-secondary" onClick={() => mDeactivateAlarm(a)}><MIcon name="ban" size={17} /> Deactivate</button>
          </div>
          {a.state === "unack" && <button className="m-btn m-btn-ack" style={{ marginTop: 9, width: "100%" }} onClick={() => { mAck(a.id); mBack(); }}><MIcon name="check" size={18} /> Acknowledge</button>}
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { mAck, mAckAll, DeactivateSheet, mDeactivateAlarm, QuickActionsSheet, qaStore, MAlarmRow, DeactivatedList,
  DashboardScreen, AlarmsScreen, AlarmDetailScreen, MEmpty, facilityVitals, MiniTank, HCPill });
