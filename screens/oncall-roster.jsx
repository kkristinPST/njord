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
const OCL_LS = "nj_oncall_log_v1";
// The app has no auth session yet, so the actor is read from the first Supervisor account
// rather than invented. When a session exists this is the ONE line that changes.
function oclWho() { try { return window.NJ_SESSION_USER || (typeof USERS !== "undefined" && USERS[0] ? USERS[0].first + " " + USERS[0].last : "Operator"); } catch (e) { return "Operator"; } }
// The app runs on a fixed demo clock (NJ_NOW), so a log stamped with the real wall clock would
// report changes months after the facility's own date. On an audit trail the timestamp IS the
// content. Offsetting by the real elapsed time (rather than pinning to NJ_NOW) keeps successive
// entries in order instead of collapsing them onto one instant. Same clock as the delivery log.
// The offset RESTARTS from NJ_NOW on every page load while the log persists, so the raw clock
// alone runs backwards across sessions: an entry 10s into today's session would stamp earlier
// than one 2 min into yesterday's, and the list is newest-first. `add` therefore never stamps
// below the newest stamp ANYWHERE in the log — clamping to list[0] alone cannot heal a log that
// already carries an inversion deeper down, since the head is then not the maximum and every
// later entry stays pinned under it. A displayed time that disagrees with its own row order is
// worse than an approximate one.
const OCL_T0 = Date.now();
const OCL_NOW0 = window.NJ_NOW || OCL_T0;
function oclNow() { return OCL_NOW0 + (Date.now() - OCL_T0); }
// Every write to on-call configuration lands here. It is deliberately NOT a fourth tab: an
// incident review needs it, a shift lead never does, so it lives behind one icon in the toolbar.
const njOcLog = {
  list: (function () { const r = njOcPersist.read(OCL_LS, null); return Array.isArray(r) ? r : []; })(),
  subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); njOcPersist.write(OCL_LS, this.list.slice(0, 300)); },
  add(what, detail) { const hi = this.list.reduce((m, e) => (e.ts > m ? e.ts : m), 0); const ts = Math.max(oclNow(), hi ? hi + 1000 : 0); this.list = [{ ts: ts, who: oclWho(), what: what, detail: detail || "" }].concat(this.list).slice(0, 300); this.emit(); },
};
function useOcLog() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => njOcLog.sub(force), []); return njOcLog; }
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
  plan: {},
};

// ── dated planning ──
// The USUAL WEEK (`roster`) is what repeats until someone says otherwise; `plan` holds only
// the days that DIFFER, keyed YYYY-MM-DD. Storing exceptions instead of a materialised calendar
// is what makes the horizon unbounded: a year of unchanged weeks costs nothing, and the strip
// can page forward as far as anyone wants to plan.
function shDayKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function shToday() { return shDayKey(new Date(window.NJ_NOW || Date.now())); }
function shDayFrom(key) { const p = String(key).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function shDayName(key) { const d = shDayFrom(key); return SH_DAYS[(d.getDay() + 6) % 7]; }
function shDayLabel(key) { const d = shDayFrom(key); return SH_DAY_L[shDayName(key)] + " " + d.getDate(); }
function shDayLong(key) { return shDayFrom(key).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); }
function shAddDays(key, n) { const d = shDayFrom(key); d.setDate(d.getDate() + n); return shDayKey(d); }

