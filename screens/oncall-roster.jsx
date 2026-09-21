// oncall-roster.jsx — DUTY SHIFTS, the duty roster, and the by-person view of on-call.
//
// Why this exists: configuring WHO a group pages and saying WHO IS ON DUTY TONIGHT are two
// different acts, performed by different people at different rhythms. Both legacy sites split
// them — a Schedule Manager defines named schedules once, a Vaktliste picks active operators per
// schedule each shift, and only then are those people placed on the alarm groups. Our build had
// collapsed all three into "edit the group", so the daily act required an admin screen.
//
// A SHIFT IS NOT A PERSON'S WORKING HOURS. It is a named duty window (Daytime, Duty phone,
// Backup) that a person is rostered onto. The group's paging window still says when the GROUP is
// paged; the shift says when that member is reachable. An alarm lands when both allow it, which
// is why coverage below is computed as an intersection and not read off either one alone.
// Off duty = no shift = paged by nothing, and it is a visible column, never an absence.

const SH_LS = "nj_oncall_shifts_v1";
const SH_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SH_DAY_L = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
function shWin(wd, we) { return { mon: wd, tue: wd, wed: wd, thu: wd, fri: wd, sat: we || [], sun: we || [] }; }

// Seeded from what the two sites actually run. Daytime carries a lunch break on purpose: a
// schedule has to be able to hold more than one interval a day, which a single window cannot.
const SH_SEED = {
  shifts: [
    { id: "sh_always", name: "Around the clock", desc: "Reachable at any hour, every day", builtin: true, win: shWin(["00:00-24:00"], ["00:00-24:00"]) },
    { id: "sh_day", name: "Daytime", desc: "Weekday working hours", win: shWin(["07:00-11:30", "12:00-15:00"], []) },
    { id: "sh_duty", name: "Duty phone", desc: "Every hour outside weekday working hours", win: shWin(["15:00-07:00"], ["00:00-24:00"]) },
    { id: "sh_backup", name: "Backup", desc: "Second line behind the duty phone", win: shWin(["15:00-07:00"], ["00:00-24:00"]) },
  ],
  roster: { vt1: "sh_always", vt2: "sh_always", lum: "sh_day", ov: "sh_day", jlo: "sh_duty", sk: "sh_duty", kgr: "sh_backup", elel: "sh_backup" },
};

function shClone(x) { return JSON.parse(JSON.stringify(x)); }
function shLoad() {
  try { const r = JSON.parse(localStorage.getItem(SH_LS)); if (r && Array.isArray(r.shifts)) return r; } catch (e) {}
  return shClone(SH_SEED);
}
const shiftStore = {
  data: shLoad(), subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); try { localStorage.setItem(SH_LS, JSON.stringify(this.data)); } catch (e) {} },
  get shifts() { return this.data.shifts; },
  get roster() { return this.data.roster; },
  shiftOf(memberId) { const id = this.data.roster[memberId]; return id ? this.shifts.find((s) => s.id === id) || null : null; },
  members(shiftId) { return Object.keys(this.data.roster).filter((m) => this.data.roster[m] === shiftId); },
  assign(memberId, shiftId) { const r = Object.assign({}, this.data.roster); if (shiftId) r[memberId] = shiftId; else delete r[memberId]; this.data.roster = r; this.emit(); },
  upsert(s) { const i = this.shifts.findIndex((x) => x.id === s.id); this.data.shifts = i >= 0 ? this.shifts.map((x) => (x.id === s.id ? s : x)) : this.shifts.concat([s]); this.emit(); },
  // deleting a shift un-rosters everyone on it rather than leaving dangling ids: a person whose
  // shift disappeared is off duty, and that has to be visible, not inferred
  remove(id) { this.data.shifts = this.shifts.filter((x) => x.id !== id); const r = Object.assign({}, this.data.roster); Object.keys(r).forEach((k) => { if (r[k] === id) delete r[k]; }); this.data.roster = r; this.emit(); },
  duplicate(id) { const s = this.shifts.find((x) => x.id === id); if (!s) return; const c = shClone(s); c.id = "sh" + Date.now(); c.name = s.name + " (copy)"; delete c.builtin; this.data.shifts = this.shifts.concat([c]); this.emit(); },
};
function useShifts() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => shiftStore.sub(force), []); return shiftStore; }

