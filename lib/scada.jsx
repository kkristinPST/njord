// scada.jsx — shared SCADA mimic primitives + system-screen shell (used by Batch 2 system views)
// All mimics render inside an <svg className="ras-mimic"> so they inherit the mimic text styles.

// ── equipment node: rounded-rect with title / sub / value / status dot ──
function MNode({ x, y, w, h, title, sub, value, unit, status = "ok", accent, emphasis, onClick }) {
  const dot = (SEV[status] || SEV.ok).dot;
  return (
    <g className={onClick ? "mimic-hit" : undefined} onClick={onClick} role={onClick ? "button" : undefined} {...(onClick ? njActivate(onClick) : null)}>
      <rect x={x} y={y} width={w} height={h} rx="10" fill="#fff" stroke={emphasis ? "var(--slate-300)" : "var(--slate-200)"} strokeWidth="1.5" />
      <circle cx={x + w - 13} cy={y + 13} r="4.5" fill={dot} />
      <text className="nb-title" x={x + 13} y={y + 21}>{title}</text>
      {sub && <text className="nb-sub" x={x + 13} y={y + 35}>{sub}</text>}
      {value != null && (
        <text className="nb-val" x={x + 13} y={y + h - 13} fill={accent}>{value}<tspan className="nb-unit"> {unit}</tspan></text>
      )}
    </g>
  );
}

// ── pump / blower circular badge with caption below ──
function MPump({ x, y, label, on = true, glyph = "P", onClick }) {
  return (
    <g className={onClick ? "mimic-hit" : undefined} onClick={onClick} role={onClick ? "button" : undefined} {...(onClick ? njActivate(onClick) : null)}>
      <circle cx={x} cy={y} r="15" fill={on ? "var(--slate-100)" : "var(--slate-50)"} stroke={on ? "var(--sc-run)" : "var(--slate-300)"} strokeWidth="1.5" />
      <text className="pb-glyph" x={x} y={y + 4} textAnchor="middle" fill={on ? "var(--sc-run)" : "var(--slate-400)"}>{glyph}</text>
      {label && <text className="pb-lbl" x={x} y={y + 29} textAnchor="middle">{label}</text>}
    </g>
  );
}

// ── small boxed inline value (e.g. "41 Hz", "1.3 bar") ──
function VTag({ cx, y, text, w = 50 }) {
  return (
    <g>
      <rect x={cx - w / 2} y={y} width={w} height={18} rx="5" fill="#fff" stroke="var(--slate-200)" strokeWidth="1" />
      <text className="vtag-txt" x={cx} y={y + 13} textAnchor="middle">{text}</text>
    </g>
  );
}

// ── I/O port tag on an edge — flat tag with a right-pointing tip (reads as flow direction) ──
function Port({ x, y, label, w = 88 }) {
  const h = 26, tip = 11;
  const d = `M${x},${y} H${x + w} L${x + w + tip},${y + h / 2} L${x + w},${y + h} H${x} Z`;
  return (
    <g>
      <path d={d} fill="var(--slate-50)" stroke="var(--slate-200)" strokeWidth="1.5" strokeLinejoin="round" />
      <text className="port-lbl" x={x + w / 2 + 4} y={y + h / 2 + 4} textAnchor="middle">{label}</text>
    </g>
  );
}

// ── vertical sensor cluster box (analysis cabinet / pump sump readouts) ──
function SensorBox({ x, y, w, title, sub, rows }) {
  const headH = sub ? 44 : 30, rowH = 24;
  const h = headH + rows.length * rowH + 6;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill="#fff" stroke="var(--slate-300)" strokeWidth="1.5" />
      <circle cx={x + w - 14} cy={y + 16} r="4.5" fill={SEV.ok.dot} />
      <text className="sump-title" x={x + 14} y={y + 20}>{title}</text>
      {sub && <text className="nb-sub" x={x + 14} y={y + 35}>{sub}</text>}
      {rows.map((s, i) => {
        const ry = y + headH + 14 + i * rowH;
        return (
          <g key={i}>
            {i > 0 && <line x1={x + 14} y1={ry - 13} x2={x + w - 14} y2={ry - 13} stroke="var(--slate-100)" strokeWidth="1" />}
            <text className="sr-lbl" x={x + 14} y={ry}>{s.l}</text>
            <text className="sr-val" x={x + w - 14} y={ry} textAnchor="end" fill={s.accent}>{s.v}<tspan className="sr-unit"> {s.u}</tspan></text>
          </g>
        );
      })}
    </g>
  );
}

