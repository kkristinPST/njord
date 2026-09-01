// mbbr-startup.jsx — Analytics · Biofilter Maturation tab (legacy "MBBR Startup" / "MBBR Maturation").
// Before a department is stocked, the MBBR is matured: ammonia is dosed to feed the nitrifiers,
// bicarbonate replaces the alkalinity nitrification consumes, and phosphate/feed keep the culture
// growing. Each day the operator measures NH₄-N / NO₂-N / NO₃-N, the system estimates the dose
// needed, and the operator records what was actually dosed.
// Legacy split estimate and actual into eight separate columns; here each chemical is ONE column —
// the dosed figure with its estimate underneath — so plan vs actual reads without scrolling.

// CmCell / cmFmt / cmKeyOf / cmDayOf / cmHash / cmRng / CM_USER come from screens/commissioning.jsx,
// which build.mjs concatenates immediately before this file — they are already in top-level scope.
// Do NOT re-alias them off window (`const { CmCell, ... } = window`): separate <script> tags each
// had their own scope, but in the bundle that redeclares commissioning.jsx's own names and the
// collision guard fails the whole build.

const MB_KEY = "nj_mbbr_startup_v1";
const MB_TODAY = new Date(2026, 2, 4);
const MB_ELAPSED = 178;                                  // maturation day of MB_TODAY
const MB_VOL = 200;                                      // m³ in circulation, drives the dose model

const MB_N = [
  { id: "nh4", label: "NH₄-N", unit: "mg/L", dec: 2, band: { max: 8 } },
  { id: "no2", label: "NO₂-N", unit: "mg/L", dec: 2, band: { max: 1 } },
  { id: "no3", label: "NO₃-N", unit: "mg/L", dec: 1, band: {} },
];
// the rest of the legacy sheet: maturation volume, alkalinity, pH and temperature
const MB_WQ = [
  { id: "vol", label: "Maturation volume", unit: "m³", dec: 0, band: {} },
  { id: "alk", label: "Alkalinity", unit: "mg/L CaCO₃", dec: 0, band: {} },
  { id: "ph", label: "pH sample", unit: "", dec: 2, band: { min: 6.8, max: 7.8 } },
  { id: "temp", label: "Temperature sample", unit: "°C", dec: 1, band: {} },
  { id: "o2", label: "O₂ sample", unit: "%", dec: 1, band: {} },
  { id: "sal", label: "Salinity", unit: "ppt", dec: 1, band: {} },
];
const MB_MEAS = [...MB_N, ...MB_WQ];
// read straight off the plant — never typed. (Ticket: "choose which values are logged
// manually and which tags are pulled automatically".)
const MB_AUTO = [
  { id: "mkflow", label: "Make-up water flow", unit: "m³/h", dec: 2, tag: "MBB0-FT01", base: 1.1, amp: .3 },
  { id: "level", label: "Level in MBBR", unit: "cm", dec: 2, tag: "MBB0-LT01", base: 240, amp: 1.2 },
  { id: "ph1", label: "pH 1 in pump sump", unit: "", dec: 2, tag: "SMP0-QT01", base: 7.7, amp: .4 },
  { id: "ph2", label: "pH 2 in pump sump", unit: "", dec: 2, tag: "SMP0-QT02", base: 7.6, amp: .4 },
  { id: "co2s", label: "CO₂ in pump sump", unit: "mg/L", dec: 2, tag: "SMP0-QT03", base: 1.1, amp: .5 },
  { id: "flowib", label: "Flow to instrument bucket", unit: "m³/h", dec: 2, tag: "MBB0-FT02", base: .8, amp: .3 },
  { id: "tsump", label: "Temperature in pump sump", unit: "°C", dec: 2, tag: "SMP0-TT01", base: 19, amp: 4 },
  { id: "lye1", label: "Lye pump 1", unit: "%", dec: 2, tag: "LYE0-PU01", base: 0, amp: .01 },
  { id: "lye2", label: "Lye pump 2", unit: "%", dec: 2, tag: "LYE0-PU02", base: 0, amp: .01 },
  { id: "flowtx", label: "Flow through top exchanger", unit: "m³/h", dec: 2, tag: "HEX0-FT01", base: 6, amp: 6 },
  { id: "ttx", label: "Temperature after top exchanger", unit: "°C", dec: 2, tag: "HEX0-TT01", base: 15, amp: 5 },
  { id: "blw1", label: "MBBR blower 1", unit: "Hz", dec: 0, tag: "MBB0-JK01", base: 20, amp: 20 },
  { id: "blw2", label: "MBBR blower 2", unit: "Hz", dec: 0, tag: "MBB0-JK02", base: 30, amp: 12 },
  { id: "exfan", label: "MBBR extraction fan", unit: "Hz", dec: 0, tag: "MBB0-JK03", base: 0, amp: .5 },
  { id: "wnh4", label: "Wrt / NH₄-N", unit: "mg/L", dec: 2, tag: "WRT0-QT01", base: .6, amp: .5 },
  { id: "wno2", label: "Wrt / NO₂-N", unit: "mg/L", dec: 2, tag: "WRT0-QT02", base: .5, amp: .5 },
  { id: "wno3", label: "Wrt / NO₃-N", unit: "mg/L", dec: 1, tag: "WRT0-QT03", base: 24, amp: 8 },
];
function mbAutoVal(a, day, h) { const k = (Math.sin((day * 13 + h % 97) / 7) + 1) / 2; return +(a.base + k * a.amp).toFixed(a.dec); }
const MB_CHEM = [
  { id: "nh4cl", label: "NH₄Cl", unit: "kg", dec: 2, why: "Ammonia source. 3.82 kg per kg NH₄-N (53.49/14.01) to bring the loop back to the target." },
  { id: "nahco3", label: "NaHCO₃", unit: "kg", dec: 2, why: "Alkalinity. Nitrification consumes 7.05 g CaCO₃ per g NH₄-N oxidised; NaHCO₃ supplies 1 g CaCO₃ per 1.68 g (11.8 kg per kg N), plus any top-up to the alkalinity floor." },
  { id: "feed", label: "Fish feed", unit: "kg", dec: 2, why: "Organic load for the heterotrophic fraction of the biofilm, 4 g per m³ per day." },
  { id: "na2hpo4", label: "Na₂HPO₄", unit: "kg", dec: 2, why: "Phosphate. 4.58 kg per kg PO₄-P (141.96/30.97) to 0.5 mg/L, weekly; nitrifiers stall without P." },
];
const MB_EXTRA_CHEM = [
  { id: "nano2", label: "NaNO₂", unit: "kg", dec: 2, why: "Nitrite spike: 4.93 kg per kg NO₂-N (69.00/14.01), dosed when NO₂-N is too low to sustain the nitrite oxidisers." },
  { id: "bact", label: "Bacteria", unit: "L", dec: 2, why: "Commercial nitrifier culture, dosed when maturation stalls." },
];
const MB_NAOH = { id: "naoh", label: "NaOH (lye)", unit: "kg", dec: 2, why: "pH correction: 5.71 kg per kg NH₄-N oxidised (2 mol H⁺ per mol N). Bicarbonate then covers the carbonate share only." };
const MB_CIRC = ["Custom", "Recirculating", "Once-through", "Isolated loop"];
const MB_PH_STRAT = [{ id: "nahco3", label: "Bicarbonate (NaHCO₃)" }, { id: "lye", label: "Lye (NaOH)" }];
const mbChems = (strat) => (strat === "lye" ? [...MB_CHEM, ...MB_EXTRA_CHEM, MB_NAOH] : [...MB_CHEM, ...MB_EXTRA_CHEM]);

