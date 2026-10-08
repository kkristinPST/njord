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
// v2 model (user): a SHIFT is only a time of day (Day 07–15, Night 23–07). WHICH DAYS a person
// works it is the roster: one cell per person per weekday, so a person can be on Day Mon–Fri and
// Around the clock at the weekend. Rotation weeks and dated changes work on those cells.
function shWk(wd, we) { return { mon: wd, tue: wd, wed: wd, thu: wd, fri: wd, sat: we === undefined ? null : we, sun: we === undefined ? null : we }; }
const SH_SEED = {
  v: 2,
  shifts: [
    { id: "sh_always", name: "Around the clock", desc: "Reachable at any hour", builtin: true, f: "00:00", t: "00:00" },
    { id: "sh_day", name: "Day", desc: "Working hours", f: "07:00", t: "15:00" },
    { id: "sh_eve", name: "Evening", desc: "", f: "15:00", t: "23:00" },
    { id: "sh_night", name: "Night", desc: "", f: "23:00", t: "07:00" },
  ],
  roster: {
    vt1: shWk("sh_always", "sh_always"), vt2: shWk("sh_always", "sh_always"),
    lum: shWk("sh_day"), ov: shWk("sh_day", "sh_always"),
    jlo: shWk("sh_eve"), kgr: shWk("sh_eve", "sh_day"),
    sk: shWk("sh_night", "sh_night"), elel: shWk(null, "sh_eve"),
  },
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
function shMonday(key) { const d = shDayFrom(key); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return shDayKey(d); }
function shWeekL(w) { return "ABCD"[w] || String(w + 1); }
// the week's display name: the site's own name if set ("Team Nord"), else "Week A"
function shWeekName(w) { const nm = shiftStore.data.rot && shiftStore.data.rot.names && shiftStore.data.rot.names[w]; return (nm && nm.trim()) || "Week " + shWeekL(w); }
function shAddDays(key, n) { const d = shDayFrom(key); d.setDate(d.getDate() + n); return shDayKey(d); }

function shClone(x) { return JSON.parse(JSON.stringify(x)); }
const shTo = (t) => (t === "24:00" ? "00:00" : t);                // 24:00 is shown as 00:00
const shIv = (f, t) => f + "-" + (t === "00:00" ? "24:00" : t);    // and stored as an interval
function shTimeL(s) { return !s ? "" : s.f === s.t ? "All day" : s.f + "–" + s.t; }
// a v1 store (a shift = per-weekday windows, one shift per person) becomes v2: the shift keeps
// the first day's hours, and the person keeps it on exactly the days it used to run
function shMigrate(r) {
  if (r.v === 2) return r;
  const old = {}; (r.shifts || []).forEach((s) => { old[s.id] = s; });
  const shifts = (r.shifts || []).map((s) => { const d = SH_DAYS.find((x) => ((s.win || {})[x] || []).length); const iv = d ? String(s.win[d][0]).split("-") : ["07:00", "15:00"]; const o = { id: s.id, name: s.name, desc: s.desc || "", f: iv[0], t: shTo(iv[1] || "15:00") }; if (s.builtin) o.builtin = true; return o; });
  const conv = (tp) => { const out = {}; Object.keys(tp || {}).forEach((m) => { const v = tp[m]; if (!v) return; if (typeof v === "object") { out[m] = v; return; } const s = old[v]; const c = {}; SH_DAYS.forEach((d) => { c[d] = s && ((s.win || {})[d] || []).length ? v : null; }); out[m] = c; }); return out; };
  return Object.assign({}, r, { v: 2, shifts: shifts, roster: conv(r.roster), weeks: (r.weeks || []).map(conv) });
}
function shLoad() {
  const r = njOcPersist.read(SH_LS, null); if (r && Array.isArray(r.shifts)) return shMigrate(r);
  return shClone(SH_SEED);
}
const SH_FOLLOW = { id: "sh_follow", name: "Follows group", desc: "Reachable for the whole of the group's paging window", builtin: true, win: shWin(["00:00-24:00"], ["00:00-24:00"]) };
const shiftStore = {
  data: shLoad(), subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); njOcPersist.write(SH_LS, this.data); },
  get shifts() { return this.data.shifts; },
  get roster() { return this.data.roster; },
  get plan() { return this.data.plan || (this.data.plan = {}); },
  byId(id) { return id ? this.shifts.find((s) => s.id === id) || null : null; },
  // ── rotation ── 1–4 template weeks (Week A = roster, B… = weeks) taking turns from a Monday
  get rotN() { return (this.data.rot && this.data.rot.n) || 1; },
  get rotStart() { return (this.data.rot && this.data.rot.start) || shMonday(shToday()); },
  weekOf(day) { const n = this.rotN; if (n <= 1 || !day) return 0; const w = Math.floor((shDayFrom(shMonday(day)) - shDayFrom(this.rotStart)) / (7 * 864e5) + 0.5); return ((w % n) + n) % n; },
  tpl(w) { return !w ? this.data.roster : ((this.data.weeks || [])[w - 1] || {}); },
  setRotation(n, start, names) {
    const weeks = (this.data.weeks || []).slice(0, Math.max(0, n - 1));
    while (weeks.length < n - 1) weeks.push(shClone(weeks[weeks.length - 1] || this.data.roster)); // a new week starts as a copy
    this.data.weeks = weeks;
    this.data.rot = { n: n, start: shMonday(start || this.rotStart), names: (names || (this.data.rot && this.data.rot.names) || []).slice(0, n) };
    njOcLog.add(n > 1 ? "Rotation set to " + n + " weeks" : "Rotation turned off", n > 1 ? shWeekName(0) + " from " + shDayLong(this.data.rot.start) + " · shift change on Monday" : "One usual week");
    this.emit();
  },
  nextStartOf(w) { const m = shMonday(shToday()); for (let i = 0; i < this.rotN; i++) { const k = shAddDays(m, i * 7); if (this.weekOf(k) === w) return k; } return m; },
  // ── cells ── template cell: week w, member, weekday. Dated cell: the template cell for the
  // week that date falls in, unless the date has its own change (null = off that day).
  cellTpl(w, m, d) { return ((this.tpl(w) || {})[m] || {})[d] || null; },
  hasChange(day, m) { return !!this.plan[day] && Object.prototype.hasOwnProperty.call(this.plan[day], m); },
  cellOn(day, m) { return this.hasChange(day, m) ? this.plan[day][m] : this.cellTpl(this.weekOf(day), m, shDayName(day)); },
  setCell(w, m, d, sid) {
    const tp = shClone(this.tpl(w)); tp[m] = Object.assign({}, tp[m] || {}, { [d]: sid || null });
    if (!SH_DAYS.some((x) => tp[m][x])) delete tp[m];
    if (!w) this.data.roster = tp; else { const ws = (this.data.weeks || []).slice(); ws[w - 1] = tp; this.data.weeks = ws; }
    njOcLog.add(this._nm(m) + " · " + SH_DAY_L[d] + " → " + (this.byId(sid) ? this.byId(sid).name : "Off"), "Shifts · " + (this.rotN > 1 ? shWeekName(w) : "usual week"));
    this.emit();
  },
  setDate(day, m, sid) {
    const p = Object.assign({}, this.plan); const d = Object.assign({}, p[day] || {});
    if ((this.cellTpl(this.weekOf(day), m, shDayName(day)) || null) === (sid || null)) delete d[m]; else d[m] = sid || null;
    if (Object.keys(d).length) p[day] = d; else delete p[day];
    this.data.plan = p;
    njOcLog.add(this._nm(m) + " → " + (this.byId(sid) ? this.byId(sid).name : "Off"), "Shifts · " + shDayLong(day));
    this.emit();
  },
  resetOne(day, m) { const p = Object.assign({}, this.plan); const d = Object.assign({}, p[day] || {}); delete d[m]; if (Object.keys(d).length) p[day] = d; else delete p[day]; this.data.plan = p; njOcLog.add(this._nm(m) + " back to " + (this.rotN > 1 ? shWeekName(this.weekOf(day)) : "the usual week"), "Shifts · " + shDayLong(day)); this.emit(); },
  _nm(m) { return window.ocMember ? window.ocMember(m).name : m; },
  // the member's week as one synthetic shift (the shape coverage reads): the week holding `day`
  weekWin(m, day) { const mon = shMonday(day); const w = {}; SH_DAYS.forEach((d, i) => { const s = this.byId(this.cellOn(shAddDays(mon, i), m)); w[d] = s ? [shIv(s.f, s.t)] : []; }); return w; },
  tplWin(w, m) { const o = {}; SH_DAYS.forEach((d) => { const s = this.byId(this.cellTpl(w, m, d)); o[d] = s ? [shIv(s.f, s.t)] : []; }); return o; },
  shiftOf(m, day) {
    // Personal shifts OFF: everyone follows the group's paging window
    if (window.njOcShiftsOn && !window.njOcShiftsOn()) return SH_FOLLOW;
    const k = day === undefined ? shToday() : day;
    const win = this.weekWin(m, k);
    if (!SH_DAYS.some((d) => win[d].length)) return null;
    const today = this.byId(this.cellOn(k, m));
    return { id: "m:" + m, name: today ? today.name : "Off today", win: win, today: today };
  },
  members(sid, day) { const k = day === undefined ? shToday() : day; const ids = new Set(Object.keys(this.tpl(this.weekOf(k))).concat(Object.keys(this.plan[k] || {}))); return [...ids].filter((m) => this.cellOn(k, m) === sid); },
  // kept for callers outside this file: a date → that date only; no date + no shift → off everywhere
  assign(m, sid, day) {
    if (day) return this.setDate(day, m, sid);
    if (sid) return;
    const strip = (tp) => { const o = Object.assign({}, tp); delete o[m]; return o; };
    this.data.roster = strip(this.data.roster); this.data.weeks = (this.data.weeks || []).map(strip);
    const p = {}; Object.keys(this.plan).forEach((d) => { const o = Object.assign({}, this.plan[d]); delete o[m]; if (Object.keys(o).length) p[d] = o; }); this.data.plan = p;
    this.emit();
  },
  overrides(day) { return Object.keys(this.plan[day] || {}).length; },
  prunePast() { const t = shToday(); const p = {}; let n = 0; Object.keys(this.plan).forEach((d) => { if (d >= t) p[d] = this.plan[d]; else n++; }); if (n) { this.data.plan = p; this.emit(); } },
  clearDay(day) { const p = Object.assign({}, this.plan); delete p[day]; this.data.plan = p; njOcLog.add(this.rotN > 1 ? "Reset to " + shWeekName(this.weekOf(day)) : "Reset to the usual week", "Shifts · " + shDayLong(day)); this.emit(); },
  upsert(s) { const i = this.shifts.findIndex((x) => x.id === s.id); njOcLog.add((i >= 0 ? "Edited shift " : "Created shift ") + s.name, shTimeL(s)); this.data.shifts = i >= 0 ? this.shifts.map((x) => (x.id === s.id ? s : x)) : this.shifts.concat([s]); this.emit(); },
  // deleting a shift empties every cell that held it: those days become Off, visibly
  remove(id) {
    const sx = this.byId(id); njOcLog.add("Deleted shift " + (sx ? sx.name : id), "Days on it are now Off");
    this.data.shifts = this.shifts.filter((x) => x.id !== id);
    const strip = (tp) => { const o = {}; Object.keys(tp || {}).forEach((m) => { const c = {}; SH_DAYS.forEach((d) => { c[d] = tp[m][d] === id ? null : tp[m][d] || null; }); if (SH_DAYS.some((d) => c[d])) o[m] = c; }); return o; };
    this.data.roster = strip(this.data.roster); this.data.weeks = (this.data.weeks || []).map(strip);
    const p = {}; Object.keys(this.plan).forEach((d) => { const o = {}; Object.keys(this.plan[d]).forEach((k) => { o[k] = this.plan[d][k] === id ? null : this.plan[d][k]; }); p[d] = o; }); this.data.plan = p;
    this.emit();
  },
  // how many cells (any week, any date) use a shift
  uses(id) { let n = 0; [this.data.roster].concat(this.data.weeks || []).forEach((tp) => Object.keys(tp || {}).forEach((m) => SH_DAYS.forEach((d) => { if (tp[m][d] === id) n++; }))); return n; },
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
// intervals on one day that overlap each other: harmless to the math (they are unioned) but
// they say the shift is something it is not, so the editor names them and refuses to save
function shOverlaps(s) {
  const out = [];
  SH_DAYS.forEach((d) => {
    const ivs = (s.win[d] || []).filter(shIvOk);
    for (let i = 0; i < ivs.length; i++) for (let j = i + 1; j < ivs.length; j++) {
      const a = shSegs(ivs[i]), b = shSegs(ivs[j]);
      if (a.some((x) => b.some((y) => x[0] < y[1] && y[0] < x[1]))) out.push({ d: d, i: i, j: j, t: SH_DAY_L[d] + " " + ivs[i].replace("-", "–") + " and " + ivs[j].replace("-", "–") });
    }
  });
  return out;
}
function shBadIvs(s) { const out = []; SH_DAYS.forEach((d) => (s.win[d] || []).forEach((iv) => { if (!shIvOk(iv)) out.push(SH_DAY_L[d] + " " + iv); })); return out; }
function shDaySegs(s, d) { const out = []; (s.win[d] || []).forEach((iv) => { if (shIvOk(iv)) shSegs(iv).forEach((x) => out.push(x)); }); return shUnion(out); }
function shSummary(s) {
  const on = SH_DAYS.filter((d) => (s.win[d] || []).length);
  if (!on.length) return "No window";
  const uniq = Array.from(new Set(on.map((d) => (s.win[d] || []).join(","))));
  const key = on.join(",");
  const days = on.length === 7 ? "every day" : key === "mon,tue,wed,thu,fri" ? "Mon–Fri" : key === "sat,sun" ? "Sat–Sun" : on.map((d) => SH_DAY_L[d]).join(" ");
  const ivs = s.win[on[0]] || [];
  const hours = uniq.length > 1 ? "Mixed hours"
    : ivs.length === 1 && ivs[0] === "00:00-24:00" ? "All day"
    : ivs.length === 2 && ivs[0].split("-")[1] !== ivs[1].split("-")[0] ? ivs[0].split("-")[0] + "–" + ivs[1].split("-")[1] + " (break " + ivs[0].split("-")[1] + "–" + ivs[1].split("-")[0] + ")"
    : ivs.map((iv) => iv.replace("-", "–")).join(", ");
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
    ["p1", "p2", "p3", "b247"].forEach((t, i) => { if (((g.tiers && g.tiers[t]) || []).includes(memberId)) out.push({ g: g, tier: t, n: t === "b247" ? "24/7" : i + 1 }); }));
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
// RETIRED: contact is per person now, and a person without one is never listed, so no list can
// hold an unreachable name. Kept as an always-empty answer for older callers (mobile).
function njUnreachable() { return []; }

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
  const cyc = shiftStore.rotN > 1 ? Array.from({ length: shiftStore.rotN * 7 }, (x, i) => shAddDays(t, i + 1)) : [];
  const days = Array.from(new Set(Object.keys(shiftStore.plan).filter((d) => d > t).concat(cyc))).sort();
  const out = [];
  days.forEach((day) => {
    const hits = [];
    groups.forEach((g) => {
      const p1 = (g.tiers && g.tiers.p1) || [];
      if (!p1.length) return; // already a finding for today, not a planning problem
      if (!p1.some((id) => { const s = shiftStore.shiftOf(id, day); return s && (s.today || s.id === "sh_follow"); })) { hits.push(g.name + ": nobody on the first line"); return; }
      if (shGroupGaps(g, day).length) hits.push(g.name + ": hours with no first line");
    });
    if (hits.length) out.push({ day: day, hits: hits });
  });
  return out;
}
// ── all alarms, around the clock ──
// The customer's first requirement: "Alle alarmer" must be held on Priority 1 day, evening and
// night, with no hour left over. It is a question about the groups TOGETHER (Day 07–15, Evening
// 14:50–20:30, Night 20:30–07), so it is computed on one Mon 00:00 → Sun 24:00 axis where a
// window that runs past midnight lands on the NEXT day — the per-group check credits the tail
// to the same day, which cannot see a Friday-night → Saturday-morning handover.
const WK = 7 * 1440;
function wkIv(i, iv) {
  const p = String(iv).split("-"); const a = shMin(p[0]), b = shMin(p[1]);
  const s = i * 1440 + a, e = i * 1440 + (b > a ? b : b + 1440);
  return e <= WK ? [[s, e]] : [[s, WK], [0, e - WK]];
}
function wkGroup(g) { const out = []; SH_DAYS.forEach((d, i) => { const w = g.win && g.win[d]; if (!w) return; String(w).split(",").map((x) => x.trim()).filter(shIvOk).forEach((iv) => wkIv(i, iv).forEach((x) => out.push(x))); }); return shUnion(out); }
function wkShift(s) { const out = []; SH_DAYS.forEach((d, i) => (s.win[d] || []).filter(shIvOk).forEach((iv) => wkIv(i, iv).forEach((x) => out.push(x)))); return shUnion(out); }
function wkAnd(a, b) { const out = []; a.forEach((x) => b.forEach((y) => { const s = Math.max(x[0], y[0]), e = Math.min(x[1], y[1]); if (e > s) out.push([s, e]); })); return shUnion(out); }
function wkLabel(m) { return SH_DAY_L[SH_DAYS[Math.floor(m / 1440) % 7]] + " " + shHHMM(m % 1440); }
function wkRange(x) { const sameDay = Math.floor(x[0] / 1440) === Math.floor((x[1] - 1) / 1440); return wkLabel(x[0]) + "–" + (sameDay ? shHHMM(x[1] % 1440 || 1440).replace("24:00", "24:00") : wkLabel(x[1] % WK)); }
// groups that carry ALL alarms facility-wide: covers Low and above, no area restriction, no alarm removed by hand
function njAllAlarmGroups(list) { return (list || (window.oncallStore && window.oncallStore.groups) || []).filter((g) => g.enabled && g.minPriority === "low" && !(g.areas || []).length && !(g.alarmDel || []).length); }
// `list` = a what-if set of groups (the editor's unsaved window, a delete, a pause)
function njAllAlarmsCover(list) {
  const groups = njAllAlarmGroups(list);
  const cov = [];
  groups.forEach((g) => {
    const p1 = (g.tiers && g.tiers.p1) || [];
    if (!p1.length) return;
    const reach = shUnion(p1.map((id) => shiftStore.shiftOf(id)).filter(Boolean).reduce((o, s) => o.concat(wkShift(s)), []));
    wkAnd(wkGroup(g), reach).forEach((x) => cov.push(x));
  });
  return { groups: groups, gaps: shSubtract([[0, WK]], shUnion(cov)) };
}
// hours a change would NEWLY leave without all-alarms cover. Informational, never a block: the
// product owner's rule is that the Coverage panel shows the gap, not that the save is stopped.
function njOcGapDelta(nextGroups) {
  const before = njAllAlarmsCover().gaps, after = njAllAlarmsCover(nextGroups).gaps;
  return before.length ? shSubtract(after, before) : after;
}
function njOcGapRange(x) {
  if (x[0] <= 0 && x[1] >= WK) return "around the clock, all week";
  if (x[1] >= WK) { const sameDay = Math.floor(x[0] / 1440) === 6; return wkLabel(x[0]) + "–" + (sameDay ? "24:00" : "Sun 24:00"); }
  return wkRange(x);
}
function njOcGapText(gaps) { return gaps.slice(0, 3).map(njOcGapRange).join(" · ") + (gaps.length > 3 ? " +" + (gaps.length - 3) + " more" : ""); }
// the customer's "not a combination of Priority 1, 2, 3" read across groups: anyone already on a
// DIFFERENT level of another enabled group whose window overlaps. A soft warning in the picker,
// never a hide — two Priority 1 duties in different groups is normal and not flagged.
function njOcAlsoOn(mid, g, tier) {
  if (tier === "b247") return [];
  const mine = wkGroup(g);
  const out = [];
  ((window.oncallStore && window.oncallStore.groups) || []).forEach((o) => {
    if (o.id === g.id || !o.enabled) return;
    ["p1", "p2", "p3"].forEach((t) => { if (t !== tier && ((o.tiers && o.tiers[t]) || []).includes(mid) && wkAnd(mine, wkGroup(o)).length) out.push({ g: o, tier: t }); });
  });
  return out;
}

