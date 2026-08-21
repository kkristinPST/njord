// tank-vitals.jsx — comparative "tank vitals" rail: every tank in a department on ONE shared
// scale per parameter, so the outlier is found by shape, not by reading six cards.
// Mirrors what the legacy DPT screen did with its Oxygen / Level gauge banks (and the pump-sump
// column beside them), rebuilt in the NJORD language: hairline tracks, alarm band as a tint,
// setpoint as a tick, value in mono, colour only when a value leaves its band.
// Used by the Dashboard (department picker) and by the Fish Tank screen (current department).

const TV_O2 = { min: 74, max: 100, unit: "%" };
const TV_LVL = { min: 180, max: 220, unit: "cm" };
const TV_SUMP = { min: 150, max: 230, unit: "cm" };

function tvSeed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
function tvTankCount(dept) { return { "Grow-out": 6, "Start-Feeding": 6 }[dept && dept.sub] || 4; }

// DPT1 reads the real panel data (single source of truth with the Fish Tank screen); every
// other department gets a deterministic set so the rail is honest about scope.
function njVitalTanks(buildingId, deptId) {
  const bld = FACILITY.find((b) => b.id === buildingId) || FACILITY[0];
  const dept = bld.depts.find((d) => d.id === deptId) || bld.depts[0];
  if (deptId === "b1-d1" && window.TANK_PANELS) {
    return window.TANK_PANELS.map((t) => ({
      n: t.n, tag: t.tag, o2: t.o2, level: t.level, active: t.active, feeding: t.feeding,
      sp: t.o2sp, emg: t.emgLimit, hyst: t.hyst, lvlLo: 185, lvlHi: 215,
    }));
  }
  const base = tvSeed(bld.id + deptId);
  return Array.from({ length: tvTankCount(dept) }, (_, i) => {
    const h = (base + i * 137) % 997;
    const o2 = +(84 + (h % 13) * 0.62 - (i === (h % 5) ? 4.4 : 0)).toFixed(1);
    return {
      n: i + 1, tag: dept.name + "-FTA" + (i + 1), o2,
      level: 196 + (h % 17), active: !((h + i) % 11 === 0), feeding: (h + i) % 7 !== 0,
      sp: 90, emg: 82, hyst: 2.5, lvlLo: 185, lvlHi: 215,
    };
  });
}
function njSumpVital(buildingId, deptId) {
  const bld = FACILITY.find((b) => b.id === buildingId) || FACILITY[0];
  const dept = bld.depts.find((d) => d.id === deptId) || bld.depts[0];
  if (deptId === "b1-d1") return { tag: "DPT1-SMP0-LT1", level: 193, pumpTag: "DPT1-FTA0-PU1", hz: 0, running: false };
  const h = tvSeed(bld.id + deptId + "sump");
  return { tag: dept.name + "-SMP0-LT1", level: 172 + (h % 42), pumpTag: dept.name + "-FTA0-PU1", hz: h % 3 === 0 ? 0 : 28 + (h % 14), running: h % 3 !== 0 };
}

function tvO2State(t, v) {
  if (!t.active) return "off";
  if (v < t.emg) return "critical";
  if (v < t.sp - (t.hyst || 0)) return "high";
  return "ok";
}
function tvLvlState(t, v) { return !t.active ? "off" : (v < t.lvlLo || v > t.lvlHi) ? "high" : "ok"; }
function tvPct(v, sc) { return Math.max(0, Math.min(100, ((v - sc.min) / (sc.max - sc.min)) * 100)); }

// One vertical gauge: alarm band as a tint on the track, setpoint as a tick, fill to value.
function TvGauge({ value, scale, state, band, sp, title }) {
  return (
    <div className={"tv-gauge tv-" + state} title={title}>
      {band && <span className="tv-band" style={{ height: tvPct(band, scale) + "%" }} />}
      <span className="tv-fill" style={{ height: tvPct(value, scale) + "%" }} />
      {sp != null && <span className="tv-sp" style={{ bottom: tvPct(sp, scale) + "%" }} />}
      <span className="tv-mark" style={{ bottom: tvPct(value, scale) + "%" }} />
    </div>
  );
}

// slow live tick — values wander a little so the rail reads as instrumentation, not a static png
function useVitalsTick() {
  const [k, f] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { const id = setInterval(f, 5000); return () => clearInterval(id); }, []);
  return k;
}
function tvWander(v, seed, k, amp) { return +(v + Math.sin((seed + k) * 1.7) * amp).toFixed(1); }

function njGoTankScreen(buildingId, deptId) {
  setCtx(buildingId, deptId);
  window.__njNavSub = "Fish Tank";
  if (window.__njDeptTab) window.__njDeptTab("Fish Tank");
  if (window.__njNavigate) window.__njNavigate("navigation");
}

