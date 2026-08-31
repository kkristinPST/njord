// maneuver.jsx — Maneuver History: operator-action & setpoint audit trail

// Source filter — the only classification the system can derive reliably (who made the change).
// NOTE: maneuver "type" (setpoint / state / override) is deliberately NOT shown: the platform
// cannot classify parameters reliably, so any type label would be misleading.
const MVR_SOURCES = ["All", "Operator", "Automatic"];

function MvrSourceTabs({ active, onPick }) {
  return (
    <div className="segmented">
      {MVR_SOURCES.map((t) => <button key={t} className={"seg" + (t === active ? " active" : "")} onClick={() => onPick(t)}>{t}</button>)}
    </div>
  );
}

function MvrComment({ text }) {
  if (!text) return <span className="mvr-cm none" title="No comment recorded">—</span>;
  return <span className="mvr-cm" title={text}>{text}</span>;
}

function MvrTh({ children }) {
  return <th className="sortable"><span className="th-in">{children} <Icon name="chevrons-up-down" size={12} color="var(--slate-400)" /></span></th>;
}

function MvrChange({ from, to }) {
  return (
    <span className="mvr-arrow">
      <span className="mvr-chip">{from}</span>
      <Icon name="arrow-right" size={14} color="var(--slate-400)" />
      <span className="mvr-chip strong">{to}</span>
    </span>
  );
}

const MVR_LOG = [
  { t: "04 Mar 2026 · 13:52:41", area: "DPT1 Fish Tank 2",      tag: "DPT1-FTA2-QT1", sig: "O₂ saturation setpoint",        from: "92.0 %",     to: "94.0 %", op: "E. Sørensen", cm: "Raised after morning biometry, fish showing higher activity" },
  { t: "04 Mar 2026 · 13:48:09", area: "DPT1 Fish Tank 2",      tag: "DPT1-FTA2-CV1", sig: "Control valve mode",            from: "Auto",       to: "Manual",     op: "E. Sørensen", cm: "Manual control for diffuser line inspection" },
  { t: "04 Mar 2026 · 13:41:55", area: "DPT2 MBBR",             tag: "DPT2-MBR0-PU1", sig: "Biofilter recirculation pump",  from: "Stopped",    to: "Running",    op: "System", cm: "" },
  { t: "04 Mar 2026 · 13:30:18", area: "DPT1 Drum filter",      tag: "DPT1-DRF0-MO1", sig: "Backwash interval",             from: "18 min",     to: "12 min", op: "M. Haugen", cm: "ΔP rising faster than normal, shortening cycle" },
  { t: "04 Mar 2026 · 13:22:46", area: "DPT2 CO₂-stripper",     tag: "DPT2-STR1-FN2", sig: "Stripper fan 2 manual override",from: "Auto 60 %",  to: "Manual 85 %", op: "M. Haugen", cm: "Forced to 85 %, CO₂ above 12 mg/L on header" },
  { t: "04 Mar 2026 · 13:05:30", area: "DPT1 Fish Tank 3",      tag: "DPT1-FTA3-LT1", sig: "Water level setpoint",          from: "204 cm",     to: "210 cm", op: "E. Sørensen", cm: "Compensating for grading transfer volume" },
  { t: "04 Mar 2026 · 12:58:12", area: "Start Feeding · Tank 4",tag: "DPT1-FTA4-FD1", sig: "Feeding program",               from: "Paused",     to: "Resumed",    op: "E. Sørensen", cm: "Feeding resumed after tank inspection" },
  { t: "04 Mar 2026 · 12:44:03", area: "DPT1 Lye Dosing",       tag: "DPT1-DNA0-PU1", sig: "Lye dosing pump",               from: "Manual",     to: "Auto",     op: "System", cm: "" },
  { t: "04 Mar 2026 · 12:31:27", area: "DPT2 Pump Sump",        tag: "DPT2-SMP0-PU2", sig: "Lift pump 2",                   from: "Running",    to: "Stopped",    op: "A. Birkeland", cm: "Stopped for impeller check, work order WO-2261" },
  { t: "04 Mar 2026 · 12:15:50", area: "DPT1 Fish Tank 1",      tag: "DPT1-FTA1-QT1", sig: "O₂ saturation setpoint",        from: "90.0 %",     to: "88.0 %", op: "A. Birkeland", cm: "Lowered per vet advice, reduce supersaturation risk" },
  { t: "04 Mar 2026 · 11:59:41", area: "DPT1 Emergency O₂",     tag: "DPT1-FTA0-EV1", sig: "Emergency O₂ valve override",   from: "Closed",     to: "Open", op: "A. Birkeland", cm: "Emergency O₂ opened during blower changeover" },
  { t: "04 Mar 2026 · 11:42:18", area: "DPT2 Energy Plant",     tag: "DPT2-ENP0-HX1", sig: "Heat exchanger setpoint",       from: "12.0 °C",    to: "12.5 °C", op: "System", cm: "" },
  { t: "04 Mar 2026 · 11:30:05", area: "DPT1 Fish Tank 4",      tag: "DPT1-FTA4-FD1", sig: "Feed rate setpoint",            from: "9.3 kg/d",   to: "10.1 kg/d", op: "E. Sørensen", cm: "Feed table step 4, per feeding plan" },
  { t: "04 Mar 2026 · 11:12:33", area: "DPT3 Drum filter",      tag: "DPT3-DRF0-MO1", sig: "Drum drive mode",               from: "Auto",       to: "Manual",     op: "M. Haugen", cm: "Manual drum jog to clear debris" },
  { t: "04 Mar 2026 · 10:58:47", area: "DPT2 Seawater Exchange",tag: "DPT2-SWE0-VV3", sig: "Exchange valve",                from: "Closed",     to: "Open",    op: "System", cm: "" },
  { t: "04 Mar 2026 · 10:41:09", area: "DPT1 Water Treatment",  tag: "DPT1-WTR0-UV1", sig: "UV reactor intensity setpoint", from: "70 %",       to: "85 %", op: "M. Haugen", cm: "Increased after lamp cleaning, turbidity 0.6 NTU" },
];