function shClone(x) { return JSON.parse(JSON.stringify(x)); }
function shLoad() {
  const r = njOcPersist.read(SH_LS, null); if (r && Array.isArray(r.shifts)) return r;
  return shClone(SH_SEED);
}
const shiftStore = {
  data: shLoad(), subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); njOcPersist.write(SH_LS, this.data); },
  get shifts() { return this.data.shifts; },
  get roster() { return this.data.roster; },
  get plan() { return this.data.plan || (this.data.plan = {}); },
  // day === null means the usual week itself; otherwise the usual week as amended for
  // that date. A key present with value null is an explicit "off duty that day".
  rosterOn(day) {
    if (!day) return this.data.roster;
    const ov = this.plan[day] || {};
    const out = Object.assign({}, this.data.roster);
    Object.keys(ov).forEach((k) => { if (ov[k]) out[k] = ov[k]; else delete out[k]; });
    return out;
  },
  shiftOf(memberId, day) { const id = this.rosterOn(day === undefined ? shToday() : day)[memberId]; return id ? this.shifts.find((s) => s.id === id) || null : null; },
  members(shiftId, day) { const r = this.rosterOn(day === undefined ? shToday() : day); return Object.keys(r).filter((m) => r[m] === shiftId); },
  assign(memberId, shiftId, day) {
    if (!day) {
      const r = Object.assign({}, this.data.roster); if (shiftId) r[memberId] = shiftId; else delete r[memberId]; this.data.roster = r;
    } else {
      const p = Object.assign({}, this.plan); const d = Object.assign({}, p[day] || {});
      // an override that restates the usual value is not an override
      if ((this.data.roster[memberId] || null) === (shiftId || null)) delete d[memberId]; else d[memberId] = shiftId || null;
      if (Object.keys(d).length) p[day] = d; else delete p[day];
      this.data.plan = p;
    }
    const nm = (window.ocMember ? window.ocMember(memberId).name : memberId);
    const sh = shiftId ? (this.shifts.find((s) => s.id === shiftId) || {}).name : "Off duty";
    njOcLog.add(nm + " → " + sh, day ? "Duty roster · " + shDayLong(day) : "Duty roster · usual week");
    this.emit();
  },
  overrides(day) { return Object.keys(this.plan[day] || {}).length; },
  // A planned day that has already passed can never be read again: rosterOn only ever looks
  // up today or a future date. Dropping them on load is what stops `plan` growing forever.
  prunePast() { const t = shToday(); const p = {}; let n = 0; Object.keys(this.plan).forEach((d) => { if (d >= t) p[d] = this.plan[d]; else n++; }); if (n) { this.data.plan = p; this.emit(); } },
  clearDay(day) { const p = Object.assign({}, this.plan); delete p[day]; this.data.plan = p; njOcLog.add("Reset to the usual week", "Duty roster · " + shDayLong(day)); this.emit(); },
  upsert(s) { const i = this.shifts.findIndex((x) => x.id === s.id); njOcLog.add((i >= 0 ? "Edited shift " : "Created shift ") + s.name, shSummary(s)); this.data.shifts = i >= 0 ? this.shifts.map((x) => (x.id === s.id ? s : x)) : this.shifts.concat([s]); this.emit(); },
  // deleting a shift un-rosters everyone on it rather than leaving dangling ids: a person whose
  // shift disappeared is off duty, and that has to be visible, not inferred
  remove(id) { const sx = this.shifts.find((x) => x.id === id); njOcLog.add("Deleted shift " + (sx ? sx.name : id), "Anyone rostered on it moved to Off duty"); this.data.shifts = this.shifts.filter((x) => x.id !== id); const r = Object.assign({}, this.data.roster); Object.keys(r).forEach((k) => { if (r[k] === id) delete r[k]; }); this.data.roster = r; const p = {}; Object.keys(this.plan).forEach((d) => { const o = {}; Object.keys(this.plan[d]).forEach((k) => { if (this.plan[d][k] !== id) o[k] = this.plan[d][k]; }); if (Object.keys(o).length) p[d] = o; }); this.data.plan = p; this.emit(); },
  duplicate(id) { const s = this.shifts.find((x) => x.id === id); if (!s) return; const c = shClone(s); c.id = "sh" + Date.now(); c.name = s.name + " (copy)"; delete c.builtin; this.data.shifts = this.shifts.concat([c]); this.emit(); },
};
function useShifts() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => shiftStore.sub(force), []); return shiftStore; }
// keys are zero-padded, so a plain string compare is a date compare
shiftStore.prunePast();

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
// An interval is free text, so it has to be validated: `shMin` maps garbage to 0, and a zero
// span is read as a FULL DAY by shSegs — so "O8:00-16:00" (letter O) would silently mean
// reachable around the clock. A duty window that lies in that direction is the worst one.
function shIvOk(iv) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-4]):([0-5]\d)$/.exec(String(iv).trim());
  if (!m) return false;
  return !(+m[3] === 24 && +m[4] > 0);
}
function shBadIvs(s) { const out = []; SH_DAYS.forEach((d) => (s.win[d] || []).forEach((iv) => { if (!shIvOk(iv)) out.push(SH_DAY_L[d] + " " + iv); })); return out; }
function shDaySegs(s, d) { const out = []; (s.win[d] || []).forEach((iv) => { if (shIvOk(iv)) shSegs(iv).forEach((x) => out.push(x)); }); return shUnion(out); }
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

