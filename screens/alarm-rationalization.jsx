// alarm-rationalization.jsx — Alarm Rationalization register (tab inside Alarm List).
// Full editable table: inline-editable cells, multiselect + bulk edits, full-dataset
// filtering/sorting, classic pagination, import/export. Replaces the export-to-Excel
// round-trip operators used as a workaround.

const RATN_LS = "nj_ratn_overrides_v1";

// override store: { [rowId]: { field: value, ... } } persisted to localStorage.
function useRatnOverrides() {
  const [ov, setOv] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(RATN_LS) || "{}"); } catch (e) { return {}; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(RATN_LS, JSON.stringify(ov)); } catch (e) {}
  }, [ov]);
  const patch = (ids, fields) => setOv((p) => {
    const n = { ...p };
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => { n[id] = { ...n[id], ...fields }; });
    return n;
  });
  const resetAll = () => setOv({});
  return { ov, patch, resetAll };
}

// merge base row with its overrides; stamp modified on edited rows
function ratnResolve(base, ov) { return ov ? { ...base, ...ov } : base; }

// ---- column model ----
const RATN_COLUMNS = [
  { key: "tag", label: "Tag", type: "ro", w: 156, sticky: true, always: true },
  { key: "alarm", label: "Alarm text", type: "text", w: 250, edit: true },
  { key: "equipment", label: "Equipment", type: "ro", w: 168, off: true },
  { key: "area", label: "Area", type: "ro", w: 168, off: true },
  { key: "preview", label: "Notification preview", type: "ro", w: 300, off: true },
  // 138, not 120: the longest badge ("DIAGNOSTIC", 84px) + the hover edit chevron + cell
  // padding needs 137px. table-layout is fixed, so a short column clips at ANY viewport.
  { key: "priority", label: "Priority", type: "priority", w: 138, edit: true },
  { key: "comment", label: "Comment", type: "longtext", w: 260, edit: true },
  { key: "groups", label: "Alarm group", type: "enum", opts: () => RATN_GROUPS, w: 158, edit: true, off: true },
  { key: "setpoint", label: "Setpoint", type: "num", w: 116, edit: true, unitFrom: "unit" },
  { key: "deadband", label: "Deadband", type: "num", w: 104, edit: true, unitFrom: "unit", off: true },
  { key: "onDelay", label: "On-delay", type: "num", w: 98, edit: true, suffix: "s" },
  { key: "offDelay", label: "Off-delay", type: "num", w: 98, edit: true, suffix: "s" },
  { key: "resetAck", label: "Reset ack after", type: "num", w: 128, edit: true, suffix: "min", off: true },
  { key: "allowShelving", label: "Allow shelving", type: "bool", w: 124, edit: true, off: true },
  { key: "justification", label: "Justification", type: "longtext", w: 260, edit: true },
  { key: "status", label: "Status", type: "status", w: 176, edit: true, always: true },
  { key: "reviewedAt", label: "Last reviewed", type: "review", w: 150 },
  { key: "modifiedAt", label: "Last modified", type: "modified", w: 156 },
];
const RATN_PRIO_LABEL = Object.fromEntries(RATN_PRIOS.map(([k, l]) => [k, l]));

// ---- bulk-editable fields ----
// Only fields whose value can sensibly be shared across many alarms. Per-alarm free text
// (Comment) and per-sensor physical values (Setpoint, Deadband) are intentionally excluded —
// they stay individual. Justification is required and IS bulk-editable (stakeholder decision).
const RATN_BULK_FIELDS = [
  { key: "priority", label: "Priority", kind: "options", opts: () => RATN_PRIOS.map(([v, l]) => ({ value: v, label: l, swatch: SEV[v].dot })) },
  { key: "groups", label: "Alarm group", kind: "options", opts: () => RATN_GROUPS.map((g) => ({ value: g, label: g })) },
  { key: "onDelay", label: "On-delay", kind: "num", suffix: "s" },
  { key: "offDelay", label: "Off-delay", kind: "num", suffix: "s" },
  { key: "resetAck", label: "Reset ack after", kind: "num", suffix: "min" },
  { key: "allowShelving", label: "Allow shelving", kind: "options", opts: () => [{ value: true, label: "Allowed" }, { value: false, label: "Blocked" }] },
  { key: "status", label: "Status", kind: "options", opts: () => RATN_STATUS_ORDER.map((k) => ({ value: k, label: RATN_STATUS[k].label, swatch: RATN_STATUS[k].dot })) },
  { key: "justification", label: "Justification", kind: "text", required: true },
];
const RATN_FIELD_LABEL = Object.fromEntries(RATN_BULK_FIELDS.map((f) => [f.key, f.label]));
// every field a change can be recorded against (bulk fields + the inline-only ones)
const RATN_FIELD_ALL_LABEL = Object.assign(
  Object.fromEntries(RATN_COLUMNS.map((c) => [c.key, c.label])), RATN_FIELD_LABEL);

// ---- status tag (letter glyph + color, ISA-101: never color-only) ----
function RatnStatusTag({ status }) {
  const s = RATN_STATUS[status] || RATN_STATUS["not-configured"];
  return (
    <span className="ratn-stag" style={{ background: s.bg, color: s.text }}>
      <span className="ratn-stag-g" style={{ background: s.dot }}>{s.glyph}</span>{s.label}
    </span>
  );
}

