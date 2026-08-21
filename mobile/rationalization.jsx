// rationalization.jsx — mobile Alarm Rationalization (ISA-18.2 §7), EDITABLE.
// Desktop is the source of truth: this reads the SAME master record (`RATN_DATA` from
// screens/alarm-rationalization-data.jsx) and writes the SAME override map
// (localStorage `nj_ratn_overrides_v1`), so an edit made in the field shows up in the
// control room and vice versa. Field-native adaptation of the desktop grid:
//   list + filters → tap a row → per-alarm record screen → one field per sheet,
//   plus a select-mode bulk edit that mirrors the desktop bulk dialog.
// The desktop table (11 editable cells per row, 2600 rows) is deliberately NOT recreated.

const MRATN_LS = "nj_ratn_overrides_v1";
// Same modifier stamp as desktop `onEdit` — the build runs on a fixed clock.
const MRATN_BY = "You", MRATN_AT = "16 Jun 2026";
const MRATN_PRIO_LABEL = Object.fromEntries(RATN_PRIOS.map(([k, l]) => [k, l]));

const mRatnStore = {
  ov: (() => { try { return JSON.parse(localStorage.getItem(MRATN_LS) || "{}"); } catch (e) { return {}; } })(),
  subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.ov; },
  write() { try { localStorage.setItem(MRATN_LS, JSON.stringify(this.ov)); } catch (e) {} this.subs.forEach((f) => f()); },
  patch(ids, fields) {
    const n = { ...this.ov };
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => { n[id] = { ...n[id], ...fields }; });
    this.ov = n; this.write();
  },
  undo(prev) { this.ov = prev; this.write(); },
};
function useMRatnOv() { return React.useSyncExternalStore(mRatnStore.sub.bind(mRatnStore), mRatnStore.snap.bind(mRatnStore)); }
function mRatnResolve(base, ov) { return ov && ov[base.id] ? { ...base, ...ov[base.id] } : base; }

// Single-field edit. Mirrors desktop auto-progress: touching a not-configured alarm moves it
// to Re-evaluate and stamps the modifier; every edit is undoable from the toast.
function mRatnEdit(row, field, value, label) {
  const prev = mRatnStore.ov;
  const fields = { [field]: value };
  if (field !== "status") {
    if (row.status === "not-configured") fields.status = "re-evaluate";
    fields.modifiedBy = MRATN_BY; fields.modifiedAt = MRATN_AT;
  } else if (value !== "not-configured") { fields.modifiedBy = MRATN_BY; fields.modifiedAt = MRATN_AT; }
  mRatnStore.patch(row.id, fields);
  mToast((label || field) + " updated · " + row.tag, "check", { label: "Undo", fn: () => mRatnStore.undo(prev) });
}

function MRatnStatus({ status, small }) {
  const s = RATN_STATUS[status] || RATN_STATUS["not-configured"];
  return <span className="mratn-stag" style={{ background: s.bg, color: s.text, fontSize: small ? 9.5 : 10.5 }}>
    <span className="mratn-stag-g" style={{ borderColor: "currentColor" }}>{s.glyph}</span>{s.label}</span>;
}

// ---------- field sheets ----------
function MRatnOptionSheet({ title, sub, options, value, onPick }) {
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">{title}</div>
        {sub && <div className="tag" style={{ fontSize: 11, marginBottom: 10 }}>{sub}</div>}
        <div className="mratn-opts">
          {options.map((o) => (
            <button key={String(o.value)} className={"mratn-opt" + (o.value === value ? " on" : "")}
              onClick={() => { onPick(o.value); mCloseSheet(); }}>
              {o.swatch && <span className="mratn-sw" style={{ background: o.swatch }} />}
              <span className="mratn-opt-l">{o.label}</span>
              {o.value === value && <MIcon name="check" size={17} color="var(--primary)" />}
            </button>
          ))}
        </div>
        <div className="m-actions"><button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button></div>
      </div>
    </div>
  );
}

function MRatnTextSheet({ title, sub, value, placeholder, suggestions, onSave }) {
  const [txt, setTxt] = React.useState(value || "");
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">{title}</div>
        {sub && <div className="tag" style={{ fontSize: 11, marginBottom: 10 }}>{sub}</div>}
        <textarea className="m-note-ta" rows={4} autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={placeholder} />
        {suggestions && <div className="mratn-sugg">
          <div className="m-note-field-l" style={{ marginTop: 12 }}>Suggested wording</div>
          {suggestions.map((s, i) => <button key={i} className="mratn-sugg-i" onClick={() => setTxt(s)}>{s}</button>)}
        </div>}
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={txt.trim() === (value || "").trim()}
            onClick={() => { onSave(txt.trim()); mCloseSheet(); }}><MIcon name="check" size={16} /> Save</button>
        </div>
      </div>
    </div>
  );
}

