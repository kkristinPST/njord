// alarms.jsx — Alarm List: Historical + All Alarms

// Row fill coding follows the legacy Alarm Status Table: hue = state, lightness = priority.
// Rows carry it as data so the matrix stays in CSS (only the legacy skin paints rows; the modern
// and dark skins keep their faint row-crit / row-warn tint). Normal / shelved / out-of-service and
// every diagnostic row are unfilled, exactly as the spec has them.
const NJ_ALM_STATE = { Activated: "unack", Acknowledged: "ack", Returned: "rtn", unack: "unack", ack: "ack", returned: "rtn" };
function njAlmRow(stateOrEvent, level) {
  const s = NJ_ALM_STATE[stateOrEvent];
  if (!s || level === "diagnostic") return null;
  return { "data-almstate": s, "data-almlvl": level };
}

// ---- alarm detail drawer (row → right-side panel) ----
const alarmDrawerStore = {
  id: null, subs: new Set(),
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
  snapshot() { return this.id; },
  open(id) { this.id = id; this.subs.forEach((f) => f()); },
  close() { this.id = null; this.subs.forEach((f) => f()); },
};
function useAlarmDrawer() { return React.useSyncExternalStore(alarmDrawerStore.sub.bind(alarmDrawerStore), alarmDrawerStore.snapshot.bind(alarmDrawerStore)); }
function openAlarmDrawer(id) { alarmDrawerStore.open(id); }

// deterministic recent-event trail for an alarm (display only)
function alarmDrawerEvents(row) {
  const seq = [];
  const analog = window.alarmIsAnalog && window.alarmIsAnalog(row);
  seq.push({ t: row.t !== "—" ? row.t : "recent", s: analog ? (row.alarm + ": threshold crossed") : (row.alarm + ": activated"), k: "act" });
  if (row.state === "ack") seq.push({ t: "+2 min", s: "Acknowledged · E. Sørensen", k: "info" });
  if (row.supp === "blocked") seq.push({ t: row.blockedAt || "+5 min", s: (row.auto ? "Blocked by logic" : "Blocked · " + (row.blockedBy || "operator")) + (row.blockReason ? " (" + row.blockReason + ")" : ""), k: "warn" });
  if (row.supp === "oos") seq.push({ t: row.oosAt || "+5 min", s: "Out of service · " + (row.oosBy || "operator") + (row.oosReason ? " (" + row.oosReason + ")" : ""), k: "warn" });
  seq.push({ t: "now", s: row.state === "returned" ? "Returned to normal" : "Standing " + (row.since ? Math.round(row.since) + "h" : "—"), k: "info" });
  return seq;
}

