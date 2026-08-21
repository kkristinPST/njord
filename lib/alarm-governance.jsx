// alarm-governance.jsx — the lifecycle half of the alarm system: the rules that keep the
// master record honest after handover. Pure logic + stores, no components, so it can load
// before the screens that use it (the master record itself, RATN_DATA, is resolved lazily).
//
// Covers, per PSTech Alarm Philosophy rev 0.0 / IEC 62682 / NS 9416:
//   ch. 5   shelving is not permitted for critical alarms → njShelveRule
//   ch. 6-7 the master record is a controlled document → njRatnHistory (attributed, reversible)
//   ch. 11  performance monitoring → njAlarmTargets (the one stated number is flood = 10/10 min)
//   ch. 13  yearly review of Critical + High → njReviewDue

// The register's "today". Kept as one constant so review dates, change stamps and the
// rationalization screen can never drift apart.
const RATN_TODAY = "16 Jun 2026";
const RATN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function njParseDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const mi = RATN_MONTHS.indexOf(m[2]);
  return mi < 0 ? null : new Date(Number(m[3]), mi, Number(m[1]));
}
const RATN_TODAY_D = njParseDate(RATN_TODAY);
function njMonthsSince(s) {
  const d = njParseDate(s);
  if (!d) return null;
  return (RATN_TODAY_D.getFullYear() - d.getFullYear()) * 12 + (RATN_TODAY_D.getMonth() - d.getMonth());
}
// ch. 13: Critical and High are reviewed yearly. Everything else has no stated cadence, so the
// product does not invent one — it reports the date and stays silent about whether it is due.
function njReviewRequired(row) { return row.priority === "critical" || row.priority === "high"; }
function njReviewDue(row) {
  if (!njReviewRequired(row)) return false;
  const m = njMonthsSince(row.reviewedAt);
  return m == null || m >= 12;
}
function njReviewLabel(row) {
  if (!row.reviewedAt) return njReviewRequired(row) ? "Never reviewed" : "—";
  const m = njMonthsSince(row.reviewedAt);
  return m >= 12 ? "Overdue" : m >= 10 ? "Due soon" : "In date";
}

// ── the master record, resolved from the active-alarm side ───────────────────────────────
// The rationalization register is generated after this file loads, and its overrides live in
// localStorage. Both are read lazily and cached briefly: RowActions calls the shelving rule
// once per row per render, and re-parsing 2 600 rows there would be the icon bug all over again.
const RATN_OV_LS = "nj_ratn_overrides_v1";
let _mtMap = null, _ovCache = null, _ovAt = 0;
function njRatnOverrides() {
  const now = Date.now();
  if (_ovCache && now - _ovAt < 1500) return _ovCache;
  try { _ovCache = JSON.parse(localStorage.getItem(RATN_OV_LS) || "{}"); } catch (e) { _ovCache = {}; }
  _ovAt = now;
  return _ovCache;
}
function njRatnOverridesChanged() { _ovCache = null; }
function njMasterByTag() {
  if (_mtMap) return _mtMap;
  const data = window.RATN_DATA;
  if (!data) return null;                       // register not loaded yet — caller falls back
  _mtMap = new Map();
  data.forEach((r) => { if (!_mtMap.has(r.tag)) _mtMap.set(r.tag, r); });
  return _mtMap;
}
// merged master record for an annunciated alarm, or null when the tag is not in the register
function njMasterFor(row) {
  if (!row || !row.tag || row.tag === "—") return null;
  const map = njMasterByTag();
  const base = map && map.get(row.tag);
  if (!base) return null;
  const ov = njRatnOverrides()[base.id];
  return ov ? Object.assign({}, base, ov) : base;
}

// ── ch. 5: which alarms may be blocked (shelved) ─────────────────────────────────────────
// "This must not be possible for critical alarms, and only for alarms that indicate issues that
// quickly can escalate to critical situations." Which alarms qualify is decided during
// rationalization and carried on the master record as Allow shelving — so the field governs the
// action instead of sitting there decoratively.
function njShelveRule(row) {
  if (!row) return { ok: false, why: "" };
  if (row.level === "critical") {
    return { ok: false, code: "critical", why: "Critical alarms cannot be blocked · Alarm Philosophy ch. 5. Take it out of service instead.", src: "Alarm Philosophy ch. 5" };
  }
  const rec = njMasterFor(row);
  const allow = rec ? rec.allowShelving !== false : true;
  if (!allow) {
    return { ok: false, code: "record", why: "Blocking is not allowed for this alarm. Change Allow shelving in Rationalization first.", src: "Master record · Allow shelving" };
  }
  return { ok: true, why: "", src: rec ? "Master record · Allow shelving" : "Not in the master record — default allowed" };
}
function njShelveSplit(rows) {
  const ok = [], no = [];
  (rows || []).forEach((r) => (njShelveRule(r).ok ? ok : no).push(r));
  return { ok, no };
}

