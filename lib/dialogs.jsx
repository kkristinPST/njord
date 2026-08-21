// dialogs.jsx — modal/dialog layer: store + host + chrome, TrendChart, Setpoint & Confirm dialogs.
// Equipment popups (EquipmentDialog + EQUIP registry) live in screens/equipment.jsx.

/* ── dialog stack store (mirrors ctxStore pattern) ── */
const dlgStore = {
  state: { stack: [] },
  subs: new Set(),
  set(next) { dlgStore.state = next; dlgStore.subs.forEach((f) => f()); },
  subscribe(f) { dlgStore.subs.add(f); return () => dlgStore.subs.delete(f); },
  snapshot() { return dlgStore.state; },
};
function openDialog(node) { dlgStore.set({ stack: [...dlgStore.state.stack, node] }); }
function closeDialog() { dlgStore.set({ stack: dlgStore.state.stack.slice(0, -1) }); }
function closeAllDialogs() { dlgStore.set({ stack: [] }); }

function DialogHost() {
  const s = React.useSyncExternalStore(dlgStore.subscribe, dlgStore.snapshot);
  const hostRef = React.useRef(null);
  const prevFocus = React.useRef(null);
  const n = s.stack.length;
  const focusables = () => {
    const hosts = hostRef.current && hostRef.current.querySelectorAll(".modal-host");
    const top = hosts && hosts[hosts.length - 1];
    if (!top) return [];
    return [...top.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
  };
  React.useEffect(() => {
    if (!n) return;
    const onKey = (e) => {
      if (e.key === "Escape") { closeDialog(); return; }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [n]);
  React.useEffect(() => {
    if (n) {
      if (!prevFocus.current) prevFocus.current = document.activeElement;
      const t = setTimeout(() => { const list = focusables(); const hosts = hostRef.current && hostRef.current.querySelectorAll(".modal-host"); const top = hosts && hosts[hosts.length - 1]; (list[0] || top).focus && (list[0] || top).focus(); }, 30);
      return () => clearTimeout(t);
    } else if (prevFocus.current) { prevFocus.current.focus && prevFocus.current.focus(); prevFocus.current = null; }
  }, [n]);
  return (
    <div ref={hostRef}>
      {s.stack.map((node, i) => (
        <div key={i} className="modal-scrim" style={{ zIndex: 2000 + i * 10 }} onMouseDown={closeDialog}>
          <div className="modal-host" tabIndex={-1} onMouseDown={(e) => e.stopPropagation()}>{node}</div>
        </div>
      ))}
    </div>
  );
}

/* ── dialog panel chrome ── */
function Dialog({ width = 560, children }) {
  return <div className="dlg" style={{ width }} role="dialog" aria-modal="true">{children}</div>;
}
function DlgHeader({ icon, name, tag, status, onClose }) {
  const sev = status ? (SEV[status] || SEV.ok) : null;
  return (
    <div className="dlg-head">
      <div className="dlg-head-l">
        {icon && <span className="dlg-icn"><Icon name={icon} size={19} color="var(--slate-600)" /></span>}
        <div className="dlg-titlewrap">
          <span className="dlg-title">{name}</span>
          {tag && <span className="tag dlg-tag">{tag}</span>}
        </div>
      </div>
      <div className="dlg-head-r">
        {sev && <span className="badge" style={{ background: sev.bg, color: sev.text }}>{sev.label}</span>}
        <button className="dlg-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
      </div>
    </div>
  );
}

/* ── reusable trend chart (deterministic series) ── */
function genTrend(seed, base, amp, n) {
  n = n || 56;
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    const wobble = Math.sin((i / n) * Math.PI * 2 + seed) * amp * 0.5;
    const noise = (Math.sin(i * 2.3 + seed * 3.1) + Math.cos(i * 0.7 + seed)) * amp * 0.16;
    v = base + wobble + noise;
    out.push(v);
  }
  return out;
}
function TrendChart({ data, unit, color = "var(--primary)", hi, lo, height = 188 }) {
  const W = 580, H = height, padL = 46, padR = 16, padT = 16, padB = 28;
  const vals = data.slice();
  const lows = lo != null ? [lo] : [];
  const his = hi != null ? [hi] : [];
  let min = Math.min(...vals, ...lows), max = Math.max(...vals, ...his);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, pad = span * 0.12;
  min -= pad; max += pad;
  const x = (i) => padL + (i / (vals.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const line = vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = line + ` L${x(vals.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`;
  const gid = "tg" + Math.round(min * 97 + max * 13);
  const yticks = [max, (max + min) / 2, min];
  const last = vals[vals.length - 1];
  return (
    <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--slate-100)" strokeWidth="1" />
          <text className="tc-ylbl" x={padL - 8} y={y(t) + 3} textAnchor="end">{t.toFixed(0)}</text>
        </g>
      ))}
      {lo != null && <line x1={padL} y1={y(lo)} x2={W - padR} y2={y(lo)} stroke="var(--critical)" strokeWidth="1.25" strokeDasharray="5 4" opacity="0.7" />}
      {hi != null && <line x1={padL} y1={y(hi)} x2={W - padR} y2={y(hi)} stroke="var(--warning)" strokeWidth="1.25" strokeDasharray="5 4" opacity="0.8" />}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(vals.length - 1)} cy={y(last)} r="3.5" fill={color} />
      {["−6h", "−4h", "−2h", "now"].map((t, i) => (
        <text key={i} className="tc-xlbl" x={padL + (i / 3) * (W - padL - padR)} y={H - 8} textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"}>{t}</text>
      ))}
    </svg>
  );
}