// ── the seam between Users and On-call ──
// Users and On-call each owned half of one fact and neither showed the other's half: the Users
// table knew a phone number, the group cards knew who they page. Everything below is derived —
// there is no second model of membership.
function njPagedFor(memberId) {
  const out = [];
  ((window.oncallStore && window.oncallStore.groups) || []).forEach((g) =>
    ["p1", "p2", "p3"].forEach((t, i) => { if (((g.tiers && g.tiers[t]) || []).includes(memberId)) out.push({ g: g, tier: t, n: i + 1 }); }));
  return out;
}
// Groups where this member is the ONLY first-line recipient. Removing them is not an edit, it
// is switching that group's alarms off, and the confirm has to say so before the click.
function njSoleFirstLine(memberId) {
  return njPagedFor(memberId).filter((x) => x.tier === "p1" && x.g.enabled && ((x.g.tiers.p1 || []).length === 1)).map((x) => x.g);
}
// CAPABILITY vs REQUEST. A tier declares the channels it dispatches on; a person declares what
// they can actually receive. Both existed, nothing compared them — so a tier could page on UHF
// with nobody on it holding a radio. A duty phone is provisioned for every channel by
// definition; a person is not.
function njCanReceive(memberId, chan) {
  const m = ocMember(memberId);
  if (m.kind === "phone") { const c = window.ocMemberChans ? window.ocMemberChans(m) : null; return c === null ? true : c.includes(chan); }
  const u = (typeof USERS !== "undefined" ? USERS : []).find((x) => x.u === memberId);
  if (!u) return true;
  const hasPhone = u.phone && u.phone !== "—";
  if (chan === "sms") return !!hasPhone && /SMS/.test(u.notif || "");
  if (chan === "voice") return !!hasPhone;
  if (chan === "uhf") return !!u.uhf;
  return true;
}
function njUnreachable(g, tier) {
  const chans = (typeof ocChan === "function" ? ocChan(g, tier) : []) || [];
  if (!chans.length) return [];
  return ((g.tiers && g.tiers[tier]) || []).filter((id) => !chans.some((c) => njCanReceive(id, c)));
}

// ── coverage ──
// The question a control room actually asks: for every hour this group can be paged, is at
// least one first-line member rostered? Anything else is a list of names, not an answer.
function shGroupGaps(g, day) {
  const ids = (g.tiers && g.tiers.p1) || [];
  const shifts = ids.map((id) => shiftStore.shiftOf(id, day)).filter(Boolean);
  const gaps = [];
  // a dated check asks about ONE weekday; the undated one asks about the whole repeating week
  const scan = day ? [shDayName(day)] : SH_DAYS;
  scan.forEach((d) => {
    const w = g.win && g.win[d];
    if (!w) return;
    const base = shUnion(shSegs(w));
    const cov = shUnion(shifts.reduce((out, s) => out.concat(shDaySegs(s, d)), []));
    shSubtract(base, cov).forEach((x) => gaps.push({ day: d, from: shHHMM(x[0]), to: shHHMM(x[1] >= 1440 ? 1439 : x[1]) }));
  });
  return gaps;
}
// LOOKAHEAD, planned days only. A day nobody has touched follows the usual week, which today's
// findings already cover, so scanning it would just restate them once per date. Only days that
// carry their own changes can hold a problem today's check cannot see.
function shPlannedAhead() {
  const t = shToday();
  const groups = ((window.oncallStore && window.oncallStore.groups) || []).filter((g) => g.enabled);
  const days = Object.keys(shiftStore.plan).filter((d) => d > t).sort();
  const out = [];
  days.forEach((day) => {
    const hits = [];
    groups.forEach((g) => {
      const p1 = (g.tiers && g.tiers.p1) || [];
      if (!p1.length) return; // already a finding for today, not a planning problem
      if (!p1.some((id) => shiftStore.shiftOf(id, day))) { hits.push(g.name + ": nobody on the first line"); return; }
      if (shGroupGaps(g, day).length) hits.push(g.name + ": hours with no first line");
    });
    if (hits.length) out.push({ day: day, hits: hits });
  });
  return out;
}
function shCoverage() {
  const groups = ((window.oncallStore && window.oncallStore.groups) || []).filter((g) => g.enabled);
  const out = { noFirst: [], allOff: [], noThird: [], gaps: [], idle: [], unreachable: [] };
  groups.forEach((g) => {
    const p1 = (g.tiers && g.tiers.p1) || [];
    if (!p1.length) { out.noFirst.push(g); return; }
    if (!p1.some((id) => shiftStore.shiftOf(id))) out.allOff.push(g);
    if (!((g.tiers && g.tiers.p3) || []).length) out.noThird.push(g);
    const gaps = shGroupGaps(g);
    if (gaps.length) out.gaps.push({ g: g, gaps: gaps });
  });
  groups.forEach((g) => {
    const bad = njUnreachable(g, "p1");
    if (bad.length) out.unreachable.push({ g: g, ids: bad });
  });
  const paged = new Set();
  groups.forEach((g) => ["p1", "p2", "p3"].forEach((t) => ((g.tiers && g.tiers[t]) || []).forEach((id) => paged.add(id))));
  Object.keys(shiftStore.roster).forEach((id) => { if (!paged.has(id)) out.idle.push(id); });
  return out;
}

