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
const WF_CAT = [
  { k: 0, label: "0 · None",     color: "var(--success)" },
  { k: 1, label: "1 · Mild",     color: "var(--warning)" },
  { k: 2, label: "2 · Moderate", color: "var(--critical)" },
  { k: 3, label: "3 · Severe",   color: "var(--fg)" },
];

const WF_REGS = [
  { id: "R-2603", batch: "21-2-11-0-26-26", loc: "DPT2 · Tank 9", dept: "DPT2", tank: "Tank 9", period: "Mar 2026", created: "05/03/2026", modified: "05/03/2026", user: "E. Sørensen", done: 7,   fish: 200, state: "ongoing" },
  { id: "R-2602", batch: "21-2-21-0-26-26", loc: "DPT2 · Tank 7", dept: "DPT2", tank: "Tank 7", period: "Mar 2026", created: "02/03/2026", modified: "03/03/2026", user: "S. King",     done: 180, fish: 200, state: "ongoing" },
  { id: "R-2601", batch: "21-2-11-1-26-25", loc: "DPT1 · Tank 1", dept: "DPT1", tank: "Tank 1", period: "Feb 2026", created: "27/02/2026", modified: "27/02/2026", user: "M. Haugen",   done: 200, fish: 200, state: "complete" },
  { id: "R-2600", batch: "21-2-11-0-26-26", loc: "DPT2 · Tank 3", dept: "DPT2", tank: "Tank 3", period: "Feb 2026", created: "24/02/2026", modified: "24/02/2026", user: "E. Sørensen", done: 150, fish: 150, state: "complete" },
  { id: "R-2599", batch: "21-2-31-0-26-25", loc: "DPT3 · Tank 4", dept: "DPT3", tank: "Tank 4", period: "Jan 2026", created: "16/01/2026", modified: "16/01/2026", user: "A. Birkeland", done: 200, fish: 200, state: "complete" },
  { id: "R-2598", batch: "21-2-41-0-26-25", loc: "DPT4 · Tank 2", dept: "DPT4", tank: "Tank 2", period: "Dec 2025", created: "11/12/2025", modified: "11/12/2025", user: "M. Haugen",   done: 200, fish: 200, state: "complete" },
];
const WF_DEPTS = [...new Set(WF_REGS.map((r) => r.dept))];
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
        <div className="card-head-l"><Icon name="clipboard-list" size={17} color="var(--slate-600)" /><span className="card-title">Welfare Registrations</span></div>
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
          {onNew && <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={15} /> New registration</button>}
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
                      {r.state === "ongoing" ? "Continue" : "Open"} <Icon name="arrow-right" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7}><div className="tbl-empty">No registrations match the filter.</div></td></tr>}
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
        <div className="card-head-l"><Icon name="bar-chart-2" size={17} color="var(--slate-600)" /><span className="card-title">Score Distribution</span></div>
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
const WF_BATCHES = ["21-2-11-0-26-26", "21-2-21-0-26-26", "21-2-31-0-26-25", "21-2-41-0-26-25"];
const WF_TANKS = ["Tank 1", "Tank 2", "Tank 3", "Tank 4", "Tank 7", "Tank 9", "Tank 15"];

