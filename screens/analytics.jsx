// analytics.jsx — Analytics / Trends workspace, now an alarm-aware investigation surface.
// Parameters arrive via njSendToTrend or the "Add parameter" picker. Alarms are drawn on the
// timeline as markers (strict 1:1 to their measured value); investigating an alarm centers the
// chart on the event with a configurable ± window and the crossed threshold. Discrete alarms
// (no analog value) open an Event Timeline instead of an empty chart.

function AddParamMenu({ active, onAdd, onClose, onBrowse }) {
  const have = new Set(active.map((p) => p.id));
  const groups = {};
  TREND_CATALOG.forEach((c) => { if (!have.has(c.tag)) (groups[c.group] = groups[c.group] || []).push(c); });
  const names = Object.keys(groups);
  return (
    <React.Fragment>
      <div className="an-pop-scrim" onClick={onClose}></div>
      <div className="an-pop" role="menu">
        <div className="an-pop-head">Add parameter to view</div>
        <div className="an-pop-body">
          {names.length === 0 && <NjInline>All catalogued parameters are already plotted.</NjInline>}
          {names.map((g) => (
            <div className="an-pop-group" key={g}>
              <div className="an-pop-grouph">{g}</div>
              {groups[g].map((c) => (
                <button className="an-pop-item" key={c.tag} onClick={() => { onAdd(c.tag); onClose(); }}>
                  <span className="an-pop-name">{c.name}</span>
                  <span className="an-pop-tag tag">{c.tag}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <button className="an-pop-browse" onClick={() => { onClose(); onBrowse(); }}>
          <Icon name="folder-tree" size={14} /> Browse all signals…
          <span className="an-pop-browse-n data">{TREND_CATALOG.length}</span>
        </button>
      </div>
    </React.Fragment>
  );
}

// ── signal picker (tree + filter) ──────────────────────────────────────────────────────────
// The Add dropdown is fine for a handful of well-known parameters; a facility has thousands of
// signals, so browsing is a TREE — system → equipment → parameter — with a filter that searches
// names AND tags, and multi-select so a whole equipment can be plotted in one go.
// trendEquip / trendTree live in lib/trends.jsx — mobile browses the same derivation.
function TrendSignalPicker() {
  const store = useTrends();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(() => new Set());
  const [sel, setSel] = React.useState(() => new Set());
  const plotted = new Set(store.pens.map((p) => p.id));
  const term = q.trim().toLowerCase();
  const hit = (c) => !term || c.name.toLowerCase().includes(term) || c.tag.toLowerCase().includes(term) || c.group.toLowerCase().includes(term);
  const tree = React.useMemo(trendTree, []);
  const shown = tree.map((g) => ({
    group: g.group,
    equips: g.equips.map((e) => ({ eq: e.eq, items: e.items.filter(hit) })).filter((e) => e.items.length),
  })).filter((g) => g.equips.length);
  const nMatch = shown.reduce((a, g) => a + g.equips.reduce((b, e) => b + e.items.length, 0), 0);
  // a filter should reveal its hits, not make the operator expand ten folders to find them
  const isOpen = (k) => (term ? true : open.has(k));
  const toggleOpen = (k) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleSel = (tag) => setSel((s) => { const n = new Set(s); if (n.has(tag)) n.delete(tag); else n.add(tag); return n; });
  const selectEquip = (items) => {
    const free = items.filter((c) => !plotted.has(c.tag)).map((c) => c.tag);
    const allOn = free.every((t) => sel.has(t));
    setSel((s) => { const n = new Set(s); free.forEach((t) => { if (allOn) n.delete(t); else n.add(t); }); return n; });
  };
  const apply = () => {
    const tags = [...sel];
    tags.forEach((t) => store.add(resolveTrendPen(t)));
    closeDialog();
    if (tags.length) njToast(tags.length === 1 ? "1 signal added to the trend view." : tags.length + " signals added to the trend view.");
  };
  return (
    <Dialog width={720}>
      <DlgHeader icon="folder-tree" name="Browse signals" tag={TREND_CATALOG.length + " catalogued"} onClose={closeDialog} />
      <div className="tsp-bar">
        <div className="field" style={{ flex: 1 }}>
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input autoFocus placeholder="Filter signal name or tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="tsp-count small">{term ? nMatch + " of " + TREND_CATALOG.length + " match" : TREND_CATALOG.length + " signals"}</span>
      </div>
      <div className="tsp-tree">
        {shown.length === 0 && <NjEmpty size="compact" icon="search-x" title="No signal matches this filter" body="Try the equipment tag, or part of the parameter name." />}
        {shown.map((g) => (
          <div className="tsp-group" key={g.group}>
            <button className="tsp-node tsp-l1" onClick={() => toggleOpen(g.group)} aria-expanded={isOpen(g.group)}>
              <Icon name={isOpen(g.group) ? "chevron-down" : "chevron-right"} size={14} />
              <Icon name={isOpen(g.group) ? "folder-open" : "folder"} size={14} color="var(--slate-500)" />
              <span className="tsp-node-lbl">{g.group}</span>
              <span className="tsp-node-n data">{g.equips.reduce((a, e) => a + e.items.length, 0)}</span>
            </button>
            {isOpen(g.group) && g.equips.map((e) => {
              const k = g.group + "/" + e.eq;
              return (
                <div key={k}>
                  <div className="tsp-node tsp-l2">
                    <button className="tsp-node-btn" onClick={() => toggleOpen(k)} aria-expanded={isOpen(k)}>
                      <Icon name={isOpen(k) ? "chevron-down" : "chevron-right"} size={14} />
                      <Icon name="box" size={14} color="var(--slate-500)" />
                      <span className="tsp-node-lbl data">{e.eq}</span>
                      <span className="tsp-node-n data">{e.items.length}</span>
                    </button>
                    <button className="tsp-node-all" onClick={() => selectEquip(e.items)}
                      disabled={e.items.every((c) => plotted.has(c.tag))}>Select all</button>
                  </div>
                  {isOpen(k) && e.items.map((c) => {
                    const on = plotted.has(c.tag);
                    return (
                      <label className={"tsp-leaf" + (on ? " plotted" : "")} key={c.tag}>
                        <input type="checkbox" checked={on || sel.has(c.tag)} disabled={on} onChange={() => toggleSel(c.tag)} />
                        <span className="tsp-leaf-name">{c.name}</span>
                        <span className="tsp-leaf-tag data">{c.tag}</span>
                        <span className="tsp-leaf-unit">{c.unit}</span>
                        {on && <span className="tsp-leaf-on">plotted</span>}
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="dlg-foot tsp-foot">
        <span className="small">{sel.size ? sel.size + (sel.size === 1 ? " signal selected" : " signals selected") : "Select the signals to plot"}</span>
        <div className="tsp-foot-r">
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={!sel.size} onClick={apply}><Icon name="plus" size={16} /> {sel.size ? "Add " + sel.size + " to view" : "Add to view"}</button>
        </div>
      </div>
    </Dialog>
  );
}
function openTrendSignalPicker() { openDialog(<TrendSignalPicker />); }

/* ── Pen details ──
   The legacy "System pens" dialog in one place: name, colour, decimals, aggregate, the vertical
   scale, accumulate-flow and the estimation line. The TAGPATH lives here and only here — it is a
   backend pointer, not something an operator reads off a signal list. */
function PenDetailsDialog({ penId }) {
  useTrends();
  const store = trendStore;
  const pen = store.pens.find((p) => p.id === penId);
  if (!pen) return <Dialog width={560}><DlgHeader name="Pen" onClose={closeDialog} /><div className="dlg-body">This signal is no longer on the chart.</div></Dialog>;
  const dyn = pen.dyn !== false;
  const axisSel = store.axisSel || [];
  const sepOn = axisSel.includes(pen.id);
  const set = (patch) => store.setPen(pen.id, patch);
  const accumUnit = window.TREND_ACCUM.find((a) => a.k === (pen.accum || ""));
  return (
    <Dialog width={600}>
      <DlgHeader icon="sliders-horizontal" name={"Pen details · " + pen.name} onClose={closeDialog} />
      <div className="dlg-body pd-body">
        <div className="pd-2">
          <label className="de-field"><span className="de-field-l">Pen name</span>
            <input className="de-input" value={pen.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className="de-field"><span className="de-field-l">Colour</span>
            <span className="pd-colw">
              <span className="pd-sw" style={{ background: pen.color }} />
              <select className="nj-select" value={pen.color} onChange={(e) => set({ color: e.target.value })} aria-label="Pen colour">
                {window.TREND_COLORS.some((c) => c.k === pen.color) ? null : <option value={pen.color}>Current</option>}
                {window.TREND_COLORS.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
              </select>
            </span></label>
        </div>
        <div className="pd-2">
          <label className="de-field"><span className="de-field-l">Decimals</span>
            <input className="de-input data" type="number" min="0" max="4" value={pen.dec == null ? "" : pen.dec}
              placeholder="auto" onChange={(e) => set({ dec: e.target.value === "" ? null : Math.max(0, Math.min(4, parseInt(e.target.value, 10) || 0)) })} /></label>
          <label className="de-field"><span className="de-field-l">Aggregate</span>
            <select className="nj-select" value={pen.agg || "last"} onChange={(e) => set({ agg: e.target.value })}>
              {window.TREND_AGG.map((a) => <option key={a.k} value={a.k}>{a.label}</option>)}
            </select></label>
        </div>
        <div className="pd-sect"><span className="eyebrow">Vertical scale</span></div>
        <label className="an-pen-chk" {...njCheckable(() => store.setPenDyn(pen.id, !dyn), { on: dyn, label: "Dynamic scale" })}>
          <Check on={dyn} />
          <span>Dynamic scale<i>fit the data in view</i></span>
        </label>
        <div className="an-pen-rng">
          <label><span>Range min</span>
            <input type="number" className="an-pen-num" value={pen.rMin != null ? pen.rMin : ""} disabled={dyn}
              onChange={(e) => store.setPenRange(pen.id, parseFloat(e.target.value), pen.rMax)} /></label>
          <label><span>Range max</span>
            <input type="number" className="an-pen-num" value={pen.rMax != null ? pen.rMax : ""} disabled={dyn}
              onChange={(e) => store.setPenRange(pen.id, pen.rMin, parseFloat(e.target.value))} /></label>
        </div>
        <label className={"an-pen-chk" + (store.axisMode !== "separate" ? " disabled" : "")}
          {...(store.axisMode === "separate" ? njCheckable(() => store.toggleAxisPen(pen.id, 5, sepOn, axisSel), { on: sepOn, label: "Separate axis" }) : {})}>
          <Check on={sepOn && store.axisMode === "separate"} />
          <span>Separate axis<i>{store.axisMode === "separate" ? "own labelled gutter" : "set Y axis to Separate first"}</i></span>
        </label>
        <div className="pd-sect"><span className="eyebrow">Calculations</span></div>
        <label className="de-field"><span className="de-field-l">Accumulate flow</span>
          <select className="nj-select" value={pen.accum || ""} onChange={(e) => set({ accum: e.target.value || null })} aria-label="Accumulate flow">
            {window.TREND_ACCUM.map((a) => <option key={a.k} value={a.k}>{a.label}</option>)}
          </select>
          <span className="de-field-hint">{pen.accum
            ? "Integrating a " + accumUnit.label + " rate · the pen plots accumulated volume in m³"
            : "Pick the unit of the source rate to plot accumulated volume instead of the rate"}</span>
        </label>
        <label className="an-pen-chk" {...njCheckable(() => set({ estimate: !pen.estimate }), { on: !!pen.estimate, label: "Estimation line" })}>
          <Check on={!!pen.estimate} />
          <span>Estimation line<i>extrapolates the current trend forward, drawn dashed</i></span>
        </label>
        <div className="pd-sect"><span className="eyebrow">Source</span></div>
        <div className="pd-path">
          <span className="pd-path-l">Tag path</span>
          <code className="pd-path-v data">{pen.tag}</code>
        </div>
        <div className="pd-path">
          <span className="pd-path-l">Context</span>
          <span className="pd-path-v">{pen.group}{pen.unit ? " · " + pen.unit : ""}</span>
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-primary" onClick={closeDialog}><Icon name="check" size={16} /> Done</button>
      </div>
    </Dialog>
  );
}

function PenRow({ pen, current, stats, focused, onFocus, onToggle, onRemove }) {
  const store = trendStore;
  const dec = pen.dec != null ? pen.dec : (Math.abs(pen.base) < 5 ? 2 : Math.abs(pen.base) < 50 ? 1 : 0);
  const dyn = pen.dyn !== false;
  const num = (v) => (v == null || isNaN(v) ? "—" : v.toFixed(dec));
  return (
    <div className={"an-pen" + (focused ? " focus" : "") + (pen.hidden ? " hidden" : "")}>
      <div className="an-pen-main" onClick={onFocus} role="button" title="Focus this signal" {...njActivate(onFocus)}>
        <span className="an-pen-swatch" style={{ background: pen.hidden ? "var(--slate-300)" : pen.color }}></span>
        <div className="an-pen-meta">
          <div className="an-pen-name">{pen.name}</div>
          <div className="an-pen-tag">{pen.group}{pen.accum ? <span className="an-pen-flag">Σ m³</span> : null}{pen.estimate ? <span className="an-pen-flag">est</span> : null}</div>
        </div>
        <div className="an-pen-val">
          <span className="data" style={{ color: pen.hidden ? "var(--slate-400)" : "var(--fg)" }}>{current.toFixed(dec)}</span>
          <span className="an-pen-unit">{pen.accum ? "m³" : pen.unit}</span>
        </div>
        <div className="an-pen-actions">
          <button className="an-pen-btn" title={pen.hidden ? "Show signal" : "Hide signal"} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            <Icon name={pen.hidden ? "eye-off" : "eye"} size={16} />
          </button>
          <button className="an-pen-btn" title="Remove signal" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>
      {/* min / max / average over the window in view — the legacy pen table's three stat columns */}
      <div className="an-pen-stats">
        <span className="an-pen-stat"><i>Min</i><b className="data">{num(stats && stats.min)}</b></span>
        <span className="an-pen-stat"><i>Max</i><b className="data">{num(stats && stats.max)}</b></span>
        <span className="an-pen-stat"><i>Avg</i><b className="data">{num(stats && stats.avg)}</b></span>
        <button className="an-pen-scalebtn" onClick={() => openDialog(<PenDetailsDialog penId={pen.id} />)}
          title="Pen details: scale, decimals, aggregate, accumulate flow, estimation line">
          <Icon name="sliders-horizontal" size={13} /> {dyn ? "Auto" : num(pen.rMin) + "–" + num(pen.rMax)}
        </button>
      </div>
    </div>
  );
}

// ── one alarm on the plotted signals (the "filter by alarm" list) ──
function AnAlarmRow({ m, centered, onCenter }) {
  const sev = SEV[m.level] || SEV.low;
  return (
    <div className={"an-almrow" + (centered ? " on" : "")} onClick={() => onCenter(m.alarm)} role="button" title="Center the trend on this event" {...njActivate(() => onCenter(m.alarm))}>
      <span className="an-almrow-rail" style={{ background: m.discrete ? "var(--slate-400)" : sev.dot }} />
      <div className="an-almrow-main">
        <div className="an-almrow-top">
          {m.discrete
            ? <span className="an-almrow-badge disc"><Icon name="zap" size={12} /> DISCRETE</span>
            : <span className="an-almrow-badge" style={{ background: sev.bg, color: sev.text }}>{(sev.label || m.level).toUpperCase()}</span>}
          <span className="an-almrow-time data">{fmtDayClock(m.ts)}</span>
        </div>
        <div className="an-almrow-desc">{m.alarm.alarm}</div>
      </div>
      <Icon name="crosshair" size={14} color={centered ? "var(--primary)" : "var(--slate-400)"} />
    </div>
  );
}

// ── Event Timeline (discrete alarms — no analog value) ──
function genEventSeq(alarm) {
  const base = window.alarmTs(alarm) || window.NJ_NOW;
  const seedStr = alarm.id || alarm.tag || "x";
  let h = 0; for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) % 997;
  const pre = [
    { d: -14, s: "Signal quality degraded", k: "info" },
    { d: -6 - (h % 4), s: "Watchdog threshold approached", k: "info" },
  ];
  const post = [
    { d: 2 + (h % 3), s: "Fault latched, output inhibited", k: "warn" },
    { d: 9 + (h % 6), s: alarm.state === "ack" ? "Acknowledged · E. Sørensen" : "Auto-diagnostic logged", k: "info" },
  ];
  const rows = [];
  pre.forEach((e) => rows.push({ ts: base + e.d * 60000, s: e.s, k: e.k }));
  rows.push({ ts: base, s: alarm.alarm, k: "focal", level: alarm.level });
  post.forEach((e) => rows.push({ ts: base + e.d * 60000, s: e.s, k: e.k }));
  return rows.sort((a, b) => b.ts - a.ts);
}
function EventTimeline({ alarm, onOpen, onRelated }) {
  const rows = genEventSeq(alarm);
  const eq = window.alarmEquip(alarm.tag);
  const sibling = eq && ((window.alarmHub && window.alarmHub.rows) || []).find((r) => r.id !== alarm.id && window.alarmEquip(r.tag) === eq && window.alarmIsAnalog(r));
  return (
    <div className="an-evtl">
      <div className="an-evtl-head">
        <span className="an-evtl-icn"><Icon name="zap" size={20} /></span>
        <div>
          <div className="body-strong">Event timeline · {alarm.area}</div>
          <p className="caption" style={{ margin: "2px 0 0" }}>{alarm.tag} · discrete signal, no associated process value. Showing the sequence of events around {fmtClock(window.alarmTs(alarm))}.</p>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={() => onOpen(alarm)}><Icon name="external-link" size={14} /> Open alarm</button>
      </div>
      <div className="an-evtl-list">
        {rows.map((r, i) => (
          <div key={i} className={"an-evt" + (r.k === "focal" ? " focal" : "")}>
            <span className="an-evt-time data">{fmtClock(r.ts)}</span>
            <span className={"an-evt-dot k-" + r.k} style={r.k === "focal" ? { background: (SEV[r.level] || SEV.high).dot } : null} />
            <span className="an-evt-txt">{r.s}</span>
            {r.k === "focal" && <span className="an-evt-focal-tag">alarm</span>}
          </div>
        ))}
      </div>
      {sibling && (
        <div className="an-evtl-foot">
          <Icon name="info" size={14} color="var(--slate-400)" />
          <span>Related analog signal on this equipment: <b>{sibling.meas.name}</b></span>
          <button className="linkbtn" onClick={() => onRelated(sibling)}>Add to trend →</button>
        </div>
      )}
    </div>
  );
}

// explicit date-range + interval toolbar (mirrors the legacy Start/End/Interval/Dynamic/Apply bar)
function TrendRangeBar() {
  const store = useTrends();
  const NjDateTime = window.NjDateTime;
  const view = viewFromStore(store);
  const toInput = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); };
  const [start, setStart] = React.useState(toInput(view.xMin));
  const [end, setEnd] = React.useState(toInput(view.xMax));
  const [iv, setIv] = React.useState(store.interval);
  const [dyn, setDyn] = React.useState(store.dynamic);
  // Interval is the sampling RESOLUTION and applies to the quick presets too, so it takes effect
  // the moment it is chosen — waiting for Apply would make it look broken on a quick range.
  const pickIv = (v) => { setIv(v); store.setInterval(v); };
  // re-seed the fields from the active view when a quick preset (or focus) changes it
  React.useEffect(() => {
    if (!store.customRange) { const v = viewFromStore(store); setStart(toInput(v.xMin)); setEnd(toInput(v.xMax)); }
  }, [store.range, store.customRange, store.centerTs]);
  const apply = () => {
    const s = new Date(start).getTime(), e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e)) return;
    store.setCustomRange(s, e, iv, dyn);
    if (window.njToast) window.njToast("Trend range applied: " + INTERVALS.find((x) => x.k === iv).label + " interval" + (dyn ? ", dynamic" : "") + ".");
  };
  return (
    <div className="an-rangebar">
      <div className="an-rb-field">
        <span className="an-rb-l">Start date</span>
        <NjDateTime value={new Date(start).getTime()} onChange={(ms) => setStart(toInput(ms))} />
      </div>
      <span className="an-rb-sep"><Icon name="arrow-right" size={16} color="var(--slate-400)" /></span>
      <div className="an-rb-field">
        <span className="an-rb-l">End date</span>
        {dyn
          ? <span className="an-rb-now" title="Dynamic: the window ends at the current time and follows it"><span className="an-rb-nowdot" /> Now · live</span>
          : <NjDateTime value={new Date(end).getTime()} onChange={(ms) => setEnd(toInput(ms))} />}
      </div>
      <div className="an-rb-field">
        <span className="an-rb-l">Interval</span>
        <select className="nj-select" value={iv} onChange={(e) => pickIv(e.target.value)} title="How often a datapoint is generated inside the window">
          {INTERVALS.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
        </select>
      </div>
      <div className="an-rb-field an-rb-field-dyn">
        <span className="an-rb-l">Live</span>
        <label className="an-rb-dyn" {...njCheckable(() => setDyn(!dyn), { on: dyn, label: "Dynamic live range" })}>
          <Check on={dyn} /> Dynamic
        </label>
      </div>
      <div className="an-rb-actions">
        {store.customRange && <button className="btn btn-ghost btn-sm" onClick={() => store.setRange(store.range)} title="Back to quick range"><Icon name="rotate-ccw" size={14} /> Reset</button>}
        <button className="btn btn-primary btn-sm an-rb-apply" onClick={apply}><Icon name="check" size={14} /> Apply</button>
      </div>
      <div className="an-rb-res" aria-live="polite">
        <span className="an-rb-res-v">{view.n.toLocaleString("nb-NO")} points</span>
        <span className="an-rb-res-l">{iv === "auto" ? "fitted to the window" : "per pen, one every " + (INTERVALS.find((x) => x.k === iv) || {}).label.toLowerCase()}</span>
      </div>
    </div>
  );
}

function AnalyticsTabs({ active, onChange }) {
  const tabs = ["Trends", "Data Entry", "Commissioning", "Biofilter Maturation"];
  return (
    <div className="segmented">
      {tabs.map((t) => <button key={t} className={"seg" + (t === active ? " active" : "")} onClick={() => onChange(t)}>{t}</button>)}
    </div>
  );
}

function TrendsWorkspace({ tab, onTab }) {
  const store = useTrends();
  useAlarmHub(); // re-render as the register changes so markers stay in sync
  const [menu, setMenu] = React.useState(false);
  const pens = store.pens;
  const range = store.range;
  const view = viewFromStore(store);
  const series = React.useMemo(() => pens.map((p) => ({ pen: p, pts: seriesForView(p, view) })),
    [pens, view.mode, view.xMin, view.xMax, store.focusEvent]);
  const markers = markersForView(pens, view);
  const curOf = (id) => { const s = series.find((s) => s.pen.id === id); return s ? s.pts[s.pts.length - 1].v : 0; };
  // min / max / average over the window in view, per pen
  const statsOf = React.useMemo(() => {
    const m = {};
    series.forEach((s) => {
      if (!s.pts.length) { m[s.pen.id] = null; return; }
      let mn = Infinity, mx = -Infinity, sum = 0;
      s.pts.forEach((p) => { if (p.v < mn) mn = p.v; if (p.v > mx) mx = p.v; sum += p.v; });
      m[s.pen.id] = { min: mn, max: mx, avg: sum / s.pts.length };
    });
    return m;
  }, [series]);
  const ranges = ["1h", "6h", "24h", "7d"];
  const visCount = pens.filter((p) => !p.hidden).length;
  // a range change re-samples the historian in the real product, so it gets a skeleton
  const loadingRange = useNjLoading([range, store.customRange, store.rangeOffset]);

  const focusAlarm = store.focusAlarm && window.alarmIsAnalog(store.focusAlarm) ? store.focusAlarm : null;
  const timelineAlarm = store.eventTimeline || null;
  const focused = store.centerTs != null;

  return (
    <AppShell active="analytics" title="Analytics" crumbs={["Trends"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Trend any process parameter and see the alarms it raised on the same timeline. Investigate an alarm to center on the event.</p>
          </div>
          <div className="pagehead-right"><AnalyticsTabs active={tab} onChange={onTab} /></div>
        </div>
      </div>

      <div className="an-toolbar">
        <div className="an-nav-group">
          <button className="an-nav" onClick={() => store.prevWindow()} disabled={focused || store.customRange} title="Earlier window"><Icon name="chevron-left" size={16} /></button>
          <div className="segmented an-range">
            {ranges.map((r) => <button key={r} className={"seg" + (!focused && !store.customRange && r === range ? " active" : "")} onClick={() => store.setRange(r)}>{r}</button>)}
          </div>
          <button className="an-nav" onClick={() => store.nextWindow()} disabled={focused || store.customRange || !store.rangeOffset} title="Later window"><Icon name="chevron-right" size={16} /></button>
        </div>
        <div className="an-toolbar-r">
          <button className="btn btn-secondary" onClick={() => openTrendGroups()} title="Browse and load saved Trend Groups"><Icon name="folder" size={16} /> Groups</button>
          <button className={"btn btn-secondary" + (store.showMarkers ? " btn-active" : "")} onClick={() => store.toggleMarkers()}
            title="Marks the alarms these signals raised on the timeline and draws the focused pen's alarm limits as static lines. Limits follow the focus: with several pens on their own scales a limit line has no honest position.">
            <Icon name={store.showMarkers ? "bell-ring" : "bell-off"} size={16} /> Alarms
          </button>
          <button className="btn btn-secondary" onClick={() => openTrendExport()} title="Download the plotted data as CSV / Excel"><Icon name="download" size={16} /> Download</button>
        </div>
      </div>

      {!focused && <TrendRangeBar />}

      {focused && (
        <div className="an-focusbar">
          <span className="an-focusbar-icn"><Icon name={timelineAlarm ? "zap" : "crosshair"} size={16} /></span>
          <div className="an-focusbar-txt">
            <span className="eyebrow">Investigating</span>
            <span className="an-focusbar-name">{(focusAlarm || timelineAlarm) ? (focusAlarm || timelineAlarm).alarm : "Event"}</span>
            <span className="an-focusbar-sub">{(focusAlarm || timelineAlarm) ? (focusAlarm || timelineAlarm).tag : ""} · centered {fmtDayClock(store.centerTs)}</span>
          </div>
          {!timelineAlarm && (
            <div className="an-focus-win">
              <span className="an-focus-win-lbl">Window ±</span>
              <div className="segmented">
                {FOCUS_WINDOWS.map((m) => <button key={m} className={"seg" + (store.windowMin === m ? " active" : "")} onClick={() => store.setWindowMin(m)}>{m < 60 ? m + "m" : (m / 60) + "h"}</button>)}
              </div>
            </div>
          )}
          {(focusAlarm || timelineAlarm) && (
            <button className="btn btn-secondary btn-sm" onClick={() => njGoAlarm(focusAlarm || timelineAlarm)}><Icon name="external-link" size={14} /> Open alarm</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => store.clearFocus()}><Icon name="x" size={14} /> Clear focus</button>
        </div>
      )}

      <div className="an-layout">
        <div className="card an-chart-card">
          <div className="card-head">
            <div className="card-head-l"><Icon name="activity" size={16} color="var(--slate-600)" /><span className="card-title">{timelineAlarm ? "Event Timeline" : "Trend View"}</span></div>
            {!timelineAlarm && (
              <div className="an-chart-head-r">
                <span className="an-axis-ctl">
                  <span className="an-axis-lbl">Y axis</span>
                  <div className="segmented">
                    <button className={"seg" + (store.axisMode !== "separate" ? " active" : "")} onClick={() => store.setAxisMode("focus")} title="One scale, labelled for the focused signal">Single</button>
                    <button className={"seg" + (store.axisMode === "separate" ? " active" : "")} onClick={() => store.setAxisMode("separate")} title="A separate colour-coded scale per signal">Separate</button>
                  </div>
                </span>
                <span className="an-live">{focused ? <span><Icon name="crosshair" size={12} /> focus · ±{store.windowMin < 60 ? store.windowMin + "m" : (store.windowMin / 60) + "h"}</span> : <span><span className="live-dot"></span> live · {visCount} {visCount === 1 ? "signal" : "signals"} · last {range}</span>}</span>
              </div>
            )}
            <button className="an-cardic" onClick={() => openTrendWindow()} aria-label="Open in the floating Trend window"
              title="Open these signals in the floating Trend window, so they stay visible while you work on a process screen"><Icon name="square-arrow-out-up-right" size={16} /></button>
          </div>
          <div className="an-chart-body">
            {timelineAlarm
              ? <EventTimeline alarm={timelineAlarm} onOpen={njGoAlarm} onRelated={(s) => njInvestigateAlarm(s)} />
              : visCount > 0
                ? (loadingRange
                  ? <NjSkeleton variant="chart" height={280} note={`Sampling ${visCount} ${visCount === 1 ? "signal" : "signals"} over the last ${range}…`} />
                  : <MultiTrendChart series={series} view={view} focus={store.focus} markers={markers} showMarkers={store.showMarkers} axisMode={store.axisMode}
                      onOpenAlarm={njGoAlarm} onCenterAlarm={(a) => store.centerOn(a)} />)
                : (
                  <NjEmpty title="No signals plotted" icon="line-chart"
                    body="Add a parameter below, or load a saved Trend Group to plot a set you analyse together."
                    action={<button className="btn btn-primary" onClick={() => openTrendSignalPicker()}><Icon name="folder-tree" size={16} /> Browse signals</button>}
                    secondary={<button className="btn btn-secondary" onClick={() => openTrendGroups()}><Icon name="folder" size={16} /> Trend Groups</button>} />
                )}
          </div>
        </div>

        <div className="card an-pens-card">
          <div className="card-head">
            <div className="card-head-l"><Icon name="git-commit-horizontal" size={16} color="var(--slate-600)" /><span className="card-title">Signals</span></div>
            <div className="an-pens-head-r">
              <button className="btn btn-secondary btn-sm" disabled={!pens.length} title="Save the current parameters as a Trend Group"
                onClick={() => openTrendGroupEditor(null, pens)}><Icon name="folder-plus" size={14} /> Save group</button>
              <button className="btn btn-secondary btn-sm" onClick={() => openTrendSignalPicker()} title="Browse the full signal catalog as a tree"><Icon name="folder-tree" size={14} /> Browse</button>
              <div style={{ position: "relative" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setMenu((m) => !m)}><Icon name="plus" size={14} /> Add</button>
                {menu && <AddParamMenu active={pens} onAdd={(t) => store.add(resolveTrendPen(t))} onClose={() => setMenu(false)} onBrowse={openTrendSignalPicker} />}
              </div>
            </div>
          </div>
          <div className="an-pens-body">
            {pens.length === 0 && <NjEmpty size="compact" icon="git-commit-horizontal" title="No parameters selected" body="Use Browse to pick from the signal tree, or load a Trend Group." />}
            {pens.map((p) => (
              <PenRow key={p.id} pen={p} current={curOf(p.id)} stats={statsOf[p.id]} focused={store.focus === p.id}
                onFocus={() => store.setFocus(p.id)} onToggle={() => store.toggle(p.id)} onRemove={() => store.remove(p.id)} />
            ))}
          </div>

          {markers.length > 0 && (
            <div className="an-alms">
              <div className="an-alms-head"><span className="eyebrow">Alarms on these signals</span><span className="an-alms-n data">{markers.length}</span></div>
              <div className="an-alms-list">
                {markers.map((m) => (
                  <AnAlarmRow key={m.id} m={m} centered={store.centerTs != null && Math.abs(store.centerTs - m.ts) < 1000} onCenter={(a) => store.centerOn(a)} />
                ))}
              </div>
            </div>
          )}
          {pens.length > 0 && markers.length === 0 && <div className="an-pens-foot">Click a signal to focus its scale. Hover the chart to read every value at one instant.</div>}
        </div>
      </div>
    </AppShell>
  );
}

function AnalyticsScreen() {
  const [tab, setTab] = React.useState("Trends");
  if (tab === "Data Entry" && window.DataEntryScreen) return <window.DataEntryScreen tab={tab} onTab={setTab} />;
  if (tab === "Commissioning" && window.CommissioningScreen) return <window.CommissioningScreen tab={tab} onTab={setTab} />;
  if (tab === "Biofilter Maturation" && window.MbbrStartupScreen) return <window.MbbrStartupScreen tab={tab} onTab={setTab} />;
  return <TrendsWorkspace tab={tab} onTab={setTab} />;
}

Object.assign(window, { AnalyticsScreen, AnalyticsTabs, TrendsWorkspace });
