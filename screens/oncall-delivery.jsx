// oncall-delivery.jsx — Delivery verification (Settings · On-call): test dispatch, heartbeat
// schedule and the delivery log (legacy "Messages Audit").
//
// Naming: the legacy screen logged every outgoing notification and called it an audit. Renamed
// "Delivery log" — an operator opens it to answer "did the message actually leave the facility
// and reach the phone", which is delivery, not auditing. The legacy "Test alarm On/Off" toggle
// is an ACTION here, not a state: a test is an event you fire and then read a result for.

const DL_LS = "nj_delivery_log_v1", HB_LS = "nj_heartbeat_v1";
const DL_NOW = window.NJ_NOW || Date.now();
const DL_TYPES = ["All", "SMS", "Voice", "UHF"];
const DL_KINDS = [{ id: "all", label: "All messages" }, { id: "alarm", label: "Alarms" }, { id: "test", label: "Tests & heartbeats" }];

function dlAt(daysAgo, h, m) { const d = new Date(DL_NOW); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.getTime(); }
function dlPad(n) { return String(n).padStart(2, "0"); }
function dlFmt(ts) { const d = new Date(ts); return dlPad(d.getDate()) + " " + d.toLocaleDateString("en-GB", { month: "short" }) + " " + d.getFullYear() + " · " + dlPad(d.getHours()) + ":" + dlPad(d.getMinutes()) + ":" + dlPad(d.getSeconds()); }
function dlClock(ts) { const d = new Date(ts); return dlPad(d.getHours()) + ":" + dlPad(d.getMinutes()); }
function dlAgo(ts) {
  const s = Math.max(0, Math.round((DL_NOW - ts) / 1000));
  if (s < 90) return "just now";
  if (s < 5400) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  return Math.round(s / 86400) + " d ago";
}

// Seeded outgoing traffic — the alarms that were actually dispatched, mirroring the register.
const DL_EVENTS = [
  { tag: "DPT1-SMP0-LT1", txt: "DPT1 Pump sump: Level low alarm", mins: 14, resends: 4, crit: true },
  { tag: "DPT1-FTA1-LT1", txt: "DPT1 Fish tank 1: Level low alarm", mins: 98, resends: 3 },
  { tag: "DPT4-SMP0-LT1", txt: "DPT4 Pump sump: Level high alarm", mins: 168, resends: 2, crit: true },
  { tag: "DFS0-CYC0-SQ1", txt: "Dead fish cyclone: Emptying sequence failed", mins: 254, resends: 1 },
  { tag: "DPT4-SMP0-LT1", txt: "DPT4 Pump sump: Level high alarm", mins: 261, resends: 2 },
  { tag: "WWT0-INN0-LT1", txt: "Sludge inlet sump: Level high alarm", mins: 322, resends: 2 },
  { tag: "DPT2-MBR0-QT2", txt: "DPT2 MBBR: O₂ saturation low alarm", mins: 470, resends: 2, crit: true },
  { tag: "DPT1-FTA3-QT1", txt: "DPT1 Fish tank 3: O₂ saturation low low alarm", mins: 615, resends: 3, crit: true },
  { tag: "DPT3-DRF0-DP1", txt: "DPT3 Drum filter: Differential pressure high", mins: 742, resends: 1 },
  { tag: "ENP0-HPU1-XA1", txt: "Energy plant: Heat pump 1 tripped", mins: 905, resends: 2 },
  { tag: "DPT1-DNA0-LT1", txt: "DPT1 Lye dosing: Tank level low alarm", mins: 1180, resends: 1 },
  { tag: "DPT2-STR1-FN2", txt: "DPT2 CO₂-stripper: Fan 2 fault", mins: 1395, resends: 2 },
  { tag: "DPT1-SMP0-LT1", txt: "DPT1 Pump sump: Level low alarm", mins: 1620, resends: 3, crit: true },
  { tag: "UVP0-REA1-QT1", txt: "UV plant: Reactor 1 intensity low alarm", mins: 1880, resends: 1 },
];

