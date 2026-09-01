// fish-welfare.jsx — Fish Welfare (Fish Biology → Welfare tab).
// Rebuilt on what the platform ACTUALLY records: welfare registrations where each inspected
// fish is scored 0–3 per indicator. There are NO welfare bands, no derived "good/poor"
// verdict, no limits (low/high/high-high) and no O₂ linkage — everything here is a count of
// registered scores. Do not reintroduce derived welfare states without a data source.

const WF_GROUPS = [
  { group: "General", items: ["First impression"] },
  { group: "Body", items: ["Emaciation", "Vertebral deformity", "Upper jaw deformity", "Lower jaw deformity"] },
  { group: "Gills", items: ["Opercular shortening"] },
  { group: "Skin", items: ["Snout damage", "Scale loss", "Skin haemorrhages", "Lesions / wounds"] },
  { group: "Fins", items: ["Active fin damage", "Healed fin damage"] },
  { group: "Eyes", items: ["Eye haemorrhaging", "Exophthalmia", "Cataract"] },
];
const WF_INDICATORS = WF_GROUPS.flatMap((g) => g.items);
// measurements are registered as numbers, not 0–3 scores — offered in the setup checklist only
const WF_MEASURES = ["Weight", "Length"];

// the registered 0–3 score scale (this IS the data, not a derived band)
// `color` is the MARK colour (dots, bubbles, bars). `bg`/`ink` is the badge pair for anything that
// puts TEXT on the category (the scoring-guide chip) — never white on the raw fill.
const WF_CAT = [
  { k: 0, label: "0 · None",     color: "var(--success)",  bg: "var(--success-bg)",  ink: "var(--success-text)" },
  { k: 1, label: "1 · Mild",     color: "var(--warning)",  bg: "var(--warning-bg)",  ink: "var(--warning-text)" },
  { k: 2, label: "2 · Moderate", color: "var(--critical)", bg: "var(--critical-bg)", ink: "var(--critical-text)" },
  { k: 3, label: "3 · Severe",   color: "var(--fg)",       bg: "var(--slate-100)",   ink: "var(--fg)" },
];

// Every row references a batch in FACILITY_BATCHES and a tank that exists in ITS department
// (FACILITY_TANKS) — the register must not display a registration its own setup cannot produce.
// deptId is the identity: two departments are named DPT2.
const WF_REGS = [
  { id: "R-2603", batch: "21-2-21-0-26-26", loc: "DPT2 · Tank 6", deptId: "b1-d2", dept: "DPT2", tank: "Tank 6", period: "Mar 2026", created: "05/03/2026", modified: "05/03/2026", user: "E. Sørensen", done: 7,   fish: 200, state: "ongoing" },
  { id: "R-2602", batch: "21-2-21-0-26-26", loc: "DPT2 · Tank 7", deptId: "b1-d2", dept: "DPT2", tank: "Tank 7", period: "Mar 2026", created: "02/03/2026", modified: "03/03/2026", user: "S. King",     done: 180, fish: 200, state: "ongoing" },
  { id: "R-2601", batch: "21-2-11-0-26-26", loc: "DPT1 · Tank 1", deptId: "b1-d1", dept: "DPT1", tank: "Tank 1", period: "Feb 2026", created: "27/02/2026", modified: "27/02/2026", user: "M. Haugen",   done: 200, fish: 200, state: "complete" },
  { id: "R-2600", batch: "21-2-11-0-26-26", loc: "DPT1 · Tank 3", deptId: "b1-d1", dept: "DPT1", tank: "Tank 3", period: "Feb 2026", created: "24/02/2026", modified: "24/02/2026", user: "E. Sørensen", done: 150, fish: 150, state: "complete" },
  { id: "R-2599", batch: "21-2-31-0-26-25", loc: "DPT3 · Tank 11", deptId: "b2-d3", dept: "DPT3", tank: "Tank 11", period: "Jan 2026", created: "16/01/2026", modified: "16/01/2026", user: "A. Birkeland", done: 200, fish: 200, state: "complete" },
  { id: "R-2598", batch: "21-2-41-0-26-25", loc: "DPT4 · Tank 16", deptId: "b2-d4", dept: "DPT4", tank: "Tank 16", period: "Dec 2025", created: "11/12/2025", modified: "11/12/2025", user: "M. Haugen",   done: 200, fish: 200, state: "complete" },
];
// Report scope is keyed on the department ID and labelled with its building — a name-keyed scope
// cannot tell Building 1 · DPT2 from Building 3 · DPT2.
const WF_DEPTS = njTankDepts().map((x) => x.d.id);
const wfDeptLabel = (id) => { const x = njTankDepts().find((y) => y.d.id === id); return x ? x.b.name + " · " + x.d.name : id; };
const WF_MONTHS = ["Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"];

