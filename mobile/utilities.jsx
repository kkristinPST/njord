// utilities.jsx — mobile views for the facility utilities that sit outside the building
// hierarchy (the Site Plan's "Other" group on desktop): Energy Consumption and Heat Pumps.
// Data comes from the desktop screens (`ecData`/`EC_SERIES` and `HP_UNITS`) — one dataset,
// two layouts. Also the mobile fish-movement register (desktop: the Fish tab of the tank dock).

const MEC_PERIODS = [["7d", 7], ["14d", 14], ["30d", 30]];
const MEC_DEPTS = [
  { name: "DPT1 · Start Feeding", mode: "GROWTH", power: "53.9", today: "560.4", yesterday: "1,246.9", total: "2,528,476" },
  { name: "DPT2 · Growth", mode: "GROWTH", power: "85.9", today: "956.7", yesterday: "2,220.1", total: "7,923,047" },
  { name: "DPT3 · Growth", mode: "GROWTH", power: "203.8", today: "2,154.0", yesterday: "4,788.0", total: "9,023,381" },
];

function EnergyScreen() {
  useNav();
  const [period, setPeriod] = React.useState("7d");
  const days = (MEC_PERIODS.find((p) => p[0] === period) || MEC_PERIODS[0])[1];
  const [off, setOff] = React.useState(() => ({}));
  const data = React.useMemo(() => ecData(days), [days]);
  const series = EC_SERIES.filter((s) => !off[s.key]);
  const max = Math.max(1, ...data.map((d) => series.reduce((s, x) => s + d[x.key], 0)));
  const stats = EC_SERIES.map((s) => {
    const vals = data.map((d) => d[s.key]);
    return { ...s, cur: vals[vals.length - 1], min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
  });
  const nowTotal = EC_SERIES.reduce((s, x) => s + data[data.length - 1][x.key], 0);
  return (
    <React.Fragment>
      <MHeader back title="Energy Consumption" sub={"Facility utility · " + nowTotal.toLocaleString() + " kW now"}
        right={<button className="m-icbtn" aria-label="Export energy data" onClick={() => mToast("Export started: CSV", "download")}><MIcon name="download" size={18} /></button>} />
      <PullScroll><div className="m-pad">
        <div className="m-seg" style={{ marginBottom: 12 }}>
          {MEC_PERIODS.map(([k]) => <button key={k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>Last {k}</button>)}
        </div>
        <div className="m-eyebrow">Departments</div>
        {MEC_DEPTS.map((d) => (
          <div key={d.name} className="mc mc-pad mec-dept">
            <div className="mec-dept-h"><span className="mec-sigma">Σ</span><span className="mec-dept-n">{d.name}</span><span className="mec-mode">{d.mode}</span></div>
            <div className="mec-hero"><span className="mec-l">Power</span><span className="data mec-hero-v">{d.power}<span className="u"> kW/h</span></span></div>
            <div className="mec-rows">
              <div className="mec-row"><span className="mec-l">Energy today</span><span className="data mec-v">{d.today} kW</span></div>
              <div className="mec-row"><span className="mec-l">Energy yesterday</span><span className="data mec-v">{d.yesterday} kW</span></div>
              <div className="mec-row"><span className="mec-l">Total energy</span><span className="data mec-v">{d.total} kW</span></div>
            </div>
          </div>
        ))}

        <div className="m-eyebrow">Consumption per day</div>
        <div className="mc mc-pad">
          <div className="mst-bars"><div className="mst-bars-plot">
            {data.map((d, i) => {
              const tot = series.reduce((s, x) => s + d[x.key], 0);
              return (
                <div key={i} className="mst-col">
                  <div className="mst-stack" style={{ height: Math.max(2, (tot / max) * 100) + "%" }}>
                    {series.map((s) => <div key={s.key} style={{ height: (d[s.key] / (tot || 1)) * 100 + "%", background: s.color }} />)}
                  </div>
                  <span className="mst-col-x">{d.label}</span>
                </div>
              );
            })}
          </div></div>
        </div>

        <div className="m-eyebrow">Sensors · tap to show or hide</div>
        <div className="m-list">
          {stats.map((s) => {
            const on = !off[s.key];
            return (
              <button key={s.key} className="m-lrow" onClick={() => setOff((p) => ({ ...p, [s.key]: on }))} style={{ opacity: on ? 1 : .55 }}>
                <span className={"mratn-check" + (on ? " on" : "")} style={on ? { background: s.color, borderColor: s.color } : null}>{on && <MIcon name="check" size={14} color="#fff" />}</span>
                <div className="m-lrow-main">
                  <div className="m-lrow-t" style={{ fontSize: 13.5 }}>{s.label}</div>
                  <div className="m-lrow-s">Min <b className="data">{s.min.toLocaleString()}</b> · Max <b className="data">{s.max.toLocaleString()}</b> · Avg <b className="data">{s.avg.toLocaleString()}</b> kW</div>
                </div>
                <span className="data" style={{ fontWeight: 700 }}>{s.cur.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </div></PullScroll>
    </React.Fragment>
  );
}

function MHeatPumpsScreen() {
  useNav();
  const running = HP_UNITS.filter((u) => u.status === "ok").length;
  return (
    <React.Fragment>
      <MHeader back title="Heat Pumps" sub={HP_UNITS.length + " units · " + running + " running"} />
      <PullScroll><div className="m-pad">
        {HP_UNITS.map((u) => (
          <div key={u.name} className="mc mc-pad" style={{ marginBottom: 10 }}>
            <div className="m-inline" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <div><div style={{ fontSize: 14.5, fontWeight: 700 }}>{u.name}</div><div className="m-lrow-s">{u.scope}</div></div>
              <MBadge level={u.status === "ok" ? "ok" : u.status}>{u.status === "ok" ? "RUNNING" : "STOPPED"}</MBadge>
            </div>
            <div className="mratn-fields">
              {u.rows.map(([l, v]) => <div key={l} className="mratn-frow ro"><span className="mratn-fl" style={{ width: 150 }}>{l}</span><span className="mratn-fv">{v}</span></div>)}
            </div>
          </div>
        ))}
        <div className="m-de-help">Facility utility, outside the building hierarchy. Control is a control-room task.</div>
      </div></PullScroll>
    </React.Fragment>
  );
}

// ---------- fish-movement register (desktop: tank dock → Fish tab) ----------
const M_MOVE_LS = "nj_mobile_fishmove_v1";
const mMoveStore = {
  rows: (() => { try { const r = JSON.parse(localStorage.getItem(M_MOVE_LS)); return r && typeof r === "object" ? r : {}; } catch (e) { return {}; } })(),
  subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.rows; },
  write() { try { localStorage.setItem(M_MOVE_LS, JSON.stringify(this.rows)); } catch (e) {} this.subs.forEach((f) => f()); },
  add(tag, kind, n) { const cur = this.rows[tag] || { dead: 0, extracted: 0, added: 0 }; this.rows = { ...this.rows, [tag]: { ...cur, [kind]: (cur[kind] || 0) + n } }; this.write(); },
  reset(tag) { this.rows = { ...this.rows, [tag]: { dead: 0, extracted: 0, added: 0 } }; this.write(); },
};
function useMMove() { return React.useSyncExternalStore(mMoveStore.sub.bind(mMoveStore), mMoveStore.snap.bind(mMoveStore)); }
const M_MOVE_KINDS = [["dead", "Dead fish", "fish-off"], ["extracted", "Fish extracted", "arrow-up-right"], ["added", "Fish added", "arrow-down-left"]];

function MFishMoveSheet({ tank, kind }) {
  const [k, setK] = React.useState(kind || "dead");
  const [n, setN] = React.useState("");
  const [note, setNote] = React.useState("");
  const num = parseInt(n, 10);
  const valid = num > 0;
  const label = (M_MOVE_KINDS.find((x) => x[0] === k) || M_MOVE_KINDS[0])[1];
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">Register fish movement</div>
        <div className="tag" style={{ fontSize: 11, marginBottom: 12 }}>{tank.name} · {tank.tag}</div>
        <div className="m-note-field-l">Type</div>
        <div className="m-seg">{M_MOVE_KINDS.map(([key, l]) => <button key={key} className={k === key ? "on" : ""} onClick={() => setK(key)}>{key === "dead" ? "Dead" : key === "extracted" ? "Extracted" : "Added"}</button>)}</div>
        <div className="m-note-field-l" style={{ marginTop: 14 }}>Count</div>
        <input className="m-input" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Number of fish" autoFocus />
        <textarea className="m-note-ta" rows={2} style={{ minHeight: 54, marginTop: 12 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comment (optional)…" />
        <div className="m-de-help" style={{ marginTop: 8 }}>Counts roll into today's total and the daily maneuver log.</div>
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!valid} onClick={() => {
            mMoveStore.add(tank.tag, k, num); mCloseSheet();
            mToast(num + " · " + label.toLowerCase() + " registered", "check", { label: "Undo", fn: () => mMoveStore.add(tank.tag, k, -num) });
          }}><MIcon name="check" size={16} /> Register</button>
        </div>
      </div>
    </div>
  );
}

function MFishRegister({ tank }) {
  const all = useMMove();
  const cur = all[tank.tag] || { dead: 0, extracted: 0, added: 0 };
  return (
    <React.Fragment>
      <div className="m-eyebrow">Fish register · today</div>
      <div className="m-list">
        {M_MOVE_KINDS.map(([k, l, icon]) => (
          <button key={k} className="m-lrow" onClick={() => mSheet(<MFishMoveSheet tank={tank} kind={k} />)}>
            <span className="m-lrow-ic"><MIcon name={icon} size={17} /></span>
            <div className="m-lrow-main"><div className="m-lrow-t">{l}</div><div className="m-lrow-s">Tap to register a count</div></div>
            <span className="m-lrow-r"><span className="data" style={{ fontSize: 15, fontWeight: 700, color: cur[k] ? "var(--ink)" : "var(--slate-400)" }}>{cur[k] || 0}</span><MIcon name="plus" size={16} color="var(--slate-400)" /></span>
          </button>
        ))}
      </div>
      <div className="m-actions">
        <button className="m-btn m-btn-secondary" onClick={() => mConfirm({
          title: "Reset " + tank.name + "?", danger: true, confirmLabel: "Reset tank",
          body: "Clears the fish register for this tank (population, biomass and movement counters set to zero). Use when re-stocking.",
          onConfirm: () => { mMoveStore.reset(tank.tag); mToast(tank.name + " register reset · logged to maneuver history", "rotate-ccw"); },
        })}><MIcon name="rotate-ccw" size={16} /> Reset tank</button>
        <button className="m-btn m-btn-primary" onClick={() => mSheet(<MFishMoveSheet tank={tank} />)}><MIcon name="plus" size={17} /> Register movement</button>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { EnergyScreen, MHeatPumpsScreen, mMoveStore, useMMove, MFishMoveSheet, MFishRegister });
