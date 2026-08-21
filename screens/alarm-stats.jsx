// alarm-stats.jsx — Alarm Statistics: Overview / History / Alarm Register
// Rebuilt to match the capabilities the legacy system actually had (Oversikt · Historikk ·
// Alarmstatistikk): category donut, alarms per day, per-location rollup, top-10 / alarm list,
// and the full activation register, plus the ch. 11 performance block (rate, peak load, flood,
// acknowledge time) which reports against site-set targets and stays ungraded without them.

const statColor = (lvl) => (SEV[lvl] || SEV.low).dot;

const STAT_LEGEND = [
  { level: "critical", label: "Critical" },
  { level: "high",     label: "High" },
  { level: "medium",   label: "Medium" },
  { level: "low",      label: "Low" },
  { level: "diagnostic", label: "Diagnostic" },
];
const ORDER = ["critical", "high", "medium", "low", "diagnostic"];

// ───────────────────────── single source of truth: the activation register ─────────────────────────
// week = activations in the last 7 days · month = activations in the last 28 days
// total = lifetime activations (what the legacy "Alarmstatistikk" tab listed)
const AS_REG = [
  { alarm: "Drum filter 3 General fault from drive",        tag: "DPT3-FIL3-DR1", level: "critical", loc: "DPT3", sub: "Drum Filter",    week: 4,  month: 258, total: 258, ev: "Returned",           last: "12/02/2026 15:51:24" },
  { alarm: "Drum filter 1 General fault from drive",        tag: "DPT3-FIL1-DR1", level: "critical", loc: "DPT3", sub: "Drum Filter",    week: 3,  month: 205, total: 206, ev: "Returned",           last: "13/02/2026 14:02:36" },
  { alarm: "Drum filter 2 General fault from drive",        tag: "DPT3-FIL2-DR1", level: "critical", loc: "DPT3", sub: "Drum Filter",    week: 2,  month: 161, total: 161, ev: "Returned",           last: "13/02/2026 14:47:22" },
  { alarm: "Backwash valve filter 3 position fault",        tag: "DPT3-FIL3-XV1", level: "critical", loc: "DPT3", sub: "Drum Filter",    week: 1,  month: 107, total: 107, ev: "Returned",           last: "18/02/2026 17:06:29" },
  { alarm: "Backwash valve filter 1 position fault",        tag: "DPT4-FIL1-XV1", level: "critical", loc: "DPT4", sub: "Drum Filter",    week: 2,  month: 26,  total: 1281, ev: "Returned",          last: "14/01/2026 13:59:36" },
  { alarm: "Level in pump sump Low alarm",                  tag: "DPT3-SMP0-LT1", level: "high",     loc: "DPT3", sub: "Pump Sump",      week: 5,  month: 23,  total: 118, ev: "Acknowledged",       last: "04/03/2026 08:14:02" },
  { alarm: "pH 2 in pump sump High-high alarm",             tag: "DPT3-SMP0-QT4", level: "critical", loc: "DPT3", sub: "Pump Sump",      week: 3,  month: 14,  total: 61,  ev: "Returned",           last: "03/03/2026 22:41:10" },
  { alarm: "Lift pump 1 High temperature",                  tag: "DPT3-SMP0-PU1", level: "high",     loc: "DPT3", sub: "Pump Sump",      week: 2,  month: 11,  total: 44,  ev: "Returned",           last: "02/03/2026 06:22:47" },
  { alarm: "Oxygen saturation in fish tank Low alarm",      tag: "DPT2-DOX2-QT1", level: "critical", loc: "DPT2", sub: "Fish Tank",      week: 6,  month: 19,  total: 96,  ev: "Returned",           last: "04/03/2026 11:38:51" },
  { alarm: "Level in fish tank 15 High alarm",              tag: "DPT2-FTA15-LT1", level: "high",    loc: "DPT2", sub: "Fish Tank",      week: 4,  month: 17,  total: 71,  ev: "Returned",           last: "04/03/2026 04:19:08" },
  { alarm: "Waves in fish tank",                            tag: "DPT2-FTA15-LS2", level: "low",     loc: "DPT2", sub: "Fish Tank",      week: 3,  month: 12,  total: 51,  ev: "Returned",           last: "15/01/2026 17:26:28" },
  { alarm: "Feed screw fault",                              tag: "DPT2-FTA2-TB1", level: "high",     loc: "DPT2", sub: "Feeding",        week: 3,  month: 15,  total: 88,  ev: "Returned",           last: "03/03/2026 19:02:33" },
  { alarm: "Vacuum in CO₂ stripping High alarm",            tag: "DPT2-STR1-PT1", level: "high",     loc: "DPT2", sub: "CO₂ Degasser",   week: 5,  month: 21,  total: 134, ev: "Returned",           last: "04/03/2026 09:51:44" },
  { alarm: "MBBR blower 1 Communication error with drive",  tag: "DPT2-AEB0-BL1", level: "high",     loc: "DPT2", sub: "MBBR",           week: 2,  month: 9,   total: 37,  ev: "Returned",           last: "01/03/2026 13:44:19" },
  { alarm: "Level sensor vacuum degasser 2 High-high",      tag: "DPT1-STR2-LT1", level: "critical", loc: "DPT1", sub: "CO₂ Degasser",   week: 4,  month: 18,  total: 92,  ev: "Returned",           last: "04/03/2026 02:07:55" },
  { alarm: "Pressure signal error",                         tag: "DPT1-DOX2-PT1", level: "critical", loc: "DPT1", sub: "Oxygenation",    week: 2,  month: 10,  total: 43,  ev: "Returned To Service", last: "03/03/2026 16:28:12" },
  { alarm: "Lye pump 2 Missing operation feedback",         tag: "DPT1-DNA0-PU2", level: "high",     loc: "DPT1", sub: "Lye Dosing",     week: 3,  month: 13,  total: 58,  ev: "Returned",           last: "02/03/2026 21:11:36" },
  { alarm: "CO₂-fan 2 Communication error with drive",      tag: "DPT1-STR0-AV2", level: "high",     loc: "DPT1", sub: "CO₂ Degasser",   week: 2,  month: 8,   total: 34,  ev: "Returned",           last: "01/03/2026 07:53:41" },
  { alarm: "Grinder pump soft starter fault",               tag: "DFS0-FHA0-GR1", level: "medium",   loc: "Building 2 Dead Fish", sub: "Dead Fish", week: 2, month: 5, total: 22, ev: "Returned",     last: "28/02/2026 18:36:07" },
  { alarm: "Cyclone emptying sequence failed",              tag: "DFS0-CYC0-SQ1", level: "medium",   loc: "Building 2 Dead Fish", sub: "Dead Fish", week: 3, month: 26, total: 46, ev: "Acknowledged", last: "04/03/2026 12:04:59" },
  { alarm: "Level sensor vacuum aerator 2 High alarm",      tag: "HAT0-VAC2-LT2", level: "high",     loc: "Building 3 Hatchery", sub: "Incubation", week: 6, month: 52, total: 52, ev: "Returned",     last: "04/03/2026 11:22:25" },
  { alarm: "Incubator tray temperature High-high",          tag: "HAT0-INC1-TT1", level: "critical", loc: "Building 3 Hatchery", sub: "Incubation", week: 4, month: 16, total: 74, ev: "Returned",     last: "03/03/2026 05:47:20" },
  { alarm: "Egg sorting conveyor overload",                 tag: "HAT0-SRT0-CV1", level: "medium",   loc: "Building 3 Hatchery", sub: "Egg Sorting", week: 3, month: 11, total: 39, ev: "Returned",    last: "02/03/2026 14:29:48" },
  { alarm: "RAS circulation pump 2 low flow",               tag: "HAT0-RAS0-PU2", level: "high",     loc: "Building 3 Hatchery", sub: "RAS",        week: 5, month: 19, total: 83, ev: "Returned",     last: "04/03/2026 03:16:33" },
  { alarm: "Start-feed screw blocked",                      tag: "STF0-FTA1-TB2", level: "high",     loc: "Building 3 Start Feeding", sub: "Feeding", week: 4, month: 14, total: 66, ev: "Returned",   last: "03/03/2026 08:58:04" },
  { alarm: "Start-feed tank level Low alarm",               tag: "STF0-FTA1-LT1", level: "medium",   loc: "Building 3 Start Feeding", sub: "Feeding", week: 3, month: 9,  total: 31, ev: "Returned",   last: "01/03/2026 20:12:37" },
  { alarm: "Intake UV, CommonIONotCalibrated",             tag: "SBH0-UVA0-DI9", level: "medium",   loc: "Building 1", sub: "Water Treatment", week: 2, month: 80, total: 80, ev: "Returned",         last: "08/01/2026 08:33:32" },
  { alarm: "Intake UV, SDCardNotFound",                    tag: "SBH0-UVA0-DI8", level: "medium",   loc: "Building 1", sub: "Water Treatment", week: 1, month: 76, total: 76, ev: "Returned",         last: "08/01/2026 08:33:32" },
  { alarm: "Intake UV, LampWatchdogError",                 tag: "SBH0-UVA0-DI1", level: "medium",   loc: "Building 1", sub: "Water Treatment", week: 1, month: 46, total: 46, ev: "Returned",         last: "08/01/2026 08:33:32" },
  { alarm: "Heat pump General fault",                       tag: "SBH0-HPU0-GF1", level: "critical", loc: "Building 1", sub: "Technical",       week: 2, month: 25, total: 40, ev: "Returned",         last: "04/03/2026 08:47:26" },
  { alarm: "Alarm transmitter Heartbeat alarm",             tag: "SYS0-ATX0-HB1", level: "critical", loc: "System", sub: "Alarm Transmitter",   week: 3, month: 22, total: 48, ev: "Returned",         last: "04/03/2026 21:00:05" },
  { alarm: "PLC communication error",                       tag: "SYS0-PLC1-CM1", level: "critical", loc: "System", sub: "PLC",                week: 2, month: 12, total: 57, ev: "Returned",         last: "03/03/2026 01:33:18" },
  { alarm: "Historian write buffer full",                   tag: "SYS0-HIS0-BF1", level: "diagnostic", loc: "System", sub: "Historian",        week: 4, month: 15, total: 63, ev: "Acknowledged",     last: "04/03/2026 10:26:41" },
  { alarm: "Backwash valve filter 2 position fault",        tag: "DPT4-FIL2-XV1", level: "high",     loc: "DPT4", sub: "Drum Filter",      week: 3, month: 12, total: 49, ev: "Returned",           last: "02/03/2026 11:07:52" },
  { alarm: "Level in pump sump High-high alarm",            tag: "DPT4-SMP0-LT2", level: "critical", loc: "DPT4", sub: "Pump Sump",        week: 2, month: 8,  total: 36, ev: "Returned",           last: "01/03/2026 15:41:29" },
];