function dlSeed() {
  const out = []; let n = 0;
  DL_EVENTS.forEach((e, ei) => {
    const rcpts = e.crit ? ["Duty phone 1", "Duty phone 2", "E. Sørensen"] : ["Duty phone 1", "Duty phone 2"];
    rcpts.forEach((r, ri) => {
      for (let k = 0; k < (e.resends || 1); k++) {
        n++;
        const type = e.crit && k === 1 ? "UHF" : (e.crit && ri === 2 ? "Voice" : "SMS");
        const bad = type === "Voice" ? ei % 3 === 1 : n % 29 === 0;
        out.push({
          ts: DL_NOW - e.mins * 60000 + k * 300000 + ri * 29000,
          type, msg: e.tag + " · " + e.txt, rcpt: r, kind: "alarm",
          result: bad ? (type === "Voice" ? "No answer" : "Failed") : "Succeeded",
        });
      }
    });
  });
  for (let d = 1; d <= 4; d++) ["Duty phone 1", "Duty phone 2"].forEach((r, i) => out.push({ ts: dlAt(d, 21, 0) + i * 22000, type: i ? "UHF" : "SMS", msg: "Heartbeat · NJORD Kloven dispatcher online", rcpt: r, kind: "heartbeat", result: "Succeeded" }));
  ["Duty phone 1", "Duty phone 2"].forEach((r, i) => out.push({ ts: DL_NOW - 7200000 + i * 24000, type: i ? "UHF" : "SMS", msg: "TEST · Delivery test · All Alarms · no action required", rcpt: r, kind: "test", result: "Succeeded" }));
  return out;
}

const njDeliveryLog = {
  seed: dlSeed(),
  extra: (function () { try { const r = JSON.parse(localStorage.getItem(DL_LS)); return Array.isArray(r) ? r : []; } catch (e) { return []; } })(),
  subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); try { localStorage.setItem(DL_LS, JSON.stringify(this.extra.slice(-300))); } catch (e) {} },
  rows() { return this.seed.concat(this.extra).sort((a, b) => b.ts - a.ts); },
  append(entries) { this.extra = this.extra.concat(entries); this.emit(); },
  patchLast(pred, patch) { for (let i = this.extra.length - 1; i >= 0; i--) if (pred(this.extra[i])) { this.extra[i] = Object.assign({}, this.extra[i], patch); break; } this.emit(); },
  lastTest() { return this.rows().find((r) => r.kind === "test") || null; },
  since(ms) { const t = DL_NOW - ms; return this.rows().filter((r) => r.ts >= t); },
};
function useDeliveryLog() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => njDeliveryLog.sub(force), []); return njDeliveryLog; }

// ── heartbeat schedule ──
const HB_DAYS = [{ id: "daily", label: "Every day" }, { id: "weekdays", label: "Mon–Fri" }, { id: "weekly", label: "Sundays" }];
function hbDayLabel(id) { return (HB_DAYS.find((d) => d.id === id) || HB_DAYS[0]).label; }
const njHeartbeat = {
  list: (function () { try { const r = JSON.parse(localStorage.getItem(HB_LS)); if (Array.isArray(r)) return r; } catch (e) {} return [{ id: "hb1", time: "21:00", days: "daily", groupId: "g_all" }]; })(),
  subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); try { localStorage.setItem(HB_LS, JSON.stringify(this.list)); } catch (e) {} },
  upsert(h) { const i = this.list.findIndex((x) => x.id === h.id); this.list = i >= 0 ? this.list.map((x) => (x.id === h.id ? h : x)) : this.list.concat([h]); this.emit(); },
  remove(id) { this.list = this.list.filter((x) => x.id !== id); this.emit(); },
};
function useHeartbeat() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => njHeartbeat.sub(force), []); return njHeartbeat; }