// deterministic score distribution per registration × indicator (counts sum to fish inspected)
function wfHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
function wfCounts(reg, ind) {
  const h = wfHash(reg.id + ind);
  const n = reg.state === "ongoing" ? reg.done : reg.fish;
  const sev = (h % 23) / 22;                       // how affected this indicator is
  const c3 = h % 17 === 0 ? 1 : 0;
  const c2 = Math.round(n * 0.10 * sev * sev);
  const c1 = Math.round(n * 0.26 * sev);
  const c0 = Math.max(0, n - c1 - c2 - c3);
  return [c0, c1, c2, c3];
}
function wfAffected(reg, ind) { const c = wfCounts(reg, ind); const n = c[0] + c[1] + c[2] + c[3]; return n ? (c[1] + c[2] + c[3]) / n : 0; }
// aggregate several registrations into one distribution per indicator
function wfAggregate(regs) {
  const out = {};
  WF_INDICATORS.forEach((ind) => {
    out[ind] = [0, 0, 0, 0];
    regs.forEach((r) => { const c = wfCounts(r, ind); for (let i = 0; i < 4; i++) out[ind][i] += c[i]; });
  });
  return out;
}
function wfSum(a) { return a.reduce((s, v) => s + v, 0); }

// ───────────────────────── shared chart pieces ─────────────────────────
function WfCatLegend() {
  return (
    <div className="chart-legend">
      {WF_CAT.map((c) => <span className="ci" key={c.k}><span className="legend-dot" style={{ background: c.color }} /> {c.label}</span>)}
    </div>
  );
}

// one stacked bar = the score distribution of an indicator (share of inspected fish)
function WfDistBar({ counts, height }) {
  const n = wfSum(counts) || 1;
  return (
    <span className="wf-dist" style={height ? { height } : null}>
      {counts.map((v, i) => v > 0 ? (
        <span key={i} style={{ width: (v / n) * 100 + "%", background: WF_CAT[i].color }}
          title={`${WF_CAT[i].label} · ${v} fish`} />
      ) : null)}
    </span>
  );
}