const mbOut = (m, v) => (v == null || m.band.max == null ? null : (v > m.band.max ? "high" : null));
function mbDateOf(day) { const d = new Date(MB_TODAY); d.setDate(d.getDate() - (MB_ELAPSED - day)); return d; }
const mbWeek = (day) => Math.ceil(day / 7);
const MB_TODAY_KEY = cmKeyOf(MB_TODAY);
const mbDayOf = (key) => { const [y, m, d] = key.split("-").map(Number); return MB_ELAPSED - Math.round((MB_TODAY - new Date(y, m - 1, d)) / 864e5); };

// ── the maturation curve: ammonia oxidisers first, nitrite oxidisers behind them ──
function mbCurve(day, h) {
  const j = (n) => ((h >> n) & 15) / 15;
  const nh4 = day < 30 ? 9 + j(0) * 5 - day * .12 : Math.max(.3, 5.4 * Math.exp(-(day - 30) / 26) + .35 + j(1) * .5);
  const no2 = day < 18 ? .04 + day * .01 : Math.max(.01, 7.5 * Math.exp(-Math.pow((day - 46) / 26, 2)) + .02 + j(2) * .06);
  const no3 = Math.min(38, 1.2 + Math.log(1 + day) * 6.4 + day * .04 + j(3) * 1.4);
  const alk = Math.max(28, 96 - day * .28 + j(4) * 14);
  return { nh4: +nh4.toFixed(2), no2: +no2.toFixed(2), no3: +no3.toFixed(1),
    vol: 189 + Math.round(j(5) * 20), alk: +alk.toFixed(0), ph: +(7.2 + j(6) * .5 - .2).toFixed(2),
    temp: +(12 + j(7) * 3).toFixed(1), o2: +(95 + j(0) * 12).toFixed(1), sal: +(13.8 + j(1) * 1.4).toFixed(1) };
}
// ── dose model ────────────────────────────────────────────────────────────────────────────────
// Reagent masses are stoichiometric, not fitted: mass = Δconcentration × volume × (g reagent per
// g of the species it carries) ÷ purity. Molar masses NH₄Cl 53.49 · NaHCO₃ 84.01 · NaOH 40.00 ·
// Na₂HPO₄ 141.96 · NaNO₂ 69.00 · N 14.007 · P 30.974 · CaCO₃ 100.09.
//   nitrification: NH₄⁺ + 2O₂ → NO₃⁻ + 2H⁺ + H₂O — 2 mol H⁺ per mol N, i.e. 7.05 g alkalinity
//   as CaCO₃ consumed per g NH₄-N oxidised (the standard RAS figure).
// Don't replace these with tuned constants — an operator checks the estimate against the label.
const MB_TARGET_NH4 = 5;              // mg/L NH₄-N held through maturation
const MB_TARGET_P = .5;               // mg/L PO₄-P, dosed weekly
const MB_TARGET_NO2 = .5;             // mg/L NO₂-N floor for the nitrite oxidisers
const MB_TARGET_ALK = 100;            // mg/L as CaCO₃ — floor, topped up with the daily demand
const MB_FEED_RATE = 4;               // g feed per m³ per day
const MB_ALK_PER_N = 7.05;            // g CaCO₃ consumed per g NH₄-N oxidised
const MB_NAHCO3_PER_ALK = 1.679;      // g NaHCO₃ per g CaCO₃ alkalinity (84.01/50.04)
const MB_STOICH = { nh4cl: 3.819, naoh: 5.712, na2hpo4: 4.583, nano2: 4.926 };
const MB_PURITY = { nh4cl: .995, nahco3: .99, naoh: .99, na2hpo4: .98, nano2: .97 };
// kg of reagent to move a concentration by `delta` mg/L in `vol` m³
const mbDose = (id, delta, vol) => Math.max(0, delta) * vol * MB_STOICH[id] / 1000 / MB_PURITY[id];
// with lye on pH duty, bicarbonate covers only the carbonate share of the base demand
const MB_ALK_SHARE = .45;
// Which measurements each estimate actually needs. The daily dose sheet uses this to say what it
// is WAITING ON rather than printing a confident number off a missing value.
const MB_DEPS = { nh4cl: ["nh4", "vol"], nahco3: ["alk", "vol"], naoh: ["alk", "vol"], feed: ["vol"],
  na2hpo4: ["vol"], nano2: ["no2", "nh4", "vol"], bact: [] };
// volDefault: the circulation volume set on the toolbar, used when the round itself carries no
// measured maturation volume. Optional 4th argument — existing 3-argument callers are unchanged.
function mbEstimate(meas, strat, dayNo, volDefault) {
  const nh4 = meas.nh4 == null ? 0 : meas.nh4;
  const vol = meas.vol == null ? (volDefault == null ? MB_VOL : volDefault) : meas.vol;
  const deficit = Math.max(0, MB_TARGET_NH4 - nh4);                    // mg/L NH₄-N to make up
  const share = strat === "lye" ? MB_ALK_SHARE : 1;
  const alkGap = meas.alk == null ? 0 : Math.max(0, MB_TARGET_ALK - meas.alk);
  const alkNeed = MB_TARGET_NH4 * MB_ALK_PER_N + alkGap;               // mg/L as CaCO₃
  const no2 = meas.no2;
  return {
    nh4cl: +mbDose("nh4cl", deficit, vol).toFixed(2),
    nahco3: +(alkNeed * share * MB_NAHCO3_PER_ALK * vol / 1000 / MB_PURITY.nahco3).toFixed(2),
    naoh: strat === "lye" ? +mbDose("naoh", alkNeed * (1 - share) / MB_ALK_PER_N, vol).toFixed(2) : 0,
    feed: +(vol * MB_FEED_RATE / 1000).toFixed(2),
    na2hpo4: dayNo != null && dayNo % 7 === 0 ? +mbDose("na2hpo4", MB_TARGET_P, vol).toFixed(2) : 0,
    nano2: no2 != null && no2 < .1 && nh4 <= 1 ? +mbDose("nano2", MB_TARGET_NO2 - no2, vol).toFixed(2) : 0,
    bact: 0,
  };
}
function mbStage(r) {
  if (!r || r.meas.nh4 == null) return { n: 1, label: "Seeding", sub: "Waiting on the first measured round" };
  const { nh4, no2, no3 } = r.meas;
  if (no2 != null && no2 > 1) return { n: 2, label: "Nitrite peak", sub: "Ammonia oxidisers active, nitrite oxidisers behind · hold dosing steady" };
  if (nh4 > 3) return { n: 1, label: "Ammonia oxidation starting", sub: "NH₄-N still high · culture not yet consuming the dose" };
  if (nh4 <= 1 && (no2 == null || no2 <= .1) && no3 >= 20) return { n: 4, label: "Matured", sub: "Full nitrification · biofilter ready for stocking" };
  return { n: 3, label: "Nitrite oxidation establishing", sub: "NO₂-N falling and NO₃-N climbing · maturation on track" };
}