/* ── stepper used by setpoint + limit dialogs ── */
function Stepper({ value, step, unit, onChange, min, max }) {
  const clamp = (v) => Math.max(min != null ? min : -Infinity, Math.min(max != null ? max : Infinity, v));
  const dec = Math.max(0, (String(step).split(".")[1] || "").length);
  return (
    <div className="stepper">
      <button className="step-btn" onClick={() => onChange(clamp(+(value - step).toFixed(dec)))} aria-label="Decrease"><Icon name="minus" size={18} /></button>
      <div className="step-val"><span className="data">{value.toFixed(dec)}</span><span className="step-unit">{unit}</span></div>
      <button className="step-btn" onClick={() => onChange(clamp(+(value + step).toFixed(dec)))} aria-label="Increase"><Icon name="plus" size={18} /></button>
    </div>
  );
}

/* ── setpoint adjust dialog ── */
function SetpointDialog({ title, tag, label, value, unit, step = 1, min, max, current, onApply }) {
  const [v, setV] = React.useState(value);
  const dec = Math.max(0, (String(step).split(".")[1] || "").length);
  const delta = +(v - (current != null ? current : value)).toFixed(dec);
  return (
    <Dialog width={420}>
      <DlgHeader icon="sliders-horizontal" name={title || "Adjust setpoint"} tag={tag} onClose={closeDialog} />
      <div className="dlg-body">
        <div className="sp-label">{label}</div>
        <Stepper value={v} step={step} unit={unit} onChange={setV} min={min} max={max} />
        <div className="sp-meta">
          <div className="sp-meta-row"><span>Current</span><span className="data">{(current != null ? current : value).toFixed(dec)} {unit}</span></div>
          <div className="sp-meta-row"><span>Change</span><span className="data" style={{ color: delta === 0 ? "var(--slate-500)" : delta > 0 ? "var(--success-text)" : "var(--critical-text)" }}>{delta > 0 ? "+" : ""}{delta.toFixed(dec)} {unit}</span></div>
        </div>
        {(min != null || max != null) && <div className="sp-range">Allowed range {min != null ? min : "—"} … {max != null ? max : "—"} {unit}</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { onApply && onApply(v); closeDialog(); }}>Apply setpoint</button>
      </div>
    </Dialog>
  );
}