function MRatnNumSheet({ title, sub, value, unit, step, min, onSave }) {
  const cur = value == null ? 0 : value;
  const [val, setVal] = React.useState(value == null ? "" : String(value));
  const num = parseFloat(val); const st = step || 1;
  const bump = (d) => { const b = isNaN(num) ? cur : num; setVal(String(parseFloat((b + d).toFixed(4)))); };
  const belowMin = min != null && num < min;
  const valid = !isNaN(num) && !belowMin && num !== value;
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">{title}</div>
        {sub && <div className="tag" style={{ fontSize: 11, marginBottom: 10 }}>{sub}</div>}
        <div className="m-pe-cur">Current value <b className="data">{value == null ? "—" : value + (unit ? " " + unit : "")}</b></div>
        <div className="m-pe-stepper">
          <button onClick={() => bump(-st)} aria-label="Decrease"><MIcon name="minus" size={20} /></button>
          <input className="m-pe-input" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label={title} />
          {unit && <span className="m-pe-unit">{unit}</span>}
          <button onClick={() => bump(st)} aria-label="Increase"><MIcon name="plus" size={20} /></button>
        </div>
        {belowMin && <div className="m-pe-reason" data-err="1">Must be ≥ {min}</div>}
        {!belowMin && !isNaN(num) && num !== value && <div className="m-pe-meta">
          <span>Change <b>{(num > (value || 0) ? "+" : "") + parseFloat((num - (value || 0)).toFixed(4))}</b></span>
          {min != null && <span>Minimum <b>{min}{unit ? " " + unit : ""}</b></span>}
        </div>}
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!valid}
            onClick={() => { onSave(num); mCloseSheet(); }}><MIcon name="check" size={16} /> Save</button>
        </div>
      </div>
    </div>
  );
}