function ManeuverHistoryScreen() {
  const [src, setSrc] = React.useState("All");
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const rows = MVR_LOG.filter((r) => {
    const auto = r.op === "System";
    if (src === "Operator" && auto) return false;
    if (src === "Automatic" && !auto) return false;
    return !ql || [r.t, r.area, r.tag, r.sig, r.from, r.to, r.op, r.cm || ""].join(" ").toLowerCase().includes(ql);
  });
  const manual = MVR_LOG.filter((r) => r.op !== "System").length;
  const pg = window.usePaged(rows, 25);
  return (
    <AppShell active="maneuver" title="Maneuver History" crumbs={["Operator log"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Operator action &amp; setpoint audit trail</p>
          </div>
          <div className="pagehead-right"><MvrSourceTabs active={src} onPick={setSrc} /></div>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <KpiCard label="Maneuvers · 24h"   value="128" delta="96 operator · 32 automatic" deltaDir="flat" icon="history" />
        <KpiCard label="Systems Touched"   value="11"  delta="of 24 in operation"         deltaDir="flat" icon="building-2" />
        <KpiCard label="With Comment"      value="74 %" delta="95 of 128 maneuvers"       deltaDir="flat" icon="message-square" />
        <KpiCard label="Operators · Today" value="4"   delta="E. Sørensen on shift"       deltaDir="flat" icon="users" />
      </div>

      <div className="card">
        <div className="filterbar">
          <div className="field">
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter tag, area, signal, comment, operator…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <span className="fbar-group">
            <span className="lbl"><Icon name="calendar" size={16} color="var(--slate-500)" /> Time Period</span>
            <span className="fbar-pair">
              <span className="dateinput">01-06-2026 00:00 <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
              <Icon name="arrow-right" size={14} color="var(--slate-400)" />
              <span className="dateinput">01-06-2026 23:59 <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
            </span>
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <ExportMenu describe={(fmt) => "Export started: maneuver log will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
          </div>
        </div>

        <div className="mvr-scroll">
        <table className="tbl mvr-tbl">
          <thead>
            <tr>
              <MvrTh>Date / Time</MvrTh><MvrTh>Area</MvrTh><MvrTh>Tag</MvrTh>
              <MvrTh>Maneuver</MvrTh><MvrTh>Change</MvrTh><MvrTh>Comment</MvrTh><MvrTh>Operator</MvrTh>
            </tr>
          </thead>
          <tbody>
            {pg.rows.map((r, i) => (
              <tr key={i}>
                <td><span className="data td-strong">{r.t}</span></td>
                <td>{r.area}</td>
                <td><span className="tag">{r.tag}</span></td>
                <td className="td-strong">{r.sig}</td>
                <td><MvrChange from={r.from} to={r.to} /></td>
                <td><MvrComment text={r.cm} /></td>
                <td>
                  {r.op === "System"
                    ? <span className="evt returned"><Icon name="cpu" size={14} color="var(--slate-400)" /> System</span>
                    : <span className="small td-strong">{r.op}</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <NjEmptyRow colSpan={7} reason={ql ? "search" : "filtered"}
                title={ql ? "No maneuvers match “" + q + "”" : "No maneuvers match the current filters"}
                action={<button className="btn btn-secondary btn-sm" onClick={() => { setQ(""); setSrc("All"); }}>Clear filters</button>} />
            )}
          </tbody>
        </table>
        </div>

        <window.PageFoot pg={pg} noun="maneuvers" extra={manual + " by operators · 01 Jun 2026"} />
      </div>
    </AppShell>
  );
}

Object.assign(window, { ManeuverHistoryScreen, MVR_LOG });