// ── shared helpers over the on-call model ──
function dlGroups() { return (window.oncallStore && window.oncallStore.groups) || []; }
function dlGroup(id) { return dlGroups().find((g) => g.id === id) || dlGroups()[0] || null; }
function dlChanLabel(c) { return c === "sms" ? "SMS" : c === "voice" ? "Voice" : "UHF"; }
function dlChanType(c) { return dlChanLabel(c); }
function dlMemberName(id) { const m = window.ocMember ? window.ocMember(id) : null; return m ? m.name : id; }
function dlResultTone(r) { return r === "Succeeded" ? "ok" : r === "Pending" ? "wait" : "bad"; }

function DlResult({ r }) {
  const tone = dlResultTone(r);
  return <span className={"dl-res " + tone}><Icon name={tone === "ok" ? "check" : tone === "wait" ? "loader" : "alert-triangle"} size={12} /> {r}</span>;
}

// ── test dispatch ──
function TestDispatchDialog({ groupId }) {
  const groups = dlGroups();
  const [gid, setGid] = React.useState(groupId || (groups[0] && groups[0].id));
  const [scope, setScope] = React.useState("p1");
  const [sending, setSending] = React.useState(false);
  const [rows, setRows] = React.useState(null);
  const g = dlGroup(gid);
  const tiers = scope === "p1" ? ["p1"] : ["p1", "p2", "p3"];
  const targets = [];
  tiers.forEach((t) => {
    const chans = (g && g.chan && g.chan[t]) || [];
    ((g && g.tiers && g.tiers[t]) || []).forEach((mid) => chans.forEach((c) => targets.push({ tier: t, name: dlMemberName(mid), type: dlChanType(c) })));
  });
  const msg = "TEST · Delivery test · " + (g ? g.name : "") + " · no action required";
  const send = () => {
    if (!targets.length) return;
    setSending(true);
    setRows(targets.map((t) => Object.assign({}, t, { result: "Pending" })));
    const ts = Date.now();
    njDeliveryLog.append(targets.map((t, i) => ({ ts: DL_NOW + i * 1000, type: t.type, msg: msg, rcpt: t.name, kind: "test", result: "Pending", batch: ts })));
    targets.forEach((t, i) => setTimeout(() => {
      setRows((rs) => rs && rs.map((r, j) => (j === i ? Object.assign({}, r, { result: "Succeeded" }) : r)));
      njDeliveryLog.patchLast((r) => r.batch === ts && r.result === "Pending", { result: "Succeeded" });
      if (i === targets.length - 1) { setSending(false); njToast("Test alarm delivered to " + targets.length + " " + (targets.length === 1 ? "recipient" : "recipients") + "."); }
    }, 900 + i * 700));
  };
  const done = rows && !sending;
  return (
    <Dialog width={620}>
      <DlgHeader icon="send" name="Send test alarm" onClose={closeDialog} />
      <div className="dlg-body dv-test">
        <p className="dv-test-intro">A test message runs the real dispatch chain — same modem, same UHF sender, same recipients — so the duty phone can confirm it actually rings. Nothing is written to the alarm register.</p>
        <div className="dv-test-row">
          <span className="oc-field-l">On-call group</span>
          <select className="nj-select" value={gid} onChange={(e) => { setGid(e.target.value); setRows(null); }} disabled={sending}>
            {groups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div className="dv-test-row">
          <span className="oc-field-l">Reach</span>
          <div className="segmented dv-seg">
            <button className={"seg" + (scope === "p1" ? " active" : "")} onClick={() => { setScope("p1"); setRows(null); }} disabled={sending}>Priority 1 only</button>
            <button className={"seg" + (scope === "all" ? " active" : "")} onClick={() => { setScope("all"); setRows(null); }} disabled={sending}>Full escalation</button>
          </div>
        </div>
        <div className="dv-msg">
          <span className="eyebrow">Message</span>
          <span className="data dv-msg-t">{msg}</span>
        </div>
        <div className="dv-test-head">
          <span className="eyebrow">Recipients · {targets.length}</span>
          {done && <span className="dv-test-sum"><Icon name="check-circle" size={14} color="var(--success-text)" /> {rows.length} of {rows.length} delivered</span>}
        </div>
        <div className="dv-test-list">
          {(rows || targets).map((t, i) => (
            <div className="dv-test-item" key={i}>
              <Icon name={t.type === "UHF" ? "radio" : t.type === "Voice" ? "phone" : "message-square"} size={14} color="var(--slate-400)" />
              <span className="dv-test-n">{t.name}</span>
              <span className="tag">{t.type}</span>
              <span className="dv-test-tier">P{t.tier.slice(1)}</span>
              {rows ? <DlResult r={t.result} /> : <span className="dv-test-idle">Ready</span>}
            </div>
          ))}
          {!targets.length && <NjInline align="left" icon="alert-triangle">This group has no recipient with a channel on the selected tiers.</NjInline>}
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <button className="linkbtn" onClick={() => { closeDialog(); njOpenDeliveryLog(); }}>Delivery log <Icon name="arrow-up-right" size={14} /></button>
        <div className="dlg-foot-btns">
          <button className="btn btn-secondary" onClick={closeDialog}>{done ? "Close" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={send} disabled={sending || !targets.length}><Icon name="send" size={16} /> {sending ? "Sending…" : done ? "Send again" : "Send test"}</button>
        </div>
      </div>
    </Dialog>
  );
}
function njOpenTestDispatch(groupId) { openDialog(<TestDispatchDialog groupId={groupId} />); }

// ── heartbeat editor ──
function HeartbeatDialog({ hb }) {
  const groups = dlGroups();
  const [h, setH] = React.useState(() => hb ? Object.assign({}, hb) : { id: "hb" + Date.now(), time: "21:00", days: "daily", groupId: (groups[0] || {}).id });
  const set = (p) => setH((x) => Object.assign({}, x, p));
  const g = dlGroup(h.groupId);
  return (
    <Dialog width={480}>
      <DlgHeader icon="heart-pulse" name={hb ? "Edit scheduled test" : "Schedule a test message"} onClose={closeDialog} />
      <div className="dlg-body dv-hbed">
        <p className="dv-test-intro">A scheduled test (heartbeat) proves the chain end to end while nothing is wrong: if the duty phone stops receiving it, the path is down before an alarm needs it.</p>
        <div className="dv-test-row">
          <span className="oc-field-l">Send at</span>
          <input className="oos-input dv-hb-time" type="time" value={h.time} onChange={(e) => set({ time: e.target.value })} />
        </div>
        <div className="dv-test-row">
          <span className="oc-field-l">Repeat</span>
          <div className="segmented dv-seg">
            {HB_DAYS.map((d) => <button key={d.id} className={"seg" + (h.days === d.id ? " active" : "")} onClick={() => set({ days: d.id })}>{d.label}</button>)}
          </div>
        </div>
        <div className="dv-test-row">
          <span className="oc-field-l">To group</span>
          <select className="nj-select" value={h.groupId} onChange={(e) => set({ groupId: e.target.value })}>
            {groups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <p className="dv-hb-prev">{hbDayLabel(h.days)} at <b className="data">{h.time}</b> to <b>{g ? g.name : "—"}</b> on {(((g || {}).chan || {}).p1 || []).map(dlChanLabel).join(" + ") || "no channel"}</p>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { njHeartbeat.upsert(h); closeDialog(); njToast((hb ? "Updated" : "Scheduled") + " test message · " + hbDayLabel(h.days).toLowerCase() + " at " + h.time + "."); }}>{hb ? "Save" : "Schedule"}</button>
      </div>
    </Dialog>
  );
}

// ── delivery log ──
function DeliveryLogDialog({ initial }) {
  const log = useDeliveryLog();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("All");
  const [kind, setKind] = React.useState("all");
  const [failOnly, setFailOnly] = React.useState(!!(initial && initial.failOnly));
  const all = log.rows();
  const ql = q.trim().toLowerCase();
  const rows = all.filter((r) => {
    if (type !== "All" && r.type !== type) return false;
    if (kind === "alarm" && r.kind !== "alarm") return false;
    if (kind === "test" && r.kind === "alarm") return false;
    if (failOnly && r.result === "Succeeded") return false;
    return !ql || [dlFmt(r.ts), r.type, r.msg, r.rcpt, r.result].join(" ").toLowerCase().includes(ql);
  });
  const pg = window.usePaged(rows, 25);
  const fails = all.filter((r) => r.result !== "Succeeded" && r.result !== "Pending").length;
  return (
    <Dialog width={1040}>
      <DlgHeader icon="mail-check" name="Delivery log" onClose={closeDialog} />
      <div className="dlg-body dv-log">
        <div className="filterbar dv-log-bar">
          <div className="field">
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input placeholder="Filter message, tag, recipient…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="fbar-div" />
          <div className="segmented dv-seg">
            {DL_TYPES.map((t) => <button key={t} className={"seg" + (type === t ? " active" : "")} onClick={() => setType(t)}>{t}</button>)}
          </div>
          <div className="segmented dv-seg">
            {DL_KINDS.map((k) => <button key={k.id} className={"seg" + (kind === k.id ? " active" : "")} onClick={() => setKind(k.id)}>{k.label}</button>)}
          </div>
          <button className={"dv-fail-chip" + (failOnly ? " on" : "")} aria-pressed={failOnly} onClick={() => setFailOnly((f) => !f)} title="Show only messages that did not get through">
            <Icon name="alert-triangle" size={14} /> Failures only <span className="data">{fails}</span>
          </button>
          <div style={{ marginLeft: "auto" }}>
            <ExportMenu describe={(fmt) => "Export started: delivery log will download as " + (fmt === "csv" ? "CSV (.csv)." : "Excel (.xlsx).")} />
          </div>
        </div>
        <div className="dv-log-scroll">
          <table className="tbl dv-log-tbl">
            <thead><tr><th>Date / Time</th><th>Type</th><th>Message</th><th>Recipient</th><th>Result</th></tr></thead>
            <tbody>
              {pg.rows.map((r, i) => (
                <tr key={i} className={r.result !== "Succeeded" && r.result !== "Pending" ? "dv-row-bad" : ""}>
                  <td><span className="data td-strong">{dlFmt(r.ts)}</span></td>
                  <td><span className="tag">{r.type}</span></td>
                  <td>
                    <span className="dv-log-msg">{r.msg}</span>
                    {r.kind !== "alarm" && <span className={"dv-kind " + r.kind}>{r.kind === "test" ? "TEST" : "HEARTBEAT"}</span>}
                  </td>
                  <td className="td-strong">{r.rcpt}</td>
                  <td><DlResult r={r.result} /></td>
                </tr>
              ))}
              {!rows.length && <NjEmptyRow colSpan={5} reason={ql ? "search" : "filtered"}
                title={ql ? "No messages match “" + q + "”" : "No messages match the current filters"}
                action={<button className="btn btn-secondary btn-sm" onClick={() => { setQ(""); setType("All"); setKind("all"); setFailOnly(false); }}>Clear filters</button>} />}
            </tbody>
          </table>
        </div>
        <window.PageFoot pg={pg} noun="messages" extra={fails + " undelivered in the period"} />
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="info" size={14} /> A failure here means the message never left on that path — the alarm itself is unaffected</span>
        <div className="dlg-foot-btns">
          <button className="btn btn-secondary" onClick={() => { closeDialog(); njOpenTestDispatch(null); }}><Icon name="send" size={16} /> Send test</button>
          <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
        </div>
      </div>
    </Dialog>
  );
}
function njOpenDeliveryLog(initial) { openDialog(<DeliveryLogDialog initial={initial} />); }

// ── the card that lives on Settings · On-call ──
function DeliveryVerificationCard() {
  const log = useDeliveryLog();
  const hb = useHeartbeat();
  const day = log.since(86400000);
  const sent = day.length;
  const fails = day.filter((r) => r.result !== "Succeeded" && r.result !== "Pending").length;
  const last = log.lastTest();
  return (
    <div className="card dv-card">
      <div className="card-head">
        <div className="dv-head-l">
          <span className="card-title">Delivery verification</span>
          <span className="caption">Prove the alarm actually reaches a phone — before it has to</span>
        </div>
        <div className="dv-head-act">
          <button className="btn btn-secondary btn-sm" onClick={() => njOpenTestDispatch(null)}><Icon name="send" size={14} /> Send test alarm</button>
          <button className="linkbtn" onClick={() => njOpenDeliveryLog()}>Delivery log <Icon name="arrow-up-right" size={14} /></button>
        </div>
      </div>
      <div className="card-body dv-body">
        <div className="dv-stats">
          <button className="dv-stat" onClick={() => njOpenDeliveryLog()} title="Open the delivery log for the last 24 hours">
            <span className="dv-stat-l">Messages sent · 24 h</span>
            <span className="dv-stat-v data">{sent}</span>
            <span className="dv-stat-s">alarms, tests and heartbeats</span>
          </button>
          <button className={"dv-stat" + (fails ? " bad" : "")} onClick={() => njOpenDeliveryLog({ failOnly: true })} title="Open the delivery log filtered to undelivered messages">
            <span className="dv-stat-l">Undelivered · 24 h</span>
            <span className="dv-stat-v data">{fails}</span>
            <span className="dv-stat-s">{fails ? "review the affected path" : "every path got through"}</span>
          </button>
          <button className="dv-stat" onClick={() => njOpenTestDispatch(null)} title="Send a new test alarm">
            <span className="dv-stat-l">Last test</span>
            <span className="dv-stat-v data">{last ? dlAgo(last.ts) : "never"}</span>
            <span className="dv-stat-s">{last ? dlFmt(last.ts).split(" · ")[0] + " · " + (last.result === "Succeeded" ? "delivered" : last.result.toLowerCase()) : "no test on record"}</span>
          </button>
        </div>
        <div className="dv-hb">
          <div className="dv-hb-head">
            <span className="eyebrow">Scheduled test message</span>
            <span className="caption">A missing heartbeat is how a dead path announces itself</span>
          </div>
          <div className="dv-hb-list">
            {hb.list.map((h) => {
              const g = dlGroup(h.groupId);
              return (
                <div className="dv-hb-row" key={h.id}>
                  <Icon name="heart-pulse" size={14} color="var(--slate-400)" />
                  <span className="dv-hb-t">{hbDayLabel(h.days)} at <b className="data">{h.time}</b></span>
                  <span className="dv-hb-g">→ {g ? g.name : "group removed"}</span>
                  <span className="dv-hb-c">{(((g || {}).chan || {}).p1 || []).map(dlChanLabel).join(" + ") || "no channel"}</span>
                  <div className="dv-hb-act">
                    <button className="icon-btn" title="Edit this scheduled test" onClick={() => openDialog(<HeartbeatDialog hb={h} />)}><Icon name="pencil" size={16} /></button>
                    <button className="icon-btn" title="Remove this scheduled test" onClick={() => openDialog(<ConfirmDialog title="Remove scheduled test" message={"Stop the " + hbDayLabel(h.days).toLowerCase() + " test message at " + h.time + "?"} detail="Nothing will verify the dispatch path between real alarms." confirmLabel="Remove" tone="danger" onConfirm={() => { njHeartbeat.remove(h.id); njToast("Scheduled test removed."); }} />)}><Icon name="trash-2" size={16} /></button>
                  </div>
                </div>
              );
            })}
            {!hb.list.length && <NjInline align="left">No scheduled test — the paths are only exercised by real alarms.</NjInline>}
          </div>
          <button className="member-add" onClick={() => openDialog(<HeartbeatDialog hb={null} />)}><Icon name="plus" size={14} /> Add scheduled test</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DeliveryVerificationCard, njOpenDeliveryLog, njOpenTestDispatch, njDeliveryLog, njHeartbeat });