// ── ch. 6-7 + MOC: per-alarm change history ──────────────────────────────────────────────
// The compromise on the controlled document: inline editing stays as fast as it was, but every
// change to a CONTROLLED field is attributed, carries a reason and is reversible from the
// history. No approval state — a second-person gate was judged to cost more than it buys here,
// and is recorded as a deviation in the requirements spec instead.
const RATN_CONTROLLED = ["priority", "setpoint", "deadband", "onDelay", "offDelay", "resetAck", "allowShelving", "cls", "groups"];
const RATN_CTRL_SET = new Set(RATN_CONTROLLED);
function njIsControlled(field) { return RATN_CTRL_SET.has(field); }
const RATN_CHANGE_REASONS = [
  "Nuisance alarm — re-parameterised after review",
  "Setpoint corrected against process design basis",
  "Consequence re-assessed, priority adjusted",
  "Commissioning finding",
  "Corrects a configuration error",
];
const RATN_HIST_LS = "nj_ratn_history_v1";
const njRatnHistory = {
  data: (function () { try { return JSON.parse(localStorage.getItem(RATN_HIST_LS) || "{}"); } catch (e) { return {}; } })(),
  subs: new Set(),
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
  emit() { this.subs.forEach((f) => f()); try { localStorage.setItem(RATN_HIST_LS, JSON.stringify(this.data)); } catch (e) {} },
  for(id) { return this.data[id] || []; },
  count(id) { return (this.data[id] || []).length; },
  total() { return Object.keys(this.data).reduce((s, k) => s + this.data[k].length, 0); },
  // entries: [{ id, field, from, to }] written in one action
  append(entries, reason, by) {
    const at = RATN_TODAY;
    entries.forEach((e) => {
      const list = this.data[e.id] ? this.data[e.id].slice() : [];
      list.unshift({ at, by: by || "You", field: e.field, from: e.from, to: e.to, reason: reason || "" });
      this.data[e.id] = list.slice(0, 40);
    });
    this.emit();
  },
  revert(id, idx) {
    const list = this.data[id];
    if (!list || !list[idx]) return null;
    const e = list[idx];
    const rest = list.slice();
    rest.splice(idx, 1);
    this.data[id] = rest;
    this.emit();
    return e;
  },
  clear() { this.data = {}; this.emit(); },
};
function useRatnHistory() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => njRatnHistory.sub(f), []); return njRatnHistory; }
function njFmtHistVal(v) {
  if (v === true) return "Allowed";
  if (v === false) return "Not allowed";
  if (v === null || v === undefined || v === "") return "—";
  const st = window.RATN_STATUS && window.RATN_STATUS[v];
  if (st) return st.label;
  // priority labels: SEV on desktop; RATN_PRIOS is loaded on BOTH surfaces and carries the same
  // labels, so the shared history renders identically wherever it is opened. Not MSEV — those are
  // badge strings ("CRITICAL", "DIAG"), not value names.
  const sv = window.SEV && window.SEV[v];
  if (sv && sv.label) return sv.label;
  const pr = window.RATN_PRIOS && window.RATN_PRIOS.find((p) => p[0] === v);
  if (pr) return pr[1];
  return String(v);
}

// ── ch. 11: performance targets ──────────────────────────────────────────────────────────
// The philosophy asks for target values and names exactly one number (a flood is more than 10
// alarms in 10 minutes). Everything else ships unset: the screen reports the metric and says
// "no target set" rather than inventing a threshold and grading the site against it.
const AT_LS = "nj_alarm_targets_v1";
const AT_DEFAULTS = { flood10: 10, perDay: null, peak10: null, ackMin: null, standingMax: null };
const njAlarmTargets = {
  data: (function () {
    try { return Object.assign({}, AT_DEFAULTS, JSON.parse(localStorage.getItem(AT_LS) || "{}")); } catch (e) { return Object.assign({}, AT_DEFAULTS); }
  })(),
  subs: new Set(),
  sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
  emit() { this.subs.forEach((f) => f()); try { localStorage.setItem(AT_LS, JSON.stringify(this.data)); } catch (e) {} },
  set(patch) { this.data = Object.assign({}, this.data, patch); this.emit(); },
  reset() { this.data = Object.assign({}, AT_DEFAULTS); this.emit(); },
};
function useAlarmTargets() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => njAlarmTargets.sub(f), []); return njAlarmTargets.data; }
// verdict for a metric against its target: null = ungraded (no target set)
function njGrade(value, target, dir) {
  if (target == null || value == null) return null;
  return (dir === "min" ? value >= target : value <= target) ? "pass" : "fail";
}

Object.assign(window, {
  RATN_TODAY, njParseDate, njMonthsSince, njReviewRequired, njReviewDue, njReviewLabel,
  njMasterFor, njRatnOverridesChanged, njShelveRule, njShelveSplit,
  RATN_CONTROLLED, njIsControlled, RATN_CHANGE_REASONS, njRatnHistory, useRatnHistory, njFmtHistVal,
  njAlarmTargets, useAlarmTargets, njGrade, AT_DEFAULTS,
});