// ── flow pipes: gray casing + static tinted flow line (no animation, per design).
// The flow line carries the FLUID colour (NJ_FLUIDS, default process water) so these older
// schematics read the same as the P&ID mimics; cyan stays reserved for interactive elements. ──
function njFluidStroke(k) { const f = NJ_FLUIDS[k || "proc"]; return f ? f.v : "var(--fl-proc)"; }
function FlowPipes({ paths, mid, fluid }) {
  return (
    <React.Fragment>
      <defs>
        <marker id={mid} markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M1.5,1.5 L6,4.5 L1.5,7.5" fill="none" stroke={njFluidStroke(fluid)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {paths.map((d, i) => <path key={"c" + i} d={typeof d === "string" ? d : d.d} fill="none" stroke="var(--slate-200)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />)}
      {paths.map((d, i) => <path key={"f" + i} d={typeof d === "string" ? d : d.d} fill="none" stroke={(typeof d === "object" && d.idle) ? "var(--slate-300)" : njFluidStroke(typeof d === "object" ? (d.k || fluid) : fluid)} strokeWidth="2.5" strokeDasharray="7 13" strokeLinecap="round" strokeLinejoin="round" markerEnd={(typeof d === "object" && d.arrow === false) ? undefined : `url(#${mid})`} />)}
    </React.Fragment>
  );
}

// ── flow legend strip (below a mimic) ──
function FlowLegend({ extra, fluids = ["proc"] }) {
  return (
    <div className="ras-legend">
      <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running</span>
      <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Idle</span>
      <span className="ras-leg-div" aria-hidden="true" />
      <FluidLegend of={fluids} />
      {extra}
      <span className="ci" style={{ marginLeft: "auto", color: "var(--slate-400)" }}>P = pump / blower</span>
    </div>
  );
}

// ── parameter rows: read-only / editable (click → param edit dialog) / mode, plus optional send-to-trend ──
// Editable rows carry `edit:true` (or legacy `box:true`); value+unit may be split fields ({v,unit}) or a
// combined legacy string ("60 cm"). `trend:true` adds the inline send-to-trends icon.
function njParamSplit(r) {
  if (r.unit != null) {
    const num = typeof r.v === "number" ? r.v : parseFloat(r.v);
    return { num, unit: r.unit, disp: r.v + (r.unit ? " " + r.unit : "") };
  }
  const m = String(r.v).match(/^(-?[\d.,]+)\s*(.*)$/);
  if (m) return { num: parseFloat(m[1].replace(",", ".")), unit: m[2] || "", disp: String(r.v) };
  return { num: NaN, unit: "", disp: String(r.v) };
}
function ParamRow({ r, tag, group, override, onApply }) {
  const sv = njParamSplit(r);
  const rowTag = r.tag || tag;
  const curVal = override != null ? override : (isNaN(sv.num) ? sv.disp : sv.num);
  const disp = (typeof curVal === "number" ? String(curVal) : curVal) + (sv.unit ? " " + sv.unit : "");
  const trend = r.trend ? (
    <TrendBtn id={(rowTag || "P") + "-" + r.l} tag={r.trendTag || r.tag} name={r.l} unit={sv.unit}
      value={String(typeof curVal === "number" ? curVal : sv.num)} group={group || rowTag} title="Send to Trends" />
  ) : null;
  if (r.mode) {
    return (
      <div className="param-row">
        <span className="pl">{r.l}</span>
        <span className="param-row-r">{trend}<span className="param-mode"><Icon name="zap" size={12} /> {r.mode}</span></span>
      </div>
    );
  }
  if (r.edit || r.box) {
    const edit = () => njEditParam({
      tag: rowTag, label: r.l, value: curVal, unit: sv.unit,
      min: r.min, max: r.max, step: r.step, options: r.options, group,
      onApply: (nv) => onApply && onApply(nv),
    });
    return (
      <div className="param-row">
        <span className="pl">{r.l}</span>
        <span className="param-row-r">
          {trend}
          <button className="pv box pv-edit" onClick={edit} title="Edit value">{disp}<Icon name="pencil" size={12} /></button>
        </span>
      </div>
    );
  }
  return (
    <div className="param-row">
      <span className="pl">{r.l}</span>
      <span className="param-row-r">{trend}<span className="pv">{override != null ? ((typeof override === "number" ? String(override) : override) + (sv.unit ? " " + sv.unit : "")) : sv.disp}</span></span>
    </div>
  );
}
// renders a list of param rows, tracking the running group header + local edit overrides
function ParamList({ rows, tag }) {
  const [ov, setOv] = React.useState({});
  let curGroup = null;
  return (
    <React.Fragment>
      {rows.map((r, i) => {
        if (r.h) { curGroup = r.h; return <div className="param-group-h" key={i}>{r.h}</div>; }
        const key = (r.tag || tag || "") + "|" + r.l;
        const g = curGroup;
        return <ParamRow key={i} r={r} tag={tag} group={g} override={ov[key]}
          onApply={(nv) => setOv((p) => Object.assign({}, p, { [key]: nv }))} />;
      })}
    </React.Fragment>
  );
}

