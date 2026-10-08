// trend-window.jsx — floating, draggable/resizable Trends window.
// Opens from the RAS process screen (top-right "Trends" button) and from any
// send-to-trends affordance. It floats ABOVE everything (incl. equipment popups)
// so operators can pull a parameter out of a popup, keep the popup open, and keep
// adding more pens from the mimic. Reads the shared trendStore (persisted pens).
// Loaded after trends.jsx (uses trendStore / trendSeries / MultiTrendChart / resolveTrendPen).

const TWIN_LS = "nj_trendwin_v1";
function twinLoad() { try { const r = JSON.parse(localStorage.getItem(TWIN_LS)); if (r && typeof r === "object") return r; } catch (e) {} return {}; }

const trendWin = {
  open: false,
  min: false,
  pos: null,            // {x,y} or null → default top-right
  size: { w: 980, h: 600 },
  panel: true,          // signals side panel open
  subs: new Set(),
  init() { const s = twinLoad(); if (s.pos) this.pos = s.pos; if (s.size) this.size = s.size; if (typeof s.panel === "boolean") this.panel = s.panel; },
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); },
  persist() { try { localStorage.setItem(TWIN_LS, JSON.stringify({ pos: this.pos, size: this.size, panel: this.panel })); } catch (e) {} },
  show() { this.open = true; this.min = false; this.emit(); },
  close() { this.open = false; this.emit(); },
  toggleMin() { this.min = !this.min; this.emit(); },
};
trendWin.init();

function useTrendWin() {
  const [, f] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => trendWin.sub(f), []);
  return trendWin;
}
function openTrendWindow() { trendWin.show(); }

// clamp so the title bar always stays grabbable on screen
function twinClampPos(p, size) {
  const W = window.innerWidth || 1280, H = window.innerHeight || 800;
  const x = Math.min(Math.max(p.x, 8), W - 200);
  const y = Math.min(Math.max(p.y, 8), H - 56);
  return { x, y };
}
function twinDefaultPos(size) {
  const W = window.innerWidth || 1280;
  return { x: Math.max(20, W - (size.w + 26)), y: 92 };
}