const AS_PERIODS = { week: { key: "week", days: 7, label: "Last Week" }, month: { key: "month", days: 28, label: "Last Month" } };

// deterministic distribution of a total across n days (with optional spike days)
function asRand(seed) { let s = (seed || 1) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function asSpread(total, n, seed, spikes) {
  if (!total || n <= 0) return new Array(Math.max(n, 0)).fill(0);
  const r = asRand(seed), w = [];
  for (let i = 0; i < n; i++) w.push(0.35 + r() * 1.25);
  (spikes || []).forEach((i) => { if (i < n) w[i] *= 8; });
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sum) * total);
  const out = raw.map((v) => Math.floor(v));
  let rem = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) out[order[k % n][1]]++;
  return out;
}

const AS_END = new Date(2026, 2, 5); // 05 Mar 2026: reference "now"
const AS_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const asPad = (n) => String(n).padStart(2, "0");
// bar labels — one per bucket (day, week or month depending on how long the range is)
function asBucketLabels(days, bucketDays, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const back = Math.min(i * bucketDays + bucketDays - 1, days - 1);
    const d = new Date(AS_END.getTime() - back * 864e5);
    if (bucketDays === 1) out.push(days <= 8 ? AS_WEEKDAYS[d.getDay()] : `${asPad(d.getDate())}.${asPad(d.getMonth() + 1)}`);
    else if (bucketDays === 7) out.push(`${asPad(d.getDate())}.${asPad(d.getMonth() + 1)}`);
    else out.push(`${AS_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`);
  }
  return out;
}
const AS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const asDate = (d) => `${asPad(d.getDate())}/${asPad(d.getMonth() + 1)}/${d.getFullYear()}`;