// ───────────────────────── registrations list ─────────────────────────
function WfRegistrationsCard({ onOpen, onNew, limit }) {
  const [q, setQ] = React.useState("");
  const [scope, setScope] = React.useState("All");
  const ql = q.trim().toLowerCase();
  let rows = WF_REGS.filter((r) => (scope === "All" || (scope === "Ongoing" ? r.state === "ongoing" : r.state === "complete"))
    && (!ql || (r.batch + " " + r.loc + " " + r.user + " " + r.period).toLowerCase().includes(ql)));
  if (limit) rows = rows.slice(0, limit);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="clipboard-list" size={16} color="var(--slate-600)" /><span className="card-title">Welfare Registrations</span></div>
        <div className="segmented">
          {["All", "Ongoing", "Completed"].map((s) => <button key={s} className={"seg" + (s === scope ? " active" : "")} onClick={() => setScope(s)}>{s}</button>)}
        </div>
      </div>
      <div className="filterbar">
        <div className="field" style={{ minWidth: 260 }}>
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input placeholder="Filter batch, location, user…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <ExportMenu describe={(fmt) => "Export started: welfare registrations will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
          {onNew && <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={16} /> New registration</button>}
        </div>
      </div>
      <div className="wf-scroll">
        <table className="tbl wf-reg-tbl">
          <thead>
            <tr><th>Registration</th><th>Created</th><th>Last modified</th><th>By user</th><th>Progress</th><th>State</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = Math.round((r.done / r.fish) * 100);
              return (
                <tr key={r.id}>
                  <td>
                    <span className="wf-regname"><span className="tag">{r.batch}</span><span className="td-strong">{r.loc}</span><span className="caption">{r.period}</span></span>
                  </td>
                  <td><span className="data">{r.created}</span></td>
                  <td><span className="data">{r.modified}</span></td>
                  <td><span className="small">{r.user}</span></td>
                  <td>
                    <span className="count-cell" style={{ justifyContent: "flex-start" }}>
                      <span className="count-bar"><span style={{ width: pct + "%" }} /></span>
                      <span className="data td-strong">{r.done}/{r.fish}</span>
                    </span>
                  </td>
                  <td><span className={"wf-state " + r.state}>{r.state === "ongoing" ? "In progress" : "Completed"}</span></td>
                  <td className="wf-act">
                    <button className="linkbtn" onClick={() => onOpen && onOpen(r)}>
                      {r.state === "ongoing" ? "Continue" : "Open"} <Icon name="arrow-right" size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <NjEmptyRow colSpan={7} reason={ql ? "search" : "filtered"}
              title={ql ? "No registrations match “" + q + "”" : "No registrations match the filter"}
              action={<button className="btn btn-secondary btn-sm" onClick={() => { setQ(""); setScope("All"); }}>Clear filters</button>} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────── latest result: score distribution per indicator ─────────────────────────
function WfDistributionCard({ reg }) {
  const counts = wfAggregate([reg]);
  const rows = WF_INDICATORS.map((ind) => ({ ind, c: counts[ind], aff: wfAffected(reg, ind) }))
    .sort((a, b) => b.aff - a.aff);
  const n = wfSum(counts[WF_INDICATORS[0]]);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="bar-chart-2" size={16} color="var(--slate-600)" /><span className="card-title">Score Distribution</span></div>
        <span className="caption">{reg.loc} · {reg.period} · {n} fish scored</span>
      </div>
      <div className="wf-distlist">
        {rows.map((r) => (
          <div className="wf-distrow" key={r.ind}>
            <span className="wf-distname">{r.ind}</span>
            <WfDistBar counts={r.c} />
            <span className="wf-distn data">{r.c[1] + r.c[2] + r.c[3]}<span className="u"> / {wfSum(r.c)}</span></span>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 20px 16px" }}><WfCatLegend /></div>
    </div>
  );
}

// ───────────────────────── new registration setup ─────────────────────────
const WF_BATCHES = FACILITY_BATCHES.map((b) => b.id); // shared list, lib/facility.jsx
// tanks follow the chosen department, from the shared register (lib/facility.jsx)
const wfTanks = (deptId) => njDeptTanks(deptId).map((t) => "Tank " + t.n);

function WfSetup({ onStart, onCancel }) {
  // Nothing is pre-selected: batch/department/tank identify WHICH fish were inspected, so a
  // silent default would attribute a registration to the wrong tank. The operator picks.
  const [f, setF] = React.useState({ batch: "", dept: "", tank: "", fish: 200, note: "" });
  const [sel, setSel] = React.useState(() => new Set(WF_INDICATORS));
  const [meas, setMeas] = React.useState(() => new Set(WF_MEASURES));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  // f.dept holds the department ID: two departments are named DPT2 (Building 1 · Post-Smolt and
  // Building 3 · Start-Feeding), so a name-keyed select would make one of them unreachable.
  const setDept = (e) => { const v = e.target.value; setF((o) => ({ ...o, dept: v, tank: "" })); };
  const deptName = (id) => { const x = njTankDepts().find((y) => y.d.id === id); return x ? x.d.name : ""; };
  const toggle = (store, setStore) => (v) => setStore(() => { const n = new Set(store); n.has(v) ? n.delete(v) : n.add(v); return n; });
  const tInd = toggle(sel, setSel), tMeas = toggle(meas, setMeas);
  const ok = f.batch && f.dept && f.tank && sel.size > 0 && Number(f.fish) > 0;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="clipboard-check" size={16} color="var(--slate-600)" /><span className="card-title">New Welfare Registration</span></div>
        <span className="caption">Operator E. Sørensen · Mar 2026</span>
      </div>

      <div className="wf-setup">
        <div className="form-row">
          <label htmlFor="wf-batch">Batch</label>
          <select id="wf-batch" className={"form-input dfx-mono" + (f.batch ? "" : " dfx-ph")} value={f.batch} onChange={set("batch")}>
            <option value="">Select batch…</option>
            {WF_BATCHES.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="wf-dept">Department</label>
          <select id="wf-dept" className={"form-input" + (f.dept ? "" : " dfx-ph")} value={f.dept} onChange={setDept}>
            <option value="">Select department…</option>
            {njTankDepts().map((x) => <option key={x.d.id} value={x.d.id}>{x.b.name} · {x.d.name} · {x.d.sub}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="wf-tank">Tank</label>
          <select id="wf-tank" className={"form-input" + (f.tank ? "" : " dfx-ph")} value={f.tank} onChange={set("tank")} disabled={!f.dept}>
            <option value="">{f.dept ? "Select tank…" : "Select a department first"}</option>
            {wfTanks(f.dept).map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="wf-fish">Fish to inspect</label>
          <input id="wf-fish" className="form-input data" type="number" min="1" max="1000" value={f.fish} onChange={set("fish")} />
        </div>
      </div>

      <div className="wf-sec-h">Indicators to score <span className="caption">{sel.size} of {WF_INDICATORS.length} selected</span>
        <span className="wf-sec-act">
          <button className="linkbtn" onClick={() => setSel(new Set(WF_INDICATORS))}>Select all</button>
          <button className="linkbtn" onClick={() => setSel(new Set())}>Clear</button>
        </span>
      </div>
      <div className="wf-checkgrid">
        {WF_GROUPS.map((g) => (
          <div className="wf-checkgroup" key={g.group}>
            <div className="wf-checkgroup-h">{g.group}</div>
            {g.items.map((ind) => (
              <button key={ind} className={"wf-check" + (sel.has(ind) ? " on" : "")} onClick={() => tInd(ind)} role="checkbox" aria-checked={sel.has(ind)}>
                <Check on={sel.has(ind)} /> {ind}
              </button>
            ))}
          </div>
        ))}
        <div className="wf-checkgroup">
          <div className="wf-checkgroup-h">Measurements</div>
          {WF_MEASURES.map((m) => (
            <button key={m} className={"wf-check" + (meas.has(m) ? " on" : "")} onClick={() => tMeas(m)} role="checkbox" aria-checked={meas.has(m)}>
              <Check on={meas.has(m)} /> {m}
            </button>
          ))}
        </div>
      </div>

      <div className="filterbar" style={{ borderBottom: "none" }}>
        <div className="field" style={{ flex: 1 }}>
          <Icon name="message-square" size={16} color="var(--slate-400)" />
          <input placeholder="Comment for this registration…" value={f.note} onChange={set("note")} />
        </div>
        {!ok && <span className="caption" role="status">{!f.batch || !f.dept || !f.tank ? "Select batch, department and tank to start" : sel.size === 0 ? "Select at least one indicator" : "Enter how many fish to inspect"}</span>}
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!ok}
          onClick={() => onStart({ id: "R-new", batch: f.batch, loc: deptName(f.dept) + " · " + f.tank, dept: deptName(f.dept), deptId: f.dept, tank: f.tank,
            period: "Mar 2026", user: "E. Sørensen", done: 1, fish: Number(f.fish), state: "ongoing", inds: [...sel] })}>
          <Icon name="play" size={16} /> Start registration
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── per-fish scoring ─────────────────────────
function WfScoreSelect({ value, onChange }) {
  return (
    <span className="score-sel">
      {[0, 1, 2, 3].map((n) => (
        <button key={n} className={"score-cell" + (value === n ? " sel" + n : "")} onClick={() => onChange(n)}>{n}</button>
      ))}
    </span>
  );
}
function wfSeedScores(reg, fish, inds) {
  const o = {};
  inds.forEach((ind, i) => { const h = (wfHash(reg.id + ind) + fish * 7 + i * 13) % 13; o[ind] = h === 0 ? 2 : h < 3 ? 1 : 0; });
  return o;
}
function WfScoring({ reg, onDone }) {
  const inds = reg.inds && reg.inds.length ? reg.inds : WF_INDICATORS;
  const groups = WF_GROUPS.map((g) => ({ group: g.group, items: g.items.filter((i) => inds.includes(i)) })).filter((g) => g.items.length);
  const [fish, setFish] = React.useState(Math.max(1, reg.done));
  const [scores, setScores] = React.useState(() => wfSeedScores(reg, Math.max(1, reg.done), inds));
  const go = (d) => { const n = Math.min(reg.fish, Math.max(1, fish + d)); setFish(n); setScores(wfSeedScores(reg, n, inds)); };
  return (
    <div className="card">
      <div className="bio-scorehead">
        <span className="bio-batch"><span className="tag">{reg.batch}</span> {reg.loc} · {reg.period}</span>
        <div className="fish-nav">
          <button className="nav-btn" onClick={() => go(-1)} title="Previous fish"><Icon name="chevron-left" size={16} /></button>
          <span className="lbl">Fish {fish} / {reg.fish}</span>
          <button className="nav-btn" onClick={() => go(1)} title="Next fish"><Icon name="chevron-right" size={16} /></button>
        </div>
      </div>
      {groups.map((g) => (
        <React.Fragment key={g.group}>
          <div className="bio-group-h">{g.group}</div>
          {g.items.map((ind) => (
            <div className="score-row" key={ind}>
              <span className="score-name">{ind}
                <button className="wf-guide-btn" onClick={() => openDialog(<WfScoreGuide indicator={ind} />)}
                  title={"How to score " + ind + " — reference photos"} aria-label={"Scoring guide for " + ind}><Icon name="info" size={14} /></button>
              </span>
              <WfScoreSelect value={scores[ind]} onChange={(n) => setScores((s) => ({ ...s, [ind]: n }))} />
            </div>
          ))}
        </React.Fragment>
      ))}
      <div className="filterbar" style={{ borderTop: "1px solid var(--slate-200)", borderBottom: "none" }}>
        <div className="field" style={{ flex: 1 }}>
          <Icon name="message-square" size={16} color="var(--slate-400)" />
          <input placeholder="Note for this fish…" />
        </div>
        <button className="btn btn-ghost" onClick={onDone}>Save &amp; close</button>
        <button className="btn btn-secondary" onClick={() => go(-1)}>Previous</button>
        <button className="btn btn-primary" onClick={() => go(1)}>Save &amp; next <Icon name="arrow-right" size={16} /></button>
      </div>
    </div>
  );
}

// ───────────────────────── report ─────────────────────────
const WF_PERIODS = [{ k: 3, label: "Last 3 months" }, { k: 6, label: "Last 6 months" }, { k: 12, label: "Last 12 months" }];

function WfCategoryChart({ regs }) {
  const agg = wfAggregate(regs);
  const rows = WF_INDICATORS.map((ind) => ({ ind, c: agg[ind] }));
  return (
    <div className="wf-catchart">
      {rows.map((r) => {
        const n = wfSum(r.c) || 1;
        return (
          <div className="wf-catcol" key={r.ind} title={`${r.ind} · ${n} fish`}>
            <span className="wf-catbar">
              {r.c.map((v, i) => v > 0 ? <span key={i} style={{ height: (v / n) * 100 + "%", background: WF_CAT[i].color }} /> : null).reverse()}
            </span>
            <span className="wf-catname">{r.ind}</span>
          </div>
        );
      })}
    </div>
  );
}

function WfLocationChart({ regs, indicator }) {
  const byLoc = {};
  regs.forEach((r) => { (byLoc[r.loc] = byLoc[r.loc] || []).push(r); });
  const locs = Object.keys(byLoc);
  return (
    <div className="wf-locchart">
      {locs.map((loc) => {
        const c = wfAggregate(byLoc[loc])[indicator];
        const n = wfSum(c);
        return (
          <div className="wf-locrow" key={loc}>
            <span className="wf-locname">{loc}</span>
            <WfDistBar counts={c} height={14} />
            <span className="wf-distn data">{c[1] + c[2] + c[3]}<span className="u"> / {n}</span></span>
          </div>
        );
      })}
      {locs.length === 0 && <NjEmpty size="compact" reason="filtered" title="No registrations in the selected scope" body="Widen the department or tank scope to see results." />}
    </div>
  );
}

// registration timeline: which score categories were actually registered, per indicator per month
function WfTimeline({ regs }) {
  const months = WF_MONTHS;
  return (
    <div className="wf-timeline">
      <div className="wf-tl-head">
        <span />
        {months.map((m) => <span className="wf-tl-m" key={m}>{m.replace(" 20", " ’")}</span>)}
      </div>
      {WF_INDICATORS.map((ind) => (
        <div className="wf-tl-row" key={ind}>
          <span className="wf-tl-name">{ind}</span>
          {months.map((m) => {
            const rs = regs.filter((r) => r.period === m);
            if (!rs.length) return <span className="wf-tl-cell" key={m} />;
            const c = wfAggregate(rs)[ind];
            const worst = c[3] ? 3 : c[2] ? 2 : c[1] ? 1 : 0;
            const n = wfSum(c);
            const aff = n ? (c[1] + c[2] + c[3]) / n : 0;
            return (
              <span className="wf-tl-cell" key={m} title={`${ind} · ${m} · worst registered score ${worst} · ${c[1] + c[2] + c[3]} of ${n} fish scored ≥ 1`}>
                <span className="wf-tl-dot" style={{ background: WF_CAT[worst].color, transform: `scale(${(0.55 + aff * 1.5).toFixed(2)})` }} />
              </span>
            );
          })}
        </div>
      ))}
      <div className="wf-tl-note"><Icon name="info" size={14} color="var(--slate-400)" /> Dot colour = worst score registered that month · size = share of fish scored 1 or above.</div>
    </div>
  );
}

// ───────────────────────── bubble chart (authority report format) ─────────────────────────
// Concentric circles per cell: one circle per registered score category, radius ∝ √count, drawn
// largest first so a small severe count reads as a dot inside the healthy circle. This is the
// representation the welfare authority's report format expects — do not swap it for bars.
const WF_BUB_R = 19;
function WfBubbleCell({ counts, maxN, label }) {
  const n = wfSum(counts);
  if (!n) return <span className="wf-bub-cell wf-bub-empty" title={label + " · not sampled"} />;
  const rings = counts.map((c, k) => ({ k, c })).filter((r) => r.c > 0)
    .sort((a, b) => b.c - a.c)
    .map((r) => ({ k: r.k, c: r.c, r: Math.max(2.5, WF_BUB_R * Math.sqrt(r.c / (maxN || 1))) }));
  const tip = label + " · " + n + " fish scored · " + counts.map((c, k) => k + ": " + c).join(" · ");
  return (
    <span className="wf-bub-cell" title={tip}>
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        {rings.map((r) => <circle key={r.k} cx="22" cy="22" r={r.r.toFixed(1)} fill={WF_CAT[r.k].color} />)}
      </svg>
    </span>
  );
}
function WfBubbleChart({ regs, indicator, months }) {
  const rows = [...new Set(regs.map((r) => r.loc))];
  const cell = (loc, m) => wfAggregate(regs.filter((r) => r.loc === loc && r.period === m))[indicator];
  const maxN = Math.max(1, ...rows.flatMap((loc) => months.map((m) => wfSum(cell(loc, m)))));
  return (
    <div className="wf-bub">
      <div className="wf-bub-grid" style={{ gridTemplateColumns: "minmax(140px, 200px) repeat(" + months.length + ", 1fr)" }}>
        <span />
        {months.map((m) => <span className="wf-bub-mh" key={m}>{m}</span>)}
        {rows.map((loc) => (
          <React.Fragment key={loc}>
            <span className="wf-bub-rh">{loc}</span>
            {months.map((m) => <WfBubbleCell key={m} counts={cell(loc, m)} maxN={maxN} label={indicator + " · " + loc + " · " + m} />)}
          </React.Fragment>
        ))}
      </div>
      <p className="wf-bub-note"><Icon name="info" size={14} color="var(--slate-400)" /> One circle per registered score category · area ∝ number of fish · largest sample in scope = full circle.</p>
    </div>
  );
}

// ───────────────────────── scoring guide (reference photos) ─────────────────────────
// The score thresholds are visual judgements, so the operator gets the reference images the
// welfare protocol is scored against. Photos are supplied by the facility — the slots below are
// where they drop them; captions are the protocol's own wording.
const WF_GUIDE_CAPS = {
  "Emaciation": ["Potentially emaciated", "Emaciated", "Extremely emaciated"],
  "Scale loss": ["Scale loss on a limited area", "Scale loss over a body region", "Extensive scale loss"],
  "Active fin damage": ["Fraying at the fin edge", "Fin split or partly eroded", "Fin largely lost"],
  "Eye haemorrhaging": ["Spot haemorrhage in one eye", "Clear haemorrhage", "Severe haemorrhage, both eyes"],
};
function wfGuideCaps(ind) {
  return WF_GUIDE_CAPS[ind] || ["Slight " + ind.toLowerCase(), "Clear " + ind.toLowerCase(), "Severe " + ind.toLowerCase()];
}
function WfScoreGuide({ indicator }) {
  const caps = wfGuideCaps(indicator);
  const slug = indicator.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Dialog width={460}>
      <DlgHeader icon="info" name="Scoring guide" tag={indicator} onClose={closeDialog} />
      <div className="dlg-body wf-guide">
        <p className="wf-guide-intro">Every inspected fish is scored 0–3. Score 0 is no finding; the references show where 1, 2 and 3 begin.</p>
        <div className="wf-guide-row">
          <span className="wf-guide-n" style={{ background: WF_CAT[0].bg, color: WF_CAT[0].ink }}>0</span>
          <span className="wf-guide-cap wf-guide-cap-0">No finding · nothing to register</span>
        </div>
        {caps.map((c, i) => (
          <div className="wf-guide-row" key={i}>
            <span className="wf-guide-n" style={{ background: WF_CAT[i + 1].bg, color: WF_CAT[i + 1].ink }}>{i + 1}</span>
            <div className="wf-guide-body">
              <image-slot id={"wf-guide-" + slug + "-" + (i + 1)} shape="rounded" radius="8" placeholder={"Reference photo · " + indicator + " score " + (i + 1)}></image-slot>
              <span className="wf-guide-cap">{c}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="dlg-foot"><button className="btn btn-secondary" onClick={closeDialog}>Close</button></div>
    </Dialog>
  );
}

function WfReport({ onBack }) {
  const [group, setGroup] = React.useState("Department");
  const [scope, setScope] = React.useState(() => new Set(WF_DEPTS));
  const [months, setMonths] = React.useState(12);
  const [view, setView] = React.useState("By category");
  const [indicator, setIndicator] = React.useState(WF_INDICATORS[0]);
  const opts = group === "Department" ? WF_DEPTS : [...new Set(WF_REGS.map((r) => r.loc))];
  React.useEffect(() => { setScope(new Set(opts)); }, [group]);
  const cut = WF_MONTHS.slice(Math.max(0, WF_MONTHS.length - Math.round(months / 2)));
  const regs = WF_REGS.filter((r) => (group === "Department" ? scope.has(r.deptId) : scope.has(r.loc)) && cut.includes(r.period));
  const fish = regs.reduce((s, r) => s + (r.state === "ongoing" ? r.done : r.fish), 0);
  const toggle = (v) => setScope((s) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; });
  return (
    <React.Fragment>
      <button className="bio-back" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Welfare</button>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-head-l"><Icon name="file-bar-chart" size={16} color="var(--slate-600)" /><span className="card-title">Welfare Report</span></div>
          <ExportMenu describe={(fmt) => "Export started: welfare report (" + regs.length + " registrations) will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
        </div>
        <div className="filterbar">
          <span className="fbar-group">
            <span className="lbl"><Icon name="layers" size={16} color="var(--slate-500)" /> Group by</span>
            <div className="segmented">
              {["Department", "Tank"].map((g) => <button key={g} className={"seg" + (g === group ? " active" : "")} onClick={() => setGroup(g)}>{g}</button>)}
            </div>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="calendar" size={16} color="var(--slate-500)" /> Period</span>
            <span className="select wf-sel"><select value={months} onChange={(e) => setMonths(Number(e.target.value))}>{WF_PERIODS.map((p) => <option key={p.k} value={p.k}>{p.label}</option>)}</select></span>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="sliders-horizontal" size={16} color="var(--slate-500)" /> View</span>
            <div className="segmented">
              {["By category", "By location", "Bubble chart", "Timeline"].map((v) => <button key={v} className={"seg" + (v === view ? " active" : "")} onClick={() => setView(v)}>{v}</button>)}
            </div>
          </span>
        </div>
        <div className="filterbar" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <span className="lbl">{group === "Department" ? "Departments" : "Tanks"}</span>
          <span className="chips">
            {opts.map((o) => (
              <button key={o} className={"chip chip-btn" + (scope.has(o) ? " chip-on" : " chip-off")} onClick={() => toggle(o)}>
                {group === "Department" ? wfDeptLabel(o) : o}<span className="x"><Icon name={scope.has(o) ? "x" : "plus"} size={12} /></span>
              </button>
            ))}
          </span>
          {(view === "By location" || view === "Bubble chart") && (
            <span className="fbar-group" style={{ marginLeft: "auto" }}>
              <span className="lbl">Indicator</span>
              <span className="select wf-sel"><select value={indicator} onChange={(e) => setIndicator(e.target.value)}>{WF_INDICATORS.map((i) => <option key={i}>{i}</option>)}</select></span>
            </span>
          )}
        </div>
        <div className="as-range">
          <Icon name="info" size={14} color="var(--slate-400)" />
          <span>{regs.length} registration{regs.length === 1 ? "" : "s"} · {fish.toLocaleString("nb-NO")} fish scored · {cut[0]} → {cut[cut.length - 1]}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l">
            <Icon name={view === "Timeline" ? "activity" : view === "Bubble chart" ? "circle-dot" : "bar-chart-2"} size={16} color="var(--slate-600)" />
            <span className="card-title">{view === "By location" ? indicator + " · by location" : view === "Bubble chart" ? indicator + " · by location and month" : view === "Timeline" ? "Registration timeline" : "Score distribution by indicator"}</span>
          </div>
          {view === "Bubble chart"
            ? <button className="linkbtn" onClick={() => njToast("Export started: " + indicator + " bubble chart (" + regs.length + " registrations) will download as PNG.")}><Icon name="download" size={12} /> Download chart</button>
            : <span className="caption">{regs.length ? "registered scores only" : "no data in scope"}</span>}
        </div>
        <div className="card-body">
          {!regs.length ? <NjEmpty size="compact" reason="filtered" title="No registrations in the selected scope" body="Widen the department or tank scope to see results." />
            : view === "By category" ? <WfCategoryChart regs={regs} />
            : view === "By location" ? <WfLocationChart regs={regs} indicator={indicator} />
            : view === "Bubble chart" ? <WfBubbleChart regs={regs} indicator={indicator} months={cut} />
            : <WfTimeline regs={regs} />}
          {regs.length > 0 && view !== "Timeline" && <WfCatLegend />}
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────── section ─────────────────────────
function WelfareSection() {
  const [view, setView] = React.useState("summary"); // summary | report | new | score
  const [reg, setReg] = React.useState(null);
  const ongoing = WF_REGS.filter((r) => r.state === "ongoing");
  const latest = WF_REGS.find((r) => r.state === "complete");
  if (view === "report") return <WfReport onBack={() => setView("summary")} />;
  if (view === "new") return (
    <React.Fragment>
      <button className="bio-back" onClick={() => setView("summary")}><Icon name="arrow-left" size={16} /> Back to Welfare</button>
      <WfSetup onCancel={() => setView("summary")} onStart={(r) => { setReg(r); setView("score"); }} />
    </React.Fragment>
  );
  if (view === "score" && reg) return (
    <React.Fragment>
      <button className="bio-back" onClick={() => setView("summary")}><Icon name="arrow-left" size={16} /> Back to Welfare</button>
      <WfScoring reg={reg} onDone={() => { setView("summary"); njToast("Registration saved · " + reg.loc + " · fish " + reg.done + "/" + reg.fish + "."); }} />
    </React.Fragment>
  );
  return (
    <React.Fragment>
      <div className="bio-actionbar">
        <div className="bio-actionbar-l">
          <span className="ttl">Welfare</span>
          <span className="sub">{WF_REGS.length} registrations · {ongoing.length} in progress · scores 0–3 per indicator</span>
        </div>
        <div className="bio-actions">
          <button className="btn btn-secondary" onClick={() => setView("report")}><Icon name="file-bar-chart" size={16} /> Welfare report</button>
          <button className="btn btn-primary" onClick={() => setView("new")}><Icon name="plus" size={16} /> New registration</button>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <WfRegistrationsCard onOpen={(r) => { setReg({ ...r, inds: WF_INDICATORS }); setView("score"); }} />
      </div>
      {latest && <WfDistributionCard reg={latest} />}
    </React.Fragment>
  );
}

Object.assign(window, { WF_GROUPS, WF_INDICATORS, WF_CAT, WF_REGS, WF_DEPTS, wfDeptLabel, WF_MONTHS, wfCounts, wfAggregate, wfAffected,
  WelfareSection, WfRegistrationsCard, WfDistributionCard, WfDistBar, WfCatLegend });
