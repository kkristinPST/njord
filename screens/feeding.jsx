// feeding.jsx — Fish Feeding redesign (tank feeder cards).
// Editable fields open the param popup (njEditParam); the feed curve opens the
// distribution editor; a Feeder button opens the feeder-detail popup. Feed type +
// calibration are surfaced on the card (per spec: essential, never hidden).
// Store + dialogs live in screens/feeding-dialogs.jsx (loaded before this file).

function Sparkline({ vals, custom }) {
  const n = vals.length;
  const sum = vals.reduce((a, b) => a + b, 0) || 1;
  const W = 240, H = 52, pad = 2;
  const max = Math.max(...vals) || 1;
  const xs = (i) => pad + (i / (n - 1)) * (W - pad * 2);
  const ys = (v) => H - pad - (v / max) * (H - pad * 2);
  const line = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const area = line + ` L${xs(n - 1).toFixed(1)},${H} L${xs(0).toFixed(1)},${H} Z`;
  const col = custom ? "var(--primary)" : "var(--slate-400)";
  const gid = "fg" + (custom ? 1 : 0) + n;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={custom ? "rgba(0,174,238,0.20)" : "rgba(148,163,184,0.18)"} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function EditField({ n, field, label, value, unit, min, max, step, dec }) {
  const EditBox = window.EditBox;
  return (
    <div className="ff-field">
      <span className="ff-field-l">{label}</span>
      <EditBox tank={n} field={field} label={label} value={value} unit={unit} min={min} max={max} step={step} dec={dec} />
    </div>
  );
}

// customizable field catalog — legacy's "Customize view" checklist, adapted to our card
// language (checkboxes with click-anywhere labels, persisted across the facility view).
const FF_FIELDS = [
  { key: "ff", label: "Feed factor", kind: "edit", unit: "", min: 0, max: 2, step: 0.01, dec: 2, def: true },
  { key: "af", label: "Activity factor", kind: "edit", unit: "%", min: 0, max: 100, step: 1, dec: 0, def: true },
  { key: "bf", label: "Base feed", kind: "edit", unit: "kg", min: 0, max: 200, step: 0.1, dec: 1, def: true },
  { key: "aw", label: "Avg. weight", kind: "edit", unit: "g", min: 0, max: 8000, step: 0.1, dec: 1, def: true },
  { key: "pop", label: "Population", kind: "ro", def: true, get: (t) => t.pop.toLocaleString("nb-NO") },
  { key: "bio", label: "Biomass", kind: "ro", unit: "kg", def: true, get: (t) => t.bio.toLocaleString("nb-NO") },
  { key: "recalc", label: "Recalculation time", kind: "ro", def: false, get: () => "00:00" },
  { key: "temp", label: "Temperature", kind: "ro", unit: "°C", def: false, get: (t) => t.temp.toFixed(1) },
  { key: "tsgr", label: "Table SGR", kind: "ro", unit: "%", def: false, get: (t) => t.tsgr.toFixed(2) },
  { key: "csgr", label: "Calculated SGR", kind: "ro", unit: "%", def: false, get: (t) => t.csgr.toFixed(2) },
  { key: "feedpct", label: "Feed percentage", kind: "ro", unit: "%", def: false, get: (t) => (t.target > 0 ? (t.target / t.bio * 100) : 0).toFixed(2) },
  { key: "feedcycle", label: "Feed current cycle", kind: "ro", unit: "kg", def: false, get: (t) => (t.target * 0.33).toFixed(1) },
  { key: "handfeedcycle", label: "Hand feed current cycle", kind: "ro", unit: "kg", def: false, get: (t) => (t.target * 0.02).toFixed(1) },
  { key: "feedday", label: "Feed current day", kind: "ro", unit: "kg", def: false, get: (t) => t.fed.toFixed(1) },
  { key: "handfeedday", label: "Hand feed current day", kind: "ro", unit: "kg", def: false, get: (t) => (t.target * 0.02).toFixed(1) },
  { key: "feedyest", label: "Feed yesterday", kind: "ro", unit: "kg", def: false, get: (t) => (t.target * 0.89).toFixed(1) },
  { key: "handfeedyest", label: "Hand feed yesterday", kind: "ro", unit: "kg", def: false, get: () => "0.0" },
  { key: "handfeed", label: "Hand feed", kind: "action", def: false, actionLabel: "Register" },
  { key: "boost", label: "Boost feed", kind: "action", def: false, actionLabel: "Start" },
  { key: "dailyinc", label: "Daily feed increase", kind: "ro", unit: "%", def: false, get: (t) => t.dailyInc.toFixed(1) },
  { key: "estgrowth", label: "Estimated growth", kind: "ro", unit: "kg", def: false, get: (t) => (t.bio * (1 + t.csgr / 100)).toFixed(1) },
];
const FF_VIEW_LS = "nj_ff_view_v1";
function useFfView() {
  const [vis, setVis] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(FF_VIEW_LS)); if (Array.isArray(s)) return new Set(s); } catch (e) {}
    return new Set(FF_FIELDS.filter((f) => f.def).map((f) => f.key));
  });
  React.useEffect(() => { try { localStorage.setItem(FF_VIEW_LS, JSON.stringify([...vis])); } catch (e) {} }, [vis]);
  const toggle = (k) => setVis((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  return { vis, toggle };
}

function FfCustomizeView({ vis, toggle }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="btn btn-secondary" onClick={() => setOpen((o) => !o)}><Icon name="columns-3" size={16} /> Customize view</button>
      {open && (
        <div className="ff-cv-pop" role="menu">
          <div className="ff-cv-h"><span>Value</span><span>Display / hide</span></div>
          <div className="ff-cv-list">
            {FF_FIELDS.map((f) => {
              const on = vis.has(f.key);
              return (
                <label key={f.key} className="ff-cv-row" {...njCheckable(() => toggle(f.key), { on, label: f.label })}>
                  <span className="ff-cv-lbl">{f.label}</span>
                  <Check on={on} />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── feedscrew strip ─────────────────────────────────────────────────────────────
// A tank may drive 1..n feedscrews. Tank-level values (feed factor, biomass, curve, daily
// target) are SHARED; progress, feed type and calibration are per screw — they are separate
// machines with their own hopper batch and their own calibration. Screw 1 keeps the
// unsuffixed store keys (see ffKey), so single-screw tanks are unchanged.
function FfScrews({ n, screws, target, fed, hyflow }) {
  const [open, setOpen] = React.useState(false);
  const stopped = screws.filter((s) => s.running === false).length;
  return (
    <div className={"ff-screws" + (open ? " open" : "")}>
      <button className="ff-screws-h" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        title={open ? "Hide the individual feedscrews" : "Show each feedscrew's feed type, calibration and progress"}>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
        <span>{screws.length} feedscrews</span>
        {stopped > 0 && <span className="ff-screws-run">{stopped} stopped</span>}
        <span className="ff-split">{screws.map((s) => s.share).join(" / ")} % of the daily dose</span>
      </button>
      {open && (
        <React.Fragment>
          {screws.map((s, i) => (
            <FfScrewStrip key={i} n={n} s={i + 1} screw={s} share={s.share} target={target} fed={fed} hyflow={hyflow} />
          ))}
          <div className="ff-screw-sum"><span>Total fed today</span><span className="data">{fed.toFixed(1)} <span className="u">/ {target.toFixed(1)} kg</span></span></div>
        </React.Fragment>
      )}
    </div>
  );
}

function FfScrewStrip({ n, s, screw, share, target, fed, hyflow }) {
  const g = window.feedGet, K = window.ffKey;
  const feedType = g(n, K("feedType", s), screw.feedType);
  const calib = g(n, K("calib", s), screw.calib);
  const st = target * share / 100, sf = fed * share / 100;
  const pct = st > 0 ? Math.min(100, Math.round((sf / st) * 100)) : 0;
  const stopped = screw.running === false;
  // Single-screw tank: one summary line, same height as the collapsed multi-screw header, so
  // tank-level values line up across the card grid.
  if (share >= 100) return (
    <button className="ff-feedstrip ff-screw ff-screw-solo" onClick={() => window.openFeederDialog(n, s, hyflow)} title="Open feeder settings">
      <span className="ff-screw-id">
        <Dot level={stopped ? "diagnostic" : "ok"} size={8} />
        <span className="ff-screw-tag">FDR{s}</span>
      </span>
      <span className="ff-solo-sum">
        <span className="ff-solo-type">{feedType}</span>
        <span className="ff-solo-sep">·</span>
        <span className="ff-solo-cal data">{calib.toFixed(1)} <span className="u">g/rot</span></span>
      </span>
      <Icon name="settings-2" size={14} color="var(--slate-400)" />
    </button>
  );
  return (
    <button className="ff-feedstrip ff-screw" onClick={() => window.openFeederDialog(n, s, hyflow)} title={"Open feeder " + s + " settings"}>
      <span className="ff-screw-id">
        <Dot level={stopped ? "diagnostic" : "ok"} size={8} />
        <span className="ff-screw-tag">FDR{s}</span>
        {share < 100 && <span className="ff-screw-split">{share} %</span>}
      </span>
      <span className="ff-screw-prog" hidden={share >= 100}>
        <span className="ff-screw-bar"><span className="ff-screw-fill" style={{ width: pct + "%" }} /></span>
        <span className="ff-screw-fed data">{sf.toFixed(1)} <span className="u">/ {st.toFixed(1)} kg</span></span>
      </span>
      <span className="ff-fs-cell ff-sc-type">
        <span className="ff-fs-l">Feed type</span>
        <span className="ff-fs-v">{feedType}</span>
      </span>
      <span className="ff-fs-cell ff-sc-cal">
        <span className="ff-fs-l">Calibration</span>
        <span className="ff-fs-v data">{calib.toFixed(1)} <span className="u">g/rot</span></span>
      </span>
      <Icon name="settings-2" size={14} color="var(--slate-400)" />
    </button>
  );
}
function ffScrews(t) {
  return t.screws && t.screws.length ? t.screws : [{ feedType: t.feedType, calib: t.calib, share: 100 }];
}

// Shared feeding block: the whole tank-level feeding record. Used by the Feeding card AND by
// the HyFlow screen (showScrews={false} there — HyFlow renders its own richer screw rows).
function FfFeedBlock({ t, vis, hyflow, showScrews = true }) {
  const { n } = t;
  const g = window.feedGet;
  const paused = g(n, "paused", t.paused);
  const ff = g(n, "ff", t.ff);
  const af = g(n, "af", t.af);
  const aw = g(n, "aw", t.aw);
  const bf = g(n, "bf", t.bf);
  const dist = window.feedDist(n);
  const custom = window.feedCustom(n);
  const screws = ffScrews(t);
  const target = t.target;
  const fed = paused ? 0 : t.fed;
  const pct = target > 0 ? Math.min(100, Math.round((fed / target) * 100)) : 0;
  return (
    <React.Fragment>
      <div className="ff-progress">
        <div className="ff-bar"><div className="ff-fill" style={{ width: pct + "%" }} /></div>
        <div className="ff-progress-lbl">
          <span className="data ff-fed">{fed.toFixed(1)} <span className="u">kg fed</span></span>
          <span className="data ff-target">today {target.toFixed(1)} <span className="u">kg/d</span></span>
        </div>
      </div>

      {showScrews && (
        screws.length === 1
          ? <FfScrewStrip n={n} s={1} screw={screws[0]} share={100} target={target} fed={fed} hyflow={hyflow} />
          : <FfScrews n={n} screws={screws} target={target} fed={fed} hyflow={hyflow} />
      )}

      <div className="ff-grid">
        {FF_FIELDS.filter((f) => f.kind === "edit" && vis.has(f.key)).map((f) => (
          <EditField key={f.key} n={n} field={f.key} label={f.label} value={{ ff, af, aw, bf }[f.key]} unit={f.unit} min={f.min} max={f.max} step={f.step} dec={f.dec} />
        ))}
      </div>

      <div className="ff-rows">
        {FF_FIELDS.filter((f) => f.kind === "ro" && vis.has(f.key)).map((f) => (
          <div className="ff-row" key={f.key}><span>{f.label}</span><span className="data td-strong">{f.get(t)} {f.unit ? <span className="caption">{f.unit}</span> : null}</span></div>
        ))}
        {vis.has("handfeed") && (
          <div className="ff-row"><span>Hand feed</span><button className="btn btn-secondary btn-sm" onClick={() => njEditParam({ tag: "DPT1-FTA" + n, label: "Hand feed · Tank " + n, value: 0, unit: "kg", min: 0, max: 50, step: 0.1, group: "Feeding", onApply: (v) => njToast("Hand feed registered on Tank " + n + " · " + v + " kg.") })}>Register</button></div>
        )}
        {vis.has("boost") && (
          <div className="ff-row"><span>Boost feed</span><button className="btn btn-secondary btn-sm" onClick={() => njToast("Feed boost started on Tank " + n + " · 1 min.", "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"))}>Start</button></div>
        )}
      </div>

      <button className="ff-curve" onClick={() => window.openFeedDistribution(n, target)} title="Edit feed distribution">
        <span className="ff-curve-head">
          <span className="eyebrow">Feed curve · 24h</span>
          <span className={"ff-curve-tag" + (custom ? " on" : "")}>{custom ? "Custom" : "Even"}</span>
        </span>
        <Sparkline vals={dist} custom={custom} />
        <span className="ff-curve-edit"><Icon name="pencil" size={12} /> Edit distribution</span>
      </button>
    </React.Fragment>
  );
}

function TankCard({ t, alarmLevel, alarmText, vis }) {
  const { n } = t;
  const paused = window.feedGet(n, "paused", t.paused);
  const screws = ffScrews(t);

  return (
    <div className={"card ff-card" + (alarmLevel ? " ff-card-alarm" : "")}>
      <div className="ff-head">
        <div>
          <div className="ff-title">Tank {n}</div>
          <div className="ff-feeder">{screws.length === 1 ? "Feeder 1" : screws.length + " feedscrews"}</div>
        </div>
        {alarmText
          ? <span className="evt ff-alm" title={alarmText}><Dot level={alarmLevel} size={8} /> {alarmText}</span>
          : <span className={"ff-state-chip " + (paused ? "paused" : "run")}>
              <Dot level={paused ? "diagnostic" : "ok"} size={7} /> {paused ? "Paused" : "In operation"}
            </span>}
      </div>
      <FfFeedBlock t={t} vis={vis} />
    </div>
  );
}

const TANKS = [
  { n: 1, fed: 4.5, target: 8.8, ff: 0.90, af: 65, aw: 2.1, bf: 13.6, pop: 149041, bio: 308, feedType: "Aller Infinity", calib: 148.0, paused: false, temp: 13.1, tsgr: 4.7, csgr: 3.9, dailyInc: 2.4 },
  { n: 2, fed: 10.3, target: 20.4, ff: 0.90, af: 70, aw: 3.6, bf: 29.1, pop: 206271, bio: 734, feedType: "Aller Infinity", calib: 152.0, paused: false, temp: 13.4, tsgr: 4.93, csgr: 4.19, dailyInc: 2.7,
    screws: [{ feedType: "Aller Infinity", calib: 152.0, share: 60 }, { feedType: "Aller Infinity", calib: 149.5, share: 40 }] },
  { n: 3, fed: 9.8, target: 19.4, ff: 0.90, af: 75, aw: 3.6, bf: 25.8, pop: 180429, bio: 653, feedType: "Aller Thalassa", calib: 148.0, paused: false, temp: 13.2, tsgr: 4.6, csgr: 3.8, dailyInc: 2.3,
    screws: [{ feedType: "Aller Thalassa", calib: 148.0, share: 50 }, { feedType: "Aller Futura", calib: 146.0, share: 50, running: false }] },
  { n: 4, fed: 0, target: 9.3, ff: 0.90, af: 80, aw: 2.1, bf: 14.3, pop: 156628, bio: 324, feedType: "Aller Infinity", calib: 145.5, paused: true, temp: 12.9, tsgr: 0, csgr: 0, dailyInc: 0 },
  { n: 5, fed: 7.1, target: 15.2, ff: 0.90, af: 68, aw: 2.9, bf: 21.0, pop: 171204, bio: 497, feedType: "Nutra Supreme", calib: 150.0, paused: false, temp: 13.4, tsgr: 4.5, csgr: 3.6, dailyInc: 2.1,
    screws: [{ feedType: "Nutra Supreme", calib: 150.0, share: 40 }, { feedType: "Nutra Supreme", calib: 151.5, share: 30 }, { feedType: "Aller Infinity", calib: 147.0, share: 30 }] },
  { n: 6, fed: 8.4, target: 17.6, ff: 0.90, af: 72, aw: 3.2, bf: 23.4, pop: 168930, bio: 541, feedType: "Aller Infinity", calib: 148.0, paused: false, temp: 13.3, tsgr: 4.6, csgr: 3.9, dailyInc: 2.5 },
  { n: 7, fed: 5.9, target: 12.1, ff: 0.90, af: 66, aw: 2.4, bf: 17.8, pop: 159870, bio: 384, feedType: "Aller Futura", calib: 149.5, paused: false, temp: 13.0, tsgr: 4.4, csgr: 3.7, dailyInc: 2.0 },
  { n: 8, fed: 11.2, target: 22.0, ff: 0.90, af: 74, aw: 3.8, bf: 31.2, pop: 198640, bio: 755, feedType: "Aller Infinity", calib: 151.0, paused: false, temp: 13.5, tsgr: 4.9, csgr: 4.2, dailyInc: 2.8,
    screws: [{ feedType: "Aller Infinity", calib: 151.0, share: 55 }, { feedType: "Biomar Orbit", calib: 153.5, share: 45 }] },
];

const FEED_TABLE_SEED = [
  { id: "ft1", name: "Salmon smolt · 0–100 g", weights: ["0–1", "1–5", "5–15", "15–30", "30–60", "60–100"],
    rates: [
      [0,0,0,0,0,0,0,4.5,5.2,5.8,6.5,7.2,7.8],
      [0,0,0,0,0,0,0,3.5,4.0,4.5,5.0,5.5,5.9],
      [0,0,0,0,0,0,0,2.7,3.0,3.4,3.8,4.2,4.6],
      [0,0.6,0.8,1.1,1.4,1.6,1.9,2.2,2.6,2.9,3.2,3.5,3.8],
      [0,0.5,0.7,0.9,1.1,1.3,1.6,1.8,2.1,2.3,2.6,2.9,3.1],
      [0,0.3,0.5,0.6,0.8,1.0,1.1,1.3,1.4,1.6,1.8,2.0,2.2],
    ] },
  { id: "ft2", name: "Salmon parr · 100–500 g", weights: ["100–150", "150–250", "250–350", "350–500"],
    rates: [
      [0,0.3,0.4,0.5,0.7,0.9,1.0,1.2,1.3,1.5,1.6,1.8,1.9],
      [0,0.2,0.3,0.5,0.6,0.8,0.9,1.0,1.2,1.3,1.4,1.5,1.7],
      [0,0.2,0.3,0.4,0.5,0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.4],
      [0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,1.1,1.2],
    ] },
];
const FEED_TABLE_TEMPS = [0,1,2,3,4,5,6,7,8,9,10,11,12];

function FeedTablesView({ onBack }) {
  const [tables, setTables] = React.useState(() => FEED_TABLE_SEED.map((t) => ({ ...t, rates: t.rates.map((r) => r.slice()) })));
  const [sel, setSel] = React.useState(tables[0].id);
  const [showCalc, setShowCalc] = React.useState(false);
  const table = tables.find((t) => t.id === sel) || tables[0];
  const setCell = (ri, ci, v) => setTables((ts) => ts.map((t) => t.id !== sel ? t : { ...t, rates: t.rates.map((row, i) => i !== ri ? row : row.map((c, j) => j === ci ? v : c)) }));
  const editCell = (ri, ci) => njEditParam({
    tag: `${table.weights[ri]} g`, label: `Feed rate · ${table.weights[ri]} g @ ${FEED_TABLE_TEMPS[ci]} °C`,
    value: table.rates[ri][ci], unit: "%/d", min: 0, max: 20, step: 0.1, group: table.name,
    onApply: (v) => setCell(ri, ci, +(+v).toFixed(1)),
  });
  const delTable = () => openDialog(<ConfirmDialog title="Delete feed table" message={`Delete the feed table "${table.name}"? This cannot be undone.`} confirmLabel="Delete" tone="danger"
    onConfirm={() => { setTables((ts) => { const n = ts.filter((t) => t.id !== sel); setSel(n[0] ? n[0].id : ""); return n; }); njToast(`Feed table "${table.name}" deleted.`); }} />);

  return (
    <React.Fragment>
      <button className="bio-back" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Feeding</button>
      <div className="bio-actionbar">
        <div className="bio-actionbar-l">
          <span className="ttl">Feed Table Management</span>
          <span className="sub">Feed rate (% of biomass / day) per weight class and water temperature. Referenced by each tank's feed type.</span>
        </div>
        <div className="bio-actions">
          <button className="btn btn-secondary" onClick={() => njToast("Import feed table: CSV / supplier table import.")}><Icon name="upload" size={16} /> Import table</button>
          <button className="btn btn-secondary" onClick={() => njToast("Feed table saved.")}><Icon name="check" size={16} /> Save</button>
        </div>
      </div>

      <div className="card ftbl-card">
        <div className="ftbl-head">
          <label className="ftbl-sel">
            <span className="eyebrow">Feed table</span>
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <button className="btn btn-secondary btn-sm ftbl-del" onClick={delTable} disabled={!table}><Icon name="trash-2" size={14} /> Delete table</button>
        </div>

        {table && (
          <div className="ftbl-scroll">
            <table className="tbl ftbl">
              <thead>
                <tr>
                  <th scope="col" className="ftbl-wcol">Weight (g)</th>
                  {FEED_TABLE_TEMPS.map((t) => <th scope="col" key={t} className="ftbl-tcol">{t}°C</th>)}
                </tr>
              </thead>
              <tbody>
                {table.weights.map((w, ri) => (
                  <tr key={w}>
                    <th scope="row" className="ftbl-wcell">{w}</th>
                    {FEED_TABLE_TEMPS.map((t, ci) => {
                      const v = table.rates[ri][ci];
                      return <td key={t} className={"ftbl-cell" + (v === 0 ? " zero" : "")}><button className="ftbl-cellbtn data" onClick={() => editCell(ri, ci)} title="Edit feed rate">{v.toFixed(1)}</button></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className="ftbl-calc-h" onClick={() => setShowCalc((s) => !s)} aria-expanded={showCalc}>
          <Icon name={showCalc ? "chevron-down" : "chevron-right"} size={16} /> Check calculation
        </button>
        {showCalc && (
          <div className="ftbl-calc">
            <p>For a tank at <strong>8 °C</strong> with average weight <strong>3.6 g</strong> (class 1–5 g), the rate is <span className="data">{table.rates[1] ? table.rates[1][8].toFixed(1) : "—"} %/d</span>. Applied to a biomass of <span className="data">734 kg</span> → daily feed ≈ <span className="data">{table.rates[1] ? (734 * table.rates[1][8] / 100).toFixed(1) : "—"} kg</span>, before feed &amp; activity factors.</p>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

function FeedingScreen() {
  const [view, setView] = React.useState("tanks");
  const ffView = useFfView();
  useAlarmHub();
  window.useFeed();
  const { building, dept } = useCtx();
  // Guard the reverse order of the njPickContext fallback: the operator may already be scoped
  // to a department with no feeding line (Building 3 · Common) and then pick Fish Feeding in
  // the sidebar. Same fallback, so the screen can never claim a feeding line that isn't there.
  const hasFeed = njDeptHasSystem(dept, /feeding/i);
  React.useEffect(() => { if (!hasFeed) njDeptSystemFallback(dept, "feeding line"); }, [hasFeed, dept.id]);
  const feedLabel = (dept.systems.find((s) => /Feeding/.test(s.label)) || {}).label || "Feeding";
  const status = njSystemStatus(building.id, dept.id, feedLabel);
  const active = TANKS.filter((t) => !window.feedGet(t.n, "paused", t.paused));
  const totalFed = active.reduce((s, t) => s + t.fed, 0);
  const totalTarget = TANKS.reduce((s, t) => s + t.target, 0);
  if (!hasFeed) return (
    <AppShell active="feeding" title="Fish Feeding" statusLevel="ok">
      <div className="pagehead"><div className="pagehead-row"><div><p className="pagehead-sub">{dept.name} has no feeding line · opening {(dept.systems[0] || {}).label}</p></div></div></div>
    </AppShell>
  );
  if (view === "feedtables") return (
    <AppShell active="feeding" title="Fish Feeding" crumbs={["Feed tables"]} statusLevel={njSev(status)}>
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Feed tables · {feedLabel}</p>
          </div>
          <div className="pagehead-right"><DeptTabs active={feedLabel} /></div>
        </div>
      </div>
      <FeedTablesView onBack={() => setView("tanks")} />
    </AppShell>
  );
  return (
    <AppShell active="feeding" title="Fish Feeding" statusLevel={njSev(status)}>
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">{active.length}/{TANKS.length} tanks feeding · {totalFed.toFixed(1)} / {totalTarget.toFixed(1)} kg today · {feedLabel}</p>
          </div>
          <div className="pagehead-right"><DeptTabs active={feedLabel} /></div>
        </div>
      </div>
      <div className="tank-toolbar">
        <button className="btn btn-secondary" onClick={() => setView("feedtables")}><Icon name="table-2" size={16} /> Feed tables</button>
        <FfCustomizeView vis={ffView.vis} toggle={ffView.toggle} />
      </div>

      <div className="ff-cards">
        {TANKS.map((t) => <TankCard key={t.n} t={t} vis={ffView.vis} />)}
      </div>
    </AppShell>
  );
}

window.FeedingScreen = FeedingScreen;
Object.assign(window, { FF_TANKS: TANKS, FfFeedBlock, FfScrewStrip, FfScrews, useFfView, FF_FIELDS, ffScrews });