// ---- inline cell editor ----
function RatnCell({ row, col, onCommit }) {
  const [editing, setEditing] = React.useState(false);
  const raw = row[col.key];
  const unit = col.unitFrom ? row[col.unitFrom] : (col.suffix || "");

  // read-only / derived renders
  if (!col.edit) {
    if (col.type === "modified") {
      const n = njRatnHistory.count(row.id);
      return row.modifiedAt
        ? (
          <button className="ratn-cellbtn ratn-modbtn" title="Change history for this alarm" onClick={() => openRatnHistory(row)}>
            <span className="ratn-mod"><span className="ratn-mod-at">{row.modifiedAt}</span><span className="ratn-mod-by">{row.modifiedBy}</span></span>
            {n > 0 && <span className="ratn-histn" title={n + " recorded change" + (n > 1 ? "s" : "")}>{n}</span>}
            <Icon name="history" size={11} />
          </button>
        )
        : <button className="ratn-cellbtn ratn-modbtn" title="Change history for this alarm" onClick={() => openRatnHistory(row)}><span className="ratn-empty">—</span><Icon name="history" size={11} /></button>;
    }
    // ch. 13 — the date the alarm was last REASONED about. Only Critical and High carry a stated
    // cadence, so only they can read as due; everything else states the date and nothing more.
    if (col.type === "review") {
      const req = njReviewRequired(row);
      const due = njReviewDue(row);
      const m = njMonthsSince(row.reviewedAt);
      return (
        <span className="ratn-review" title={req ? "Critical and High alarms are reviewed yearly (ch. 13)" : "No stated review cadence for this priority"}>
          <span className={"ratn-rev-at" + (row.reviewedAt ? "" : " ratn-empty")}>{row.reviewedAt || "—"}</span>
          {req && (due
            ? <span className="ratn-rev-pill due">{row.reviewedAt ? "Overdue" : "Never"}</span>
            : m >= 10 ? <span className="ratn-rev-pill soon">Due in {12 - m} mo</span> : null)}
        </span>
      );
    }
    if (col.key === "tag") return <span className="tag">{raw}</span>;
    if (col.key === "alarm") return <span className="ratn-alarm" title={raw}>{raw}</span>;
    if (col.key === "preview") {
      const msg = `${row.tag} · ${row.area}: ${row.alarm}`.replace(/\s+/g, " ").trim();
      return <span className="ratn-preview" title={msg}>{msg}</span>;
    }
    return <span className="ratn-ro" title={raw}>{raw}</span>;
  }

  // boolean toggle (e.g. Allow shelving) — single-click, no two-step editor
  if (col.type === "bool") {
    return (
      <button className="ratn-cellbtn ratn-boolcell" onClick={() => onCommit(col.key, !raw)} title="Click to toggle">
        <span className={"ratn-bool" + (raw ? " on" : "")}>{raw ? <Icon name="check" size={12} color="#fff" /> : null}</span>
        <span className="ratn-bool-lbl">{raw ? "Allowed" : "Blocked"}</span>
      </button>
    );
  }

  const commit = (v) => { setEditing(false); if (v !== raw) onCommit(col.key, v); };

  if (!editing) {
    let display;
    if (col.type === "priority") display = <Badge level={raw} />;
    else if (col.type === "status") display = <RatnStatusTag status={raw} />;
    else if (col.type === "num") display = (raw === null || raw === "" || raw === undefined)
      ? <span className="ratn-empty">—</span>
      : <span className="data ratn-num">{raw}{unit ? <span className="ratn-unit"> {unit}</span> : null}</span>;
    else if (col.type === "longtext") display = raw
      ? <span className="ratn-long" title={raw}>{raw}</span>
      : <span className="ratn-empty ratn-add">+ add</span>;
    else if (col.type === "text") display = raw
      ? <span className="ratn-alarm" title={raw}>{raw}</span>
      : <span className="ratn-empty ratn-add">+ add</span>;
    else display = raw ? <span className="ratn-enumv">{raw}</span> : <span className="ratn-empty ratn-add">+ set</span>;
    return (
      <button className={"ratn-cellbtn" + (col.type === "longtext" ? " ltcell" : "")} onClick={() => setEditing(true)} title="Click to edit">
        {display}<Icon name="pencil" size={11} />
      </button>
    );
  }

  // editing states
  if (col.type === "priority" || col.type === "status" || col.type === "enum") {
    const opts = col.type === "priority" ? RATN_PRIOS.map(([k, l]) => [k, l])
      : col.type === "status" ? RATN_STATUS_ORDER.map((k) => [k, RATN_STATUS[k].label])
      : col.opts().map((o) => [o, o]);
    return (
      <select className="ratn-edit-sel" autoFocus defaultValue={raw}
        onChange={(e) => commit(e.target.value)} onBlur={(e) => commit(e.target.value)}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  }
  if (col.type === "num") {
    return (
      <input className="ratn-edit-inp data" type="number" autoFocus defaultValue={raw == null ? "" : raw}
        onKeyDown={(e) => { if (e.key === "Enter") commit(e.target.value === "" ? null : Number(e.target.value)); if (e.key === "Escape") setEditing(false); }}
        onBlur={(e) => commit(e.target.value === "" ? null : Number(e.target.value))} />
    );
  }
  // single-line text (Alarm text) — the annunciated message, edited per alarm only:
  // it is deliberately absent from bulk edit (one shared message across alarms is wrong).
  if (col.type === "text") {
    return (
      <input className="ratn-edit-inp" autoFocus defaultValue={raw || ""} aria-label="Alarm text"
        onKeyDown={(e) => { if (e.key === "Enter") commit(e.target.value.trim()); if (e.key === "Escape") setEditing(false); }}
        onBlur={(e) => commit(e.target.value.trim())} />
    );
  }
  // longtext — edit in place (inline textarea), consistent with the other cells
  return (
    <textarea className="ratn-edit-ta" autoFocus defaultValue={raw || ""} rows={2}
      onFocus={(e) => { const v = e.target.value; e.target.value = ""; e.target.value = v; }}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(e.target.value); } if (e.key === "Escape") setEditing(false); }}
      onBlur={(e) => commit(e.target.value)} placeholder="Describe…" />
  );
}