/* ── confirmation dialog (start/stop, mode change) ── */
function ConfirmDialog({ title, message, detail, confirmLabel = "Confirm", tone = "primary", onConfirm }) {
  const danger = tone === "danger";
  return (
    <Dialog width={420}>
      <div className="dlg-confirm">
        <span className={"dlg-confirm-icn" + (danger ? " danger" : "")}>
          <Icon name={danger ? "alert-triangle" : "help-circle"} size={22} />
        </span>
        <div className="dlg-confirm-title">{title}</div>
        <p className="dlg-confirm-msg">{message}</p>
        {detail && <div className="dlg-confirm-detail">{detail}</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className={"btn " + (danger ? "btn-danger" : "btn-primary")} onClick={() => { onConfirm && onConfirm(); closeDialog(); }}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}

/* ── Help dialog (opened from the top-bar help icon) ── */
function HelpDialog() {
  const links = [
    { icon: "book-open", label: "SCADA Manual", sub: "Operating the process mimics & controls", onClick: () => openManual("scada") },
    { icon: "utensils", label: "Feeding Manual", sub: "Feed maneuvers, dosing & schedules", onClick: () => openManual("feeding") },
    { icon: "life-buoy", label: "Create Ticket", sub: "Raise a support request to PST", onClick: () => openCreateTicket() },
    { icon: "info", label: "About NJORD", sub: "Version, licence & release notes", onClick: () => openAbout() },
  ];
  return (
    <Dialog width={460}>
      <DlgHeader icon="help-circle" name="Help" onClose={closeDialog} />
      <div className="dlg-body help-body">
        {links.map((l) => (
          <button key={l.label} className="help-link" onClick={l.onClick || closeDialog}>
            <span className="help-link-icn"><Icon name={l.icon} size={18} /></span>
            <span className="help-link-txt">
              <span className="help-link-l">{l.label}</span>
              <span className="help-link-sub">{l.sub}</span>
            </span>
            <Icon name="arrow-up-right" size={16} color="var(--slate-400)" />
          </button>
        ))}
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="help-powered">Powered by <strong>Ignition</strong></span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}
function openHelp() { openDialog(<HelpDialog />); }

/* ── Create ticket dialog (support request to Pure Salmon Technology) ── */
function TktField({ label, required, hint, children }) {
  return (
    <div className="tkt-field">
      <label className="tkt-label">{label}{required && <span className="tkt-req">*</span>}</label>
      {children}
      {hint && <div className="tkt-hint">{hint}</div>}
    </div>
  );
}
function CreateTicketDialog() {
  const nowLocal = React.useMemo(() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }, []);
  const [f, setF] = React.useState({
    name: "E. Sørensen", email: "e.sorensen@osland.no", subject: "", facility: "Osland",
    reqType: "Bug fix", priority: "Medium", desc: "", device: "", techspec: "", conn: "", time: nowLocal, file: "",
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const req = ["name", "email", "subject", "facility", "desc", "device", "time"];
  const missing = req.filter((k) => !String(f[k]).trim());
  const emailOk = /.+@.+\..+/.test(f.email);
  const canSubmit = missing.length === 0 && emailOk;
  const submit = () => {
    if (!canSubmit) return;
    closeDialog();
    const ref = "NJ-" + Math.floor(10000 + Math.random() * 89999);
    if (window.njToast) window.njToast(`Ticket ${ref} submitted to Pure Salmon Technology: you'll get a confirmation at ${f.email}.`);
  };
  return (
    <Dialog width={630}>
      <DlgHeader icon="life-buoy" name="Create ticket" onClose={closeDialog} />
      <div className="dlg-body tkt-body">
        <div className="tkt-intro">
          <Icon name="info" size={16} color="var(--primary)" />
          <p>NJORD is a product of <strong>Pure Salmon Technology</strong>. Our development team relies on your feedback: please fill in all relevant details. A request can be a <strong>bug fix</strong>, a <strong>new feature</strong>, or <strong>training</strong>.</p>
        </div>

        <div className="tkt-grid2">
          <TktField label="Your name" required><input className="oos-input" value={f.name} onChange={set("name")} placeholder="Full name" /></TktField>
          <TktField label="Your email" required hint={f.email && !emailOk ? <span className="tkt-err">Enter a valid email address</span> : null}><input className="oos-input" type="email" value={f.email} onChange={set("email")} placeholder="name@company.com" /></TktField>
        </div>

        <TktField label="Subject" required><input className="oos-input" value={f.subject} onChange={set("subject")} placeholder="Short summary of the request" /></TktField>

        <div className="tkt-grid2">
          <TktField label="Request type" required>
            <div className="segmented tkt-seg">
              {["Bug fix", "New feature", "Training", "Other"].map((o) => <button key={o} className={"seg" + (f.reqType === o ? " active" : "")} onClick={() => setF((p) => ({ ...p, reqType: o }))}>{o}</button>)}
            </div>
          </TktField>
          <TktField label="Priority" required>
            <div className="segmented tkt-seg">
              {["Low", "Medium", "High"].map((o) => <button key={o} className={"seg" + (f.priority === o ? " active" : "")} onClick={() => setF((p) => ({ ...p, priority: o }))}>{o}</button>)}
            </div>
          </TktField>
        </div>

        <TktField label="Facility" required hint="Example: Osland · Building 1 · DPT1"><input className="oos-input" value={f.facility} onChange={set("facility")} /></TktField>

        <TktField label="Detailed description of the issue" required hint="Example: A tank overview takes up to 8 s to load. Include relevant alarm names, tags and page names.">
          <textarea className="oos-input tkt-ta" rows={4} value={f.desc} onChange={set("desc")} placeholder="Describe what happened, what you expected, and how to reproduce it" />
        </TktField>

        <div className="tkt-grid2">
          <TktField label="Type of device used" required hint="Example: Client PC in control room"><input className="oos-input" value={f.device} onChange={set("device")} /></TktField>
          <TktField label="Connection type" hint="Example: Wired LAN / Wi-Fi / VPN"><input className="oos-input" value={f.conn} onChange={set("conn")} /></TktField>
        </div>

        <TktField label="Technical specification of the device" hint="Example: Windows 11, 2.4 GHz CPU, 16 GB RAM"><input className="oos-input" value={f.techspec} onChange={set("techspec")} /></TktField>

        <div className="tkt-grid2">
          <TktField label="Time of occurrence" required><input className="oos-input" type="datetime-local" value={f.time} onChange={set("time")} /></TktField>
          <TktField label="Attachment" hint="Screenshot or log (optional)"><input className="oos-input tkt-file" type="file" onChange={(e) => setF((p) => ({ ...p, file: e.target.value }))} /></TktField>
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="lock" size={13} /> Sent securely to PST support</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}><Icon name="send" size={15} /> Submit ticket</button>
        </div>
      </div>
    </Dialog>
  );
}
function openCreateTicket() { openDialog(<CreateTicketDialog />); }

/* ── parameter change history (opened from the edit dialog's history icon) ── */
function genParamHistory(tag, label, value, unit) {
  let h = 0; const s = (tag || "") + "|" + (label || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const ops = ["E. Sørensen", "M. Haugen", "System", "A. Birkeland"];
  const days = ["01 Jun", "31 May", "29 May", "27 May", "24 May"];
  const base = Number.isFinite(value) ? value : 0;
  const dec = Number.isInteger(base) ? 0 : Math.min(2, (String(base).split(".")[1] || "").length || 1);
  const u = unit ? " " + unit : "";
  const rows = []; let cur = base;
  for (let i = 0; i < 5; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const stepN = (((h >>> 5) % 7) - 3) * (dec ? 0.1 : 1);
    const prev = +(cur - stepN).toFixed(dec);
    const hh = 6 + ((h >>> 9) % 16), mm = (h >>> 3) % 60;
    rows.push({ t: days[i] + ", " + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"),
      from: prev.toFixed(dec) + u, to: cur.toFixed(dec) + u, op: ops[(h >>> 17) % ops.length] });
    cur = prev;
  }
  return rows;
}
function ParamChangeHistoryDialog({ tag, label, value, unit }) {
  const v = typeof value === "number" ? value : parseFloat(value);
  const rows = genParamHistory(tag, label, v, unit);
  return (
    <Dialog width={470}>
      <DlgHeader icon="history" name="Change history" tag={tag} onClose={closeDialog} />
      <div className="pe-hist-sub">{label}</div>
      <div className="dlg-body pe-hist-body">
        <table className="pe-hist-tbl">
          <thead><tr><th>Time</th><th>Change</th><th>Operator</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><span className="data">{r.t}</span></td>
                <td><span className="mvr-arrow"><span className="mvr-chip">{r.from}</span><Icon name="arrow-right" size={12} color="var(--slate-400)" /><span className="mvr-chip strong">{r.to}</span></span></td>
                <td>{r.op === "System"
                  ? <span className="evt returned"><Icon name="cpu" size={12} color="var(--slate-400)" /> System</span>
                  : <span className="small td-strong">{r.op}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <button className="btn btn-ghost btn-sm" onClick={() => { closeAllDialogs(); window.__njNavigate && window.__njNavigate("maneuver"); }}><Icon name="history" size={14} /> Full maneuver history</button>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}

/* ── parameter edit dialog (editable dock fields) — numeric or enum ── */
function ParamEditDialog({ tag, label, value, unit = "", min, max, step, options, group, onApply }) {
  const numeric = !options;
  const dstep = step || (numeric && Number.isInteger(value) ? 1 : 0.1);
  const dec = Math.max(0, (String(dstep).split(".")[1] || "").length);
  const fmt = (n) => (typeof n === "number" ? n.toFixed(dec) : n);
  const [raw, setRaw] = React.useState(numeric ? String(value) : value);
  const [comment, setComment] = React.useState("");
  const num = parseFloat(raw);
  const clamp = (x) => Math.max(min != null ? min : -Infinity, Math.min(max != null ? max : Infinity, x));
  const bump = (d) => setRaw(String(+clamp((isNaN(num) ? value : num) + d).toFixed(dec)));
  const inRange = numeric ? (!isNaN(num) && (min == null || num >= min) && (max == null || num <= max)) : true;
  const changed = numeric ? (!isNaN(num) && num !== value) : (raw !== value);
  const canConfirm = changed && inRange;
  const invalidMsg = numeric && raw !== "" && !inRange
    ? (isNaN(num) ? "Enter a valid number." : (min != null && num < min) ? `Below minimum: must be ≥ ${fmt(min)}${unit ? " " + unit : ""}.` : `Above maximum, must be ≤ ${fmt(max)}${unit ? " " + unit : ""}.`)
    : null;
  const delta = numeric && !isNaN(num) ? +(num - value).toFixed(dec) : 0;
  const u = unit ? " " + unit : "";
  const longOpts = !numeric && (options.length > 3 || options.some((o) => String(o).length > 10));
  const optRef = React.useRef(null);
  const moveOpt = (e) => {
    if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].indexOf(e.key) < 0) return;
    e.preventDefault();
    const idx = Math.max(0, options.indexOf(raw));
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const ni = (idx + dir + options.length) % options.length;
    setRaw(options[ni]);
    const btns = optRef.current && optRef.current.querySelectorAll(".pe-opt");
    if (btns && btns[ni]) btns[ni].focus();
  };
  const openHist = () => openDialog(<ParamChangeHistoryDialog tag={tag} label={label} value={value} unit={unit} />);
  const confirm = () => {
    const out = numeric ? +(+num).toFixed(dec) : raw;
    onApply && onApply(out);
    closeDialog();
    if (window.njToast) window.njToast(label + " set to " + (numeric ? fmt(out) : out) + u, "Maneuver history", () => window.__njNavigate && window.__njNavigate("maneuver"));
  };
  return (
    <Dialog width={444}>
      <DlgHeader icon="sliders-horizontal" name={label} tag={tag} onClose={closeDialog} />
      <div className="dlg-body pe-body">
        {group && <div className="pe-group">{group}</div>}
        <div className="pe-row">
          <span className="pe-lbl">Current value</span>
          <span className="pe-cur data">{fmt(value)}{unit && <span className="u"> {unit}</span>}</span>
        </div>
        {longOpts ? (
          <div className="pe-row pe-row-stack">
            <div className="pe-stack-head">
              <span className="pe-lbl">New value</span>
              <button className="pe-hist" title="View change history" onClick={openHist}><Icon name="history" size={16} /></button>
            </div>
            <div className="pe-optlist" ref={optRef} role="radiogroup" aria-label={label} onKeyDown={moveOpt}>
              {options.map((o) => (
                <button key={o} type="button" role="radio" aria-checked={o === raw} tabIndex={o === raw ? 0 : -1}
                  className={"pe-opt" + (o === raw ? " sel" : "")} onClick={() => setRaw(o)}>
                  <span className="pe-opt-mark" aria-hidden="true">{o === raw ? <Icon name="check" size={14} /> : null}</span>
                  <span className="pe-opt-lbl">{o}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div className="pe-row">
          <span className="pe-lbl">New value</span>
          <div className="pe-field">
            <button className="pe-hist" title="View change history" onClick={openHist}><Icon name="history" size={16} /></button>
            {numeric ? (
              <div className="pe-input-wrap">
                <button className="pe-step" onClick={() => bump(-dstep)} aria-label="Decrease"><Icon name="minus" size={15} /></button>
                <input className="pe-input data" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} />
                {unit && <span className="pe-unit">{unit}</span>}
                <button className="pe-step" onClick={() => bump(dstep)} aria-label="Increase"><Icon name="plus" size={15} /></button>
              </div>
            ) : (
              <div className="segmented pe-opts">
                {options.map((o) => <button key={o} className={"seg" + (o === raw ? " active" : "")} onClick={() => setRaw(o)}>{o}</button>)}
              </div>
            )}
          </div>
        </div>
        )}
        <div className="pe-meta">
          {numeric && (
            <React.Fragment>
              <div className="pe-meta-row"><span>Change</span><span className="data" style={{ color: delta === 0 ? "var(--slate-500)" : delta > 0 ? "var(--success-text)" : "var(--critical-text)" }}>{!isNaN(num) ? (delta > 0 ? "+" : "") + fmt(delta) + u : "—"}</span></div>
              <div className="pe-meta-row"><span>Max</span><span className="data">{max != null ? fmt(max) + u : "—"}</span></div>
              <div className="pe-meta-row"><span>Min</span><span className="data">{min != null ? fmt(min) + u : "—"}</span></div>
            </React.Fragment>
          )}
        </div>
        {invalidMsg && <div className="pe-warn"><Icon name="alert-triangle" size={14} /> <span>{invalidMsg}</span></div>}
        <div className="pe-comment">
          <label className="pe-comment-lbl">Comment</label>
          <input className="oos-input" placeholder="Add a note for the audit trail (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!canConfirm} onClick={confirm}>Confirm</button>
      </div>
    </Dialog>
  );
}
function njEditParam(spec) { openDialog(<ParamEditDialog {...spec} />); }

/* ── Profile & account ── */
function ProfileDialog() {
  const [f, setF] = React.useState(() => {
    let saved = {}; try { saved = JSON.parse(localStorage.getItem("nj_profile_v1")) || {}; } catch (e) {}
    return { email: saved.email || "e.sorensen@puresalmontech.com", phone: saved.phone || "47 918 24 550", cur: "", nw: "", conf: "" };
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim());
  const wantsPw = f.cur || f.nw || f.conf;
  const pwOk = !wantsPw || (f.cur && f.nw.length >= 8 && f.nw === f.conf);
  const valid = emailOk && pwOk;
  const save = () => {
    try { localStorage.setItem("nj_profile_v1", JSON.stringify({ email: f.email.trim(), phone: f.phone.trim() })); } catch (e) {}
    closeDialog();
    if (window.njToast) window.njToast(wantsPw ? "Profile updated · password changed." : "Profile updated.");
  };
  return (
    <Dialog width={540}>
      <DlgHeader icon="user" name="Profile & account" onClose={closeDialog} />
      <div className="dlg-body de-form">
        <div className="prof-id">
          <span className="prof-avatar">ES</span>
          <div>
            <div className="prof-name">E. Sørensen</div>
            <div className="prof-sub">Shift Supervisor · username <span className="tag">esorensen</span></div>
          </div>
        </div>
        <div className="prof-sec">Contact</div>
        <div className="de-form-2col">
          <label className="de-field"><span className="de-field-l">Email</span><input className="de-input" type="email" value={f.email} onChange={set("email")} /></label>
          <label className="de-field"><span className="de-field-l">Phone</span><input className="de-input" value={f.phone} onChange={set("phone")} /></label>
        </div>
        {!emailOk && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Enter a valid email address.</div>}
        <div className="prof-sec">Change password <span className="prof-sec-opt">optional</span></div>
        <label className="de-field"><span className="de-field-l">Current password</span><input className="de-input" type="password" value={f.cur} onChange={set("cur")} placeholder="••••••••" /></label>
        <div className="de-form-2col">
          <label className="de-field"><span className="de-field-l">New password</span><input className="de-input" type="password" value={f.nw} onChange={set("nw")} placeholder="At least 8 characters" /></label>
          <label className="de-field"><span className="de-field-l">Confirm new</span><input className="de-input" type="password" value={f.conf} onChange={set("conf")} placeholder="Repeat new password" /></label>
        </div>
        {wantsPw && !pwOk && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>{!f.cur ? "Enter your current password." : f.nw.length < 8 ? "New password must be at least 8 characters." : "New passwords don't match."}</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}>Save changes</button>
      </div>
    </Dialog>
  );
}
function openProfile() { openDialog(<ProfileDialog />); }

/* ── Preferences (theme · density · default screen · units) ── */
const PREF_SCREENS = [["start", "Dashboard"], ["navigation", "Site Plan"], ["alarms", "Alarms"], ["feeding", "Fish Feeding"], ["analytics", "Analytics"]];
function PrefSeg({ label, options, value, onChange }) {
  return (
    <div className="pref-row">
      <span className="pref-lbl">{label}</span>
      <div className="segmented pref-seg">
        {options.map(([v, l]) => <button key={v} className={"seg" + (v === value ? " active" : "")} onClick={() => onChange(v)}>{l}</button>)}
      </div>
    </div>
  );
}
function PreferencesDialog() {
  const theme = (window.useTheme ? window.useTheme() : (window.themeStore && window.themeStore.v)) || "light";
  const compact = window.useDensity ? window.useDensity() : false;
  const tsize = window.useTextSize ? window.useTextSize() : "normal";
  const [scr, setScr] = React.useState(() => { try { return localStorage.getItem("nj_default_screen") || "start"; } catch (e) { return "start"; } });
  const [temp, setTemp] = React.useState(() => { try { return localStorage.getItem("nj_units_temp") || "C"; } catch (e) { return "C"; } });
  const [wt, setWt] = React.useState(() => { try { return localStorage.getItem("nj_units_weight") || "kg"; } catch (e) { return "kg"; } });
  const setDefScreen = (v) => { setScr(v); try { localStorage.setItem("nj_default_screen", v); } catch (e) {} };
  const setTempU = (v) => { setTemp(v); try { localStorage.setItem("nj_units_temp", v); } catch (e) {} };
  const setWtU = (v) => { setWt(v); try { localStorage.setItem("nj_units_weight", v); } catch (e) {} };
  return (
    <Dialog width={600}>
      <DlgHeader icon="sliders-horizontal" name="Preferences" onClose={closeDialog} />
      <div className="dlg-body">
        <div className="pref-note"><Icon name="info" size={14} color="var(--slate-400)" /> <span>Applies to this device. Theme, density and text size change instantly; default screen takes effect at next sign-in.</span></div>
        <PrefSeg label="Theme" options={[["light", "Light"], ["dark", "Dark"], ["legacy", "Legacy"]]} value={theme} onChange={(v) => window.njSetTheme && window.njSetTheme(v)} />
        <PrefSeg label="Table density" options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} value={compact ? "compact" : "comfortable"} onChange={(v) => window.densityStore && window.densityStore.set(v === "compact")} />
        <PrefSeg label="Text size" options={[["normal", "Normal"], ["large", "Large"], ["xlarge", "Extra large"]]} value={tsize} onChange={(v) => window.textSizeStore && window.textSizeStore.set(v)} />
        <div className="pref-row">
          <span className="pref-lbl">Default screen</span>
          <select className="de-input pref-select" value={scr} onChange={(e) => setDefScreen(e.target.value)}>{PREF_SCREENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="pref-divider" />
        <PrefSeg label="Temperature" options={[["C", "°C"], ["F", "°F"]]} value={temp} onChange={setTempU} />
        <PrefSeg label="Weight" options={[["kg", "kg"], ["lb", "lb"]]} value={wt} onChange={setWtU} />
      </div>
      <div className="dlg-foot">
        <button className="btn btn-primary" onClick={() => { closeDialog(); if (window.njToast) window.njToast("Preferences saved."); }}>Done</button>
      </div>
    </Dialog>
  );
}
function openPreferences() { openDialog(<PreferencesDialog />); }

Object.assign(window, {
  dlgStore, openDialog, closeDialog, closeAllDialogs, DialogHost,
  Dialog, DlgHeader, TrendChart, genTrend, Stepper, SetpointDialog, ConfirmDialog, HelpDialog, openHelp,
  CreateTicketDialog, openCreateTicket,
  ParamEditDialog, ParamChangeHistoryDialog, njEditParam,
  ProfileDialog, openProfile, PreferencesDialog, openPreferences,
});