// `list` = the groups to judge (the draft view while editing); default = the saved list.
// Only the site's OWN rules are findings: an unused Priority 2/3 is not a gap on a site that
// runs Priority 1 only, so "no one third in line" is gone.
function shCoverage(list) {
  const groups = (list || (window.oncallStore && window.oncallStore.groups) || []).filter((g) => g.enabled);
  const out = { noFirst: [], allOff: [], noThird: [], gaps: [], idle: [], unreachable: [], reqEmpty: [] };
  groups.forEach((g) => ["p2", "p3", "b247"].forEach((t) => { if (window.ocRequired && window.ocRequired(g, t) && !((g.tiers && g.tiers[t]) || []).length) out.reqEmpty.push({ g: g, tier: t }); }));
  groups.forEach((g) => {
    const p1 = (g.tiers && g.tiers.p1) || [];
    if (!p1.length) { out.noFirst.push(g); return; }
    if (!p1.some((id) => shiftStore.shiftOf(id))) out.allOff.push(g);
    const gaps = shGroupGaps(g);
    if (gaps.length) out.gaps.push({ g: g, gaps: gaps });
  });
  const paged = new Set();
  groups.forEach((g) => ["p1", "p2", "p3"].forEach((t) => ((g.tiers && g.tiers[t]) || []).forEach((id) => paged.add(id))));
  if (window.njOcShiftsOn && window.njOcShiftsOn()) Object.keys(shiftStore.roster).forEach((id) => { if (!paged.has(id)) out.idle.push(id); });
  return out;
}

