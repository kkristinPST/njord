// feeding-dialogs.jsx — feeding store + Feeder detail dialog + Feed distribution editor.
// Loaded BEFORE feeding.jsx; everything is exposed on window and referenced as window.* there.

/* ── feeding store: per-tank param overrides + per-tank distribution profile ── */
const feedStore = {
  state: { ov: {}, dist: {}, custom: {} }, // ov["3.ff"]=x ; dist[3]=[24 vals] ; custom[3]=bool
  subs: new Set(),
  set(next) { feedStore.state = next; feedStore.subs.forEach((f) => f()); },
  subscribe(f) { feedStore.subs.add(f); return () => feedStore.subs.delete(f); },
  snapshot() { return feedStore.state; },
};
function useFeed() { return React.useSyncExternalStore(feedStore.subscribe, feedStore.snapshot); }
function feedGet(n, field, base) { const v = feedStore.state.ov[n + "." + field]; return v == null ? base : v; }
function feedSet(n, field, val) {
  feedStore.set(Object.assign({}, feedStore.state, { ov: Object.assign({}, feedStore.state.ov, { [n + "." + field]: val }) }));
}
const EVEN24 = () => Array(24).fill(50);
function feedDist(n) { return feedStore.state.dist[n] || EVEN24(); }
function feedCustom(n) { return !!feedStore.state.custom[n]; }
function feedSetDist(n, vals, custom) {
  feedStore.set(Object.assign({}, feedStore.state, {
    dist: Object.assign({}, feedStore.state.dist, { [n]: vals.slice() }),
    custom: custom == null ? feedStore.state.custom : Object.assign({}, feedStore.state.custom, { [n]: custom }),
  }));
}

const FEED_TYPES = ["Aller Infinity", "Aller Thalassa", "Aller Futura", "Nutra Supreme", "Biomar Orbit"];

/* small editable value box (matches scada ParamRow editable field) */
function EditBox({ tank, field, label, value, unit, min, max, step, options, group, dec = 2, wide }) {
  const num = typeof value === "number";
  const disp = options ? value : (num ? value.toFixed(dec) : value);
  return (
    <button className={"pv box pv-edit" + (wide ? " pv-wide" : "")} title="Edit value"
      onClick={() => njEditParam({
        tag: "DPT1-FTA" + tank + "-FDR1", label: "Tank " + tank + " · " + label, value, unit,
        min, max, step, options, group: group || "Feeder 1",
        onApply: (nv) => feedSet(tank, field, nv),
      })}>
      <span className="pv-box-v">{disp}{unit && !options ? <span className="ffu"> {unit}</span> : null}</span>
      <Icon name="pencil" size={11} />
    </button>
  );
}