// ---- change note (management of change) ----------------------------------------------
// The master alarm record is a controlled document (ch. 6–7). Editing stays inline and fast,
// but a change to a CONTROLLED field — priority, setpoint, deadband, delays, class, group,
// allow-shelving — is stopped once to capture WHY, and is then attributed and reversible from
// the per-alarm history. Descriptive fields (alarm text, comment, justification) are recorded
// silently: they carry no process consequence.
function RatnChangeNoteDialog({ label, field, from, to, count, onSave }) {
  const [reason, setReason] = React.useState("");
  const ok = reason.trim().length > 2;
  const save = () => { if (!ok) return; onSave(reason.trim()); closeDialog(); };
  return (
    <Dialog width={480}>
      <DlgHeader icon="file-pen-line" name="Reason for change" tag={count > 1 ? count + " alarms" : null} onClose={closeDialog} />
      <div className="dlg-body ratn-note">
        <div className="ratn-note-target">{label}</div>
        {field && (
          <div className="ratn-note-diff">
            <span className="ratn-note-f">{RATN_FIELD_ALL_LABEL[field] || field}</span>
            <span className="ratn-note-from data">{njFmtHistVal(from)}</span>
            <Icon name="arrow-right" size={13} color="var(--slate-400)" />
            <span className="ratn-note-to data">{njFmtHistVal(to)}</span>
          </div>
        )}
        <span className="oc-field-l">Why is this changing?</span>
        <div className="ratn-note-sugg">
          {RATN_CHANGE_REASONS.slice(0, 4).map((r) => (
            <button key={r} type="button" className={"ratn-note-chip" + (reason === r ? " on" : "")} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <textarea className="ratn-longta" rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }} placeholder="Or write your own…" />
        <div className="shelve-note"><Icon name="info" size={14} color="var(--slate-400)" /> <span>Recorded against the alarm as <b>You · {RATN_TODAY}</b> and reversible from its change history. Changes affecting other disciplines still go through management of change.</span></div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!ok} onClick={save}><Icon name="check" size={15} /> Save change</button>
      </div>
    </Dialog>
  );
}
function openRatnChangeNote(opts) { openDialog(<RatnChangeNoteDialog {...opts} />); }

