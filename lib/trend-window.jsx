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
  size: { w: 740, h: 470 },
  subs: new Set(),
  init() { const s = twinLoad(); if (s.pos) this.pos = s.pos; if (s.size) this.size = s.size; },
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); },
  persist() { try { localStorage.setItem(TWIN_LS, JSON.stringify({ pos: this.pos, size: this.size })); } catch (e) {} },
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
      <span className="twin-chip-val data">{current.toFixed(dec)}<span className="twin-chip-u"> {pen.unit}</span></span>
      <button className="twin-chip-btn" title={pen.hidden ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); onToggle(); }}><Icon name={pen.hidden ? "eye-off" : "eye"} size={14} /></button>
      <button className="twin-chip-btn" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Icon name="x" size={14} /></button>
    </div>
  );
}

function TrendWindow() {
  const win = useTrendWin();
  const store = useTrends();
  const [pos, setPos] = React.useState(() => win.pos || twinDefaultPos(win.size));
  const [size, setSize] = React.useState(() => win.size);
  const [addOpen, setAddOpen] = React.useState(false);
  const drag = React.useRef({});
  const addBtnRef = React.useRef(null);

  // re-clamp whenever the window is (re)opened
  React.useEffect(() => {
    if (win.open) setPos((p) => twinClampPos(win.pos || p, size));
  }, [win.open]);
  // keep the window fully inside the viewport when it (or the browser) is resized
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

  if (!win.open) return null;

  const pens = store.pens;
  const range = store.range;
  const view = viewFromStore(store);
  const series = pens.map((p) => ({ pen: p, pts: seriesForView(p, view) }));
  const markers = markersForView(pens, view);
  const curOf = (id) => { const s = series.find((s) => s.pen.id === id); return s ? s.pts[s.pts.length - 1].v : 0; };
  const visCount = pens.filter((p) => !p.hidden).length;
  const ranges = ["1h", "6h", "24h", "7d"];
  const focused = store.centerTs != null;

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
      const h = Math.min(Math.max(drag.current.h + (ev.clientY - drag.current.my), 320), (window.innerHeight || 800) - pos.y - 12);
      drag.current.last = { w, h }; setSize({ w, h });
    };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); trendWin.size = drag.current.last; trendWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };

  const chartH = Math.max(140, size.h - 240);

  return (
    <div className={"twin" + (win.min ? " min" : "")} style={{ left: pos.x, top: pos.y, width: size.w, height: win.min ? "auto" : size.h }} role="dialog" aria-label="Trends">
      <header className="twin-bar" onPointerDown={startDrag}>
        <span className="twin-title">
          <Icon name="line-chart" size={16} /> Trends
          <span className="twin-count">{visCount}</span>
        </span>
        <div className="twin-bar-r">
          {!win.min && (
            <div className="twin-navgrp">
              <button className="twin-ic twin-nav" title="Earlier window" disabled={focused} onClick={() => store.prevWindow()}><Icon name="chevron-left" size={16} /></button>
              <div className="segmented twin-range">
                {ranges.map((r) => <button key={r} className={"seg" + (!focused && r === range ? " active" : "")} onClick={() => store.setRange(r)}>{r}</button>)}
              </div>
              <button className="twin-ic twin-nav" title="Later window" disabled={focused || !store.rangeOffset} onClick={() => store.nextWindow()}><Icon name="chevron-right" size={16} /></button>
            </div>
          )}
          {!win.min && <button className={"twin-ic" + (store.axisMode === "separate" ? " on" : "")} title={store.axisMode === "separate" ? "Separate Y axis per signal" : "Single Y axis (focused signal)"} onClick={() => store.setAxisMode(store.axisMode === "separate" ? "focus" : "separate")}><Icon name="align-left" size={16} /></button>}
          {!win.min && <button className={"twin-ic" + (store.showMarkers ? " on" : "")} title="Show/hide alarm markers" onClick={() => store.toggleMarkers()}><Icon name={store.showMarkers ? "bell-ring" : "bell-off"} size={16} /></button>}
          <button className="twin-ic" title="Open full Analytics workspace" onClick={() => { trendWin.close(); if (window.__njNavigate) window.__njNavigate("analytics"); }}><Icon name="maximize-2" size={16} /></button>
          <button className="twin-ic" title={win.min ? "Expand" : "Minimize"} onClick={() => win.toggleMin()}><Icon name={win.min ? "chevron-up" : "minus"} size={16} /></button>
          <button className="twin-ic" title="Close" onClick={() => win.close()}><Icon name="x" size={16} /></button>
        </div>
      </header>

      {!win.min && (
        <div className="twin-body">
          {focused && (
            <div className="twin-focus">
              <Icon name="crosshair" size={14} />
              <span className="twin-focus-txt">Centered {fmtClock(store.centerTs)} · ±{store.windowMin < 60 ? store.windowMin + "m" : (store.windowMin / 60) + "h"}</span>
              <button className="twin-focus-x" title="Clear focus" onClick={() => store.clearFocus()}><Icon name="x" size={14} /></button>
            </div>
          )}
          <div className="twin-chart" style={{ height: focused ? chartH - 30 : chartH }}>
            {visCount > 0
              ? <MultiTrendChart series={series} view={view} focus={store.focus} markers={markers} showMarkers={store.showMarkers} axisMode={store.axisMode} height={focused ? chartH - 30 : chartH} onOpenAlarm={njGoAlarm} onCenterAlarm={(a) => store.centerOn(a)} />
              : (
                <NjEmpty size="compact" className="fill" icon="line-chart" title="No signals plotted"
                  body="Click any value on the process diagram to start trending it here, the window stays open while you add more." />
              )}
          </div>
          <div className="twin-pens">
            <div className="twin-pens-head">
              <span className="eyebrow">Signals</span>
              <div className="twin-pens-head-r">
                <button className="btn btn-secondary btn-sm twin-undo" onClick={() => { const l = store.undo(); if (l) njToast("Undone: " + l + "."); }}
                  disabled={!store.hist.length} title={store.hist.length ? "Undo last change to the signal set (" + store.hist.length + " step" + (store.hist.length === 1 ? "" : "s") + ")" : "Nothing to undo"}
                  aria-label="Undo last change to the signal set"><Icon name="undo-2" size={14} /></button>
                <button className="btn btn-secondary btn-sm" onClick={() => store.clear()} disabled={!pens.length}><Icon name="eraser" size={14} /> Clear</button>
                <div style={{ position: "relative" }}>
                  <button ref={addBtnRef} className="btn btn-secondary btn-sm" onClick={() => setAddOpen((m) => !m)}><Icon name="plus" size={14} /> Add</button>
                  {addOpen && <TwinAddMenu anchorRef={addBtnRef} activeIds={pens.map((p) => p.id)} onAdd={(t) => store.add(resolveTrendPen(t))} onClose={() => setAddOpen(false)} />}
                </div>
              </div>
            </div>
            <div className="twin-chips">
              {pens.length === 0 && <span className="caption" style={{ padding: "2px 2px" }}>No parameters selected.</span>}
              {pens.map((p) => (
                <TwinPenChip key={p.id} pen={p} current={curOf(p.id)} focused={store.focus === p.id}
                  onFocus={() => store.setFocus(p.id)} onToggle={() => store.toggle(p.id)} onRemove={() => store.remove(p.id)} />
              ))}
            </div>
          </div>
          <div className="twin-resize" onPointerDown={startResize} title="Resize"><Icon name="move-diagonal-2" size={14} /></div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { trendWin, useTrendWin, openTrendWindow, TrendWindow });