function WfSetup({ onStart, onCancel }) {
  // Nothing is pre-selected: batch/department/tank identify WHICH fish were inspected, so a
  // silent default would attribute a registration to the wrong tank. The operator picks.
  const [f, setF] = React.useState({ batch: "", dept: "", tank: "", fish: 200, note: "" });
  const [sel, setSel] = React.useState(() => new Set(WF_INDICATORS));
  const [meas, setMeas] = React.useState(() => new Set(WF_MEASURES));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (store, setStore) => (v) => setStore(() => { const n = new Set(store); n.has(v) ? n.delete(v) : n.add(v); return n; });
  const tInd = toggle(sel, setSel), tMeas = toggle(meas, setMeas);
  const ok = f.batch && f.dept && f.tank && sel.size > 0 && Number(f.fish) > 0;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-l"><Icon name="clipboard-check" size={17} color="var(--slate-600)" /><span className="card-title">New Welfare Registration</span></div>
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
          <select id="wf-dept" className={"form-input" + (f.dept ? "" : " dfx-ph")} value={f.dept} onChange={set("dept")}>
            <option value="">Select department…</option>
            {WF_DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="wf-tank">Tank</label>
          <select id="wf-tank" className={"form-input" + (f.tank ? "" : " dfx-ph")} value={f.tank} onChange={set("tank")}>
            <option value="">Select tank…</option>
            {WF_TANKS.map((t) => <option key={t}>{t}</option>)}
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
          <Icon name="message-square" size={15} color="var(--slate-400)" />
          <input placeholder="Comment for this registration…" value={f.note} onChange={set("note")} />
        </div>
        {!ok && <span className="caption" role="status">{!f.batch || !f.dept || !f.tank ? "Select batch, department and tank to start" : sel.size === 0 ? "Select at least one indicator" : "Enter how many fish to inspect"}</span>}
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!ok}
          onClick={() => onStart({ id: "R-new", batch: f.batch, loc: f.dept + " · " + f.tank, dept: f.dept, tank: f.tank,
            period: "Mar 2026", user: "E. Sørensen", done: 1, fish: Number(f.fish), state: "ongoing", inds: [...sel] })}>
          <Icon name="play" size={15} /> Start registration
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
              <span className="score-name">{ind}</span>
              <WfScoreSelect value={scores[ind]} onChange={(n) => setScores((s) => ({ ...s, [ind]: n }))} />
            </div>
          ))}
        </React.Fragment>
      ))}
      <div className="filterbar" style={{ borderTop: "1px solid var(--slate-200)", borderBottom: "none" }}>
        <div className="field" style={{ flex: 1 }}>
          <Icon name="message-square" size={15} color="var(--slate-400)" />
          <input placeholder="Note for this fish…" />
        </div>
        <button className="btn btn-ghost" onClick={onDone}>Save &amp; close</button>
        <button className="btn btn-secondary" onClick={() => go(-1)}>Previous</button>
        <button className="btn btn-primary" onClick={() => go(1)}>Save &amp; next</button>
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
      {locs.length === 0 && <div className="tbl-empty">No registrations in the selected scope.</div>}
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
      <div className="wf-tl-note"><Icon name="info" size={13} color="var(--slate-400)" /> Dot colour = worst score registered that month · size = share of fish scored 1 or above.</div>
    </div>
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
  const regs = WF_REGS.filter((r) => (group === "Department" ? scope.has(r.dept) : scope.has(r.loc)) && cut.includes(r.period));
  const fish = regs.reduce((s, r) => s + (r.state === "ongoing" ? r.done : r.fish), 0);
  const toggle = (v) => setScope((s) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; });
  return (
    <React.Fragment>
      <button className="bio-back" onClick={onBack}><Icon name="arrow-left" size={15} /> Back to Welfare</button>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-head-l"><Icon name="file-bar-chart" size={17} color="var(--slate-600)" /><span className="card-title">Welfare Report</span></div>
          <ExportMenu describe={(fmt) => "Export started: welfare report (" + regs.length + " registrations) will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
        </div>
        <div className="filterbar">
          <span className="fbar-group">
            <span className="lbl"><Icon name="layers" size={15} color="var(--slate-500)" /> Group by</span>
            <div className="segmented">
              {["Department", "Tank"].map((g) => <button key={g} className={"seg" + (g === group ? " active" : "")} onClick={() => setGroup(g)}>{g}</button>)}
            </div>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="calendar" size={15} color="var(--slate-500)" /> Period</span>
            <span className="select wf-sel"><select value={months} onChange={(e) => setMonths(Number(e.target.value))}>{WF_PERIODS.map((p) => <option key={p.k} value={p.k}>{p.label}</option>)}</select></span>
          </span>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="sliders-horizontal" size={15} color="var(--slate-500)" /> View</span>
            <div className="segmented">
              {["By category", "By location", "Timeline"].map((v) => <button key={v} className={"seg" + (v === view ? " active" : "")} onClick={() => setView(v)}>{v}</button>)}
            </div>
          </span>
        </div>
        <div className="filterbar" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <span className="lbl">{group === "Department" ? "Departments" : "Tanks"}</span>
          <span className="chips">
            {opts.map((o) => (
              <button key={o} className={"chip chip-btn" + (scope.has(o) ? " chip-on" : " chip-off")} onClick={() => toggle(o)}>
                {o}<span className="x"><Icon name={scope.has(o) ? "x" : "plus"} size={12} /></span>
              </button>
            ))}
          </span>
          {view === "By location" && (
            <span className="fbar-group" style={{ marginLeft: "auto" }}>
              <span className="lbl">Indicator</span>
              <span className="select wf-sel"><select value={indicator} onChange={(e) => setIndicator(e.target.value)}>{WF_INDICATORS.map((i) => <option key={i}>{i}</option>)}</select></span>
            </span>
          )}
        </div>
        <div className="as-range">
          <Icon name="info" size={13} color="var(--slate-400)" />
          <span>{regs.length} registration{regs.length === 1 ? "" : "s"} · {fish.toLocaleString()} fish scored · {cut[0]} → {cut[cut.length - 1]}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l">
            <Icon name={view === "Timeline" ? "activity" : "bar-chart-2"} size={17} color="var(--slate-600)" />
            <span className="card-title">{view === "By location" ? indicator + " · by location" : view === "Timeline" ? "Registration timeline" : "Score distribution by indicator"}</span>
          </div>
          <span className="caption">{regs.length ? "registered scores only" : "no data in scope"}</span>
        </div>
        <div className="card-body">
          {!regs.length ? <div className="tbl-empty">No registrations in the selected scope.</div>
            : view === "By category" ? <WfCategoryChart regs={regs} />
            : view === "By location" ? <WfLocationChart regs={regs} indicator={indicator} />
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
      <button className="bio-back" onClick={() => setView("summary")}><Icon name="arrow-left" size={15} /> Back to Welfare</button>
      <WfSetup onCancel={() => setView("summary")} onStart={(r) => { setReg(r); setView("score"); }} />
    </React.Fragment>
  );
  if (view === "score" && reg) return (
    <React.Fragment>
      <button className="bio-back" onClick={() => setView("summary")}><Icon name="arrow-left" size={15} /> Back to Welfare</button>
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
          <button className="btn btn-secondary" onClick={() => setView("report")}><Icon name="file-bar-chart" size={15} /> Welfare report</button>
          <button className="btn btn-primary" onClick={() => setView("new")}><Icon name="plus" size={15} /> New registration</button>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <WfRegistrationsCard onOpen={(r) => { setReg({ ...r, inds: WF_INDICATORS }); setView("score"); }} />
      </div>
      {latest && <WfDistributionCard reg={latest} />}
    </React.Fragment>
  );
}

Object.assign(window, { WF_GROUPS, WF_INDICATORS, WF_CAT, WF_REGS, wfCounts, wfAggregate, wfAffected,
  WelfareSection, WfRegistrationsCard, WfDistributionCard, WfDistBar, WfCatLegend });