// ---- per-alarm change history ----------------------------------------------------------
function RatnHistoryDialog({ row, onRevert }) {
  const hist = useRatnHistory();
  const list = hist.for(row.id);
  return (
    <Dialog width={600}>
      <DlgHeader icon="history" name="Change history" tag={row.tag} onClose={closeDialog} />
      <div className="dlg-body ratn-hist">
        <div className="ratn-hist-head">
          <span className="ratn-hist-alarm">{row.alarm}</span>
          <span className="caption">{row.area} · last reviewed {row.reviewedAt || "never"}</span>
        </div>
        {list.length === 0 ? (
          <div className="ratn-hist-empty"><Icon name="file-clock" size={22} color="var(--slate-300)" />
            <span>No changes recorded in this session.</span>
            <p className="caption">Changes made before the register moved into NJORD live in the commissioning documentation.</p></div>
        ) : (
          <ol className="ratn-hist-list">
            {list.map((e, i) => (
              <li key={i} className="ratn-hist-item">
                <div className="ratn-hist-l">
                  <span className="ratn-hist-field">{RATN_FIELD_ALL_LABEL[e.field] || e.field}</span>
                  <span className="ratn-hist-diff"><span className="data">{njFmtHistVal(e.from)}</span> <Icon name="arrow-right" size={12} color="var(--slate-400)" /> <span className="data ratn-hist-to">{njFmtHistVal(e.to)}</span></span>
                  {e.reason && <p className="ratn-hist-reason">{e.reason}</p>}
                </div>
                <div className="ratn-hist-r">
                  <span className="ratn-hist-by">{e.by} · {e.at}</span>
                  <button className="linkbtn" onClick={() => { const ent = njRatnHistory.revert(row.id, i); if (ent) onRevert(row.id, ent); }}>Revert</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="shield" size={13} /> Controlled fields are attributed; descriptive edits are logged without a reason</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}
let _ratnRevert = () => {};
function openRatnHistory(row) { openDialog(<RatnHistoryDialog row={row} onRevert={(id, e) => _ratnRevert(id, e)} />); }

// ---- Master Alarm Report (ch. 7) -------------------------------------------------------
// The signed deliverable the philosophy asks for. It is a snapshot of the register plus the
// change record behind it — not a spreadsheet dump, which is what it replaced.
function RatnReportDialog({ stats, review, changes }) {
  const [scope, setScope] = React.useState("all");
  return (
    <Dialog width={560}>
      <DlgHeader icon="file-text" name="Master Alarm Report" onClose={closeDialog} />
      <div className="dlg-body ratn-rep">
        <p className="ratn-bed-intro">The controlled snapshot of the master alarm database: every configured alarm with its seven rationalization parameters, its review date, and the attributed change record behind it. Issued for signature by PSTech and the customer.</p>
        <div className="ratn-rep-facts">
          <div className="ratn-rep-f"><span className="ratn-rep-l">Alarms</span><span className="ratn-rep-v data">{stats.total.toLocaleString()}</span></div>
          <div className="ratn-rep-f"><span className="ratn-rep-l">Rationalized</span><span className="ratn-rep-v data">{stats.rationalized.toLocaleString()} <span className="ratn-kpi-pct">{Math.round((stats.rationalized / stats.total) * 100)}%</span></span></div>
          <div className="ratn-rep-f"><span className="ratn-rep-l">Review overdue</span><span className="ratn-rep-v data">{review.toLocaleString()}</span></div>
          <div className="ratn-rep-f"><span className="ratn-rep-l">Recorded changes</span><span className="ratn-rep-v data">{changes.toLocaleString()}</span></div>
        </div>
        <span className="oc-field-l">Include</span>
        <div className="segmented ratn-rep-seg">
          <button className={"seg" + (scope === "all" ? " active" : "")} onClick={() => setScope("all")}>Whole register</button>
          <button className={"seg" + (scope === "changed" ? " active" : "")} onClick={() => setScope("changed")}>Changed since last issue</button>
          <button className={"seg" + (scope === "risk" ? " active" : "")} onClick={() => setScope("risk")}>Critical &amp; High only</button>
        </div>
        <div className="ratn-rep-sign">
          <span className="eyebrow">Signature block</span>
          <div className="ratn-rep-signrow"><span>PSTech · Discipline Lead</span><span className="ratn-rep-line" /></div>
          <div className="ratn-rep-signrow"><span>Customer · Operations</span><span className="ratn-rep-line" /></div>
          <div className="ratn-rep-signrow"><span>Issued</span><span className="data">{RATN_TODAY}</span></div>
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { closeDialog(); njToast("Master Alarm Report generated · " + RATN_TODAY + " · pending signature.", "View", () => njToast("Document store is not connected in this build.")); }}><Icon name="download" size={15} /> Generate report</button>
      </div>
    </Dialog>
  );
}

// ---- bulk edit modal: toggle any set of fields, set values, apply all at once ----
// A modal (vs the old drill-down popover) so operators can review + change several
// fields together in one confirmable step — clearer intent, fewer round-trips.
function RatnBulkEditDialog({ count, onApply }) {
  // per-field: enabled flag + working value
  const [on, setOn] = React.useState(() => ({}));
  const [vals, setVals] = React.useState(() => ({}));
  const toggle = (f) => setOn((s) => {
    const next = { ...s, [f.key]: !s[f.key] };
    if (next[f.key] && vals[f.key] === undefined) {
      // seed a sensible default so an enabled row is immediately valid
      const def = f.kind === "options" ? f.opts()[0].value : f.kind === "num" ? 0 : "";
      setVals((v) => ({ ...v, [f.key]: def }));
    }
    return next;
  });
  const setVal = (key, v) => setVals((s) => ({ ...s, [key]: v }));
  const [reason, setReason] = React.useState("");

  const enabled = RATN_BULK_FIELDS.filter((f) => on[f.key]);
  const controlled = enabled.filter((f) => njIsControlled(f.key));
  const invalid = enabled.some((f) => {
    const v = vals[f.key];
    if (f.kind === "num") return v !== "" && v != null && isNaN(Number(v));
    if (f.kind === "text") return !String(v || "").trim();
    return v === undefined;
  }) || (controlled.length > 0 && reason.trim().length < 3);
  const canApply = enabled.length > 0 && !invalid;

  const apply = () => {
    if (!canApply) return;
    const changes = {};
    enabled.forEach((f) => { changes[f.key] = f.kind === "num" ? (vals[f.key] === "" || vals[f.key] == null ? 0 : Number(vals[f.key])) : (f.kind === "text" ? String(vals[f.key]).trim() : vals[f.key]); });
    onApply(changes, reason.trim());
    closeDialog();
  };

  return (
    <Dialog width={560}>
      <DlgHeader icon="pencil" name="Bulk edit alarms" tag={`${count} selected`} onClose={closeDialog} />
      <div className="dlg-body ratn-bed-body">
        <p className="ratn-bed-intro">Choose the fields to change. Only ticked fields are written: every other value on the {count} selected alarm{count > 1 ? "s" : ""} is left untouched.</p>
        <div className="ratn-bed-list">
          {RATN_BULK_FIELDS.map((f) => {
            const active = !!on[f.key];
            return (
              <div key={f.key} className={"ratn-bed-row" + (active ? " on" : "")}>
                <button type="button" className="ratn-bed-check" onClick={() => toggle(f)} aria-pressed={active}>
                  <span className={"ratn-bed-box" + (active ? " on" : "")}>{active ? <Icon name="check" size={12} color="#fff" /> : null}</span>
                  <span className="ratn-bed-lbl">{f.label}{f.required && active ? <span className="ratn-bed-req"> · required</span> : null}</span>
                </button>
                <div className="ratn-bed-ctrl">
                  {!active ? (
                    <span className="ratn-bed-off">No change</span>
                  ) : f.kind === "options" ? (
                    <div className="ratn-bed-selwrap">
                      <select className="ratn-bed-sel" value={String(vals[f.key])} onChange={(e) => {
                        const opt = f.opts().find((o) => String(o.value) === e.target.value);
                        setVal(f.key, opt ? opt.value : e.target.value);
                      }}>
                        {f.opts().map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                      </select>
                    </div>
                  ) : f.kind === "num" ? (
                    <div className="ratn-bed-num">
                      <input className="ratn-edit-inp data" type="number" min="0" value={vals[f.key] ?? ""} placeholder="0"
                        onChange={(e) => setVal(f.key, e.target.value)} />
                      <span className="ratn-bed-suffix">{f.suffix}</span>
                    </div>
                  ) : (
                    <div className="ratn-bed-textwrap">
                      <textarea className="ratn-longta" rows={2} value={vals[f.key] ?? ""} placeholder="Enter justification (required)…"
                        onChange={(e) => setVal(f.key, e.target.value)} />
                      <div className="ratn-bed-sugg">
                        {RATN_JUSTIFY.slice(0, 3).map((s, i) => (
                          <button key={i} type="button" className="ratn-be-sugg-i" onClick={() => setVal(f.key, s)}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {controlled.length > 0 && (
          <div className="ratn-bed-moc">
            <div className="ratn-bed-moc-h"><Icon name="shield" size={14} color="var(--slate-500)" /> Reason for change <span className="ratn-bed-req">· required</span></div>
            <p className="caption">{controlled.map((f) => f.label).join(", ")} {controlled.length > 1 ? "are" : "is"} a controlled field on the master record. The reason is recorded against every alarm you change.</p>
            <div className="ratn-note-sugg">
              {RATN_CHANGE_REASONS.slice(0, 3).map((r) => (
                <button key={r} type="button" className={"ratn-note-chip" + (reason === r ? " on" : "")} onClick={() => setReason(r)}>{r}</button>
              ))}
            </div>
            <textarea className="ratn-longta" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write your own…" />
          </div>
        )}
      </div>
      <div className="dlg-foot">
        <span className="ratn-bed-foot-hint">{enabled.length ? `${enabled.length} field${enabled.length > 1 ? "s" : ""} → ${count} alarm${count > 1 ? "s" : ""}` : "Select at least one field"}</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!canApply} onClick={apply}>Apply changes</button>
      </div>
    </Dialog>
  );
}

function RatnBulkEdit({ count, onApply }) {
  return (
    <button className="bb-btn" onClick={() => openDialog(<RatnBulkEditDialog count={count} onApply={onApply} />)}>
      <Icon name="pencil" size={14} /> Bulk edit
    </button>
  );
}

// ---- compact donut ----
function RatnDonut({ segments, total }) {
  const size = 116, sw = 18, r = (size - sw) / 2 - 1, cx = size / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="ratn-donut">
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={sw} />
        {segments.map((s, i) => {
          const len = total ? (s.value / total) * c : 0;
          const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />;
          acc += len; return el;
        })}
      </svg>
      <div className="ratn-donut-c">
        <span className="ratn-donut-pct">{total ? Math.round((segments[0].value / total) * 100) : 0}%</span>
        <span className="ratn-donut-lbl">rationalized</span>
      </div>
    </div>
  );
}

const RATN_PAGE_SIZES = [25, 50, 100, 200];

// One row = 11 cells, each an editable RatnCell, so a 50-row page is ~550 components. Selecting or
// deselecting a single row must not re-render the other 49: the row is memoised on the things that
// actually change its output. `row` identity is stable (the resolved dataset is memoised on the
// override map), and onEdit is called through a ref-stable callback below.
const RatnRow = React.memo(function RatnRow({ row, cols, selected, flashed, onToggle, onEdit }) {
  return (
    <tr className={(selected ? "row-sel " : "") + (flashed ? "row-just-edited " : "")}>
      <td className="ratn-sticky-0"><Check on={selected} onClick={() => onToggle(row.id)} /></td>
      {cols.map((c) => (
        <td key={c.key} className={(c.sticky ? "ratn-sticky-1 " : "") + (c.type === "longtext" ? "ratn-td-long" : "")}>
          <RatnCell row={row} col={c} onCommit={(field, value) => onEdit(row.id, field, value)} />
        </td>
      ))}
    </tr>
  );
});

function AlarmRationalizationScreen() {
  const { ov, patch, resetAll } = useRatnOverrides();
  const sel = useRowSelection();
  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("all");
  const [revF, setRevF] = React.useState("all");
  const [prioF, setPrioF] = React.useState(null);
  const [sort, setSort] = React.useState({ key: "tag", dir: 1 });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [cols, setCols] = React.useState(() => new Set(RATN_COLUMNS.filter((c) => !c.off).map((c) => c.key)));
  const [colMenu, setColMenu] = React.useState(false);
  const [showOverview, setShowOverview] = React.useState(true);

  // rows just changed by an edit — briefly flash the temporary blue highlight, then fade.
  // Reuses the same interaction pattern as trend-marker row highlights for consistency.
  const [justEdited, setJustEdited] = React.useState(() => new Set());
  const jeTimer = React.useRef(null);
  const flash = (ids) => {
    setJustEdited(new Set(ids));
    if (jeTimer.current) clearTimeout(jeTimer.current);
    jeTimer.current = setTimeout(() => setJustEdited(new Set()), 3600);
  };
  React.useEffect(() => () => { if (jeTimer.current) clearTimeout(jeTimer.current); }, []);

  // resolve full dataset with overrides (memoised on overrides only)
  const all = React.useMemo(() => RATN_DATA.map((b) => ratnResolve(b, ov[b.id])), [ov]);

  // KPIs over the FULL dataset
  const stats = React.useMemo(() => {
    const s = { total: all.length, rationalized: 0, "not-configured": 0, "re-evaluate": 0, riskOpen: 0, reviewDue: 0 };
    all.forEach((r) => {
      s[r.status] = (s[r.status] || 0) + 1;
      if (r.status !== "rationalized" && (r.priority === "critical" || r.priority === "high")) s.riskOpen++;
      if (njReviewDue(r)) s.reviewDue++;
    });
    return s;
  }, [all]);

  // FILTER across the entire dataset, then sort, then paginate
  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    let rows = all.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (revF === "due" && !njReviewDue(r)) return false;
      if (revF === "indate" && (njReviewDue(r) || !njReviewRequired(r))) return false;
      if (prioF && r.priority !== prioF) return false;
      if (ql && ![r.tag, r.alarm, r.area, r.equipment, r.groups, r.consequence, r.response, r.cause, r.cls, r.justification].filter(Boolean).join(" ").toLowerCase().includes(ql)) return false;
      return true;
    });
    const k = sort.key;
    const prioRank = { critical: 0, high: 1, medium: 2, low: 3, diagnostic: 4 };
    const statRank = { "not-configured": 0, "re-evaluate": 1, "rationalized": 2 };
    rows = rows.slice().sort((a, b) => {
      let av, bv;
      if (k === "priority") { av = prioRank[a.priority]; bv = prioRank[b.priority]; }
      else if (k === "status") { av = statRank[a.status]; bv = statRank[b.status]; }
      else { av = (a[k] ?? "").toString().toLowerCase(); bv = (b[k] ?? "").toString().toLowerCase(); }
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
    return rows;
  }, [all, q, statusF, prioF, sort, revF]);

  // reset to page 1 whenever the filtered set changes shape
  React.useEffect(() => { setPage(1); }, [q, statusF, prioF, revF, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const start = (curPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const pageIds = pageRows.map((r) => r.id);
  const selOnPage = pageIds.filter((id) => sel.has(id));
  const allPageOn = pageIds.length > 0 && selOnPage.length === pageIds.length;
  // derived over the WHOLE 2600-row set — memoise so it doesn't re-run on every keystroke/click
  const filteredIds = React.useMemo(() => filtered.map((r) => r.id), [filtered]);
  const filteredIdSet = React.useMemo(() => new Set(filteredIds), [filteredIds]);
  const selInFiltered = React.useMemo(
    () => (sel.size > 0 ? [...sel.sel].filter((id) => filteredIdSet.has(id)).length : 0),
    [sel.sel, filteredIdSet]);
  const allFilteredSelected = filteredIds.length > 0 && selInFiltered === filteredIds.length;

  // Every edit is recorded: what changed, from what, by whom. A controlled field is stopped once
  // to capture the reason (management of change); a descriptive one is logged silently. An edit
  // is also a review — the alarm has just been reasoned about — so it moves reviewedAt (ch. 13).
  const writeEdit = (id, field, value, reason) => {
    const cur = all.find((r) => r.id === id);
    const fields = { [field]: value };
    if (field !== "status") {
      if (cur && cur.status === "not-configured") fields.status = "re-evaluate";
      fields.modifiedBy = "You"; fields.modifiedAt = RATN_TODAY; fields.reviewedAt = RATN_TODAY;
    } else if (value !== "not-configured") { fields.modifiedBy = "You"; fields.modifiedAt = RATN_TODAY; fields.reviewedAt = RATN_TODAY; }
    patch(id, fields);
    njRatnHistory.append([{ id, field, from: cur ? cur[field] : null, to: value }], reason, "You");
    njRatnOverridesChanged();
    flash([id]);
  };
  const onEdit = (id, field, value) => {
    const cur = all.find((r) => r.id === id);
    if (njIsControlled(field)) {
      openRatnChangeNote({
        label: (cur ? cur.alarm + " · " + cur.tag : id), field, from: cur ? cur[field] : null, to: value, count: 1,
        onSave: (reason) => writeEdit(id, field, value, reason),
      });
      return;
    }
    writeEdit(id, field, value, "");
  };
  // revert from the change history: put the previous value back, attributed as a revert
  React.useEffect(() => {
    _ratnRevert = (id, e) => {
      patch(id, { [e.field]: e.from, modifiedBy: "You", modifiedAt: RATN_TODAY });
      njRatnOverridesChanged();
      flash([id]);
      njToast(`${RATN_FIELD_ALL_LABEL[e.field] || e.field} reverted to ${njFmtHistVal(e.from)}.`);
    };
    return () => { _ratnRevert = () => {}; };
  }, []);
  // stable identities so a memoised row isn't invalidated by every parent render
  const onEditRef = React.useRef(onEdit); onEditRef.current = onEdit;
  const editRow = React.useCallback((id, field, value) => onEditRef.current(id, field, value), []);
  const toggleRef = React.useRef(sel.toggle); toggleRef.current = sel.toggle;
  const toggleRow = React.useCallback((id) => toggleRef.current(id), []);
  const bulkSet = (changes, reason) => {
    const ids = [...sel.sel].filter((id) => filteredIdSet.has(id));
    if (!ids.length) return;
    const byId = new Map(all.map((r) => [r.id, r]));
    const keys = Object.keys(changes);
    patch(ids, { ...changes, modifiedBy: "You", modifiedAt: RATN_TODAY, reviewedAt: RATN_TODAY });
    const entries = [];
    ids.forEach((id) => keys.forEach((k) => entries.push({ id, field: k, from: (byId.get(id) || {})[k], to: changes[k] })));
    njRatnHistory.append(entries, reason || "", "You");
    njRatnOverridesChanged();
    // keep the selection so operators can chain further bulk edits to the same set;
    // flash the affected rows so it stays obvious which alarms just changed.
    flash(ids);
    const what = keys.length === 1 ? RATN_FIELD_LABEL[keys[0]] : `${keys.length} fields`;
    njToast(`${what} updated for ${ids.length} alarm${ids.length > 1 ? "s" : ""}.`);
  };

  // stable array identity keeps the memoised rows from re-rendering on unrelated state changes
  const visibleCols = React.useMemo(() => RATN_COLUMNS.filter((c) => cols.has(c.key) || c.always), [cols]);
  const tableW = 40 + visibleCols.reduce((s, c) => s + c.w, 0);
  const donutSegs = [
    { value: stats.rationalized, color: "var(--success)" },
    { value: stats["re-evaluate"], color: "var(--warning)" },
    { value: stats["not-configured"], color: "var(--slate-300)" },
  ];

  return (
    <AppShell active="alarms" title="Alarms" crumbs={["Rationalization"]} statusLevel={stats.riskOpen ? "high" : "ok"} scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Master alarm record · {stats.total.toLocaleString()} configured alarms · controlled fields are attributed and reversible · per ISA-18.2 §7</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active="Rationalization" /></div>
        </div>
      </div>

      {showOverview && (
        <div className="ratn-overview">
          <div className="card ratn-kpis">
            <div className="ratn-kpi">
              <span className="ratn-kpi-l">Total alarms</span>
              <span className="ratn-kpi-v data">{stats.total.toLocaleString()}</span>
            </div>
            <div className="ratn-kpi">
              <span className="ratn-kpi-l"><span className="ratn-kpi-dot" style={{ background: "var(--success)" }} />Rationalized</span>
              <span className="ratn-kpi-v data">{stats.rationalized.toLocaleString()} <span className="ratn-kpi-pct">{Math.round((stats.rationalized / stats.total) * 100)}%</span></span>
            </div>
            <div className="ratn-kpi">
              <span className="ratn-kpi-l"><span className="ratn-kpi-dot" style={{ background: "var(--slate-300)" }} />Not configured</span>
              <span className="ratn-kpi-v data">{stats["not-configured"].toLocaleString()}</span>
            </div>
            <div className="ratn-kpi">
              <span className="ratn-kpi-l"><span className="ratn-kpi-dot" style={{ background: "var(--warning)" }} />Re-evaluate</span>
              <span className="ratn-kpi-v data">{stats["re-evaluate"].toLocaleString()}</span>
            </div>
            <div className="ratn-kpi ratn-kpi-risk">
              <span className="ratn-kpi-l"><Icon name="alert-triangle" size={13} color="var(--critical)" />High/critical open</span>
              <span className="ratn-kpi-v data">{stats.riskOpen.toLocaleString()}</span>
            </div>
            <button className={"ratn-kpi ratn-kpi-rev" + (revF === "due" ? " on" : "")} onClick={() => setRevF(revF === "due" ? "all" : "due")}
              title="Critical and High alarms not reasoned about in the last 12 months (ch. 13)">
              <span className="ratn-kpi-l"><Icon name="calendar-clock" size={13} color="var(--warning-text)" />Review overdue</span>
              <span className="ratn-kpi-v data">{stats.reviewDue.toLocaleString()}</span>
            </button>
          </div>
          <div className="card ratn-progress">
            <RatnDonut segments={donutSegs} total={stats.total} />
            <div className="ratn-progress-leg">
              <div className="ratn-pl-row"><span className="ratn-pl-dot" style={{ background: "var(--success)" }} /> Rationalized <b className="data">{stats.rationalized}</b></div>
              <div className="ratn-pl-row"><span className="ratn-pl-dot" style={{ background: "var(--warning)" }} /> Re-evaluate <b className="data">{stats["re-evaluate"]}</b></div>
              <div className="ratn-pl-row"><span className="ratn-pl-dot" style={{ background: "var(--slate-300)" }} /> Not configured <b className="data">{stats["not-configured"]}</b></div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="filterbar ratn-filterbar">
          <div className="field" style={{ minWidth: 240 }}>
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter tag, alarm, area, text…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl">Status</span>
            <span className="ratn-statusseg">
              {[["all", "All"], ...RATN_STATUS_ORDER.map((k) => [k, RATN_STATUS[k].label])].map(([v, l]) => (
                <button key={v} className={"ratn-sf" + (statusF === v ? " on" : "")} onClick={() => setStatusF(v)}>
                  {v !== "all" && <span className="ratn-sf-dot" style={{ background: RATN_STATUS[v].dot }} />}{l}
                </button>
              ))}
            </span>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="sliders-horizontal" size={15} color="var(--slate-500)" /> Priority</span>
            <span className="chips">
              {RATN_PRIOS.map(([lvl, lbl]) => {
                const on = prioF === lvl;
                return <button key={lvl} className={"chip chip-btn" + (on ? " chip-on" : "")} onClick={() => setPrioF(on ? null : lvl)}><span className="cdot" style={{ background: SEV[lvl].dot }} /> {lbl}{on && <span className="x"><Icon name="x" size={12} /></span>}</button>;
              })}
            </span>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="calendar-clock" size={15} color="var(--slate-500)" /> Annual review</span>
            <span className="ratn-statusseg">
              {[["all", "All"], ["due", "Overdue"], ["indate", "In date"]].map(([v, l]) => (
                <button key={v} className={"ratn-sf" + (revF === v ? " on" : "")} onClick={() => setRevF(v)}
                  title={v === "all" ? "No review filter" : "Critical and High alarms only — no other priority has a stated cadence"}>{l}</button>
              ))}
            </span>
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, position: "relative" }}>
            <button className="btn btn-secondary" onClick={() => setShowOverview((s) => !s)}><Icon name={showOverview ? "eye-off" : "eye"} size={15} /> {showOverview ? "Hide" : "Show"} overview</button>
            <button className="btn btn-secondary" onClick={() => setColMenu((m) => !m)}><Icon name="columns-3" size={15} /> Columns</button>
            {colMenu && (
              <React.Fragment>
                <div className="ratn-bm-scrim" onClick={() => setColMenu(false)} />
                <div className="ratn-col-pop">
                  <div className="ratn-col-pop-h">Visible columns</div>
                  {RATN_COLUMNS.map((c) => (
                    <label key={c.key} className={"ratn-col-item" + (c.always ? " locked" : "")}
                      {...(c.always ? null : njCheckable(() => setCols((p) => { const n = new Set(p); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; }), { on: cols.has(c.key), label: c.label + " column" }))}>
                      <Check on={cols.has(c.key) || c.always} />
                      {c.label}{c.always && <span className="ratn-col-lock">pinned</span>}
                    </label>
                  ))}
                </div>
              </React.Fragment>
            )}
            <button className="btn btn-secondary" onClick={() => openDialog(<RatnReportDialog stats={stats} review={stats.reviewDue} changes={njRatnHistory.total()} />)} title="Master Alarm Report — the signed snapshot of the register (ch. 7)"><Icon name="file-text" size={15} /> Report</button>
            <button className="btn btn-secondary" onClick={() => njToast("Import: select an .xlsx/.csv file to merge into the register.", "Choose file", () => njToast("No file selected (demo)."))}><Icon name="upload" size={15} /> Import</button>
            <ExportMenu primary describe={(fmt) => `Export started: ${filtered.length.toLocaleString()} alarms (current filter) will download as ${fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx)."}`} />
          </div>
        </div>

        {/* bulk bar */}
        <BulkBar count={selInFiltered} onClear={sel.clear}>
          <RatnBulkEdit count={selInFiltered} onApply={bulkSet} />
          <ExportMenu label="Export selected" btnClass="bb-btn" describe={(fmt) => `Export started: ${selInFiltered} selected alarm${selInFiltered > 1 ? "s" : ""} will download as ${fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx)."}`} />
        </BulkBar>

        {/* select-all-matching banner */}
        {allPageOn && !allFilteredSelected && filtered.length > pageRows.length && (
          <div className="ratn-selall">
            All {selOnPage.length} on this page selected.
            <button className="linkbtn" onClick={() => sel.setAll(filteredIds, true)}>Select all {filtered.length.toLocaleString()} matching</button>
          </div>
        )}
        {allFilteredSelected && filtered.length > pageRows.length && (
          <div className="ratn-selall">All {filtered.length.toLocaleString()} matching alarms selected. <button className="linkbtn" onClick={sel.clear}>Clear selection</button></div>
        )}

        <div className="ratn-scroll">
          <table className="tbl ratn-tbl" style={{ minWidth: tableW, width: "100%" }}>
            <thead>
              <tr>
                <th className="ratn-sticky-0" style={{ width: 40 }}><Check on={allPageOn} indeterminate={selOnPage.length > 0 && !allPageOn} onClick={() => sel.setAll(pageIds, !allPageOn)} /></th>
                {visibleCols.map((c) => {
                  const sortable = ["tag", "alarm", "area", "priority", "status", "modifiedAt"].includes(c.key);
                  const active = sort.key === c.key;
                  return (
                    <th key={c.key} className={(c.sticky ? "ratn-sticky-1 " : "") + (sortable ? "sortable" : "")} style={{ width: c.w }}
                      onClick={sortable ? () => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 })) : undefined}>
                      <span className="th-in">{c.label} {sortable && <Icon name={active ? (sort.dir === 1 ? "chevron-up" : "chevron-down") : "chevrons-up-down"} size={12} color={active ? "var(--primary)" : "var(--slate-400)"} />}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <RatnRow key={r.id} row={r} cols={visibleCols} selected={sel.has(r.id)}
                  flashed={justEdited.has(r.id)} onToggle={toggleRow} onEdit={editRow} />
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={visibleCols.length + 1} style={{ textAlign: "center", padding: "44px 0", color: "var(--slate-400)" }}>No alarms match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="tbl-foot ratn-foot">
          <span className="rows-select">Rows per page
            <span className="select ratn-pagesize">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {RATN_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </span>
          </span>
          <span className="small">{filtered.length ? `${(start + 1).toLocaleString()}–${Math.min(start + pageSize, filtered.length).toLocaleString()}` : 0} of {filtered.length.toLocaleString()} {filtered.length !== all.length ? `(filtered from ${all.length.toLocaleString()})` : "alarms"}</span>
          <RatnPager page={curPage} totalPages={totalPages} onGo={setPage} />
        </div>
      </div>
    </AppShell>
  );
}

// compact numeric pager with first/prev/window/next/last
function RatnPager({ page, totalPages, onGo }) {
  const win = [];
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, from + 4);
  for (let i = from; i <= to; i++) win.push(i);
  return (
    <div className="pager">
      <button className="pg link" disabled={page === 1} onClick={() => onGo(1)}>First</button>
      <button className="pg" disabled={page === 1} onClick={() => onGo(page - 1)}><Icon name="chevron-left" size={14} /></button>
      {from > 1 && <span className="pg pg-ell">…</span>}
      {win.map((n) => <button key={n} className={"pg" + (n === page ? " active" : "")} onClick={() => onGo(n)}>{n}</button>)}
      {to < totalPages && <span className="pg pg-ell">…</span>}
      <button className="pg" disabled={page === totalPages} onClick={() => onGo(page + 1)}><Icon name="chevron-right" size={14} /></button>
      <button className="pg link" disabled={page === totalPages} onClick={() => onGo(totalPages)}>Last</button>
    </div>
  );
}

Object.assign(window, { AlarmRationalizationScreen });