// ── small parts ──
function ShiftBadge({ id, compact }) {
  const s = shiftStore.shiftOf(id);
  if (!s) return <span className="ocr-badge off" title="Not on the duty roster. This recipient is paged by nothing.">Off duty</span>;
  return <span className="ocr-badge" title={s.name + " · " + shSummary(s)}>{compact ? s.name : s.name}</span>;
}

function ShiftPicker({ used, day, onPick, onClose }) {
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
      <div className="oc-menu-search"><Icon name="search" size={16} color="var(--slate-400)" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipients…" />
        {q && <button className="ocr-search-x" title="Clear" aria-label="Clear search" onClick={() => setQ("")}><Icon name="x" size={14} /></button>}</div>
      <div className="oc-menu-list">
        {avail.map((m) => (
          <button key={m.id} className="oc-menu-item" onClick={() => onPick(m.id)}>
            <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
            <span className="oc-menu-name">{m.name}</span>
            <span className="oc-menu-role">{shiftStore.shiftOf(m.id, day) ? shiftStore.shiftOf(m.id, day).name : "Off duty"}</span>
          </button>
        ))}
        {/* name the cause that ACTUALLY emptied the list — "everyone is already on this shift"
            under a query that simply matched nothing is a sentence the operator can disprove */}
        {!avail.length && <NjInline>{ql ? "No one matches “" + q.trim() + "”." : "Everyone is already on this shift."}</NjInline>}
      </div>
    </div>
  );
}