// build every derived dataset for a period from the register
function asBuild(field, days, scale) {
  const rows = AS_REG.map((r) => ({ ...r, n: Math.max(0, Math.round((r[field] || 0) * (scale == null ? 1 : scale))) })).filter((r) => r.n > 0);
  const total = rows.reduce((s, r) => s + r.n, 0);
  const byLevel = {};
  rows.forEach((r) => { byLevel[r.level] = (byLevel[r.level] || 0) + r.n; });
  const category = ORDER.filter((l) => byLevel[l]).map((l) => ({ level: l, value: byLevel[l] }));

  // long ranges aggregate into weekly / monthly buckets instead of being truncated
  const bucketDays = days <= 45 ? 1 : days <= 240 ? 7 : 28;
  const nb = Math.ceil(days / bucketDays);
  const bucket = bucketDays === 1 ? "Day" : bucketDays === 7 ? "Week" : "Month";
  const labels = asBucketLabels(days, bucketDays, nb);
  const spikes = nb > 20 ? [Math.floor(nb * 0.22), Math.floor(nb * 0.26)] : [];
  const perLevel = {};
  ORDER.forEach((l, i) => { perLevel[l] = asSpread(byLevel[l] || 0, nb, 7919 + i * 131 + days, l === "critical" || l === "high" ? spikes : []); });
  const perDay = labels.map((lab, i) => ({
    day: lab,
    segs: ORDER.map((l) => [l, perLevel[l][i]]).filter(([, v]) => v > 0),
  }));
  const dayMax = Math.max(1, ...perDay.map((d) => d.segs.reduce((s, [, v]) => s + v, 0)));
  const busiest = perDay.reduce((a, b) => (b.segs.reduce((s, [, v]) => s + v, 0) > a.segs.reduce((s, [, v]) => s + v, 0) ? b : a), perDay[0]);

  const locMap = new Map();
  rows.forEach((r) => {
    if (!locMap.has(r.loc)) locMap.set(r.loc, { name: r.loc, total: 0, b: {}, kids: new Map() });
    const L = locMap.get(r.loc);
    L.total += r.n; L.b[r.level] = (L.b[r.level] || 0) + r.n;
    if (!L.kids.has(r.sub)) L.kids.set(r.sub, { name: r.sub, total: 0, b: {} });
    const K = L.kids.get(r.sub);
    K.total += r.n; K.b[r.level] = (K.b[r.level] || 0) + r.n;
  });
  const locations = [...locMap.values()]
    .map((L) => ({ ...L, children: [...L.kids.values()].sort((a, b) => b.total - a.total) }))
    .sort((a, b) => b.total - a.total);

  const list = [...rows].sort((a, b) => b.n - a.n);
  return { rows, total, category, perDay, dayMax, busiest, locations, list, days, labels, bucket, bucketDays };
}

