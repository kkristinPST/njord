// trends-mobile.jsx — mobile Analytics rebuilt on the DESKTOP trend engine (lib/trends.jsx):
// the same pen catalog, the same persisted working set (`nj_trend_pens_v1`) and the same
// Trend Groups store (`nj_trend_groups_v1`), so a group saved in the control room opens on a
// phone and vice versa. Adds the two things mobile was missing: multi-pen compare and the
// discrete-alarm Event Timeline.

const MT_RANGES = ["1h", "6h", "24h", "7d"];

function useMTrends() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => trendStore.sub(force), []);
  return trendStore;
}
function useMTrendGroups() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => trendGroupStore.sub(force), []);
  return trendGroupStore;
}

// ---------- multi-pen compare chart ----------
// Pens carry different units (%, pH, mbar), so each series is normalised to its own min/max
// over the window and the legend carries the real values. Same decision as the desktop chart's
// per-pen axis, adapted to a 360px-wide screen.
// mobile uses its own deterministic generator (`mSeries`) so the curves read like process
// data — the desktop engine's `trendSeries` falls back to a plain sine without lib/dialogs.
const MT_POINTS = { "1h": 40, "6h": 60, "24h": 72, "7d": 84 };
function mPenSeries(pen, range) { return mSeries(pen.tag + range, MT_POINTS[range] || 60, pen.base, pen.amp, null); }

function MCompareChart({ pens, range, h = 156 }) {
  const W = 320;
  const series = pens.map((p) => ({ pen: p, data: mPenSeries(p, range) }));
  const path = (d) => {
    const min = Math.min.apply(null, d), max = Math.max.apply(null, d), rng = (max - min) || 1;
    const step = W / (d.length - 1);
    return d.map((v, i) => (i ? "L" : "M") + (i * step).toFixed(1) + "," + (h - ((v - min) / rng) * (h - 14) - 7).toFixed(1)).join(" ");
  };
  return (
    <div className="mt-chart">
      <svg viewBox={"0 0 " + W + " " + h} preserveAspectRatio="none" style={{ width: "100%", height: h }}>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" y1={h * f} x2={W} y2={h * f} stroke="var(--slate-100)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {series.map(({ pen, data }) => (
          <path key={pen.id} d={path(data)} fill="none" stroke={pen.color} strokeWidth="2" strokeLinejoin="round"
            strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={pen.hidden ? 0 : 1} />
        ))}
      </svg>
      <div className="mt-chart-x"><span>−{range}</span><span>normalised per pen</span><span>now</span></div>
    </div>
  );
}