// ── time helpers ──
function shMin(t) { const p = String(t).split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); }
// an interval that ends before it starts wraps midnight; it is split so every segment is
// comparable inside one day. (The wrapped tail is credited to the same day — a warning-grade
// approximation, and the only place it matters is the coverage gap list below.)
function shSegs(iv) { const p = String(iv).split("-"); const a = shMin(p[0]), b = shMin(p[1]); if (b > a) return [[a, b]]; if (b === a) return [[0, 1440]]; return [[a, 1440], [0, b]]; }
function shHHMM(m) { const h = Math.floor(m / 60), x = m % 60; return (h < 10 ? "0" : "") + h + ":" + (x < 10 ? "0" : "") + x; }
function shUnion(segs) { const s = segs.slice().sort((a, b) => a[0] - b[0]); const out = []; s.forEach((x) => { const l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push([x[0], x[1]]); }); return out; }
function shSubtract(base, cov) {
  let out = [];
  base.forEach((b) => {
    let cur = [b.slice()];
    cov.forEach((c) => { const nx = []; cur.forEach((x) => { if (c[1] <= x[0] || c[0] >= x[1]) { nx.push(x); return; } if (c[0] > x[0]) nx.push([x[0], c[0]]); if (c[1] < x[1]) nx.push([c[1], x[1]]); }); cur = nx; });
    out = out.concat(cur);
  });
  return out.filter((x) => x[1] - x[0] > 5); // ignore minute-scale slivers
}
function shDaySegs(s, d) { const out = []; (s.win[d] || []).forEach((iv) => shSegs(iv).forEach((x) => out.push(x))); return shUnion(out); }
function shSummary(s) {
  const on = SH_DAYS.filter((d) => (s.win[d] || []).length);
  if (!on.length) return "No window";
  const uniq = Array.from(new Set(on.map((d) => (s.win[d] || []).join(","))));
  const days = on.length === 7 ? "every day" : on.map((d) => SH_DAY_L[d]).join(" ");
  const hours = uniq.length === 1 ? (s.win[on[0]] || []).map((iv) => iv.replace("-", "–")).join(", ") : "Mixed hours";
  return hours + " · " + days;
}
function shHours(s) { let m = 0; SH_DAYS.forEach((d) => shDaySegs(s, d).forEach((x) => { m += x[1] - x[0]; })); return Math.round(m / 60); }
function njShiftOf(id) { return shiftStore.shiftOf(id); }

// ── coverage ──
// The question a control room actually asks: for every hour this group can be paged, is at
// least one first-line member rostered? Anything else is a list of names, not an answer.
function shGroupGaps(g) {
  const ids = (g.tiers && g.tiers.p1) || [];
  const shifts = ids.map((id) => shiftStore.shiftOf(id)).filter(Boolean);
  const gaps = [];
  SH_DAYS.forEach((d) => {
    const w = g.win && g.win[d];
    if (!w) return;
    const base = shUnion(shSegs(w));
    const cov = shUnion(shifts.reduce((out, s) => out.concat(shDaySegs(s, d)), []));
    shSubtract(base, cov).forEach((x) => gaps.push({ day: d, from: shHHMM(x[0]), to: shHHMM(x[1] >= 1440 ? 1439 : x[1]) }));
  });
  return gaps;
}
function shCoverage() {
  const groups = ((window.oncallStore && window.oncallStore.groups) || []).filter((g) => g.enabled);
  const out = { noFirst: [], allOff: [], noThird: [], gaps: [], idle: [] };
  groups.forEach((g) => {
    const p1 = (g.tiers && g.tiers.p1) || [];
    if (!p1.length) { out.noFirst.push(g); return; }
    if (!p1.some((id) => shiftStore.shiftOf(id))) out.allOff.push(g);
    if (!((g.tiers && g.tiers.p3) || []).length) out.noThird.push(g);
    const gaps = shGroupGaps(g);
    if (gaps.length) out.gaps.push({ g: g, gaps: gaps });
  });
  const paged = new Set();
  groups.forEach((g) => ["p1", "p2", "p3"].forEach((t) => ((g.tiers && g.tiers[t]) || []).forEach((id) => paged.add(id))));
  Object.keys(shiftStore.roster).forEach((id) => { if (!paged.has(id)) out.idle.push(id); });
  return out;
}

