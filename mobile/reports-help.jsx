// reports-help.jsx — mobile Reports viewer, Help & manuals, and the equipment Admin tab.
// Report content comes from the desktop definitions (`REPORTS` / `REP_SERIES` in
// screens/reports.jsx) so the same key figures are read on both surfaces; only the layout is
// mobile (a per-day card list instead of a 20×7 table, with the same Sum/Avg/Min/Max footer).

const MRP_ICON = { "Fish Calculation": "calculator", "Feed Report": "utensils", "Fish Summary": "fish", "Key Numbers": "hash" };
const MRP_PERIODS = [["7d", 7], ["14d", 14], ["20d", 20]];

function ReportsScreen() {
  useNav();
  const [period, setPeriod] = React.useState("7d");
  const types = Object.keys(REPORTS);
  return (
    <React.Fragment>
      <MHeader back title="Reports" sub="Key figures · Building 1 · DPT1" />
      <PullScroll><div className="m-pad">
        <div className="m-eyebrow">Period</div>
        <div className="m-seg" style={{ marginBottom: 12 }}>
          {MRP_PERIODS.map(([k]) => <button key={k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>Last {k}</button>)}
        </div>
        <div className="m-list">
          {types.map((t) => (
            <button key={t} className="m-lrow" onClick={() => mPush("report", { report: t, period })}>
              <span className="m-lrow-ic"><MIcon name={MRP_ICON[t] || "file-text"} size={18} /></span>
              <div className="m-lrow-main"><div className="m-lrow-t">{t}</div><div className="m-lrow-s" style={{ whiteSpace: "normal" }}>{REPORTS[t].sub}</div></div>
              <MIcon name="chevron-right" size={18} color="var(--slate-400)" />
            </button>
          ))}
        </div>
        <div className="m-de-help" style={{ marginTop: 12 }}>Reports read the same daily register as the control room. Open one to view the figures or export it.</div>
      </div></PullScroll>
    </React.Fragment>
  );
}

function ReportViewerScreen({ report, period }) {
  useNav();
  const def = REPORTS[report]; if (!def) return null;
  const n = (MRP_PERIODS.find((p) => p[0] === period) || MRP_PERIODS[0])[1];
  const rows = REP_SERIES.slice(-n).slice().reverse();
  const stats = React.useMemo(() => {
    const out = {};
    def.cols.forEach((c) => {
      const vals = rows.map((r) => r[c.k]); const sum = vals.reduce((s, v) => s + v, 0);
      out[c.k] = { Sum: c.f(sum), Average: c.f(sum / vals.length), Minimum: c.f(Math.min.apply(null, vals)), Maximum: c.f(Math.max.apply(null, vals)) };
    });
    return out;
  }, [report, n]);
  const [expanded, setExpanded] = React.useState(rows[0] ? rows[0].t : null);
  return (
    <React.Fragment>
      <MHeader back title={report} sub={def.sub}
        right={<button className="m-icbtn" aria-label={"Export " + report} onClick={() => mToast(report + " (" + n + " days) · export started", "download")}><MIcon name="download" size={18} /></button>} />
      <PullScroll><div className="m-pad">
        <div className="mrp-sheet">
          <div className="mrp-eyebrow">KEY-FIGURES REPORT</div>
          <div className="mrp-title">{report}</div>
          <div className="mrp-meta"><span>{rows[rows.length - 1].t} → {rows[0].t}</span><span className="data">{n} days</span></div>
        </div>

        <div className="m-eyebrow">Summary</div>
        <div className="mrp-stats">
          {def.cols.map((c) => (
            <div key={c.k} className="mrp-stat">
              <div className="mrp-stat-h">{c.h}</div>
              <div className="mrp-stat-g">
                {["Average", "Minimum", "Maximum", "Sum"].map((s) => (
                  <div key={s} className="mrp-stat-c"><span className="mrp-stat-l">{s}</span><span className="data mrp-stat-v">{stats[c.k][s]}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="m-eyebrow">Daily figures</div>
        <div className="m-list">
          {rows.map((r) => {
            const on = expanded === r.t;
            return (
              <React.Fragment key={r.t}>
                <button className="m-lrow" onClick={() => setExpanded(on ? null : r.t)}>
                  <div className="m-lrow-main">
                    <div className="m-lrow-t data" style={{ fontSize: 13.5 }}>{r.t}</div>
                    <div className="m-lrow-s">{def.cols[0].h.replace(/\s*\(.*\)/, "")} <b className="data">{def.cols[0].f(r[def.cols[0].k])}</b></div>
                  </div>
                  <MIcon name={on ? "chevron-up" : "chevron-down"} size={17} color="var(--slate-400)" />
                </button>
                {on && <div className="mrp-day">
                  {def.cols.map((c) => <div key={c.k} className="mrp-day-r"><span className="mrp-day-l">{c.h}</span><span className="data mrp-day-v">{c.f(r[c.k])}</span></div>)}
                </div>}
              </React.Fragment>
            );
          })}
        </div>
      </div></PullScroll>
      <div className="m-footbar"><div className="m-actions" style={{ marginTop: 0 }}>
        <button className="m-btn m-btn-secondary" onClick={() => mToast("Report shared to the shift channel", "send")}><MIcon name="send" size={16} /> Share</button>
        <button className="m-btn m-btn-primary" onClick={() => mToast(report + " · export started (CSV)", "download")}><MIcon name="download" size={16} /> Export</button>
      </div></div>
    </React.Fragment>
  );
}

// ---------- Help & manuals ----------
// Real, readable content: the field answers an operator needs without a desk. Sections mirror
// the desktop help menu (SCADA manual · Feeding manual · alarm handling · support).
const M_HELP = [
  { id: "alarms", title: "Alarm handling", icon: "bell", sub: "ISA-18.2 lifecycle on mobile", body: [
    ["Acknowledge", "Swipe an alarm row right, or open it and use Acknowledge. Acknowledging records that you have seen the alarm; it does not clear the condition."],
    ["Block vs Out of service", "Block stops an alarm annunciating and can auto-reactivate after a set time. Out of service is for equipment under maintenance and has no timeout — restore it manually."],
    ["Response times", "Every alarm carries a required response time from the rationalization record: Immediate, < 5 min, < 30 min or < 4 hours."],
    ["Stale alarms", "An alarm standing longer than 24 hours is marked stale. Escalate it rather than acknowledging it again."],
  ]},
  { id: "scada", title: "SCADA manual", icon: "book-open", sub: "Operating the control screens", body: [
    ["Control modes", "Equipment runs in Auto (following the control logic) or Manual (operator-set). Switching to Manual is logged to maneuver history."],
    ["Setpoints", "Tap a setpoint to change it. Every change asks for confirmation, records the previous value and appears in maneuver history."],
    ["Offline", "With no signal the app shows the last synced values and queues your actions. Queued actions are sent automatically when the connection returns."],
  ]},
  { id: "feeding", title: "Feeding manual", icon: "utensils", sub: "Feed control & schedules", body: [
    ["Starting a meal", "Feeding follows the tank's activity factor and target. Pause a tank before working on it; the feed screw stops and the schedule resumes on release."],
    ["Manual flush", "Flush the feed line after a blockage or a feed-type change. Confirm the maneuver; it is logged like any other."],
    ["Calibration", "A feed screw without calibration data cannot dose automatically. Run the calibration routine from the tank's feeding card."],
  ]},
  { id: "welfare", title: "Fish welfare registration", icon: "fish", sub: "FISHWELL indicators", body: [
    ["Scoring", "Indicators are scored per fish from 0 (none) to 3 (severe). Scores are reported as a distribution — no overall grade is calculated."],
    ["Sampling", "A registration covers 20 fish. Partially completed registrations stay open until finished."],
  ]},
];
function HelpScreen() {
  useNav();
  const [open, setOpen] = React.useState("alarms");
  return (
    <React.Fragment>
      <MHeader back title="Help &amp; manuals" sub="Cached for offline use" />
      <PullScroll><div className="m-pad">
        {M_HELP.map((s) => {
          const on = open === s.id;
          return (
            <div key={s.id} className="mc" style={{ marginBottom: 10, overflow: "hidden" }}>
              <button className="m-lrow" style={{ borderBottom: on ? "1px solid var(--slate-100)" : "none" }} onClick={() => setOpen(on ? null : s.id)}>
                <span className="m-lrow-ic"><MIcon name={s.icon} size={18} /></span>
                <div className="m-lrow-main"><div className="m-lrow-t">{s.title}</div><div className="m-lrow-s">{s.sub}</div></div>
                <MIcon name={on ? "chevron-up" : "chevron-down"} size={17} color="var(--slate-400)" />
              </button>
              {on && <div className="mhelp-body">
                {s.body.map(([h, p]) => <div key={h} className="mhelp-art"><div className="mhelp-h">{h}</div><p className="mhelp-p">{p}</p></div>)}
              </div>}
            </div>
          );
        })}
        <div className="m-eyebrow">Support</div>
        <div className="m-list">
          <button className="m-lrow" onClick={() => mSheet(<MSupportSheet />)}><span className="m-lrow-ic"><MIcon name="life-buoy" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Create support ticket</div><div className="m-lrow-s">Report an issue to controls / IT</div></div><MIcon name="chevron-right" size={17} color="var(--slate-400)" /></button>
          <button className="m-lrow" onClick={() => mSheet(<MOnCallSheet />)}><span className="m-lrow-ic"><MIcon name="phone" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">On-call schedule</div><div className="m-lrow-s">Who to call outside shift hours</div></div><MIcon name="chevron-right" size={17} color="var(--slate-400)" /></button>
        </div>
        <div className="m-help-foot">Powered by Ignition · NJORD v2.0</div>
      </div></PullScroll>
    </React.Fragment>
  );
}

function MSupportSheet() {
  const [area, setArea] = React.useState("Control system");
  const [txt, setTxt] = React.useState("");
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">Create support ticket</div>
        <div className="m-note-field-l">Area</div>
        <div className="m-chips" style={{ flexWrap: "wrap" }}>{["Control system", "Instrument", "Network", "Mobile app"].map((a) => <button key={a} className={"m-chip" + (area === a ? " on" : "")} onClick={() => setArea(a)}>{a}</button>)}</div>
        <textarea className="m-note-ta" rows={4} style={{ marginTop: 12 }} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="What is wrong, and what were you doing?" autoFocus />
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!txt.trim()}
            onClick={() => { mCloseSheet(); mToast("Ticket raised · " + area, "life-buoy"); }}><MIcon name="check" size={16} /> Send</button>
        </div>
      </div>
    </div>
  );
}
// One on-call sheet for the whole app (Help and Profile both open this). Rows are tappable
// phone links — the point of on-call on a phone is to place the call.
const M_ONCALL = [
  ["Today · 13:00–21:00", "E. Sørensen", "Shift supervisor", "+47 900 12 345", true],
  ["Today · 21:00–07:00", "M. Haugen", "Operator", "+47 900 12 346", false],
  ["Controls / automation", "A. Lind", "24/7 escalation", "+47 900 12 350", false],
  ["Veterinarian", "K. Berg", "Fish health", "+47 900 12 361", false],
];
function MOnCallSheet() {
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">On-call schedule</div>
        <div className="m-list" style={{ marginTop: 8 }}>
          {M_ONCALL.map((r) => (
            <a key={r[0]} className="m-lrow" href={"tel:" + r[3].replace(/\s/g, "")} style={{ textDecoration: "none" }}>
              <span className="m-lrow-ic" style={r[4] ? { background: "var(--success-bg)", color: "var(--success-text)" } : {}}><MIcon name={r[4] ? "user-check" : "phone"} size={17} /></span>
              <div className="m-lrow-main">
                <div className="m-lrow-t">{r[1]} {r[4] && <span className="mbadge" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>YOU</span>}</div>
                <div className="m-lrow-s">{r[0]} · {r[2]}</div>
              </div>
              <span className="data mocall-num">{r[3]}</span>
            </a>
          ))}
        </div>
        <div className="m-actions"><button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Close</button></div>
      </div>
    </div>
  );
}

// ---------- equipment Admin tab (parity with desktop EqAdminTab) ----------
function MEqAdmin({ e }) {
  const reset = () => mConfirm({
    title: "Reset total runtime?", body: "This clears the accumulated runtime counter for " + e.name + ". The action is logged to maneuver history.",
    danger: true, confirmLabel: "Reset runtime", onConfirm: () => mToast("Total runtime reset · " + e.tag, "rotate-ccw"),
  });
  return (
    <React.Fragment>
      <div className="m-eyebrow">General settings</div>
      <div className="mratn-fields">
        <div className="mratn-frow ro"><span className="mratn-fl">Tagpath</span><span className="mratn-fv" style={{ fontSize: 11.5 }}>[User]User/{e.tag}</span></div>
        <div className="mratn-frow ro"><span className="mratn-fl">Address</span><span className="mratn-fv muted">—</span></div>
        <div className="mratn-frow ro"><span className="mratn-fl">Error code</span><span className="mratn-fv muted">Not supported</span></div>
        <div className="mratn-frow ro"><span className="mratn-fl">Device type</span><span className="mratn-fv">{e.kind}</span></div>
      </div>
      <div className="m-eyebrow">Other functions</div>
      <button className="m-btn m-btn-secondary" onClick={reset}><MIcon name="rotate-ccw" size={16} /> Reset total runtime</button>
      <div className="m-de-help" style={{ marginTop: 10 }}>Admin values are read from the controller. Changing them is a desk task in the control room.</div>
    </React.Fragment>
  );
}

Object.assign(window, { ReportsScreen, ReportViewerScreen, HelpScreen, MSupportSheet, MOnCallSheet, MEqAdmin, M_HELP });