/* ─────────────────────────  FEEDER DETAIL DIALOG  ───────────────────────── */
function FeederDialog({ n }) {
  useFeed();
  const feedType = feedGet(n, "feedType", "Aller Infinity");
  const calib = feedGet(n, "calib", 148.0);
  const minOp = feedGet(n, "minOp", 1);
  const interval = feedGet(n, "interval", 180);
  const paused = feedGet(n, "paused", false);
  const curTarget = feedGet(n, "curTarget", 0.19);
  const pct = feedGet(n, "curPct", 1.3);
  const [more, setMore] = React.useState(false);

  const extra = [
    ["Recalculation time", "13:00"], ["Temperature", "12.4 °C"], ["Table SGR", "1.42 %/d"],
    ["Calculated SGR", "1.38 %/d"], ["Feed percentage", "1.9 %"], ["Feed current day", "9.8 kg"],
    ["Feed yesterday", "18.6 kg"], ["Feed current cycle", "412 kg"], ["Hand feed", "0.0 kg"],
    ["Boost feed", "0.0 kg"], ["Daily feed increase", "3 %"], ["Estimated growth", "+0.4 kg/d"],
  ];

  return (
    <Dialog width={520}>
      <DlgHeader icon="utensils" name={"Tank " + n} tag="Feeder 1" onClose={closeDialog} />
      <div className="dlg-body fd-body">
        {/* status + current target hero */}
        <div className="fd-hero">
          <span className={"fd-state " + (paused ? "paused" : "run")}>
            <Dot level={paused ? "diagnostic" : "ok"} size={9} /> {paused ? "Paused" : "In operation"}
          </span>
          <div className="fd-hero-target">
            <span className="fd-hero-l">Current target</span>
            <span className="data fd-hero-v">{curTarget.toFixed(2)} <span className="u">kg/h</span></span>
          </div>
        </div>
        <div className="fd-progress">
          <div className="fd-progress-bar"><div className="fd-progress-fill" style={{ width: Math.min(100, pct) + "%" }} /></div>
          <span className="data fd-progress-pct">{pct.toFixed(1)} %</span>
        </div>

        {/* ESSENTIAL: feed type + calibration surfaced (never hidden) */}
        <div className="fd-essential">
          <div className="fd-ess-cell">
            <span className="fd-ess-l">Feed type</span>
            <EditBox tank={n} field="feedType" label="Feed type" value={feedType} options={FEED_TYPES} wide />
          </div>
          <div className="fd-ess-cell">
            <span className="fd-ess-l">Feeder calibration</span>
            <EditBox tank={n} field="calib" label="Feeder calibration" value={calib} unit="g/rot" min={50} max={400} step={0.5} dec={1} />
          </div>
        </div>

        {/* timing */}
        <div className="fd-section">
          <div className="fd-sec-eyebrow">Timing</div>
          <div className="fd-rows">
            <div className="fd-row"><span className="fd-row-l">Minimum operation time</span>
              <EditBox tank={n} field="minOp" label="Minimum operation time" value={minOp} unit="s" min={0} max={60} step={1} dec={0} /></div>
            <div className="fd-row"><span className="fd-row-l">Feeder interval</span>
              <EditBox tank={n} field="interval" label="Feeder interval" value={interval} unit="s" min={10} max={600} step={5} dec={0} /></div>
            <div className="fd-row"><span className="fd-row-l">Current feeder interval</span>
              <span className="data fd-ro">{interval} <span className="u">s</span></span></div>
          </div>
        </div>

        {/* more readings (previously behind the customize-view toggle) */}
        <button className="fd-more" onClick={() => setMore((m) => !m)}>
          <Icon name={more ? "chevron-down" : "chevron-right"} size={15} /> More readings
          <span className="fd-more-count">{extra.length}</span>
        </button>
        {more && (
          <div className="fd-extra">
            {extra.map(([l, v]) => (
              <div className="fd-extra-row" key={l}><span>{l}</span><span className="data">{v}</span></div>
            ))}
          </div>
        )}
      </div>
      <div className="dlg-foot dlg-foot-split">
        <button className="btn btn-ghost btn-sm" onClick={() => { closeDialog(); openFeedDistribution(n); }}>
          <Icon name="bar-chart-2" size={14} /> Feed distribution
        </button>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}
function openFeederDialog(n) { openDialog(<FeederDialog n={n} />); }

/* ─────────────────────  FEED DISTRIBUTION EDITOR DIALOG  ───────────────────── */
const CURVE_SEEDS = [
  { id: "even", name: "Even 24 h", vals: EVEN24() },
  { id: "ramp", name: "Daytime ramp", vals: Array.from({ length: 24 }, (_, h) => 12 + Math.round(75 * Math.max(0, Math.sin(((h - 5) / 14) * Math.PI)))) },
  { id: "night", name: "Night reduced", vals: Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 20 ? 70 : 18)) },
  { id: "twin", name: "Twin peak", vals: Array.from({ length: 24 }, (_, h) => 20 + Math.round(70 * (Math.exp(-((h - 9) ** 2) / 8) + Math.exp(-((h - 17) ** 2) / 8)))) },
];
const CURVE_KEY = "nj_feed_curves_v1";
function loadCurves() {
  try { const raw = localStorage.getItem(CURVE_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return CURVE_SEEDS.map((c) => ({ id: c.id, name: c.name, vals: c.vals.slice() }));
}
const feedCurveStore = {
  state: { curves: loadCurves() },
  subs: new Set(),
  set(next) {
    feedCurveStore.state = next;
    try { localStorage.setItem(CURVE_KEY, JSON.stringify(next.curves)); } catch (e) {}
    feedCurveStore.subs.forEach((f) => f());
  },
  subscribe(f) { feedCurveStore.subs.add(f); return () => feedCurveStore.subs.delete(f); },
  snapshot() { return feedCurveStore.state; },
};
function useFeedCurves() { return React.useSyncExternalStore(feedCurveStore.subscribe, feedCurveStore.snapshot).curves; }
function feedCurveAdd(name, vals) {
  const id = "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);
  feedCurveStore.set({ curves: [...feedCurveStore.state.curves, { id, name, vals: vals.slice() }] });
  return id;
}
function feedCurveUpdate(id, patch) {
  feedCurveStore.set({ curves: feedCurveStore.state.curves.map((c) => (c.id === id ? Object.assign({}, c, patch, patch.vals ? { vals: patch.vals.slice() } : {}) : c)) });
}
function feedCurveRemove(id) {
  feedCurveStore.set({ curves: feedCurveStore.state.curves.filter((c) => c.id !== id) });
}

/* Save-as naming dialog (stacked on the distribution editor) */
function CurveSaveAsDialog({ initial = "", onSave }) {
  const [name, setName] = React.useState(initial);
  const curves = feedCurveStore.state.curves;
  const trimmed = name.trim();
  const dup = curves.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  const save = () => { if (!trimmed || dup) return; onSave(trimmed); closeDialog(); };
  return (
    <Dialog width={400}>
      <DlgHeader icon="save" name="Save curve as" onClose={closeDialog} />
      <div className="dlg-body pe-body">
        <div className="pe-comment">
          <label className="pe-comment-lbl">Curve name</label>
          <input ref={inputRef} className="oos-input" value={name} placeholder="e.g. Post-smolt AM ramp"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          {dup && <div className="tkt-err" style={{ marginTop: 6 }}>A curve with this name already exists.</div>}
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!trimmed || dup} onClick={save}>Save</button>
      </div>
    </Dialog>
  );
}

/* Curve picker (opened from the "more" chip when there are many stored curves) */
function CurvePickerDialog({ selId, onPick }) {
  const curves = useFeedCurves();
  const [q, setQ] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  const list = curves.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog width={420}>
      <DlgHeader icon="activity" name="Stored curves" onClose={closeDialog} />
      <div className="dlg-body">
        <div className="fdist-picker-search">
          <Icon name="search" size={15} color="var(--slate-400)" />
          <input ref={ref} className="fdist-picker-input" placeholder="Search curves…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="fdist-picker-list">
          {list.length ? list.map((c) => (
            <button key={c.id} className={"fdist-curve-row" + (selId === c.id ? " sel" : "")} onClick={() => onPick(c)}>
              <Icon name="activity" size={13} />
              <span className="fdist-curve-name">{c.name}</span>
              {selId === c.id && <Icon name="check" size={14} />}
            </button>
          )) : <div className="fdist-curve-empty">No matching curves</div>}
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta">{curves.length} stored</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}

function FeedDistributionDialog({ n, todayTarget }) {
  useFeed();
  const curves = useFeedCurves();
  const [custom, setCustom] = React.useState(feedCustom(n));
  const [vals, setVals] = React.useState(() => feedDist(n).slice());
  const [hist, setHist] = React.useState([]);        // undo stack
  const [selId, setSelId] = React.useState(null);
  const svgRef = React.useRef(null);
  const dragging = React.useRef(false);

  const sum = vals.reduce((a, b) => a + b, 0) || 1;
  const W = 560, H = 220, padL = 6, padR = 6, padT = 8, padB = 4;
  const bw = (W - padL - padR) / 24;

  const pushHist = () => setHist((h) => [...h.slice(-19), vals.slice()]);
  const applyAt = (clientX, clientY) => {
    const el = svgRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / r.width * W;
    const y = (clientY - r.top) / r.height * H;
    let idx = Math.floor((x - padL) / bw);
    idx = Math.max(0, Math.min(23, idx));
    let v = Math.round((1 - (y - padT) / (H - padT - padB)) * 100);
    v = Math.max(0, Math.min(100, v));
    setVals((prev) => { const nx = prev.slice(); nx[idx] = v; return nx; });
  };

  const onDown = (e) => { if (!custom) return; pushHist(); dragging.current = true; applyAt(e.clientX, e.clientY); };
  const onMove = (e) => { if (dragging.current) applyAt(e.clientX, e.clientY); };
  const onUp = () => { dragging.current = false; };

  const loadCurve = (c) => { pushHist(); setVals(c.vals.slice()); setSelId(c.id); setCustom(true); };
  const undo = () => setHist((h) => { if (!h.length) return h; setVals(h[h.length - 1]); return h.slice(0, -1); });
  const reset = () => { pushHist(); setVals(EVEN24()); setSelId(null); };

  const sel = curves.find((c) => c.id === selId) || null;
  const newCurve = () => openDialog(<CurveSaveAsDialog onSave={(name) => { const id = feedCurveAdd(name, vals); setSelId(id); if (window.njToast) window.njToast("Curve \u201c" + name + "\u201d saved"); }} />);
  const overwrite = () => {
    if (!sel) return;
    openDialog(<ConfirmDialog title="Overwrite curve" message={"Replace \u201c" + sel.name + "\u201d with the current distribution?"} confirmLabel="Overwrite"
      onConfirm={() => { feedCurveUpdate(sel.id, { vals }); if (window.njToast) window.njToast("Curve \u201c" + sel.name + "\u201d updated"); }} />);
  };
  const del = () => {
    if (!sel) return;
    openDialog(<ConfirmDialog title="Delete curve" tone="danger" message={"Delete \u201c" + sel.name + "\u201d? This cannot be undone."} confirmLabel="Delete"
      onConfirm={() => { feedCurveRemove(sel.id); setSelId(null); if (window.njToast) window.njToast("Curve \u201c" + sel.name + "\u201d deleted"); }} />);
  };
  const openPicker = () => openDialog(<CurvePickerDialog selId={selId} onPick={(c) => { loadCurve(c); closeDialog(); }} />);
  const SHOW_CURVES = 3;
  let shown = curves.slice(0, SHOW_CURVES);
  if (sel && !shown.some((c) => c.id === sel.id)) shown = [sel].concat(curves.slice(0, SHOW_CURVES - 1));
  const extra = curves.length - shown.length;

  const commit = (activate) => {
    feedSetDist(n, vals, custom);
    closeDialog();
    if (window.njToast) window.njToast(
      "Feed distribution " + (activate ? "committed &amp; activated" : "committed") + " for Tank " + n + (custom ? "" : " (even 24 h)"),
      "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"));
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");
  const dailyTarget = todayTarget || 0;

  return (
    <Dialog width={900}>
      <DlgHeader icon="bar-chart-2" name={"Tank " + n + " · Feed distribution"} tag="Feeder 1" onClose={closeDialog} />
      <div className="dlg-body fdist-body">
        {/* top: toggle + targets + stored curves */}
        <div className="fdist-top">
          <div className="fdist-toggle-wrap">
            <span className="fdist-lbl">Custom feed distribution</span>
            <div className="segmented fdist-seg">
              <button className={"seg" + (custom ? " active" : "")} onClick={() => setCustom(true)}>Enabled</button>
              <button className={"seg" + (!custom ? " active" : "")} onClick={() => setCustom(false)}>Disabled</button>
            </div>
            <div className="fdist-targets">
              <div className="fdist-tgt"><span>Today's target</span><span className="data">{dailyTarget.toFixed(1)} <span className="u">kg/d</span></span></div>
              <div className="fdist-tgt"><span>Current target</span><span className="data">{(dailyTarget / 24).toFixed(2)} <span className="u">kg/h</span></span></div>
            </div>
          </div>
          <div className="fdist-stored">
            <span className="fdist-lbl">Stored curves</span>
            <div className="fdist-chip-row">
              {shown.length ? shown.map((c) => (
                <button key={c.id} className={"fdist-chip" + (selId === c.id ? " sel" : "")} onClick={() => loadCurve(c)} title={c.name}>
                  <Icon name="activity" size={12} />
                  <span className="fdist-chip-name">{c.name}</span>
                </button>
              )) : <span className="fdist-curve-empty">No stored curves</span>}
              {(extra > 0 || (sel && !shown.some((c) => c.id === sel.id))) && (
                <button className="fdist-chip more" onClick={openPicker} title="Browse all stored curves">
                  <Icon name="list" size={13} /> {extra > 0 ? "+" + extra + " more" : "Browse"}
                </button>
              )}
            </div>
            <div className="fdist-curve-actions">
              <button className="btn btn-secondary btn-sm" onClick={newCurve}><Icon name="plus" size={14} /> New</button>
              <button className="btn btn-secondary btn-sm" disabled={!sel} onClick={overwrite}>Overwrite</button>
              <button className="btn btn-secondary btn-sm" disabled={!sel} onClick={del}><Icon name="trash-2" size={14} /> Delete</button>
            </div>
          </div>
        </div>

        {/* bar editor */}
        <div className={"fdist-chart-wrap" + (custom ? "" : " off")}>
          <svg ref={svgRef} className="fdist-chart" viewBox={`0 0 ${W} ${H + 22}`} preserveAspectRatio="none"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
            style={{ cursor: custom ? "crosshair" : "default", touchAction: "none" }}>
            {[0, 25, 50, 75, 100].map((g) => {
              const y = padT + (1 - g / 100) * (H - padT - padB);
              return <g key={g}><line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--slate-100)" strokeWidth="1" />
                <text className="fdist-ytick" x={padL} y={y - 3}>{g}</text></g>;
            })}
            {vals.map((v, i) => {
              const x = padL + i * bw;
              const bh = (v / 100) * (H - padT - padB);
              const y = padT + (H - padT - padB) - bh;
              return <rect key={i} x={x + 1} y={y} width={bw - 2} height={bh} rx="1.5"
                fill={custom ? "var(--primary)" : "var(--slate-300)"} opacity={custom ? 0.9 : 1} />;
            })}
            {hours.map((h, i) => (i % 2 === 0 ? <text key={i} className="fdist-xtick" x={padL + i * bw + bw / 2} y={H + 15} textAnchor="middle">{String(i).padStart(2, "0")}</text> : null))}
          </svg>
          {!custom && <div className="fdist-off-note"><Icon name="lock" size={14} /> Enable custom distribution to shape the curve. Even 24 h is applied.</div>}
        </div>

        {/* action bar */}
        <div className="fdist-actions">
          <div className="fdist-actions-l">
            <button className="btn btn-secondary btn-sm" onClick={undo} disabled={!hist.length}><Icon name="undo-2" size={14} /> Undo</button>
            <button className="btn btn-secondary btn-sm" onClick={reset}><Icon name="rotate-ccw" size={14} /> Reset (even)</button>
          </div>
          <div className="fdist-actions-r">
            <button className="btn btn-secondary btn-sm" onClick={() => commit(false)}>Commit</button>
            <button className="btn btn-primary btn-sm" onClick={() => commit(true)}><Icon name="check" size={14} /> Commit &amp; activate</button>
          </div>
        </div>

        {/* hour table */}
        <div className="fdist-tbl-scroll">
          <table className="fdist-tbl">
            <tbody>
              <tr><th>Hour</th>{hours.map((h, i) => <td key={i}>{String(i).padStart(2, "0")}</td>)}</tr>
              <tr><th>Value</th>{vals.map((v, i) => <td key={i} className="data">{v}</td>)}</tr>
              <tr><th>%</th>{vals.map((v, i) => <td key={i} className="data">{(v / sum * 100).toFixed(1)}</td>)}</tr>
              <tr><th>kg</th>{vals.map((v, i) => <td key={i} className="data td-strong">{(v / sum * dailyTarget).toFixed(2)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="info" size={13} /> {custom ? "Custom curve: normalised to 100 % across 24 h" : "Even distribution, 4.17 % per hour"}</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}
function openFeedDistribution(n, todayTarget) { openDialog(<FeedDistributionDialog n={n} todayTarget={todayTarget} />); }

Object.assign(window, {
  feedStore, useFeed, feedGet, feedSet, feedDist, feedCustom, feedSetDist,
  feedCurveStore, useFeedCurves, feedCurveAdd, feedCurveUpdate, feedCurveRemove, CurveSaveAsDialog, CurvePickerDialog,
  FEED_TYPES, EditBox, FeederDialog, openFeederDialog, FeedDistributionDialog, openFeedDistribution,
});