// ---------- bulk edit (mirror of desktop RatnBulkEditDialog) ----------
const MRATN_BULK = [
  { key: "priority", label: "Priority", kind: "options", opts: () => RATN_PRIOS.map(([v, l]) => ({ value: v, label: l, swatch: MSEV[v].dot })) },
  { key: "groups", label: "Alarm group", kind: "options", opts: () => RATN_GROUPS.map((g) => ({ value: g, label: g })) },
  { key: "onDelay", label: "On-delay", kind: "num", suffix: "s" },
  { key: "offDelay", label: "Off-delay", kind: "num", suffix: "s" },
  { key: "resetAck", label: "Reset ack after", kind: "num", suffix: "min" },
  { key: "allowShelving", label: "Allow shelving", kind: "options", opts: () => [{ value: true, label: "Allowed" }, { value: false, label: "Blocked" }] },
  { key: "status", label: "Status", kind: "options", opts: () => RATN_STATUS_ORDER.map((k) => ({ value: k, label: RATN_STATUS[k].label, swatch: RATN_STATUS[k].dot })) },
  { key: "justification", label: "Justification", kind: "text", required: true },
];
function MRatnBulkSheet({ ids, onDone }) {
  const [on, setOn] = React.useState({});
  const [vals, setVals] = React.useState(() => {
    const v = {}; MRATN_BULK.forEach((f) => { v[f.key] = f.kind === "options" ? f.opts()[0].value : f.kind === "num" ? 0 : ""; }); return v;
  });
  const enabled = MRATN_BULK.filter((f) => on[f.key]);
  const invalid = enabled.some((f) => (f.kind === "text" && f.required && !String(vals[f.key]).trim()) || (f.kind === "num" && (isNaN(parseFloat(vals[f.key])) || parseFloat(vals[f.key]) < 0)));
  const apply = () => {
    const changes = {}; enabled.forEach((f) => { changes[f.key] = f.kind === "num" ? parseFloat(vals[f.key]) : vals[f.key]; });
    const prev = mRatnStore.ov;
    mRatnStore.patch(ids, { ...changes, modifiedBy: MRATN_BY, modifiedAt: MRATN_AT });
    mCloseSheet(); onDone && onDone();
    const what = enabled.length === 1 ? enabled[0].label : enabled.length + " fields";
    mToast(what + " updated for " + ids.length + " alarm" + (ids.length > 1 ? "s" : ""), "check", { label: "Undo", fn: () => mRatnStore.undo(prev) });
  };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">Edit {ids.length} alarm{ids.length > 1 ? "s" : ""}</div>
        <div className="m-de-help" style={{ marginBottom: 10 }}>Only the fields you switch on are written. Every other value on the selected alarms is left untouched.</div>
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {MRATN_BULK.map((f) => {
            const active = !!on[f.key];
            return (
              <div key={f.key} className={"mratn-bf" + (active ? " on" : "")}>
                <div className="mratn-bf-h">
                  <span className="mratn-bf-l">{f.label}{f.required && active && <span className="mratn-req">required</span>}</span>
                  <MSwitch on={active} label={"Change " + f.label} onToggle={() => setOn((p) => ({ ...p, [f.key]: !p[f.key] }))} />
                </div>
                {active && f.kind === "options" && <div className="m-chips" style={{ flexWrap: "wrap" }}>
                  {f.opts().map((o) => <button key={String(o.value)} className={"m-chip" + (vals[f.key] === o.value ? " on" : "")}
                    onClick={() => setVals((s) => ({ ...s, [f.key]: o.value }))}>{o.swatch && <span className="mratn-sw" style={{ background: o.swatch }} />}{o.label}</button>)}
                </div>}
                {active && f.kind === "num" && <div className="mratn-bf-num">
                  <input className="m-input" inputMode="decimal" value={vals[f.key]} onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))} aria-label={f.label} />
                  <span className="mratn-bf-suffix">{f.suffix}</span>
                </div>}
                {active && f.kind === "text" && <React.Fragment>
                  <textarea className="m-note-ta" rows={3} value={vals[f.key]} onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))} placeholder="Why this priority / these limits?" />
                  <div className="mratn-sugg">{RATN_JUSTIFY.slice(0, 2).map((s, i) => <button key={i} className="mratn-sugg-i" onClick={() => setVals((v) => ({ ...v, [f.key]: s }))}>{s}</button>)}</div>
                </React.Fragment>}
              </div>
            );
          })}
        </div>
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!enabled.length || invalid}
            onClick={apply}><MIcon name="check" size={16} /> Apply</button>
        </div>
      </div>
    </div>
  );
}

