// analytics.jsx — Analytics / Trends workspace, now an alarm-aware investigation surface.
// Parameters arrive via njSendToTrend or the "Add parameter" picker. Alarms are drawn on the
// timeline as markers (strict 1:1 to their measured value); investigating an alarm centers the
// chart on the event with a configurable ± window and the crossed threshold. Discrete alarms
// (no analog value) open an Event Timeline instead of an empty chart.

function AddParamMenu({ active, onAdd, onClose }) {
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
          {names.length === 0 && <div className="an-pop-empty">All catalogued parameters are already plotted.</div>}
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
      </div>
    </React.Fragment>
  );
}

function PenRow({ pen, current, focused, onFocus, onToggle, onRemove }) {
  const dec = Math.abs(pen.base) < 5 ? 2 : Math.abs(pen.base) < 50 ? 1 : 0;
  return (
    <div className={"an-pen" + (focused ? " focus" : "") + (pen.hidden ? " hidden" : "")} onClick={onFocus} role="button" title="Focus this signal" {...njActivate(onFocus)}>
      <span className="an-pen-swatch" style={{ background: pen.hidden ? "var(--slate-300)" : pen.color }}></span>
      <div className="an-pen-meta">
        <div className="an-pen-name">{pen.name}</div>
        <div className="an-pen-tag">{pen.tag}<span className="an-pen-group"> · {pen.group}</span></div>
      </div>
      <div className="an-pen-val">
        <span className="data" style={{ color: pen.hidden ? "var(--slate-400)" : "var(--fg)" }}>{current.toFixed(dec)}</span>
        <span className="an-pen-unit">{pen.unit}</span>
      </div>
      <div className="an-pen-actions">
        <button className="an-pen-btn" title={pen.hidden ? "Show signal" : "Hide signal"} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <Icon name={pen.hidden ? "eye-off" : "eye"} size={15} />
        </button>
        <button className="an-pen-btn" title="Remove signal" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Icon name="x" size={15} />
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
            ? <span className="an-almrow-badge disc"><Icon name="zap" size={10} /> DISCRETE</span>
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
        <span className="an-evtl-icn"><Icon name="zap" size={18} /></span>
        <div>
          <div className="body-strong">Event timeline · {alarm.area}</div>
          <p className="caption" style={{ margin: "2px 0 0" }}>{alarm.tag} · discrete signal, no associated process value. Showing the sequence of events around {fmtClock(window.alarmTs(alarm))}.</p>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={() => onOpen(alarm)}><Icon name="external-link" size={13} /> Open alarm</button>
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
          <Icon name="info" size={13} color="var(--slate-400)" />
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
      <span className="an-rb-sep"><Icon name="arrow-right" size={15} color="var(--slate-400)" /></span>
      <div className="an-rb-field">
        <span className="an-rb-l">End date</span>
        {dyn
          ? <span className="an-rb-now" title="Dynamic: the window ends at the current time and follows it"><span className="an-rb-nowdot" /> Now · live</span>
          : <NjDateTime value={new Date(end).getTime()} onChange={(ms) => setEnd(toInput(ms))} />}
      </div>
      <div className="an-rb-field">
        <span className="an-rb-l">Interval</span>
        <select className="nj-select" value={iv} onChange={(e) => setIv(e.target.value)}>
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
        {store.customRange && <button className="btn btn-ghost btn-sm" onClick={() => store.setRange(store.range)} title="Back to quick range"><Icon name="rotate-ccw" size={13} /> Reset</button>}
        <button className="btn btn-primary btn-sm an-rb-apply" onClick={apply}><Icon name="check" size={14} /> Apply</button>
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
  const ranges = ["1h", "6h", "24h", "7d"];
  const visCount = pens.filter((p) => !p.hidden).length;

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
          <button className="btn btn-secondary" onClick={() => openTrendGroups()} title="Browse and load saved Trend Groups"><Icon name="folder" size={15} /> Groups</button>
          <button className={"btn btn-secondary" + (store.showMarkers ? " btn-active" : "")} onClick={() => store.toggleMarkers()} title="Show/hide alarm markers on these signals">
            <Icon name={store.showMarkers ? "bell-ring" : "bell-off"} size={15} /> Alarms
          </button>
          <button className="btn btn-secondary" onClick={() => openTrendExport()} title="Export trend data to CSV / Excel"><Icon name="download" size={15} /> Export</button>
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
            <button className="btn btn-secondary btn-sm" onClick={() => njGoAlarm(focusAlarm || timelineAlarm)}><Icon name="external-link" size={13} /> Open alarm</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => store.clearFocus()}><Icon name="x" size={13} /> Clear focus</button>
        </div>
      )}

      <div className="an-layout">
        <div className="card an-chart-card">
          <div className="card-head">
            <div className="card-head-l"><Icon name="activity" size={17} color="var(--slate-600)" /><span className="card-title">{timelineAlarm ? "Event Timeline" : "Trend View"}</span></div>
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
                ? <MultiTrendChart series={series} view={view} focus={store.focus} markers={markers} showMarkers={store.showMarkers} axisMode={store.axisMode}
                    onOpenAlarm={njGoAlarm} onCenterAlarm={(a) => store.centerOn(a)} />
                : (
                  <div className="an-empty">
                    <span className="an-empty-icn"><Icon name="line-chart" size={28} /></span>
                    <div className="body-strong">No signals plotted</div>
                    <p className="body" style={{ maxWidth: 360, margin: 0 }}>Add a parameter below, or load a saved Trend Group to plot a set you analyse together.</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn btn-primary" onClick={() => setMenu(true)}><Icon name="plus" size={15} /> Add parameter</button>
                      <button className="btn btn-secondary" onClick={() => openTrendGroups()}><Icon name="folder" size={15} /> Trend Groups</button>
                    </div>
                  </div>
                )}
          </div>
        </div>

        <div className="card an-pens-card">
          <div className="card-head">
            <div className="card-head-l"><Icon name="git-commit-horizontal" size={17} color="var(--slate-600)" /><span className="card-title">Signals</span></div>
            <div className="an-pens-head-r">
              <button className="btn btn-secondary btn-sm" disabled={!pens.length} title="Save the current parameters as a Trend Group"
                onClick={() => openTrendGroupEditor(null, pens)}><Icon name="folder-plus" size={14} /> Save group</button>
              <div style={{ position: "relative" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setMenu((m) => !m)}><Icon name="plus" size={14} /> Add</button>
                {menu && <AddParamMenu active={pens} onAdd={(t) => store.add(resolveTrendPen(t))} onClose={() => setMenu(false)} />}
              </div>
            </div>
          </div>
          <div className="an-pens-body">
            {pens.length === 0 && <div className="an-pens-empty">No parameters selected.</div>}
            {pens.map((p) => (
              <PenRow key={p.id} pen={p} current={curOf(p.id)} focused={store.focus === p.id}
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