// ── small parts ──
function ShiftBadge({ id }) {
  if (window.njOcShiftsOn && !window.njOcShiftsOn()) return null;
  const s = shiftStore.shiftOf(id);
  if (!s) return <span className="ocr-badge off" title="Not on any shift this week. This recipient is paged by nothing.">Off duty</span>;
  if (!s.today) return <span className="ocr-badge off" title={"Not on a shift today · this week: " + shSummary(s)}>Off today</span>;
  return <span className="ocr-badge" title={s.today.name + " " + shTimeL(s.today) + " today · this week: " + shSummary(s)}>{s.today.name}</span>;
}

// ── the roster grid ── one row per recipient, one cell per day. Two views of the same cells:
// a template week (Usual week / Week A, B…), which repeats, and a dated week, where a changed
// cell is a change for that date only and "As Week A" puts it back.
// ── card view ── the earlier look, kept for comparison: one column per shift for ONE day, people
// as chips. Same cells as the grid, so both views always agree.
function OcrPick({ used, onPick, onClose }) {
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
      <div className="oc-menu-search"><Icon name="search" size={16} color="var(--slate-400)" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipients…" /></div>
      <div className="oc-menu-list">
        {avail.map((m) => (
          <button key={m.id} className="oc-menu-item" onClick={() => onPick(m.id)}>
            <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
            <span className="oc-menu-name">{m.name}</span>
          </button>
        ))}
        {!avail.length && <NjInline>{ql ? "No one matches “" + q.trim() + "”." : "Everyone is already on this shift."}</NjInline>}
      </div>
    </div>
  );
}
function OcrCards({ store, dated, days, wTpl, di, setDi, today, n }) {
  const [open, setOpen] = React.useState(null);
  const d = SH_DAYS[di], k = days[di];
  const past = dated && k < today;
  const valOf = (m) => (dated ? store.cellOn(k, m) : store.cellTpl(wTpl, m, d));
  const put = (m, sid) => (dated ? store.setDate(k, m, sid) : store.setCell(wTpl, m, d, sid));
  const people = ocRoster();
  const off = people.filter((m) => !valOf(m.id));
  const asW = n > 1 ? shWeekName(wTpl) : "the usual week";
  const chip = (m, sid) => {
    const chg = dated && store.hasChange(k, m.id);
    return (
      <span key={m.id} className={"ocr-person" + (sid ? "" : " off") + (chg ? " chg" : "")}>
        <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
        <span className="ocr-person-n">{m.name}</span>
        {chg && !past && <button className="oc-chip-x" title={"Changed for this date · put back as in " + asW} aria-label={"Reset " + m.name} onClick={() => store.resetOne(k, m.id)}><Icon name="rotate-ccw" size={13} /></button>}
        {sid && !past && <button className="oc-chip-x" title="Off on this day" aria-label={"Set " + m.name + " off"} onClick={() => put(m.id, null)}><Icon name="x" size={14} /></button>}
      </span>
    );
  };
  return (
    <React.Fragment>
      <div className="ocr-days-row" role="tablist" aria-label="Day">
        {SH_DAYS.map((x, i) => (
          <button key={x} role="tab" aria-selected={di === i} disabled={dated && days[i] < today}
            className={"ocr-daychip" + (di === i ? " on" : "") + (dated && days[i] === today ? " today" : "") + (dated && store.overrides(days[i]) ? " has" : "")}
            onClick={() => setDi(i)}>{dated ? (days[i] === today ? "Today" : shDayLabel(days[i])) : SH_DAY_L[x]}</button>
        ))}
      </div>
      <div className="ocr-board">
        <div className="ocr-col ocr-col-off">
          <div className="ocr-col-h"><span className="ocr-col-n">Off</span><span className="ocr-col-c data">{off.length}</span></div>
          <p className="ocr-col-d">Paged by nothing on this day.</p>
          <div className="ocr-col-body">{off.map((m) => chip(m, null))}{!off.length && <span className="ocr-empty">Everyone is on a shift.</span>}</div>
        </div>
        {store.shifts.map((s) => {
          const ids = people.filter((m) => valOf(m.id) === s.id);
          return (
            <div className="ocr-col" key={s.id}>
              <div className="ocr-col-h">
                <span className="ocr-col-n">{s.name}</span>
                {s.builtin && <span className="ocr-badge built" title="Built-in shift: always available, cannot be deleted">Built-in</span>}
                <span className="ocr-col-c data">{ids.length}</span>
                <span className="ocr-col-act"><button className="icon-btn" title={"Edit " + s.name} aria-label={"Edit " + s.name} onClick={() => openShiftEditor(s)}><Icon name="pencil" size={14} /></button></span>
              </div>
              <p className="ocr-col-d data">{shTimeL(s)}</p>
              <div className="ocr-col-body">{ids.map((m) => chip(m, s.id))}{!ids.length && <span className="ocr-empty">No one on this shift.</span>}</div>
              {!past && <div className="oc-add-wrap">
                <button className="member-add" onClick={() => setOpen(open === s.id ? null : s.id)}><Icon name="plus" size={14} /> Assign</button>
                {open === s.id && <OcrPick used={ids.map((m) => m.id)} onPick={(mid) => { put(mid, s.id); setOpen(null); }} onClose={() => setOpen(null)} />}
              </div>}
            </div>
          );
        })}
        <button className="ocr-col ocr-col-new" onClick={() => openShiftEditor(null)}><Icon name="calendar-plus" size={16} /> New shift</button>
      </div>
    </React.Fragment>
  );
}