// ── small parts ──
function ShiftBadge({ id, compact }) {
  const s = shiftStore.shiftOf(id);
  if (!s) return <span className="ocr-badge off" title="Not on the duty roster — this member is paged by nothing">Off duty</span>;
  return <span className="ocr-badge" title={s.name + " · " + shSummary(s)}>{compact ? s.name : s.name}</span>;
}

function ShiftPicker({ used, onPick, onClose }) {
  const [q, setQ] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  const ql = q.trim().toLowerCase();
  const avail = ocRoster().filter((m) => !used.includes(m.id) && (!ql || m.name.toLowerCase().includes(ql)));
  return (
    <div className="oc-menu" ref={ref}>
      <div className="oc-menu-search"><Icon name="search" size={14} color="var(--slate-400)" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people &amp; phones…" /></div>
      <div className="oc-menu-list">
        {avail.map((m) => (
          <button key={m.id} className="oc-menu-item" onClick={() => onPick(m.id)}>
            <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
            <span className="oc-menu-name">{m.name}</span>
            <span className="oc-menu-role">{shiftStore.shiftOf(m.id) ? shiftStore.shiftOf(m.id).name : "Off duty"}</span>
          </button>
        ))}
        {!avail.length && <NjInline>Everyone is already on this shift.</NjInline>}
      </div>
    </div>
  );
}