function mbGenerate(deptId) {
  const rnd = cmRng(cmHash("mbbr" + deptId));
  const h = cmHash(deptId);
  const rows = [];
  for (let day = 1; day <= MB_ELAPSED; day++) {
    if (day < MB_ELAPSED - 1 && rnd() < .06) continue;
    const meas = mbCurve(day, h);
    if (rnd() < .08) meas.no2 = null;                              // not every species every day
    const est = mbEstimate(meas, "nahco3", day);
    const dosed = {};
    // what was actually dosed tracks the estimate, with the odd skipped or rounded-off dose
    const near = (v) => +(v * (.9 + rnd() * .22)).toFixed(2);
    if (est.nh4cl > 0 && rnd() < .82) dosed.nh4cl = near(est.nh4cl);
    if (rnd() < .88) dosed.nahco3 = near(est.nahco3);
    if (rnd() < .8) dosed.feed = near(est.feed);
    if (est.na2hpo4 > 0 && rnd() < .75) dosed.na2hpo4 = near(est.na2hpo4);
    const hh = 8 + Math.floor(rnd() * 9), mm = Math.floor(rnd() * 60);
    const note = rnd() < .5 ? `CU ${(5 + rnd() * 6).toFixed(1)} · FAU ${Math.round(2 + rnd() * 8)} · Salinity ${(14 + rnd()).toFixed(1)} ppt` : "";
    rows.push({ date: cmKeyOf(mbDateOf(day)), day, week: mbWeek(day), time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      by: rnd() < .3 ? "M. Ødegård" : CM_USER, note, meas, dosed });
  }
  return rows.reverse();
}