// ── compact "add parameter" menu (self-contained; mirrors the Analytics picker) ──
// Rendered position:fixed and anchored to the Add button so it escapes the window's
// overflow:hidden and flips above/below depending on available space.
function TwinAddMenu({ anchorRef, activeIds, onAdd, onClose }) {
  const have = new Set(activeIds);
  const groups = {};
  TREND_CATALOG.forEach((c) => { if (!have.has(c.tag)) (groups[c.group] = groups[c.group] || []).push(c); });
  const names = Object.keys(groups);
  const [style, setStyle] = React.useState({ position: "fixed", visibility: "hidden" });
  React.useLayoutEffect(() => {
    const el = anchorRef && anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popW = 284;
    const vw = window.innerWidth || 1280, vh = window.innerHeight || 800;
    const spaceAbove = r.top - 16, spaceBelow = vh - r.bottom - 16;
    const up = spaceAbove >= spaceBelow;
    const maxH = Math.min(360, Math.max(160, up ? spaceAbove : spaceBelow));
    const left = Math.max(8, Math.min(r.right - popW, vw - popW - 8));
    const next = { position: "fixed", left, right: "auto", top: "auto", bottom: "auto", width: popW, maxHeight: maxH, visibility: "visible" };
    if (up) next.bottom = vh - r.top + 6; else next.top = r.bottom + 6;
    setStyle(next);
  }, []);
  return (
    <React.Fragment>
      <div className="twin-pop-scrim" onClick={onClose}></div>
      <div className="twin-pop" role="menu" style={style}>
        <div className="twin-pop-head">Add parameter</div>
        <div className="twin-pop-body">
          {names.length === 0 && <NjInline>All catalogued parameters are already plotted.</NjInline>}
          {names.map((g) => (
            <div className="twin-pop-group" key={g}>
              <div className="twin-pop-grouph">{g}</div>
              {groups[g].map((c) => (
                <button className="twin-pop-item" key={c.tag} onClick={() => { onAdd(c.tag); onClose(); }}>
                  <span className="twin-pop-name">{c.name}</span>
                  <span className="twin-pop-tag tag">{c.tag}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

function TwinPenChip({ pen, current, focused, onFocus, onToggle, onRemove }) {
  const dec = Math.abs(pen.base) < 5 ? 2 : Math.abs(pen.base) < 50 ? 1 : 0;
  return (
    <div className={"twin-chip" + (focused ? " focus" : "") + (pen.hidden ? " hidden" : "")} onClick={onFocus} title="Focus this signal on the Y-axis">
      <span className="twin-chip-sw" style={{ background: pen.hidden ? "var(--slate-300)" : pen.color }}></span>
      <span className="twin-chip-name">{pen.name}</span>
      <span className="twin-chip-val data">{current == null ? "—" : current.toFixed(dec)}<span className="twin-chip-u"> {pen.unit}</span></span>
      <button className="twin-chip-btn" title={pen.hidden ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); onToggle(); }}><Icon name={pen.hidden ? "eye-off" : "eye"} size={14} /></button>
      <button className="twin-chip-btn" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Icon name="x" size={14} /></button>
    </div>
  );
}

// The window is a self-standing trend workspace: the same store, pen rows, range bar, focus
// controls and dialogs as Analytics, sized for a floating panel. The Signals side panel folds
// away (the window keeps its size; the chart widens into the space) and a legend strip
// of chips takes its place, so show/hide is always one click away.
const TWIN_PANEL_W = 300;
function TrendWindow() {
  const win = useTrendWin();
  const store = useTrends();
  if (window.useAlarmHub) window.useAlarmHub();
  const [pos, setPos] = React.useState(() => win.pos || twinDefaultPos(win.size));
  const [size, setSize] = React.useState(() => win.size);
  const [addOpen, setAddOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [chartH, setChartH] = React.useState(240);
  const [chartW, setChartW] = React.useState(700);
  const drag = React.useRef({});
  const addBtnRef = React.useRef(null);
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    if (win.open) setPos((p) => twinClampPos(win.pos || p, size));
  }, [win.open]);
  const twinSizeRef = React.useRef(size); twinSizeRef.current = size;
  React.useEffect(() => {
    if (!win.open) return;
    const fit = () => {
      const W = window.innerWidth || 1280, H = window.innerHeight || 800;
      const s0 = twinSizeRef.current;
      const w2 = Math.max(300, Math.min(s0.w, W - 16));
      const h2 = Math.max(280, Math.min(s0.h, H - 16));
      if (w2 !== s0.w || h2 !== s0.h) { twinSizeRef.current = { w: w2, h: h2 }; setSize({ w: w2, h: h2 }); }
      setPos((p) => ({
        x: Math.min(Math.max(p.x, 8), Math.max(8, W - w2 - 8)),
        y: Math.min(Math.max(p.y, 8), Math.max(8, H - h2 - 8)),
      }));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [win.open]);
  // the chart takes whatever height the flex layout leaves it — measured, never guessed
  React.useEffect(() => {
    const el = chartRef.current; if (!el || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => { setChartH(Math.max(120, Math.floor(el.clientHeight - 8))); setChartW(Math.max(300, Math.floor(el.clientWidth - 24))); });
    ro.observe(el); return () => ro.disconnect();
  });

  const pens = store.pens;
  const view = viewFromStore(store);
  const series = win.open ? pens.map((p) => ({ pen: p, pts: seriesForView(p, view) })) : [];
  const statsOf = React.useMemo(() => {
    const m = {};
    series.forEach((s) => {
      if (!s.pts.length) { m[s.pen.id] = null; return; }
      let mn = Infinity, mx = -Infinity, sum = 0;
      s.pts.forEach((p) => { if (p.v < mn) mn = p.v; if (p.v > mx) mx = p.v; sum += p.v; });
      m[s.pen.id] = { min: mn, max: mx, avg: sum / s.pts.length, gaps: s.pts.gaps || [] };
    });
    return m;
  }, [series.map((s) => s.pen.id + (s.pts.length && s.pts[s.pts.length - 1].t) + ":" + (s.pts.length && s.pts[0].t)).join("|")]);

  if (!win.open) return null;

  const range = store.range;
  const markers = markersForView(pens, view);
  const curOf = (id) => { const s = series.find((s) => s.pen.id === id); return s ? njPenCurrent(s.pen, s.pts) : null; };
  const visCount = pens.filter((p) => !p.hidden).length;
  const ranges = ["1h", "6h", "24h", "7d"];
  const focused = store.centerTs != null;
  const customOn = store.customRange || showCustom;
  const focusAlarm = store.focusAlarm && window.alarmIsAnalog && window.alarmIsAnalog(store.focusAlarm) ? store.focusAlarm : null;
  const timelineAlarm = store.eventTimeline || null;
  const invAlarm = focusAlarm || timelineAlarm;
  const panel = win.panel;
  const narrow = size.w < 700;
  const PenRow = window.PenRow, TrendRangeBar = window.TrendRangeBar, AnAlarmRow = window.AnAlarmRow, EventTimeline = window.EventTimeline;
  const winLbl = (m) => (m < 60 ? m + "m" : (m / 60) + "h");

  const startDrag = (e) => {
    if (e.target.closest("button, .segmented, .twin-resize")) return;
    e.preventDefault();
    drag.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y, last: pos };
    const mv = (ev) => { const c = twinClampPos({ x: drag.current.px + (ev.clientX - drag.current.mx), y: drag.current.py + (ev.clientY - drag.current.my) }, size); drag.current.last = c; setPos(c); };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); trendWin.pos = drag.current.last; trendWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };
  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation();
    drag.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h, last: size };
    const mv = (ev) => {
      const w = Math.min(Math.max(drag.current.w + (ev.clientX - drag.current.mx), 420), (window.innerWidth || 1280) - pos.x - 12);
      const h = Math.min(Math.max(drag.current.h + (ev.clientY - drag.current.my), 360), (window.innerHeight || 800) - pos.y - 12);
      drag.current.last = { w, h }; setSize({ w, h });
    };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); trendWin.size = drag.current.last; trendWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };
  // folding the panel keeps the WINDOW where the operator put it; the chart takes the freed width
  const togglePanel = () => { trendWin.panel = !trendWin.panel; trendWin.persist(); trendWin.emit(); };

  const chart = timelineAlarm && EventTimeline
    ? <div className="twin-timeline"><EventTimeline alarm={timelineAlarm} onOpen={njGoAlarm} onRelated={(s) => njInvestigateAlarm(s)} /></div>
    : visCount > 0
      ? <MultiTrendChart series={series} view={view} focus={store.focus} markers={markers} showMarkers={store.showMarkers} axisMode={store.axisMode} height={chartH} width={chartW} onOpenAlarm={njGoAlarm} onZoom={(a, b) => store.zoomTo(a, b)} onZoomOut={() => store.zoomOut()} onCenterAlarm={(a) => store.centerOn(a)} />
      : <NjEmpty size="compact" className="fill" icon="line-chart" title={pens.length ? "All signals hidden" : "No signals plotted"}
          body={pens.length ? "Show a signal in the list to draw it." : "Click any value on the process diagram to trend it here. The window stays open while you add more."}
          action={!pens.length && window.openTrendSignalPicker ? <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendSignalPicker()}><Icon name="folder-tree" size={14} /> Browse signals</button> : null} />;

  return (
    <div className={"twin" + (win.min ? " min" : "") + (narrow ? " narrow" : "")} style={{ left: pos.x, top: pos.y, width: size.w, height: win.min ? "auto" : size.h }} role="dialog" aria-label="Trends">
      <header className="twin-bar" onPointerDown={startDrag}>
        <span className="twin-title">
          <Icon name="line-chart" size={16} /> Trends
          <span className="twin-count" title={visCount + " of " + pens.length + " signals drawn"}>{visCount}</span>
          {!win.min && <span className="twin-live">{focused ? "focus · ±" + winLbl(store.windowMin) + (view.zoomed ? " · zoomed" : "") : view.zoomed ? "zoomed · " + fmtClock(view.xMin) + "–" + fmtClock(view.xMax) : store.customRange ? "custom range" : "live · last " + range}</span>}
        </span>
        <div className="twin-bar-r">
          {!win.min && <button className={"twin-ic" + (panel ? " on" : "")} title={panel ? "Hide signal list" : "Show signal list"} aria-pressed={panel} onClick={togglePanel}><Icon name={panel ? "panel-right-close" : "panel-right-open"} size={16} /></button>}
          <button className="twin-ic" title="Open in the Analytics workspace" onClick={() => { trendWin.close(); if (window.__njNavigate) window.__njNavigate("analytics"); }}><Icon name="arrow-up-right" size={16} /></button>
          <button className="twin-ic" title={win.min ? "Expand" : "Minimize"} onClick={() => win.toggleMin()}><Icon name={win.min ? "chevron-up" : "minus"} size={16} /></button>
          <button className="twin-ic" title="Close" onClick={() => win.close()}><Icon name="x" size={16} /></button>
        </div>
      </header>

      {!win.min && (
        <div className="twin-body">
          <div className="twin-tools">
            <div className="twin-navgrp">
              <button className="an-nav" title="Earlier window" disabled={focused || store.customRange} onClick={() => store.prevWindow()}><Icon name="chevron-left" size={16} /></button>
              <div className="segmented twin-seg">
                {ranges.map((r) => <button key={r} className={"seg" + (!focused && !customOn && r === range ? " active" : "")} onClick={() => { setShowCustom(false); store.setRange(r); }}>{r}</button>)}
                {TrendRangeBar && <button className={"seg" + (!focused && customOn ? " active" : "")} onClick={() => setShowCustom((v) => !v)} title="Set an explicit start, end and sample interval">Custom</button>}
              </div>
              <button className="an-nav" title="Later window" disabled={focused || store.customRange || !store.rangeOffset} onClick={() => store.nextWindow()}><Icon name="chevron-right" size={16} /></button>
            </div>
            <span className="an-axis-ctl">
              <span className="an-axis-lbl">Y axis</span>
              <div className="segmented twin-seg">
                <button className={"seg" + (store.axisMode !== "separate" ? " active" : "")} onClick={() => store.setAxisMode("focus")} title="One scale, labelled for the focused signal">Single</button>
                <button className={"seg" + (store.axisMode === "separate" ? " active" : "")} onClick={() => store.setAxisMode("separate")} title="A separate colour-coded scale per signal">Separate</button>
              </div>
            </span>
            <div className="twin-tools-r">
              <button className={"btn btn-secondary btn-sm" + (store.showMarkers ? " btn-active" : "")} onClick={() => store.toggleMarkers()} title="Mark the alarms these signals raised, and draw the focused signal's limits">
                <Icon name={store.showMarkers ? "bell-ring" : "bell-off"} size={14} /> Alarms</button>
              {window.openTrendGroups && <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendGroups()} title="Browse and load saved Trend Groups"><Icon name="folder" size={14} /> Groups</button>}
              {window.openTrendExport && <button className="btn btn-secondary btn-sm btn-icon" onClick={() => window.openTrendExport()} title="Download the plotted data" aria-label="Download"><Icon name="download" size={14} /></button>}
            </div>
          </div>

          {!focused && customOn && TrendRangeBar && <div className="twin-rangebar"><TrendRangeBar /></div>}

          {focused && (
            <div className="twin-focus">
              <Icon name={timelineAlarm ? "zap" : "crosshair"} size={14} />
              <span className="twin-focus-txt">
                {invAlarm ? <b>{invAlarm.alarm}</b> : null}
                <span>{invAlarm ? invAlarm.tag + " · " : ""}centered {fmtDayClock(store.centerTs)}</span>
              </span>
              {!timelineAlarm && (
                <div className="segmented twin-seg">
                  {FOCUS_WINDOWS.map((m) => <button key={m} className={"seg" + (store.windowMin === m ? " active" : "")} onClick={() => store.setWindowMin(m)}>±{winLbl(m)}</button>)}
                </div>
              )}
              {invAlarm && <button className="btn btn-secondary btn-sm" onClick={() => njGoAlarm(invAlarm)}><Icon name="external-link" size={14} /> Open alarm</button>}
              <button className="twin-focus-x" title="Clear focus" onClick={() => store.clearFocus()}><Icon name="x" size={14} /></button>
            </div>
          )}

          <div className={"twin-main" + (panel ? " with-panel" : "")}>
            <div className="twin-plot">
              <div className="twin-chart" ref={chartRef}>{chart}</div>
              {!timelineAlarm && visCount > 0 && <TrendZoomBar series={series} view={view} focus={store.focus} />}
              {!panel && pens.length > 0 && (
                <div className="twin-chips">
                  {pens.map((p) => (
                    <TwinPenChip key={p.id} pen={p} current={curOf(p.id)} focused={store.focus === p.id}
                      onFocus={() => store.setFocus(p.id)} onToggle={() => store.toggle(p.id)} onRemove={() => store.remove(p.id)} />
                  ))}
                </div>
              )}
            </div>

            {panel && (
              <aside className="twin-side" aria-label="Signals">
                <div className="twin-side-head">
                  <span className="twin-side-title">Signals {pens.length > 0 && <span className="an-pens-n data">{pens.length}</span>}<TrendGroupLabel /></span>
                  <div className="twin-side-head-r">
                    {window.openTrendGroupEditor && <button className="an-pen-btn" disabled={!pens.length} title="Save these signals as a Trend Group" onClick={() => window.openTrendGroupEditor(null, pens)}><Icon name="folder-plus" size={16} /></button>}
                    <button className="an-pen-btn" disabled={!store.hist.length} title={store.hist.length ? "Undo last change to the signal set" : "Nothing to undo"} aria-label="Undo"
                      onClick={() => { const l = store.undo(); if (l && window.njToast) njToast("Undone: " + l + "."); }}><Icon name="undo-2" size={16} /></button>
                    <button className="an-pen-btn" disabled={!pens.length} title="Clear all signals (undo restores them)" aria-label="Clear all signals" onClick={() => store.clear()}><Icon name="eraser" size={16} /></button>
                  </div>
                </div>
                <div className="twin-side-body">
                  {pens.length === 0 && <div className="twin-side-empty">No signals yet. Add one below, or load a Trend Group.</div>}
                  {PenRow && pens.map((p) => (
                    <PenRow key={p.id} pen={p} current={curOf(p.id)} stats={statsOf[p.id]} focused={store.focus === p.id}
                      onFocus={() => store.setFocus(p.id)} onToggle={() => store.toggle(p.id)} onRemove={() => store.remove(p.id)} />
                  ))}
                  {markers.length > 0 && AnAlarmRow && (
                    <div className="an-alms">
                      <div className="an-alms-head"><span className="eyebrow">Alarms on these signals</span><span className="an-alms-n data">{markers.length}</span></div>
                      <div className="an-alms-list">
                        {markers.map((m) => <AnAlarmRow key={m.id} m={m} centered={focused && Math.abs(store.centerTs - m.ts) < 1000} onCenter={(a) => store.centerOn(a)} />)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="twin-side-add">
                  <button ref={addBtnRef} className={"btn btn-secondary btn-sm" + (addOpen ? " btn-active" : "")} onClick={() => setAddOpen((m) => !m)}><Icon name="plus" size={14} /> Add signal</button>
                  {window.openTrendSignalPicker && <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendSignalPicker()} title="Browse the full signal catalog as a tree"><Icon name="folder-tree" size={14} /> Browse all…</button>}
                  {addOpen && <TwinAddMenu anchorRef={addBtnRef} activeIds={pens.map((p) => p.id)} onAdd={(t) => store.add(resolveTrendPen(t))} onClose={() => setAddOpen(false)} />}
                </div>
              </aside>
            )}
          </div>
          <div className="twin-resize" onPointerDown={startResize} title="Resize"><Icon name="move-diagonal-2" size={14} /></div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { trendWin, useTrendWin, openTrendWindow, TrendWindow });