// ── the roster board ──
function OcRosterBoard() {
  const store = useShifts();
  const [open, setOpen] = React.useState(null);
  const offDuty = ocRoster().filter((m) => !store.roster[m.id]);
  return (
    <div className="ocr-board">
      <div className="ocr-col ocr-col-off">
        <div className="ocr-col-h"><span className="ocr-col-n">Off duty</span><span className="ocr-col-c data">{offDuty.length}</span></div>
        <p className="ocr-col-d">Paged by nothing, whatever the groups say.</p>
        <div className="ocr-col-body">
          {offDuty.map((m) => <span key={m.id} className="ocr-person off"><Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />{m.name}</span>)}
          {!offDuty.length && <span className="ocr-empty">Everyone is on a shift.</span>}
        </div>
      </div>
      {store.shifts.map((s) => {
        const ids = store.members(s.id);
        return (
          <div className="ocr-col" key={s.id}>
            <div className="ocr-col-h"><span className="ocr-col-n">{s.name}</span><span className="ocr-col-c data">{ids.length}</span></div>
            <p className="ocr-col-d">{shSummary(s)}</p>
            <div className="ocr-col-body">
              {ids.map((id) => {
                const m = ocMember(id);
                return (
                  <span key={id} className="ocr-person">
                    <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
                    <span className="ocr-person-n">{m.name}</span>
                    <button className="oc-chip-x" title="Move to Off duty" onClick={() => shiftStore.assign(id, null)}><Icon name="x" size={14} /></button>
                  </span>
                );
              })}
              {!ids.length && <span className="ocr-empty">No one on this shift.</span>}
            </div>
            <div className="oc-add-wrap">
              <button className="member-add" onClick={() => setOpen(open === s.id ? null : s.id)}><Icon name="plus" size={14} /> Assign</button>
              {open === s.id && <ShiftPicker used={ids} onPick={(mid) => { shiftStore.assign(mid, s.id); setOpen(null); }} onClose={() => setOpen(null)} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── shift (schedule) editor ──
function ShiftEditorDialog({ shift }) {
  const editing = !!shift;
  const [s, setS] = React.useState(() => shift ? shClone(shift) : { id: "sh" + Date.now(), name: "", desc: "", win: shWin(["08:00-16:00"], []) });
  const set = (patch) => setS(Object.assign({}, s, patch));
  const setDay = (d, list) => { const w = Object.assign({}, s.win); w[d] = list; set({ win: w }); };
  const edit = (d, i, v) => { const l = (s.win[d] || []).slice(); l[i] = v; setDay(d, l); };
  const canSave = s.name.trim().length > 0;
  return (
    <Dialog width={640}>
      <DlgHeader icon={editing ? "pencil" : "calendar-plus"} name={editing ? "Edit shift" : "New shift"} onClose={closeDialog} />
      <div className="dlg-body oc-editor">
        <div className="oc-ed-row">
          <label className="field"><span className="field-l">Name</span><input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Duty phone" /></label>
          <label className="field" style={{ flex: 2 }}><span className="field-l">Description</span><input value={s.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="Every hour outside weekday working hours" /></label>
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Hours</span>
          <p className="oc-mininfo">When someone rostered on this shift is reachable. A day can hold more than one interval — that is how a break inside a working day is expressed. An interval that ends before it starts runs past midnight.</p>
          <div className="ocr-days">
            {SH_DAYS.map((d) => (
              <div className="ocr-day" key={d}>
                <span className="ocr-day-l">{SH_DAY_L[d]}</span>
                <div className="ocr-day-ivs">
                  {(s.win[d] || []).map((iv, i) => (
                    <span className="ocr-iv" key={i}>
                      <input value={iv} onChange={(e) => edit(d, i, e.target.value)} placeholder="08:00-16:00" />
                      <button className="oc-chip-x" title="Remove interval" onClick={() => setDay(d, (s.win[d] || []).filter((x, j) => j !== i))}><Icon name="x" size={13} /></button>
                    </span>
                  ))}
                  <button className="ocr-iv-add" onClick={() => setDay(d, (s.win[d] || []).concat(["08:00-16:00"]))} title="Add an interval to this day"><Icon name="plus" size={13} /></button>
                  {!(s.win[d] || []).length && <span className="ocr-empty">Not on duty</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="ocr-copy">
            <button className="btn btn-secondary btn-sm" onClick={() => { const w = Object.assign({}, s.win); ["tue", "wed", "thu", "fri"].forEach((d) => { w[d] = (s.win.mon || []).slice(); }); set({ win: w }); }}>
              <Icon name="copy" size={14} /> Copy Monday to Tue–Fri</button>
            <span className="ocr-total data">{shHours(s)} <span className="u">h / week</span></span>
          </div>
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!canSave} onClick={() => { shiftStore.upsert(s); closeDialog(); njToast((editing ? "Updated " : "Created ") + s.name + "."); }}>
          <Icon name="check" size={16} /> {editing ? "Save" : "Create"}</button>
      </div>
    </Dialog>
  );
}
function openShiftEditor(s) { openDialog(<ShiftEditorDialog shift={s} />); }

function OcShiftList() {
  const store = useShifts();
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="calendar-clock" size={16} color="var(--slate-600)" /><span className="card-title">Shifts</span></div>
        <button className="btn btn-secondary btn-sm" onClick={() => openShiftEditor(null)}><Icon name="calendar-plus" size={14} /> New shift</button>
      </div>
      <table className="tbl">
        <thead><tr><th>NAME</th><th>DESCRIPTION</th><th>HOURS</th><th>ON SHIFT</th><th></th></tr></thead>
        <tbody>
          {store.shifts.map((s) => (
            <tr key={s.id}>
              <td><b>{s.name}</b>{s.builtin && <span className="ocr-badge built" title="Built-in shift">Built-in</span>}</td>
              <td className="ocr-td-d">{s.desc}</td>
              <td><span className="data">{shSummary(s)}</span></td>
              <td><span className="data">{store.members(s.id).length}</span></td>
              <td className="ocr-td-a">
                <button className="icon-btn" title="Edit shift" onClick={() => openShiftEditor(s)}><Icon name="pencil" size={16} /></button>
                <button className="icon-btn" title="Duplicate" onClick={() => shiftStore.duplicate(s.id)}><Icon name="copy" size={16} /></button>
                <button className="icon-btn" title="Delete" disabled={s.builtin} onClick={() => openDialog(
                  <ConfirmDialog title="Delete shift" message={"Delete “" + s.name + "”?"} danger
                    detail={store.members(s.id).length ? store.members(s.id).length + " rostered on it move to Off duty and are paged by nothing." : "No one is rostered on it."}
                    confirmLabel="Delete" onConfirm={() => { shiftStore.remove(s.id); njToast("Shift deleted."); }} />
                )}><Icon name="trash-2" size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── by-person view ──
// The matrix question the group cards cannot answer: what is THIS person paged for, and where
// in line? One row per member, their shift, and every group/tier they sit on.
function OcPersonView() {
  useShifts();
  const store = window.oncallStore;
  const groups = (store && store.groups) || [];
  const [q, setQ] = React.useState("");
  const [onlyDuty, setOnlyDuty] = React.useState(false);
  const ql = q.trim().toLowerCase();
  const rows = ocRoster()
    .filter((m) => !ql || m.name.toLowerCase().includes(ql))
    .filter((m) => !onlyDuty || shiftStore.shiftOf(m.id))
    .map((m) => {
      const at = [];
      groups.forEach((g) => ["p1", "p2", "p3"].forEach((t, i) => { if (((g.tiers && g.tiers[t]) || []).includes(m.id)) at.push({ g: g, n: i + 1 }); }));
      return { m: m, at: at };
    });
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="users" size={16} color="var(--slate-600)" /><span className="card-title">By person</span></div>
        <div className="ocr-head-r">
          <div className="field ocr-search"><Icon name="search" size={14} color="var(--slate-400)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter people…" /></div>
          <button className={"btn btn-secondary btn-sm" + (onlyDuty ? " btn-active" : "")} onClick={() => setOnlyDuty(!onlyDuty)}><Icon name="filter" size={14} /> On duty only</button>
        </div>
      </div>
      <table className="tbl">
        <thead><tr><th>NAME</th><th>SHIFT</th><th>PAGED FOR</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.m.id}>
              <td><Icon name={r.m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" /> {r.m.name}</td>
              <td><ShiftBadge id={r.m.id} /></td>
              <td>
                {r.at.length ? (
                  <div className="ocr-at">
                    {r.at.map((x, i) => <span className="ocr-at-i" key={i}><span className="oc-tier-n">{x.n}</span>{x.g.name}</span>)}
                  </div>
                ) : <span className="ocr-empty">No group pages this member.</span>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={3}><span className="ocr-empty">No one matches that filter.</span></td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── coverage summary ──
// The legacy banner said "No receivers are third in line" and nothing else. This is the same
// idea taken to the questions that actually put fish at risk, worst first.
function OcCoverageCard() {
  useShifts();
  const c = shCoverage();
  const rows = [];
  c.noFirst.forEach((g) => rows.push({ sev: "crit", t: g.name + " has no one on Priority 1", d: "An alarm in this group reaches nobody." }));
  c.allOff.forEach((g) => rows.push({ sev: "crit", t: g.name + ": every first-line member is off duty", d: "Assigned, but not on the roster — nothing will page." }));
  c.gaps.forEach((x) => {
    const g0 = x.gaps[0];
    rows.push({ sev: "warn", t: x.g.name + ": " + x.gaps.length + (x.gaps.length === 1 ? " uncovered hour block" : " uncovered hour blocks"), d: "First uncovered: " + SH_DAY_L[g0.day] + " " + g0.from + "–" + g0.to + " — inside the paging window, no first-line shift." });
  });
  if (c.noThird.length) rows.push({ sev: "info", t: c.noThird.length + (c.noThird.length === 1 ? " group has" : " groups have") + " no one third in line", d: c.noThird.map((g) => g.name).join(" · ") });
  if (c.idle.length) rows.push({ sev: "info", t: c.idle.length + " rostered but paged by nothing", d: c.idle.map((id) => ocMember(id).name).join(" · ") });
  return (
    <div className="card ocr-cov">
      <div className="card-head">
        <div className="card-head-l"><Icon name="shield-check" size={16} color={rows.some((r) => r.sev === "crit") ? "var(--critical-text)" : "var(--slate-600)"} /><span className="card-title">Coverage</span></div>
        <span className="ocr-cov-sum">{rows.length ? rows.length + (rows.length === 1 ? " finding" : " findings") : "Every enabled group is covered"}</span>
      </div>
      <div className="ocr-cov-body">
        {rows.map((r, i) => (
          <div className={"ocr-cov-row " + r.sev} key={i}>
            <Icon name={r.sev === "crit" ? "alert-octagon" : r.sev === "warn" ? "alert-triangle" : "info"} size={16} />
            <div><div className="ocr-cov-t">{r.t}</div><div className="ocr-cov-d">{r.d}</div></div>
          </div>
        ))}
        {!rows.length && <div className="ocr-cov-row ok"><Icon name="check-circle-2" size={16} /><div><div className="ocr-cov-t">No gaps found</div><div className="ocr-cov-d">Every enabled group has a first line, and every hour of each paging window is held by a rostered shift.</div></div></div>}
      </div>
    </div>
  );
}

Object.assign(window, { shiftStore, useShifts, njShiftOf, shSummary, ShiftBadge, OcRosterBoard, OcShiftList, OcPersonView, OcCoverageCard, openShiftEditor });