// ---------- register list ----------
const MRATN_PAGE = 25;
function RationalizationScreen({ focus }) {
  useNav(); const ov = useMRatnOv();
  // deep-link from an alarm: focus is a tag. Exact hit opens the record; otherwise it seeds
  // the search so the operator lands on the closest matching entries rather than nothing.
  const hit = React.useMemo(() => (focus ? RATN_DATA.find((r) => r.tag === focus || r.id === focus) : null), [focus]);
  const [q, setQ] = React.useState(focus && !hit ? focus : "");
  const [statusF, setStatusF] = React.useState("all");
  const [prioF, setPrioF] = React.useState(null);
  const [limit, setLimit] = React.useState(MRATN_PAGE);
  const [selMode, setSelMode] = React.useState(false);
  const [sel, setSel] = React.useState(() => new Set());

  const all = React.useMemo(() => RATN_DATA.map((b) => mRatnResolve(b, ov)), [ov]);
  const stats = React.useMemo(() => {
    const s = { total: all.length, rationalized: 0, "not-configured": 0, "re-evaluate": 0 };
    all.forEach((r) => { s[r.status]++; }); return s;
  }, [all]);
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => (statusF === "all" || r.status === statusF) && (!prioF || r.priority === prioF)
      && (!needle || (r.tag + " " + r.alarm + " " + r.area).toLowerCase().includes(needle)));
  }, [all, q, statusF, prioF]);
  const rows = filtered.slice(0, limit);
  React.useEffect(() => { setLimit(MRATN_PAGE); }, [q, statusF, prioF]);
  React.useEffect(() => { if (hit) mPush("ratnDetail", { id: hit.id }); }, [hit]);

  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exitSel = () => { setSelMode(false); setSel(new Set()); };
  const selVisible = rows.filter((r) => sel.has(r.id)).length;

  return (
    <React.Fragment>
      <MHeader back title="Rationalization" sub={stats.total.toLocaleString() + " alarms · ISA-18.2 §7"}
        right={<button className="m-icbtn" aria-label={selMode ? "Exit selection" : "Select alarms"} onClick={() => (selMode ? exitSel() : setSelMode(true))}>
          <MIcon name={selMode ? "x" : "list-checks"} size={19} /></button>} />
      <PullScroll>
        <div style={{ padding: "0 16px 8px" }}>
          <div className="mratn-kpis">
            {[["rationalized", "Rationalized"], ["not-configured", "Not configured"], ["re-evaluate", "Re-evaluate"]].map(([k, l]) => (
              <button key={k} className={"mratn-kpi" + (statusF === k ? " on" : "")} onClick={() => setStatusF(statusF === k ? "all" : k)}>
                <span className="mratn-kpi-n data">{stats[k]}</span>
                <span className="mratn-kpi-l"><span className="mratn-kpi-dot" style={{ background: RATN_STATUS[k].dot }} />{l}</span>
              </button>
            ))}
          </div>
          <div className="m-searchbar" style={{ marginBottom: 8 }}>
            <MIcon name="search" size={18} color="var(--slate-400)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag, alarm text, area…" aria-label="Search the alarm register" />
            {q && <button className="m-icbtn" aria-label="Clear search" onClick={() => setQ("")}><MIcon name="x" size={16} /></button>}
          </div>
          <div className="m-chips">
            <button className={"m-chip" + (!prioF ? " on" : "")} onClick={() => setPrioF(null)}>All priorities</button>
            {RATN_PRIOS.map(([lvl, lbl]) => (
              <button key={lvl} className={"m-chip" + (prioF === lvl ? " on" : "")} onClick={() => setPrioF(prioF === lvl ? null : lvl)}>
                <span className="mratn-sw" style={{ background: MSEV[lvl].dot }} />{lbl}</button>
            ))}
          </div>
        </div>
        <div className="m-pad" style={{ paddingBottom: selMode && sel.size ? 78 : 24 }}>
          <div className="mratn-count">{filtered.length.toLocaleString()} match{filtered.length === 1 ? "" : "es"}{selMode && sel.size ? " · " + sel.size + " selected" : ""}</div>
          <div className="m-list">
            {rows.map((r) => (
              <button key={r.id} className="m-lrow mratn-row" onClick={() => (selMode ? toggle(r.id) : mPush("ratnDetail", { id: r.id }))}>
                {selMode && <span className={"mratn-check" + (sel.has(r.id) ? " on" : "")}>{sel.has(r.id) && <MIcon name="check" size={14} color="#fff" />}</span>}
                <span className="mratn-rail" style={{ background: MSEV[r.priority].dot }} />
                <div className="m-lrow-main">
                  <div className="m-inline" style={{ gap: 6, marginBottom: 4 }}><MBadge level={r.priority} /><MRatnStatus status={r.status} small /></div>
                  <div className="m-lrow-t" style={{ fontSize: 13.5 }}>{r.alarm}</div>
                  <div className="m-lrow-s"><span className="tag">{r.tag}</span> · {r.area}</div>
                </div>
                <div className="m-lrow-r">{!selMode && <MIcon name="chevron-right" size={18} />}</div>
              </button>
            ))}
            {!rows.length && <div style={{ padding: "34px 16px", textAlign: "center", color: "var(--slate-500)", fontSize: 13 }}>No alarms match the current filter.</div>}
          </div>
          {filtered.length > rows.length && (
            <button className="m-btn m-btn-secondary" style={{ marginTop: 12 }} onClick={() => setLimit(limit + MRATN_PAGE)}>
              <MIcon name="chevron-down" size={16} /> Load {Math.min(MRATN_PAGE, filtered.length - rows.length)} more</button>
          )}
        </div>
      </PullScroll>
      {selMode && sel.size > 0 && (
        <div className="mratn-bulkbar">
          <span className="mratn-bulk-n"><b className="data">{sel.size}</b> selected{selVisible !== sel.size ? " (" + selVisible + " on screen)" : ""}</span>
          <button className="m-chip" onClick={() => setSel(new Set())}>Clear</button>
          <button className="m-btn m-btn-primary mratn-bulk-btn" onClick={() => mSheet(<MRatnBulkSheet ids={[...sel]} onDone={exitSel} />)}>
            <MIcon name="pencil" size={16} /> Edit fields</button>
        </div>
      )}
    </React.Fragment>
  );
}

