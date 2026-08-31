// fish-biology.jsx — Fish Biology / Fish Welfare (Fish Biology sidebar item)
// Structure: Overview · Mortality (summary → report / new registration) · Welfare (see fish-welfare.jsx).
// NOTE: welfare bands / derived "welfare score" verdicts were removed — the platform records
// 0–3 indicator scores per fish and nothing else. Do not reintroduce them.

function BioTabs({ active, onChange }) {
  const tabs = ["Overview", "Mortality", "Welfare"];
  return (
    <div className="segmented">
      {tabs.map((t) => <button key={t} className={"seg" + (t === active ? " active" : "")} onClick={() => onChange(t)}>{t}</button>)}
    </div>
  );
}

// ───────────────────────── shared data ─────────────────────────
// ───────────────────────── mortality ─────────────────────────
const CAUSES = [
  { label: "Unknown (F→C)", value: 63.5, color: "var(--primary)" },
  { label: "Handling", value: 28.0, color: "#7DD3FC" },
  { label: "Infectious (TAN / DPN)", value: 6.5, color: "var(--warning)" },
  { label: "Other", value: 2.0, color: "var(--slate-300)" },
];
const MORT_TOTAL = 22637;
function CauseDonut() {
  const size = 176, sw = 26, r = (size - sw) / 2 - 1, cx = size / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        {CAUSES.map((s, i) => {
          const len = (s.value / 100) * c;
          const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />;
          acc += len; return el;
        })}
      </svg>
      <div className="donut-center"><span className="lbl">Dead</span><span className="val" style={{ fontSize: 24 }}>{(MORT_TOTAL / 1000).toFixed(1)}k</span></div>
    </div>
  );
}
function CauseCard({ action }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="chart-pie" size={16} color="var(--slate-600)" /><span className="card-title">Cause of Death</span></div>
        {action}
      </div>
      <div className="card-body">
        <div className="donut-wrap">
          <CauseDonut />
          <div className="donut-legend">
            {CAUSES.map((c) => (
              <div className="legend-row" key={c.label}>
                <span className="legend-dot" style={{ background: c.color }} />
                <span className="legend-name">{c.label}</span>
                <span className="legend-pct">{c.value.toFixed(1)} %</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEADFISH = [
  { t: "05/03 07:48", loc: "Building 3 · Tank 4", n: 426 },
  { t: "04/03 07:48", loc: "Building 3 · Tank 4", n: 300 },
  { t: "03/03 09:44", loc: "Building 3 · Tank 5", n: 503 },
  { t: "03/03 09:41", loc: "DPT2 · Tank 3", n: 219 },
  { t: "02/03 09:32", loc: "DPT2 · Tank 2", n: 126 },
  { t: "02/03 08:43", loc: "DPT2 · Tank 1", n: 175 },
  { t: "01/03 10:56", loc: "Building 3 · Tank 1", n: 1091 },
  { t: "01/03 10:37", loc: "Building 3 · Tank 5", n: 858 },
];
function RegistrationsCard({ rows, action }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="list" size={16} color="var(--slate-600)" /><span className="card-title">Recent Registrations</span></div>
        {action}
      </div>
      <table className="tbl">
        <thead><tr><th>Time</th><th>Location</th><th className="num" style={{ textAlign: "right" }}>Fish</th></tr></thead>
        <tbody>
          {(rows || DEADFISH).map((d, i) => (
            <tr key={i}>
              <td><span className="data td-strong">{d.t}</span></td>
              <td>{d.loc}</td>
              <td className="num" style={{ textAlign: "right" }}><span className="data td-strong">{d.n.toLocaleString("nb-NO")}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// daily mortality timeline (2 series)
const DAYS14 = Array.from({ length: 14 }, (_, i) => `${17 + i > 28 ? 17 + i - 28 : 17 + i}`);
const MORT_A = [310, 280, 350, 540, 420, 380, 460, 700, 520, 480, 600, 858, 1091, 754];
const MORT_B = [180, 210, 160, 240, 300, 280, 220, 360, 410, 300, 280, 200, 320, 260];
function MortalityTimeline() {
  const W = 720, H = 210, max = 1200;
  const ticks = [1200, 900, 600, 300, 0];
  const xs = (i) => (i / (DAYS14.length - 1)) * W;
  const ys = (v) => H - (v / max) * H;
  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  return (
    <div className="lc">
      <div className="lc-plot">
        {ticks.map((t) => <div className="lc-grid" key={t} style={{ bottom: (t / max) * 100 + "%" }}><span className="gl">{t}</span></div>)}
        <svg className="lc-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <path d={path(MORT_A)} fill="none" stroke="var(--critical)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <path d={path(MORT_B)} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="lc-x">{DAYS14.map((d, i) => <span key={i}>{i % 2 === 0 ? d : ""}</span>)}</div>
      <div className="chart-legend" style={{ marginTop: 10 }}>
        <span className="ci"><span className="legend-dot" style={{ background: "var(--critical)" }} /> Building 3</span>
        <span className="ci"><span className="legend-dot" style={{ background: "var(--primary)" }} /> DPT2</span>
      </div>
    </div>
  );
}
function MortalityReport({ onBack }) {
  return (
    <React.Fragment>
      <button className="bio-back" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Mortality</button>
      <div className="bio-actionbar">
        <div className="bio-actionbar-l">
          <span className="ttl">Mortality Report</span>
          <span className="sub">Generate mortality report · 17 Feb – 02 Mar 2026</span>
        </div>
        <div className="bio-actions">
          <span className="select">Group by tank <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          <ExportMenu describe={(fmt) => "Export started: mortality report will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
        </div>
      </div>
      <div className="kpi-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Total Dead" value="22.6" unit="k" delta="11.77% of stock" deltaDir="down" icon="fish" />
        <KpiCard label="Avg Daily" value="754" delta="across 8 tanks" deltaDir="flat" icon="trending-down" />
        <KpiCard label="Peak Day" value="1091" delta="01 Mar · B3 Tank 1" deltaDir="down" icon="calendar" />
        <KpiCard label="Dominant Cause" value="63.5" unit="%" delta="Unknown (F→C)" deltaDir="flat" icon="chart-pie" />
      </div>
      <div className="bio-grid2">
        <div className="card">
          <div className="card-head"><div className="card-head-l"><Icon name="activity" size={16} color="var(--slate-600)" /><span className="card-title">Mortality Timeline · daily</span></div></div>
          <div className="card-body"><MortalityTimeline /></div>
        </div>
        <CauseCard />
      </div>
    </React.Fragment>
  );
}

// ---- multi-location deadfish registration (register several tanks in one pass) ----
// Locations come from the shared tank register (lib/facility.jsx): a hand-written list drifted
// into claiming DPT2 owned Tank 3, so the same tank number named a different department here
// than in the welfare register. **Never re-type a tank list.**
const DF_TANKS = njAllTanks().map((t) => ({ id: t.tag, label: t.bld + " · " + t.dept.split(" · ")[0] + " · Tank " + t.n, deptId: t.deptId, n: t.n }));
// Cause of death is a two-level register (cause → subcause): several countries report at the
// subcause level, so the list grows past what a <select> can serve. Hence a searchable picker
// — typing filters causes AND subcauses; a cause can still be logged on its own.
// DF_CAUSE_TREE + dfCauseLabel now live in lib/mortality-causes.jsx (shared with mobile).

function DfCausePicker({ row, line, onPick }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  const btnRef = React.useRef(null);
  // the row lives in a clipped, horizontally scrolling table — a fixed-position popover keeps
  // the list whole instead of being cut off by .dfx-card's overflow.
  const place = () => {
    const r = btnRef.current && btnRef.current.getBoundingClientRect();
    if (!r) return;
    const w = Math.max(300, r.width);
    const M = 12; // viewport margin
    const below = window.innerHeight - r.bottom - M, above = r.top - M;
    const drop = below >= 240 || below >= above; // prefer below unless clearly more room above
    // Clamp to the viewport: an un-clamped flip put the list at top:-119 in a short window,
    // making the first causes unreachable. The list height follows the space that exists.
    const avail = Math.max(180, (drop ? below : above) - 56);
    setPos({ left: Math.max(M, Math.min(r.left, window.innerWidth - w - M)), width: w, maxList: Math.min(264, avail),
      top: drop ? Math.min(r.bottom + 4, window.innerHeight - M - 120) : null,
      bottom: drop ? null : Math.min(window.innerHeight - r.top + 4, window.innerHeight - M - 120) });
  };
  const openNow = () => { place(); setOpen(true); };
  const close = (refocus) => { setOpen(false); setQ(""); if (refocus && btnRef.current) btnRef.current.focus(); };
  React.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    // capture + stopPropagation: Esc must dismiss the picker only — it was bubbling to the
    // dialog and closing the whole registration modal, losing every row the operator typed.
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(true); } };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc, true);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc, true);
      window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  const ql = q.trim().toLowerCase();
  const groups = DF_CAUSE_TREE.map((g) => {
    const hit = g.cause.toLowerCase().includes(ql);
    const subs = (g.subs || []).filter((s) => !ql || hit || s.toLowerCase().includes(ql));
    return (!ql || hit || subs.length) ? { cause: g.cause, subs } : null;
  }).filter(Boolean);
  const pick = (cause, sub) => { onPick({ cause, sub: sub || "" }); close(true); };
  const label = dfCauseLabel(row);
  return (
    <div className="dfx-cp-wrap" ref={ref}>
      <button type="button" ref={btnRef} className={"form-input sel dfx-causebtn" + (label ? "" : " dfx-ph")} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`Cause of death, line ${line}`} title={label || "Select cause"} onClick={() => (open ? setOpen(false) : openNow())}>
        <span className="dfx-causetxt">{row.cause ? <React.Fragment><span className="dfx-cause-1">{row.cause}</span>{row.sub && <span className="dfx-cause-2">{row.sub}</span>}</React.Fragment> : "Select cause…"}</span>
        <Icon name="chevron-down" size={14} color="var(--slate-400)" />
      </button>
      {open && pos && (
        <div className="dfx-cp" role="listbox" aria-label="Cause of death"
          style={{ left: pos.left, width: pos.width, top: pos.top == null ? "auto" : pos.top, bottom: pos.bottom == null ? "auto" : pos.bottom }}>
          <div className="dfx-cp-search field">
            <Icon name="search" size={14} color="var(--slate-400)" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cause or subcause…" aria-label="Search causes" />
          </div>
          <div className="dfx-cp-list" style={{ maxHeight: pos.maxList }}>
            {groups.length === 0 && <NjInline icon="search-x">No cause matches “{q.trim()}”</NjInline>}
            {groups.map((g) => (
              <div className="dfx-cp-grp" key={g.cause}>
                <button type="button" className={"dfx-cp-cause" + (row.cause === g.cause && !row.sub ? " on" : "")} onClick={() => pick(g.cause, "")}>
                  {g.cause}<span className="dfx-cp-n">{g.subs.length ? g.subs.length : "—"}</span>
                </button>
                {g.subs.map((s) => (
                  <button type="button" key={s} className={"dfx-cp-sub" + (row.cause === g.cause && row.sub === s ? " on" : "")} onClick={() => pick(g.cause, s)}>{s}</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const DF_BATCHES = FACILITY_BATCHES.map((x) => x.id); // shared list, lib/facility.jsx

// shared row state for a deadfish registration form (used by both the full page and the
// Fish Tank dock's quick-register modal)
function useDeadfishRows(initialLoc) {
  let seq = React.useRef(0);
  const newRow = (loc) => ({ key: ++seq.current, loc: loc || "", batch: "", cause: "", sub: "", n: "", comment: "" });
  const [rows, setRows] = React.useState(() => initialLoc ? [newRow(initialLoc)] : [newRow(), newRow(), newRow()]);
  const upd = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow(initialLoc)]);
  const removeRow = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newRow(initialLoc)]));
  const rowN = (r) => parseInt(r.n, 10) || 0;
  // A line is incomplete if it carries a count but is missing an identifying field — it will NOT
  // be registered, so it must never be inside the headline total (that total is a claim about
  // what was written to the mortality register).
  const rowReady = (r) => !!(r.loc && r.batch && r.cause && rowN(r) > 0);
  const rowIncomplete = (r) => rowN(r) > 0 && !rowReady(r);
  const valid = rows.filter(rowReady);
  const total = valid.reduce((a, r) => a + rowN(r), 0);
  const dropped = rows.filter(rowIncomplete).reduce((a, r) => a + rowN(r), 0);
  const locCount = new Set(valid.map((r) => r.loc)).size;
  return { rows, upd, addRow, removeRow, rowN, rowReady, rowIncomplete, total, dropped, valid, locCount };
}

// One registration line = one card of labelled fields (the app's standard .form-row /
// .form-input pattern), NOT a 7-column table: at ~400px the table clipped every control to
// its first letter and scrolled sideways. The grid reflows to one column instead.
function DeadfishTable({ rows, upd, addRow, removeRow, rowN, rowReady, rowIncomplete, locOptions, lockedLoc }) {
  const last = rows.length === 1;
  const missing = (r) => [!r.loc && !lockedLoc && "location", !r.batch && "batch", !r.cause && "cause of death"].filter(Boolean).join(", ");
  return (
    <div className="dfl">
      {rows.map((r, i) => (
        <div className={"dfl-line" + (rowReady(r) ? " on" : "") + (rowIncomplete(r) ? " warn" : "")} key={r.key}>
          <div className="dfl-head">
            <span className="dfl-n">Line <span className="data">{i + 1}</span></span>
            {lockedLoc && <span className="dfl-loc" title="Registering to the tank you opened this from"><Icon name="lock" size={12} color="var(--slate-400)" />{lockedLoc}</span>}
            {rowIncomplete(r) && <span className="dfl-warn"><Icon name="alert-triangle" size={12} /> Not registered — add {missing(r)}</span>}
            <button className="dfx-x" title={last ? "Clear line" : "Remove line"} aria-label={last ? `Clear line ${i + 1}` : `Remove line ${i + 1}`} onClick={() => removeRow(r.key)}><Icon name="trash-2" size={16} /></button>
          </div>
          <div className={"dfl-grid" + (lockedLoc ? "" : " withloc")}>
            {!lockedLoc && (
              <div className="form-row">
                <label htmlFor={`dfl-loc-${r.key}`}>Location</label>
                <select id={`dfl-loc-${r.key}`} className={"form-input" + (r.loc ? "" : " dfx-ph")} value={r.loc} onChange={(ev) => upd(r.key, { loc: ev.target.value })}>
                  <option value="">Select location…</option>
                  {locOptions.map((t) => <option key={t.id} value={t.label}>{t.label}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <label htmlFor={`dfl-batch-${r.key}`}>Batch</label>
              <select id={`dfl-batch-${r.key}`} className={"form-input dfx-mono" + (r.batch ? "" : " dfx-ph")} value={r.batch} onChange={(ev) => upd(r.key, { batch: ev.target.value })}>
                <option value="">Select batch…</option>
                {DF_BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-row dfl-cause">
              <label id={`dfl-cause-${r.key}`}>Cause of death</label>
              <DfCausePicker row={r} line={i + 1} onPick={(v) => upd(r.key, v)} />
            </div>
            <div className="form-row dfl-count">
              <label htmlFor={`dfl-n-${r.key}`}>Count</label>
              <input id={`dfl-n-${r.key}`} className="form-input dfx-count data" type="number" min="0" placeholder="0" value={r.n} onChange={(ev) => upd(r.key, { n: ev.target.value })} />
            </div>
            <div className="form-row dfl-comment">
              <label htmlFor={`dfl-c-${r.key}`}>Comment</label>
              <input id={`dfl-c-${r.key}`} className="form-input" type="text" placeholder="Optional note…" value={r.comment} onChange={(ev) => upd(r.key, { comment: ev.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <div className="dfl-foot">
        <button className="df-add dfx-add" onClick={addRow}><Icon name="plus" size={16} /> Add line</button>
        <span className="dfx-add-hint">{lockedLoc ? "Add a line per cause of death — all lines register to " + lockedLoc : "A location can appear on several lines for multiple causes"}</span>
      </div>
    </div>
  );
}

function DeadfishForm({ onBack }) {
  const { rows, upd, addRow, removeRow, rowN, rowReady, rowIncomplete, total, dropped, valid, locCount } = useDeadfishRows();
  const register = () => {
    njToast(`Registered ${total} mortalities across ${locCount} location${locCount === 1 ? "" : "s"} · ${valid.length} entr${valid.length === 1 ? "y" : "ies"}.`, "Mortality", onBack);
    onBack && onBack();
  };

  return (
    <React.Fragment>
      <button className="bio-back" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Mortality</button>
      <div className="bio-actionbar">
        <div className="bio-actionbar-l">
          <span className="ttl">Mortality Registration</span>
          <span className="sub">Log mortality by location and cause: a location can have several causes</span>
        </div>
        <div className="bio-actions">
          <label className="dfx-time">
            <span className="dfx-time-l">Registered</span>
            <span className="dfx-time-v"><Icon name="calendar" size={14} color="var(--slate-400)" /> 05 Mar 2026 · 13:21</span>
          </label>
        </div>
      </div>

      <div className="card dfx-card">
        <DeadfishTable rows={rows} upd={upd} addRow={addRow} removeRow={removeRow} rowN={rowN} rowReady={rowReady} rowIncomplete={rowIncomplete} locOptions={DF_TANKS} />
      </div>

      <div className="dfx-foot">
        <div className="dfx-summary" role="status" aria-live="polite">
          <span className="dfx-tot-wrap"><span className="dfx-tot data">{total.toLocaleString("nb-NO")}</span><span className="dfx-tot-l">total mortalities</span></span>
          <span className="dfx-foot-sep" aria-hidden="true">·</span>
          <span className="dfx-foot-meta">{valid.length} valid entr{valid.length === 1 ? "y" : "ies"} across {locCount} location{locCount === 1 ? "" : "s"}</span>
          {dropped > 0 && <span className="dfx-foot-warn"><Icon name="alert-triangle" size={14} /> {dropped} on incomplete lines will not be registered</span>}
        </div>
        <div className="dfx-foot-r">
          <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
          <button className="btn btn-primary" disabled={valid.length === 0} onClick={register}><Icon name="check" size={16} /> Register</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// quick-register modal: same table/logic as the full page, opened from the Fish Tank dock
// without leaving the tank — prefilled to this tank's location, single row by default.
function DeadfishRegisterDialog({ tank }) {
  const hit = DF_TANKS.find((t) => t.n === tank.n);
  const initialLoc = hit ? hit.label : "";
  const { rows, upd, addRow, removeRow, rowN, rowReady, rowIncomplete, total, dropped, valid } = useDeadfishRows(initialLoc);
  const register = () => {
    closeDialog();
    njToast(`Registered ${total} mortalities · Tank ${tank.n} · ${valid.length} entr${valid.length === 1 ? "y" : "ies"}.`, "Mortality", () => window.__njNavigate && window.__njNavigate("biology"));
  };
  return (
    <Dialog width={860}>
      <DlgHeader icon="clipboard-list" name="Mortality Registration" tag={"Tank " + tank.n} onClose={closeDialog} />
      <div className="dlg-body dfx-dlg-body">
        <p className="caption" style={{ margin: "0 0 12px" }}>Log mortality for {initialLoc || "Tank " + tank.n} by cause — one line per cause. Registered 05 Mar 2026 · 13:21.</p>
        <div className="card dfx-card">
          <DeadfishTable rows={rows} upd={upd} addRow={addRow} removeRow={removeRow} rowN={rowN} rowReady={rowReady} rowIncomplete={rowIncomplete} locOptions={DF_TANKS} lockedLoc={initialLoc} />
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dfx-summary" role="status" aria-live="polite">
          <span className="dfx-tot-wrap"><span className="dfx-tot data">{total.toLocaleString("nb-NO")}</span><span className="dfx-tot-l">total mortalities</span></span>
          <span className="dfx-foot-sep" aria-hidden="true">·</span>
          {dropped > 0 && <span className="dfx-foot-warn"><Icon name="alert-triangle" size={14} /> {dropped} on incomplete lines will not be registered</span>}
          <button className="linkbtn" onClick={() => { closeDialog(); window.__njDeadfishPending = true; window.__njNavigate && window.__njNavigate("biology"); }}>Register several locations <Icon name="arrow-up-right" size={14} /></button>
        </span>
        <span style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={valid.length === 0} onClick={register}><Icon name="check" size={16} /> Register</button>
        </span>
      </div>
    </Dialog>
  );
}

function MortalitySection() {
  // deep-link: the tank dock's "Register mortality" lands straight on the registration form
  const [view, setView] = React.useState(() => {
    if (window.__njDeadfishPending) { window.__njDeadfishPending = false; return "new"; }
    return "summary";
  }); // summary | report | new
  if (view === "report") return <MortalityReport onBack={() => setView("summary")} />;
  if (view === "new") return <DeadfishForm onBack={() => setView("summary")} />;
  return (
    <React.Fragment>
      <div className="bio-actionbar">
        <div className="bio-actionbar-l">
          <span className="ttl">Mortality</span>
          <span className="sub">22.6k dead · 30 days · 4 active batches</span>
        </div>
        <div className="bio-actions">
          <button className="btn btn-secondary" onClick={() => setView("report")}><Icon name="bar-chart-2" size={16} /> Mortality report</button>
          <button className="btn btn-primary" onClick={() => setView("new")}><Icon name="plus" size={16} /> New registration</button>
        </div>
      </div>
      <div className="bio-grid2">
        <CauseCard action={<button className="linkbtn" onClick={() => setView("report")}>Full report <Icon name="arrow-up-right" size={14} /></button>} />
        <RegistrationsCard action={<button className="linkbtn" onClick={() => setView("new")}><Icon name="plus" size={14} /> Register</button>} />
      </div>
    </React.Fragment>
  );
}

// ───────────────────────── overview ─────────────────────────
function OverviewTab({ onGoto }) {
  const regs = window.WF_REGS || [];
  const openReg = regs.filter((r) => r.state === "ongoing");
  const scored = regs.filter((r) => /Feb 2026|Mar 2026/.test(r.period)).reduce((s, r) => s + (r.state === "ongoing" ? r.done : r.fish), 0);
  const latest = regs.find((r) => r.state === "complete");
  return (
    <React.Fragment>
      <div className="kpi-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Mortality · 30d" value="22.6" unit="k" delta="11.77 % of stock" deltaDir="down" icon="fish" />
        <KpiCard label="Active Batches" value="4" delta="across 3 buildings" deltaDir="flat" icon="layers" />
        <KpiCard label="Open Registrations" value={String(openReg.length)} delta={openReg.length ? openReg[0].loc + " · " + openReg[0].done + "/" + openReg[0].fish : "none in progress"} deltaDir="flat" icon="clipboard-list" onClick={() => onGoto("Welfare")} />
        <KpiCard label="Fish Scored · 30d" value={scored.toLocaleString("nb-NO")} delta={regs.length + " registrations logged"} deltaDir="flat" icon="clipboard-check" onClick={() => onGoto("Welfare")} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <CauseCard action={<button className="linkbtn" onClick={() => onGoto("Mortality")}>Mortality <Icon name="arrow-up-right" size={14} /></button>} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <window.WfRegistrationsCard limit={4} onOpen={() => onGoto("Welfare")} />
      </div>
      {latest && <window.WfDistributionCard reg={latest} />}
    </React.Fragment>
  );
}

function FishBiologyScreen() {
  const [tab, setTab] = React.useState(window.__njDeadfishPending ? "Mortality" : "Overview");
  const subs = { Overview: "Welfare & mortality at a glance", Mortality: "Mortality registration & cause analysis", Welfare: "Registrations, per-fish scoring (0–3) & indicator reports" };
  return (
    <AppShell active="biology" title="Fish Biology" crumbs={[tab]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{subs[tab]}</p>
          </div>
          <div className="pagehead-right"><BioTabs active={tab} onChange={setTab} /></div>
        </div>
      </div>
      {tab === "Overview" && <OverviewTab onGoto={setTab} />}
      {tab === "Mortality" && <MortalitySection />}
      {tab === "Welfare" && <window.WelfareSection />}
    </AppShell>
  );
}

// entry point used by the Fish Tank dock: register mortality without leaving the tank
function njOpenDeadfishRegistration(tank) {
  if (tank) { openDialog(<DeadfishRegisterDialog tank={tank} />); return; }
  window.__njDeadfishPending = true;
  if (window.__njNavigate) window.__njNavigate("biology");
}

Object.assign(window, { FishBiologyScreen, njOpenDeadfishRegistration, DeadfishRegisterDialog });