// ── generic tabbed parameter panel (data-driven) ──
// `dock` renders the same anatomy as the RAS parameter dock (full-bleed head / tab strip /
// scrolling body) so every screen's Parameters drawer reads identically.
function ParamTabs({ tabs, params, title = "Parameters", tags, dock = false }) {
  const [tab, setTab] = React.useState(tabs[0]);
  React.useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [tabs.join("|")]);
  const rows = params[tab] || [];
  const seg = (
    <div className="segmented param-seg">
      {tabs.map((t) => <button key={t} className={"seg" + (t === tab ? " active" : "")} onClick={() => setTab(t)}>{t}</button>)}
    </div>
  );
  const head = <div className="card-head-l"><Icon name="sliders-horizontal" size={16} color="var(--slate-600)" /><span className="card-title">{title}</span></div>;
  const body = <ParamList rows={rows} tag={tags ? tags[tab] : undefined} key={tab} />;
  if (dock) {
    return (
      <div className="card dock">
        <div className="dock-main">
          <div className="card-head dock-head">{head}</div>
          <div className="dock-tabs">{seg}</div>
          <div className="dock-body">{body}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-head">{head}</div>
      <div style={{ padding: "10px 12px 0" }}>{seg}</div>
      <div style={{ paddingTop: 8 }}>{body}</div>
    </div>
  );
}

// ── process-fluid registry: ONE definition of every fluid's label + colour, so pipe tints
// and legend labels can never drift apart. Gas fluids render a dashed swatch. ──
const NJ_FLUIDS = {
  proc:   { label: "Process water", v: "var(--fl-proc)" },
  raw:    { label: "Raw water",     v: "var(--fl-raw)" },
  drain:  { label: "Drain",         v: "var(--fl-drain)" },
  sludge: { label: "Sludge",        v: "var(--fl-sludge)" },
  glycol: { label: "Glycol loop",   v: "var(--fl-glycol)" },
  brine:  { label: "Brine loop",    v: "var(--fl-brine)" },
  o2:     { label: "Oxygen",        v: "var(--fl-o2)",  gas: true },
  gas:    { label: "Off-gas",       v: "var(--fl-gas)", gas: true },
  chem:   { label: "Lye dosing",    v: "var(--fl-chem)" },
  feed:   { label: "Feed transport", v: "var(--fl-feed)" },
};
// list only the fluids a given mimic actually carries
function FluidLegend({ of }) {
  return (
    <React.Fragment>
      {(of || []).map((k) => {
        const f = NJ_FLUIDS[k];
        if (!f) return null;
        return (
          <span className="ci" key={k} title={f.gas ? f.label + " (gas: dashed line)" : f.label}>
            <span className={"fl-sw" + (f.gas ? " dash" : "")} style={f.gas ? { color: f.v } : { background: f.v }} /> {f.label}
          </span>
        );
      })}
    </React.Fragment>
  );
}