// ── the roster board ──
// Assumption, stated because the whole surface rests on it: the usual week REPEATS until
// someone changes it, and a planned day is a set of exceptions to it. That is what the two
// kinds of chip in the strip mean, and it is why planning a year ahead costs nothing.
function OcRosterBoard() {
  const store = useShifts();
  const [open, setOpen] = React.useState(null);
  const [day, setDay] = React.useState(shToday());
  const [week, setWeek] = React.useState(0);
  const today = shToday();
  const start = shAddDays(today, week * 7);
  const days = Array.from({ length: 7 }, (x, i) => shAddDays(start, i));
  const roster = store.rosterOn(day);
  const offDuty = ocRoster().filter((m) => !roster[m.id]);
  const planned = day && store.overrides(day);
  return (
    <React.Fragment>
      <div className="ocr-strip">
        <button className={"ocr-daychip" + (day === null ? " on" : "")} onClick={() => setDay(null)} title="The week that repeats until someone changes it">Usual week</button>
        <span className="ocr-strip-div" />
        <button className="icon-btn" title="Previous week" onClick={() => setWeek(week - 1)}><Icon name="chevron-left" size={16} /></button>
        {days.map((k) => (
          <button key={k} className={"ocr-daychip" + (day === k ? " on" : "") + (k === today ? " today" : "") + (store.overrides(k) ? " has" : "")}
            onClick={() => setDay(k)} title={shDayLong(k) + (store.overrides(k) ? " · " + store.overrides(k) + " changed" : " · same as the usual week")}>
            {k === today ? "Today" : shDayLabel(k)}
          </button>
        ))}
        <button className="icon-btn" title="Next week" onClick={() => setWeek(week + 1)}><Icon name="chevron-right" size={16} /></button>
        {week !== 0 && <button className="btn btn-secondary btn-sm" onClick={() => { setWeek(0); setDay(today); }}>Back to today</button>}
      </div>
      <div className="ocr-strip-note">
        {day === null
          ? <span>Editing the <b>usual week</b>. Every day uses it unless that day has its own changes.</span>
          : <span>{shDayLong(day)}{planned ? <React.Fragment> · <b>{planned} changed</b> from the usual week</React.Fragment> : " · same as the usual week"}</span>}
        {planned > 0 && <button className="linkbtn" onClick={() => shiftStore.clearDay(day)}>Reset to the usual week</button>}
      </div>
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
          const ids = store.members(s.id, day);
          return (
            <div className="ocr-col" key={s.id}>
              <div className="ocr-col-h"><span className="ocr-col-n">{s.name}</span><span className="ocr-col-c data">{ids.length}</span></div>
              <p className="ocr-col-d">{shSummary(s)}</p>
              <div className="ocr-col-body">
                {ids.map((id) => {
                  const m = ocMember(id);
                  const chg = day && (store.plan[day] || {})[id] !== undefined;
                  return (
                    <span key={id} className={"ocr-person" + (chg ? " chg" : "")}>
                      <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
                      <span className="ocr-person-n">{m.name}</span>
                      <button className="oc-chip-x" title="Move to Off duty" onClick={() => shiftStore.assign(id, null, day)}><Icon name="x" size={14} /></button>
                    </span>
                  );
                })}
                {!ids.length && <span className="ocr-empty">No one on this shift.</span>}
              </div>
              <div className="oc-add-wrap">
                <button className="member-add" onClick={() => setOpen(open === s.id ? null : s.id)}><Icon name="plus" size={14} /> Assign</button>
                {open === s.id && <ShiftPicker used={ids} day={day} onPick={(mid) => { shiftStore.assign(mid, s.id, day); setOpen(null); }} onClose={() => setOpen(null)} />}
              </div>
            </div>
          );
        })}
      </div>
    </React.Fragment>
  );
}