function AlarmDrawer() {
  const id = useAlarmDrawer();
  const hub = useAlarmHub();
  React.useEffect(() => {
    if (!id) return;
    const onKey = (e) => { if (e.key === "Escape") alarmDrawerStore.close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [id]);
  const row = id ? hub.rows.find((r) => r.id === id) : null;
  const open = !!row;
  const analog = row && window.alarmIsAnalog && window.alarmIsAnalog(row);
  return (
    <React.Fragment>
      {open && <div className="ad-scrim" onClick={() => alarmDrawerStore.close()} />}
      <aside className={"ad-drawer" + (open ? " open" : "")} aria-hidden={!open} role="dialog" aria-label="Alarm detail">
        {row && (
          <React.Fragment>
            <div className="ad-head">
              <div className="ad-head-l">
                <div className="ad-badges"><Badge level={row.level} /><StateTag state={row.state} />{row.supp !== "none" && <SuppTag supp={row.supp} />}</div>
                <div className="ad-alarm">{row.alarm}</div>
                <div className="ad-sub"><span className="tag">{row.tag}</span> · <AreaLink area={row.area} /></div>
              </div>
              <button className="ad-x" title="Close (Esc)" onClick={() => alarmDrawerStore.close()}><Icon name="x" size={20} /></button>
            </div>

            <div className="ad-body">
              <div className="ad-facts">
                <div className="ad-fact"><span className="ad-fact-l">First seen</span><span className="ad-fact-v data">{row.t}</span></div>
                <div className="ad-fact"><span className="ad-fact-l">Standing</span><span className="ad-fact-v data">{row.since ? Math.round(row.since) + " h" : "—"}{isStale(row) ? " · stale" : ""}</span></div>
                <div className="ad-fact"><span className="ad-fact-l">Priority</span><span className="ad-fact-v">{(SEV[row.level] || {}).label || row.level}</span></div>
                <div className="ad-fact"><span className="ad-fact-l">State</span><span className="ad-fact-v">{row.state}</span></div>
                {analog && row.meas && <div className="ad-fact"><span className="ad-fact-l">Measured</span><span className="ad-fact-v data">{row.meas.name} ({row.meas.tag})</span></div>}
                {row.supp === "blocked" && <div className="ad-fact"><span className="ad-fact-l">Blocked</span><span className="ad-fact-v">{row.auto ? "by logic" : (row.blockedBy || "operator")}{row.blockReason ? " (" + row.blockReason + ")" : ""}</span></div>}
                {row.supp === "oos" && <div className="ad-fact"><span className="ad-fact-l">Out of service</span><span className="ad-fact-v">{(row.oosBy || "operator")}{row.oosReason ? " (" + row.oosReason + ")" : ""}</span></div>}
              </div>

              {(() => { const rat = alarmRationale(row); if (!rat) return null; return (
                <React.Fragment>
                  <div className="ad-section-h ad-section-h-rat"><Icon name="clipboard-list" size={14} color="var(--slate-500)" /> Rationalized response
                    <span className="ad-rat-rt" title="Required operator response time (ISA-18.2)">{rat.responseTime}</span></div>
                  <div className="ad-rationale">
                    <div className="ad-rat-block"><span className="ad-rat-l">Consequence</span><p>{rat.consequence}</p></div>
                    <div className="ad-rat-block"><span className="ad-rat-l">Corrective action</span><p>{rat.action}</p></div>
                  </div>
                </React.Fragment>
              ); })()}

              <div className="ad-section-h">Event trail</div>
              <ol className="ad-timeline">
                {alarmDrawerEvents(row).map((e, i) => (
                  <li key={i} className={"ad-tl-item ad-tl-" + e.k}>
                    <span className="ad-tl-dot" /><span className="ad-tl-t data">{e.t}</span><span className="ad-tl-s">{e.s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="ad-foot">
              <button className="btn btn-secondary" onClick={() => { njInvestigateAlarm(row); alarmDrawerStore.close(); }}><Icon name="line-chart" size={16} /> Investigate</button>
              {row.supp === "none" && row.state === "unack" && <button className="btn btn-primary" onClick={() => njAckUndo(row.id)}><Icon name="check" size={16} /> Acknowledge</button>}
              {row.supp === "none" && row.state !== "unack" && (() => { const sh = njShelveRule(row); return (
                <button className="btn btn-secondary" disabled={!sh.ok} title={sh.ok ? "Block this alarm so it stops annunciating" : sh.why} onClick={() => openBlockDialog(row)}><Icon name={sh.ok ? "ban" : "lock"} size={16} /> Block</button>
              ); })()}
              {row.supp === "blocked" && !row.auto && <button className="btn btn-primary" onClick={() => reactivateAlarms(row.id)}><Icon name="bell" size={16} /> Reactivate</button>}
              {row.supp === "oos" && <button className="btn btn-primary" onClick={() => restoreAlarms(row.id)}><Icon name="bell" size={16} /> Return to service</button>}
            </div>
          </React.Fragment>
        )}
      </aside>
    </React.Fragment>
  );
}

function AlarmTabs({ active }) {
  const tabs = ["Active", "All Alarms", "Historical", "Statistics", "Deactivated", "Rationalization"];
  return (
    <div className="segmented">
      {tabs.map((t) => <button key={t} className={"seg" + (t === active ? " active" : "")} onClick={() => window.__njAlarmTab && window.__njAlarmTab(t)}>{t}</button>)}
    </div>
  );
}

// Renders the event it is GIVEN — the old two-way branch printed "Returned" for anything that
// was not "Activated", which silently mislabelled acknowledgements.
const NJ_EVT_DOT = { Activated: null, Acknowledged: "var(--warning)", Returned: "var(--slate-400)" };
function EventPill({ event, level }) {
  if (event === "Activated") {
    const s = SEV[level] || SEV.high;
    return <span className="evt"><span className="statusdot" style={{ background: s.dot }} /> Activated</span>;
  }
  return <span className={"evt " + (event === "Acknowledged" ? "acked" : "returned")}>
    <span className="statusdot" style={{ background: NJ_EVT_DOT[event] || "var(--slate-400)" }} /> {event}
  </span>;
}

// HIST now lives in lib/alarm-log.jsx (shared with the mobile alarm log).

// alarmMatch now lives in lib/alarm-log.jsx (shared with the mobile alarm log).

function AlarmHistoricalScreen() {
  const [q, setQ] = React.useState("");
  const hl = useAlarmHighlight();
  const rows = HIST.filter((r) => alarmMatch(r, q));
  const pg = window.usePaged(rows, 25);
  return (
    <AppShell active="alarms" title="Alarms" crumbs={["Historical"]} statusLevel="critical" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Alarm &amp; event log</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active="Historical" /></div>
        </div>
      </div>

      <div className="card">
        <div className="filterbar">
          <div className="field">
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter tag, area, description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="calendar" size={16} color="var(--slate-500)" /> Time Period</span>
            <span className="fbar-pair">
              <span className="dateinput">03-03-2026 00:00 <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
              <Icon name="arrow-right" size={14} color="var(--slate-400)" />
              <span className="dateinput">05-03-2026 00:00 <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
            </span>
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <ExportMenu describe={(fmt) => "Export started: alarm history will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
          </div>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <Th>Date / Time</Th><Th>Area</Th><Th>Tag</Th><Th>Alarm</Th>
              <Th>Event</Th><Th>Priority</Th><Th>Comment</Th><Th>User</Th>
              <th style={{ textAlign: "right" }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {pg.rows.map((r, i) => (
              <tr key={i} {...njAlmRow(r.event, r.level)} className={r.event === "Activated" ? (r.level === "critical" ? "row-crit" : "row-warn") : r.event === "Acknowledged" ? "row-ack" : "row-rtn"}>
                <td><span className="data td-strong">{r.t}</span></td>
                <td><AreaLink area={r.area} /></td>
                <td><span className="tag">{r.tag}</span></td>
                <td className="td-strong">{r.alarm}</td>
                <td><EventPill event={r.event} level={r.level} /></td>
                <td><Badge level={r.level} /></td>
                <td><span className="caption">—</span></td>
                <td><span className="small">{r.user}</span></td>
                <td style={{ textAlign: "right" }}><InvBtn row={Object.assign({}, r, { id: "H" + i, supp: "none", state: "returned" })} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <NjEmptyRow colSpan={9} reason={q.trim() ? "search" : "filtered"}
                title={q.trim() ? "No events match “" + q.trim() + "”" : "No events match the filter"}
                action={q.trim() ? <button className="btn btn-secondary btn-sm" onClick={() => setQ("")}>Clear search</button> : null} />
            )}
          </tbody>
        </table>
        </div>
        <window.PageFoot pg={pg} noun="events" extra="03–05 Mar 2026" />
      </div>
    </AppShell>
  );
}

// Severity filter order — highest priority first (Critical → Diagnostic), consistent with
// RATN_PRIOS / STAT_LEGEND / the SEV scale, so the most important alarm reads first (left→right).
const PRIO_FILTERS = [
  { label: "Critical", level: "critical" },
  { label: "High", level: "high" },
  { label: "Medium", level: "medium" },
  { label: "Low", level: "low" },
  { label: "Diagnostic", level: "diagnostic" },
];

// clickable priority filter chips, reused by Active + All Alarms
function PriorityChips({ value, onChange, counts }) {
  return (
    <span className="chips">
      {PRIO_FILTERS.map((p) => {
        const on = value === p.level;
        return (
          <button key={p.label} className={"chip chip-btn" + (on ? " chip-on" : "")}
            onClick={() => onChange(on ? null : p.level)} title={on ? "Clear filter" : "Show only " + p.label}>
            <span className="cdot" style={{ background: SEV[p.level].dot }} /> {p.label}
            {counts && <span className="chip-n data">{counts[p.level] || 0}</span>}
            {on && <span className="x"><Icon name="x" size={12} /></span>}
          </button>
        );
      })}
      {value && <button className="linkbtn" style={{ marginLeft: 2 }} onClick={() => onChange(null)}>Clear</button>}
    </span>
  );
}

// row-selection model shared by the interactive alarm tables
function useRowSelection() {
  const [sel, setSel] = React.useState(() => new Set());
  return {
    sel,
    has: (id) => sel.has(id),
    toggle: (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    setAll: (ids, on) => setSel(() => (on ? new Set(ids) : new Set())),
    clear: () => setSel(new Set()),
    size: sel.size,
  };
}

// dark bulk-action bar that appears when ≥1 row is selected
function BulkBar({ count, onClear, children }) {
  if (!count) return null;
  return (
    <div className="bulkbar">
      <Icon name="check-square" size={16} color="#fff" />
      <span className="bb-count">{count} selected</span>
      <span className="bb-spacer" />
      {children}
      <button className="bb-btn ghost" onClick={onClear}>Clear</button>
    </div>
  );
}

// alarm text + operator comment (rationalization note) shown when the alarm is active
function AlarmCell({ row }) {
  return (
    <div className="al-cell">
      <button className="al-cell-txt al-cell-btn" title="View alarm detail" onClick={(e) => { e.stopPropagation(); openAlarmDrawer(row.id); }}>{row.alarm}</button>
      {row.comment ? (
        <span className="al-note" title={row.comment}>
          <Icon name="message-square-text" size={12} /> {row.comment}
        </span>
      ) : null}
    </div>
  );
}

// per-row "investigate" button → opens the trend centered on the alarm event
function InvBtn({ row }) {
  return (
    <button className="icnact act-inv" title="Open the trend at the moment this alarm went off"
      onClick={(e) => { e.stopPropagation(); njInvestigateAlarm(row); }}><Icon name="line-chart" size={14} /> Trend</button>
  );
}

// per-row action buttons. variant: "active" (Ack/Block/OOS) | "blocked" | "oos"
function RowActions({ row }) {
  const supp = row.supp;
  const details = <button className="icnact act-details" title="Alarm details" aria-label="Alarm details" onClick={(e) => { e.stopPropagation(); openAlarmDrawer(row.id); }}><Icon name="panel-right-open" size={14} /></button>;
  if (supp === "blocked") {
    if (row.auto) return <span className="row-actions">{details}<InvBtn row={row} /><span className="caption">Logic-controlled</span></span>;
    return (
      <span className="row-actions">
        {details}
        <InvBtn row={row} />
        <button className="icnact act-ack" onClick={() => reactivateAlarms(row.id)} title="Unblock this alarm and return it to the active list"><Icon name="bell" size={14} /> Reactivate</button>
      </span>
    );
  }
  if (supp === "oos") {
    return (
      <span className="row-actions">
        {details}
        <InvBtn row={row} />
        <button className="icnact act-ack" onClick={() => restoreAlarms(row.id)} title="Return alarm to service"><Icon name="bell" size={14} /> Return to service</button>
      </span>
    );
  }
  return (
    <span className="row-actions">
      {details}
      <InvBtn row={row} />
      <button className="icnact act-ack" disabled={row.state !== "unack"} onClick={() => njAckUndo(row.id)}
        title={row.state === "unack" ? "Acknowledge" : "Already acknowledged"}><Icon name="check" size={14} /> Ack</button>
      {(() => { const sh = njShelveRule(row); return (
        <button className="icnact" disabled={!sh.ok} onClick={() => openBlockDialog(row)}
          title={sh.ok ? "Block this alarm so it stops annunciating" : sh.why}><Icon name={sh.ok ? "ban" : "lock"} size={14} /> Block</button>
      ); })()}
      <button className="icnact act-disable" onClick={() => openOosDialog(row)} title="Take out of service while maintenance work is under way"><Icon name="wrench" size={14} /> OOS</button>
    </span>
  );
}

// ---- Block dialog: turn an alarm off so it stops annunciating, with optional auto-reactivate ----
// Gated by njShelveRule (Alarm Philosophy ch. 5): critical alarms can never be blocked, and an
// alarm the master record marks Allow shelving = No cannot be blocked either. When nothing in the
// selection may be blocked the dialog refuses and offers the sanctioned alternative instead —
// out of service, which is administrative, attributed and has no timer.
function BlockRefusal({ rows, onDone }) {
  const crit = rows.filter((r) => r.level === "critical");
  const rec = rows.filter((r) => r.level !== "critical");
  return (
    <Dialog width={480}>
      <DlgHeader icon="lock" name={rows.length > 1 ? "These alarms cannot be blocked" : "This alarm cannot be blocked"} onClose={closeDialog} />
      <div className="shelve-body">
        <div className="shelve-deny">
          <Icon name="shield" size={16} color="var(--critical-text)" />
          <div>
            {crit.length > 0 && <p><b>{crit.length === 1 ? "Critical priority." : crit.length + " critical alarms."}</b> Blocking a critical alarm is not permitted — Alarm Philosophy ch. 5, ISA-18.2 §11.</p>}
            {rec.length > 0 && <p><b>{rec.length === 1 ? "Not permitted by the master record." : rec.length + " alarms are not permitted by the master record."}</b> Allow shelving is set to No during rationalization. Change it there, with a reason, before blocking here.</p>}
          </div>
        </div>
        <ul className="shelve-denylist">
          {rows.slice(0, 6).map((r) => (
            <li key={r.id}><Badge level={r.level} /> <span className="alarm-txt">{r.alarm}</span> <span className="tag">{r.tag}</span></li>
          ))}
          {rows.length > 6 && <li className="caption">+ {rows.length - 6} more</li>}
        </ul>
        <div className="shelve-note"><Icon name="info" size={14} color="var(--slate-400)" /> <span>If the instrument is faulty or under maintenance, take the alarm <b>out of service</b> instead: it stays deactivated under administrative control, with a work order and an owner, until it is manually returned.</span></div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { closeDialog(); setTimeout(() => openOosDialog(rows, onDone), 0); }}><Icon name="wrench" size={16} /> Take out of service</button>
      </div>
    </Dialog>
  );
}

function BlockDialog({ rows, ids, label, onDone, denied }) {
  const [mins, setMins] = React.useState(0);
  const [reason, setReason] = React.useState(BLOCK_REASONS[0]);
  return (
    <Dialog width={480}>
      <DlgHeader icon="ban" name={ids.length > 1 ? "Block alarms" : "Block alarm"} onClose={closeDialog} />
      <div className="shelve-body">
        <div className="shelve-target"><Icon name="ban" size={16} color="var(--slate-500)" /> <span className="alarm-txt">{label}</span></div>
        {denied > 0 && (
          <div className="shelve-partial">
            <Icon name="shield" size={14} color="var(--warning-text)" />
            <span><b>{denied} of {denied + ids.length}</b> cannot be blocked (critical priority, or Allow shelving = No on the master record) and will stay active.
              <button className="linkbtn" onClick={() => { closeDialog(); setTimeout(() => openOosDialog(rows.filter((r) => !njShelveRule(r).ok), onDone), 0); }}>Take those out of service</button></span>
          </div>
        )}
        <div>
          <span className="shelve-field-lbl">Reactivate</span>
          <div className="shelve-durations">
            {BLOCK_DURATIONS.map((d) => (
              <button key={d.mins} className={"shelve-dur" + (mins === d.mins ? " on" : "")} onClick={() => setMins(d.mins)}>{d.label}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="shelve-field-lbl">Reason (required for tracking)</span>
          <div className="shelve-reasons">
            {BLOCK_REASONS.map((r) => (
              <button key={r} className={"shelve-reason" + (reason === r ? " on" : "")} onClick={() => setReason(r)}><span className="rdot" /> {r}</button>
            ))}
          </div>
        </div>
        <div className="shelve-note"><Icon name="info" size={14} color="var(--slate-400)" /> <span>Blocked alarms are turned off and removed from the active list. They stay blocked until reactivated: set an auto-reactivate time above so a block is not left in place and forgotten.</span></div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { blockAlarms(ids, reason, mins); onDone && onDone(); closeDialog(); }}>Block{ids.length > 1 ? ` (${ids.length})` : ""}</button>
      </div>
    </Dialog>
  );
}
function openBlockDialog(target, onDone) {
  const rows = Array.isArray(target) ? target : [target];
  const split = njShelveSplit(rows);
  if (!split.ok.length) { openDialog(<BlockRefusal rows={split.no} onDone={onDone} />); return; }
  const ids = split.ok.map((r) => r.id);
  const label = rows.length > 1 ? `${ids.length} alarm${ids.length > 1 ? "s" : ""}` : `${rows[0].alarm} · ${rows[0].tag}`;
  openDialog(<BlockDialog rows={rows} ids={ids} label={label} denied={split.no.length} onDone={onDone} />);
}

// ---- Out-of-service dialog (ISA-18.2 §11.8): administrative suppression for maintenance ----
function OosDialog({ ids, label, onDone }) {
  const [reason, setReason] = React.useState("");
  return (
    <Dialog width={460}>
      <DlgHeader icon="wrench" name="Take out of service" onClose={closeDialog} />
      <div className="shelve-body">
        <div className="shelve-target"><Icon name="wrench" size={16} color="var(--slate-500)" /> <span className="alarm-txt">{label}</span></div>
        <div>
          <span className="shelve-field-lbl">Reason / work order</span>
          <input className="oos-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sensor swap: work order WO-4471" autoFocus />
        </div>
        <div className="shelve-note"><Icon name="alert-triangle" size={14} color="var(--warning)" /> <span>Out-of-service alarms stay deactivated under administrative control until manually returned: there is no automatic timeout. Manage via management-of-change.</span></div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-danger" onClick={() => { outOfServiceAlarms(ids, reason || "Maintenance"); onDone && onDone(); closeDialog(); }}>Take out of service</button>
      </div>
    </Dialog>
  );
}
function openOosDialog(target, onDone) {
  const arr = Array.isArray(target) ? target : [target];
  const ids = arr.map((r) => (typeof r === "string" ? r : r.id));
  const label = arr.length > 1 ? `${ids.length} selected alarm${ids.length > 1 ? "s" : ""}` : `${arr[0].alarm} · ${arr[0].tag}`;
  openDialog(<OosDialog ids={ids} label={label} onDone={onDone} />);
}

// shared bulk actions for the Active / All Alarms tables
// Every acknowledge in the app goes through njAckUndo: it reports what it actually silenced and
// offers Undo. An acknowledge is a silence, and the only action here that must be reversible.
// Mirrors the mobile surface exactly (MOBILE_AUDIT C3) — don't ack via ackAlarms() directly.
function njAckUndo(ids) {
  const done = ackAlarms(ids);
  if (!done.length) return;
  njToast(done.length === 1 ? "1 alarm acknowledged." : done.length + " alarms acknowledged.",
    "Undo", () => unackAlarms(done));
}

function AlarmBulkActions({ rows, sel, selVisible }) {
  const selUnack = rows.filter((r) => sel.has(r.id) && r.state === "unack").map((r) => r.id);
  const selRows = rows.filter((r) => sel.has(r.id));
  const blockable = selRows.filter((r) => njShelveRule(r).ok).length;
  const doBulk = (fn, ids) => { fn(ids); sel.clear(); };
  return (
    <BulkBar count={selVisible.length} onClear={sel.clear}>
      <button className="bb-btn" disabled={!selUnack.length} onClick={() => doBulk(njAckUndo, selUnack)}><Icon name="check" size={14} /> Acknowledge{selUnack.length ? ` (${selUnack.length})` : ""}</button>
      <button className="bb-btn" onClick={() => openBlockDialog(selRows, sel.clear)}
        title={blockable === selRows.length ? "Block the selected alarms" : `${selRows.length - blockable} of ${selRows.length} may not be blocked`}><Icon name="ban" size={14} /> Block{blockable !== selRows.length ? ` (${blockable})` : ""}</button>
      <button className="bb-btn" onClick={() => openOosDialog(selRows, sel.clear)}><Icon name="wrench" size={14} /> Out of service</button>
    </BulkBar>
  );
}

function ActiveAlarmsScreen({ filter = null }) {
  const hub = useAlarmHub();
  const sel = useRowSelection();
  const hl = useAlarmHighlight();
  const [q, setQ] = React.useState("");
  const setFilter = (lvl) => window.__njAlarmTab && window.__njAlarmTab("Active", lvl);
  const counts = alarmCounts();
  const active = hub.rows.filter(isActiveAlarm);
  const rows = (filter ? active.filter((r) => r.level === filter) : active).filter((r) => alarmMatch(r, q));
  const fLabel = filter ? (PRIO_FILTERS.find((p) => p.level === filter) || {}).label : null;
  const visibleIds = rows.map((r) => r.id);
  const selVisible = visibleIds.filter((id) => sel.has(id));
  const allOn = visibleIds.length > 0 && selVisible.length === visibleIds.length;

  return (
    <AppShell active="alarms" title="Alarms" crumbs={filter ? ["Active", fLabel] : ["Active"]} statusLevel={counts.critical ? "critical" : counts.high ? "high" : "ok"} scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{counts.total} standing · {counts.critical} critical · {counts.high} high · {counts.unack} unacknowledged{counts.stale ? ` · ${counts.stale} stale` : ""}</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active="Active" /></div>
        </div>
      </div>

      <div className="card">
        <div className="filterbar">
          <div className="field" style={{ minWidth: 220 }}>
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter tag, area, description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="sliders-horizontal" size={16} color="var(--slate-500)" /> Priority</span>
            <PriorityChips value={filter} onChange={setFilter} counts={counts} />
          </span>
          {/* live operator load (ch. 11): the count that says whether this is a busy shift or a
              flood. The threshold is the one number the alarm philosophy states. */}
          {(() => {
            const thr = (njAlarmTargets.data.flood10 || 10);
            const in10 = active.filter((r) => r.since != null && r.since <= 1 / 6).length;
            const inHr = active.filter((r) => r.since != null && r.since <= 1).length;
            const flood = in10 > thr;
            return (
              <React.Fragment>
                <span className="fbar-div" />
                <button className={"al-rate" + (flood ? " flood" : "")} onClick={() => window.__njAlarmTab && window.__njAlarmTab("Statistics")}
                  title={in10 + " alarms in the last 10 min, " + inHr + " in the last hour. Flood above " + thr + " / 10 min. Opens Statistics."}>
                  <Icon name="activity" size={14} />
                  <span className="al-rate-lbl">Alarm rate</span>
                  <span className="al-rate-v data">{in10}</span><span className="al-rate-u">/ 10 min</span>
                  <span className="al-rate-sep" />
                  <span className="al-rate-v data">{inHr}</span><span className="al-rate-u">/ 1 h</span>
                  {flood && <span className="al-rate-flood">FLOOD</span>}
                  <Icon name="arrow-up-right" size={14} />
                </button>
              </React.Fragment>
            );
          })()}
          <div style={{ marginLeft: "auto" }}>
            <button className="btn btn-secondary" disabled={!rows.some((r) => r.state === "unack")}
              onClick={() => {
                const ids = rows.filter((r) => r.state === "unack").map((r) => r.id);
                openDialog(<ConfirmDialog title={"Acknowledge all " + ids.length + " alarms?"}
                  message={"This accepts every standing unacknowledged alarm at once."}
                  detail="Alarms whose condition has not returned to normal stay active in the list. Undo is offered for a few seconds afterwards."
                  confirmLabel={"Acknowledge " + ids.length} onConfirm={() => njAckUndo(ids)} />);
              }}>
              <Icon name="check-check" size={16} /> Acknowledge all
            </button>
          </div>
        </div>

        <AlarmBulkActions rows={rows} sel={sel} selVisible={selVisible} />

        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}><Check on={allOn} indeterminate={selVisible.length > 0 && !allOn} onClick={() => sel.setAll(visibleIds, !allOn)} /></th>
              <Th>Date / Time</Th><Th>Area</Th><Th>Tag</Th><Th>Alarm</Th>
              <Th>Priority</Th><Th>State</Th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} {...njAlmRow(r.state, r.level)} className={(sel.has(r.id) ? "row-sel " : "") + (hl.includes(r.id) ? "row-hl " : "") + (r.state === "unack" && r.level === "critical" ? "row-crit" : r.state === "unack" && r.level === "high" ? "row-warn" : "")}>
                <td><Check on={sel.has(r.id)} onClick={() => sel.toggle(r.id)} /></td>
                <td><span className="data td-strong">{r.t}</span>{isStale(r) && <span className="stale-pill" title={`Standing ${Math.round(r.since)}h: exceeds 24h`}><Icon name="clock" size={12} /> STALE</span>}</td>
                <td><AreaLink area={r.area} strong /></td>
                <td><span className="tag">{r.tag}</span></td>
                <td><AlarmCell row={r} /></td>
                <td><Badge level={r.level} /></td>
                <td><StateTag state={r.state} /></td>
                <td><RowActions row={r} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              /* `resolved` may ONLY be used when nothing is narrowing the list. With a query or a
                 priority filter active, an empty table means "hidden", not "healthy" — claiming
                 the plant has no standing alarms while 18 are filtered out is the single most
                 dangerous thing this component could say. */
              <NjEmptyRow colSpan={8}
                reason={q.trim() ? "search" : filter ? "filtered" : "resolved"}
                title={q.trim() ? "No standing alarms match “" + q.trim() + "”"
                  : filter ? "No standing " + fLabel + " alarms — " + counts.total + " standing on other priorities"
                  : "No standing alarms."}
                action={(q.trim() || filter) ? <button className="btn btn-secondary btn-sm" onClick={() => { setQ(""); setFilter(null); }}>Clear filters</button> : null} />
            )}
          </tbody>
        </table>
        </div>
        <div className="tbl-foot">
          <span className="rows-select">Show <span className="select">100 rows <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span></span>
          <span className="small">{rows.length} of {counts.total} active{fLabel ? " · " + fLabel.toLowerCase() : ""}</span>
        </div>
      </div>
    </AppShell>
  );
}

function AllAlarmsScreen() {
  const hub = useAlarmHub();
  const sel = useRowSelection();
  const hl = useAlarmHighlight();
  const [prio, setPrio] = React.useState(null);
  const [q, setQ] = React.useState("");
  const counts = alarmCounts();
  // configured register = every annunciated alarm (active + normal); deactivated alarms live on their own tab
  const register = hub.rows.filter((a) => a.supp === "none");
  const regCounts = register.reduce((m, a) => { m[a.level] = (m[a.level] || 0) + 1; return m; }, {});
  const rows = (prio ? register.filter((r) => r.level === prio) : register).filter((r) => alarmMatch(r, q));
  const visibleIds = rows.map((r) => r.id);
  const selVisible = visibleIds.filter((id) => sel.has(id));
  const allOn = visibleIds.length > 0 && selVisible.length === visibleIds.length;

  return (
    <AppShell active="alarms" title="Alarms" crumbs={["All Alarms"]} statusLevel="critical" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Configured alarm register · {register.length} alarms · {counts.deactivated} deactivated</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active="All Alarms" /></div>
        </div>
      </div>

      <div className="card">
        <div className="filterbar">
          <div className="field" style={{ minWidth: 220 }}>
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter tag, area, description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="sliders-horizontal" size={16} color="var(--slate-500)" /> Priority</span>
            <PriorityChips value={prio} onChange={setPrio} counts={regCounts} />
          </span>
        </div>

        <AlarmBulkActions rows={rows} sel={sel} selVisible={selVisible} />

        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}><Check on={allOn} indeterminate={selVisible.length > 0 && !allOn} onClick={() => sel.setAll(visibleIds, !allOn)} /></th>
              <Th>Area</Th><Th>Tag</Th><Th>Alarm</Th><Th>Priority</Th><Th>State</Th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} {...njAlmRow(r.state, r.level)} className={(sel.has(r.id) ? "row-sel " : "") + (hl.includes(r.id) ? "row-hl" : "")}>
                <td><Check on={sel.has(r.id)} onClick={() => sel.toggle(r.id)} /></td>
                <td><AreaLink area={r.area} strong /></td>
                <td><span className="tag">{r.tag}</span></td>
                <td><AlarmCell row={r} /></td>
                <td><Badge level={r.level} /></td>
                <td><StateTag state={r.state} /></td>
                <td><RowActions row={r} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <NjEmptyRow colSpan={7} reason={q.trim() ? "search" : "filtered"}
                title={q.trim() ? "No alarms match “" + q.trim() + "”" : "No alarms match this filter"}
                action={<button className="btn btn-secondary btn-sm" onClick={() => { setQ(""); setPrio(null); }}>{q.trim() && prio ? "Clear filters" : q.trim() ? "Clear search" : "Clear filters"}</button>} />
            )}
          </tbody>
        </table>
        </div>
        <div className="tbl-foot">
          <span className="rows-select">Show <span className="select">100 rows <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span></span>
          <span className="small">{rows.length} of {register.length} configured</span>
        </div>
      </div>
    </AppShell>
  );
}

// ---- Deactivated: Blocked (operator/logic) + Out of service (maintenance) ----
function DeactivatedAlarmsScreen() {
  const hub = useAlarmHub();
  const sel = useRowSelection();
  const hl = useAlarmHighlight();
  const [, tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
  const counts = alarmCounts();
  const [q, setQ] = React.useState("");
  const [state, setState] = React.useState("All");
  const all = hub.rows.filter(isDeactivated);
  const rows = all.filter((r) => (state === "Blocked" ? r.supp === "blocked" : state === "Out of service" ? r.supp === "oos" : true)).filter((r) => alarmMatch(r, q));
  // operator-blocked + oos are restorable; logic-controlled blocks are read-only
  const restorable = rows.filter((r) => (r.supp === "blocked" && !r.auto) || r.supp === "oos").map((r) => r.id);
  const visibleIds = restorable;
  const selVisible = visibleIds.filter((id) => sel.has(id));
  const allOn = visibleIds.length > 0 && selVisible.length === visibleIds.length;
  const doBulk = (fn, ids) => { fn(ids); sel.clear(); };

  const detailFor = (r) => {
    if (r.supp === "blocked") {
      if (r.auto) return <span className="supp-detail"><span className="caption">Logic-controlled · {r.blockReason}</span></span>;
      const left = blockRemaining(r);
      return (
        <span className="supp-detail">
          <span className="dur-mono">{r.blockExp ? (left > 0 ? `reactivates in ${fmtRemaining(left)}` : "reactivating…") : "Until reactivated"}</span>
          <span className="caption">{r.blockReason} · {r.blockedBy}</span>
        </span>
      );
    }
    if (r.supp === "oos") return <span className="supp-detail"><span className="caption">{r.oosReason} · {r.oosBy} · {r.oosAt}</span></span>;
    return null;
  };

  return (
    <AppShell active="alarms" title="Alarms" crumbs={["Deactivated"]} statusLevel={all.length ? "medium" : "ok"} scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{counts.blocked} blocked · {counts.oos} out of service · these alarms are turned off and will not annunciate</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active="Deactivated" /></div>
        </div>
      </div>

      <div className="card">
        <div className="filterbar">
          <div className="field" style={{ minWidth: 220 }}>
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter tag, area, description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="sliders-horizontal" size={16} color="var(--slate-500)" /> Deactivation</span>
            <div className="segmented">
              {[["All", all.length], ["Blocked", counts.blocked], ["Out of service", counts.oos]].map(([s, c]) => (
                <button key={s} className={"seg" + (s === state ? " active" : "")} onClick={() => { setState(s); sel.clear(); }}>{s} <span className="seg-n">{c}</span></button>
              ))}
            </div>
          </span>
          {restorable.length > 0 && (
            <button className="linkbtn" style={{ marginLeft: "auto" }} onClick={() => sel.setAll(restorable, !allOn)}>
              {allOn ? "Clear selection" : "Select all " + restorable.length + (state === "Blocked" ? " blocked" : state === "Out of service" ? " out of service" : " restorable")}
            </button>
          )}
        </div>
        <BulkBar count={selVisible.length} onClear={sel.clear}>
          <button className="bb-btn" onClick={() => doBulk(restoreAlarms, selVisible)}><Icon name="bell" size={14} /> Return to active</button>
        </BulkBar>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}><Check on={allOn} indeterminate={selVisible.length > 0 && !allOn} onClick={() => sel.setAll(visibleIds, !allOn)} /></th>
              <Th>Deactivation</Th><Th>Area</Th><Th>Tag</Th><Th>Alarm</Th><Th>Priority</Th><Th>Detail</Th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selectable = (r.supp === "blocked" && !r.auto) || r.supp === "oos";
              return (
                <tr key={r.id} className={(sel.has(r.id) ? "row-sel " : "") + (hl.includes(r.id) ? "row-hl" : "")}>
                  <td>{selectable ? <Check on={sel.has(r.id)} onClick={() => sel.toggle(r.id)} /> : <span className="cbx" style={{ opacity: .3 }} />}</td>
                  <td><SuppTag supp={r.supp} /></td>
                  <td><AreaLink area={r.area} strong /></td>
                  <td><span className="tag">{r.tag}</span></td>
                  <td><AlarmCell row={r} /></td>
                  <td><Badge level={r.level} /></td>
                  <td>{detailFor(r)}</td>
                  <td><RowActions row={r} /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <NjEmptyRow colSpan={8} reason={all.length ? "filtered" : "resolved"}
                title={all.length ? "No deactivated alarms match this filter." : "No deactivated alarms — every alarm is annunciating normally."} />
            )}
          </tbody>
        </table>
        </div>
        <div className="tbl-foot">
          <span className="small">{rows.length === all.length ? rows.length + " deactivated" : rows.length + " of " + all.length + " deactivated"} · {counts.blocked} blocked · {counts.oos} out of service</span>
        </div>
      </div>
    </AppShell>
  );
}
// legacy alias
const SuppressedAlarmsScreen = DeactivatedAlarmsScreen;

function Th({ children }) {
  return <th className="sortable"><span className="th-in">{children} <Icon name="chevrons-up-down" size={12} color="var(--slate-400)" /></span></th>;
}

Object.assign(window, { AlarmHistoricalScreen, AllAlarmsScreen, ActiveAlarmsScreen, DeactivatedAlarmsScreen, SuppressedAlarmsScreen,
  AlarmTabs, useRowSelection, BulkBar, Th, AlarmDrawer, openAlarmDrawer });