// ── system-screen shell: AppShell + Dept tabs toolbar + mimic card (+ optional left extra) + param panel ──
// ── standard mimic legend (running / stopped / mode chips / fluids / trend hint) ──
function ScadaLegend({ note = "Tap a value's trend icon → send to Trends", fluids }) {
  return (
    <div className="ras-legend">
      <span className="ci"><span className="statusdot" style={{ background: "var(--sc-run)" }} /> Running</span>
      <span className="ci"><span className="statusdot" style={{ background: "var(--sc-stop)" }} /> Stopped</span>
      <span className="ci"><span className="rasm-leg-chip">A</span> Auto</span>
      <span className="ci"><span className="rasm-leg-chip man">M</span> Manual</span>
      {fluids && <span className="ras-leg-div" aria-hidden="true" />}
      <FluidLegend of={fluids} />
      <span className="ci" style={{ marginLeft: "auto", color: "var(--slate-500)" }}><Icon name="line-chart" size={14} /> {note}</span>
    </div>
  );
}

function SystemShell({ title, active, statusLevel = "ok", metaIcon = "git-merge", metaLabel,
                       mimicIcon = "git-merge", mimicTitle, mimicCaption, legend, mimic, param, paramTitle, actions }) {
  const [full, setFull] = React.useState(false);
  const [dock, setDock] = React.useState(false);
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <AppShell active="navigation" title={title} systemLabel={active} statusLevel={statusLevel}>
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{metaLabel || "Process system"}</p>
          </div>
          <div className="pagehead-right"><DeptTabs active={active} /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        {actions}
        {param && <button className={"btn btn-secondary" + (dock ? " btn-active" : "")} onClick={() => setDock((d) => !d)}><Icon name="sliders-horizontal" size={16} /> Parameters</button>}
        <button className="btn btn-secondary" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={16} /> Trends</button>
        <button className="btn btn-secondary" onClick={() => setFull(true)}><Icon name="maximize-2" size={16} /> SCADA view</button>
      </div>

      <div className="card rasm-card">
        <div className="card-head">
          <div className="card-head-l"><Icon name={mimicIcon} size={16} color="var(--slate-600)" /><span className="card-title">{mimicTitle}</span></div>
          {mimicCaption && <span className="caption">{mimicCaption}</span>}
        </div>
        <div className="card-body rasm-body">{mimic}</div>
        {legend}
      </div>

      {param && dock && <div className="dock-drawer-scrim" onClick={() => setDock(false)} />}
      {param && (
        <div className={"dock-drawer" + (dock ? " open" : "")} aria-hidden={!dock}>
          <button className="dock-drawer-x" title="Close" onClick={() => setDock(false)}><Icon name="x" size={20} /></button>
          {React.isValidElement(param) ? React.cloneElement(param, { dock: true, title: param.props.title || paramTitle || (title + " · parameters") }) : param}
        </div>
      )}

      {full && (
        <div className="rasm-full" role="dialog" aria-label="SCADA view">
          <div className="rasm-full-bar">
            <span className="rasm-full-title"><Icon name={mimicIcon} size={16} /> {mimicTitle || title} · SCADA view</span>
            <div className="rasm-full-bar-r">
              <button className="btn btn-secondary btn-sm" onClick={() => window.openTrendWindow && window.openTrendWindow()}><Icon name="line-chart" size={14} /> Trends</button>
              <button className="rasm-full-x" title="Close (Esc)" onClick={() => setFull(false)}><Icon name="x" size={20} /></button>
            </div>
          </div>
          <div className="rasm-full-inner"><ScadaZoom>{mimic}</ScadaZoom></div>
        </div>
      )}
    </AppShell>
  );
}

Object.assign(window, { MNode, MPump, VTag, Port, SensorBox, FlowPipes, FlowLegend, ScadaLegend, NJ_FLUIDS, FluidLegend, njFluidStroke, ParamTabs, ParamRow, ParamList, njParamSplit, SystemShell });

