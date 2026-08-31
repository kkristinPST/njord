// equipment-tabs.jsx — extra equipment-popup tab bodies (loaded after equipment.jsx):
//   Overview extras (Motor data / Runtime / Start time / Maintenance), Log, Alarms, Notes, Admin.
// All reference window.* primitives at render time (Icon, Dot, Badge, SEV, njToast, ConfirmDialog…).

function eqHash(s) { let h = 0; s = s || ""; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function eqPad(n) { return String(n).padStart(2, "0"); }
function eqFmtDT(d) { return eqPad(d.getDate()) + "/" + eqPad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + eqPad(d.getHours()) + ":" + eqPad(d.getMinutes()) + ":" + eqPad(d.getSeconds()); }

// deterministic motor / runtime / start-count stats for the Overview tab
function eqStats(equip) {
  const h = eqHash(equip.tag || equip.name || "EQ");
  const running = equip.running !== false;
  const hz = (equip.readouts || []).find((r) => String(r.u) === "Hz");
  const freq = running ? (hz ? Math.round(parseFloat(hz.v)) : 40 + (h % 20)) : 0;
  const current = running ? +(freq * (8 + (h % 14))).toFixed(1) : 0;
  const power = running ? +(current * 0.11).toFixed(1) : 0;
  return {
    motor: { freq: freq.toFixed(1), current: current.toFixed(1), power: power.toFixed(1) },
    runtime: { today: running ? 4 + (h % 900) : (h % 6), yest: (h >> 3) % 1440, total: 20000 + (h % 20000) },
    starts: { today: h % 7, yest: (h >> 5) % 300, total: 500 + (h % 52000) },
  };
}
function EqStatGrid({ title, rows }) {
  return (
    <div className="eq-section">
      <div className="eq-section-h">{title}</div>
      <div className="eqx-stats">
        {rows.map((r, i) => (
          <div className="eqx-stat" key={i}>
            <span className="eqx-stat-l">{r.l}</span>
            <span className="data eqx-stat-v">{r.v}<span className="u"> {r.u}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
function EqOverviewExtras({ equip }) {
  if (!["pump", "blower", "drumfilter"].includes(equip.kind)) return null;
  const s = eqStats(equip);
  return (
    <React.Fragment>
      <EqStatGrid title="Motor data" rows={[{ l: "Frequency", v: s.motor.freq, u: "Hz" }, { l: "Current", v: s.motor.current, u: "A" }, { l: "Power", v: s.motor.power, u: "kW" }]} />
      <EqStatGrid title="Runtime" rows={[{ l: "Today", v: s.runtime.today, u: "min" }, { l: "Yesterday", v: s.runtime.yest, u: "min" }, { l: "Total", v: s.runtime.total, u: "hours" }]} />
      <EqStatGrid title="Start time" rows={[{ l: "Today", v: s.starts.today, u: "times" }, { l: "Yesterday", v: s.starts.yest, u: "times" }, { l: "Total", v: s.starts.total, u: "times" }]} />
      <button className="btn btn-secondary eqx-maint" onClick={() => openDialog(<MaintenanceLogDialog equip={equip} />)}>
        <Icon name="wrench" size={16} /> Maintenance
      </button>
    </React.Fragment>
  );
}

/* ── Maintenance log: history + log a new entry ── */
const MAINT_TYPES = ["Inspection", "Cleaning", "Service", "Repair", "Calibration", "Replacement"];
const MAINT_TECHS = ["E. Sørensen", "K. Garrett", "O. Vink", "J. Lawrence", "External · Aller Service"];
function genMaintLog(equip) {
  const h = eqHash(equip.tag || equip.name || "EQ");
  const rows = []; let d = new Date(2026, 4, 28, 10, 20);
  const notes = [
    "Scheduled inspection, no faults found.",
    "Cleaned impeller housing and cleared debris screen.",
    "Replaced worn seal; test-run 15 min OK.",
    "Firmware/setpoint check after PLC update.",
    "Lubricated bearings, torque checked.",
    "Calibration verified against reference.",
  ];
  const nextDue = new Date(d); nextDue.setMonth(nextDue.getMonth() + 3);
  for (let i = 0; i < 4; i++) {
    const k = (h >> (i * 3));
    rows.push({
      date: eqPad(d.getDate()) + "/" + eqPad(d.getMonth() + 1) + "/" + d.getFullYear(),
      type: MAINT_TYPES[k % MAINT_TYPES.length], tech: MAINT_TECHS[(k >> 2) % MAINT_TECHS.length],
      wo: "WO-" + (4000 + (k % 900)), note: notes[k % notes.length],
    });
    d = new Date(d.getTime() - (26 + (k % 40)) * 864e5);
  }
  return { rows, nextDue: eqPad(nextDue.getDate()) + "/" + eqPad(nextDue.getMonth() + 1) + "/" + nextDue.getFullYear() };
}
function MaintenanceLogDialog({ equip }) {
  const seed = React.useMemo(() => genMaintLog(equip), [equip.tag]);
  const [rows, setRows] = React.useState(seed.rows);
  const [adding, setAdding] = React.useState(false);
  const [f, setF] = React.useState({ type: MAINT_TYPES[0], tech: MAINT_TECHS[0], wo: "", note: "" });
  const setk = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.note.trim().length > 0;
  const now = new Date();
  const save = () => {
    const date = eqPad(now.getDate()) + "/" + eqPad(now.getMonth() + 1) + "/" + now.getFullYear();
    setRows((rs) => [{ date, type: f.type, tech: f.tech, wo: f.wo.trim() || "—", note: f.note.trim() }, ...rs]);
    setAdding(false); setF({ type: MAINT_TYPES[0], tech: MAINT_TECHS[0], wo: "", note: "" });
    njToast("Maintenance logged for " + equip.tag + ".", "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"));
  };
  return (
    <Dialog width={620}>
      <DlgHeader icon="wrench" name="Maintenance log" tag={equip.tag} onClose={closeDialog} />
      <div className="dlg-body eqx-tab">
        <div className="mnt-summary">
          <div className="mnt-sum-cell"><span className="mnt-sum-l">Last service</span><span className="mnt-sum-v">{rows[0] ? rows[0].date : "—"}</span></div>
          <div className="mnt-sum-cell"><span className="mnt-sum-l">Next due</span><span className="mnt-sum-v">{seed.nextDue}</span></div>
          <div className="mnt-sum-cell"><span className="mnt-sum-l">Entries</span><span className="mnt-sum-v data">{rows.length}</span></div>
          {!adding && <button className="btn btn-primary btn-sm mnt-add" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Log maintenance</button>}
        </div>

        {adding && (
          <div className="mnt-form">
            <div className="mnt-form-grid">
              <label className="de-field"><span className="de-field-l">Type</span>
                <select className="de-input" value={f.type} onChange={(e) => setk("type", e.target.value)}>{MAINT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </label>
              <label className="de-field"><span className="de-field-l">Technician</span>
                <select className="de-input" value={f.tech} onChange={(e) => setk("tech", e.target.value)}>{MAINT_TECHS.map((t) => <option key={t}>{t}</option>)}</select>
              </label>
              <label className="de-field"><span className="de-field-l">Work order (optional)</span>
                <input className="de-input" placeholder="WO-0000" value={f.wo} onChange={(e) => setk("wo", e.target.value)} />
              </label>
            </div>
            <label className="de-field"><span className="de-field-l">Work performed</span>
              <textarea className="de-input de-ta" rows={2} placeholder="Describe the work carried out…" value={f.note} onChange={(e) => setk("note", e.target.value)} />
            </label>
            <div className="mnt-form-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={!valid} onClick={save}><Icon name="check" size={14} /> Save</button>
            </div>
          </div>
        )}

        <div className="eqx-h"><Icon name="history" size={14} /> History</div>
        <table className="eqx-tbl mnt-tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Work order</th><th>Technician</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><span className="data">{r.date}</span></td>
                <td><span className="mvr-chip">{r.type}</span></td>
                <td><span className="tag">{r.wo}</span></td>
                <td>{r.tech}</td>
                <td className="mnt-note">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}

/* ── Log tab: state-change history ── */
function genEqLog(equip) {
  const h = eqHash(equip.tag || equip.name);
  const rows = []; const base = new Date(2026, 5, 1, 9, 18, 24); let t = base.getTime();
  for (let i = 0; i < 7; i++) {
    const startToStop = i % 2 === 1;
    rows.push({ t: eqFmtDT(new Date(t)), from: startToStop ? "Start" : "Stop", to: startToStop ? "Stop" : "Start" });
    t -= (8 + ((h >> i) % 34)) * 60000 + ((h >> (i + 2)) % 60) * 1000;
  }
  return rows;
}
function EqLogTab({ equip }) {
  const rows = genEqLog(equip);
  return (
    <div className="eqx-tab">
      <div className="eqx-h"><Icon name="history" size={14} /> Operation log</div>
      <table className="eqx-tbl">
        <thead><tr><th>Time</th><th>From</th><th></th><th>To</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td><span className="data">{r.t}</span></td>
              <td><span className="mvr-chip">{r.from}</span></td>
              <td className="eqx-arrow"><Icon name="arrow-right" size={14} color="var(--slate-400)" /></td>
              <td><span className="mvr-chip strong">{r.to}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Alarms tab: active alarms + alarm history ── */
const EQ_ACTIVE_ALARMS = [
  { a: "Communication error with drive", p: "high", s: "Normal" },
  { a: "General fault from drive", p: "critical", s: "Normal" },
  { a: "Missing operation feedback", p: "critical", s: "Normal" },
];
function genEqAlarmHist(equip) {
  const h = eqHash(equip.tag || equip.name);
  const names = ["Missing operation feedback", "Communication error with drive", "General fault from drive"];
  const rows = []; let t = new Date(2026, 5, 1, 17, 3, 0).getTime();
  for (let i = 0; i < 6; i++) {
    const d = new Date(t);
    rows.push({ t: eqPad(d.getDate()) + "/" + eqPad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + eqPad(d.getHours()) + ":" + eqPad(d.getMinutes()), a: names[(i + (h % 3)) % 3], s: "Returned" });
    t -= (6 + ((h >> i) % 40)) * 60000;
  }
  return rows;
}
function EqAlarmsTab({ equip }) {
  const hist = genEqAlarmHist(equip);
  return (
    <div className="eqx-tab">
      <div className="eqx-h"><Icon name="bell" size={14} /> Active alarms</div>
      {equip.status === "ok" || !equip.status ? (
        <NjInline align="left" icon="check-circle-2">No active alarms on this unit.</NjInline>
      ) : (
        <table className="eqx-tbl eqx-alm">
          <thead><tr><th>Alarm</th><th>Priority</th><th>State</th><th style={{ textAlign: "right" }}>Trend</th></tr></thead>
          <tbody>
            {EQ_ACTIVE_ALARMS.map((r, i) => {
              const sev = SEV[r.p] || SEV.low;
              return (
                <tr key={i}>
                  <td className="td-strong">{r.a}</td>
                  <td><span className="badge" style={{ background: sev.bg, color: sev.text }}>{sev.label}</span></td>
                  <td><span className="evt returned"><Dot level="ok" size={7} /> {r.s}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="icnact act-inv" title="Investigate: open the trend / event timeline"
                      onClick={() => njInvestigateAlarm({ id: "EQ-" + equip.tag + "-" + i, tag: equip.tag, area: equip.name || equip.tag, alarm: r.a, level: r.p, t: fmtFullTs(window.NJ_NOW), meas: null })}>
                      <Icon name="line-chart" size={14} /> Trend
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="eqx-h eqx-h2"><Icon name="history" size={14} /> Alarm history</div>
      <table className="eqx-tbl eqx-alm">
        <thead><tr><th>Time</th><th>Alarm</th><th>State</th></tr></thead>
        <tbody>
          {hist.map((r, i) => (
            <tr key={i}>
              <td><span className="data">{r.t}</span></td>
              <td>{r.a}</td>
              <td><span className="evt returned"><Icon name="corner-down-left" size={12} color="var(--slate-400)" /> {r.s}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Notes tab: Active / Archived / New (usable) ── */
function EqNotesTab({ equip }) {
  const store = useNotes();
  const [sub, setSub] = React.useState("active");
  const mine = store.rows.filter((n) => n.tag === equip.tag);
  const active = mine.filter((n) => !n.archived);
  const archived = mine.filter((n) => n.archived);
  const subs = [{ id: "active", label: "Active", icon: "sticky-note", n: active.length }, { id: "archived", label: "Archived", icon: "archive", n: archived.length }, { id: "new", label: "New note", icon: "pencil" }];
  const list = sub === "archived" ? archived : active;
  return (
    <div className="eqx-tab">
      <div className="segmented eqx-notetabs">
        {subs.map((s) => (
          <button key={s.id} className={"seg" + (s.id === sub ? " active" : "")} onClick={() => setSub(s.id)}>
            <Icon name={s.icon} size={14} /> {s.label}{s.n != null && s.n > 0 ? <span className="eqx-note-badge">{s.n}</span> : null}
          </button>
        ))}
        <button className="eqx-allnotes" title="See notes for all equipment" onClick={() => { closeDialog(); openNotes(); }}>All system notes <Icon name="arrow-up-right" size={14} /></button>
      </div>
      {sub === "new"
        ? <div className="eqx-newnote"><NoteComposer fixedEquip={{ tag: equip.tag, name: equip.name, area: equip.area || "" }} onSaved={() => setSub("active")} /></div>
        : (list.length === 0
            ? <NjInline align="left" icon="notebook-pen">No {sub} notes on this unit.</NjInline>
            : <div className="notes-list eqx-notes">
                {list.map((n) => (
                  <NoteCard key={n.id} n={n}
                    onArchive={() => store.setArchived(n.id, true)}
                    onRestore={() => store.setArchived(n.id, false)} />
                ))}
              </div>)}
    </div>
  );
}

/* ── Admin tab: general settings + admin functions ── */
function EqAdminTab({ equip }) {
  const resetRuntime = () => openDialog(<ConfirmDialog
    title="Reset total runtime?"
    message={"This clears the accumulated runtime counter for " + equip.name + ". The action is logged to the maneuver history."}
    detail={equip.tag} confirmLabel="Reset runtime" tone="danger"
    onConfirm={() => njToast("Total runtime reset for " + equip.tag + ".", "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"))} />);
  return (
    <div className="eqx-tab">
      <div className="eqx-h"><Icon name="shield" size={14} /> General settings</div>
      <div className="eqx-admin">
        <div className="eqx-admin-row"><span className="eqx-admin-l">Tagpath</span><span className="data eqx-admin-v">[User]User/{equip.tag}</span></div>
        <div className="eqx-admin-row"><span className="eqx-admin-l">Address</span><span className="data eqx-admin-v eqx-muted">—</span></div>
        <div className="eqx-admin-row"><span className="eqx-admin-l">Error code</span><span className="eqx-admin-v eqx-muted">Not supported</span></div>
      </div>
      <div className="eqx-h eqx-h2"><Icon name="settings-2" size={14} /> Other functions</div>
      <button className="btn btn-secondary eqx-maint" onClick={resetRuntime}><Icon name="rotate-ccw" size={16} /> Reset total runtime</button>
    </div>
  );
}

Object.assign(window, { eqStats, EqOverviewExtras, EqLogTab, EqAlarmsTab, EqNotesTab, EqAdminTab });