// ---------- per-alarm record ----------
function MRatnField({ label, value, muted, onEdit, hint }) {
  const body = (
    <React.Fragment>
      <span className="mratn-fl">{label}</span>
      <span className={"mratn-fv" + (muted ? " muted" : "")}>{value}</span>
      {onEdit && <MIcon name="chevron-right" size={16} color="var(--slate-400)" />}
    </React.Fragment>
  );
  if (!onEdit) return <div className="mratn-frow ro">{body}</div>;
  return <button className="mratn-frow" onClick={onEdit} aria-label={"Edit " + label + ", currently " + value}>{body}</button>;
}

function RatnDetailScreen({ id }) {
  useNav(); const ov = useMRatnOv();
  const base = RATN_DATA.find((r) => r.id === id);
  if (!base) return <React.Fragment><MHeader back title="Alarm record" /><div className="m-pad" style={{ color: "var(--slate-500)", fontSize: 13 }}>This alarm is no longer in the register.</div></React.Fragment>;
  const r = mRatnResolve(base, ov);
  const set = (field, value, label) => mRatnEdit(r, field, value, label);
  const unit = r.unit || "";
  const pickPrio = () => mSheet(<MRatnOptionSheet title="Priority" sub={r.tag} value={r.priority}
    options={RATN_PRIOS.map(([v, l]) => ({ value: v, label: l, swatch: MSEV[v].dot }))} onPick={(v) => set("priority", v, "Priority")} />);
  const pickGroup = () => mSheet(<MRatnOptionSheet title="Alarm group" sub={r.tag} value={r.groups}
    options={RATN_GROUPS.map((g) => ({ value: g, label: g }))} onPick={(v) => set("groups", v, "Alarm group")} />);
  const pickStatus = () => mSheet(<MRatnOptionSheet title="Rationalization status" sub={r.tag} value={r.status}
    options={RATN_STATUS_ORDER.map((k) => ({ value: k, label: RATN_STATUS[k].label, swatch: RATN_STATUS[k].dot }))} onPick={(v) => set("status", v, "Status")} />);
  const num = (field, label, value, u, step, min) => mSheet(<MRatnNumSheet title={label} sub={r.tag} value={value} unit={u} step={step} min={min} onSave={(v) => set(field, v, label)} />);
  const text = (field, label, value, suggestions) => mSheet(<MRatnTextSheet title={label} sub={r.tag} value={value} suggestions={suggestions}
    placeholder={field === "justification" ? "Why this priority and these limits?" : "Operator note for this alarm…"} onSave={(v) => set(field, v, label)} />);

  const canRationalize = String(r.justification || "").trim().length > 0;
  const markRationalized = () => {
    if (!canRationalize) { text("justification", "Justification", r.justification, RATN_JUSTIFY.slice(0, 3)); return; }
    mConfirm({
      title: "Mark as rationalized?", body: r.alarm + " (" + r.tag + ") will be recorded as rationalized against the master alarm philosophy.",
      confirmLabel: "Mark rationalized", onConfirm: () => set("status", "rationalized", "Status"),
    });
  };

  return (
    <React.Fragment>
      <MHeader back title={r.tag} sub={r.area} />
      <PullScroll>
        <div className="m-pad" style={{ paddingBottom: 96 }}>
          <div className="mc" style={{ padding: "14px 15px", borderLeft: "4px solid " + MSEV[r.priority].dot }}>
            <div className="m-inline" style={{ gap: 7, marginBottom: 7 }}><MBadge level={r.priority} /><MRatnStatus status={r.status} /></div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{r.alarm}</div>
            <div className="m-lrow-s" style={{ marginTop: 5, whiteSpace: "normal" }}>{r.equipment} · {r.system}</div>
            <div className="mratn-mod">{r.modifiedAt ? "Last modified " + r.modifiedAt + " · " + (r.modifiedBy || "—") : "Never rationalized"}</div>
          </div>

          <div className="m-eyebrow" style={{ marginTop: 16 }}>Classification</div>
          <div className="mratn-fields">
            <MRatnField label="Priority" value={MRATN_PRIO_LABEL[r.priority]} onEdit={pickPrio} />
            <MRatnField label="Alarm group" value={r.groups || "Ungrouped"} muted={!r.groups} onEdit={pickGroup} />
            <MRatnField label="Status" value={(RATN_STATUS[r.status] || RATN_STATUS["not-configured"]).label} onEdit={pickStatus} />
            <MRatnField label="Response time" value={r.responseTime || "—"} muted={!r.responseTime} />
            <MRatnField label="Class" value={r.cls || "—"} muted={!r.cls} />
          </div>

          <div className="m-eyebrow" style={{ marginTop: 16 }}>Limits &amp; timing</div>
          <div className="mratn-fields">
            <MRatnField label="Setpoint" value={r.setpoint == null ? "—" : r.setpoint + (unit ? " " + unit : "")}
              muted={r.setpoint == null} onEdit={() => num("setpoint", "Setpoint", r.setpoint, unit, 1)} />
            <MRatnField label="Deadband" value={r.deadband == null ? "—" : r.deadband + (unit ? " " + unit : "")}
              muted={r.deadband == null} onEdit={() => num("deadband", "Deadband", r.deadband, unit, 0.5, 0)} />
            <MRatnField label="On-delay" value={r.onDelay + " s"} onEdit={() => num("onDelay", "On-delay", r.onDelay, "s", 1, 0)} />
            <MRatnField label="Off-delay" value={r.offDelay + " s"} onEdit={() => num("offDelay", "Off-delay", r.offDelay, "s", 1, 0)} />
            <MRatnField label="Reset ack after" value={r.resetAck ? r.resetAck + " min" : "Never"} muted={!r.resetAck}
              onEdit={() => num("resetAck", "Reset ack after", r.resetAck, "min", 15, 0)} />
            <div className="mratn-frow ro">
              <span className="mratn-fl">Allow shelving</span>
              <span className={"mratn-fv" + (r.allowShelving ? "" : " muted")}>{r.allowShelving ? "Allowed" : "Blocked"}</span>
              <MSwitch on={!!r.allowShelving} label="Allow shelving" onToggle={() => set("allowShelving", !r.allowShelving, "Allow shelving")} />
            </div>
          </div>

          <div className="m-eyebrow" style={{ marginTop: 16 }}>Rationale</div>
          <div className="mratn-fields">
            <button className="mratn-long" onClick={() => text("justification", "Justification", r.justification, RATN_JUSTIFY.slice(0, 3))}>
              <div className="mratn-long-h"><span className="mratn-fl">Justification</span><MIcon name="pencil" size={14} color="var(--slate-400)" /></div>
              <p className={"mratn-long-p" + (r.justification ? "" : " muted")}>{r.justification || "Not recorded. Required before this alarm can be marked rationalized."}</p>
            </button>
            <button className="mratn-long" onClick={() => text("comment", "Comment", r.comment)}>
              <div className="mratn-long-h"><span className="mratn-fl">Comment</span><MIcon name="pencil" size={14} color="var(--slate-400)" /></div>
              <p className={"mratn-long-p" + (r.comment ? "" : " muted")}>{r.comment || "No operator comment."}</p>
            </button>
          </div>

          <div className="m-eyebrow" style={{ marginTop: 16 }}>Analysis (read-only)</div>
          <div className="mratn-fields">
            <div className="mratn-long ro"><div className="mratn-long-h"><span className="mratn-fl">Consequence</span></div>
              <p className={"mratn-long-p" + (r.consequence ? "" : " muted")}>{r.consequence || "Not recorded."}</p></div>
            <div className="mratn-long ro"><div className="mratn-long-h"><span className="mratn-fl">Probable cause</span></div>
              <p className={"mratn-long-p" + (r.cause ? "" : " muted")}>{r.cause || "Not recorded."}</p></div>
            <div className="mratn-long ro"><div className="mratn-long-h"><span className="mratn-fl">Corrective response</span></div>
              <p className={"mratn-long-p" + (r.response ? "" : " muted")}>{r.response || "Not recorded."}</p></div>
          </div>
        </div>
      </PullScroll>
      <div className="m-footbar"><div className="m-actions" style={{ marginTop: 0 }}>
        {r.status === "rationalized"
          ? <button className="m-btn m-btn-secondary" onClick={() => set("status", "re-evaluate", "Status")}><MIcon name="flag" size={16} /> Flag for re-evaluation</button>
          : <button className="m-btn m-btn-primary" onClick={markRationalized}><MIcon name="check-circle-2" size={16} /> {canRationalize ? "Mark rationalized" : "Add justification"}</button>}
      </div></div>
    </React.Fragment>
  );
}

Object.assign(window, { mRatnStore, useMRatnOv, mRatnResolve, mRatnEdit, MRatnStatus, MRatnOptionSheet, MRatnTextSheet,
  MRatnNumSheet, MRatnBulkSheet, RationalizationScreen, RatnDetailScreen, MRatnField });