// ── change log ──
function OcLogDialog() {
  const log = useOcLog();
  return (
    <Dialog width={620}>
      <DlgHeader icon="history" name="On-call change log" tag={log.list.length ? log.list.length + " entries" : undefined} onClose={closeDialog} />
      <div className="dlg-body ocr-log">
        {log.list.map((e, i) => (
          <div className="ocr-log-row" key={i}>
            <span className="ocr-log-ts data">{new Date(e.ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {String(new Date(e.ts).getHours()).padStart(2, "0")}:{String(new Date(e.ts).getMinutes()).padStart(2, "0")}</span>
            <div className="ocr-log-b"><div className="ocr-log-w">{e.what}</div>{e.detail && <div className="ocr-log-d">{e.detail}</div>}</div>
            <span className="ocr-log-who">{e.who}</span>
          </div>
        ))}
        {!log.list.length && <NjEmpty size="compact" icon="history" title="No changes recorded yet" body="Edits to groups, shifts and the duty roster are listed here with who made them." />}
      </div>
      <div className="dlg-foot"><button className="btn btn-secondary" onClick={closeDialog}>Close</button></div>
    </Dialog>
  );
}
function openOcLog() { openDialog(<OcLogDialog />); }

// ── shift (schedule) editor ──
function ShiftEditorDialog({ shift }) {
  const editing = !!shift;
  const [s, setS] = React.useState(() => shift ? shClone(shift) : { id: "sh" + Date.now(), name: "", desc: "", win: shWin(["08:00-16:00"], []) });
  const set = (patch) => setS(Object.assign({}, s, patch));
  const bad = shBadIvs(s);
  const dup = shiftStore.shifts.some((x) => x.id !== s.id && x.name.trim().toLowerCase() === s.name.trim().toLowerCase());
  const setDay = (d, list) => { const w = Object.assign({}, s.win); w[d] = list; set({ win: w }); };
  const edit = (d, i, v) => { const l = (s.win[d] || []).slice(); l[i] = v; setDay(d, l); };
  const canSave = s.name.trim().length > 0 && bad.length === 0 && !dup;
  return (
    <Dialog width={640}>
      <DlgHeader icon={editing ? "pencil" : "calendar-plus"} name={editing ? "Edit shift" : "New shift"} onClose={closeDialog} />
      {/* `.field` is the FILTER-BAR component (min-width:280px) and was being reused here as a
          form field — two of them in a 640px dialog cannot fit, which is where the horizontal
          scrollbar came from. Form fields are DeField + .de-input, as in UserDialog. */}
      <div className="dlg-body oc-editor">
        <div className="de-form-2col">
          <DeField label="Name"><input className="de-input" autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Duty phone" /></DeField>
          <DeField label="Description"><input className="de-input" value={s.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="Outside weekday working hours" /></DeField>
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Hours</span>
          <p className="oc-mininfo">When someone rostered on this shift is reachable. A day can hold more than one interval: that is how a break inside a working day is expressed. An interval that ends before it starts runs past midnight.</p>
          <div className="ocr-days">
            {SH_DAYS.map((d) => (
              <div className="ocr-day" key={d}>
                <span className="ocr-day-l">{SH_DAY_L[d]}</span>
                <div className="ocr-day-ivs">
                  {(s.win[d] || []).map((iv, i) => (
                    <span className={"ocr-iv" + (shIvOk(iv) ? "" : " bad")} key={i}>
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
        {dup && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>A shift called “{s.name.trim()}” already exists.</div>}
        {bad.length > 0 && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Not a valid time range: {bad.join(", ")}. Use HH:MM-HH:MM. An end earlier than the start runs past midnight.</div>}
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
  // a Coverage finding can arrive here already naming the person it was about
  React.useEffect(() => {
    const take = () => { if (window.njOcPersonQ) { setQ(window.njOcPersonQ); window.njOcPersonQ = null; } };
    take();
    window.addEventListener("nj-oc-personq", take);
    return () => window.removeEventListener("nj-oc-personq", take);
  }, []);
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
    <div className="card ocr-person-card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="users" size={16} color="var(--slate-600)" /><span className="card-title">By person</span></div>
        <div className="ocr-head-r">
          <div className="field ocr-search"><Icon name="search" size={16} color="var(--slate-400)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter recipients…" />
            {q && <button className="ocr-search-x" title="Clear" aria-label="Clear search" onClick={() => setQ("")}><Icon name="x" size={14} /></button>}</div>
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
                ) : <span className="ocr-empty">No group pages this recipient.</span>}
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
  const all = (window.oncallStore && window.oncallStore.groups) || [];
  const enabled = all.filter((g) => g.enabled);
  const c = shCoverage();
  const rows = [];
  c.noFirst.forEach((g) => rows.push({ sev: "crit", t: g.name + " has no one on Priority 1", d: "An alarm in this group reaches nobody.", go: { g: g } }));
  c.allOff.forEach((g) => rows.push({ sev: "crit", t: g.name + ": every first-line recipient is off duty", d: "Assigned, but not on the roster, so nothing will page.", go: { roster: true } }));
  c.unreachable.forEach((x) => rows.push({ sev: "crit", t: x.g.name + ": " + x.ids.map((id) => ocMember(id).name).join(", ") + " cannot receive any Priority 1 channel", d: "The tier dispatches on " + (ocChan(x.g, "p1") || []).map((c) => c.toUpperCase()).join(" / ") + ". No matching contact detail on the account.", go: { person: ocMember(x.ids[0]).name } }));
  c.gaps.forEach((x) => {
    const g0 = x.gaps[0];
    rows.push({ sev: "warn", t: x.g.name + ": " + x.gaps.length + (x.gaps.length === 1 ? " uncovered hour block" : " uncovered hour blocks"), d: "First uncovered: " + SH_DAY_L[g0.day] + " " + g0.from + "–" + g0.to + ". Inside the paging window, with no first-line shift covering it.", go: { roster: true } });
  });
  if (c.noThird.length) rows.push({ sev: "info", t: c.noThird.length + (c.noThird.length === 1 ? " group has" : " groups have") + " no one third in line", d: c.noThird.map((g) => g.name).join(" · "), go: { g: c.noThird[0], gs: c.noThird } });
  if (c.idle.length && enabled.length > 0) rows.push({ sev: "info", t: c.idle.length + " rostered but paged by nothing", d: c.idle.map((id) => ocMember(id).name).join(" · "), go: { person: ocMember(c.idle[0]).name } });
  // Planned days sit BELOW today's findings and stay quiet: a problem next Tuesday is real but
  // it is not why anyone opened this card, and it must never out-shout a group that reaches
  // nobody right now.
  const ahead = shPlannedAhead();
  return (
    <div className="card ocr-cov">
      <div className="card-head">
        <div className="card-head-l"><Icon name="shield-check" size={16} color={(rows.some((r) => r.sev === "crit") || (all.length > 0 && enabled.length === 0)) ? "var(--critical-text)" : "var(--slate-600)"} /><span className="card-title">Coverage</span></div>
        <span className="ocr-cov-sum">{enabled.length === 0 ? (all.length ? "All groups paused" : "No groups yet") : rows.length ? rows.length + (rows.length === 1 ? " finding" : " findings") : "Every enabled group is covered"}</span>
      </div>
      <div className="ocr-cov-body">
        {/* "Every enabled group is covered" is true and useless when NOTHING is enabled — the
           same trap as an empty table reading as a healthy plant. Say what is actually so. */}
        {all.length > 0 && enabled.length === 0 && (
          <div className="ocr-cov-row crit"><Icon name="alert-octagon" size={16} />
            <div><div className="ocr-cov-t">All {all.length} on-call groups are paused</div>
              <div className="ocr-cov-d">No alarm leaves the facility to anyone, on any channel, whatever the roster says.</div></div></div>
        )}
        {/* a finding precise enough to act on is the control that takes you to it — the same
            habit as the alarms State chips, where the count is also the filter */}
        {rows.map((r, i) => (
          <button className={"ocr-cov-row go " + r.sev} key={i} onClick={() => window.njOcGo && window.njOcGo(r.go)}
            title={r.go && r.go.person ? "Show " + r.go.person + " in By person" : r.go && r.go.roster ? "Open the duty roster" : r.go && r.go.gs && r.go.gs.length > 1 ? "Show all " + r.go.gs.length + " in Groups" : r.go && r.go.g ? "Show " + r.go.g.name + " in Groups" : undefined}>
            <Icon name={r.sev === "crit" ? "alert-octagon" : r.sev === "warn" ? "alert-triangle" : "info"} size={16} />
            <div><div className="ocr-cov-t">{r.t}</div><div className="ocr-cov-d">{r.d}</div></div>
            <Icon name="chevron-right" size={16} />
          </button>
        ))}
        {!rows.length && enabled.length > 0 && !ahead.length && <div className="ocr-cov-row ok"><Icon name="check-circle-2" size={16} /><div><div className="ocr-cov-t">No gaps found</div><div className="ocr-cov-d">Every enabled group has a first line, and every hour of each paging window is held by a rostered shift.</div></div></div>}
        {!rows.length && enabled.length > 0 && ahead.length > 0 && <div className="ocr-cov-row ok"><Icon name="check-circle-2" size={16} /><div><div className="ocr-cov-t">Today is covered</div><div className="ocr-cov-d">Every enabled group has a first line, and every hour of each paging window is held by a rostered shift.</div></div></div>}
        {ahead.length > 0 && (
          <div className="ocr-cov-ahead">
            <Icon name="calendar-clock" size={14} />
            <span><b>{ahead.length} planned {ahead.length === 1 ? "day has" : "days have"} a gap.</b> {ahead.slice(0, 3).map((a) => shDayLabel(a.day) + " (" + a.hits.length + ")").join(" · ")}{ahead.length > 3 ? " …" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { shiftStore, useShifts, njShiftOf, shSummary, ShiftBadge, OcRosterBoard, OcShiftList, OcPersonView, OcCoverageCard, openShiftEditor, njPagedFor, njSoleFirstLine, njCanReceive, njUnreachable, njOcLog, openOcLog });