// ───────────────────────── performance (ch. 11 / IEC 62682 §16) ─────────────────────────
// Counts and distributions answer "what alarmed"; performance answers "can the operator keep
// up". Rate, peak load and flood are derived from the same register the rest of the page uses,
// so the two can never disagree. A flood is the one number the philosophy actually states
// (>10 alarms in 10 minutes); every other target is site-set in Settings and, until one exists,
// each metric reports itself and stays ungraded rather than inventing a pass mark.
const AS_ACK_MIN = { critical: 2.4, high: 7.5, medium: 24, low: 96, diagnostic: 140 };
function asPerf(data, targets) {
  const days = Math.max(1, data.days);
  const thr = targets.flood10 || 10;
  // per-bucket peak 10-minute load — deterministic, seeded off the bucket index
  const r = asRand(4231 + days);
  const peaks = data.perDay.map((d) => {
    const tot = d.segs.reduce((s, [, v]) => s + v, 0);
    return { day: d.day, tot, peak: Math.max(tot > 0 ? 1 : 0, Math.round(tot * (0.16 + r() * 0.16))) };
  });
  const floodBuckets = peaks.filter((p) => p.peak > thr);
  const peak10 = peaks.reduce((m, p) => Math.max(m, p.peak), 0);
  const perDay = data.total / days;
  const per10 = data.total / (days * 144);
  // acknowledge response, weighted by the priority mix actually in the range
  const ackW = data.category.reduce((s, c) => s + c.value * (AS_ACK_MIN[c.level] || 30), 0);
  const ackMean = data.total ? ackW / data.total : 0;
  const floodMin = floodBuckets.length * 10 * (data.bucketDays || 1);
  return {
    thr, peaks, peak10, perDay, per10, ackMean,
    floodBuckets: floodBuckets.length,
    floodPct: (floodMin / (days * 1440)) * 100,
  };
}

function PerfTile({ label, value, unit, note, target, grade, onSetTarget }) {
  return (
    <div className={"as-perf-tile" + (grade ? " g-" + grade : "")}>
      <span className="as-perf-l">{label}</span>
      <span className="as-perf-v data">{value}{unit ? <span className="u"> {unit}</span> : null}</span>
      <span className="as-perf-n">{note}</span>
      {target == null
        ? <button className="as-perf-t none" onClick={onSetTarget} title="Set a target for this metric in Settings · General">No target set</button>
        : <span className={"as-perf-t " + (grade || "")}>{grade === "pass" ? "Within" : "Over"} target {target}</span>}
    </div>
  );
}

function PerformanceCard({ data }) {
  const targets = useAlarmTargets();
  const p = asPerf(data, targets);
  const goTargets = () => { if (window.njOpenAlarmTargets) window.njOpenAlarmTargets(); else if (window.__njNavigate) window.__njNavigate("settings"); };
  const max = Math.max(p.thr + 2, ...p.peaks.map((x) => x.peak), 1);
  return (
    <div className="card as-perf">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="activity" size={17} color="var(--slate-600)" />
          <span className="card-title">Operator Load &amp; Performance</span>
        </div>
        <span className="caption">per ISA-18.2 / IEC 62682 §16 · flood threshold {p.thr} alarms / 10 min</span>
      </div>
      <div className="card-body">
        <div className="as-perf-row">
          <PerfTile label="Average rate" value={p.perDay.toFixed(1)} unit="alarms/day"
            note={p.per10.toFixed(2) + " per 10 min"} target={targets.perDay} onSetTarget={goTargets}
            grade={njGrade(p.perDay, targets.perDay)} />
          <PerfTile label="Peak load" value={String(p.peak10)} unit={"/ 10 min"}
            note={"busiest " + data.bucket.toLowerCase() + " · " + (data.busiest ? data.busiest.day : "—")} target={targets.peak10} onSetTarget={goTargets}
            grade={njGrade(p.peak10, targets.peak10)} />
          <PerfTile label="Flood episodes" value={String(p.floodBuckets)} unit={data.bucket.toLowerCase() + "s"}
            note={p.floodPct.toFixed(2) + " % of the range in flood"} target={null} onSetTarget={goTargets} />
          <PerfTile label="Acknowledge time" value={p.ackMean < 60 ? p.ackMean.toFixed(1) : (p.ackMean / 60).toFixed(1)} unit={p.ackMean < 60 ? "min" : "h"}
            note="mean, weighted by priority" target={targets.ackMin} onSetTarget={goTargets}
            grade={njGrade(p.ackMean, targets.ackMin)} />
        </div>
        <div className="as-flood">
          <div className="as-flood-h"><span className="eyebrow">Peak 10-minute load per {data.bucket.toLowerCase()}</span>
            <span className="as-flood-leg"><span className="as-flood-thr-sw" /> flood threshold {p.thr}</span></div>
          <div className="as-flood-plot">
            <div className="as-flood-thr" style={{ bottom: (p.thr / max) * 100 + "%" }} />
            {p.peaks.map((x, i) => (
              <div key={i} className={"as-flood-bar" + (x.peak > p.thr ? " over" : "")} style={{ height: Math.max(2, (x.peak / max) * 100) + "%" }}
                title={x.day + " · peak " + x.peak + " alarms / 10 min" + (x.peak > p.thr ? " · flood" : "")} />
            ))}
          </div>
        </div>
        <p className="as-perf-foot"><Icon name="info" size={13} color="var(--slate-400)" /> Metrics without a target are reported, not graded. <button className="linkbtn" onClick={goTargets}>Set targets</button></p>
      </div>
    </div>
  );
}