function OcRosterBoard({ layout }) {
  const store = useShifts();
  const [di, setDi] = React.useState(() => SH_DAYS.indexOf(shDayName(shToday())));
  const today = shToday();
  const n = store.rotN;
  const [view, setView] = React.useState({ kind: "week", start: shMonday(today), w: 0 });
  const dated = view.kind === "week";
  const days = SH_DAYS.map((d, i) => (dated ? shAddDays(view.start, i) : null));
  const wTpl = dated ? store.weekOf(view.start) : Math.min(view.w, n - 1);
  const people = ocRoster();
  const usual = n > 1 ? shWeekName(wTpl) : "the usual week";
  const thisWeek = shMonday(today);
  const go = (k) => setView({ kind: "week", start: k, w: 0 });
  const fmt = (k) => shDayFrom(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const hrs = (win) => shHours({ win: win });
  const nChg = dated ? days.reduce((a, k) => a + store.overrides(k), 0) : 0;
  return (
    <React.Fragment>
      <div className="ocr-strip">
        {Array.from({ length: n }, (x, i) => (
          <button key={i} className={"ocr-daychip" + (!dated && wTpl === i ? " on" : "")} onClick={() => setView({ kind: "tpl", w: i })}
            title={n > 1 ? shWeekName(i) + " · next runs from " + shDayLong(store.nextStartOf(i)) : "The week that repeats until someone changes it"}>{n > 1 ? shWeekName(i) : "Usual week"}</button>
        ))}
        <span className="ocr-strip-div" />
        <button className="icon-btn" title="Previous week" aria-label="Previous week" disabled={dated && view.start <= thisWeek} onClick={() => go(dated ? shAddDays(view.start, -7) : thisWeek)}><Icon name="chevron-left" size={16} /></button>
        <button className={"ocr-daychip" + (dated ? " on" : "")} onClick={() => go(dated ? view.start : thisWeek)}>{dated ? fmt(view.start) + " – " + fmt(shAddDays(view.start, 6)) : "Dated weeks"}</button>
        <button className="icon-btn" title="Next week" aria-label="Next week" onClick={() => go(shAddDays(dated ? view.start : thisWeek, 7))}><Icon name="chevron-right" size={16} /></button>
        {dated && view.start !== thisWeek && <button className="linkbtn" onClick={() => go(thisWeek)}>This week</button>}
      </div>
      <div className="ocr-strip-note">
        {dated
          ? <span>{n > 1 ? <React.Fragment>This week follows <b>{shWeekName(wTpl)}</b>. </React.Fragment> : null}A change here applies to that date only{nChg ? <React.Fragment> · <b>{nChg} changed</b></React.Fragment> : null}. {layout === "cards" ? <React.Fragment>To undo one, use the <Icon name="rotate-ccw" size={12} /> on the name.</React.Fragment> : <React.Fragment>To undo one, pick <b>As {n > 1 ? shWeekName(wTpl) : "usual week"}</b> in the cell.</React.Fragment>}</span>
          : <span>Editing <b>{n > 1 ? shWeekName(wTpl) : "the usual week"}</b>. It repeats {n > 1 ? "every " + n + " weeks, changing over on Monday" : "every week"} unless a date is changed.</span>}
      </div>
      {layout === "cards" ? <OcrCards store={store} dated={dated} days={days} wTpl={wTpl} di={di} setDi={setDi} today={today} n={n} /> : <React.Fragment>
      <div className="tbl-scroll">
        <table className="tbl ocr-grid">
          <thead>
            <tr>
              <th className="ocr-g-name">RECIPIENT</th>
              {SH_DAYS.map((d, i) => <th key={d} className={dated && days[i] === today ? "ocr-g-today" : ""}>{SH_DAY_L[d].toUpperCase()}{dated ? <span className="ocr-g-date">{shDayFrom(days[i]).getDate()}</span> : null}</th>)}
              <th className="ocr-g-h">H / WK</th>
            </tr>
          </thead>
          <tbody>
            {people.map((m) => {
              const win = dated ? store.weekWin(m.id, view.start) : store.tplWin(wTpl, m.id);
              return (
                <tr key={m.id}>
                  <td className="ocr-g-name"><span className="ocr-g-who"><Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />{m.name}</span></td>
                  {SH_DAYS.map((d, i) => {
                    const k = days[i];
                    const base = store.cellTpl(wTpl, m.id, d);
                    const chg = dated && store.hasChange(k, m.id);
                    const sid = dated ? store.cellOn(k, m.id) : base;
                    const past = dated && k < today;
                    const s = store.byId(sid);
                    const val = dated ? (chg ? sid || "off" : "") : sid || "off";
                    return (
                      <td key={d} className={"ocr-g-cell" + (s ? " on" : "") + (chg ? " chg" : "")}>
                        <select className="ocr-g-sel" value={val} disabled={past} aria-label={m.name + " · " + (dated ? shDayLong(k) : SH_DAY_L[d])}
                          title={s ? s.name + " " + shTimeL(s) + (chg ? " · changed for this date" : "") : chg ? "Off · changed for this date" : "Off"}
                          onChange={(e) => { const v = e.target.value; if (!dated) store.setCell(wTpl, m.id, d, v === "off" ? null : v); else if (v === "") store.resetOne(k, m.id); else store.setDate(k, m.id, v === "off" ? null : v); }}>
                          {dated && <option value="">{"As " + (n > 1 ? shWeekName(wTpl) : "usual") + ": " + (store.byId(base) ? store.byId(base).name : "Off")}</option>}
                          {store.shifts.map((x) => <option key={x.id} value={x.id}>{x.name + " · " + shTimeL(x)}</option>)}
                          <option value="off">Off</option>
                        </select>
                        <span className="ocr-g-lbl" aria-hidden="true">{s ? s.name : "Off"}{s && <span className="ocr-g-t">{shTimeL(s)}</span>}</span>
                      </td>
                    );
                  })}
                  <td className="ocr-g-h data">{hrs(win)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ocr-shifts">
        <span className="ocr-shifts-l">Shifts</span>
        {store.shifts.map((s) => (
          <button key={s.id} className="ocr-shift-chip" onClick={() => openShiftEditor(s)} title={"Edit " + s.name}>
            <span className="ocr-shift-n">{s.name}</span><span className="data">{shTimeL(s)}</span><Icon name="pencil" size={12} />
          </button>
        ))}
        <button className="member-add" onClick={() => openShiftEditor(null)}><Icon name="plus" size={14} /> New shift</button>
      </div>
      </React.Fragment>}
    </React.Fragment>
  );
}

function ShiftRotationDialog() {
  const st = shiftStore;
  const [n, setN] = React.useState(st.rotN);
  const [start, setStart] = React.useState(st.rotStart);
  const [names, setNames] = React.useState(() => Array.from({ length: 4 }, (x, i) => ((st.data.rot && st.data.rot.names) || [])[i] || ""));
  const mon = shMonday(start || shToday());
  const nameOf = (i) => (names[i] || "").trim() || "Week " + shWeekL(i);
  const wOf = (k) => { const w = Math.floor((shDayFrom(k) - shDayFrom(mon)) / (7 * 864e5) + 0.5); return ((w % n) + n) % n; };
  const first = shMonday(shToday());
  // one full cycle from this week, then a line saying it starts over: no end date, it simply repeats
  const prev = Array.from({ length: n }, (x, i) => shAddDays(first, i * 7));
  const again = shAddDays(first, n * 7);
  const fmt = (k) => shDayFrom(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const lost = n < st.rotN ? Array.from({ length: st.rotN - n }, (x, i) => shWeekName(n + i)) : [];
  const save = () => {
    const go = () => { st.setRotation(n, mon, names.map((x) => x.trim())); closeDialog(); njToast(n > 1 ? "Rotation saved · " + n + " weeks, changing over on Monday." : "Rotation off · one usual week."); };
    if (lost.length) openDialog(<ConfirmDialog title="Shorten the rotation" danger message={"Delete " + lost.join(", ") + "?"}
      detail="Who is on those weeks will be deleted. Dates you changed by hand stay as they are." confirmLabel="Delete and save" onConfirm={go} />);
    else go();
  };
  return (
    <Dialog width={560}>
      <DlgHeader icon="repeat" name="Shift rotation" onClose={closeDialog} />
      <div className="dlg-body oc-editor">
        <p className="oc-mininfo">For sites where the duty changes over on a fixed cycle. Each week has its own people on each shift, and the weeks take turns from the start date. Single dates can still be changed on the board.</p>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Repeats every</span>
          <div className="segmented">
            {[1, 2, 3, 4].map((k) => <button key={k} type="button" className={"seg" + (n === k ? " active" : "")} aria-pressed={n === k} onClick={() => setN(k)}>{k === 1 ? "1 week" : k + " weeks"}</button>)}
          </div>
          {n === 1 && <p className="oc-mininfo">One usual week that repeats. No rotation.</p>}
        </div>
        {n > 1 && (
          <React.Fragment>
            <div className="oc-ed-sec">
              <span className="oc-field-l">{nameOf(0)} starts</span>
              <div className="ocrot-start">
                <input className="de-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start date" />
                {start && mon !== start && <span className="oc-mininfo">Moved to Monday {fmt(mon)}: the shift change is on Monday.</span>}
              </div>
            </div>
            <div className="oc-ed-sec">
              <span className="oc-field-l">Week names <span className="note-opt">(optional)</span></span>
              <div className="ocrot-names">
                {Array.from({ length: n }, (x, i) => (
                  <label className="ocrot-name" key={i}><span className="ocrot-l">{shWeekL(i)}</span>
                    <input className="de-input" value={names[i]} maxLength={24} placeholder={"Week " + shWeekL(i)} aria-label={"Name for week " + shWeekL(i)}
                      onChange={(e) => setNames((a) => a.map((v, j) => (j === i ? e.target.value : v)))} /></label>
                ))}
              </div>
            </div>
            <div className="oc-ed-sec">
              <span className="oc-field-l">One cycle from this week</span>
              <div className="ocrot-prev">
                {prev.map((k) => (
                  <div className={"ocrot-row" + (k === first ? " now" : "")} key={k}>
                    <span className="data">{fmt(k)} – {fmt(shAddDays(k, 6))}</span>
                    <span className="ocrot-w">{nameOf(wOf(k))}</span>
                    {k === first && <span className="ocr-badge">This week</span>}
                  </div>
                ))}
                <div className="ocrot-row ocrot-again"><Icon name="repeat" size={14} /> Then starts over: {nameOf(wOf(again))} again from {fmt(again)}, and so on with no end date.</div>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={save}><Icon name="check" size={16} /> Save</button>
      </div>
    </Dialog>
  );
}
function openShiftRotation() { openDialog(<ShiftRotationDialog />); }
function ocrDeleteShift(s) {
  const n = shiftStore.uses(s.id);
  openDialog(<ConfirmDialog title="Delete shift" message={"Delete “" + s.name + "”?"} danger
    detail={n ? n + " roster " + (n === 1 ? "day uses" : "days use") + " it. They become Off, and those people are not paged on them." : "No one is on it."}
    confirmLabel="Delete" onConfirm={() => { shiftStore.remove(s.id); njToast("Shift deleted."); }} />);
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
        {!log.list.length && <NjEmpty size="compact" icon="history" title="No changes recorded yet" body="Edits to groups and shifts are listed here with who made them." />}
      </div>
      <div className="dlg-foot"><button className="btn btn-secondary" onClick={closeDialog}>Close</button></div>
    </Dialog>
  );
}
function openOcLog() { openDialog(<OcLogDialog />); }

// ── shift editor ── a shift is a name and a time of day. Which days, and who, is the grid.
// Times are typed (HH:MM, 24-hour), like every other time field in NJORD.
const SH_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function ShiftEditorDialog({ shift }) {
  const editing = !!shift;
  const [s, setS] = React.useState(() => shift ? shClone(shift) : { id: "sh" + Date.now(), name: "", desc: "", f: "07:00", t: "15:00" });
  const set = (patch) => setS((x) => Object.assign({}, x, patch));
  const fOk = SH_TIME_RE.test(s.f), tOk = SH_TIME_RE.test(s.t);
  const dup = shiftStore.shifts.some((x) => x.id !== s.id && x.name.trim().toLowerCase() === s.name.trim().toLowerCase());
  const canSave = s.name.trim().length > 0 && fOk && tOk && !dup;
  const len = fOk && tOk ? ((shMin(s.t) - shMin(s.f) + 1440) % 1440 || 1440) : 0;
  const hint = !fOk || !tOk ? "Use 24-hour time, for example 07:00 or 23:30."
    : s.f === s.t ? "Same start and end: all day, 24 h."
    : shMin(s.t) < shMin(s.f) ? "Ends the next morning · " + Math.round(len / 60 * 10) / 10 + " h."
    : Math.round(len / 60 * 10) / 10 + " h.";
  const save = () => { shiftStore.upsert(Object.assign({}, s, { name: s.name.trim(), desc: (s.desc || "").trim() })); closeDialog(); njToast((editing ? "Updated " : "Created ") + s.name.trim() + "."); };
  return (
    <Dialog width={520}>
      <DlgHeader icon={editing ? "pencil" : "calendar-plus"} name={editing ? "Edit shift" : "New shift"} onClose={closeDialog} />
      <div className="dlg-body oc-editor">
        <DeField label="Name"><input className="de-input" autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Day 07–15" /></DeField>
        <div className="de-form-2col">
          <DeField label="From"><input className={"de-input data" + (fOk ? "" : " de-bad")} value={s.f} maxLength={5} inputMode="numeric" placeholder="07:00" onChange={(e) => set({ f: e.target.value })} /></DeField>
          <DeField label="To"><input className={"de-input data" + (tOk ? "" : " de-bad")} value={s.t} maxLength={5} inputMode="numeric" placeholder="15:00" onChange={(e) => set({ t: e.target.value })} /></DeField>
        </div>
        <p className="oc-mininfo">{hint} The days are set on the roster, per person.</p>
        <DeField label="Description (optional)"><input className="de-input" value={s.desc || ""} onChange={(e) => set({ desc: e.target.value })} placeholder="Working hours" /></DeField>
        {dup && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>A shift called “{s.name.trim()}” already exists.</div>}
      </div>
      <div className="dlg-foot dlg-foot-split">
        <div>{editing && !s.builtin && <button className="btn btn-secondary" onClick={() => { closeDialog(); ocrDeleteShift(shift); }}><Icon name="trash-2" size={16} /> Delete</button>}</div>
        <div className="dlg-foot-btns">
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={save}><Icon name="check" size={16} /> {editing ? "Save" : "Create"}</button>
        </div>
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
              <td><span className="data">{shTimeL(s)}</span></td>
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
  const shiftsOn = !window.njOcShiftsOn || window.njOcShiftsOn();
  const ql = q.trim().toLowerCase();
  const rows = ocRoster()
    .filter((m) => !ql || m.name.toLowerCase().includes(ql))
    .filter((m) => !onlyDuty || !shiftsOn || shiftStore.shiftOf(m.id))
    .map((m) => {
      const at = [];
      groups.forEach((g) => ["p1", "p2", "p3", "b247"].forEach((t, i) => { if (((g.tiers && g.tiers[t]) || []).includes(m.id)) at.push({ g: g, n: t === "b247" ? "24/7" : i + 1 }); }));
      return { m: m, at: at };
    });
  return (
    <div className="card ocr-person-card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="users" size={16} color="var(--slate-600)" /><span className="card-title">By person</span></div>
        <div className="ocr-head-r">
          <div className="field ocr-search"><Icon name="search" size={16} color="var(--slate-400)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter recipients…" />
            {q && <button className="ocr-search-x" title="Clear" aria-label="Clear search" onClick={() => setQ("")}><Icon name="x" size={14} /></button>}</div>
          {shiftsOn && <button className={"btn btn-secondary btn-sm" + (onlyDuty ? " btn-active" : "")} onClick={() => setOnlyDuty(!onlyDuty)}><Icon name="filter" size={14} /> On duty only</button>}
        </div>
      </div>
      <table className="tbl">
        <thead><tr><th>NAME</th>{shiftsOn && <th>SHIFT</th>}<th>PAGED FOR</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.m.id}>
              <td><Icon name={r.m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" /> {r.m.name}</td>
              {shiftsOn && <td><ShiftBadge id={r.m.id} /></td>}
              <td>
                {r.at.length ? (
                  <div className="ocr-at">
                    {r.at.map((x, i) => <span className="ocr-at-i" key={i}><span className={"oc-tier-n" + (x.n === "24/7" ? " wide" : "")}>{x.n}</span>{x.g.name}</span>)}
                  </div>
                ) : <span className="ocr-empty">No group pages this recipient.</span>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={shiftsOn ? 3 : 2}><span className="ocr-empty">No one matches that filter.</span></td></tr>}
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
  if (window.useOncall) window.useOncall();
  if (window.useOcDraft) window.useOcDraft();
  const [open, setOpen] = React.useState(null);
  const shiftsOnC = !window.njOcShiftsOn || window.njOcShiftsOn();
  // judged on what you are about to save, so the card answers "is my edit safe" before Save
  const all = window.ocView ? window.ocView() : ((window.oncallStore && window.oncallStore.groups) || []);
  const site = window.ocSite ? window.ocSite() : { uhf: { on: true }, rule247: true };
  const enabled = all.filter((g) => g.enabled);
  const c = shCoverage(all);
  const rows = [];
  // worst first. The round-the-clock rule is the SITE's choice (Site channels): a site staffed
  // around the clock, or one that pages only part of its alarms, turns it off instead of
  // living with a permanent red line or dismissing it.
  const aa = njAllAlarmsCover(all);
  if (site.rule247) {
    if (enabled.length && !aa.groups.length) rows.push({ sev: "crit", t: "No enabled group carries all alarms", d: "This site requires all alarms on Priority 1 around the clock. Create a group that covers All alarms for the whole facility, or turn the rule off under Site channels.", go: null });
    else if (aa.gaps.length) rows.push({ sev: "crit", t: "All alarms are not covered around the clock", d: aa.gaps.length + (aa.gaps.length === 1 ? " uncovered block" : " uncovered blocks") + " in the week. First: " + wkRange(aa.gaps[0]) + ". No one on Priority 1 of an all-alarms group in those hours.", go: { g: aa.groups[0], gs: aa.groups }, gaps: aa.gaps });
  }
  c.reqEmpty.forEach((x) => rows.push({ sev: "crit", t: x.g.name + ": " + ocTierLabel(x.tier) + " is required and empty", d: "Assign someone to this level.", go: { g: x.g } }));
  c.noFirst.forEach((g) => rows.push({ sev: "crit", t: g.name + " has no one on Priority 1", d: "An alarm in this group reaches nobody.", go: { g: g } }));
  c.allOff.forEach((g) => rows.push({ sev: "crit", t: g.name + ": every first-line recipient is off duty", d: "Assigned, but not on the roster, so nothing will page.", go: { roster: true } }));
  c.gaps.forEach((x) => {
    const g0 = x.gaps[0];
    rows.push({ sev: "warn", t: x.g.name + ": " + x.gaps.length + (x.gaps.length === 1 ? " uncovered hour block" : " uncovered hour blocks"), d: "First uncovered: " + SH_DAY_L[g0.day] + " " + g0.from + "–" + g0.to + ". Inside the paging window, with no first-line shift covering it.", go: { roster: true } });
  });
  if (!site.uhf.on && enabled.length) rows.push({ sev: "warn", t: "UHF sender is off", d: "Alarms leave the site on one path only. NS 9416 asks for two independent paths where the site is not staffed around the clock.", go: { site: true } });
  if (c.idle.length && enabled.length > 0) rows.push({ sev: "info", t: c.idle.length + " rostered but paged by nothing", d: c.idle.map((id) => ocMember(id).name).join(" · "), go: { person: ocMember(c.idle[0]).name } });
  const ahead = shiftsOnC ? shPlannedAhead() : [];
  const anyCrit = rows.some((r) => r.sev === "crit") || (all.length > 0 && enabled.length === 0);
  // collapsed by default (user); the summary line turns red when something is critical.
  // Not dismissible — a dismissed gap is how a site ends up paging nobody.
  const isOpen = open === null ? false : open;
  const sum = enabled.length === 0 ? (all.length ? "All groups paused" : "No groups yet") : rows.length ? rows.length + (rows.length === 1 ? " finding" : " findings") : "No gaps found";
  const okText = shiftsOnC ? "Every enabled group has a first line, and every hour of each paging window is held by a rostered shift." : site.rule247 ? "Every enabled group has a first line, and all alarms are held on Priority 1 around the clock." : "Every enabled group has a first line. Round-the-clock check is off for this site.";
  return (
    <div className={"card ocr-cov" + (isOpen ? "" : " closed")}>
      <button className="card-head ocr-cov-head" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
        <div className="card-head-l"><Icon name={anyCrit ? "alert-octagon" : rows.length ? "shield-alert" : "shield-check"} size={16} color={anyCrit ? "var(--critical-text)" : rows.length ? "var(--warning-text)" : "var(--success-text)"} /><span className="card-title">Coverage</span>
          <span className={"ocr-cov-sum" + (anyCrit ? " crit" : "")}>{sum}{window.ocDraft && window.ocDraft.n ? " · incl. unsaved changes" : ""}</span></div>
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="var(--slate-400)" />
      </button>
      {isOpen && <div className="ocr-cov-body">
        {all.length > 0 && enabled.length === 0 && (
          <div className="ocr-cov-row crit"><Icon name="alert-octagon" size={16} />
            <div><div className="ocr-cov-t">All {all.length} on-call groups are paused</div>
              <div className="ocr-cov-d">No alarm leaves the facility to anyone, on any channel, whatever the roster says.</div></div></div>
        )}
        {rows.map((r, i) => (
          <button className={"ocr-cov-row go " + r.sev} key={i} onClick={() => { if (r.go && r.go.site) { window.openOcSite && window.openOcSite(); return; } window.njOcGo && window.njOcGo(r.go); }}
            title={r.go && r.go.site ? "Open On-call settings" : r.go && r.go.person ? "Find " + r.go.person + " on Paging groups" : r.go && r.go.roster ? "Open Personal shifts" : r.go && r.go.gs && r.go.gs.length > 1 ? "Show all " + r.go.gs.length + " on Paging groups" : r.go && r.go.g ? "Show " + r.go.g.name + " on Paging groups" : undefined}>
            <Icon name={r.sev === "crit" ? "alert-octagon" : r.sev === "warn" ? "alert-triangle" : "info"} size={16} />
            <div><div className="ocr-cov-t">{r.t}</div><div className="ocr-cov-d">{r.d}</div></div>
            <Icon name="chevron-right" size={16} />
          </button>
        ))}
        {!rows.length && enabled.length > 0 && <div className="ocr-cov-row ok"><Icon name="check-circle-2" size={16} /><div><div className="ocr-cov-t">{ahead.length ? "Today is covered" : "No gaps found"}</div><div className="ocr-cov-d">{okText}</div></div></div>}
        {ahead.length > 0 && (
          <div className="ocr-cov-ahead">
            <Icon name="calendar-clock" size={14} />
            <span><b>{ahead.length} upcoming {ahead.length === 1 ? "day has" : "days have"} a gap.</b> {ahead.slice(0, 3).map((a) => shDayLabel(a.day) + " (" + a.hits.length + ")").join(" · ")}{ahead.length > 3 ? " …" : ""}</span>
          </div>
        )}
      </div>}
    </div>
  );
}

Object.assign(window, { njOcGapDelta, njOcGapText, njOcGapRange, njOcAlsoOn, shiftStore, useShifts, njShiftOf, shSummary, ShiftBadge, OcRosterBoard, OcShiftList, openShiftRotation, shWeekName, OcPersonView, OcCoverageCard, openShiftEditor, njPagedFor, njSoleFirstLine, njCanReceive, njUnreachable, njOcLog, openOcLog, njAllAlarmsCover, njAllAlarmGroups, wkRange, oclNow, shCoverage });