// ── ScadaZoom: pinch / wheel / drag zoom+pan wrapper for the SCADA mimic ──
// Wraps a mimic SVG so it can be zoomed (buttons, mouse wheel, trackpad pinch,
// two-finger pinch) and panned (drag / one-finger). Built for the fullscreen
// SCADA view so small targets (trend icons, valves) are usable on mobile.
function ScadaZoom({ children, min = 0.6, max = 6, step = 1.4 }) {
  const [t, setT] = React.useState({ s: 1, x: 0, y: 0 });
  const wrapRef = React.useRef(null);
  const ptrs = React.useRef(new Map());     // active pointers
  const pan = React.useRef(null);           // single-pointer pan state
  const pinch = React.useRef(null);         // two-pointer pinch state
  const moved = React.useRef(false);

  const clampS = (s) => Math.min(max, Math.max(min, s));
  const rectOf = () => wrapRef.current.getBoundingClientRect();

  // zoom by factor around a focal point (cx,cy) in wrapper-local px
  const zoomAround = (factor, cx, cy) => setT((p) => {
    const ns = clampS(p.s * factor);
    const k = ns / p.s;
    if (cx == null) { const r = rectOf(); cx = r.width / 2; cy = r.height / 2; }
    return { s: ns, x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k };
  });
  const reset = () => setT({ s: 1, x: 0, y: 0 });

  const onWheel = (e) => {
    e.preventDefault();
    const r = rectOf();
    zoomAround(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
  };

  const midOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distOf = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e) => {
    const r = rectOf();
    ptrs.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    moved.current = false;
    if (ptrs.current.size === 1) {
      pan.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y };
    } else if (ptrs.current.size === 2) {
      pan.current = null;
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d0: distOf(a, b), m0: midOf(a, b), s0: t.s, x0: t.x, y0: t.y };
    }
  };
  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const r = rectOf();
    ptrs.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    if (pinch.current && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = distOf(a, b);
      const ns = clampS(pinch.current.s0 * (d / pinch.current.d0));
      const k = ns / pinch.current.s0;
      const m = pinch.current.m0;
      setT({ s: ns, x: m.x - (m.x - pinch.current.x0) * k, y: m.y - (m.y - pinch.current.y0) * k });
      moved.current = true;
    } else if (pan.current && e.pointerId === pan.current.id) {
      const dx = e.clientX - pan.current.sx, dy = e.clientY - pan.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        moved.current = true;
        if (wrapRef.current.setPointerCapture) { try { wrapRef.current.setPointerCapture(e.pointerId); } catch (err) {} }
        setT((p) => ({ s: p.s, x: pan.current.ox + dx, y: pan.current.oy + dy }));
      }
    }
  };
  const endPointer = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 1) {
      const [id, pt] = [...ptrs.current.entries()][0];
      const r = rectOf();
      pan.current = { id, sx: pt.x + r.left, sy: pt.y + r.top, ox: t.x, oy: t.y };
    }
    if (ptrs.current.size === 0) pan.current = null;
  };
  // swallow clicks that were actually a drag, so equipment doesn't open on pan-release
  const onClickCapture = (e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; } };

  return (
    <div className="scz" ref={wrapRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={endPointer} onPointerCancel={endPointer} onPointerLeave={endPointer}
      onClickCapture={onClickCapture}>
      <div className={"scz-stage" + (pan.current || pinch.current ? " grabbing" : "")}
        style={{ width: (t.s * 100) + "%", transform: `translate(${t.x}px, ${t.y}px)` }}>
        {children}
      </div>
      <div className="scz-ctrls" role="group" aria-label="Zoom controls">
        <button className="scz-btn" title="Zoom out" aria-label="Zoom out" onClick={() => zoomAround(1 / step)}><Icon name="minus" size={20} /></button>
        <button className="scz-pct" title="Reset zoom" aria-label="Reset zoom" onClick={reset}>{Math.round(t.s * 100)}%</button>
        <button className="scz-btn" title="Zoom in" aria-label="Zoom in" onClick={() => zoomAround(step)}><Icon name="plus" size={20} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { ScadaZoom });