// ───────────────────────── donut ─────────────────────────
function Donut({ segments, total }) {
  const size = 188, sw = 28, r = (size - sw) / 2 - 1, cx = size / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={sw} />
        {segments.map((s, i) => {
          const len = (s.value / (total || 1)) * c;
          const el = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={statColor(s.level)}
              strokeWidth={sw} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc}
              strokeLinecap="butt" />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="donut-center">
        <span className="lbl">Total</span>
        <span className="val">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

function CategoryCard({ data, caption }) {
  return (
    <div className="card chart-card">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="chart-pie" size={17} color="var(--slate-600)" />
          <span className="card-title">Alarms by Category</span>
        </div>
        <span className="caption">{caption}</span>
      </div>
      <div className="card-body">
        <div className="donut-wrap">
          <Donut segments={data.category} total={data.total} />
          <div className="donut-legend">
            {STAT_LEGEND.map((l) => {
              const seg = data.category.find((c) => c.level === l.level);
              const v = seg ? seg.value : 0;
              const pct = ((v / (data.total || 1)) * 100).toFixed(1);
              return (
                <div className="legend-row" key={l.level}>
                  <span className="legend-dot" style={{ background: statColor(l.level) }} />
                  <span className="legend-name">{l.label}</span>
                  <span className="legend-val">{v}</span>
                  <span className="legend-pct">{pct} %</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── per-day stacked bars ─────────────────────────
function asTicks(max) {
  const step = Math.max(1, Math.ceil(max / 4 / 10) * 10 || Math.ceil(max / 4));
  const top = step * 4;
  return { top, ticks: [4, 3, 2, 1, 0].map((i) => i * step) };
}

function PerDayCard({ data }) {
  const { top, ticks } = asTicks(data.dayMax);
  const dense = data.perDay.length > 14;
  return (
    <div className="card chart-card">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="bar-chart-2" size={17} color="var(--slate-600)" />
          <span className="card-title">Alarms per {data.bucket}</span>
        </div>
        <span className="caption">activations · by priority</span>
      </div>
      <div className="card-body">
        <div className={"perday" + (dense ? " dense" : "")}>
          <div className="perday-plot">
            {ticks.map((t) => (
              <div className="gridline" key={t} style={{ bottom: (t / top) * 100 + "%" }}>
                <span className="g-lbl">{t}</span>
              </div>
            ))}
            <div className="perday-cols">
              {data.perDay.map((d, i) => {
                const tot = d.segs.reduce((s, [, v]) => s + v, 0);
                return (
                  <div className="bar-col" key={i} title={`${data.bucket === "Day" ? "" : "Week of "}${d.day} · ${tot} alarms`}>
                    {tot === 0
                      ? <div className="bar-stack empty" />
                      : (
                        <div className="bar-stack" style={{ height: (tot / top) * 100 + "%" }}>
                          {d.segs.map(([lvl, v], j) => (
                            <div className="bar-seg" key={j} data-lvl={lvl}
                              style={{ height: (v / tot) * 100 + "%", background: statColor(lvl) }}>
                              {!dense && v / tot > 0.16 ? v : ""}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="perday-x">
            {data.perDay.map((d, i) => {
              const every = dense ? Math.ceil(data.perDay.length / 11) : 1;
              const show = i % every === 0 || i === data.perDay.length - 1;
              return <span className="bar-name" key={i}>{show ? d.day : ""}</span>;
            })}
          </div>
          <div className="chart-legend">
            {STAT_LEGEND.map((l) => (
              <span className="ci" key={l.level}>
                <span className="legend-dot" style={{ background: statColor(l.level) }} /> {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── overview tables ─────────────────────────
function PriorityBar({ b, total }) {
  const present = ORDER.filter((k) => b[k]);
  return (
    <div className="prio-cell">
      <span className="prio-bar" title={present.map((k) => `${b[k]} ${k}`).join(" · ")}>
        {present.map((k) => <span key={k} style={{ width: (b[k] / total) * 100 + "%", background: statColor(k) }} />)}
      </span>
      <span className="prio-break">
        {present.map((k) => <span key={k}><b>{b[k]}</b> {k[0].toUpperCase()}</span>)}
      </span>
    </div>
  );
}

function LocationTable({ data, q }) {
  const [open, setOpen] = React.useState({});
  const ql = (q || "").trim().toLowerCase();
  const locs = data.locations.filter((l) => !ql || l.name.toLowerCase().includes(ql) || l.children.some((c) => c.name.toLowerCase().includes(ql)));
  return (
    <table className="tbl stat-tbl">
      <thead>
        <tr>
          <th style={{ width: 36 }}></th>
          <th>Location</th>
          <th>Priority</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {locs.map((loc, i) => (
          <React.Fragment key={loc.name}>
            <tr className="row-expandable" onClick={() => setOpen((o) => ({ ...o, [loc.name]: !o[loc.name] }))}>
              <td><span className={"exp-chev" + (open[loc.name] ? " open" : "")}><Icon name="chevron-right" size={15} /></span></td>
              <td className="td-strong">{loc.name}</td>
              <td><PriorityBar b={loc.b} total={loc.total} /></td>
              <td><span className="data td-strong">{loc.total}</span></td>
            </tr>
            {open[loc.name] && loc.children.map((ch) => (
              <tr className="child" key={ch.name}>
                <td></td>
                <td className="child-name">{ch.name}</td>
                <td><PriorityBar b={ch.b} total={ch.total} /></td>
                <td><span className="data">{ch.total}</span></td>
              </tr>
            ))}
          </React.Fragment>
        ))}
        {locs.length === 0 && <tr><td colSpan={4}><div className="tbl-empty">No locations match the filter.</div></td></tr>}
      </tbody>
    </table>
  );
}

function TopAlarmsTable({ data, q, limit }) {
  const ql = (q || "").trim().toLowerCase();
  let rows = data.list.filter((r) => !ql || (r.alarm + " " + r.tag + " " + r.loc).toLowerCase().includes(ql));
  if (limit) rows = rows.slice(0, limit);
  const max = rows.length ? rows[0].n : 1;
  return (
    <table className="tbl stat-tbl">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>Alarm</th>
          <th>Tag</th>
          <th>Location</th>
          <th>Priority</th>
          <th>Activations</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.tag + i}>
            <td><span className="data" style={{ color: "var(--slate-400)" }}>{i + 1}</span></td>
            <td className="td-strong">{r.alarm}</td>
            <td><span className="tag">{r.tag}</span></td>
            <td><AreaLink area={r.loc + " " + r.sub} /></td>
            <td><Badge level={r.level} /></td>
            <td>
              <span className="count-cell">
                <span className="count-bar"><span style={{ width: (r.n / max) * 100 + "%" }} /></span>
                <span className="data td-strong">{r.n}</span>
              </span>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6}><div className="tbl-empty">No alarms match the filter.</div></td></tr>}
      </tbody>
    </table>
  );
}

const AS_OV_VIEWS = ["Alarms per Location", "Top Alarms", "Alarm Register"];

function AlarmOverview({ data }) {
  const [view, setView] = React.useState(AS_OV_VIEWS[0]);
  const [q, setQ] = React.useState("");
  React.useEffect(() => { setQ(""); }, [view]);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="layers" size={17} color="var(--slate-600)" />
          <span className="card-title">Alarm Overview</span>
        </div>
        <div className="segmented">
          {AS_OV_VIEWS.map((v) => <button key={v} className={"seg" + (v === view ? " active" : "")} onClick={() => setView(v)}>{v}</button>)}
        </div>
      </div>
      {view === "Alarm Register" && (
        <div className="as-note">
          <Icon name="info" size={13} color="var(--slate-400)" />
          <span>Every configured alarm ranked by how often it activates: use it to find bad actors. Individual events are in <button className="linkbtn" onClick={() => window.__njAlarmTab("Historical")}>Historical</button>.</span>
        </div>
      )}
      <div className="filterbar">
        <div className="field" style={{ minWidth: 280 }}>
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input placeholder={view === "Alarms per Location" ? "Filter location…" : "Filter alarm, tag, location…"} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ExportMenu describe={(fmt) => "Export started: " + view.toLowerCase() + " will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
        </div>
      </div>
      {view === "Alarms per Location" && <LocationTable data={data} q={q} />}
      {view === "Top Alarms" && <TopAlarmsTable data={data} q={q} limit={10} />}
      {view === "Alarm Register" && <AsRegister data={data} q={q} />}
    </div>
  );
}

// ───────────────────────── register (legacy "Alarmstatistikk" table) ─────────────────────────
const AS_PAGE_SIZES = [25, 50, 100];
const AS_COLS = [
  { k: "alarm", label: "Alarm" },
  { k: "tag",   label: "Tag" },
  { k: "loc",   label: "Location" },
  { k: "level", label: "Priority" },
  { k: "ev",    label: "Last Event" },
  { k: "last",  label: "Last Activation" },
  { k: "n",     label: "In Range", num: true },
  { k: "total", label: "Total Activations", num: true },
];
const AS_EV_ICON = { "Returned": "corner-down-left", "Acknowledged": "check", "Returned To Service": "rotate-ccw" };

function AsSortTh({ col, sort, onSort }) {
  const on = sort.k === col.k;
  return (
    <th className={"sortable" + (col.num ? " num" : "")} onClick={() => onSort(col.k)}>
      <span className="th-in">{col.label}
        <Icon name={on ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "chevrons-up-down"} size={12}
          color={on ? "var(--primary)" : "var(--slate-400)"} />
      </span>
    </th>
  );
}

function AsRegister({ data, q }) {
  const [sort, setSort] = React.useState({ k: "n", dir: "desc" });
  const [pageSize, setPageSize] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const ql = (q || "").trim().toLowerCase();
  const all = data.rows;
  const filtered = React.useMemo(() => {
    const rows = all.filter((r) => !ql || (r.alarm + " " + r.tag + " " + r.loc + " " + r.sub + " " + r.ev).toLowerCase().includes(ql));
    return [...rows].sort((x, y) => {
      const av = x[sort.k], bv = y[sort.k];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [all, ql, sort]);
  React.useEffect(() => { setPage(1); }, [ql, pageSize, all]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const onSort = (k) => setSort((s) => (s.k === k ? { k, dir: s.dir === "asc" ? "desc" : "asc" } : { k, dir: k === "n" || k === "total" ? "desc" : "asc" }));
  return (
    <>
      <div className="as-reg-scroll">
        <table className="tbl as-reg-tbl">
          <thead>
            <tr>{AS_COLS.map((c) => <AsSortTh key={c.k} col={c} sort={sort} onSort={onSort} />)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.tag + i}>
                <td className="td-strong">{r.alarm}</td>
                <td><span className="tag">{r.tag}</span></td>
                <td><AreaLink area={r.loc + " " + r.sub} /></td>
                <td><Badge level={r.level} /></td>
                <td><span className="as-ev"><Icon name={AS_EV_ICON[r.ev] || "dot"} size={13} color="var(--slate-400)" /> {r.ev}</span></td>
                <td><span className="data" style={{ color: "var(--slate-600)" }}>{r.last}</span></td>
                <td className="num"><span className="data td-strong">{r.n.toLocaleString()}</span></td>
                <td className="num"><span className="data" style={{ color: "var(--slate-500)" }}>{r.total.toLocaleString()}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={AS_COLS.length}><div className="tbl-empty">No alarms match the filter.</div></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="tbl-foot">
        <span className="rows-select">Rows per page
          <span className="select ratn-pagesize">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {AS_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </span>
        </span>
        <span className="small">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : 0} of {filtered.length} alarms
          {filtered.length !== all.length ? ` (filtered from ${all.length})` : ""}</span>
        <AsPager page={cur} totalPages={totalPages} onGo={setPage} />
      </div>
    </>
  );
}

function AsPager({ page, totalPages, onGo }) {
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

// ───────────────────────── summary KPIs ─────────────────────────
function AsSummary({ data, prev }) {
  const crit = data.category.find((c) => c.level === "critical");
  const high = data.category.find((c) => c.level === "high");
  const critN = crit ? crit.value : 0, highN = high ? high.value : 0;
  const busiestTot = data.busiest ? data.busiest.segs.reduce((s, [, v]) => s + v, 0) : 0;
  const diff = prev == null ? null : data.total - prev;
  return (
    <div className="kpi-row" style={{ marginBottom: 16 }}>
      <KpiCard label="Total Activations" value={data.total.toLocaleString()}
        delta={diff == null ? "selected range" : `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} vs previous period`}
        deltaDir={diff == null ? "flat" : diff > 0 ? "down" : "up"} icon="bell-ring" />
      <KpiCard label="Critical" value={String(critN)} delta={((critN / (data.total || 1)) * 100).toFixed(1) + " % of total"} deltaDir="flat" icon="alert-octagon" />
      <KpiCard label="High" value={String(highN)} delta={((highN / (data.total || 1)) * 100).toFixed(1) + " % of total"} deltaDir="flat" icon="alert-triangle" />
      <KpiCard label={"Busiest " + data.bucket} value={data.busiest ? data.busiest.day : "—"} delta={busiestTot + " activations"} deltaDir="flat" icon="calendar" />
    </div>
  );
}

// ───────────────────────── screen: one page, driven by the time range ─────────────────────────
const AS_ISO = (d) => `${d.getFullYear()}-${asPad(d.getMonth() + 1)}-${asPad(d.getDate())}`;
const AS_BACK = (days) => AS_ISO(new Date(AS_END.getTime() - (days - 1) * 864e5));
const AS_PRESETS = [
  { k: "7d",  label: "Last 7 days",  days: 7 },
  { k: "30d", label: "Last 30 days", days: 30 },
];
const AS_RANGE0 = { preset: "7d", from: AS_BACK(7), to: AS_ISO(AS_END), t0: "00:00", t1: "23:59" };

function AlarmStatisticsScreen() {
  const [f, setF] = React.useState(AS_RANGE0);
  const [applied, setApplied] = React.useState(AS_RANGE0);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value, preset: "custom" }));
  const pickPreset = (p) => {
    const next = { preset: p.k, from: AS_BACK(p.days), to: AS_ISO(AS_END), t0: "00:00", t1: "23:59" };
    setF(next); setApplied(next);
  };
  const span = React.useMemo(() => {
    const d = Math.round((new Date(applied.to) - new Date(applied.from)) / 864e5) + 1;
    return Math.max(1, isFinite(d) ? d : 7);
  }, [applied]);
  const hours = React.useMemo(() => {
    const h = (s) => { const [H, M] = (s || "0:0").split(":").map(Number); return (H || 0) + (M || 0) / 60; };
    const v = h(applied.t1) - h(applied.t0);
    return Math.max(0.5, Math.min(24, v <= 0 ? 24 : v + (applied.t1 === "23:59" ? 1 / 60 : 0)));
  }, [applied]);
  const field = span <= 8 ? "week" : "month";
  const scale = (span / (field === "week" ? 7 : 28)) * (hours / 24);
  const data = React.useMemo(() => asBuild(field, span, scale), [field, span, scale]);
  const prev = React.useMemo(() => asBuild(field, span, scale * 0.86).total, [field, span, scale]);
  const dirty = JSON.stringify(f) !== JSON.stringify(applied);
  // A range that ends before it starts is not a filter, it is a typo. The inputs constrain each
  // other (and cap at today — this is a historical register, there is nothing to count ahead of
  // now), and Search stays disabled with the reason shown, rather than applying a negative span.
  const rangeBad = f.to < f.from;
  return (
    <AppShell active="alarms" title="Alarms" crumbs={["Statistics"]} statusLevel="critical" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Alarm distribution &amp; frequency for a chosen time range</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active="Statistics" /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="filterbar">
          <span className="fbar-group">
            <span className="lbl"><Icon name="calendar" size={15} color="var(--slate-500)" /> Time range</span>
            <div className="segmented">
              {AS_PRESETS.map((p) => (
                <button key={p.k} className={"seg" + (applied.preset === p.k && !dirty ? " active" : "")} onClick={() => pickPreset(p)}>{p.label}</button>
              ))}
              <button className={"seg" + (f.preset === "custom" ? " active" : "")} onClick={() => setF((s) => ({ ...s, preset: "custom" }))}>Custom</button>
            </div>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl">Custom range</span>
            <span className="fbar-pair">
              <span className="dateinput"><input type="date" aria-label="Range start date" value={f.from} max={f.to} onChange={set("from")} /></span>
              <Icon name="arrow-right" size={14} color="var(--slate-400)" />
              <span className="dateinput"><input type="date" aria-label="Range end date" value={f.to} min={f.from > AS_ISO(AS_END) ? undefined : f.from} max={AS_ISO(AS_END)} onChange={set("to")} /></span>
            </span>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="clock" size={15} color="var(--slate-500)" /> Time of day</span>
            <span className="fbar-pair">
              <span className="dateinput"><input type="time" aria-label="Time of day from" value={f.t0} onChange={set("t0")} /></span>
              <Icon name="arrow-right" size={14} color="var(--slate-400)" />
              <span className="dateinput"><input type="time" aria-label="Time of day to" value={f.t1} onChange={set("t1")} /></span>
            </span>
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" disabled={!dirty} onClick={() => setF(applied)}>Reset</button>
            <button className="btn btn-primary" disabled={!dirty || rangeBad} onClick={() => setApplied({ ...f })}><Icon name="search" size={15} /> Search</button>
            <ExportMenu describe={(fmt) => "Export started: alarm statistics will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
          </div>
        </div>
        <div className="as-range">
          <Icon name="info" size={13} color="var(--slate-400)" />
          <span>{data.total.toLocaleString()} activations · {asDate(new Date(applied.from))} → {asDate(new Date(applied.to))} · {span} days · {applied.t0}–{applied.t1}{data.bucketDays > 1 ? " · grouped by " + data.bucket.toLowerCase() : ""}</span>
          {dirty && <span className="as-dirty">{rangeBad ? "End date is before the start date" : "Filter changed: press Search to apply"}</span>}
        </div>
      </div>

      <AsSummary data={data} prev={prev} />

      <PerformanceCard data={data} />

      <div className="stat-charts">
        <CategoryCard data={data} caption={span + (span === 1 ? " day" : " days")} />
        <PerDayCard data={data} />
      </div>

      <AlarmOverview data={data} />
    </AppShell>
  );
}

// ---- Alarms sub-router: tabs switch between built alarm views ----
function AlarmTabPlaceholder({ tab }) {
  return (
    <AppShell active="alarms" title="Alarms" crumbs={[tab]} statusLevel="critical" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">This view is queued for redesign</p>
          </div>
          <div className="pagehead-right"><AlarmTabs active={tab} /></div>
        </div>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "72px 24px", textAlign: "center" }}>
        <span style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--slate-100)", color: "var(--slate-400)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell-off" size={26} />
        </span>
        <div className="body-strong">{tab} view is queued for redesign</div>
        <p className="body" style={{ maxWidth: 360, margin: 0 }}>Switch to Historical, All Alarms or Statistics from the tabs above.</p>
      </div>
    </AppShell>
  );
}

function AlarmsView() {
  const pend = window.__njAlarmPending || null;
  const [tab, setTab] = React.useState(pend ? pend.tab : "Active");
  const [filter, setFilter] = React.useState(pend ? (pend.filter || null) : null);
  React.useEffect(() => {
    window.__njAlarmPending = null;
    window.__njAlarmTab = (t, f) => { setTab(t); setFilter(f != null ? f : null); };
    return () => { window.__njAlarmTab = null; };
  }, []);
  if (tab === "Active") return <ActiveAlarmsScreen filter={filter} />;
  if (tab === "Deactivated" || tab === "Suppressed") return <DeactivatedAlarmsScreen />;
  if (tab === "Historical") return <AlarmHistoricalScreen />;
  if (tab === "All Alarms") return <AllAlarmsScreen />;
  if (tab === "Rationalization" && window.AlarmRationalizationScreen) return <window.AlarmRationalizationScreen />;
  if (tab === "Statistics") return <AlarmStatisticsScreen />;
  return <AlarmTabPlaceholder tab={tab} />;
}

Object.assign(window, { AlarmStatisticsScreen, AlarmsView, AS_REG, asBuild, asDate, AS_END, AS_ORDER: ORDER, STAT_LEGEND, asPerf });