// ---------- catalog picker ----------
function MPenPickerSheet() {
  const [q, setQ] = React.useState("");
  const active = new Set(trendStore.pens.map((p) => p.tag));
  const ql = q.trim().toLowerCase();
  const rows = TREND_CATALOG.filter((c) => !active.has(c.tag) && (!ql || (c.name + " " + c.tag + " " + c.group).toLowerCase().includes(ql)));
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">Add parameter</div>
        <div className="m-searchbar"><MIcon name="search" size={18} color="var(--slate-400)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalog…" aria-label="Search parameters" /></div>
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {groups.map((g) => (
            <React.Fragment key={g}>
              <div className="m-eyebrow" style={{ margin: "12px 2px 6px" }}>{g}</div>
              <div className="m-list">
                {rows.filter((r) => r.group === g).map((c) => (
                  <button key={c.tag} className="m-lrow" onClick={() => { trendStore.add(c.tag); mCloseSheet(); mToast(c.name + " added to trends", "line-chart"); }}>
                    <span className="m-lrow-ic"><MIcon name="plus" size={17} /></span>
                    <div className="m-lrow-main"><div className="m-lrow-t" style={{ fontSize: 13.5 }}>{c.name}</div><div className="m-lrow-s"><span className="tag">{c.tag}</span> · {c.unit}</div></div>
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
          {!rows.length && <div style={{ padding: "28px 0", textAlign: "center", color: "var(--slate-500)", fontSize: 13 }}>Every matching parameter is already a pen.</div>}
        </div>
        <div className="m-actions"><button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Done</button></div>
      </div>
    </div>
  );
}

// ---------- Trend Groups ----------
function MTgEditorSheet({ group, seedPens }) {
  const [name, setName] = React.useState(group ? group.name : "");
  const [vis, setVis] = React.useState(group ? group.visibility : "private");
  const [q, setQ] = React.useState("");
  const [tags, setTags] = React.useState(() => new Set(((group ? group.pens : seedPens) || []).map((p) => p.tag)));
  const ql = q.trim().toLowerCase();
  const rows = TREND_CATALOG.filter((c) => !ql || (c.name + " " + c.tag + " " + c.group).toLowerCase().includes(ql));
  const groups = [...new Set(rows.map((r) => r.group))];
  const valid = name.trim() && tags.size > 0;
  const save = () => {
    const pens = TREND_CATALOG.filter((c) => tags.has(c.tag)).map(penDef);
    if (group) { trendGroupStore.update(group.id, { name, visibility: vis, pens }); mToast("Group updated · " + name.trim(), "check"); }
    else { trendGroupStore.create({ name, visibility: vis, pens }); mToast("Group saved · " + name.trim(), "check"); }
    mCloseSheet();
  };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">{group ? "Edit trend group" : "New trend group"}</div>
        <div className="m-note-field-l">Name</div>
        <input className="m-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning check · DPT1" autoFocus />
        <div className="m-note-field-l" style={{ marginTop: 14 }}>Visibility</div>
        <div className="m-seg">
          <button className={vis === "private" ? "on" : ""} onClick={() => setVis("private")}>Private</button>
          <button className={vis === "shared" ? "on" : ""} onClick={() => setVis("shared")}>Shared</button>
        </div>
        <div className="m-de-help" style={{ marginTop: 6 }}>{vis === "private" ? "Only you see this group." : "Everyone on the site can load it."}</div>
        <div className="m-note-field-l" style={{ marginTop: 14 }}>Parameters <span className="data" style={{ color: "var(--slate-500)" }}>{tags.size}</span></div>
        <div className="m-searchbar"><MIcon name="search" size={18} color="var(--slate-400)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalog…" aria-label="Search parameters" /></div>
        <div style={{ overflowY: "auto", flex: 1, minHeight: 120 }}>
          {groups.map((g) => (
            <React.Fragment key={g}>
              <div className="m-eyebrow" style={{ margin: "10px 2px 6px" }}>{g}</div>
              <div className="m-list">
                {rows.filter((r) => r.group === g).map((c) => {
                  const on = tags.has(c.tag);
                  return (
                    <button key={c.tag} className="m-lrow" onClick={() => setTags((p) => { const n = new Set(p); n.has(c.tag) ? n.delete(c.tag) : n.add(c.tag); return n; })}>
                      <span className={"mratn-check" + (on ? " on" : "")}>{on && <MIcon name="check" size={14} color="#fff" />}</span>
                      <div className="m-lrow-main"><div className="m-lrow-t" style={{ fontSize: 13.5 }}>{c.name}</div><div className="m-lrow-s"><span className="tag">{c.tag}</span> · {c.unit}</div></div>
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!valid} onClick={save}><MIcon name="check" size={16} /> Save group</button>
        </div>
      </div>
    </div>
  );
}

const MTG_SCOPES = ["All", "Mine", "Shared"];
function TrendGroupsScreen() {
  useNav(); const store = useMTrendGroups();
  const [scope, setScope] = React.useState("All");
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const rows = store.groups.filter((g) => (scope === "All" || (scope === "Mine" ? trendGroupIsOwner(g) : g.visibility === "shared"))
    && (!ql || g.name.toLowerCase().includes(ql)));
  const load = (g) => { trendStore.setPens(groupToPens(g)); mBack(); mToast(g.name + " loaded · " + (g.pens || []).length + " pens", "line-chart"); };
  const actions = (g) => mSheet(
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">{g.name}</div>
        <div className="tag" style={{ fontSize: 11, marginBottom: 10 }}>{(g.pens || []).length} pens · {g.visibility} · {g.owner}</div>
        <div className="m-list">
          <button className="m-lrow" onClick={() => { mCloseSheet(); load(g); }}><span className="m-lrow-ic"><MIcon name="line-chart" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Load into trends</div><div className="m-lrow-s">Replaces the current pens</div></div></button>
          {trendGroupIsOwner(g) && <button className="m-lrow" onClick={() => mSheet(<MTgEditorSheet group={g} />)}><span className="m-lrow-ic"><MIcon name="pencil" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Edit</div><div className="m-lrow-s">Name, visibility, parameters</div></div></button>}
          <button className="m-lrow" onClick={() => { trendGroupStore.duplicate(g.id); mCloseSheet(); mToast("Duplicated · private copy created", "copy"); }}><span className="m-lrow-ic"><MIcon name="copy" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Duplicate</div><div className="m-lrow-s">Creates a private copy you own</div></div></button>
          {trendGroupIsOwner(g) && <button className="m-lrow" onClick={() => { mCloseSheet(); mConfirm({ title: "Delete " + g.name + "?", body: "The group is removed for everyone it is shared with.", danger: true, confirmLabel: "Delete group", onConfirm: () => { trendGroupStore.remove(g.id); mToast("Group deleted", "trash-2"); } }); }}><span className="m-lrow-ic" style={{ color: "var(--critical-text)" }}><MIcon name="trash-2" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Delete</div><div className="m-lrow-s">Cannot be undone</div></div></button>}
        </div>
        <div className="m-actions"><button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button></div>
      </div>
    </div>
  );
  return (
    <React.Fragment>
      <MHeader back title="Trend groups" sub={store.groups.length + " saved parameter sets"}
        right={<button className="m-icbtn" aria-label="New trend group" onClick={() => mSheet(<MTgEditorSheet />)}><MIcon name="plus" size={20} /></button>} />
      <PullScroll><div className="m-pad">
        <div className="m-searchbar" style={{ marginBottom: 8 }}><MIcon name="search" size={18} color="var(--slate-400)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups…" aria-label="Search trend groups" /></div>
        <div className="m-seg" style={{ marginBottom: 12 }}>{MTG_SCOPES.map((s) => <button key={s} className={scope === s ? "on" : ""} onClick={() => setScope(s)}>{s}</button>)}</div>
        <div className="m-list">
          {rows.map((g) => (
            <button key={g.id} className="m-lrow" onClick={() => load(g)}>
              <span className="m-lrow-ic"><MIcon name={g.visibility === "shared" ? "users" : "lock"} size={17} /></span>
              <div className="m-lrow-main">
                <div className="m-lrow-t" style={{ fontSize: 13.5 }}>{g.name}</div>
                <div className="m-lrow-s"><span className="data">{(g.pens || []).length}</span> pens · {trendGroupIsOwner(g) ? "You" : g.owner} · {g.updated}</div>
                <div className="mt-pendots">{(g.pens || []).slice(0, 6).map((p, i) => <span key={i} style={{ background: TREND_PALETTE[i % TREND_PALETTE.length] }} />)}</div>
              </div>
              <span className="m-lrow-r"><span className="m-icbtn" role="button" tabIndex={0} aria-label={"Actions for " + g.name}
                onClick={(e) => { e.stopPropagation(); actions(g); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); actions(g); } }}>
                <MIcon name="more-vertical" size={18} /></span></span>
            </button>
          ))}
          {!rows.length && <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--slate-500)", fontSize: 13 }}>No groups in this filter.</div>}
        </div>
      </div></PullScroll>
    </React.Fragment>
  );
}

// ---------- Event timeline (discrete alarms — mirrors desktop genEventSeq) ----------
function mEventSeq(a) {
  const seedStr = a.id || a.tag || "x";
  let h = 0; for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) % 997;
  const rows = [
    { d: -14, s: "Signal quality degraded", k: "info" },
    { d: -6 - (h % 4), s: "Watchdog threshold approached", k: "info" },
    { d: 0, s: a.alarm, k: "focal" },
    { d: 2 + (h % 3), s: "Fault latched, output inhibited", k: "warn" },
    { d: 9 + (h % 6), s: a.state === "ack" ? "Acknowledged · E. Sørensen" : "Auto-diagnostic logged", k: "info" },
  ];
  return rows.sort((x, y) => y.d - x.d);
}
function MEventTimeline({ a }) {
  const rows = mEventSeq(a);
  return (
    <div className="mc mc-pad" style={{ marginTop: 12 }}>
      <div className="m-inline" style={{ gap: 9, marginBottom: 4 }}>
        <span className="m-lrow-ic" style={{ width: 32, height: 32 }}><MIcon name="zap" size={17} /></span>
        <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>Event timeline</div>
          <div className="m-lrow-s" style={{ whiteSpace: "normal" }}>{a.tag} · discrete signal, no process value to plot</div></div>
      </div>
      <div className="mt-evt-list">
        {rows.map((r, i) => (
          <div key={i} className={"mt-evt" + (r.k === "focal" ? " focal" : "")}>
            <span className="mt-evt-t data">{r.d === 0 ? "0 min" : (r.d > 0 ? "+" : "−") + Math.abs(r.d) + " min"}</span>
            <span className="mt-evt-dot" style={{ background: r.k === "focal" ? MSEV[a.level].dot : r.k === "warn" ? "var(--warning)" : "var(--slate-300)" }} />
            <span className="mt-evt-s">{r.s}</span>
            {r.k === "focal" && <span className="mt-evt-tag">alarm</span>}
          </div>
        ))}
      </div>
      <div className="m-de-help" style={{ marginTop: 10 }}>Offsets are relative to the alarm, which activated {mAgo(a.min)} ago.</div>
    </div>
  );
}

// ---------- Analytics (rebuilt on the shared pen store) ----------
function AnalyticsScreen() {
  useNav(); const store = useMTrends();
  const [range, setRange] = React.useState("6h");
  const pens = store.pens;
  const visible = pens.filter((p) => !p.hidden);
  return (
    <React.Fragment>
      <MHeader back title="Analytics" sub={pens.length + " pens · " + range}
        right={<React.Fragment>
          <button className="m-icbtn" aria-label="Trend groups" onClick={() => mPush("trendGroups", {})}><MIcon name="folder-open" size={19} /></button>
          <button className="m-icbtn" aria-label="Export trend data" onClick={() => mToast("Export started: CSV", "download")}><MIcon name="download" size={18} /></button>
        </React.Fragment>} />
      <PullScroll><div className="m-pad">
        <div className="m-seg" style={{ marginBottom: 12 }}>{MT_RANGES.map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}</div>
        {visible.length > 0 ? (
          <div className="mc mc-pad">
            <div className="m-inline" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <span className="m-eyebrow" style={{ margin: 0 }}>Compare · {visible.length} pens</span>
              <span className="tag" style={{ fontSize: 10.5 }}>{range}</span>
            </div>
            <MCompareChart pens={visible} range={range} />
          </div>
        ) : <MEmpty label="No visible pens: add a parameter to start" />}

        <div className="m-eyebrow">Pens <button type="button" className="lnk" onClick={() => mSheet(<MTgEditorSheet seedPens={pens} />)}>Save as group <MIcon name="bookmark" size={13} /></button></div>
        <div className="m-list">
          {pens.map((p) => {
            const d = mPenSeries(p, range); const cur = d[d.length - 1];
            return (
              <div key={p.id} className="m-lrow" style={{ cursor: "default" }}>
                <span className="mt-swatch" style={{ background: p.color, opacity: p.hidden ? .3 : 1 }} />
                <div className="m-lrow-main" {...mActivate(() => mPush("chart", { tag: p.tag, title: p.name }), "Open trend for " + p.name)} style={{ cursor: "pointer" }}>
                  <div className="m-lrow-t" style={{ fontSize: 13.5 }}>{p.name}</div>
                  <div className="m-lrow-s"><span className="tag">{p.tag}</span> · {p.group}</div>
                </div>
                <span className="data" style={{ fontSize: 12.5, fontWeight: 700, minWidth: 54, textAlign: "right" }}>{cur.toFixed(Math.abs(p.base) < 5 ? 2 : 1)} <span style={{ color: "var(--slate-400)", fontSize: 10.5 }}>{p.unit}</span></span>
                <button className="m-icbtn" aria-label={(p.hidden ? "Show " : "Hide ") + p.name} onClick={() => trendStore.toggle(p.id)}><MIcon name={p.hidden ? "eye-off" : "eye"} size={17} /></button>
                <button className="m-icbtn" aria-label={"Remove " + p.name} onClick={() => { trendStore.remove(p.id); mToast(p.name + " removed", "x"); }}><MIcon name="minus-circle" size={17} /></button>
              </div>
            );
          })}
          {!pens.length && <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--slate-500)", fontSize: 13 }}>No pens yet. Add a parameter or load a trend group.</div>}
        </div>
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={() => mPush("trendGroups", {})}><MIcon name="folder-open" size={17} /> Groups</button>
          <button className="m-btn m-btn-primary" onClick={() => mSheet(<MPenPickerSheet />)}><MIcon name="plus" size={17} /> Add parameter</button>
        </div>
      </div></PullScroll>
    </React.Fragment>
  );
}

Object.assign(window, { AnalyticsScreen, TrendGroupsScreen, MCompareChart, MPenPickerSheet, MTgEditorSheet, MEventTimeline, mEventSeq, useMTrends, useMTrendGroups });