const mbStore = {
  edits: null, subs: new Set(), cache: {},
  load() { if (mbStore.edits) return; try { mbStore.edits = JSON.parse(localStorage.getItem(MB_KEY) || "{}"); } catch (e) { mbStore.edits = {}; } },
  persist() { try { localStorage.setItem(MB_KEY, JSON.stringify(mbStore.edits)); } catch (e) {} mbStore.subs.forEach((f) => f()); },
  subscribe(f) { mbStore.subs.add(f); return () => mbStore.subs.delete(f); },
  snap() { mbStore.load(); return mbStore.edits; },
  rows(deptId) {
    mbStore.load();
    if (!mbStore.cache[deptId]) mbStore.cache[deptId] = mbGenerate(deptId);
    const patch = mbStore.edits[deptId] || {};
    const merged = mbStore.cache[deptId].map((r) => (patch[r.date] ? { ...r, ...patch[r.date] } : r));
    Object.keys(patch).forEach((k) => { if (!merged.some((r) => r.date === k)) merged.push(patch[k]); });
    return merged.sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  row(deptId, date) { return mbStore.rows(deptId).find((r) => r.date === date); },
  save(deptId, entry) {
    mbStore.load();
    mbStore.edits = { ...mbStore.edits, [deptId]: { ...(mbStore.edits[deptId] || {}), [entry.date]: entry } };
    mbStore.persist();
  },
  blank(date) { return { date, day: mbDayOf(date), week: mbWeek(mbDayOf(date)), time: "—", by: CM_USER, note: "", meas: {}, dosed: {} }; },
  set(deptId, date, group, key, value) {
    const base = mbStore.row(deptId, date) || mbStore.blank(date);
    const g = { ...base[group] };
    if (value == null) delete g[key]; else g[key] = value;
    mbStore.save(deptId, { ...base, [group]: g });
  },
  setField(deptId, date, field, value) {
    const base = mbStore.row(deptId, date) || mbStore.blank(date);
    mbStore.save(deptId, { ...base, [field]: value });
  },
};
function useMbbr() { return React.useSyncExternalStore(mbStore.subscribe, mbStore.snap); }

function mbDepts() { const out = []; FACILITY.forEach((b) => b.depts.forEach((d) => { if (d.systems.some((s) => /MBBR|RAS/i.test(s.label))) out.push({ b, d }); })); return out; }

/* ── the startup procedure + dose model, as a reference sheet ── */
function MbProcedureDialog({ circ }) {
  const phases = [
    { n: 1, name: "Seeding", target: "NH₄-N 5 mg/L", body: "Fill and circulate, dose NH₄Cl to 5 mg/L NH₄-N and seed with media or sludge from a mature biofilter. Hold temperature and pH; no fish in the loop." },
    { n: 2, name: "Ammonia oxidation", target: "NH₄-N falling · NO₂-N rising", body: "Re-dose NH₄Cl daily to the target. Alkalinity is consumed as nitrification starts, so keep NaHCO₃ dosing ahead of it so pH stays above 7.0." },
    { n: 3, name: "Nitrite peak", target: "NO₂-N ≤ 1 mg/L", body: "Nitrite accumulates before the nitrite oxidisers catch up. Do not increase the ammonia dose through the peak; hold steady and keep dosing phosphate weekly." },
    { n: 4, name: "Maturation", target: "NH₄-N ≤ 1 · NO₂-N ≤ 0.1 · NO₃-N ≥ 20", body: "Both species convert within 24 h of dosing. Three consecutive rounds inside the targets and the biofilter is ready for stocking." },
  ];
  return (
    <Dialog width={720}>
      <DlgHeader icon="list-checks" name="Startup procedure" tag={"Circulation · " + circ} onClose={closeDialog} />
      <div className="dlg-body mb-proc">
        <ol className="mb-phases">
          {phases.map((p) => (
            <li key={p.n} className="mb-phase">
              <span className="mb-phase-n data">{p.n}</span>
              <div>
                <div className="mb-phase-h"><span className="mb-phase-name">{p.name}</span><span className="mb-phase-t data">{p.target}</span></div>
                <p className="mb-phase-b">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mb-model">
          <span className="eyebrow">Dose model</span>
          <p className="mb-model-note">Every estimate is stoichiometric: <span className="data">Δ mg/L × m³ × g/g ÷ purity</span>. It uses the round's own maturation volume (<span className="data">{MB_VOL} m³</span> when none is logged), a target of <span className="data">{MB_TARGET_NH4} mg/L</span> NH₄-N and an alkalinity floor of <span className="data">{MB_TARGET_ALK} mg/L</span> CaCO₃.</p>
          <ul className="mb-model-list">
            {MB_CHEM.map((c) => <li key={c.id}><span className="mb-model-c">{c.label}</span> {c.why}</li>)}
          </ul>
        </div>
      </div>
      <div className="dlg-foot"><button className="btn btn-secondary" onClick={closeDialog}>Close</button></div>
    </Dialog>
  );
}

/* ── log a round: measured species + what was actually dosed ── */
function MbLogDialog({ deptId, deptLabel, entry, strat = "nahco3" }) {
  const editing = !!entry;
  const [date, setDate] = React.useState(entry ? entry.date : MB_TODAY_KEY);
  const [time, setTime] = React.useState(entry && entry.time !== "—" ? entry.time : "08:00");
  const [note, setNote] = React.useState(entry ? entry.note : "");
  const [meas, setMeas] = React.useState(() => ({ ...(entry ? entry.meas : {}) }));
  const [dosed, setDosed] = React.useState(() => ({ ...(entry ? entry.dosed : {}) }));
  const num = (o) => { const out = {}; Object.keys(o).forEach((k) => { const n = parseFloat(o[k]); if (!isNaN(n)) out[k] = n; }); return out; };
  const est = mbEstimate(num(meas), strat, mbDayOf(date));
  const save = () => {
    mbStore.save(deptId, { date, day: mbDayOf(date), week: mbWeek(mbDayOf(date)), time, by: CM_USER, note: note.trim(), meas: num(meas), dosed: num(dosed) });
    njToast(`${editing ? "Round updated" : "Round logged"} · ${cmFmt(date)} ${time} · ${deptLabel}`, "clipboard-check");
    closeDialog();
  };
  return (
    <Dialog width={680}>
      <DlgHeader icon={editing ? "pencil" : "clipboard-list"} name={editing ? "Edit round · " + cmFmt(date) : "Log maturation round"} tag={deptLabel} onClose={closeDialog} />
      <div className="dlg-body cm-form">
        <div className="cm-form-top">
          <label className="de-field"><span className="de-field-l">Date</span><input className="de-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={editing} /></label>
          <label className="de-field"><span className="de-field-l">Time of sampling</span><input className="de-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <div className="de-field"><span className="de-field-l">Maturation day</span><div className="cm-form-day data">{mbDayOf(date) > 0 ? `Day ${mbDayOf(date)} · week ${mbWeek(mbDayOf(date))}` : "—"}</div></div>
        </div>
        <div className="cm-form-sect"><span className="eyebrow">Measured</span><span className="cm-form-hint">Nitrogen species, volume, alkalinity, pH and temperature</span></div>
        <div className="cm-reg-grid">
          {MB_MEAS.map((m) => (
            <label className="cm-inp" key={m.id}>
              <span className="cm-inp-l"><span className="nocaps">{m.label}{m.unit ? " · " + m.unit : ""}</span></span>
              <span className={"cm-inp-w" + (mbOut(m, parseFloat(meas[m.id])) ? " oor" : "")}>
                <input className="de-input data" inputMode="decimal" placeholder="—" value={meas[m.id] == null ? "" : meas[m.id]} onChange={(e) => setMeas((s) => ({ ...s, [m.id]: e.target.value }))} />
              </span>
            </label>
          ))}
        </div>
        <div className="cm-form-sect"><span className="eyebrow">Dosed</span><span className="cm-form-hint">Estimate from the measured values is shown under each field</span></div>
        <div className="mb-dose-grid">
          {mbChems(strat).map((c) => (
            <label className="cm-inp" key={c.id}>
              <span className="cm-inp-l"><span className="nocaps">{c.label}{c.unit ? " · " + c.unit : ""}</span></span>
              <span className="cm-inp-w">
                <input className="de-input data" inputMode="decimal" placeholder="0.00" value={dosed[c.id] == null ? "" : dosed[c.id]} onChange={(e) => setDosed((s) => ({ ...s, [c.id]: e.target.value }))} />
              </span>
              <button type="button" className="mb-est-apply" onClick={() => setDosed((s) => ({ ...s, [c.id]: String(est[c.id]) }))}>
                est <span className="data">{est[c.id].toFixed(2)}</span> · use
              </button>
            </label>
          ))}
        </div>
        <label className="de-field"><span className="de-field-l">Comments / operational notes</span>
          <textarea className="de-input cm-note-in" rows={3} placeholder="Circulation changes, pH strips, media condition…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={save}><Icon name="check" size={16} /> {editing ? "Save" : "Log round"}</button>
      </div>
    </Dialog>
  );
}

/* ── the day's chemical additions: the tab's PRIMARY job ──
   The whole point of the legacy sheet is that an operator fills in the day's readings once and is
   told how much of each chemical to add. That workflow lives here: the day's measured values on
   the left, the calculated additions on the right, recomputed as you type. A chemical whose
   drivers are missing says what it is waiting on instead of printing a number off a zero.
   The log table below is the SECOND job — checking that maturation proceeds as expected. */
function mbHas(meas, k, volDefault) {
  if (k === "vol") return meas.vol != null || volDefault != null;
  const v = meas[k];
  return v != null && v !== "" && !isNaN(parseFloat(v));
}
function MbDoseSheet({ deptId, deptLabel, strat, circ, circVol }) {
  const [date, setDate] = React.useState(MB_TODAY_KEY);
  const existing = mbStore.row(deptId, date);
  // the sheet is seeded from whatever is already logged for the day, so re-opening it continues
  // the day rather than starting a second version of it
  const [meas, setMeas] = React.useState({});
  const [over, setOver] = React.useState({});                 // dose values in the fields
  // A value seeded from an already-logged round was RECORDED, not adjusted by this operator in
  // this session. Only a field they actually typed into may be called adjusted.
  const [touched, setTouched] = React.useState(() => new Set());
  const setDoseField = (id, v) => { setOver((s) => ({ ...s, [id]: v })); setTouched((s) => (s.has(id) ? s : new Set(s).add(id))); };
  const [time, setTime] = React.useState("08:00");
  const [note, setNote] = React.useState("");
  React.useEffect(() => {
    const r = mbStore.row(deptId, date);
    const m = {}, o = {};
    if (r) { Object.keys(r.meas).forEach((k) => { m[k] = String(r.meas[k]); }); Object.keys(r.dosed).forEach((k) => { o[k] = String(r.dosed[k]); }); }
    setMeas(m); setOver(o); setTouched(new Set());
    setTime(r && r.time !== "—" ? r.time : "08:00");
    setNote(r ? r.note : "");
  }, [deptId, date]);
  const num = (o) => { const out = {}; Object.keys(o).forEach((k) => { const n = parseFloat(o[k]); if (!isNaN(n)) out[k] = n; }); return out; };
  const nm = num(meas);
  const dayNo = mbDayOf(date);
  const est = mbEstimate(nm, strat, dayNo, circVol);
  const chems = mbChems(strat);
  const filled = MB_MEAS.filter((m) => mbHas(nm, m.id, m.id === "vol" ? circVol : null)).length;
  const waiting = chems.filter((c) => (MB_DEPS[c.id] || []).some((k) => !mbHas(nm, k, k === "vol" ? circVol : null)));
  const ready = chems.filter((c) => !waiting.includes(c));
  const doseOf = (c) => (over[c.id] != null && over[c.id] !== "" ? parseFloat(over[c.id]) : est[c.id]);
  const logDay = () => {
    const dosed = {};
    ready.forEach((c) => { const v = doseOf(c); if (!isNaN(v) && v > 0) dosed[c.id] = +v.toFixed(2); });
    mbStore.save(deptId, { date, day: dayNo, week: mbWeek(dayNo), time, by: CM_USER, note: note.trim(),
      meas: nm.vol == null && circVol != null ? { ...nm, vol: circVol } : nm, dosed });
    njToast(`Day logged · ${cmFmt(date)} · ${Object.keys(dosed).length} chemical additions recorded`, "clipboard-check");
    setTouched(new Set());
  };
  return (
    <div className="card mbd">
      <div className="card-head">
        <div className="card-head-l">
          <Icon name="flask-conical" size={16} color="var(--slate-600)" />
          <span className="card-title">Daily chemical additions</span>
          <span className="caption">Fill the day&rsquo;s readings · the model returns the dose for each chemical</span>
        </div>
        <div className="card-head-r mbd-head-r">
          <label className="mbd-datef"><span className="mbd-datel">Day</span>
            <input className="de-input mbd-date" type="date" value={date} max={MB_TODAY_KEY} onChange={(e) => setDate(e.target.value)} aria-label="Day being logged" /></label>
          <span className="mbd-day data">{dayNo > 0 ? `Day ${dayNo} · week ${mbWeek(dayNo)}` : "—"}</span>
        </div>
      </div>
      <div className="card-body mbd-body">
        <div className="mbd-col">
          <div className="mbd-colh"><span className="eyebrow">Measured today</span><span className="mbd-prog data">{filled} / {MB_MEAS.length}</span></div>
          <div className="mbd-grid">
            {MB_MEAS.map((m) => {
              const inherited = m.id === "vol" && !mbHas(nm, "vol", null) && circVol != null;
              return (
                <label className="mbd-inp" key={m.id}>
                  <span className="mbd-inp-l"><span className="nocaps">{m.label}</span>{m.unit ? <span className="mbd-u data">{m.unit}</span> : null}</span>
                  <span className={"cm-inp-w" + (mbOut(m, parseFloat(meas[m.id])) ? " oor" : "")}>
                    <input className="de-input data" inputMode="decimal" placeholder={inherited ? String(circVol) : "—"}
                      value={meas[m.id] == null ? "" : meas[m.id]} onChange={(e) => setMeas((s) => ({ ...s, [m.id]: e.target.value }))} />
                  </span>
                  {inherited && <span className="mbd-inherit">from circulation</span>}
                </label>
              );
            })}
          </div>
          <div className="mbd-meta">
            <label className="mbd-inp mbd-inp-w"><span className="mbd-inp-l">Time of sampling</span>
              <input className="de-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="mbd-inp mbd-inp-w"><span className="mbd-inp-l">Comments</span>
              <input className="de-input" placeholder="Circulation changes, media condition…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>
        </div>
        <div className="mbd-col mbd-out">
          <div className="mbd-colh"><span className="eyebrow">Add today</span>
            <span className="mbd-prog data">{ready.length} of {chems.length} calculated</span></div>
          <div className="mbd-doses">
            {chems.map((c) => {
              const blocked = waiting.includes(c);
              const missing = (MB_DEPS[c.id] || []).filter((k) => !mbHas(nm, k, k === "vol" ? circVol : null))
                .map((k) => (MB_MEAS.find((m) => m.id === k) || { label: k }).label);
              const v = doseOf(c);
              const off = over[c.id] != null && over[c.id] !== "" && Math.abs(v - est[c.id]) > 0.005;
              // the model has no opinion on the bacteria culture — it is a human call, so it must
              // never be reported as "not required". Manual case is tested BEFORE the zero case.
              const manual = !MB_DEPS[c.id] || MB_DEPS[c.id].length === 0;
              return (
                <div className={"mbd-dose" + (blocked ? " mbd-blocked" : "") + (!blocked && !manual && v <= 0 ? " mbd-zero" : "")} key={c.id}>
                  <div className="mbd-dose-l">
                    <span className="mbd-dose-n nocaps">{c.label}</span>
                    <span className="mbd-dose-why">{blocked ? "Waiting on " + missing.join(" and ")
                      : manual ? "Manual · dose if maturation stalls"
                      : off ? (touched.has(c.id) ? "Adjusted" : "Recorded") + " · model says " + est[c.id].toFixed(2)
                      : v <= 0 ? "Not required today" : "Model estimate"}</span>
                  </div>
                  {blocked
                    ? <span className="mbd-dose-v data mbd-dash">—</span>
                    : <span className="mbd-dose-vw">
                        <input className="de-input data mbd-dose-in" inputMode="decimal" placeholder={est[c.id].toFixed(2)}
                          value={over[c.id] == null ? "" : over[c.id]} aria-label={c.label + " to add, " + c.unit}
                          onChange={(e) => setDoseField(c.id, e.target.value)} />
                        <span className="mbd-dose-u data">{c.unit}</span>
                      </span>}
                </div>
              );
            })}
          </div>
          <div className="mbd-foot">
            <span className="mbd-foot-t">{waiting.length
              ? waiting.length + " chemical" + (waiting.length === 1 ? "" : "s") + " still waiting on a reading"
              : existing ? "This day is already logged · saving replaces it"
              : "One entry per day · if you dose more than once, record the day's total"}</span>
            <div className="mbd-foot-b">
              <button className="btn btn-primary" disabled={filled === 0} onClick={logDay}><Icon name="check" size={16} /> Log day</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── maturation plotted in the tab, not only exported ──
   All three nitrogen species share mg/L, so one axis carries the whole maturation story. The
   dosing view plots kg dosed per day per chemical against the same day axis. */
function mbUseWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => setW((p) => { const n = el.offsetWidth; return Math.abs(p - n) > 8 ? n : p; });
    const ro = new ResizeObserver(read); ro.observe(el); read();
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
const MB_PALETTE = ["#00AEEE", "#FBA100", "#00C483", "#8B5CF6", "#F53E39", "#0E7490", "#B45309"];
function MbChart({ rows, series, unit, title, sub, pick }) {
  const [ref, w] = mbUseWidth();
  const [hidden, setHidden] = React.useState(() => new Set());
  const data = rows.filter((r) => !r.ghost).slice().sort((a, b) => a.day - b.day);
  const pts = {};
  series.forEach((s) => { pts[s.id] = data.map((r) => ({ day: r.day, date: r.date, v: s.get(r) })).filter((o) => o.v != null); });
  const shown = series.filter((s) => !hidden.has(s.id) && pts[s.id].length);
  const total = shown.reduce((n, s) => n + pts[s.id].length, 0);
  const W = Math.max(600, w || 960), H = 240, L = 58, R = 20, T = 18, B = 32;
  const days = data.map((r) => r.day);
  const dMin = Math.min.apply(null, days.length ? days : [0]), dMax = Math.max.apply(null, days.length ? days : [1]);
  const vals = shown.flatMap((s) => pts[s.id].map((o) => o.v));
  let lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 1;
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * .12; lo -= pad; hi += pad;
  if (lo > 0 && lo < (hi - lo) * .4) lo = 0;
  const X = (d) => L + ((d - dMin) / Math.max(1, dMax - dMin)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, .25, .5, .75, 1].map((f) => lo + f * (hi - lo));
  const step = Math.max(1, Math.ceil(data.length / 8));
  const xlabs = data.filter((r, i) => i % step === 0 || i === data.length - 1);
  const color = (id) => MB_PALETTE[series.findIndex((s) => s.id === id) % MB_PALETTE.length];
  return (
    <div className="card cm-chartcard">
      <div className="cm-chart-head">
        <div className="cm-chart-id">
          <span className="eyebrow">{title}</span>
          <div className="cm-chart-t">{sub}{unit ? <span className="cm-unit"> {unit}</span> : null}</div>
        </div>
        {pick}
        <div className="cm-legend">
          {series.map((s) => (
            <button key={s.id} className={"cm-lg" + (hidden.has(s.id) ? " off" : "")} aria-pressed={!hidden.has(s.id)}
              onClick={() => setHidden((h) => { const n = new Set(h); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
              title={(hidden.has(s.id) ? "Show " : "Hide ") + s.label}>
              <span className="cm-lg-sw" style={{ background: color(s.id) }} />{s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cm-chart" ref={ref}>
        {total < 2
          ? <p className="cm-chart-empty">Not enough logged rounds in this range to plot.</p>
          : (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${sub} over the maturation period`}>
              {ticks.map((t, i) => (
                <g key={i}>
                  <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--border)" strokeWidth="1" />
                  <text x={L - 8} y={Y(t) + 4} textAnchor="end" className="cmc-ax">{t.toFixed(Math.abs(hi - lo) < 4 ? 1 : 0)}</text>
                </g>
              ))}
              {xlabs.map((r) => <text key={r.date} x={X(r.day)} y={H - 10} textAnchor="middle" className="cmc-ax">{r.day}</text>)}
              {shown.map((s) => (
                <g key={s.id}>
                  <path d={pts[s.id].map((o, i) => `${i ? "L" : "M"}${X(o.day)} ${Y(o.v)}`).join(" ")} fill="none" stroke={color(s.id)} strokeWidth="1.8" strokeLinejoin="round" />
                  {pts[s.id].map((o) => (
                    <circle key={o.date} className="cmc-pt" cx={X(o.day)} cy={Y(o.v)} r={2.2} fill={color(s.id)}>
                      <title>{`Day ${o.day} · ${cmFmt(o.date)} · ${s.label} · ${o.v.toFixed(2)}${unit ? " " + unit : ""}`}</title>
                    </circle>
                  ))}
                </g>
              ))}
            </svg>
          )}
      </div>
      <p className="cm-chart-foot">Horizontal axis is the maturation day. Click a legend entry to hide a series.</p>
    </div>
  );
}

function MbbrStartupScreen({ tab, onTab }) {
  useMbbr();
  const opts = mbDepts();
  const [deptId, setDeptId] = React.useState(() => (opts[0] ? opts[0].d.id : ""));
  const [circ, setCirc] = React.useState("Custom");
  // "Custom" circulation asks for the volume the dose model should use — picking Custom without a
  // volume field silently fell back to the 200 m³ fixture, i.e. a confident dose off a guess.
  const [circVol, setCircVol] = React.useState(String(MB_VOL));
  // pH correction is bicarbonate for this project. It is one of a set of per-department settings
  // that get configured on the real site, so it is NOT a control here — too many variables per
  // department for a fit-all picker. The lye path stays in mbChems/mbEstimate for that config.
  const strat = "nahco3";
  const [chart, setChart] = React.useState("n");
  // the series picker lives in the CHART's own head — chips under the table it does not control
  // read as belonging to the table
  const chartPick = (
    <div className="mb-chartpick">
      {[{ k: "n", label: "Nitrogen species" }, { k: "wq", label: "Sample values" }, { k: "dose", label: "Dosed per day" }].map((o) => (
        <button key={o.k} className={"mb-gchip" + (chart === o.k ? " on" : "")} aria-pressed={chart === o.k} onClick={() => setChart(o.k)}>{o.label}</button>
      ))}
    </div>
  );
  const [groups, setGroups] = React.useState(() => ({ n: true, wq: false, dose: true, auto: false }));
  const [range, setRange] = React.useState(30);
  const [edit, setEdit] = React.useState(null);            // {date, col}
  const [flash, setFlash] = React.useState(() => new Set());
  const wrapRef = React.useRef(null);
  const [wrapW, setWrapW] = React.useState(0);
  React.useEffect(() => {
    const el = wrapRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => { const w = el.offsetWidth - 2; setWrapW((prev) => (Math.abs(prev - w) > 8 ? w : prev)); };
    const ro = new ResizeObserver(read); ro.observe(el); read();
    return () => ro.disconnect();
  }, []);

  const scope = opts.find((o) => o.d.id === deptId) || opts[0];
  const deptLabel = scope ? `${scope.b.name} · ${scope.d.name}` : "—";
  const all = scope ? mbStore.rows(scope.d.id) : [];
  const inRange = range === 0 ? all : all.filter((r) => r.day > MB_ELAPSED - range);
  const rows = inRange.some((r) => r.date === MB_TODAY_KEY) ? inRange : [{ ...mbStore.blank(MB_TODAY_KEY), ghost: true }, ...inRange];
  const last = all[0];
  const stage = mbStage(last);
  const volNum = (() => { const n = parseFloat(circVol); return circ === "Custom" && !isNaN(n) && n > 0 ? n : null; })();

  const chems = mbChems(strat);
  const measCols = [...(groups.n ? MB_N : []), ...(groups.wq ? MB_WQ : [])];
  const doseCols = groups.dose ? chems : [];
  const autoCols = groups.auto ? MB_AUTO : [];
  const deptHash = cmHash(deptId);
  const cols = [...measCols.map((m) => "m:" + m.id), ...doseCols.map((c) => "d:" + c.id), "note"];
  const move = (dx, dy) => {
    if (!edit || (dx === 0 && dy === 0)) return setEdit(null);
    let ci = cols.indexOf(edit.col), ri = rows.findIndex((r) => r.date === edit.date);
    ci += dx; ri += dy;
    if (ci < 0) { ci = cols.length - 1; ri -= 1; }
    if (ci > cols.length - 1) { ci = 0; ri += 1; }
    if (ri < 0 || ri > rows.length - 1) return setEdit(null);
    setEdit({ date: rows[ri].date, col: cols[ci] });
  };
  const commit = (date, col, v) => {
    if (v === undefined) return;
    const row = mbStore.row(deptId, date);
    if (col === "note") {
      const next = String(v).trim();
      if (((row && row.note) || "") === next) return;
      mbStore.setField(deptId, date, "note", next);
    } else {
      const [g, key] = col.split(":");
      const group = g === "m" ? "meas" : "dosed";
      const prev = row && row[group] ? row[group][key] : null;
      if ((prev == null ? null : prev) === (v === "" ? null : v)) return;
      mbStore.set(deptId, date, group, key, v);
    }
    setFlash((s) => new Set(s).add(date));
    setTimeout(() => setFlash((s) => { const n = new Set(s); n.delete(date); return n; }), 3400);
  };

  // column budget. The full legacy sheet is wider than any screen, so past a point the
  // table scrolls horizontally with Date frozen — it never squeezes columns unreadable.
  const MB_FIXED = 150 + 62 + 62 + 84 + 44, VMIN = 116, VMAX = 152, CMIN = 118, CMAX = 168, NMIN = 220, NMAX = 460;
  const nMeas = measCols.length, nDose = doseCols.length;
  const avail = Math.max(0, wrapW - MB_FIXED);
  const vW = wrapW ? Math.min(VMAX, Math.max(VMIN, Math.round((avail - NMIN - CMIN * nDose) / Math.max(nMeas, 1)))) : VMIN;
  const cW = wrapW ? Math.min(CMAX, Math.max(CMIN, Math.round((avail - NMIN - vW * nMeas) / Math.max(nDose, 1)))) : CMIN;
  const nW = wrapW ? Math.min(NMAX, Math.max(NMIN, avail - vW * nMeas - cW * nDose)) : NMIN;
  const fW = groups.auto ? 0 : Math.max(0, avail - vW * nMeas - cW * nDose - nW);

  return (
    <AppShell active="analytics" title="Analytics" crumbs={["Biofilter Maturation"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Fill the day&rsquo;s readings and the model returns the chemical additions to make. The log below keeps the record and shows whether maturation is proceeding as expected.</p>
          </div>
          <div className="pagehead-right">{window.AnalyticsTabs && <window.AnalyticsTabs active={tab} onChange={onTab} />}</div>
        </div>
      </div>

      <div className="card cm-status mb-status">
        <div className="cm-stat">
          <span className="eyebrow">Maturation day</span>
          <div className="cm-stat-v data">{MB_ELAPSED}<span className="cm-stat-u">week {mbWeek(MB_ELAPSED)}</span></div>
          <div className="cm-stat-sub">Started {cmFmt(cmKeyOf(mbDateOf(1)))}</div>
        </div>
        <div className="cm-stat mb-stagecell">
          <span className="eyebrow">Stage</span>
          <div className="cm-stat-v cm-stat-v-sm">{stage.label}</div>
          <div className="mb-stagebar">{[1, 2, 3, 4].map((n) => <span key={n} className={n <= stage.n ? "on" : ""} />)}</div>
          <div className="cm-stat-sub">{stage.sub}</div>
        </div>
        {MB_N.map((m) => {
          const v = last ? last.meas[m.id] : null;
          return (
            <div className="cm-stat" key={m.id}>
              <span className="eyebrow">{m.label} latest</span>
              <div className={"cm-stat-v data" + (mbOut(m, v) ? " cm-oor" : "")}>{v == null ? "—" : v.toFixed(m.dec)}<span className="cm-stat-u">{m.unit}</span></div>
              <div className="cm-stat-sub">{m.band.max != null ? `Target ≤ ${m.band.max} ${m.unit}` : "Accumulates as maturation completes"}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="rep-toolbar">
          <div className="rep-field">
            <span className="rep-lbl">Department</span>
            <select className="nj-select" value={deptId} onChange={(e) => { setDeptId(e.target.value); setEdit(null); }} aria-label="Department">
              {FACILITY.map((b) => { const ds = opts.filter((o) => o.b.id === b.id); if (!ds.length) return null; return <optgroup key={b.id} label={b.name}>{ds.map((o) => <option key={o.d.id} value={o.d.id}>{o.d.name} · {o.d.sub}</option>)}</optgroup>; })}
            </select>
          </div>
          <div className="rep-field">
            <span className="rep-lbl">Circulation</span>
            <select className="nj-select" value={circ} onChange={(e) => setCirc(e.target.value)} aria-label="Circulation">
              {MB_CIRC.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {circ === "Custom" && (
            <div className="rep-field">
              <span className="rep-lbl">Volume <span className="nocaps">m³</span></span>
              <input className="de-input mb-volin data" inputMode="decimal" value={circVol} placeholder={String(MB_VOL)}
                onChange={(e) => setCircVol(e.target.value)} aria-label="Circulation volume in cubic metres" />
            </div>
          )}
          <div className="rep-field">
            <span className="rep-lbl">Range</span>
            <select className="nj-select" value={range} onChange={(e) => { setRange(Number(e.target.value)); setEdit(null); }} aria-label="Range">
              <option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>Whole startup</option>
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => openDialog(<MbProcedureDialog circ={circ} />)}><Icon name="list-checks" size={16} /> Startup procedure</button>
            <ExportMenu label="Download" describe={(fmt) => "Download started: MBBR startup log · " + deptLabel + " will save as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
          </div>
        </div>
      </div>

      <MbDoseSheet deptId={deptId} deptLabel={deptLabel} strat={strat} circ={circ} circVol={volNum} />

      {chart === "n"
        ? <MbChart rows={rows} unit="mg/L" title="Maturation trend" sub="Nitrogen species" pick={chartPick}
            series={MB_N.map((m) => ({ id: m.id, label: m.label, get: (r) => (r.meas[m.id] == null ? null : r.meas[m.id]) }))} />
        : <MbChart rows={rows} unit={chart === "dose" ? "kg" : ""} title="Maturation trend" sub={chart === "dose" ? "Dosed per day" : "Sample values"} pick={chartPick}
            series={(chart === "dose" ? chems.filter((c) => c.unit === "kg") : MB_WQ).map((c) => ({ id: c.id, label: c.label,
              get: (r) => { const v = chart === "dose" ? r.dosed[c.id] : r.meas[c.id]; return v == null ? null : v; } }))} />}

      <div className="card">
        <div className="cm-chartsel">
          <button className="btn btn-secondary btn-sm mb-logbtn" onClick={() => openDialog(<MbLogDialog deptId={deptId} deptLabel={deptLabel} strat={strat} />)}><Icon name="plus" size={14} /> Log round</button>
        </div>

        <div className="cm-gridhint">
          <Icon name="table-2" size={14} color="var(--slate-400)" />
          <span>Click any cell to edit it. <strong>Tab</strong> moves across, <strong>Enter</strong> down. Each chemical column shows what was <strong>dosed</strong>, with the model's estimate underneath.</span>
          <span className="mb-groups">
            {[{ k: "n", label: "Nitrogen" }, { k: "wq", label: "Sample" }, { k: "dose", label: "Dosing" }, { k: "auto", label: "Plant tags" }].map((g) => (
              <button key={g.k} className={"mb-gchip" + (groups[g.k] ? " on" : "")} aria-pressed={groups[g.k]}
                onClick={() => { setGroups((s) => ({ ...s, [g.k]: !s[g.k] })); setEdit(null); }}>
                <Icon name={groups[g.k] ? "check" : "plus"} size={12} /> {g.label}
              </button>
            ))}
          </span>
        </div>

        <div className="cm-tblwrap" ref={wrapRef}>
          <table className="tbl cm-tbl cm-log mb-log">
            <colgroup>
              <col style={{ width: 150 }} /><col style={{ width: 62 }} /><col style={{ width: 62 }} /><col style={{ width: 84 }} />
              {measCols.map((m) => <col key={m.id} style={{ width: vW }} />)}
              {doseCols.map((c) => <col key={c.id} style={{ width: cW }} />)}
              {autoCols.map((a) => <col key={a.id} style={{ width: 132 }} />)}
              <col style={{ width: nW }} />{fW > 0 && <col style={{ width: fW }} />}<col style={{ width: 44 }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} className="cm-th-d">Date</th>
                <th rowSpan={2} className="cm-th-n">Day</th>
                <th rowSpan={2} className="cm-th-n">Week</th>
                <th rowSpan={2} className="cm-th-n">Sampled</th>
                {nMeas > 0 && <th colSpan={nMeas} className="cm-th-grp">Measured</th>}
                {nDose > 0 && <th colSpan={nDose} className="cm-th-grp">Dosed <span className="cm-th-basis nocaps">estimate below each value</span></th>}
                {autoCols.length > 0 && <th colSpan={autoCols.length} className="cm-th-grp">From plant tags <span className="cm-th-basis nocaps">read-only</span></th>}
                <th rowSpan={2} className="cm-th-note">Comments / operational notes</th>
                {fW > 0 && <th rowSpan={2} className="cm-th-fill" />}
                <th rowSpan={2} className="cm-th-open" aria-label="Open round" />
              </tr>
              <tr>
                {measCols.map((m) => (
                  <th key={m.id} className="cm-th-v" title={m.label + (m.unit ? " · " + m.unit : "")}>
                    <span className="cm-th-vin"><span className="nocaps">{m.label}{m.unit ? " · " + m.unit : ""}</span>
                      <TrendBtn className="cm-trendbtn" id={`MB-${deptId}-${m.id}`.toUpperCase()} name={`${m.label} · MBBR maturation`} unit={m.unit} value={last && last.meas[m.id] != null ? last.meas[m.id] : 1} group={"Biofilter maturation · " + deptLabel} title={`Send ${m.label} to trends`} />
                    </span>
                  </th>
                ))}
                {doseCols.map((c) => <th key={c.id} className="cm-th-v" title={c.label + (c.unit ? " · " + c.unit : "") + (c.why ? " · " + c.why : "")}><span className="nocaps">{c.label}{c.unit ? " · " + c.unit : ""}</span></th>)}
                {autoCols.map((a) => (
                  <th key={a.id} className="cm-th-v" title={a.label + (a.unit ? " · " + a.unit : "") + " · " + a.tag}>
                    <span className="cm-th-vin"><span className="nocaps">{a.label}{a.unit ? " · " + a.unit : ""}</span>
                      <TrendBtn className="cm-trendbtn" id={a.tag} name={a.label} unit={a.unit} value={a.base} group={"MBBR · " + deptLabel} title={"Send " + a.label + " to trends"} />
                    </span>
                    <span className="mb-tag data">{a.tag}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const est = mbEstimate(r.meas, strat, r.day, volNum);
                return (
                  <tr key={r.date} className={"cm-row" + (r.ghost ? " cm-ghost" : "") + (flash.has(r.date) ? " row-just-edited" : "")}>
                    <td className="cm-td-d data"><span className="cm-td-din">{cmFmt(r.date)}{r.date === MB_TODAY_KEY && <span className="cm-todaytag">Today</span>}</span></td>
                    <td className="cm-td-n data">{r.day}</td>
                    <td className="cm-td-n data">{r.week}</td>
                    <td className="cm-td-n data">{r.time}</td>
                    {measCols.map((m) => (
                      <td key={m.id} className="cm-td-v cm-td-edit">
                        <CmCell value={r.meas[m.id]} dec={m.dec} oor={mbOut(m, r.meas[m.id])} label={`${m.label} on ${cmFmt(r.date)}`}
                          editing={!!edit && edit.date === r.date && edit.col === "m:" + m.id}
                          onStart={() => setEdit({ date: r.date, col: "m:" + m.id })}
                          onCommit={(v) => commit(r.date, "m:" + m.id, v)} onNav={move} />
                      </td>
                    ))}
                    {doseCols.map((c) => {
                      const dosedV = r.dosed[c.id], estV = est[c.id];
                      const missed = (dosedV == null || dosedV === 0) && estV > 0 && !r.ghost;
                      return (
                        <td key={c.id} className="cm-td-v cm-td-edit mb-td-dose">
                          <CmCell value={dosedV} dec={c.dec} label={`${c.label} dosed on ${cmFmt(r.date)}`}
                            editing={!!edit && edit.date === r.date && edit.col === "d:" + c.id}
                            onStart={() => setEdit({ date: r.date, col: "d:" + c.id })}
                            onCommit={(v) => commit(r.date, "d:" + c.id, v)} onNav={move} />
                          {estV > 0 && <span className={"mb-est data" + (missed ? " mb-est-missed" : "")} title={missed ? "Estimated dose not recorded as dosed" : "Model estimate"}>est {estV.toFixed(2)}</span>}
                        </td>
                      );
                    })}
                    {autoCols.map((a) => (
                      <td key={a.id} className="cm-td-v cm-td-auto data" title={a.tag + " · read from the plant"}>{r.ghost ? <span className="cm-cellempty">—</span> : mbAutoVal(a, r.day, deptHash)}</td>
                    ))}
                    <td className="cm-td-note cm-td-edit">
                      <CmCell text value={r.note} label={`Note on ${cmFmt(r.date)}`}
                        editing={!!edit && edit.date === r.date && edit.col === "note"}
                        onStart={() => setEdit({ date: r.date, col: "note" })}
                        onCommit={(v) => commit(r.date, "note", v)} onNav={move} />
                    </td>
                    {fW > 0 && <td className="cm-td-fill" />}
                    <td className="cm-td-open">
                      <button className="cm-openbtn" title="Edit full round" aria-label={`Edit full round for ${cmFmt(r.date)}`}
                        onClick={() => openDialog(<MbLogDialog deptId={deptId} deptLabel={deptLabel} strat={strat} entry={mbStore.row(deptId, r.date) || mbStore.blank(r.date)} />)}>
                        <Icon name="maximize-2" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

// exported so the mobile Biofilter Maturation screen logs rounds against the SAME store and the
// SAME stoichiometric estimate — never a mobile dose model.
Object.assign(window, { MbbrStartupScreen, mbStore, useMbbr, mbDepts, mbChems, mbEstimate, mbDayOf, mbWeek, mbOut,
  MB_N, MB_WQ, MB_MEAS, MB_TODAY_KEY, MB_PH_STRAT, MB_VOL, MB_DEPS });