function TankVitalsRail({ buildingId, deptId, onOpen }) {
  const k = useVitalsTick();
  const tanks = njVitalTanks(buildingId, deptId);
  const sump = njSumpVital(buildingId, deptId);
  const open = onOpen || (() => njGoTankScreen(buildingId, deptId));
  const sumpLvl = Math.round(sump.level + Math.sin((sump.level + k) * 0.9) * 2);
  return (
    <div className="tv-rail">
      <div className="tv-tanks">
        {tanks.map((t) => {
          const o2 = t.active ? tvWander(t.o2, t.n, k, 0.35) : 0;
          const lvl = t.active ? Math.round(t.level + Math.sin((t.n + k) * 1.1) * 1.5) : 0;
          const so2 = tvO2State(t, o2), sl = tvLvlState(t, lvl);
          const worst = so2 === "critical" ? "critical" : (so2 === "high" || sl === "high") ? "high" : so2 === "off" ? "off" : "ok";
          return (
            <div key={t.n} className={"tv-tank tv-w-" + worst} role="button" onClick={() => open(t)} {...njActivate(() => open(t))}
              aria-label={"Tank " + t.n + ": " + (t.active ? "O₂ " + o2 + " percent, level " + lvl + " centimetres" : "deactivated")}>
              <div className="tv-gauges">
                <div className="tv-g">
                  <TvGauge value={t.active ? o2 : TV_O2.min} scale={TV_O2} state={so2} band={t.emg} sp={t.sp} title={"O₂ " + o2 + " % · setpoint " + t.sp + " % · emergency " + t.emg + " %"} />
                  <span className={"tv-val data tv-" + so2}>{t.active ? o2.toFixed(1) : "—"}</span>
                  <span className="tv-cap">O₂ %</span>
                </div>
                <div className="tv-g">
                  <TvGauge value={t.active ? lvl : TV_LVL.min} scale={TV_LVL} state={sl} title={"Level " + lvl + " cm · band " + t.lvlLo + "–" + t.lvlHi + " cm"} />
                  <span className={"tv-val data tv-" + sl}>{t.active ? lvl : "—"}</span>
                  <span className="tv-cap">cm</span>
                </div>
              </div>
              <span className="tv-tname">Tank {t.n}</span>
              <span className="tv-tstate">{!t.active ? "Deactivated" : t.feeding ? "Feeding" : "Idle"}</span>
            </div>
          );
        })}
      </div>
      <div className="tv-sump">
        <div className="tv-gauges">
          <div className="tv-g">
            <TvGauge value={sumpLvl} scale={TV_SUMP} state="ok" title={"Pump sump level " + sumpLvl + " cm"} />
            <span className="tv-val data">{sumpLvl}</span>
            <span className="tv-cap">cm</span>
          </div>
        </div>
        <span className="tv-tname">Pump sump</span>
        <span className="tag tv-tag">{sump.tag}</span>
        <span className={"tv-pump" + (sump.running ? " on" : "")}>
          <Dot level={sump.running ? "ok" : "low"} size={6} /> <span className="data">{sump.hz}</span> <span className="u">Hz</span>
        </span>
      </div>
    </div>
  );
}

// ---- Dashboard card: same rail, with a department picker (the dashboard is facility-wide) ----
const TV_LS = "nj_dash_vitals_dept_v1";
function tvDeptOpts() {
  const out = [];
  FACILITY.forEach((b) => b.depts.forEach((d) => { if (d.systems.some((s) => s.label === "Fish Tank")) out.push({ b, d }); }));
  return out;
}
function DashTankVitals() {
  const opts = tvDeptOpts();
  const [sel, setSel] = React.useState(() => {
    try { const v = localStorage.getItem(TV_LS); if (v && opts.some((o) => o.d.id === v)) return v; } catch (e) {}
    return opts[0].d.id;
  });
  const cur = opts.find((o) => o.d.id === sel) || opts[0];
  const pick = (id) => { setSel(id); try { localStorage.setItem(TV_LS, id); } catch (e) {} };
  return (
    <div className="card dash-vitals">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="gauge" size={17} color="var(--slate-600)" />
          <span className="card-title">Tank Vitals</span>
          <span className="caption">O₂ saturation · water level · pump sump</span>
        </div>
        <div className="card-head-r tv-head-r">
          <select className="nj-select" value={sel} onChange={(e) => pick(e.target.value)} aria-label="Department">
            {FACILITY.map((b) => {
              const ds = opts.filter((o) => o.b.id === b.id);
              if (!ds.length) return null;
              return <optgroup key={b.id} label={b.name}>{ds.map((o) => <option key={o.d.id} value={o.d.id}>{o.d.name} · {o.d.sub}</option>)}</optgroup>;
            })}
          </select>
          <button className="linkbtn" onClick={() => njGoTankScreen(cur.b.id, cur.d.id)}>Fish Tank <Icon name="arrow-up-right" size={13} /></button>
        </div>
      </div>
      <div className="card-body tv-body">
        <TankVitalsRail buildingId={cur.b.id} deptId={cur.d.id} />
      </div>
    </div>
  );
}

Object.assign(window, { TankVitalsRail, DashTankVitals, njVitalTanks, njSumpVital, njGoTankScreen });
